import { beforeEach, describe, expect, it } from "vitest";
import { brandTokens, clearBrandTokens, peekBrandTokens, setBrandTokens, type BrandTokens } from "../src/index.ts";
import * as prism from "../src/generated/prism/tokens.ts";
import * as prismNative from "../src/generated/prism-native/tokens.ts";

/** `process.env` without Node's types: the runtime reads it off `globalThis` the same way. */
function setNodeEnv(value: string | undefined): void {
  const scope = globalThis as { process?: { env?: Record<string, string | undefined> } };
  if (scope.process?.env === undefined) return;
  if (value === undefined) delete scope.process.env["NODE_ENV"];
  else scope.process.env["NODE_ENV"] = value;
}

beforeEach(() => {
  clearBrandTokens();
});

describe("the brand table API (ADR-0020 §6)", () => {
  it("fails when no table was handed over, naming the call that fixes it", () => {
    expect(peekBrandTokens()).toBeUndefined();
    expect(() => brandTokens()).toThrowError(/setBrandTokens/);
  });

  it("never falls back to another brand", () => {
    // There is no default table to fall back to: the only way to get one is to hand it over.
    expect(() => brandTokens()).toThrow();
  });

  it("accepts a generated brand module as it is", () => {
    setBrandTokens(prism);
    expect(brandTokens()).toBe(prism);
    expect(peekBrandTokens()).toBe(prism);
  });

  it("gives back the module's own resolveTokens, so values follow the loaded stylesheet", () => {
    setBrandTokens(prismNative);
    const tokens = brandTokens<typeof prismNative>();
    const light = tokens.resolveTokens({ colorScheme: "light" });
    const dark = tokens.resolveTokens({ colorScheme: "dark" });
    expect(light["color.bg.page"]).not.toEqual(dark["color.bg.page"]);
    expect(tokens.table["color.bg.page"].$cssVar).toBe("--ds-color-bg-page");
  });

  it("is idempotent for the same table", () => {
    setBrandTokens(prism);
    expect(() => setBrandTokens(prism)).not.toThrow();
    expect(brandTokens()).toBe(prism);
  });

  it("rejects a second, different table in development (one brand per document)", () => {
    setBrandTokens(prism);
    expect(() => setBrandTokens(prismNative)).toThrowError(/one brand/);
    expect(brandTokens()).toBe(prism);
  });

  it("replaces instead of throwing in production", () => {
    const before = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
      "NODE_ENV"
    ];
    setNodeEnv("production");
    try {
      setBrandTokens(prism);
      setBrandTokens(prismNative);
      expect(brandTokens()).toBe(prismNative);
    } finally {
      setNodeEnv(before);
    }
  });

  it("types every brand module as BrandTokens", () => {
    const tables: BrandTokens[] = [prism, prismNative];
    for (const table of tables) {
      setBrandTokens(table);
      expect(brandTokens()).toBe(table);
      clearBrandTokens();
    }
  });
});
