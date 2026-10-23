import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@augurproject/design-system";

function TrayGlyph() {
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
      <path d="M3 11.5V15a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 15v-3.5" />
      <path d="M3 11.5 5.5 4h9l2.5 7.5" strokeLinejoin="round" />
      <path d="M3 11.5h4.5a2.5 2.5 0 0 0 5 0H17" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyStateLongContentExample() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <TrayGlyph />
      </EmptyStateIcon>
      <EmptyStateTitle headingLevel={3}>Your inbox is clear</EmptyStateTitle>
      <EmptyStateDescription>
        Alerts appear here when an instrument in one of your watchlists crosses a
        threshold you have set, when a reconciliation break is assigned to you, or when
        a scheduled report finishes running and is ready to review.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button>Set an alert</Button>
      </EmptyStateActions>
    </EmptyState>
  );
}
