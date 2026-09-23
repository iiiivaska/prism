// @ts-check
// Flat config for the whole workspace: tools/ and web/ TypeScript, type-aware through the
// nearest tsconfig.json of each file (typescript-eslint project service).
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "**/dist/",
    "**/src/generated/",
    // Agent worktrees: a full second copy of this repository inside it. Linting them lints the
    // workspace twice, from files whose tsconfig is not this one, and a leftover one fails `pnpm lint`
    // for a reason that has nothing to do with the tree being reviewed.
    ".claude/worktrees/",
    // The claude.ai/design sync (.design-sync/NOTES.md): its inputs include forks of the converter's
    // own adapters, and its staged scripts and output are machine-made; none of it is workspace code.
    ".design-sync/",
    ".ds-sync/",
    "ds-bundle/",
    ".build/",
    ".swiftpm/",
    "tools/lint/fixtures/",
    "web/apps/gallery/storybook-static/",
    "web/apps/vrt/test-results/",
    "web/apps/vrt/playwright-report/",
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["eslint.config.js", "tools/**/*.ts", "**/*.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["web/packages/*/src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    // Node script whose page.evaluate callbacks run in the browser.
    files: ["docs/direction-board/render.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
