/**
 * Clean-Markdown and llms.txt verification driver.
 *
 * Verifies the built documentation surface rather than implementation
 * chronology: exact Markdown endpoint inventory, rendered/Markdown parity,
 * clean Markdown invariants, example-source parity, link resolution, page
 * action wiring, and llms.txt coverage.
 */
import { createServer } from "node:http";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const fixturesDir = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(fixturesDir, "..");
const distDir = join(docsRoot, "dist");
const rawBase = process.env.DOCS_BASE_PATH?.trim() || "/";
const base = "/" + rawBase.split("/").filter(Boolean).join("/");
const sitePrefix = base === "/" ? "" : base;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let serveRoot;
if (base === "/") {
  serveRoot = distDir;
} else {
  serveRoot = await mkdtemp(join(tmpdir(), "augur-docs-md-stage-"));
  await mkdir(join(serveRoot, sitePrefix.slice(1)), { recursive: true });
  await cp(distDir, join(serveRoot, sitePrefix.slice(1)), { recursive: true });
}

const server = createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (path.endsWith("/")) path += "index.html";
    let file = join(serveRoot, path);
    if (!file.startsWith(serveRoot)) throw new Error("traversal");
    try {
      const s = await stat(file);
      if (!s.isFile()) file = join(serveRoot, path, "index.html");
    } catch {
      file = join(serveRoot, path, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;
const site = (p) => sitePrefix + p;

const failures = [];
const ok = (label, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures.push(label);
};

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const FENCE = /^(\s*)(`{3,}|~{3,})/;
function splitFences(text) {
  const outside = [];
  const inside = [];
  let fence = null;
  for (const line of text.split("\n")) {
    const match = FENCE.exec(line);
    if (match) {
      fence = fence === null ? match[2] : null;
      continue;
    }
    (fence === null ? outside : inside).push(line);
  }
  return { outside: outside.join("\n"), inside: inside.join("\n"), closed: fence === null };
}

function decodeEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function normalizeHeading(text) {
  return text.replace(/`/g, "");
}

function htmlOutline(html) {
  let main = /<main[\s\S]*?<\/main>/.exec(html)?.[0] ?? html;
  main = main.replace(/<figure[^>]*class="doc-example"[\s\S]*?<\/figure>/g, "");
  const h1 = [...main.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/g)].map((m) => normalizeHeading(stripTags(m[1])));
  const h2 = [...main.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/g)].map((m) => normalizeHeading(stripTags(m[1])));
  const metaDescription = decodeEntities(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "");
  // Page-action anchors (#62 split control): the menu's View item plus
  // the noscript fallback, matched by class prefix. Default (no-site)
  // builds add no AI anchors, so every match must be the page's own .md
  // href. --site builds are verified by the browser suite + DOCS_VERIFY_SITE.
  const mdLinks = [...main.matchAll(/<a[^>]*class="page-action[^"]*"[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  return { h1, h2, metaDescription, mdLinks };
}

