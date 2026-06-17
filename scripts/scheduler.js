#!/usr/bin/env node
'use strict';

/**
 * Proactive nudge scheduler.
 *
 *   npm run scheduler
 *
 * Runs a sweep every few minutes: finds opted-in users who haven't engaged today
 * and whose reminder time has passed, then sends them a template message with a
 * "Continue learning" quick-reply button. Tapping it re-opens the 24-hour window
 * and the webhook resumes the lesson.
 *
 * If WhatsApp isn't configured, sweeps run in DRY-RUN mode and just log what
 * would be sent — handy for local testing.
 */

const config = require('./../src/config');
const runtime = require('../src/runtime');
const wa = require('../src/whatsapp/cloudApi');

const SWEEP_MS = parseInt(process.env.SWEEP_MS, 10) || 15 * 60 * 1000; // every 15 min
const LANG_CODES = { en: 'en', am: 'am', om: 'en' }; // map to your registered template locales

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
  // Outside the 24h window a template is required; the quick-reply payload is
  // what the user "sends" when they tap the button.
  await wa.sendTemplate(userId, nudge.template.name, lang, nudge.template.params, nudge.button.value);
}

async function sweep() {
  const clock = now();
  try {
    const due = await runtime.runNudgeSweep(clock, sender);
    console.log(`🔔 ${clock.day} ${clock.hour}:00 — nudged ${due.length} user(s).`);
  } catch (err) {
    console.error('Sweep failed:', err);
  }
}

console.log(`⏰ Zega nudge scheduler started (every ${Math.round(SWEEP_MS / 60000)} min).`);
if (!config.whatsapp.isConfigured) console.log('   WhatsApp not configured → DRY-RUN mode (logging only).');
sweep();
setInterval(sweep, SWEEP_MS);
