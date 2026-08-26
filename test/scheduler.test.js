'use strict';

process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const nudges = require('../src/scheduler/nudges');
const config = require('../src/config');
const runtime = require('../src/runtime');
const db = require('../src/store/db');
const curriculum = require('../src/curriculum');
const { getContent } = require('../src/content');

const NOW = { hour: 20, day: '2026-06-10' };
const content = getContent('en');
const youthIds = curriculum.allLessonIds(content, 'youth');
const NO_CERT = { quizPassed: false, certIssued: false };

// A completed-set that leaves `remaining` lessons undone.
const doneLeaving = (remaining) => new Set(youthIds.slice(0, youthIds.length - remaining));

// ── gateAllows / backoffAllows (pure) ────────────────────────────────────────
test('gateAllows requires opt-in, a track, idleness today, and the reminder hour', () => {
  const base = { optInReminders: true, track: 'youth', reminderHour: 19, lastActiveDay: '2026-06-09' };
  assert.equal(nudges.gateAllows(base, NOW), true);
  assert.equal(nudges.gateAllows({ ...base, optInReminders: false }, NOW), false, 'not opted in');
  assert.equal(nudges.gateAllows({ ...base, track: null }, NOW), false, 'no track');
  assert.equal(nudges.gateAllows({ ...base, lastActiveDay: '2026-06-10' }, NOW), false, 'active today');
  assert.equal(nudges.gateAllows({ ...base, reminderHour: 22 }, NOW), false, 'before their hour');
});

test('backoff: 1/day, then weekly after several ignored, then paused', () => {
  const p = { optInReminders: true, track: 'youth', reminderHour: 19, lastActiveDay: '2026-06-01' };
  assert.equal(nudges.backoffAllows({ ...p, nudgeIgnored: 0, lastNudgeDay: null }, NOW), true);
  assert.equal(nudges.backoffAllows({ ...p, nudgeIgnored: 0, lastNudgeDay: NOW.day }, NOW), false, 'already today');
  // 3 ignored → weekly band: blocked 2 days after last nudge, allowed 7+ days later.
  assert.equal(nudges.backoffAllows({ ...p, nudgeIgnored: 3, lastNudgeDay: '2026-06-08' }, NOW), false, 'inside the week');
  assert.equal(nudges.backoffAllows({ ...p, nudgeIgnored: 3, lastNudgeDay: '2026-06-01' }, NOW), true, 'past the week');
  // 5 ignored → paused entirely.
  assert.equal(nudges.backoffAllows({ ...p, nudgeIgnored: 5, lastNudgeDay: '2026-05-01' }, NOW), false, 'paused');
});

// ── stageFor / buildNudge (pure) ─────────────────────────────────────────────
test('stageFor picks the right funnel stage', () => {
  const p = { track: 'youth', lastActiveDay: '2026-06-09' };
  // almost there: 2 lessons left, active recently
  assert.equal(nudges.stageFor(p, content, doneLeaving(2), NO_CERT, NOW), 'almostThere');
  // lessons done, quiz not passed
  assert.equal(nudges.stageFor(p, content, doneLeaving(0), NO_CERT, NOW), 'quizLeft');
  // done + quiz passed, not yet claimed
  assert.equal(nudges.stageFor(p, content, doneLeaving(0), { quizPassed: true, certIssued: false }, NOW), 'certReady');
  // certified → nothing
  assert.equal(nudges.stageFor(p, content, doneLeaving(0), { quizPassed: true, certIssued: true }, NOW), null);
  // mid-progress but active recently (5 left) → don't nag
  assert.equal(nudges.stageFor(p, content, doneLeaving(5), NO_CERT, NOW), null);
  // mid-progress and dormant (>=3 days idle) → reengage
  assert.equal(nudges.stageFor({ track: 'youth', lastActiveDay: '2026-06-01' }, content, doneLeaving(5), NO_CERT, NOW), 'reengage');
});

test('buildNudge writes the "almost there" message with the remaining count', () => {
  const n = nudges.buildNudge({ track: 'youth', lastActiveDay: '2026-06-09' }, content, doneLeaving(2), NO_CERT, NOW);
  assert.equal(n.type, 'almostThere');
  assert.match(n.message, /only 2 lessons left/);
  assert.equal(n.template.name, 'zega_almost_there');
  assert.equal(n.template.params[0], '2');
  assert.equal(n.button.value, 'CONTINUE');
});

test('buildNudge returns null when there is nothing worth sending', () => {
  // certified learner
  assert.equal(
    nudges.buildNudge({ track: 'youth', lastActiveDay: '2026-06-09' }, content, doneLeaving(0), { quizPassed: true, certIssued: true }, NOW),
    null
  );
});

