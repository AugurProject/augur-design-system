import { AUGUR_FONTS } from "@augurproject/design-system";

/**
 * Read font provenance from the package: family, version, license, and
 * delivered weights, without reading node_modules.
 */
export function FontProvenanceExample() {
  return (
    <dl style={{ display: "grid", gap: "var(--augur-spacing-md)", margin: 0 }}>
      {AUGUR_FONTS.map((font) => (
        <div key={font.family}>
          <dt className="augur-type-control">{font.family}</dt>
          <dd className="augur-type-metadata" style={{ margin: 0, color: "var(--muted-foreground)" }}>
            <code>{font.package}</code> · v{font.version} · {font.license} · weights{" "}
            {font.weights.join("/")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
