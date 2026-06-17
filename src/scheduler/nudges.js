'use strict';

/**
 * Proactive nudge logic — pure functions, no I/O (so they're easy to test).
 *
 * selectDueNudges(profiles, now) decides who should be messaged right now.
 * buildNudge(...) crafts the message + the quick-reply button that re-opens the
 * 24-hour window when tapped, plus the WhatsApp template name/params to use
 * outside that window.
 *
 *   now = { hour: 0-23, day: 'YYYY-MM-DD' }  (the user's local clock)
 */

const { dayGap } = require('../gamification/streak');
const curriculum = require('../curriculum');

function classify(profile, now) {
  if (!profile.lastActiveDay) return 'reengage';
  const gap = dayGap(profile.lastActiveDay, now.day);
  if (gap >= 3) return 'reengage';
  if ((profile.streak || 0) >= 2) return 'streak';
  return 'daily';
}

/** Returns [{ userId, type }] for opted-in users who are due a nudge now. */
function selectDueNudges(profiles, now) {
  const due = [];
  for (const p of profiles) {
    if (!p.optInReminders) continue; // must have opted in
    if (p.lastNudgeDay === now.day) continue; // already nudged today
    if (p.lastActiveDay === now.day) continue; // already active today — no need
    if (now.hour < (p.reminderHour == null ? 19 : p.reminderHour)) continue; // not time yet
    due.push({ userId: p.userId, type: classify(p, now) });
  }
  return due;
}

/**
 * Build the nudge for one user.
 * Returns { type, message, button: {label, value}, template: {name, params} }.
 */
function buildNudge(profile, content, completedSet, type) {
  const t = type || classify(profile, { day: '' });
  const next = profile.track
    ? curriculum.nextLesson(content, profile.track, completedSet)
    : null;
  const nextTitle = next ? next.title : 'a new lesson';
  const prog = profile.track ? curriculum.trackProgress(content, profile.track, completedSet) : { pct: 0 };
  const streak = profile.streak || 0;

  let message;
  let template;
  if (t === 'streak') {
    message = `🔥 Don't lose your ${streak}-day streak! A quick 2-minute lesson keeps it alive.\nUp next: ${nextTitle}.`;
    template = { name: 'zega_streak_saver', params: [String(streak), nextTitle] };
  } else if (t === 'reengage') {
    message = `👋 We miss you at Zega Digital! You're ${prog.pct}% through your track. Pick up where you left off — it only takes 2 minutes.`;
    template = { name: 'zega_reengagement', params: [String(prog.pct)] };
  } else {
    message = `👋 Ready for today's 2-minute lesson?\nUp next: ${nextTitle}. Tap below to keep learning!`;
    template = { name: 'zega_daily_nudge', params: [nextTitle] };
  }

  return {
    type: t,
    message,
    button: { label: '▶️ Continue learning', value: 'CONTINUE' },
    template,
  };
}

module.exports = { selectDueNudges, classify, buildNudge };
