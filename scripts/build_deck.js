'use strict';

const GLOBAL = '/opt/homebrew/lib/node_modules';
const path = require('path');
const req = (m) => require(path.join(GLOBAL, m));

const pptxgen = req('pptxgenjs');
const React = req('react');
const ReactDOMServer = req('react-dom/server');
const sharp = req('sharp');
const FA = req('react-icons/fa');

// ── Palette ──────────────────────────────────────────────────────────────
const C = {
  dark: '0A2E2A',      // deep forest-teal (title / closing)
  primary: '0B6E4F',   // teal-green
  primaryLt: '149A6E',
  accent: 'F2A900',    // warm amber
  light: 'F4F7F5',     // off-white content bg
  card: 'FFFFFF',
  text: '15211E',
  muted: '6B7C77',
  ice: 'CFE8DD',
  white: 'FFFFFF',
};

const HEAD = 'Georgia';
const BODY = 'Calibri';

// ── Icon helper ────────────────────────────────────────────────────────────
async function icon(Comp, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color, size: String(size) })
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + png.toString('base64');
}

const shadow = () => ({ type: 'outer', color: '000000', blur: 7, offset: 3, angle: 135, opacity: 0.12 });

async function main() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
  pres.author = 'Zega Digital';
  pres.title = 'Zega Digital WhatsApp Bot';
  const W = 13.33, H = 7.5;

  // Pre-render icons
  const I = {
    whatsapp: await icon(FA.FaWhatsapp, '#' + C.primary),
    whatsappW: await icon(FA.FaWhatsapp, '#FFFFFF'),
    bolt: await icon(FA.FaBolt, '#' + C.accent),
    cubes: await icon(FA.FaCubes, '#' + C.primary),
    server: await icon(FA.FaServer, '#' + C.primary),
    trophy: await icon(FA.FaTrophy, '#' + C.accent),
    bell: await icon(FA.FaBell, '#' + C.accent),
    route: await icon(FA.FaRoute, '#' + C.primary),
    flag: await icon(FA.FaFlagCheckered, '#' + C.accent),
    users: await icon(FA.FaUsers, '#FFFFFF'),
    user: await icon(FA.FaUserGraduate, '#FFFFFF'),
    book: await icon(FA.FaBookOpen, '#FFFFFF'),
    bookG: await icon(FA.FaBookOpen, '#' + C.primary),
    userG: await icon(FA.FaUserGraduate, '#' + C.primary),
    usersG: await icon(FA.FaUsers, '#' + C.dark),
    medal: await icon(FA.FaMedal, '#FFFFFF'),
    star: await icon(FA.FaStar, '#FFFFFF'),
    fire: await icon(FA.FaFire, '#FFFFFF'),
    chart: await icon(FA.FaChartLine, '#FFFFFF'),
    cert: await icon(FA.FaCertificate, '#FFFFFF'),
    clock: await icon(FA.FaClock, '#FFFFFF'),
    paper: await icon(FA.FaPaperPlane, '#FFFFFF'),
    undo: await icon(FA.FaSyncAlt, '#FFFFFF'),
    gift: await icon(FA.FaGift, '#FFFFFF'),
    globe: await icon(FA.FaGlobeAfrica, '#FFFFFF'),
    code: await icon(FA.FaCode, '#' + C.primary),
    cloud: await icon(FA.FaCloud, '#' + C.primary),
    lang: await icon(FA.FaLanguage, '#' + C.primary),
    cog: await icon(FA.FaProjectDiagram, '#' + C.primary),
  };

  // ── helpers ────────────────────────────────────────────────────────────
  const iconCircle = (s, data, cx, cy, d, fill) => {
    s.addShape(pres.shapes.OVAL, { x: cx, y: cy, w: d, h: d, fill: { color: fill }, shadow: shadow() });
    const pad = d * 0.26;
    s.addImage({ data, x: cx + pad, y: cy + pad, w: d - 2 * pad, h: d - 2 * pad });
  };

  const kicker = (s, txt) =>
    s.addText(txt.toUpperCase(), { x: 0.7, y: 0.5, w: 11, h: 0.35, fontFace: BODY, fontSize: 12, bold: true, color: C.accent, charSpacing: 3, margin: 0 });

  const title = (s, txt) =>
    s.addText(txt, { x: 0.7, y: 0.82, w: 11.9, h: 0.85, fontFace: HEAD, fontSize: 32, bold: true, color: C.text, margin: 0 });

  // ════════════════════════ SLIDE 1 — TITLE ════════════════════════
  let s = pres.addSlide();
  s.background = { color: C.dark };
  // decorative bubbles
  s.addShape(pres.shapes.OVAL, { x: 10.4, y: -1.5, w: 5, h: 5, fill: { color: C.primary, transparency: 55 } });
  s.addShape(pres.shapes.OVAL, { x: 11.6, y: 3.6, w: 3.2, h: 3.2, fill: { color: C.accent, transparency: 70 } });
  iconCircle(s, I.whatsapp, 0.85, 0.85, 1.0, C.white);
  s.addText('ZEGA DIGITAL  ·  ዜጋ ዲጂታል', { x: 2.05, y: 0.95, w: 8, h: 0.5, fontFace: BODY, fontSize: 15, bold: true, color: C.ice, charSpacing: 2, margin: 0 });

  s.addText('The Digital-Literacy\nWhatsApp Bot', { x: 0.85, y: 2.5, w: 9.5, h: 2.0, fontFace: HEAD, fontSize: 46, bold: true, color: C.white, lineSpacingMultiple: 1.0, margin: 0 });
  s.addText('How it works · technology · modules · and what’s next', { x: 0.9, y: 4.55, w: 10, h: 0.5, fontFace: BODY, fontSize: 18, italic: true, color: C.ice, margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.9, y: 5.5, w: 0.55, h: 0.06, fill: { color: C.accent } });
  s.addText('Teaching digital skills to Ethiopians — built on Meta’s My Digital World content, delivered in English, Amharic & Afaan Oromo.', { x: 0.9, y: 5.7, w: 9.5, h: 0.8, fontFace: BODY, fontSize: 14, color: C.ice, margin: 0 });

  // ════════════════════════ SLIDE 2 — HOW IT WORKS (flow) ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'How it works');
  title(s, 'A guided, menu-driven journey');
  s.addText('Every learner moves through the same simple path. They just reply with numbers — no app to install, no account to create.', { x: 0.7, y: 1.7, w: 11.9, h: 0.5, fontFace: BODY, fontSize: 15, color: C.muted, margin: 0 });

  const steps = [
    { t: 'Entry', d: 'Ad link or “Hi”', ic: I.whatsapp },
    { t: 'Language', d: 'EN · AM · OM', ic: I.lang },
    { t: 'Track', d: 'Youth or Adult', ic: I.route },
    { t: 'Module', d: 'Pick a topic', ic: I.cubes },
    { t: 'Lesson', d: 'One bubble at a time', ic: I.bookG },
    { t: 'Quiz', d: 'Instant feedback', ic: I.bolt },
    { t: 'Badge', d: 'Score & reward', ic: I.trophy },
  ];
  const n = steps.length;
  const cw = 1.52, gap = 0.18, startX = 0.7, cy = 2.95, ch = 2.1;
  steps.forEach((st, i) => {
    const x = startX + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: cy, w: cw, h: ch, fill: { color: C.card }, rectRadius: 0.09, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: cy, w: cw, h: 0.12, fill: { color: i === n - 1 ? C.accent : C.primary } });
    const d = 0.72;
    iconCircle(s, st.ic, x + (cw - d) / 2, cy + 0.32, d, i === n - 1 ? C.dark : C.light);
    s.addText(st.t, { x, y: cy + 1.12, w: cw, h: 0.32, align: 'center', fontFace: HEAD, fontSize: 14, bold: true, color: C.text, margin: 0 });
    s.addText(st.d, { x: x + 0.05, y: cy + 1.46, w: cw - 0.1, h: 0.55, align: 'center', fontFace: BODY, fontSize: 10.5, color: C.muted, margin: 0 });
    if (i < n - 1) {
      s.addText('›', { x: x + cw - 0.02, y: cy + 0.5, w: gap + 0.04, h: 1, align: 'center', fontFace: BODY, fontSize: 22, bold: true, color: C.primaryLt, margin: 0 });
    }
  });

  // global commands strip
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 5.55, w: 11.93, h: 1.05, fill: { color: C.dark }, rectRadius: 0.08 });
  s.addText('GLOBAL COMMANDS, ANYWHERE', { x: 1.0, y: 5.72, w: 5, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.accent, charSpacing: 2, margin: 0 });
  s.addText([
    { text: 'MENU', options: { bold: true, color: C.white } }, { text: '  main menu      ', options: { color: C.ice } },
    { text: 'HELP', options: { bold: true, color: C.white } }, { text: '  help & resources      ', options: { color: C.ice } },
    { text: '0', options: { bold: true, color: C.white } }, { text: '  back      ', options: { color: C.ice } },
    { text: 'STOP', options: { bold: true, color: C.white } }, { text: '  exit', options: { color: C.ice } },
  ], { x: 1.0, y: 6.05, w: 11.3, h: 0.45, fontFace: BODY, fontSize: 14, margin: 0 });

  // ════════════════════════ SLIDE 3 — TECHNOLOGY ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'Technology');
  title(s, 'A lean, dependency-light stack');

  const tech = [
    { ic: I.whatsapp, t: 'Meta WhatsApp Cloud API', d: 'Official channel. Inbound via webhook, outbound text replies — no third-party gateway.' },
    { ic: I.server, t: 'Node.js + Express', d: 'Two tiny dependencies (express, dotenv). One webhook server, one health probe.' },
    { ic: I.cog, t: 'Finite-state engine', d: 'Provider-agnostic conversation machine: handle(session, text) → message bubbles.' },
    { ic: I.lang, t: 'i18n content packs', d: 'English canonical; Amharic & Afaan Oromo deep-merge over it with auto English fallback.' },
    { ic: I.cloud, t: 'Pluggable session store', d: 'In-memory for dev (6-hour TTL); swap for Redis/DB in production — same interface.' },
    { ic: I.code, t: 'Built-in simulator + tests', d: 'CLI chat to test offline; test suite verifies every menu & lesson link resolves.' },
  ];
  const tcw = 3.78, tgap = 0.27, tx0 = 0.7, ty0 = 1.85, tch = 1.62;
  tech.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = tx0 + col * (tcw + tgap);
    const y = ty0 + row * (tch + 0.27);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: tcw, h: tch, fill: { color: C.card }, rectRadius: 0.08, shadow: shadow() });
    iconCircle(s, it.ic, x + 0.28, y + 0.3, 0.7, C.light);
    s.addText(it.t, { x: x + 1.12, y: y + 0.28, w: tcw - 1.25, h: 0.74, fontFace: HEAD, fontSize: 14.5, bold: true, color: C.text, valign: 'middle', margin: 0 });
    s.addText(it.d, { x: x + 0.28, y: y + 1.0, w: tcw - 0.55, h: 0.55, fontFace: BODY, fontSize: 11, color: C.muted, margin: 0 });
  });

  // ════════════════════════ SLIDE 4 — ARCHITECTURE ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'Architecture');
  title(s, 'One engine, two drivers');
  s.addText('The conversation logic is decoupled from WhatsApp — the live webhook and the local CLI are thin drivers over the exact same engine.', { x: 0.7, y: 1.7, w: 11.9, h: 0.5, fontFace: BODY, fontSize: 15, color: C.muted, margin: 0 });

  const box = (x, y, w, h, fill, line) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, rectRadius: 0.08, line: line ? { color: line, width: 1.5 } : undefined, shadow: shadow() });
  const arrow = (x, y, w) => s.addText('→', { x, y, w, h: 0.5, align: 'center', fontFace: BODY, fontSize: 26, bold: true, color: C.primaryLt, margin: 0 });

  const my = 3.0;
  // Drivers column
  box(0.7, 2.55, 2.7, 1.5, C.dark);
  s.addText('WhatsApp user', { x: 0.7, y: 2.7, w: 2.7, h: 0.3, align: 'center', fontFace: BODY, fontSize: 11, color: C.accent, bold: true, margin: 0 });
  s.addText('Webhook driver', { x: 0.7, y: 3.0, w: 2.7, h: 0.4, align: 'center', fontFace: HEAD, fontSize: 16, bold: true, color: C.white, margin: 0 });
  s.addText('server.js · Express\nGET verify · POST messages', { x: 0.7, y: 3.42, w: 2.7, h: 0.55, align: 'center', fontFace: BODY, fontSize: 10, color: C.ice, margin: 0 });

  box(0.7, 4.25, 2.7, 1.2, C.primary);
  s.addText('CLI driver', { x: 0.7, y: 4.45, w: 2.7, h: 0.4, align: 'center', fontFace: HEAD, fontSize: 16, bold: true, color: C.white, margin: 0 });
  s.addText('scripts/cli.js\nlocal simulator', { x: 0.7, y: 4.85, w: 2.7, h: 0.5, align: 'center', fontFace: BODY, fontSize: 10, color: C.ice, margin: 0 });

  arrow(3.45, 3.55, 0.6);

  // Engine
  box(4.15, 2.75, 3.5, 2.5, C.card, C.primary);
  s.addShape(pres.shapes.RECTANGLE, { x: 4.15, y: 2.75, w: 3.5, h: 0.14, fill: { color: C.accent } });
  iconCircle(s, I.cog, 4.15 + (3.5 - 0.8) / 2, 3.05, 0.8, C.light);
  s.addText('Conversation Engine', { x: 4.15, y: 3.95, w: 3.5, h: 0.35, align: 'center', fontFace: HEAD, fontSize: 16, bold: true, color: C.text, margin: 0 });
  s.addText('Finite-state machine\nmenus · lessons · quizzes\ninfo · glossary · language', { x: 4.15, y: 4.32, w: 3.5, h: 0.85, align: 'center', fontFace: BODY, fontSize: 11.5, color: C.muted, margin: 0 });

  arrow(7.7, 3.55, 0.6);

  // Right column: content + store
  box(8.35, 2.75, 4.28, 1.15, C.card, C.primaryLt);
  iconCircle(s, I.lang, 8.6, 2.92, 0.78, C.light);
  s.addText('Content packs (i18n)', { x: 9.55, y: 2.92, w: 2.9, h: 0.32, fontFace: HEAD, fontSize: 14, bold: true, color: C.text, margin: 0 });
  s.addText('EN canonical · AM / OM merge over it', { x: 9.55, y: 3.26, w: 3, h: 0.55, fontFace: BODY, fontSize: 10.5, color: C.muted, margin: 0 });

  box(8.35, 4.1, 4.28, 1.15, C.card, C.primaryLt);
  iconCircle(s, I.cloud, 8.6, 4.27, 0.78, C.light);
  s.addText('Session store', { x: 9.55, y: 4.27, w: 2.9, h: 0.32, fontFace: HEAD, fontSize: 14, bold: true, color: C.text, margin: 0 });
  s.addText('In-memory now → Redis / DB in production', { x: 9.55, y: 4.61, w: 3, h: 0.55, fontFace: BODY, fontSize: 10.5, color: C.muted, margin: 0 });

  s.addText('handle(session, text)  →  [ message bubbles ]', { x: 4.15, y: 5.55, w: 3.5, h: 0.4, align: 'center', fontFace: 'Consolas', fontSize: 11, italic: true, color: C.primary, margin: 0 });

  // ════════════════════════ SLIDE 5 — MODULES ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'Modules & functionality');
  title(s, 'Two learning tracks, shared toolkit');

  // Youth card
  const colW = 5.6;
  const drawTrack = (x, headFill, ic, name, age, mods) => {
    // square-cornered card so the colored header band sits flush (rounded card + square band protrudes)
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.85, w: colW, h: 3.05, fill: { color: C.card }, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.85, w: colW, h: 0.95, fill: { color: headFill } });
    iconCircle(s, ic, x + 0.3, y_ = 2.0, 0.66, C.white);
    s.addText(name, { x: x + 1.15, y: 1.98, w: colW - 1.3, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.white, margin: 0 });
    s.addText(age, { x: x + 1.15, y: 2.38, w: colW - 1.3, h: 0.35, fontFace: BODY, fontSize: 12, color: C.ice, margin: 0 });
    const items = mods.map((m) => ({ text: m, options: { bullet: { code: '2022', indent: 14 }, color: C.text, breakLine: true, paraSpaceAfter: 5 } }));
    s.addText(items, { x: x + 0.35, y: 3.0, w: colW - 0.7, h: 1.75, fontFace: BODY, fontSize: 12.5, margin: 0, valign: 'top' });
  };
  let y_;
  drawTrack(0.7, C.primary, I.userG, 'Youth Track', 'Ages 13–17', [
    'Digital Foundations', 'Digital Wellness', 'Digital Engagement', 'Digital Opportunities', 'Online Safety & Well-Being', 'AI Literacy',
  ]);
  drawTrack(7.03, C.dark, I.usersG, 'Adult Track', '18 and over', [
    'Media Literacy', 'Privacy', 'Online Security', 'Youth Online Safety', 'AI Literacy',
  ]);

  // shared toolkit strip
  s.addText('SHARED TOOLKIT', { x: 0.7, y: 5.1, w: 6, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.accent, charSpacing: 2, margin: 0 });
  const tools = [
    { ic: I.book, t: 'Paginated lessons', d: 'One bubble per NEXT' },
    { ic: I.bolt, t: '15-question quizzes', d: 'Instant feedback' },
    { ic: I.globe, t: '3 languages', d: 'EN · AM · OM' },
    { ic: I.star, t: 'Glossary · Help · About', d: '18 key terms' },
  ];
  const twW = 2.95, tw0 = 0.7, twY = 5.45;
  tools.forEach((it, i) => {
    const x = tw0 + i * (twW + 0.13);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: twY, w: twW, h: 1.25, fill: { color: C.card }, rectRadius: 0.07, shadow: shadow() });
    iconCircle(s, it.ic, x + 0.22, twY + 0.28, 0.66, C.primary);
    s.addText(it.t, { x: x + 1.0, y: twY + 0.22, w: twW - 1.1, h: 0.5, fontFace: HEAD, fontSize: 12.5, bold: true, color: C.text, valign: 'middle', margin: 0 });
    s.addText(it.d, { x: x + 1.0, y: twY + 0.74, w: twW - 1.1, h: 0.35, fontFace: BODY, fontSize: 10.5, color: C.muted, margin: 0 });
  });

  // ════════════════════════ SLIDE 6 — GAMIFICATION & REWARDS ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'Gamification & rewards');
  title(s, 'From badges today to a reward loop');

  // Today
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 1.9, w: 3.55, h: 4.7, fill: { color: C.dark }, rectRadius: 0.08, shadow: shadow() });
  s.addText('LIVE TODAY', { x: 0.95, y: 2.15, w: 3, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.accent, charSpacing: 2, margin: 0 });
  iconCircle(s, I.medal, 0.95, 2.55, 0.8, C.primary);
  s.addText('Completion & quiz badges', { x: 0.95, y: 3.5, w: 3.1, h: 0.6, fontFace: HEAD, fontSize: 16, bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: 'Badge after every lesson', options: { bullet: { code: '2022' }, color: C.ice, breakLine: true, paraSpaceAfter: 7 } },
    { text: 'Score out of 15 per quiz', options: { bullet: { code: '2022' }, color: C.ice, breakLine: true, paraSpaceAfter: 7 } },
    { text: 'Tiered reward message by score', options: { bullet: { code: '2022' }, color: C.ice, breakLine: true } },
  ], { x: 1.0, y: 4.2, w: 3.0, h: 2.2, fontFace: BODY, fontSize: 12.5, margin: 0 });

  // arrow to planned
  s.addText('→', { x: 4.3, y: 3.9, w: 0.55, h: 0.6, align: 'center', fontFace: BODY, fontSize: 30, bold: true, color: C.primaryLt, margin: 0 });

  // Planned grid
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.95, y: 1.9, w: 7.68, h: 4.7, fill: { color: 'FFFFFF' }, rectRadius: 0.08, shadow: shadow() });
  s.addText('PLANNED IN DEVELOPMENT', { x: 5.2, y: 2.15, w: 6, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.accent, charSpacing: 2, margin: 0 });
  const game = [
    { ic: I.star, t: 'XP & points', d: 'Earn points per lesson and quiz answer.' },
    { ic: I.fire, t: 'Daily streaks', d: 'Reward consecutive days of learning.' },
    { ic: I.chart, t: 'Levels & progress bar', d: 'Visible journey from novice to pro.' },
    { ic: I.trophy, t: 'Leaderboards', d: 'Friendly, opt-in regional rankings.' },
    { ic: I.cert, t: 'Shareable certificates', d: 'Track completion proof to share.' },
    { ic: I.gift, t: 'Unlockable rewards', d: 'Airtime, data, or partner perks.' },
  ];
  const gW = 3.6, gx0 = 5.2, gy0 = 2.55, gH = 1.18;
  game.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx0 + col * (gW + 0.17);
    const y = gy0 + row * (gH + 0.13);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: gW, h: gH, fill: { color: C.light }, rectRadius: 0.07 });
    iconCircle(s, it.ic, x + 0.18, y + 0.25, 0.64, C.primary);
    s.addText(it.t, { x: x + 0.95, y: y + 0.18, w: gW - 1.05, h: 0.35, fontFace: HEAD, fontSize: 13, bold: true, color: C.text, margin: 0 });
    s.addText(it.d, { x: x + 0.95, y: y + 0.52, w: gW - 1.05, h: 0.55, fontFace: BODY, fontSize: 10.5, color: C.muted, margin: 0 });
  });

  // ════════════════════════ SLIDE 7 — PROACTIVE ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.light };
  kicker(s, 'Proactive engagement · planned');
  title(s, 'The bot reaches out, not just responds');
  s.addText('Today the bot is purely reactive. The roadmap adds scheduled, opt-in outbound messages to keep learners coming back — sent within WhatsApp policy windows / approved templates.', { x: 0.7, y: 1.7, w: 11.9, h: 0.6, fontFace: BODY, fontSize: 15, color: C.muted, margin: 0 });

  const pro = [
    { ic: I.clock, t: 'Lesson reminders', d: '“Ready for your next lesson?” nudges at a time the learner chooses.' },
    { ic: I.paper, t: 'Drip lessons', d: 'A new micro-lesson released on a daily or weekly schedule.' },
    { ic: I.undo, t: 'Re-engagement', d: 'Win-back messages for learners who’ve gone quiet for a while.' },
    { ic: I.fire, t: 'Streak alerts', d: '“Don’t break your 5-day streak!” reminders before it lapses.' },
    { ic: I.bell, t: 'New-content pings', d: 'Announce new modules, AI-literacy topics, or seasonal campaigns.' },
    { ic: I.chart, t: 'Progress check-ins', d: 'Weekly recap of points earned, badges, and what’s next.' },
  ];
  const pW = 3.78, pgap = 0.27, px0 = 0.7, py0 = 2.55, pH = 1.7;
  pro.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = px0 + col * (pW + pgap);
    const y = py0 + row * (pH + 0.27);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: pW, h: pH, fill: { color: C.card }, rectRadius: 0.08, shadow: shadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.13, h: pH, fill: { color: C.accent } });
    iconCircle(s, it.ic, x + 0.32, y + 0.3, 0.72, C.primary);
    s.addText(it.t, { x: x + 1.2, y: y + 0.3, w: pW - 1.35, h: 0.72, fontFace: HEAD, fontSize: 15, bold: true, color: C.text, valign: 'middle', margin: 0 });
    s.addText(it.d, { x: x + 0.32, y: y + 1.05, w: pW - 0.6, h: 0.6, fontFace: BODY, fontSize: 11, color: C.muted, margin: 0 });
  });

  // ════════════════════════ SLIDE 8 — ROADMAP / CLOSE ════════════════════════
  s = pres.addSlide();
  s.background = { color: C.dark };
  s.addShape(pres.shapes.OVAL, { x: -1.5, y: 4.2, w: 5, h: 5, fill: { color: C.primary, transparency: 60 } });
  s.addShape(pres.shapes.OVAL, { x: 11.3, y: -1.4, w: 4, h: 4, fill: { color: C.accent, transparency: 72 } });
  s.addText('THE ROAD AHEAD', { x: 0.85, y: 0.75, w: 8, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: C.accent, charSpacing: 3, margin: 0 });
  s.addText('Built today, growing next', { x: 0.85, y: 1.2, w: 11, h: 0.8, fontFace: HEAD, fontSize: 34, bold: true, color: C.white, margin: 0 });

  const phases = [
    { ph: 'NOW', t: 'Core experience', d: 'Menu flow, two tracks, lessons, quizzes, badges, 3-language scaffold, live on the Cloud API.', fill: C.primary },
    { ph: 'NEXT', t: 'Gamification', d: 'Points, streaks, levels, leaderboards, certificates and unlockable rewards.', fill: C.primaryLt },
    { ph: 'THEN', t: 'Proactive + scale', d: 'Scheduled nudges & drip lessons, full AM/OM translations, Redis-backed sessions.', fill: C.accent },
  ];
  const phW = 3.85, phx0 = 0.85, phY = 2.5, phH = 2.9;
  phases.forEach((p, i) => {
    const x = phx0 + i * (phW + 0.28);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: phY, w: phW, h: phH, fill: { color: '0F3A35' }, rectRadius: 0.09, line: { color: p.fill, width: 1.5 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: phY + 0.35, w: 0.85, h: 0.85, fill: { color: p.fill } });
    s.addText(String(i + 1), { x: x + 0.3, y: phY + 0.35, w: 0.85, h: 0.85, align: 'center', valign: 'middle', fontFace: HEAD, fontSize: 26, bold: true, color: i === 2 ? C.dark : C.white, margin: 0 });
    s.addText(p.ph, { x: x + 1.3, y: phY + 0.5, w: phW - 1.5, h: 0.35, fontFace: BODY, fontSize: 13, bold: true, color: p.fill, charSpacing: 2, margin: 0 });
    s.addText(p.t, { x: x + 0.35, y: phY + 1.35, w: phW - 0.7, h: 0.5, fontFace: HEAD, fontSize: 19, bold: true, color: C.white, margin: 0 });
    s.addText(p.d, { x: x + 0.35, y: phY + 1.9, w: phW - 0.7, h: 0.9, fontFace: BODY, fontSize: 12, color: C.ice, margin: 0 });
  });

  iconCircle(s, I.whatsapp, 0.85, 5.85, 0.85, C.white);
  s.addText('Zega Digital · ዜጋ ዲጂታል — digital literacy, one WhatsApp message at a time.', { x: 1.9, y: 5.95, w: 10.5, h: 0.7, fontFace: BODY, fontSize: 15, italic: true, color: C.ice, valign: 'middle', margin: 0 });

  const outFile = path.join(process.cwd(), 'Zega_Digital_Bot_Overview.pptx');
  await pres.writeFile({ fileName: outFile });
  console.log('WROTE', outFile);
}

main().catch((e) => { console.error(e); process.exit(1); });
