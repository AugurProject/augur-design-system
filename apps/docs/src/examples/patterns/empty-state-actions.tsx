import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@augurproject/design-system";

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateActionsExample() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <SearchGlyph />
      </EmptyStateIcon>
      <EmptyStateTitle>No saved queries yet</EmptyStateTitle>
      <EmptyStateDescription>Save a query to rerun it later.</EmptyStateDescription>
      <EmptyStateActions>
        <Button>New query</Button>
        <Button variant="outline">View docs</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}
