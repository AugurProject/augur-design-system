/**
 * Clean-Markdown derivation for documentation pages.
 *
 * Every substantive docs page has a predictable `.md` representation
 * derived from the SAME authored source that renders the page — the
 * collection entry body (or, for the `getting-started` shell page, the
 * page's own MDX file imported with `?raw`). There is no second authoring
 * path, so the rendered page and the Markdown representation cannot
 * drift (ARCHITECTURE.md, "Documentation Delivery for Humans and LLMs";
 * `src/content/README.md`, "Markdown parity and llms.txt").
 *
 * Derivation rules (line-based, code-fence-aware):
 *
 *   - MDX `import` lines and single-line MDX flow comments are
 *     stripped. Lines inside ``` / ~~~ fences are never transformed.
 *   - MDX expressions `{Expr}` are replaced from EXPRESSION_VALUES, which
 *     computes values from the real package at build time. An unknown
 *     expression-shaped placeholder fails the build.
 *   - Representable components appear as single-line self-closing JSX
 *     elements and are replaced via REPLACEMENTS:
 *       * `<DocExample example={examples.a.b} />` resolves the SAME
 *         registry object the page renders and emits the example's
 *         caption plus its `?raw` module source in a fenced block —
 *         the interactive demo is represented by usable source.
 *       * UI-only live demos (FontRoles, ThemingDemo) are represented
 *         by a one-line description of what renders live.
 *       * An unregistered component fails the build with an actionable
 *         message, so new demos cannot silently produce broken Markdown.
 *   - Site-absolute link targets (`](/path)`) are rewritten through
 *     `withBase()` so every internal link in the output resolves under
 *     both the root and repository-subpath deployments.
 *   - The derivation asserts balanced code fences at the end.
 */
import { AUGUR_FONTS } from "@augurproject/design-system";
import { examples } from "../examples/registry";
import type { ExampleDefinition } from "./examples";
import { withBase } from "./base";

export interface DeriveOptions {
  /** Human-readable source name for error messages, e.g. "foundations/fonts". */
  source: string;
}

/**
 * MDX expression placeholders evaluated at build time from real package
 * data. Keys are the exact expression source text; values are the
 * substituted Markdown text. A body expression that is not listed here
 * and looks like code fails the build (see `replaceExpressions`).
 */
const EXPRESSION_VALUES: Readonly<Record<string, string>> = {
  "AUGUR_FONTS.length": String(AUGUR_FONTS.length),
};

/** Resolve a `examples.a.b` member path against the live-example registry. */
function resolveExample(path: string, source: string): ExampleDefinition {
  const parts = path.trim().split(".");
  if (parts[0] !== "examples" || parts.length < 2) {
    throw new Error(
      `Markdown derivation (${source}): DocExample needs example={examples.<area>.<name} from ` +
        `src/examples/registry.ts, got ${JSON.stringify(path)}`,
    );
  }
  let node: unknown = examples;
  for (const part of parts.slice(1)) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      throw new Error(
        `Markdown derivation (${source}): ${JSON.stringify(path)} does not exist in the example registry`,
      );
    }
    node = (node as Record<string, unknown>)[part];
  }
  const candidate = node as Partial<ExampleDefinition>;
  if (typeof candidate !== "object" || candidate === null || typeof candidate.id !== "string" || typeof candidate.code !== "string") {
    throw new Error(
      `Markdown derivation (${source}): ${JSON.stringify(path)} is not a defined example (defineExample)`,
    );
  }
  return candidate as ExampleDefinition;
}

/**
 * Represent a DocExample block by its caption and the source of the exact
 * module the page renders — usable source, synchronized by construction.
 */
function representDocExample(attrs: string, source: string): string[] {
  const match = /example=\{([^}]+)\}/.exec(attrs);
  if (!match) {
    throw new Error(`Markdown derivation (${source}): DocExample without example={...} attribute`);
  }
  const example = resolveExample(match[1], source);
  return [
    `**Example: ${example.title}** — ${example.description}`,
    "",
    "```tsx",
    ...example.code.trimEnd().split("\n"),
    "```",
  ];
}

