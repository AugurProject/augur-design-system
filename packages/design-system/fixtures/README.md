# Font delivery fixture (issue #5)

A minimal rendered fixture that verifies the fonts delivered by
`@augurproject/design-system` in a real browser — no docs app required
(the Astro app is issue #7; CI wiring for browser checks is #6/#15).

## What it proves

- The `@fontsource` font files load over HTTP from a static server rooted
  at this repository (fully self-hosted; no third-party requests).
- `document.fonts.check()` is true for Sora 400, Sora 600, and
  Schibsted Grotesk 400.
- Computed font family, weight, size, line height, and letter spacing of
  all ten `DESIGN.md` typography roles (seven inherited plus the
  issue-45 editorial roles) match the specification.

## Run

Playwright is deliberately not a workspace dependency. Provide it once
via a gitignored link (playwright 1.61.x pins the Chromium build used):

```sh
mkdir -p /tmp/augur-font-verify && cd /tmp/augur-font-verify
bun init -y >/dev/null && bun add playwright@1.61.1
ln -s /tmp/augur-font-verify/node_modules \
      <repo>/packages/design-system/fixtures/node_modules
cd <repo>
bun packages/design-system/fixtures/verify-fonts.mjs
```

Open `http://127.0.0.1:<port>/packages/design-system/fixtures/fonts.html`
yourself (any static server rooted at the repository works) to see the
rendered roles and the on-page evidence panel.

Exit code 0 and a `font delivery verification passed` line mean every
assertion passed; failures are printed per assertion.
