/**
 * Global test setup for the repository test harness (issue #6).
 *
 * - Registers Testing Library's jest-dom matchers on Vitest's `expect`.
 * - Injects the real stylesheets delivered by `@augurproject/design-system` into
 *   the jsdom document, so tests run against the same CSS bytes a
 *   consumer receives through the package's `./styles.css` export.
 */
import "@testing-library/jest-dom/vitest";

import { injectPackageStyles } from "./support/styles";

injectPackageStyles();
