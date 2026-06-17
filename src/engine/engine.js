'use strict';

/**
 * Conversation engine — a provider-agnostic finite-state machine.
 *
 *   handle(session, rawInput, ctx) -> { session, messages, events, actions }
 *
 * - `session` is a serialisable per-user conversation state (cursor + flags).
 * - `ctx` is read-only gamification context supplied by the runtime:
 *     { profile, completed: Set<lessonId>, earnedBadges: [{emoji,name}] }
 *   The engine reads it to render the mission/progress screens and to pick the
 *   next lesson. It never persists — it returns `events` (lessonCompleted,
 *   quizFinished, …) that the runtime turns into XP/badges/streaks.
 * - `actions` are context-relevant quick-reply buttons for richer clients.
 *
 * The engine is synchronous; it stashes ctx/events in module scope for the
 * duration of one handle() call to avoid threading them through every helper.
 */

const { getContent, LANGUAGE_CHOICES } = require('../content');
const config = require('../config');
const curriculum = require('../curriculum');
const { levelInfo, progressBar } = require('../gamification/xp');

const SPECIAL = new Set(['HOME', 'MAIN', 'LANGUAGE', 'GLOSSARY', 'EXIT', 'YOUTH_QUIZ', 'ADULT_QUIZ']);
const PASS_RATIO = 0.7;

let CTX = null; // gamification context for the current call
let EVENTS = []; // events emitted during the current call

function freshSession() {
  return {
    lang: config.defaultLang || 'en',
    started: false,
    awaitingLanguage: false,
    track: null,
    cursor: null,
  };
}

function emit(type, data) {
  EVENTS.push({ type, ...data });
}

function handle(session, rawInput, ctx) {
  if (!session) session = freshSession();
  CTX = normaliseCtx(ctx);
  EVENTS = [];

  const text = (rawInput == null ? '' : String(rawInput)).trim();
  const cmd = text.toUpperCase();
  const content = getContent(session.lang);

  const result = route(session, content, text, cmd);
  result.events = EVENTS;
  result.actions = deriveActions(session, content);
  // WhatsApp maps ≤3 quick replies to reply buttons; more → a list message.
  result.actionStyle = result.actions.length > 3 ? 'list' : 'buttons';
  CTX = null;
  return result;
}

function normaliseCtx(ctx) {
  return {
    profile: (ctx && ctx.profile) || null,
    completed: (ctx && ctx.completed) || new Set(),
    earnedBadges: (ctx && ctx.earnedBadges) || [],
    baselineDone: Boolean(ctx && ctx.baselineDone),
    endlineDone: Boolean(ctx && ctx.endlineDone),
  };
}

function route(session, content, text, cmd) {
  // First contact / onboarding
  if (!session.started) {
    session.started = true;
    session.awaitingLanguage = true;
    return out(session, [content.strings.onboarding]);
  }
  if (session.awaitingLanguage) {
    const choice = LANGUAGE_CHOICES.find((c) => c.input === text);
    if (choice) {
      session.lang = choice.code;
      session.awaitingLanguage = false;
      const c = getContent(session.lang);
      return goTo(session, c, 'HOME', [c.strings.navTip]);
    }
    return out(session, [content.strings.onboarding]);
  }

  // Global commands
  if (cmd === 'STOP' || cmd === 'EXIT' || cmd === 'QUIT') {
    const bye = content.strings.exitMessage;
    const track = session.track;
    Object.assign(session, freshSession());
    session.track = track; // remember chosen track across sessions
    return out(session, [bye]);
  }
  if (cmd === 'MENU' || cmd === 'HOME') return goTo(session, content, 'HOME');
  // Resume entry point — what a reminder/nudge quick-reply button maps to.
  if (cmd === 'CONTINUE' || cmd === 'RESUME') return goTo(session, content, 'HOME');
  if (cmd === 'HELP') return goTo(session, content, 'help.menu');
  if (cmd.startsWith('REMIND')) return handleRemind(session, content, cmd);
  if (cmd === 'BASELINE') return offerAssessment(session, content, 'baseline');
  if (cmd === 'FINAL' || cmd === 'ASSESS') return offerAssessment(session, content, 'endline');

  const cur = session.cursor || { type: 'home' };
  switch (cur.type) {
    case 'home':
      return handleHome(session, content, cur, text, cmd);
    case 'progress':
      return goTo(session, content, 'HOME'); // any key returns home
    case 'menu':
      return handleMenu(session, content, cur, text, cmd);
    case 'lesson':
      return handleLesson(session, content, cur, cmd);
    case 'check':
      return handleCheck(session, content, cur, cmd);
    case 'completion':
      return handleCompletion(session, content, cur, text);
    case 'info':
      return handleInfo(session, content, cur, text);
    case 'glossary':
      return handleGlossary(session, content, text);
    case 'language':
      return handleLanguageMenu(session, content, text);
    case 'quiz':
      return handleQuiz(session, content, cur, text, cmd);
    case 'assessment-offer':
      return handleAssessmentOffer(session, content, cur, cmd);
    case 'assessment':
      return handleAssessment(session, content, cur, cmd);
    default:
      return goTo(session, content, 'HOME');
  }
}

