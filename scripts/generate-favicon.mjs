/**
 * Generate Webscore's own favicon (PNG + ICO) from public/favicon.svg.
 * Run: node scripts/generate-favicon.mjs
 * Uses the already-present Playwright/Chromium to rasterize the SVG (no extra
 * image dependency). Keeps the brand "Calibration" ring mark consistent across svg/.png/.ico.
 */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
const html = `<!doctype html><html><head><style>
  *{margin:0;padding:0} html,body{width:256px;height:256px;background:transparent}
  svg{width:256px;height:256px;display:block}
</style></head><body>${svg}</body></html>`;
await page.setContent(html, { waitUntil: "networkidle" });
const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 256, height: 256 } });
await browser.close();

writeFileSync(new URL("../public/favicon.png", import.meta.url), png);

// Wrap the 256x256 PNG in a minimal ICO container (PNG-in-ICO).
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(0, 6); // width  (0 = 256)
header.writeUInt8(0, 7); // height (0 = 256)
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // bytes in resource
header.writeUInt32LE(6 + 16, 18); // image offset
writeFileSync(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([header, png]));

console.log(`favicon.png + favicon.ico generated (${png.length} bytes)`);
