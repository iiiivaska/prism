/// <reference types="node" />
/**
 * Surface (spec/components/Surface.yaml, specVersion 3).
 *
 * - The React Surface test of ADR-0022 rule 1 and ADR-0025 rule 1: the full resolution table against an
 *   independent statement of ADR-0022 §1.2 and §1.6, and the same table rendered on the server through
 *   `<Theme contrast transparency>` (glass without props, the fallback with `contrast="more"` or
 *   `transparency="reduce"`). The client half, with a real `matchMedia`, runs in the gallery's browser
 *   suite.
 * - The stylesheet binds what Surface.yaml binds, cell by cell.
 * - The glass chip block of the same stylesheet (ADR-0036 §7) reads the recipe the chip specs bind, draws
 *   no backdrop filter when flat, and paints the fallback as `color.bg.page` under
 *   `color.bg.surface.raised` with no top edge. `test/surface-chip.test.tsx` has the chip's resolution.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Theme, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Surface, useSurfaceContext } from "../src/index.ts";
import { backdropKinds, resolveSurface, surfaceElevation, surfaceElevations, surfaceMaterials, type BackdropKind, type SurfaceMaterial } from "../src/surface/resolve.ts";
import { flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues } from "./spec.ts";

const spec = loadSpec("Surface");
const contrasts: TokenContext["contrast"][] = ["standard", "more"];
const transparencies: TokenContext["transparency"][] = ["standard", "reduce"];

/** ADR-0022 §1.2 (triggers 2–4; the web is never watchOS) and §1.6, stated independently of resolve.ts. */
function expectedMaterial(material: SurfaceMaterial, backdrop: BackdropKind, selected: boolean, context: Pick<TokenContext, "contrast" | "transparency">): SurfaceMaterial {
  if (material !== "glass" && material !== "glassLight") return material;
  const fallback = context.contrast === "more" || context.transparency === "reduce" || !["image", "map", "vivid"].includes(backdrop);
  if (!fallback) return material;
  return selected ? "inverse" : "raised";
}

const combinations = surfaceMaterials.flatMap((material) =>
  backdropKinds.flatMap((backdrop) =>
    [false, true].flatMap((selected) =>
      contrasts.flatMap((contrast) => transparencies.map((transparency) => ({ material, backdrop, selected, contrast, transparency }))),
    ),
  ),
);

function Probe(): ReactNode {
  const { material, backdrop, depth } = useSurfaceContext();
  return <i id="published">{`${material} ${backdrop} ${depth}`}</i>;
}

function attributes(html: string): Record<string, string> {
  const tag = /<div([^>]*)>/.exec(html)?.[1] ?? "";
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1] ?? "", match[2] ?? ""]));
}

describe("the spec is the one this package implements", () => {
  it("is Surface.yaml specVersion 3", () => {
    expect(spec.specVersion).toBe(3);
    expect([...surfaceMaterials]).toEqual(propValues(spec, "material"));
    expect([...backdropKinds]).toEqual(propValues(spec, "backdrop"));
  });
});

