'use strict';

/**
 * Durable storage backed by the built-in `node:sqlite` (no external deps).
 *
 * Tables:
 *   profiles        one row per user: language, track, xp, streak, reminder prefs, session blob
 *   lesson_progress one row per (user, lesson) the user has completed
 *   badges          one row per (user, badge) earned
 *   events          append-only analytics log (used for retention / KPI reporting)
 *
 * Everything is exposed through a small repository API so the rest of the app
 * never writes SQL. Swap this file for Postgres/Redis later without touching
 * callers.
 */

// node:sqlite is stable enough to use but still emits an ExperimentalWarning.
// Silence just that one warning so logs/CLI output stay clean.
const _emit = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  if (typeof warning === 'string' && warning.includes('SQLite')) return;
  return _emit.call(process, warning, ...rest);
};

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.ZEGA_DB || path.join(DATA_DIR, 'zega.db');

// Ensure the parent directory exists (handles a custom ZEGA_DB on a mounted disk).
if (DB_PATH !== ':memory:') {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    user_id        TEXT PRIMARY KEY,
    lang           TEXT DEFAULT 'en',
    track          TEXT,
    xp             INTEGER DEFAULT 0,
    level_index    INTEGER DEFAULT 0,
    streak         INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_day TEXT,
    opt_in_reminders INTEGER DEFAULT 0,
    reminder_hour  INTEGER DEFAULT 19,
    session        TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id      TEXT,
    lesson_id    TEXT,
    completed_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS badges (
    user_id   TEXT,
    badge_id  TEXT,
    earned_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, badge_id)
  );
  CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    type    TEXT,
    data    TEXT,
    ts      TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS assessments (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    kind    TEXT,          -- 'baseline' | 'endline'
    track   TEXT,
    score   INTEGER,
    total   INTEGER,
    ts      TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS check_results (
    user_id   TEXT,
    lesson_id TEXT,
    correct   INTEGER,
    ts        TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS certificates (
    code      TEXT PRIMARY KEY,   -- public verification code
    user_id   TEXT,
    name      TEXT,               -- name printed on the certificate
    track     TEXT,               -- 'youth' | 'adult'
    issued_at TEXT DEFAULT (datetime('now')),
    UNIQUE (user_id, track)       -- one certificate per learner per track
  );
`);

// Lightweight migrations: add columns that older databases may lack.
function ensureColumn(table, name, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
}
ensureColumn('profiles', 'last_nudge_day', 'TEXT');
ensureColumn('profiles', 'reminders_prompted', 'INTEGER DEFAULT 0');
ensureColumn('profiles', 'name', 'TEXT'); // learner's name, for certificates
ensureColumn('profiles', 'lite', 'INTEGER DEFAULT 0'); // data-saver: text lessons, no cards
ensureColumn('profiles', 'resume', 'TEXT'); // in-progress lesson pointer {id,index} for "continue"

// ── Prepared statements ──────────────────────────────────────────────────
const stmt = {
  getProfile: db.prepare('SELECT * FROM profiles WHERE user_id = ?'),
  insertProfile: db.prepare(
    'INSERT INTO profiles (user_id, lang) VALUES (?, ?)'
  ),
  updateProfile: db.prepare(`
    UPDATE profiles SET
      lang = ?, track = ?, xp = ?, level_index = ?, streak = ?,
      longest_streak = ?, last_active_day = ?, opt_in_reminders = ?,
      reminder_hour = ?, last_nudge_day = ?, reminders_prompted = ?,
      lite = ?, resume = ?, session = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `),
  allProfiles: db.prepare('SELECT * FROM profiles'),
  setLastNudge: db.prepare('UPDATE profiles SET last_nudge_day = ? WHERE user_id = ?'),
  getProgress: db.prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ?'),
  addProgress: db.prepare(
    'INSERT OR IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)'
  ),
  getBadges: db.prepare('SELECT badge_id FROM badges WHERE user_id = ?'),
  addBadge: db.prepare(
    'INSERT OR IGNORE INTO badges (user_id, badge_id) VALUES (?, ?)'
  ),
  addEvent: db.prepare('INSERT INTO events (user_id, type, data) VALUES (?, ?, ?)'),
  addAssessment: db.prepare(
    'INSERT INTO assessments (user_id, kind, track, score, total) VALUES (?, ?, ?, ?, ?)'
  ),
  getAssessments: db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY id'),
  upsertCheckResult: db.prepare(`
    INSERT INTO check_results (user_id, lesson_id, correct, ts)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET correct = excluded.correct, ts = excluded.ts
  `),
  getCheckResults: db.prepare('SELECT lesson_id, correct FROM check_results WHERE user_id = ?'),
  setName: db.prepare('UPDATE profiles SET name = ? WHERE user_id = ?'),
  quizEvents: db.prepare("SELECT data FROM events WHERE user_id = ? AND type = 'quizFinished'"),
  certPromptEvents: db.prepare("SELECT data FROM events WHERE user_id = ? AND type = 'certificatePrompted'"),
  insertCertificate: db.prepare(
    'INSERT OR IGNORE INTO certificates (code, user_id, name, track) VALUES (?, ?, ?, ?)'
  ),
  getCertByUserTrack: db.prepare('SELECT * FROM certificates WHERE user_id = ? AND track = ?'),
  getCertByCode: db.prepare('SELECT * FROM certificates WHERE code = ?'),
};

// ── Profile ───────────────────────────────────────────────────────────────
function getOrCreateProfile(userId, defaultLang = 'en') {
  let row = stmt.getProfile.get(userId);
  if (!row) {
    stmt.insertProfile.run(userId, defaultLang);
    row = stmt.getProfile.get(userId);
  }
  return rowToProfile(row);
}

function saveProfile(p) {
  stmt.updateProfile.run(
    p.lang,
    p.track,
    p.xp,
    p.levelIndex,
    p.streak,
    p.longestStreak,
    p.lastActiveDay,
    p.optInReminders ? 1 : 0,
    p.reminderHour,
    p.lastNudgeDay,
    p.remindersPrompted ? 1 : 0,
    p.lite ? 1 : 0,
    p.resume ? JSON.stringify(p.resume) : null,
    p.session ? JSON.stringify(p.session) : null,
    p.userId
  );
}

function allProfiles() {
  return stmt.allProfiles.all().map(rowToProfile);
}

function setLastNudge(userId, day) {
  stmt.setLastNudge.run(day, userId);
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

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ── Progress / badges / events ──────────────────────────────────────────────
function getCompletedLessons(userId) {
  return new Set(stmt.getProgress.all(userId).map((r) => r.lesson_id));
}

function markLessonComplete(userId, lessonId) {
  stmt.addProgress.run(userId, lessonId);
}

function getEarnedBadges(userId) {
  return new Set(stmt.getBadges.all(userId).map((r) => r.badge_id));
}

function awardBadge(userId, badgeId) {
  stmt.addBadge.run(userId, badgeId);
}

function logEvent(userId, type, data) {
  stmt.addEvent.run(userId, type, data ? JSON.stringify(data) : null);
}

function recordAssessment(userId, kind, track, score, total) {
  stmt.addAssessment.run(userId, kind, track, score, total);
}

function getAssessments(userId) {
  return stmt.getAssessments.all(userId);
}

function recordCheckResult(userId, lessonId, correct) {
  stmt.upsertCheckResult.run(userId, lessonId, correct ? 1 : 0);
}

// ── Name + certificates ──────────────────────────────────────────────────────
function setName(userId, name) {
  stmt.setName.run(name, userId);
}

/** Tracks whose quiz the user has passed (from the event log). */
function getPassedQuizTracks(userId) {
  const tracks = new Set();
  for (const r of stmt.quizEvents.all(userId)) {
    try {
      const d = JSON.parse(r.data);
      if (d && d.passed && d.track) tracks.add(d.track);
    } catch {
      /* ignore malformed rows */
    }
  }
  return tracks;
}

/** Tracks the user has already been auto-prompted to name a certificate for. */
function getCertPromptedTracks(userId) {
  const tracks = new Set();
  for (const r of stmt.certPromptEvents.all(userId)) {
    try {
      const d = JSON.parse(r.data);
      if (d && d.track) tracks.add(d.track);
    } catch {
      /* ignore */
    }
  }
  return tracks;
}

function getCertificate(userId, track) {
  return stmt.getCertByUserTrack.get(userId, track) || null;
}

function issueCertificate(code, userId, name, track) {
  stmt.insertCertificate.run(code, userId, name, track);
  return getCertificate(userId, track); // returns the existing row if one already existed
}

function getCertificateByCode(code) {
  return stmt.getCertByCode.get(code) || null;
}

function getCheckResults(userId) {
  const out = new Map();
  for (const r of stmt.getCheckResults.all(userId)) out.set(r.lesson_id, Boolean(r.correct));
  return out;
}

module.exports = {
  db,
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
