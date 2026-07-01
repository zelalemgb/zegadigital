'use strict';

/**
 * Program analytics / KPIs, computed from the durable store.
 *
 * summary() returns a single object covering the metrics a digital-literacy
 * programme cares about: reach, engagement funnel, retention proxies,
 * completion, quiz performance, knowledge-check accuracy (mastery), and the
 * headline impact number — average learning gain (endline − baseline).
 *
 * Reads tables directly via the shared db handle; pure aggregation, no writes.
 */

const { db } = require('./store/db');
const { getContent } = require('./content');
const curriculum = require('./curriculum');
const { levelInfo, LEVELS } = require('./gamification/xp');

function rows(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function summary(opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const content = getContent('en');

  const profiles = rows('SELECT * FROM profiles');
  const lessonRows = rows('SELECT user_id, COUNT(*) c FROM lesson_progress GROUP BY user_id');
  const completedByUser = new Map(lessonRows.map((r) => [r.user_id, r.c]));
  const trackTotals = {
    youth: curriculum.allLessonIds(content, 'youth').length,
    adult: curriculum.allLessonIds(content, 'adult').length,
  };

  // ── Reach & engagement funnel ──────────────────────────────────────────
  const users = profiles.length;
  const pickedTrack = profiles.filter((p) => p.track).length;
  const startedLesson = profiles.filter((p) => (completedByUser.get(p.user_id) || 0) >= 1).length;
  const completedTrack = profiles.filter(
    (p) => p.track && trackTotals[p.track] && (completedByUser.get(p.user_id) || 0) >= trackTotals[p.track]
  ).length;

  // ── XP / levels / streaks ───────────────────────────────────────────────
  const byLevel = LEVELS.map((l) => ({ name: l.name, count: 0 }));
  let totalXp = 0;
  const streaks = [];
  let optedIn = 0;
  for (const p of profiles) {
    totalXp += p.xp || 0;
    byLevel[levelInfo(p.xp || 0).index].count += 1;
    streaks.push(p.streak || 0);
    if (p.opt_in_reminders) optedIn += 1;
  }
  const streakBuckets = bucketStreaks(streaks);

  // ── Activity / retention proxies (from the event log) ──────────────────
  const eventDays = rows(
    "SELECT substr(ts,1,10) d, COUNT(DISTINCT user_id) u, COUNT(*) n FROM events GROUP BY d ORDER BY d DESC LIMIT 14"
  );
  const activeToday = (eventDays.find((r) => r.d === today) || {}).u || 0;
  const distinctActive = rows('SELECT COUNT(DISTINCT user_id) u FROM events')[0].u;

  // ── Quizzes ─────────────────────────────────────────────────────────────
  const quizEvents = rows("SELECT data FROM events WHERE type = 'quizFinished'").map((r) => safe(r.data));
  const quizAttempts = quizEvents.length;
  const quizPasses = quizEvents.filter((q) => q && q.passed).length;
  const quizAvgPct = avg(quizEvents.map((q) => (q && q.total ? (q.score / q.total) * 100 : 0)));

  // ── Knowledge checks (mastery signal) ───────────────────────────────────
  const checkAgg = rows('SELECT COUNT(*) n, SUM(correct) c FROM check_results')[0];
  const checksAnswered = checkAgg.n || 0;
  const checkAccuracy = checksAnswered ? Math.round((checkAgg.c / checksAnswered) * 100) : 0;

  // ── Learning gain (headline impact) ─────────────────────────────────────
  const learning = learningGain();

  // ── Badges & reminders ──────────────────────────────────────────────────
  const badgeRows = rows('SELECT badge_id, COUNT(*) c FROM badges GROUP BY badge_id ORDER BY c DESC');
  const badgesAwarded = badgeRows.reduce((n, b) => n + b.c, 0);
  const nudgesSent = rows("SELECT COUNT(*) c FROM events WHERE type = 'nudgeSent'")[0].c;

  return {
    generatedFor: today,
    reach: { users, pickedTrack, startedLesson, completedTrack, distinctActive, activeToday },
    funnel: [
      { stage: 'Joined', count: users },
      { stage: 'Picked track', count: pickedTrack },
      { stage: 'Completed ≥1 lesson', count: startedLesson },
      { stage: 'Completed track', count: completedTrack },
    ],
    xp: { total: totalXp, avg: users ? Math.round(totalXp / users) : 0, byLevel },
    streaks: { avg: round1(avg(streaks)), max: streaks.length ? Math.max(...streaks) : 0, buckets: streakBuckets },
    retention: { activityByDay: eventDays.reverse() },
    quizzes: {
      attempts: quizAttempts,
      passes: quizPasses,
      passRate: quizAttempts ? Math.round((quizPasses / quizAttempts) * 100) : 0,
      avgScorePct: Math.round(quizAvgPct),
    },
    checks: { answered: checksAnswered, accuracy: checkAccuracy },
    learningGain: learning,
    badges: { awarded: badgesAwarded, byBadge: badgeRows },
    reminders: { optedIn, nudgesSent },
  };
}

/**
 * Per-lesson breakdown in curriculum order: how many learners completed each
 * lesson and how well they did on its knowledge check. The completion column
 * makes drop-off visible (counts fall as lessons get deeper); low check
 * accuracy flags lessons that are hard or unclear.
 */
function lessonBreakdown() {
  const content = getContent('en');
  const doneRows = rows('SELECT lesson_id, COUNT(*) c FROM lesson_progress GROUP BY lesson_id');
  const doneBy = new Map(doneRows.map((r) => [r.lesson_id, r.c]));
  const checkRows = rows('SELECT lesson_id, COUNT(*) n, SUM(correct) c FROM check_results GROUP BY lesson_id');
  const checkBy = new Map(checkRows.map((r) => [r.lesson_id, r]));

  const out = [];
  for (const track of ['youth', 'adult']) {
    for (const m of curriculum.modulesForTrack(content, track)) {
      for (const lessonId of m.lessonIds) {
        const node = content.nodes[lessonId];
        const chk = checkBy.get(lessonId);
        out.push({
          lessonId,
          track,
          module: m.label,
          title: (node && node.title) || lessonId,
          completed: doneBy.get(lessonId) || 0,
          checkAnswered: chk ? chk.n : 0,
          checkAccuracy: chk && chk.n ? Math.round((chk.c / chk.n) * 100) : null,
        });
      }
    }
  }
  return out;
}

/**
 * One row per learner for the roster table. Phone numbers are masked to the
 * last 4 digits — enough to distinguish learners without exposing full PII in
 * the manager view.
 */
function learners() {
  const content = getContent('en');
  const trackTotals = {
    youth: curriculum.allLessonIds(content, 'youth').length,
    adult: curriculum.allLessonIds(content, 'adult').length,
  };
  const doneBy = new Map(
    rows('SELECT user_id, COUNT(*) c FROM lesson_progress GROUP BY user_id').map((r) => [r.user_id, r.c])
  );
  // quiz pass counts per user
  const quizBy = new Map();
  for (const r of rows("SELECT user_id, data FROM events WHERE type = 'quizFinished'")) {
    const q = safe(r.data);
    const e = quizBy.get(r.user_id) || { attempts: 0, passes: 0 };
    e.attempts += 1;
    if (q && q.passed) e.passes += 1;
    quizBy.set(r.user_id, e);
  }
  // baseline / endline per user
  const asmtBy = new Map();
  for (const a of rows('SELECT user_id, kind, score, total FROM assessments ORDER BY id')) {
    const e = asmtBy.get(a.user_id) || {};
    if (a.kind === 'baseline' && e.baseline == null) e.baseline = pct(a);
    if (a.kind === 'endline') e.endline = pct(a);
    asmtBy.set(a.user_id, e);
  }

  return rows('SELECT * FROM profiles').map((p) => {
    const done = doneBy.get(p.user_id) || 0;
    const total = p.track ? trackTotals[p.track] || 0 : 0;
    const quiz = quizBy.get(p.user_id);
    const asmt = asmtBy.get(p.user_id) || {};
    return {
      id: maskId(p.user_id),
      lang: p.lang || 'en',
      track: p.track || null,
      lessonsDone: done,
      lessonsTotal: total,
      pct: total ? Math.round((done / total) * 100) : 0,
      xp: p.xp || 0,
      level: levelInfo(p.xp || 0).name,
      streak: p.streak || 0,
      optInReminders: Boolean(p.opt_in_reminders),
      lastActive: p.last_active_day || null,
      quizPasses: quiz ? quiz.passes : 0,
      quizAttempts: quiz ? quiz.attempts : 0,
      baselinePct: asmt.baseline != null ? Math.round(asmt.baseline) : null,
      endlinePct: asmt.endline != null ? Math.round(asmt.endline) : null,
    };
  }).sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''));
}

