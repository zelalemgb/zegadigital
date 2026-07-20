# Phase 1 — Postgres adapter

The change that lifts the single-instance SQLite ceiling. This first slice adds
the **Postgres backend** and proves it satisfies the exact same behaviour as
SQLite via the shared contract suite. **It is not wired into the running app
yet** — that is the next step (see below).

## What's here

- `src/store/db.pg.js` — the Postgres implementation of the repository API, one
  method per SQLite counterpart, **async**, on a `pg` connection pool.
- `test/db.contract.test.js` — the same contract assertions now run against
  **both** SQLite and Postgres. Identical passes = the swap is safe.
- CI job `Repository contract (SQLite + Postgres)` runs the dual check on a
  `postgres:16` service on every PR.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string. When set, the contract suite dual-runs. | — |
| `PG_POOL_MAX` | Max pooled connections | `10` |
| `PGSSL` | Set to `require` to force TLS (also auto-on if the URL has `sslmode=require`) | off |

## Run it locally

```bash
createdb zega_contract_test
DATABASE_URL=postgresql://localhost:5432/zega_contract_test node --test test/db.contract.test.js
# → runs sqlite(:memory:) AND postgres, identical assertions
```

Without `DATABASE_URL`, `npm test` runs SQLite-only (unchanged for day-to-day dev).

## Provisioning Render Postgres (production)

1. Render Dashboard → **New → Postgres** (same region as the web service).
2. Copy the **Internal Database URL** into the web service's env as `DATABASE_URL`.
3. Keep `ZEGA_DB` in place — the live app still uses SQLite until the cutover.

## App wiring (done — `feat/postgres-wiring`)

The app now selects its backend via `DB_BACKEND` and is fully async against the
repository. Set `DB_BACKEND=postgres` (+ `DATABASE_URL`) and the whole bot runs
on Postgres; unset, it stays on SQLite. Proven end-to-end by
`test/runtime.pg.test.js` (a full learner flow persisted to Postgres) and by the
unchanged SQLite suite.

- `src/store/index.js` — backend facade; the app requires `./store`, never a
  concrete backend.
- `src/runtime.js`, `src/server.js`, scripts — `async`/`await` throughout; the
  engine stays pure (no DB).
- Startup runs `await store.init()` (creates the Postgres schema; no-op for SQLite).

## Next step — the live cutover (not code)

**Expand/contract** on the live bot, all flag-gated and reversible:

1. dual-write to both stores → backfill history online →
2. dual-read + verify parity on real traffic (SQLite stays authoritative) →
3. flip `DB_BACKEND=postgres` by canary → keep SQLite one release → contract.

Zero downtime. The contract parity + wired-runtime e2e proven here are what make
that cutover safe.

> Note: `src/analytics.js` still reads SQLite directly (the `/admin` dashboard).
> It keeps working during the dual-write window; port it to the facade before the
> final contract step.
>
> Note: `db.pg.init()` uses `CREATE TABLE IF NOT EXISTS`. That races on `pg_type`
> if two connections run it at the exact same instant. Fine for a single instance;
> **before Phase 2** (many replicas starting at once) wrap the schema DDL in a
> `pg_advisory_lock` so concurrent startups serialise. (CI runs the two
> Postgres test files as separate steps for the same reason.)