test('buildNudge: cert-ready points at the CERTIFICATE action', () => {
  const n = nudges.buildNudge({ track: 'youth', lastActiveDay: '2026-06-09' }, content, doneLeaving(0), { quizPassed: true, certIssued: false }, NOW);
  assert.equal(n.type, 'certReady');
  assert.equal(n.template.name, 'zega_cert_ready');
  assert.equal(n.button.value, 'CERTIFICATE');
});

// ── preferredSendHour (pure) ─────────────────────────────────────────────────
test('preferredSendHour picks the busiest hour inside the safe window', () => {
  const counts = new Array(24).fill(0);
  counts[9] = 4; // 9am peak
  counts[14] = 7; // 2pm is busiest
  counts[23] = 20; // late night — outside the window, must be ignored
  const opts = { earliest: 8, latest: 21, minEvents: 5, fallback: 20 };
  assert.equal(nudges.preferredSendHour(counts, opts), 14);
});

test('preferredSendHour falls back on too little signal or an out-of-window peak', () => {
  const opts = { earliest: 8, latest: 21, minEvents: 5, fallback: 20 };
  // Below the minimum-events threshold → fallback.
  const thin = new Array(24).fill(0);
  thin[10] = 3;
  assert.equal(nudges.preferredSendHour(thin, opts), 20);
  // Enough events, but all outside [8,21] → fallback.
  const nocturnal = new Array(24).fill(0);
  nocturnal[2] = 6;
  assert.equal(nudges.preferredSendHour(nocturnal, opts), 20);
});

test('preferredSendHour breaks ties toward the fallback hour', () => {
  const counts = new Array(24).fill(0);
  counts[10] = 3;
  counts[18] = 3; // same count, but nearer the 20:00 fallback
  const opts = { earliest: 8, latest: 21, minEvents: 5, fallback: 20 };
  assert.equal(nudges.preferredSendHour(counts, opts), 18);
});

// ── runNudgeSweep (integration through the real runtime + DB) ─────────────────
test('runNudgeSweep sends an "almost there" nudge once, then not again the same day', async () => {
  const uid = 'sweep-almost';
  await runtime.processMessage(uid, 'Hi', { today: '2026-07-01' });
  await runtime.processMessage(uid, '1', { today: '2026-07-01' }); // English
  await runtime.processMessage(uid, '1', { today: '2026-07-01' }); // Youth
  await runtime.processMessage(uid, 'REMIND ON', { today: '2026-07-01' });
  // Finish all but 2 lessons → "almost there".
  for (const id of youthIds.slice(0, youthIds.length - 2)) db.markLessonComplete(uid, id);

  const sent = [];
  const sender = async (userId, nudge) => sent.push({ userId, type: nudge.type });

  const day2 = { hour: 20, day: '2026-07-02' };
  const first = await runtime.runNudgeSweep(day2, sender);
  assert.equal(first.length, 1);
  assert.equal(sent[0].userId, uid);
  assert.equal(sent[0].type, 'almostThere');

  // Same day again → already nudged, nothing sent.
  const again = await runtime.runNudgeSweep({ hour: 21, day: '2026-07-02' }, sender);
  assert.equal(again.length, 0);
  assert.equal(sent.length, 1);
});

test('every learner, including an Amharic one, gets the English reminder', async () => {
  const uid = 'sweep-amharic';
  await runtime.processMessage(uid, 'Hi', { today: '2026-07-10' });
  await runtime.processMessage(uid, '2', { today: '2026-07-10' }); // Amharic
  await runtime.processMessage(uid, '1', { today: '2026-07-10' }); // Youth
  await runtime.processMessage(uid, 'REMIND ON', { today: '2026-07-10' });
  for (const id of youthIds.slice(0, youthIds.length - 2)) db.markLessonComplete(uid, id); // almost there

  const sent = [];
  await runtime.runNudgeSweep({ hour: config.nudgeHour, day: '2026-07-11' }, async (u, n) => sent.push({ u, n }));
  const mine = sent.find((s) => s.u === uid);
  assert.ok(mine, 'Amharic learner is nudged too');
  assert.match(mine.n.message, /almost there|lessons left/i, 'the reminder content is English');
});

