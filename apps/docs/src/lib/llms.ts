/**
 * llms.txt generation (issue #9).
 *
 * A concise, navigational index for LLM consumers at `/llms.txt`
 * (base-aware: served at `<base>/llms.txt`). It guides retrieval — where
 * authoritative documentation lives — and never restates design rules
 * (ARCHITECTURE.md, "llms.txt"). No speculative llms-full.txt.
 *
 * Single-source discipline: page sections are generated from the same
 * collections that render the site (draft entries excluded, `order` then
 * title), linked directly at their clean `.md` representations; the
 * getting-started entry reuses the shell page's authored frontmatter.
 * When a collection is empty the section says so instead of claiming
 * pages that do not exist.
 *
 * Links are base-aware site-absolute paths (resolvable against this
 * file's URL under both the root and repository-subpath deployments).
 * DESIGN.md / ARCHITECTURE.md / CHANGELOG.md are not served by the docs
 * site; they are linked at their canonical repository locations.
 */
import { getCollection } from "astro:content";
import gettingStartedRaw from "../pages/getting-started.mdx?raw";
import { PROPOSAL_REVIEW } from "./proposal-review";
import { getSectionOverview } from "./sections";
import { withBase } from "./base";
import { mdxPageSource } from "./markdown";

const REPO_URL = "https://github.com/AugurProject/augur-design-system";

type DocKind = "foundations" | "components" | "patterns" | "reference";

/**
 * Markdown links (to the `.md` representation) for one section: the
 * section overview first (#55), then the collection pages in the
 * maintained reading order (`order` then title, draft excluded).
 */
async function kindLinks(kind: DocKind): Promise<string[]> {
  const overview = await getSectionOverview(kind);
  const entries = await getCollection(kind, ({ data }) => !data.draft);
  const ordered = [...entries].sort(
    (a, b) =>
      (a.data.order ?? Number.MAX_SAFE_INTEGER) - (b.data.order ?? Number.MAX_SAFE_INTEGER) ||
      a.data.title.localeCompare(b.data.title),
  );
  return [
    `- [${overview.title} overview](${withBase(`/${kind}.md`)}): ${overview.description}`,
    ...ordered.map(
      (entry) =>
        `- [${entry.data.title}](${withBase(`/${kind}/${entry.id}.md`)}): ${entry.data.description}`,
    ),
  ];
}

function section(heading: string, lines: string[]): string[] {
  return ["", `## ${heading}`, "", ...lines];
}

/** Build the full llms.txt document. */
export async function buildLlmsTxt(): Promise<string> {
  const [foundations, components, patterns, reference] = await Promise.all([
    kindLinks("foundations"),
    kindLinks("components"),
    kindLinks("patterns"),
    kindLinks("reference"),
  ]);

  const gettingStarted = mdxPageSource(gettingStartedRaw, "getting-started");

  const lines: string[] = [];

  lines.push("# Augur Design System", "");
  lines.push(
    "> Documentation for the Augur Design System — a shared interface language for Augur products: " +
      "maintained design guidance, generated tokens, semantic light/dark themes, and reusable React " +
      "components. Every substantive documentation page has a clean Markdown representation: append " +
      "`.md` to the page's URL (all links below already point at the `.md` forms). Links are " +
      "site-absolute paths; resolve them against this file's origin. `DESIGN.md` in the repository is " +
      "canonical for adopted design values; this site documents and demonstrates them.",
  );

  lines.push(...section("Documentation", [
    `- [${gettingStarted.title}](${withBase("/getting-started.md")}): ${gettingStarted.description}`,
    `- [${PROPOSAL_REVIEW.title}](${withBase("/proposal-review.md")}): ${PROPOSAL_REVIEW.description}`,
  ]));

  lines.push(...section("Foundations", foundations));

  lines.push(
    ...section(
      "Components",
      components.length > 0
        ? components
        : [
            "No component pages are published yet. Component documentation arrives with the starter " +
              `components and will live under ${withBase("/components/<slug>.md")} (and the same URL ` +
              "without `.md` for the rendered page).",
          ],
    ),
  );

  lines.push(
    ...section(
      "Patterns",
      patterns.length > 0
        ? patterns
        : [
            `No pattern pages are published yet. Pattern pages will live under ${withBase("/patterns/<slug>.md")}.`,
          ],
    ),
  );

  // #55: the reference group heading matches the sidebar/overview label.
  lines.push(...section("Reference", reference));

  lines.push(...section("Design authority and changes", [
    `- [DESIGN.md](${REPO_URL}/blob/main/DESIGN.md): canonical adopted design values (Google design.md ` +
      "format); generated tokens and theme output are build artifacts of it, never independent sources.",
    `- [ARCHITECTURE.md](${REPO_URL}/blob/main/ARCHITECTURE.md): repository structure, boundaries, and the ` +
      "documentation delivery contract (rendered pages plus clean Markdown for every substantive page).",
    `- [CHANGELOG.md](${REPO_URL}/blob/main/CHANGELOG.md): package and documentation changes; migration ` +
      "guidance accompanies versioned releases.",
    `- [Repository](${REPO_URL}): source of truth for the package and this documentation.`,
  ]));

  return `${lines.join("\n")}\n`;
}
