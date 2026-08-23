'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { segmentOf, tally, SEGMENT_KEYS } = require('../src/learners/segments');

const NOW = { day: '2026-06-10' };
const prog = (done, total) => ({ done, total, remaining: total - done, complete: total > 0 && done >= total });

test('segmentOf resolves each bucket, highest-value first', () => {
  const active = { lastActiveDay: '2026-06-09' }; // 1-day gap
  assert.equal(segmentOf(active, prog(10, 10), { quizPassed: true, certIssued: true }, NOW), 'certified');
  assert.equal(segmentOf(active, prog(10, 10), { quizPassed: true, certIssued: false }, NOW), 'eligible');
  assert.equal(segmentOf(active, prog(10, 10), { quizPassed: false }, NOW), 'near_finish', 'done, quiz not passed');
  assert.equal(segmentOf(active, prog(8, 10), {}, NOW), 'near_finish', '2 lessons left');
  assert.equal(segmentOf(active, prog(3, 10), {}, NOW), 'active', 'progressing + recent');
  assert.equal(segmentOf({ lastActiveDay: '2026-06-05' }, prog(3, 10), {}, NOW), 'lapsing', '5-day gap');
  assert.equal(segmentOf({ lastActiveDay: '2026-05-20' }, prog(3, 10), {}, NOW), 'dormant', '21-day gap');
  assert.equal(segmentOf({ lastActiveDay: '2026-06-10' }, prog(0, 10), {}, NOW), 'new', 'joined, no progress');
});

test('near-finish beats lapsing/dormant (an idle almost-done learner is still worth a close-the-gap push)', () => {
  assert.equal(segmentOf({ lastActiveDay: '2026-05-01' }, prog(9, 10), {}, NOW), 'near_finish');
});

test('tally covers every segment key and counts correctly', () => {
  const t = tally(['active', 'active', 'dormant', 'new']);
  assert.deepEqual(Object.keys(t).sort(), [...SEGMENT_KEYS].sort());
  assert.equal(t.active, 2);
  assert.equal(t.dormant, 1);
  assert.equal(t.eligible, 0);
});
