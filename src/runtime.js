'use strict';

/**
 * Runtime — the orchestration layer that sits between a transport (webhook /
 * CLI / web tester) and the pure engine.
 *
 *   processMessage(userId, input) -> { messages, actions, profile }
 *
 * Responsibilities:
 *   1. Load the user's durable profile + progress + badges (db.js).
 *   2. Register daily activity → streaks + daily-check-in XP.
 *   3. Run the engine, passing gamification context.
 *   4. Turn the engine's events into XP, lesson progress, badges and level-ups.
 *   5. Append celebratory reward bubbles and persist everything.
 *
 * This is where the bot becomes a habit loop instead of a passive menu.
 */

const config = require('./config');
const db = require('./store/db');
const engine = require('./engine/engine');
const curriculum = require('./curriculum');
const streak = require('./gamification/streak');
const badges = require('./gamification/badges');
const { AWARDS, LEVELS, levelInfo } = require('./gamification/xp');
const nudges = require('./scheduler/nudges');
const certs = require('./certificates');
const { getContent } = require('./content');
const { fill } = require('./util/text');

function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function processMessage(userId, input, opts = {}) {
  const today = opts.today || todayStr();
  const profile = db.getOrCreateProfile(userId, config.defaultLang);
  const completed = db.getCompletedLessons(userId);
  const earnedSet = db.getEarnedBadges(userId);

  // Restore conversation state from the profile.
  const session = profile.session || engine.freshSession();
  session.lang = profile.lang || session.lang;
  if (profile.track && !session.track) session.track = profile.track;

  const firstEver = !profile.lastActiveDay && (profile.xp || 0) === 0;
  const startLevel = levelInfo(profile.xp || 0).index;

  // 1) Daily activity → streak + check-in XP (before handling, so HOME shows it).
  const activity = streak.registerActivity(profile, today);
  if (activity.newDay) {
    profile.xp = (profile.xp || 0) + AWARDS.dailyCheckIn;
    db.logEvent(userId, 'dailyCheckIn', { streak: profile.streak });
  }

  // 2) Build read-only context for the engine.
  const content = getContent(session.lang);
  const priorAssessments = db.getAssessments(userId);
  const ctx = {
    profile,
    completed,
    earnedBadges: badgeDisplay(content, profile.track || 'youth', earnedSet),
    baselineDone: priorAssessments.some((a) => a.kind === 'baseline'),
    endlineDone: priorAssessments.some((a) => a.kind === 'endline'),
  };

  // 3) Run the engine.
  const result = engine.handle(session, input, ctx);

  // 4) Apply events → XP / progress / badges.
  let xpVisible = 0;
  let quizFinishedEvent = null;
  let completedThisTurn = false;
  let gainEvent = null;
  for (const ev of result.events) {
    switch (ev.type) {
      case 'lessonPage':
        profile.xp += AWARDS.lessonPage; // silent micro-reward
        break;
      case 'checkAnswered': {
        const amt = ev.correct ? AWARDS.checkCorrect : AWARDS.checkTried;
        profile.xp += amt;
        xpVisible += amt;
        db.recordCheckResult(userId, ev.lessonId, ev.correct); // mastery signal
        db.logEvent(userId, 'checkAnswered', { lessonId: ev.lessonId, correct: ev.correct });
        break;
      }
      case 'quizCorrect':
        profile.xp += AWARDS.quizCorrect;
        xpVisible += AWARDS.quizCorrect;
        break;
      case 'quizFinished':
        quizFinishedEvent = ev;
        if (ev.passed) {
          profile.xp += AWARDS.quizPassBonus;
          xpVisible += AWARDS.quizPassBonus;
        }
        db.logEvent(userId, 'quizFinished', ev);
        break;
      case 'lessonCompleted':
        completedThisTurn = true;
        if (!completed.has(ev.lessonId)) {
          db.markLessonComplete(userId, ev.lessonId);
          completed.add(ev.lessonId);
          profile.xp += AWARDS.lessonComplete;
          xpVisible += AWARDS.lessonComplete;
          db.logEvent(userId, 'lessonCompleted', { lessonId: ev.lessonId });
        }
        break;
      case 'trackSelected':
        profile.track = ev.track;
        db.logEvent(userId, 'trackSelected', { track: ev.track });
        break;
      case 'setReminders':
        profile.optInReminders = ev.on;
        if (ev.hour != null) profile.reminderHour = ev.hour;
        profile.remindersPrompted = true;
        db.logEvent(userId, 'setReminders', { on: ev.on, hour: profile.reminderHour });
        break;
      case 'assessmentFinished':
        db.recordAssessment(userId, ev.kind, ev.track, ev.score, ev.total);
        db.logEvent(userId, 'assessmentFinished', ev);
        profile.xp += AWARDS.assessment;
        xpVisible += AWARDS.assessment;
        if (ev.kind === 'endline') gainEvent = ev; // compute learning gain below
        break;
      default:
        break;
    }
  }

  // 5) Award any newly-earned badges (each adds XP, which may trigger level-up).
  const newBadges = badges.evaluateNew(
    {
      content,
      track: session.track || 'youth',
      completedSet: completed,
      profile,
      event: quizFinishedEvent,
    },
    earnedSet
  );
  for (const b of newBadges) {
    db.awardBadge(userId, b.id);
    earnedSet.add(b.id);
    profile.xp += AWARDS.badge;
    db.logEvent(userId, 'badge', { id: b.id });
  }

  // Certificate: earned on completing every lesson AND passing the track quiz.
  const justProgressed = completedThisTurn || Boolean(quizFinishedEvent);
  const certMsgs = handleCertificates(userId, profile, session, content, completed, result.events, justProgressed);

  // One-time opt-in nudge after the user finishes their first lesson.
  let optInPrompt = null;
  if (completedThisTurn && !profile.optInReminders && !profile.remindersPrompted) {
    profile.remindersPrompted = true;
    optInPrompt = content.strings.ui.optInPrompt;
  }

  // Finalise level + persist.
  const endLevel = levelInfo(profile.xp).index;
  profile.levelIndex = endLevel;
  profile.lang = session.lang;
  if (session.track) profile.track = session.track;
  profile.session = session;
  db.saveProfile(profile);

  // Build the outgoing bubbles: [daily greeting] + engine output + [rewards].
  const u = content.strings.ui;
  const prepend = [];
  if (activity.newDay && !firstEver && session.started && !session.awaitingLanguage) {
    let line = fill(u.rewardStreak, { n: profile.streak, pts: AWARDS.dailyCheckIn });
    if (activity.milestone) line = fill(u.rewardStreakMilestone, { n: activity.milestone, pts: AWARDS.dailyCheckIn });
    else if (activity.froze) line += u.rewardStreakSaved;
    prepend.push(line);
  }

  const rewards = [];
  if (xpVisible > 0) rewards.push(fill(u.rewardPoints, { pts: xpVisible }));
  for (const b of newBadges) {
    rewards.push(fill(u.rewardBadge, { name: b.name, desc: b.desc, pts: AWARDS.badge }));
  }
  if (endLevel > startLevel) {
    const levelName = (u.levelNames && u.levelNames[endLevel]) || LEVELS[endLevel].name;
    rewards.push(fill(u.rewardLevelUp, { name: levelName, n: endLevel + 1, count: LEVELS.length }));
  }
  // Learning gain: compare this endline against the earliest baseline.
  if (gainEvent) {
    const baseline = priorAssessments.find((a) => a.kind === 'baseline');
    if (baseline && baseline.total) {
      const before = Math.round((baseline.score / baseline.total) * 100);
      const after = Math.round((gainEvent.score / gainEvent.total) * 100);
      const delta = after - before;
      rewards.push(
        fill(u.rewardGain, { before, after }) + (delta > 0 ? fill(u.rewardGainProgress, { delta }) : '.')
      );
    }
  }
  if (optInPrompt) rewards.push(optInPrompt);

  // Normalise to rich bubbles { text, image? }. Engine bubbles are already
  // objects; daily/reward bubbles are plain strings.
  const toMsg = (m) => (typeof m === 'string' ? { text: m } : m);
  return {
    messages: [...prepend.map(toMsg), ...result.messages, ...rewards.map(toMsg), ...certMsgs.map(toMsg)],
    actions: result.actions,
    actionStyle: result.actionStyle,
    profile: publicProfile(profile, earnedSet.size),
  };
}

