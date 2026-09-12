// Run with an installed sharp module or pass its absolute entry-point as argv[2].
// Original product photography stays unchanged; only the menu preview uses these.
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const { default: sharp } = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : "sharp");
const source = await readFile("app/menu-data.ts", "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { menuProducts } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const photos = [...new Set(menuProducts.map(product => product.photo).filter(Boolean))];
const manifest = {};
let before = 0;
let after = 0;
await mkdir("public/menu/previews", { recursive: true });
for (const photo of photos) {
  if (!photo.startsWith("/")) continue;
  const input = `public${photo}`;
  const { size } = await stat(input);
  if (size < 200_000) continue;
  const buffer = await sharp(input).rotate().resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toBuffer();
  if (buffer.length >= size) continue;
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 10);
  const output = `/menu/previews/${basename(photo, extname(photo))}-${hash}.webp`;
  await writeFile(`public${output}`, buffer);
  manifest[photo] = output;
  before += size;
  after += buffer.length;
}
await writeFile("app/menu-preview-images.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${Object.keys(manifest).length} menu previews: ${(before / 1e6).toFixed(2)} MB → ${(after / 1e6).toFixed(2)} MB (${Math.round((1 - after / before) * 100)}% smaller).`);
