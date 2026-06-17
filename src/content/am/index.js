'use strict';

/**
 * Amharic (አማርኛ) content pack — PLACEHOLDER / TODO.
 *
 * The i18n system deep-merges this object over the English pack, so anything
 * you provide here overrides English and anything you omit falls back to it.
 * That means the bot already works end-to-end in "Amharic" today (it just shows
 * English text) and you can translate incrementally — one string, node, term,
 * or quiz question at a time — without breaking anything.
 *
 * HOW TO TRANSLATE
 * ----------------
 * Mirror the shape of ../en/*.js. A few examples:
 *
 *   strings: {
 *     onboarding: '👋 ወደ ዜጋ ዲጂታል እንኳን በደህና መጡ! ...',
 *     menuFooter: 'እባክዎ የመረጡትን ቁጥር ይላኩ።',
 *   },
 *
 *   nodes: {
 *     'youth.menu': {
 *       title: '🧒 የወጣቶች ክፍል',
 *       body: '...',
 *       options: [
 *         { input: '1', label: '1️⃣ 🌐 ዲጂታል መሰረታዊ ነገሮች', next: 'youth.foundations' },
 *         // ...keep `input` and `next` identical to English; translate only `label`.
 *       ],
 *     },
 *   },
 *
 *   // Lesson bodies are arrays of message strings, in the same order as English:
 *   // 'youth.foundations.passwords': { messages: ['💡 ...', '🔐 ...'] },
 *
 *   glossary: { terms: [{ input: '1', label: 'አልጎሪዝም', definition: '...' }, ...] },
 *   quizzes: { youth: { questions: [{ q: '...', options:{A:'...'}, explain:'...' }] } },
 *
 * Keep every `input` / `next` / `answer` key EXACTLY as in English — translate
 * only the human-readable text. Mismatched keys break navigation.
 */

module.exports = {
  meta: { code: 'am', name: 'Amharic', complete: false },
  // strings: {},
  // nodes: {},
  // glossary: {},
  // quizzes: {},
};
