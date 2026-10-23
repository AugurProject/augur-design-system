import {
  Button,
  PageHeader,
  PageHeaderActions,
  PageHeaderBreadcrumb,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@augurproject/design-system";

export function PageHeaderCompositionExample() {
  return (
    <PageHeader>
      <PageHeaderBreadcrumb aria-label="Breadcrumb">
        <ol>
          <li>
            <a href="#accounts">Accounts</a>
          </li>
          <li>
            <a href="#accounts-positions" aria-current="page">
              Positions
            </a>
          </li>
        </ol>
      </PageHeaderBreadcrumb>
      <PageHeaderContent>
        {/* Nested composition: headingLevel={2} keeps this header below
            the page's own heading; at the top of a page, keep the default h1. */}
        <PageHeaderTitle headingLevel={2}>Positions</PageHeaderTitle>
        <PageHeaderDescription>
          Every open and closed position for the selected account.
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button>New position</Button>
          <Button variant="outline">Export CSV</Button>
        </PageHeaderActions>
      </PageHeaderContent>
    </PageHeader>
  );
}

