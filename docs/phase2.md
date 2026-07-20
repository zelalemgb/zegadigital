# Phase 2 — stateless web tier & horizontal autoscale

Run many interchangeable web replicas behind the load balancer so throughput
scales with instances. Sessions already live in the database, so the web tier is
almost stateless — this phase closes the remaining gaps.

**Depends on Phase 1 being cut over to Postgres** (SQLite is single-attach: you
cannot run more than one instance on it).

## Shipped in this PR (correctness first)

- **Per-user serialisation — `withUserLock(userId, fn)`** wraps `processMessage`
  and `startConversation`. The async runtime can otherwise interleave two turns
  for the same learner at their `await` points and clobber each other's profile
  write (a hazard the old synchronous code didn't have; it grows with replicas).
  - **SQLite:** an in-process keyed mutex (`src/store/lock.js`).
  - **Postgres:** the same mutex **plus** a cross-instance `pg_advisory_lock`
    keyed on the user id — so two *different replicas* handling the same user
    also serialise.
  - Proven by `test/db.lock.test.js`: 25 concurrent "+10 xp" ops land at exactly
    +250 on both backends (they'd lose updates without the lock).
- **Readiness vs liveness probes**
  - `GET /health` — liveness: the process is up (restart if not).
  - `GET /ready` — readiness: pings the DB; returns 503 if unreachable so the
    load balancer pulls a bad replica **out of rotation** without killing it.

## To activate scaling (do at / after the Postgres cutover)

In `render.yaml` (or the dashboard), once `DB_BACKEND=postgres`:

1. **Remove the `disk:` block and the `ZEGA_DB` env** — no local file any more.
2. **`healthCheckPath: /ready`** — probe readiness, not just liveness.
3. **Enable scaling:**
   ```yaml
   scaling:
     minInstances: 2
     maxInstances: 5
     targetCPUPercent: 70
   ```
4. Confirm **rolling deploys** (Render default for scaled services) — new
   replicas come up ready before old ones drain, so deploys stop causing the
   downtime swap.

## Watch after enabling

- **DB connection pool** (`PG_POOL_MAX`, default 10 per instance) × instance
  count must stay under the Postgres connection limit. Add PgBouncer if it gets
  tight.
- The **scheduler** still runs in-process (`RUN_SCHEDULER=true`). With multiple
  replicas that means multiple sweeps — Phase 3 moves it to a single dedicated
  worker. Until then, run the scheduler on exactly one instance (or accept the
  idempotent double-nudge guard).
- **Advisory-lock hold time** = the turn duration; watch for lock waits if a
  single user is hammered.