// ── Reminders opt-in (REMIND ON | REMIND OFF | REMIND 19) ────────────────────
function handleRemind(session, content, cmd) {
  const rest = cmd.replace(/^REMIND\s*/, '').trim();
  if (rest === 'OFF') {
    emit('setReminders', { on: false });
    return goTo(session, content, 'HOME', ['🔕 Daily reminders turned off.']);
  }
  if (rest === 'ON' || rest === '') {
    emit('setReminders', { on: true });
    return goTo(session, content, 'HOME', ['🔔 Daily reminders on! I’ll nudge you to keep your streak.']);
  }
  if (/^\d{1,2}$/.test(rest)) {
    const hour = Math.max(0, Math.min(23, parseInt(rest, 10)));
    emit('setReminders', { on: true, hour });
    return goTo(session, content, 'HOME', [`🔔 Daily reminder set for ${hour}:00. I’ll check in then.`]);
  }
  return out(session, ['To set a daily reminder: reply REMIND ON, REMIND OFF, or REMIND 19 (for 7pm).']);
}

// ── Baseline / endline assessments (learning-gain measurement) ───────────────
function afterTrackChosen(session, content) {
  // Offer the baseline diagnostic once, before the first lesson.
  if (!CTX.baselineDone && content.assessments && content.assessments[session.track]) {
    return offerAssessment(session, content, 'baseline');
  }
  return goTo(session, content, 'HOME');
}

function offerAssessment(session, content, kind) {
  const track = session.track;
  const items = track && content.assessments && content.assessments[track];
  if (!items) {
    return goTo(session, content, 'HOME', ['Pick a track first to take an assessment.']);
  }
  session.cursor = { type: 'assessment-offer', kind };
  const intro =
    kind === 'baseline'
      ? [
          '📋 *Quick starting check* — 5 short questions.',
          "There's no pressure and no scores shown — it just helps me measure how far you grow.",
          '',
          'Reply START to begin, or SKIP.',
        ]
      : [
          '📋 *Final check* — the same 5 questions from the start.',
          "Let's measure how much you've learned! 📈",
          '',
          'Reply START to begin, or SKIP.',
        ];
  return out(session, [intro.join('\n')]);
}

function handleAssessmentOffer(session, content, cur, cmd) {
  if (['START', 'YES', 'Y', '1'].includes(cmd)) return startAssessment(session, content, cur.kind);
  if (['SKIP', 'NO', 'N', '0'].includes(cmd)) return goTo(session, content, 'HOME');
  return out(session, ['Reply START to begin the check, or SKIP.']);
}

function startAssessment(session, content, kind) {
  const items = content.assessments[session.track];
  session.cursor = { type: 'assessment', kind, track: session.track, index: 0, score: 0 };
  const intro =
    kind === 'baseline'
      ? '📋 Starting check — answer honestly, no feedback shown.'
      : '📋 Final check — last time! 📈';
  return out(session, [intro, renderAssessmentQ(items, 0)]);
}

