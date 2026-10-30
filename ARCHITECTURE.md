# Augur Design System Architecture

This document is the current architectural contract for the repository: structure, dependency boundaries, distribution and tooling direction, documentation architecture, and validation. It records durable decisions rather than project status, history, or backlog.

## 1. Purpose

The **Augur Design System** is the canonical source for Augur's interface language. It provides both:

1. **Human- and AI-readable design guidance** — how Augur interfaces should look, behave, and be composed.
2. **Reusable frontend implementation** — components, tokens, styles, and other primitives that Augur applications consume directly.

Independently developed Augur applications should share a common interface language without repeatedly implementing or interpreting the same design decisions. The system functions as both a **design specification** and an **executable implementation of that specification**.

```tsx
import { Button, Card, Input, Dialog } from "@augurproject/design-system"

import "@augurproject/design-system/styles.css"
```

## 2. Core Principles

### One canonical source

Design guidance and its implementation live together wherever practical. A component's documentation, design rationale, tokens, implementation, examples, and tests do not evolve as disconnected projects.

### Designed for reuse

The system contains interface concepts reusable across Augur products. Product-specific functionality stays inside the product that owns it.

- **Design-system examples:** Button, Input, Dialog, Card, Form Field, Empty State, Page Header, shared layout patterns.
- **Product examples:** Portfolio Performance Chart, Trade Order Form, Customer Profile Panel, product-specific workflows.

If something describes how Augur interfaces generally work, it belongs in the design system. If it describes how a particular Augur product works, it belongs in that product.

### AI-friendly by design

Important design intent is explicit rather than existing only implicitly inside CSS or component implementations. Contributors and agents should be able to determine what the system is, how it is organized, which principles govern it, which components and tokens exist, when components should be used, what conventions contributions follow, where product-specific concerns live, and how to verify conformance.

### Incremental architecture

The system expands without requiring every possible abstraction or package boundary upfront. Internal boundaries stay clear enough that pieces can be extracted later if independent consumers emerge.

## 3. Terminology

- **Design System** — the overall set of decisions, rules, conventions, reusable assets, and implementations governing Augur interfaces. The repository is its canonical home.
- **Foundations** — fundamental design decisions such as color, typography, spacing, sizing, radius, elevation, layout/grid, and motion.
- **Design Tokens** — machine-readable representations of design decisions (for example `color.surface`, `space.md`, `radius.control`).
- **Primitive** — a low-level interface building block that may provide behavior, accessibility, interaction, or basic structure. Radix or equivalent libraries may be used internally where appropriate.
- **Component** — a reusable implementation of an Augur interface element, such as Button, Input, Select, Dialog, Card, Tabs, Tooltip, or Badge.
- **Pattern** — a reusable composition or solution involving multiple interface elements, such as Form Field, Page Header, Empty State, Filter Bar, or Search Interface.
- **Component Library** — the code-facing portion of the design system, consumed as `@augurproject/design-system`.
- **Documentation Site** — the human-facing representation of the design system: foundations, components, patterns, usage guidance, examples, and rationale, rendering the real package components.

## 4. Conceptual Layers

The system follows this dependency direction:

```text
Foundations
     ↓
Tokens
     ↓
Primitives
     ↓
Components
     ↓
Patterns
     ↓
Product Interfaces
```

Dependencies flow downward.

- `Button` may depend on design tokens.
- `FormField` may depend on `Input`.
- `Input` should not depend on `FormField`.
- Tokens should know nothing about components.
- The design system should know nothing about product-specific features.

This layering is conceptual; it does not require each layer to become an independently published package.

## 5. Repository

GitHub repository: `AugurProject/augur-design-system`, transferred from `jubalm/augur-design-system` on 31 October 2026; GitHub redirects the old URLs, including release downloads. The older `augur-design-system-od` repository is not this implementation's source of truth.

Workspace package: `@augurproject/design-system`, under the Augur project's `@augurproject` npm scope (`@augur` on npm belongs to an unrelated company). The name is the code-facing identity used inside the workspace and by consuming Augur applications. The package is not yet published to the npm registry; each GitHub Release attaches an `npm pack` tarball under this name (§16).

The repository contains both the importable design-system package and its documentation website:

