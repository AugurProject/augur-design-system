/**
 * Signal glyph contract (`packages/design-system/src/icons/`).
 *
 * Every glyph shares one drawing contract, documented on the Icons
 * foundation page: a 20×20 grid, one 1.75 stroke in `currentColor`, no
 * fill, square caps and mitred joins, and a single path with no
 * transforms or embedded title. Each file also has a matching public
 * `./icons/<name>.svg` export, so a glyph cannot ship unexported or be
 * exported without a file.
 *
 * Failure path: setting `stroke-linecap="round"` on any glyph, adding a
 * second shape, or deleting an export entry fails this suite.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/** Vitest runs from the repo root (see vitest.config.ts). */
const packageDir = resolve(process.cwd(), "packages/design-system");
const iconsDir = resolve(packageDir, "src/icons");
const pkg = JSON.parse(readFileSync(resolve(packageDir, "package.json"), "utf8")) as {
  exports: Record<string, string>;
};
/** Node resolver anchored at the package, so glyphs are read through their public export. */
const requireFromPackage = createRequire(resolve(packageDir, "package.json"));

const files = readdirSync(iconsDir).filter((file) => file.endsWith(".svg")).sort();

const ROOT_ATTRIBUTES: Record<string, string> = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.75",
  "stroke-linecap": "square",
  "stroke-linejoin": "miter",
};

describe("signal glyphs", () => {
  test("the set is the six approved glyphs", () => {
    expect(files).toEqual([
      "arrow-right.svg",
      "arrow-up-right.svg",
      "check.svg",
      "chevron-down.svg",
      "plus.svg",
      "x.svg",
    ]);
  });

  test("each file has a matching public export, and each icon export has a file", () => {
    const iconExports = Object.entries(pkg.exports).filter(([key]) => key.startsWith("./icons/"));
    expect(iconExports.map(([key]) => key).sort()).toEqual(files.map((file) => `./icons/${file}`));
    for (const [key, target] of iconExports) {
      expect(target).toBe(`./src/icons/${key.slice("./icons/".length)}`);
    }
  });

  for (const file of files) {
    test(`${file} follows the drawing contract`, () => {
      const source = readFileSync(requireFromPackage.resolve(`@augurproject/design-system/icons/${file}`), "utf8");
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      const svg = doc.documentElement;

      expect(svg.nodeName).toBe("svg");
      expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
      expect(
        Object.fromEntries([...svg.attributes].map((attribute) => [attribute.name, attribute.value])),
      ).toEqual(ROOT_ATTRIBUTES);

      const children = [...svg.children];
      expect(children.map((child) => child.nodeName)).toEqual(["path"]);
      const [path] = children;
      expect([...path.attributes].map((attribute) => attribute.name)).toEqual(["d"]);
      expect(path.getAttribute("d")).toMatch(/^[MmLlHhVvZz0-9.,\s-]+$/);
    });
  }
});
