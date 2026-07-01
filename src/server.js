'use strict';

/**
 * Express server exposing the Meta WhatsApp Cloud API webhook.
 *
 *   GET  /webhook  → verification handshake (Meta calls this once)
 *   POST /webhook  → inbound messages; we run the runtime and reply
 *   GET  /health   → liveness probe
 *   GET  /admin    → manager analytics dashboard (HTTP Basic, ADMIN_TOKEN)
 *   GET  /admin/api→ dashboard data as JSON (same auth)
 *   GET  /img/*    → lesson illustrations (so MEDIA_BASE_URL can point here)
 *
 * Inbound POSTs are authenticated with the X-Hub-Signature-256 header when
 * APP_SECRET is set. Register the public https URL + VERIFY_TOKEN in the Meta
 * App dashboard. See README for steps.
 */

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const config = require('./config');
const runtime = require('./runtime');
const wa = require('./whatsapp/cloudApi');
const analytics = require('./analytics');
const { startScheduler } = require('./scheduler/runner');

const app = express();
// Capture the raw body so we can verify Meta's signature over the exact bytes.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Serve lesson images (public URL for WhatsApp media headers).
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, whatsappConfigured: config.whatsapp.isConfigured });
});

// ── Manager dashboard (protected) ─────────────────────────────────────────
// Fails closed: with no ADMIN_TOKEN set the dashboard is disabled, so we never
// expose learner data by accident. Auth is HTTP Basic — any username, password
// must equal ADMIN_TOKEN — which the browser handles with a native prompt.
function requireAdmin(req, res, next) {
  if (!config.adminToken) {
    return res.status(503).send('Dashboard disabled: set ADMIN_TOKEN to enable.');
  }
  const header = req.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const pass = Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':');
    const a = Buffer.from(pass);
    const b = Buffer.from(config.adminToken);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Zega Dashboard"').status(401).send('Authentication required.');
}

app.get('/admin', requireAdmin, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/admin/api', requireAdmin, (_req, res) => {
  try {
    res.json({
      summary: analytics.summary(),
      lessons: analytics.lessonBreakdown(),
      learners: analytics.learners(),
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    res.status(500).json({ error: 'Failed to compute analytics.' });
  }
});

// ── Webhook verification (GET) ────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('❌ Webhook verification failed');
  return res.sendStatus(403);
});

// Verify X-Hub-Signature-256 against APP_SECRET (skipped if no secret set).
function signatureValid(req) {
  if (!config.whatsapp.appSecret) return true; // dev / not configured
  const header = req.get('x-hub-signature-256') || '';
  if (!header.startsWith('sha256=') || !req.rawBody) return false;
  const expected = 'sha256=' +
    crypto.createHmac('sha256', config.whatsapp.appSecret).update(req.rawBody).digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Inbound messages (POST) ───────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  if (!signatureValid(req)) {
    console.warn('❌ Invalid webhook signature — rejected');
    return res.sendStatus(401);
  }
  // Acknowledge immediately so Meta doesn't retry; process in the background.
  res.sendStatus(200);

  let inbound;
  try {
    inbound = wa.parseInbound(req.body);
  } catch (err) {
    console.error('Failed to parse inbound payload:', err);
    return;
  }

  for (const m of inbound) {
    if (!m.from) continue;
    try {
      if (m.id) wa.markRead(m.id);
      const input = m.text == null ? '' : m.text;
      const result = runtime.processMessage(m.from, input);
      await wa.sendTurn(m.from, result.messages, result.actions, result.actionStyle);
    } catch (err) {
      console.error(`Error handling message from ${m.from}:`, err);
    }
  }
});

app.listen(config.port, () => {
  console.log(`🤖 Zega Digital bot listening on :${config.port}`);
  if (!config.whatsapp.isConfigured) {
    console.log('⚠️  WhatsApp Cloud API not configured (WHATSAPP_TOKEN / PHONE_NUMBER_ID).');
    console.log('   The webhook will still verify; run `npm run cli` to test the flow locally.');
  }
  if (config.runScheduler) startScheduler();
});

module.exports = app;
