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
const { levelInfo, LEVELS } = require('../gamification/xp');
const { stripEmoji, fill } = require('../util/text');

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
      // Lead with the certificate hook (+ a preview image) to motivate, then tips.
      return goTo(session, c, 'HOME', [
        { text: c.strings.ui.certHookIntro, image: '/cert/sample.png' },
        c.strings.navTip,
      ]);
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
  if (cmd === 'MENU') return goTo(session, content, 'MAIN'); // top-level main menu
  if (cmd === 'HOME') return goTo(session, content, 'HOME'); // track mission screen
  // Resume entry point — what a reminder/nudge quick-reply button maps to.
  if (cmd === 'CONTINUE' || cmd === 'RESUME') return goTo(session, content, 'HOME');
  if (cmd === 'HELP') return goTo(session, content, 'help.menu');
  // Jump-anywhere shortcuts for language and progress.
  if (cmd === 'LANGUAGE' || cmd === 'LANG') return goTo(session, content, 'LANGUAGE');
  if (cmd === 'PROGRESS' || cmd === 'PROFILE' || cmd === 'ME') {
    if (session.track) {
      session.cursor = { type: 'progress' };
      return out(session, [renderProgress(session, content)]);
    }
    return goTo(session, content, 'HOME');
  }
  if (cmd.startsWith('REMIND')) return handleRemind(session, content, cmd);
  if (cmd === 'BASELINE') return offerAssessment(session, content, 'baseline');
  if (cmd === 'FINAL' || cmd === 'ASSESS') return offerAssessment(session, content, 'endline');
  // Re-request the completion certificate at any time (runtime issues it).
  if (cmd === 'CERTIFICATE' || cmd === 'CERT') {
    emit('certificateRequest', {});
    return out(session, []);
  }
  // Data-saver toggle: LITE serves lessons as plain text (no image cards),
  // CARDS/FULL switches picture cards back on. Runtime persists the choice.
  if (cmd === 'LITE' || cmd === 'DATA' || cmd === 'TEXT') {
    emit('setLite', { on: true });
    return goTo(session, content, 'HOME', [content.strings.ui.liteOn]);
  }
  if (cmd === 'CARDS' || cmd === 'FULL') {
    emit('setLite', { on: false });
    return goTo(session, content, 'HOME', [content.strings.ui.liteOff]);
  }

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
      return handleCompletion(session, content, cur, text, cmd);
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
    case 'certname':
      return handleCertName(session, content, cur, text, cmd);
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

// ── Certificate name capture ─────────────────────────────────────────────────
function sanitizeName(text) {
  const t = String(text || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 48) return null;
  return t;
}

function handleCertName(session, content, cur, text, cmd) {
  const u = content.strings.ui;
  if (cmd === 'MENU' || cmd === 'HOME' || cmd === 'SKIP') {
    return goTo(session, content, cmd === 'MENU' ? 'MAIN' : 'HOME', [u.certSkipped]);
  }
  const name = sanitizeName(text);
  if (!name) return out(session, [u.certNameInvalid]);
  emit('certificateReady', { name, track: cur.track });
  session.cursor = { type: 'home' }; // runtime appends the certificate image next
  return out(session, [fill(u.certGenerating, { name })]);
}

// ── HOME / mission screen ────────────────────────────────────────────────────
function handleHome(session, content, cur, text, cmd) {
  // Back/0 from the mission screen goes up to the main menu (never errors).
  if (cmd === '0' || cmd === 'BACK') {
    return session.track ? goTo(session, content, 'MAIN') : out(session, [renderHome(session, content)]);
  }
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
      return goTo(session, content, 'MAIN'); // main menu (switch track)
    case '4':
      return goTo(session, content, session.track === 'youth' ? 'YOUTH_QUIZ' : 'ADULT_QUIZ');
    case '5':
      return goTo(session, content, 'LANGUAGE');
    case '6':
      return goTo(session, content, `${session.track}.menu`); // browse this track's topics
    default:
      return out(session, [content.strings.unrecognised, renderHome(session, content)]);
  }
}

