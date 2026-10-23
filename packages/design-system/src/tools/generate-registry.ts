/**
 * Registry generator.
 *
 * Generates the shadcn source registry for the Augur starter set from
 * canonical sources only (contract: docs/registry-contract.md §3):
 *
 *   - Root `registry.json` at the repository root (index form, D2).
 *   - Per-item registry-item JSON under `public/r/<name>.json`
 *     (built-item form, GitHub-Pages-compatible layout).
 *   - `registry-src/utils.ts` — generated canonical `cn()`/`cx()` helper
 *     for the `utils` registry item (the package keeps runtime deps at
 *     the font packages, so no canonical cn() exists; this file is a
 *     generated artifact with provenance, like tokens.css).
 *
 * Never hand-copies token values: base tokens are parsed from the
 * generated `src/tokens/tokens.css`; semantic role mappings are parsed
 * from `src/styles/roles.css` (and the system-fallback block is asserted
 * identical to the explicit dark block); font voices are derived from
 * `src/styles/font-stacks.css`; font `@import`s are derived from
 * `src/styles/fonts.css`; the Tailwind `cssVars.theme` map and the
 * `dark` custom variant are parsed from `src/styles/tokens.tailwind.css`.
 * The theme item ships `typography.css` and `base.css` (focus ring, body
 * canvas, reduced-motion gate) as files with their package content
 * unchanged, so registry installs and package imports share one source.
 * Role values stay in the item's `css` payload because the CLI merges
 * `:root`/`.dark` into the consumer's own blocks; a layered file would
 * lose to the unlayered defaults `shadcn init` writes.
 *
 * Component item file content is derived from the canonical component
 * source with documented consumer-shape transforms (contract §5, §7):
 *
 *   1. `import { cx } from ".../internal/cx"` →
 *      `import { cx } from "@/lib/utils"` (the consumer's utils alias;
 *      the generated utils item exports `cx` compatible with `cn`).
 *   2. Cross-item relative imports → alias imports
 *      (`../input/input` → `@/components/ui/input`,
 *       `../page-header/page-header` → `@/components/page-header`).
 *   3. A side-effect `import "./<name>.css"` is prepended to the primary
 *      component file (and to a `<name>-variants.ts` class helper) so
 *      installed source pulls its own stylesheet.
 *
 * `path` on every file entry still points at the canonical repository
 * source (§5.1); `content` is the derived consumer payload. Index entries
 * reference paths only; the per-item JSON under `public/r` carries the
 * inline content.
 *
 * Usage:
 *   bun src/tools/generate-registry.ts            # write artifacts
 *   bun src/tools/generate-registry.ts --check    # verify drift (exit 1 on diff)
 *
 * Ref stamping (contract §14, RELEASING.md): AUGUR_REGISTRY_REF=v<version>
 * stamps `#v<version>` onto every `registryDependencies` address, so the
 * artifacts committed at a release tag resolve their transitive items to
 * that same tag. It must name the release in packages/design-system
 * package.json. Without it, generation writes unstamped addresses (the
 * development channel between releases). `--check` reuses whatever stamp
 * the committed artifacts carry, and fails unless that stamp is absent or
 * names the package version.
 *
 * Deploy-time stamping: AUGUR_REGISTRY_SHA=<full 40-char sha> stamps
 * `#<sha>` instead. The docs deploy workflow uses it for the built-JSON
 * channel it publishes; that output is never committed.
 */

import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const pkgRoot = new URL("../..", import.meta.url).pathname; // packages/design-system
const repoRoot = new URL("../../../../", import.meta.url).pathname; // repository root

function read(rel: string): string {
  return readFileSync(join(pkgRoot, rel), "utf8");
}

// ---------------------------------------------------------------- parsing

/** Parse generated `--augur-color-*` tokens from tokens.css. */
function parseTokens(): Map<string, string> {
  const css = read("src/tokens/tokens.css");
  const map = new Map<string, string>();
  for (const m of css.matchAll(/(--augur-(?:color|spacing|rounded)-[a-z0-9-]+):\s*([^;]+);/g)) {
    map.set(m[1], m[2].trim());
  }
  if (map.size === 0) throw new Error("no --augur-color-* tokens found in tokens.css");
  return map;
}

type RoleMap = Record<string, string>;

