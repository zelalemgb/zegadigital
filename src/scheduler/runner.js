'use strict';

/**
 * Nudge scheduler runner — shared by the standalone worker (scripts/scheduler.js)
 * and the web process (src/server.js, when RUN_SCHEDULER=true).
 *
 * startScheduler() runs a sweep immediately, then on an interval. If WhatsApp
 * isn't configured it logs what it would send (DRY-RUN) instead of calling the
 * API, so it's safe to run anywhere.
 */

const config = require('../config');
const runtime = require('../runtime');
const wa = require('../whatsapp/cloudApi');

const LANG_CODES = { en: 'en', am: 'am', om: 'en' };

function now() {
  const d = new Date();
  return { hour: d.getHours(), day: runtime.todayStr(d) };
}

async function sender(userId, nudge, profile) {
  if (!config.whatsapp.isConfigured) {
    console.log(`   [DRY-RUN] → ${userId} (${nudge.type}): ${nudge.message.replace(/\n/g, ' ')}`);
    return;
  }
  const lang = LANG_CODES[profile.lang] || 'en';
  await wa.sendTemplate(userId, nudge.template.name, lang, nudge.template.params, nudge.button.value);
}

async function sweep() {
  const clock = now();
  try {
    const due = await runtime.runNudgeSweep(clock, sender);
    console.log(`🔔 ${clock.day} ${clock.hour}:00 — nudged ${due.length} user(s).`);
  } catch (err) {
    console.error('Nudge sweep failed:', err);
  }
}

function startScheduler(intervalMs = config.schedulerIntervalMs) {
  console.log(
    `⏰ Nudge scheduler active (every ${Math.round(intervalMs / 60000)} min` +
      (config.whatsapp.isConfigured ? ').' : ', DRY-RUN — WhatsApp not configured).')
  );
  sweep();
  return setInterval(sweep, intervalMs);
}

module.exports = { startScheduler, sweep };
