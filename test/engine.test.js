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

test('MENU returns home; STOP exits but remembers the track', () => {
  const menu = run(['Hi', '1', '1', '1', 'MENU']);
  assert.equal(menu.session.cursor.type, 'home');
  const stop = run(['Hi', '1', '1', 'STOP']);
  assert.match(joined(stop), /Thanks for using/);
  assert.equal(stop.session.started, false);
  assert.equal(stop.session.track, 'youth'); // remembered
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
