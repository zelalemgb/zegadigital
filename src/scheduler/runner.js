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

// Only the English templates are approved, so every learner gets the English
// reminder. Try the English locale variants in order until one matches the
// approved template, so it works however English was registered (en_US / en /
// en_GB). Switch to a per-language map once am/om templates are approved.
const ENGLISH_LOCALES = ['en_US', 'en', 'en_GB'];
// "Template does not exist in this language" — fall through to the next locale.
const LOCALE_MISS = /132001|does not exist|not found|no matching|translation/i;

function now() {
  const d = new Date();
  return { hour: d.getHours(), day: runtime.todayStr(d) };
}

async function sender(userId, nudge, profile) {
  // DRY-RUN until WhatsApp is configured AND the stage templates are approved
  // (config.nudgeTemplatesReady). Prevents blasting the API with un-approved
  // template names before go-live.
  if (!config.whatsapp.isConfigured || !config.nudgeTemplatesReady) {
    const why = !config.whatsapp.isConfigured ? 'WhatsApp not configured' : 'templates not marked ready';
    console.log(`   [DRY-RUN: ${why}] → ${userId} (${nudge.type}): ${nudge.message.replace(/\n/g, ' ')}`);
    return false; // signal "not delivered" so the sweep leaves state untouched
  }
  const locales = ENGLISH_LOCALES;
  let lastErr;
  for (const loc of locales) {
    try {
      await wa.sendTemplate(userId, nudge.template.name, loc, nudge.template.params, nudge.button.value);
      return true;
    } catch (err) {
      lastErr = err;
      // Only try the next locale when THIS one has no matching template; any
      // other error (bad params, rate limit, auth) is real — surface it.
      if (!LOCALE_MISS.test(String(err && err.message))) throw err;
    }
  }
  throw lastErr;
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
