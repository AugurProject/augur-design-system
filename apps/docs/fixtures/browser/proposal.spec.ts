// Applied proposal review (issue #52).
import { test, type Page } from "@playwright/test";
import { assertOk, go, openDialog, shot } from "./helpers";

const THEMES = ["light", "dark"] as const;
const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

test.describe("applied proposal review (#52)", () => {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      test(`applied review ${theme}/${viewport.width}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await go(page, "/proposal-review");
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        const applied = await page.evaluate(() => {
          const page = document.querySelector(".proposal-review-page");
          const record = page?.querySelector(".example-record-panel");
          const choices = [...(record?.querySelectorAll(".example-record-choices button") ?? [])];
          const action = page?.querySelector(".aug-page-header-actions form");
          return {
            h1: page?.querySelector("h1")?.textContent?.trim(),
            question: record?.querySelector(".example-record-question")?.textContent?.trim(),
            choices: choices.map((choice) => ({
              text: choice.textContent?.trim(),
              unavailable: choice.getAttribute("aria-disabled"),
              pressed: choice.getAttribute("aria-pressed"),
              rect: { width: Math.round(choice.getBoundingClientRect().width), height: Math.round(choice.getBoundingClientRect().height) },
            })),
            action: action?.getAttribute("action"),
            actionLabel: action?.querySelector("button")?.textContent?.trim(),
            details: document.querySelector("#proposal-details")?.textContent?.replace(/\s+/g, " ").trim(),
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            signal: getComputedStyle(record?.querySelector(".example-record-signal") as Element).backgroundColor,
            actionBackground: getComputedStyle(action?.querySelector("button") as Element).backgroundColor,
            edges: (() => {
              const r = (el: Element | null | undefined) => el?.getBoundingClientRect();
              const header = r(page?.querySelector(".aug-page-header"));
              const actionRect = r(action?.querySelector("button"));
              const details = r(document.querySelector("#proposal-details"));
              const recordRect = r(record);
              const outline = record ? parseFloat(getComputedStyle(record).outlineWidth) : 0;
              return {
                headerLeft: Math.round(header?.left ?? 0),
                fieldLeft: Math.round((recordRect?.left ?? 0) - outline),
                fieldRight: Math.round((recordRect?.right ?? 0) + outline),
                detailsLeft: Math.round(details?.left ?? 0),
                detailsRight: Math.round(details?.right ?? 0),
                actionRight: Math.round(actionRect?.right ?? 0),
              };
            })(),
          };
        });
        assertOk(`applied review has one static task ${theme}/${viewport.width}`, applied.h1 === "Proposal review" && applied.question === "Did the proposal pass before 30 June?", JSON.stringify(applied));
        assertOk(
          `applied review keeps equal unavailable choices ${theme}/${viewport.width}`,
          applied.choices.length === 2 &&
            applied.choices.map((choice) => choice.text).join("/") === "Yes/No" &&
            applied.choices.every((choice) => choice.unavailable === "true" && choice.pressed === null && choice.rect.width === applied.choices[0].rect.width),
          JSON.stringify(applied.choices),
        );
        assertOk(`applied review has an honest in-page primary action ${theme}/${viewport.width}`, applied.action === "#proposal-details" && applied.actionLabel === "Review details" && !!applied.details?.includes("no voting logic"), JSON.stringify(applied));
        assertOk(`applied review has no horizontal overflow ${theme}/${viewport.width}`, applied.overflow === false);
        assertOk(
          `applied review keeps one green: the action carries it and the record rule is quiet ${theme}/${viewport.width}`,
          applied.signal !== applied.actionBackground,
          `${applied.signal} vs ${applied.actionBackground}`,
        );
        const e = applied.edges;
        assertOk(
          `applied review shares one left edge and one right edge ${theme}/${viewport.width}`,
          Math.abs(e.fieldLeft - e.headerLeft) <= 1 &&
            Math.abs(e.detailsLeft - e.headerLeft) <= 1 &&
            Math.abs(e.detailsRight - e.fieldRight) <= 1 &&
            (viewport.width < 600 || Math.abs(e.actionRight - e.fieldRight) <= 1),
          JSON.stringify(e),
        );
        await page.getByRole("button", { name: "Review details", exact: true }).click();
        await page.waitForFunction(() => location.hash === "#proposal-details");
        assertOk(
          `applied review action reaches details ${theme}/${viewport.width}`,
          await page.locator("#proposal-details").evaluate((details) => document.activeElement === details || location.hash === "#proposal-details"),
        );
        await shot(page, `proposal-review-${theme}-${viewport.width}`, true);
      });
    }
  }
});

test.describe("review type + record cross-check (#52)", () => {
  for (const theme of THEMES) {
    for (const viewport of [...VIEWPORTS, { width: 768, height: 1024 }] as const) {
      test(`review type/record ${theme}/${viewport.width}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await go(page, "/foundations/fonts");
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await page.evaluate(() => document.fonts.ready);
        const type = await page.evaluate(() => {
          const rows = [...document.querySelectorAll(".type-compare-row")];
          const notes = document.querySelector(".type-specimen-notes") as HTMLElement;
          return {
            widths: rows.map((r) => r.children[0].getBoundingClientRect().width / r.getBoundingClientRect().width),
            noteColumns: getComputedStyle(notes).gridTemplateColumns.split(" ").length,
            weights: [...notes.querySelectorAll("h3")].map((h) => getComputedStyle(h).fontWeight),
            bodyLines: [...notes.querySelectorAll("p")].map((h) => getComputedStyle(h).lineHeight),
          };
        });
        assertOk(`review type samples retain readable width ${theme}/${viewport.width}`, type.widths.every((w) => w > (viewport.width < 600 ? 0.95 : 0.45)), JSON.stringify(type.widths));
        assertOk(
          `review support headings are Sora 600 over a regular body ${theme}/${viewport.width}`,
          type.weights.every((w) => w === "600") && type.bodyLines.every((l) => l === "24px"),
          JSON.stringify(type),
        );
        assertOk(`review tablet support grid ${theme}/${viewport.width}`, type.noteColumns === (viewport.width >= 600 && viewport.width < 960 ? 3 : 1));

        await go(page, "/patterns/reference-record");
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        const records = await page.locator(".example-record-panel").evaluateAll((panels) =>
          panels.map((panel) => ({
            text: panel.textContent ?? "",
            gap: getComputedStyle(panel.querySelector(".example-record-choices") as Element).gap,
            disabled: [...panel.querySelectorAll("button")].every((b) => b.getAttribute("aria-disabled") === "true"),
            edge: getComputedStyle(panel).borderColor,
            quiet: getComputedStyle(panel).getPropertyValue("--border-quiet"),
          })),
        );
        assertOk(
          `review fixed static record ${theme}/${viewport.width}`,
          records.every((r) => ["Open query", "LQ-042", "Did the proposal pass before 30 June?", "Not submitted", "Closes", "14:32 UTC"].every((t) => r.text.includes(t)) && r.disabled),
        );
        assertOk(`review equal choice gap ${theme}/${viewport.width}`, records.every((r) => r.gap === (viewport.width < 600 ? "16px" : "24px")));
      });
    }
  }
});

