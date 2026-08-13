'use strict';

/**
 * List the WhatsApp message templates registered on this account, with their
 * approval status — a read-only check (no sends, no writes). Uses the same
 * credentials the bot already uses; the token stays in the environment and is
 * never printed.
 *
 *   node scripts/list-templates.js
 *
 * Needs WHATSAPP_TOKEN (+ PHONE_NUMBER_ID, already set for the bot). The
 * WhatsApp Business Account (WABA) id is discovered from the token; set
 * WHATSAPP_WABA_ID to skip discovery if you have it.
 */

const config = require('../src/config');

const TOKEN = config.whatsapp.token;
const API = config.whatsapp.apiVersion || 'v21.0';
const PHONE_ID = config.whatsapp.phoneNumberId;

async function graph(path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error || body)}`);
  return body;
}

async function resolveWabaId() {
  if (process.env.WHATSAPP_WABA_ID) return process.env.WHATSAPP_WABA_ID;
  // The token's granted scopes carry the WABA id(s) it can manage.
  const dbg = await graph('debug_token', { input_token: TOKEN });
  const scopes = (dbg.data && dbg.data.granular_scopes) || [];
  for (const s of scopes) {
    if (/whatsapp_business_(management|messaging)/.test(s.scope) && (s.target_ids || []).length) {
      return s.target_ids[0];
    }
  }
  throw new Error('Could not discover the WABA id from the token — set WHATSAPP_WABA_ID.');
}

(async () => {
  if (!TOKEN) throw new Error('WHATSAPP_TOKEN is not set in this environment.');
  console.log(`Phone number id: ${PHONE_ID || '(unset)'}`);
  const waba = await resolveWabaId();
  console.log(`WABA id: ${waba}\n`);

  let after;
  const rows = [];
  do {
    const page = await graph(`${waba}/message_templates`, {
      fields: 'name,status,language,category',
      limit: '200',
      ...(after ? { after } : {}),
    });
    rows.push(...(page.data || []));
    after = page.paging && page.paging.cursors && page.paging.next ? page.paging.cursors.after : null;
  } while (after);

  if (!rows.length) {
    console.log('No message templates registered on this account yet.');
    return;
  }

  rows.sort((a, b) => a.name.localeCompare(b.name) || a.language.localeCompare(b.language));
  console.log(`${rows.length} template(s):\n`);
  for (const t of rows) {
    console.log(`  ${t.status.padEnd(10)} ${t.name}  [${t.language}]  (${t.category})`);
  }

  // Highlight the ones the stage-based nudge system needs.
  const needed = ['zega_almost_there', 'zega_quiz_left', 'zega_cert_ready', 'zega_reengagement'];
  console.log('\nNudge templates needed:');
  for (const name of needed) {
    const hits = rows.filter((r) => r.name === name);
    const status = hits.length ? hits.map((h) => `${h.language}:${h.status}`).join(', ') : 'MISSING';
    console.log(`  ${name.padEnd(20)} ${status}`);
  }
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
