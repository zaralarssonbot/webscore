// One-time: re-encode used background videos to 720p H.264 + generate WebP posters.
// Uses ffmpeg-static (no system ffmpeg). Run: node scripts/optimize-videos.mjs [crf]
import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { statSync, renameSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const PUBLIC = new URL("../public/", import.meta.url).pathname;
const CRF = process.argv[2] ?? "31";

// Only the videos actually referenced in the source.
const USED = [
  "videos/branding-1.mp4",
  "videos/branding-3.mp4",
  "videos/branding-4.mp4",
  "videos/branding-7.mp4",
  "videos/branding-10.mp4",
  "videos/branding-11.mp4",
  "videos/branding-12.mp4",
];

const ff = (args) => execFileSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", ...args]);
const mb = (n) => (n / 1024 / 1024).toFixed(2);

let before = 0;
let after = 0;

for (const rel of USED) {
  const src = join(PUBLIC, rel);
  const tmp = join(dirname(src), "_tmp_" + basename(src));
  const poster = src.replace(/\.mp4$/, "-poster.webp");
  const beforeSize = statSync(src).size;
  before += beforeSize;

  // Re-encode: cap height at 720 (never upscale), H.264, drop audio, web-ready.
  ff([
    "-i", src,
    "-vf", "scale='-2:min(720,ih)'",
    "-c:v", "libx264", "-preset", "slower", "-crf", CRF,
    "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart",
    tmp,
  ]);
  renameSync(tmp, src);
  const afterSize = statSync(src).size;
  after += afterSize;

  // Poster still from ~1s in, 720p WebP.
  ff([
    "-ss", "00:00:01", "-i", src, "-frames:v", "1",
    "-vf", "scale='-2:min(720,ih)'",
    "-c:v", "libwebp", "-quality", "72",
    poster,
  ]);

  console.log(`${rel.padEnd(26)} ${mb(beforeSize).padStart(7)} MB -> ${mb(afterSize).padStart(6)} MB  (+poster ${mb(statSync(poster).size)} MB)`);
}

// Remove unreferenced videos.
const UNUSED = ["branding-2", "branding-5", "branding-6", "branding-8", "branding-9"].map((n) => `videos/${n}.mp4`);
for (const rel of UNUSED) {
  try { rmSync(join(PUBLIC, rel)); console.log(`deleted unused ${rel}`); } catch {}
}

console.log(`\nCRF ${CRF}  |  used videos: ${mb(before)} MB -> ${mb(after)} MB`);
