'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { riskScore, riskBand, isSavable } = require('../src/learners/risk');

const NOW = { day: '2026-06-10' };
const prog = (done, total) => ({ done, total, remaining: total - done, complete: total > 0 && done >= total });

test('a certified learner has zero risk', () => {
  const s = riskScore({ lastActiveDay: '2026-05-01', streak: 0 }, prog(10, 10), { quizPassed: true, certIssued: true }, NOW);
  assert.equal(s, 0);
});

test('risk rises with idle time and falls with a streak', () => {
  const active = riskScore({ lastActiveDay: '2026-06-09', streak: 5 }, prog(3, 10), {}, NOW); // 1-day gap, good streak
  const lapsed = riskScore({ lastActiveDay: '2026-06-01', streak: 0 }, prog(3, 10), {}, NOW); // 9-day gap, no streak
  const dormant = riskScore({ lastActiveDay: '2026-05-10', streak: 0 }, prog(1, 10), {}, NOW); // 31-day gap, stalled early
  assert.ok(active < lapsed, 'recent + streak is lower risk than lapsed + no streak');
  assert.ok(lapsed < dormant, 'longer idle + early stall is higher risk');
  assert.equal(riskBand(active), 'low');
  assert.equal(riskBand(dormant), 'high');
});

test('finishing all lessons dampens risk (only quiz/claim left)', () => {
  const idle = { lastActiveDay: '2026-05-20', streak: 0 }; // 21-day gap
  const midStalled = riskScore(idle, prog(4, 10), {}, NOW);
  const allDone = riskScore(idle, prog(10, 10), { quizPassed: false }, NOW);
  assert.ok(allDone < midStalled, 'a learner who finished the lessons is less of a churn risk');
});

test('isSavable flags at-risk learners who have real progress', () => {
  assert.equal(isSavable(50, prog(6, 10)), true);   // at risk + progress
  assert.equal(isSavable(50, prog(0, 10)), false);  // at risk but nothing to save
  assert.equal(isSavable(10, prog(6, 10)), false);  // has progress but not at risk
});