// ── Certificates ─────────────────────────────────────────────────────────────
// Earned once per track after every lesson is complete AND the track quiz is
// passed. Issued here (not the pure engine) because it needs the DB and image
// rendering. Returns extra bubbles to append; may set the name-capture cursor.
function handleCertificates(userId, profile, session, content, completed, events, justProgressed) {
  const u = content.strings.ui;
  const msgs = [];
  const track = session.track;

  // 1) Name just captured by the engine → issue immediately.
  const ready = events.find((e) => e.type === 'certificateReady');
  if (ready) {
    db.setName(userId, ready.name);
    profile.name = ready.name;
    issueAndRender(userId, ready.name, ready.track, content, msgs);
    return msgs;
  }
  if (!track) return msgs;

  const eligible =
    curriculum.trackProgress(content, track, completed).complete &&
    db.getPassedQuizTracks(userId).has(track);
  const already = db.getCertificate(userId, track);

  // 2) Explicit CERTIFICATE request.
  if (events.some((e) => e.type === 'certificateRequest')) {
    if (already) return (issueAndRender(userId, already.name, track, content, msgs), msgs);
    if (!eligible) return (msgs.push(u.certNotYet), msgs);
    return askOrIssue(userId, profile, session, content, track, msgs);
  }

  // 3) Auto: crossed the finish line this turn.
  if (justProgressed && eligible && !already) askOrIssue(userId, profile, session, content, track, msgs);
  return msgs;
}

