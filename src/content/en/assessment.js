'use strict';

/**
 * Diagnostic assessment items, one short set per track. The SAME items are used
 * for the baseline (start) and endline (finish) checks so we can measure each
 * learner's *gain* (endline % − baseline %). Kept short (5 items) to minimise
 * drop-off. No per-question feedback is shown — this is measurement, not a quiz.
 */

const youth = [
  {
    q: "What does 'privacy' mean online?",
    options: { A: 'Keeping everything secret', B: 'Controlling what others know about you', C: 'Never posting', D: 'Only sharing with family' },
    answer: 'B',
  },
  {
    q: 'Which is the strongest password?',
    options: { A: 'Kebede2008', B: 'password123', C: 'Mango-River-Blue-Star9!', D: '123456' },
    answer: 'C',
  },
  {
    q: "A message says 'Verify your password NOW or lose your account.' You should…",
    options: { A: 'Click the link', B: 'Reply with your password', C: 'Ignore/delete — it’s phishing', D: 'Forward to friends' },
    answer: 'C',
  },
  {
    q: 'A social media algorithm decides…',
    options: { A: 'Your password', B: 'What appears in your feed from your behaviour', C: 'Who your friends are', D: 'Your screen time limit' },
    answer: 'B',
  },
  {
    q: 'A free AI app asks to read your SMS messages. You should…',
    options: { A: 'Allow it', B: 'Deny — it doesn’t match the app’s purpose', C: 'Allow if a friend uses it', D: 'Share contacts too' },
    answer: 'B',
  },
];

const adult = [
  {
    q: "What is 'confirmation bias'?",
    options: { A: 'A login feature', B: 'Seeking info that supports what you already believe', C: 'A cyber-attack', D: 'An algorithm setting' },
    answer: 'B',
  },
  {
    q: 'Which is Personally Identifiable Information (PII)?',
    options: { A: 'Your favourite colour', B: 'A sunset photo', C: 'Your government ID number', D: 'A book title' },
    answer: 'C',
  },
  {
    q: 'Why avoid online banking on public Wi-Fi?',
    options: { A: 'It’s slow', B: 'Banks block it', C: 'Others on the network may intercept your data', D: 'It drains battery' },
    answer: 'C',
  },
  {
    q: 'Your card is frozen after an unusual transaction alert. Most likely cause?',
    options: { A: 'A staff member watching you', B: 'AI fraud detection spotting unusual patterns', C: 'Government monitoring', D: 'A random setting' },
    answer: 'B',
  },
  {
    q: 'A voice note sounds like your cousin asking urgently for money. First action?',
    options: { A: 'Send the money', B: 'Do nothing', C: 'Call them on their known number to verify', D: 'Forward to family' },
    answer: 'C',
  },
];

module.exports = { youth, adult };
