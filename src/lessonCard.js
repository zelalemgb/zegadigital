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

function cardSvg(data) {
  // Typography is sized RELATIVE to the 1080px canvas. WhatsApp scales the card
  // down to the chat-bubble width, so the body needs to be ~50px here to render
  // near WhatsApp's native ~16px text on a phone (37px looked tiny).
  const W = 1080;
  const titleLines = wrap(data.title, 17);
  const titleY = 452;
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

  const H = Math.max(1080, contentBottom + 150);
  const footY = H - 78;
  const dots = Array.from({ length: data.total }, (_, i) =>
    `<circle cx="${470 + i * 42}" cy="${footY - 10}" r="11" fill="${i === data.page - 1 ? '#ce3b37' : '#cdd8ea'}"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f4f7fb"/>
  <path d="M0 0 H1080 V300 Q1080 340 1040 340 H40 Q0 340 0 300 Z" fill="#345aa0"/>
  <rect x="72" y="70" width="70" height="120" rx="16" fill="none" stroke="#ffffff" stroke-width="8"/>
  <rect x="97" y="86" width="20" height="7" rx="3" fill="#ffffff"/>
  <circle cx="107" cy="172" r="8" fill="#ffffff"/>
  <text x="180" y="124" font-family="${SANS}" font-size="38" font-weight="800" letter-spacing="6" fill="#ffffff">ZEGA</text>
  <text x="180" y="166" font-family="${SANS}" font-size="26" letter-spacing="3" fill="#cfe0ff">${esc(String(data.module).toUpperCase())}</text>
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
  return node.messages.map((m, i) => ({
    module: mod ? stripEmoji(mod.label).trim() : '',
    title,
    body: cleanText(typeof m === 'string' ? m : m.text || ''),
    page: i + 1,
    total,
    tip: i === total - 1 && check ? cleanText(check.reinforce) : null,
  }));
}

module.exports = { cleanText, cardSvg, renderCardPng, renderCardJpg, lessonCards };