function mdH2(text) {
  return splitFences(text)
    .outside.split("\n")
    .map((line) => /^##\s+(.+?)\s*$/.exec(line)?.[1])
    .filter(Boolean);
}

function mdLinks(text) {
  return [...splitFences(text).outside.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
}

const allFiles = await walk(distDir);
const mdFiles = allFiles
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.slice(distDir.length + 1))
  .sort();

const expectedMd = [
  "components.md",
  "components/button.md",
  "components/card.md",
  "components/dialog.md",
  "components/input.md",
  "foundations.md",
  "foundations/color.md",
  "foundations/fonts.md",
  "foundations/identity.md",
  "foundations/interaction.md",
  "foundations/layout-geometry.md",
  "foundations/theming.md",
  "foundations/visual-direction.md",
  "getting-started.md",
  "patterns.md",
  "patterns/empty-state.md",
  "patterns/form-field.md",
  "patterns/page-header.md",
  "patterns/reference-record.md",
  "proposal-review.md",
  "reference.md",
  "reference/component-conventions.md",
  "reference/contributing.md",
  "reference/package-entries.md",
];

ok(
  "endpoint inventory matches the substantive pages exactly",
  JSON.stringify(mdFiles) === JSON.stringify([...expectedMd].sort()),
  mdFiles.join(", "),
);
ok("llms.txt exists at the site root", allFiles.some((f) => f === join(distDir, "llms.txt")));

console.log(`\n== Clean-Markdown pages (base ${base}) ==`);
const mdContents = new Map();
for (const rel of expectedMd) {
  const response = await fetch(origin + site(`/${rel}`));
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  mdContents.set(rel, text);

  ok(`${rel} responds 200 as text/markdown`, response.status === 200 && contentType.includes("text/markdown"), `${response.status} ${contentType}`);
  ok(`${rel} starts with the synthesized H1`, text.startsWith("# "));

  const htmlRel = rel.replace(/\.md$/, "/index.html");
  const html = await readFile(join(distDir, htmlRel), "utf8");
  const outline = htmlOutline(html);
  const mdH1 = /^# (.+)$/m.exec(text)?.[1];
  ok(`${rel} H1 equals the rendered page H1`, mdH1 === outline.h1[0], `${JSON.stringify(mdH1)} vs ${JSON.stringify(outline.h1[0])}`);
  ok(`${rel} lede equals the authored meta description`, text.split("\n").includes(outline.metaDescription));
  ok(
    `${rel} H2 outline equals the rendered H2 outline`,
    JSON.stringify(mdH2(text).map(normalizeHeading)) === JSON.stringify(outline.h2),
    JSON.stringify(mdH2(text)),
  );
  if (rel.startsWith("components/")) {
    ok(
      `${rel} retains component export and maturity metadata`,
      /^Component export: `[^`]+` from `@augurproject\/design-system` — status: (planned|draft|stable|deprecated)\.$/m.test(text),
    );
  }

  const { outside, closed } = splitFences(text);
  ok(`${rel} code fences are balanced`, closed);
  ok(`${rel} has no MDX imports outside fences`, !/^import\s/m.test(outside));
  ok(`${rel} has no MDX expressions outside fences`, !/\{(?:examples|AUGUR_FONTS)[.\s]/.test(outside));
  ok(`${rel} has no component JSX outside fences`, !/<[A-Z][A-Za-z0-9]*(\s|\/?>)/.test(outside));
}

const gettingStarted = mdContents.get("getting-started.md");
ok(
  "getting-started.md keeps its authored consumer examples verbatim",
  gettingStarted.includes('import "@augurproject/design-system/styles.css";') &&
    gettingStarted.includes("npx shadcn@latest add"),
);
ok(
  "getting-started.md contains no unevaluated MDX expressions",
  !gettingStarted.includes("{AUGUR_FONTS.length}"),
);

console.log("\n== Live-example source parity ==");
{
  const examplesDir = join(docsRoot, "src", "examples");
  const modules = (await walk(examplesDir)).filter((f) => f.endsWith(".tsx"));
  const allFenceContent = [...mdContents.values()].map((t) => splitFences(t).inside).join("\n");
  for (const module of modules) {
    const source = (await readFile(module, "utf8")).trimEnd();
    const rel = module.slice(docsRoot.length + 1);
    ok(`${rel} source appears verbatim in the Markdown endpoints`, allFenceContent.includes(source), `${source.length} chars`);
  }

  // Samples are consumer code (#79): the docs frame, not the sample, pins
  // themes and supplies layout. Specimens and compositions whose layout
  // lives in co-located docs CSS are recorded exceptions.
  const docsOwnedPresentation = new Map([
    ["src/examples/color/palette-swatches.tsx", "foundation specimen with docs-owned presentation"],
    ["src/examples/patterns/reference-record.tsx", "composition laid out by its co-located CSS"],
    ["src/examples/patterns/proposal-review.tsx", "composition laid out by its co-located CSS"],
  ]);
  const scopingLessons = new Set(["src/examples/theme/theme-scope.tsx"]);
  for (const module of modules) {
    const rel = module.slice(docsRoot.length + 1);
    if (docsOwnedPresentation.has(rel)) {
      console.log(`  - ${rel}: exception (${docsOwnedPresentation.get(rel)})`);
      continue;
    }
    const source = await readFile(module, "utf8");
    const docsClasses = source.match(/className=\{?["'`][^"'`]*\b(?:example|doc)-[a-z-]+/g) ?? [];
    ok(`${rel} sample uses no docs-site class names`, docsClasses.length === 0, docsClasses.join(", "));
    if (!scopingLessons.has(rel)) {
      ok(`${rel} sample pins no theme (the docs frame does)`, !/data-theme/.test(source));
    }
  }
}

console.log("\n== Markdown link resolution ==");
for (const [rel, text] of mdContents) {
  const links = mdLinks(text);
  let absolute = 0;
  for (const link of links) {
    if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("#")) continue;
    if (!link.startsWith("/")) {
      ok(`${rel} uses only site-absolute or external links`, false, link);
      continue;
    }
    absolute += 1;
    const res = await fetch(origin + link);
    if (res.status !== 200) ok(`${rel} link resolves: ${link}`, false, `${res.status}`);
  }
  ok(`${rel} all ${absolute} internal link(s) resolve under the served base`, true);
}

