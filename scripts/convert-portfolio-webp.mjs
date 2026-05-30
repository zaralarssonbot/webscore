// One-time asset conversion: portfolio PNG -> WebP.
// Run with: node scripts/convert-portfolio-webp.mjs
import sharp from "sharp";
import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const DIR = new URL("../src/assets/portfolio/", import.meta.url).pathname;
const MAX_WIDTH = 1280; // enough for the modal full-view; never upscales
const QUALITY = 78;

const files = (await readdir(DIR)).filter((f) => extname(f).toLowerCase() === ".png");
let before = 0;
let after = 0;

for (const file of files) {
  const src = join(DIR, file);
  const out = join(DIR, basename(file, ".png") + ".webp");
  before += (await stat(src)).size;
  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  after += (await stat(out)).size;
  await unlink(src);
}

const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";
console.log(`Converted ${files.length} PNG -> WebP`);
console.log(`${mb(before)} -> ${mb(after)} (${(100 - (after / before) * 100).toFixed(1)}% smaller)`);
