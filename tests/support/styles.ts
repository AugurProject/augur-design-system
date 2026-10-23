/**
 * Loads the stylesheets delivered by `@augurproject/design-system` into the jsdom
 * document and exposes their custom-property surface for contract tests.
 *
 * Resolution goes through the package's documented public exports, not raw
 * file paths, so the harness keeps testing the surface consumers receive:
 *
 *   @augurproject/design-system/styles.css  (aggregator: ./fonts.css,
 *     ./theme.css and its parts, including the generated
 *     ../tokens/tokens.css, then every component stylesheet)
 *
 * Bare-specifier `@import`s (the `@fontsource` files) are skipped: the
 * package documents them as bundle-time imports resolved by Vite/Astro,
 * not by the browser or jsdom. The remaining plain-CSS files are what the
 * unit-level stylesheet contract can honestly assert about.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root (Vitest runs from the root; see vitest.config.ts). */
const repoRoot = process.cwd();

/** Node resolver anchored at the design-system package (see loadPackageStyles). */
const requireFromDesignSystem = createRequire(
  resolve(repoRoot, "packages/design-system/package.json"),
);

/** Resolve a package specifier to a real filesystem path. */
function resolveToPath(specifier: string): string {
  const resolved = requireFromDesignSystem.resolve(specifier);
  return resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved;
}

export interface PackageStyles {
  /** Name of every stylesheet whose text is included in `cssText`. */
  sources: string[];
  /** Concatenated CSS text (the bytes injected into jsdom). */
  cssText: string;
  /** Custom properties declared anywhere in the loaded sheets (`--x:`). */
  declared: Set<string>;
  /** Custom properties referenced anywhere in the loaded sheets (`var(--x)`). */
  referenced: Set<string>;
}

function collectCustomProperties(cssText: string): {
  declared: Set<string>;
  referenced: Set<string>;
} {
  const declared = new Set<string>();
  const referenced = new Set<string>();
  for (const match of cssText.matchAll(/(^|[;{\s])(--[\w-]+)\s*:/g)) {
    declared.add(match[2]);
  }
  for (const match of cssText.matchAll(/var\(\s*(--[\w-]+)/g)) {
    referenced.add(match[1]);
  }
  return { declared, referenced };
}

let cached: PackageStyles | undefined;

/** Load (once) and inject the package stylesheets into `document.head`. */
export function injectPackageStyles(): PackageStyles {
  const styles = loadPackageStyles();
  if (!cached) {
    const element = document.createElement("style");
    element.setAttribute("data-augur-test-styles", "true");
    // jsdom parses `@layer` blocks but its getComputedStyle ignores
    // layered rules, so the wrapper is removed for the jsdom copy only.
    // Layer placement is asserted structurally in
    // packages/design-system/test/semantic-theme.test.ts.
    element.textContent = styles.cssText
      .replace(/@layer augur\s*\{/g, "")
      .replace(/\}\s*\/\* @layer augur \*\//g, "");
    document.head.append(element);
    cached = styles;
  }
  return cached;
}

/** Load the package stylesheets without touching the jsdom document. */
export function loadPackageStyles(): PackageStyles {
  const stylesPath = resolveToPath("@augurproject/design-system/styles.css");
  const pkgDir = resolve(repoRoot, "packages/design-system/src");
  const sources: string[] = [];
  const chunks: string[] = [];
  const seen = new Set<string>();

  // The aggregator, then its relative (same-package) imports, depth first
  // in import order: styles.css → theme.css → tokens, roles, base, …
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const css = readFileSync(file, "utf8");
    for (const match of css.matchAll(/^@import\s+"([^"]+)"[^;]*;/gm)) {
      // Bare specifiers (@fontsource) are bundle-time imports; skipped.
      if (match[1].startsWith(".")) visit(resolve(dirname(file), match[1]));
    }
    sources.push(relative(pkgDir, file).replace(/^styles\//, ""));
    chunks.push(css);
  };
  visit(stylesPath);

  const cssText = chunks.join("\n");
  const { declared, referenced } = collectCustomProperties(cssText);
  return { sources, cssText, declared, referenced };
}
