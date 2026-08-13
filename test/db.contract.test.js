'use strict';

/**
 * Repository CONTRACT tests — the behavioural spec every storage backend must
 * satisfy, independent of how it stores data.
 *
 * Runs against SQLite (`:memory:`) always. When `DATABASE_URL` is set (in CI,
 * and locally against a test database) it ALSO runs against Postgres — the SAME
 * assertions. Identical passes are the proof the Phase-1 datastore swap is safe.
 *
 *   npm test                                   # sqlite only
 *   DATABASE_URL=postgres://... npm test       # sqlite + postgres (dual-run)
 *
 * Calls are `await`-ed so the one suite works for the sync SQLite backend
 * (await on a plain value is a no-op) and the async Postgres backend alike.
 */

// Must be set BEFORE the sqlite db module is required — it opens at load time.
process.env.ZEGA_DB = ':memory:';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const backends = [{ name: 'sqlite(:memory:)', make: () => require('../src/store/db') }];
if (process.env.DATABASE_URL) {
  backends.push({ name: 'postgres', make: () => require('../src/store/db.pg') });
}

// Unique ids (incl. pid) so tests sharing a persistent Postgres never collide.
let seq = 0;
const uid = (p) => `contract-${p}-${process.pid}-${seq++}`;

for (const backend of backends) {
  describe(`repository contract · ${backend.name}`, () => {
    const repo = backend.make();

    before(async () => {
      if (repo.init) await repo.init(); // create schema (Postgres)
      if (repo.reset) await repo.reset(); // clean slate (Postgres; sqlite :memory: is fresh)
    });
    after(async () => {
      if (repo.end) await repo.end(); // close the pool (Postgres)
    });

    it('getOrCreateProfile returns documented defaults, then is stable', async () => {
      const id = uid('new');
      const p = await repo.getOrCreateProfile(id, 'en');
      assert.equal(p.userId, id);
      assert.equal(p.xp, 0);
      assert.equal(p.track, null);
      assert.equal(p.streak, 0);
      assert.equal(p.reminderHour, 19, 'default reminder hour is 19:00');
      assert.equal(p.optInReminders, false);
      assert.equal(p.lite, false);
      assert.equal(p.resume, null);

      // Second call returns the SAME row — not re-inserted, not overwritten.
      const again = await repo.getOrCreateProfile(id, 'am');
      assert.equal(again.lang, 'en', 'existing language wins over the new default');
    });

    it('saveProfile round-trips every field, including JSON blobs', async () => {
      const id = uid('save');
      const p = await repo.getOrCreateProfile(id, 'en');
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
        nudgeIgnored: 2,
        resume: { id: 'youth.ai.understanding', index: 2 },
        session: { cursor: { type: 'lesson', id: 'youth.ai.understanding' }, lang: 'en' },
      });
      await repo.saveProfile(p);

      const got = await repo.getOrCreateProfile(id, 'en');
      assert.equal(got.xp, 120);
      assert.equal(got.track, 'youth');
      assert.equal(got.streak, 3);
      assert.equal(got.optInReminders, true);
      assert.equal(got.reminderHour, 8);
      assert.equal(got.lite, true);
      assert.equal(got.nudgeIgnored, 2);
      assert.deepEqual(got.resume, { id: 'youth.ai.understanding', index: 2 });
      assert.deepEqual(got.session, { cursor: { type: 'lesson', id: 'youth.ai.understanding' }, lang: 'en' });
    });

    it('profilesDueForNudge filters to opted-in, idle, un-nudged candidates; recordNudgeSent bumps the backoff', async () => {
      const day = '2026-08-20';
      // Eligible: opted in, has a track, idle today, not nudged today.
      const due = uid('due');
      const pd = await repo.getOrCreateProfile(due, 'en');
      Object.assign(pd, { track: 'youth', optInReminders: true, reminderHour: 19, lastActiveDay: '2026-08-19' });
      await repo.saveProfile(pd);
      // Not opted in → excluded.
      const off = uid('off');
      const po = await repo.getOrCreateProfile(off, 'en');
      Object.assign(po, { track: 'youth', optInReminders: false, lastActiveDay: '2026-08-19' });
      await repo.saveProfile(po);
      // Active today → excluded.
      const act = uid('act');
      const pa = await repo.getOrCreateProfile(act, 'en');
      Object.assign(pa, { track: 'youth', optInReminders: true, lastActiveDay: day });
      await repo.saveProfile(pa);

      const ids = new Set((await repo.profilesDueForNudge(day, 20)).map((p) => p.userId));
      assert.ok(ids.has(due), 'eligible learner is a candidate');
      assert.ok(!ids.has(off), 'opted-out learner is excluded');
      assert.ok(!ids.has(act), 'learner active today is excluded');

      // recordNudgeSent stamps the day and increments the ignored counter.
      await repo.recordNudgeSent(due, day);
      const after = await repo.getOrCreateProfile(due, 'en');
      assert.equal(after.lastNudgeDay, day);
      assert.equal(after.nudgeIgnored, 1);
      // Now excluded because already nudged today.
      const ids2 = new Set((await repo.profilesDueForNudge(day, 20)).map((p) => p.userId));
      assert.ok(!ids2.has(due), 'not re-selected after being nudged today');
    });

    it('lesson progress is an idempotent set', async () => {
      const id = uid('prog');
      await repo.getOrCreateProfile(id, 'en');
      assert.equal((await repo.getCompletedLessons(id)).size, 0);

      await repo.markLessonComplete(id, 'youth.foundations.privacy-intro');
      await repo.markLessonComplete(id, 'youth.foundations.privacy-intro'); // duplicate — ignored
      await repo.markLessonComplete(id, 'youth.foundations.passwords');

      const done = await repo.getCompletedLessons(id);
      assert.equal(done.size, 2, 'duplicates do not double-count');
      assert.ok(done.has('youth.foundations.passwords'));
    });

    it('badges are an idempotent set', async () => {
      const id = uid('badge');
      await repo.getOrCreateProfile(id, 'en');
      await repo.awardBadge(id, 'streak-3');
      await repo.awardBadge(id, 'streak-3'); // duplicate — ignored
      assert.equal((await repo.getEarnedBadges(id)).size, 1);
    });

    it('certificate issue is idempotent per (user, track)', async () => {
      const id = uid('cert');
      await repo.getOrCreateProfile(id, 'en');

      const first = await repo.issueCertificate('ZEGA-CONTRACT-1', id, 'Abebe Bekele', 'youth', 'am');
      assert.equal(first.name, 'Abebe Bekele');
      assert.equal(first.lang, 'am');

      // A second issue for the same (user, track) returns the EXISTING cert.
      const second = await repo.issueCertificate('ZEGA-CONTRACT-2', id, 'Someone Else', 'youth', 'en');
      assert.equal(second.code, first.code, 'same code returned, no duplicate certificate');

      assert.equal((await repo.getCertificateByCode(first.code)).user_id, id, 'lookup by public code resolves the owner');
      assert.equal(await repo.getCertificate(id, 'adult'), null, 'no certificate for an un-issued track');
    });

    it('events append and are derivable; allProfiles enumerates users', async () => {
      const id = uid('evt');
      await repo.getOrCreateProfile(id, 'en');
      await repo.logEvent(id, 'lessonCompleted', { lessonId: 'youth.ai.understanding' });
      await repo.logEvent(id, 'quizFinished', { track: 'youth', passed: true, score: 12, total: 13 });

      const ids = new Set((await repo.allProfiles()).map((p) => p.userId));
      assert.ok(ids.has(id), 'created profile appears in allProfiles()');
      assert.ok((await repo.getPassedQuizTracks(id)).has('youth'), 'a passed quiz is derivable from events');
    });
  });
}
