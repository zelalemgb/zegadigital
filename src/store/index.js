'use strict';

/**
 * Storage backend selector.
 *
 *   DB_BACKEND=postgres   → Postgres (src/store/db.pg.js)
 *   DB_BACKEND=sqlite     → SQLite   (src/store/db.js)   [default]
 *
 * Both satisfy the same repository contract (test/db.contract.test.js), so the
 * rest of the app requires THIS module (`./store`) and never cares which is
 * active. The whole app is async against the repository, so a SQLite result
 * (returned synchronously) and a Postgres result (a promise) are both awaited
 * transparently by callers.
 *
 * Cutover is a flag flip — no code change, instantly reversible.
 */

const backendName = (process.env.DB_BACKEND || 'sqlite').toLowerCase();
const backend = backendName === 'postgres' ? require('./db.pg') : require('./db');

// Every backend exposes an async init() (schema/connection). SQLite creates its
// schema at require-time, so its init is a no-op — normalise it here so startup
// code can always `await store.init()`.
if (typeof backend.init !== 'function') backend.init = async () => {};

module.exports = backend;
