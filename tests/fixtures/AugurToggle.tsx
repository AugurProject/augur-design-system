import { useState } from "react";
import { AUGUR_FONT_FAMILIES } from "@augurproject/design-system";

/**
 * Minimal consumer-style fixture for the test harness (issue #6).
 *
 * This is deliberately written the way a product consumer would use the
 * design system today: the public entry-point constants and the
 * documented typography classes and generated color tokens. It is test
 * scaffolding, not a starter component — starter components are #11-#14
 * and will live in `packages/design-system/src`.
 *
 * `AUGUR_TOGGLE_TOKENS` records every design token this fixture consumes
 * so the stylesheet-contract tests can fail loudly if a token this
 * fixture relies on disappears from generated output.
 */
export const AUGUR_TOGGLE_TOKENS = ["--augur-color-accent-deep"] as const;

export interface AugurToggleProps {
  /** Accessible name of the toggle button. */
  label: string;
  /** Optional helper text rendered as `augur-type-metadata`. */
  description?: string;
  /** Called with the next pressed state after every toggle. */
  onToggle?: (pressed: boolean) => void;
}

export function AugurToggle({ label, description, onToggle }: AugurToggleProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <div>
      {description ? <p className="augur-type-metadata">{description}</p> : null}
      <button
        type="button"
        className="augur-type-control"
        aria-pressed={pressed}
        onClick={() => {
          const next = !pressed;
          setPressed(next);
          onToggle?.(next);
        }}
        style={{
          color: `var(${AUGUR_TOGGLE_TOKENS[0]})`,
          fontFamily: AUGUR_FONT_FAMILIES.primary,
        }}
      >
        {label}
      </button>
    </div>
  );
}
