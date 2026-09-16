import { afterEach, describe, expect, it } from "vitest";
import { mountRoot, readContext } from "../src/index.ts";
import { AXES, CONTRACT, DEFAULT_CONTEXT, INVALID_VALUES } from "./contract.ts";
import { installFakeDom, type FakeDom } from "./fake-dom.ts";

let dom: FakeDom | undefined;

function mount(matching: readonly string[] = []): FakeDom {
  dom = installFakeDom(matching);
  return dom;
}

function attributesOn(fake: FakeDom): Record<string, string> {
  const present: Record<string, string> = {};
  for (const axis of AXES) {
    const value = fake.root.getAttribute(CONTRACT[axis].attribute);
    if (value !== null) present[CONTRACT[axis].attribute] = value;
  }
  return present;
}

afterEach(() => {
  dom?.restore();
  dom = undefined;
});

describe("mountRoot writes only explicit choices (ADR-0019 rule 6)", () => {
  it("writes the axes it is given and leaves every other one alone", () => {
    const fake = mount();
    mountRoot({ colorScheme: "dark", density: "regular" });
    expect(attributesOn(fake)).toEqual({ "data-ds-color-scheme": "dark", "data-ds-density": "regular" });
  });

  it("never copies a detected value into an attribute", () => {
    const fake = mount([
      "(prefers-color-scheme: dark)",
      "(any-pointer: coarse)",
      "not all and (hover: hover) and (pointer: fine)",
      "(prefers-reduced-motion: reduce)",
    ]);
    mountRoot({ contrast: "more" });
    expect(attributesOn(fake)).toEqual({ "data-ds-contrast": "more" });
    // The detected axes still resolve, they are simply not written down.
    expect(readContext()).toEqual({
      ...DEFAULT_CONTEXT,
      colorScheme: "dark",
      contrast: "more",
      density: "regular",
      modality: "touch",
      motion: "reduce",
    });
  });

  it("leaves data-ds-transparency untouched in a browser that cannot report it", () => {
    // Chrome-like support for contrast, Safari-like silence on transparency (ADR-0019 §4 item 3,
    // ADR-0025 rule 4): contrast `more` adds no stand-in.
    const fake = mount(["(prefers-contrast: more)"]);
    mountRoot({ contrast: "more" });
    expect(fake.root.hasAttribute("data-ds-transparency")).toBe(false);
    expect(readContext().transparency).toBe("standard");
  });

  it("ignores a value the axis does not list", () => {
    const fake = mount();
    for (const axis of AXES) {
      for (const value of INVALID_VALUES) {
        mountRoot({ [axis]: value });
        expect(attributesOn(fake)).toEqual({});
      }
    }
  });

  it("does nothing off the DOM, and its cleanup is safe", () => {
    const cleanup = mountRoot({ colorScheme: "dark" });
    expect(() => cleanup()).not.toThrow();
  });
});

describe("mountRoot cleanup restores the previous values", () => {
  it("removes an attribute that was absent", () => {
    const fake = mount();
    const cleanup = mountRoot({ colorScheme: "dark", motion: "reduce" });
    expect(attributesOn(fake)).toEqual({ "data-ds-color-scheme": "dark", "data-ds-motion": "reduce" });
    cleanup();
    expect(attributesOn(fake)).toEqual({});
  });

  it("puts back a value the app had written itself", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-color-scheme", "light");
    fake.root.setAttribute("data-ds-density", "watch");
    const cleanup = mountRoot({ colorScheme: "dark" });
    expect(attributesOn(fake)).toEqual({ "data-ds-color-scheme": "dark", "data-ds-density": "watch" });
    cleanup();
    expect(attributesOn(fake)).toEqual({ "data-ds-color-scheme": "light", "data-ds-density": "watch" });
  });

  it("never removes a value it did not write", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-modality", "touch");
    const cleanup = mountRoot({ colorScheme: "dark" });
    cleanup();
    expect(fake.root.getAttribute("data-ds-modality")).toBe("touch");
  });

  it("is idempotent", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-color-scheme", "light");
    const cleanup = mountRoot({ colorScheme: "dark" });
    cleanup();
    fake.root.setAttribute("data-ds-color-scheme", "dark");
    cleanup();
    expect(fake.root.getAttribute("data-ds-color-scheme")).toBe("dark");
  });

  it("unwinds nested mounts in order", () => {
    const fake = mount();
    const outer = mountRoot({ colorScheme: "light" });
    const inner = mountRoot({ colorScheme: "dark" });
    expect(fake.root.getAttribute("data-ds-color-scheme")).toBe("dark");
    inner();
    expect(fake.root.getAttribute("data-ds-color-scheme")).toBe("light");
    outer();
    expect(fake.root.hasAttribute("data-ds-color-scheme")).toBe(false);
  });
});
