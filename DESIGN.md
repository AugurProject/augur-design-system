---
version: alpha
name: Augur
description: A clear-eyed, credible, neutral, and human visual system for asking questions and recording collective decisions.
colors:
  primary: "#0E0E21"
  accent: "#2AE7A8"
  neutral: "#F5F5F8"
  secondary: "#4A4B61"
  secondary-dark: "#A1A1B8"
  surface-light: "#F5F5F8"
  surface-light-raised: "#FFFFFF"
  surface-light-muted: "#ECECF2"
  border-light: "#E0E0E7"
  accent-deep: "#095E42"
  accent-wash: "#C9FFE5"
  accent-hover: "#27D19B"
  accent-pressed: "#24BC8D"
  surface-dark-1: "#161629"
  surface-dark-2: "#1D1D30"
  surface-dark-3: "#242438"
  surface-dark-mist: "#71728A"
typography:
  display:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: 600
    lineHeight: 44px
    letterSpacing: -0.01em
  heading-1:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: -0.005em
  heading-2:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
  body:
    fontFamily: Schibsted Grotesk
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  control:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  ui:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  metadata:
    fontFamily: Schibsted Grotesk
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
  editorial-title:
    fontFamily: Sora
    fontSize: 40px
    fontWeight: 400
    lineHeight: 48px
    letterSpacing: -0.01em
  editorial-section:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: 400
    lineHeight: 34px
    letterSpacing: -0.005em
  editorial-label:
    fontFamily: Schibsted Grotesk
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.12em
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
rounded:
  control: 0px
  surface: 0px
components:
  action-primary-light:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.surface-light-raised}"
    typography: "{typography.control}"
  action-primary-dark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.control}"
  page-canvas-light:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
  page-canvas-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-light}"
  panel-light:
    backgroundColor: "{colors.surface-light-raised}"
    textColor: "{colors.primary}"
  panel-dark-1:
    backgroundColor: "{colors.surface-dark-1}"
    textColor: "{colors.surface-light}"
  panel-dark-2:
    backgroundColor: "{colors.surface-dark-2}"
    textColor: "{colors.surface-light}"
  panel-dark-3:
    backgroundColor: "{colors.surface-dark-3}"
    textColor: "{colors.surface-light}"
  muted-region-light:
    backgroundColor: "{colors.surface-light-muted}"
    textColor: "{colors.primary}"
  divider-light:
    backgroundColor: "{colors.border-light}"
  divider-dark:
    backgroundColor: "{colors.surface-dark-mist}"
  secondary-text-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.secondary}"
  secondary-text-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.secondary-dark}"
  signal-light:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.accent-deep}"
  signal-dark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent}"
  signal-wash:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.primary}"
  action-primary-dark-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.primary}"
  action-primary-dark-pressed:
    backgroundColor: "{colors.accent-pressed}"
    textColor: "{colors.primary}"
---

## Overview

Augur provides a shared way to ask questions and record collective decisions. The identity should make important information easy to recognize, understand, and act on across the Lituus application, the public front page, communications, and partner materials.

The core idea is **make what matters clear**. Lead with the page purpose, primary message, or next action. Keep secondary detail available without letting it compete. The experience should feel clear-eyed, credible, neutral, and human: exact language, consistent feedback, equal structure for every choice, and calm direction.

This is a focused brand translation for coding agents, not a replacement for supplied artwork or product tokens. Preserve the production logo, glyph, REP token icon, and implementation token libraries when they are supplied. Production identity masters are not currently supplied to this repository; until they are, the system uses text identity (`resources/brand/PROVENANCE.md`). When the source does not define a value, extend the underlying logic and keep the decision visible rather than creating an arbitrary one-off.

## Foundation authority and status

DESIGN.md is canonical for adopted values representable by the pinned schema, including spacing and corner radius. Control sizing, focus, motion, and interaction policies live in the [visual direction contract](apps/docs/src/content/foundations/visual-direction.mdx). No product's local tokens hold foundation authority.

## Colors

The palette is built around Augur Navy, Augur Green, and a restrained set of paper, graphite, and pewter companions. Navy anchors dark UI and is the primary brand color; it is not pure black. Green is a signal of intent, not a decorative wash: reserve it for the primary action, active state, focus, or a short orienting rule.

