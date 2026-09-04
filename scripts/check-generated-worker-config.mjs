import { readFileSync } from "node:fs";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SECRET_KEY = /(secret|token|password|api[_-]?key|auth[_-]?token)/i;

export function validateGeneratedWorkerConfig(config, expected = {}) {
  const errors = [];
  const vars = config.vars ?? {};
  if (Object.keys(vars).length > 0) errors.push("Generated Worker config must not contain vars; runtime values belong in Cloudflare secrets.");
  for (const [key, value] of Object.entries(config.define ?? {})) {
    if (SECRET_KEY.test(key)) errors.push(`Generated define contains secret-shaped key ${key}.`);
    if (typeof value === "string" && /(localhost|127\.0\.0\.1)/i.test(value)) errors.push(`Generated define ${key} contains a local hostname.`);
  }
  if (expected.workerName && config.name !== expected.workerName) errors.push("Generated Worker name does not match CF_WORKER_NAME.");
  const database = (config.d1_databases ?? []).find((entry) => entry.binding === "DB");
  if (expected.databaseId && database?.database_id !== expected.databaseId) errors.push("Generated D1 database does not match CF_D1_DATABASE_ID.");
  const bucket = (config.r2_buckets ?? []).find((entry) => entry.binding === "UPLOADS");
  if (expected.bucketName && bucket?.bucket_name !== expected.bucketName) errors.push("Generated R2 bucket does not match CF_R2_BUCKET_NAME.");
  for (const route of config.routes ?? []) {
    const pattern = typeof route === "string" ? route : route.pattern;
    if (!pattern) continue;
    try {
      const parsed = new URL(pattern.includes("://") ? pattern : `https://${pattern.replace(/\/\*$/, "")}`);
      if (LOCAL_HOSTS.has(parsed.hostname)) errors.push("Generated routes must not reference a local hostname.");
    } catch { /* Wrangler validates route syntax. */ }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const path = process.argv[2] ?? "dist/server/wrangler.json";
  const config = JSON.parse(readFileSync(path, "utf8"));
  const errors = validateGeneratedWorkerConfig(config, {
    workerName: process.env.CF_WORKER_NAME?.trim(),
    databaseId: process.env.CF_D1_DATABASE_ID?.trim(),
    bucketName: process.env.CF_R2_BUCKET_NAME?.trim(),
  });
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  if (errors.length) process.exitCode = 1;
  else console.log("Generated Worker configuration is safe.");
}
