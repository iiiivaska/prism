import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: "esm",
  platform: "neutral",
  outDir: "dist",
  dts: true,
  clean: true,
});
