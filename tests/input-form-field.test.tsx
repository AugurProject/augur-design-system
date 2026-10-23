/**
 * Component tests for the Input and FormField slice (issue #12): the
 * components from the real workspace package, run in jsdom by the
 * repository harness (#6) with Testing Library and axe.
 *
 * Covers the issue's test criteria:
 *   - keyboard input: Tab reaches the control (through the FormField
 *     flow), typing updates uncontrolled and controlled values,
 *     disabled swallows input, read-only keeps the value;
 *   - accessible names/descriptions: the label association
 *     (htmlFor/id), the description wired through `aria-describedby`,
 *     and the error id present exactly when an error is — no dangling
 *     idrefs;
 *   - error state: `aria-invalid` derived from the field's `error`,
 *     the message announced via `role="alert"`, required semantics
 *     native plus a visually marked (aria-hidden) label;
 *   - independence: a bare Input with consumer-owned labeling works
 *     without FormField (the issue's composition-direction criterion);
 *   - axe: compositions with description and visible error text are
 *     clean in light and dark scopes;
 *   - stylesheet delivery: the input/form-field classes and the
 *     semantic roles they reference ship through `./styles.css`.
 *
 * jsdom cannot evaluate color-contrast (no layout engine), so the axe
 * rule is disabled here exactly as in the #6 harness; the rendered
 * review of both themes runs against the built docs pages.
 */
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import {
  FormField,
  FormFieldControl,
  Input,
} from "@augurproject/design-system";
import { loadPackageStyles } from "./support/styles";

function renderField(props?: { error?: string; required?: boolean }) {
  return render(
    <FormField
      label="Query name"
      description="Shown in the records list."
      error={props?.error}
      required={props?.required}
    >
      <FormFieldControl placeholder="Q3 records review" />
    </FormField>,
  );
}

describe("FormField keyboard input flow", () => {
  test("Tab reaches the control; typing updates an uncontrolled value", async () => {
    const user = userEvent.setup();
    const { container } = renderField();
    const input = screen.getByRole("textbox", { name: "Query name" });

    await user.tab();
    expect(document.activeElement).toBe(input);

    await user.type(input, "Q3 review");
    expect(input).toHaveValue("Q3 review");

    await user.tab();
    expect(document.activeElement).not.toBe(input);
    expect(container.querySelector(".aug-form-field")).not.toBeNull();
  });

  test("controlled usage: typing calls onChange with the typed value", async () => {
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <FormField label="Curator">
          <FormFieldControl
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value);
              onChange(event.currentTarget.value);
            }}
          />
        </FormField>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByRole("textbox", { name: "Curator" });
    await user.type(input, "ab");
    expect(onChange).toHaveBeenCalledWith("a");
    expect(onChange).toHaveBeenCalledWith("ab");
    expect(input).toHaveValue("ab");
  });
});

