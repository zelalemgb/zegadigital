'use strict';

/**
 * Proactive nudge logic — pure functions, no I/O (so they're easy to test).
 *
 * The system is stage-aware: instead of a generic "come back" ping, it works
 * out where a learner sits in the certificate funnel and sends the message that
 * moves them one step closer to earning their certificate.
 *
 *   gateAllows(profile, now)      → is this user eligible to be messaged at all?
 *   stageFor(profile, ...)        → which funnel stage are they in (or null)?
 *   buildNudge(profile, ...)      → the message + button + WhatsApp template,
 *                                   or null when no stage is worth sending.
 *
 *   now = { hour: 0-23, day: 'YYYY-MM-DD' }  (the server clock)
 *
 * Frequency is paced by a smart backoff: at most one nudge/day, and once a
 * learner has ignored several in a row the cadence slows to weekly and then
 * pauses entirely until they re-engage (which resets the counter — see
 * runtime.js). This keeps completion nudges from tipping into spam / STOPs.
 */

const { dayGap } = require('../gamification/streak');
const curriculum = require('../curriculum');

// Tunables.
const REENGAGE_GAP = 3;   // days idle → treat as dormant
const ALMOST_LEFT = 2;    // ≤ this many lessons remaining → "almost there"
const BACKOFF_SLOW_AT = 3; // ignored nudges → drop to weekly cadence
const BACKOFF_PAUSE_AT = 5; // ignored nudges → pause until they return
const WEEKLY_GAP = 7;     // days between nudges while in the slow band
const DEFAULT_HOUR = 19;  // 7pm if the learner hasn't set a reminder hour

/** Coarse eligibility — cheap, needs only the profile (mirrors the DB query). */
function gateAllows(profile, now) {
  if (!profile.optInReminders) return false;     // must have opted in
  if (!profile.track) return false;              // nothing to resume yet
  if (profile.lastActiveDay === now.day) return false; // already here today
  const hour = profile.reminderHour == null ? DEFAULT_HOUR : profile.reminderHour;
  if (now.hour < hour) return false;             // not their time yet
  return backoffAllows(profile, now);
}

/** Frequency cap + fatigue backoff. */
function backoffAllows(profile, now) {
  const ignored = profile.nudgeIgnored || 0;
  if (ignored >= BACKOFF_PAUSE_AT) return false;       // paused until they return
  if (profile.lastNudgeDay === now.day) return false;  // already nudged today
  if (ignored >= BACKOFF_SLOW_AT && profile.lastNudgeDay) {
    if (dayGap(profile.lastNudgeDay, now.day) < WEEKLY_GAP) return false; // weekly band
  }
  return true;
}

/**
 * The learner's stage in the certificate funnel, highest-value first. Needs the
 * content pack, their completed-lesson set, and cert state
 * ({ quizPassed, certIssued }). Returns a stage key or null (leave them be — an
 * on-track active learner, or someone already certified).
 */
function stageFor(profile, content, completedSet, cert, now) {
  if (!profile.track) return null;
  const prog = curriculum.trackProgress(content, profile.track, completedSet);
  const remaining = prog.total - prog.done;
  const dormant = !profile.lastActiveDay || dayGap(profile.lastActiveDay, now.day) >= REENGAGE_GAP;

  if (prog.complete) {
    if (cert.certIssued) return null;              // done + certified → stop
    if (cert.quizPassed) return 'certReady';       // eligible, not yet claimed
    return 'quizLeft';                             // lessons done, quiz remains
  }
  if (prog.done > 0 && remaining <= ALMOST_LEFT) return 'almostThere';
  if (dormant) return 'reengage';                  // idle mid/early learner
  return null;                                     // active & mid-progress → don't nag
}

/**
 * Build the nudge for one user, or null if no stage applies.
 * Returns { type, message, button: {label, value}, template: {name, params} }.
 *
 * `message` is the in-app/DRY-RUN preview; the delivered copy for real sends
 * comes from the Meta-approved template (localised per locale). Dynamic values
 * (lesson title, remaining count, %) are already in the learner's language via
 * the passed-in content pack.
 */
function buildNudge(profile, content, completedSet, cert, now) {
  const stage = stageFor(profile, content, completedSet, cert || {}, now || { day: '' });
  if (!stage) return null;

  const prog = curriculum.trackProgress(content, profile.track, completedSet);
  const remaining = prog.total - prog.done;
  const next = curriculum.nextLesson(content, profile.track, completedSet);
  const nextTitle = next ? next.title : 'a new lesson';
  const cont = { label: '▶️ Continue learning', value: 'CONTINUE' };

  let message;
  let template;
  let button = cont;

  if (stage === 'certReady') {
    message = `🎓 You did it! You've finished everything — your certificate is ready to claim. Reply below to get it now.`;
    template = { name: 'zega_cert_ready', params: [] };
    button = { label: '🎓 Get certificate', value: 'CERTIFICATE' };
  } else if (stage === 'quizLeft') {
    message = `📝 So close! You've finished every lesson. Just one step left — pass the short quiz to earn your certificate.`;
    template = { name: 'zega_quiz_left', params: [] };
  } else if (stage === 'almostThere') {
    message = `🎯 You're almost there — only ${remaining} lesson${remaining === 1 ? '' : 's'} left to earn your certificate! Up next: ${nextTitle}.`;
    template = { name: 'zega_almost_there', params: [String(remaining), nextTitle] };
  } else { // reengage
    message = prog.done > 0
      ? `👋 We miss you at Zega Digital! You're ${prog.pct}% of the way to your certificate. Pick up where you left off — it only takes 2 minutes.`
      : `👋 Ready to start your first 2-minute lesson and work toward your certificate? Tap below to begin.`;
    template = { name: 'zega_reengagement', params: [String(prog.pct)] };
  }

  return { type: stage, message, button, template };
}

module.exports = {
  gateAllows,
  backoffAllows,
  stageFor,
  buildNudge,
  // constants exported for tests / tuning visibility
  REENGAGE_GAP,
  ALMOST_LEFT,
  BACKOFF_SLOW_AT,
  BACKOFF_PAUSE_AT,
};
