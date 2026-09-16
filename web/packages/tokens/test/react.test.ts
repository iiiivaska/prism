import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Theme,
  brandTokens,
  clearBrandTokens,
  defaultContext,
  mountRoot,
  readContext,
  rootAttributes,
  setBrandTokens,
  useBrandTokens,
  useTokenContext,
  type ThemeProps,
  type TokenContext,
} from "../src/react/index.ts";
import * as prism from "../src/generated/prism/tokens.ts";
import * as prismNative from "../src/generated/prism-native/tokens.ts";
import { AXES, CONTRACT, DEFAULT_CONTEXT } from "./contract.ts";
import { installFakeDom, type FakeDom } from "./fake-dom.ts";

/** Renders the context as `axis=value` pairs; JSON would come back HTML-escaped. */
function ContextProbe(): ReactNode {
  const context = useTokenContext();
  return createElement("i", { id: "context" }, AXES.map((axis) => `${axis}=${context[axis]}`).join(" "));
}

function BrandProbe(): ReactNode {
  const tokens = useBrandTokens<typeof prism>();
  return createElement("i", { id: "brand" }, tokens.table["color.bg.page"].$cssVar);
}

function markup(node: ReactNode): string {
  return renderToStaticMarkup(node);
}

function parseProbe(html: string): TokenContext {
  const body = /<i id="context">(.*)<\/i>/u.exec(html)?.[1];
  expect(body, html).toBeDefined();
  const context: Record<string, string> = {};
  for (const pair of (body ?? "").split(" ")) {
    const [axis, value] = pair.split("=");
    if (axis !== undefined && value !== undefined) context[axis] = value;
  }
  return context as unknown as TokenContext;
}

function serverContext(props: ThemeProps): TokenContext {
  return parseProbe(markup(createElement(Theme, props, createElement(ContextProbe))));
}

let dom: FakeDom | undefined;

beforeEach(() => {
  clearBrandTokens();
});

afterEach(() => {
  dom?.restore();
  dom = undefined;
});

/**
 * Rule 7 on the server: the markup `<Theme>` adds, its root-only guard and the hydration snapshot
 * (`defaultContext` overlaid with the props). The client half — `useTokenContext()` returning what
 * `readContext()` returns and updating on every `watchContext` event — needs a client render, which
 * this Node suite has no runner for; it is an acceptance line of P3-4's browser lane (roadmap P3-4).
 * Its collaborators are covered here and in `context.test.ts`.
 */
describe("<Theme> renders no element and is root-only (ADR-0019 rule 7)", () => {
  it("adds nothing to the markup", () => {
    expect(markup(createElement(Theme, null, createElement("p", null, "hello")))).toBe("<p>hello</p>");
    expect(markup(createElement(Theme, { colorScheme: "dark", density: "regular" }, "bare"))).toBe("bare");
  });

  it("has no brand prop: a document loads one brand", () => {
    const withBrand = { brand: "prism-native" } as unknown as ThemeProps;
    // The prop is not an axis, so it neither reaches the DOM nor the context.
    expect(serverContext(withBrand)).toEqual(DEFAULT_CONTEXT);
  });

  it("throws when nested, naming scope() as the way to nest", () => {
    expect(() => markup(createElement(Theme, null, createElement(Theme, null, "x")))).toThrowError(
      "Theme is root-only; spread scope() on an element for a nested color scheme or density",
    );
  });
});

describe("useTokenContext on the server and during hydration", () => {
  it("is the resolver default without a <Theme>", () => {
    expect(parseProbe(markup(createElement(ContextProbe)))).toEqual(defaultContext);
  });

  it("is defaultContext overlaid with the <Theme> props", () => {
    expect(serverContext({})).toEqual(DEFAULT_CONTEXT);
    expect(serverContext({ colorScheme: "dark" })).toEqual({ ...DEFAULT_CONTEXT, colorScheme: "dark" });
    expect(serverContext({ contrast: "more", transparency: "reduce", density: "comfortable", motion: "reduce" })).toEqual(
      { ...DEFAULT_CONTEXT, contrast: "more", transparency: "reduce", density: "comfortable", motion: "reduce" },
    );
  });

  it("ignores a prop value the axis does not list", () => {
    expect(serverContext({ colorScheme: "auto" } as unknown as ThemeProps)).toEqual(DEFAULT_CONTEXT);
  });
});