console.log("\n== Copy/View action wiring ==");
{
  const actionPages = [
    "getting-started/index.html",
    "proposal-review/index.html",
    "foundations/fonts/index.html",
    "foundations/identity/index.html",
    "foundations/theming/index.html",
    "foundations/color/index.html",
    "foundations/interaction/index.html",
    "foundations/layout-geometry/index.html",
    "foundations/visual-direction/index.html",
    "reference/package-entries/index.html",
    "reference/contributing/index.html",
    "reference/component-conventions/index.html",
  ];
  for (const rel of actionPages) {
    const html = await readFile(join(distDir, rel), "utf8");
    const { mdLinks: actions } = htmlOutline(html);
    const expectedHref = site(`/${rel.replace(/\/index\.html$/, ".md")}`);
    // #62: the View entry appears twice in raw HTML (menu item + noscript
    // fallback); both must be the page's own .md representation.
    ok(`${rel} links exactly its .md representation`, actions.length === 2 && actions.every((href) => href === expectedHref), actions.join(", ") || "none");
  }
  const home = await readFile(join(distDir, "index.html"), "utf8");
  ok("home page (landing chrome) renders no Markdown actions", !home.includes("page-action"));
}

console.log("\n== llms.txt ==");
{
  const response = await fetch(origin + site("/llms.txt"));
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  ok("llms.txt responds 200 as text/plain", response.status === 200 && contentType.includes("text/plain"), `${response.status} ${contentType}`);
  ok("llms.txt opens with the project H1", text.startsWith("# Augur Design System\n"));
  ok("llms.txt has a summary blockquote", /^> Documentation for the Augur Design System/m.test(text));
  ok("llms.txt explains the .md convention", text.includes("append `.md`"));
  for (const heading of ["## Documentation", "## Foundations", "## Components", "## Patterns", "## Reference", "## Design authority and changes"]) {
    ok(`llms.txt has section ${heading.slice(3)}`, text.includes(`\n${heading}\n`));
  }
  ok("llms.txt lists the published component pages", text.includes("/components/button.md") && text.includes("/components/card.md"));
  ok("llms.txt points at DESIGN.md", text.includes("https://github.com/jubalm/augur-design-system/blob/main/DESIGN.md"));
  ok("llms.txt points at ARCHITECTURE.md", text.includes("https://github.com/jubalm/augur-design-system/blob/main/ARCHITECTURE.md"));
  ok("llms.txt points at CHANGELOG.md", text.includes("https://github.com/jubalm/augur-design-system/blob/main/CHANGELOG.md"));

  const links = mdLinks(text);
  const internal = links.filter((l) => l.startsWith("/"));
  const external = links.filter((l) => l.startsWith("https://"));
  ok("llms.txt has no non-https, non-site-absolute links", internal.length + external.length === links.length, links.join(" "));
  let resolved = 0;
  for (const link of internal) {
    const res = await fetch(origin + link);
    if (res.status !== 200) ok(`llms.txt link resolves: ${link}`, false, `${res.status}`);
    resolved += 1;
  }
  ok(`llms.txt resolves all ${resolved} internal link(s)`, true);
  const linkedMd = [...new Set(internal.filter((l) => l.endsWith(".md")).map((l) => l.slice(sitePrefix.length).replace(/\.md$/, "")))].sort();
  ok(
    "llms.txt links exactly the full .md inventory",
    JSON.stringify(linkedMd) === JSON.stringify([...expectedMd].map((m) => `/${m.replace(/\.md$/, "")}`).sort()),
    linkedMd.join(", "),
  );
}

server.close();
if (serveRoot !== distDir) await rm(serveRoot, { recursive: true, force: true });

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} assertion(s) failed`);
  process.exit(1);
}
console.log("clean Markdown / llms.txt verification passed");
