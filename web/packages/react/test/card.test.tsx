/// <reference types="node" />
/**
 * Card (spec/components/Card.yaml, specVersion 2).
 *
 * - Card.css binds what Card.yaml binds: the fills, gradients, radius cells, padding and shadows by
 *   variant; the selection lift and outline, title, caption and action colors by published material
 *   (and on glass by backdrop kind); the icon ring, the action and the aside.
 * - The two choices Card makes in React: the Surface material of a variant and the radius cell.
 * - Server renders: one button labelled by title, caption and hero when `action: open`, a group
 *   otherwise; V3 on vivid; the glass fallback and selection through Surface; ScopeAttributes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Card, cardActions, cardSizes, cardVariants, type CardProps } from "../src/index.ts";
import { radiusCellOf, surfaceMaterialOf, surfaceRadiusOf } from "../src/card/parts.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Card");
const surfaceSpec = loadSpec("Surface");
const css = readFileSync(join(packageRoot, "src", "card", "Card.css"), "utf8");
const cascade = new Cascade(css);
const rules = flattenRules(parseCss(css));
const root = spec.tokens["root"] ?? {};

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);
const block = (binding: Binding | undefined): Record<string, Binding> => (binding ?? {}) as Record<string, Binding>;

function card(attributes: Record<string, string>): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-surface", "ds-card"], attributes };
}

/** The declarations of a rule written exactly so, inside the given @variant (or none). */
function declared(selector: string, property: string, variant?: string): string | undefined {
  return rules
    .filter((rule) => rule.selectors.includes(selector))
    .filter((rule) => {
      const variants = rule.atRules.filter((at) => at.name === "variant").map((at) => at.params);
      return variant === undefined ? variants.length === 0 : variants.includes(variant);
    })
    .flatMap((rule) => rule.declarations.filter((declaration) => declaration.property === property))
    .at(-1)?.value;
}

const heading = (material: string, part: "title" | "caption", backdrop?: string): string =>
  `.ds-card[data-ds-material="${material}"]${backdrop === undefined ? "" : `[data-ds-backdrop="${backdrop}"]`} > [data-ds-slot="card-header"] > [data-ds-slot="card-heading"] > .ds-card-${part}`;

function html(node: ReactNode, theme: { density?: Density; contrast?: "standard" | "more" } = {}): string {
  return renderToStaticMarkup(
    <Theme tokens={tokens} {...theme}>
      {node}
    </Theme>,
  );
}

function rootTag(out: string): string {
  return /^<div([^>]*)>/.exec(out)?.[1] ?? "";
}

const metric: CardProps = { title: "Line output", caption: "Last 24 hours", hero: { value: "86", trailing: ".4", unit: "%" } };

describe("the spec is the one this package implements", () => {
  it("is Card.yaml specVersion 2", () => {
    expect(spec.specVersion).toBe(2);
    expect([...cardVariants]).toEqual(propValues(spec, "variant"));
    expect([...cardActions]).toEqual(propValues(spec, "action"));
    expect([...cardSizes]).toEqual(propValues(spec, "size"));
  });
});

describe("the choices Card makes in React", () => {
  it("renders solid, vivid and glass as that Surface material, and tinted as solid (behaviors 1, 7)", () => {
    expect(cardVariants.map(surfaceMaterialOf)).toEqual(["solid", "vivid", "glass", "solid"]);
  });

  it("takes the radius cell from size and density (behavior 10)", () => {
    const densities: Density[] = ["compact", "regular", "comfortable", "watch"];
    const table = cardSizes.map((size) => densities.map((density) => radiusCellOf(size, density)));
    expect(table).toEqual([
      ["compact", "compact", "compact", "compact"],
      ["compact", "regular", "regular", "regular"],
      ["large", "large", "large", "large"],
    ]);
    // The Surface radius a cell passes on carries the same sys token as the comp token Card binds.
    for (const size of cardSizes) {
      expect(`comp.card.radius.${size}`).toBe(cell(root["radius"], size));
      expect(cell(surfaceSpec.tokens["root"]?.["radius"], surfaceRadiusOf[size])).toBe({ compact: "radius.card-compact", regular: "radius.card", large: "radius.card-large" }[size]);
    }
  });
});

