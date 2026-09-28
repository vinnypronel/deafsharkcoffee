// Opens or closes online ordering and public account sign-up in production.
//   node scripts/launch-switch.mjs status   show the current switches
//   node scripts/launch-switch.mjs open     turn ordering + sign-up on, then deploy
//   node scripts/launch-switch.mjs close    turn ordering + sign-up off, then deploy
//   node scripts/launch-switch.mjs notify a@x.com,b@y.com   who gets new-order emails
//   node scripts/launch-switch.mjs staff  a@x.com,b@y.com   who can open the dashboard
// notify and staff update the live Worker secret immediately (no deploy needed)
// and mirror the value into .env.production.
// The flags are baked into the build, so a change only reaches the live site
// through the deploy this script runs.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const FILE = ".env.production";
const SWITCHES = ["NEXT_PUBLIC_ORDERING_ENABLED", "NEXT_PUBLIC_ACCOUNTS_ENABLED"];
const mode = process.argv[2];

let text = readFileSync(FILE, "utf8");
const read = (key) => (text.match(new RegExp(`^${key}=(.*)$`, "m")) ?? [])[1]?.trim() ?? "(unset)";

if (mode === "status" || !mode) {
  for (const key of SWITCHES) console.log(`${key}=${read(key)}`);
  console.log(`New-order emails go to: ${read("ADMIN_EMAILS")}`);
  console.log(`Dashboard access: ${read("STAFF_EMAILS")}`);
  console.log("(Emails are read from .env.production; notify/staff keep it in sync with the live secret.)");
  process.exit(0);
}
if (mode === "notify" || mode === "staff") {
  const key = mode === "notify" ? "ADMIN_EMAILS" : "STAFF_EMAILS";
  const list = (process.argv[3] ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!list.length || list.some((email) => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email))) {
    console.error(`Give a comma-separated list of emails, e.g. node scripts/launch-switch.mjs ${mode} owner@example.com,shop@example.com`);
    process.exit(1);
  }
  const value = list.join(",");
  const put = spawnSync("npx", ["wrangler", "secret", "put", key, "-c", "dist/server/wrangler.json"], { input: value, stdio: ["pipe", "inherit", "inherit"], shell: true });
  if (put.status !== 0) {
    console.error(`Could not update ${key} on the live Worker. Nothing was changed.`);
    process.exit(put.status ?? 1);
  }
  text = new RegExp(`^${key}=`, "m").test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
    : `${text.trimEnd()}\n${key}=${value}\n`;
  writeFileSync(FILE, text);
  console.log(`${key} is now ${value} on the live site.`);
  process.exit(0);
}
if (mode !== "open" && mode !== "close") {
  console.error("Use: status | open | close | notify <emails> | staff <emails>");
  process.exit(1);
}

const value = mode === "open" ? "true" : "false";
for (const key of SWITCHES) {
  text = new RegExp(`^${key}=`, "m").test(text)
    ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
    : `${text.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(FILE, text);
console.log(`Ordering and sign-up set to ${value}. Deploying...`);

const deploy = spawnSync("npm", ["run", "deploy"], { stdio: "inherit", shell: true });
if (deploy.status !== 0) {
  console.error("Deploy failed. The switches in .env.production are changed but the live site is not.");
  process.exit(deploy.status ?? 1);
}
console.log(mode === "open"
  ? "Live. Place one test order, confirm the shop got the email and the dashboard shows it, then cancel it."
  : "Closed. The menu shows coming soon and new orders and sign-ups are refused.");
