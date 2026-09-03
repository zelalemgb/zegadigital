'use strict';

process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const runtime = require('../src/runtime');
const analytics = require('../src/analytics');
const db = require('../src/store/db');
const certs = require('../src/certificates');
const { getContent } = require('../src/content');

const DAY = '2026-08-01';
const send = (uid, text) => runtime.processMessage(uid, text, { today: DAY });
const joined = (r) => r.messages.map((m) => (typeof m === 'string' ? m : m.text || '')).join('\n');
const items = getContent('en').assessments.youth;
const correct = items.map((i) => i.answer);
const wrong = items.map((i) => (i.answer === 'A' ? 'B' : 'A'));

// Drive a user from onboarding through baseline, one lesson, and endline.
async function fullJourney(uid) {
  await send(uid, 'Hi');
  await send(uid, '1'); // English
  await send(uid, '1'); // Youth → baseline offer

  // Baseline — answer all wrong (score 0%).
  await send(uid, 'START');
  let r;
  for (const a of wrong) r = await send(uid, a);
  // Now on the mission. Complete the first lesson + its check (correct).
  await send(uid, '1'); // start lesson
  const lesson = getContent('en').nodes['youth.foundations.privacy-intro'];
  for (let i = 0; i < lesson.messages.length; i++) await send(uid, 'NEXT');
  await send(uid, getContent('en').checks['youth.foundations.privacy-intro'].answer);

  // Endline — answer all correct (score 100%).
  await send(uid, 'FINAL');
  await send(uid, 'START');
  for (const a of correct) r = await send(uid, a);
  return r;
}

test('endline reports a learning gain vs baseline', async () => {
  const last = await fullJourney('learner-1');
  assert.match(joined(last), /0% at the start to 100% now/);
});

test('analytics.summary reflects the funnel, gain, checks and reach', async () => {
  // learner-1 already completed a full journey above; add a second, lighter user.
  await send('learner-2', 'Hi');
  await send('learner-2', '1'); // English
  await send('learner-2', '2'); // Adult → baseline offer
  await send('learner-2', 'SKIP'); // skip baseline

  const a = await analytics.summary({ today: DAY });

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

  // Every learner lands in exactly one segment; the buckets sum to the user count.
  const segKeys = a.segments.meta.map((m) => m.key);
  assert.deepEqual(Object.keys(a.segments.counts).sort(), [...segKeys].sort());
  const segSum = Object.values(a.segments.counts).reduce((n, c) => n + c, 0);
  assert.equal(segSum, a.reach.users, 'segments partition all learners');

  // At-risk bands partition all learners too; savable is a subset.
  const riskSum = a.atRisk.bands.high + a.atRisk.bands.medium + a.atRisk.bands.low;
  assert.equal(riskSum, a.reach.users, 'risk bands partition all learners');
  assert.ok(a.atRisk.savable <= a.reach.users);
});

test('summary counts certificates earned (issued rows) and shows the funnel stage', async () => {
  // No certificates issued yet by the journeys above.
  const before = await analytics.summary({ today: DAY });
  assert.equal(before.certificates.issued, 0);
  assert.equal(before.certificates.learners, 0);
  assert.equal(before.funnel.find((f) => f.stage === 'Earned certificate').count, 0);

  // Issue one certificate for learner-1 (youth).
  await db.issueCertificate(certs.generateCode(), 'learner-1', 'Abebe Bikila', 'youth', 'en');

  const after = await analytics.summary({ today: DAY });
  assert.equal(after.certificates.issued, 1, 'one certificate issued');
  assert.equal(after.certificates.learners, 1, 'one distinct learner certified');
  assert.equal(after.funnel.find((f) => f.stage === 'Earned certificate').count, 1);
  assert.ok(after.certificates.byTrack.find((t) => t.track === 'youth').c === 1);
});

test('skipping the baseline records no assessment for that user', async () => {
  // learner-2 skipped — should not contribute a baseline.
  const a = await analytics.summary({ today: DAY });
  assert.equal(a.learningGain.baselineTaken, 1); // only learner-1
});