describe("Card.css binds what Card.yaml binds", () => {
  it.each(["solid", "tinted", "glass"] as const)("root.background of %s while its Surface renders it", (variant) => {
    const material = surfaceMaterialOf(variant);
    expect(cascade.value(card({ "data-ds-variant": variant, "data-ds-material": material }), "--ds--surface-fill")).toBe(bound(cell(root["background"], variant)));
  });

  it("no glass fill under the glass fallback", () => {
    expect(cascade.value(card({ "data-ds-variant": "glass", "data-ds-material": "raised" }), "--ds--surface-fill")).toBeUndefined();
  });

  it.each(["default", "1", "2", "3", "4"])("root.gradient of slot %s", (slot) => {
    expect(cascade.value(card({ "data-ds-variant": "vivid", "data-ds-vivid": slot }), "--ds--surface-gradient")).toBe(bound(cell(root["gradient"], slot)));
  });

  it.each(cardSizes.map((size) => [size] as const))("root.radius of the %s cell", (size) => {
    expect(cascade.value(card({ "data-ds-card-radius": size }), "--ds--surface-radius-own")).toBe(bound(cell(root["radius"], size)));
  });

  it("root.padding and root.shadow", () => {
    expect(cascade.value(card({ "data-ds-padding": "card" }), "--ds--surface-padding")).toBe(bound(cell(root["padding"])));
    for (const variant of cardVariants) {
      expect(cascade.value(card({ "data-ds-variant": variant }), "--ds--surface-shadow"), variant).toBe(bound(cell(root["shadow"], variant)));
    }
  });

  it.each(["solid", "vivid", "glass", "inverse", "raised"])("selected.shadow and selected.border on %s", (material) => {
    const selected = block(root["selected"]);
    const state = card({ "data-ds-variant": "glass", "data-ds-material": material, "data-ds-selected": "" });
    expect(cascade.value(state, "--ds--surface-shadow")).toBe(bound(cell(selected["shadow"])));
    expect(cascade.value(state, "--ds--card-outline")).toBe(bound(cell(selected["border"], material)) ?? "transparent");
  });

  it("the outline is drawn at border.strong over the edge and crossfades with the lift", () => {
    const after = declarationsOf(rules, ".ds-card::after");
    expect(after["box-shadow"]).toBe("inset 0 0 0 var(--ds-border-strong) var(--ds--card-outline)");
    expect(after["transition"]).toBe("box-shadow var(--ds--card-select-duration) var(--ds-motion-spring-smooth-easing)");
  });

  it("hover.overlay on solid and tinted under ds-pointer; pressed.overlay on every variant", () => {
    const overlay = bound(cell(block(root["hover"])["overlay"]));
    const hover = '.ds-card:is([data-ds-variant="solid"], [data-ds-variant="tinted"])[data-hovered] > [data-ds-slot="card-overlay"]';
    expect(declared(hover, "background-color", "ds-pointer")).toBe(overlay);
    expect(rules.filter((rule) => rule.selectors.some((selector) => selector.includes("[data-hovered]") && selector.includes('"vivid"')))).toEqual([]);
    expect(declared('.ds-card[data-pressed] > [data-ds-slot="card-overlay"]', "background-color")).toBe(bound(cell(block(root["pressed"])["overlay"])));
  });

  it("cuts the glass bloom out of the header block (Surface.yaml behavior, ADR-0030 §4.4)", () => {
    // "Like the grain, the glass bloom is left out of the card header block, so it never lightens the
    // fill under the text whose pair tools/contrast checks on the flat material." The header block is
    // the card's, so the cut is here; Surface.css makes the same cut in the grain of every recipe.
    expect((surfaceSpec.behavior ?? []).join("\n")).toContain("the glass bloom is left out of the card header block");
    // ADR-0022 §4.1's V2 geometry: from the padding, W - 2p - size.control.md - space.5 across and
    // space.12 down, excluded from the full box — the same figures Surface.css pins for the grain.
    const selector = '.ds-card:is([data-ds-material="glass"], [data-ds-material="glassLight"]) > [data-ds-slot="surface-bloom"]';
    const squeeze = (value: string | undefined): string => (value ?? "").replaceAll(/\s+/gu, " ");
    const padding = `var(${cssVariable("space.card-padding")})`;
    expect(squeeze(declared(selector, "mask-image"))).toMatch(/^linear-gradient\(.+\), linear-gradient\(.+\)$/);
    expect(squeeze(declared(selector, "mask-size"))).toBe(
      `calc(100% - 2 * ${padding} - var(${cssVariable("size.control.md")}) - var(${cssVariable("space.5")})) var(${cssVariable("space.12")}), 100% 100%`,
    );
    expect(squeeze(declared(selector, "mask-position"))).toBe(`${padding} ${padding}, 0 0`);
    expect(declared(selector, "mask-repeat")).toBe("no-repeat");
    expect(declared(selector, "mask-composite")).toBe("exclude");
  });

  it("focus-visible.ring at ringWidth, following the card radius", () => {
    const focus = block(root["focus-visible"]);
    expect(declared('.ds-card[data-ds-action="open"]:focus-visible', "outline")).toBe(`${bound(cell(focus["ringWidth"]))} solid ${bound(cell(focus["ring"]))}`);
  });

  it.each(["solid", "vivid", "glass", "glassLight", "inverse"])("title.color and caption.color on %s", (material) => {
    const title = spec.tokens["title"]?.["color"];
    const caption = spec.tokens["caption"]?.["color"];
    expect(declared(heading(material, "title"), "color")).toBe(bound(cell(title, material)));
    if (material === "glass") {
      for (const backdrop of ["map", "image", "vivid"]) {
        expect(declared(heading(material, "caption", backdrop), "color"), backdrop).toBe(bound(cell(caption, material, backdrop)));
      }
    } else {
      expect(declared(heading(material, "caption"), "color")).toBe(bound(cell(caption, material)));
    }
  });

  it("title.typography and caption.typography through Text roles headline and caption", () => {
    expect(spec.tokens["title"]?.["typography"]).toBe("type.headline");
    expect(spec.tokens["caption"]?.["typography"]).toBe("type.caption");
    expect(spec.tokens["hero"]?.["typography"]).toBe("type.metric.lg");
  });

  it("action.size, action.iconSize and action.color", () => {
    const action = spec.tokens["action"] ?? {};
    const box = '.ds-card > [data-ds-slot="card-header"] > [data-ds-slot="card-action"]';
    expect(declared(box, "inline-size")).toBe(bound(cell(action["size"])));
    expect(declared(box, "block-size")).toBe(bound(cell(action["size"])));
    expect(declared(`${box} [data-ds-slot="card-action-glyph"]`, "inline-size")).toBe(bound(cell(action["iconSize"])));
    expect(declared(box, "color")).toBe(bound(cell(action["color"], "solid")));
    for (const material of ["vivid", "glass"]) {
      expect(declared(box.replace(".ds-card ", `.ds-card[data-ds-material="${material}"] `), "color"), material).toBe(bound(cell(action["color"], material)));
    }
  });

  it("action.border rings the solid circular button on vivid and glass", () => {
    const action = spec.tokens["action"] ?? {};
    const disc = '> [data-ds-slot="card-header"] > [data-ds-slot="card-action"] > .ds-card-action-button';
    for (const material of ["vivid", "glass"]) {
      expect(declared(`.ds-card[data-ds-material="${material}"] ${disc}`, "--ds--card-disc-ring"), material).toBe(bound(cell(action["border"], material)));
    }
  });

  it("iconRing.size, iconRing.border and iconRing.iconSize", () => {
    const ring = spec.tokens["iconRing"] ?? {};
    const selector = '.ds-card > [data-ds-slot="card-header"] > [data-ds-slot="card-heading"] > [data-ds-slot="card-icon-ring"]';
    expect(declared(selector, "inline-size")).toBe(bound(cell(ring["size"])));
    expect(declared(selector, "box-shadow")).toBe(`inset 0 0 0 var(--ds-border-hairline) ${bound(cell(ring["border"]))}`);
    expect(declared(`${selector} > [data-ds-slot="card-icon"]`, "inline-size")).toBe(bound(cell(ring["iconSize"])));
  });

  it("aside.gap", () => {
    expect(declared('.ds-card > [data-ds-slot="card-footer"]', "gap")).toBe(bound(cell(spec.tokens["aside"]?.["gap"])));
  });

  it("the open glyph hides under ds-pointer until hover, press or focus; touch always shows it", () => {
    const hidden = '.ds-card[data-ds-action="open"] > [data-ds-slot="card-header"] > [data-ds-slot="card-action"]';
    const shown = '.ds-card[data-ds-action="open"]:is([data-hovered], [data-pressed], :focus-visible) > [data-ds-slot="card-header"] > [data-ds-slot="card-action"]';
    expect(declared(hidden, "opacity", "ds-pointer")).toBe("0");
    expect(declared(shown, "opacity", "ds-pointer")).toBe("1");
    expect(declared(hidden, "opacity")).toBeUndefined();
  });

  it("presses on motion.spring.snappy and selects on motion.spring.smooth, crossfading under Reduce Motion", () => {
    expect(spec.motion?.["press"]).toBe("motion.spring.snappy");
    expect(spec.motion?.["select"]).toBe("motion.spring.smooth");
    const base = declarationsOf(rules, ".ds-card");
    expect(base["--ds--surface-scale-duration"]).toBe("var(--ds-motion-spring-snappy-duration)");
    expect(base["--ds--surface-scale-easing"]).toBe("var(--ds-motion-spring-snappy-easing)");
    expect(base["--ds--card-press-scale"]).toBe("calc(1 - 0.02 * (1 - var(--ds-motion-presentation-crossfade)))");
    expect(base["--ds--card-select-duration"]).toContain("var(--ds-motion-spring-smooth-duration) * (1 - var(--ds-motion-presentation-crossfade))");
    expect(base["--ds--card-select-duration"]).toContain("var(--ds-motion-duration-base) * var(--ds-motion-presentation-crossfade)");
    expect(base["--ds--surface-shadow-duration"]).toBe("var(--ds--card-select-duration)");
    expect(declared(".ds-card[data-pressed]", "scale")).toBe("var(--ds--card-press-scale)");
  });
});

