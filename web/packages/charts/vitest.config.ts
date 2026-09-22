import { defineConfig } from "vitest/config";

// The package's Node suite. The charts themselves arrive with data-viz wave 1 (roadmap Phase 4);
// until then this is the package-layout check of critic C-14's second half, which is exactly the
// kind of claim that has to be pinned while the package is still empty.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "dist/**"],
  },
});