function handleAssessment(session, content, cur, cmd) {
  const items = content.assessments[cur.track];
  const total = items.length;
  if (cmd === 'MENU' || cmd === 'HOME') return goTo(session, content, 'HOME'); // abandon
  const answerable = ['A', 'B', 'C', 'D', 'SKIP'];
  if (!answerable.includes(cmd)) {
    return out(session, ['Reply A, B, C, or D (or SKIP).', renderAssessmentQ(items, cur.index)]);
  }
  if (cmd !== 'SKIP' && cmd === items[cur.index].answer) cur.score += 1;
  if (cur.index >= total - 1) {
    emit('assessmentFinished', { kind: cur.kind, track: cur.track, score: cur.score, total });
    const summary =
      cur.kind === 'baseline'
        ? `✅ Thanks! You scored ${cur.score}/${total} to start. Now let's begin learning! 🚀`
        : `🏁 Final check complete: ${cur.score}/${total}.`;
    return goTo(session, content, 'HOME', [summary]);
  }
  cur.index += 1;
  session.cursor = cur;
  return out(session, [renderAssessmentQ(items, cur.index)]);
}

function renderAssessmentQ(items, index) {
  const q = items[index];
  const opts = Object.keys(q.options)
    .map((k) => `${k}) ${q.options[k]}`)
    .join('\n');
  return [`📋 ${index + 1} of ${items.length}`, '', q.q, '', opts, '', 'Reply A, B, C, or D'].join('\n');
}

// ── HOME / mission screen ────────────────────────────────────────────────────
function handleHome(session, content, cur, text, cmd) {
  if (!session.track) {
    // Track chooser
    if (text === '1') {
      session.track = 'youth';
      emit('trackSelected', { track: 'youth' });
      return afterTrackChosen(session, content);
    }
    if (text === '2') {
      session.track = 'adult';
      emit('trackSelected', { track: 'adult' });
      return afterTrackChosen(session, content);
    }
    if (text === '3') return goTo(session, content, 'MAIN');
    return out(session, [content.strings.unrecognised, renderHome(session, content)]);
  }

  const next = curriculum.nextLesson(content, session.track, CTX.completed);
  switch (text) {
    case '1':
      if (next) return goTo(session, content, next.lessonId);
      // Track finished: offer the final assessment first (once), else the quiz.
      if (!CTX.endlineDone) return offerAssessment(session, content, 'endline');
      return goTo(session, content, session.track === 'youth' ? 'YOUTH_QUIZ' : 'ADULT_QUIZ');
    case '2':
      session.cursor = { type: 'progress' };
      return out(session, [renderProgress(session, content)]);
    case '3':
      return goTo(session, content, `${session.track}.menu`);
    case '4':
      return goTo(session, content, session.track === 'youth' ? 'YOUTH_QUIZ' : 'ADULT_QUIZ');
    case '5':
      return goTo(session, content, 'LANGUAGE');
    case '6':
      return goTo(session, content, 'MAIN');
    default:
      return out(session, [content.strings.unrecognised, renderHome(session, content)]);
  }
}

// ── Menus ──────────────────────────────────────────────────────────────────
function handleMenu(session, content, cur, text, cmd) {
  if (cmd === 'REVIEW') return goTo(session, content, cur.id);
  const node = content.nodes[cur.id];
  if (!node) return goTo(session, content, 'HOME');
  const option = node.options.find((o) => o.input === text);
  if (!option) return out(session, [content.strings.unrecognised, renderMenu(content, node)]);
  return goTo(session, content, option.next);
}

// ── Lessons (paginated, one bubble per turn) ─────────────────────────────────
function handleLesson(session, content, cur, cmd) {
  const node = content.nodes[cur.id];
  if (!node) return goTo(session, content, 'HOME');
  if (cmd === '0') return goTo(session, content, node.parent || 'HOME');

  emit('lessonPage', { lessonId: cur.id });
  const nextIndex = cur.index + 1;
  if (nextIndex >= node.messages.length) {
    return afterLesson(session, content, cur.id);
  }
  session.cursor = { type: 'lesson', id: cur.id, index: nextIndex };
  return out(session, [lessonPage(content, node, nextIndex)]);
}

