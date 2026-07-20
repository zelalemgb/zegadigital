# Phase 1 — the live SQLite → Postgres cutover

A zero-downtime, reversible migration using **expand/contract** with a dual-write
backend. The live bot keeps serving from SQLite the whole time until reads are
flipped, and every step is a single env flag you can roll back instantly.

## Pieces

| Piece | What |
| --- | --- |
| `src/store/db.dual.js` | `DB_BACKEND=dual` — writes to **both** stores, reads from `DUAL_READ` (default `sqlite`). Postgres mirror writes are best-effort (logged, never break a turn). |
| `scripts/pg-backfill.js` | One-time copy of all SQLite data into Postgres. |
| `scripts/pg-parity.js` | Row-count + sample field comparison; exits non-zero on mismatch (use as a gate). |
| `test/db.dual.test.js` | Proves a write lands in both stores (CI, against Postgres). |

## Runbook

Prereqs: `DATABASE_URL` points at the provisioned Render Postgres (Internal URL);
the Postgres-wired code (PR #3) is deployed with `DB_BACKEND=sqlite` (default).

```
0. Baseline backup                → node scripts/backup.js            (SQLite snapshot)
1. Backfill history               → node scripts/pg-backfill.js       (BEFORE dual-write; truncates PG)
2. Verify the copy                → node scripts/pg-parity.js         (must be ✓)
3. Turn ON dual-write             → set DB_BACKEND=dual, DUAL_READ=sqlite   (redeploy)
      · SQLite stays authoritative; Postgres now receives every live write.
      · Watch the "[dual] mirror write failed" logs — should be silent.
4. Re-verify under live traffic   → node scripts/pg-parity.js         (after a soak; must be ✓)
5. Canary reads to Postgres       → set DUAL_READ=postgres            (still writing both; redeploy)
      · If anything looks wrong, set DUAL_READ=sqlite to roll back instantly.
6. Contract                       → set DB_BACKEND=postgres           (drop SQLite; redeploy)
```

Every step 3→6 is a single env change on the web service, each reversible by
setting the previous value — no code deploy, no data loss.

## Notes / follow-ups

- **`src/analytics.js`** still reads SQLite directly (the `/admin` dashboard). During
  dual-write SQLite stays current, so it keeps working; port it to the facade
  (`./store`) before step 6 (contract), or it will read an emptying database.
- **Backfill is one-shot** and truncates Postgres first — only run it **before**
  step 3. Re-running after dual-write starts would wipe live Postgres writes
  (guarded by `--force`).
- **`db.pg.init()`** uses `CREATE TABLE IF NOT EXISTS`; guard it with a
  `pg_advisory_lock` before Phase 2 (many replicas starting at once).
- The Free Render Postgres is a **30-day test instance** — provision a paid
  Basic/Pro tier before the real production cutover (step 6).
