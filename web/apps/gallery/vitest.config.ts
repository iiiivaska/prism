/// <reference types="node" />
import { join } from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * `pnpm test` in the gallery, three projects:
 *
 * - `storybook`: every story as a Vitest browser-mode test in Playwright Chromium, with the a11y addon's
 *   axe run failing the test on any violation (`parameters.a11y.test = "error"`, .storybook/preview.tsx);
 * - `browser`: the behaviour the Node suites cannot see — a client `<Theme>` (ADR-0019 rule 7's client
 *   half), Surface's glass fallback from a real `matchMedia` (ADR-0022 rule 1), Text's computed
 *   `font-synthesis` and the equal-width figures (ADR-0021 rules 5 and 8);
 * - `node`: the generated stories against the specs.
 *
 * Browsers come from Playwright's own cache or PLAYWRIGHT_BROWSERS_PATH; CI installs Chromium first.
 */
/**
 * Storybook 10.6's story-test guard asks whether `import.meta.url` includes Vitest's file path, but the URL
 * is percent-encoded and the path is not, so in a checkout under a non-ASCII directory (the owner's is)
 * no story registers a test and every story file fails with "No test suite found". This decodes the URL
 * inside that one expression; CI's ASCII paths are unaffected either way.
 */
function decodeStoryTestGuard(): Plugin {
  return {
    name: "prism:decode-story-test-guard",
    enforce: "post",
    transform(code, id) {
      if (!id.endsWith(".stories.tsx") || !code.includes("convertToFilePath(import.meta.url)")) return null;
      return { code: code.replaceAll("convertToFilePath(import.meta.url)", "convertToFilePath(decodeURI(import.meta.url))"), map: null };
    },
  };
}

/** Chromium in Playwright, headless; a fresh object per project, because Vitest names the instances in place. */
function chromium() {
  return {
    enabled: true,
    headless: true,
    provider: playwright(),
    instances: [{ browser: "chromium" as const }],
  };
}

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: join(import.meta.dirname, ".storybook") }), decodeStoryTestGuard()],
        test: { name: "storybook", browser: chromium() },
      },
      {
        extends: true,
        test: { name: "browser", include: ["test/**/*.browser.test.tsx"], browser: chromium() },
      },
      {
        extends: true,
        test: { name: "node", include: ["test/**/*.test.ts"], environment: "node" },
      },
    ],
  },
});
