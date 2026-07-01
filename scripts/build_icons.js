#!/usr/bin/env node
'use strict';

/**
 * Build public/icons.svg — the tester's icon sprite — from the open-source
 * Lucide icon set (MIT). Run after `npm i lucide-static --no-save`:
 *   node scripts/build_icons.js
 *
 * Keeps the same `ic-<name>` symbol ids the tester already maps emoji to, so no
 * front-end change is needed.
 */

const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const OUT = path.join(__dirname, '..', 'public', 'icons.svg');

// ic-<id>  ->  Lucide file name(s) (first that exists wins)
const MAP = {
  home: 'home', list: 'list', 'arrow-right': 'arrow-right', 'arrow-left': 'arrow-left',
  x: 'x', check: 'check', user: 'user', users: 'users', lock: 'lock', key: 'key',
  shield: 'shield', 'shield-check': 'shield-check', warning: ['triangle-alert', 'alert-triangle'],
  hook: 'fish', bulb: 'lightbulb', compass: 'compass', globe: 'globe', info: 'info',
  book: 'book-open', help: ['life-buoy', 'lifebuoy'], heart: 'heart', screen: 'monitor',
  robot: 'bot', quiz: ['circle-help', 'help-circle'], star: 'star', flame: 'flame',
  award: 'award', sprout: 'sprout', 'trending-up': 'trending-up',
  chart: ['chart-column', 'bar-chart-3', 'bar-chart'], bell: 'bell', 'bell-off': 'bell-off',
  target: 'target', pin: 'map-pin', eye: 'eye', ban: 'ban', flag: 'flag', clock: 'clock',
  chat: 'message-circle', search: 'search', gear: 'settings', cookie: 'cookie',
  phone: 'smartphone', id: ['id-card', 'contact'], camera: 'camera', play: 'play',
  write: ['pencil', 'pen-line'], celebrate: ['party-popper', 'party'], rocket: 'rocket',
  wave: 'hand',
};

function read(names) {
  for (const n of [].concat(names)) {
    const p = path.join(ICON_DIR, `${n}.svg`);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
}

// Extract the inner drawing elements from a Lucide <svg> file.
function inner(svg) {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();
}

const symbols = [];
const missing = [];
for (const [id, names] of Object.entries(MAP)) {
  const svg = read(names);
  if (!svg) { missing.push(id); continue; }
  symbols.push(`  <symbol id="ic-${id}" viewBox="0 0 24 24">${inner(svg)}</symbol>`);
}

const out = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <defs>
    <style>
      symbol { stroke: currentColor; stroke-width: 1.9; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      symbol .f { fill: currentColor; stroke: none; }
    </style>
  </defs>
${symbols.join('\n')}
</svg>
`;

fs.writeFileSync(OUT, out);
console.log(`Wrote ${symbols.length} Lucide icons → ${path.relative(process.cwd(), OUT)}`);
if (missing.length) console.log('Missing (kept none):', missing.join(', '));
