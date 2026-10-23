/**
 * Test-harness proof for issue #6 (deterministic CI and contribution checks).
 *
 * These tests exist to prove the Vitest + Testing Library + axe harness
 * does real work on the real workspace package — not to pad CI green:
 *
 *   1. The public entry point of `@augurproject/design-system` loads and exposes
 *      its documented constants (workspace resolution through Vitest).
 *   2. A consumer-style fixture renders, is accessible to axe, and reacts
 *      to user interaction (React behavior through Testing Library).
 *   3. The stylesheets delivered through the package's `./styles.css`
 *      export satisfy a stylesheet contract: they resolve, and every
 *      custom property they reference is actually declared — the
 *      unit-level analog of `tokens:check` guarding the seams between
 *      generated tokens (#3), fonts/typography styles (#5), and the
 *      theme work landing in #4.
 *
 * The demonstrated failure path (recorded in the PR for #6): removing the
 * button's accessible name produces both a Testing Library query failure
 * and an axe `button-name` violation; referencing an undeclared token in
 * `AUGUR_TOGGLE_TOKENS` fails the stylesheet contract.
 */
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AUGUR_FONT_FAMILIES, AUGUR_FONTS } from "@augurproject/design-system";
import { AugurToggle, AUGUR_TOGGLE_TOKENS } from "./fixtures/AugurToggle";
import { injectPackageStyles } from "./support/styles";

describe("public entry point of @augurproject/design-system", () => {
  test("exposes the documented font constants through the workspace link", () => {
    expect(AUGUR_FONTS.map((font) => font.family)).toEqual([
      "Sora",
      "Schibsted Grotesk",
    ]);
    expect(AUGUR_FONT_FAMILIES.primary).toContain('"Sora"');
    expect(AUGUR_FONT_FAMILIES.secondary).toContain('"Schibsted Grotesk"');
  });
});

describe("rendered behavior of a consumer-style fixture", () => {
  test("renders an accessible toggle button and reports state changes", async () => {
    const onToggle = vi.fn();
    render(
      <AugurToggle
        label="Watch output"
        description="Demo channel"
        onToggle={onToggle}
      />,
    );

    const button = screen.getByRole("button", { name: "Watch output" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Demo channel")).toHaveClass("augur-type-metadata");

    await userEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test("has no axe accessibility violations", async () => {
    const { container } = render(
      <AugurToggle label="Watch output" description="Demo channel" />,
    );

    // jsdom has no layout engine, so axe's color-contrast rule cannot
    // produce meaningful results (it reports "incomplete" and emits canvas
    // noise). Real contrast pairings are reviewed in the browser fixture
    // (#5) and will be automated by #15.
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const violations = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.nodes
          .map((node) => node.target.join(" ") || "(no target)")
          .join(", ")}`,
    );

    expect(violations).toEqual([]);
  });
});

describe("stylesheet contract of the delivered package CSS", () => {
  const packageStyles = injectPackageStyles();

  test("resolves the real stylesheets through the package exports", () => {
    expect(packageStyles.sources).toEqual(
      expect.arrayContaining([
        "styles.css",
        "fonts.css",
        "theme.css",
        "font-stacks.css",
        "typography.css",
        "roles.css",
        "base.css",
        "tokens/tokens.css",
      ]),
    );
    // Non-degenerate guard: the sheets must actually carry the documented
    // font and generated color custom properties, so the contract below
    // can never pass vacuously against empty input.
    expect(packageStyles.declared.has("--augur-font-primary")).toBe(true);
    expect(packageStyles.declared.has("--augur-color-primary")).toBe(true);
  });

  test("declares every custom property it references", () => {
    const missing = [...packageStyles.referenced].filter(
      (name) => !packageStyles.declared.has(name),
    );
    expect(missing).toEqual([]);
  });

  test("declares every design token the test fixtures consume", () => {
    const missing = AUGUR_TOGGLE_TOKENS.filter(
      (token) => !packageStyles.declared.has(token),
    );
    expect(missing).toEqual([]);
  });
});
