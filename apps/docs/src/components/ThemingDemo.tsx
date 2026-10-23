/**
 * Live theming demonstration for the docs: a true paired
 * record — one light panel and one dark panel, identical content, order,
 * and geometry, under EITHER host theme.
 *
 * Both panels pin `data-theme` explicitly (light / dark), so the pair
 * never collapses into one theme when the host page changes. The panels
 * are plain elements styled only with the semantic role custom
 * properties delivered by `@augurproject/design-system/styles.css`; the paint
 * always follows the resolved role, never a local color value. The
 * scoping mechanism itself (inherit vs pin) is demonstrated separately
 * by the scoped-subtree example on this page.
 */

const SWATCHES: readonly { token: string; label: string }[] = [
  { token: "--background", label: "canvas" },
  { token: "--card", label: "raised panel" },
  { token: "--primary", label: "primary action" },
  { token: "--muted", label: "quiet region" },
  { token: "--border", label: "hairline rule" },
  { token: "--ring", label: "focus ring" },
];

function SwatchRow() {
  return (
    <ul className="theme-swatch-row" aria-label="Semantic color roles in this record">
      {SWATCHES.map((swatch) => (
        <li key={swatch.token} className="theme-swatch">
          {/* The inline custom property reference IS the demonstration:
              the paint follows the role, never a local color value. */}
          <span className="theme-swatch-chip" style={{ backgroundColor: `var(${swatch.token})` }} aria-hidden="true" />
          <span className="augur-type-metadata">{swatch.label}</span>
          <code className="augur-type-metadata">{swatch.token}</code>
        </li>
      ))}
    </ul>
  );
}

function ThemeRecord(props: { theme: "light" | "dark"; title: string }) {
  return (
    <div className="theme-demo-panel" data-theme={props.theme}>
      <p className="augur-type-ui theme-demo-title">{props.title}</p>
      <p className="augur-type-body">
        The same content, order, and geometry as its pair — only the
        resolved roles differ.
      </p>
      <SwatchRow />
    </div>
  );
}

export function ThemingDemo() {
  return (
    <div className="theme-demo">
      <ThemeRecord theme="light" title={'Pinned light: data-theme="light"'} />
      <ThemeRecord theme="dark" title={'Pinned dark: data-theme="dark"'} />
    </div>
  );
}