test('the daily send window holds reminders until config.nudgeHour', async () => {
  const uid = 'sweep-window';
  await runtime.processMessage(uid, 'Hi', { today: '2026-07-20' });
  await runtime.processMessage(uid, '1', { today: '2026-07-20' }); // English
  await runtime.processMessage(uid, '1', { today: '2026-07-20' }); // Youth
  await runtime.processMessage(uid, 'REMIND ON', { today: '2026-07-20' });
  for (const id of youthIds.slice(0, youthIds.length - 2)) db.markLessonComplete(uid, id); // almost there

  const send = async () => {};
  const day = '2026-09-01';
  const before = await runtime.runNudgeSweep({ hour: config.nudgeHour - 1, day }, send);
  assert.equal(before.length, 0, 'the whole sweep is held before the send hour');
  const at = await runtime.runNudgeSweep({ hour: config.nudgeHour, day }, send);
  assert.ok(at.some((x) => x.userId === uid), 'the learner is sent once the send hour arrives');
});

test('an on-track, recently-active learner is NOT nudged (no spam)', async () => {
  const uid = 'sweep-ontrack';
  await runtime.processMessage(uid, 'Hi', { today: '2026-07-05' });
  await runtime.processMessage(uid, '1', { today: '2026-07-05' });
  await runtime.processMessage(uid, '1', { today: '2026-07-05' });
  await runtime.processMessage(uid, 'REMIND ON', { today: '2026-07-05' });
  // Only a couple of lessons done, many remain → mid-progress.
  for (const id of youthIds.slice(0, 2)) db.markLessonComplete(uid, id);

  // Idle the very next day (gap 1, not dormant) → no stage → no nudge.
  const sent = [];
  await runtime.runNudgeSweep({ hour: 20, day: '2026-07-06' }, async (u, n) => sent.push({ u, t: n.type }));
  assert.ok(!sent.some((s) => s.u === uid), 'mid-progress active learner is left alone');
});

// ── personalized send-time (refresh + sweep floor) ───────────────────────────
// These flip config.personalizedSendHour on, so they run LAST — the opted-in
// learners they create would otherwise inflate the exact-count sweep tests above.
test('refreshAutoSendHours moves auto learners to fallback on thin data, leaves manual ones', async () => {
  const orig = config.personalizedSendHour;
  config.personalizedSendHour = true;
  try {
    const autoId = 'rh-refresh-auto';
    await runtime.processMessage(autoId, 'Hi', { today: '2026-10-01' });
    await runtime.processMessage(autoId, '1', { today: '2026-10-01' }); // English
    await runtime.processMessage(autoId, '1', { today: '2026-10-01' }); // Youth
    await runtime.processMessage(autoId, 'REMIND ON', { today: '2026-10-01' }); // stays auto

    const manualId = 'rh-refresh-manual';
    await runtime.processMessage(manualId, 'Hi', { today: '2026-10-01' });
    await runtime.processMessage(manualId, '1', { today: '2026-10-01' });
    await runtime.processMessage(manualId, '1', { today: '2026-10-01' });
    await runtime.processMessage(manualId, 'REMIND 7', { today: '2026-10-01' }); // manual override

    assert.equal(db.getOrCreateProfile(manualId).reminderHourAuto, false, 'REMIND <hour> pins the hour');

    await runtime.refreshAutoSendHours({ day: '2026-10-02' });

    // Thin activity → auto learner is parked at the fallback (config.nudgeHour).
    assert.equal(db.getOrCreateProfile(autoId).reminderHour, config.nudgeHour, 'auto learner uses the fallback hour');
    // The manual learner's 7:00 is never touched.
    assert.equal(db.getOrCreateProfile(manualId).reminderHour, 7, 'manual hour is left alone');
  } finally {
    config.personalizedSendHour = orig;
  }
});

test('with personalization on, the sweep floor drops to nudgeEarliestHour', async () => {
  const orig = config.personalizedSendHour;
  config.personalizedSendHour = true;
  try {
    const uid = 'sweep-personalized';
    await runtime.processMessage(uid, 'Hi', { today: '2026-11-01' });
    await runtime.processMessage(uid, '1', { today: '2026-11-01' });
    await runtime.processMessage(uid, '1', { today: '2026-11-01' });
    await runtime.processMessage(uid, 'REMIND 9', { today: '2026-11-01' }); // early, manual hour
    for (const id of youthIds.slice(0, youthIds.length - 2)) db.markLessonComplete(uid, id); // almost there

    const sent = [];
    // 9:00 is below config.nudgeHour but at/above the learner's hour and the floor.
    await runtime.runNudgeSweep({ hour: 9, day: '2026-11-02' }, async (u, n) => sent.push({ u, t: n.type }));
    assert.ok(sent.some((s) => s.u === uid), 'a 9:00 learner is sent in the morning when personalization is on');
  } finally {
    config.personalizedSendHour = orig;
  }
});