describe("the resolution table (ADR-0022 rule 1)", () => {
  it.each(combinations)("$material over $backdrop, selected $selected, contrast $contrast, transparency $transparency", (row) => {
    const resolution = resolveSurface(row, row);
    const material = expectedMaterial(row.material, row.backdrop, row.selected, row);
    expect(resolution.material).toBe(material);
    expect(resolution.backdrop).toBe(row.backdrop);
    expect(resolution.isGlassFallback).toBe((row.material === "glass" || row.material === "glassLight") && material !== row.material);
    expect(resolution.hasInvalidBackdrop).toBe((row.material === "glass" || row.material === "glassLight") && row.backdrop === "none");
    expect(resolution.glass).toBe(material === "glass" ? "fill" : material === "glassLight" ? "lightFill" : null);
    expect(resolution.paintsPage).toBe(["solid", "raised", "nested"].includes(material));
    expect(resolution.drawsRaisedEdge).toBe(material === "raised");
    expect(resolution.drawsVividBloom).toBe(material === "vivid" && row.transparency !== "reduce");
  });

  it.each(combinations)("renders on the server through <Theme>: $material over $backdrop, selected $selected, $contrast, $transparency", (row) => {
    const html = renderToStaticMarkup(
      <Theme contrast={row.contrast} transparency={row.transparency}>
        <Surface material={row.material} backdrop={row.backdrop} selected={row.selected}>
          <Probe />
        </Surface>
      </Theme>,
    );
    const material = expectedMaterial(row.material, row.backdrop, row.selected, row);
    const root = attributes(html);
    expect(root["data-ds-material"]).toBe(material);
    expect(root["data-ds-backdrop"]).toBe(row.backdrop);
    expect(/<i id="published">([^<]*)<\/i>/.exec(html)?.[1]).toBe(`${material} ${row.backdrop} 1`);
    const parts = [...html.matchAll(/data-ds-slot="(surface-[a-z]+)"/g)].map((match) => match[1]);
    const glass = material === "glass" || material === "glassLight";
    const vivid = material === "vivid";
    expect(parts).toEqual([
      ...(vivid && row.transparency !== "reduce" ? ["surface-bloom"] : []),
      ...(vivid ? ["surface-fill"] : []),
      ...(glass ? ["surface-bloom"] : []),
      ...(glass || vivid ? ["surface-grain", "surface-edge"] : []),
    ]);
  });

  it("paints glass without <Theme> props and the fallback with contrast more or transparency reduce (ADR-0025 rule 1)", () => {
    const render = (node: ReactNode): string | undefined => attributes(renderToStaticMarkup(node))["data-ds-material"];
    expect(render(<Surface material="glass" backdrop="map" />)).toBe("glass");
    expect(render(<Theme><Surface material="glass" backdrop="map" /></Theme>)).toBe("glass");
    expect(render(<Theme contrast="more"><Surface material="glass" backdrop="map" /></Theme>)).toBe("raised");
    expect(render(<Theme transparency="reduce"><Surface material="glassLight" backdrop="image" /></Theme>)).toBe("raised");
    expect(render(<Theme transparency="reduce"><Surface material="glass" backdrop="image" selected /></Theme>)).toBe("inverse");
  });

  it("takes the undeclared elevation from the requested material, not from the one that renders", () => {
    // ADR-0022 §1.1: under the fallback "radius and elevation are the ones the requesting Surface
    // declares"; ADR-0030 §5.2: "`elevation.1` is `raised`'s default, not an override". So a glass
    // surface that declares none stays flat however it resolves, and only a requested `raised` lifts.
    // The table is `DSSurfaceElevation.materialDefault(for:)` on the Apple side.
    const elevation = (node: ReactNode): string | undefined => attributes(renderToStaticMarkup(node))["data-ds-elevation"];
    expect(elevation(<Theme contrast="more"><Surface material="glass" backdrop="map" elevation="overlay" /></Theme>)).toBe("overlay");
    expect(elevation(<Theme contrast="more"><Surface material="glass" backdrop="map" /></Theme>)).toBe("flat");
    expect(elevation(<Theme transparency="reduce"><Surface material="glassLight" backdrop="image" /></Theme>)).toBe("flat");
    expect(elevation(<Surface material="glass" backdrop="none" />)).toBe("flat");
    expect(elevation(<Surface material="glass" backdrop="map" />)).toBe("flat");
    expect(elevation(<Surface material="solid" />)).toBe("flat");
    expect(elevation(<Surface material="raised" />)).toBe("raised");
    expect(elevation(<Surface material="raised" elevation="flat" />)).toBe("flat");
    // specVersion 3 writes that default into the spec, in the `elevation` prop and beside the fallback
    // sentence in behavior; it was implemented here and on Apple before any sentence stated it.
    const declaration = spec.props.find((prop) => prop.name === "elevation") as { readonly description?: string } | undefined;
    expect(declaration?.description ?? "").toContain("the default of the material the caller requested");
    expect((spec.behavior ?? []).join("\n")).toContain("a glass surface that asked for none stays flat");
  });

  it("states that table once, for both stacks (surfaceElevation)", () => {
    for (const material of surfaceMaterials) {
      expect(surfaceElevation(undefined, material), material).toBe(material === "raised" ? "raised" : "flat");
      for (const declared of surfaceElevations) expect(surfaceElevation(declared, material), material).toBe(declared);
    }
  });

  it("publishes its depth for the concentric radius rule", () => {
    const html = renderToStaticMarkup(
      <Surface>
        <Surface material="nested">
          <Probe />
        </Surface>
      </Surface>,
    );
    const tags = [...html.matchAll(/<div([^>]*)>/g)].map((match) => match[1] ?? "");
    expect(tags[0]).toContain('data-ds-depth="even"');
    expect(tags[0]).not.toContain("data-ds-nested");
    expect(tags[1]).toContain('data-ds-depth="odd"');
    expect(tags[1]).toContain('data-ds-nested=""');
    expect(html).toContain('<i id="published">nested none 2</i>');
  });
});

