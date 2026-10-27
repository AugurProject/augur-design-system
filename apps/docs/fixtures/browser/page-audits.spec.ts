// Page audits, theme contract, mobile layout, theming/color demos, and
// the copy-page split action.
import { test, type Page } from "@playwright/test";
import { assertOk, auditPage, go, ORIGIN, readDist, shot, site, waitForIsland } from "./helpers";

// --- 1. Every page: transport, fonts, shell structure. -------------------
const PAGES: Array<[string, string, number?]> = [
  ["/", "Augur Design System", 0],
  ["/getting-started", "Getting started"],
  ["/foundations/fonts", "Fonts and typography"],
  ["/foundations/icons", "Icons"],
  ["/foundations/theming", "Theming"],
  ["/foundations/color", "Color system"],
  ["/foundations/visual-direction", "Visual direction"],
  ["/reference/package-entries", "Package entries"],
  ["/reference/contributing", "Contributing"],
  ["/reference/component-conventions", "Component authoring"],
  ["/components/button", "Button"],
  ["/components/card", "Card"],
  ["/components/dialog", "Dialog"],
  ["/components/input", "Input"],
  ["/patterns/empty-state", "Empty state"],
  ["/patterns/form-field", "Form field"],
  ["/patterns/page-header", "Page header"],
  ["/proposal-review", "Proposal review"],
];

test.describe("page audits (base /)", () => {
  for (const [path, title, nav] of PAGES) {
    test(`audit ${path}`, async ({ page }) => {
      await auditPage(page, ORIGIN + site(path), { expectTitleFragment: title, expectNavLinks: nav });
    });
  }

  test("masthead keeps the minimum-size brand and icon-only repository access", async ({ page }) => {
    await go(page, ORIGIN + site("/"));
    const evidence = await page.evaluate(() => {
      const brand = document.querySelector(".masthead .brand-lockup-art") as HTMLElement | null;
      const repository = document.querySelector(".masthead-repo") as HTMLAnchorElement | null;
      const icon = repository?.querySelector("svg") as SVGElement | null;
      return {
        brandWidth: brand?.style.getPropertyValue("--brand-lockup-width") ?? null,
        repositoryName: repository?.getAttribute("aria-label") ?? null,
        repositoryText: repository?.textContent?.trim() ?? null,
        iconFill: icon?.getAttribute("fill") ?? null,
      };
    });
    assertOk("masthead brand holds the 150px horizontal-lockup minimum", evidence.brandWidth === "150px", JSON.stringify(evidence));
    assertOk("repository link has an accessible name", evidence.repositoryName === "Repository", JSON.stringify(evidence));
    assertOk("repository link is icon-only", evidence.repositoryText === "", JSON.stringify(evidence));
    assertOk("repository icon uses a solid fill", evidence.iconFill === "currentColor", JSON.stringify(evidence));
  });

  test("paired examples keep explicit light and dark specimens", async ({ page }) => {
    const examples = [
      { path: "/patterns/form-field", selector: ".doc-example-theme", distinctSurface: true },
      { path: "/patterns/empty-state", selector: ".doc-example-theme", distinctSurface: true },
      { path: "/components/input", selector: ".doc-example-theme", distinctSurface: true },
      { path: "/patterns/page-header", selector: ".doc-example-theme", distinctSurface: true },
      { path: "/components/button", selector: ".doc-example-theme", distinctSurface: true },
      { path: "/components/card", selector: ".doc-example-theme", distinctSurface: true },
    ] as const;

    for (const example of examples) {
      await go(page, ORIGIN + site(example.path));
      await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
      const evidence = await page.locator(example.selector).evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            theme: element.getAttribute("data-theme"),
            background: style.backgroundColor,
            foreground: style.color,
          };
        }),
      );
      const themes = evidence.map((item) => item.theme).join("/");
      assertOk(`${example.path} pins light and dark specimens`, themes.includes("light") && themes.includes("dark"), themes);
      if (example.distinctSurface) {
        assertOk(`${example.path} keeps paired surface roles distinct`, new Set(evidence.map((item) => item.background)).size >= 2, JSON.stringify(evidence));
      }
    }
  });

  // The example frame can render one module twice (light and dark scopes),
  // so samples rely on useId; any hard-coded id would repeat. Checked per
  // document, which also covers ids shared between separate examples.
  test("rendered pages carry no duplicate ids", async ({ page }) => {
    for (const path of [...PAGES.map(([route]) => route), "/patterns/reference-record"]) {
      await go(page, ORIGIN + site(path));
      const duplicates = await page.evaluate(() => {
        const counts = new Map<string, number>();
        for (const element of document.querySelectorAll("[id]")) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        return [...counts].filter(([, count]) => count > 1).map(([id, count]) => `${id}×${count}`);
      });
      assertOk(`${path} has no duplicate ids`, duplicates.length === 0, duplicates.join(", ") || "unique");
    }
  });

  test("built HTML carries current consumer guidance and pinned theme records", async () => {
    const gettingStarted = await readDist("getting-started/index.html");
    assertOk(
      "getting-started renders current consumer guidance",
      gettingStarted.includes("Choose the consumption path") && gettingStarted.includes("shadcn@latest"),
    );
    const theming = await readDist("foundations/theming/index.html");
    assertOk(
      "theming page exposes pinned light/dark paired records",
      theming.includes('data-theme="dark"') && theming.includes('data-theme="light"'),
    );
  });
});

