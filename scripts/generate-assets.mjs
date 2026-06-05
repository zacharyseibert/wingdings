import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '../mobile/assets');

// Drumstick SVG — sized for 1024x1024
function drumstickSvg(size, withText = false) {
  const s = size;
  const cx = s * 0.44;  // center x of meat
  const cy = s * 0.40;  // center y of meat
  const angle = -40;    // rotation in degrees

  return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2A1A10"/>
      <stop offset="100%" stop-color="#1A0F0A"/>
    </linearGradient>
    <linearGradient id="meat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F4944A"/>
      <stop offset="100%" stop-color="#C85E1A"/>
    </linearGradient>
    <linearGradient id="meatTop" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#F9A85A" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#F9A85A" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="${s*0.02}" stdDeviation="${s*0.025}" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="url(#bg)"/>

  <!-- Subtle orange glow behind drumstick -->
  <ellipse cx="${s*0.48}" cy="${s*0.48}" rx="${s*0.36}" ry="${s*0.36}" fill="#E8722A" opacity="0.06"/>

  <!-- Bone -->
  <rect
    x="${s * 0.52}" y="${s * 0.46}"
    width="${s * 0.11}" height="${s * 0.36}"
    rx="${s * 0.055}"
    fill="#F5E6D3"
    filter="url(#shadow)"
    transform="rotate(${angle} ${s*0.575} ${s*0.64})"
  />

  <!-- Bone end knob -->
  <circle
    cx="${s * 0.695}" cy="${s * 0.76}"
    r="${s * 0.075}"
    fill="#F5E6D3"
    filter="url(#shadow)"
  />

  <!-- Meat body -->
  <ellipse
    cx="${cx}" cy="${cy}"
    rx="${s * 0.285}" ry="${s * 0.255}"
    fill="url(#meat)"
    filter="url(#shadow)"
    transform="rotate(${angle} ${cx} ${cy})"
  />

  <!-- Meat highlight -->
  <ellipse
    cx="${cx - s*0.04}" cy="${cy - s*0.06}"
    rx="${s * 0.16}" ry="${s * 0.13}"
    fill="url(#meatTop)"
    transform="rotate(${angle} ${cx} ${cy})"
  />

  ${withText ? `
  <!-- Wordmark -->
  <text
    x="${s * 0.5}" y="${s * 0.88}"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="800"
    font-size="${s * 0.095}"
    fill="#F5E6D3"
    text-anchor="middle"
    letter-spacing="${s * 0.003}"
  >WINGDINGS</text>
  ` : ''}
</svg>`;
}

async function generate() {
  console.log('Generating icon...');
  await sharp(Buffer.from(drumstickSvg(1024)))
    .png()
    .toFile(`${assetsDir}/icon.png`);

  console.log('Generating adaptive icon...');
  await sharp(Buffer.from(drumstickSvg(1024)))
    .png()
    .toFile(`${assetsDir}/adaptive-icon.png`);

  console.log('Generating splash icon (centered logo)...');
  // Splash: just the drumstick on transparent bg, will be centered on dark splash
  await sharp(Buffer.from(drumstickSvg(512)))
    .png()
    .toFile(`${assetsDir}/splash-icon.png`);

  console.log('✅ Done! Assets written to mobile/assets/');
}

generate().catch(console.error);
