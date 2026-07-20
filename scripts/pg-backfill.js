#!/usr/bin/env node
'use strict';

/**
 * One-time backfill: copy all existing SQLite data into Postgres.
 *
 * Run this ONCE, BEFORE enabling dual-write (`DB_BACKEND=dual`). It truncates the
 * Postgres tables first for a clean, re-runnable copy — so never run it after
 * dual-write has started (it would wipe live Postgres writes). Guarded by
 * `--force` when Postgres already has rows.
 *
 *   ZEGA_DB=/var/data/zega.db DATABASE_URL=postgres://... node scripts/pg-backfill.js [--force]
 */

const sqlite = require('../src/store/db');
const pg = require('../src/store/db.pg');

const TABLES = [
  { name: 'profiles', order: '', cols: ['user_id', 'lang', 'track', 'xp', 'level_index', 'streak', 'longest_streak', 'last_active_day', 'opt_in_reminders', 'reminder_hour', 'last_nudge_day', 'reminders_prompted', 'name', 'lite', 'resume', 'session', 'created_at', 'updated_at'], bools: ['opt_in_reminders', 'reminders_prompted', 'lite'] },
  { name: 'lesson_progress', order: '', cols: ['user_id', 'lesson_id', 'completed_at'] },
  { name: 'badges', order: '', cols: ['user_id', 'badge_id', 'earned_at'] },
  { name: 'check_results', order: '', cols: ['user_id', 'lesson_id', 'correct', 'ts'] },
  { name: 'certificates', order: '', cols: ['code', 'user_id', 'name', 'track', 'issued_at', 'lang'] },
  // id-keyed tables: preserve order (analytics reads ORDER BY id) by inserting in
  // ascending source-id order and letting Postgres assign fresh ids.
  { name: 'events', order: 'ORDER BY id', cols: ['user_id', 'type', 'data', 'ts'] },
  { name: 'assessments', order: 'ORDER BY id', cols: ['user_id', 'kind', 'track', 'score', 'total', 'ts'] },
];

async function main() {
  const force = process.argv.includes('--force');
  await pg.init();
  const pool = pg.db;
  const sdb = sqlite.db;

  // Safety: refuse to clobber a non-empty Postgres unless --force.
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM profiles');
  if (rows[0].n > 0 && !force) {
    console.error(`✗ Postgres already has ${rows[0].n} profiles. This truncates and re-copies.`);
    console.error('  Only run BEFORE dual-write. Re-run with --force if you are sure.');
    process.exit(1);
  }

  console.log('Truncating Postgres tables…');
  await pool.query('TRUNCATE profiles, lesson_progress, badges, events, assessments, check_results, certificates RESTART IDENTITY');

  let total = 0;
  for (const t of TABLES) {
    const src = sdb.prepare(`SELECT * FROM ${t.name} ${t.order}`).all();
    if (!src.length) { console.log(`  ${t.name}: 0`); continue; }
    const ph = t.cols.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${t.name} (${t.cols.join(', ')}) VALUES (${ph}) ON CONFLICT DO NOTHING`;
    const bools = new Set(t.bools || []);
    for (const r of src) {
      const vals = t.cols.map((c) => (bools.has(c) ? Boolean(r[c]) : r[c] ?? null));
      // eslint-disable-next-line no-await-in-loop
      await pool.query(sql, vals);
    }
    console.log(`  ${t.name}: ${src.length}`);
    total += src.length;
  }

  console.log(`✓ Backfill complete — ${total} rows copied. Verify with: node scripts/pg-parity.js`);
  await pg.end();
}

main().catch((err) => {
  console.error('✗ Backfill failed:', err);
  process.exit(1);
});
