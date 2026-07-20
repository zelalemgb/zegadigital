#!/usr/bin/env node
'use strict';

/**
 * Parity check: compare SQLite and Postgres after a backfill (and during
 * dual-write) so you only flip reads once they truly match.
 *
 *   ZEGA_DB=/var/data/zega.db DATABASE_URL=postgres://... node scripts/pg-parity.js
 *
 * Exits non-zero on any mismatch — safe to use as a cutover gate.
 */

const sqlite = require('../src/store/db');
const pg = require('../src/store/db.pg');

const TABLES = ['profiles', 'lesson_progress', 'badges', 'check_results', 'certificates', 'events', 'assessments'];

async function main() {
  await pg.init();
  const pool = pg.db;
  const sdb = sqlite.db;
  let ok = true;

  console.log('table                |  sqlite | postgres | match');
  console.log('---------------------+---------+----------+------');
  for (const t of TABLES) {
    const s = sdb.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
    // eslint-disable-next-line no-await-in-loop
    const p = (await pool.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
    const match = s === p;
    if (!match) ok = false;
    console.log(`${t.padEnd(20)} | ${String(s).padStart(7)} | ${String(p).padStart(8)} | ${match ? '✓' : '✗ MISMATCH'}`);
  }

  // Spot-check one profile's key fields agree field-for-field.
  const sample = sdb.prepare('SELECT user_id FROM profiles LIMIT 1').get();
  if (sample) {
    const sp = sqlite.getOrCreateProfile(sample.user_id);
    const pp = await pg.getOrCreateProfile(sample.user_id);
    const same = sp.xp === pp.xp && sp.track === pp.track && sp.streak === pp.streak && sp.lang === pp.lang;
    if (!same) ok = false;
    console.log(`\nsample profile …${String(sample.user_id).slice(-4)}: xp/track/streak/lang ${same ? '✓ match' : '✗ DIFFER'}`);
  }

  await pg.end();
  console.log(ok ? '\n✓ Parity OK — safe to canary reads (DUAL_READ=postgres).' : '\n✗ Parity MISMATCH — do not flip reads.');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('✗ Parity check failed:', err);
  process.exit(1);
});
