#!/usr/bin/env node
'use strict';

/**
 * Print a program KPI summary to the terminal.   npm run metrics
 * Reads the same SQLite store the bot writes to.
 */

const a = require('../src/analytics').summary();

function bar(n, max, width = 24) {
  const filled = max ? Math.round((n / max) * width) : 0;
  return '█'.repeat(filled) + '·'.repeat(Math.max(0, width - filled));
}

console.log('\n📊 Zega Digital — program metrics  (' + a.generatedFor + ')\n');

console.log('Reach');
console.log(`  Users: ${a.reach.users}   Active today: ${a.reach.activeToday}   Ever active: ${a.reach.distinctActive}`);

console.log('\nEngagement funnel');
const top = a.funnel[0].count || 1;
for (const f of a.funnel) {
  const pct = a.funnel[0].count ? Math.round((f.count / a.funnel[0].count) * 100) : 0;
  console.log(`  ${f.stage.padEnd(22)} ${bar(f.count, top)} ${f.count} (${pct}%)`);
}

console.log('\nLearning gain (impact)');
const lg = a.learningGain;
if (lg.bothTaken) {
  console.log(`  ${lg.avgBaselinePct}% → ${lg.avgEndlinePct}%  =  +${lg.avgGainPoints} points avg  (n=${lg.bothTaken})`);
} else {
  console.log(`  Baseline taken: ${lg.baselineTaken}, endline taken: ${lg.endlineTaken} — need both for a gain figure.`);
}

console.log('\nMastery & quizzes');
console.log(`  Knowledge checks: ${a.checks.answered} answered, ${a.checks.accuracy}% correct`);
console.log(`  Quizzes: ${a.quizzes.attempts} attempts, ${a.quizzes.passRate}% pass rate, ${a.quizzes.avgScorePct}% avg`);

console.log('\nHabit & rewards');
console.log(`  Avg streak: ${a.streaks.avg} (max ${a.streaks.max})   Opted into reminders: ${a.reminders.optedIn}   Nudges sent: ${a.reminders.nudgesSent}`);
console.log(`  Badges awarded: ${a.badges.awarded}   Total XP: ${a.xp.total}`);
console.log('');
