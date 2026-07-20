'use strict';

/**
 * A keyed in-process mutex: serialises async work per key within ONE process.
 *
 * The async runtime can interleave two turns for the same user at their `await`
 * points, clobbering each other's read-modify-write of the profile. This
 * serialises them so each turn sees the previous turn's committed state.
 *
 * SQLite (single instance) needs only this. Postgres additionally takes a
 * cross-instance advisory lock (see db.pg.js) for the multi-replica case.
 */

function keyedMutex() {
  const tails = new Map(); // key -> Promise (tail of that key's queue)

  return async function run(key, fn) {
    const k = String(key);
    const prev = tails.get(k) || Promise.resolve();
    let release;
    const mine = new Promise((r) => { release = r; });
    const tail = prev.then(() => mine);
    tails.set(k, tail);

    await prev; // wait for the previous holder to finish
    try {
      return await fn();
    } finally {
      release();
      // Drop the entry if nobody queued behind us, so the map can't grow forever.
      if (tails.get(k) === tail) tails.delete(k);
    }
  };
}

module.exports = { keyedMutex };
