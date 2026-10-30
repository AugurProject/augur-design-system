/**
 * Static GitHub Pages deployment verification (issue #19).
 *
 * Runs against the BUILT output (`apps/docs/dist`) — no server, no
 * browser — and complements `apps/docs/fixtures/verify-markdown.mjs`
 * (clean Markdown/llms.txt behavior, issue #9/#15) and the browser suite
 * (`apps/docs/fixtures/browser/`, browser behavior). Coverage here is deployment-shaped:
 *
 *   1. Layout: dist exists; `index.html` sits at the deployment root
 *      (`dist/index.html` for base "/", `dist/<base>/index.html` for a
 *      repository-subpath deployment such as `/augur-design-system`).
 *   2. Navigation and assets: every site-absolute `href`/`src` in every
 *      `.html` file resolves to a file in dist under the configured base.
 *   3. `.md` routes: every `.md` URL referenced from HTML (View as
 *      Markdown) and every link in `llms.txt` resolves to a file in dist.
 *   4. `llms.txt`: served at `<base>/llms.txt`, non-empty, and only
 *      contains site-absolute links that resolve (repository links are
 *      checked to be well-formed https URLs).
 *   5. Registry built-JSON channel: `<base>/r/<item>.json` exists for
 *      every item in the root `registry.json` index, each file is valid
 *      JSON whose `name` matches its filename, and — when generated with
 *      a pin SHA — every `registryDependencies` entry carries the same
 *      `#<40-char-sha>` stamp (contract §14).
 *
 * Usage (from the repository root, after building apps/docs and staging
 * `public/r` into `apps/docs/dist/r`):
 *
 *     bun scripts/verify-pages-deploy.mjs
 *     DOCS_BASE_PATH=/augur-design-system bun scripts/verify-pages-deploy.mjs
 *
 * Exit code 0 = all assertions passed; 1 = at least one failed.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const rawBase = process.env.DOCS_BASE_PATH?.trim() || "/";
const base = "/" + rawBase.split("/").filter(Boolean).join("/");
const sitePrefix = base === "/" ? "" : base;

const repoRoot = resolve(import.meta.dir, "..");
const distDir = join(repoRoot, "apps/docs", "dist");
const registryIndexPath = join(repoRoot, "registry.json");

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};
const ok = (msg) => console.log(`ok   ${msg}`);

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Map a URL path (starting with the base) to a dist file path, or null. */
async function resolveInDist(urlPath) {
  let p = decodeURIComponent(new URL(urlPath, "http://x").pathname);
  if (!p.startsWith(`${sitePrefix}/`) && p !== sitePrefix) return null;
  p = sitePrefix ? p.slice(sitePrefix.length) : p;
  if (p === "" || p.endsWith("/")) p += "index.html";
  const candidate = join(distDir, p);
  return (await exists(candidate)) ? candidate : null;
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

// --- 1. Layout ------------------------------------------------------------
// Astro emits a flat dist regardless of `base`: the base prefixes URLs, not
// the output layout, so GitHub Pages serves the artifact under the project
// subpath with every URL already base-prefixed.
if (!(await exists(distDir))) {
  console.error("FAIL dist/ not found — build apps/docs first.");
  process.exit(1);
}
const expectedIndex = join(distDir, "index.html");
if (await exists(expectedIndex)) {
  ok(`layout: index.html at deployment root (base ${base})`);
} else {
  fail(`layout: index.html missing at ${relative(repoRoot, expectedIndex)}`);
}

const files = await walk(distDir);
const htmlFiles = files.filter((f) => extname(f) === ".html");

// --- 2. Navigation and assets ---------------------------------------------
let htmlRefs = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (!ref.startsWith("/")) continue; // relative, hash, external schemes
    if (ref.startsWith("//")) continue; // protocol-relative external
    htmlRefs += 1;
    if (!(await resolveInDist(ref))) {
      fail(`html reference does not resolve under base: ${ref} (in ${relative(distDir, file)})`);
    }
  }
}
ok(`navigation/assets: checked ${htmlRefs} site-absolute href/src across ${htmlFiles.length} HTML files`);

