'use strict';

/**
 * Certificate of Completion — code generation, a branded SVG→PNG certificate,
 * and the public verification page.
 *
 * A learner earns one per track after finishing every lesson AND passing the
 * track quiz. The PNG is rendered on demand from the stored row (name, track,
 * date, code) so nothing is cached on disk. Fonts use a Linux-safe stack
 * (DejaVu / generics) because rendering happens on the server, not a Mac.
 */

const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');


// Crockford-ish alphabet — no 0/O/1/I/L to keep codes easy to read aloud.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateCode() {
  const bytes = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `ZEGA-${s}`;
}

function trackLabel(track) {
  return track === 'adult' ? 'Adult (18+)' : 'Youth (13–17)';
}

function formatDate(issuedAt) {
  // issued_at is 'YYYY-MM-DD HH:MM:SS' (UTC). Show a clean 'D Month YYYY'.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(issuedAt || ''));
  if (!m) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Latin from DejaVu Sans, Amharic names from Noto Sans Ethiopic (bundled via
// FONTCONFIG_FILE — see src/util/fonts.js), so names print on Render's Linux box.
const SANS = "'DejaVu Sans', 'Noto Sans Ethiopic', sans-serif";

// The client's three certificate templates (1280×904) and where the dynamic
// text sits on each: [centerX, baseline] for the learner name, the date, and
// the small verify line. English uses the wave footer; am/om use the
// diagonal-corner layout (Date signature further right, verify line on white).
const TEMPLATE_DIR = path.join(__dirname, '..', 'public', 'img', 'cert');
const TEMPLATES = {
  en: { file: 'cirt_English.jpeg', name: [652, 415], date: [880, 760] },
  am: { file: 'cirt_Amharic.jpeg', name: [648, 415], date: [950, 745] },
  om: { file: 'cirt_Oromiffa.jpeg', name: [648, 415], date: [950, 745] },
};

// A transparent overlay with the learner name, the date, and a small verify-ID
// chip. The chip sits in a light pill so it reads on any template background
// (the English wave shifts from blue to white across the bottom). The full
// clickable verify URL is sent separately in the WhatsApp message.
function overlaySvg(cert, tpl) {
  const name = esc((cert.name || 'Learner').slice(0, 42));
  const date = esc(formatDate(cert.issued_at));
  const code = esc(cert.code);
  const [nx, ny] = tpl.name;
  const [dx, dy] = tpl.date;
  const label = `Certificate ID: ${code}`;
  const pw = Math.round(label.length * 9.2 + 30);
  const px = 1250 - pw;
  const py = 862;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="904">
  <text x="${nx}" y="${ny}" text-anchor="middle" font-family="${SANS}" font-size="50" font-weight="700" fill="#1a2b5c">${name}</text>
  <text x="${dx}" y="${dy}" text-anchor="middle" font-family="${SANS}" font-size="30" fill="#33415c">${date}</text>
  <rect x="${px}" y="${py}" width="${pw}" height="30" rx="8" fill="#ffffff" opacity="0.88"/>
  <rect x="${px}" y="${py}" width="${pw}" height="30" rx="8" fill="none" stroke="#c9d3e5" stroke-width="1"/>
  <text x="${px + pw / 2}" y="${py + 21}" text-anchor="middle" font-family="${SANS}" font-size="16" fill="#33415c">${label}</text>
</svg>`;
}

async function renderPng(cert) {
  const tpl = TEMPLATES[cert && cert.lang] || TEMPLATES.en;
  const template = path.join(TEMPLATE_DIR, tpl.file);
  const overlay = Buffer.from(overlaySvg(cert, tpl));
  return sharp(template).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}

function verifyHtml(cert, host) {
  const valid = Boolean(cert);
  const name = cert ? esc(cert.name || 'Learner') : '';
  const track = cert ? esc(trackLabel(cert.track)) : '';
  const date = cert ? esc(formatDate(cert.issued_at)) : '';
  const code = cert ? esc(cert.code) : '';
  const body = valid
    ? `<div class="badge ok">✓ Valid certificate</div>
       <h1>${name}</h1>
       <p class="sub">completed the <b>${track} Digital Literacy program</b> and passed the final assessment.</p>
       <div class="meta"><span>Issued by OMNI Ethiopia &amp; Meta</span><span>${date}</span></div>
       <img class="cert" src="${host.replace(/\/$/, '')}/cert/${code}.png" alt="Certificate for ${name}" />
       <p class="code">Certificate ${code}</p>`
    : `<div class="badge bad">✕ Not found</div>
       <h1>Certificate not recognised</h1>
       <p class="sub">We couldn't find a certificate with that code. Check the code and try again.</p>`;
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Verify certificate — Zega Digital</title>
<style>
  :root{--brand:#345aa0;--ink:#12203b;--muted:#5c6b86}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    background:radial-gradient(120% 120% at 80% -10%,#4a6fc0,#345aa0 45%,#1c3660);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink)}
  .card{background:#fff;max-width:560px;width:100%;border-radius:20px;padding:32px 30px;text-align:center;
    box-shadow:0 30px 70px rgba(19,15,60,.4)}
  .badge{display:inline-block;font-weight:700;font-size:13px;letter-spacing:.03em;padding:6px 14px;border-radius:20px;margin-bottom:14px}
  .ok{background:#e7f4ec;color:#1f8f57;border:1px solid #c6e6d2}
  .bad{background:#fdecec;color:#c0392b;border:1px solid #f3cfcd}
  h1{margin:6px 0 10px;font-size:26px;letter-spacing:-0.02em}
  .sub{margin:0 0 18px;color:var(--muted)}
  .meta{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:14px;margin-bottom:18px}
  .cert{width:100%;height:auto;border:1px solid #e4e8f1;border-radius:12px}
  .code{margin-top:14px;color:#8a94a8;font-size:13px;font-variant-numeric:tabular-nums}
  a.home{display:inline-block;margin-top:18px;color:var(--brand);text-decoration:none;font-size:14px}
</style></head><body>
  <div class="card">${body}<a class="home" href="/">← Zega Digital home</a></div>
</body></html>`;
}

module.exports = { generateCode, trackLabel, formatDate, renderPng, verifyHtml };
