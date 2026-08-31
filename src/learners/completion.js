'use strict';

/**
 * Completion-depth distribution — how far through their track the learners who
 * are at least halfway done have got. Buckets by percentage of lessons
 * completed, in 10-point bands from 50% up to a finished track (100%).
 *
 * This is deliberately a *near-finisher* view: learners below 50% (and anyone
 * who hasn't picked a track yet) fall outside it. It answers "of the people
 * within striking distance, where do they cluster, and how many are one nudge
 * from done?" — the base for a close-the-gap push. Pure and I/O-free, like
 * [[segments]], so it's trivial to test and reuse.
 *
 *   completionBand(72)  -> '70-79'
 *   completionBand(100) -> '100'      (completed the track)
 *   completionBand(40)  -> null       (below the 50% floor)
 */

// Ordered low→high so the dashboard renders 50–59% first and "Completed" last.
const BANDS = [
  { key: '50-59', label: '50–59%', min: 50, max: 59 },
  { key: '60-69', label: '60–69%', min: 60, max: 69 },
  { key: '70-79', label: '70–79%', min: 70, max: 79 },
  { key: '80-89', label: '80–89%', min: 80, max: 89 },
  { key: '90-99', label: '90–99%', min: 90, max: 99 },
  { key: '100', label: 'Completed', min: 100, max: 100 },
];
const BAND_KEYS = BANDS.map((b) => b.key);

// The 50% floor for this view — learners below it are not counted.
const FLOOR = 50;

/**
 * The band key for a completion percentage, or null if below the 50% floor.
 * The percentage is rounded to a whole number first, matching the per-learner
 * `pct` shown in the roster (done/total, rounded), so the bands line up with it.
 */
function completionBand(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  const p = Math.min(100, Math.max(0, Math.round(pct)));
  if (p < FLOOR) return null;
  for (const b of BANDS) if (p >= b.min && p <= b.max) return b.key;
  return null;
}

/** Tally completion percentages into {key: count} across the 50%+ bands. */
function tally(pcts) {
  const out = Object.fromEntries(BAND_KEYS.map((k) => [k, 0]));
  for (const pct of pcts) {
    const k = completionBand(pct);
    if (k) out[k] += 1;
  }
  return out;
}

module.exports = { completionBand, tally, BANDS, BAND_KEYS, FLOOR };
