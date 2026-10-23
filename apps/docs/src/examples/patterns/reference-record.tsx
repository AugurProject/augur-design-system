/** Static frame C evidence. No live query, selection, or submission workflow. */
import { Button } from "@augurproject/design-system";
import "./reference-record.css";

/**
 * One static record panel. The optional pinned theme is used by the paired
 * specimen; an applied page leaves it unset and inherits its host theme.
 * When the host page's primary action carries the view's green signal, the
 * record's state rule steps down to `signal="quiet"`.
 */
export function ReferenceRecordPanel(props: {
  theme?: "light" | "dark";
  signal?: "primary" | "quiet";
  headingLevel?: 2 | 3;
}) {
  const Heading = props.headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="example-record-panel" data-theme={props.theme}>
      <div className="example-record-state">
        <span className="example-record-signal" data-signal={props.signal ?? "primary"} aria-hidden="true" />
        <span className="augur-type-editorial-label">Open query</span>
        <span className="augur-type-metadata example-record-id">LQ-042</span>
      </div>
      <Heading className="augur-type-heading-2 example-record-question">
        Did the proposal pass before 30 June?
      </Heading>
      <div className="example-record-choices" aria-label="Illustrative choices; submission unavailable">
        <Button variant="outline" aria-disabled="true">Yes</Button>
        <Button variant="outline" aria-disabled="true">No</Button>
      </div>
      <dl className="example-record-details augur-type-body">
        <div><dt>Status</dt><dd>Open</dd></div>
        <div className="example-record-response"><dt>Response</dt><dd>Not submitted</dd></div>
        <div><dt>Closes</dt><dd><time>14:32 UTC</time></dd></div>
      </dl>
    </div>
  );
}

export function ReferenceRecordExample() {
  return (
    <div className="example-record-field">
      <ReferenceRecordPanel theme="light" />
      <ReferenceRecordPanel theme="dark" />
    </div>
  );
}