// ── Menus ──────────────────────────────────────────────────────────────────
function handleMenu(session, content, cur, text, cmd) {
  if (cmd === 'REVIEW') return goTo(session, content, cur.id);
  const node = content.nodes[cur.id];
  if (!node) return goTo(session, content, 'MAIN');
  // Back/0 always goes up one level: module menu → its track menu; track menu → main menu.
  if (cmd === '0' || cmd === 'BACK') return goTo(session, content, menuBack(content, cur.id));
  const option = node.options.find((o) => o.input === text);
  if (!option) return out(session, [content.strings.unrecognised, renderMenu(content, node)]);
  return goTo(session, content, option.next);
}

// The parent of a menu: a module submenu (e.g. youth.foundations) goes up to its
// track menu (youth.menu); a track menu or anything else goes up to the main menu.
function menuBack(content, id) {
  for (const track of ['youth', 'adult']) {
    if (curriculum.modulesForTrack(content, track).some((m) => m.id === id)) return `${track}.menu`;
  }
  return 'MAIN';
}

// ── Lessons (paginated, one bubble per turn) ─────────────────────────────────
function handleLesson(session, content, cur, cmd) {
  const node = content.nodes[cur.id];
  if (!node) return goTo(session, content, 'MAIN');
  // Back → the module menu this lesson belongs to.
  if (cmd === '0' || cmd === 'BACK') return goTo(session, content, node.parent || 'MAIN');

  emit('lessonPage', { lessonId: cur.id });
  const nextIndex = cur.index + 1;
  if (nextIndex >= node.messages.length) {
    return afterLesson(session, content, cur.id);
  }
  session.cursor = { type: 'lesson', id: cur.id, index: nextIndex };
  return out(session, [lessonPage(content, node, nextIndex, cur.id, session.lang)]);
}

// After the last page: run the knowledge check if the lesson has one.
function afterLesson(session, content, lessonId) {
  const check = content.checks && content.checks[lessonId];
  if (check) {
    session.cursor = { type: 'check', lessonId };
    return out(session, [renderCheck(content, check)]);
  }
  return showCompletion(session, content, lessonId);
}

function handleCheck(session, content, cur, cmd) {
  const u = content.strings.ui;
  const check = content.checks[cur.lessonId];
  const keys = Object.keys(check.options);
  if (cmd === 'SKIP') {
    return showCompletion(session, content, cur.lessonId);
  }
  if (!keys.includes(cmd)) {
    return out(session, [content.strings.unrecognised, renderCheck(content, check)]);
  }
  const correct = cmd === check.answer;
  emit('checkAnswered', { lessonId: cur.lessonId, correct });
  const head = correct
    ? fill(u.checkCorrect, { reinforce: check.reinforce })
    : fill(u.checkWrong, { answer: check.answer, reinforce: check.reinforce });
  return showCompletion(session, content, cur.lessonId, [head]);
}

function showCompletion(session, content, lessonId, prefix = []) {
  const node = content.nodes[lessonId];
  emit('lessonCompleted', { lessonId, track: session.track });
  session.cursor = { type: 'completion', lessonId };
  const badge = content.strings.completionBadge.replace('{{lesson}}', node.title);
  return out(session, [...prefix, badge]);
}

function handleCompletion(session, content, cur, text, cmd) {
  const node = content.nodes[cur.lessonId];
  if (text === '1' || cmd === 'NEXT') {
    const dest = nextAfterLesson(content, session.track, cur.lessonId);
    if (dest.kind === 'lesson' || dest.kind === 'menu') return goTo(session, content, dest.id);
    if (dest.kind === 'quiz') {
      return goTo(session, content, session.track === 'youth' ? 'YOUTH_QUIZ' : 'ADULT_QUIZ');
    }
    return goTo(session, content, 'HOME');
  }
  if (text === '0' || cmd === 'BACK') return goTo(session, content, node.parent || 'MAIN');
  const badge = content.strings.completionBadge.replace('{{lesson}}', node.title);
  return out(session, [content.strings.unrecognised, badge]);
}

// Where "Continue" goes after finishing a lesson: the next lesson in the same
// module; or, if that was the module's last lesson, the NEXT module's menu (to
// pick a new topic); or, after the final module, the track quiz.
function nextAfterLesson(content, track, lessonId) {
  const modules = curriculum.modulesForTrack(content, track);
  const mi = modules.findIndex((m) => m.lessonIds.includes(lessonId));
  if (mi === -1) return { kind: 'home' };
  const mod = modules[mi];
  const li = mod.lessonIds.indexOf(lessonId);
  if (li < mod.lessonIds.length - 1) return { kind: 'lesson', id: mod.lessonIds[li + 1] };
  if (mi < modules.length - 1) return { kind: 'menu', id: modules[mi + 1].id };
  return { kind: 'quiz' };
}

