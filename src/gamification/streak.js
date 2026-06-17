'use strict';

/**
 * Daily engagement streaks.
 *
 * A "day" is the user's local calendar date (YYYY-MM-DD), passed in so the
 * caller controls the clock/timezone. registerActivity() is called once per
 * inbound message; it only changes the streak when the day changes.
 *
 * Streak freeze: a single missed day does NOT reset the streak (missing a day
 * is the biggest churn trigger, so we forgive one). A gap of 2+ days resets.
 */

function registerActivity(profile, today) {
  const last = profile.lastActiveDay;
  const result = { newDay: false, streak: profile.streak || 0, milestone: null, froze: false };

  if (last === today) {
    return result; // already counted today
  }

  result.newDay = true;
  const gap = last ? dayGap(last, today) : null;

  if (last == null || gap === 1) {
    result.streak = (profile.streak || 0) + 1; // consecutive day
  } else if (gap === 2) {
    result.streak = (profile.streak || 0) + 1; // forgiven one missed day
    result.froze = true;
  } else {
    result.streak = 1; // gap too large — reset
  }

  profile.streak = result.streak;
  profile.lastActiveDay = today;
  if (result.streak > (profile.longestStreak || 0)) {
    profile.longestStreak = result.streak;
  }

  if ([3, 7, 14, 30, 60, 100].includes(result.streak)) {
    result.milestone = result.streak;
  }
  return result;
}

function dayGap(fromDay, toDay) {
  const a = Date.parse(fromDay + 'T00:00:00Z');
  const b = Date.parse(toDay + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

module.exports = { registerActivity, dayGap };
