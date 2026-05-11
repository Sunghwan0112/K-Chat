/**
 * Rebuild build/icons/icon.ico from icon.png so the .exe / shortcuts use the same artwork
 * (avoids shipping a stale placeholder .ico).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

async function main() {
  const root = path.join(__dirname, '..');
  const pngPath = path.join(root, 'build', 'icons', 'icon.png');
  const icoPath = path.join(root, 'build', 'icons', 'icon.ico');
  if (!fs.existsSync(pngPath)) {
    console.warn('[build-win-icon] skip: build/icons/icon.png missing');
    process.exit(0);
  }
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = [];
  for (const s of sizes) {
    buffers.push(
      await sharp(pngPath).resize(s, s, { fit: 'cover' }).png().toBuffer()
    );
  }
  fs.writeFileSync(icoPath, await toIco(buffers));
  console.log('[build-win-icon] wrote', icoPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
