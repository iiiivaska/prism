/// <reference types="node" />
/**
 * The showcase is an ordinary Vite app: it consumes `@iiiivaska/prism-tokens` and
 * `@iiiivaska/prism-react` from the workspace through their published `exports` maps — no alias and
 * no path into a package's source tree — exactly as `fixtures/vite-app` consumes the tarballs.
 *
 * Two plugins exist only so the app enumerates the system instead of listing it by hand
 * (docs/showcase.md §1); both read the repository at build time and neither ships a list:
 *
 *  - `prismCatalog()` — the specs and the web implementation manifest, and the missing-harness gate.
 *  - `prismGlyphs()` — the icon registry's Phosphor binding, drawn from `@phosphor-icons/core`.
 *
 * The token catalogue needs no plugin at all: `@iiiivaska/prism-tokens/manifest.json` is a published
 * export, so the app imports it like any other module.
 *
 * `base` is relative so `dist/` serves from any path — a folder, a static host, `file:`.
 * `esbuild.jsx` is the app's own choice of the automatic JSX runtime, as the consumer fixture makes it.
 * `MISSING_EXPORT` is an error rather than a warning, so the harness gate of `prismCatalog()` cannot
 * be bypassed by a renderer that exists under another name.
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { prismCatalog } from "./plugins/catalog.ts";
import { prismGlyphs } from "./plugins/glyphs.ts";

const appRoot = import.meta.dirname;
const repositoryRoot = resolve(appRoot, "..", "..", "..");

export default defineConfig({
  base: "./",
  plugins: [prismCatalog({ repositoryRoot, appRoot }), prismGlyphs({ repositoryRoot })],
  esbuild: { jsx: "automatic" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === "MISSING_EXPORT") throw new Error(warning.message);
        defaultHandler(warning);
      },
    },
  },
});