// ── Info pages ────────────────────────────────────────────────────────────────
function handleInfo(session, content, cur, text) {
  const node = content.nodes[cur.id];
  if (text === '0' || text.toUpperCase() === 'BACK') return goTo(session, content, (node && node.back) || 'MAIN');
  return out(session, [...node.messages, infoFooter(content)]);
}

// ── Glossary ─────────────────────────────────────────────────────────────────
function handleGlossary(session, content, text) {
  const g = content.glossary;
  if (text === '0' || text.toUpperCase() === 'BACK') return goTo(session, content, g.back || 'MAIN');
  const term = g.terms.find((t) => t.input === text);
  if (!term) return out(session, [content.strings.unrecognised, renderGlossary(g)]);
  return out(session, [`*${term.label}*\n${term.definition}\n\n${content.strings.ui.glossaryMore}`]);
}

// ── Language ─────────────────────────────────────────────────────────────────
function handleLanguageMenu(session, content, text) {
  if (text === '0' || text.toUpperCase() === 'BACK') return goTo(session, content, 'HOME');
  const choice = LANGUAGE_CHOICES.find((c) => c.input === text);
  if (!choice) return out(session, [content.strings.unrecognised, renderLanguageMenu(content)]);
  session.lang = choice.code;
  const c = getContent(session.lang);
  return goTo(session, c, 'HOME', [fill(c.strings.ui.langSet, { name: choice.name })]);
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
function startQuiz(session, content, track) {
  const quiz = content.quizzes[track];
  session.cursor = { type: 'quiz', track, index: 0, score: 0, phase: 'question' };
  return out(session, [quiz.intro, renderQuestion(content, quiz, 0)]);
}

function handleQuiz(session, content, cur, text, cmd) {
  const u = content.strings.ui;
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
        ? fill(u.quizCorrect, { answer: question.answer })
        : fill(u.quizWrong, { answer: question.answer });
      const result = `${head}\n${question.explain}`;
      if (cur.index >= total - 1) return finishQuiz(session, content, cur, quiz, [result]);
      cur.phase = 'continue';
      session.cursor = cur;
      return out(session, [`${result}\n\n${u.quizNext}`]);
    }
    return out(session, [content.strings.unrecognised, renderQuestion(content, quiz, cur.index)]);
  }
  // continue
  if (['YES', 'Y', 'NEXT', '1'].includes(cmd)) return advanceQuiz(session, content, cur, quiz, total, []);
  return out(session, [u.quizContinue]);
}

function advanceQuiz(session, content, cur, quiz, total, prefix) {
  if (cur.index >= total - 1) return finishQuiz(session, content, cur, quiz, prefix);
  cur.index += 1;
  cur.phase = 'question';
  session.cursor = cur;
  return out(session, [...prefix, renderQuestion(content, quiz, cur.index)]);
}

function finishQuiz(session, content, cur, quiz, prefix) {
  const u = content.strings.ui;
  const total = quiz.questions.length;
  const passed = total > 0 && cur.score / total >= PASS_RATIO;
  emit('quizFinished', { track: cur.track, score: cur.score, total, passed });
  const tier = quiz.tiers.find((t) => cur.score >= t.min);
  const summary = [
    u.quizDoneTitle,
    fill(u.quizScore, { score: cur.score, total }),
    '',
    tier ? tier.badge : '',
    '',
    u.quizDoneFooter,
  ].join('\n');
  session.cursor = { type: 'menu', id: quiz.returnTo };
  return out(session, [...prefix, summary]);
}

// ── Navigation helper ────────────────────────────────────────────────────────
function goTo(session, content, target, prefix = []) {
  // Entering a track's menu makes that track the ACTIVE one — so browsing to the
  // other track from the main menu actually switches you there (mission, next
  // lesson, progress, certificate all follow). Progress is stored per lesson id
  // (youth.* vs adult.*), so switching never loses either track's progress.
  if (target === 'youth.menu' || target === 'adult.menu') {
    const t = target.slice(0, target.indexOf('.'));
    if (session.track !== t) {
      session.track = t;
      emit('trackSelected', { track: t });
    }
  }
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
    return out(session, [...prefix, renderLanguageMenu(content)]);
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
    return out(session, [...prefix, lessonPage(content, node, 0, resolvedId, session.lang)]);
  }
  if (node.type === 'info') {
    session.cursor = { type: 'info', id: resolvedId };
    return out(session, [...prefix, ...node.messages, infoFooter(content)]);
  }
  session.cursor = { type: 'home' };
  return out(session, [...prefix, renderHome(session, content)]);
}

