/**
 * Shared helpers for the docs browser verification suite (issue #73).
 *
 * The suite runs as `@playwright/test` specs against the built docs app
 * (`apps/docs/dist`) plus the bare package host, so the runner can isolate
 * and parallelize independent page loads.
 *
 * Run from the repository root after `bun run --cwd apps/docs build`:
 *
 *     bunx playwright test                 # full suite
 *     bunx playwright test --grep dialog   # one area
 *
 * Env: DOCS_BASE_PATH serves the built output under a repository subpath
 * (same contract as the previous driver); DOCS_VERIFY_SITE (#62) enables the
 * assistant entries in the copy-page assertions; PW_SCREENSHOTS=0 disables
 * evidence screenshots; PW_ORIGIN_PORT / PW_BARE_PORT override the server
 * ports (see playwright.config.ts).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type Page, type Locator, expect } from "@playwright/test";

// Playwright resolves ports in playwright.config.ts (env override, else a
// repository-path-derived default) and passes them to the workers through the
// environment, so there is a single source of truth. Require them rather than
// falling back to a fixed port that might not be the server actually running.
function requiredPort(name: string) {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} is not set to a valid port; run the suite via \`bun run test:browser\``);
  }
  return value;
}

// Playwright transpiles specs to CJS, so `import.meta` is unavailable. The
// suite runs from the repository root (see playwright.config.ts).
export const repoRoot = process.cwd();
export const distDir = join(repoRoot, "apps", "docs", "dist");

const rawBase = process.env.DOCS_BASE_PATH?.trim() || "/";
export const base = "/" + rawBase.split("/").filter(Boolean).join("/");
const sitePrefix = base === "/" ? "" : base;

export const site = (p: string) => `${sitePrefix}${p}`;

export const ORIGIN = `http://127.0.0.1:${requiredPort("PW_ORIGIN_PORT")}`;
export const BARE_ORIGIN = `http://127.0.0.1:${requiredPort("PW_BARE_PORT")}`;

export const SHOTS = process.env.PW_SCREENSHOTS !== "0";
export const SHOT_DIR = "/tmp/augur-docs-verify";

export async function go(page: Page, path: string) {
  // Accept both an absolute URL and a site-relative path so callers cannot
  // silently drop the DOCS_BASE_PATH prefix.
  const url = /^https?:\/\//.test(path) ? path : ORIGIN + site(path);
  await page.goto(url, { waitUntil: "load" });
}

export async function shot(page: Page, name: string, fullPage = false) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage });
}

export function assertOk(label: string, pass: boolean, detail: string | null = "") {
  expect(pass, `${label}${detail ? ` — ${detail}` : ""}`).toBe(true);
}

export async function readDist(relPath: string) {
  return readFile(join(distDir, relPath), "utf8");
}

/** Wait until the ThemeToggle island has hydrated (astro-island upgraded). */
export async function waitForIsland(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("astro-island");
      return !!el && typeof (el as unknown as { hydrate?: unknown }).hydrate === "function";
    },
    null,
    { timeout: 10_000 },
  );
}

/**
 * Keyboard-open a dialog from a trigger and wait for the panel. Island
 * hydration is asynchronous, so press Enter again on a short interval
 * until the panel appears.
 */
export async function openDialog(page: Page, trigger: Locator, timeoutMs = 15_000) {
  await trigger.focus();
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    await page.keyboard.press("Enter");
    try {
      await page.waitForSelector(".aug-dialog-content", { timeout: 500, state: "visible" });
      return;
    } catch {
      if (Date.now() > deadline) throw new Error("dialog panel did not appear within timeout");
    }
  }
}

export type PageEvidence = {
  title: string;
  ariaCurrent: string[];
};

/**
 * Transport, shell structure, and real font loading for one page. The
 * caller supplies the page fixture so the runner can isolate and
 * parallelize each audited route.
 */
