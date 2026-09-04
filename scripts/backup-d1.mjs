import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function valueAfter(flag) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : ""; }
const database = valueAfter("--database");
const config = valueAfter("--config") || "dist/server/wrangler.json";
const outputDir = resolve(valueAfter("--output-dir") || "backups");
if (!database || !process.argv.includes("--confirm-read-only-remote")) throw new Error("Use --database <name> --confirm-read-only-remote. This script only exports; it never imports or migrates.");
if (!existsSync(config)) throw new Error(`Build configuration not found: ${config}`);
mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const full = resolve(outputDir, `${database}-${stamp}-full.sql`);
const schema = resolve(outputDir, `${database}-${stamp}-schema.sql`);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
for (const [path, extra] of [[full, []], [schema, ["--no-data"]]]) {
  const result = spawnSync(npx, ["wrangler", "d1", "export", database, "--remote", `--output=${path}`, ...extra, "-c", config], { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (!existsSync(path) || statSync(path).size === 0) throw new Error(`D1 export is empty: ${path}`);
}
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", shell: false });
const manifest = { createdAt: new Date().toISOString(), database, gitCommit: git.status === 0 ? git.stdout.trim() : null, files: [full, schema].map((path) => ({ path, bytes: statSync(path).size, sha256: hash(path) })) };
const manifestPath = resolve(outputDir, `${database}-${stamp}-manifest.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Verified backup manifest: ${manifestPath}`);
