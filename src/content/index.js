'use strict';

/**
 * Content loader + i18n fallback.
 *
 * English is the canonical pack. Each other language pack is deep-merged OVER
 * English, so untranslated keys automatically fall back to English. This lets
 * the three-language menu work end-to-end immediately while translations are
 * filled in incrementally.
 */

const en = require('./en');
const am = require('./am');
const om = require('./om');

const PACKS = { en, am, om };

/**
 * Deep-merge `override` onto a structural clone of `base`.
 * - Plain objects merge key-by-key (recursively).
 * - Arrays merge element-by-element by index: an object element is deep-merged
 *   over the base element; a primitive element replaces it; missing indices keep
 *   the base value. This means a translator can override a single option label
 *   or quiz question without re-supplying the whole array.
 */
function deepMerge(base, override) {
  if (override === undefined) return clone(base);
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) return clone(override);
    // Same length → element-wise merge (translate a label, keep input/next).
    // Different length → the override is a complete replacement (e.g. a
    // translated quiz with a different number of questions than English).
    if (base.length !== override.length) return clone(override);
    return base.map((item, i) => deepMerge(item, override[i]));
  }
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return clone(override);
    const out = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(override)])) {
      out[key] = key in override ? deepMerge(base[key], override[key]) : clone(base[key]);
    }
    return out;
  }
  // base is primitive
  return override === undefined ? base : clone(override);
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function clone(v) {
  if (Array.isArray(v)) return v.map(clone);
  if (isPlainObject(v)) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = clone(v[k]);
    return out;
  }
  return v;
}

// Build the merged content for each language once, at load time.
const RESOLVED = {};
for (const [code, pack] of Object.entries(PACKS)) {
  RESOLVED[code] = code === 'en' ? clone(en) : deepMerge(en, pack);
}

/** Languages offered in the onboarding menu, keyed by the digit the user types. */
const LANGUAGE_CHOICES = [
  { input: '1', code: 'en', name: 'English' },
  { input: '2', code: 'am', name: 'Amharic' },
  { input: '3', code: 'om', name: 'Afaan Oromo' },
];

function getContent(lang) {
  return RESOLVED[lang] || RESOLVED.en;
}

module.exports = { getContent, LANGUAGE_CHOICES, PACKS };