describe("Surface.css binds what Surface.yaml binds", () => {
  const rules = flattenRules(parseCss(readFileSync(join(packageRoot, "src", "surface", "Surface.css"), "utf8")));

  function declared(selector: string, property: string): string | undefined {
    const values = rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.declarations.filter((declaration) => declaration.property === property));
    return values.at(-1)?.value;
  }

  const material = (value: string): string => `.ds-surface[data-ds-material="${value}"]`;
  const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

  it.each(propValues(spec, "material"))("root.background and root.underlay of %s", (value) => {
    expect(declared(material(value), "--ds--surface-fill")).toBe(bound(cell(spec.tokens["root"]?.["background"], value)));
    expect(declared(material(value), "--ds--surface-under")).toBe(bound(cell(spec.tokens["root"]?.["underlay"], value)));
  });

  it.each(["default", ...propValues(spec, "vivid")])("root.gradient of vivid %s", (slot) => {
    expect(declared(`.ds-surface[data-ds-vivid="${slot}"]`, "--ds--surface-gradient")).toBe(bound(cell(spec.tokens["root"]?.["gradient"], slot)));
    expect(declared(`.ds-surface[data-ds-vivid="${slot}"]`, "--ds--surface-grain")).toBe(`var(${cssVariable(cell(spec.tokens["root"]?.["gradient"], slot) ?? "")}-grain)`);
  });

  it.each(["glass", "glassLight"])("root.blur and root.saturate, edge, grain and bloom of %s", (value) => {
    const blur = cell(spec.tokens["root"]?.["blur"], value) ?? "";
    const saturate = cell(spec.tokens["root"]?.["saturate"], value) ?? "";
    expect(declared(material(value), "backdrop-filter")).toBe(`blur(var(${cssVariable(blur)})) saturate(var(${cssVariable(saturate)}))`);
    expect(declared(material(value), "--ds--surface-edge-start")).toBe(bound(cell(spec.tokens["edge"]?.["startAlpha"], value)));
    expect(declared(material(value), "--ds--surface-edge-end")).toBe(bound(cell(spec.tokens["edge"]?.["endAlpha"], value)));
    expect(declared(material(value), "--ds--surface-grain")).toBe(bound(cell(spec.tokens["grain"]?.["opacity"], value)));
    expect(declared(material(value), "--ds--surface-bloom")).toBe(bound(cell(spec.tokens["bloom"]?.["alpha"], value)));
    expect(cell(spec.tokens["edge"]?.["color"], value)).toBe("color.edge.highlight");
    expect(cell(spec.tokens["bloom"]?.["color"], value)).toBe("color.edge.highlight");
  });

  it("the vivid edge alphas, and the edge and bloom drawn in color.edge.highlight", () => {
    expect(declared(material("vivid"), "--ds--surface-edge-start")).toBe(bound(cell(spec.tokens["edge"]?.["startAlpha"], "vivid")));
    expect(declared(material("vivid"), "--ds--surface-edge-end")).toBe(bound(cell(spec.tokens["edge"]?.["endAlpha"], "vivid")));
    expect(cell(spec.tokens["edge"]?.["color"], "vivid")).toBe("color.edge.highlight");
    expect(declared('.ds-surface > [data-ds-slot="surface-edge"]', "background-image")).toContain("var(--ds-color-edge-highlight)");
  });

  it("leaves the grain of every recipe that carries one out of the header block (ADR-0030 §4.4)", () => {
    // The behaviour bullet names no material: "Grain is never drawn under text below 13 px, so it is left
    // out of the card header block." Vivid was masked; the two glass recipes are masked with it, so a
    // brand that gives its glass a grain (ADR-0020 §1) does not reopen the rule.
    expect((spec.behavior ?? []).join("\n")).toContain("Grain is never drawn under text below 13 px");
    // The block is ADR-0022 §4.1's V2 geometry: from the padding, W - 2p - size.control.md - space.5
    // across and space.12 down, excluded from the full box.
    const squeeze = (value: string | undefined): string => (value ?? "").replaceAll(/\s+/gu, " ");
    const padding = `var(${cssVariable("space.card-padding")})`;
    for (const selector of [
      '.ds-surface[data-ds-material="vivid"] > [data-ds-slot="surface-grain"]',
      '.ds-surface:is([data-ds-material="glass"], [data-ds-material="glassLight"]) > [data-ds-slot="surface-grain"]',
    ]) {
      expect(squeeze(declared(selector, "mask-image")), selector).toMatch(/^linear-gradient\(.+\), linear-gradient\(.+\)$/);
      expect(squeeze(declared(selector, "mask-size")), selector).toBe(
        `calc(100% - 2 * ${padding} - var(${cssVariable("size.control.md")}) - var(${cssVariable("space.5")})) var(${cssVariable("space.12")}), 100% 100%`,
      );
      expect(squeeze(declared(selector, "mask-position")), selector).toBe(`${padding} ${padding}, 0 0`);
      expect(declared(selector, "mask-repeat"), selector).toBe("no-repeat");
      expect(declared(selector, "mask-composite"), selector).toBe("exclude");
    }
    // The glass bloom carries the same cut, and Card.css makes it: only a card has the header block, and
    // a bloom is a wash rather than noise, so on a bare glassLight surface the cut would read as a box.
    expect(rules.filter((rule) => rule.selectors.some((selector) => selector.includes("surface-bloom")) && rule.declarations.some((declaration) => declaration.property.startsWith("mask")))).toEqual([]);
  });

  it("the raised edge in color.edge.raised", () => {
    expect(declared(material("raised"), "--ds--surface-top-edge")).toContain(bound(cell(spec.tokens["edge"]?.["color"], "raised")));
  });

  it.each(propValues(spec, "radius").filter((value) => value !== "none"))("root.radius of %s", (value) => {
    expect(declared(`.ds-surface[data-ds-radius="${value}"]`, "--ds--surface-radius-own")).toBe(bound(cell(spec.tokens["root"]?.["radius"], value)));
  });

  it.each(propValues(spec, "elevation"))("root.shadow of %s", (value) => {
    expect(declared(`.ds-surface[data-ds-elevation="${value}"]`, "--ds--surface-shadow")).toBe(bound(cell(spec.tokens["root"]?.["shadow"], value)));
  });

  it("root.padding of card", () => {
    expect(declared('.ds-surface[data-ds-padding="card"]', "--ds--surface-padding")).toBe(bound(cell(spec.tokens["root"]?.["padding"], "card")));
  });

  it("applies ADR-0023 §8.4 through --ds-motion-presentation-crossfade over motion.spring.smooth and motion.duration.base", () => {
    expect(spec.tokens).toBeDefined();
    const crossfade = declared(".ds-surface", "--ds--surface-crossfade-duration") ?? "";
    const geometry = declared(".ds-surface", "--ds--surface-geometry-duration") ?? "";
    expect(crossfade).toContain("var(--ds-motion-spring-smooth-duration) * (1 - var(--ds-motion-presentation-crossfade))");
    expect(crossfade).toContain("var(--ds-motion-duration-base) * var(--ds-motion-presentation-crossfade)");
    expect(geometry).toBe("calc(var(--ds-motion-spring-smooth-duration) * (1 - var(--ds-motion-presentation-crossfade)))");
    const transition = declared(".ds-surface", "transition") ?? "";
    expect(transition).toMatch(/backdrop-filter var\(--ds--surface-geometry-duration\)/);
    // The shadow and a press scale keep the geometry timing unless a component that is a Surface (Card)
    // sets its own: a selected card crossfades its lift under Reduce Motion.
    expect(transition).toMatch(/box-shadow var\(--ds--surface-shadow-duration\)/);
    expect(transition).toMatch(/scale var\(--ds--surface-scale-duration\) var\(--ds--surface-scale-easing\)/);
    expect(declared(".ds-surface", "--ds--surface-shadow-duration")).toBe("var(--ds--surface-geometry-duration)");
    expect(declared(".ds-surface", "--ds--surface-scale-duration")).toBe("var(--ds--surface-geometry-duration)");
    expect(transition).toMatch(/--ds--surface-fill var\(--ds--surface-crossfade-duration\)/);
  });
});

