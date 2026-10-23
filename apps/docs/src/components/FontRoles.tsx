/**
 * Typography specimen for the fonts page (contract frame B).
 *
 * The dominant display field is the page's sole large tonal field
 * (inverse Navy/Paper swap across themes); the role comparison is an
 * aligned, compact two-column row list — every sample renders through
 * its real package role class, so displayed specs cannot disagree with
 * computed styles. The three rule-led notes sit in the support column
 * and stack below the specimen on narrow screens.
 */
import { AUGUR_FONTS, AUGUR_FONT_FAMILIES } from "@augurproject/design-system";

const ROLES: readonly { className: string; label: string; sample: string; spec: string }[] = [
  { className: "augur-type-display", label: "display", sample: "Make it clear.", spec: "Sora 600 · 40/44 · −0.01em" },
  { className: "augur-type-heading-1", label: "heading-1", sample: "Record the decision", spec: "Sora 600 · 28/34 · −0.005em" },
  { className: "augur-type-heading-2", label: "heading-2", sample: "Keep the record scannable", spec: "Sora 600 · 20/26" },
  {
    className: "augur-type-body",
    label: "body",
    sample: "Body copy carries explanation and context in the supporting voice.",
    spec: "Schibsted Grotesk 400 · 16/24",
  },
  { className: "augur-type-control", label: "control", sample: "Record your response", spec: "Sora 600 · 14/20" },
  { className: "augur-type-ui", label: "ui", sample: "Filter: open queries", spec: "Sora 400 · 14/20" },
  { className: "augur-type-metadata", label: "metadata", sample: "Final · 14 responses · updated 2h ago", spec: "Schibsted Grotesk 400 · 12/16" },
  { className: "augur-type-editorial-title", label: "editorial-title", sample: "Make what matters clear.", spec: "Sora 400 · 40/48 · −0.01em · 32/40 below 600px" },
  { className: "augur-type-editorial-section", label: "editorial-section", sample: "A quieter title", spec: "Sora 400 · 28/34 · −0.005em · 24/32 below 600px" },
  { className: "augur-type-editorial-label", label: "editorial-label", sample: "Open query", spec: "Schibsted Grotesk 400 · 12/16 · +0.12em, uppercase" },
] as const;

export function FontRoles() {
  return (
    <div className="font-demo">
      <div className="type-specimen-grid">
        <div className="type-specimen-main">
          {/* The sole large tonal field: inverse Navy/Paper, swapped by
              the theme contract (fixture frame B). */}
          <div className="type-display-field">
            <span className="augur-type-editorial-label">Sora / Display</span>
            {/* The role class carries every value; no local copies. */}
            <div className="type-display-sample augur-type-display">
              Make it clear.
              <br />
              Remove the noise.
            </div>
            <span className="augur-type-metadata type-spec-meta">Sora 600 · 40/44 · −0.01em</span>
          </div>

          {/* Compact, aligned role comparison: sample + exact spec. */}
          <div className="type-compare">
            {ROLES.map((role) => (
              <div key={role.className} className="type-compare-row">
                <div className="type-compare-sample">
                  {/* Samples are <div>s: prose line-height must not
                      distort the demonstrated role values. */}
                  <div className={role.className}>{role.sample}</div>
                </div>
                <span className="augur-type-metadata type-compare-spec">
                  <span className="augur-type-editorial-label type-compare-label">{role.label}</span>
                  {role.spec}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="type-specimen-notes" aria-label="Typeface roles">
          <div>
            <h3 className="augur-type-editorial-section">The primary voice</h3>
            <p className="augur-type-body">
              Sora gives identity, headings, navigation, and actions a precise voice.
            </p>
          </div>
          <div>
            <h3 className="augur-type-editorial-section">The supporting voice</h3>
            <p className="augur-type-body">
              Schibsted Grotesk carries paragraphs, helper text, metadata, and dense records.
            </p>
          </div>
          <div>
            <h3 className="augur-type-editorial-section">One clear priority</h3>
            <p className="augur-type-body">
              Alignment, space, and quiet rules reveal the reading order.
            </p>
          </div>
        </aside>
      </div>

      <div className="font-demo-consumption">
        <p className="augur-type-metadata font-demo-role-label">
          Stack applied from the imported <code>AUGUR_FONT_FAMILIES</code> constant (primary voice)
        </p>
        <p className="font-demo-stack" style={{ fontFamily: AUGUR_FONT_FAMILIES.primary }}>
          Sora applied at runtime from the package export
        </p>
        <p className="augur-type-metadata font-demo-role-label">
          Secondary voice, same mechanism
        </p>
        <p className="font-demo-stack" style={{ fontFamily: AUGUR_FONT_FAMILIES.secondary }}>
          Schibsted Grotesk applied at runtime from the package export
        </p>
      </div>

      {/* Keyboard focus enables horizontal scrolling without a pointer. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <section className="font-provenance-scroll" aria-label="Font provenance table" tabIndex={0}>
      <table className="font-demo-provenance">
        <caption className="augur-type-metadata font-demo-role-label">
          Delivered families from the imported <code>AUGUR_FONTS</code> provenance export
        </caption>
        <thead>
          <tr>
            <th scope="col">Family</th>
            <th scope="col">Package</th>
            <th scope="col">Version</th>
            <th scope="col">License</th>
            <th scope="col">Weights</th>
          </tr>
        </thead>
        <tbody>
          {AUGUR_FONTS.map((font) => (
            <tr key={font.family}>
              <td>{font.family}</td>
              <td>
                <code>{font.package}</code>
              </td>
              <td>{font.version}</td>
              <td>{font.license}</td>
              <td>{font.weights.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </section>
    </div>
  );
}