// --- 2. Theme contract behavior via keyboard. ----------------------------
test.describe("theme contract (keyboard-driven, home page)", () => {
  test("implicit system default, explicit light/dark override, and persistence", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await go(page, ORIGIN + site("/"));
    await waitForIsland(page);
    await page.evaluate(() => document.fonts.ready);
    const snapshot = () =>
      page.evaluate(() => ({
        attr: document.documentElement.dataset.theme ?? null,
        stored: localStorage.getItem("augur-theme"),
        backgroundVar: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
        colorScheme: getComputedStyle(document.documentElement).getPropertyValue("color-scheme").trim(),
        choice: document.querySelector(".masthead-actions .theme-toggle")?.getAttribute("data-theme-choice") ?? null,
        label: document.querySelector(".masthead-actions .theme-toggle")?.getAttribute("aria-label") ?? "",
      }));
    const shows = (theme: string) =>
      page.waitForFunction((t) => document.querySelector(".masthead-actions .theme-toggle")?.getAttribute("data-theme-choice") === t, theme);

    await shows("light");
    const initial = await snapshot();
    assertOk("default follows system: no data-theme attribute", initial.attr === null, String(initial.attr));
    assertOk("default: nothing persisted", initial.stored === null, String(initial.stored));
    assertOk("toggle names the current and next theme", initial.label === "Theme: Light. Switch to Dark", initial.label);

    await page.emulateMedia({ colorScheme: "dark" });
    await shows("dark");
    const systemDark = await snapshot();
    assertOk("system change re-themes without an attribute", systemDark.attr === null && systemDark.colorScheme === "dark", `${systemDark.attr} ${systemDark.colorScheme}`);
    assertOk("system change swaps the --background role", systemDark.backgroundVar !== initial.backgroundVar, `${initial.backgroundVar} -> ${systemDark.backgroundVar}`);
    assertOk("system change persists nothing", systemDark.stored === null, String(systemDark.stored));
    assertOk("toggle tracks the system theme", systemDark.label === "Theme: Dark. Switch to Light", systemDark.label);

    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => document.activeElement?.className ?? "");
    assertOk("first Tab focuses the skip link", String(firstFocus).includes("skip-link"), String(firstFocus));

    const toggle = page.locator(".masthead-actions .theme-toggle");
    assertOk("masthead has a single theme button", (await toggle.count()) === 1);
    await toggle.focus();
    assertOk("toggle button keyboard-focusable", await toggle.evaluate((el) => document.activeElement === el));
    await page.keyboard.press("Enter");
    const afterLight = await snapshot();
    assertOk("press pins the opposite of the system theme", afterLight.attr === "light" && afterLight.choice === "light", `${afterLight.attr} ${afterLight.choice}`);
    assertOk("light override persisted", afterLight.stored === "light", String(afterLight.stored));
    assertOk("light override sets color-scheme: light", afterLight.colorScheme === "light", afterLight.colorScheme);
    await shot(page, "home-light");

    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    const overridden = await snapshot();
    assertOk("explicit override ignores system changes", overridden.attr === "light" && overridden.choice === "light", `${overridden.attr} ${overridden.choice}`);

    await page.keyboard.press("Enter");
    const afterDark = await snapshot();
    assertOk("second press pins dark on <html>", afterDark.attr === "dark", String(afterDark.attr));
    assertOk("dark override persisted", afterDark.stored === "dark", String(afterDark.stored));
    assertOk("dark sets color-scheme: dark", afterDark.colorScheme === "dark", afterDark.colorScheme);
    assertOk("toggle offers Light next", afterDark.label === "Theme: Dark. Switch to Light", afterDark.label);
    await shot(page, "home-dark");

    await page.emulateMedia({ colorScheme: "light" });
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const afterReload = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
    assertOk("dark override persists across reload under a light system (pre-paint script)", afterReload === "dark", String(afterReload));
    await shows("dark");
  });
});

