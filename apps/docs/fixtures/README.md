# Docs fixtures

Three verification drivers for the Astro docs app, following the
package fixture pattern (`packages/design-system/fixtures/`).

## Browser verification (Playwright suite)

Stages the **built** `apps/docs` output under the configured base path
and drives it in headless Chromium with `@playwright/test`. The specs
live in `apps/docs/fixtures/browser/` and the runner is configured by
`playwright.config.ts` at the repository root.

### What it proves

- Every page loads with no console errors/warnings, no failed responses,
  and no third-party requests (fonts are fully self-hosted).
- Real font loading: `document.fonts.check()` for Sora 400/600 and
  Schibsted Grotesk 400; computed font-family on `body` (secondary voice)
  and `h1` (primary voice).
- The theme contract: default follows the system preference (no
  `data-theme` attribute), the header toggle pins light/dark on `<html>`,
  the choice persists across reload, and System removes the attribute
  again — driven entirely through the keyboard.
- Keyboard navigation: the skip link receives the first Tab stop and
  header controls are operable with Enter.
- Mobile layout at 375×812: the nav collapses into a native
  `<details>` disclosure, opens via keyboard, links navigate, and the
  page has no horizontal overflow.
- Content: MDX-evaluated package data, the code-synchronized live
  examples (`DocExample` blocks), and the scoped `[data-theme]`
  demonstration render as built.
- Markdown actions: on `foundations/fonts` and
  `getting-started`, `Copy page` (keyboard-operated) reports `Copied`
  through its live region and puts EXACTLY the served `.md` bytes on
  the clipboard (compared byte-for-byte), and `View as Markdown` links
  the direct `.md` representation.
- Starter components in real browsers: the Dialog island —
  keyboard open, focus containment under Tab/Shift+Tab, Escape and
  overlay dismissal, scroll lock and unlock, focus restoration to the
  trigger, ARIA name/description wiring, the dark scoped-portal panel
  inheriting its subtree theme, mobile (375px) panel sizing with no
  horizontal overflow, and reduced-motion transitions collapsing —
  plus Input keyboard focus/typing/ARIA wiring in both themes,
  Button focus-visible and Enter/Space activation, FormField
  label/control wiring, and the PageHeader/EmptyState examples
  rendering as built.

### Run

Playwright 1.61.1 is a root devDependency (pinned; its Chromium build
is the one the assertions are written against), so a frozen workspace
install provides it:

```sh
bun install --frozen-lockfile
bunx playwright install chromium --with-deps   # browsers; --with-deps needs sudo once
bun run --cwd apps/docs build
bun run test:browser
```

The runner starts both static servers itself (`apps/docs/fixtures/
serve.mjs` for the docs build and `serve-bare.mjs` for the bare package
host) and stops them when the run ends.

Scope a run to one area while iterating — the suite is fully parallel
and filters by test title:

```sh
bun run test:browser -- --grep "dialog"
bun run test:browser -- --workers 4
```

For the repository-subpath build, rebuild with the base override and run
the same suite — the server stages `dist` under the base automatically:

```sh
DOCS_BASE_PATH=/augur-design-system bun run --cwd apps/docs build
DOCS_BASE_PATH=/augur-design-system bun run test:browser
```

Exit code 0 means every assertion passed. Screenshots are written to
`/tmp/augur-docs-verify/` as visual evidence and are not committed;
set `PW_SCREENSHOTS=0` to skip them.

## Clean-Markdown and llms.txt verification (`verify-markdown.mjs`)

Serves the **built** `apps/docs` output under the configured base path
and asserts the deterministic Markdown surface (no browser needed):

- Endpoint inventory: exactly the predictable `.md` files exist — one
  per substantive page (foundations, components, patterns, reference,
  and `getting-started`) plus `/llms.txt`. The home page is landing
  chrome and has none.
- Response handling: `.md` served as `text/markdown`, `llms.txt` as
  `text/plain`.
- Content parity with the rendered page: H1 == rendered H1, lede ==
  meta description, and the H2 outline of the Markdown equals the H2
  outline of the rendered HTML (backtick normalization aside).
- Clean-Markdown invariants: balanced fences; no MDX imports,
  expressions, or component JSX outside fences; the authored fenced
  code survives verbatim (including the `import "@augurproject/design-system/styles.css"`
  sample inside a fence); the package-evaluated value
  (`**2 font families**`) appears evaluated.
- Example-source parity: every module under `src/examples/` appears
  verbatim inside some `.md` code fence.
- Link resolution: every site-absolute link in every `.md` file and in
  `llms.txt` resolves under the served base (base-aware, as an external
  consumer would resolve them).
- Action wiring: each substantive page links exactly its `.md`
  representation; the home page renders no actions; `llms.txt` links
  exactly the full `.md` inventory and states honestly when a kind has
  no pages.

### Run

After building (see the base modes above):

```sh
bun apps/docs/fixtures/verify-markdown.mjs
DOCS_BASE_PATH=/augur-design-system bun apps/docs/fixtures/verify-markdown.mjs
```

Exit code 0 and a `clean Markdown / llms.txt verification passed` line
mean every assertion passed, in that base mode. Run it for both base
modes after touching content, derivation, or llms generation.

## Controlled content-failure verification

`verify-content-failures.mjs` proves the acceptance requirement that
invalid required metadata fails the build **clearly**, plus the
component-page section contract:

1. A foundations entry without the required `title`
   (`content/invalid/broken-metadata.md`) is staged into
   `src/content/foundations/`; the build must fail with
   `InvalidContentEntryDataError` naming the entry and the missing
   field.
2. A component page with valid metadata but a body missing the required
   sections (`content/invalid/missing-sections.mdx`) is staged into
   `src/content/components/`; the build must fail naming the entry and
   the missing headings.

Both fixtures are removed again in all cases. Run from the repository
root:

```sh
bun apps/docs/fixtures/verify-content-failures.mjs
```

Exit code 0 and a `content failure verification passed` line mean both
invalid fixtures failed the build exactly as required. Both Astro
content-layer caches are cleared before AND after each scenario build,
so the result cannot depend on a previous regular build or a crashed
prior run, and `dist` is removed at the end (the failing builds may
have partially overwritten it). This is the
docs-side analogue of `tokens:verify-failures` and the registry
invalid fixtures. It runs as the final step of the `docs-verification` CI
job, after the build, `verify-markdown`, and the browser suite.
