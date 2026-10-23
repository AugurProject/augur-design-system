/**
 * Input (issue #12) — text entry over the semantic roles.
 *
 * shadcn-compatible API, Augur-owned styling: a native `<input>` styled
 * exclusively through the semantic role custom properties delivered by
 * `@augurproject/design-system/styles.css` (see `./input.css`). React 19
 * style: a plain function component; `ref` forwards through props (no
 * forwardRef).
 *
 * Contracts (consumer view: docs "Input" page; component contract:
 * `docs/components.md` in this package):
 *
 *   - Input is independent of FormField: it never imports from the
 *     form-field tree and works with any consumer-provided labeling
 *     (`<label htmlFor>`). The FormField pattern (issue #12) composes
 *     this component; the dependency points one way only.
 *   - Invalid (`invalid`): sets `aria-invalid="true"` and paints the
 *     danger-role border. The brand defines no danger hue, so the error
 *     MESSAGE text — not the border color —
 *     carries the meaning; never color alone.
 *   - Disabled: native `disabled`, reduced-contrast value, `cursor:
 *     not-allowed` (the disabled treatment, same as Button).
 *   - Read-only: native `readOnly`. Deliberately NOT styled like
 *     disabled: the field stays focusable and its value selectable and
 *     copyable; a quiet surface signals "displayed, not edited".
 *   - Keyboard focus needs no CSS here: the theme contract's shared
 *     `:focus-visible` rule (2px ring, 2px offset, `--ring` color)
 *     applies to every element, including this one.
 *
 * Controlled and uncontrolled usage are both plain React: `value`/
 * `onChange` or `defaultValue` — the component adds no state and no
 * validation; validation ownership stays with the consumer (see the
 * docs page; FormField is the wiring pattern, not a form framework).
 */
import type { ComponentProps } from "react";
import { cx } from "../../internal/cx";

export type InputProps = ComponentProps<"input"> & {
  /**
   * Invalid state: `aria-invalid="true"` plus the danger-role border.
   * Pair with a visible error message announced to assistive
   * technology (FormField wires one automatically; standalone usage
   * wires `aria-describedby` by hand).
   */
  invalid?: boolean;
};

export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cx("aug-input", "augur-type-ui", className)}
    />
  );
}
