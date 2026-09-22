import { defineConfig } from "vitest/config";

// The package's Node suite: the Surface and Text tables against their specs, server renders through
// `<Theme>`, the export rules of ADR-0019 rules 8 and 11, the stylesheet test of rule 9 (as ADR-0025 §3
// amends it) and the grain pin. Browser behaviour — computed styles, the equal-width figures, a client
// `<Theme>` — runs in web/apps/gallery under Vitest browser mode.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "dist/**", "spec/**"],
  },
});
