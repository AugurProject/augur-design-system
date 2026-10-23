/**
 * Section overview content (issue #55).
 *
 * The four section overview pages (/foundations, /components,
 * /patterns, /reference) are substantive docs pages: each has a clean
 * `.md` representation and appears in `llms.txt`. Their destinations
 * are never hand-listed — the reading order and page descriptions come
 * from the content collections through this one module, which the
 * rendered pages, the Markdown endpoints, and `llms.txt` all consume.
 *
 * The intro copy is the only authored text here; it is shell content
 * (like the getting-started frontmatter), not a second authoring path
 * for collection content.
 */
import { getCollection } from "astro:content";
import { groupLabel, type DocKind } from "./navigation";

export interface SectionOverview {
  /** The section title; also the page H1 and the sidebar group label. */
  title: string;
  /** One-sentence summary: the lede, meta description, and llms.txt line. */
  description: string;
  /** A short orientation paragraph rendered before the reading order. */
  intro: string;
  /** The section's pages in the maintained reading order. */
  items: (NavLink & { description: string })[];
}

const INTROS: Record<string, { description: string; intro: string }> = {
  foundations: {
    description:
      "The adopted foundations of the Augur interface language — the two type voices, color, themes, and the records that govern them.",
    intro:
      "Start with the type voices and the palette, then see how they compose into themes. The visual direction and brand identity explain what was adopted, from where, and what remains open.",
  },
  components: {
    description:
      "The accessible React components shipped by @augurproject/design-system, documented from their real exports with live examples.",
    intro:
      "Each page documents a real package export: when to use it, its variants and states, accessibility behavior, and API. Examples render what consumers actually receive.",
  },
  patterns: {
    description:
      "Composition patterns that arrange the components into recurring interface answers, from page headers to reference records.",
    intro:
      "Patterns compose the components layer: PageHeader and FormField assemble common arrangements, EmptyState names the empty region, and the reference record realizes the approved compact frame.",
  },
  reference: {
    description:
      "Package entries, component conventions, and contributing guidance for consuming and extending the system.",
    intro:
      "Reference material for consumers and contributors: what the package exports and how to consume it, the conventions every component follows, and how this repository is meant to be worked in.",
  },
};

/** Build one section's overview: authored intro plus collection-derived items. */
export async function getSectionOverview(kind: DocKind): Promise<SectionOverview> {
  const intro = INTROS[kind];
  if (!intro) throw new Error(`No section overview authored for kind: ${kind}`);
  const entries = await getCollection(kind, ({ data }) => !data.draft);
  const ordered = [...entries].sort(
    (a, b) =>
      (a.data.order ?? Number.MAX_SAFE_INTEGER) - (b.data.order ?? Number.MAX_SAFE_INTEGER) ||
      a.data.title.localeCompare(b.data.title),
  );
  return {
    title: groupLabel(kind),
    description: intro.description,
    intro: intro.intro,
    items: ordered.map((entry) => ({
      label: entry.data.title,
      href: `/${kind}/${entry.id}`,
      description: entry.data.description,
    })),
  };
}