- **Augur Navy / `primary` (#0E0E21):** Brand anchor and dark canvas. Use for primary text on light surfaces and for the dark theme foundation.
- **Augur Green / `accent` (#2AE7A8):** Brand accent. Use on dark surfaces for primary intent, focus, active state, or a concise signal. The one light-surface exception is the transient hover of the light primary action, which fills with Green under a Navy label.
- **Augur Paper / `neutral` and `surface-light` (#F5F5F8):** Default light canvas.
- **Augur Graphite / `secondary` (#4A4B61):** Secondary text and supporting information on light surfaces.
- **Augur Pewter / `secondary-dark` (#A1A1B8):** Secondary text on dark surfaces.
- **Deep (#095E42):** The accessible green action and signal companion for light surfaces.
- **Wash (#C9FFE5):** Light green fill companion; it does not replace Deep for readable green text or actions.
- **Green hover (#27D19B) and Green pressed (#24BC8D):** Interaction steps of Augur Green for the dark primary action, adopted from augur.net. They are state fills only, always under a Navy label, never resting colors.
- **Mist (#71728A):** Companion for edges, rules, and quiet marks only, never for readable copy. It marks dark-theme rules and the edges of controls such as inputs and outline buttons in both themes, where it holds at least 3:1 against Paper, White, and Navy. It is not the light quiet-region color, which is Muted.

Light surfaces use Paper as the canvas, White for raised panels, Muted (#ECECF2) for quiet regions, and Border (#E0E0E7) for hairlines. Dark surfaces use Navy as the canvas, then Surface 1 (#161629), Surface 2 (#1D1D30), and Surface 3 / Raised (#242438) as stepped layers. Dark cards sit on Surface 2 and are bounded by Mist, the same edge as controls, as adopted from augur.net; Surface 3 draws the quieter dark editorial rules. In light, panel hairlines (Border) and control edges (Mist) stay distinct. Graphite and Pewter support the system; they do not replace primary copy.

The light and dark themes are equal everyday expressions of one system. Keep content, order, spacing, alignment, and geometry the same in both themes. Use the words open, closed, pending, and final to name state; color only reinforces those words.

Keep text and controls at WCAG AA or better. Reference pairings: Navy on Paper 17.49:1, Graphite on Paper 7.81:1, Deep on Paper 7.17:1, Paper on Navy 17.49:1, Pewter on Navy 7.53:1, Pewter on Surface 3 6.00:1, and Green on Navy 11.87:1. Hover steps keep that standard: Navy on Wash 17.15:1, White on Graphite 8.50:1, Navy on Border 14.49:1, Paper on Surface 3 13.94:1, Navy on Green hover 9.68:1, and Navy on Green pressed 7.84:1. Control edges meet the 3:1 non-text minimum: Mist on Paper 4.31:1, Mist on Navy 4.06:1, and Mist on Surface 2 3.52:1. Recheck every new color-on-background pairing before shipping.

## Typography

Augur uses two contemporary sans-serif families with distinct roles. **Sora** is the sharper primary voice for identity, display, headings, primary navigation, controls, and key actions. **Schibsted Grotesk** is the warmer supporting voice for paragraphs, helper text, metadata, tables, technical strings, and dense UI text. Do not alternate families for decoration; each text element should have one clear role.

Use the restrained scale in the front matter. Size creates order and weight confirms it. Use sentence case for headings, controls, and labels. Reserve capitals for short metadata and standard abbreviations. Do not stack size, weight, color, and capitals to manufacture hierarchy; one strong distinction and one secondary distinction are enough.

The three editorial roles (`editorial-title`, `editorial-section`, `editorial-label`) set the long-form editorial voice: Sora 400 titles and sections where size alone creates order, and tracked Schibsted Grotesk short labels. The seven interface roles keep their adopted 600-weight hierarchy. Mobile steps for the editorial roles (32/40 and 24/32 below 600px) are part of the adopted roles and live in the runtime typography layer; the visual direction guide records the full role definitions.

Align numeric columns right, use one precision per view, and put units in a header or beside the value. For long technical strings such as addresses, truncate in the middle while preserving a recognizable prefix and suffix.

## Layout

The layout rule is information order: page purpose or task first, then status, choices, and the primary action. Give each section one visible priority. Use scale and space to separate primary content from supporting detail, and move optional detail out of the main path.

Light and dark layouts should have the same content order, alignment, and geometry. Surfaces organize content, but they do not imply product priority; lifting a panel is not a claim that it matters more. The adopted component spacing scale is the front-matter `spacing` steps (4, 8, 12, 16, 24, 32px); the larger 48/64/80px values, the 1200px frame, outer gutters, section gaps, and the 65ch reading measure are composition roles recorded in the visual direction guide, not component tokens. Use the spacing steps for component rhythm; never treat a product's local spacing as design-system authority.

For identity assets, use the horizontal lockup by default. Use the vertical lockup only when the width is genuinely constrained, and use the glyph alone only when the surrounding context already names Augur.

## Elevation & Depth

Depth is tonal rather than ornamental. Use stepped surfaces, quiet fields, and hairline rules to group and separate content. In light mode, Paper is the canvas and White creates elevation. In dark mode, Navy is the canvas and the three lifted surfaces create hierarchy for panels, controls, and selected regions.

Do not use decorative shadows, glows, bevels, gradients, textures, or a parallel charcoal palette. Border is a rule color, never a text color or a replacement for a surface. Keep the same elevation logic in both themes.

## Shapes

The logo family consists of the horizontal lockup, vertical lockup, standalone glyph, and canonical REP token icon. When a production master is supplied, start from it. Preserve geometry, proportions, color relationships, clearspace, and the REP icon's circular navy field; never redraw, recolor, crop, stretch, or simplify production artwork.

Use the lowercase **a** in the production wordmark as the clearspace unit, written as **1a**. Keep at least one a-width on the left and right and one a-height above and below. No ink, edge, fold, page trim, card boundary, column rule, photograph, or neighboring logo may enter that zone. For a standalone glyph, preserve the same clearspace proportion relative to adjacent elements.

The glyph minimum is 50px high on screen, measured from arrow tip to pyramid base; its controlling pyramid must remain at least 24px. The production horizontal lockup minimum is 150 x 50px, and the vertical lockup minimum is 94 x 93px. Below those thresholds, give the mark more room or use the glyph only where context already identifies Augur. There is no approved redraw or small-size simplification.

The horizontal lockup is preferred wherever width allows. The vertical lockup is a fallback for narrow columns, square placements, badges, avatars, centered layouts, event backdrops, and slide covers. Two-tint Color is the default on light surfaces; two-tint Reversed is the default on dark surfaces. Single-tint Augur Navy or White is reserved for low-contrast or production-constrained cases and supporting placements.

Corners are square: the adopted `rounded` values are 0px for both controls and surfaces, so panels, cards, dialogs, and controls have no radius. Only a circle intrinsic to a control, such as a radio, and the production identity artwork keep their required geometry; nothing else rounds. Do not introduce shape language that competes with the fixed identity geometry.

## Components

Components should make the next action obvious and keep the record easy to scan. Use direct verbs and specific labels. A control should communicate what will happen before it is used. Give every choice the same structure and emphasis; neutrality is a design constraint, not a default.

Primary actions use Deep on light surfaces and Green on dark surfaces, with a readable contrasting label. On hover, a filled action steps to a neighboring palette color in its own family (Deep to Green, Green to Wash) rather than to a neutral surface, so an engaged action never reads as disabled. A view should usually have one green signal. On light backgrounds, do not use raw Augur Green for readable text or marks when it fails contrast; use Deep instead. On dark backgrounds, Green may carry the signal because it holds contrast against Navy.

Query and decision records should lead with the query or primary message, followed by status, choices, and the participant's current response. Use explicit state labels such as Open, Closed, Pending, and Final. Keep labels, metadata, tables, and technical strings visually secondary through typography and contrast, never by hiding meaning in color alone.

For a logo on a controlled brand surface, use Color on Paper or White and Reversed on Navy, Raised, or another dark surface. If the partner or press surface is uncontrolled, place the production mark on a solid Augur brand field first rather than putting it directly over photography or pattern.

## Do's and Don'ts

- Do lead with what matters: the page purpose, primary message, or next action.
- Do use one clear focal point per section and usually one green signal per view.
- Do keep light and dark themes at parity in content order, spacing, alignment, and behavior.
- Do name system states plainly; let color reinforce, not carry, meaning.
- Do preserve supplied identity assets and use the source artwork directly.
- Do choose logo variants from the background first, then from the role the mark needs to play.
- Do verify every new color pairing at WCAG AA or better.
- Don't redraw, recolor, rotate, distort, crop, keyline, enclose, or add effects to the logo or REP token icon.
- Don't crowd the 1a clearspace or place identity artwork on a busy field.
- Don't use pure black in place of Augur Navy.
- Don't use Augur Green as decoration or as readable light-surface text when Deep is required for contrast.
- Don't use shadows, glows, bevels, gradients, or texture to create hierarchy.
- Don't add taglines to the mark or combine it with partner marks inside its clearspace.
- Don't invent a parallel type scale, spacing scale, corner-radius scale, or one-off treatment where product tokens or supplied artwork already govern.
