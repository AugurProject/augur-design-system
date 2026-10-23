/**
 * Package tarball smoke (issue #9).
 *
 * Proves the release tarball works for a consumer with no React, no
 * Tailwind and no font import:
 *
 *   bun scripts/package-smoke.ts            # pack, install, verify
 *   bun scripts/package-smoke.ts --keep     # keep the consumer directory
 *   bun scripts/package-smoke.ts --out DIR  # also keep the tarball in DIR
 *
 * Steps:
 *
 *   1. `npm pack` packages/design-system. The tarball must contain every
 *      export target and none of the package's tooling, tests or docs.
 *   2. Install the tarball by path into a fresh plain-HTML consumer. The
 *      installed package must carry the final name, @augurproject/design-system.
 *   3. Load a static page in Chromium that links only `theme.css` and the
 *      Button stylesheet from node_modules, and check in both schemes:
 *      canvas and Button colours, the dark hover and pressed steps, the
 *      6px link focus offset, that an unlayered consumer rule overrides
 *      `@layer augur`, and that no request fails.
 *
 * Requires network access to npm for the package's own dependencies and
 * Playwright's Chromium (`bunx playwright install chromium`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG_DIR = path.join(ROOT, "packages/design-system");
const args = process.argv.slice(2);
const keep = args.includes("--keep");
const outIndex = args.indexOf("--out");
const outDir = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : undefined;

const failures: string[] = [];
const fail = (message: string) => {
  failures.push(message);
  console.error(`FAIL: ${message}`);
};
const work = fs.mkdtempSync(path.join(os.tmpdir(), "augur-package-"));

function finish(): never {
  if (!keep) fs.rmSync(work, { recursive: true, force: true });
  console.log(`\nWork directory: ${work}${keep ? " (kept)" : " (removed; rerun with --keep to inspect)"}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nPASS: package tarball smoke — all checks passed.");
  process.exit(0);
}

// 1. Pack ---------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(PKG_DIR, "package.json"), "utf8")) as {
  name: string;
  version: string;
  exports: Record<string, string>;
};
const packDir = outDir ?? work;
fs.mkdirSync(packDir, { recursive: true });
const [packed] = JSON.parse(
  execFileSync("npm", ["pack", "--json", "--pack-destination", packDir], { cwd: PKG_DIR, encoding: "utf8" }),
) as Array<{ filename: string; files: Array<{ path: string }> }>;
const tarball = path.join(packDir, packed.filename);
const packedFiles = new Set(packed.files.map((f) => f.path));
console.log(`Packed ${packed.filename} (${packedFiles.size} files)`);

const expectedName = `augurproject-design-system-${pkg.version}.tgz`;
if (packed.filename !== expectedName) fail(`tarball is ${packed.filename}, expected ${expectedName}`);
for (const [key, target] of Object.entries(pkg.exports)) {
  if (!packedFiles.has(target.replace(/^\.\//, ""))) fail(`export ${key} -> ${target} is missing from the tarball`);
}
for (const file of packedFiles) {
  if (/^(src\/tools|test|docs|fixtures|registry-src)\//.test(file)) fail(`tarball ships internal file ${file}`);
}

// 2. Install into a plain consumer ------------------------------------------------
const consumer = path.join(work, "consumer");
fs.mkdirSync(consumer);
fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "plain-consumer", private: true }));
execFileSync("npm", ["install", tarball, "--no-audit", "--no-fund"], {
  cwd: consumer,
  stdio: "inherit",
});
const installedDir = path.join(consumer, "node_modules", ...pkg.name.split("/"));
const installed = JSON.parse(fs.readFileSync(path.join(installedDir, "package.json"), "utf8"));
if (installed.name !== "@augurproject/design-system") fail(`installed name is ${installed.name}`);
if (installed.version !== pkg.version) fail(`installed version is ${installed.version}`);
// React and radix-ui are optional peers: a CSS-only install must not pull them in.
for (const dep of ["react", "react-dom", "radix-ui"]) {
  if (fs.existsSync(path.join(consumer, "node_modules", dep))) fail(`${dep} was installed; the CSS path must not need it`);
}

// 3. Plain-HTML page --------------------------------------------------------------
const base = `node_modules/${pkg.name}`;
fs.writeFileSync(
  path.join(consumer, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Plain consumer</title>
<style>
  /* Unlayered consumer rule, placed before the package: it must still win. */
  .consumer-override { background-color: rgb(1, 2, 3); }
