# Visual contract reference — issue 42

This non-shipping fixture illustrates the adopted direction in
[`visual-direction.mdx`](../../src/content/foundations/visual-direction.mdx).
It lives outside Astro routes and imports the real `@augurproject/design-system/styles.css`.
Bun bundles the pinned package's Sora 400/600 and Schibsted Grotesk 400 WOFF2
sources as local CSS data URLs; no network font service is involved. Generated
bundle files are ignored. All new geometry and border relationships remain local.

Direction was selected under the [maintainer's delegated authority](https://github.com/jubalm/augur-design-system/issues/42#issuecomment-5556190059).
Final human visual acceptance remains pending #53. This fixture is a reviewed
composition reference, not the shipping docs redesign or a product workflow.
The response buttons change a local preview label only.

## Reproduce

From the repository root:

```sh
bun install --frozen-lockfile
bun apps/docs/fixtures/visual-alignment/review.mjs
```

Playwright uses the root-pinned dependency and installed Chromium. The command
builds the fixture, starts a loopback-only server on an available port, captures
both themes at 1440×1000, 768×1024, and 390×844, verifies its contract, and closes
the server/browser. To inspect interactively:

```sh
bun apps/docs/fixtures/visual-alignment/review.mjs --serve
```

Open the printed URL, optionally adding `?theme=dark`. The three anchored frames
are `#opening`, `#editorial`, and `#compact`. Their review toolbar is outside the
compositions. No developer toolbar or hydration overlay appears in the captures.

## Retained evidence and provenance

The checked-in capture set corresponds to the exact HTML/CSS/script SHA-256
values recorded in [`verification.json`](evidence/verification.json). Its
`sourceCommit` is the baseline revision at capture time, not a false claim that
uncommitted fixture files already existed in that commit. The Git commit that
adds this evidence provides the final immutable revision; PR handoff should link
that commit. Re-running later updates the report's source revision and hashes.

| Theme | Desktop 1440×1000 | Tablet 768×1024 | Mobile 390×844 |
| --- | --- | --- | --- |
| Light | [Full page](evidence/light-1440x1000.png) | [Full page](evidence/light-768x1024.png) | [Full page](evidence/light-390x844.png) |
| Dark | [Full page](evidence/dark-1440x1000.png) | [Full page](evidence/dark-768x1024.png) | [Full page](evidence/dark-390x844.png) |

Keyboard selection/focus close-ups: [light](evidence/light-focus.png),
[dark](evidence/dark-focus.png). The response is explicitly marked as preview only.

Rendered PDF sources: [1](evidence/source/page-1.png),
[3](evidence/source/page-3.png), [5](evidence/source/page-5.png),
[18](evidence/source/page-18.png), [20](evidence/source/page-20.png),
[22](evidence/source/page-22.png), [23](evidence/source/page-23.png),
[25](evidence/source/page-25.png). These are physical pages rendered with Poppler
at a 1600px long edge from `resources/brand/augur-brand-foundation.pdf`.
Source SHA-256:
`65acce8b247ddda10834d0c068e84bc315f7afc118f5570d1d90386de8ed9c0c`.

## Annotated visual review

The Astra visual director inspected all eight source renders and all six complete
web captures on 2026-09-06. These are source-to-web judgments, not a print/web
pixel comparison or final human acceptance.

- **A — opening (PDF 1/3/25):** The main message has one focal point, offset from a
  narrow orientation rail. A 32×2 rule anchors its support; the metadata row sits
  beyond a deliberate open interval. The plain frame avoids a hero card. At
  768px the rail remains meaningful; at 390px it precedes the message, and the
  three metadata facts stack. The intentionally repeated rail sentence disappears
  on mobile. “Make what matters clear.” and the shared-interface-language
  description are locked for the downstream docs opening.
- **B — editorial specimen (PDF 5/18/22/23):** The flat inverse-color specimen is
  the sole large tonal field. A regular 400 section title clearly differs from
  its 600 display sample. Explanations remain open and rule-led. Tablet places
  supporting notes in three tracks below the specimen; mobile stacks those
  notes and naturally wraps the retained 40/44 display over additional lines.
  The inverse specimen swaps Navy/Paper across themes while retaining geometry.
- **C — compact record (PDF 20/23/25):** Question, equal choices, and labeled
  record facts remain the reading order. The muted outer field and lifted
  square panel provide tonal grouping; control edges are stronger than editorial
  rules. Dark mode uses Surface 1 outside and Surface 2 inside, with Mist control
  edges. The signal is short and separate from choice emphasis. At 390px choices
  still share a row, the question wraps, and both touch targets are 44px high.
- **Hierarchy across all frames:** Green is not a ubiquitous separator. B needs
  no signal. A uses a neutral text action. The compact record adds visible green
  keyboard focus only when a user reaches a choice. No shadow, gradient, pill,
  or bright outline grid competes with text and alignment.
- **Decision comparison:** The 6px control appears once alongside the selected
  square control. It is labeled rejected and does not become a runtime variant.

## Automated observations

`review.mjs` passed for six theme/viewport pairs. It checks actual loaded font
faces and `document.fonts.check()`, computed typography, both signals' exact 32×2
geometry, square controls, identical light/dark frame geometry, no horizontal
overflow, and zero console warnings/errors or failed requests. The desktop
keyboard order is theme control → text action → Yes; Space updates the explicit
local response and `aria-pressed`. The check waits until the focus-visible styles
have settled, then requires exactly 2px outline and 2px offset. It does not relax
the assertion to accept the browser's transient default outline.

Control-edge contrast against control/panel/canvas is 7.22/8.50/7.81 in light
and 3.52/3.52/4.06 in dark. Control labels are 16.17 light and 15.19 dark.
Body contrast is 17.49 in either theme; the opening signal is 7.17 light and
11.87 dark. Quiet editorial rules are grouping cues supported by headings,
spacing, and surface changes, not required control boundaries. All values are
recomputed from rendered colors in the JSON evidence; no colors are duplicated
as a new runtime source.

## Documentation checks

The guide uses the shared Markdown/MDX pipeline. Build and verify both base modes:

```sh
bun run --cwd apps/docs build
bun apps/docs/fixtures/verify-markdown.mjs
DOCS_BASE_PATH=/augur-design-system bun run --cwd apps/docs build
DOCS_BASE_PATH=/augur-design-system bun apps/docs/fixtures/verify-markdown.mjs
```

The Markdown fixture inventory includes the new guide and checks its H1, H2,
lede, clean syntax, direct Markdown action, internal links, and llms inventory.
No package tokens changed, so token-regeneration checks are not claimed as
validation of this visual composition.

### Observed checkpoint results

At the issue 42 checkpoint, frozen install, the six-pair reference driver, root
and subpath Astro builds, root and subpath clean-Markdown verification,
`bun run lint:code`, `bun run typecheck`, and `git diff --check` passed.
The complete existing browser driver also passed under `/augur-design-system`,
including the renamed foundation page and the new visual guide.
The coordinator independently inspected the corrected light/dark desktop and
mobile reference images and verified all three fixture source hashes against
the retained report. No runtime token or component implementation was changed.
See [CHECKPOINT.md](CHECKPOINT.md) for authority, model routing, remaining issues,
and the exact next action after the requested pause.
