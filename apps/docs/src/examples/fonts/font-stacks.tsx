import { AUGUR_FONT_FAMILIES } from "@augurproject/design-system";

/**
 * Apply the package's voice-named font stacks: the stacks are the
 * imported constants, not local copies.
 */
export function FontStacksExample() {
  return (
    <>
      <p className="augur-type-body" style={{ fontFamily: AUGUR_FONT_FAMILIES.primary }}>
        Primary voice — Sora carries display, headings, controls, and key actions.
      </p>
      <p className="augur-type-body" style={{ fontFamily: AUGUR_FONT_FAMILIES.secondary }}>
        Secondary voice — Schibsted Grotesk carries body copy, helper text, and dense UI.
      </p>
    </>
  );
}
