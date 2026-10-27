# Brand asset provenance and font delivery record

This file records where brand-related assets in this repository came from, how
they are delivered, and which source formats are still unavailable. It also
documents the font delivery provenance for `@augurproject/design-system`.

## 1. Authority: interface tokens vs fixed identity artwork

The authority order depends on the kind of material being changed:

```text
Interface values
DESIGN.md (maintained specification, pinned schema)
   ↓
generated tokens / runtime styles (packages/design-system)
   ↓
components, docs, registry

Fixed identity artwork
Augur Brand Foundation v1.0 (usage + approved appearance)
   ↓
verified supplied/recovered artwork (resources/brand/assets)
   ↓
docs delivery copies (apps/docs/public/brand)
```

`DESIGN.md` remains the implementation source of truth for representable system
values such as color, typography, spacing, shape, and component roles. The logo,
glyph, and REP token are fixed artwork rather than implementation tokens: their
geometry and variant rules come from the brand foundation and must not be
recreated from token values.

## 2. Foundation source and recovery decision

| Asset | Origin | Size | SHA-256 |
| --- | --- | --- | --- |
| `resources/brand/augur-brand-foundation.pdf` | “Augur Brand Foundation” v1.0, revised 31 August 2026, marked *Internal reference* | 392,759 bytes | `65acce8b247ddda10834d0c068e84bc315f7afc118f5570d1d90386de8ed9c0c` |

The foundation says the production family contains Horizontal, Vertical, and
Glyph compositions in Color, Black, White, and Reversed variants, plus the REP
token icon. It also says to start from supplied artwork and not redraw the mark.

The original Illustrator masters referenced by the foundation are not currently
accessible. On 11 September 2026 the maintainer authorized a bounded recovery
pass from the canonical foundation PDF instead of continuing the text-only
fallback.

### What the PDF actually contains

Inspection with PyMuPDF 1.26.4 found that the logo examples on pages 7–10 and
the REP token on page 16 are embedded **raster image XObjects with soft masks**,
not vector drawing paths. The PDF therefore cannot provide a truthful SVG
extraction.

The PNG assets under `resources/brand/assets/` are lossless extractions of those
embedded image objects with their soft masks restored. The extraction did **not**
trace, vectorize, recolor, trim, crop, resize, rearrange, or otherwise reconstruct
the artwork. The original embedded canvas dimensions are preserved, including
transparent edge pixels.

The machine-readable extraction record is
`resources/brand/assets/manifest.json`; it pins the PDF hash, source page, PDF
object reference, dimensions, and SHA-256 for every recovered file.

## 3. Recovered identity inventory

The foundation's word **Black** means Augur Navy `#0E0E21`, not `#000000`.