function maskId(id) {
  const s = String(id);
  return s.length <= 4 ? s : '…' + s.slice(-4);
}

/**
 * Non-sensitive aggregates safe to expose on the public landing page: how many
 * learners have joined, and the fixed shape of the curriculum. No PII.
 */
function publicStats() {
  const content = getContent('en');
  const learners = rows('SELECT COUNT(*) c FROM profiles')[0].c || 0;
  const lessons =
    curriculum.allLessonIds(content, 'youth').length +
    curriculum.allLessonIds(content, 'adult').length;
  return { learners, lessons, languages: 3, tracks: 2 };
}

function learningGain() {
  const all = rows('SELECT user_id, kind, score, total, id FROM assessments ORDER BY id');
  const byUser = new Map();
  for (const a of all) {
    if (!byUser.has(a.user_id)) byUser.set(a.user_id, {});
    const u = byUser.get(a.user_id);
    if (a.kind === 'baseline' && u.baseline == null) u.baseline = pct(a); // earliest baseline
    if (a.kind === 'endline') u.endline = pct(a); // latest endline
  }
  let baselineTaken = 0;
  let endlineTaken = 0;
  const gains = [];
  let baselineAvg = [];
  let endlineAvg = [];
  for (const u of byUser.values()) {
    if (u.baseline != null) { baselineTaken += 1; baselineAvg.push(u.baseline); }
    if (u.endline != null) { endlineTaken += 1; endlineAvg.push(u.endline); }
    if (u.baseline != null && u.endline != null) gains.push(u.endline - u.baseline);
  }
  return {
    baselineTaken,
    endlineTaken,
    bothTaken: gains.length,
    avgBaselinePct: Math.round(avg(baselineAvg)),
    avgEndlinePct: Math.round(avg(endlineAvg)),
    avgGainPoints: gains.length ? round1(avg(gains)) : null,
  };
}

function pct(a) {
  return a.total ? (a.score / a.total) * 100 : 0;
}
function bucketStreaks(streaks) {
  const b = { '0': 0, '1-2': 0, '3-6': 0, '7-13': 0, '14+': 0 };
  for (const s of streaks) {
    if (s === 0) b['0'] += 1;
    else if (s <= 2) b['1-2'] += 1;
    else if (s <= 6) b['3-6'] += 1;
    else if (s <= 13) b['7-13'] += 1;
    else b['14+'] += 1;
  }
  return b;
}
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function safe(s) {
  try { return JSON.parse(s); } catch { return null; }
}

module.exports = { summary, learningGain, lessonBreakdown, learners, publicStats };
