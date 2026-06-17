'use strict';

/**
 * English content pack — fully populated. This is the canonical content and the
 * fallback for any language whose translation is incomplete (see content/index.js).
 */

const system = require('./system');
const youth = require('./youth');
const adult = require('./adult');
const quiz = require('./quiz');
const checks = require('./checks');
const assessments = require('./assessment');

module.exports = {
  meta: { code: 'en', name: 'English', complete: true },
  strings: system.strings,
  glossary: system.glossary,
  quizzes: quiz,
  checks,
  assessments,
  // All addressable menu / lesson / info nodes, keyed by id.
  nodes: {
    ...system.nodes,
    ...youth,
    ...adult,
  },
};
