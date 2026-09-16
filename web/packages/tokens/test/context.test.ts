import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultContext, readContext, watchContext } from "../src/index.ts";
import type { TokenContext } from "../src/index.ts";
import { AXES, CONTRACT, DEFAULT_CONTEXT, INVALID_VALUES } from "./contract.ts";
import { FakeElement, installFakeDom, type FakeDom } from "./fake-dom.ts";

let dom: FakeDom | undefined;

function mount(matching: readonly string[] = []): FakeDom {
  dom = installFakeDom(matching);
  return dom;
}

function contextAt(element: FakeElement): TokenContext {
  return readContext(element as unknown as Element);
}

afterEach(() => {
  dom?.restore();
  dom = undefined;
});

describe("readContext off the DOM", () => {
  it("returns the resolver default when there is no document", () => {
    expect(readContext()).toEqual(DEFAULT_CONTEXT);
    expect(readContext()).toEqual(defaultContext);
  });
});

describe("readContext: media fallbacks", () => {
  it("returns the resolver default when no attribute is set and no query matches", () => {
    mount();
    expect(readContext()).toEqual(DEFAULT_CONTEXT);
  });

  it("takes each axis's one fallback value while its query matches", () => {
    for (const axis of AXES) {
      const fake = mount([CONTRACT[axis].media.query]);
      expect(readContext()).toEqual({ ...DEFAULT_CONTEXT, [axis]: CONTRACT[axis].media.value });
      fake.restore();
    }
    dom = undefined;
  });

  it("evaluates the density and modality fallbacks independently (ADR-0019 rule 5)", () => {
    // A touchscreen laptop: a coarse input exists, and the primary pointer still hovers finely.
    mount(["(any-pointer: coarse)"]);
    expect(readContext().density).toBe("regular");
    expect(readContext().modality).toBe("pointer");

    const touch = mount(["(any-pointer: coarse)", "not all and (hover: hover) and (pointer: fine)"]);
    expect(readContext().density).toBe("regular");
    expect(readContext().modality).toBe("touch");
    touch.restore();

    // A fine pointer that cannot hover keeps touch modality and compact density.
    mount(["not all and (hover: hover) and (pointer: fine)"]);
    expect(readContext().density).toBe("compact");
    expect(readContext().modality).toBe("touch");
  });

  it("reports standard transparency in a browser that cannot answer the query (Safari)", () => {
    // The fake matches only the queries it is given, like a browser without the feature.
    mount(["(prefers-contrast: more)"]);
    expect(readContext().contrast).toBe("more");
    expect(readContext().transparency).toBe("standard");
  });
});

describe("readContext: attributes on <html>", () => {
  it("lets any listed value turn the fallback off, the default included", () => {
    for (const axis of AXES) {
      for (const value of CONTRACT[axis].values) {
        const fake = mount([CONTRACT[axis].media.query]);
        fake.root.setAttribute(CONTRACT[axis].attribute, value);
        expect(readContext()[axis]).toBe(value);
        fake.restore();
      }
    }
    dom = undefined;
  });

  it("treats an absent, empty or unknown value exactly like no attribute", () => {
    for (const axis of AXES) {
      for (const value of INVALID_VALUES) {
        const withQuery = mount([CONTRACT[axis].media.query]);
        withQuery.root.setAttribute(CONTRACT[axis].attribute, value);
        expect(readContext()[axis]).toBe(CONTRACT[axis].media.value);
        withQuery.restore();

        const withoutQuery = mount();
        withoutQuery.root.setAttribute(CONTRACT[axis].attribute, value);
        expect(readContext()[axis]).toBe(DEFAULT_CONTEXT[axis]);
        withoutQuery.restore();
      }
    }
    dom = undefined;
  });
});