```text
augur-design-system/
├── README.md
├── ARCHITECTURE.md
├── DESIGN.md
├── AGENTS.md
├── CHANGELOG.md
├── package.json
├── bun.lock
│
├── resources/
│   └── brand/
│       ├── augur-brand-foundation.pdf
│       └── PROVENANCE.md
│
├── public/
│   └── r/                       # generated registry built-JSON channel
│
├── packages/
│   └── design-system/
│       ├── src/
│       │   ├── components/
│       │   ├── internal/
│       │   ├── patterns/
│       │   ├── styles/
│       │   ├── tokens/
│       │   ├── tools/
│       │   ├── fonts.ts
│       │   └── index.ts
│       ├── docs/                # engineering contracts and mechanics
│       ├── fixtures/
│       ├── registry-src/
│       └── package.json
│
└── apps/
    └── docs/
        ├── src/
        │   ├── components/
        │   ├── content/
        │   ├── examples/
        │   ├── layouts/
        │   ├── lib/
        │   ├── pages/
        │   └── styles/
        ├── fixtures/
        ├── public/
        ├── DEPLOYMENT.md
        └── package.json
```

This is intentionally a small Bun workspace/monorepo. No Turborepo, Nx, or equivalent orchestration layer is required.

## 6. Key Repository Documents

### `ARCHITECTURE.md`

This document. It describes repository structure, boundaries, distribution, tooling, documentation architecture, and validation.

### `DESIGN.md`

Follows the Google Labs `design.md` format. It is the canonical source for design values that fit the format's schema, combining machine-readable YAML tokens with human-readable design rationale. `@google/design.md` is pinned to an exact version; upgrades are deliberate migrations.

```text
DESIGN.md
   │
   ├── lint with pinned @google/design.md
   ├── export machine-readable tokens
   ├── export runtime theme representations
   └── feed docs and component implementation
```

Generated token files, CSS theme output, and other runtime representations derived from `DESIGN.md` are build artifacts, not independently maintained sources of truth. Concepts the schema cannot represent cleanly remain in component code, documentation, or configuration rather than being forced into the format.

### `AGENTS.md`

Stable operating instructions for AI agents and contributors: repository conventions, contribution rules, validation expectations, and how to work with `DESIGN.md` and the component library.

### `README.md`

Entry point for humans: what the project is, what it contains, development commands, and links to deeper sources.

### `resources/`

Upstream source material that informs the design system but is not itself the production implementation source of truth.

```text
resources/brand/augur-brand-foundation.pdf
```

It may be linked from the documentation site as a reference resource. Current tokens, components, `DESIGN.md`, and current docs make clear when implementation has moved beyond an older reference artifact. `resources/brand/PROVENANCE.md` records asset and license provenance.

## 7. Workspace Tooling

### Bun

Bun is the package manager and runtime for the workspace.

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

The documentation application consumes the local package:

```json
{
  "dependencies": {
    "@augurproject/design-system": "workspace:*"
  }
}
```

Bun-specific assumptions remain minimal enough that another package manager or runtime could be adopted if a tooling incompatibility appears. No Turborepo, Nx, or equivalent orchestration layer is required.

### Pinned `@google/design.md`

The repository uses an exact pinned version of `@google/design.md` for linting and export behavior.

```json
{
  "devDependencies": {
    "@google/design.md": "X.Y.Z"
  }
}
```

Avoid `^` or `~` ranges for this dependency.

### Tool versions and upgrades

- **Bun** is pinned to an exact version through the `packageManager` field, and `engines.bun` records the supported minor window. Bun does not enforce either field at install time; CI pins the same version through the workflow-level `BUN_VERSION` variable (kept in sync with `packageManager` by review).
- **`@google/design.md`** upgrades are intentional migrations: update the pin and the lockfile in one reviewed change and re-verify design lint and the token checks against `DESIGN.md`.
- Other dependency ranges are unlocked, but the committed `bun.lock` makes every install reproducible. Lockfile changes happen only through deliberate dependency changes, and `bun install --frozen-lockfile` is the frozen-install path CI uses.
- **tsup is deferred.** No bundled package artifact is needed while consumption is source-based. Revisit only when actual package output is required.
- **oxlint** is pinned loosely, but every CI run installs from the committed `bun.lock`, so the effective version is frozen.
- **TypeScript** is pinned exactly; typescript-eslint does not support the pinned major yet, which is why the code linter is oxlint. Revisit when typescript-eslint supports it.

### Theme mapping

`DESIGN.md` remains canonical for design values that its pinned schema can represent. Light/dark runtime theming does not duplicate those raw values in separately maintained files.

Where additional runtime semantics are needed, use a thin theme-mapping layer that references generated tokens:

```text
DESIGN.md
   ↓
generated base tokens
   ↓
semantic theme mapping
├── light
└── dark
   ↓
CSS variables / runtime theme / component consumption
```

The mapping layer expresses relationships and semantic roles rather than repeating raw values. Raw values live outside `DESIGN.md` only when the pinned schema genuinely cannot represent the required concept.

## 8. Package Structure

Internal structure under `packages/design-system/src/`:

