#!/usr/bin/env node
'use strict';

/**
 * Local browser-based tester for the Zega Digital bot.
 *
 *   npm run tester      (then open http://localhost:3100)
 *
 * Drives the SAME runtime (engine + gamification + durable SQLite profile) the
 * real webhook uses. No Meta credentials needed. The browser sends a stable
 * userId so XP, streaks and badges persist across reloads.
 */

const path = require('path');
const express = require('express');
const runtime = require('../src/runtime');
const analytics = require('../src/analytics');

const PORT = process.env.TESTER_PORT || 3100;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// `today` lets the tester simulate streaks across days (optional query/body).
function optsFrom(req) {
  const today = req.body && req.body.today;
  return today ? { today } : {};
}

app.post('/api/start', async (req, res) => {
  const id = req.body.userId || 'web';
  const r = await runtime.startConversation(id, optsFrom(req));
  res.json(r);
});

app.post('/api/message', async (req, res) => {
  const id = req.body.userId || 'web';
  const text = req.body.text == null ? '' : String(req.body.text);
  const r = await runtime.processMessage(id, text, optsFrom(req));
  res.json(r);
});

// Demo the proactive nudge a user would receive (ignores "is it due?" so you can
// preview it on demand). In production the scheduler decides timing.
app.post('/api/nudge', async (req, res) => {
  const id = req.body.userId || 'web';
  const nudge = await runtime.buildNudgeForUser(id, req.body.type);
  res.json(nudge || { message: 'Pick a track first, then I can nudge you about your next lesson.' });
});

// Program KPI dashboard (dev): JSON + a simple HTML page.
app.get('/api/metrics', (_req, res) => res.json(analytics.summary()));

app.listen(PORT, () => {
  console.log(`🧪 Zega tester:     http://localhost:${PORT}`);
  console.log(`📊 KPI dashboard:   http://localhost:${PORT}/dashboard.html`);
});