/** Parse `--role: var(--augur-color-x)` pairs out of one CSS block. */
function parseRoleBlock(css: string, startMarker: string): RoleMap {
  const idx = css.indexOf(startMarker);
  if (idx < 0) throw new Error(`block not found: ${startMarker}`);
  const open = css.indexOf("{", idx);
  let depth = 1;
  let end = open;
  while (depth > 0 && end < css.length - 1) {
    end++;
    if (css[end] === "{") depth++;
    if (css[end] === "}") depth--;
  }
  const body = css.slice(open + 1, end);
  const roles: RoleMap = {};
  for (const m of body.matchAll(/(?:^|[;{\s])(--[a-z-]+):\s*([^;]+);/g)) {
    if (m[1].startsWith("--augur-")) continue;
    roles[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return roles;
}

/** Parse the theme.css role mappings for light, dark, and the fallback. */
function parseThemeRoles(): { light: RoleMap; dark: RoleMap } {
  const css = read("src/styles/roles.css");
  const light = parseRoleBlock(css, ":root {");
  const dark = parseRoleBlock(css, '[data-theme="dark"],\n.dark {');
  const fallback = parseRoleBlock(css, ':root:not([data-theme="light"]) {');
  const keys = (r: RoleMap) => Object.keys(r).sort().join(",");
  if (keys(dark) !== keys(light)) throw new Error("dark/light role sets differ");
  if (keys(fallback) !== keys(dark) || JSON.stringify(fallback) !== JSON.stringify(dark)) {
    throw new Error("system-preference fallback block differs from explicit dark block");
  }
  return { light, dark };
}

/** Derive the two voice custom properties from fonts.css. */
function parseFontVoices(): { primary: string; secondary: string } {
  const css = read("src/styles/font-stacks.css");
  const voice = (name: string): string => {
    const m = css.match(new RegExp(`--augur-font-${name}:\\s*"([^"]+)"`));
    if (!m) throw new Error(`--augur-font-${name} not found in fonts.css`);
    return `"${m[1]}", ui-sans-serif, system-ui, sans-serif`;
  };
  return { primary: voice("primary"), secondary: voice("secondary") };
}

/** Derive the pinned @fontsource @import list from styles.css. */
function parseFontImports(): string[] {
  const imports = [...read("src/styles/fonts.css").matchAll(/@import "(@fontsource[^"]+)"/g)].map(
    (m) => `@import "${m[1]}"`,
  );
  if (imports.length === 0) throw new Error("no @fontsource imports found in fonts.css");
  return imports;
}

/** Convert a small CSS fragment to the CLI's nested `css` object form:
 * `selector { ... }` becomes a nested object and a bare `@slot;`
 * statement becomes `{ "@slot": "" }`. Declarations are not expected. */
function cssToObject(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let i = 0;
  while (i < text.length) {
    const brace = text.indexOf("{", i);
    const semi = text.indexOf(";", i);
    if (semi >= 0 && (brace < 0 || semi < brace)) {
      const stmt = text.slice(i, semi).trim();
      if (stmt) out[stmt] = "";
      i = semi + 1;
      continue;
    }
    if (brace < 0) break;
    const prelude = text.slice(i, brace).trim().replace(/\s+/g, " ");
    let depth = 1;
    let j = brace + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j++;
    }
    out[prelude] = cssToObject(text.slice(brace + 1, j - 1));
    i = j;
  }
  return out;
}

/** Parse the Tailwind bridge: the `@theme inline` map and the `dark` variant.
 *
 * The CLI cannot write a block-form `@custom-variant` (it turns `@slot;`
 * into declarations), so the registry gets the one-line form built from
 * the bridge's explicit-hook selector (`.dark`, `data-theme`). The OS
 * preference branch stays package-only; roles still follow it. */
function parseTailwindBridge(): { themeVars: Record<string, string>; darkVariant: string } {
  const css = read("src/styles/tokens.tailwind.css").replace(/\/\*[\s\S]*?\*\//g, "");
  const themeStart = css.indexOf("@theme inline {");
  if (themeStart < 0) throw new Error("@theme inline not found in tokens.tailwind.css");
  const themeVars: Record<string, string> = {};
  for (const m of css.slice(themeStart).matchAll(/(--[a-z-]+):\s*([^;]+);/g)) themeVars[m[1]] = m[2].trim();
  const parsed = cssToObject(css.slice(0, themeStart));
  const block = parsed["@custom-variant dark"];
  const explicit = block && typeof block === "object" ? Object.keys(block).find((k) => k.startsWith("&:")) : undefined;
  if (!explicit) throw new Error("@custom-variant dark block with an explicit-hook selector not found in tokens.tailwind.css");
  return { themeVars, darkVariant: `@custom-variant dark (${explicit})` };
}

// ------------------------------------------------------------ theme item

const THEME_DOCS =
  'Apply the theme by setting `data-theme="light|dark"` or the `.dark` class on `<html>` or any container; without either the system preference decides. All installed rules sit in `@layer augur`. Do not import @augurproject/design-system from registry-installed source; this item is self-contained.';

function buildThemeItem(): Record<string, unknown> {
  const tokens = parseTokens();
  const { light, dark } = parseThemeRoles();
  const fonts = parseFontVoices();
  const imports = parseFontImports();

  const rootVars: Record<string, string> = { "color-scheme": "light" };
  for (const t of tokens.keys()) {
    const v = tokens.get(t);
    if (!v) throw new Error(`token ${t} missing from tokens.css (regenerate tokens)`);
    rootVars[t] = v;
  }
  rootVars["--augur-font-primary"] = fonts.primary;
  rootVars["--augur-font-secondary"] = fonts.secondary;

  const { themeVars, darkVariant } = parseTailwindBridge();
  for (const role of Object.keys(light)) {
    const key = `--color${role.replace(/^--/, "-")}`;
    if (themeVars[key] !== `var(${role})`) {
      throw new Error(`tokens.tailwind.css has no ${key}: var(${role}) mapping for role ${role}`);
    }
  }

  // Imports first: the CLI hoists them, and plain CSS ignores an @import
  // that follows a rule.
  const css: Record<string, unknown> = {};
  for (const imp of imports) css[imp] = "";
  css['@import "./styles/augur-typography.css"'] = "";
  css['@import "./styles/augur-base.css"'] = "";
  // Semantic roles travel in `css`, not `cssVars.light`/`dark`: the CLI
  // prefixes cssVars keys with `--` again and maps each non-color value
  // into `@theme inline` as `--role: var(--role)`, which yields invalid
  // `var(----role)` / self-referencing entries in the consumer (issue #94).
  css[":root"] = { ...rootVars, ...light };
  css['[data-theme="light"]'] = { "color-scheme": "light", ...light };
  css[".dark"] = { "color-scheme": "dark", ...dark };
  css['[data-theme="dark"]'] = { "color-scheme": "dark", ...dark };
  css["@media (prefers-color-scheme: dark)"] = {
    ':root:not([data-theme="light"])': { "color-scheme": "dark", ...dark },
  };
  css[darkVariant] = "";

  return {
    name: "augur-theme",
    type: "registry:theme",
    title: "Augur Theme",
    author: "jubalm",
    description:
      "Augur semantic light/dark theme: generated base tokens, shadcn-compatible role mappings, focus and reduced-motion behavior, and self-hosted Sora + Schibsted Grotesk fonts.",
    dependencies: ["@fontsource/sora@5.3.0", "@fontsource/schibsted-grotesk@5.3.0"],
    files: [
      {
        path: "packages/design-system/src/styles/typography.css",
        type: "registry:style",
        target: "src/styles/augur-typography.css",
        content: read("src/styles/typography.css"),
      },
      {
        path: "packages/design-system/src/styles/base.css",
        type: "registry:style",
        target: "src/styles/augur-base.css",
        content: read("src/styles/base.css"),
      },
    ],
    cssVars: { theme: themeVars },
    css,
    docs: THEME_DOCS,
  };
}

// -------------------------------------------------------- component items

const REPO = "jubalm/augur-design-system";

/** The ref to stamp onto registryDependencies, or "" for the unstamped development channel. */
function resolveRef(): string {
  const sha = process.env.AUGUR_REGISTRY_SHA?.trim() ?? "";
  if (sha) {
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("AUGUR_REGISTRY_SHA must be a full 40-char SHA");
    return sha;
  }
  const releaseTag = `v${JSON.parse(read("package.json")).version}`;
  let ref = process.env.AUGUR_REGISTRY_REF?.trim() ?? "";
  if (!ref && process.argv.includes("--check")) {
    // Verify committed artifacts against the stamp they already carry.
    const committed = join(repoRoot, "public/r/button.json");
    const deps: string[] = existsSync(committed)
      ? (JSON.parse(readFileSync(committed, "utf8")).registryDependencies ?? [])
      : [];
    ref = deps[0]?.split("#")[1] ?? "";
  }
  if (ref && ref !== releaseTag) {
    throw new Error(
      `registry ref "${ref}" does not name the package release ${releaseTag}; ` +
        "only the release being cut may be stamped (RELEASING.md)",
    );
  }
  return ref;
}

const ref = resolveRef();
const dep = (name: string) => (ref ? `${REPO}/${name}#${ref}` : `${REPO}/${name}`);
const THEME_DEP = dep("augur-theme");
const UTILS_DEP = dep("utils");

const UTILS_TS = `/**
 * GENERATED FILE — do not edit. Regenerate: \`bun run registry:generate\` in packages/design-system.
 * Verify: \`bun run registry:check\`. Policy: packages/design-system/docs/registry-generation.md.
 *
 * The \`utils\` registry item payload (contract: docs/registry-contract.md §7).
 * Upstream-compatible \`cn()\` signature plus the package's \`cx()\` alias used
 * by every Augur component source.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Augur alias: class joiner used by component sources. */
export const cx = cn;
`;

const ALIAS_REWRITES: Array<[RegExp, string]> = [
  [/from "\.\.\/\.\.\/internal\/cx"/g, 'from "@/lib/utils"'],
  [/from "\.\.\/internal\/cx"/g, 'from "@/lib/utils"'],
  [/from "\.\.\/input\/input"/g, 'from "@/components/ui/input"'],
  [/from "\.\.\/page-header\/page-header"/g, 'from "@/components/page-header"'],
  [/from "\.\.\/button\/button"/g, 'from "@/components/ui/button"'],
  [/from "\.\.\/button\/button-variants"/g, 'from "@/components/ui/button-variants"'],
];

function componentContent(srcRel: string, cssName: string | null): string {
  let content = read(srcRel);
  for (const [re, to] of ALIAS_REWRITES) content = content.replace(re, to);
  if (cssName && !new RegExp(`^import "./${cssName}.css";`, "m").test(content)) {
    // prepend the stylesheet side-effect import after the leading comment block
    const lines = content.split("\n");
    let insertAt = 0;
    if (lines[0]?.startsWith("/*")) {
      while (insertAt < lines.length && !lines[insertAt].includes("*/")) insertAt++;
      insertAt++;
    }
    lines.splice(insertAt, 0, "", `import "./${cssName}.css";`);
    content = lines.join("\n");
  }
  return content;
}

/** The sibling stylesheet a component file pulls in: `button.tsx` and
 * `button-variants.ts` both import `./button.css`, so class-only
 * consumers of `buttonVariants()` get the styles without the component
 * (issue #97). */
function stylesheetFor(base: string): string | null {
  if (base.endsWith(".tsx")) return base.replace(/\.tsx$/, "");
  if (base.endsWith("-variants.ts")) return base.replace(/-variants\.ts$/, "");
  return null;
}

function buildComponentItem(
  name: string,
  type: string,
  targetDir: string,
  files: Array<[srcRel: string, kind: "tsx" | "css"]>,
  extra: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const fileEntries = files.map(([srcRel, kind]) => {
    const base = srcRel.split("/").pop()!;
    const content =
      kind === "tsx"
        ? componentContent(srcRel, stylesheetFor(base))
        : read(srcRel);
    return {
      path: `packages/design-system/${srcRel}`,
      type: kind === "css" ? "registry:file" : type,
      target: `${targetDir}/${base}`,
      content,
    };
  });
  return {
    name,
    type,
    title: name
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" "),
    author: "jubalm",
    description: `Augur ${name.replace(/-/g, " ")} (registry source distribution; contract docs/registry-contract.md).`,
    registryDependencies:
      name === "empty-state"
        ? [THEME_DEP, UTILS_DEP, dep("button"), dep("page-header")]
        : [THEME_DEP, UTILS_DEP],
    files: fileEntries,
    ...extra,
  };
}

// -------------------------------------------------------------- registry

function buildItems(): Array<Record<string, unknown>> {
  return [
    buildThemeItem(),
    {
      name: "utils",
      type: "registry:lib",
      title: "Utils",
      author: "jubalm",
      description:
        "Augur class-name utilities: upstream-compatible cn() plus the cx() alias used by Augur component source.",
      dependencies: ["clsx@2.1.1", "tailwind-merge@3.3.1"],
      files: [
        {
          path: "packages/design-system/registry-src/utils.ts",
          type: "registry:lib",
          target: "@lib/utils.ts",
          content: UTILS_TS,
        },
      ],
    },
    buildComponentItem(
      "button",
      "registry:ui",
      "@ui",
      [
        ["src/components/button/button.tsx", "tsx"],
        ["src/components/button/button-variants.ts", "tsx"],
        ["src/components/button/button.css", "css"],
      ],
      { dependencies: ["radix-ui@1.6.7"] },
    ),
    buildComponentItem("card", "registry:ui", "@ui", [
      ["src/components/card/card.tsx", "tsx"],
      ["src/components/card/card.css", "css"],
    ]),
    buildComponentItem("input", "registry:ui", "@ui", [
      ["src/components/input/input.tsx", "tsx"],
      ["src/components/input/input.css", "css"],
    ]),
    buildComponentItem("form-field", "registry:ui", "@ui", [
      ["src/components/form-field/form-field.tsx", "tsx"],
      ["src/components/form-field/form-field.css", "css"],
    ]),
    buildComponentItem(
      "dialog",
      "registry:ui",
      "@ui",
      [
        ["src/components/dialog/dialog.tsx", "tsx"],
        ["src/components/dialog/dialog.css", "css"],
      ],
      { dependencies: ["radix-ui@1.6.7"] },
    ),
    buildComponentItem("page-header", "registry:block", "@components", [
      ["src/patterns/page-header/page-header.tsx", "tsx"],
      ["src/patterns/page-header/page-header.css", "css"],
    ]),
    buildComponentItem("empty-state", "registry:block", "@components", [
      ["src/patterns/empty-state/empty-state.tsx", "tsx"],
      ["src/patterns/empty-state/empty-state.css", "css"],
    ]),
  ];
}

function buildRegistry(): Record<string, unknown> {
  const items = buildItems();
  // Index form: drop inline content (index references canonical paths;
  // built per-item JSON carries content). Keep path/type/target.
  const indexItems = items.map((item) => ({
    ...item,
    files: ((item.files as Array<Record<string, unknown>> | undefined) ?? []).map(
      ({ content: _c, ...rest }) => rest,
    ),
  }));
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "augur",
    homepage: "https://github.com/jubalm/augur-design-system",
    items: indexItems,
  };
}

