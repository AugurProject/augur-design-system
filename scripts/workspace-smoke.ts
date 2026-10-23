/**
 * Workspace smoke check for the bootstrapped Bun workspace (issue #1).
 *
 * Verifies, from outside the design-system package, that a clean install
 * produces a working workspace link:
 *
 *  1. `@augurproject/design-system` resolves and loads through the workspace.
 *  2. The documented `./styles.css` export resolves to a real file.
 *  3. `apps/docs` can resolve the package through its `workspace:*` dependency.
 *
 * Run with `bun run check:workspace`.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as designSystem from "@augurproject/design-system";

const root = new URL("..", import.meta.url).pathname;

// 1. The public entry module loads through the workspace link.
const entryExports = Object.keys(designSystem);
console.log(
  `entry @augurproject/design-system loaded (public exports: ${entryExports.length === 0 ? "none yet" : entryExports.join(", ")})`,
);

// 2. The documented styles export resolves to a real, non-empty file.
const stylesSpecifier = "@augurproject/design-system/styles.css";
const stylesPath = import.meta.resolve(stylesSpecifier);
if (!stylesPath.startsWith("file:")) {
  throw new Error(`unexpected resolution for ${stylesSpecifier}: ${stylesPath}`);
}
const stylesFile = new URL(stylesPath).pathname;
if (!existsSync(stylesFile)) {
  throw new Error(`${stylesSpecifier} resolved to missing file: ${stylesFile}`);
}
if (readFileSync(stylesFile, "utf8").trim().length === 0) {
  throw new Error(`${stylesFile} exists but is empty`);
}
console.log(`${stylesSpecifier} -> ${stylesFile.replace(root, "")}`);

// 3. The docs app resolves the package through its workspace dependency.
const docsRequire = createRequire(new URL("../apps/docs/package.json", import.meta.url));
const fromDocs = docsRequire.resolve(stylesSpecifier);
if (!existsSync(fromDocs)) {
  throw new Error(`apps/docs cannot resolve ${stylesSpecifier}: ${fromDocs}`);
}
console.log(`apps/docs -> ${stylesSpecifier} resolves via workspace:*`);

console.log("workspace smoke check passed");
