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

## Next step (not in this PR)

Wire the app to the async repository behind a `DB_BACKEND` flag:

1. Thread `async/await` through the engine/runtime call sites (mechanical,
   guarded by the existing tests).
2. **Expand/contract cutover** on the live bot: dual-write → backfill → dual-read
   + verify parity on real traffic → flip `DB_BACKEND=postgres` by canary → keep
   SQLite one release → contract. Zero downtime, instantly reversible.

The contract parity proven here is what makes that cutover safe.
