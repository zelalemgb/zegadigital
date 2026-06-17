'use strict';

/**
 * Badge catalog + evaluation.
 *
 * Badges are defined as { id, emoji, name, desc, satisfied(ctx) }. Module- and
 * track-completion badges are generated from the curriculum so they stay in
 * sync with content automatically.
 *
 * evaluateNew(ctx, earnedSet) returns the badge definitions the user has just
 * earned (satisfied AND not already in earnedSet).
 *
 * ctx = { content, track, completedSet, profile, progress, event }
 *   event is the triggering engine event (may be null for ambient checks).
 */

const curriculum = require('../curriculum');

const STATIC_BADGES = [
  {
    id: 'first-steps',
    emoji: '🐣',
    name: 'First Steps',
    desc: 'Completed your first lesson',
    satisfied: (c) => c.completedSet.size >= 1,
  },
  {
    id: 'explorer',
    emoji: '🧭',
    name: 'Explorer',
    desc: 'Started lessons in 3 different modules',
    satisfied: (c) => curriculum.modulesTouched(c.content, c.track, c.completedSet) >= 3,
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    name: 'On a Roll',
    desc: '3-day learning streak',
    satisfied: (c) => (c.profile.longestStreak || 0) >= 3,
  },
  {
    id: 'streak-7',
    emoji: '⚡',
    name: 'Week Warrior',
    desc: '7-day learning streak',
    satisfied: (c) => (c.profile.longestStreak || 0) >= 7,
  },
  {
    id: 'streak-30',
    emoji: '🏔️',
    name: 'Unstoppable',
    desc: '30-day learning streak',
    satisfied: (c) => (c.profile.longestStreak || 0) >= 30,
  },
  {
    id: 'quiz-ace',
    emoji: '🎯',
    name: 'Quiz Ace',
    desc: 'Passed a quiz (70% or higher)',
    satisfied: (c) => c.event && c.event.type === 'quizFinished' && c.event.passed,
  },
  {
    id: 'perfect-score',
    emoji: '💯',
    name: 'Perfect Score',
    desc: 'Got every quiz question right',
    satisfied: (c) =>
      c.event &&
      c.event.type === 'quizFinished' &&
      c.event.total > 0 &&
      c.event.score === c.event.total,
  },
];

function moduleBadges(content, track) {
  return curriculum.modulesForTrack(content, track).map((m) => ({
    id: `module:${m.id}`,
    emoji: '🏅',
    name: `${m.label} Master`,
    desc: `Completed every lesson in ${m.label}`,
    satisfied: (c) => {
      const mod = c.progress.modules.find((x) => x.id === m.id);
      return Boolean(mod && mod.complete);
    },
  }));
}

function trackBadge(track) {
  const label = track === 'youth' ? 'Youth' : 'Adult';
  return {
    id: `${track}-champion`,
    emoji: '🎓',
    name: `Digital Citizen (${label})`,
    desc: `Completed the entire ${label} track`,
    satisfied: (c) => c.progress.complete,
  };
}

function catalogFor(content, track) {
  return [...STATIC_BADGES, ...moduleBadges(content, track), trackBadge(track)];
}

function evaluateNew(ctx, earnedSet) {
  const progress =
    ctx.progress || curriculum.trackProgress(ctx.content, ctx.track, ctx.completedSet);
  const fullCtx = { ...ctx, progress };
  const earned = [];
  for (const badge of catalogFor(ctx.content, ctx.track)) {
    if (earnedSet.has(badge.id)) continue;
    try {
      if (badge.satisfied(fullCtx)) earned.push(badge);
    } catch {
      /* a badge rule should never break the flow */
    }
  }
  return earned;
}

module.exports = { STATIC_BADGES, moduleBadges, trackBadge, catalogFor, evaluateNew };