// After the last page: run the knowledge check if the lesson has one.
function afterLesson(session, content, lessonId) {
  const check = content.checks && content.checks[lessonId];
  if (check) {
    session.cursor = { type: 'check', lessonId };
    return out(session, [renderCheck(check)]);
  }
  return showCompletion(session, content, lessonId);
}

function handleCheck(session, content, cur, cmd) {
  const check = content.checks[cur.lessonId];
  const keys = Object.keys(check.options);
  if (cmd === 'SKIP') {
    return showCompletion(session, content, cur.lessonId);
  }
  if (!keys.includes(cmd)) {
    return out(session, [content.strings.unrecognised, renderCheck(check)]);
  }
  const correct = cmd === check.answer;
  emit('checkAnswered', { lessonId: cur.lessonId, correct });
  const head = correct
    ? `✅ Correct! ${check.reinforce}`
    : `❌ Not quite — the answer is ${check.answer}. ${check.reinforce}`;
  return showCompletion(session, content, cur.lessonId, [head]);
}

function showCompletion(session, content, lessonId, prefix = []) {
  const node = content.nodes[lessonId];
  emit('lessonCompleted', { lessonId, track: session.track });
  session.cursor = { type: 'completion', lessonId };
  const badge = content.strings.completionBadge.replace('{{lesson}}', node.title);
  return out(session, [...prefix, badge]);
}

function handleCompletion(session, content, cur, text) {
  const node = content.nodes[cur.lessonId];
  if (text === '1') return goTo(session, content, node.next || node.parent || 'HOME');
  if (text === '0') return goTo(session, content, node.parent || 'HOME');
  const badge = content.strings.completionBadge.replace('{{lesson}}', node.title);
  return out(session, [content.strings.unrecognised, badge]);
}

// ── Info pages ────────────────────────────────────────────────────────────────
function handleInfo(session, content, cur, text) {
  const node = content.nodes[cur.id];
  if (text === '0') return goTo(session, content, (node && node.back) || 'HOME');
  return out(session, [...node.messages, infoFooter()]);
}

// ── Glossary ─────────────────────────────────────────────────────────────────
function handleGlossary(session, content, text) {
  const g = content.glossary;
  if (text === '0') return goTo(session, content, g.back || 'HOME');
  const term = g.terms.find((t) => t.input === text);
  if (!term) return out(session, [content.strings.unrecognised, renderGlossary(g)]);
  return out(session, [
    `📖 *${term.label}*\n${term.definition}\n\nReply another number for a definition, or 0 to go back.`,
  ]);
}

