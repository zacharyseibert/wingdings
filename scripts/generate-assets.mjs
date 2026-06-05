import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '../mobile/assets');

// Fetch the chicken wing emoji SVG from Twemoji
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

async function generate() {
  console.log('Fetching chicken wing emoji from Twemoji...');
  const emojiSvg = await fetchEmoji();

  // Generate icon at 1024x1024
  const iconSize = 1024;
  const emojiSize = Math.round(iconSize * 0.78);
  const offset = Math.round((iconSize - emojiSize) / 2);

  console.log('Generating icon...');
  const bg = await sharp(Buffer.from(backgroundSvg(iconSize))).png().toBuffer();
  const emoji = await sharp(emojiSvg).resize(emojiSize, emojiSize).png().toBuffer();

  await sharp(bg)
    .composite([{ input: emoji, top: offset, left: offset }])
    .png()
    .toFile(`${assetsDir}/icon.png`);

  await sharp(bg)
    .composite([{ input: emoji, top: offset, left: offset }])
    .png()
    .toFile(`${assetsDir}/adaptive-icon.png`);

  // Splash icon — smaller, on transparent bg (Expo centers it on backgroundColor)
  console.log('Generating splash icon...');
  const splashSize = 512;
  const splashEmoji = await sharp(emojiSvg).resize(splashSize, splashSize).png().toBuffer();
  await sharp({
    create: { width: splashSize, height: splashSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: splashEmoji }])
    .png()
    .toFile(`${assetsDir}/splash-icon.png`);

  console.log('✅ Done!');
}

generate().catch(console.error);
