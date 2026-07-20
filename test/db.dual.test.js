'use strict';

/**
 * The dual-write backend must persist every write to BOTH stores. Runs only when
 * `DATABASE_URL` is set (CI + local test DB); skipped otherwise.
 *
 *   DATABASE_URL=postgresql://localhost:5432/zega_contract_test node --test test/db.dual.test.js
 */

process.env.ZEGA_DB = ':memory:';
const hasDb = Boolean(process.env.DATABASE_URL);
if (hasDb) process.env.DB_BACKEND = 'dual';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const opts = { skip: hasDb ? false : 'set DATABASE_URL to run the dual-write test' };

const store = hasDb ? require('../src/store') : null; // resolves to db.dual
const sqlite = hasDb ? require('../src/store/db') : null;
const pg = hasDb ? require('../src/store/db.pg') : null;

before(async () => {
  if (!hasDb) return;
  await store.init();
  await pg.reset();
});
after(async () => {
  if (hasDb && store.end) await store.end();
});

test('every write lands in BOTH SQLite and Postgres', opts, async () => {
  const uid = 'dual-write-1';

  const p = await store.getOrCreateProfile(uid, 'en');
  Object.assign(p, { xp: 50, track: 'youth', streak: 2 });
  await store.saveProfile(p);
  await store.markLessonComplete(uid, 'youth.foundations.privacy-intro');
  await store.awardBadge(uid, 'first-steps');
  await store.issueCertificate('ZEGA-DUAL0001', uid, 'Dual Writer', 'youth', 'en');

  // SQLite has it…
  assert.equal(sqlite.getOrCreateProfile(uid).xp, 50, 'sqlite profile');
  assert.equal(sqlite.getOrCreateProfile(uid).track, 'youth');
  assert.ok(sqlite.getCompletedLessons(uid).has('youth.foundations.privacy-intro'), 'sqlite progress');
  assert.ok(sqlite.getEarnedBadges(uid).has('first-steps'), 'sqlite badge');
  assert.equal(sqlite.getCertificate(uid, 'youth').code, 'ZEGA-DUAL0001', 'sqlite cert');

  // …and Postgres has the exact same, independently.
  assert.equal((await pg.getOrCreateProfile(uid)).xp, 50, 'postgres profile');
  assert.equal((await pg.getOrCreateProfile(uid)).track, 'youth');
  assert.ok((await pg.getCompletedLessons(uid)).has('youth.foundations.privacy-intro'), 'postgres progress');
  assert.ok((await pg.getEarnedBadges(uid)).has('first-steps'), 'postgres badge');
  assert.equal((await pg.getCertificateByCode('ZEGA-DUAL0001')).user_id, uid, 'postgres cert');
});