// --- 3. Mobile layout (375px). --------------------------------------------
test.describe("mobile layout (375x812)", () => {
  test("nav collapses into the disclosure and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go(page, ORIGIN + site("/foundations/fonts"));
    await waitForIsland(page);
    const mobile = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      sidebarVisible: getComputedStyle(document.querySelector(".doc-sidebar") as HTMLElement).display !== "none",
      disclosureVisible: getComputedStyle(document.querySelector(".browse-docs") as HTMLElement).display !== "none",
      disclosureOpen: (document.querySelector(".browse-docs") as HTMLDetailsElement).open,
    }));
    assertOk("no horizontal overflow at 375px", mobile.overflow === false);
    assertOk("sidebar hidden on mobile", mobile.sidebarVisible === false);
    assertOk("browse disclosure visible on mobile", mobile.disclosureVisible === true);
    assertOk("browse closed by default", mobile.disclosureOpen === false);

    await page.keyboard.press("Tab"); // skip link
    const summary = page.locator(".browse-docs summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const opened = await page.evaluate(() => ({
      open: (document.querySelector(".browse-docs") as HTMLDetailsElement).open,
      visibleLinks: [...document.querySelectorAll(".browse-panel nav a")].filter((a) => (a as HTMLElement).offsetParent !== null).length,
    }));
    assertOk("disclosure opens via keyboard", opened.open === true);
    assertOk("all 24 links visible when open", opened.visibleLinks === 24, String(opened.visibleLinks));
    await shot(page, "home-mobile-menu-open");

    await page.locator(".browse-panel nav").getByRole("link", { name: "Color system" }).click();
    await page.waitForLoadState("load");
    const decisionH1 = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim());
    assertOk("mobile nav link navigates", String(decisionH1).startsWith("Color system"), String(decisionH1));
  });
});

// --- 4. Theming page demo + paired records (issue #49). -------------------
test.describe("theming page demo (#49 paired records)", () => {
  const readPair = (page: Page) =>
    page.evaluate(() => {
      const panels = [...document.querySelectorAll(".theme-demo-panel")] as HTMLElement[];
      const rects = panels.map((p) => p.getBoundingClientRect());
      const texts = panels.map((p) => p.textContent?.replace(/\s+/g, " ").trim() ?? "");
      return {
        count: panels.length,
        themes: panels.map((p) => p.dataset.theme ?? null),
        bgs: panels.map((p) => getComputedStyle(p).backgroundColor),
        widths: rects.map((r) => Math.round(r.width)),
        heights: rects.map((r) => Math.round(r.height)),
        swatches: document.querySelectorAll(".theme-swatch").length,
        contentParity: texts[0].replace(/light|dark/g, "X") === texts[1].replace(/light|dark/g, "X"),
      };
    });

  test("paired light/dark panels keep geometry and content parity", async ({ page }) => {
    const theming = await auditPage(page, ORIGIN + site("/foundations/theming"), { expectTitleFragment: "Theming" });
    await go(page, ORIGIN + site("/foundations/theming"));
    const pairLight = await readPair(page);
    assertOk("paired records: two pinned panels (light + dark)", pairLight.count === 2 && pairLight.themes[0] === "light" && pairLight.themes[1] === "dark", pairLight.themes.join("/"));
    assertOk("pair paints differently under light host", pairLight.bgs[0] !== pairLight.bgs[1], pairLight.bgs.join(" vs "));
    assertOk("pair content/order identical (title aside)", pairLight.contentParity === true);
    assertOk("pair geometry identical under light host", pairLight.widths[0] === pairLight.widths[1] && Math.abs(pairLight.heights[0] - pairLight.heights[1]) <= 1, `${pairLight.widths.join("x")} / ${pairLight.heights.join("x")}`);
    assertOk("12 role swatches render across the pair", pairLight.swatches === 12, String(pairLight.swatches));
    await shot(page, "theming-paired-light", true);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    const pairDark = await readPair(page);
    assertOk("pair still light+dark under dark host", pairDark.bgs[0] !== pairDark.bgs[1], pairDark.bgs.join(" vs "));
    assertOk("pair geometry identical under dark host", pairDark.widths[0] === pairDark.widths[1] && Math.abs(pairDark.heights[0] - pairDark.heights[1]) <= 1, `${pairDark.widths.join("x")} / ${pairDark.heights.join("x")}`);
    assertOk("theming page nav marks current page", theming.ariaCurrent.includes("Theming"), theming.ariaCurrent.join(", "));
    await shot(page, "theming-paired-dark", true);
  });

  test("color page orders anchors, companions, then surface ladders", async ({ page }) => {
    await go(page, ORIGIN + site("/foundations/color"));
    const groupOrder = await page.evaluate(() =>
      [...document.querySelectorAll(".example-palette-group-title")].map((e) => e.textContent?.trim() ?? ""),
    );
    assertOk(
      "palette order: anchors, companions, then surface ladders",
      JSON.stringify(groupOrder) === JSON.stringify(["Brand anchors", "Companions", "Light surfaces", "Dark surfaces"]),
      groupOrder.join(" | "),
    );
  });
});

