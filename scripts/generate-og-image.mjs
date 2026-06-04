// One-time: generate public/og-image.png (1200x630) brand card.
// Run with: node scripts/generate-og-image.mjs
import sharp from "sharp";

const W = 1200;
const H = 630;

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22e5d6"/>
      <stop offset="50%" stop-color="#3b9dff"/>
      <stop offset="100%" stop-color="#9b6bff"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#16e0cf" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#brand)"/>

  <text x="50%" y="270" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="132" font-weight="700"
        letter-spacing="-4" fill="url(#brand)">Webscore</text>

  <text x="50%" y="370" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="500"
        fill="#e7e9ee">Få betyg på din hemsida</text>

  <text x="50%" y="438" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="400"
        fill="#8b909c">Analysera din hemsida på 30 sekunder · webscore.se</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(new URL("../public/og-image.png", import.meta.url).pathname);
console.log("Wrote public/og-image.png (1200x630)");
