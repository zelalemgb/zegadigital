'use strict';

/**
 * Postgres implementation of the storage repository — the Phase 1 backend that
 * lifts the single-instance SQLite ceiling.
 *
 * It exposes the SAME repository API as `src/store/db.js`, so callers don't
 * change. The one difference is that every method is ASYNC (Postgres I/O is
 * async), which the app's call sites adopt in the next Phase-1 step. The
 * repository contract suite (`test/db.contract.test.js`) runs against BOTH this
 * and the SQLite backend — identical passes are the proof the swap is safe.
 *
 * Connection: `DATABASE_URL` (e.g. Render Postgres). SSL is enabled when the URL
 * asks for it or `PGSSL=require` is set.
 */

const { Pool, types } = require('pg');

// Postgres returns COUNT()/SUM() (int8) and AVG() (numeric) as STRINGS by
// default; parse them to JS numbers so analytics arithmetic matches SQLite.
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // int8 / bigint
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric

const connectionString = process.env.DATABASE_URL;
const wantsSsl = /sslmode=require/.test(connectionString || '') || process.env.PGSSL === 'require';

const pool = new Pool({
  connectionString,
  ssl: wantsSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const q = (text, params) => pool.query(text, params);

// ── Schema ───────────────────────────────────────────────────────────────────
// Mirrors src/store/db.js in Postgres dialect: BOOLEAN for flags, BIGSERIAL for
// event/assessment ids, TIMESTAMPTZ for timestamps, TEXT for the JSON blobs
// (resume/session) so round-trips match the SQLite backend exactly.
async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id          TEXT PRIMARY KEY,
      lang             TEXT DEFAULT 'en',
      track            TEXT,
      xp               INTEGER DEFAULT 0,
      level_index      INTEGER DEFAULT 0,
      streak           INTEGER DEFAULT 0,
      longest_streak   INTEGER DEFAULT 0,
      last_active_day  TEXT,
      opt_in_reminders BOOLEAN DEFAULT FALSE,
      reminder_hour    INTEGER DEFAULT 19,
      last_nudge_day   TEXT,
      reminders_prompted BOOLEAN DEFAULT FALSE,
      name             TEXT,
      lite             BOOLEAN DEFAULT FALSE,
      resume           TEXT,
      session          TEXT,
      created_at       TIMESTAMPTZ DEFAULT now(),
      updated_at       TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id TEXT, lesson_id TEXT, completed_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS badges (
      user_id TEXT, badge_id TEXT, earned_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, badge_id)
    );
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY, user_id TEXT, type TEXT, data TEXT, ts TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id BIGSERIAL PRIMARY KEY, user_id TEXT, kind TEXT, track TEXT,
      score INTEGER, total INTEGER, ts TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS check_results (
      user_id TEXT, lesson_id TEXT, correct INTEGER, ts TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS certificates (
      code TEXT PRIMARY KEY, user_id TEXT, name TEXT, track TEXT,
      issued_at TIMESTAMPTZ DEFAULT now(), lang TEXT,
      UNIQUE (user_id, track)
    );
    -- Indexes that matter at scale (the scheduler's "due" query, event lookups).
    CREATE INDEX IF NOT EXISTS idx_events_user_type ON events (user_id, type);
    CREATE INDEX IF NOT EXISTS idx_profiles_due ON profiles (opt_in_reminders, last_nudge_day, reminder_hour);
  `);
}

// Test helper: wipe all rows for a clean slate. Never called in production.
async function reset() {
  await q('TRUNCATE profiles, lesson_progress, badges, events, assessments, check_results, certificates');
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function rowToProfile(row) {
  return {
    userId: row.user_id,
    lang: row.lang || 'en',
    track: row.track || null,
    xp: row.xp || 0,
    levelIndex: row.level_index || 0,
    streak: row.streak || 0,
    longestStreak: row.longest_streak || 0,
    lastActiveDay: row.last_active_day || null,
    optInReminders: Boolean(row.opt_in_reminders),
    reminderHour: row.reminder_hour == null ? 19 : row.reminder_hour,
    lastNudgeDay: row.last_nudge_day || null,
    remindersPrompted: Boolean(row.reminders_prompted),
    name: row.name || null,
    lite: Boolean(row.lite),
    resume: row.resume ? safeParse(row.resume) : null,
    session: row.session ? safeParse(row.session) : null,
  };
}

// ── Profiles ─────────────────────────────────────────────────────────────────
async function getOrCreateProfile(userId, defaultLang = 'en') {
  let { rows } = await q('SELECT * FROM profiles WHERE user_id = $1', [userId]);
  if (!rows.length) {
    await q('INSERT INTO profiles (user_id, lang) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [userId, defaultLang]);
    ({ rows } = await q('SELECT * FROM profiles WHERE user_id = $1', [userId]));
  }
  return rowToProfile(rows[0]);
}

async function saveProfile(p) {
  await q(
    `UPDATE profiles SET
       lang = $1, track = $2, xp = $3, level_index = $4, streak = $5,
       longest_streak = $6, last_active_day = $7, opt_in_reminders = $8,
       reminder_hour = $9, last_nudge_day = $10, reminders_prompted = $11,
       lite = $12, resume = $13, session = $14, updated_at = now()
     WHERE user_id = $15`,
    [
      p.lang, p.track, p.xp, p.levelIndex, p.streak,
      p.longestStreak, p.lastActiveDay, Boolean(p.optInReminders),
      p.reminderHour, p.lastNudgeDay, Boolean(p.remindersPrompted),
      Boolean(p.lite), p.resume ? JSON.stringify(p.resume) : null,
      p.session ? JSON.stringify(p.session) : null, p.userId,
    ]
  );
}

async function allProfiles() {
  const { rows } = await q('SELECT * FROM profiles');
  return rows.map(rowToProfile);
}

async function setLastNudge(userId, day) {
  await q('UPDATE profiles SET last_nudge_day = $1 WHERE user_id = $2', [day, userId]);
}

async function setName(userId, name) {
  await q('UPDATE profiles SET name = $1 WHERE user_id = $2', [name, userId]);
}

// ── Progress / badges / events ───────────────────────────────────────────────
async function getCompletedLessons(userId) {
  const { rows } = await q('SELECT lesson_id FROM lesson_progress WHERE user_id = $1', [userId]);
  return new Set(rows.map((r) => r.lesson_id));
}

async function markLessonComplete(userId, lessonId) {
  await q('INSERT INTO lesson_progress (user_id, lesson_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, lessonId]);
}

async function getEarnedBadges(userId) {
  const { rows } = await q('SELECT badge_id FROM badges WHERE user_id = $1', [userId]);
  return new Set(rows.map((r) => r.badge_id));
}

async function awardBadge(userId, badgeId) {
  await q('INSERT INTO badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, badgeId]);
}

async function logEvent(userId, type, data) {
  await q('INSERT INTO events (user_id, type, data) VALUES ($1, $2, $3)', [userId, type, data ? JSON.stringify(data) : null]);
}

async function recordAssessment(userId, kind, track, score, total) {
  await q('INSERT INTO assessments (user_id, kind, track, score, total) VALUES ($1, $2, $3, $4, $5)', [userId, kind, track, score, total]);
}

async function getAssessments(userId) {
  const { rows } = await q('SELECT * FROM assessments WHERE user_id = $1 ORDER BY id', [userId]);
  return rows;
}

async function recordCheckResult(userId, lessonId, correct) {
  await q(
    `INSERT INTO check_results (user_id, lesson_id, correct, ts)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET correct = EXCLUDED.correct, ts = EXCLUDED.ts`,
    [userId, lessonId, correct ? 1 : 0]
  );
}

async function getCheckResults(userId) {
  const { rows } = await q('SELECT lesson_id, correct FROM check_results WHERE user_id = $1', [userId]);
  return rows;
}

// Tracks derivable from the event log.
async function tracksFromEvents(userId, type, predicate) {
  const { rows } = await q('SELECT data FROM events WHERE user_id = $1 AND type = $2', [userId, type]);
  const tracks = new Set();
  for (const r of rows) {
    try {
      const d = JSON.parse(r.data);
      if (predicate(d)) tracks.add(d.track);
    } catch {
      /* ignore malformed rows */
    }
  }
  return tracks;
}
const getPassedQuizTracks = (userId) => tracksFromEvents(userId, 'quizFinished', (d) => d && d.passed && d.track);
const getCertPromptedTracks = (userId) => tracksFromEvents(userId, 'certificatePrompted', (d) => d && d.track);

// ── Certificates ─────────────────────────────────────────────────────────────
async function getCertificate(userId, track) {
  const { rows } = await q('SELECT * FROM certificates WHERE user_id = $1 AND track = $2', [userId, track]);
  return rows[0] || null;
}

async function issueCertificate(code, userId, name, track, lang = 'en') {
  await q(
    `INSERT INTO certificates (code, user_id, name, track, lang)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, track) DO NOTHING`,
    [code, userId, name, track, lang]
  );
  return getCertificate(userId, track); // existing row if one already existed
}

async function getCertificateByCode(code) {
  const { rows } = await q('SELECT * FROM certificates WHERE code = $1', [code]);
  return rows[0] || null;
}

async function end() {
  await pool.end();
}

module.exports = {
  db: pool,
  init,
  reset,
  end,
  getOrCreateProfile,
  saveProfile,
  allProfiles,
  setLastNudge,
  getCompletedLessons,
  markLessonComplete,
  getEarnedBadges,
  awardBadge,
  logEvent,
  recordAssessment,
  getAssessments,
  recordCheckResult,
  getCheckResults,
  setName,
  getPassedQuizTracks,
  getCertPromptedTracks,
  getCertificate,
  issueCertificate,
  getCertificateByCode,
};
