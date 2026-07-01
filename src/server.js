'use strict';

/**
 * Express server exposing the Meta WhatsApp Cloud API webhook.
 *
 *   GET  /webhook  → verification handshake (Meta calls this once)
 *   POST /webhook  → inbound messages; we run the runtime and reply
 *   GET  /         → public PWA landing page (QR to start on WhatsApp)
 *   GET  /health   → liveness probe
 *   GET  /admin    → manager analytics dashboard (cookie session; ADMIN_TOKEN)
 *   GET  /admin/login, POST /admin/login, GET /admin/logout → session auth
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

const PUBLIC = path.join(__dirname, '..', 'public');
// Serve lesson images (public URL for WhatsApp media headers).
app.use('/img', express.static(path.join(PUBLIC, 'img')));
// PWA assets (icons/manifest) and the vendored QR library. Scoped to their own
// folders so nothing else under public/ (e.g. admin.html) is exposed at root.
app.use('/assets', express.static(path.join(PUBLIC, 'pwa')));
app.use('/vendor', express.static(path.join(PUBLIC, 'vendor')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, whatsappConfigured: config.whatsapp.isConfigured });
});

// ── Public landing page (PWA) ─────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC, 'landing.html')));
app.get('/sw.js', (_req, res) => {
  res.set('Cache-Control', 'no-cache'); // always revalidate the service worker
  res.sendFile(path.join(PUBLIC, 'pwa', 'sw.js'));
});
app.get('/manifest.webmanifest', (_req, res) => res.sendFile(path.join(PUBLIC, 'pwa', 'manifest.webmanifest')));

// Public, non-sensitive info the landing page needs (WA deep-link + aggregates).
app.get('/public.json', (_req, res) => {
  const num = config.publicWaNumber;
  const msg = encodeURIComponent(config.publicWaMessage);
  res.json({
    waNumber: num || null,
    waLink: num ? `https://wa.me/${num}?text=${msg}` : null,
    stats: analytics.publicStats(),
  });
});

// ── Manager dashboard (cookie session) ────────────────────────────────────
// A cookie session (not HTTP Basic) so there's a real login page and a working
// "Sign out". Fails closed: with no ADMIN_TOKEN the dashboard is disabled, so
// learner data is never exposed by accident. The cookie holds a token derived
// from ADMIN_TOKEN via HMAC — proving knowledge of the password without storing
// it — and is HttpOnly + SameSite=Strict (+ Secure in production).
const COOKIE = 'zega_admin';
const COOKIE_PATH = '/admin';
const SESSION_TOKEN = config.adminToken
  ? crypto.createHmac('sha256', config.adminToken).update('zega-admin-session').digest('hex')
  : '';
const SECURE_COOKIES = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function requireAdmin(req, res, next) {
  if (!config.adminToken) {
    return res.status(503).send('Dashboard disabled: set ADMIN_TOKEN to enable.');
  }
  const tok = readCookie(req, COOKIE);
  if (tok && timingSafeEqual(tok, SESSION_TOKEN)) return next();
  // Not signed in: send the API a 401, but take a person to the login page.
  if (req.path.endsWith('/api')) return res.status(401).json({ error: 'Not authenticated' });
  return res.redirect('/admin/login');
}

app.get('/admin/login', (_req, res) => {
  if (!config.adminToken) return res.status(503).send('Dashboard disabled: set ADMIN_TOKEN to enable.');
  res.sendFile(path.join(PUBLIC, 'admin-login.html'));
});

app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  if (!config.adminToken) return res.status(503).send('Dashboard disabled: set ADMIN_TOKEN to enable.');
  const pass = (req.body && req.body.password) || '';
  if (timingSafeEqual(pass, config.adminToken)) {
    res.cookie(COOKIE, SESSION_TOKEN, {
      httpOnly: true, sameSite: 'strict', secure: SECURE_COOKIES,
      path: COOKIE_PATH, maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return res.redirect('/admin');
  }
  return res.redirect('/admin/login?e=1');
});

app.get('/admin/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: COOKIE_PATH });
  res.redirect('/admin/login');
});

app.get('/admin', requireAdmin, (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'admin.html'));
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