// --- 5. Copy page split action (issues #9 and #62). ------------------------
test.describe("copy page split action (issues #9 and #62)", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  for (const route of [site("/foundations/fonts"), site("/getting-started")]) {
    test(`split action on ${route}`, async ({ page }) => {
      const verifySite = process.env.DOCS_VERIFY_SITE?.trim() || undefined;
      const consoleIssues: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") consoleIssues.push(`${msg.type()}: ${msg.text()}`);
      });
      await go(page, ORIGIN + route);

      const rawHtml = await (await fetch(ORIGIN + route)).text();
      assertOk(
        `${route} noscript fallback exposes View as Markdown`,
        /<noscript>\s*<a class="page-action page-action-noscript" href="[^"]+\.md">View as Markdown<\/a>/.test(rawHtml),
        "noscript link",
      );

      const trigger = page.getByRole("button", { name: "More page actions" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const expanded = await trigger.getAttribute("aria-expanded");
      assertOk(`${route} trigger opens the menu (aria-expanded)`, expanded === "true", String(expanded));

      const menuItems = page.locator(".page-action-menu-item");
      const itemCount = await menuItems.count();
      const expectedItems = verifySite ? 3 : 1;
      assertOk(`${route} menu carries exactly ${expectedItems} entr${expectedItems === 1 ? "y" : "ies"} (site ${verifySite ? "configured" : "absent"})`, itemCount === expectedItems, String(itemCount));

      const viewHref = await menuItems.first().getAttribute("href");
      assertOk(`${route} View as Markdown links the .md representation`, typeof viewHref === "string" && viewHref.endsWith(".md"), String(viewHref));
      const response = await fetch(ORIGIN + viewHref);
      const expected = await response.text();
      assertOk(`${route} .md representation is served and starts with the H1`, response.status === 200 && expected.startsWith("# "), `${response.status}, ${expected.length} chars`);

      for (const label of ["Open in ChatGPT", "Open in Claude"]) {
        const link = page.locator(".page-action-menu-item", { hasText: label });
        if (!verifySite) {
          const rendered = await link.count();
          assertOk(`${route} ${label} omitted without a configured site`, rendered === 0, `${rendered} rendered`);
          continue;
        }
        const href = await link.getAttribute("href");
        const rel = await link.getAttribute("rel");
        const targetAttr = await link.getAttribute("target");
        let pass = false;
        let detail = String(href);
        if (href && targetAttr === "_blank" && (rel ?? "").includes("noopener") && (rel ?? "").includes("noreferrer")) {
          try {
            const target = new URL(href);
            const prompt = target.searchParams.get("q") ?? "";
            const expectedUrl = new URL(viewHref ?? "", verifySite).href;
            const expectedPrompt = `Read this Augur Design System documentation page and use it as context:\n${expectedUrl}`;
            pass = prompt === expectedPrompt;
            detail = prompt.split("\n").at(-1) ?? "(empty prompt)";
          } catch (error) {
            detail = String(error);
          }
        }
        assertOk(`${route} ${label} opens the absolute .md URL prompt in a new tab`, pass, detail);
      }

      await page.keyboard.press("Escape");
      const closedByEscape = (await trigger.getAttribute("aria-expanded")) === "false" && !(await page.locator(".page-action-menu").isVisible());
      const focusReturned = await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.hasAttribute("data-action-trigger"));
      assertOk(`${route} Escape closes the menu and returns focus to the trigger`, closedByEscape && focusReturned, `closed=${closedByEscape} focus=${focusReturned}`);

      await trigger.click();
      await page.locator("h1").first().click();
      const closedByOutside = (await trigger.getAttribute("aria-expanded")) === "false" && !(await page.locator(".page-action-menu").isVisible());
      assertOk(`${route} outside click closes the menu`, closedByOutside, String(closedByOutside));

      const copyButton = page.getByRole("button", { name: "Copy page" });
      await copyButton.focus();
      await page.keyboard.press("Enter");
      let copied = true;
      try {
        await page.waitForFunction(() => document.querySelector("[data-copy-status]")?.textContent === "Copied", null, { timeout: 5_000 });
      } catch {
        copied = false;
      }
      assertOk(`${route} Copy page reports Copied (keyboard-operated)`, copied);
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      assertOk(`${route} clipboard equals the clean Markdown byte-for-byte`, clipboard === expected, `${clipboard.length} vs ${expected.length} chars`);

      assertOk(`${route} copy/view produces no console errors/warnings`, consoleIssues.length === 0, consoleIssues.join("; ") || "clean");
    });
  }
});
