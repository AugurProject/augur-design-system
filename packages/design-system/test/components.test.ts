/**
 * Component contracts for the first component slice,
 * executable with Bun's built-in runner (`bun test` in this package).
 *
 * Scope here is the pure surface: the exported variant/size class
 * mapping and the public entry point. Rendered keyboard/activation,
 * disabled/loading contracts, HTML semantics, and axe behavior run in
 * the repository Vitest harness (`tests/button-card.test.tsx` via
 * `bun run test` at the root), which owns the jsdom + Testing Library
 * + axe tooling.
 */
import { describe, expect, test } from "bun:test";
import { buttonVariants } from "../src/components/button/button-variants";
import * as entry from "../src/index";

describe("buttonVariants class contract", () => {
  test("defaults to the default variant at the md size", () => {
    expect(buttonVariants()).toBe(
      "aug-button augur-type-control aug-button--default aug-button--md",
    );
  });

  test("maps every documented variant", () => {
    const variants = [
      "default",
      "secondary",
      "destructive",
      "outline",
      "ghost",
      "link",
    ] as const;
    for (const variant of variants) {
      expect(buttonVariants({ variant })).toContain(`aug-button--${variant}`);
    }
  });

  test("maps every documented size", () => {
    for (const size of ["sm", "md", "lg", "xl"] as const) {
      expect(buttonVariants({ size })).toContain(`aug-button--${size}`);
    }
  });

  test("always carries the control typography role", () => {
    expect(buttonVariants({ variant: "link", size: "sm" })).toContain(
      "augur-type-control",
    );
  });
});

describe("public entry point", () => {
  test("exports the #11 component slice as functions", () => {
    const entryExports = entry as unknown as Record<string, unknown>;
    for (const name of [
      "Button",
      "buttonVariants",
      "Card",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardContent",
      "CardFooter",
      "Dialog",
      "DialogTrigger",
      "DialogPortal",
      "DialogOverlay",
      "DialogContent",
      "DialogHeader",
      "DialogFooter",
      "DialogTitle",
      "DialogDescription",
      "DialogClose",
    ]) {
      expect(typeof entryExports[name]).toBe("function");
    }
  });
});
