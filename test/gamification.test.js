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
function onboardYouth(uid, today) {
  runtime.processMessage(uid, 'Hi', { today });
  runtime.processMessage(uid, '1', { today }); // English
  runtime.processMessage(uid, '1', { today }); // Youth track → baseline offer
  return runtime.processMessage(uid, 'SKIP', { today }); // skip baseline → mission
}

test('completing a lesson awards XP, persists progress, and unlocks First Steps', () => {
  const uid = 'u-lesson';
  const day = '2026-01-01';
  onboardYouth(uid, day);
  runtime.processMessage(uid, '1', { today: day }); // start next lesson (page 0)

  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < node.messages.length; i++) runtime.processMessage(uid, 'NEXT', { today: day });

  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const done = runtime.processMessage(uid, check.answer, { today: day });

  assert.ok(done.profile.xp >= 100, `expected substantial XP, got ${done.profile.xp}`);
  assert.ok(done.profile.badges >= 1, 'should have earned at least one badge');
  assert.match(joined(done), /Badge unlocked/);
  assert.match(joined(done), /First Steps/);
});

test('XP and progress persist across a fresh conversation (restart)', () => {
  const uid = 'u-persist';
  const day = '2026-02-01';
  onboardYouth(uid, day);
  runtime.processMessage(uid, '1', { today: day });
  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < node.messages.length; i++) runtime.processMessage(uid, 'NEXT', { today: day });
  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const before = runtime.processMessage(uid, check.answer, { today: day }).profile.xp;

  // Restart the conversation — progress must survive.
  const resumed = runtime.startConversation(uid, { today: day });
  assert.equal(resumed.profile.xp, before);
  assert.equal(resumed.profile.track, 'youth');
  assert.match(joined(resumed), /Today's mission/);
});

test('daily streak grows across days and unlocks a streak badge', () => {
  const uid = 'u-streak';
  onboardYouth(uid, '2026-03-01');
  const d2 = runtime.processMessage(uid, 'MENU', { today: '2026-03-02' });
  assert.equal(d2.profile.streak, 2);
  assert.match(joined(d2), /streak/i);
  const d3 = runtime.processMessage(uid, 'MENU', { today: '2026-03-03' });
  assert.equal(d3.profile.streak, 3);
  assert.ok(d3.profile.badges >= 1, 'a 3-day streak should award the On a Roll badge');
});

test('a single missed day is forgiven (streak freeze)', () => {
  const uid = 'u-freeze';
  onboardYouth(uid, '2026-04-01'); // day 1
  runtime.processMessage(uid, 'MENU', { today: '2026-04-02' }); // day 2 → streak 2
  // Skip 2026-04-03, return on 2026-04-04 (gap of 2 days = forgiven once).
  const back = runtime.processMessage(uid, 'MENU', { today: '2026-04-04' });
  assert.equal(back.profile.streak, 3);
});

test('the engine surfaces context-aware action buttons', () => {
  const uid = 'u-actions';
  const r = onboardYouth(uid, '2026-05-01'); // mission screen
  const labels = r.actions.map((a) => a.label).join(' ');
  assert.match(labels, /Start/);
  assert.match(labels, /Progress/);
});

test('levelInfo maps XP to the right identity tier', () => {
  assert.equal(levelInfo(0).name, 'Curious');
  assert.equal(levelInfo(150).name, 'Aware');
  assert.equal(levelInfo(1600).name, 'Digital Citizen');
  assert.equal(levelInfo(1600).isMax, true);
});
