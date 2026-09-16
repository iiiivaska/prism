import { describe, expect, it } from "vitest";
import { defaultContext, platformDefaults, rootAttributes, scope, webRuntime } from "../src/index.ts";
import type { TokenContext } from "../src/index.ts";
import { AXES, CONTRACT, DEFAULT_CONTEXT, INVALID_VALUES } from "./contract.ts";

describe("the generated table is ADR-0019 §1", () => {
  it("has the six axes with their attributes, values, nesting and media fallbacks", () => {
    expect(webRuntime).toEqual(CONTRACT);
  });

  it("carries the resolver default as the web root context", () => {
    expect(defaultContext).toEqual(DEFAULT_CONTEXT);
  });

  it("starts every axis at its first listed value", () => {
    for (const axis of AXES) expect(CONTRACT[axis].values[0]).toBe(DEFAULT_CONTEXT[axis]);
  });

  it("holds the per-platform defaults of ADR-0019 §2", () => {
    expect(platformDefaults).toEqual({
      web: { density: "compact", modality: "pointer" },
      ios: { density: "regular", modality: "touch" },
      ipados: { density: "regular", modality: "touch" },
      macos: { density: "compact", modality: "pointer" },
      watchos: { colorScheme: "dark", density: "watch", modality: "touch" },
    });
  });
});

describe("rootAttributes", () => {
  it("writes every axis it is given, under its attribute", () => {
    for (const axis of AXES) {
      for (const value of CONTRACT[axis].values) {
        expect(rootAttributes({ [axis]: value })).toEqual({
          [CONTRACT[axis].attribute]: value,
        });
      }
    }
  });

  it("writes the whole context when it is given one", () => {
    expect(rootAttributes({ ...defaultContext, colorScheme: "dark", density: "comfortable" })).toEqual({
      "data-ds-color-scheme": "dark",
      "data-ds-contrast": "standard",
      "data-ds-transparency": "standard",
      "data-ds-density": "comfortable",
      "data-ds-modality": "pointer",
      "data-ds-motion": "standard",
    });
  });

  it("writes nothing for an axis left out: it keeps following the media queries", () => {
    expect(rootAttributes({})).toEqual({});
    expect(rootAttributes()).toEqual({});
    expect(rootAttributes({ colorScheme: undefined })).toEqual({});
  });

  it("ignores a value the axis does not list, like an absent attribute", () => {
    for (const axis of AXES) {
      for (const value of INVALID_VALUES) {
        expect(rootAttributes({ [axis]: value })).toEqual({});
      }
    }
    expect(rootAttributes({ density: 42 } as unknown as Partial<TokenContext>)).toEqual({});
  });

  it("emits the attributes in the table's order, so server markup is stable", () => {
    expect(Object.keys(rootAttributes(defaultContext))).toEqual(AXES.map((axis) => CONTRACT[axis].attribute));
  });
});

describe("scope", () => {
  it("writes the two nestable axes", () => {
    expect(scope({ colorScheme: "dark" })).toEqual({ "data-ds-color-scheme": "dark" });
    expect(scope({ density: "regular" })).toEqual({ "data-ds-density": "regular" });
    expect(scope({ colorScheme: "light", density: "watch" })).toEqual({
      "data-ds-color-scheme": "light",
      "data-ds-density": "watch",
    });
  });

  it("writes nothing for the root-only axes, even when they are passed", () => {
    const rootOnly = { contrast: "more", transparency: "reduce", modality: "touch", motion: "reduce" };
    expect(scope(rootOnly as Parameters<typeof scope>[0])).toEqual({});
  });

  it("ignores a value the axis does not list", () => {
    for (const value of INVALID_VALUES) {
      expect(scope({ colorScheme: value } as unknown as Parameters<typeof scope>[0])).toEqual({});
      expect(scope({ density: value } as unknown as Parameters<typeof scope>[0])).toEqual({});
    }
  });

  it("returns ScopeAttributes, the prop type components extend", () => {
    const attributes = scope({ colorScheme: "dark" });
    expect(attributes["data-ds-color-scheme"]).toBe("dark");
  });
});
