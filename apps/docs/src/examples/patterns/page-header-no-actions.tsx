import {
  Button,
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@augurproject/design-system";

export function PageHeaderNoActionsExample() {
  return (
    <PageHeader>
      <Button variant="ghost" size="sm">
        ← Back to accounts
      </Button>
      <PageHeaderContent>
        <PageHeaderTitle headingLevel={2}>Account settings</PageHeaderTitle>
        <PageHeaderDescription>
          Preferences for this account. Changes apply immediately.
        </PageHeaderDescription>
      </PageHeaderContent>
    </PageHeader>
  );
}
