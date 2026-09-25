// Requires ffmpeg on PATH. Keep the original 240 frames; no temporal resampling.
// Pass "desktop" or "mobile" to rebuild one set only.
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Mobile is a centered 760x810 crop of the 1440x810 source, so a portrait screen
// shows the cup at a moderate size from real pixels instead of an upscaled sliver.
const sets = [
  ["desktop", "public/hero-frames-v3/desktop", "scale=800:450:flags=lanczos"],
  ["mobile", "public/hero-frames-v4/mobile", "crop=760:810:340:0,scale=330:352:flags=lanczos"],
];

for (const [name, directory, filter] of sets) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  mkdirSync(directory, { recursive: true });
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", "public/hero-scrub.mp4",
    "-vf", `${filter},tile=5x2`,
    "-frames:v", "24", "-fps_mode", "passthrough", "-q:v", "3", "-start_number", "0",
    `${directory}/%02d.jpg`,
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Unable to generate ${name} hero frames`);
}
