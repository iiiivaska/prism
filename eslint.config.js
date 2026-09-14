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
);
