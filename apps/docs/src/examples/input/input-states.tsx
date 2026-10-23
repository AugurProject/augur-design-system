import { useId } from "react";
import { Input } from "@augurproject/design-system";

// Input leaves labeling and error text to you; FormField wires the same parts.
const field = { display: "flex", flexDirection: "column", gap: "var(--augur-spacing-sm)" } as const;

export function InputStatesExample() {
  const id = useId();
  return (
    <>
      <div style={field}>
        <label htmlFor={`${id}-name`} className="augur-type-control">
          Query name
        </label>
        <Input id={`${id}-name`} placeholder="Q3 records review" />
      </div>
      <div style={field}>
        <label htmlFor={`${id}-record`} className="augur-type-control">
          Record id (read-only)
        </label>
        <Input id={`${id}-record`} readOnly value="REC-0417" />
      </div>
      <div style={field}>
        <label htmlFor={`${id}-archived`} className="augur-type-control">
          Archived field
        </label>
        <Input id={`${id}-archived`} disabled placeholder="Not editable" />
      </div>
      <div style={field}>
        <label htmlFor={`${id}-deadline`} className="augur-type-control">
          Review deadline
        </label>
        <Input
          id={`${id}-deadline`}
          invalid
          defaultValue="2023-13-45"
          aria-describedby={`${id}-deadline-error`}
        />
        <p
          id={`${id}-deadline-error`}
          className="augur-type-metadata"
          style={{ margin: 0, color: "var(--destructive)" }}
        >
          Enter a date in YYYY-MM-DD format.
        </p>
      </div>
    </>
  );
}
