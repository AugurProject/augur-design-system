/**
 * Dialog tests for the second component slice (issue #13): the
 * primitive-backed dialog from the real workspace package, run in jsdom
 * by the repository harness (#6) with Testing Library and axe.
 *
 * Covers the issue's acceptance criteria that are deterministic in
 * jsdom:
 *   - open/close via click and keyboard (Enter on the trigger), plus
 *     the DialogClose part;
 *   - Escape and overlay (outside-press) dismissal;
 *   - modal focus containment: focus moves into the dialog on open,
 *     Tab cycles within it, and focus is restored to the trigger on
 *     close (primitive-backed; no custom focus-trap engine — out of
 *     scope per the issue);
 *   - controlled and uncontrolled usage (`open` / `onOpenChange` /
 *     `defaultOpen`);
 *   - aria-labelledby / aria-describedby wiring through DialogTitle /
 *     DialogDescription, and the explicit development-time naming
 *     warning Augur carries (the primitive's own warning is compiled
 *     out of its production build);
 *   - portal rendering: the dialog renders outside the React root,
 *     and a `container` prop keeps a portaled dialog inside a scoped
 *     `[data-theme]` subtree (portal theme inheritance);
 *   - axe findings for an open dialog, in light and dark scopes;
 *   - stylesheet delivery: dialog classes ship through the real
 *     `./styles.css` export.
 *
 * Real-browser focus, scroll, and computed-style review in both themes
 * runs on the docs page examples through #15 (Playwright), per the
 * issue's verification plan.
 */
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
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
import { loadPackageStyles } from "./support/styles";

/** A complete, correctly named dialog with a trigger and two actions. */
function ReviewDialog(props: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  container?: HTMLElement;
}) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      defaultOpen={props.defaultOpen}
    >
      <DialogTrigger asChild>
        <Button>Review query</Button>
      </DialogTrigger>
      <DialogContent container={props.container}>
        <DialogHeader>
          <DialogTitle>Review query</DialogTitle>
          <DialogDescription>
            Decide whether this query joins the published set.
          </DialogDescription>
        </DialogHeader>
        <p className="augur-type-body">The query reads positions and trades for the selected book.</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Publish decision</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Harness for controlled usage: external state opens and closes. */
function ControlledHarness() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open externally
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label="Confirm publication">
          <p>Controlled body.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dialog open and close contracts", () => {
  test("opens via click on the trigger and renders through a portal", async () => {
    const user = userEvent.setup();
    const { container } = render(<ReviewDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review query" }));

    const dialog = screen.getByRole("dialog", { name: "Review query" });
    expect(dialog).toBeInTheDocument();
    // Portal: the panel renders outside the React root, in document.body.
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    // The scrim renders with it.
    expect(document.querySelector(".aug-dialog-overlay")).not.toBeNull();
  });

  test("opens via keyboard (Enter on a focused trigger)", async () => {
    const user = userEvent.setup();
    render(<ReviewDialog />);

    screen.getByRole("button", { name: "Review query" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: "Review query" })).toBeInTheDocument();
  });

  test("Escape closes the dialog and focus is restored to the trigger", async () => {
    const user = userEvent.setup();
    render(<ReviewDialog />);

    const trigger = screen.getByRole("button", { name: "Review query" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    // The scrim is removed with the panel.
    await waitFor(() =>
      expect(document.querySelector(".aug-dialog-overlay")).toBeNull(),
    );
  });

  test("activating the scrim (outside press) dismisses the dialog", async () => {
    const user = userEvent.setup();
    render(<ReviewDialog />);

    await user.click(screen.getByRole("button", { name: "Review query" }));
    const overlay = document.querySelector<HTMLElement>(".aug-dialog-overlay");
    expect(overlay).not.toBeNull();

    await user.click(overlay as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("DialogClose actions close the dialog", async () => {
    const user = userEvent.setup();
    render(<ReviewDialog />);

    const trigger = screen.getByRole("button", { name: "Review query" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    // And it can be reopened afterwards.
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Review query" })).toBeInTheDocument();
  });

  test("uncontrolled usage stays open until dismissed (defaultOpen opens it)", () => {
    render(<ReviewDialog defaultOpen />);
    expect(screen.getByRole("dialog", { name: "Review query" })).toBeInTheDocument();
  });
});

describe("Dialog focus containment", () => {
  test("focus moves into the dialog on open and Tab cycles within it", async () => {
    const user = userEvent.setup();
    render(<ReviewDialog />);

    await user.click(screen.getByRole("button", { name: "Review query" }));
    const dialog = screen.getByRole("dialog");

    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement | null));

    // Five forward stops across three focusables — every stop stays inside.
    for (let i = 0; i < 5; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement | null);
    }

    // And a backwards stop from the first focusable stays inside too.
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(dialog).toContainElement(document.activeElement as HTMLElement | null);
  });
});

describe("Dialog controlled usage", () => {
  test("external state opens the dialog; dismissal reports onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent aria-label="Confirm publication">
          <p>Controlled body.</p>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByRole("dialog", { name: "Confirm publication" })).not.toBeInTheDocument();

    rerender(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent aria-label="Confirm publication">
          <p>Controlled body.</p>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Confirm publication" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // The owner still controls the state: without a rerender the dialog stays.
    expect(screen.getByRole("dialog", { name: "Confirm publication" })).toBeInTheDocument();
  });

  test("a controlled harness opens from external state and closes via Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledHarness />);

    await user.click(screen.getByRole("button", { name: "Open externally" }));
    expect(screen.getByRole("dialog", { name: "Confirm publication" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Confirm publication" })).not.toBeInTheDocument(),
    );
  });
});

describe("Dialog screen-reader structure", () => {
  test("Title and Description wire aria-labelledby and aria-describedby", () => {
    render(<ReviewDialog defaultOpen />);

    const dialog = screen.getByRole("dialog", { name: "Review query" });
    expect(dialog).toHaveAccessibleDescription(
      "Decide whether this query joins the published set.",
    );

    const title = screen.getByRole("heading", { name: "Review query", level: 2 });
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    const description = screen.getByText(
      "Decide whether this query joins the published set.",
    );
    expect(dialog.getAttribute("aria-describedby")).toBe(description.id);
  });

  test("the close button carries an accessible name and the title uses heading semantics", () => {
    render(<ReviewDialog defaultOpen />);

    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
    const title = screen.getByRole("heading", { name: "Review query", level: 2 });
    expect(title).toHaveClass("aug-dialog-title", "augur-type-heading-2");
  });

  test("missing naming logs the explicit Augur console error in development", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Dialog open>
        <DialogContent>
          <p>No title composed.</p>
        </DialogContent>
      </Dialog>,
    );

    // The check runs after the portaled panel and the primitive's ARIA
    // wiring settle (a macrotask after mount).
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("DialogContent has no accessible name"),
      ),
    );
    // The description recommendation is a separate, softer warning.
    await waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("no DialogDescription"),
      ),
    );
  });

  test("an aria-label satisfies the naming contract without a warning", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Dialog open>
        <DialogContent aria-label="Confirm publication">
          <p>Named by attribute.</p>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => expect(warnSpy).toHaveBeenCalled());
    expect(errorSpy).not.toHaveBeenCalled();
    // Description is still recommended.
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no DialogDescription"));
  });

  test("a composed Title and Description keep the console clean", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<ReviewDialog defaultOpen />);

    // Let the delayed development check run before concluding it is silent.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("Dialog portal theme inheritance", () => {
  test("a container prop keeps the portaled dialog inside a scoped dark subtree", async () => {
    const user = userEvent.setup();
    const portalTarget = document.createElement("div");
    portalTarget.setAttribute("data-theme", "dark");
    document.body.appendChild(portalTarget);

    render(<ReviewDialog container={portalTarget} />);
    await user.click(screen.getByRole("button", { name: "Review query" }));

    const dialog = screen.getByRole("dialog", { name: "Review query" });
    expect(portalTarget.contains(dialog)).toBe(true);
    expect(portalTarget.querySelector(".aug-dialog-overlay")).not.toBeNull();
  });
});

