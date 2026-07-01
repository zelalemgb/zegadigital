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

startScheduler();
