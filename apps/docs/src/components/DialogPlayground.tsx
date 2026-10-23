/**
 * Interactive example: Dialog behavior.
 *
 * This module is rendered as a client island (`client:visible`) on the
 * Dialog page — a dialog is inherently interactive, so the live
 * open/close/Escape/overlay/focus behavior needs hydration, which the
 * statically rendered DocExample pipeline does not provide. It lives
 * under src/components/ (app UI, like DocExample) rather than
 * src/examples/ so the example-source parity fixture keeps holding:
 * every module under src/examples/ must appear verbatim in a Markdown
 * endpoint, and islands are represented by description, not source.
 * It renders the real workspace components exclusively.
 *
 * Three working dialogs:
 *   1. Default modal — uncontrolled, opened from the trigger, closed
 *      by the actions, Escape, or the scrim.
 *   2. Long content — the `lg` panel; the body scrolls inside the
 *      viewport-fixed panel (try it at a mobile viewport width).
 *   3. Scoped dark portal — `DialogPortal`'s `container` prop keeps
 *      the portaled panel inside a `[data-theme="dark"]` subtree, so
 *      it inherits that subtree's theme instead of the page theme.
 *
 * Reduced motion is a CSS media contract: the open/close transitions
 * collapse under `prefers-reduced-motion: reduce` with no JS.
 */
import * as React from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@augurproject/design-system";

function ReviewDialogBody({ long = false }: { long?: boolean }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Review query</DialogTitle>
        <DialogDescription>
          Decide whether this query joins the published set.
        </DialogDescription>
      </DialogHeader>
      {long ? (
        <div style={{ display: "grid", gap: "8px" }}>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} style={{ margin: 0 }}>
              Paragraph {i + 1}: the query reads positions and trades for the
              selected book, joins them against the reference set, and records
              the reviewer's decision in the audit trail.
            </p>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0 }}>The query reads positions and trades for the selected book.</p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button>Publish decision</Button>
        </DialogClose>
      </DialogFooter>
    </>
  );
}

export function DialogPlayground() {
  const darkScopeRef = React.useRef<HTMLDivElement>(null);
  const [darkScope, setDarkScope] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setDarkScope(darkScopeRef.current);
  }, []);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <ReviewDialogBody />
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open long-content dialog</Button>
          </DialogTrigger>
          <DialogContent size="lg">
            <ReviewDialogBody long />
          </DialogContent>
        </Dialog>
      </div>

      <div
        ref={darkScopeRef}
        data-theme="dark"
        style={{ padding: "16px", borderRadius: "var(--augur-rounded-surface)", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}
      >
        <span style={{ marginRight: "8px" }}>
          Scoped dark subtree — the dialog below portals into it:
        </span>
        {darkScope ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog (dark scope)</Button>
            </DialogTrigger>
            <DialogContent container={darkScope}>
              <ReviewDialogBody />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
