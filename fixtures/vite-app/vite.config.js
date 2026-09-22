import { defineConfig } from "vite";

/**
 * A consumer's Vite config, and nothing Prism-specific in it: the packages are installed from their
 * tarballs and resolved through their own `exports` maps, so Prism needs no alias, no plugin and no
 * transform. `esbuild.jsx` is the app's own choice of the automatic JSX runtime; `base` is relative so
 * the built files serve from any path, which is how `smoke.mjs` serves them.
 */
export default defineConfig({
  base: "./",
  esbuild: { jsx: "automatic" },
  build: { outDir: "dist", emptyOutDir: true },
});
