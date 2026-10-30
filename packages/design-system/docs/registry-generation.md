# Registry generation policy

The root `registry.json` and all per-item registry JSON are **generated
artifacts**, like the token output (`src/tokens/`). They are never edited by
hand. Authority chain (contract: [`registry-contract.md`](registry-contract.md)
§3, `token-generation.md`):

```
DESIGN.md → tokens.css (pinned toolchain)
src/styles/roles.css, base.css, typography.css,
  font-stacks.css, fonts.css, tokens.tailwind.css  (canonical relationships)
src/components/*, src/patterns/*              (canonical component source)
        ↓  bun run registry:generate   (this policy)
registry.json (repo root, index form)          — committed
public/r/<name>.json (built-item form)         — committed
packages/design-system/registry-src/utils.ts   — committed
```

## Commands (packages/design-system)

| Command | What it does |
| --- | --- |
| `bun run registry:generate` | Regenerates all three artifact groups from canonical sources. |
| `bun run registry:check` | Regenerates in-memory and fails on any drift (mirrors `tokens:check`). |
| `bun run registry:validate` | `bunx shadcn@4.20.1 registry validate registry.json` from the repo root (pinned CLI, contract §1). |

The registry scripts are not part of the default CI workflow; run them
locally or in release preparation. Schema-level validation with the vendored
schemas (ajv `8.20.0`, fail-closed positives + mutations) lives in
`fixtures/registry/validate-registry-fixtures.mjs`; the generator
additionally runs internal completeness checks (every referenced file exists,
every `registryDependencies` resolves inside the registry, every npm
dependency is exact-pinned, no `devDependencies`, theme+utils required on
every component item).

## What is derived, never hand-copied

- **Base tokens**: parsed from the generated `src/tokens/tokens.css`
  (`--augur-color-*`, uppercased hex) — the curated delivery subset mirrors
  the registry fixture (D5).
- **Semantic roles**: parsed from `src/styles/roles.css` `:root` (light) and
  `[data-theme="dark"], .dark {` (dark) blocks; the generator hard-fails if the
  system-preference fallback block differs from the explicit dark block.
  Role values travel in the item's `css` payload because the CLI merges
  `:root` and `.dark` into the consumer's own unlayered blocks.
- **Fonts**: voice values derived from `src/styles/font-stacks.css` (first
  quoted family per voice, plus the system fallback stack); `@import` lines
  derived from `src/styles/fonts.css`; exact-pinned `@fontsource`
  dependencies per contract §9 (`registry:font` rejected, D4).
- **Tailwind map**: `cssVars.theme` and the block-form `@custom-variant
  dark` are parsed from `src/styles/tokens.tailwind.css`, the package's
  Tailwind bridge export. The generator fails if a role has no mapping.
- **Structural CSS and typography** (body canvas, `:focus-visible` ring,
  6px link offset, reduced-motion gate; the typography role classes): the
  theme item ships `src/styles/base.css` and `src/styles/typography.css` as
  files with their package content unchanged, imported ahead of every rule.
- **Component file content**: canonical component source (contract §5.1 —
  `path` always points at the canonical repository file) with three
  documented consumer-shape transforms:
  1. `import { cx } from ".../internal/cx"` → `import { cx } from "@/lib/utils"`
     (consumer utils alias, §7);
  2. cross-item relative imports → alias imports
     (`../input/input` → `@/components/ui/input`,
     `../page-header/page-header` → `@/components/page-header`);
  3. a side-effect `import "./<name>.css"` is prepended to the primary
     component file, and the component CSS ships as a `registry:file` with an
     explicit `@ui/…`/`@components/…` target. Installed source therefore never
     imports `@augurproject/design-system` (§11) and never relies on bundled npm
     output.

Drift in the generated `augur-theme` item is caught by `registry:check`
(generated output vs the committed `public/r` and `registry.json`) and by the
consumer install smoke (`scripts/consumer-smoke.ts`). The registry fixture
`fixtures/registry/registry-item.fixture.json` is a dated 2026-09-04
`shadcn build` snapshot kept for schema validation only; it is not compared
with the generated item and is not expected to match it.

## Item catalog (starter set, contract §4)

| Item | Type | Target(s) | Extra deps |
| --- | --- | --- | --- |
| `augur-theme` | `registry:theme` | css/cssVars merged | `@fontsource/sora@5.3.0`, `@fontsource/schibsted-grotesk@5.3.0` |
| `utils` | `registry:lib` | `@lib/utils.ts` | `clsx@2.1.1`, `tailwind-merge@3.3.1` |
| `button` | `registry:ui` | `@ui/…` | — |
| `card` | `registry:ui` | `@ui/…` | — |
| `input` | `registry:ui` | `@ui/…` | — |
| `form-field` | `registry:ui` | `@ui/…` | registry-depends on `input` |
| `dialog` | `registry:ui` | `@ui/…` | `radix-ui@1.6.7` |
| `page-header` | `registry:block` | `@components/…` | — |
| `empty-state` | `registry:block` | `@components/…` | registry-depends on `button`, `page-header` |

Every component/pattern item also depends on `augur-theme` and `utils` via
full GitHub addresses (`AugurProject/augur-design-system/<item>`, contract §6.2).

## Pinning and determinism

- Output is deterministic; `registry:check` fails on drift, and the `registry`
  CI job runs it on every pull request and push to `main`.
- A release PR regenerates with `AUGUR_REGISTRY_REF=vX.Y.Z`, which stamps
  `#vX.Y.Z` onto every `registryDependencies` address; the ref must equal the
  version in `package.json` (`RELEASING.md`). Between releases, artifacts may
  be committed unstamped (resolving to the default branch). `registry:check`
  reuses the committed stamp and fails unless it is absent or names the
  package version. Consumers install by release tag (contract §14).
- `AUGUR_REGISTRY_SHA=<40-char sha>` stamps `#<sha>` instead; only the docs
  deploy workflow uses it, for the built-JSON channel it publishes, and that
  output is never committed.
- `public/r/` is the GitHub-Pages-compatible built channel; the root
  `registry.json` is the GitHub source-registry index consumed directly by
  the CLI for `AugurProject/augur-design-system/<item>` installs.

## Theme item and visual parity

The theme item exports every generated color, spacing, and rounded variable,
the maintained typography stylesheet as `src/styles/augur-typography.css`,
and explicit light and dark container scopes. The import is installed through
the existing registry theme mechanism. `registry:check` detects output drift;
`apps/docs/fixtures/acceptance/verify-consumer.mjs` checks rendered values after
a fresh source install. Build success alone does not establish visual parity.
