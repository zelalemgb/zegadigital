'use strict';

/**
 * Dual-write backend for the live SQLite → Postgres cutover (expand/contract).
 *
 * Enable with `DB_BACKEND=dual`. Every WRITE goes to both SQLite and Postgres;
 * every READ comes from the authority chosen by `DUAL_READ` (default `sqlite`).
 * This lets the live bot keep serving from SQLite while Postgres is filled and
 * verified, then flip reads to Postgres by canary — all reversible by env flag.
 *
 * Migration sequence:
 *   1. Backfill history:      node scripts/pg-backfill.js         (one-time)
 *   2. Turn on dual-write:    DB_BACKEND=dual  DUAL_READ=sqlite    (SQLite authoritative)
 *   3. Verify parity:         node scripts/pg-parity.js
 *   4. Canary reads:          DB_BACKEND=dual  DUAL_READ=postgres  (still writing both)
 *   5. Contract:              DB_BACKEND=postgres                  (drop SQLite)
 *
 * The Postgres mirror write is BEST-EFFORT (logged, never thrown) so a Postgres
 * hiccup can never break a live turn while SQLite is the authority. Watch the
 * `[dual] postgres mirror` logs during the migration.
 */

const sqlite = require('./db');
const pg = require('./db.pg');

const readFromPg = (process.env.DUAL_READ || 'sqlite').toLowerCase() === 'postgres';
const READ = readFromPg ? pg : sqlite; // the read authority
const WRITE_PRIMARY = readFromPg ? pg : sqlite; // must succeed
const WRITE_MIRROR = readFromPg ? sqlite : pg; // best-effort

async function init() {
  await pg.init(); // SQLite schema is created at require-time
}
async function end() {
  if (pg.end) await pg.end();
}
// Use the cross-instance Postgres advisory lock (both stores are present).
const withUserLock = (userId, fn) => pg.withUserLock(userId, fn);
const ping = () => READ.ping();

// Run the mirror write without ever throwing into the live request path.
async function mirror(fn, label) {
  try {
    await fn(WRITE_MIRROR);
  } catch (err) {
    console.error(`[dual] mirror write failed (${label}):`, err && err.message);
  }
}
// Primary write must succeed (its failure is a real error).
async function primary(fn) {
  return fn(WRITE_PRIMARY);
}

// ── Writes: both stores ──────────────────────────────────────────────────────
async function saveProfile(p) {
  await primary((s) => s.saveProfile(p));
  await mirror((s) => s.saveProfile(p), 'saveProfile');
}
async function markLessonComplete(u, l) {
  await primary((s) => s.markLessonComplete(u, l));
  await mirror((s) => s.markLessonComplete(u, l), 'markLessonComplete');
}
async function awardBadge(u, b) {
  await primary((s) => s.awardBadge(u, b));
  await mirror((s) => s.awardBadge(u, b), 'awardBadge');
}
async function logEvent(u, t, d) {
  await primary((s) => s.logEvent(u, t, d));
  await mirror((s) => s.logEvent(u, t, d), 'logEvent');
}
async function recordAssessment(u, k, t, sc, to) {
  await primary((s) => s.recordAssessment(u, k, t, sc, to));
  await mirror((s) => s.recordAssessment(u, k, t, sc, to), 'recordAssessment');
}
async function recordCheckResult(u, l, c) {
  await primary((s) => s.recordCheckResult(u, l, c));
  await mirror((s) => s.recordCheckResult(u, l, c), 'recordCheckResult');
}
async function setName(u, n) {
  await primary((s) => s.setName(u, n));
  await mirror((s) => s.setName(u, n), 'setName');
}
async function setLastNudge(u, d) {
  await primary((s) => s.setLastNudge(u, d));
  await mirror((s) => s.setLastNudge(u, d), 'setLastNudge');
}

// Read+write: ensure the row exists in BOTH, return from the read authority.
async function getOrCreateProfile(userId, lang) {
  await primary((s) => s.getOrCreateProfile(userId, lang));
  await mirror((s) => s.getOrCreateProfile(userId, lang), 'getOrCreateProfile');
  return READ.getOrCreateProfile(userId, lang);
}
async function issueCertificate(code, u, n, t, lang) {
  await primary((s) => s.issueCertificate(code, u, n, t, lang));
  await mirror((s) => s.issueCertificate(code, u, n, t, lang), 'issueCertificate');
  return READ.getCertificate(u, t);
}

// ── Reads: the authority only ────────────────────────────────────────────────
const allProfiles = () => READ.allProfiles();
const getCompletedLessons = (u) => READ.getCompletedLessons(u);
const getEarnedBadges = (u) => READ.getEarnedBadges(u);
const getAssessments = (u) => READ.getAssessments(u);
const getCheckResults = (u) => READ.getCheckResults(u);
const getPassedQuizTracks = (u) => READ.getPassedQuizTracks(u);
const getCertPromptedTracks = (u) => READ.getCertPromptedTracks(u);
const getCertificate = (u, t) => READ.getCertificate(u, t);
const getCertificateByCode = (c) => READ.getCertificateByCode(c);

module.exports = {
  init,
  end,
  withUserLock,
  ping,
  db: READ.db,
  saveProfile,
  markLessonComplete,
  awardBadge,
  logEvent,
  recordAssessment,
  recordCheckResult,
  setName,
  setLastNudge,
  getOrCreateProfile,
  issueCertificate,
  allProfiles,
  getCompletedLessons,
  getEarnedBadges,
  getAssessments,
  getCheckResults,
  getPassedQuizTracks,
  getCertPromptedTracks,
  getCertificate,
  getCertificateByCode,
};
