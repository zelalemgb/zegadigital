'use strict';

/**
 * Minimal Meta WhatsApp Cloud API client.
 *
 * Uses the global `fetch` (Node 18+). Only the pieces this bot needs:
 *   - sendText(to, body)         → send a single text message
 *   - sendTexts(to, bodies)      → send several bubbles in order
 *   - markRead(messageId)        → show the blue ticks (optional, best-effort)
 *
 * Parsing of inbound webhook payloads lives in parseInbound() so the server
 * stays small.
 */

const config = require('../config');
const { stripEmoji } = require('../util/text');

function apiUrl(path) {
  const { apiVersion, phoneNumberId } = config.whatsapp;
  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/${path}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST to the Graph API with retry/backoff on transient failures (network
 * errors, 429 rate-limits and 5xx). This is what keeps the bot responsive when
 * a user taps quickly: a single hiccup no longer drops the reply.
 */
async function post(path, payload, attempt = 0) {
  if (!config.whatsapp.isConfigured) {
    throw new Error(
      'WhatsApp Cloud API is not configured. Set WHATSAPP_TOKEN and PHONE_NUMBER_ID in .env'
    );
  }
  const MAX = 3;
  const backoff = () => 400 * 2 ** attempt; // 400ms, 800ms, 1600ms

  let res;
  try {
    res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsapp.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    if (attempt < MAX) {
      await sleep(backoff());
      return post(path, payload, attempt + 1);
    }
    throw netErr;
  }

  if (!res.ok) {
    if ((res.status === 429 || res.status >= 500) && attempt < MAX) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
      await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : backoff());
      return post(path, payload, attempt + 1);
    }
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
  return res.json();
}

async function sendText(to, body) {
  return post('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
}

/** Send several message bubbles in order, one after another. */
async function sendTexts(to, bodies) {
  for (const body of bodies) {
    // eslint-disable-next-line no-await-in-loop
    await sendText(to, body);
  }
}

/**
 * Send an approved message template (the ONLY way to message a user outside the
 * 24-hour customer-service window). `params` fill the body's {{1}}, {{2}}… and,
 * for a quick-reply button template, the button payload.
 *
 * See docs/whatsapp-templates.md for the templates to register in Meta and the
 * exact component shapes. This builds a body-variable + quick-reply payload.
 */
async function sendTemplate(to, name, languageCode, bodyParams = [], buttonPayload) {
  const components = [];
  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })),
    });
  }
  if (buttonPayload) {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: '0',
      parameters: [{ type: 'payload', payload: buttonPayload }],
    });
  }
  return post('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name,
      language: { code: languageCode || 'en' },
      ...(components.length ? { components } : {}),
    },
  });
}

async function sendImage(to, link, caption) {
  return post('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { link, ...(caption ? { caption } : {}) },
  });
}

/**
 * Send an interactive message with up to 3 reply buttons (in-session only).
 * `buttons` = [{ id, title }]. Titles are capped at 20 chars by WhatsApp.
 * Optional `headerImageLink` shows an image above the body.
 */
async function sendButtons(to, body, buttons, headerImageLink) {
  const interactive = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: 'reply',
        reply: { id: String(b.id).slice(0, 256), title: b.title.slice(0, 20) },
      })),
    },
  };
  if (headerImageLink) interactive.header = { type: 'image', image: { link: headerImageLink } };
  return post('messages', { messaging_product: 'whatsapp', to, type: 'interactive', interactive });
}

/**
 * Send an interactive list message (in-session only). `rows` = [{ id, title,
 * description? }], up to 10. `buttonText` labels the menu opener.
 */
async function sendList(to, body, buttonText, rows) {
  return post('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: [
          {
            rows: rows.slice(0, 10).map((r) => ({
              id: String(r.id).slice(0, 200),
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}

function mediaUrl(image) {
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  // SVG (and any path) only works once hosted somewhere WhatsApp can fetch it.
  if (!config.mediaBaseUrl || image.endsWith('.svg')) return null;
  return config.mediaBaseUrl.replace(/\/$/, '') + image;
}

/**
 * Send a full engine turn: a list of rich bubbles { text, image? } plus the
 * turn's quick-reply `actions`. Text/image bubbles go first; the last bubble
 * carries the buttons (≤3) or, for `actionStyle === 'list'`, a list message.
 */
async function sendTurn(to, messages, actions = [], actionStyle = 'buttons') {
  const msgs = messages || [];
  // WhatsApp can't render custom icons inline; send clean, emoji-free text.
  const btns = actions.map((a) => ({ id: a.value, title: stripEmoji(a.label) || a.label }));
  // Reply buttons are only used for short "flow" screens (≤3 clear next-steps).
  // Menu screens (more options) rely on the numbered text — sending a separate
  // WhatsApp list message duplicates the menu and renders poorly, so we don't.
  const showButtons = actions.length >= 1 && actions.length <= 3 && actionStyle !== 'list';
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const text = stripEmoji(typeof m === 'string' ? m : m.text || '');
    const link = mediaUrl(m && m.image);
    const list = m && m.list; // structured menu/quiz → tappable list picker
    const isLast = i === msgs.length - 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      if (isLast && actionStyle === 'list' && list && list.rows && list.rows.length) {
        await sendList(to, stripEmoji(list.body) || text, list.button, list.rows);
      } else if (isLast && showButtons) {
        await sendButtons(to, text, btns, link);
      } else if (link) {
        await sendImage(to, link, text);
      } else if (text) {
        await sendText(to, text);
      }
    } catch (err) {
      // One bubble failing shouldn't drop the rest of the reply.
      console.error(`sendTurn: bubble ${i + 1}/${msgs.length} failed — continuing:`, err.message);
    }
  }
}

async function markRead(messageId) {
  return post('messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }).catch(() => {}); // best-effort; never block the reply on this
}

/**
 * Extract the inbound text messages from a webhook POST body.
 * Returns an array of { from, id, text } (usually 0 or 1 items).
 * Non-text messages (images, etc.) come back with text === null.
 */
function parseInbound(body) {
  const out = [];
  const entries = body && body.entry ? body.entry : [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        let text = null;
        if (message.type === 'text' && message.text) {
          text = message.text.body;
        } else if (message.type === 'interactive' && message.interactive) {
          // Support quick-reply buttons / list replies if you add them later.
          const i = message.interactive;
          text =
            (i.button_reply && (i.button_reply.id || i.button_reply.title)) ||
            (i.list_reply && (i.list_reply.id || i.list_reply.title)) ||
            null;
        } else if (message.type === 'button' && message.button) {
          text = message.button.text;
        }
        out.push({ from: message.from, id: message.id, text, type: message.type });
      }
    }
  }
  return out;
}

module.exports = {
  sendText,
  sendTexts,
  sendImage,
  sendTemplate,
  sendButtons,
  sendList,
  sendTurn,
  markRead,
  parseInbound,
};
