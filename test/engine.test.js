'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { handle, freshSession } = require('../src/engine/engine');
const { getContent } = require('../src/content');

// Drive a sequence of inputs through the pure engine (no persistence).
function run(inputs, ctx) {
  let session = freshSession();
  let result = { session, messages: [], events: [], actions: [] };
  for (const input of inputs) result = handle(result.session, input, ctx);
  return result;
}
const joined = (r) => r.messages.map((m) => (typeof m === 'string' ? m : m.text || '')).join('\n');

test('first contact shows onboarding with language choices', () => {
  const r = run(['Hi']);
  assert.match(joined(r), /Welcome to Zega Digital/);
  assert.match(joined(r), /English/);
  assert.ok(r.session.awaitingLanguage);
});

test('choosing a language lands on the mission home (track chooser)', () => {
  const r = run(['Hi', '1']);
  assert.match(joined(r), /who is this for/i);
  assert.equal(r.session.cursor.type, 'home');
  assert.equal(r.session.track, null);
});

// baselineDone:true skips the baseline-assessment offer that now appears after
// track selection, so these flow tests focus on lessons/quizzes.
const READY = { baselineDone: true };

test('selecting a track shows the mission with the next lesson', () => {
  const r = run(['Hi', '1', '1'], READY); // English, Youth
  assert.equal(r.session.track, 'youth');
  assert.match(joined(r), /Today's lesson/);
  assert.match(joined(r), /Introduction to Privacy/);
  assert.match(joined(r), /Reply with a number/);
  // The track-selected event is emitted for the runtime to persist.
  assert.ok(run(['Hi', '1', '1'], READY).events.some((e) => e.type === 'trackSelected'));
});

test('selecting a track offers the baseline assessment first', () => {
  const r = run(['Hi', '1', '1']); // no READY → baseline not yet done
  assert.equal(r.session.cursor.type, 'assessment-offer');
  assert.match(joined(r), /starting check/i);
});

test('mission "1" starts the next lesson directly', () => {
  const r = run(['Hi', '1', '1', '1'], READY);
  assert.equal(r.session.cursor.type, 'lesson');
  assert.equal(r.session.cursor.id, 'youth.foundations.privacy-intro');
  assert.match(joined(r), /Privacy = control/);
  assert.ok(r.messages.some((m) => m.image), 'lesson card carries an image');
});

test('a lesson runs to its knowledge check, then completion emits lessonCompleted', () => {
  const node = getContent('en').nodes['youth.foundations.privacy-intro'];
  let session = run(['Hi', '1', '1', '1'], READY).session; // page 0 showing
  let r;
  // Advance through remaining pages until the check appears.
  for (let i = 0; i < node.messages.length; i++) r = handle(session, 'NEXT'), (session = r.session);
  assert.equal(session.cursor.type, 'check');
  assert.match(joined(r), /Quick check/);
  // Answer the check correctly → completion + events.
  const check = getContent('en').checks['youth.foundations.privacy-intro'];
  const done = handle(session, check.answer);
  assert.equal(done.session.cursor.type, 'completion');
  assert.ok(done.events.some((e) => e.type === 'checkAnswered' && e.correct));
  assert.ok(done.events.some((e) => e.type === 'lessonCompleted'));
});

test('quiz completion emits quizFinished with score and pass flag', () => {
  let session = run(['Hi', '1', '1'], READY).session; // mission
  let r = handle(session, '4'); // Quiz
  session = r.session;
  const quiz = getContent('en').quizzes.youth;
  for (let i = 0; i < quiz.questions.length; i++) {
    r = handle(session, quiz.questions[i].answer);
    session = r.session;
    if (i < quiz.questions.length - 1) { r = handle(session, 'YES'); session = r.session; }
  }
  const ev = r.events.find((e) => e.type === 'quizFinished');
  assert.ok(ev);
  assert.equal(ev.score, quiz.questions.length);
  assert.equal(ev.passed, true);
});

test('PROGRESS and LANGUAGE work as jump-anywhere shortcuts', () => {
  // Start a lesson, then jump to progress and to the language menu mid-lesson.
  const prog = run(['Hi', '1', '1', '1', 'PROGRESS'], READY);
  assert.equal(prog.session.cursor.type, 'progress');
  assert.match(joined(prog), /Your progress/);

  const lang = run(['Hi', '1', '1', '1', 'LANGUAGE'], READY);
  assert.equal(lang.session.cursor.type, 'language');
  assert.match(joined(lang), /Choose your language/i);
});

test('MENU opens the main menu; HOME returns to the mission; STOP remembers the track', () => {
  const menu = run(['Hi', '1', '1', '1', 'MENU']);
  assert.equal(menu.session.cursor.type, 'menu');
  assert.equal(menu.session.cursor.id, 'MAIN');
  const home = run(['Hi', '1', '1', '1', 'HOME']);
  assert.equal(home.session.cursor.type, 'home'); // mission screen
  const stop = run(['Hi', '1', '1', 'STOP']);
  assert.match(joined(stop), /Thanks for using/);
  assert.equal(stop.session.started, false);
  assert.equal(stop.session.track, 'youth'); // remembered
});

// ── Navigation hierarchy (0 / BACK, MENU, next-module, mission option 3) ──────
const toMission = ['Hi', '1', '1', 'SKIP']; // English → Youth → skip baseline → mission

test('0 / BACK climbs exactly one level: lesson → module → track → main menu', () => {
  // mission → track topics (6) → Digital Foundations (1) → a lesson (1)
  const atLesson = run([...toMission, '6', '1', '1']);
  assert.equal(atLesson.session.cursor.type, 'lesson');

  const toModule = run([...toMission, '6', '1', '1', '0']);
  assert.equal(toModule.session.cursor.id, 'youth.foundations'); // lesson → its module

  const toTrack = run([...toMission, '6', '1', '1', '0', 'BACK']);
  assert.equal(toTrack.session.cursor.id, 'youth.menu'); // module → its track

  const toMain = run([...toMission, '6', '1', '1', '0', 'BACK', '0']);
  assert.equal(toMain.session.cursor.id, 'MAIN'); // track → main menu
});

test('0 on the mission screen opens the main menu instead of erroring', () => {
  const r = run([...toMission, '0']);
  assert.equal(r.session.cursor.type, 'menu');
  assert.equal(r.session.cursor.id, 'MAIN');
});

test('mission option 3 opens the main menu (to switch track)', () => {
  const r = run([...toMission, '3']);
  assert.equal(r.session.cursor.id, 'MAIN');
});

test("Continue after a module's last lesson goes to the NEXT module's menu", () => {
  const content = getContent('en');
  const lastId = 'youth.foundations.cyber'; // last lesson of Digital Foundations
  const pages = content.nodes[lastId].messages.length;
  const answer = content.checks[lastId].answer;
  // mission → track topics (6) → Foundations (1) → Cyber (4), read it, answer, Continue (1)
  const r = run([...toMission, '6', '1', '4', ...Array(pages).fill('NEXT'), answer, '1']);
  assert.equal(r.session.cursor.type, 'menu');
  assert.equal(r.session.cursor.id, 'youth.wellness'); // next module, not the finished one
});

test('every menu option points to a resolvable target', () => {
  const content = getContent('en');
  const specials = new Set(['HOME', 'MAIN', 'LANGUAGE', 'GLOSSARY', 'EXIT', 'YOUTH_QUIZ', 'ADULT_QUIZ']);
  for (const [id, node] of Object.entries(content.nodes)) {
    if (node.type !== 'menu') continue;
    for (const opt of node.options) {
      const ok = specials.has(opt.next) || Boolean(content.nodes[opt.next]);
      assert.ok(ok, `Menu "${id}" option ${opt.input} → unknown target "${opt.next}"`);
    }
  }
});

test('every lesson parent/next points to a real node, and every check key is a lesson', () => {
  const content = getContent('en');
  for (const [id, node] of Object.entries(content.nodes)) {
    if (node.type !== 'lesson') continue;
    assert.ok(content.nodes[node.parent], `Lesson "${id}" bad parent "${node.parent}"`);
    if (node.next) assert.ok(content.nodes[node.next], `Lesson "${id}" bad next "${node.next}"`);
  }
  for (const lessonId of Object.keys(content.checks)) {
    const n = content.nodes[lessonId];
    assert.ok(n && n.type === 'lesson', `Check key "${lessonId}" is not a lesson node`);
  }
});