describe("readContext: nesting (ADR-0019 §1 item 4)", () => {
  it("resolves colorScheme and density per element, nearest ancestor-or-self first", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-color-scheme", "light");
    const band = fake.root.child();
    band.setAttribute("data-ds-color-scheme", "dark");
    const inner = band.child();
    const relit = inner.child();
    relit.setAttribute("data-ds-color-scheme", "light");

    expect(readContext().colorScheme).toBe("light");
    expect(contextAt(band).colorScheme).toBe("dark");
    expect(contextAt(inner).colorScheme).toBe("dark");
    expect(contextAt(relit).colorScheme).toBe("light");
  });

  it("nests density the same way", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-density", "comfortable");
    const table = fake.root.child();
    table.setAttribute("data-ds-density", "compact");
    expect(contextAt(table).density).toBe("compact");
    expect(contextAt(table.child()).density).toBe("compact");
    expect(readContext().density).toBe("comfortable");
  });

  it("lets an unknown value on a nested element inherit the parent", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-color-scheme", "dark");
    const band = fake.root.child();
    band.setAttribute("data-ds-color-scheme", "auto");
    expect(contextAt(band).colorScheme).toBe("dark");
  });

  it("ignores contrast, transparency, modality and motion anywhere but <html>", () => {
    const fake = mount();
    const band = fake.root.child();
    for (const axis of AXES) {
      if (CONTRACT[axis].nestable) continue;
      band.setAttribute(CONTRACT[axis].attribute, CONTRACT[axis].media.value);
      expect(contextAt(band)[axis]).toBe(DEFAULT_CONTEXT[axis]);
    }
  });

  it("still reads <html> for an element outside the document", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-color-scheme", "dark");
    fake.root.setAttribute("data-ds-density", "regular");
    const detached = new FakeElement(fake.document);
    expect(contextAt(detached)).toEqual({ ...DEFAULT_CONTEXT, colorScheme: "dark", density: "regular" });
  });

  it("gives a nested scope the root's contrast, as the descendant CSS forms do", () => {
    const fake = mount();
    fake.root.setAttribute("data-ds-contrast", "more");
    fake.root.setAttribute("data-ds-color-scheme", "light");
    const band = fake.root.child();
    band.setAttribute("data-ds-color-scheme", "dark");
    expect(contextAt(band)).toEqual({ ...DEFAULT_CONTEXT, contrast: "more", colorScheme: "dark" });
  });
});

describe("watchContext", () => {
  it("fires when a media query changes", () => {
    const fake = mount();
    const listener = vi.fn();
    const stop = watchContext(listener);

    fake.setMedia("(prefers-color-scheme: dark)", true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual({ ...DEFAULT_CONTEXT, colorScheme: "dark" });

    fake.setMedia("(prefers-reduced-motion: reduce)", true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[0]).toEqual({ ...DEFAULT_CONTEXT, colorScheme: "dark", motion: "reduce" });

    stop();
    fake.setMedia("(prefers-contrast: more)", true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("fires on a data-ds-* mutation of <html>", async () => {
    const fake = mount();
    const listener = vi.fn();
    const stop = watchContext(listener);

    fake.root.setAttribute("data-ds-density", "comfortable");
    await fake.flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual({ ...DEFAULT_CONTEXT, density: "comfortable" });

    fake.root.removeAttribute("data-ds-density");
    await fake.flush();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]?.[0]).toEqual(DEFAULT_CONTEXT);

    stop();
    fake.root.setAttribute("data-ds-density", "watch");
    await fake.flush();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("delivers nothing when the effective context did not change", async () => {
    const fake = mount();
    const listener = vi.fn();
    const stop = watchContext(listener);

    // An unknown value keeps the resolved context on the default.
    fake.root.setAttribute("data-ds-color-scheme", "system");
    await fake.flush();
    // A listed value equal to what the fallback already gave.
    fake.root.setAttribute("data-ds-density", "compact");
    await fake.flush();
    expect(listener).not.toHaveBeenCalled();

    fake.root.setAttribute("data-ds-color-scheme", "dark");
    await fake.flush();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  it("does nothing off the DOM", () => {
    const listener = vi.fn();
    const stop = watchContext(listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });
});
