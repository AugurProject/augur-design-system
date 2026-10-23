/**
 * Pattern tests for the #14 slice: PageHeader and EmptyState from the
 * real workspace package, run in jsdom by the repository harness (#6)
 * with Testing Library and axe.
 *
 * Covers the issue's test criteria:
 *   - PageHeader heading semantics and slots: `header` container, h1
 *     title by default with `headingLevel` moving the outline (not the
 *     visual voice), description paragraph, named breadcrumb nav
 *     landmark with consumer-rendered list, actions slot, and a clean
 *     no-actions composition;
 *   - EmptyState action rendering and semantics: icon/glyph slot,
 *     heading title (h2 default, `headingLevel` override), description,
 *     and an actions slot whose first Button is the primary variant and
 *     whose secondary is a quiet variant (one green signal);
 *   - axe: full compositions are clean in light and dark scopes;
 *   - stylesheet delivery: the pattern classes ship through
 *     `@augurproject/design-system/styles.css` (the aggregator's relative
 *     imports pull in the pattern sheets, so the injected CSS carries
 *     them; the global var() contract in design-system.test.tsx covers
 *     their custom-property references automatically).
 *
 * jsdom cannot evaluate color-contrast (no layout engine), so the axe
 * rule is disabled here exactly as in the #6/#11 harness; contrast is
 * reviewed against the theme's recorded pairings in the browser fixture
 * (`apps/docs/fixtures/verify-docs.mjs`).
 */
import axe from "axe-core";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  PageHeader,
  PageHeaderActions,
  PageHeaderBreadcrumb,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@augurproject/design-system";
import { loadPackageStyles } from "./support/styles";

describe("public entry point", () => {
  test("exports the #14 pattern slice as functions", () => {
    // The named imports above resolve through the documented public entry
    // ("@augurproject/design-system"); assert the whole slice is real functions.
    const entry: Record<string, unknown> = {
      PageHeader,
      PageHeaderBreadcrumb,
      PageHeaderContent,
      PageHeaderTitle,
      PageHeaderDescription,
      PageHeaderActions,
      EmptyState,
      EmptyStateIcon,
      EmptyStateTitle,
      EmptyStateDescription,
      EmptyStateActions,
    };
    for (const name of Object.keys(entry)) {
      expect(typeof entry[name]).toBe("function");
    }
  });
});

