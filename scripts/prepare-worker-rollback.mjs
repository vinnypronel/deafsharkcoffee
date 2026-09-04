const index = process.argv.indexOf("--version");
const version = index >= 0 ? process.argv[index + 1] : "";
const configIndex = process.argv.indexOf("--config");
const config = configIndex >= 0 ? process.argv[configIndex + 1] : "dist/server/wrangler.json";
if (!/^[a-zA-Z0-9-]{6,}$/.test(version)) throw new Error("Pass a reviewed Worker version ID with --version.");
console.log("REVIEW ONLY — this command has not been executed.");
console.log(`npx wrangler rollback ${version} -c ${config}`);
console.log("Worker rollback does not reverse D1 migrations or restore R2 objects.");