describe("Card renders", () => {
  it("action open: one button labelled by title, caption and hero value", () => {
    const out = html(<Card {...metric} />);
    const tag = rootTag(out);
    expect(tag).toContain('role="button"');
    expect(tag).toContain('tabindex="0"');
    expect(tag).toContain('class="ds-surface ds-card"');
    expect(tag).toContain('data-ds-material="solid"');
    const ids = /aria-labelledby="([^"]+)"/.exec(tag)?.[1]?.split(" ") ?? [];
    expect(ids).toHaveLength(3);
    const text = (id: string): string => new RegExp(`id="${id}"[^>]*>(.*?)</span>`).exec(out)?.[1] ?? "";
    expect(text(ids[0] ?? "")).toBe("Line output");
    expect(text(ids[1] ?? "")).toBe("Last 24 hours");
    expect(out).toMatch(new RegExp(`id="${ids[2] ?? ""}"[^>]*><span data-ds-slot="text-label">86.4 %</span>`));
    expect(out).toContain('data-ds-icon="nav.open"');
    expect(out).not.toContain("<button");
  });

  it("action custom: a group whose one button is labelled by the title; action none: a group", () => {
    const custom = html(<Card title="Queued" action="custom" />);
    expect(rootTag(custom)).toContain('role="group"');
    expect(rootTag(custom)).not.toContain("tabindex");
    const button = /<button ([^>]*)>/.exec(custom)?.[1] ?? "";
    const titleId = /id="([^"]+)"[^>]*>Queued</.exec(custom)?.[1];
    expect(button).toContain(`aria-labelledby="${titleId ?? ""}"`);
    expect(button).toContain('class="ds-card-action-button"');
    const none = html(<Card title="Queued" action="none" />);
    expect(rootTag(none)).toContain('role="group"');
    expect(none).not.toContain("card-action");
  });

  it("V3 on vivid: the unit joins the caption line, the hero holds the value, no icon ring", () => {
    const out = html(<Card variant="vivid" title="Average yield" caption="Per batch" icon="object.gps" hero={{ value: "2,450", unit: "USD" }} />);
    expect(out).toMatch(/Per batch<span data-ds-slot="card-caption-unit" data-ds-after-caption="">USD<\/span>/);
    expect(out).not.toContain("text-unit");
    expect(out).not.toContain("card-icon-ring");
    expect(rootTag(out)).toContain('data-ds-vivid="default"');
    const off = html(<Card title="Sensor" icon="object.gps" hero={{ value: "37", unit: "%" }} />);
    expect(off).toContain("card-icon-ring");
    expect(off).toContain('data-ds-slot="text-unit"');
  });

  it("the radius cell from size and the density of <Theme>", () => {
    expect(rootTag(html(<Card title="A" />, { density: "compact" }))).toContain('data-ds-card-radius="compact"');
    expect(rootTag(html(<Card title="A" />, { density: "regular" }))).toContain('data-ds-card-radius="regular"');
    expect(rootTag(html(<Card title="A" size="large" />, { density: "compact" }))).toContain('data-ds-card-radius="large"');
    expect(rootTag(html(<Card title="A" size="compact" />, { density: "regular" }))).toContain('data-ds-card-radius="compact"');
  });

  it("glass through Surface: the fallback, and a selected card under it publishes inverse", () => {
    expect(rootTag(html(<Card variant="glass" backdrop="image" title="Unit" />))).toContain('data-ds-material="glass"');
    expect(rootTag(html(<Card variant="glass" backdrop="image" title="Unit" />, { contrast: "more" }))).toContain('data-ds-material="raised"');
    const selected = rootTag(html(<Card variant="glass" backdrop="image" title="Unit" isSelected />, { contrast: "more" }));
    expect(selected).toContain('data-ds-material="inverse"');
    expect(selected).toContain('data-ds-selected=""');
    expect(rootTag(html(<Card variant="tinted" title="Sensor" />))).toContain('data-ds-variant="tinted"');
  });

  it("the body and aside slots, in anatomy order", () => {
    const out = html(
      <Card {...metric} aside={<i>aside</i>}>
        <b>body</b>
      </Card>,
    );
    const order = ["card-overlay", "card-header", "card-heading", "card-action", "card-body", "card-footer", "card-hero", "card-aside"].map((slot) =>
      slot === "card-hero" ? out.indexOf("ds-card-hero") : out.indexOf(`data-ds-slot="${slot}"`),
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(out).toContain('<div data-ds-slot="card-body"><b>body</b></div>');
    expect(out).toContain('<div data-ds-slot="card-aside"><i>aside</i></div>');
  });

  it("forwards ScopeAttributes to the root (ADR-0019 rule 8)", () => {
    const tag = rootTag(html(<Card title="A" data-ds-color-scheme="dark" data-ds-density="regular" />));
    expect(tag).toContain('data-ds-color-scheme="dark"');
    expect(tag).toContain('data-ds-density="regular"');
  });
});
