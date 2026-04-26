// Regenerate static PNG assets (OG card + PWA icons) from inline SVG
// templates. Run with `bun scripts/gen-images.ts`. Outputs land in public/.

import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

const goldBlock = (size: number, padding = 0) => {
  const inner = size - padding * 2;
  const scale = inner / 64;
  return `
    <g transform="translate(${padding}, ${padding}) scale(${scale})">
      <rect x="2" y="6" width="60" height="58" rx="11" fill="#D97706"/>
      <rect x="2" y="2" width="60" height="58" rx="11" fill="#F59E0B"/>
      <g fill="#FCD34D">
        <circle cx="14.7" cy="13.7" r="5.5"/>
        <circle cx="32"   cy="13.7" r="5.5"/>
        <circle cx="49.3" cy="13.7" r="5.5"/>
        <circle cx="14.7" cy="31"   r="5.5"/>
        <circle cx="32"   cy="31"   r="5.5"/>
        <circle cx="49.3" cy="31"   r="5.5"/>
        <circle cx="14.7" cy="48.3" r="5.5"/>
        <circle cx="32"   cy="48.3" r="5.5"/>
        <circle cx="49.3" cy="48.3" r="5.5"/>
      </g>
    </g>`;
};

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="35%" cy="25%" r="85%">
      <stop offset="0%"  stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="#F59E0B"/>
      <stop offset="60%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <filter id="blockShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="32" stdDeviation="36" flood-color="#F59E0B" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle background blocks (decorative) -->
  <g opacity="0.07">
    <g transform="translate(940, -60) rotate(20)">${goldBlock(220)}</g>
    <g transform="translate(50, 480) rotate(-12)">${goldBlock(160)}</g>
  </g>

  <!-- Hero gold block -->
  <g transform="translate(120, 195)" filter="url(#blockShadow)">${goldBlock(240)}</g>

  <!-- Title -->
  <text
    x="420" y="335"
    font-family="-apple-system, system-ui, 'Segoe UI', sans-serif"
    font-size="128" font-weight="800" letter-spacing="-3"
    fill="url(#title)"
  >Blockene</text>

  <!-- Tagline -->
  <text
    x="424" y="395"
    font-family="-apple-system, system-ui, 'Segoe UI', sans-serif"
    font-size="30" font-weight="600" letter-spacing="7"
    fill="#94A3B8"
  >SLIDE · MATCH · ESCAPE</text>
</svg>`.trim();

const pwaIconSvg = (size: number, mask = false) => {
  const padding = mask ? Math.round(size * 0.12) : 0;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${mask ? `<rect width="${size}" height="${size}" fill="#0F172A"/>` : ''}
  ${goldBlock(size - padding * 2, padding)}
</svg>`.trim();
};

async function write(svg: string, file: string, w: number, h: number) {
  const out = resolve(PUBLIC, file);
  await sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  wrote ${file}  (${w}×${h})`);
}

await mkdir(PUBLIC, { recursive: true });
console.log('Generating images…');
await write(ogSvg, 'og.png', 1200, 630);
await write(pwaIconSvg(192), 'icon-192.png', 192, 192);
await write(pwaIconSvg(512), 'icon-512.png', 512, 512);
await write(pwaIconSvg(512, true), 'icon-512-maskable.png', 512, 512);
await write(pwaIconSvg(180), 'apple-touch-icon.png', 180, 180);
console.log('Done.');
