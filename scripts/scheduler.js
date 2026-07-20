#!/usr/bin/env node
'use strict';

/**
 * Standalone proactive nudge scheduler.   npm run scheduler
 *
 * Runs the same sweep the web process can run in-process (RUN_SCHEDULER=true).
 * Use this only if you run the scheduler as a SEPARATE worker sharing the same
 * database as the web app.
 */

const { startScheduler } = require('../src/scheduler/runner');
const store = require('../src/store');

// Initialise the backend (Postgres schema/connection; no-op for SQLite) first.
store
  .init()
  .then(() => startScheduler())
  .catch((err) => {
    console.error('❌ Scheduler failed to initialise the database backend:', err);
    process.exit(1);
  });