| Composition | Variant | Source | Dimensions | SHA-256 |
| --- | --- | --- | ---: | --- |
| Horizontal | Color | PDF p.8, xref 36 | 1440×481 | `9b09815c040043c83092cbeb1eaa30f310f1d468f4db42f5fb8960cb46b197ad` |
| Horizontal | Black | PDF p.8, xref 45 | 1440×481 | `3c120d685a16efbd4884a3dc08f909ca2a98559af4e977fcbf64e946e170338a` |
| Horizontal | White | PDF p.8, xref 47 | 1440×481 | `cd8b1ca8f1977a7c7947149f06094a2661ada9d15aa94f1699160ad55c1b0f1f` |
| Horizontal | Reversed | PDF p.8, xref 8 | 1440×481 | `0bee48589af58e056e73212c9651fc8ea442fcdb7e862c0e67e6afbcbb31a674` |
| Vertical | Color | PDF p.9, xref 38 | 896×889 | `0047264fd502c2d8f9bbab195b19bc4afc99d94d0efc66869b8332b56b82687e` |
| Vertical | Black | PDF p.9, xref 52 | 896×889 | `8dc33d960f886dd3ffde065de79b8cdef4c4f310f791ff543b42e54e2cefb187` |
| Vertical | White | PDF p.9, xref 54 | 896×889 | `eada52681c826628ded83f57c9fcabcb0a6f8344684536a1f23f612957621786` |
| Vertical | Reversed | PDF p.9, xref 56 | 896×889 | `ce61b2d0b1987097ee27b5f1e03e13241959b1026624e1f6dd5f1cdaca1dc697` |
| Glyph | Color | PDF p.10, xref 40 | 432×481 | `204a59a1f2545c500c1753a22087ca769edfe820caa47195bad344d16f754319` |
| Glyph | Black | PDF p.10, xref 61 | 432×481 | `3cd03a1941ac22efbff46010963dd756016f6dc5d608688b15b05b991d5d1d66` |
| Glyph | White | PDF p.10, xref 63 | 432×481 | `56c23b299b73d3154f624deded03ac8f90e630640da504157004924035edd0e2` |
| Glyph | Reversed | PDF p.10, xref 65 | 432×481 | `bba54fc44015f58f7c24b862f5fd2e0e2ccd3501532863faadc1fed82183ca9c` |
| REP token | Canonical | PDF p.16, xref 89 | 384×385 | `3540c9727d616a52f367fdfd4c168c67390014e52ca5530b5b982d0bf818c665` |

Repository source paths mirror the foundation's composition/variant model:

```text
resources/brand/assets/
  horizontal/{color,black,white,reversed}.png
  vertical/{color,black,white,reversed}.png
  glyph/{color,black,white,reversed}.png
  token/rep.png
  icon/{favicon.svg,favicon-32.png,apple-touch-icon.png,manifest.json}
  manifest.json
```

The docs app carries byte-identical delivery copies at
`apps/docs/public/brand/`. Those URLs are the documentation/download surface;
the `resources/brand/assets/` copies remain the provenance-controlled source in
this repository.

### Independent production cross-check

`jubalm/augur-reboot-website/src/assets/augur.svg` is a production web export
whose current blob SHA is `d4ae734886129004e70994bc3841f2beff5d0ff1`; the file was present by commit
`51836e80a8c4fb79daba7d708748622ac7dcf83a` (27 June 2025). The maintainer has
confirmed that this SVG was exported from the latest design files and that the
logo artwork shown in the foundation has not changed. It provides an independent
vector corroboration for the production identity, but it is not used to invent
horizontal or other missing SVG variants in this repository.

### Approved favicon and app icon

