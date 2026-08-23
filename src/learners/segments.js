'use strict';

/**
 * Learner segmentation — a Recency / Frequency / Progress bucketing, pure and
 * I/O-free so it's trivial to test and reuse. Every learner falls into exactly
 * one segment, which drives the "learner management" dashboard view and lets
 * the reminder/at-risk logic target the right people.
 *
 *   segmentOf({ track, lastActiveDay }, prog, cert, now)
 *     prog = { done, total, remaining, complete }
 *     cert = { quizPassed, certIssued }
 *     now  = { day: 'YYYY-MM-DD' }
 */

const { dayGap } = require('../gamification/streak');

const LAPSING_GAP = 3;   // idle ≥ this (but < DORMANT) → slipping away
const DORMANT_GAP = 14;  // idle ≥ this → likely lost
const NEAR_LEFT = 2;     // ≤ this many lessons remaining → closing in

// Ordered, mutually-exclusive segments with display metadata. Order is the
// funnel from success back to the start; segmentOf resolves highest-value first.
const SEGMENTS = [
  { key: 'certified', label: 'Certified', hint: 'Earned their certificate' },
  { key: 'eligible', label: 'Certificate-ready', hint: 'Finished + passed the quiz — not claimed yet' },
  { key: 'near_finish', label: 'Near finish', hint: 'Lessons done or ≤2 left' },
  { key: 'active', label: 'Active', hint: 'Progressing, seen in the last 3 days' },
  { key: 'lapsing', label: 'Lapsing', hint: 'Idle 3–13 days — at risk' },
  { key: 'dormant', label: 'Dormant', hint: 'Idle 14+ days' },
  { key: 'new', label: 'New', hint: 'Just joined / no progress yet' },
];
const SEGMENT_KEYS = SEGMENTS.map((s) => s.key);

function gapDays(lastActiveDay, now) {
  if (!lastActiveDay) return Infinity;
  return dayGap(lastActiveDay, now.day);
}

function segmentOf(profile, prog, cert, now) {
  const p = prog || {};
  const c = cert || {};
  const done = p.done || 0;
  const remaining = p.remaining == null ? (p.total || 0) - done : p.remaining;
  const complete = Boolean(p.complete);
  const gap = gapDays(profile && profile.lastActiveDay, now || { day: '' });

  if (complete && c.certIssued) return 'certified';
  if (complete && c.quizPassed) return 'eligible';
  if (complete) return 'near_finish';                       // lessons done, quiz not passed
  if (done > 0 && remaining <= NEAR_LEFT) return 'near_finish';
  if (gap >= DORMANT_GAP) return 'dormant';
  if (gap >= LAPSING_GAP) return 'lapsing';
  if (done > 0) return 'active';
  return 'new';
}

/** Tally an array of segment keys into a {key: count} object over all segments. */
function tally(keys) {
  const out = Object.fromEntries(SEGMENT_KEYS.map((k) => [k, 0]));
  for (const k of keys) if (k in out) out[k] += 1;
  return out;
}

module.exports = { segmentOf, tally, SEGMENTS, SEGMENT_KEYS, LAPSING_GAP, DORMANT_GAP, NEAR_LEFT };
