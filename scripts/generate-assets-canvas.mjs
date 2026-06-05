import { createCanvas } from 'canvas';
import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, '../mobile/assets');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background — rounded square via clipping
  const r = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#2A1A10');
  grad.addColorStop(1, '#1A0F0A');
  ctx.fillStyle = grad;
  ctx.fill();

  // Clip to rounded square so emoji stays within bounds
  ctx.clip();

  // Draw emoji centered
  const fontSize = Math.round(size * 0.78);
  ctx.font = `${fontSize}px Apple Color Emoji`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍗', size / 2, size / 2 + fontSize * 0.06);

  return canvas.toBuffer('image/png');
}

async function generate() {
  console.log('Generating icon with Apple emoji...');

  const iconBuf = drawIcon(1024);
  writeFileSync(`${assetsDir}/icon.png`, iconBuf);
  writeFileSync(`${assetsDir}/adaptive-icon.png`, iconBuf);

  console.log('Generating splash icon...');
  const splashBuf = drawIcon(512);
  writeFileSync(`${assetsDir}/splash-icon.png`, splashBuf);

  console.log('✅ Done!');
}

generate().catch(console.error);
