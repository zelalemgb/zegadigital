'use strict';

// Use an isolated in-memory database for these tests.
process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const runtime = require('../src/runtime');
const { getContent } = require('../src/content');
const { levelInfo } = require('../src/gamification/xp');

const joined = (r) => r.messages.map((m) => (typeof m === 'string' ? m : m.text || '')).join('\n');

// Helper: onboard a fresh user onto the youth track on a given day, skipping the
// optional baseline assessment so we land on the mission home.
async function onboardYouth(uid, today) {
  await runtime.processMessage(uid, 'Hi', { today });
  await runtime.processMessage(uid, '1', { today }); // English
  await runtime.processMessage(uid, '1', { today }); // Youth track → baseline offer
  return runtime.processMessage(uid, 'SKIP', { today }); // skip baseline → mission
}

test('completing a lesson awards XP, persists progress, and unlocks First Steps', async () => {
  const uid = 'u-lesson';
  const day = '2026-01-01';
  await onboardYouth(uid, day);
  await runtime.processMessage(uid, '1', { today: day }); // start next lesson (page 0)

  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < node.messages.length; i++) await runtime.processMessage(uid, 'NEXT', { today: day });

  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const done = await runtime.processMessage(uid, check.answer, { today: day });

  assert.ok(done.profile.xp >= 100, `expected substantial XP, got ${done.profile.xp}`);
  assert.ok(done.profile.badges >= 1, 'should have earned at least one badge');
  assert.match(joined(done), /New badge/);
  assert.match(joined(done), /First Steps/);
});

test('XP and progress persist across a fresh conversation (restart)', async () => {
  const uid = 'u-persist';
  const day = '2026-02-01';
  await onboardYouth(uid, day);
  await runtime.processMessage(uid, '1', { today: day });
  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < node.messages.length; i++) await runtime.processMessage(uid, 'NEXT', { today: day });
  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const before = (await runtime.processMessage(uid, check.answer, { today: day })).profile.xp;

  // Restart the conversation — progress must survive.
  const resumed = await runtime.startConversation(uid, { today: day });
  assert.equal(resumed.profile.xp, before);
  assert.equal(resumed.profile.track, 'youth');
  assert.match(joined(resumed), /Today's lesson/);
});

test('daily streak grows across days and unlocks a streak badge', async () => {
  const uid = 'u-streak';
  await onboardYouth(uid, '2026-03-01');
  const d2 = await runtime.processMessage(uid, 'MENU', { today: '2026-03-02' });
  assert.equal(d2.profile.streak, 2);
  assert.match(joined(d2), /streak/i);
  const d3 = await runtime.processMessage(uid, 'MENU', { today: '2026-03-03' });
  assert.equal(d3.profile.streak, 3);
  assert.ok(d3.profile.badges >= 1, 'a 3-day streak should award the On a Roll badge');
});

test('a single missed day is forgiven (streak freeze)', async () => {
  const uid = 'u-freeze';
  await onboardYouth(uid, '2026-04-01'); // day 1
  await runtime.processMessage(uid, 'MENU', { today: '2026-04-02' }); // day 2 → streak 2
  // Skip 2026-04-03, return on 2026-04-04 (gap of 2 days = forgiven once).
  const back = await runtime.processMessage(uid, 'MENU', { today: '2026-04-04' });
  assert.equal(back.profile.streak, 3);
});

test('the engine surfaces context-aware action buttons', async () => {
  const uid = 'u-actions';
  const r = await onboardYouth(uid, '2026-05-01'); // mission screen
  const labels = r.actions.map((a) => a.label).join(' ');
  assert.match(labels, /Start/);
  assert.match(labels, /Progress/);
});

test('levelInfo maps XP to the right identity tier', () => {
  assert.equal(levelInfo(0).name, 'Beginner');
  assert.equal(levelInfo(150).name, 'Learner');
  assert.equal(levelInfo(1600).name, 'Expert');
  assert.equal(levelInfo(1600).isMax, true);
});
