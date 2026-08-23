'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  defaultLang: process.env.DEFAULT_LANG || 'en',

  // Password for the manager dashboard at /admin (HTTP Basic). Unset = disabled.
  adminToken: process.env.ADMIN_TOKEN || '',

  // Public WhatsApp number (international format, digits only) the landing-page
  // QR code and "Chat" button deep-link to. Unset = the page shows a placeholder.
  publicWaNumber: (process.env.PUBLIC_WA_NUMBER || '').replace(/[^\d]/g, ''),
  publicWaMessage: process.env.PUBLIC_WA_MESSAGE || 'Hi',

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    verifyToken: process.env.VERIFY_TOKEN || '',
    appSecret: process.env.APP_SECRET || '',
  },

  // When true, the web process also runs the nudge scheduler in-process (so a
  // single Render instance sharing one SQLite disk covers both).
  runScheduler: process.env.RUN_SCHEDULER === 'true',
  schedulerIntervalMs: parseInt(process.env.SWEEP_MS, 10) || 15 * 60 * 1000,
  // Max nudge sends in flight per sweep — keeps large sweeps from a thundering
  // herd while staying within WhatsApp's throughput.
  nudgeConcurrency: parseInt(process.env.NUDGE_CONCURRENCY, 10) || 8,
  // Go-live gate for proactive sends. The stage templates (zega_almost_there,
  // zega_quiz_left, zega_cert_ready, zega_reengagement) must be APPROVED in
  // WhatsApp Manager first. Until this is 'true' the scheduler runs in DRY-RUN
  // (logs what it would send) even when WhatsApp is configured — so we can ship
  // the logic, watch opt-ins grow, and flip sending on once Meta approves.
  nudgeTemplatesReady: process.env.NUDGE_TEMPLATES_READY === 'true',
  // Which learner languages receive proactive reminders. Default English-only
  // while am/om templates are still being registered/mapped; widen with
  // NUDGE_LANGS=en,am,om (env only, no deploy) once those are approved.
  nudgeLangs: (process.env.NUDGE_LANGS || 'en')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Earliest hour of day (server clock — set TZ=Africa/Addis_Ababa so this is
  // EAT) to send reminders. Default 20:00 = 8pm, the evening engagement peak
  // (off work, post-dinner, on the phone). Tune/A-B test via NUDGE_HOUR.
  nudgeHour: Number.isFinite(parseInt(process.env.NUDGE_HOUR, 10))
    ? parseInt(process.env.NUDGE_HOUR, 10)
    : 20,

  // Public base URL where lesson images are hosted (e.g. https://cdn.example.com).
  // Lesson `image` paths like "/img/passwords.png" are resolved against this when
  // sending on real WhatsApp. Leave empty to send text only (e.g. for SVG assets,
  // which WhatsApp does not accept — rasterise to PNG/JPEG and host them).
  mediaBaseUrl: process.env.MEDIA_BASE_URL || '',
};

config.whatsapp.isConfigured = Boolean(
  config.whatsapp.token && config.whatsapp.phoneNumberId
);

module.exports = config;
