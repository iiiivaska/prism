import { defineConfig } from "tsdown";

// The root export is brand-invariant (ADR-0019 §4); every brand's generated table is its own entry,
// `brands/<brand>/tokens` (ADR-0020 §6). The CSS and the manifest are exported from src/generated as is.
export default defineConfig({
  entry: {
    index: "./src/index.ts",
    "brands/*": "./src/generated/*/tokens.ts",
  },
  format: "esm",
  platform: "neutral",
  outDir: "dist",
  dts: true,
  clean: true,
});