/**
 * UI-only live demos: represented by description (ARCHITECTURE.md allows
 * source, description, or a stable link; these demos have no single
 * source module — they render package CSS roles on real markup).
 */
const LIVE_DEMO_DESCRIPTIONS: Readonly<Record<string, string>> = {
  BrandAssetGallery:
    "*Live on the rendered page: official Augur horizontal Color and Reversed lockups, the standalone glyph, and the REP token shown as recovered from the canonical Brand Foundation PDF.*",
  FontRoles:
    "*Live on the rendered page: the seven package typography role classes applied to real markup — sizes, weights, and families come from the package stylesheet, not this document.*",
  ThemingDemo:
    '*Live on the rendered page: side-by-side light and dark panels with semantic role swatches, including a scoped `[data-theme="dark"]` subtree.*',
  DialogPlayground:
    '*Live on the rendered page (client island): three working dialogs — a default modal, a long-content scrolling panel, and a dialog portaled into a scoped `[data-theme="dark"]` subtree — demonstrating open, focus containment, Escape and overlay dismissal, and portal theme inheritance.*',
};

const FENCE = /^(\s*)(`{3,}|~{3,})/;

/** True when the line opens/closes a fenced code block. */
function isFence(line: string, current: string | null): boolean {
  const match = FENCE.exec(line);
  if (!match) return false;
  if (current === null) return true; // opening fence (any marker)
  return match[2].startsWith(current); // closing fence needs the same marker
}

/** Replace MDX expressions outside fences; unknown code-shaped ones fail. */
function replaceExpressions(line: string, source: string): string {
  return line.replace(/\{([^{}\n]+)\}/g, (whole, inner: string) => {
    const key = inner.trim();
    if (key in EXPRESSION_VALUES) return EXPRESSION_VALUES[key];
    const identifierShape = /^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(key);
    if (identifierShape || key.includes("(")) {
      throw new Error(
        `Markdown derivation (${source}): MDX expression {${key}} has no Markdown value. ` +
          "Add it to EXPRESSION_VALUES in src/lib/markdown.ts, computed from the real source.",
      );
    }
    return whole; // prose braces, not an expression
  });
}

/** Rewrite site-absolute markdown link targets through withBase(). */
function rewriteLinks(line: string): string {
  return line.replace(/(\]\()(\/[^)\s]+)(\))/g, (whole, open: string, path: string, close: string) => {
    if (path.startsWith("//")) return whole; // protocol-relative
    return `${open}${withBase(path)}${close}`;
  });
}

/**
 * Derive the clean Markdown body from an authored MDX/Markdown body.
 * Throws with an actionable message when the body uses MDX that has no
 * Markdown representation — the build fails instead of publishing a
 * lossy or hand-maintained duplicate.
 */
export function deriveCleanMarkdown(body: string, options: DeriveOptions): string {
  const { source } = options;
  const out: string[] = [];
  let fence: string | null = null;

  for (const line of body.split("\n")) {
    if (isFence(line, fence)) {
      const match = FENCE.exec(line);
      fence = fence === null ? (match?.[2] ?? "```") : null;
      out.push(line);
      continue;
    }
    if (fence !== null) {
      out.push(line); // fenced code is passed through verbatim
      continue;
    }

    const trimmed = line.trim();

    // MDX imports are runtime wiring, not documentation content.
    if (/^import\s/.test(trimmed)) continue;

    // Single-line MDX flow comments are stripped.
    if (trimmed.startsWith("{/*") && trimmed.endsWith("*/}")) continue;

    // Single-line self-closing representable components.
    const jsx = /^<([A-Z][A-Za-z0-9]*)((?:\s+[^<>]*?)?)\s*\/>$/.exec(trimmed);
    if (jsx) {
      const [, name, attrs] = jsx;
      if (name === "DocExample") {
        out.push(...representDocExample(attrs, source), "");
      } else if (name in LIVE_DEMO_DESCRIPTIONS) {
        out.push(LIVE_DEMO_DESCRIPTIONS[name], "");
      } else {
        throw new Error(
          `Markdown derivation (${source}): <${name} /> has no Markdown representation. Register a ` +
            "description in LIVE_DEMO_DESCRIPTIONS or an example representation in src/lib/markdown.ts, " +
            'or author the content without it — see src/content/README.md, "Markdown parity and llms.txt".',
        );
      }
      continue;
    }

    out.push(rewriteLinks(replaceExpressions(line, source)));
  }

  if (fence !== null) {
    throw new Error(`Markdown derivation (${source}): unbalanced code fence`);
  }

  // Fence-aware post-pass: component remnants mean content the derivation
  // could not represent; fenced code (e.g. example sources, which contain
  // JSX themselves) is exempt. Collapse blank runs outside fences only.
  let outFence: string | null = null;
  let blanks = 0;
  let sawComponent = false;
  const cleaned: string[] = [];
  for (const line of out) {
    if (isFence(line, outFence)) {
      const match = FENCE.exec(line);
      outFence = outFence === null ? (match?.[2] ?? "```") : null;
      blanks = 0;
      cleaned.push(line);
      continue;
    }
    if (outFence !== null) {
      cleaned.push(line);
      continue;
    }
    if (line === "") {
      blanks += 1;
      if (blanks >= 2) continue; // collapse blank runs
    } else {
      blanks = 0;
      if (!sawComponent && /<[A-Z][A-Za-z0-9]*(\s|\/?>)/.test(line)) sawComponent = true;
    }
    cleaned.push(line);
  }
  if (outFence !== null) {
    throw new Error(`Markdown derivation (${source}): unbalanced code fence in derived output`);
  }
  if (sawComponent) {
    throw new Error(
      `Markdown derivation (${source}): component JSX remains in the Markdown output. Components must be ` +
        "single-line self-closing elements with a registered representation " +
        "(src/lib/markdown.ts); see src/content/README.md.",
    );
  }

  return cleaned.join("\n");
}