describe("FormField accessible name and description wiring", () => {
  test("the label is the accessible name via a real htmlFor/id association", () => {
    const { container } = renderField();
    const input = screen.getByRole("textbox", { name: "Query name" });
    const label = container.querySelector("label");
    expect(label).toHaveAttribute("for", input.id);
    expect(input.id).not.toBe("");
  });

  test("aria-describedby names the description, and the error only when present", () => {
    const valid = renderField();
    const validInput = screen.getByRole("textbox", { name: "Query name" });
    const describedBy = validInput.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ").filter(Boolean);
    expect(ids).toHaveLength(1);
    for (const id of ids) {
      expect(valid.container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    expect(validInput).toHaveAccessibleDescription("Shown in the records list.");
    valid.unmount();

    const invalid = renderField({ error: "Enter a query name." });
    const invalidInput = screen.getByRole("textbox", { name: "Query name" });
    const describedIds = (invalidInput.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .filter(Boolean);
    expect(describedIds).toHaveLength(2);
    for (const id of describedIds) {
      expect(invalid.container.querySelector(`#${CSS.escape(id)}`)).not.toBeNull();
    }
    expect(invalidInput).toHaveAccessibleDescription(
      "Shown in the records list. Enter a query name.",
    );
  });

  test("no dangling idrefs in any state (axe's aria-valid-attr-value contract)", () => {
    for (const error of [undefined, "Enter a query name."]) {
      const { container, unmount } = renderField({ error });
      const input = container.querySelector("input");
      const refs = (input?.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .filter(Boolean);
      for (const ref of refs) {
        expect(container.querySelector(`#${CSS.escape(ref)}`)).not.toBeNull();
      }
      unmount();
    }
  });
});

describe("FormField error state", () => {
  test("error marks the control invalid and announces the message", () => {
    renderField({ error: "Enter a query name." });

    const input = screen.getByRole("textbox", { name: "Query name" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a query name.");
  });

  test("no error means no aria-invalid and no alert", () => {
    renderField();
    const input = screen.getByRole("textbox", { name: "Query name" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("standalone Input takes `invalid` directly for consumer-owned wiring", () => {
    render(
      <>
        <label htmlFor="standalone">Deadline</label>
        <Input id="standalone" invalid aria-describedby="standalone-error" />
        <p id="standalone-error" role="alert">
          Enter a valid date.
        </p>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Deadline" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid date.");
  });
});

describe("FormField required semantics", () => {
  test("required reaches the control natively and the label marker stays aria-hidden", () => {
    const { container } = renderField({ required: true });
    const input = screen.getByRole("textbox", { name: /Query name/ });
    expect(input).toBeRequired();

    const marker = container.querySelector(".aug-form-field-required");
    expect(marker).not.toBeNull();
    expect(marker).toHaveAttribute("aria-hidden", "true");
    // The accessible name must not read the marker: it stays "Query name *"-free.
    expect(input).toHaveAccessibleName("Query name");
  });

  test("non-required fields carry no marker and no required attribute", () => {
    const { container } = renderField();
    expect(screen.getByRole("textbox", { name: "Query name" })).not.toBeRequired();
    expect(container.querySelector(".aug-form-field-required")).toBeNull();
  });
});

describe("Input disabled and read-only contracts", () => {
  test("disabled controls render the attribute and swallow input", async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Archived field">
        <FormFieldControl disabled defaultValue="Frozen value" />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Archived field" });
    expect(input).toBeDisabled();

    await user.type(input, "x");
    expect(input).toHaveValue("Frozen value");
  });

  test("read-only controls keep the value but stay focusable and copyable", async () => {
    const user = userEvent.setup();
    render(
      <FormField label="Record id">
        <FormFieldControl readOnly defaultValue="REC-0417" />
      </FormField>,
    );
    const input = screen.getByRole("textbox", { name: "Record id" });
    expect(input).toHaveAttribute("readonly");
    expect(input).not.toBeDisabled();

    await user.tab();
    expect(document.activeElement).toBe(input);

    await user.type(input, "x");
    expect(input).toHaveValue("REC-0417");
    // Editing is refused but the field keeps focus — it is not disabled.
    expect(document.activeElement).toBe(input);
  });
});

describe("Input independence from FormField", () => {
  test("a bare Input with consumer-owned labeling passes axe on its own", async () => {
    const { container } = render(
      <div data-theme="dark">
        <label htmlFor="bare">Reviewer email</label>
        <Input id="bare" type="email" placeholder="you@example.com" />
      </div>,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      results.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  });
});

describe("axe accessibility findings", () => {
  async function axeViolations(container: HTMLElement): Promise<string[]> {
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    return results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.nodes
          .map((node) => node.target.join(" ") || "(no target)")
          .join(", ")}`,
    );
  }

  test("a composition with description and explicit error text is axe-clean", async () => {
    const { container } = render(
      <div>
        <FormField
          label="Query name"
          description="Shown in the records list."
          required
        >
          <FormFieldControl placeholder="Q3 records review" />
        </FormField>
        <FormField
          label="Review deadline"
          description="When this query must close."
          error="Enter a date in YYYY-MM-DD format."
        >
          <FormFieldControl defaultValue="2023-13-45" />
        </FormField>
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  test("the same composition with a visible error is axe-clean in a dark scope", async () => {
    const { container } = render(
      <div data-theme="dark">
        <FormField
          label="Review deadline"
          description="When this query must close."
          error="Enter a date in YYYY-MM-DD format."
        >
          <FormFieldControl defaultValue="2023-13-45" />
        </FormField>
        <FormField label="Curator note">
          <FormFieldControl readOnly defaultValue="Held for review" />
        </FormField>
        <FormField label="Archived field">
          <FormFieldControl disabled placeholder="Not editable" />
        </FormField>
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("component stylesheet delivery", () => {
  const packageStyles = loadPackageStyles();

  test("input and form-field classes ship through the ./styles.css export", () => {
    expect(packageStyles.sources.some((source) => source.endsWith("components/input/input.css"))).toBe(true);
    expect(packageStyles.sources.some((source) => source.endsWith("components/form-field/form-field.css"))).toBe(true);
    expect(packageStyles.cssText).toContain(".aug-input");
    expect(packageStyles.cssText).toContain(".aug-form-field");
  });

  test("every custom property referenced by the new CSS is declared", () => {
    const missing = [...packageStyles.referenced].filter(
      (name) => !packageStyles.declared.has(name),
    );
    expect(missing).toEqual([]);
  });
});
