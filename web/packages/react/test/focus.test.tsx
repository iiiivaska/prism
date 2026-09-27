/// <reference types="node" />
/**
 * The interaction layers (ADR-0042), the web half of Apple's `DSInteractionTests`.
 *
 * - The table: the ring each ground takes, on a chip's own paint or not, and the band over an image, written out from
 *   the ADR (`focusRingOn`, `focusRingUnderlay`), and the attributes `focusRingProps` writes for it.
 * - `useFocusRing` reads the ground and the chip enclosure where it is called.
 * - focus/FocusRing.css draws the ring the attributes name, and over an image the band; no component sheet draws a
 *   ring of its own (the stylesheet test holds that).
 * - The contrast guard of §3.3, from the resolved values of every scheme and contrast: every ring against its ground,
 *   at least 3:1; the ring against its band, at least 9:1; every wash against its ground, a luminance ratio of at
 *   least 1.1.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Backdrop, Surface, backdropKinds, surfaceMaterials, type BackdropKind, type SurfaceMaterial } from "../src/index.ts";
import { focusRingOn, focusRingProps, focusRingTokens, focusRingUnderlay, type FocusRingGround, type FocusRingToken } from "../src/focus/ring.ts";
import { useFocusRing } from "../src/focus/useFocusRing.ts";
import { SurfaceChipEnclosureContext } from "../src/surface/context.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { cssVariable } from "./spec.ts";

const css = readFileSync(join(packageRoot, "src", "focus", "FocusRing.css"), "utf8");
const cascade = new Cascade(css);

/** Every context a Surface, a Backdrop or a chip can publish: nine materials over four backdrop kinds. */
const grounds = surfaceMaterials.flatMap((material) => backdropKinds.map((backdrop) => ({ material, backdrop })));

/** ADR-0042 §1.1's table and §1.2, written out from the ADR: Apple's `DSInteractionTests.expectedRing`, case for case. */
function expectedRing(material: SurfaceMaterial, backdrop: BackdropKind, onChipPaint: boolean): FocusRingToken {
  if (material === "inverse") return "color.border.focus-on-inverse";
  if (material === "accent") return "color.border.focus-on-accent";
  if (!onChipPaint && (material === "vivid" || (material === "page" && backdrop === "vivid"))) return "color.border.focus-on-media";
  return "color.border.focus";
}

describe("the table (ADR-0042 §1.1 to §1.3)", () => {
  it.each(grounds)("$material over $backdrop takes the ring of the table, and the band only over an image outside a chip", ({ material, backdrop }) => {
    for (const onChipPaint of [false, true]) {
      const which = `on a chip's paint: ${String(onChipPaint)}`;
      expect(focusRingOn({ material, backdrop }, onChipPaint), which).toBe(expectedRing(material, backdrop, onChipPaint));
      const band = material === "page" && backdrop === "image" && !onChipPaint ? "color.bg.page" : null;
      expect(focusRingUnderlay({ material, backdrop }, onChipPaint), which).toBe(band);
    }
  });

  it("writes the table as the attributes FocusRing.css reads", () => {
    expect(focusRingProps({ material: "inverse", backdrop: "none" }, false)).toEqual({
      className: "ds-focus-ring",
      "data-ds-focus-ring": "focus-on-inverse",
      "data-ds-focus-ring-underlay": undefined,
    });
    expect(focusRingProps({ material: "page", backdrop: "image" }, false)).toEqual({ className: "ds-focus-ring", "data-ds-focus-ring": "focus", "data-ds-focus-ring-underlay": "" });
    expect(focusRingProps({ material: "page", backdrop: "image" }, true)["data-ds-focus-ring-underlay"]).toBeUndefined();
    expect(focusRingProps({ material: "vivid", backdrop: "none" }, false)["data-ds-focus-ring"]).toBe("focus-on-media");
    expect(focusRingProps({ material: "accent", backdrop: "none" }, true)["data-ds-focus-ring"]).toBe("focus-on-accent");
  });
});

