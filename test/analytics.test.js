'use strict';

process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const runtime = require('../src/runtime');
const analytics = require('../src/analytics');
const { getContent } = require('../src/content');

const DAY = '2026-08-01';
const send = (uid, text) => runtime.processMessage(uid, text, { today: DAY });
const joined = (r) => r.messages.map((m) => (typeof m === 'string' ? m : m.text || '')).join('\n');
const items = getContent('en').assessments.youth;
const correct = items.map((i) => i.answer);
const wrong = items.map((i) => (i.answer === 'A' ? 'B' : 'A'));

// Drive a user from onboarding through baseline, one lesson, and endline.
function fullJourney(uid) {
  send(uid, 'Hi');
  send(uid, '1'); // English
  send(uid, '1'); // Youth → baseline offer

  // Baseline — answer all wrong (score 0%).
  send(uid, 'START');
  let r;
  for (const a of wrong) r = send(uid, a);
  // Now on the mission. Complete the first lesson + its check (correct).
  send(uid, '1'); // start lesson
  const lesson = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < lesson.messages.length; i++) send(uid, 'NEXT');
  send(uid, getContent('en').checks['youth.foundations.privacy-intro'].answer);

  // Endline — answer all correct (score 100%).
  send(uid, 'FINAL');
  send(uid, 'START');
  for (const a of correct) r = send(uid, a);
  return r;
}

test('endline reports a learning gain vs baseline', () => {
  const last = fullJourney('learner-1');
  assert.match(joined(last), /0% at the start to 100% now/);
});

test('analytics.summary reflects the funnel, gain, checks and reach', () => {
  // learner-1 already completed a full journey above; add a second, lighter user.
  send('learner-2', 'Hi');
  send('learner-2', '1'); // English
  send('learner-2', '2'); // Adult → baseline offer
  send('learner-2', 'SKIP'); // skip baseline

  const a = analytics.summary({ today: DAY });

  assert.ok(a.reach.users >= 2, 'counts both users');
  assert.equal(a.funnel[0].stage, 'Joined');
  assert.ok(a.funnel.find((f) => f.stage === 'Completed ≥1 lesson').count >= 1);

  // learner-1 took baseline (0%) and endline (100%).
  assert.equal(a.learningGain.bothTaken, 1);
  assert.equal(a.learningGain.avgBaselinePct, 0);
  assert.equal(a.learningGain.avgEndlinePct, 100);
  assert.equal(a.learningGain.avgGainPoints, 100);

  // One knowledge check answered correctly.
  assert.ok(a.checks.answered >= 1);
  assert.equal(a.checks.accuracy, 100);

  // Activity has been logged (activeToday is keyed on the real event date, so
  // assert the date-independent "ever active" count instead).
  assert.ok(a.reach.distinctActive >= 2);
});

test('skipping the baseline records no assessment for that user', () => {
  // learner-2 skipped — should not contribute a baseline.
  const a = analytics.summary({ today: DAY });
  assert.equal(a.learningGain.baselineTaken, 1); // only learner-1
});

test('lessonBreakdown reports completions and check accuracy per lesson', () => {
  const rows = analytics.lessonBreakdown();
  assert.ok(rows.length >= 35, 'covers the whole curriculum');
  const intro = rows.find((r) => r.lessonId === 'youth.foundations.privacy-intro');
  assert.ok(intro, 'first lesson present');
  assert.equal(intro.track, 'youth');
  assert.ok(intro.completed >= 1, 'learner-1 completed it');
  assert.equal(intro.checkAccuracy, 100, 'learner-1 answered its check correctly');
  // Rows are in curriculum order: youth track comes before adult.
  assert.equal(rows[0].track, 'youth');
  assert.ok(rows.some((r) => r.track === 'adult'));
});

test('publicStats exposes only non-sensitive aggregates', () => {
  const s = analytics.publicStats();
  assert.ok(s.learners >= 2, 'counts joined learners');
  assert.equal(s.lessons, 35, 'full curriculum size');
  assert.equal(s.languages, 3);
  assert.equal(s.tracks, 2);
  // No PII fields leak through.
  assert.deepEqual(Object.keys(s).sort(), ['languages', 'learners', 'lessons', 'tracks']);
});

test('learners returns masked, per-user progress rows', () => {
  const rows = analytics.learners();
  assert.ok(rows.length >= 2);
  const l1 = rows.find((r) => r.id === '…er-1'); // last 4 of 'learner-1'
  assert.ok(l1, 'learner-1 present (masked)');
  assert.equal(l1.track, 'youth');
  assert.ok(l1.lessonsDone >= 1);
  assert.equal(l1.baselinePct, 0);
  assert.equal(l1.endlinePct, 100);
  // Masking never leaks a full phone number.
  for (const r of rows) assert.ok(!/^\d{5,}$/.test(r.id), 'ids are masked');
});
