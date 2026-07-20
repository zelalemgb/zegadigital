'use strict';

/**
 * Express server exposing the Meta WhatsApp Cloud API webhook.
 *
 *   GET  /webhook  → verification handshake (Meta calls this once)
 *   POST /webhook  → inbound messages; we run the runtime and reply
 *   GET  /         → public PWA landing page (QR to start on WhatsApp)
 *   GET  /cert/:code.png → completion certificate image (public)
 *   GET  /verify/:code   → public certificate verification page
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
// Wire bundled fonts into fontconfig BEFORE anything pulls in sharp/librsvg,
// so Amharic / Afaan Oromo cards render on Render's Linux box.
require('./util/fonts').configure();
const config = require('./config');
const runtime = require('./runtime');
const wa = require('./whatsapp/cloudApi');
const analytics = require('./analytics');
const db = require('./store'); // backend facade (SQLite or Postgres via DB_BACKEND)
const certs = require('./certificates');
const lessonCard = require('./lessonCard');
const curriculum = require('./curriculum');
const { getContent } = require('./content');
const { startScheduler } = require('./scheduler/runner');

// Safety net: never let a stray async error take the bot down mid-conversation.
// Log it and keep serving; a single bad turn must not crash the process.
process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));
process.on('uncaughtException', (err) => console.error('UncaughtException:', err));

const app = express();
// Capture the raw body so we can verify Meta's signature over the exact bytes.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

const PUBLIC = path.join(__dirname, '..', 'public');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// Serve lesson images (public URL for WhatsApp media headers).
app.use('/img', express.static(path.join(PUBLIC, 'img')));
// PWA assets (icons/manifest) and the vendored QR library. Scoped to their own
// folders so nothing else under public/ (e.g. admin.html) is exposed at root.
app.use('/assets', express.static(path.join(PUBLIC, 'pwa')));
app.use('/vendor', express.static(path.join(PUBLIC, 'vendor')));

const DB_BACKEND = (process.env.DB_BACKEND || 'sqlite').toLowerCase();
// Liveness: the process is up (used to restart a wedged instance).
app.get('/health', (_req, res) => {
  res.json({ ok: true, backend: DB_BACKEND, whatsappConfigured: config.whatsapp.isConfigured });
});
// Readiness: dependencies (the database) are reachable. A load balancer uses
// this to pull an unhealthy replica OUT of rotation without killing it — the
// key probe once we run multiple instances (Phase 2).
app.get('/ready', async (_req, res) => {
  try {
    await db.ping();
    res.json({ ready: true, backend: DB_BACKEND });
  } catch (err) {
    res.status(503).json({ ready: false, backend: DB_BACKEND, error: err && err.message });
  }
});

// ── Public landing page (PWA) ─────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC, 'landing.html')));
app.get('/sw.js', (_req, res) => {
  res.set('Cache-Control', 'no-cache'); // always revalidate the service worker
  res.sendFile(path.join(PUBLIC, 'pwa', 'sw.js'));
});
app.get('/manifest.webmanifest', (_req, res) => res.sendFile(path.join(PUBLIC, 'pwa', 'manifest.webmanifest')));

// ── Certificates (public) ─────────────────────────────────────────────────
function baseUrl(req) {
  return (config.mediaBaseUrl || '').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
}
// A sample certificate (no DB row) — useful for previews and for confirming
// the renderer works in production. Registered before the code route below.
const SAMPLE_CERT = { code: 'SAMPLE', name: 'Sample Learner', track: 'youth', issued_at: '2026-01-01 00:00:00' };
app.get('/cert/sample.png', async (req, res) => {
  try {
    const png = await certs.renderPng(SAMPLE_CERT, baseUrl(req));
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=3600').send(png);
  } catch (err) {
    console.error('Sample certificate render error:', err);
    res.sendStatus(500);
  }
});
// Certificate image, rendered on demand from the stored row. WhatsApp fetches
// this URL, and the verify page embeds it.
app.get(/^\/cert\/([A-Za-z0-9-]+)\.png$/, async (req, res) => {
  const cert = await db.getCertificateByCode(req.params[0]);
  if (!cert) return res.sendStatus(404);
  try {
    const png = await certs.renderPng(cert, baseUrl(req));
    res.set('Content-Type', 'image/png').set('Cache-Control', 'public, max-age=86400').send(png);
  } catch (err) {
    console.error('Certificate render error:', err);
    res.sendStatus(500);
  }
});
// Public verification page.
app.get('/verify/:code', async (req, res) => {
  const cert = await db.getCertificateByCode(req.params.code);
  res.status(cert ? 200 : 404).send(certs.verifyHtml(cert, baseUrl(req)));
});

// ── Lesson cards ───────────────────────────────────────────────────────────
// Look up a single card by ?lang=&lesson=&page= (shared by both routes).
function lookupCard(req) {
  const content = getContent(req.query.lang || 'en');
  const cards = lessonCard.lessonCards(content, req.query.lesson || '');
  return cards[(parseInt(req.query.page, 10) || 1) - 1] || null;
}

// GET /icon.jpg?lang=&lesson=&page= → the slim content-matched icon banner used
// as a lesson message's image header (the lesson text itself stays native text).
app.get('/icon.jpg', async (req, res) => {
  const card = lookupCard(req);
  if (!card) return res.sendStatus(404);
  try {
    const jpg = await lessonCard.renderIconBannerJpg(card);
    res.set('Content-Type', 'image/jpeg').set('Cache-Control', 'public, max-age=86400').send(jpg);
  } catch (err) {
    console.error('Icon banner render error:', err);
    res.sendStatus(500);
  }
});

// GET /card.jpg?lang=am&lesson=youth.ai.understanding&page=2 → the card WhatsApp
// actually fetches: JPEG@820, ~half the bytes of the PNG. Cacheable so WhatsApp's
// media CDN and the learner's device don't re-download an unchanged card.
app.get('/card.jpg', async (req, res) => {
  const card = lookupCard(req);
  if (!card) return res.sendStatus(404);
  try {
    const jpg = await lessonCard.renderCardJpg(card);
    res.set('Content-Type', 'image/jpeg').set('Cache-Control', 'public, max-age=86400').send(jpg);
  } catch (err) {
    console.error('Card render error:', err);
    res.sendStatus(500);
  }
});

// GET /card.png?… → full-res PNG, used by the browser preview gallery.
app.get('/card.png', async (req, res) => {
  const card = lookupCard(req);
  if (!card) return res.sendStatus(404);
  try {
    const png = await lessonCard.renderCardPng(card);
    res.set('Content-Type', 'image/png').set('Cache-Control', 'no-cache').send(png);
  } catch (err) {
    console.error('Card render error:', err);
    res.sendStatus(500);
  }
});

// GET /chat → a WhatsApp-style mockup of how a lesson turn looks in the chat.
app.get('/chat', (req, res) => {
  const lang = ['en', 'am', 'om'].includes(req.query.lang) ? req.query.lang : 'en';
  const lesson = req.query.lesson || 'youth.foundations.passwords';
  const content = getContent(lang);
  const cards = lessonCard.lessonCards(content, lesson);
  const src = (p) => `/card.png?lang=${lang}&lesson=${encodeURIComponent(lesson)}&page=${p}`;
  const track = lesson.split('.')[0];
  const mod = curriculum.moduleOf(content, track, lesson);
  // A couple of card bubbles, then the reply buttons; then a menu as a list.
  const shown = cards.slice(0, Math.min(2, cards.length));
  const cardBubbles = shown.map((c, i) => `
    <div class="row in"><div class="bubble img">
      <img src="${src(i + 1)}"/>
      <div class="meta">9:4${i} AM</div>
    </div></div>`).join('');
  const replyBtns = ['Next', 'Back', 'Menu'].map((b) =>
    `<button class="qr">${b}</button>`).join('');
  const modOpts = mod ? mod.lessonIds.map((id) => content.nodes[id] && content.nodes[id].title).filter(Boolean) : [];
  const listRows = modOpts.slice(0, 4).map((t) => `<div class="lrow">${t}</div>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Zega — WhatsApp preview</title><style>
  *{box-sizing:border-box;margin:0} body{font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#c9d2d8;display:flex;gap:26px;justify-content:center;padding:26px;flex-wrap:wrap}
  .lang{position:fixed;top:12px;right:16px;display:flex;gap:6px}
  .lang a{background:#075e54;color:#fff;text-decoration:none;padding:4px 12px;border-radius:8px;font-size:13px}.lang a.on{background:#25d366}
  .phone{width:390px;height:820px;background:#efeae2;border-radius:34px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;border:10px solid #111}
  .hd{background:#075e54;color:#fff;display:flex;align-items:center;gap:10px;padding:14px 12px 12px}
  .hd .av{width:38px;height:38px;border-radius:50%;background:#25d366;display:grid;place-items:center;font-weight:800;color:#075e54}
  .hd .nm{font-weight:600;font-size:16px}.hd .st{font-size:12px;opacity:.85}
  .chat{flex:1;overflow:auto;padding:14px 12px;background:#efeae2;background-image:radial-gradient(rgba(0,0,0,.03) 1px,transparent 1px);background-size:18px 18px}
  .row{display:flex;margin:8px 0}.row.in{justify-content:flex-start}
  .bubble{max-width:82%;background:#fff;border-radius:10px;padding:6px;box-shadow:0 1px 1px rgba(0,0,0,.12);position:relative}
  .bubble.img img{width:100%;border-radius:7px;display:block}
  .bubble .meta{font-size:11px;color:#8a9aa0;text-align:right;padding:2px 4px 0}
  .bubble.txt{padding:8px 10px;font-size:14.5px;color:#111}
  .qrs{display:flex;flex-direction:column;gap:6px;max-width:82%;margin:2px 0 8px}
  .qr{background:#fff;border:0;border-radius:10px;padding:11px;color:#009de2;font-weight:600;font-size:15px;box-shadow:0 1px 1px rgba(0,0,0,.12);cursor:pointer}
  .listbtn{border-top:1px solid #eceff1;margin-top:6px;padding-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;color:#009de2;font-weight:600}
  .picker{max-width:82%;background:#fff;border-radius:10px;box-shadow:0 1px 1px rgba(0,0,0,.12);margin:4px 0 8px;overflow:hidden}
  .picker .ph{padding:10px 12px;font-weight:600;border-bottom:1px solid #eceff1}
  .lrow{padding:12px;border-bottom:1px solid #f2f4f5;color:#111}
  .inp{background:#f0f0f0;display:flex;gap:8px;padding:8px 10px;align-items:center}
  .inp .f{flex:1;background:#fff;border-radius:20px;padding:9px 14px;color:#8a9aa0;font-size:14px}
  .inp .snd{width:40px;height:40px;border-radius:50%;background:#00a884;color:#fff;display:grid;place-items:center;font-size:18px}
  .cap{color:#4b5a63;font-size:13px;text-align:center;width:100%;margin-top:4px}
</style></head><body>
  <div class="lang">${['en', 'am', 'om'].map((l) => `<a class="${l === lang ? 'on' : ''}" href="/chat?lang=${l}&lesson=${encodeURIComponent(lesson)}">${l.toUpperCase()}</a>`).join('')}</div>
  <div class="phone">
    <div class="hd"><span>&#8592;</span><div class="av">Z</div><div><div class="nm">Zega Digital</div><div class="st">online</div></div></div>
    <div class="chat">
      ${cardBubbles}
      <div class="qrs">${replyBtns}</div>
      <div class="cap">— tap a topic —</div>
      <div class="picker"><div class="ph">${mod ? esc(mod.label) : 'Topics'}</div>${listRows}</div>
      <div class="row in"><div class="bubble txt">${mod ? 'Choose a topic to continue.' : ''}<div class="listbtn">&#9776;&nbsp; Select</div><div class="meta">9:47 AM</div></div></div>
    </div>
    <div class="inp"><div class="f">Message</div><div class="snd">&#10148;</div></div>
  </div>
</body></html>`);
});

// GET /cards → a browser gallery to review every lesson's cards.
app.get('/cards', (req, res) => {
  const lang = ['en', 'am', 'om'].includes(req.query.lang) ? req.query.lang : 'en';
  const content = getContent(lang);
  const sel = req.query.lesson || '';
  const groups = [];
  for (const track of ['youth', 'adult']) {
    for (const m of curriculum.modulesForTrack(content, track)) {
      groups.push({
        label: `${track} · ${m.label}`,
        lessons: m.lessonIds.map((id) => ({ id, title: content.nodes[id] && content.nodes[id].title })),
      });
    }
  }
  const cards = sel ? lessonCard.lessonCards(content, sel) : [];
  const q = (l, id) => `/cards?lang=${l}${id ? `&lesson=${encodeURIComponent(id)}` : ''}`;
  const nav = groups.map((g) => `<div class="grp"><h3>${g.label}</h3>${g.lessons
    .map((L) => `<a class="${L.id === sel ? 'on' : ''}" href="${q(lang, L.id)}">${L.title || L.id}</a>`)
    .join('')}</div>`).join('');
  const imgs = cards.map((_, i) =>
    `<figure><img loading="lazy" src="/card.png?lang=${lang}&lesson=${encodeURIComponent(sel)}&page=${i + 1}"/></figure>`).join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Zega — lesson cards preview</title><style>
  *{box-sizing:border-box} body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#12203b;background:#eef1f6}
  header{background:#345aa0;color:#fff;padding:14px 20px;display:flex;gap:14px;align-items:center;position:sticky;top:0;z-index:2}
  header b{font-size:16px;letter-spacing:.04em} header .langs{margin-left:auto;display:flex;gap:8px}
  header a{color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,.4);padding:4px 12px;border-radius:8px;font-size:13px}
  header a.on{background:#fff;color:#345aa0;font-weight:700}
  .wrap{display:grid;grid-template-columns:300px 1fr;gap:0;align-items:start}
  nav{padding:16px;max-height:calc(100vh - 50px);overflow:auto;border-right:1px solid #dde3ec;background:#f7f9fc}
  .grp h3{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5c6b86;margin:14px 0 6px}
  nav a{display:block;padding:6px 10px;border-radius:8px;text-decoration:none;color:#25324a;font-size:14px}
  nav a:hover{background:#e7edf6} nav a.on{background:#345aa0;color:#fff;font-weight:600}
  main{padding:22px}
  .cards{display:flex;flex-wrap:wrap;gap:18px} figure{margin:0} figure img{width:340px;height:auto;border-radius:14px;box-shadow:0 8px 24px rgba(19,35,63,.14)}
  .empty{color:#5c6b86;padding:30px}
</style></head><body>
<header><b>ZEGA · Lesson card preview</b>
  <div class="langs">${['en', 'am', 'om'].map((l) => `<a class="${l === lang ? 'on' : ''}" href="${q(l, sel)}">${l.toUpperCase()}</a>`).join('')}</div>
</header>
<div class="wrap"><nav>${nav}</nav>
<main>${sel ? `<div class="cards">${imgs}</div>` : '<div class="empty">Pick a lesson on the left to preview its cards.</div>'}</main></div>
</body></html>`);
});

// Public, non-sensitive info the landing page needs (WA deep-link + aggregates).
app.get('/public.json', async (_req, res) => {
  const num = config.publicWaNumber;
  const msg = encodeURIComponent(config.publicWaMessage);
  res.json({
    waNumber: num || null,
    waLink: num ? `https://wa.me/${num}?text=${msg}` : null,
    stats: await analytics.publicStats(),
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

app.get('/admin/api', requireAdmin, async (_req, res) => {
  try {
    res.json({
      summary: await analytics.summary(),
      lessons: await analytics.lessonBreakdown(),
      learners: await analytics.learners(),
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
      const result = await runtime.processMessage(m.from, input);
      await wa.sendTurn(m.from, result.messages, result.actions, result.actionStyle);
    } catch (err) {
      // Log the offending input, and never leave the user in silence — send a
      // recoverable fallback so the conversation can continue.
      console.error(`Error handling message from ${m.from} (input: ${JSON.stringify(m.text)}):`, err);
      await wa
        .sendText(m.from, '⚠️ Something went wrong on our side. Please reply MENU to continue.')
        .catch(() => {});
    }
  }
});

// Initialise the storage backend (creates the Postgres schema/connection; a
// no-op for SQLite) BEFORE we start accepting requests, then listen.
db.init()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`🤖 Zega Digital bot listening on :${config.port} (db: ${(process.env.DB_BACKEND || 'sqlite').toLowerCase()})`);
      if (!config.whatsapp.isConfigured) {
        console.log('⚠️  WhatsApp Cloud API not configured (WHATSAPP_TOKEN / PHONE_NUMBER_ID).');
        console.log('   The webhook will still verify; run `npm run cli` to test the flow locally.');
      }
      if (config.runScheduler) startScheduler();
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialise the database backend:', err);
    process.exit(1);
  });

module.exports = app;
