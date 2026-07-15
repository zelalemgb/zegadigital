'use strict';

/**
 * Lesson cards — render a lesson "page" as a branded image card (sharp) so the
 * bot can present content as clean graphics instead of stacked chat text.
 *
 * Server-side rendering has no colour-emoji font, so cleanText() strips emoji
 * and turns emoji-led list items into "•" bullets (text arrows "→" are kept).
 * Card height grows to fit the content. Reused by the /card preview route.
 */

const sharp = require('sharp');
const curriculum = require('./curriculum');
const { stripEmoji } = require('./util/text');

// Latin from DejaVu Sans, Ethiopic (Amharic / Afaan Oromo) from Noto Sans
// Ethiopic — both bundled under assets/fonts and wired via FONTCONFIG_FILE so
// cards render identically on Render's Linux box (see src/util/fonts.js).
const SANS = "'DejaVu Sans', 'Noto Sans Ethiopic', sans-serif";
const EMOJI = /[\p{Extended_Pictographic}‍️]/gu;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Emoji → bullets; drop bold markers; keep "→" arrows and real text.
function cleanText(text) {
  return String(text || '')
    .replace(/\*/g, '')
    .split('\n')
    .map((line) => {
      const startedWithEmoji = /^\s*\p{Extended_Pictographic}/u.test(line);
      const stripped = line.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
      // Short emoji-led lines become bullets — but headings/questions (ending
      // in ":" or "?", e.g. "💡 Did You Know?") read wrong with a bullet, so
      // keep those as plain lines.
      if (startedWithEmoji && stripped && stripped.length < 46 && !/[:?]$/.test(stripped)) {
        return `•  ${stripped}`;
      }
      return stripped;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Ethiopic script (Amharic) — its glyphs are noticeably wider than Latin.
const ETHIOPIC = /[ሀ-፿ᎀ-᎟ⶀ-⷟]/;

// Greedy word-wrap to a character budget per line, preserving blank lines.
// Ethiopic lines pack fewer characters so Amharic text doesn't overflow the
// card edge (Afaan Oromo is written in Latin, so it keeps the full budget).
function wrap(text, maxChars) {
  const out = [];
  for (const para of String(text).split('\n')) {
    if (para.trim() === '') { out.push(''); continue; }
    const budget = ETHIOPIC.test(para) ? Math.round(maxChars * 0.66) : maxChars;
    let line = '';
    for (const word of para.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > budget) {
        if (line) out.push(line);
        line = word;
      } else line = (line ? line + ' ' : '') + word;
    }
    out.push(line);
  }
  return out;
}
const tspans = (lines, x, y, lh, attrs) =>
  lines.map((l, i) => (l ? `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(l)}</text>` : '')).join('');

// ── Content icons ────────────────────────────────────────────────────────────
// Instead of a fixed logo, each card shows an icon matched to its content. The
// lesson text leads with a topic emoji (💡 🔒 📱 …) which we map to one of these
// hand-drawn white glyphs (centered on 0,0, ~±16 units), shown in a blue badge.
const IST = 'fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const IFL = 'fill="#ffffff"';
const ICONS = {
  idea: `<g ${IST}><circle cx="0" cy="-3" r="12"/><path d="M-5 11 H5 M-4 16 H4 M-3 20 H3"/></g>`,
  lock: `<g ${IST}><rect x="-11" y="-1" width="22" height="17" rx="3"/><path d="M-7 -1 V-8 a7 7 0 0 1 14 0 V-1"/></g><circle cx="0" cy="7.5" r="2.3" ${IFL}/>`,
  shield: `<g ${IST}><path d="M0 -16 L13 -11 V2 Q13 12 0 17 Q-13 12 -13 2 V-11 Z"/><path d="M-5 0 L-1 5 L7 -5"/></g>`,
  check: `<g ${IST}><circle cx="0" cy="0" r="15"/><path d="M-6 0 L-1 6 L8 -6"/></g>`,
  warning: `<g ${IST}><path d="M0 -15 L15 12 H-15 Z"/><path d="M0 -6 V3"/></g><circle cx="0" cy="8" r="1.8" ${IFL}/>`,
  phone: `<g ${IST}><rect x="-9" y="-15" width="18" height="30" rx="3"/></g><circle cx="0" cy="10" r="1.8" ${IFL}/>`,
  chat: `<g ${IST}><path d="M-14 -10 H14 V5 H1 L-5 12 V5 H-14 Z"/></g>`,
  globe: `<g ${IST}><circle cx="0" cy="0" r="14"/><path d="M-14 0 H14"/><ellipse cx="0" cy="0" rx="6" ry="14"/></g>`,
  robot: `<g ${IST}><rect x="-12" y="-8" width="24" height="20" rx="4"/><path d="M0 -8 V-14"/></g><circle cx="0" cy="-16" r="2.2" ${IFL}/><circle cx="-5" cy="1" r="2.2" ${IFL}/><circle cx="5" cy="1" r="2.2" ${IFL}/>`,
  gear: `<g ${IST}><circle cx="0" cy="0" r="6"/><path d="M0 -14 V-9 M0 9 V14 M-14 0 H-9 M9 0 H14 M-10 -10 l3.4 3.4 M10 10 l-3.4 -3.4 M10 -10 l-3.4 3.4 M-10 10 l3.4 -3.4"/></g>`,
  book: `<g ${IST}><path d="M0 -12 V11"/><path d="M0 -12 Q-8 -15 -14 -12 V11 Q-8 8 0 11"/><path d="M0 -12 Q8 -15 14 -12 V11 Q8 8 0 11"/></g>`,
  chart: `<g ${IST}><path d="M-13 13 H13"/><path d="M-8 13 V1 M0 13 V-7 M8 13 V-3"/></g>`,
  people: `<g ${IST}><circle cx="-6" cy="-6" r="5"/><path d="M-14 11 q1 -8 8 -8 q3 0 5 2"/><circle cx="7" cy="-4" r="4.5"/><path d="M0 11 q1 -7 7 -7 q7 0 7 7"/></g>`,
  target: `<g ${IST}><circle cx="0" cy="0" r="14"/><circle cx="0" cy="0" r="8"/></g><circle cx="0" cy="0" r="2.4" ${IFL}/>`,
  search: `<g ${IST}><circle cx="-3" cy="-3" r="9"/><path d="M4 4 L13 13"/></g>`,
  heart: `<path d="M0 12 C-15 1 -11 -12 0 -5 C11 -12 15 1 0 12 Z" ${IFL}/>`,
  camera: `<g ${IST}><rect x="-13" y="-7" width="26" height="17" rx="3"/><circle cx="0" cy="1.5" r="5"/><path d="M-5 -7 l2.5 -4 h5 l2.5 4"/></g>`,
  sparkle: `<path d="M0 -13 L3 -3 L13 0 L3 3 L0 13 L-3 3 L-13 0 L-3 -3 Z" ${IFL}/>`,
};
const ICON_FOR = {
  '💡': 'idea', '💭': 'idea', '🤔': 'idea', '🧠': 'idea', '❓': 'idea', '❔': 'idea', 'ℹ': 'idea',
  '🔒': 'lock', '🔐': 'lock', '🔑': 'lock', '🪪': 'lock', '🔓': 'lock',
  '🛡': 'shield',
  '✅': 'check', '☑': 'check', '✔': 'check', '👍': 'check', '🆗': 'check', '✍': 'book',
  '⚠': 'warning', '🚫': 'warning', '❌': 'warning', '🚩': 'warning', '🚨': 'warning', '🔥': 'warning', '⛔': 'warning', '‼': 'warning',
  '📱': 'phone', '📲': 'phone', '📶': 'phone', '💻': 'phone', '🖥': 'phone', '⌨': 'phone',
  '💬': 'chat', '📢': 'chat', '📣': 'chat', '📞': 'chat', '☎': 'chat', '📧': 'chat', '✉': 'chat', '📨': 'chat', '📩': 'chat', '📜': 'book',
  '🌍': 'globe', '🌐': 'globe', '🌎': 'globe', '🌏': 'globe',
  '🤖': 'robot',
  '⚙': 'gear', '🛠': 'gear', '🧰': 'gear', '🎛': 'gear', '🔧': 'gear', '🔨': 'gear',
  '📚': 'book', '📖': 'book', '📝': 'book', '📄': 'book', '📃': 'book', '🏫': 'book',
  '📊': 'chart', '📈': 'chart', '📉': 'chart',
  '🤝': 'people', '👥': 'people', '👨': 'people', '👩': 'people', '👧': 'people', '👦': 'people', '👣': 'people', '🦸': 'people', '🧑': 'people', '👤': 'people',
  '🎯': 'target', '🚦': 'target', '🏁': 'target',
  '🔎': 'search', '🔍': 'search', '👀': 'search', '👁': 'search',
  '❤': 'heart', '💚': 'heart', '💙': 'heart', '🧡': 'heart', '💛': 'heart', '💜': 'heart',
  '📸': 'camera', '📷': 'camera', '🪞': 'camera',
  '🎨': 'sparkle', '🎵': 'sparkle', '🎶': 'sparkle', '✨': 'sparkle', '⚡': 'sparkle', '😀': 'sparkle',
};

// Pick a content icon from the leading emoji of a lesson message (default: idea).
function iconCategory(text) {
  const firstLine = String(text || '').split('\n').find((l) => l.trim()) || '';
  for (const ch of firstLine) {
    if (/\p{Extended_Pictographic}/u.test(ch)) {
      const base = ch.replace(/️/g, '');
      return ICON_FOR[ch] || ICON_FOR[base] || 'idea';
    }
  }
  return 'idea';
}

function cardSvg(data) {
  // Typography is sized RELATIVE to the 1080px canvas. WhatsApp scales the card
  // down to the chat-bubble width, so the body needs to be ~50px here to render
  // near WhatsApp's native ~16px text on a phone (37px looked tiny).
  const W = 1080;
  const titleLines = wrap(data.title, 17);
  const titleY = 336;
  const titleLH = 82;
  const accentY = titleY + (titleLines.length - 1) * titleLH + 34;
  const bodyLines = wrap(data.body, 33);
  const bodyY = accentY + 92;
  const bodyLH = 70;
  const bodyBottom = bodyY + Math.max(0, bodyLines.length - 1) * bodyLH;

  let tip = '';
  let contentBottom = bodyBottom;
  if (data.tip) {
    const tipLines = wrap(data.tip, 34);
    const tipTop = bodyBottom + 70;
    const tipH = tipLines.length * 62 + 116;
    tip = `<rect x="60" y="${tipTop}" width="960" height="${tipH}" rx="24" fill="#eaf0fb" stroke="#cdddf5" stroke-width="2"/>
      <text x="100" y="${tipTop + 64}" font-family="${SANS}" font-size="30" font-weight="800" letter-spacing="1" fill="#345aa0">KEY TAKEAWAY</text>
      ${tspans(tipLines, 100, tipTop + 128, 62, `font-family="${SANS}" font-size="44" fill="#1f3b66"`)}`;
    contentBottom = tipTop + tipH;
  }

  const H = Math.max(900, contentBottom + 150);
  const footY = H - 78;
  const dots = Array.from({ length: data.total }, (_, i) =>
    `<circle cx="${470 + i * 42}" cy="${footY - 10}" r="11" fill="${i === data.page - 1 ? '#ce3b37' : '#cdd8ea'}"/>`).join('');

  const moduleLines = wrap(String(data.module).toUpperCase(), 26).slice(0, 2);
  const moduleY = moduleLines.length > 1 ? 128 : 150;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f4f7fb"/>
  <!-- content icon badge (no logo): the glyph matches what this card is about -->
  <circle cx="132" cy="132" r="62" fill="#345aa0"/>
  <g transform="translate(132,132) scale(2.05)">${ICONS[data.icon] || ICONS.idea}</g>
  ${tspans(moduleLines, 230, moduleY, 42, `font-family="${SANS}" font-size="32" font-weight="800" letter-spacing="1.5" fill="#345aa0"`)}
  <line x1="72" y1="224" x2="1008" y2="224" stroke="#e2e8f2" stroke-width="2"/>
  ${tspans(titleLines, 72, titleY, titleLH, `font-family="${SANS}" font-size="64" font-weight="800" fill="#12203b"`)}
  <rect x="76" y="${accentY}" width="140" height="10" rx="5" fill="#ce3b37"/>
  ${tspans(bodyLines, 72, bodyY, bodyLH, `font-family="${SANS}" font-size="50" fill="#25324a"`)}
  ${tip}
  <text x="72" y="${footY}" font-family="${SANS}" font-size="32" font-weight="700" fill="#8a94a8">Zega Digital</text>
  ${dots}
  <text x="1008" y="${footY}" text-anchor="end" font-family="${SANS}" font-size="32" fill="#8a94a8">${data.page} / ${data.total}</text>
</svg>`;
}

async function renderCardPng(data) {
  return sharp(Buffer.from(cardSvg(data))).png().toBuffer();
}

// Production media format: JPEG scaled to 820px wide. WhatsApp re-compresses
// images anyway, so this ~halves the bytes over a full-res PNG (~50–65 KB vs
// ~120 KB) — a real saving for data-conscious learners in Ethiopia.
async function renderCardJpg(data) {
  return sharp(Buffer.from(cardSvg(data)))
    .resize({ width: 820 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

/** Build the ordered card data for a lesson: one card per message page. */
function lessonCards(content, lessonId) {
  const node = content.nodes[lessonId];
  if (!node || !node.messages) return [];
  const track = lessonId.split('.')[0];
  const mod = curriculum.moduleOf(content, track, lessonId);
  const check = content.checks && content.checks[lessonId];
  const total = node.messages.length;
  // The lesson's own `title` isn't translated in the am/om packs, but its label
  // in the (translated) module menu is — use that so cards read in-language.
  const title = stripEmoji(curriculum.lessonLabel(content, lessonId)).trim();
  return node.messages.map((m, i) => {
    const raw = typeof m === 'string' ? m : m.text || '';
    return {
      module: mod ? stripEmoji(mod.label).trim() : '',
      title,
      body: cleanText(raw),
      icon: iconCategory(raw), // content-matched glyph for the header badge
      page: i + 1,
      total,
      tip: i === total - 1 && check ? cleanText(check.reinforce) : null,
    };
  });
}

module.exports = { cleanText, cardSvg, renderCardPng, renderCardJpg, lessonCards };