On 28 September 2026 the maintainer approved the token icon published as the
augur.net favicon as the favicon and app icon for Augur web properties (issue
#100). This is an explicit exception to the REP token usage rule below, limited
to favicon and touch-icon slots.

The files were retrieved from `https://augur.net/` on 28 September 2026 and are
kept byte-identical; nothing was redrawn, traced, recolored, or resized.

| File | Source URL | Dimensions | SHA-256 |
| --- | --- | ---: | --- |
| `icon/favicon.svg` | `https://augur.net/favicon.svg` | 96×96 viewBox | `66236f7b4aa2d49d48729ce41322512478704168cddab60b3f2e32c36aa90246` |
| `icon/favicon-32.png` | `https://augur.net/favicon.png` | 32×32 | `b91f0803e9ff942efeaa40f43932f1c0291e14e9ad0ed653177b8c40d8e0b03d` |
| `icon/apple-touch-icon.png` | `https://augur.net/apple-touch-icon.png` | 180×180 | `85cdb7d159fc5f0e67f0ecc1ef95f56fac7baaded736583127d61ff8c7ddf7f6` |

The SVG matches the recovered REP token composition (navy field, white base,
green pyramid). Its field is Augur Navy `#0E0E21`, the palette value, while the
PDF-extracted `token/rep.png` field renders slightly darker. The record is
`resources/brand/assets/icon/manifest.json`; `scripts/verify-brand-assets.ts`
checks hashes, dimensions, and byte-identical docs copies at
`apps/docs/public/brand/icon/`.

## 4. Current delivery boundary

The recovered PNG family is sufficient for the documentation identity and for
normal-size raster web placements while the original vector masters are
unavailable. Use the supplied dimensions as the source resolution and scale
down only; never upscale a recovered raster beyond its intrinsic dimensions.

The foundation states that SVG versions exist upstream, but the PDF itself does
not contain those paths. **Do not auto-trace these PNGs and call the result a
master SVG.** A complete verified SVG family remains an upstream-format gap, not
a geometry gap.

Identity usage rules:

- Horizontal is the default composition wherever width permits.
- Vertical is the fallback when width is genuinely constrained.
- Glyph is for compact placements only where Augur is already named by context.
- Color is the default on Paper/White; Reversed is the default on Navy/Raised or
  other approved dark surfaces.
- Black (Augur Navy) and White are constrained-production/supporting variants.
- Preserve the foundation clearspace rule (`1a`) and minimum screen sizes:
  horizontal 150×50px, vertical 94×93px, glyph 50×45px with the controlling
  pyramid at least 24px.
- The REP token is separate semantic protocol identity. Its circular navy field
  is part of the artwork; do not crop it into a generic glyph or use it as
  decorative app chrome. The approved favicon/app icon above is the one
  exception.

The docs masthead/home adoption remains owned by the existing shell/home work
rather than this provenance record. Consumers should use the recovered artwork,
not recreate it as live text or hand-authored SVG path data.

### Redistribution and release

Recovery establishes technical provenance, not a new copyright or trademark
license. Asset redistribution/release terms remain governed by issue #20. The
maintainer authorized this recovery and review branch; downstream publication or
packaging should follow the decision recorded there.

## 5. Font delivery provenance

Fonts are delivered as npm dependencies of `@augurproject/design-system` — legitimately
self-hostable, OFL-licensed Fontsource packages — never from Google Fonts CDNs
or other third-party hosts at runtime.

| Family (voice) | Package | Version | License | Copyright (must accompany redistribution) | Upstream |
| --- | --- | --- | --- | --- | --- |
| Sora (primary) | `@fontsource/sora` | `5.3.0` (exact pin) | OFL-1.1 | Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font) | https://github.com/sora-xor/sora-font |
| Schibsted Grotesk (secondary) | `@fontsource/schibsted-grotesk` | `5.3.0` (exact pin) | OFL-1.1 | Copyright 2023 The Schibsted-Grotesk Project Authors (https://github.com/schibsted/schibsted-grotesk) | https://github.com/schibsted/schibsted-grotesk |

- Weights delivered: **Sora 400 + 600** (all DESIGN.md Sora roles), **Schibsted
  Grotesk 400** (body + metadata roles). No other weights are used by
  `DESIGN.md`; add them only with a DESIGN.md change.
- Delivery mechanism: `packages/design-system/src/styles/styles.css` imports
  `@fontsource/sora/400.css`, `600.css`, and
  `@fontsource/schibsted-grotesk/400.css`. These reference subset-split
  woff2/woff files with `unicode-range` and `font-display: swap`; browsers
  fetch only the subsets used. Delivered latin/latin-ext files:
  `sora-latin{,-ext}-{400,600}-normal.woff2` (14,724/15,000/7,340/7,536 bytes)
  and `schibsted-grotesk-latin{,-ext}-400-normal.woff2` (24,344/11,504 bytes).
- Fallback stacks and family custom properties:
  `packages/design-system/src/styles/fonts.css` (`--augur-font-primary`,
  `--augur-font-secondary`; system-ui fallbacks).
- Machine-readable provenance for consumers: `packages/design-system/src/fonts.ts`
  (`AUGUR_FONTS`, `AUGUR_FONT_FAMILIES`), exported from the package entry point.
- License redistribution copies (verbatim from the installed packages):
  `resources/brand/licenses/OFL-1.1-sora.txt`
  (SHA-256 `1ec9623d38c445eb4dfe5fcc783e0f0ee728cc97ca157ce1f8cb2b3bf9d9b0d9`),
  `resources/brand/licenses/OFL-1.1-schibsted-grotesk.txt`
  (SHA-256 `15222412a95d70042e66e79bfb3b985653e0693e4d41703bc131bee9c5aa1aa7`).
- Fontsource upstream: `github.com/fontsource/font-files` (the packages are
  build artifacts of the upstream font projects listed above).

### Font verification

`packages/design-system/fixtures/fonts.html`, driven by
`packages/design-system/fixtures/verify-fonts.mjs`, verifies the delivered faces
(registration, loading, computed styles, no third-party requests) in headless
Chromium. The driver also guards a real trap: `document.fonts.check()` returns
`true` even when zero faces exist, so it asserts faces are registered and loaded
and registers network listeners before navigation. Docs-app-level typography is
covered by the docs verification fixtures.

## 6. Maintenance rules

1. Do not edit recovered artwork pixels or alpha. If a replacement source is
   supplied, record the new origin/hash and replace the asset as a whole.
2. Do not generate SVG masters by tracing recovered raster files.
3. Keep `apps/docs/public/brand/` byte-identical to the corresponding
   `resources/brand/assets/` files.
4. Bump a Fontsource version → update the exact pin in
   `packages/design-system/package.json`, the constants in
   `packages/design-system/src/fonts.ts`, this table, and re-run the fixture
   driver.
5. Change a `DESIGN.md` typography role → update
   `packages/design-system/src/styles/typography.css` and regenerate the token
   artifacts.
6. Never add a font from an unverified source or a runtime CDN.

## 7. Signal glyph provenance

The six interface signal glyphs in `packages/design-system/src/icons/` are
authored interface icons, not Brand Foundation artwork. They are documented on
the Icons foundation page (`apps/docs/src/content/foundations/icons.mdx`), and
`tests/signal-glyphs.test.ts` enforces their drawing contract.

- **Author:** melo, under contract with Augur.
- **Drawn:** 22 October 2026, for the augur.net homepage icon trial.
- **Origin:** `melodrd/augur-web-lab`, `src/assets/icons/augur/`, added in
  commit `132cb88` and read at commit `60a994d`. The files are copied
  byte-for-byte; the hashes below match the lab's own provenance record
  (`docs/icon-provenance.json`, `authored`).
- **Terms:** on 27 October 2026 the maintainer confirmed that work by
  contractors under contract with Augur belongs to Augur, so these glyphs may
  ship and be redistributed in `@augurproject/design-system`. The lab
  repository itself carries no licence file.

| Asset | Size | SHA-256 |
| --- | --- | --- |
| `icons/arrow-right.svg` | 215 bytes | `c8bdd5c5c16bc47b5b8de2f25241582ed9cd35fa03b83398eef5060241744076` |
| `icons/arrow-up-right.svg` | 208 bytes | `6533849300f4d84707dc654fec5cc3ea88bedac755418f91293521c58a7e5c6a` |
| `icons/check.svg` | 207 bytes | `7c37f4abec0ded3bd26d820e020250f12c607bcf190c6f047fae1411e57b42c6` |
| `icons/chevron-down.svg` | 202 bytes | `6f0fd3ca2fd285377056093cbdca6f070e7ea1c4780affbd2f716c3d5be921c8` |
| `icons/plus.svg` | 197 bytes | `4e3d8b5c7a601251181e5764cc4999ab797c025a3ec7c0e8a27bc5e569391ad4` |
| `icons/x.svg` | 207 bytes | `560c611ab8506a2b016a855c2ba797439c63e4fa6a6e9335fe6a713e9fe83566` |

Do not redraw or edit a glyph in place. A changed or added glyph needs
maintainer approval; record its origin and new hash here when it lands.
