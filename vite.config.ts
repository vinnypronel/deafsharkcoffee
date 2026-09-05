import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

type DeploymentTarget = "local" | "staging" | "production";

const requestedTarget = process.env.DEPLOY_TARGET?.trim().toLowerCase();
if (requestedTarget && requestedTarget !== "staging" && requestedTarget !== "production") {
  throw new Error("DEPLOY_TARGET must be either staging or production when it is set.");
}
const deploymentTarget: DeploymentTarget = (requestedTarget ?? "local") as DeploymentTarget;

// Miniflare ignores the local placeholder. Deployment builds must receive the
// business-owned resource identifiers explicitly instead of silently targeting
// a remembered production resource.
const LOCAL_D1_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
const D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID?.trim() || LOCAL_D1_DATABASE_ID;
const WORKER_NAME = process.env.CF_WORKER_NAME?.trim()
  || (deploymentTarget === "staging" ? "deaf-shark-coffee-staging" : "deaf-shark-coffee");
const R2_BUCKET_NAME = process.env.CF_R2_BUCKET_NAME?.trim() || "site-creator-r2";

if (deploymentTarget !== "local" && D1_DATABASE_ID === LOCAL_D1_DATABASE_ID) {
  throw new Error(`CF_D1_DATABASE_ID is required for a ${deploymentTarget} deployment build.`);
}

// Hosting bindings. Inlined because `.openai/` is gitignored and is not
// present on CI, where importing it broke the build.
const d1: string | null = "DB";
const r2: string | null = "UPLOADS";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const localBindingConfig = {
  name: WORKER_NAME,
  main: "./worker/index.ts",
  compatibility_date: "2026-08-20",
  compatibility_flags: ["nodejs_compat"],
  routes: deploymentTarget === "production"
    ? [
        { pattern: "deafsharkcoffee.com", custom_domain: true },
        { pattern: "www.deafsharkcoffee.com", custom_domain: true },
      ]
    : [],
  // Runtime configuration is intentionally absent here. Values placed in
  // `vars` are copied into dist/server/wrangler.json. Use `.dev.vars` locally
  // and `wrangler secret put` / the Cloudflare dashboard for hosted values.
  send_email: [{ name: "EMAIL" }],
  images: { binding: "IMAGES" },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "deaf-shark-coffee",
          database_id: D1_DATABASE_ID,
          migrations_dir: "./drizzle",
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: R2_BUCKET_NAME,
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
