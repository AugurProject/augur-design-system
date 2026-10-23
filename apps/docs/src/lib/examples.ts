/**
 * Live-example helper.
 *
 * Convention: a live example is a real module under `src/examples/` that
 * imports from the `@augurproject/design-system` workspace package and renders
 * what consumers actually get. The code sample shown next to the preview
 * is the SAME file, imported with Vite's `?raw` — the sample is derived
 * from the same source as the rendered example, so the two cannot drift.
 * See `src/content/README.md` ("Live examples").
 *
 * Presentation around the sample belongs to the docs frame, not the
 * sample: `themes`, `pair`, and `layout` tell `DocExample` how to stage
 * the module (for example, once per theme in labeled light and dark
 * scopes), so the copied source stays a single-theme consumer sample.
 *
 * Nothing here fakes exports that do not exist: examples import the real
 * `@augurproject/design-system` exports through the same path consumers use — no
 * mock components, no duplicated implementations.
 */
import type { ReactNode } from "react";

/** Kebab-case id, unique across the registry; anchors derive from it. */
const EXAMPLE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ExampleDefinition {
  /** Kebab-case id, unique across the registry (e.g. "font-stacks"). */
  readonly id: string;
  /** Human label, shown as the example caption. */
  readonly title: string;
  /** One sentence on what the example demonstrates. */
  readonly description: string;
  /** The rendered live module (a React component, statically rendered). */
  readonly Component: () => ReactNode;
  /**
   * Source of the example module itself, imported with `?raw` from the
   * exact file rendered as `Component`. Synchronized by construction.
   */
  readonly code: string;
  /**
   * "page" (default) renders the module once, in the page theme. "both"
   * renders the same module twice, in labeled light and dark scopes the
   * frame pins with `data-theme`; the sample itself stays single-theme.
   */
  readonly themes?: "page" | "both";
  /**
   * With `themes: "both"`: "columns" (default) places the scopes side by
   * side when they fit; "rows" stacks them full width, for page-level
   * regions such as PageHeader.
   */
  readonly pair?: "columns" | "rows";
  /**
   * How the stage lays out the module's top-level elements: "stack"
   * (default) stacks them; "inline" wraps them in a row, for controls.
   */
  readonly layout?: "stack" | "inline";
}

/**
 * Validate and freeze an example definition. Fails at module-evaluation
 * time (i.e. at build) with an actionable message when malformed.
 */
export function defineExample(example: ExampleDefinition): ExampleDefinition {
  const { id, title, description, Component, code, themes, pair } = example;
  if (!EXAMPLE_ID.test(id)) {
    throw new Error(`defineExample: id must be kebab-case, got ${JSON.stringify(id)}`);
  }
  if (title.trim() === "" || description.trim() === "") {
    throw new Error(`defineExample(${id}): title and description are required`);
  }
  if (typeof Component !== "function") {
    throw new Error(`defineExample(${id}): Component must be the imported example module's component`);
  }
  if (typeof code !== "string" || code.trim() === "") {
    throw new Error(
      `defineExample(${id}): code must be the example module's own source. ` +
        `Import it with ?raw from the same file as Component, e.g. ` +
        `import ${id}Code from "./path/${id}.tsx?raw"`,
    );
  }
  if (pair !== undefined && themes !== "both") {
    throw new Error(`defineExample(${id}): pair only applies with themes: "both"`);
  }
  return Object.freeze({ ...example, title: title.trim(), description: description.trim() });
}
