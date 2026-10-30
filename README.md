# Augur Design System

A shared interface language for Augur: maintained design guidance, generated tokens, reusable React components, and documentation for humans and agents.

## Start here

- [Architecture](ARCHITECTURE.md): repository structure, boundaries, distribution, and tooling.
- [Design specification](DESIGN.md): maintained design values and rationale in Google DESIGN.md format.
- [Agent and contributor instructions](AGENTS.md): how to select, implement, verify, and hand off work.
- [Changelog](CHANGELOG.md): consumer-facing change history.
- [Docs application](apps/docs/README.md): the documentation site, its fixtures, and its deployment.
- [GitHub Project](https://github.com/users/jubalm/projects/6): current priority, readiness, and execution status.
- [Issues](https://github.com/AugurProject/augur-design-system/issues): scope, dependencies, decisions, and acceptance evidence.
- [Brand foundation reference](resources/brand/augur-brand-foundation.pdf): upstream source material, not a runtime implementation.

## What this repository contains

One lightweight Bun workspace contains `packages/design-system` (`@augurproject/design-system`) and `apps/docs` (plain Astro with React and Markdown/MDX). Components follow shadcn conventions where appropriate. Values representable by the pinned `@google/design.md` schema come from `DESIGN.md`; generated tokens feed a thin semantic light/dark mapping layer.

External distribution has two channels, both published as immutable release tags (`vX.Y.Z`). Projects without React or the shadcn CLI install the `@augurproject/design-system` tarball attached to each GitHub Release and import its CSS (`theme.css`, `css/<component>.css`, `styles.css`); see [Package entries](apps/docs/src/content/reference/package-entries.mdx). shadcn projects install source from the GitHub-hosted registry: `bunx shadcn@4.20.1 add "AugurProject/augur-design-system/<item>#vX.Y.Z"`. Changes are recorded in [CHANGELOG.md](CHANGELOG.md), and the release procedure is in [RELEASING.md](RELEASING.md). The docs provide rendered pages, clean Markdown equivalents, and `llms.txt`, deployed as a static site. Architectural detail and decisions live in [ARCHITECTURE.md](ARCHITECTURE.md).

## Development

Requires [Bun](https://bun.com) **1.4.0**, pinned through `packageManager`. The workspace consumes `@augurproject/design-system` through `workspace:*`.

| Command | What it does |
| --- | --- |
| `bun install` | Installs the workspace from the committed `bun.lock`. |
| `bun install --frozen-lockfile` | Frozen install; fails if `package.json` and the lockfile disagree. This is the install CI uses. |
| `bun run lint` | Validates `DESIGN.md` against the schema of the exactly pinned `@google/design.md`. |
| `bun run lint:code` | Lints TypeScript/TSX with [oxlint](https://oxc.rs). |
| `bun run typecheck` | Type-checks package sources, workspace tooling, and the test harness. |
| `bun run check:workspace` | Smoke-checks workspace boundaries and the documented package exports. |
| `bun run test` | Runs the Vitest + Testing Library + axe suite against the real workspace package. |
| `bun run --cwd packages/design-system tokens:check` | Regenerates the base tokens in memory and fails on drift. |
| `bun run --cwd packages/design-system tokens:verify-failures` | Proves the controlled token-generation failure paths exit nonzero and write no artifacts. |
| `bun run --cwd packages/design-system registry:check` | Regenerates the registry artifacts in memory and fails on drift. |
| `bun scripts/consumer-smoke.ts` | Installs every registry item into a fresh consumer and verifies build, render, and overwrite. |
| `bun scripts/package-smoke.ts` | Packs the package tarball, installs it into a plain-HTML consumer, and checks it in Chromium without React, Tailwind or a font import. |
| `bun run check:release X.Y.Z` | Verifies release metadata before tagging (see [RELEASING.md](RELEASING.md)). |

There is deliberately no `build` command yet: a bundled package stays deferred until actual package output is required. Browser and docs checks run through `apps/docs/fixtures` after `bun run --cwd apps/docs build`; see [apps/docs/README.md](apps/docs/README.md).

Use an issue branch and a pull request for implementation. Read the issue's prerequisites before beginning; milestone order alone does not determine readiness. Find ready work through the [GitHub Project](https://github.com/users/jubalm/projects/6) and repository issues.

## Status and ownership

The repository is [AugurProject/augur-design-system](https://github.com/AugurProject/augur-design-system), transferred from `jubalm/augur-design-system` on 31 October 2026, and separate from the earlier OpenDesign repository `jubalm/augur-design-system-od`. Code licensing, asset redistribution, and the documentation domain are tracked in the Project and issues; no license grant is implied by repository visibility.
