# Component engineering contract

This document records the engineering contracts for the component and pattern layer under `src/components/` and `src/patterns/`. Consumer-facing guidance lives in the docs app component pages; the executable contracts live in the package and repository test suites.

## Authority chain

```text
DESIGN.md                                  (adopted values)
   ↓  pinned @google/design.md toolchain
src/tokens/tokens.css                      (generated --augur-color-*, --augur-spacing-*, --augur-rounded-*)
   ↓  src/styles/roles.css                 (semantic color roles)
   ↓  src/components/, src/patterns/       (component CSS references roles and generated primitives)
```

## Rules

- **Semantic color only.** Component CSS references semantic role custom properties (`--background`, `--foreground`, `--primary`, …). A raw hex/rgb/hsl literal fails the repository stylesheet contract.
- **Generated primitives for geometry.** Spacing and corner radius come from the generated `--augur-spacing-*` and `--augur-rounded-*` tokens. Control heights and other structural constants are plain CSS, not emitted tokens.
- **No parallel token source.** Component CSS does not declare new custom properties; it consumes generated tokens and theme roles.
- **One layer, one dependency.** Every component and pattern stylesheet wraps its rules in `@layer augur` and depends only on the theme (`theme.css`), so each ships alone as `css/<name>.css`. The `.aug-*` class names are stable API; renaming one before 1.0 is a minor release with a changelog note.
- **Composition over configuration.** Patterns compose components (`FormFieldControl` composes `Input`; `Input` does not import `FormField`). Components carry no product-specific behavior, validation, or form state.

## Contracts held by tests

- `bun test` (package): public-entry export surface, variant class contracts, and stylesheet consumption.
- `bun run test` (repository root): rendered interaction, keyboard/focus, disabled/loading/invalid/read-only contracts, HTML semantics, axe findings in both themes, and the stylesheet delivery contract through `./styles.css`.
- `apps/docs/fixtures/browser/` (`bun run test:browser`): rendered computed-style and browser behavior checks against a built docs app.

Component APIs stay close to shadcn conventions; Augur owns the resulting APIs, styles, and documentation.
