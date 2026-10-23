/**
 * Documentation content schema (issue #8).
 *
 * The single content location is `src/content/<kind>/` — see
 * `src/content/README.md` for the full convention.
 *
 * Four documented kinds, each one collection with stable routes:
 *
 *   foundations/<slug>.md(x) → /foundations/<slug>
 *   components/<slug>.md(x)  → /components/<slug>
 *   patterns/<slug>.md(x)    → /patterns/<slug>
 *   reference/<slug>.md(x)   → /reference/<slug>
 *
 * The file name (minus extension) is the route slug: flat, lowercase,
 * kebab-case. Metadata is validated by zod at sync/build time, so a
 * missing required field fails the build with a clear message
 * (deliberate fixtures: `fixtures/verify-content-failures.mjs`).
 *
 * Component pages additionally enforce the required body sections
 * ("When to use", "When not to use", "Variants", "Sizes", "States",
 * "Accessibility", "API", "Design rationale") — see
 * `src/lib/component-sections.ts`, enforced by the page renderer.
 */
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/** Metadata shared by every documentation entry, regardless of kind. */
const baseSchema = z.object({
  /** Page title; the renderer and the Markdown endpoint synthesize the H1 from it. Bodies must not repeat it. */
  title: z.string().trim().min(1, "title is required and must not be blank"),
  /** One-sentence summary used as the HTML meta description and the rendered page lede. */
  description: z.string().trim().min(1, "description is required and must not be blank"),
  /** Optional sort key for future nav/index generation; pages render regardless. */
  order: z.number().int().nonnegative().optional(),
  /** Draft entries are validated but excluded from routes. */
  draft: z.boolean().default(false),
});

const foundations = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/foundations" }),
  schema: baseSchema,
});

const reference = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/reference" }),
  schema: baseSchema,
});

const patterns = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/patterns" }),
  schema: baseSchema.extend({
    /** Slugs of component pages the pattern composes, e.g. ["button"]. */
    components: z.array(z.string()).default([]),
  }),
});

const components = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./src/content/components" }),
  schema: baseSchema.extend({
    /** Public export name from @augurproject/design-system, e.g. "Button". */
    component: z
      .string()
      .trim()
      .min(1, "component is required: the public export name from @augurproject/design-system")
      .regex(/^[A-Z][A-Za-z0-9]*$/, 'component must be the PascalCase export name, e.g. "Button"'),
    /** Delivery status of the component. "planned" pages document the contract before implementation exists. */
    status: z.enum(["planned", "draft", "stable", "deprecated"]).default("planned"),
    /** shadcn registry item id once published through the registry (#16/#17). */
    registry: z.string().trim().min(1).optional(),
  }),
});

export const collections = { foundations, components, patterns, reference };