</style>
<link rel="stylesheet" href="${base}/src/styles/theme.css">
<link rel="stylesheet" href="${base}/src/components/button/button.css">
</head>
<body>
  <button id="primary" class="aug-button augur-type-control aug-button--default aug-button--md">Primary</button>
  <button id="override" class="aug-button augur-type-control aug-button--default aug-button--md consumer-override">Override</button>
  <a id="link" href="#x">Text link</a>
</body>
</html>
`,
);

const browser = await chromium.launch();
const failedRequests: string[] = [];
const expectations = {
  light: { canvas: "rgb(245, 245, 248)", primary: "rgb(9, 94, 66)", hover: "rgb(42, 231, 168)", pressed: "rgb(14, 14, 33)" },
  dark: { canvas: "rgb(14, 14, 33)", primary: "rgb(42, 231, 168)", hover: "rgb(39, 209, 155)", pressed: "rgb(36, 188, 141)" },
} as const;

for (const scheme of ["light", "dark"] as const) {
  const page = await browser.newPage({ colorScheme: scheme });
  page.on("requestfailed", (r) => failedRequests.push(`${scheme}: ${r.url()}`));
  page.on("response", (r) => {
    if (r.status() >= 400) failedRequests.push(`${scheme}: ${r.status()} ${r.url()}`);
  });
  await page.goto(pathToFileURL(path.join(consumer, "index.html")).href);
  const want = expectations[scheme];
  const bg = (sel: string) => page.$eval(sel, (el) => getComputedStyle(el).backgroundColor);

  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (canvas !== want.canvas) fail(`${scheme}: body background ${canvas}, expected ${want.canvas}`);
  const resting = await bg("#primary");
  if (resting !== want.primary) fail(`${scheme}: default Button ${resting}, expected ${want.primary}`);

  await page.hover("#primary");
  const hovered = await bg("#primary");
  if (hovered !== want.hover) fail(`${scheme}: hovered Button ${hovered}, expected ${want.hover}`);
  await page.mouse.down();
  const pressed = await bg("#primary");
  if (pressed !== want.pressed) fail(`${scheme}: pressed Button ${pressed}, expected ${want.pressed}`);
  await page.mouse.up();

  const override = await bg("#override");
  if (override !== "rgb(1, 2, 3)") fail(`${scheme}: unlayered consumer rule lost to @layer augur (${override})`);

  // Keyboard focus from the element before the link, so :focus-visible applies.
  await page.mouse.move(0, 0);
  await page.focus("#override");
  await page.keyboard.press("Tab");
  const focus = await page.$eval("#link", (el) => {
    const cs = getComputedStyle(el);
    return { focused: document.activeElement === el, offset: cs.outlineOffset, width: cs.outlineWidth };
  });
  if (!focus.focused) fail(`${scheme}: keyboard focus did not reach the link`);
  else if (focus.offset !== "6px" || focus.width !== "2px") {
    fail(`${scheme}: link focus ring ${focus.width} at ${focus.offset}, expected 2px at 6px`);
  }
  console.log(`${scheme}: canvas ${canvas}, Button ${resting} → hover ${hovered} → pressed ${pressed}, link focus ${focus.width}/${focus.offset}`);
  await page.close();
}
await browser.close();
for (const r of failedRequests) fail(`request failed: ${r}`);

finish();
