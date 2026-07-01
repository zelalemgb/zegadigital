'use strict';

/**
 * Experience points and levels.
 *
 * XP is awarded for meaningful actions (see AWARDS). Levels are an *identity*
 * ladder, not just a number — they're framed as how digitally capable the user
 * has become. levelInfo() returns everything the UI needs to draw a progress bar.
 */

const AWARDS = {
  lessonPage: 2, // turning a page within a lesson
  lessonComplete: 20, // finishing a lesson
  checkCorrect: 10, // post-lesson knowledge check, correct
  checkTried: 3, // post-lesson check, wrong (reward the attempt)
  quizCorrect: 10, // each correct quiz answer
  quizPassBonus: 30, // finishing a quiz with >= pass threshold
  dailyCheckIn: 15, // first interaction of a new day
  badge: 50, // any badge earned
  referral: 100, // shared the bot and a friend joined
  assessment: 25, // completing a baseline or endline assessment
};

// Cumulative point thresholds. Each level has a plain, easy-to-read name.
const LEVELS = [
  { name: 'Beginner', floor: 0 },
  { name: 'Learner', floor: 100 },
  { name: 'Skilled', floor: 300 },
  { name: 'Guardian', floor: 700 },
  { name: 'Expert', floor: 1500 },
];

function levelInfo(xp) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].floor) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const floor = current.floor;
  const ceil = next ? next.floor : current.floor;
  const span = ceil - floor || 1;
  const intoLevel = xp - floor;
  const pct = next ? Math.min(100, Math.round((intoLevel / span) * 100)) : 100;
  return {
    index,
    name: current.name,
    nextName: next ? next.name : null,
    nextAt: next ? next.floor : null,
    toNext: next ? Math.max(0, next.floor - xp) : 0,
    pct,
    isMax: !next,
  };
}

/** A 10-segment text progress bar, e.g. "▰▰▰▱▱▱▱▱▱▱". */
function progressBar(pct, segments = 10) {
  const filled = Math.round((pct / 100) * segments);
  return '▰'.repeat(filled) + '▱'.repeat(Math.max(0, segments - filled));
}

module.exports = { AWARDS, LEVELS, levelInfo, progressBar };