// ----------------------------------------------------- completeness checks

function assertCompleteness() {
  const items = buildItems();
  const names = new Set(items.map((i) => i.name as string));
  let failed = false;
  for (const item of items) {
    // every referenced file exists in the repository (contract §5.1)
    for (const f of (item.files as Array<Record<string, string>>) ?? []) {
      if (f.path.includes("registry-src/")) continue; // generator-written artifact
      if (!existsSync(join(pkgRoot, f.path.replace(/^packages\/design-system\//, "")))) {
        console.error(`item ${item.name}: referenced file missing: ${f.path}`);
        failed = true;
      }
    }
    // every registryDependency resolves inside this registry (contract §6.2)
    for (const d of (item.registryDependencies as string[]) ?? []) {
      const depName = d.startsWith(REPO + "/") ? d.slice(REPO.length + 1).split("#")[0] : d;
      if (!names.has(depName)) {
        console.error(`item ${item.name}: registryDependency '${d}' not in registry`);
        failed = true;
      }
    }
    // npm dependencies are exact-pinned (contract §6.1); no devDependencies (§6.4)
    for (const d of (item.dependencies as string[]) ?? []) {
      if (!d.includes("@") || d.endsWith("@") || d.startsWith("@") && !d.slice(1).includes("@")) {
        console.error(`item ${item.name}: dependency '${d}' is not exact-pinned`);
        failed = true;
      }
    }
    if ((item as Record<string, unknown>).devDependencies) {
      console.error(`item ${item.name}: devDependencies are not used by Augur items (§6.4)`);
      failed = true;
    }
    // every component/pattern item depends on the theme and utils (§7.2, §8)
    if (item.type !== "registry:theme" && item.type !== "registry:lib") {
      const deps = (item.registryDependencies as string[]) ?? [];
      for (const required of ["augur-theme", "utils"]) {
        if (!deps.some((d) => d.includes("/" + required))) {
          console.error(`item ${item.name}: missing required dependency on ${required}`);
          failed = true;
        }
      }
    }
  }
  if (failed) throw new Error("registry completeness checks failed");
}

// --------------------------------------------------------------- writing

const isCheck = process.argv.includes("--check");

function writeOut(path: string, content: string) {
  const abs = join(repoRoot, path);
  if (isCheck) {
    if (!existsSync(abs) || readFileSync(abs, "utf8") !== content) {
      console.error(`registry drift: ${path} differs from generated output`);
      console.error("Run: bun run registry:generate  (in packages/design-system)");
      process.exit(1);
    }
  } else {
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
    console.log(`wrote ${path}`);
  }
}

assertCompleteness();

const registry = buildRegistry();
const items = buildItems();

writeOut("packages/design-system/registry-src/utils.ts", UTILS_TS);
writeOut("registry.json", JSON.stringify(registry, null, 2) + "\n");
for (const item of items) {
  writeOut(
    `public/r/${item.name}.json`,
    JSON.stringify({ $schema: "https://ui.shadcn.com/schema/registry-item.json", ...item }, null, 2) +
      "\n",
  );
}

if (isCheck) console.log("registry:check passed — no drift");
else console.log(`registry generation complete (${items.length} items)`);