export async function auditPage(
  page: Page,
  url: string,
  { expectTitleFragment, expectNavLinks }: { expectTitleFragment?: string; expectNavLinks?: number } = {},
): Promise<PageEvidence> {
  const consoleIssues: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") consoleIssues.push(`${msg.type()}: ${msg.text()}`);
  });
  const failedResponses: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`);
  });
  const externalRequests: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith(ORIGIN)) externalRequests.push(req.url());
  });
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Explicitly load each delivered face before checking: an unused face
  // stays "unloaded" in the FontFaceSet, so fonts.check alone would only
  // pass on pages that happen to use every weight.
  const loadedFaces = await page.evaluate(async () => ({
    sora400: (await document.fonts.load("16px Sora")).length,
    sora600: (await document.fonts.load("600 40px Sora")).length,
    schibsted400: (await document.fonts.load("16px 'Schibsted Grotesk'")).length,
  }));
  const evidence = await page.evaluate(() => {
    const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
    return {
      title: document.title,
      hasSkipLink: !!document.querySelector("a.skip-link"),
      navLinks: [...document.querySelectorAll("nav[aria-label='Documentation'] a")]
        .filter(visible)
        .map((a) => a.textContent?.trim() ?? ""),
      ariaCurrent: [...document.querySelectorAll("nav a[aria-current='page']")]
        .filter(visible)
        .map((a) => a.textContent?.trim() ?? ""),
      faceCount: document.fonts.size,
      checks: {
        sora400: document.fonts.check("16px Sora"),
        sora600: document.fonts.check("600 40px Sora"),
        schibsted400: document.fonts.check("16px 'Schibsted Grotesk'"),
      },
      bodyFamily: getComputedStyle(document.body).fontFamily,
      h1Family: getComputedStyle(document.querySelector("h1") as HTMLElement).fontFamily,
      h1FontSize: getComputedStyle(document.querySelector("h1") as HTMLElement).fontSize,
    };
  });
  assertOk(`${url} no console errors/warnings`, consoleIssues.length === 0, consoleIssues.join("; ") || "clean");
  assertOk(`${url} no failed (>=400) responses`, failedResponses.length === 0, failedResponses.join("; ") || "clean");
  assertOk(`${url} no third-party requests`, externalRequests.length === 0, externalRequests.join("; ") || "clean");
  if (expectTitleFragment) {
    assertOk(`${url} title`, evidence.title.includes(expectTitleFragment), evidence.title);
  }
  assertOk(`${url} skip link present`, evidence.hasSkipLink);
  assertOk(`${url} one visible documentation nav with the expected links`, evidence.navLinks.length === (expectNavLinks ?? 24), evidence.navLinks.join(", "));
  assertOk(`${url} fonts registered (>=6 faces)`, evidence.faceCount >= 6, `size ${evidence.faceCount}`);
  assertOk(`${url} fonts.load Sora 400 resolves a face`, loadedFaces.sora400 >= 1, String(loadedFaces.sora400));
  assertOk(`${url} fonts.load Sora 600 resolves a face`, loadedFaces.sora600 >= 1, String(loadedFaces.sora600));
  assertOk(`${url} fonts.load Schibsted Grotesk 400 resolves a face`, loadedFaces.schibsted400 >= 1, String(loadedFaces.schibsted400));
  assertOk(`${url} fonts.check Sora 400`, evidence.checks.sora400 === true);
  assertOk(`${url} fonts.check Sora 600`, evidence.checks.sora600 === true);
  assertOk(`${url} fonts.check Schibsted Grotesk 400`, evidence.checks.schibsted400 === true);
  assertOk(`${url} body uses Schibsted Grotesk (secondary voice)`, evidence.bodyFamily.includes("Schibsted Grotesk"), evidence.bodyFamily);
  assertOk(`${url} h1 uses Sora (primary voice)`, evidence.h1Family.includes("Sora"), `${evidence.h1Family} @ ${evidence.h1FontSize}`);
  return { title: evidence.title, ariaCurrent: evidence.ariaCurrent };
}
