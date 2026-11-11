// Requires ffmpeg on PATH. Keep the original 240 frames; no temporal resampling.
// Pass "desktop" or "mobile" to rebuild one set only.
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Mobile is a centered 760x810 crop of the 1440x810 source, so a portrait screen
// shows the cup at a moderate size from real pixels instead of an upscaled sliver.
const sets = [
  ["desktop", "public/hero-frames-v5/desktop", "scale=800:450:flags=lanczos", ["-c:v", "libwebp", "-quality", "72"], "webp"],
  ["mobile", "public/hero-frames-v4/mobile", "crop=760:810:340:0,scale=330:352:flags=lanczos", ["-q:v", "3"], "jpg"],
];

for (const [name, directory, filter, encoding, extension] of sets) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  mkdirSync(directory, { recursive: true });
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", "public/hero-scrub.mp4",
    "-vf", `${filter},tile=5x2`,
    "-frames:v", "24", "-fps_mode", "passthrough", ...encoding, "-start_number", "0",
    `${directory}/%02d.${extension}`,
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Unable to generate ${name} hero frames`);
}

const previews = [
  ["desktop", "scale=240:135:flags=lanczos"],
  ["mobile", "crop=760:810:340:0,scale=110:118:flags=lanczos"],
];
for (const [name, filter] of previews) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  // Sample 48 evenly spaced frames, including both ends of the 240-frame clip.
  const preview = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", "public/hero-scrub.mp4",
    "-vf", `select='eq(n,round(round(n*47/239)*239/47))',${filter},tile=8x6`,
    "-frames:v", "1", "-c:v", "libwebp", "-quality", "65", `public/hero-scrub-preview-${name}.webp`,
  ], { stdio: "inherit" });
  if (preview.status !== 0) throw new Error(`Unable to generate the ${name} hero preview`);
}
