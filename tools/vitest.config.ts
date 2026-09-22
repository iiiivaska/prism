import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "lint/fixtures/**"],
    // These are build-heavy integration tests: one case can resolve every permutation of a fixture
    // resolver twice (tokens/diff) or build the whole repository (repo.test.ts). Vitest's 5 s default
    // fits unit tests, not a token build, and a slower CI runner then fails for the runner and not for
    // the code. The budget is per test, so a genuine hang still ends the run.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