export interface PageMarkdownInput {
  /** Page title; synthesized as the H1 (bodies must not repeat it). */
  title: string;
  /** One-sentence summary; synthesized as the opening lede paragraph. */
  description: string;
  /** Authored MDX/Markdown body (no H1, starts at H2). */
  body: string;
  /** Component maturity metadata retained in clean Markdown, not page chrome. */
  component?: { exportName: string; status: string };
  /** Source name for error messages. */
  source: string;
}

/** Assemble the full clean-Markdown page: H1, lede, component metadata, and body. */
export function cleanPageMarkdown(page: PageMarkdownInput): string {
  const lines: string[] = [`# ${page.title}`, "", page.description, ""];
  if (page.component) {
    lines.push(
      `Component export: \`${page.component.exportName}\` from \`@augurproject/design-system\` — status: ${page.component.status}.`,
      "",
    );
  }
  lines.push(deriveCleanMarkdown(page.body, { source: page.source }).trim(), "");
  return lines.join("\n");
}

export interface MdxPageSource {
  title: string;
  description: string;
  body: string;
}

/**
 * Parse a page-level MDX file (imported with `?raw`) into its metadata
 * and body so shell pages authored as `src/pages/*.mdx` can feed the
 * same derivation. The frontmatter must carry single-line `title:` and
 * `description:` values — anything else fails the build.
 */
export function mdxPageSource(raw: string, source: string): MdxPageSource {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    throw new Error(`Markdown derivation (${source}): no frontmatter block found`);
  }
  const [, frontmatter, body] = match;
  const scalar = (key: string): string | undefined => {
    const value = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "m").exec(frontmatter)?.[1];
    return value?.replace(/^["'](.*)["']$/, "$1");
  };
  const title = scalar("title");
  const description = scalar("description");
  if (!title || !description) {
    throw new Error(
      `Markdown derivation (${source}): frontmatter must include single-line title and description ` +
        "so the Markdown representation can synthesize the H1 and lede",
    );
  }
  return { title, description, body };
}
