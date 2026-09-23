import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: "esm",
  platform: "neutral",
  outDir: "dist",
  dts: true,
  // Written out although it is tsdown's default: `dist/` is published whole (`files`), so the build empties
  // it before it writes and never leaves a stale file or a sync conflict copy ("index 2.js") behind. A copy
  // that lands after the build is `release:pack`'s to catch (tools/release/pack.ts, `conflict`).
  clean: true,
});
