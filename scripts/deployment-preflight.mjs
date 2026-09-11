import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { validateLaunchConfig } from "./check-launch-config.mjs";

const args = new Set(process.argv.slice(2));
const targetIndex = process.argv.indexOf("--target");
const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : "";
const apply = args.has("--apply");
if (!new Set(["staging", "production"]).has(target)) throw new Error("Use --target staging or --target production.");
const envFile = `.env.${target}`;
if (existsSync(envFile)) process.loadEnvFile(envFile);
process.env.DEPLOY_TARGET = target;

const result = validateLaunchConfig(process.env, { target });
result.warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));
result.errors.forEach((error) => console.error(`ERROR: ${error}`));
if (result.errors.length) process.exit(1);

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
function run(command, commandArgs) {
  /* Node 20.12+ refuses to spawn Windows .cmd shims (npm, npx) without a shell.
     Without this the spawn fails with a null status and the deploy aborts
     silently, with nothing printed to explain why. */
  const outcome = spawnSync(command, commandArgs, { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
  if (outcome.error) {
    console.error(`ERROR: ${command} could not be started: ${outcome.error.message}`);
    process.exit(1);
  }
  if (outcome.status !== 0) {
    console.error(`ERROR: ${command} ${commandArgs.join(" ")} exited with ${outcome.status ?? "no status"}.`);
    process.exit(outcome.status ?? 1);
  }
}
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
run(process.execPath, ["scripts/check-generated-worker-config.mjs", "dist/server/wrangler.json"]);
if (apply) {
  if (process.env.CONFIRM_CLOUDFLARE_DEPLOY !== target) throw new Error(`Set CONFIRM_CLOUDFLARE_DEPLOY=${target} to confirm this deployment.`);
  run(npx, ["wrangler", "deploy", "-c", "dist/server/wrangler.json"]);
} else run(npx, ["wrangler", "deploy", "--dry-run", "-c", "dist/server/wrangler.json"]);
