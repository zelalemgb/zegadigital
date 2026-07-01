'use strict';

/**
 * Text helpers.
 *
 * stripEmoji() removes emoji, variation selectors, ZWJ and keycap marks from a
 * string and tidies the whitespace left behind. We keep emoji in the CONTENT
 * source (so the browser tester can render them as clean custom icons), but send
 * WhatsApp plain, emoji-free text — WhatsApp can't render custom icons inline,
 * so clean text reads best there.
 */

// Covers the common emoji + symbol/arrow/dingbat ranges, plus modifiers.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}\u{24C2}\u{25AA}-\u{25FE}]/gu;

function stripEmoji(text) {
  if (!text) return text;
  return text
    .replace(EMOJI_RE, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([·|])/g, ' $1').trimEnd())
    // keep intentional two-space number gaps like "1  Start" → collapse to "1 "? no:
    .map((line) => line.replace(/^\s+/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { stripEmoji };
