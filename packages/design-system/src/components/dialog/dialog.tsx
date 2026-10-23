/**
 * Dialog (issue #13) — a primitive-backed Augur component.
 *
 * Behavior (modal focus containment and restoration, Escape and
 * outside-press dismissal, tab looping, scroll locking) comes from the
 * Radix dialog primitive, consumed through the single `radix-ui`
 * package — the dependency the registry contract (issue #16, §6) pins
 * as the verified upstream scaffold. The API surface here is Augur
 * property: a shadcn-compatible part set (Dialog, DialogTrigger,
 * DialogPortal, DialogOverlay, DialogContent, DialogHeader,
 * DialogFooter, DialogTitle, DialogDescription, DialogClose) styled
 * exclusively through the semantic role custom properties delivered by
 * `@augurproject/design-system/styles.css` (see `./dialog.css`).
 *
 * Contracts (consumer view: docs "Dialog" page; component contract:
 * `docs/components.md` in this package):
 *
 *   - Controlled AND uncontrolled: `open` / `onOpenChange` /
 *     `defaultOpen` pass straight through to the primitive.
 *   - Naming is required: the primitive wires `aria-labelledby` /
 *     `aria-describedby` when DialogTitle / DialogDescription render.
 *     Augur adds an explicit development-time check — a DialogContent
 *     with no DialogTitle and no `aria-label` / `aria-labelledby`
 *     logs a console error (the primitive's own warning is compiled
 *     out of its production build); a missing DialogDescription logs
 *     a console warning.
 *   - Portal rendering: DialogContent portals to `document.body`, so
 *     the dialog inherits the theme applied to `<html>`; for a dialog
 *     inside a scoped `[data-theme]` subtree, pass `container` to
 *     DialogPortal (shadcn-compatible) so the portaled surface keeps
 *     the subtree's theme.
 *   - React 19 style: plain function components; `ref` forwards
 *     through props (no forwardRef).
 *
 * Keyboard focus needs no CSS here: the theme contract's shared
 * `:focus-visible` rule (2px ring, 2px offset, `--ring` color) applies
 * to every element, including the dialog's close button and the
 * controls composed into it.
 */
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { cx } from "../../internal/cx";

/** Visual width of the dialog panel (structural steps). */
export type DialogSize = "sm" | "md" | "lg";

/** Root: owns open state (controlled or uncontrolled) and modal mode. */
export type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

export function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

/** Trigger: opens the dialog. Compose with `asChild` for Button. */
export type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

export function DialogTrigger(props: DialogTriggerProps) {
  return <DialogPrimitive.Trigger {...props} />;
}

/**
 * Portal: renders the dialog into `document.body` by default. Pass
 * `container` (an element inside a scoped `[data-theme]` subtree) so a
 * portaled dialog inherits that subtree's theme; `forceMount` keeps
 * content mounted for animation or measurement.
 */
export type DialogPortalProps = React.ComponentProps<typeof DialogPrimitive.Portal>;

export function DialogPortal(props: DialogPortalProps) {
  return <DialogPrimitive.Portal {...props} />;
}

/** Close: closes the dialog. Compose with `asChild` for Button. */
export type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

export function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close {...props} />;
}

/** Overlay: the scrim behind the panel; not focusable, not interactive. */
export type DialogOverlayProps = React.ComponentProps<typeof DialogPrimitive.Overlay>;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      {...props}
      className={cx("aug-dialog-overlay", className)}
    />
  );
}

/**
 * Development-time naming check. Inspects the RENDERED panel's ARIA
 * attributes — wired by the primitive from the composed DialogTitle /
 * DialogDescription (or the consumer's own aria-label / aria-labelledby)
 * — instead of tracking children with a parallel registry, so the check
 * cannot disagree with the primitive about what is present.
 */
const CONTENT_SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "aug-dialog-content--sm",
  md: "aug-dialog-content--md",
  lg: "aug-dialog-content--lg",
};

export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Visual width step (see docs "Sizes"). Default "md". */
  size?: DialogSize;
  /**
   * Portal target for the panel and overlay. Defaults to
   * `document.body` (shadcn-compatible). Pass an element inside a
   * scoped `[data-theme]` subtree so the portaled dialog inherits that
   * subtree's theme instead of the `<html>` theme.
   */
  container?: HTMLElement;
};

/**
 * Content: the modal panel (role="dialog"). Renders the portal, the
 * overlay, and the primitive content with the Augur panel styling and
 * the close button (visually hidden "Close" label, as upstream).
 *
 * Naming contract, enforced in development: either a DialogTitle is
 * composed inside, or `aria-label` / `aria-labelledby` is passed —
 * otherwise a console error names the fix. A missing DialogDescription
 * logs a console warning (description is recommended, not required).
 */
export function DialogContent({
  size = "md",
  container,
  className,
  children,
  ...props
}: DialogContentProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // The portal mounts its children one commit after this component
    // (the primitive's SSR guard), and the primitive settles the ARIA
    // attributes on the pass after that (title/description presence
    // tracking). A macrotask delay lets both settle before this
    // development-only check reports anything.
    const timeout = setTimeout(() => {
      const el = contentRef.current;
      if (!el) return;
      if (!el.getAttribute("aria-labelledby") && !el.getAttribute("aria-label")) {
        // eslint-disable-next-line no-console
        console.error(
          "[augur] Dialog: DialogContent has no accessible name. Compose a DialogTitle inside it, or pass aria-label / aria-labelledby on DialogContent.",
        );
      }
      if (!el.getAttribute("aria-describedby")) {
        // eslint-disable-next-line no-console
        console.warn(
          "[augur] Dialog: DialogContent has no DialogDescription. Describing the dialog is recommended for screen readers.",
        );
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <DialogPrimitive.Portal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        {...props}
        className={cx("aug-dialog-content", CONTENT_SIZE_CLASSES[size], className)}
      >
        {children}
        <DialogPrimitive.Close className="aug-dialog-close">
          <svg
            className="aug-dialog-close-icon"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="aug-dialog-visually-hidden">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export type DialogHeaderProps = React.ComponentProps<"div">;

/** Header block: stacks the title and (optionally) description. */
export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div {...props} className={cx("aug-dialog-header", className)} />;
}

export type DialogFooterProps = React.ComponentProps<"div">;

/** Footer row for actions; children lay out inline, end-aligned. */
export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div {...props} className={cx("aug-dialog-footer", className)} />;
}

export type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;

/**
 * Dialog title: an `h2` (shadcn convention — real heading semantics
 * rather than a styled div). Required by the naming contract; wires
 * the content's `aria-labelledby` through the primitive.
 */
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      {...props}
      className={cx("aug-dialog-title", "augur-type-heading-2", className)}
    />
  );
}

export type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

/** Supporting text under the title; wires `aria-describedby`. */
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      {...props}
      className={cx("aug-dialog-description", "augur-type-metadata", className)}
    />
  );
}
