import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@augurproject/design-system";

function ArchiveGlyph() {
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
      <rect x="3" y="4" width="14" height="4" rx="1" />
      <path d="M4.5 8v6.5A1.5 1.5 0 0 0 6 16h8a1.5 1.5 0 0 0 1.5-1.5V8" />
      <path d="M8 11h4" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyStateNoActionExample() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <ArchiveGlyph />
      </EmptyStateIcon>
      <EmptyStateTitle>Nothing archived</EmptyStateTitle>
      <EmptyStateDescription>Archived queries will appear here.</EmptyStateDescription>
    </EmptyState>
  );
}