describe("useFocusRing reads the ground and the enclosure where it is called (ADR-0042 §1.1, §1.2)", () => {
  function Probe(props: { readonly ground?: FocusRingGround; readonly onChipPaint?: boolean }): ReactNode {
    const { ground, onChipPaint } = props;
    const ring = useFocusRing({ ...(ground === undefined ? {} : { ground }), ...(onChipPaint === undefined ? {} : { onChipPaint }) });
    return <span className={ring.className} data-ds-focus-ring={ring["data-ds-focus-ring"]} data-ds-focus-ring-underlay={ring["data-ds-focus-ring-underlay"]} />;
  }

  const probe = (node: ReactNode): string => /<span class="ds-focus-ring"[^>]*><\/span>/.exec(renderToStaticMarkup(<Theme tokens={tokens}>{node}</Theme>))?.[0] ?? "";

  it("on the page, on a Surface, and on the page over media", () => {
    expect(probe(<Probe />)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus"></span>');
    expect(probe(<Surface material="inverse"><Probe /></Surface>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus-on-inverse"></span>');
    expect(probe(<Surface material="accent"><Probe /></Surface>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus-on-accent"></span>');
    expect(probe(<Surface material="vivid"><Probe /></Surface>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus-on-media"></span>');
    expect(probe(<Backdrop kind="vivid"><Probe /></Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus-on-media"></span>');
    expect(probe(<Backdrop kind="image"><Probe /></Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus" data-ds-focus-ring-underlay=""></span>');
    expect(probe(<Backdrop kind="map"><Probe /></Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus"></span>');
  });

  it("inside a chip, or on a chip's paint, the media rows and the band give way; the ground a component hands over wins", () => {
    const inChip = (node: ReactNode): ReactNode => <SurfaceChipEnclosureContext.Provider value="translucent">{node}</SurfaceChipEnclosureContext.Provider>;
    expect(probe(<Backdrop kind="vivid">{inChip(<Probe />)}</Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus"></span>');
    expect(probe(<Backdrop kind="image">{inChip(<Probe />)}</Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus"></span>');
    expect(probe(<Backdrop kind="image"><Probe onChipPaint /></Backdrop>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus"></span>');
    expect(probe(<Surface material="inverse">{inChip(<Probe />)}</Surface>)).toBe('<span class="ds-focus-ring" data-ds-focus-ring="focus-on-inverse"></span>');
    expect(probe(<Surface material="raised"><Probe ground={{ material: "page", backdrop: "image" }} /></Surface>)).toBe(
      '<span class="ds-focus-ring" data-ds-focus-ring="focus" data-ds-focus-ring-underlay=""></span>',
    );
  });
});

describe("FocusRing.css draws the ring the attributes name (ADR-0042 §1.6)", () => {
  const focused = '.ds-focus-ring:is([data-focus-visible], [data-ds-focus-ring-native]:focus-visible)';

  it.each(focusRingTokens.map((token) => [token] as const))("data-ds-focus-ring names %s", (token) => {
    const name = token.slice("color.border.".length);
    expect(cascade.value({ classes: ["ds-focus-ring"], attributes: { "data-ds-focus-ring": name } }, "--ds--focus-ring")).toBe(`var(${cssVariable(token)})`);
  });

  it("the ring: focus-visible.ringWidth outside the element in the ground's role, on React Aria's state or the browser's own", () => {
    expect(cascade.value({ classes: ["ds-focus-ring"], attributes: {} }, "--ds--focus-ring")).toBe("var(--ds-color-border-focus)");
    expect(declarationsOf(cascade.rules, focused)).toEqual({ outline: "var(--ds-border-focus) solid var(--ds--focus-ring)" });
  });

  it("the band: color.bg.page from one ring width outside the element to two, as the outline of its ::after", () => {
    expect(declarationsOf(cascade.rules, `.ds-focus-ring[data-ds-focus-ring-underlay]:is([data-focus-visible], [data-ds-focus-ring-native]:focus-visible)::after`)).toEqual({
      content: '""',
      position: "absolute",
      inset: "0",
      "border-radius": "inherit",
      "pointer-events": "none",
      outline: "var(--ds-border-focus) solid var(--ds-color-bg-page)",
      "outline-offset": "var(--ds-border-focus)",
    });
  });
});

/** A resolved colour: its sRGB hex and its alpha. */
interface Resolved {
  readonly hex: string;
  readonly alpha: number;
}

type Rgb = readonly [number, number, number];

function channels(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** `top` over the opaque `under`, composited in gamma-encoded sRGB as a browser composites. */
function over(top: Resolved, under: Rgb): Rgb {
  const [r, g, b] = channels(top.hex);
  const a = top.alpha;
  return [a * r + (1 - a) * under[0], a * g + (1 - a) * under[1], a * b + (1 - a) * under[2]];
}

function luminance([r, g, b]: Rgb): number {
  const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function ratio(a: Rgb, b: Rgb): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("the contrast guard (ADR-0042 §3.3)", () => {
  const contexts = (["light", "dark"] as const).flatMap((colorScheme) => (["standard", "more"] as const).map((contrast) => ({ colorScheme, contrast })));

  function resolvedIn(context: (typeof contexts)[number]): (token: string) => Resolved {
    const table = tokens.resolveTokens(context) as unknown as Readonly<Record<string, Resolved | undefined>>;
    return (token) => {
      const found = table[token];
      if (found === undefined) throw new Error(`${token} does not resolve`);
      return found;
    };
  }

  /** The opaque colours of a ground: the page; the solid ladder over the page it paints; the inverse fill; the tile; every vivid stop. */
  function fills(material: SurfaceMaterial, resolve: (token: string) => Resolved): readonly Rgb[] {
    const page = over(resolve("color.bg.page"), [0, 0, 0]);
    switch (material) {
      case "page":
        return [page];
      case "solid":
        return [over(resolve("color.bg.surface"), page)];
      case "raised":
        return [over(resolve("color.bg.surface.raised"), page)];
      case "nested":
        return [over(resolve("color.bg.surface.nested"), page)];
      case "inverse":
        return [over(resolve("color.bg.fill.inverse"), page)];
      case "accent":
        return [over(resolve("color.bg.fill.accent"), page)];
      case "vivid":
        return ["default", "1", "2", "3", "4"].flatMap((slot) => {
          const gradient = resolve(`gradient.vivid.${slot}`) as unknown as { readonly stops: readonly { readonly color: Resolved }[] };
          return gradient.stops.map((stop) => over(stop.color, [0, 0, 0]));
        });
      case "glass":
      case "glassLight":
        return [];
    }
  }

  it.each(contexts)("every ring holds 3:1 on its ground, $colorScheme, contrast $contrast", (context) => {
    const resolve = resolvedIn(context);
    const cases: readonly [FocusRingGround, SurfaceMaterial][] = [
      [{ material: "page", backdrop: "none" }, "page"],
      [{ material: "solid", backdrop: "none" }, "solid"],
      [{ material: "raised", backdrop: "none" }, "raised"],
      [{ material: "nested", backdrop: "none" }, "nested"],
      [{ material: "inverse", backdrop: "none" }, "inverse"],
      [{ material: "accent", backdrop: "none" }, "accent"],
      [{ material: "vivid", backdrop: "none" }, "vivid"],
      [{ material: "page", backdrop: "vivid" }, "vivid"],
    ];
    for (const [ground, material] of cases) {
      const ring = over(resolve(focusRingOn(ground, false)), [0, 0, 0]);
      const colours = fills(material, resolve);
      expect(colours.length).toBeGreaterThan(0);
      for (const fill of colours) {
        expect(ratio(ring, fill), `the ring on ${ground.material} over ${ground.backdrop}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(contexts)("the ring and its band are 9:1 apart over an image, $colorScheme, contrast $contrast", (context) => {
    const resolve = resolvedIn(context);
    const ground = { material: "page", backdrop: "image" } as const;
    const band = focusRingUnderlay(ground, false);
    expect(band).toBe("color.bg.page");
    expect(ratio(over(resolve(focusRingOn(ground, false)), [0, 0, 0]), over(resolve(band ?? ""), [0, 0, 0]))).toBeGreaterThanOrEqual(9);
  });

  it.each(contexts)("every wash moves its ground by a luminance ratio of 1.1, $colorScheme, contrast $contrast", (context) => {
    const resolve = resolvedIn(context);
    const washes: readonly [string, SurfaceMaterial][] = [
      ["color.bg.fill.neutral.subtle", "page"],
      ["color.bg.fill.neutral.subtle", "solid"],
      ["color.bg.fill.neutral.subtle", "raised"],
      ["color.bg.fill.neutral.subtle", "nested"],
      ["color.bg.fill.on-inverse-subtle", "inverse"],
      ["color.bg.fill.on-accent-subtle", "accent"],
    ];
    for (const [wash, material] of washes) {
      for (const ground of fills(material, resolve)) {
        expect(ratio(over(resolve(wash), ground), ground), `${wash} on ${material}`).toBeGreaterThanOrEqual(1.1);
      }
    }
    // What ADR-0040 §4 recorded, and why the inverse wash exists: the neutral wash is the inverse fill's own colour.
    const inverse = fills("inverse", resolve)[0] ?? [0, 0, 0];
    expect(ratio(over(resolve("color.bg.fill.neutral.subtle"), inverse), inverse)).toBeLessThan(1.01);
  });
});
