/**
 * Vitest configuration for the repository-level test harness (issue #6).
 *
 * Scope: React behavior and accessibility tests under `tests/`, run in
 * jsdom against the real `@augurproject/design-system` workspace package.
 * Browser-level behavior stays out of scope until issue #15 (Playwright).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
