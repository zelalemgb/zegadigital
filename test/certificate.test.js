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

  // Provide the name → asks to confirm the spelling first (nothing issued yet).
  const confirm = await runtime.processMessage(uid, 'Abebe Bikila');
  assert.match(joined(confirm), /correct|Abebe Bikila/i, 'asks to confirm the name');
  assert.equal(db.getCertificate(uid, 'youth'), null, 'not issued until confirmed');

  // Confirm → certificate issued with an image + verify link.
  const done = await runtime.processMessage(uid, 'YES');
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

test('name-confirmation step: a corrected spelling is re-confirmed, then issued', async () => {
  const uid = 'cert-confirm';
  await onboardYouth(uid);
  completeAllYouthLessons(uid);
  db.logEvent(uid, 'quizFinished', { track: 'youth', passed: true, score: 15, total: 15 });

  await runtime.processMessage(uid, 'CERTIFICATE'); // eligible, no name → asks for name
  // Typo'd name → asks to confirm; nothing issued.
  const c1 = await runtime.processMessage(uid, 'Abebi Bikila');
  assert.match(joined(c1), /Abebi Bikila/, 'echoes the typed name for confirmation');
  assert.equal(db.getCertificate(uid, 'youth'), null);

  // Instead of YES, the learner types the corrected name → re-confirm with the fix.
  const c2 = await runtime.processMessage(uid, 'Abebe Bikila');
  assert.match(joined(c2), /Abebe Bikila/, 're-confirms the corrected name');
  assert.equal(db.getCertificate(uid, 'youth'), null, 'still not issued until YES');

  // Confirm → issued with the corrected spelling.
  const done = await runtime.processMessage(uid, 'YES');
  const cert = db.getCertificate(uid, 'youth');
  assert.ok(cert, 'certificate issued after confirmation');
  assert.equal(cert.name, 'Abebe Bikila', 'uses the corrected name, not the typo');
  assert.ok(images(done).includes(`/cert/${cert.code}.png`));
});

test('progress screen shows a certificate progress bar + remaining count (not eligible)', async () => {
  const uid = 'cert-prog-partial';
  await onboardYouth(uid);
  const r = await runtime.processMessage(uid, '2'); // mission → progress
  assert.match(joined(r), /Your certificate/i);
  assert.match(joined(r), /to go/i, 'shows how many lessons remain');
  assert.ok(!r.actions.some((a) => /certificate/i.test(a.label)), 'no cert button when not eligible');
});

test('progress screen shows "ready" + a Get-certificate button when eligible', async () => {
  const uid = 'cert-prog-ready';
  await onboardYouth(uid);
  completeAllYouthLessons(uid);
  db.logEvent(uid, 'quizFinished', { track: 'youth', passed: true, score: 15, total: 15 });
  const r = await runtime.processMessage(uid, '2'); // first progress view → eligible
  assert.match(joined(r), /ready/i);
  assert.ok(r.actions.some((a) => /certificate/i.test(a.label)), 'shows Get certificate when eligible');
});

test('Progress & certificate is reachable from the mid-lesson main menu (reply "3")', async () => {
  const uid = 'cert-menu-progress';
  await onboardYouth(uid);
  // Mid-flow, a learner replies MENU to open the top-level main menu…
  const menu = await runtime.processMessage(uid, 'MENU');
  assert.match(joined(menu), /Progress & certificate/, 'main menu lists the new option');
  // …and option 3 opens the progress & certificate screen.
  const prog = await runtime.processMessage(uid, '3');
  assert.match(joined(prog), /Your certificate/i, 'option 3 opens the progress screen');
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
