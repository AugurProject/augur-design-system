/**
 * Font delivery and provenance for @augurproject/design-system.
 *
 * Families, delivered weights, and the exact redistribution sources are
 * recorded here as machine-readable constants so consumers (docs site,
 * registry, product apps) can render correct stacks and audit provenance
 * without reading node_modules.
 *
 * Prose provenance record: `resources/brand/PROVENANCE.md`. The values
 * must be kept in sync with:
 *   - the `dependencies` in this package's `package.json` (exact pins), and
 *   - the `@import`ed weight files in `src/styles/styles.css`.
 */

/** Fallback-aware stacks, named by voice role (see `src/styles/fonts.css`). */
export const AUGUR_FONT_FAMILIES = {
  /** Primary voice per DESIGN.md typography roles. */
  primary:
    '"Sora", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  /** Secondary voice per DESIGN.md typography roles. */
  secondary:
    '"Schibsted Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
} as const;

/** A font as delivered by this package. */
export interface AugurFontProvenance {
  /** CSS family name as declared by the @font-face rules. */
  family: string;
  /** Redistribution source: self-hostable OFL fontsource package. */
  package: string;
  /** Exact pinned version in package.json. */
  version: string;
  /** SPDX license identifier of the font software. */
  license: string;
  /** Copyright notice required to accompany redistribution. */
  copyright: string;
  /** Upstream font project repository. */
  upstream: string;
  /** Weights shipped through `src/styles/styles.css` (the roles DESIGN.md uses). */
  weights: readonly number[];
}

export const AUGUR_FONTS: readonly AugurFontProvenance[] = [
  {
    family: "Sora",
    package: "@fontsource/sora",
    version: "5.3.0",
    license: "OFL-1.1",
    copyright:
      "Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font)",
    upstream: "https://github.com/sora-xor/sora-font",
    weights: [400, 600],
  },
  {
    family: "Schibsted Grotesk",
    package: "@fontsource/schibsted-grotesk",
    version: "5.3.0",
    license: "OFL-1.1",
    copyright:
      "Copyright 2023 The Schibsted-Grotesk Project Authors (https://github.com/schibsted/schibsted-grotesk)",
    upstream: "https://github.com/schibsted/schibsted-grotesk",
    weights: [400],
  },
] as const;