```text
components/    reusable interface elements
internal/      shared implementation internals
patterns/      multi-element compositions
styles/        aggregated styles, fonts, typography, theme
tokens/        generated token artifacts
tools/         package build/generation tooling
fonts.ts       machine-readable font provenance exports
index.ts       public entry point
```

The structure evolves with actual requirements rather than modeling every future possibility.

## 9. Public API

Consumers interact with a stable public API rather than importing arbitrary internal files.

```tsx
import { Button, Card, Input } from "@augurproject/design-system"

import "@augurproject/design-system/styles.css"
```

Additional entry points may be exposed where there is a genuine need (for example `@augurproject/design-system/tokens`). Internal file organization does not automatically become public API.

### Optional bundled package output

The primary consumption path is the shadcn-compatible GitHub registry/source-install workflow. If a bundled package artifact is needed for workspace use or registry publication, use **tsup** initially. Keep this build layer secondary to the source-based shadcn workflow and avoid coupling the architecture to a specific bundler beyond what is necessary.

## 10. Package Build Strategy

The GitHub/shadcn registry path is the primary distribution mechanism, so a bundled package build remains secondary. If `@augurproject/design-system` needs distributable package artifacts, use **tsup** as the initial build tool, scoped to package output rather than repository orchestration. Registry-installed source must not depend on the existence of a bundled npm package.

## 11. Component Foundation

shadcn/ui is the primary compatibility model and implementation starting point where appropriate. The goal is to stay intentionally close to shadcn conventions so the system is familiar to developers and compatible with shadcn-oriented tooling and installation flows.

```text
Augur DESIGN.md / foundations
       ↓
generated Augur tokens
       ↓
Augur component specifications
       ↓
Augur-owned shadcn-compatible components
       ↑
shadcn / Radix implementation patterns
```

Augur owns the resulting APIs, styling, tokens, documentation, and conventions even when implementations originate from shadcn. Where practical, the project uses shadcn registry conventions such as `registry.json`, registry item schemas, `components.json`, and CLI-based source installation. Applications should not need to care whether a component originated from shadcn, Radix, or a custom implementation.

## 12. Documentation Website

The design system has a first-class documentation website. The docs application uses **plain Astro**, without Starlight or another docs framework layer, to keep the site architecture straightforward and directly modifiable from Astro's own conventions.

The site provides introduction, principles, foundations, token documentation, component documentation, live examples, variants and states, usage guidance, accessibility guidance, patterns, implementation/API documentation, and migration guidance where necessary. A component page covers overview, when to use and when not to use, examples, variants, sizes, states, accessibility, API, and design rationale.

The documentation renders components from the actual workspace package:

```tsx
import { Button } from "@augurproject/design-system"
```

This ensures the docs demonstrate the implementation consumers receive. Documentation content and documentation-only dependencies remain isolated under `apps/docs` so they do not enter the consumable component source or package output.

```text
apps/docs/
└── src/
    ├── pages/
    ├── components/
    ├── examples/
    ├── layouts/
    ├── lib/
    └── content/
        ├── foundations/
        ├── components/
        └── patterns/
```

MDX/shared Markdown-oriented content under the docs app is the primary authoring format. The docs app may import from `@augurproject/design-system`; the design-system package must not import from `apps/docs`. Docs deployment is documented in `apps/docs/DEPLOYMENT.md`.

## 13. Documentation Delivery for Humans and LLMs

Every substantive documentation page is exposed in two representations:

1. **Rendered documentation** — the normal website experience with navigation, live examples, visual previews, and interactive content.
2. **Clean Markdown** — a plain Markdown representation suitable for copying, direct linking, indexing, and use as LLM context.

```text
Documentation source
        │
        ├──→ rendered website page
        │
        └──→ clean Markdown representation
```

For example `/docs/foundations/color` and `/docs/foundations/color.md`. The exact URL convention may change, but every substantive page has a predictable Markdown equivalent. The rendered UI exposes `Copy page` (copies the clean Markdown, not rendered HTML) and `View as Markdown` (opens the Markdown representation directly). This is a first-class architectural requirement.

### Documentation source strategy

Where practical, the Markdown representation comes from the same source content used to render the page:

```text
shared documentation source
        │
        ├──→ website renderer
        └──→ Markdown output
```

This reduces drift between the human-facing and LLM-facing representations. Interactive examples and other UI-only elements may be represented in Markdown by their source code, description, or a stable link to the rendered example.

### `llms.txt`

