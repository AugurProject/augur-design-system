import {
  Button,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@augurproject/design-system";

export function PageHeaderLongContentExample() {
  return (
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderTitle headingLevel={2}>
          Reconciled fills and open exposure for the derivatives desk, week 34
        </PageHeaderTitle>
        <PageHeaderDescription>
          This report gathers every fill matched against the clearing feed, the open
          exposure that remains after netting, and the reconciliation breaks that still
          need a reviewer's decision before the week can be closed.
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button>Review breaks</Button>
          <Button variant="outline">Schedule</Button>
        </PageHeaderActions>
      </PageHeaderContent>
    </PageHeader>
  );
}

