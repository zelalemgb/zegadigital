'use strict';

/**
 * Repository CONTRACT tests — the behavioural spec that every storage backend
 * must satisfy, independent of how it stores data.
 *
 * Today it runs against SQLite (`:memory:`). In Phase 1 of the scaling roadmap
 * the SAME suite runs against Postgres by adding a second entry to `backends`.
 * When both pass identically, the datastore swap is proven safe — that parity
 * is the whole point of this file.
 *
 *   npm test            # runs this with the rest of the suite
 *   node --test test/db.contract.test.js
 */

// Must be set BEFORE the db module is required — it opens the DB at load time.
process.env.ZEGA_DB = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');

// A backend is { name, make } where make() returns the repository module.
// Phase 1 will append: { name: 'postgres', make: () => require('../src/store/db.pg') }.
const backends = [{ name: 'sqlite(:memory:)', make: () => require('../src/store/db') }];

// Unique ids so tests sharing one in-memory DB never collide.
let seq = 0;
const uid = (p) => `contract-${p}-${seq++}`;

for (const backend of backends) {
  const repo = backend.make();
  const label = (s) => `[${backend.name}] ${s}`;

  test(label('getOrCreateProfile returns documented defaults, then is stable'), () => {
    const id = uid('new');
    const p = repo.getOrCreateProfile(id, 'en');
    assert.equal(p.userId, id);
    assert.equal(p.xp, 0);
    assert.equal(p.track, null);
    assert.equal(p.streak, 0);
    assert.equal(p.reminderHour, 19, 'default reminder hour is 19:00');
    assert.equal(p.optInReminders, false);
    assert.equal(p.lite, false);
    assert.equal(p.resume, null);

    // A second call must return the SAME row — not re-insert, not overwrite lang.
    const again = repo.getOrCreateProfile(id, 'am');
    assert.equal(again.lang, 'en', 'existing language wins over the new default');
  });

  test(label('saveProfile round-trips every field, including JSON blobs'), () => {
    const id = uid('save');
    const p = repo.getOrCreateProfile(id, 'en');
    Object.assign(p, {
      xp: 120,
      track: 'youth',
      streak: 3,
      longestStreak: 5,
      lastActiveDay: '2026-07-17',
      optInReminders: true,
      reminderHour: 8,
      lastNudgeDay: '2026-07-16',
      remindersPrompted: true,
      lite: true,
      resume: { id: 'youth.ai.understanding', index: 2 },
      session: { cursor: { type: 'lesson', id: 'youth.ai.understanding' }, lang: 'en' },
    });
    repo.saveProfile(p);

    const got = repo.getOrCreateProfile(id, 'en');
    assert.equal(got.xp, 120);
    assert.equal(got.track, 'youth');
    assert.equal(got.streak, 3);
    assert.equal(got.optInReminders, true);
    assert.equal(got.reminderHour, 8);
    assert.equal(got.lite, true);
    assert.deepEqual(got.resume, { id: 'youth.ai.understanding', index: 2 });
    assert.deepEqual(got.session, { cursor: { type: 'lesson', id: 'youth.ai.understanding' }, lang: 'en' });
  });

  test(label('lesson progress is an idempotent set'), () => {
    const id = uid('prog');
    repo.getOrCreateProfile(id, 'en');
    assert.equal(repo.getCompletedLessons(id).size, 0);

    repo.markLessonComplete(id, 'youth.foundations.privacy-intro');
    repo.markLessonComplete(id, 'youth.foundations.privacy-intro'); // duplicate — ignored
    repo.markLessonComplete(id, 'youth.foundations.passwords');

    const done = repo.getCompletedLessons(id);
    assert.equal(done.size, 2, 'duplicates do not double-count');
    assert.ok(done.has('youth.foundations.passwords'));
  });

  test(label('badges are an idempotent set'), () => {
    const id = uid('badge');
    repo.getOrCreateProfile(id, 'en');
    repo.awardBadge(id, 'streak-3');
    repo.awardBadge(id, 'streak-3'); // duplicate — ignored
    assert.equal(repo.getEarnedBadges(id).size, 1);
  });

  test(label('certificate issue is idempotent per (user, track)'), () => {
    const id = uid('cert');
    repo.getOrCreateProfile(id, 'en');

    const first = repo.issueCertificate('ZEGA-CONTRACT-1', id, 'Abebe Bekele', 'youth', 'am');
    assert.equal(first.name, 'Abebe Bekele');
    assert.equal(first.lang, 'am');

    // A second issue for the same (user, track) must return the EXISTING cert,
    // never a new code (UNIQUE(user_id, track)).
    const second = repo.issueCertificate('ZEGA-CONTRACT-2', id, 'Someone Else', 'youth', 'en');
    assert.equal(second.code, first.code, 'same code returned, no duplicate certificate');

    assert.equal(repo.getCertificateByCode(first.code).user_id, id, 'lookup by public code resolves the owner');
    assert.equal(repo.getCertificate(id, 'adult'), null, 'no certificate for an un-issued track');
  });

  test(label('events append and allProfiles enumerates created users'), () => {
    const id = uid('evt');
    repo.getOrCreateProfile(id, 'en');
    repo.logEvent(id, 'lessonCompleted', { lessonId: 'youth.ai.understanding' });
    repo.logEvent(id, 'quizFinished', { track: 'youth', passed: true, score: 12, total: 13 });

    const ids = new Set(repo.allProfiles().map((p) => p.userId));
    assert.ok(ids.has(id), 'created profile appears in allProfiles()');
    // getPassedQuizTracks reads back from the event log.
    assert.ok(repo.getPassedQuizTracks(id).has('youth'), 'a passed quiz is derivable from events');
  });
}
