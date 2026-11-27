/**
 * Browser verification driver for the font delivery fixture (issue #5).
 *
 * Serves the repository root statically, loads `fonts.html` in headless
 * Chromium, and asserts — against `DESIGN.md` values — that:
 *   1. every delivered font file loads (no console errors, no failed
 *      requests, no third-party requests — delivery is fully self-hosted);
 *   2. `document.fonts.check()` is true for Sora 400/600 and
 *      Schibsted Grotesk 400;
 *   3. computed font family, weight, size, line height, and letter
 *      spacing match `DESIGN.md` for all ten typography roles (the seven
 *      inherited roles plus the issue-45 editorial roles).
 *
 * Playwright is deliberately NOT a workspace dependency (test tooling and
 * CI wiring belong to issues #6/#15). For local runs, provide it via a
 * gitignored link next to this script:
 *
 *     mkdir -p /tmp/augur-font-verify && cd /tmp/augur-font-verify
 *     bun init -y >/dev/null && bun add playwright@1.61.1
 *     ln -s /tmp/augur-font-verify/node_modules \
 *           <repo>/packages/design-system/fixtures/node_modules
 *     cd <repo> && bun packages/design-system/fixtures/verify-fonts.mjs
 *
 * playwright@1.61.x pins Chromium build 1228. Exit code 0 = all
 * assertions passed; 1 = at least one failed.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(repoRoot, path);
    if (!file.startsWith(repoRoot)) throw new Error("traversal");
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
const base = `http://127.0.0.1:${port}`;

let { chromium } = await import("playwright");

const browser = await chromium.launch();
// 1600px wide: the fluid editorial roles reach their DESIGN.md (largest) step.
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
// Registered before navigation so font fetches are actually observed.
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") consoleErrors.push(`${msg.type()}: ${msg.text()}`);
});
const failedResponses = [];
page.on("response", (res) => {
  if (res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`);
});
const externalRequests = [];
page.on("request", (req) => {
  if (!req.url().startsWith(base)) externalRequests.push(req.url());
});

await page.goto(`${base}/packages/design-system/fixtures/fonts.html`);

await page.evaluate(() => document.fonts.ready);

const evidence = await page.evaluate(() => ({
  fontsStatus: document.fonts.status,
  registeredFaceCount: document.fonts.size,
  checks: {
    sora400: document.fonts.check("16px Sora"),
    sora600: document.fonts.check("600 40px Sora"),
    schibsted400: document.fonts.check("16px 'Schibsted Grotesk'"),
  },
  loadedFaces: [...document.fonts]
    .filter((f) => f.status === "loaded")
    .map((f) => `${f.family} ${f.weight} ${f.style}`),
  roles: [...document.querySelectorAll("[data-role]")].map((el) => {
    const s = getComputedStyle(el);
    return {
      role: el.dataset.role,
      family: s.fontFamily,
      weight: s.fontWeight,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
    };
  }),
}));

await browser.close();
server.close();

// --- Assertions, expected values from the DESIGN.md typography block. ---
// Computed font-family strips redundant quotes ("Sora" -> Sora), so both
// sides are normalized before comparison.
const norm = (s) => s.replaceAll('"', "");
const PRIMARY = norm(
  '"Sora", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
);
const SECONDARY = norm(
  '"Schibsted Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
);

const expectations = {
  display: { family: PRIMARY, weight: "600", fontSize: "40px", lineHeight: "44px", letterSpacing: "-0.4px" },
  "heading-1": { family: PRIMARY, weight: "600", fontSize: "28px", lineHeight: "34px", letterSpacing: "-0.14px" },
  "heading-2": { family: PRIMARY, weight: "600", fontSize: "20px", lineHeight: "26px", letterSpacing: "normal" },
  body: { family: SECONDARY, weight: "400", fontSize: "16px", lineHeight: "24px", letterSpacing: "normal" },
  control: { family: PRIMARY, weight: "600", fontSize: "14px", lineHeight: "20px", letterSpacing: "normal" },
  ui: { family: PRIMARY, weight: "400", fontSize: "14px", lineHeight: "20px", letterSpacing: "normal" },
  metadata: { family: SECONDARY, weight: "400", fontSize: "12px", lineHeight: "16px", letterSpacing: "normal" },
  "editorial-display": { family: PRIMARY, weight: "600", fontSize: "72px", lineHeight: "78px", letterSpacing: "normal" },
  "editorial-title": { family: PRIMARY, weight: "600", fontSize: "60px", lineHeight: "66px", letterSpacing: "-1.8px" },
  "editorial-heading-1": { family: PRIMARY, weight: "600", fontSize: "48px", lineHeight: "56px", letterSpacing: "normal" },
  "editorial-heading-2": { family: PRIMARY, weight: "600", fontSize: "40px", lineHeight: "48px", letterSpacing: "normal" },
  "editorial-heading-3": { family: PRIMARY, weight: "600", fontSize: "24px", lineHeight: "32px", letterSpacing: "normal" },
  "editorial-heading-4": { family: PRIMARY, weight: "600", fontSize: "20px", lineHeight: "26px", letterSpacing: "normal" },
  "editorial-lead": { family: SECONDARY, weight: "400", fontSize: "22px", lineHeight: "33px", letterSpacing: "normal" },
  "editorial-reading": { family: SECONDARY, weight: "400", fontSize: "18px", lineHeight: "30px", letterSpacing: "normal" },
  "editorial-meta": { family: SECONDARY, weight: "400", fontSize: "14px", lineHeight: "20px", letterSpacing: "normal" },
  "editorial-caption": { family: SECONDARY, weight: "400", fontSize: "13px", lineHeight: "18px", letterSpacing: "normal" },
  "editorial-label": { family: PRIMARY, weight: "600", fontSize: "14px", lineHeight: "20px", letterSpacing: "normal" },
};

const failures = [];
const ok = (label, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures.push(label);
};

ok("no console errors/warnings", consoleErrors.length === 0, consoleErrors.join("; ") || "clean");
ok("no failed (>=400) responses", failedResponses.length === 0, failedResponses.join("; ") || "clean");
ok("no third-party (non-self-hosted) requests", externalRequests.length === 0, externalRequests.join("; ") || "clean");
ok("document.fonts.status is loaded", evidence.fontsStatus === "loaded", evidence.fontsStatus);
// A face must EXIST for fonts.check() to be meaningful: with zero registered
// faces check() trivially returns true (nothing to load) while text renders
// in fallbacks. document.fonts.size guards that false positive.
ok("@font-face rules registered (document.fonts.size >= 6)", evidence.registeredFaceCount >= 6, `size ${evidence.registeredFaceCount}`);
ok("fonts.check Sora 400", evidence.checks.sora400 === true);
ok("fonts.check Sora 600", evidence.checks.sora600 === true);
ok("fonts.check Schibsted Grotesk 400", evidence.checks.schibsted400 === true);
ok(
  "Sora 400 + 600 and Schibsted Grotesk 400 faces loaded",
  ["Sora 400 normal", "Sora 600 normal", "Schibsted Grotesk 400 normal"].every((f) =>
    evidence.loadedFaces.some((x) => x.startsWith(f)),
  ),
  evidence.loadedFaces.join(", "),
);

for (const [role, expected] of Object.entries(expectations)) {
  const actual = evidence.roles.find((r) => r.role === role);
  if (!actual) {
    ok(`role ${role} present`, false, "element missing in fixture");
    continue;
  }
  for (const key of Object.keys(expected)) {
    ok(`role ${role} ${key}`, norm(actual[key]) === norm(expected[key]), `expected ${expected[key]}, got ${actual[key]}`);
  }
}

console.log("\n--- evidence JSON ---");
console.log(JSON.stringify(evidence, null, 2));

if (failures.length > 0) {
  console.error(`\n${failures.length} assertion(s) failed`);
  process.exit(1);
}
console.log("\nfont delivery verification passed");