test('lessonBreakdown reports completions and check accuracy per lesson', async () => {
  const rows = await analytics.lessonBreakdown();
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

test('publicStats exposes only non-sensitive aggregates', async () => {
  const s = await analytics.publicStats();
  assert.ok(s.learners >= 2, 'counts joined learners');
  assert.equal(s.lessons, 35, 'full curriculum size');
  assert.equal(s.languages, 3);
  assert.equal(s.tracks, 2);
  // No PII fields leak through.
  assert.deepEqual(Object.keys(s).sort(), ['languages', 'learners', 'lessons', 'tracks']);
});

test('nudgeStatus reports today\'s sent/failed counts (no PII)', async () => {
  const today = new Date().toISOString().slice(0, 10);
  await db.logEvent('nudge-user', 'nudgeSent', { type: 'almostThere' });
  const s = await analytics.nudgeStatus(today);
  assert.ok(s.sentToday >= 1, 'counts a nudge sent today');
  assert.equal(typeof s.failedToday, 'number');
  assert.ok(s.sentTotal >= s.sentToday);
  assert.deepEqual(Object.keys(s).sort(), ['day', 'failedToday', 'lastError', 'sentToday', 'sentTotal']);
});

test('learners returns masked, per-user progress rows', async () => {
  const rows = await analytics.learners();
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

test('summary reports the completion-depth distribution (50% → done)', async () => {
  const curriculum = require('../src/curriculum');
  const { completionBand } = require('../src/learners/completion');
  const youthIds = curriculum.allLessonIds(getContent('en'), 'youth');

  const before = await analytics.summary({ today: DAY });

  // Onboard a fresh learner to youth and complete all but one lesson → a high band.
  await send('depth-user', 'Hi');
  await send('depth-user', '1'); // English
  await send('depth-user', '1'); // Youth
  const doneCount = youthIds.length - 1;
  for (const id of youthIds.slice(0, doneCount)) db.markLessonComplete('depth-user', id);
  const expectedBand = completionBand(Math.round((doneCount / youthIds.length) * 100));

  const after = await analytics.summary({ today: DAY });
  const cmp = after.completion;

  // Shape: every band present, bands sum to the ≥50% total, denominator is tracked learners.
  const bandKeys = cmp.meta.map((b) => b.key);
  assert.deepEqual(Object.keys(cmp.counts).sort(), [...bandKeys].sort());
  const sum = Object.values(cmp.counts).reduce((n, c) => n + c, 0);
  assert.equal(sum, cmp.atLeast50, 'bands sum to the ≥50% total');
  assert.equal(cmp.tracked, after.reach.pickedTrack, 'denominator is learners who picked a track');
  assert.equal(cmp.floor, 50);

  // The new near-finisher lands in the expected band and lifts the ≥50% count by one.
  assert.equal(cmp.atLeast50, before.completion.atLeast50 + 1, 'one more learner is ≥50% done');
  assert.equal(
    cmp.counts[expectedBand],
    (before.completion.counts[expectedBand] || 0) + 1,
    `the learner lands in the ${expectedBand} band`
  );
});

test('summary breaks down Youth vs Adult, language, and module engagement', async () => {
  const a = await analytics.summary({ today: DAY });

  // ── Youth vs Adult ──
  const trackMap = Object.fromEntries(a.tracks.map((t) => [t.track, t]));
  assert.ok(trackMap.youth && trackMap.adult, 'both tracks present');
  const trackLearners = a.tracks.reduce((n, t) => n + t.learners, 0);
  assert.equal(trackLearners, a.reach.pickedTrack, 'per-track learners sum to pickedTrack');
  const trackStarted = a.tracks.reduce((n, t) => n + t.started, 0);
  assert.equal(trackStarted, a.reach.startedLesson, 'per-track "started" sums to the total');
  const trackCompleted = a.tracks.reduce((n, t) => n + t.completed, 0);
  assert.equal(trackCompleted, a.reach.completedTrack, 'per-track completions sum to the total');
  const trackCertified = a.tracks.reduce((n, t) => n + t.certified, 0);
  assert.equal(trackCertified, a.certificates.issued, 'per-track certified sums to certificates issued');
  for (const t of a.tracks) assert.ok(t.avgPct >= 0 && t.avgPct <= 100, 'avgPct is a percentage');

  // ── Language split ──
  const langLearners = a.byLang.reduce((n, l) => n + l.learners, 0);
  assert.equal(langLearners, a.reach.users, 'language buckets partition all learners');
  const langCompleted = a.byLang.reduce((n, l) => n + l.completedAny, 0);
  assert.equal(langCompleted, a.reach.startedLesson, 'completed≥1 by language sums to startedLesson');
  // Sorted by learners, descending.
  for (let i = 1; i < a.byLang.length; i++) assert.ok(a.byLang[i - 1].learners >= a.byLang[i].learners, 'byLang sorted desc');

  // ── Module engagement (in-progress learners) ──
  assert.ok(Array.isArray(a.moduleEngagement) && a.moduleEngagement.length >= 2, 'modules present');
  for (const m of a.moduleEngagement) {
    assert.ok(['youth', 'adult'].includes(m.track), 'module tagged with a track');
    assert.ok(typeof m.module === 'string' && m.module.length, 'module has a label');
    assert.ok(m.completed >= 0, 'completion count is non-negative');
  }
  // Ranked by completions in the period, most-preferred first.
  for (let i = 1; i < a.moduleEngagement.length; i++) {
    assert.ok(a.moduleEngagement[i - 1].completed >= a.moduleEngagement[i].completed, 'modules ranked desc by completions');
  }
});

test('sinceFor computes the range floor dates', () => {
  assert.equal(analytics.sinceFor('all', '2026-08-01'), null);
  assert.equal(analytics.sinceFor('today', '2026-08-01'), '2026-08-01');
  assert.equal(analytics.sinceFor('week', '2026-08-01'), '2026-07-26', 'last 7 days');
  assert.equal(analytics.sinceFor('month', '2026-08-01'), '2026-07-03', 'last 30 days');
});

test('range filter windows flow metrics by join date; snapshots stay all-time', async () => {
  const uid = 'window-old';
  await send(uid, 'Hi');
  await send(uid, '1'); // English
  await send(uid, '1'); // Youth
  // Backdate this learner's join far outside any window.
  db.db.prepare("UPDATE profiles SET created_at = '2020-01-01 00:00:00' WHERE user_id = ?").run(uid);

  const all = await analytics.summary({ today: DAY, range: 'all' });
  const month = await analytics.summary({ today: DAY, range: 'month' });

  assert.equal(all.windowed, false);
  assert.equal(month.windowed, true);
  assert.equal(month.range, 'month');

  // The backdated learner counts in the all-time cohort but not the month cohort.
  assert.ok(all.reach.users > month.reach.users, 'windowing drops learners who joined before the window');

  // Snapshot cards (segments) are all-time in BOTH — they never shrink with the range.
  const segSum = (s) => Object.values(s.segments.counts).reduce((n, c) => n + c, 0);
  assert.equal(segSum(all), segSum(month), 'segments stay all-time regardless of range');
  assert.equal(segSum(all), all.reach.users, 'all-time segments cover every learner');
  // completion.tracked is the all-time denominator, unaffected by the window.
  assert.equal(month.completion.tracked, all.completion.tracked, 'completion denominator is all-time');
});
