/**
 * Component tests for the first component slice (issue #11): Button and
 * Card from the real workspace package, run in jsdom by the repository
 * harness (#6) with Testing Library and axe.
 *
 * Covers the issue's test criteria:
 *   - keyboard/activation: Tab reaches the button; Enter and Space
 *     activate it; disabled and loading buttons do not activate;
 *   - disabled/loading contracts: native disabled, aria-busy,
 *     width-preserving label treatment, intact accessible name;
 *   - HTML semantics: native `<button>` with `type="button"` default,
 *     Card part elements and heading semantics;
 *   - axe: variant matrix and Card composition are clean in light and
 *     dark scopes;
 *   - stylesheet delivery: the component classes and the theme
 *     contract's focus rule ship through `./styles.css`.
 *
 * jsdom cannot evaluate color-contrast (no layout engine), so the axe
 * rule is disabled here exactly as in the #6 harness; contrast is
 * reviewed against the theme's recorded pairings in the browser fixture
 * (`apps/docs/fixtures/verify-docs.mjs`, "Component slice").
 */
import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@augurproject/design-system";
import { loadPackageStyles } from "./support/styles";

describe("Button keyboard and activation contract", () => {
  test("Tab reaches the button; Enter and Space activate it", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Review query</Button>);

    const button = screen.getByRole("button", { name: "Review query" });
    await user.tab();
    expect(document.activeElement).toBe(button);

    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  test("the default variant carries the default classes", () => {
    render(<Button>Open record</Button>);
    const button = screen.getByRole("button", { name: "Open record" });
    expect(button).toHaveClass("aug-button", "augur-type-control", "aug-button--default", "aug-button--md");
  });

  test("consumer className is appended after the component classes", () => {
    render(<Button className="extra">Open record</Button>);
    const button = screen.getByRole("button", { name: "Open record" });
    expect(button).toHaveClass("aug-button", "extra");
  });
});

describe("Button disabled contract", () => {
  test("disabled buttons render the attribute and swallow activation", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Closed action
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Closed action" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");

    await user.click(button);
    await user.keyboard("{Enter}");
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button loading contract", () => {
  test("loading is non-interactive, busy, width-preserving, and renamed", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        Finalize record
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Loading" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    const label = button.querySelector(".aug-button-label");
    expect(label).not.toBeNull();
    expect(label).toHaveTextContent("Finalize record");
    expect(label).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(label as Element).visibility).toBe("hidden");

    expect(button.querySelector(".aug-button-spinner")).not.toBeNull();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("non-loading buttons expose the label directly and render no spinner", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector(".aug-button-spinner")).toBeNull();
    expect(button.querySelector(".aug-button-visually-hidden")).toBeNull();
  });
});

describe("Button HTML semantics", () => {
  test("renders a native button defaulting to type=button", () => {
    render(<Button>Open</Button>);
    expect(screen.getByRole("button", { name: "Open" }).getAttribute("type")).toBe("button");
  });

  test("type is consumer-overridable for form submission", () => {
    render(<Button type="submit">Submit query</Button>);
    expect(screen.getByRole("button", { name: "Submit query" }).getAttribute("type")).toBe("submit");
  });

  test("buttonVariants composes variant and size classes", () => {
    expect(buttonVariants({ variant: "outline", size: "lg" })).toBe(
      "aug-button augur-type-control aug-button--outline aug-button--lg",
    );
  });
});

describe("Button link rendering (asChild, issue #97)", () => {
  test("asChild renders the child link with button classes and no button", () => {
    render(
      <Button asChild size="lg" className="extra">
        <a href="/protocol/">How Augur works</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "How Augur works" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/protocol/");
    expect(link.className).toBe(`${buttonVariants({ size: "lg" })} extra`);
    expect(link.hasAttribute("type")).toBe(false);
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("a link button is reachable by Tab and follows the link on Enter", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    render(
      <Button asChild variant="outline">
        <a href="/learn/" onClick={onClick}>
          Learn
        </a>
      </Button>,
    );
    await user.tab();
    expect(screen.getByRole("link", { name: "Learn" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("button-only props are type errors with asChild", () => {
    const invalid = [
      // @ts-expect-error loading does not apply to a link
      <Button key="loading" asChild loading><a href="#a">A</a></Button>,
      // @ts-expect-error a link has no disabled state
      <Button key="disabled" asChild disabled><a href="#b">B</a></Button>,
    ];
    expect(invalid).toHaveLength(2);
  });

  test("a link button matrix is axe-clean", async () => {
    const { container } = render(
      <nav aria-label="Actions">
        {(["default", "secondary", "outline", "ghost", "link"] as const).map((variant) => (
          <Button key={variant} asChild variant={variant}>
            <a href={`#${variant}`}>{`Go ${variant}`}</a>
          </Button>
        ))}
      </nav>,
    );
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe("Card composition semantics", () => {
  test("renders the pure part set with real heading semantics", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Query review</CardTitle>
          <CardDescription>Status and choices for this record.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The panel groups the record with its actions.</p>
        </CardContent>
        <CardFooter>
          <Button>Open record</Button>
        </CardFooter>
      </Card>,
    );

    const title = screen.getByRole("heading", { name: "Query review" });
    expect(title.tagName).toBe("H3");
    expect(title).toHaveClass("aug-card-title", "augur-type-heading-2");

    const description = screen.getByText("Status and choices for this record.");
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("aug-card-description", "augur-type-metadata");

    const content = screen.getByText("The panel groups the record with its actions.").closest(
      ".aug-card-content",
    );
    expect(content).toHaveClass("augur-type-body");

    const card = title.closest(".aug-card");
    expect(card?.tagName).toBe("DIV");
    expect(card).toContainElement(screen.getByRole("button", { name: "Open record" }));
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

  test("the full Button matrix is axe-clean", async () => {
    const { container } = render(
      <div>
        <Button variant="default">Primary action</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Delete record</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link action</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Finalize record</Button>
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  test("a Card composition is axe-clean in a dark scope", async () => {
    const { container } = render(
      <div data-theme="dark">
        <Card>
          <CardHeader>
            <CardTitle>Query review</CardTitle>
            <CardDescription>Status and choices for this record.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>The panel groups the record with its actions.</p>
          </CardContent>
          <CardFooter>
            <Button>Open record</Button>
            <Button variant="secondary">Hold</Button>
          </CardFooter>
        </Card>
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("component stylesheet delivery", () => {
  const packageStyles = loadPackageStyles();

  test("component classes ship through the ./styles.css export", () => {
    expect(packageStyles.sources.some((source) => source.endsWith("components/button/button.css"))).toBe(true);
    expect(packageStyles.sources.some((source) => source.endsWith("components/card/card.css"))).toBe(true);
    expect(packageStyles.cssText).toContain(".aug-button");
    expect(packageStyles.cssText).toContain(".aug-card");
  });

  test("the theme contract's focus ring rule ships for keyboard focus", () => {
    expect(packageStyles.cssText).toContain(":focus-visible");
    expect(packageStyles.cssText).toContain("var(--ring)");
  });

  test("every custom property referenced by component CSS is declared", () => {
    const missing = [...packageStyles.referenced].filter(
      (name) => !packageStyles.declared.has(name),
    );
    expect(missing).toEqual([]);
  });
});
