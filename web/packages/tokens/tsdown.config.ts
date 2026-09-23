import { defineConfig } from "tsdown";

// The root export is brand-invariant and imports no React (ADR-0019 §4); `./react` is the optional
// peer's entry; every brand's generated table is its own entry, `brands/<brand>/tokens`
// (ADR-0020 §6). The CSS and the manifest are exported from src/generated as is.
export default defineConfig({
  entry: {
    index: "./src/index.ts",
    react: "./src/react/index.ts",
    "brands/*": "./src/generated/*/tokens.ts",
  },
  // React is an optional peer: never bundled, even though the tests install it as a devDependency.
  deps: { neverBundle: [/^react($|\/)/, /^react-dom($|\/)/] },
  format: "esm",
  platform: "neutral",
  outDir: "dist",
  dts: true,
  // Written out although it is tsdown's default: `dist/` is published whole (`files`), so the build empties
  // it before it writes and never leaves a stale file or a sync conflict copy ("index 2.js") behind. A copy
  // that lands after the build is `release:pack`'s to catch (tools/release/pack.ts, `conflict`).
  clean: true,
});
