/**
 * Button (issue #11) — the first Augur-owned component.
 *
 * shadcn-compatible API, Augur-owned styling: a native `<button>`
 * styled exclusively through the semantic role custom properties
 * delivered by `@augurproject/design-system/styles.css` (see `./button.css`).
 * React 19 style: a plain function component; `ref` forwards through
 * props (no forwardRef).
 *
 * Contracts (consumer view: docs "Button" page; component contract:
 * `docs/components.md` in this package):
 *
 *   - `type` defaults to "button" — a deliberate deviation from
 *     upstream shadcn, which leaves the browser's "submit" default.
 *     Forms opt into submission explicitly.
 *   - Disabled: native `disabled`, reduced-contrast but present label,
 *     `cursor: not-allowed` (the disabled treatment).
 *   - Loading (`loading`): non-interactive, `aria-busy="true"`, label
 *     kept in the DOM but hidden from eyes and assistive technology so
 *     the button keeps its width; a reduced-motion-safe spinner and a
 *     visually hidden "Loading" status carry the state. The action
 *     color does not change.
 *
 *   - Link rendering (`asChild`, issue #97): shadcn's Slot pattern.
 *     `<Button asChild><a href="/protocol/">How it works</a></Button>`
 *     merges the button classes onto the single child element and
 *     renders nothing else, so the child keeps its own semantics (a link
 *     navigates; it is not a button). `type`, `disabled`, and `loading`
 *     do not apply to a link and are not accepted with `asChild`.
 *
 * Keyboard focus needs no CSS here: the theme contract's shared
 * `:focus-visible` rule (2px ring, 2px offset, `--ring` color) applies
 * to every element, including this one.
 */
import type { ComponentProps } from "react";
import { Slot } from "radix-ui";
import type { ButtonSize, ButtonVariant } from "./button-variants";
import { buttonVariants } from "./button-variants";
import { cx } from "../../internal/cx";

export { buttonVariants } from "./button-variants";

type ButtonStyleProps = {
  /** Visual intent. The default variant is the view's one green signal. */
  variant?: ButtonVariant;
  /** Control size. Default "md". */
  size?: ButtonSize;
};

/** Native `<button>` rendering. */
export type ButtonElementProps = ComponentProps<"button"> &
  ButtonStyleProps & {
    asChild?: false;
    /** Pending state: non-interactive, width-preserving, aria-busy. */
    loading?: boolean;
  };

/** Slot rendering: the button classes are merged onto the single child
 * element (typically an `<a>`), which keeps its own semantics. */
export type ButtonAsChildProps = Omit<ComponentProps<"button">, "type" | "disabled"> &
  ButtonStyleProps & {
    asChild: true;
    loading?: never;
  };

export type ButtonProps = ButtonElementProps | ButtonAsChildProps;

export function Button(props: ButtonProps) {
  if (props.asChild) {
    const { asChild: _asChild, variant, size, className, ...rest } = props;
    return <Slot.Root {...rest} className={cx(buttonVariants({ variant, size }), className)} />;
  }
  const {
    asChild: _asChild,
    variant,
    size,
    loading = false,
    disabled = false,
    type,
    className,
    children,
    ...rest
  } = props;
  return (
    <button
      {...rest}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonVariants({ variant, size }), className)}
    >
      <span className="aug-button-label" aria-hidden={loading || undefined}>
        {children}
      </span>
      {loading ? (
        <span className="aug-button-spinner" aria-hidden="true">
          <svg
            className="aug-button-spinner-icon"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="29 12"
            />
          </svg>
        </span>
      ) : null}
      {loading ? <span className="aug-button-visually-hidden">Loading</span> : null}
    </button>
  );
}