function askOrIssue(userId, profile, session, content, track, msgs) {
  if (profile.name) issueAndRender(userId, profile.name, track, content, msgs);
  else {
    session.cursor = { type: 'certname', track };
    msgs.push(content.strings.ui.certEarnedAskName);
  }
  return msgs;
}

function issueAndRender(userId, name, track, content, msgs) {
  const u = content.strings.ui;
  let cert = db.getCertificate(userId, track);
  if (!cert) {
    cert = db.issueCertificate(certs.generateCode(), userId, name, track);
    db.logEvent(userId, 'certificateIssued', { track, code: cert.code });
  }
  const host = (config.mediaBaseUrl || '').replace(/\/$/, '');
  const verifyUrl = host ? `${host}/verify/${cert.code}` : `verify/${cert.code}`;
  msgs.push({ text: u.certCaption, image: `/cert/${cert.code}.png` });
  msgs.push(fill(u.certVerify, { url: verifyUrl }));
}

/** Begin (or resume) a conversation — keeps earned XP/badges, resets the cursor. */
function startConversation(userId, opts = {}) {
  const profile = db.getOrCreateProfile(userId, config.defaultLang);
  const session = engine.freshSession();
  session.lang = profile.lang || session.lang;
  if (profile.track) {
    session.track = profile.track;
    session.started = true;
    session.awaitingLanguage = false;
  }
  profile.session = session;
  db.saveProfile(profile);
  // Returning user → resume at their mission screen; brand-new → onboarding.
  return processMessage(userId, profile.track ? 'CONTINUE' : 'Hi', opts);
}

/** Build the nudge a given user would receive (or null if not ready). */
function buildNudgeForUser(userId, type) {
  const profile = db.getOrCreateProfile(userId, config.defaultLang);
  if (!profile.track) return null; // nothing to resume yet
  const content = getContent(profile.lang);
  const completed = db.getCompletedLessons(userId);
  return nudges.buildNudge(profile, content, completed, type);
}

/**
 * Run one proactive sweep: find users due a nudge `now`, build each message and
 * hand it to `send(userId, nudge, profile)`. Marks each user as nudged today so
 * they aren't messaged twice. Returns the list of { userId, type } nudged.
 *
 *   now = { hour, day }   send = async (userId, nudge, profile) => {}
 */
async function runNudgeSweep(now, send) {
  const due = nudges.selectDueNudges(db.allProfiles(), now);
  for (const item of due) {
    const profile = db.getOrCreateProfile(item.userId, config.defaultLang);
    const content = getContent(profile.lang);
    const completed = db.getCompletedLessons(item.userId);
    const nudge = nudges.buildNudge(profile, content, completed, item.type);
    try {
      await send(item.userId, nudge, profile);
      db.setLastNudge(item.userId, now.day);
      db.logEvent(item.userId, 'nudgeSent', { type: item.type });
    } catch (err) {
      // Leave last_nudge_day unset so we retry on the next sweep.
      db.logEvent(item.userId, 'nudgeFailed', { type: item.type, error: String(err && err.message) });
    }
  }
  return due;
}

function badgeDisplay(content, track, earnedSet) {
  return badges
    .catalogFor(content, track)
    .filter((b) => earnedSet.has(b.id))
    .map((b) => ({ id: b.id, emoji: b.emoji, name: b.name }));
}

function publicProfile(p, badgeCount) {
  const li = levelInfo(p.xp || 0);
  return {
    xp: p.xp || 0,
    level: li.name,
    levelIndex: li.index,
    pctToNext: li.pct,
    streak: p.streak || 0,
    longestStreak: p.longestStreak || 0,
    track: p.track || null,
    badges: badgeCount,
  };
}

module.exports = {
  processMessage,
  startConversation,
  buildNudgeForUser,
  runNudgeSweep,
  todayStr,
};