describe("Surface.css draws the glass chip (ADR-0036 §7)", () => {
  const rules = flattenRules(parseCss(readFileSync(join(packageRoot, "src", "surface", "Surface.css"), "utf8")));
  const chipRules = rules.filter((rule) => rule.selectors.some((selector) => selector.includes(".ds-surface-chip")));
  // The two specs wave 1b implements through the chip shape; seven more bind the same recipe.
  const chipSpecs = [loadSpec("Avatar"), loadSpec("Chip")];

  function declared(selector: string, property: string): string | undefined {
    const values = rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.declarations.filter((declaration) => declaration.property === property));
    return values.at(-1)?.value;
  }

  const chip = (rendering: string): string => `.ds-surface-chip[data-ds-surface-chip="${rendering}"]`;
  const flat = '.ds-surface-chip[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]';
  const edge = '.ds-surface-chip > [data-ds-slot="surface-chip-edge"]';
  const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

  it("reads material.glass.chip's fill, blur, saturate, edge.start and edge.end, the cells the chip specs bind on media", () => {
    for (const spec of chipSpecs) {
      const root = spec.tokens["root"];
      expect(cell(root?.["background"], "page", "map"), spec.name).toBe("material.glass.chip");
      expect(cell(root?.["blur"], "page", "map"), spec.name).toBe("material.glass.chip.blur");
      expect(cell(root?.["saturate"], "page", "map"), spec.name).toBe("material.glass.chip.saturate");
      expect(cell(root?.["edgeStartAlpha"], "page", "map"), spec.name).toBe("material.glass.chip.edge.start");
      expect(cell(root?.["edgeEndAlpha"], "page", "map"), spec.name).toBe("material.glass.chip.edge.end");
      expect(cell(root?.["edgeColor"]), spec.name).toBe("color.edge.highlight");
    }
    expect(declared(chip("glass"), "--ds--surface-chip-fill")).toBe(bound("material.glass.chip"));
    expect(declared(chip("glass"), "backdrop-filter")).toBe(`blur(${bound("material.glass.chip.blur")}) saturate(${bound("material.glass.chip.saturate")})`);
    const ramp = declared(edge, "background-image") ?? "";
    expect(ramp).toContain(`${bound("material.glass.chip.edge.start")}`);
    expect(ramp).toContain(`${bound("material.glass.chip.edge.end")}`);
    expect(ramp).toContain(bound("color.edge.highlight"));
    // Surface's edge geometry: 135°, the end alpha from 75 %, a ring of border.hairline.
    expect(ramp.replaceAll(/\s+/gu, " ")).toMatch(/^linear-gradient\( 135deg, .* 0%, .* 75% \)$/);
    expect(declared(edge, "padding")).toBe(bound("border.hairline"));
    expect(declared(edge, "border-radius")).toBe("inherit");
    // Those five are the only recipe variables the chip reads: no grain, no bloom, no other recipe.
    const names = new Set(chipRules.flatMap((rule) => rule.declarations.flatMap((declaration) => [...declaration.value.matchAll(/--ds-material-glass-[\w-]+/g)].map((match) => match[0]))));
    expect([...names].sort()).toEqual(
      ["material.glass.chip", "material.glass.chip.blur", "material.glass.chip.edge.end", "material.glass.chip.edge.start", "material.glass.chip.saturate"].map(cssVariable).sort(),
    );
  });

  it("is backdrop-filter: none when flat, where the chip specs bind no blur or saturation (glass on glass, §5)", () => {
    for (const spec of chipSpecs) {
      expect(cell(spec.tokens["root"]?.["background"], "glass"), spec.name).toBe("material.glass.chip");
      expect(cell(spec.tokens["root"]?.["blur"], "glass"), spec.name).toBeUndefined();
      expect(cell(spec.tokens["root"]?.["saturate"], "glass"), spec.name).toBeUndefined();
    }
    expect(declared(flat, "backdrop-filter")).toBe("none");
    // The chip block's only backdrop filters are the recipe's and the flat one's.
    const filtered = chipRules.filter((rule) => rule.declarations.some((declaration) => declaration.property === "backdrop-filter"));
    expect(filtered.flatMap((rule) => rule.selectors).sort()).toEqual([chip("glass"), flat].sort());
  });

  it("paints color.bg.page under color.bg.surface.raised under the fallback, the cells every chip spec binds, with no top edge", () => {
    for (const spec of chipSpecs) {
      expect(cell(spec.tokens["root"]?.["fallbackUnderlay"]), spec.name).toBe("color.bg.page");
      expect(cell(spec.tokens["root"]?.["fallbackBackground"]), spec.name).toBe("color.bg.surface.raised");
    }
    expect(declared(chip("fallback"), "--ds--surface-chip-under")).toBe(bound("color.bg.page"));
    expect(declared(chip("fallback"), "--ds--surface-chip-fill")).toBe(bound("color.bg.surface.raised"));
    // The underlay is the background colour, painted under the fill's gradient layer, as Surface paints its own.
    expect(declared(".ds-surface-chip", "background-color")).toBe("var(--ds--surface-chip-under)");
    expect(declared(".ds-surface-chip", "background-image")).toBe("linear-gradient(var(--ds--surface-chip-fill), var(--ds--surface-chip-fill))");
    // No top edge: the root's shadow is the elevation alone, and nothing in the chip block names Surface's raised edge.
    expect(declared(".ds-surface-chip", "box-shadow")).toBe("var(--ds--surface-chip-shadow)");
    expect(declared(chip("fallback"), "box-shadow")).toBeUndefined();
    expect(declared(chip("fallback"), "backdrop-filter")).toBeUndefined();
    const text = chipRules.flatMap((rule) => rule.declarations.map((declaration) => `${declaration.property}: ${declaration.value}`)).join("\n");
    expect(text).not.toContain("--ds-color-edge-raised");
    expect(text).not.toContain("--ds--surface-top-edge");
  });

  it("paints the component's own cell from --ds--surface-chip-own, and nothing for none", () => {
    expect(declared(chip("own"), "--ds--surface-chip-fill")).toBe("var(--ds--surface-chip-own)");
    expect(declared(".ds-surface-chip", "--ds--surface-chip-fill")).toBe("transparent");
    expect(declared(".ds-surface-chip", "--ds--surface-chip-under")).toBe("transparent");
    expect(chipRules.filter((rule) => rule.selectors.includes(chip("none")))).toEqual([]);
  });

  it.each(propValues(spec, "elevation"))("draws elevation %s as Surface draws its own", (value) => {
    expect(declared(`.ds-surface-chip[data-ds-elevation="${value}"]`, "--ds--surface-chip-shadow")).toBe(declared(`.ds-surface[data-ds-elevation="${value}"]`, "--ds--surface-shadow"));
  });

  it("crossfades its two fills and transitions its blur on Surface's timings (ADR-0023 §8.4)", () => {
    expect(declared(".ds-surface-chip", "--ds--surface-chip-crossfade-duration")).toBe(declared(".ds-surface", "--ds--surface-crossfade-duration"));
    expect(declared(".ds-surface-chip", "--ds--surface-chip-geometry-duration")).toBe(declared(".ds-surface", "--ds--surface-geometry-duration"));
    const transition = declared(".ds-surface-chip", "transition") ?? "";
    expect(transition).toMatch(/--ds--surface-chip-fill var\(--ds--surface-chip-crossfade-duration\) var\(--ds-motion-spring-smooth-easing\)/);
    expect(transition).toMatch(/--ds--surface-chip-under var\(--ds--surface-chip-crossfade-duration\) var\(--ds-motion-spring-smooth-easing\)/);
    expect(transition).toMatch(/backdrop-filter var\(--ds--surface-chip-geometry-duration\) var\(--ds-motion-spring-smooth-easing\)/);
  });

  it("puts the edge behind the host's content and hides it under forced colours", () => {
    expect(declared(".ds-surface-chip", "isolation")).toBe("isolate");
    expect(declared(edge, "z-index")).toBe("-1");
    const forced = rules.filter((rule) => rule.atRules.some((at) => at.name === "media" && at.params.includes("forced-colors")) && rule.selectors.includes(edge));
    expect(forced.flatMap((rule) => rule.declarations).find((declaration) => declaration.property === "display")?.value).toBe("none");
  });
});
