'use strict';

/**
 * Express server exposing the Meta WhatsApp Cloud API webhook.
 *
 *   GET  /webhook  → verification handshake (Meta calls this once)
 *   POST /webhook  → inbound messages; we run the engine and reply
 *   GET  /health   → liveness probe
 *
 * Run locally, expose with a tunnel (e.g. ngrok), and register the public
 * https URL + VERIFY_TOKEN in the Meta App dashboard. See README for steps.
 */

const express = require('express');
const config = require('./config');
const runtime = require('./runtime');
const wa = require('./whatsapp/cloudApi');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, whatsappConfigured: config.whatsapp.isConfigured });
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

// ── Inbound messages (POST) ───────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
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

      // Non-text (image/audio/etc.): nudge the user back to the menu flow.
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
    console.log(
      '⚠️  WhatsApp Cloud API not configured (WHATSAPP_TOKEN / PHONE_NUMBER_ID).'
    );
    console.log('   The webhook will still verify; run `npm run cli` to test the flow locally.');
  }
});

module.exports = app;
