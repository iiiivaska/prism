import { defineConfig } from "tsdown";

// The JavaScript half of the package; `pnpm build` then compiles dist/styles.css
// (scripts/build-styles.ts) and copies the contracts into spec/ (scripts/copy-spec.ts).
// React, React Aria, Phosphor and the tokens runtime are the app's: never bundled, so `<Theme>` and the
// components share one module instance of `@iiiivaska/prism-tokens/react` (ADR-0019 §4).
export default defineConfig({
  entry: ["./src/index.ts"],
  deps: {
    neverBundle: [/^react($|\/)/, /^react-dom($|\/)/, /^react-aria-components($|\/)/, /^@phosphor-icons\/react($|\/)/, /^@iiiivaska\/prism-tokens($|\/)/],
  },
  format: "esm",
  platform: "neutral",
  outDir: "dist",
  dts: true,
  clean: true,
});