describe("Dialog axe accessibility findings", () => {
  async function axeViolations(element: Element): Promise<string[]> {
    const results = await axe.run(element, {
      rules: { "color-contrast": { enabled: false } },
    });
    return results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.nodes
          .map((node) => node.target.join(" ") || "(no target)")
          .join(", ")}`,
    );
  }

  test("an open dialog is axe-clean", async () => {
    render(<ReviewDialog defaultOpen />);
    const dialog = screen.getByRole("dialog", { name: "Review query" });
    expect(await axeViolations(dialog)).toEqual([]);
  });

  test("an open dialog portaled into a dark-scoped container is axe-clean", async () => {
    const portalTarget = document.createElement("div");
    portalTarget.setAttribute("data-theme", "dark");
    document.body.appendChild(portalTarget);

    render(<ReviewDialog defaultOpen container={portalTarget} />);
    const dialog = screen.getByRole("dialog", { name: "Review query" });
    expect(await axeViolations(dialog)).toEqual([]);
  });

  test("an attribute-named dialog is axe-clean", async () => {
    render(
      <Dialog open>
        <DialogContent aria-label="Confirm publication">
          <p>Named by attribute.</p>
        </DialogContent>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirm publication" });
    expect(await axeViolations(dialog)).toEqual([]);
  });
});

describe("Dialog stylesheet delivery", () => {
  const packageStyles = loadPackageStyles();

  test("dialog classes ship through the ./styles.css export", () => {
    expect(
      packageStyles.sources.some((source) =>
        source.endsWith("components/dialog/dialog.css"),
      ),
    ).toBe(true);
    expect(packageStyles.cssText).toContain(".aug-dialog-overlay");
    expect(packageStyles.cssText).toContain(".aug-dialog-content");
    expect(packageStyles.cssText).toContain(".aug-dialog-title");
    expect(packageStyles.cssText).toContain(".aug-dialog-close");
  });

  test("dialog CSS references semantic roles only (no raw color values)", () => {
    // Scope the raw-value check to the dialog sheet itself — the
    // aggregate cssText legitimately contains generated token hex values
    // (issue #3 policy: raw values live in generated output only).
    // The sheet's text, read at its real (imported-by-styles.css) path:
    // this is a lint-style assertion on the delivered bytes, not a
    // behavioral one.
    const dialogCss = readFileSync(
      resolve(process.cwd(), "packages/design-system/src/components/dialog/dialog.css"),
      "utf8",
    );
    expect(dialogCss).toContain("var(--popover)");
    expect(dialogCss).toContain("var(--foreground)");
    expect(dialogCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
