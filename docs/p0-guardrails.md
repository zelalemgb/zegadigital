# P0 — Baseline, guardrails & safety net

The first week of the [scaling roadmap](./). Goal: **know the current numbers and
make change safe before touching the core.** Everything here is additive and
read-only with respect to the live bot — no production behaviour changes.

## Checklist

- [x] **CI test gate** — `.github/workflows/ci.yml` runs `npm test` + a coverage
      gate on every push and PR (Node 24). This is the gate every later phase
      must pass before its flag flips in production.
- [x] **Repository contract tests** — `test/db.contract.test.js` pins the storage
      behaviour (defaults, round-trips, idempotent progress/badges/certs) against
      `:memory:`. In Phase 1 the **same suite** runs against Postgres — identical
      passes prove the swap is safe.
- [x] **Coverage floor** — recorded below; CI fails if coverage drops through it.
- [x] **Hot backup / restore** — `scripts/backup.js` (WAL-safe, runs live) and
      `scripts/restore.js` (guarded, reversible).
- [ ] **Staging environment** — a second Render service off the same repo,
      separate DB. (Infra task — do in the dashboard / a second Blueprint.)
- [ ] **Funnel/KPI view** — a report over the `events` table (reach lesson 2/5,
      quiz, certificate; cohort retention). Extend `scripts/metrics.js`.
- [ ] **Load/replay harness** — replay recorded webhook payloads to establish a
      "requests/sec before errors" baseline.

## Commands

```bash
npm test          # 43 tests: engine, gamification, analytics, scheduler, certificate, db-contract
npm run coverage  # tests + coverage gate (floors: lines 90 / funcs 85 / branch 70)

# Backup — safe to run while the bot is live (VACUUM INTO holds only a read lock)
ZEGA_DB=/var/data/zega.db npm run backup            # → /var/data/backups/zega-<ts>.db
ZEGA_DB=/var/data/zega.db npm run backup /path/x.db # explicit destination

# Restore — STOP the bot first; guarded by --force; keeps a .pre-restore rollback
npm run restore -- /var/data/backups/zega-<ts>.db --force
```

## Baseline (captured 2026-07-17, to be re-measured after infra changes)

| Metric | Value |
| --- | --- |
| Automated tests | **43** (37 pre-existing + 6 db-contract) |
| Line coverage | **96.2%** |
| Function coverage | **91.7%** |
| Branch coverage | **74.9%** |
| CI coverage floors | lines 90 · funcs 85 · branch 70 (ratchet up, never down) |

## Notes

- The contract suite is written as a loop over a `backends` array. Phase 1 adds
  `{ name: 'postgres', make: () => require('../src/store/db.pg') }` and the same
  assertions run against both — that parity is the datastore-swap safety proof.
- `restore.js` moves the current DB **and its `-wal`/`-shm` sidecars** aside
  before copying; restoring over a live WAL would corrupt the copy.
- Production backups should be written to **off-box durable storage** and a
  restore rehearsed regularly — a backup you have never restored is a guess.
