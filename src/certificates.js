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

const SERIF = "'DejaVu Serif', Georgia, 'Times New Roman', serif";
const SANS = "'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif";

function certificateSvg(cert, host) {
  const name = esc((cert.name || 'Learner').slice(0, 48));
  const track = esc(trackLabel(cert.track));
  const date = esc(formatDate(cert.issued_at));
  const code = esc(cert.code);
  const verify = host ? `${host.replace(/\/$/, '')}/verify/${code}` : `verify/${code}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
  <rect width="1200" height="850" fill="#ffffff"/>
  <rect x="26" y="26" width="1148" height="798" rx="16" fill="#f8fafd" stroke="#345aa0" stroke-width="9"/>
  <rect x="46" y="46" width="1108" height="758" rx="8" fill="none" stroke="#ce3b37" stroke-width="2.5"/>

  <!-- brand mark: white phone in a blue rounded tile -->
  <g transform="translate(540,86)">
    <rect x="0" y="0" width="120" height="120" rx="28" fill="#345aa0"/>
    <rect x="42" y="24" width="36" height="72" rx="9" fill="none" stroke="#ffffff" stroke-width="6"/>
    <rect x="54" y="30" width="12" height="4" rx="2" fill="#ffffff"/>
    <circle cx="60" cy="88" r="4.5" fill="#ffffff"/>
  </g>
  <text x="600" y="242" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="6" fill="#345aa0">ZEGA</text>
  <text x="600" y="270" text-anchor="middle" font-family="${SANS}" font-size="15" letter-spacing="2" fill="#5c6b86">MY DIGITAL WORLD ETHIOPIA</text>

  <text x="600" y="338" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="7" fill="#ce3b37">CERTIFICATE OF COMPLETION</text>
  <text x="600" y="392" text-anchor="middle" font-family="${SERIF}" font-size="20" fill="#5c6b86" font-style="italic">This certifies that</text>

  <text x="600" y="470" text-anchor="middle" font-family="${SERIF}" font-size="62" font-weight="700" fill="#12203b">${name}</text>
  <line x1="360" y1="496" x2="840" y2="496" stroke="#d5dbe8" stroke-width="2"/>

  <text x="600" y="548" text-anchor="middle" font-family="${SANS}" font-size="22" fill="#3a4763">has successfully completed the ${track} Digital Literacy program</text>
  <text x="600" y="582" text-anchor="middle" font-family="${SANS}" font-size="22" fill="#3a4763">and passed the final assessment.</text>

  <!-- gold seal -->
  <g transform="translate(600,676)">
    <path d="M-14 6 L-22 44 L0 33 L22 44 L14 6 Z" fill="#d99a1c"/>
    <circle cx="0" cy="0" r="34" fill="#f5b731"/>
    <circle cx="0" cy="0" r="34" fill="none" stroke="#c9860f" stroke-width="2"/>
    <circle cx="0" cy="0" r="25" fill="none" stroke="#fff3d6" stroke-width="2"/>
    <path d="M0 -17 l5 10 11 1.6 -8 7.6 2 11 -10 -5.6 -10 5.6 2 -11 -8 -7.6 11 -1.6 Z" fill="#ffffff"/>
  </g>

  <text x="230" y="756" text-anchor="middle" font-family="${SANS}" font-size="18" font-weight="700" fill="#12203b">OMNI Ethiopia &amp; Meta</text>
  <text x="230" y="780" text-anchor="middle" font-family="${SANS}" font-size="14" fill="#5c6b86">Issuing partners</text>

  <text x="970" y="756" text-anchor="middle" font-family="${SANS}" font-size="18" font-weight="700" fill="#12203b">${date}</text>
  <text x="970" y="780" text-anchor="middle" font-family="${SANS}" font-size="14" fill="#5c6b86">Date issued</text>

  <text x="600" y="800" text-anchor="middle" font-family="${SANS}" font-size="13" fill="#8a94a8">Certificate ${code} · verify at ${esc(verify)}</text>
</svg>`;
}

async function renderPng(cert, host) {
  return sharp(Buffer.from(certificateSvg(cert, host))).png().toBuffer();
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

module.exports = { generateCode, trackLabel, formatDate, certificateSvg, renderPng, verifyHtml };