describe("server rendering leaves nothing to flash (ADR-0019 §4 item 5)", () => {
  it("changes nothing on hydration when the app rendered the same choice into <html>", () => {
    const choice = { colorScheme: "dark", density: "comfortable", motion: "reduce" } as const;
    const attributes = rootAttributes(choice);
    expect(attributes).toEqual({
      "data-ds-color-scheme": "dark",
      "data-ds-density": "comfortable",
      "data-ds-motion": "reduce",
    });

    // The document the server sent, in a browser whose OS settings say the opposite on every axis.
    const fake = installFakeDom(AXES.map((axis) => CONTRACT[axis].media.query));
    dom = fake;
    for (const [name, value] of Object.entries(attributes)) fake.root.setAttribute(name, value);

    // The chosen axes agree before and after hydration, so nothing flashes.
    const server = serverContext(choice);
    const client = readContext();
    for (const axis of ["colorScheme", "density", "motion"] as const) {
      expect(server[axis]).toBe(choice[axis]);
      expect(client[axis]).toBe(choice[axis]);
    }

    // And `<Theme>`'s layout effect writes the values that are already there: no mutation.
    const before = AXES.map((axis) => fake.root.getAttribute(CONTRACT[axis].attribute));
    mountRoot(choice);
    expect(AXES.map((axis) => fake.root.getAttribute(CONTRACT[axis].attribute))).toEqual(before);

    // The axes the app left out keep following the OS, which is what the stylesheet paints anyway.
    expect(client.contrast).toBe("more");
    expect(client.modality).toBe("touch");
  });

  it("still follows the OS on the axes the app did not choose", () => {
    const fake = installFakeDom(["(prefers-color-scheme: dark)", "(any-pointer: coarse)"]);
    dom = fake;
    expect(readContext()).toEqual({ ...DEFAULT_CONTEXT, colorScheme: "dark", density: "regular" });
    // The server snapshot of a `<Theme>` with no props is the resolver default, and the first client
    // read then switches to the detected values: nothing was written into an attribute.
    expect(serverContext({})).toEqual(DEFAULT_CONTEXT);
  });
});

describe("the brand table reaches React (ADR-0020 §6)", () => {
  it("comes from <Theme tokens>", () => {
    const html = markup(createElement(Theme, { tokens: prism }, createElement(BrandProbe)));
    expect(html).toBe('<i id="brand">--ds-color-bg-page</i>');
  });

  it("stays per render on the server: the module registry is untouched", () => {
    markup(createElement(Theme, { tokens: prismNative }, createElement(BrandProbe)));
    expect(() => brandTokens()).toThrowError(/setBrandTokens/);
  });

  it("stays per render under a DOM shim too: only a committed render hands the table over", () => {
    // A server that renders under jsdom or happy-dom has a global `document`. `<Theme>` registers the
    // table in an effect, which server rendering never runs, so one process still renders several
    // brands and a discarded concurrent render publishes nothing (ADR-0020 §6).
    dom = installFakeDom();
    markup(createElement(Theme, { tokens: prismNative }, createElement(BrandProbe)));
    expect(() => brandTokens()).toThrowError(/setBrandTokens/);
  });

  it("falls back to the table setBrandTokens was given", () => {
    setBrandTokens(prism);
    const html = markup(createElement(BrandProbe));
    expect(html).toBe('<i id="brand">--ds-color-bg-page</i>');
  });

  it("fails when the app handed over none", () => {
    expect(() => markup(createElement(BrandProbe))).toThrowError(/setBrandTokens/);
  });
});
