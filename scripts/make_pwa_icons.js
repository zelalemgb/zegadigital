'use strict';

/**
 * Generate the PWA app icons for the public landing page from an inline SVG
 * brand mark (a chat bubble with a learning "spark" — the bot teaches inside
 * WhatsApp). Rasterised with sharp. Run: node scripts/make_pwa_icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'pwa');
fs.mkdirSync(OUT, { recursive: true });

// The mark: white speech bubble + indigo spark, on an indigo→violet gradient.
const bubbleAndSpark = `
  <rect x="136" y="140" width="240" height="168" rx="46" fill="#ffffff"/>
  <path d="M196 306 L180 356 L246 304 Z" fill="#ffffff"/>
  <path d="M256 160 Q268 212 320 224 Q268 236 256 288 Q244 236 192 224 Q244 212 256 160 Z" fill="#4f46e5"/>
  <path d="M334 128 Q340 148 360 154 Q340 160 334 180 Q328 160 308 154 Q328 148 334 128 Z" fill="#7c3aed"/>
`;

const gradient = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>`;

// "any" icon: rounded square, content with a little breathing room.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${gradient}
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${bubbleAndSpark}
</svg>`;

// "maskable" icon: full-bleed background, content pulled into the ~80% safe zone.
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${gradient}
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">${bubbleAndSpark}</g>
</svg>`;

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, name));
  console.log('  wrote', name, `(${size}px)`);
}

(async () => {
  fs.writeFileSync(path.join(OUT, 'icon.svg'), anySvg); // scalable "any" icon
  await png(anySvg, 192, 'icon-192.png');
  await png(anySvg, 512, 'icon-512.png');
  await png(anySvg, 180, 'apple-touch-icon.png');
  await png(anySvg, 32, 'favicon-32.png');
  await png(maskSvg, 512, 'icon-maskable-512.png');
  console.log('PWA icons generated in public/pwa/');
})();
