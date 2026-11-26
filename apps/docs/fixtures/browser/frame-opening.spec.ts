// Shared frame alignment (#46), the two-lane shell, masthead clearspace,
// the product-first home page, and the type specimen (#48).
import { test, type Page } from "@playwright/test";
import { assertOk, go, ORIGIN, shot, site } from "./helpers";

// --- 10. Shared frame alignment (#46). ------------------------------------
const readFrame = (page: Page) =>
  page.evaluate(() => {
    const cs = (sel: string, prop: string) => {
      const el = document.querySelector(sel);
      return el ? (getComputedStyle(el) as unknown as Record<string, string>)[prop] : null;
    };
    const probeCh = document.createElement("div");
    probeCh.style.width = "65ch";
    probeCh.style.position = "absolute";
    probeCh.style.visibility = "hidden";
    document.body.appendChild(probeCh);
    const measure65 = probeCh.getBoundingClientRect().width;
    probeCh.remove();
    const title = getComputedStyle(document.querySelector(".page-title") as HTMLElement);
    const h2 = document.querySelector(".prose h2");
    return {
      frameMax: cs(".shell", "maxWidth"),
      framePad: cs(".shell", "paddingLeft"),
      mainX: Math.round((document.querySelector(".shell") as HTMLElement).getBoundingClientRect().x),
      proseMax: cs(".prose", "maxWidth"),
      measure65: `${measure65}px`,
      titleFont: `${title.fontFamily.split(",")[0]} ${title.fontWeight} ${title.fontSize}/${title.lineHeight} ${title.letterSpacing}`,
      h2: h2 ? `${getComputedStyle(h2).fontSize}/${getComputedStyle(h2).lineHeight} w${getComputedStyle(h2).fontWeight}` : null,
      logoWidth: (() => {
        const el = document.querySelector(".brand-logo-frame") as HTMLElement | null;
        return el ? Math.round(el.getBoundingClientRect().width) : null;
      })(),
      // 1a clearspace from the tightly cropped 1440×481 master: the "a" is
      // 165px wide and 199px high there.
      clearspace: (() => {
        const logo = document.querySelector(".masthead .brand-logo-frame") as HTMLElement | null;
        const descriptor = document.querySelector(".masthead .brand-lockup-descriptor") as HTMLElement | null;
        const masthead = document.querySelector(".masthead") as HTMLElement | null;
        if (!logo || !masthead) return null;
        const l = logo.getBoundingClientRect();
        const m = masthead.getBoundingClientRect();
        const d = descriptor && descriptor.offsetParent !== null ? descriptor.getBoundingClientRect() : null;
        return {
          aWidth: (l.width * 165) / 1440,
          aHeight: (l.height * 199) / 481,
          descriptorGap: d ? d.left - l.right : null,
          above: l.top - m.top,
          below: m.bottom - l.bottom,
          left: l.left,
        };
      })(),
      lanes: (() => {
        const main = document.querySelector(".doc-main") as HTMLElement;
        const h2 = document.querySelector(".prose > h2") as HTMLElement | null;
        const p = document.querySelector(".prose > p") as HTMLElement | null;
        const table = document.querySelector(".prose > table") as HTMLElement | null;
        const example = document.querySelector(".prose > .doc-example") as HTMLElement | null;
        const r = (el: HTMLElement | null) => (el ? el.getBoundingClientRect() : null);
        return {
          main: main.getBoundingClientRect(),
          h2: r(h2),
          p: r(p),
          table: r(table),
          example: r(example),
        };
      })(),
      descriptor: (() => {
        const el = document.querySelector(".brand-lockup-descriptor");
        if (!el) return null;
        const s = getComputedStyle(el);
        return `${s.textTransform} ${s.letterSpacing} ${s.color}`;
      })(),
      headerBorder: cs(".masthead", "borderBottomColor"),
      controlEdge: cs(".doc-sidebar", "borderRightColor"),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

test.describe("shared frame alignment (#46)", () => {
  test("1440px frame, measure, roles, and both hairlines", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await go(page, ORIGIN + site("/foundations/color"));
    await page.evaluate(() => document.fonts.ready);
    const light = await readFrame(page);
    assertOk("frame is 1400px with 64px gutters at 1440", light.frameMax === "1400px" && light.framePad === "64px", `${light.frameMax} / ${light.framePad}`);
    assertOk("centered frame leaves the 20px side margin at 1440", light.mainX === 20, String(light.mainX));
    assertOk("reading measure is exactly 65ch", Math.abs(parseFloat(light.proseMax as string) - parseFloat(light.measure65)) < 0.5, `${light.proseMax} vs ${light.measure65}`);
    assertOk("page title renders the editorial-title role (Sora 600 60/66, adopted from augur.net)", light.titleFont === "Sora 600 60px/66px -1.8px", light.titleFont);
    assertOk("section headings render the editorial-heading-3 metrics (24/32, Sora 600)", light.h2 === "24px/32px w600", String(light.h2));
    assertOk("header lockup holds the 150px horizontal-lockup minimum", light.logoWidth === 150, String(light.logoWidth));
    const cs1a = light.clearspace;
    assertOk(
      "descriptor, masthead edges, and gutter stay outside the 1a clearspace",
      !!cs1a &&
        cs1a.descriptorGap !== null &&
        cs1a.descriptorGap >= cs1a.aWidth &&
        cs1a.above >= cs1a.aHeight &&
        cs1a.below >= cs1a.aHeight &&
        cs1a.left >= cs1a.aWidth,
      JSON.stringify(cs1a),
    );
    const lanes = light.lanes;
    assertOk(
      "prose, headings, tables, and examples share one left edge",
      !!lanes.h2 && !!lanes.p && !!lanes.table && !!lanes.example &&
        [lanes.p.left, lanes.table.left, lanes.example.left].every((x) => Math.abs(x - lanes.h2!.left) < 1) &&
        Math.abs(lanes.h2.left - lanes.main.left) < 1,
      JSON.stringify(lanes),
    );
    assertOk(
      "tables and examples fill the wide lane; prose keeps the 65ch measure",
      !!lanes.table && !!lanes.example && !!lanes.p &&
        Math.abs(lanes.table.width - lanes.main.width) < 1 &&
        Math.abs(lanes.example.width - lanes.main.width) < 1 &&
        lanes.p.width <= parseFloat(light.measure65) + 0.5,
      JSON.stringify(lanes),
    );
    assertOk("descriptor is the sentence-case editorial label in secondary text (no tracked capitals)", light.descriptor === "none normal rgb(74, 75, 97)", String(light.descriptor));
    assertOk("light header hairline matches the (shared) quiet separator", light.headerBorder === light.controlEdge, `${light.headerBorder} vs ${light.controlEdge}`);
    assertOk("no horizontal overflow at 1440", light.overflowX === false);
    await shot(page, "frame-1440-light", true);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    const dark = await readFrame(page);
    assertOk(
      "dark editorial separator is the quiet Surface 3 step (header and sidebar hairlines share it)",
      dark.headerBorder === "rgb(36, 36, 56)" && dark.headerBorder === dark.controlEdge,
      `${dark.headerBorder} vs sidebar ${dark.controlEdge}`,
    );
    assertOk("dark descriptor flips to the dark secondary role", dark.descriptor === "none normal rgb(161, 161, 184)", String(dark.descriptor));
    await shot(page, "frame-1440-dark", true);
  });

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    test(`narrow frame at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await go(page, ORIGIN + site("/foundations/color"));
      const narrow = await readFrame(page);
      assertOk(`frame uses 24px gutters at ${viewport.width}`, narrow.framePad === "24px", String(narrow.framePad));
      assertOk(`no horizontal overflow at ${viewport.width}`, narrow.overflowX === false);
      if (viewport.width === 390) {
        assertOk("page title follows the fluid editorial-title step at 390px", narrow.titleFont === "Sora 600 35.7px/39.27px -1.071px", narrow.titleFont);
        assertOk("compact masthead keeps the 150px lockup", narrow.logoWidth === 150, String(narrow.logoWidth));
        const cs1a = narrow.clearspace;
        assertOk(
          "compact masthead keeps the 1a clearspace (descriptor hidden)",
          !!cs1a && cs1a.descriptorGap === null && cs1a.above >= cs1a.aHeight && cs1a.below >= cs1a.aHeight && cs1a.left >= cs1a.aWidth,
          JSON.stringify(cs1a),
        );
      }
      await shot(page, `frame-${viewport.width}-light`, true);
    });
  }
});

// --- 11. Home: product first. -------------------------------------------
const readHome = (page: Page) =>
  page.evaluate(() => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const probe = document.createElement("span");
    probe.style.color = primary;
    document.body.appendChild(probe);
    const primaryRgb = getComputedStyle(probe).color;
    probe.remove();
    const main = document.querySelector("main") as HTMLElement;
    // Every painted green in the main region: backgrounds, text, and borders.
    // Entry-point previews are inert specimens (the palette strip shows Deep
    // and Green as samples, as the Color page does), not signals.
    const greens = [...main.querySelectorAll("*")].filter((el) => {
      if (el.closest(".home-door-preview")) return false;
      const s = getComputedStyle(el);
      if ((el as HTMLElement).offsetParent === null && s.position !== "fixed") return false;
      return [s.backgroundColor, s.borderTopColor, s.color].some((c) => c === primaryRgb) &&
        !(s.color === primaryRgb && el.closest(".home-primary-action"));
    });
    const title = document.querySelector(".home-hero h1") as HTMLElement;
    const ts = getComputedStyle(title);
    const action = document.querySelector(".home-primary-action") as HTMLAnchorElement;
    const previews = [...document.querySelectorAll(".home-door-preview")].map((el) => Math.round(el.getBoundingClientRect().top));
    return {
      titleText: title.textContent ?? "",
      titleFont: `${ts.fontWeight} ${ts.fontSize}/${ts.lineHeight}`,
      lede: (document.querySelector(".home-lede") as HTMLElement).textContent?.replace(/\s+/g, " ").trim() ?? "",
      action: {
        tag: action.tagName,
        href: new URL(action.href).pathname,
        classes: action.className,
        background: getComputedStyle(action).backgroundColor,
      },
      primaryRgb,
      greens: greens.map((el) => `${el.tagName}.${(el as HTMLElement).className}`),
      recordSignal: getComputedStyle(document.querySelector(".home-hero .example-record-signal") as HTMLElement).backgroundColor,
      mutedForeground: (() => {
        const s = document.createElement("span");
        s.style.color = "var(--muted-foreground)";
        document.body.appendChild(s);
        const c = getComputedStyle(s).color;
        s.remove();
        return c;
      })(),
      lockups: [...document.querySelectorAll(".brand-logo-frame")].filter((el) => (el as HTMLElement).offsetParent !== null).length,
      statusMentions: (document.body.innerText.match(/Early development/g) ?? []).length,
      previewTops: previews,
      heroColumns: getComputedStyle(document.querySelector(".home-hero") as HTMLElement).gridTemplateColumns.split(" ").length,
      doorColumns: getComputedStyle(document.querySelector(".home-doors") as HTMLElement).gridTemplateColumns.split(" ").length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

test.describe("home page (product first)", () => {
  test("desktop hero, one green signal, entry points, and route links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await go(page, ORIGIN + site("/"));
    await page.evaluate(() => document.fonts.ready);
    const light = await readHome(page);
    assertOk(
      "hero title is the locked message in the editorial-title role",
      light.titleText.trim() === "Make whatmatters clear." && light.titleFont === "600 60px/66px",
      `${light.titleFont} "${light.titleText.replace(/\s+/g, " ").trim()}"`,
    );
    assertOk("lede is the locked shared-interface-language copy", light.lede.startsWith("A shared interface language for Augur: foundations, components, and guidance for clear, consistent interfaces."), light.lede.slice(0, 60));
    assertOk(
      "primary action is a link carrying the package's default Button classes",
      light.action.tag === "A" && light.action.href === "/getting-started" && /\baug-button--default\b/.test(light.action.classes),
      JSON.stringify(light.action),
    );
    assertOk("light primary action paints Deep", light.action.background === "rgb(9, 94, 66)", light.action.background);
    assertOk("the primary action is the view's only green", light.greens.length === 1 && light.greens[0].includes("home-primary-action"), light.greens.join(", "));
    assertOk("hero record rule is quiet", light.recordSignal === light.mutedForeground, `${light.recordSignal} vs ${light.mutedForeground}`);
    assertOk("identity appears once (masthead only)", light.lockups === 1, String(light.lockups));
    assertOk("project status appears once (footer only)", light.statusMentions === 1, String(light.statusMentions));
    assertOk("hero holds message and record side by side", light.heroColumns === 2, String(light.heroColumns));
    assertOk("three entry points share one row", light.doorColumns === 3, String(light.doorColumns));
    assertOk("entry-point previews start on one line", new Set(light.previewTops).size === 1 && light.previewTops.length === 3, light.previewTops.join(","));
    assertOk("no horizontal overflow at 1440", light.overflowX === false);

    const routeHrefs = await page.evaluate(() =>
      [...document.querySelectorAll(".home-door-links a, .home-door-title a, .home-secondary-action, .home-primary-action")].map(
        (a) => new URL(a.getAttribute("href") as string, location.href).pathname,
      ),
    );
    const broken: string[] = [];
    for (const h of routeHrefs) {
      const res = await fetch(ORIGIN + (h.endsWith("/") ? `${h}index.html` : h));
      if (res.status !== 200) broken.push(h);
    }
    assertOk("all 23 home links resolve to built pages", routeHrefs.length === 23 && broken.length === 0, broken.join(", ") || String(routeHrefs.length));
    await shot(page, "home-light-1440", true);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    const dark = await readHome(page);
    assertOk("dark primary action swaps to Green on the same node", dark.action.background === "rgb(42, 231, 168)", dark.action.background);
    assertOk("dark view keeps one green", dark.greens.length === 1, dark.greens.join(", "));
    assertOk("dark hero record rule stays quiet", dark.recordSignal === dark.mutedForeground, `${dark.recordSignal} vs ${dark.mutedForeground}`);
    await shot(page, "home-dark-1440", true);
  });

  test("mobile stacks the home page at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, ORIGIN + site("/"));
    const mobile = await readHome(page);
    assertOk("mobile stacks the hero (message above record)", mobile.heroColumns === 1, String(mobile.heroColumns));
    assertOk("mobile stacks the entry points", mobile.doorColumns === 1, String(mobile.doorColumns));
    assertOk("mobile title follows the fluid editorial-title step", mobile.titleFont === "600 35.7px/39.27px", String(mobile.titleFont));
    assertOk("no horizontal overflow at 390", mobile.overflowX === false);
    await shot(page, "home-light-390", true);
  });
});

// --- 12. Type specimen (issue #48, contract frame B). ---------------------
test.describe("type specimen (#48)", () => {
  const read = (page: Page) =>
    page.evaluate(() => {
      const rows = [...document.querySelectorAll(".type-compare-row")];
      const field = document.querySelector(".type-display-field") as HTMLElement;
      const sample = field?.querySelector(".type-display-sample") as HTMLElement;
      const notes = document.querySelectorAll(".type-specimen-notes > div").length;
      const cs = getComputedStyle(field);
      const sampleCS = getComputedStyle(sample);
      const cols = getComputedStyle(document.querySelector(".type-specimen-grid") as HTMLElement).gridTemplateColumns.split(" ").length;
      return {
        rows: rows.length,
        fieldBg: cs.backgroundColor,
        fieldFg: cs.color,
        sampleWeight: sampleCS.fontWeight,
        sampleSize: sampleCS.fontSize,
        notes,
        cols,
        specs: rows.map((r) => (r.querySelector(".type-compare-spec") as HTMLElement).textContent?.trim().slice(0, 24)),
        rowSampleWeights: rows.slice(0, 3).map((r) => getComputedStyle(r.querySelector("[class*='augur-type-']") as HTMLElement).fontWeight),
      };
    });

  test("desktop specimen roles, grid, and dark inverse field", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await go(page, ORIGIN + site("/foundations/fonts"));
    await page.evaluate(() => document.fonts.ready);
    const light = await read(page);
    assertOk("specimen shows all eighteen roles as compact aligned rows", light.rows === 18, String(light.rows));
    assertOk("display field is the inverse tonal field (light: Navy field, Paper text)", light.fieldBg === "rgb(14, 14, 33)" && light.fieldFg === "rgb(245, 245, 248)", `${light.fieldBg} / ${light.fieldFg}`);
    assertOk("display sample renders Sora 600 at the display role", light.sampleWeight === "600" && light.sampleSize === "40px", `${light.sampleWeight} ${light.sampleSize}`);
    assertOk("three rule-led support notes", light.notes === 3, String(light.notes));
    assertOk("frame B holds the 2:1 specimen grid at 1440", light.cols === 2, String(light.cols));
    assertOk("no false weights: leading samples carry their real roles", light.rowSampleWeights[0] === "600" && light.rowSampleWeights[2] === "600", light.rowSampleWeights.join(", "));
    await shot(page, "type-specimen-light-1440", true);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    const dark = await read(page);
    assertOk("display field swaps Navy/Paper in dark while keeping geometry", dark.fieldBg === "rgb(245, 245, 248)" && dark.fieldFg === "rgb(14, 14, 33)", `${dark.fieldBg} / ${dark.fieldFg}`);
    await shot(page, "type-specimen-dark-1440", true);
  });

  test("frame B stacks at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, ORIGIN + site("/foundations/fonts"));
    const stack = await page.evaluate(() => {
      const grid = document.querySelector(".type-specimen-grid") as HTMLElement;
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const main = grid.children[0].getBoundingClientRect();
      const notes = grid.children[1].getBoundingClientRect();
      return { cols, mainFirst: main.top < notes.top, overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    assertOk("frame B stacks: specimen first, notes below at 390", stack.cols === 1 && stack.mainFirst, `cols=${stack.cols} mainFirst=${stack.mainFirst}`);
    assertOk("no horizontal overflow at 390", stack.overflow === false);
  });
});
