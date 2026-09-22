import { availableParallelism } from "node:os";
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
    // Most token and spec files build the repository's whole dictionary, and Vitest's default is one
    // worker per core but one. On an 18-core Mac that is seventeen full builds at once; with another
    // checkout building beside them (load average 18), fourteen files failed on the 120 s budget above,
    // and the same fourteen passed with three workers. So the pool is capped at three: the budget then
    // measures the code again, and a 4-vCPU CI runner, whose default is already three, is unchanged.
    maxWorkers: Math.max(1, Math.min(3, availableParallelism() - 1)),
  },
});
