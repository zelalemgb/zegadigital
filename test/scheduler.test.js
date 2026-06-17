'use strict';

process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const { selectDueNudges, classify, buildNudge } = require('../src/scheduler/nudges');
const runtime = require('../src/runtime');
const { getContent } = require('../src/content');

const NOW = { hour: 20, day: '2026-06-10' };

test('selectDueNudges picks only opted-in, idle, not-yet-nudged users past their hour', () => {
  const profiles = [
    { userId: 'A', optInReminders: true, reminderHour: 19, lastActiveDay: '2026-06-09', lastNudgeDay: null, streak: 3 },
    { userId: 'B', optInReminders: false, reminderHour: 19, lastActiveDay: '2026-06-09' },
    { userId: 'C', optInReminders: true, reminderHour: 19, lastActiveDay: '2026-06-10' }, // active today
    { userId: 'D', optInReminders: true, reminderHour: 22, lastActiveDay: '2026-06-09' }, // too early
    { userId: 'E', optInReminders: true, reminderHour: 19, lastActiveDay: '2026-06-09', lastNudgeDay: '2026-06-10' }, // already nudged
    { userId: 'F', optInReminders: true, reminderHour: 19, lastActiveDay: null }, // never active
  ];
  const due = selectDueNudges(profiles, NOW);
  assert.deepEqual(due.map((d) => d.userId).sort(), ['A', 'F']);
  assert.equal(due.find((d) => d.userId === 'A').type, 'streak');
  assert.equal(due.find((d) => d.userId === 'F').type, 'reengage');
});

test('classify distinguishes daily / streak / reengage', () => {
  assert.equal(classify({ lastActiveDay: null }, NOW), 'reengage');
  assert.equal(classify({ lastActiveDay: '2026-06-05', streak: 1 }, NOW), 'reengage'); // 5-day gap
  assert.equal(classify({ lastActiveDay: '2026-06-09', streak: 3 }, NOW), 'streak');
  assert.equal(classify({ lastActiveDay: '2026-06-09', streak: 0 }, NOW), 'daily');
});

test('buildNudge produces a message, a CONTINUE button, and a template name', () => {
  const content = getContent('en');
  const n = buildNudge({ track: 'youth', streak: 0, lastActiveDay: '2026-06-09' }, content, new Set(), 'daily');
  assert.match(n.message, /Introduction to Privacy/);
  assert.equal(n.button.value, 'CONTINUE');
  assert.equal(n.template.name, 'zega_daily_nudge');
});

test('runNudgeSweep sends once, records it, and does not repeat the same day', async () => {
  const uid = 'sweep-user';
  // Onboard on day 1, opt in.
  runtime.processMessage(uid, 'Hi', { today: '2026-07-01' });
  runtime.processMessage(uid, '1', { today: '2026-07-01' }); // English
  runtime.processMessage(uid, '1', { today: '2026-07-01' }); // Youth
  runtime.processMessage(uid, 'REMIND ON', { today: '2026-07-01' });

  const sent = [];
  const sender = async (userId, nudge) => sent.push({ userId, type: nudge.type });

  const due1 = await runtime.runNudgeSweep({ hour: 20, day: '2026-07-02' }, sender);
  assert.equal(due1.length, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].userId, uid);

  // Same day again → already nudged, nothing sent.
  const due2 = await runtime.runNudgeSweep({ hour: 21, day: '2026-07-02' }, sender);
  assert.equal(due2.length, 0);
  assert.equal(sent.length, 1);
});