// ── Renderers ────────────────────────────────────────────────────────────────
function lname(content, index) {
  const names = content.strings.ui.levelNames || [];
  return names[index] || (LEVELS[index] && LEVELS[index].name) || '';
}

function renderHome(session, content) {
  const u = content.strings.ui;
  const p = CTX.profile || {};
  const points = p.xp || 0;
  const li = levelInfo(points);

  if (!session.track) {
    return [u.chooseWelcome, '', u.choosePrompt, '', u.chooseYouth, u.chooseAdult, u.chooseExplore].join('\n');
  }

  const prog = curriculum.trackProgress(content, session.track, CTX.completed);
  const next = curriculum.nextLesson(content, session.track, CTX.completed);
  const streak = p.streak || 0;
  const streakShort = streak > 0 ? fill(u.streakDays, { n: streak }) : u.streakNone;

  const lines = [u.welcomeBack, ''];
  if (next) {
    lines.push(u.todaysLesson, fill(u.lessonLine, { title: next.title, module: next.module.label }), '');
  } else {
    lines.push(u.todaysLesson, u.trackDone, '');
  }
  // Certificate countdown — a steady motivator toward the Meta certificate.
  const remaining = prog.total - prog.done;
  if (next && remaining > 0) lines.push(fill(u.certCountdown, { n: remaining }), '');
  // Options first so they stay visible (WhatsApp truncates long messages).
  lines.push(
    u.replyNumber,
    next ? u.optStartLesson : u.optStartQuiz,
    u.optProgress,
    u.optBrowse,
    u.optQuiz,
    u.optLanguage,
    u.optMore,
    '',
    fill(u.statLine, { level: lname(content, li.index), points, streak: streakShort, done: prog.done, total: prog.total })
  );
  return lines.join('\n');
}

function renderProgress(session, content) {
  const u = content.strings.ui;
  const p = CTX.profile || {};
  const li = levelInfo(p.xp || 0);
  const prog = curriculum.trackProgress(content, session.track, CTX.completed);
  const lines = [
    u.progTitle,
    '',
    fill(u.progLevel, { level: lname(content, li.index), index: li.index + 1, count: LEVELS.length }),
    li.isMax ? u.progTop : fill(u.progToNext, { n: li.toNext, next: lname(content, li.index + 1) }),
    fill(u.progPoints, { points: p.xp || 0 }),
    fill(u.progStreak, { n: p.streak || 0, best: p.longestStreak || 0 }),
    '',
    fill(u.progLessons, { done: prog.done, total: prog.total }),
  ];
  for (const m of prog.modules) {
    const status = m.complete
      ? u.progModFinished
      : m.done > 0
        ? fill(u.progModPartial, { done: m.done, total: m.total })
        : u.progModNotStarted;
    lines.push(`• ${m.label} — ${status}`);
  }
  lines.push('');
  if (CTX.earnedBadges.length) {
    lines.push(u.progBadgesTitle);
    lines.push(CTX.earnedBadges.map((b) => b.name).join(', '));
  } else {
    lines.push(u.progNoBadges);
  }
  lines.push('', u.progFooter);
  return lines.join('\n');
}

function renderMenu(content, node) {
  const title = node.title ? `*${stripEmoji(node.title).trim()}*` : '';
  const parts = [];
  if (title) parts.push(title);
  if (node.body) parts.push('', node.body);
  // Clean labels: "1️⃣ 🌐 Digital Foundations" → "1  Digital Foundations".
  parts.push('', ...node.options.map((o) => `${o.input}  ${cleanLabel(o.label)}`));
  parts.push('', node.footer || content.strings.menuFooter);
  // `list` lets richer clients (WhatsApp) render a tappable picker instead of a
  // typed number. `body` omits the numbered options — the rows carry them.
  const list = {
    body: [title, node.body || ''].filter(Boolean).join('\n\n') || (node.title || 'Menu'),
    button: content.strings.ui.listButton || 'Select',
    rows: node.options.map((o) => {
      const label = cleanLabel(o.label);
      return { id: o.input, title: label, description: label.length > 24 ? label : undefined };
    }),
  };
  return { text: parts.join('\n'), image: node.image, list };
}

