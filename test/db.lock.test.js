'use strict';

/**
 * withUserLock must serialise concurrent same-user turns so a read-modify-write
 * of the profile can't lose updates. If the lock were a no-op, 25 concurrent
 * "+10 xp" operations would interleave and land far short of +250.
 *
 * Runs against SQLite always (in-process mutex); also Postgres (mutex + advisory
 * lock) when DATABASE_URL is set.
 */

process.env.ZEGA_DB = ':memory:';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const backends = [{ name: 'sqlite', mod: '../src/store/db' }];
if (process.env.DATABASE_URL) backends.push({ name: 'postgres', mod: '../src/store/db.pg' });

for (const b of backends) {
  describe(`withUserLock · ${b.name}`, () => {
    const db = require(b.mod);
    before(async () => { if (db.init) await db.init(); });
    after(async () => { if (db.end) await db.end(); });

    test('serialises same-user read-modify-write (no lost update)', async () => {
      const uid = `lock-${b.name}-${process.pid}`;
      await db.getOrCreateProfile(uid, 'en');
      const N = 25;
      const inc = () =>
        db.withUserLock(uid, async () => {
          const p = await db.getOrCreateProfile(uid);
          p.xp = (p.xp || 0) + 10;
          await db.saveProfile(p);
        });
      await Promise.all(Array.from({ length: N }, inc));
      assert.equal((await db.getOrCreateProfile(uid)).xp, N * 10, 'every increment applied');
    });
  });
}
