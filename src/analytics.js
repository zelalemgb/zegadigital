'use strict';

/**
 * Program analytics / KPIs, computed from the durable store.
 *
 * summary() returns a single object covering the metrics a digital-literacy
 * programme cares about: reach, engagement funnel, retention proxies,
 * completion, quiz performance, knowledge-check accuracy (mastery), and the
 * headline impact number — average learning gain (endline − baseline).
 *
 * Reads tables through the storage backend (SQLite or Postgres via the facade);
 * pure aggregation, no writes.
 */

const store = require('./store');
const { getContent } = require('./content');
const curriculum = require('./curriculum');
const { levelInfo, LEVELS } = require('./gamification/xp');
const segments = require('./learners/segments');
const risk = require('./learners/risk');
const completion = require('./learners/completion');

// Backend-agnostic read: SQLite exposes a sync `.prepare().all()`, Postgres an
// async `pool.query()`. `await` handles both. The SQL below is standard/portable
// (CAST(ts AS TEXT) for the date bucket works on both).
async function rows(sql, params = []) {
  const db = store.db;
  if (db && typeof db.prepare === 'function') return db.prepare(sql).all(...params);
  return (await db.query(sql, params)).rows;
}

async function summary(opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const content = getContent('en');

  // Time-range filter. `range` ∈ all|today|week|month → a `since` date (null =
  // all-time). Learner/acquisition metrics use the join cohort (learners who
  // joined within the window); activity metrics use a record-timestamp clause.
  // Snapshot cards (segments, at-risk, completion depth, levels, streaks) are
  // "right now" states that can't be rewound, so they stay all-time.
  const range = opts.range || 'all';
  const since = sinceFor(range, today);
  const windowed = Boolean(since);
  const inWindow = (ts) => { if (!since) return true; const d = dayOf(ts); return d != null && d >= since; };
  const tsClause = (col) => (since ? ` AND ${col} >= '${since}'` : '');

  const profiles = await rows('SELECT * FROM profiles');
  const lessonRows = await rows('SELECT user_id, COUNT(*) c FROM lesson_progress GROUP BY user_id');
  const completedByUser = new Map(lessonRows.map((r) => [r.user_id, r.c]));
  const trackTotals = {
    youth: curriculum.allLessonIds(content, 'youth').length,
    adult: curriculum.allLessonIds(content, 'adult').length,
  };
  // The acquisition cohort: learners who joined within the window (all, all-time).
  const cohort = windowed ? profiles.filter((p) => inWindow(p.created_at)) : profiles;
  const doneOf = (p) => completedByUser.get(p.user_id) || 0;

  // ── Reach & engagement funnel (the join cohort) ─────────────────────────
  const users = cohort.length;
  const pickedTrack = cohort.filter((p) => p.track).length;
  const startedLesson = cohort.filter((p) => doneOf(p) >= 1).length;
  const completedTrack = cohort.filter(
    (p) => p.track && trackTotals[p.track] && doneOf(p) >= trackTotals[p.track]
  ).length;
  // Lessons completed within the window (activity, by completion date).
  const lessonsCompleted = (await rows(`SELECT COUNT(*) c FROM lesson_progress WHERE 1=1${tsClause('completed_at')}`))[0].c || 0;

  // ── Learner segments (Recency / Frequency / Progress) ──────────────────────
  // Two batch queries build per-user cert + passed-quiz maps; the segment for
  // each learner then comes from counts already in hand (no per-user queries).
  const certMap = new Map();
  for (const r of await rows('SELECT user_id, track FROM certificates')) {
    if (!certMap.has(r.user_id)) certMap.set(r.user_id, new Set());
    certMap.get(r.user_id).add(r.track);
  }
  const passedMap = new Map();
  for (const r of await rows("SELECT user_id, data FROM events WHERE type = 'quizFinished'")) {
    const d = safe(r.data);
    if (d && d.passed && d.track) {
      if (!passedMap.has(r.user_id)) passedMap.set(r.user_id, new Set());
      passedMap.get(r.user_id).add(d.track);
    }
  }
  const nowD = { day: today };
  const perLearner = profiles.map((p) => {
    const track = p.track || null;
    const done = completedByUser.get(p.user_id) || 0;
    const total = (track && trackTotals[track]) || 0;
    const prog = { done, total, remaining: total - done, complete: total > 0 && done >= total };
    const cert = {
      quizPassed: track ? Boolean(passedMap.get(p.user_id) && passedMap.get(p.user_id).has(track)) : false,
      certIssued: track ? Boolean(certMap.get(p.user_id) && certMap.get(p.user_id).has(track)) : false,
    };
    const profLite = {
      track,
      lastActiveDay: p.last_active_day || null,
      streak: p.streak || 0,
      nudgeIgnored: p.nudge_ignored || 0,
    };
    const score = risk.riskScore(profLite, prog, cert, nowD);
    return {
      segment: segments.segmentOf(profLite, prog, cert, nowD),
      risk: score,
      savable: risk.isSavable(score, prog),
      // Rounded completion %, matching the roster's per-learner `pct` (done/total).
      pct: prog.total ? Math.round((prog.done / prog.total) * 100) : 0,
    };
  });
  const segmentCounts = segments.tally(perLearner.map((x) => x.segment));

  // ── Completion depth (50% → done) ──────────────────────────────────────────
  // Distribution of near-finishers by how far through their track they are.
  // `tracked` is the denominator (learners who've picked a track); `atLeast50`
  // is how many of them are ≥50% done (the sum of the bands).
  const completionCounts = completion.tally(perLearner.map((x) => x.pct));
  const atLeast50 = Object.values(completionCounts).reduce((n, c) => n + c, 0);

  // ── Youth vs Adult + language split (partner-report breakdowns) ─────────────
  // One pass over profiles builds both the per-track funnel and the per-language
  // completion mix. `avgPct` is the mean completion % of that track's learners.
  const TRACKS = ['youth', 'adult'];
  const trackAgg = Object.fromEntries(
    TRACKS.map((t) => [t, { learners: 0, started: 0, completed: 0, certified: 0, lessonsDone: 0, pctSum: 0, total: trackTotals[t] || 0 }])
  );
  const langAgg = new Map();
  for (const p of cohort) {
    const done = completedByUser.get(p.user_id) || 0;
    const t = p.track;
    if (t && trackAgg[t]) {
      const b = trackAgg[t];
      b.learners += 1;
      b.lessonsDone += done;
      if (done >= 1) b.started += 1;
      if (b.total && done >= b.total) b.completed += 1;
      if (certMap.get(p.user_id) && certMap.get(p.user_id).has(t)) b.certified += 1;
      b.pctSum += b.total ? (done / b.total) * 100 : 0;
    }
    const lang = p.lang || 'en';
    const la = langAgg.get(lang) || { lang, learners: 0, completedAny: 0, trackCompleted: 0, lessonsDone: 0 };
    la.learners += 1;
    la.lessonsDone += done;
    if (done >= 1) la.completedAny += 1;
    const ltot = t ? trackTotals[t] || 0 : 0;
    if (ltot && done >= ltot) la.trackCompleted += 1;
    langAgg.set(lang, la);
  }
  const tracks = TRACKS.map((t) => {
    const b = trackAgg[t];
    return {
      track: t, learners: b.learners, started: b.started, completed: b.completed,
      certified: b.certified, lessonsDone: b.lessonsDone, total: b.total,
      avgPct: b.learners ? Math.round(b.pctSum / b.learners) : 0,
    };
  });
  const byLang = [...langAgg.values()].sort((a, b) => b.learners - a.learners);

  // ── Module engagement (activity within the window) ──────────────────────────
  // Lessons completed within each module in the selected period (all-time when
  // no range), mapped lesson → module and ranked most-engaged first — the
  // revealed module preference of whoever is working through the programme.
  const perLessonDone = new Map(
    (await rows(`SELECT lesson_id, COUNT(*) c FROM lesson_progress WHERE 1=1${tsClause('completed_at')} GROUP BY lesson_id`)).map((r) => [r.lesson_id, r.c])
  );
  const moduleEngagement = [];
  for (const t of TRACKS) {
    for (const m of curriculum.modulesForTrack(content, t)) {
      let completed = 0;
      for (const id of m.lessonIds) completed += perLessonDone.get(id) || 0;
      moduleEngagement.push({ track: t, module: m.label, completed });
    }
  }
  // Ranked by completions in the period (module "preference"), most first.
  moduleEngagement.sort((a, b) => b.completed - a.completed);
  const riskBands = { high: 0, medium: 0, low: 0 };
  let savable = 0;
  for (const x of perLearner) {
    riskBands[risk.riskBand(x.risk)] += 1;
    if (x.savable) savable += 1;
  }

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
  const eventDays = await rows(
    "SELECT substr(CAST(ts AS TEXT),1,10) d, COUNT(DISTINCT user_id) u, COUNT(*) n FROM events GROUP BY d ORDER BY d DESC LIMIT 14"
  );
  const activeToday = (eventDays.find((r) => r.d === today) || {}).u || 0;
  // Distinct learners active within the window (all-time when no range).
  const distinctActive = (await rows(`SELECT COUNT(DISTINCT user_id) u FROM events WHERE 1=1${tsClause('ts')}`))[0].u;

  // ── Quizzes (attempts within the window) ────────────────────────────────
  const quizEvents = (await rows(`SELECT data FROM events WHERE type = 'quizFinished'${tsClause('ts')}`)).map((r) => safe(r.data));
  const quizAttempts = quizEvents.length;
  const quizPasses = quizEvents.filter((q) => q && q.passed).length;
  const quizAvgPct = avg(quizEvents.map((q) => (q && q.total ? (q.score / q.total) * 100 : 0)));

  // ── Knowledge checks (mastery signal) ───────────────────────────────────
  const checkAgg = (await rows('SELECT COUNT(*) n, SUM(correct) c FROM check_results'))[0];
  const checksAnswered = checkAgg.n || 0;
  const checkAccuracy = checksAnswered ? Math.round((checkAgg.c / checksAnswered) * 100) : 0;

  // ── Learning gain (headline impact) ─────────────────────────────────────
  const learning = await learningGain();

  // ── Certificates earned (issued within the window) ──────────────────────────
  // One row per learner+track, so COUNT(*) is certificates issued and
  // COUNT(DISTINCT user_id) is how many people are certified — in the window.
  const certAgg = (await rows(`SELECT COUNT(*) c, COUNT(DISTINCT user_id) u FROM certificates WHERE 1=1${tsClause('issued_at')}`))[0];
  const certByTrack = await rows(`SELECT track, COUNT(*) c FROM certificates WHERE 1=1${tsClause('issued_at')} GROUP BY track`);
  const certificatesIssued = certAgg.c || 0;
  const certifiedLearners = certAgg.u || 0;
  // The join cohort's certified count (their current state) — for the cohort funnel.
  const certifiedCohort = cohort.filter((p) => p.track && certMap.get(p.user_id) && certMap.get(p.user_id).has(p.track)).length;
  // All-time learners-with-a-track — the completion-depth card's denominator
  // (that card is an all-time snapshot, unaffected by the range).
  const pickedTrackAll = profiles.filter((p) => p.track).length;

  // ── Badges & reminders ──────────────────────────────────────────────────
  const badgeRows = await rows('SELECT badge_id, COUNT(*) c FROM badges GROUP BY badge_id ORDER BY c DESC');
  const badgesAwarded = badgeRows.reduce((n, b) => n + b.c, 0);
  const nudgesSent = (await rows(`SELECT COUNT(*) c FROM events WHERE type = 'nudgeSent'${tsClause('ts')}`))[0].c;

  return {
    generatedFor: today,
    range,
    since,
    windowed,
    reach: { users, pickedTrack, startedLesson, completedTrack, lessonsCompleted, distinctActive, activeToday },
    funnel: [
      { stage: 'Joined', count: users },
      { stage: 'Picked track', count: pickedTrack },
      { stage: 'Completed ≥1 lesson', count: startedLesson },
      { stage: 'Completed track', count: completedTrack },
      { stage: 'Earned certificate', count: certifiedCohort },
    ],
    // XP / levels are an all-time snapshot, so the average is over all learners.
    xp: { total: totalXp, avg: profiles.length ? Math.round(totalXp / profiles.length) : 0, byLevel },
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
    certificates: { issued: certificatesIssued, learners: certifiedLearners, byTrack: certByTrack },
    segments: { counts: segmentCounts, meta: segments.SEGMENTS },
    completion: { counts: completionCounts, meta: completion.BANDS, atLeast50, tracked: pickedTrackAll, floor: completion.FLOOR },
    tracks,
    byLang,
    moduleEngagement,
    atRisk: { bands: riskBands, savable },
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
async function lessonBreakdown() {
  const content = getContent('en');
  const doneRows = await rows('SELECT lesson_id, COUNT(*) c FROM lesson_progress GROUP BY lesson_id');
  const doneBy = new Map(doneRows.map((r) => [r.lesson_id, r.c]));
  const checkRows = await rows('SELECT lesson_id, COUNT(*) n, SUM(correct) c FROM check_results GROUP BY lesson_id');
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
async function learners() {
  const content = getContent('en');
  const trackTotals = {
    youth: curriculum.allLessonIds(content, 'youth').length,
    adult: curriculum.allLessonIds(content, 'adult').length,
  };
  const doneBy = new Map(
    (await rows('SELECT user_id, COUNT(*) c FROM lesson_progress GROUP BY user_id')).map((r) => [r.user_id, r.c])
  );
  // quiz pass counts per user
  const quizBy = new Map();
  for (const r of await rows("SELECT user_id, data FROM events WHERE type = 'quizFinished'")) {
    const q = safe(r.data);
    const e = quizBy.get(r.user_id) || { attempts: 0, passes: 0 };
    e.attempts += 1;
    if (q && q.passed) e.passes += 1;
    quizBy.set(r.user_id, e);
  }
  // baseline / endline per user
  const asmtBy = new Map();
  for (const a of await rows('SELECT user_id, kind, score, total FROM assessments ORDER BY id')) {
    const e = asmtBy.get(a.user_id) || {};
    if (a.kind === 'baseline' && e.baseline == null) e.baseline = pct(a);
    if (a.kind === 'endline') e.endline = pct(a);
    asmtBy.set(a.user_id, e);
  }
  // issued certificates per user (for segment/risk)
  const certBy = new Map();
  for (const r of await rows('SELECT user_id, track FROM certificates')) {
    if (!certBy.has(r.user_id)) certBy.set(r.user_id, new Set());
    certBy.get(r.user_id).add(r.track);
  }
  const nowD = { day: new Date().toISOString().slice(0, 10) };

  return (await rows('SELECT * FROM profiles')).map((p) => {
    const done = doneBy.get(p.user_id) || 0;
    const total = p.track ? trackTotals[p.track] || 0 : 0;
    const quiz = quizBy.get(p.user_id);
    const asmt = asmtBy.get(p.user_id) || {};
    const prog = { done, total, remaining: total - done, complete: total > 0 && done >= total };
    const cert = {
      quizPassed: Boolean(quiz && quiz.passes > 0),
      certIssued: Boolean(p.track && certBy.get(p.user_id) && certBy.get(p.user_id).has(p.track)),
    };
    const profLite = {
      track: p.track || null,
      lastActiveDay: p.last_active_day || null,
      streak: p.streak || 0,
      nudgeIgnored: p.nudge_ignored || 0,
    };
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
      segment: segments.segmentOf(profLite, prog, cert, nowD),
      risk: risk.riskScore(profLite, prog, cert, nowD),
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
async function publicStats() {
  const content = getContent('en');
  const learners = (await rows('SELECT COUNT(*) c FROM profiles'))[0].c || 0;
  const lessons =
    curriculum.allLessonIds(content, 'youth').length +
    curriculum.allLessonIds(content, 'adult').length;
  return { learners, lessons, languages: 3, tracks: 2 };
}

/**
 * Lightweight go-live health for the proactive nudge system — aggregate counts
 * only (no PII), safe to expose publicly. `day` defaults to today's UTC date,
 * which matches the event timestamps (stored in UTC).
 */
async function nudgeStatus(day) {
  const d = day || new Date().toISOString().slice(0, 10);
  const countToday = async (type) =>
    (await rows(
      "SELECT COUNT(*) c FROM events WHERE type = ? AND substr(CAST(ts AS TEXT),1,10) = ?",
      [type, d]
    ))[0].c || 0;
  const sentToday = await countToday('nudgeSent');
  const failedToday = await countToday('nudgeFailed');
  const sentTotal = (await rows("SELECT COUNT(*) c FROM events WHERE type = 'nudgeSent'"))[0].c || 0;
  const lastFail = await rows("SELECT data FROM events WHERE type = 'nudgeFailed' ORDER BY id DESC LIMIT 1");
  return {
    day: d,
    sentToday,
    failedToday,
    sentTotal,
    lastError: lastFail.length ? safe(lastFail[0].data) : null,
  };
}

async function learningGain() {
  const all = await rows('SELECT user_id, kind, score, total, id FROM assessments ORDER BY id');
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

// The inclusive start date for a report range, or null for all-time. `week` is
// the last 7 days (today + 6 back), `month` the last 30. Computed in UTC to
// match the stored timestamps.
function sinceFor(range, today) {
  if (!range || range === 'all') return null;
  if (range === 'today') return today;
  const d = new Date(today + 'T00:00:00Z');
  if (range === 'week') d.setUTCDate(d.getUTCDate() - 6);
  else if (range === 'month') d.setUTCDate(d.getUTCDate() - 29);
  else return null;
  return d.toISOString().slice(0, 10);
}

// The YYYY-MM-DD day of a timestamp — handles SQLite's 'YYYY-MM-DD HH:MM:SS'
// strings and Postgres's Date objects alike.
function dayOf(ts) {
  if (ts == null) return null;
  if (ts instanceof Date) return ts.toISOString().slice(0, 10);
  const m = /\d{4}-\d{2}-\d{2}/.exec(String(ts));
  return m ? m[0] : null;
}

module.exports = { summary, learningGain, lessonBreakdown, learners, publicStats, nudgeStatus, sinceFor, dayOf };
