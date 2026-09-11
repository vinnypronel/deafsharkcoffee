// Requires ffmpeg on PATH. Keep the original 240 frames; no temporal resampling.
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

for (const [name, width, height] of [["desktop", 800, 450], ["mobile", 480, 270]]) {
  const directory = `public/hero-frames-v3/${name}`;
  mkdirSync(directory, { recursive: true });
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", "public/hero-scrub.mp4",
    "-vf", `scale=${width}:${height}:flags=lanczos,tile=5x2`,
    "-frames:v", "24", "-fps_mode", "passthrough", "-q:v", "3", "-start_number", "0",
    `${directory}/%02d.jpg`,
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Unable to generate ${name} hero frames`);
}
