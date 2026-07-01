'use strict';

/**
 * Generate the PWA app icons and raster logos from the ZEGA brand SVGs.
 * The square mark (public/img/zega-mark.svg) becomes the app/favicon icons;
 * the full lockup (public/img/zega-logo.svg) is rasterised to PNG so it renders
 * identically everywhere regardless of the viewer's installed fonts.
 * Rasterised with sharp. Run: node scripts/make_pwa_icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG = path.join(__dirname, '..', 'public', 'img');
const OUT = path.join(__dirname, '..', 'public', 'pwa');
fs.mkdirSync(OUT, { recursive: true });

const markSvg = fs.readFileSync(path.join(IMG, 'zega-mark.svg'));
// "any" icon: rounded corners baked in via a mask.
const rounded = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="112" fill="#fff"/></svg>'
);

(async () => {
  // Render the 512px mark once, then derive rounded ("any") and full ("maskable") bases.
  const square = await sharp(markSvg).resize(512, 512).png().toBuffer();
  const round = await sharp(square).composite([{ input: rounded, blend: 'dest-in' }]).png().toBuffer();

  async function out(base, size, name) {
    await sharp(base).resize(size, size).png().toFile(path.join(OUT, name));
    console.log('  wrote', name, `(${size}px)`);
  }
  await out(round, 512, 'icon-512.png');
  await out(round, 192, 'icon-192.png');
  await out(round, 180, 'apple-touch-icon.png');
  await out(round, 32, 'favicon-32.png');
  await out(square, 512, 'icon-maskable-512.png'); // full-bleed, no rounding

  // Raster logos (fonts baked in) for the page. @2x for crispness.
  await sharp(path.join(IMG, 'zega-logo.svg')).resize(1400, 800).png()
    .toFile(path.join(IMG, 'zega-logo.png'));
  console.log('  wrote img/zega-logo.png (1400×800)');

  console.log('PWA icons + logo generated.');
})();
