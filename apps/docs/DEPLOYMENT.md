# Docs deployment — GitHub Pages

This document covers GitHub Pages deployment for the docs application and its
registry artifact. Deployment is **prepared but not activated**; activation is an
explicit maintainer decision. Nothing in this repository changes DNS, CNAME
records, or repository settings.

Paths are repository-root-relative; the commands run from the repository root.

## What exists

| Piece | Location | Runs when |
| --- | --- | --- |
| Deployment workflow | `.github/workflows/deploy-docs.yml` | **Only** on manual `workflow_dispatch` by a maintainer |
| Static artifact verification | `scripts/verify-pages-deploy.mjs` | In the deploy workflow build job; runnable locally |
| Docs build with portable base | `apps/docs` (`DOCS_BASE_PATH`) | Any build |

The deployment artifact is one static tree: the Astro docs build **plus** the
registry built-JSON channel (`public/r/` copied to `dist/r/`), verified before
upload (navigation, assets, `.md` routes, `llms.txt`, registry items and pin
consistency) and uploaded via `actions/upload-pages-artifact`.

## Required GitHub settings (maintainer, one-time)

1. **Pages source**: Repository → Settings → Pages → Build and deployment →
   Source: **GitHub Actions**. (Not "Deploy from a branch".)
2. **Environment**: the workflow deploys to the `github-pages` environment.
   Create it (Settings → Environments) and optionally restrict deployments to
   `main` and require reviewers — this is the controlled deployment gate.
3. **Workflow permissions** (Settings → Actions → General): "Read and write
   permissions" is **not** required; the workflow declares exactly
   `contents: read` at the top level and adds `pages: write` + `id-token: write`
   only on the deploy job. If the org enforces more restrictive defaults,
   allow GitHub Pages deployments via OIDC (`actions/deploy-pages`).
4. **Branch protection**: keep the existing required checks from `ci.yml`;
   deployment is manual and does not add a required check.

## Base paths — the two deployment modes

| Mode | `base_path` input | Served URLs |
| --- | --- | --- |
| GitHub Pages project site (works today, no custom domain) | `/augur-design-system` | `https://augurproject.github.io/augur-design-system/…` |
| Custom-domain root (future) | `/` | `https://<docs-domain>/…` |

All internal links and asset references go through the configured base:
chrome links via `apps/docs/src/lib/base.ts#withBase()`, and Markdown/MDX body
links via the `augur-base-links` mdast plugin in `apps/docs/astro.config.mjs`.
No source changes are needed to switch modes.

A missing custom domain does **not** block anything: dispatch the workflow
with `base_path=/augur-design-system` and test the `augurproject.github.io` URL.

## Deploy

1. (Optional but recommended for the project-site mode) Confirm Pages source is
   "GitHub Actions" and the `github-pages` environment exists (above).
2. Actions → **Deploy docs (manual)** → Run workflow:
   - `base_path`: `/augur-design-system` (project site) or `/` (custom domain).
   - `registry_sha`: leave empty to pin the dispatched commit, or pass a
     release tag's full 40-char SHA.
3. The workflow builds, runs `verify-markdown` (base-aware) and
   `verify-pages-deploy` against the artifact, uploads it, and deploys to the
   `github-pages` environment. Review the uploaded artifact on the run page
   before or after deployment.

## Rollback

Re-run **Deploy docs (manual)** on the previous release's commit (Actions →
Run workflow → select the tag/branch of the last known-good release, or use
"Re-run all jobs" on the old workflow run if the artifact environment is
unchanged). Deployment is fully derived from a commit — no manual server state
exists. Older runs remain inspectable via their uploaded artifacts.

## Canonical URLs

### llms.txt

`llms.txt` links are **site-absolute paths** (`/foundations/color.md`), by
design (ARCHITECTURE.md, "llms.txt"): LLM consumers resolve them against the
URL they fetched `llms.txt` from. This makes the file portable across both
deployment modes with no rebuild — the same bytes work at
`augurproject.github.io/augur-design-system/llms.txt` and at a custom-domain root.
Once the final origin exists, update any *external* prose/docs that quote
fully-qualified URLs; the file itself needs no change.

### Registry URLs (AUGUR_REGISTRY_SHA)

Two consumer channels (packages/design-system/docs/registry-contract.md §14):

- **GitHub source registry** (active today):
  `bunx shadcn@4.20.1 add "AugurProject/augur-design-system/<item>#vX.Y.Z"` (release tags, `RELEASING.md`).
  Pinned installs are unaffected by any deployment decision.
- **Built-JSON channel** (deployed by this workflow): `https://<docs-host>/r/<item>.json`,
  e.g. `https://augurproject.github.io/augur-design-system/r/button.json`, or
  `https://<docs-domain>/r/button.json` once a custom domain exists.

The deploy workflow regenerates `public/r/` with
`AUGUR_REGISTRY_SHA=<resolved sha>` before building, so the deployed JSON's
`registryDependencies` carry `#<sha>` pins (all-or-nothing; verified by
`verify-pages-deploy.mjs`). The namespace config consumers use once deployed:

```json
{ "registries": { "@augur": "https://<docs-host>/r/{name}.json" } }
```

Resolving `<docs-host>` when an origin is chosen: substitute
`augurproject.github.io/augur-design-system` (current) or the custom domain. Committed
`public/r/` carries either no stamp or the current release tag (`#vX.Y.Z`,
`RELEASING.md`); the deploy build's SHA stamp is never committed, which is why
`registry:check` in CI keeps passing.

### Custom domain (future, maintainer decision)

If a custom domain is adopted: add it in Settings → Pages (this creates the
DNS guidance — actual DNS records are a maintainer action, out of scope here),
redeploy with `base_path=/`, and update docs quoting the `augurproject.github.io`
URLs. A `CNAME` file committed to the repo is only needed if Pages is later
switched away from the Actions source; do not guess one.

## Local dry run (no GitHub)

```sh
bun install --frozen-lockfile
bun run --cwd packages/design-system registry:generate           # optional pin stamp: AUGUR_REGISTRY_SHA=$(git rev-parse HEAD)
DOCS_BASE_PATH=/augur-design-system bun run --cwd apps/docs build
cp -R public/r apps/docs/dist/r
DOCS_BASE_PATH=/augur-design-system bun apps/docs/fixtures/verify-markdown.mjs
DOCS_BASE_PATH=/augur-design-system bun scripts/verify-pages-deploy.mjs
```

Use base `/` (no `DOCS_BASE_PATH`) for the custom-domain mode. Both modes are
also exercised in the deployment workflow itself.

## Boundaries observed

- No DNS/CNAME changes; no repository settings changed by this preparation.
- The workflow is `workflow_dispatch`-only; no push/PR trigger can deploy.
- Activation of the public site is a separate maintainer decision.
