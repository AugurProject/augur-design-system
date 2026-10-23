# Consumer installation

Proves and documents source installation of the Augur registry in an
independent consumer. Companion to [`registry-contract.md`](registry-contract.md)
(spec, especially §10 verified stack, §12 local test path, §14 version-pinned
URLs) and [`registry-generation.md`](registry-generation.md) (artifact policy).

## 1. What is proven

A clean standalone React consumer — created by the pinned CLI from the Vite
template (React 19 + Tailwind CSS v4 + radix, exactly the verified stack in
contract §10) — installs every starter registry item and, after `vite build`:

- components through semantic tokens with **both light and dark themes**
  (`data-theme="light|dark"`, plus system-preference fallback);
- the contract §7 alias set resolves installed source
  (`@/components/ui/*`, `@/lib/utils`, `@/components/*` patterns);
- exact-pinned npm dependencies land in the consumer `package.json`
  (`@fontsource/sora@5.3.0`, `@fontsource/schibsted-grotesk@5.3.0`,
  `clsx@2.1.1`, `tailwind-merge@3.3.1`, `radix-ui@1.6.7`);
- fonts are self-hosted (`@font-face` + woff/woff2 assets in `dist`), not
  Google-hosted;
- installed source is **self-contained**: it never imports
  `@augurproject/design-system` or any `@augur/*` specifier (contract §11);
- the consumer has **zero `workspace:*` links** (fully standalone);
- `bunx shadcn@4.20.1 add --overwrite` re-run refreshes consumer-modified
  installed source (update model, contract §11.4).

## 2. Reproducible smoke

```sh
# from the repo root; requires bun and network access to npm (registry
# artifacts themselves are committed and served locally — no GitHub access)
bun run scripts/consumer-smoke.ts                 # working-tree artifacts
bun run scripts/consumer-smoke.ts --ref vX.Y.Z   # release tag (or a full 40-char SHA)
bun run scripts/consumer-smoke.ts --keep          # keep the consumer dir to inspect
```

The script:

1. starts a throwaway local registry server over the **committed**
   `public/r/*.json` artifacts (working tree, or `git show <ref>:public/r/<item>.json`
   when `--ref` is given), rewriting each item's `registryDependencies`
   GitHub addresses to the local server;
2. runs `bunx shadcn@4.20.1 init -t vite -b radix -p nova` to create the fresh
   consumer;
3. runs `bunx shadcn@4.20.1 add <local>/r/<item>.json -y --overwrite` for
   `augur-theme`, `utils`, `button`, `card`, `input`, `form-field`, `dialog`,
   `page-header`, `empty-state`;
4. fails fast with an **actionable hint per check** — every `FAIL` line names
   the broken guarantee and the fix. Exit code 0 = all checks passed.

`GIT_TERMINAL_PROMPT=0` is exported for every child process so no subprocess
can ever block on an interactive credential prompt; stdin is closed for the
same reason.

The smoke runs in two modes — working-tree artifacts and a versioned
artifact (`--ref vX.Y.Z` for a release tag, or `--ref <full-40-char-sha>`) —
and asserts the same consumer guarantees in each.

## 3. Versioned artifact installs and the update/overwrite model

The `--ref` mode proves the **pinning mechanics** against a deterministic
artifact: the local server extracts `public/r/*.json` from that release tag or
commit via `git show`, so re-running the smoke on the same immutable tag always
installs byte-identical source. This mirrors the consumer-facing pinning policy
in contract §14: consumers depend on a release tag (`vX.Y.Z`, see
[`RELEASING.md`](../../../RELEASING.md)), and unpinned `main` installs are the
development channel, never documented as stable.

Update/overwrite expectations (what consumers should know):

- Components update by **re-running `add` against the adopted release tag**; installed
  source is a snapshot of that ref, with no automatic tracking.
- `bunx shadcn@4.20.1 add <item> --overwrite` (short `-o`) overwrites files the
  consumer has modified locally. Without `--overwrite`, identical files are
  skipped and divergent ones are reported for a decision (no silent clobber).
- The consumer's own `package.json` lockfile pins the exact npm dependencies
  the item declares; an update that changes declared pins is a normal
  dependency change in the consumer.
- The smoke's §4j check proves the overwrite path: it plants local drift in the
  installed `button.tsx`, re-runs `add --overwrite`, and fails if the drift
  survives.

## 4. GitHub-native installs (public repo or HTTPS/gh auth required)

The pinned CLI resolves `owner/repo/<item>#<ref>` GitHub addresses through
`git ls-remote` / raw fetch over **HTTPS**. Public repositories can be fetched
anonymously; when the repository is private, the consumer environment must
provide HTTPS/gh credentials. In an SSH-only setup git falls back to the OS
keychain and pops an interactive credential prompt, so the local-artifact
harness above is the reproducible proof path and GitHub-native installs are
documented here rather than executed in CI.

The same smoke applies to a public repository (or a consumer with HTTPS/gh
auth) with release-tag pins:

```sh
bunx shadcn@4.20.1 add "jubalm/augur-design-system/augur-theme#v0.1.0"
bunx shadcn@4.20.1 add "jubalm/augur-design-system/button#v0.1.0"
# …every item; registryDependencies carry the same #v0.1.0 stamp
```

Notes:

- A release tag is created only after the contract §12 gate (schema validate
  + build + local install + consumer build, the `registry` CI job) passes on
  that exact commit — see `RELEASING.md` and contract §12.
- Release tags (`vX.Y.Z`) are the consumer identifier. A full-SHA pin still
  resolves, and consumers may record a tag's resolved SHA for audit.
- Built-JSON channel (`https://<docs-host>/r/<item>.json`, namespace
  `@augur/…`) becomes available with the docs deployment and is the auth-free
  URL path.

## 5. CI integration

The `registry` job in `.github/workflows/ci.yml` runs the consumer smoke
against the working-tree artifacts on every pull request and push to `main`,
and the release workflow runs it again on the commit it tags. The script is
non-interactive (`GIT_TERMINAL_PROMPT=0`, stdin closed, actionable failure
output) and exits non-zero on any failure.

## 6. Boundaries

The smoke proves the distribution contract against committed artifacts. It
does not integrate into an external product, publish an npm package, or
alter committed artifacts (the harness rewrites `registryDependencies` at
serve time only).
