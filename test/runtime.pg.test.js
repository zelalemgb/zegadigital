'use strict';

/**
 * End-to-end proof that the async runtime works when wired to Postgres.
 *
 * Runs only when `DATABASE_URL` is set (CI, and locally against a test DB);
 * otherwise it's skipped so day-to-day `npm test` stays SQLite-only.
 *
 *   createdb zega_contract_test
 *   DATABASE_URL=postgresql://localhost:5432/zega_contract_test node --test test/runtime.pg.test.js
 */

const hasDb = Boolean(process.env.DATABASE_URL);
if (hasDb) process.env.DB_BACKEND = 'postgres'; // select the Postgres backend for this process

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { getContent } = require('../src/content');

const store = hasDb ? require('../src/store') : null;
const runtime = hasDb ? require('../src/runtime') : null;
const opts = { skip: hasDb ? false : 'set DATABASE_URL to run the Postgres end-to-end test' };

before(async () => {
  if (!hasDb) return;
  await store.init();
  await store.reset();
});
after(async () => {
  if (hasDb && store.end) await store.end();
});

test('a full learner flow persists to Postgres through the async runtime', opts, async () => {
  const uid = 'pg-e2e-1';

  // Onboard onto the youth track, skipping the baseline → mission screen.
  await runtime.processMessage(uid, 'Hi');
  await runtime.processMessage(uid, '1'); // English
  await runtime.processMessage(uid, '1'); // Youth
  await runtime.processMessage(uid, 'SKIP');

  // Complete the first lesson and answer its knowledge check.
  await runtime.processMessage(uid, '1'); // start the lesson
  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < node.messages.length; i++) await runtime.processMessage(uid, 'NEXT');
  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const done = await runtime.processMessage(uid, check.answer);

  // Rewards were applied…
  assert.ok(done.profile.xp >= 100, `expected substantial XP, got ${done.profile.xp}`);
  assert.ok(done.profile.badges >= 1, 'earned at least one badge');

  // …and everything is durably in Postgres.
  const completed = await store.getCompletedLessons(uid);
  assert.ok(completed.has('youth.foundations.privacy-intro'), 'lesson completion persisted');
  const profile = await store.getOrCreateProfile(uid);
  assert.equal(profile.track, 'youth', 'track persisted');
  assert.ok(profile.session, 'conversation session persisted');
  assert.ok((await store.getEarnedBadges(uid)).size >= 1, 'badge persisted');
});

test('restart resumes from Postgres-persisted state', opts, async () => {
  const uid = 'pg-e2e-1'; // same learner as above
  const resumed = await runtime.startConversation(uid);
  assert.equal(resumed.profile.track, 'youth');
  assert.ok(resumed.profile.xp >= 100, 'XP survived the restart via Postgres');
});
