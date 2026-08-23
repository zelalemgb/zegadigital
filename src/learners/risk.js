'use strict';

/**
 * At-risk (churn) scoring — how likely a learner is to drop off BEFORE earning
 * their certificate, as a 0–100 score. Pure, I/O-free, rules-based (no training
 * needed) so it's transparent and easy to tune. Every input is data we already
 * track: recency, streak, progress, and nudge fatigue.
 *
 *   riskScore({ lastActiveDay, streak, nudgeIgnored }, prog, cert, now)
 *     prog = { done, total, remaining, complete }
 *     cert = { quizPassed, certIssued }
 *     now  = { day: 'YYYY-MM-DD' }
 */

const { dayGap } = require('../gamification/streak');

const HIGH = 55;   // score ≥ this → high risk
const MEDIUM = 30; // score ≥ this → medium risk
const SAVABLE = 30; // at-risk AND has progress worth saving → priority outreach

function riskScore(profile, prog, cert, now) {
  const p = prog || {};
  const c = cert || {};
  if (p.complete && c.certIssued) return 0; // certified — goal reached, no churn risk

  const gap = profile && profile.lastActiveDay ? dayGap(profile.lastActiveDay, (now || {}).day) : Infinity;
  const streak = (profile && profile.streak) || 0;
  const total = p.total || 0;
  const done = p.done || 0;
  const pct = total ? done / total : 0;

  let s = 0;
  // Recency — the dominant churn signal.
  if (gap >= 14) s += 60;
  else if (gap >= 7) s += 45;
  else if (gap >= 3) s += 25; // < 3 days idle contributes nothing

  // Habit — no streak means nothing is pulling them back.
  if (streak === 0) s += 20;
  else if (streak < 3) s += 8;

  // Early stall — learners churn most before they build momentum.
  if (!p.complete && pct < 0.3) s += 15;

  // Nudge fatigue — ignoring reminders signals disengagement.
  if ((profile && profile.nudgeIgnored) >= 3) s += 10;

  // Finished every lesson (only the quiz / claim remains) → far less likely to
  // churn now; scale the risk down.
  if (p.complete) s = Math.round(s * 0.4);

  return Math.max(0, Math.min(100, Math.round(s)));
}

function riskBand(score) {
  if (score >= HIGH) return 'high';
  if (score >= MEDIUM) return 'medium';
  return 'low';
}

/** Priority outreach targets: at real risk AND with progress worth saving. */
function isSavable(score, prog) {
  return score >= SAVABLE && Boolean(prog && prog.done > 0);
}

module.exports = { riskScore, riskBand, isSavable, HIGH, MEDIUM, SAVABLE };
