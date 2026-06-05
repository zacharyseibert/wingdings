import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '../mobile/assets');

const EMOJI_URL = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/1f357.svg';

async function fetchEmoji() {
  const res = await fetch(EMOJI_URL);
  if (!res.ok) throw new Error(`Failed to fetch emoji: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function backgroundSvg(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2A1A10"/>
        <stop offset="100%" stop-color="#1A0F0A"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  </svg>`;
}

async function makeIcon(emojiSvg, size, emojiPct = 0.82) {
  const emojiSize = Math.round(size * emojiPct);
  const offset = Math.round((size - emojiSize) / 2);

  const bg = await sharp(Buffer.from(backgroundSvg(size))).png().toBuffer();
  const emoji = await sharp(emojiSvg).resize(emojiSize, emojiSize).png().toBuffer();

  return sharp(bg)
    .composite([{ input: emoji, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function generate() {
  console.log('Fetching chicken wing emoji...');
  const emojiSvg = await fetchEmoji();

  console.log('Generating icon...');
  const icon = await makeIcon(emojiSvg, 1024, 0.82);
  writeFileSync(`${assetsDir}/icon.png`, icon);
  writeFileSync(`${assetsDir}/adaptive-icon.png`, icon);

  console.log('Generating splash icon...');
  const splash = await makeIcon(emojiSvg, 512, 0.82);
  writeFileSync(`${assetsDir}/splash-icon.png`, splash);

  console.log('✅ Done!');
}

generate().catch(console.error);
