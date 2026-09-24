/// <reference types="node" />
import { join } from "node:path";
import { pathToFileURL } from "node:url";
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
 *   half), Surface's glass fallback from a real `matchMedia` (ADR-0022 rule 1), the glass chip shape
 *   resolving again whenever an input it reads changes (ADR-0036 §7), Text's computed `font-synthesis`
 *   and the equal-width figures (ADR-0021 rules 5 and 8), and the role and accessible name of every spec
 *   example as Chromium's own accessibility tree has them (test/accessibility.tsx);
 * - `node`: the generated stories against the specs.
 *
 * Every project renders `@iiiivaska/prism-react` from its source, not from its last build
 * (`prismReactSource` below), so a suite can only be green about code that is in the tree.
 *
 * Browsers come from Playwright's own cache or PLAYWRIGHT_BROWSERS_PATH; CI installs Chromium first.
 */

const reactPackage = join(import.meta.dirname, "..", "..", "packages", "react");
const reactEntry = join(reactPackage, "src", "index.ts");
const reactStyles = join(reactPackage, "src", "styles.css");

/**
 * The gallery's runtime dependency is the published package, which resolves to `dist/` — what ships,
 * and what `storybook build` renders (.storybook/main.ts). For a test run that is the wrong thing to
 * read: a suite over `dist/` is green about the last build, so a change reverted in `src` leaves it
 * green and the suite stops being evidence about the code under review.
 *
 * So the tests resolve the package to its source: `@iiiivaska/prism-react` to `src/index.ts` (the
 * alias below, anchored so the subpath exports are untouched) and `@iiiivaska/prism-react/styles.css`
 * to `src/styles.css` compiled here exactly as `scripts/build-styles.ts` compiles it for `dist`, since
 * the source entry is a Tailwind entry (`@variant ds-pointer`) that a browser cannot read. Nothing in
 * the gallery's own sources changes, and no build has to run first.
 */
function prismReactSource(): Plugin {
  let styles: Promise<string> | null = null;
  return {
    name: "prism:react-source",
    enforce: "pre",
    resolveId(id) {
      return id === "@iiiivaska/prism-react/styles.css" ? reactStyles : null;
    },
    load(id) {
      if (id !== reactStyles) return null;
      styles ??= import(pathToFileURL(join(reactPackage, "scripts", "build-styles.ts")).href).then((module: { buildStyles: () => Promise<string> }) => module.buildStyles());
      return styles;
    },
  };
}

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
  plugins: [prismReactSource()],
  resolve: { alias: [{ find: /^@iiiivaska\/prism-react$/u, replacement: reactEntry }] },
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: join(import.meta.dirname, ".storybook") }), decodeStoryTestGuard(), prismReactSource()],
        test: { name: "storybook", browser: chromium() },
      },
      {
        extends: true,
        // test/accessibility.browser.test.tsx mounts the generated stories, and a story with an action prop
        // imports `fn` from storybook/test. Found only when that file loads, the dependency would be optimized
        // mid-run, and Vite's reload fails the file on a cold cache, which is every CI run.
        optimizeDeps: { include: ["storybook/test"] },
        test: { name: "browser", include: ["test/**/*.browser.test.tsx"], browser: chromium() },
      },
      {
        extends: true,
        test: { name: "node", include: ["test/**/*.test.ts"], environment: "node" },
      },
    ],
  },
});
