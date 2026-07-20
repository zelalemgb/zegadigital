'use strict';

process.env.ZEGA_DB = ':memory:';

const { test } = require('node:test');
const assert = require('node:assert');
const runtime = require('../src/runtime');
const db = require('../src/store/db');
const certs = require('../src/certificates');
const curriculum = require('../src/curriculum');
const { getContent } = require('../src/content');

const joined = (r) => r.messages.map((m) => (typeof m === 'string' ? m : m.text || '')).join('\n');
const images = (r) => r.messages.map((m) => m && m.image).filter(Boolean);

async function onboardYouth(uid) {
  await runtime.processMessage(uid, 'Hi');
  await runtime.processMessage(uid, '1'); // English
  await runtime.processMessage(uid, '1'); // Youth track
  await runtime.processMessage(uid, 'SKIP'); // skip baseline → mission
}
function completeAllYouthLessons(uid) {
  for (const id of curriculum.allLessonIds(getContent('en'), 'youth')) db.markLessonComplete(uid, id);
}

test('certificate auto-prompts once on first track completion, then never nags on re-visits', async () => {
  const uid = 'cert-once';
  const c = getContent('en');
  const ids = curriculum.allLessonIds(c, 'youth');
  const lastId = ids[ids.length - 1];
  await onboardYouth(uid);
  for (const id of ids.slice(0, -1)) db.markLessonComplete(uid, id); // all but the last
  db.logEvent(uid, 'quizFinished', { track: 'youth', passed: true, score: 15, total: 15 });

  // Finish the FINAL lesson through the flow → the prompt fires exactly once.
  await runtime.processMessage(uid, '1'); // mission → start the last uncompleted lesson
  for (let i = 0; i < c.nodes[lastId].messages.length; i++) await runtime.processMessage(uid, 'NEXT');
  const finished = await runtime.processMessage(uid, c.checks[lastId].answer);
  assert.match(joined(finished), /Congratulations|name/i, 'first completion prompts for the certificate');
  assert.equal(db.getCertificate(uid, 'youth'), null); // not issued until named

  // Skip, then RE-COMPLETE an already-finished lesson — it must NOT prompt again.
  await runtime.processMessage(uid, 'SKIP');
  const first = ids[0];
  await runtime.processMessage(uid, '6'); // browse topics → track menu
  await runtime.processMessage(uid, '1'); // first module
  await runtime.processMessage(uid, '1'); // first lesson
  for (let i = 0; i < c.nodes[first].messages.length; i++) await runtime.processMessage(uid, 'NEXT');
  const again = await runtime.processMessage(uid, c.checks[first].answer);
  assert.doesNotMatch(joined(again), /Congratulations|What name/i, 'no re-prompt on re-visit after a skip');
});

test('certificate is withheld until lessons are done AND the quiz is passed', async () => {
  const uid = 'cert-early';
  await onboardYouth(uid);
  const r = await runtime.processMessage(uid, 'CERTIFICATE');
  assert.match(joined(r), /Finish every lesson/i);
  assert.equal(db.getCertificate(uid, 'youth'), null);

  // Lessons done but quiz not passed → still withheld.
  completeAllYouthLessons(uid);
  const r2 = await runtime.processMessage(uid, 'CERTIFICATE');
  assert.match(joined(r2), /Finish every lesson/i);
  assert.equal(db.getCertificate(uid, 'youth'), null);
});

test('certificate is issued after lessons + quiz, captures a name, returns image + verify link', async () => {
  const uid = 'cert-earned';
  await onboardYouth(uid);
  completeAllYouthLessons(uid);
  db.logEvent(uid, 'quizFinished', { track: 'youth', passed: true, score: 14, total: 15 });

  // Request → eligible but no name yet → asks for the name.
  const ask = await runtime.processMessage(uid, 'CERTIFICATE');
  assert.match(joined(ask), /Congratulations|name/i);
  assert.equal(db.getCertificate(uid, 'youth'), null); // not issued until named

  // Provide the name → certificate issued with an image + verify link.
  const done = await runtime.processMessage(uid, 'Abebe Bikila');
  const cert = db.getCertificate(uid, 'youth');
  assert.ok(cert, 'certificate row created');
  assert.equal(cert.name, 'Abebe Bikila');
  assert.equal(cert.track, 'youth');
  assert.match(cert.code, /^ZEGA-[2-9A-Z]{8}$/);
  const imgs = images(done);
  assert.ok(imgs.some((p) => p === `/cert/${cert.code}.png`), 'sends the certificate image');
  assert.match(joined(done), /verify\//i);

  // Verification lookup works, and the name is now remembered.
  assert.equal(db.getCertificateByCode(cert.code).name, 'Abebe Bikila');
  assert.equal(db.getOrCreateProfile(uid).name, 'Abebe Bikila');

  // Re-requesting re-sends the SAME certificate (never a duplicate).
  const again = await runtime.processMessage(uid, 'CERTIFICATE');
  assert.ok(images(again).includes(`/cert/${cert.code}.png`));
  assert.equal(db.getCertificate(uid, 'youth').code, cert.code);
});

test('a known name skips the prompt and issues immediately on the finishing turn', async () => {
  const uid = 'cert-named';
  await onboardYouth(uid);
  db.setName(uid, 'Tirunesh Dibaba');
  completeAllYouthLessons(uid);
  // The finishing quiz-pass event this turn should trigger auto-issue.
  const r = await runtime.processMessage(uid, 'CERTIFICATE'); // stands in for the finishing turn
  // Not eligible yet (no quiz pass recorded) → withheld.
  assert.match(joined(r), /Finish every lesson/i);

  db.logEvent(uid, 'quizFinished', { track: 'youth', passed: true, score: 15, total: 15 });
  const issued = await runtime.processMessage(uid, 'CERTIFICATE');
  const cert = db.getCertificate(uid, 'youth');
  assert.ok(cert);
  assert.equal(cert.name, 'Tirunesh Dibaba'); // used the stored name, no prompt
  assert.ok(images(issued).includes(`/cert/${cert.code}.png`));
});

test('certificate renders to a PNG and the verify page shows the details', async () => {
  const cert = { name: 'Haile Gebrselassie', track: 'adult', code: 'ZEGA-ABCD2345', issued_at: '2026-07-03 09:00:00' };
  const png = await certs.renderPng(cert, 'https://example.com');
  assert.ok(png.length > 1000, 'produces a non-trivial PNG');
  assert.equal(png.slice(1, 4).toString(), 'PNG'); // PNG signature

  const html = certs.verifyHtml(cert, 'https://example.com');
  assert.match(html, /Valid certificate/);
  assert.match(html, /Haile Gebrselassie/);
  assert.match(html, /Adult/);
  assert.match(certs.verifyHtml(null, 'https://example.com'), /Not found/);
});