The site provides `llms.txt` at a predictable root URL. It is concise and navigational rather than duplicating the documentation set. It may include a short description, the canonical docs base URL, and pointers to foundations, components, patterns, Markdown pages, `DESIGN.md`, package/API usage, changelog/migration guidance, authoritative sources, and machine-readable indexes if added later. It guides retrieval rather than restating design rules. A more detailed index (for example `/llms-full.txt`) is added only when there is a concrete need.

### Authority and source precedence

Source precedence is explicit. For design values representable by the `DESIGN.md` schema:

```text
DESIGN.md
   ↓
generated runtime tokens / CSS / theme output
   ↓
components and docs
```

For concepts outside that schema, component implementation and current design-system documentation are authoritative for their own domain. Upstream reference material such as the brand foundation PDF informs the system but does not silently override current `DESIGN.md`, generated outputs, component implementation, or current docs.

## 14. Validation and Review

Validation separates deterministic facts from design judgment.

### Deterministic testing

- **Vitest** for unit-level behavior and utilities.
- **Testing Library** for component interaction and rendered behavior.
- **axe** for automated accessibility checks.
- **Playwright** for browser-level behavior and, where useful, screenshot-based visual regression.

The Astro docs routes provide the browser surfaces used by Playwright, so Storybook is not required. Deterministic CI covers builds, types, linting, `DESIGN.md` validity, broken token references, component behavior, and automatable accessibility failures.

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`, with `contents: read` permissions and cancellation of superseded runs on the same ref. Every job installs from the committed `bun.lock` with `--frozen-lockfile`.

| Check name | What it proves |
| --- | --- |
| `design-lint` | `DESIGN.md` is valid under the pinned `@google/design.md` schema. |
| `code-lint` | TypeScript/TSX passes oxlint (typescript, react incl. `rules-of-hooks`, jsx-a11y correctness rules). |
| `typecheck` | `tsc --noEmit` passes for package sources, workspace tooling, and the test harness. |
| `tokens` | Committed token artifacts match a clean regeneration (`tokens:check`), and the controlled generation failure paths exit nonzero (`tokens:verify-failures`). |
| `workspace-smoke` | The workspace links load: package entry, `./styles.css` export, `apps/docs` resolution. |
| `unit-tests` | The Vitest + Testing Library + axe suite passes against the real workspace package. |

The `docs-verification` job covers docs builds, Markdown/browser verification, and content failure checks. A package build remains deferred.

### AI design review

AI review covers coherence and judgment that would otherwise require brittle custom validation scripts. `AGENTS.md` defines the review procedure: compare changes against `DESIGN.md`, affected documentation, related existing components, token reuse and semantic consistency, shadcn/API conventions, accessibility intent, and design-system versus product-specific boundaries. Contributors or coding agents run this review as part of normal development. If automated PR review is added later, it begins as an advisory, non-blocking report; deterministic CI remains the blocking layer.

## 15. Versioning

Released design-system artifacts are explicitly versioned as immutable Git tags
(`vX.Y.Z`); consumers depend on the tag. The pre-1.0 policy and the release
procedure live in [RELEASING.md](RELEASING.md). Documentation deployment is an
explicit maintainer action, independent of releases.

```text
merge to main
├── verify the design system (lint, typecheck, tests, build)
└── no automatic deployment

maintainer action
└── deploy the documentation site (manual workflow dispatch)

release (RELEASING.md)
├── release PR: finalize the changelog, bump the package version,
│   stamp registry artifacts with the release tag; CI must pass
├── Release workflow (manual dispatch on main): re-run CI gates,
│   create the immutable tag vX.Y.Z and the GitHub Release
└── optionally publish @augurproject/design-system later if adopted
```

## 16. Distribution

Distribution is GitHub-first and has two channels that share the same CSS files:

- **Package tarball.** Each GitHub Release attaches `augurproject-design-system-X.Y.Z.tgz`, built with `npm pack`. Projects that do not use React or the shadcn CLI install it by URL and import the CSS exports: `theme.css`, the optional `fonts.css`, `css/<component>.css`, `styles.css` and the Tailwind bridge `tokens.tailwind.css`. All design-system CSS sits in `@layer augur`, and the `.aug-*` class names are stable API. The tarball carries the final package name, so imports do not change when the package moves to the npm registry.
- **shadcn registry.** Projects using shadcn workflows install Augur-owned component source from the registry. Registry items ship the package's CSS files, or values parsed from them, so the channels cannot drift.

Publishing to the npm registry waits for publish access to the `@augurproject` npm org. Package publication, versioning, and release artifacts are maintainer decisions.

## 17. Evolution

The architecture avoids prematurely separating concerns into many packages. It starts with `packages/design-system/`. If independent consumers require it, tokens, icons, or charts could be extracted into separate packages. Extraction happens because a real dependency or distribution boundary exists, not merely because the conceptual layers differ.
