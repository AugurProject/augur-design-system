# Documentation content conventions

This directory is the **single content location** for Augur design
system documentation. Every substantive page of the four documented
kinds is authored here — as shared Markdown/MDX — and rendered by one
shared renderer, so the rendered site and any derived representation
(e.g. the clean `.md` endpoints) come from the same source and cannot
drift. This file is the normative convention; new pages follow it.

## Content location: `apps/docs/src/content/`

The canonical location is `apps/docs/src/content/<kind>/`, matching
Astro's own content-collection convention (`src/content/`, with the
schema in `src/content.config.ts`). Standard Astro tooling works
unmodified.

Nothing outside `apps/docs/src/content/` is documentation content.
Docs-only code (renderer, example modules, styles) stays inside this
app and never becomes part of the design-system package.

## Kinds, routes, and metadata

Each kind is one collection, defined with typed metadata in
`src/content.config.ts`. The file name (minus extension) is the route
slug: flat, lowercase, kebab-case.

| Kind | Directory | Route | Extra metadata |
| --- | --- | --- | --- |
| Foundations | `foundations/` | `/foundations/<slug>` | — |
| Components | `components/` | `/components/<slug>` | `component`, `status`, `registry` |
| Patterns | `patterns/` | `/patterns/<slug>` | `components` (composed slugs) |
| Reference | `reference/` | `/reference/<slug>` | — |

Shared required metadata (zod-validated at build time; a missing or
blank field fails the build with a clear message):

- `title` — page title. **The H1 is synthesized from it** by the page
  renderer (`src/components/DocPage.astro`) and by the Markdown
  endpoint. **Bodies must not repeat the title as an H1**; start
  body headings at `##`.
- `description` — one sentence; rendered as the page lede and used as
  the HTML meta description.
- `order` — the page's position in its section's reading order. Values are
  unique per section and narrative: the sidebar, section overviews,
  previous/next links, and the `llms.txt` ordering all derive from this one key,
  so they cannot drift. Assign the next free position when adding a page; do not
  reuse or reorder existing positions without recording the reading-order change.
- `draft: true` — validated but excluded from routes.

Component pages additionally require `component` (the PascalCase public
export name from `@augurproject/design-system`) and accept `status`
(`planned | draft | stable | deprecated`, default `planned`) and
`registry` (shadcn registry item id).

## Component-page sections

Every `components/` page must cover these H2 sections, in this
recommended order (presence is enforced by the renderer at build time;
extra H2s such as "Examples" are fine):

1. `When to use`
2. `When not to use`
3. `Variants`
4. `Sizes`
5. `States`
6. `Accessibility`
7. `API`
8. `Design rationale`

A page missing any of them fails the build with an error naming the
entry and the missing headings. The contract lives in
`src/lib/component-sections.ts` and is proven by the deliberate
invalid-content fixture (`fixtures/verify-content-failures.mjs`).

Until a component exists in `@augurproject/design-system`, do not author its
page: no mockups, no private copies, no speculative API tables. Pages
document real exports (a `status: planned` page may describe the
intended contract once a component is claimed by an issue, but its
Examples must not fake rendered behavior).

## Live examples

Examples render what consumers actually receive, from real workspace
exports — never hand-duplicated values:

1. **Write the example as a real module** under `src/examples/<area>/<name>.tsx`.
   It imports from `@augurproject/design-system` and renders statically.
2. **Register it** in `src/examples/registry.ts`, importing the module
   once as a component and once with `?raw` for its own source:

   ```ts
   import { FontStacksExample } from "./fonts/font-stacks";
   import fontStacksCode from "./fonts/font-stacks.tsx?raw";
   ```

3. **Use it in content** through the shared block:

   ```mdx
   import { DocExample } from "../../components/DocExample";
   import { examples } from "../../examples/registry";

   <DocExample example={examples.fonts.stacks} />
   ```

Because the displayed code sample is a `?raw` import of the exact file
rendered as the preview, **code samples are synchronized with rendered
examples by construction** — the same source, two representations.
Standalone fenced code blocks in prose are for stable usage snippets
(e.g. an import line), not for anything that mirrors a live example.

**Samples are consumer code.** A reader copies the displayed source, so
an example module contains only package imports, composition, props, and
comments useful to a consumer: no docs-site class names, no theme
wrappers, and no duplicated light/dark specimens. Staging belongs to the
registry entry, which the frame (`DocExample`) applies around the module:

- `themes: "both"` renders the module in labeled light and dark scopes,
  each pinned with `data-theme`, so the theme contract stays visible
  without entering the sample. Both scopes render the displayed file.