describe("PageHeader semantics and slots", () => {
  test("renders the title as an h1 in a header element with description and actions slots", () => {
    render(
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Positions</PageHeaderTitle>
          <PageHeaderDescription>
            Every open and closed position for the selected account.
          </PageHeaderDescription>
          <PageHeaderActions>
            <Button>New position</Button>
            <Button variant="outline">Export CSV</Button>
          </PageHeaderActions>
        </PageHeaderContent>
      </PageHeader>,
    );

    const title = screen.getByRole("heading", { name: "Positions", level: 1 });
    const header = title.closest("header");
    expect(header).not.toBeNull();
    expect(header).toHaveClass("aug-page-header");

    expect(title).toHaveClass("aug-page-header-title", "augur-type-heading-1");

    const description = screen.getByText(
      "Every open and closed position for the selected account.",
    );
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("aug-page-header-description", "augur-type-body");

    const actions = screen.getByRole("button", { name: "New position" }).closest(
      ".aug-page-header-actions",
    );
    expect(actions).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Export CSV" }).closest(".aug-page-header-actions"),
    ).toBe(actions);
  });

  test("headingLevel moves the document outline without changing the visual voice", () => {
    render(
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle headingLevel={2}>Account overview</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>,
    );

    const title = screen.getByRole("heading", { name: "Account overview", level: 2 });
    expect(title.tagName).toBe("H2");
    expect(title).toHaveClass("aug-page-header-title", "augur-type-heading-1");
  });

  test("the breadcrumb slot is a named navigation landmark wrapping the consumer list", () => {
    render(
      <PageHeader>
        <PageHeaderBreadcrumb aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/accounts">Accounts</a>
            </li>
            <li>
              <a href="/accounts/positions" aria-current="page">
                Positions
              </a>
            </li>
          </ol>
        </PageHeaderBreadcrumb>
        <PageHeaderContent>
          <PageHeaderTitle>Positions</PageHeaderTitle>
        </PageHeaderContent>
      </PageHeader>,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveClass("aug-page-header-breadcrumb");
    expect(nav.tagName).toBe("NAV");
    expect(within(nav).getAllByRole("listitem")).toHaveLength(2);
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
  });

  test("a no-actions composition omits the actions slot cleanly", () => {
    render(
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Reports</PageHeaderTitle>
          <PageHeaderDescription>Saved reports for this workspace.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>,
    );

    expect(screen.getByRole("heading", { name: "Reports" })).not.toBeNull();
    expect(document.querySelector(".aug-page-header-actions")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("EmptyState action rendering and semantics", () => {
  test("renders the glyph slot, heading title, description, and a one-green-signal action row", () => {
    render(
      <EmptyState>
        <EmptyStateIcon>
          <svg aria-hidden="true" data-testid="glyph" />
        </EmptyStateIcon>
        <EmptyStateTitle>No saved queries yet</EmptyStateTitle>
        <EmptyStateDescription>Save a query to rerun it later.</EmptyStateDescription>
        <EmptyStateActions>
          <Button>New query</Button>
          <Button variant="outline">View docs</Button>
        </EmptyStateActions>
      </EmptyState>,
    );

    const glyph = screen.getByTestId("glyph");
    const root = glyph.closest(".aug-empty-state");
    expect(root?.tagName).toBe("DIV");
    expect(glyph.closest(".aug-empty-state-icon")).not.toBeNull();

    const title = screen.getByRole("heading", { name: "No saved queries yet", level: 2 });
    expect(title).toHaveClass("aug-empty-state-title", "augur-type-heading-2");

    const description = screen.getByText("Save a query to rerun it later.");
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("aug-empty-state-description", "augur-type-body");

    const actions = screen.getByRole("button", { name: "New query" }).closest(
      ".aug-empty-state-actions",
    );
    expect(actions).not.toBeNull();
    const buttons = within(actions as HTMLElement).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    // One action priority: the primary (filled) Button first, the quiet
    // (outline) one behind it.
    expect(buttons[0]).toHaveClass("aug-button--default");
    expect(buttons[1]).toHaveClass("aug-button--outline");
  });

  test("headingLevel moves the document outline without changing the visual voice", () => {
    render(
      <EmptyState>
        <EmptyStateTitle headingLevel={3}>Nothing archived</EmptyStateTitle>
      </EmptyState>,
    );

    const title = screen.getByRole("heading", { name: "Nothing archived", level: 3 });
    expect(title.tagName).toBe("H3");
    expect(title).toHaveClass("aug-empty-state-title", "augur-type-heading-2");
  });

  test("a no-action empty state renders without the actions row", () => {
    render(
      <EmptyState>
        <EmptyStateIcon>
          <svg aria-hidden="true" />
        </EmptyStateIcon>
        <EmptyStateTitle>Nothing archived</EmptyStateTitle>
        <EmptyStateDescription>Archived queries will appear here.</EmptyStateDescription>
      </EmptyState>,
    );

    expect(screen.getByRole("heading", { name: "Nothing archived" })).not.toBeNull();
    expect(document.querySelector(".aug-empty-state-actions")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
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

  function FullPage() {
    return (
      <div>
        <PageHeader>
          <PageHeaderBreadcrumb aria-label="Breadcrumb">
            <ol>
              <li>
                <a href="/accounts">Accounts</a>
              </li>
              <li>
                <a href="/accounts/positions" aria-current="page">
                  Positions
                </a>
              </li>
            </ol>
          </PageHeaderBreadcrumb>
          <PageHeaderContent>
            <PageHeaderTitle>Positions</PageHeaderTitle>
            <PageHeaderDescription>
              Every open and closed position for the selected account.
            </PageHeaderDescription>
            <PageHeaderActions>
              <Button>New position</Button>
              <Button variant="outline">Export CSV</Button>
            </PageHeaderActions>
          </PageHeaderContent>
        </PageHeader>
        <EmptyState>
          <EmptyStateIcon>
            <svg aria-hidden="true" />
          </EmptyStateIcon>
          <EmptyStateTitle>No watchlists yet</EmptyStateTitle>
          <EmptyStateDescription>Create a watchlist to track instruments.</EmptyStateDescription>
          <EmptyStateActions>
            <Button>New watchlist</Button>
            <Button variant="outline">Learn more</Button>
          </EmptyStateActions>
        </EmptyState>
      </div>
    );
  }

  test("a full PageHeader + EmptyState composition is axe-clean in a light scope", async () => {
    const { container } = render(<FullPage />);
    expect(await axeViolations(container)).toEqual([]);
  });

  test("a full PageHeader + EmptyState composition is axe-clean in a dark scope", async () => {
    const { container } = render(
      <div data-theme="dark">
        <FullPage />
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  test("a no-actions composition is axe-clean in a dark scope", async () => {
    const { container } = render(
      <div data-theme="dark">
        <PageHeader>
          <PageHeaderContent>
            <PageHeaderTitle>Reports</PageHeaderTitle>
          </PageHeaderContent>
        </PageHeader>
        <EmptyState>
          <EmptyStateTitle>Nothing archived</EmptyStateTitle>
          <EmptyStateDescription>Archived queries will appear here.</EmptyStateDescription>
        </EmptyState>
      </div>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("stylesheet delivery", () => {
  test("the pattern classes ship through the aggregated package stylesheet", () => {
    const { sources, cssText } = loadPackageStyles();
    // The aggregator pulls the pattern sheets in as relative imports.
    expect(sources.some((s) => s.endsWith("patterns/page-header/page-header.css"))).toBe(true);
    expect(sources.some((s) => s.endsWith("patterns/empty-state/empty-state.css"))).toBe(true);
    for (const selector of [
      ".aug-page-header",
      ".aug-page-header-breadcrumb",
      ".aug-page-header-content",
      ".aug-page-header-title",
      ".aug-page-header-description",
      ".aug-page-header-actions",
      ".aug-empty-state",
      ".aug-empty-state-icon",
      ".aug-empty-state-title",
      ".aug-empty-state-description",
      ".aug-empty-state-actions",
    ]) {
      expect(cssText).toContain(selector);
    }
  });
});
