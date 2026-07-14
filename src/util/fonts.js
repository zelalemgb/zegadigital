'use strict';

/**
 * Point fontconfig at our bundled fonts BEFORE sharp/librsvg first renders.
 *
 * Render's Linux box ships no Ethiopic font, so Amharic / Afaan Oromo lesson
 * cards would render as empty boxes. We vendor DejaVu Sans (Latin) and Noto
 * Sans Ethiopic under assets/fonts and hand fontconfig a config that maps
 * `sans-serif` onto them. Setting FONTCONFIG_FILE here — at require time, from
 * the process entry point — guarantees it's in place before the first render.
 *
 * macOS builds of sharp ignore this and use system fonts (which already cover
 * both scripts), so this is a no-op locally and the real fix on deploy.
 */

const path = require('path');
const fs = require('fs');

function configure() {
  const confPath = path.resolve(__dirname, '../../assets/fonts/fonts.conf');
  if (!fs.existsSync(confPath)) {
    console.warn('fonts: bundled fonts.conf not found at', confPath);
    return;
  }
  // Only set if the host hasn't already provided its own fontconfig setup.
  if (!process.env.FONTCONFIG_FILE) process.env.FONTCONFIG_FILE = confPath;
  if (!process.env.FONTCONFIG_PATH) {
    process.env.FONTCONFIG_PATH = path.dirname(confPath);
  }
}

module.exports = { configure };
