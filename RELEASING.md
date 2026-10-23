# Releasing

A design-system release is an immutable Git tag, `vX.Y.Z`, that points to one commit on `main`. It describes the whole consumer-facing surface at that commit: theme and tokens, components, patterns, registry artifacts, and approved brand assets. Consumers depend on the tag, not on `main` and not on a hand-maintained commit SHA.

## Consumer contract

- Package tarball (from `v0.2.0`): `npm install https://github.com/jubalm/augur-design-system/releases/download/vX.Y.Z/augurproject-design-system-X.Y.Z.tgz`. The tarball keeps the final package name, `@augurproject/design-system`, so imports stay the same when the package moves to the npm registry.
- GitHub source registry: `bunx shadcn@4.20.1 add "jubalm/augur-design-system/<item>#vX.Y.Z"`.
- Built registry item: `https://raw.githubusercontent.com/jubalm/augur-design-system/vX.Y.Z/public/r/<item>.json`.
- Every `registryDependencies` address inside a released item is stamped `#vX.Y.Z`, so transitive items resolve to the same release.
- A consumer may record the commit the tag resolves to for audit and integrity checks. The tag stays the identifier people maintain.
- `main` is the development channel. Consumers receive changes only when a release is cut and they adopt it.
- Upgrades are deliberate: move from one tag to the next, re-sync, review the generated diff, run builds and tests, and review the result visually against the release.

Individual registry items are not versioned on their own; one version describes the coherent release.

## Version policy

Before 1.0:

- **Patch** (`0.1.0 → 0.1.1`): compatible fixes and refinements.
- **Minor** (`0.1.0 → 0.2.0`): meaningful consumer-facing additions, or breaking contract changes while the system is still stabilizing.
- **1.0.0**: the component API, the registry distribution path, tokens and foundations, and this release process are stable enough for downstream consumers.

## Procedure

1. **Choose the version** from the changes under `## Unreleased` in `CHANGELOG.md` and the policy above.
2. **Prepare a release PR** from a branch off `main`:
   - Finalize the changelog: move the `Unreleased` entries into `## [X.Y.Z] - YYYY-MM-DD` (the planned release date), leave an empty `## Unreleased` above it, and add a one-line summary of how to adopt the release.
   - Update the package metadata: set `version` in `packages/design-system/package.json` to `X.Y.Z`.
   - Stamp the registry artifacts: `AUGUR_REGISTRY_REF=vX.Y.Z bun run --cwd packages/design-system registry:generate`. Never edit `registry.json` or `public/r/` by hand.
   - Run `bun run check:release X.Y.Z` locally.
3. **Verify.** The PR must pass every CI job, including `registry` (artifact drift, shadcn schema validation, and the independent-consumer install smoke). Merge it once green.
4. **Release.** In GitHub Actions, run the **Release** workflow on `main` with version `X.Y.Z`. It re-runs every CI gate on that commit, runs `check:release`, packs the package with `npm pack` and runs the tarball smoke against it, creates the annotated tag `vX.Y.Z`, and publishes the GitHub Release with the changelog section as its notes and the tarball attached.
5. **Confirm** that the tag and the Release exist, that the Release has `augurproject-design-system-X.Y.Z.tgz` attached, and that `https://raw.githubusercontent.com/jubalm/augur-design-system/vX.Y.Z/public/r/button.json` resolves with `#vX.Y.Z` dependencies.

## Package tarball

Until the maintainer has publish access to the `@augurproject` npm org, the package reaches consumers only as the tarball attached to each Release.

- The Release workflow builds it from the tagged commit with `npm pack` in `packages/design-system`. The `files` field limits it to `src/` without `src/tools/`.
- `bun scripts/package-smoke.ts` packs the working tree, installs the tarball into a plain-HTML consumer, and checks the theme and a component stylesheet in Chromium without React, Tailwind or a font import. CI runs it on every pull request; the Release workflow runs it on the tarball it attaches.
- A release asset is never replaced. A bad tarball is fixed by the next patch release, like any other release defect.
- The package keeps `"private": true`, which blocks an accidental `npm publish`. Moving to the npm registry is a separate change: remove `private`, publish the same version, and switch consumers from the URL to a version range.

`registry:check` accepts the committed artifacts stamped with the current package version or unstamped. Changes merged after a release may regenerate the artifacts without a stamp; the next release PR stamps them again.

## Immutability

- The Release workflow refuses to run when the tag exists, and nothing in this repository moves, deletes, or force-pushes a tag.
- Protect `v*` tags against updates and deletion with a repository tag ruleset (Settings → Rules). That setting is a maintainer action.
- A bad release is never retagged. Fix it on `main` and cut the next patch release; note the problem in the new release's changelog entry.