test.describe("review 44px touch sweep", () => {
  for (const theme of THEMES) {
    for (const route of ["/components/button", "/components/input", "/components/dialog"]) {
      test(`touch targets ${theme} ${route}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const page: Page = await context.newPage();
        await go(page, route);
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        if (route.endsWith("dialog")) {
          await openDialog(page, page.getByRole("button", { name: "Open dialog", exact: true }));
        }
        const splitTrigger = page.getByRole("button", { name: "More page actions" });
        if (await splitTrigger.count()) await splitTrigger.click();
        const targets = await page
          .locator(".aug-button,.aug-input,.aug-dialog-close,.theme-toggle,.page-action,.page-action-menu-item,.browse-summary")
          .evaluateAll((els) =>
            els
              .filter((e) => e.getBoundingClientRect().width)
              .map((e) => ({ name: e.className, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })),
          );
        assertOk(`review 44px touch targets ${theme}${route}`, targets.every((t) => t.w >= 44 && t.h >= 44), JSON.stringify(targets.filter((t) => t.w < 44 || t.h < 44)));
        if (route.endsWith("dialog")) {
          const dialog = await page.locator(".aug-dialog-content").evaluate((el) => ({ animation: getComputedStyle(el).animationName, padding: getComputedStyle(el).paddingTop }));
          assertOk(`review immediate mobile Dialog ${theme}`, dialog.animation === "none" && dialog.padding === "16px", JSON.stringify(dialog));
          await page.keyboard.press("Escape");
        }
        await context.close();
      });
    }
  }
});