- `pair: "rows"` stacks those scopes full width (page-level regions such
  as PageHeader); the default places them side by side.
- `layout: "inline"` wraps top-level elements in a row (controls); the
  default stacks them.

Return a fragment when an example shows several items, and use `useId`
rather than hard-coded ids, since the frame may render a module twice.
The theme-scope example keeps its `data-theme` subtree because scoping is
its lesson. `fixtures/verify-markdown.mjs` enforces these rules and lists
the recorded exceptions (the palette specimen and the reference-record and
proposal-review compositions, whose layout lives in co-located docs CSS).

Example modules must only import exports that exist. `defineExample`
(`src/lib/examples.ts`) validates ids, captions, and that `code` is
real imported source, failing the build otherwise.

## Rendering pipeline

- `src/pages/<kind>/[slug].astro` — one thin route per kind; resolves
  entries and delegates to the renderer. Routes are stable; slugs are
  part of the public URL contract.
- `src/components/DocPage.astro` — the single page renderer: layout,
  synthesized H1, description lede, section
  enforcement, body prose.
- Shell pages (`/`, `/getting-started`) remain app pages by convention;
  as substantive pages they are candidates to migrate into a collection
  when touched. `/foundations/*` pages are fully collection-sourced.
- Section overview pages live at `/<kind>` (`/foundations`,
  `/components`, `/patterns`, `/reference`) as app pages rendered by
  `src/components/SectionPage.astro` from `src/lib/sections.ts`; their
  destinations derive from the collections through the navigation model
  (`src/lib/navigation.ts`) — never a hand-copied route list. The same
  model feeds the sidebar, the mobile browse panel, previous/next links,
  and the `llms.txt` ordering, so the surfaces cannot drift.

## Markdown parity and `llms.txt`

Every substantive page has a clean `.md` representation derived from the
same entry as the rendered page — metadata (`title`/`description`),
body, and example sources. There is no second authoring path; the two
representations cannot drift.

- **Endpoints** (`src/pages/[...markdown].ts`): `/<kind>/<slug>.md` for
  every non-draft collection entry, plus `/getting-started.md` derived
  from the shell page's own MDX file (`?raw` import, parsed by
  `mdxPageSource`). Drafts are excluded exactly as the page routes
  exclude them. The home page is landing chrome, not documentation, and
  deliberately has no `.md` form; it also renders no copy actions.
- **Derivation** (`src/lib/markdown.ts`): synthesizes the H1 from
  `title` and the lede from `description`, preserves component-page
  `component` and `status` metadata in the clean Markdown representation
  even though the rendered page keeps its opening chrome metadata-quiet,
  then transforms the body code-fence-aware: MDX imports
  and single-line flow comments are stripped; expressions come from
  `EXPRESSION_VALUES` (computed from the real package);
  `<DocExample example={examples.a.b} />` becomes the example caption
  plus the example module's own `?raw` source in a fenced block;
  UI-only demos (`FontRoles`, `ThemingDemo`) become one-line
  descriptions of what renders live; site-absolute links are rewritten
  through `withBase()` so they resolve under both deployment bases.
  Authoring constraints that keep this derivable: representable
  components appear as single-line self-closing elements, imports stay
  on one line, and frontmatter `title`/`description` stay single-line
  on shell MDX pages. Unrepresentable content — an unknown component,
  an unknown expression, an unbalanced fence, leftover JSX — fails the
  build naming the entry.
- **New demo components must register a Markdown representation** in
  `src/lib/markdown.ts` in the same change that uses them in content.
- **Copy page split action** (`src/components/PageActions.astro`,
  rendered by the page renderer): `Copy page` fetches the page's `.md`
  endpoint and copies exactly those bytes; its disclosure menu holds
  `View as Markdown` (opens the direct `.md` representation) and — only
  when the build configures a site — `Open in ChatGPT` / `Open in
  Claude`, which hand the assistant the page's absolute `.md` URL, never
  the document body. A `<noscript>` fallback keeps `View as Markdown`
  reachable without client script. Shell MDX pages opt in with
  `markdown: true` in frontmatter.
- **`/llms.txt`** (`src/pages/llms.txt.ts` + `src/lib/llms.ts`): a
  concise navigational index generated from these same collections, so
  it lists exactly the pages that exist. It links each page's `.md`
  form, states where `DESIGN.md`, `ARCHITECTURE.md`, and
  `CHANGELOG.md` live (repository canonical locations), and says so
  explicitly when a kind has no pages yet. It guides retrieval; it does
  not restate design rules. A canonical docs origin (for absolute URLs)
  is a deployment decision.
