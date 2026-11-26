// Builds film-ar/: the Arabic cut as its own project (one root composition per project): scenes copied from film/,
// assets hard-linked (the renderer refuses files outside the project, so no symlinks). Identical to film/index.html except each scene's lang. Rerun after editing film/index.html.
import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, cpSync, linkSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const film = new URL("../film/", import.meta.url), ar = new URL("../film-ar/", import.meta.url);
const src = readFileSync(new URL("index.html", film), "utf8");
const out = src
  .replaceAll(`data-variable-values='{"lang":"en"}'`, `data-variable-values='{"lang":"ar"}'`)
  .replace('<html lang="en"', '<html lang="ar"')
  .replace("English cut.", "Arabic cut, generated from film/index.html by scripts/make-ar.mjs (edit that file, then rerun).");
if (!out.includes('{"lang":"ar"}')) throw new Error("no scene hosts found");
rmSync(ar, { recursive: true, force: true });
mkdirSync(ar);
writeFileSync(new URL("index.html", ar), out);
for (const f of ["hyperframes.json", "meta.json", "package.json"]) copyFileSync(new URL(f, film), new URL(f, ar));
cpSync(new URL("compositions", film), new URL("compositions", ar), { recursive: true });
const link = (from, to) => {
  mkdirSync(to, { recursive: true });
  for (const n of readdirSync(from)) {
    const a = join(from, n), b = join(to, n);
    if (statSync(a).isDirectory()) link(a, b); else linkSync(a, b);
  }
};
link(fileURLToPath(new URL("assets", film)), fileURLToPath(new URL("assets", ar)));
console.log("built film-ar/");
