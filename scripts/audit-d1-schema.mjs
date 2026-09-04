import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const index = process.argv.indexOf("--schema-export");
const exportPath = index >= 0 ? process.argv[index + 1] : "";
if (!exportPath || !existsSync(exportPath)) throw new Error("Pass an existing schema-only D1 export with --schema-export <file>.");

const migrations = readdirSync("drizzle").filter((file) => file.endsWith(".sql")).sort();
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const tags = new Set((journal.entries ?? []).map((entry) => `${entry.tag}.sql`));
const missingJournal = migrations.filter((file) => !tags.has(file));
const expectedSql = migrations.map((file) => readFileSync(resolve("drizzle", file), "utf8")).join("\n");
const actualSql = readFileSync(exportPath, "utf8");
const tableNames = (sql) => new Set([...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([^"`\]\s(]+)["`\]]?/gi)].map((match) => match[1]));
const expected = tableNames(expectedSql);
const actual = tableNames(actualSql);
const missingTables = [...expected].filter((table) => !actual.has(table));
const extraTables = [...actual].filter((table) => !expected.has(table) && !table.startsWith("sqlite_") && table !== "d1_migrations");
missingJournal.forEach((file) => console.error(`ERROR: ${file} is missing from drizzle/meta/_journal.json.`));
missingTables.forEach((table) => console.error(`ERROR: production schema is missing table ${table}.`));
extraTables.forEach((table) => console.warn(`WARNING: production schema has extra table ${table}.`));
if (missingJournal.length || missingTables.length) process.exitCode = 1;
else console.log(`Schema audit passed for ${basename(exportPath)} (${expected.size} expected tables).`);
