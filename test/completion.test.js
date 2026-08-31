'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { completionBand, tally, BAND_KEYS } = require('../src/learners/completion');

test('completionBand maps a percentage to its 10-point band', () => {
  assert.equal(completionBand(50), '50-59', 'the 50% floor is included');
  assert.equal(completionBand(59), '50-59');
  assert.equal(completionBand(60), '60-69');
  assert.equal(completionBand(72), '70-79');
  assert.equal(completionBand(89), '80-89');
  assert.equal(completionBand(90), '90-99');
  assert.equal(completionBand(99), '90-99');
  assert.equal(completionBand(100), '100', 'a finished track is its own band');
});

test('completionBand rounds, and returns null below the 50% floor', () => {
  assert.equal(completionBand(49), null, 'just under the floor');
  assert.equal(completionBand(0), null);
  assert.equal(completionBand(49.6), '50-59', 'rounds up to the floor');
  assert.equal(completionBand(54.4), '50-59', 'rounds down within a band');
  assert.equal(completionBand(null), null, 'no percentage → no band');
  assert.equal(completionBand(NaN), null);
  assert.equal(completionBand(120), '100', 'clamped to 100');
});

test('tally covers every band key and counts only 50%+ learners', () => {
  const t = tally([0, 12, 49, 50, 55, 72, 95, 100, 100]);
  assert.deepEqual(Object.keys(t).sort(), [...BAND_KEYS].sort());
  assert.equal(t['50-59'], 2, '50 and 55');
  assert.equal(t['70-79'], 1);
  assert.equal(t['90-99'], 1);
  assert.equal(t['100'], 2);
  assert.equal(t['60-69'], 0);
  assert.equal(t['80-89'], 0);
  // Learners below 50% (0, 12, 49) are excluded entirely.
  const total = Object.values(t).reduce((n, c) => n + c, 0);
  assert.equal(total, 6, 'only the six ≥50% learners are counted');
});