// ── Language ─────────────────────────────────────────────────────────────────
function handleLanguageMenu(session, content, text) {
  if (text === '0') return goTo(session, content, 'HOME');
  const choice = LANGUAGE_CHOICES.find((c) => c.input === text);
  if (!choice) return out(session, [content.strings.unrecognised, renderLanguageMenu()]);
  session.lang = choice.code;
  const c = getContent(session.lang);
  return goTo(session, c, 'HOME', [`🌍 Language set to ${choice.name}.`]);
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
function startQuiz(session, content, track) {
  const quiz = content.quizzes[track];
  session.cursor = { type: 'quiz', track, index: 0, score: 0, phase: 'question' };
  return out(session, [quiz.intro, renderQuestion(quiz, 0)]);
}

function handleQuiz(session, content, cur, text, cmd) {
  const quiz = content.quizzes[cur.track];
  const total = quiz.questions.length;

  if (cur.phase === 'question') {
    if (cmd === 'SKIP') return advanceQuiz(session, content, cur, quiz, total, []);
    if (['A', 'B', 'C', 'D'].includes(cmd)) {
      const question = quiz.questions[cur.index];
      const correct = cmd === question.answer;
      if (correct) {
        cur.score += 1;
        emit('quizCorrect', {});
      }
      const head = correct
        ? `✅ Correct! Well done! The answer is ${question.answer}.`
        : `❌ Not quite! The correct answer is ${question.answer}.`;
      const result = `${head}\n💡 ${question.explain}`;
      if (cur.index >= total - 1) return finishQuiz(session, content, cur, quiz, [result]);
      cur.phase = 'continue';
      session.cursor = cur;
      return out(session, [`${result}\n\nReady for another? Reply YES ➡️ | Reply MENU to return.`]);
    }
    return out(session, [content.strings.unrecognised, renderQuestion(quiz, cur.index)]);
  }
  // continue
  if (['YES', 'Y', 'NEXT', '1'].includes(cmd)) return advanceQuiz(session, content, cur, quiz, total, []);
  return out(session, ['Reply YES ➡️ for the next question, or MENU to return.']);
}

function advanceQuiz(session, content, cur, quiz, total, prefix) {
  if (cur.index >= total - 1) return finishQuiz(session, content, cur, quiz, prefix);
  cur.index += 1;
  cur.phase = 'question';
  session.cursor = cur;
  return out(session, [...prefix, renderQuestion(quiz, cur.index)]);
}

function finishQuiz(session, content, cur, quiz, prefix) {
  const total = quiz.questions.length;
  const passed = total > 0 && cur.score / total >= PASS_RATIO;
  emit('quizFinished', { track: cur.track, score: cur.score, total, passed });
  const tier = quiz.tiers.find((t) => cur.score >= t.min);
  const summary = [
    "🏁 Quiz Complete! Here's your score:",
    `🎯 You answered ${cur.score} out of ${total} correctly.`,
    '',
    tier ? tier.badge : '',
    '',
    'Reply MENU for your home screen · REVIEW to revisit modules.',
  ].join('\n');
  session.cursor = { type: 'menu', id: quiz.returnTo };
  return out(session, [...prefix, summary]);
}

// ── Navigation helper ────────────────────────────────────────────────────────
function goTo(session, content, target, prefix = []) {
  if (target === 'EXIT') {
    const bye = content.strings.exitMessage;
    const track = session.track;
    Object.assign(session, freshSession());
    session.track = track;
    return out(session, [...prefix, bye]);
  }
  if (target === 'HOME') {
    session.cursor = { type: 'home' };
    return out(session, [...prefix, renderHome(session, content)]);
  }
  if (target === 'LANGUAGE') {
    session.cursor = { type: 'language' };
    return out(session, [...prefix, renderLanguageMenu()]);
  }
  if (target === 'GLOSSARY') {
    session.cursor = { type: 'glossary' };
    return out(session, [...prefix, renderGlossary(content.glossary)]);
  }
  if (target === 'YOUTH_QUIZ') return startQuiz(session, content, 'youth');
  if (target === 'ADULT_QUIZ') return startQuiz(session, content, 'adult');

  const id = SPECIAL.has(target) ? 'MAIN' : target;
  const node = content.nodes[id] || content.nodes.MAIN;
  const resolvedId = content.nodes[id] ? id : 'MAIN';

  if (node.type === 'menu') {
    session.cursor = { type: 'menu', id: resolvedId };
    return out(session, [...prefix, renderMenu(content, node)]);
  }
  if (node.type === 'lesson') {
    session.cursor = { type: 'lesson', id: resolvedId, index: 0 };
    return out(session, [...prefix, lessonPage(content, node, 0)]);
  }
  if (node.type === 'info') {
    session.cursor = { type: 'info', id: resolvedId };
    return out(session, [...prefix, ...node.messages, infoFooter()]);
  }
  session.cursor = { type: 'home' };
  return out(session, [...prefix, renderHome(session, content)]);
}

// ── Renderers ────────────────────────────────────────────────────────────────
function renderHome(session, content) {
  const p = CTX.profile || {};
  const xp = p.xp || 0;
  const li = levelInfo(xp);

  if (!session.track) {
    return [
      '👋 Welcome to your learning home.',
      '',
      "First, who is this for? Pick a track — you can switch anytime.",
      '',
      '1️⃣ 🧒 Youth (Ages 13–17)',
      '2️⃣ 🧑 Adult (18+)',
      '3️⃣ 🔎 Just exploring (full menu)',
    ].join('\n');
  }

  const prog = curriculum.trackProgress(content, session.track, CTX.completed);
  const next = curriculum.nextLesson(content, session.track, CTX.completed);
  const streakLine = (p.streak || 0) > 0 ? `🔥 ${p.streak}-day streak` : '🔥 Start a streak today!';
  const badgeLine = CTX.earnedBadges.length
    ? `🏅 ${CTX.earnedBadges.length} badge${CTX.earnedBadges.length > 1 ? 's' : ''}`
    : '🏅 No badges yet';

  const lines = [
    `🏠 *Today's mission*`,
    `${levelMedal(li.index)} ${li.name} · ${xp} XP   ${streakLine}`,
    `📚 Progress: ${progressBar(prog.pct)} ${prog.pct}%   ${badgeLine}`,
    '',
  ];
  if (next) {
    lines.push(`▶️ Up next: *${next.title}*  (${next.module.label})`);
    lines.push('');
    lines.push('1️⃣ ▶️ Start this 2-min lesson');
  } else {
    lines.push('🎉 You finished every lesson in this track!');
    lines.push('');
    lines.push('1️⃣ 🧠 Take the track quiz');
  }
  lines.push('2️⃣ 📊 My progress & badges');
  lines.push('3️⃣ 📚 Explore all modules');
  lines.push('4️⃣ 🧠 Quiz');
  lines.push('5️⃣ 🌍 Language');
  lines.push('6️⃣ ℹ️ More (glossary, help, about)');
  return lines.join('\n');
}

function renderProgress(session, content) {
  const p = CTX.profile || {};
  const li = levelInfo(p.xp || 0);
  const prog = curriculum.trackProgress(content, session.track, CTX.completed);
  const lines = [
    '📊 *Your progress*',
    '',
    `${levelMedal(li.index)} Level: ${li.name}  (${p.xp || 0} XP)`,
    li.isMax ? '⭐ Max level reached!' : `${progressBar(li.pct)} ${li.toNext} XP to ${li.nextName}`,
    `🔥 Streak: ${p.streak || 0} days  (best: ${p.longestStreak || 0})`,
    '',
    `📚 ${prog.done}/${prog.total} lessons complete`,
  ];
  for (const m of prog.modules) {
    const mark = m.complete ? '✅' : m.done > 0 ? '🔸' : '⬜';
    lines.push(`${mark} ${m.label} (${m.done}/${m.total})`);
  }
  lines.push('');
  if (CTX.earnedBadges.length) {
    lines.push('🏅 Badges earned:');
    lines.push(CTX.earnedBadges.map((b) => `${b.emoji} ${b.name}`).join('  ·  '));
  } else {
    lines.push('🏅 No badges yet — complete a lesson to earn your first!');
  }
  lines.push('');
  lines.push('Reply any key for home · MENU for home');
  return lines.join('\n');
}

function levelMedal(index) {
  return ['🌱', '🔰', '🥈', '🛡️', '🎓'][index] || '🌱';
}

function renderMenu(content, node) {
  const parts = [];
  if (node.title) parts.push(node.title);
  if (node.body) parts.push('', node.body);
  parts.push('', ...node.options.map((o) => o.label));
  parts.push('', node.footer || content.strings.menuFooter);
  return { text: parts.join('\n'), image: node.image };
}

// A lesson page may be a plain string (legacy) or a card { text, image }.
function lessonPage(content, node, index) {
  const raw = node.messages[index];
  const card = typeof raw === 'string' ? { text: raw } : raw;
  const isLast = index === node.messages.length - 1;
  const nav = isLast
    ? `Reply NEXT ➡️ to finish · 0️⃣ back · MENU for home`
    : content.strings.lessonNav;
  const counter = `(${index + 1}/${node.messages.length})`;
  return { text: `${card.text}\n\n📌 ${counter} ${nav}`, image: card.image };
}

function renderCheck(check) {
  const opts = Object.keys(check.options)
    .map((k) => `${k}) ${check.options[k]}`)
    .join('\n');
  return [
    '🧩 *Quick check* (earn +10 XP)',
    '',
    check.q,
    '',
    opts,
    '',
    'Reply with a letter · SKIP to skip',
  ].join('\n');
}

function infoFooter() {
  return '📌 Reply 0️⃣ to go back · MENU for home';
}

function renderQuestion(quiz, index) {
  const q = quiz.questions[index];
  const opts = ['A', 'B', 'C', 'D']
    .filter((k) => q.options[k] != null)
    .map((k) => `${k}) ${q.options[k]}`)
    .join('\n');
  return [`❓ Question ${index + 1} of ${quiz.questions.length}`, '', q.q, '', opts, '', 'Reply A, B, C, or D · SKIP · MENU to exit'].join('\n');
}

function renderGlossary(g) {
  const list = g.terms.map((t) => `${`${t.input}.`.padEnd(3, ' ')} ${t.label}`).join('\n');
  return `${g.intro}\n\n${list}\n\n0️⃣ Back`;
}

function renderLanguageMenu() {
  return ['🌐 Language Selection', '👉 Please choose your preferred language:', '1️⃣ English', '2️⃣ Amharic', '3️⃣ Afaan Oromo', '', '0️⃣ Back'].join('\n');
}

// ── Quick-reply buttons for richer clients (tester / WhatsApp interactive) ────
function deriveActions(session, content) {
  const cur = session.cursor;
  if (!cur) return [];
  if (session.awaitingLanguage) {
    return [act('English', '1'), act('Amharic', '2'), act('Afaan Oromo', '3')];
  }
  switch (cur.type) {
    case 'home':
      if (!session.track) return [act('🧒 Youth', '1'), act('🧑 Adult', '2'), act('🔎 Explore', '3')];
      return [act('▶️ Start', '1'), act('📊 Progress', '2'), act('📚 Modules', '3'), act('🧠 Quiz', '4')];
    case 'progress':
      return [act('🏠 Home', 'MENU')];
    case 'menu': {
      const node = content.nodes[cur.id];
      return node ? node.options.map((o) => act(shortLabel(o.label), o.input)) : [];
    }
    case 'lesson':
      return [act('Next ➡️', 'NEXT'), act('🔙 Back', '0'), act('🏠 Home', 'MENU')];
    case 'check': {
      const check = content.checks[cur.lessonId];
      return Object.keys(check.options).map((k) => act(k, k)).concat(act('Skip', 'SKIP'));
    }
    case 'completion':
      return [act('➡️ Next lesson', '1'), act('📚 Module menu', '0'), act('🏠 Home', 'MENU')];
    case 'info':
      return [act('🔙 Back', '0'), act('🏠 Home', 'MENU')];
    case 'glossary':
      return [act('🔙 Back', '0')];
    case 'language':
      return [act('English', '1'), act('Amharic', '2'), act('Afaan Oromo', '3'), act('🔙 Back', '0')];
    case 'quiz':
      return cur.phase === 'question'
        ? [act('A', 'A'), act('B', 'B'), act('C', 'C'), act('D', 'D'), act('Skip', 'SKIP')]
        : [act('Yes ➡️', 'YES'), act('🏠 Home', 'MENU')];
    case 'assessment-offer':
      return [act('▶️ Start', 'START'), act('Skip', 'SKIP')];
    case 'assessment':
      return [act('A', 'A'), act('B', 'B'), act('C', 'C'), act('D', 'D')];
    default:
      return [];
  }
}

function act(label, value) {
  return { label, value };
}

// "1️⃣ 🌐 Digital Foundations" → "🌐 Digital Foundations" (drop the keycap digit)
function shortLabel(label) {
  return label.replace(/^[0-9]️?⃣\s*/u, '').trim() || label;
}

// Normalise every outgoing bubble to a rich object { text, image? }. A plain
// string is shorthand for { text }. Empty bubbles are dropped.
function out(session, messages) {
  const norm = messages
    .map((m) => (typeof m === 'string' ? { text: m } : m))
    .filter((m) => m && (m.text || m.image));
  return { session, messages: norm };
}

module.exports = { handle, freshSession };