function cleanLabel(label) {
  return stripEmoji(label).replace(/^\d+\s*/, '').trim() || label;
}

// A lesson page may be a plain string (legacy) or a card { text, image }.
function lessonPage(content, node, index, lessonId, lang) {
  const raw = node.messages[index];
  const card = typeof raw === 'string' ? { text: raw } : raw;
  const isLast = index === node.messages.length - 1;
  const nav = isLast ? content.strings.lessonNavLast : content.strings.lessonNav;
  const counter = `(${index + 1} of ${node.messages.length})`;
  const fullText = `${card.text}\n\n${counter} · ${nav}`;
  // Lesson content renders as a branded card image (the hybrid model: cards for
  // lessons, plain tappable text for menus/quizzes). `card` + `caption` let the
  // transport show a short caption under the image, or fall back to `text` when
  // cards are off (lite mode) or media hosting isn't configured.
  const image = lessonId
    ? `/card.jpg?lang=${lang || content.meta?.code || 'en'}&lesson=${encodeURIComponent(lessonId)}&page=${index + 1}`
    : card.image;
  return { text: fullText, image, card: Boolean(lessonId), caption: `${counter} · ${nav}` };
}

function renderCheck(content, check) {
  const u = content.strings.ui;
  const opts = Object.keys(check.options)
    .map((k) => `${k}) ${check.options[k]}`)
    .join('\n');
  return [u.checkTitle, '', check.q, '', opts, '', u.checkFooter].join('\n');
}

function infoFooter(content) {
  return content.strings.ui.infoFooter;
}

function renderQuestion(content, quiz, index) {
  const u = content.strings.ui;
  const q = quiz.questions[index];
  const keys = ['A', 'B', 'C', 'D'].filter((k) => q.options[k] != null);
  const header = fill(u.quizQ, { n: index + 1, total: quiz.questions.length });
  const text = [header, '', q.q, '', keys.map((k) => `${k}) ${q.options[k]}`).join('\n'), '', u.quizFooter].join('\n');
  const list = {
    body: [header, q.q].join('\n\n'),
    button: u.listButton || 'Select',
    rows: keys.map((k) => ({ id: k, title: `${k}) ${q.options[k]}`.slice(0, 24), description: q.options[k].length > 20 ? q.options[k] : undefined })),
  };
  return { text, list };
}

function renderGlossary(g) {
  const list = g.terms.map((t) => `${`${t.input}.`.padEnd(3, ' ')} ${t.label}`).join('\n');
  return `${g.intro}\n\n${list}\n\n0️⃣ Back`;
}

function renderLanguageMenu(content) {
  const u = content.strings.ui;
  return [u.langTitle, u.langPrompt, '1  English', '2  Amharic', '3  Afaan Oromo', '', u.langBack].join('\n');
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
      // 3 tappable reply buttons (the rest of the options stay in the numbered text).
      return [act('▶️ Start', '1'), act('📊 Progress', '2'), act('🏠 Menu', '3')];
    case 'progress':
      return [act('🏠 Menu', 'MENU')];
    case 'menu': {
      const node = content.nodes[cur.id];
      return node ? node.options.map((o) => act(shortLabel(o.label), o.input)) : [];
    }
    case 'lesson':
      return [act('Next ➡️', 'NEXT'), act('🔙 Back', '0'), act('🏠 Menu', 'MENU')];
    case 'check': {
      // A/B/C as tappable reply buttons (SKIP still works if typed).
      const check = content.checks[cur.lessonId];
      return Object.keys(check.options).map((k) => act(k, k));
    }
    case 'completion':
      return [act('➡️ Continue', '1'), act('🔙 Back', '0'), act('🏠 Menu', 'MENU')];
    case 'info':
      return [act('🔙 Back', '0'), act('🏠 Menu', 'MENU')];
    case 'glossary':
      return [act('🔙 Back', '0'), act('🏠 Menu', 'MENU')];
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
    case 'certname':
      return [act('Skip', 'SKIP')];
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
