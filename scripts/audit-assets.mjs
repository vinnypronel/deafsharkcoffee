import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../public/", import.meta.url);
const imageBudget = 1_000_000;
const videoBudget = 5_000_000;
const mediaExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const publicPath = decodeURIComponent(root.pathname).replace(/^\/(.:\/)/, "$1");
const oversized = [];
for (const file of await walk(publicPath)) {
  const extension = extname(file).toLowerCase();
  if (!mediaExtensions.has(extension)) continue;
  const bytes = (await stat(file)).size;
  const budget = extension === ".mp4" || extension === ".webm" ? videoBudget : imageBudget;
  if (bytes > budget) oversized.push({ file: relative(publicPath, file), bytes, budget });
}

if (oversized.length === 0) {
  console.log("All public media assets are within the current delivery budgets.");
} else {
  console.log(`${oversized.length} public media asset(s) exceed the recommended delivery budget:`);
  for (const item of oversized.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`- ${item.file}: ${(item.bytes / 1_000_000).toFixed(2)} MB (budget ${(item.budget / 1_000_000).toFixed(2)} MB)`);
  }
}