// --- 3+4. llms.txt and .md routes ------------------------------------------
const llmsPath = await resolveInDist(`${sitePrefix}/llms.txt`);
if (llmsPath) {
  const llms = await readFile(llmsPath, "utf8");
  if (llms.trim().length === 0) fail("llms.txt is empty");
  else ok(`llms.txt served at ${base === "/" ? "/" : base}/llms.txt (${llms.split("\n").length} lines)`);
  let siteLinks = 0;
  for (const m of llms.matchAll(/\]\(([^)]+)\)/g)) {
    const link = m[1];
    if (link.startsWith("https://")) {
      if (!URL.canParse(link)) fail(`llms.txt external link is not a well-formed URL: ${link}`);
      continue;
    }
    if (!link.startsWith("/")) {
      fail(`llms.txt link is not site-absolute or https: ${link}`);
      continue;
    }
    siteLinks += 1;
    if (!(await resolveInDist(link))) {
      fail(`llms.txt link does not resolve under base: ${link}`);
    }
  }
  ok(`llms.txt: checked ${siteLinks} site-absolute links (all .md routes)`);
} else {
  fail(`llms.txt not found at ${sitePrefix || "/"}/llms.txt`);
}

// --- 5. Registry built-JSON channel ----------------------------------------
const rDir = join(distDir, "r");
if (!(await exists(rDir))) {
  fail(`registry channel missing at ${relative(repoRoot, rDir)}`);
} else {
  const index = JSON.parse(await readFile(registryIndexPath, "utf8"));
  const itemNames = (index.items ?? []).map((i) => i.name ?? i);
  if (itemNames.length === 0) fail("root registry.json has no items");
  let rChecked = 0;
  for (const name of itemNames) {
    const itemPath = join(rDir, `${name}.json`);
    if (!(await exists(itemPath))) {
      fail(`registry item missing: r/${name}.json`);
      continue;
    }
    let item;
    try {
      item = JSON.parse(await readFile(itemPath, "utf8"));
    } catch (e) {
      fail(`registry item is not valid JSON: r/${name}.json (${e.message})`);
      continue;
    }
    if (item.name !== name) fail(`registry item name mismatch: r/${name}.json has name ${item.name}`);
    rChecked += 1;
  }
  ok(`registry channel: ${rChecked}/${itemNames.length} items present and valid under r/`);

  // Pin stamp consistency: if any dependency is SHA-pinned, all must be,
  // and with the same SHA (contract §14 policy).
  const depRe = /AugurProject\/augur-design-system\/[\w-]+(#([0-9a-f]{40}))?/;
  let pinned = 0;
  let unpinned = 0;
  let shas = new Set();
  for (const name of itemNames) {
    const item = JSON.parse(await readFile(join(rDir, `${name}.json`), "utf8"));
    for (const dep of item.registryDependencies ?? []) {
      const m = depRe.exec(dep);
      if (!m) {
        fail(`registry dependency has unexpected format: "${dep}" (r/${name}.json)`);
      } else if (m[2]) {
        pinned += 1;
        shas.add(m[2]);
      } else {
        unpinned += 1;
      }
    }
  }
  if (pinned > 0 && unpinned > 0) {
    fail(`mixed pin state: ${pinned} SHA-pinned vs ${unpinned} unpinned registryDependencies`);
  } else if (pinned > 0 && shas.size > 1) {
    fail(`inconsistent pin SHAs in registryDependencies: ${[...shas].join(", ")}`);
  } else if (pinned > 0) {
    ok(`registry pins: all ${pinned} registryDependencies stamped #${[...shas][0]}`);
  } else {
    ok(`registry pins: ${unpinned} registryDependencies unpinned (default-branch channel)`);
  }
}

// --- Summary ----------------------------------------------------------------
if (failures > 0) {
  console.error(`\nverify-pages-deploy: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nverify-pages-deploy: all checks passed");
