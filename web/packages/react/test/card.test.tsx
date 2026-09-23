/// <reference types="node" />
/**
 * Card (spec/components/Card.yaml, specVersion 5).
 *
 * - Card.css binds what Card.yaml binds: the fills, gradients, radius cells, padding and shadows by
 *   variant; the selection lift and outline, title, caption and action colors by published material
 *   (and on glass by backdrop kind); the custom disc's own fill, glyph color and ring, keyed by the
 *   published material and taken from Card's cells rather than from comp.icon-button.*; the icon ring,
 *   the action and the aside.
 * - The two choices Card makes in React: the Surface material of a variant and the radius cell.
 * - Server renders: one button when `action: open` carries a handler, a group otherwise, and a custom
 *   action's circle with its own glyph and its own name; V3 on vivid; the glass fallback and selection
 *   through Surface; ScopeAttributes.
 * - `accessibility.label` as one string per spec example, the table the Apple suite carries for the
 *   same ids (`accessibleName` in swift/Tests/DSComponentsTests/DSCardBindingTests.swift).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Card, cardActions, cardSizes, cardVariants, type CardProps, type IconName } from "../src/index.ts";
import {
  cardAccessibleName,
  cardActionKind,
  cardCaptionLine,
  cardCaptionLines,
  cardNameSeparator,
  cardSpokenHero,
  cardTitleLines,
  cardUnitSeparator,
  isCardPressable,
  radiusCellOf,
  surfaceMaterialOf,
  surfaceRadiusOf,
} from "../src/card/parts.ts";
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

/**
 * The disc's winning value for a property on a card of the published material: the rule keyed to that
 * material when the sheet writes one, and the base `.ds-card-action-button` rule otherwise.
 */
function discValue(material: string, property: string): string | undefined {
  const scoped = `.ds-card[data-ds-material="${material}"] > [data-ds-slot="card-header"] > [data-ds-slot="card-action"] > .ds-card-action-button`;
  return declared(scoped, property) ?? declared(".ds-card-action-button", property);
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
const noop = (): void => undefined;
/** A custom action, with the `actionIcon` and the `actionLabel` Card.yaml requires of one. */
const pause = { kind: "custom", icon: "action.pause", label: "Pause line 4" } as const;

describe("the spec is the one this package implements", () => {
  it("is Card.yaml specVersion 5", () => {
    expect(spec.specVersion).toBe(5);
    expect([...cardVariants]).toEqual(propValues(spec, "variant"));
    expect([...cardActions]).toEqual(propValues(spec, "action"));
    expect([...cardSizes]).toEqual(propValues(spec, "size"));
  });

  it("bundles `action`, `actionIcon` and `actionLabel` into one value, as the spec licenses", () => {
    // specVersion 3 declares the glyph and the name as props of their own, "both required with
    // `action: custom` and never inferred", and licenses a stack to carry the three in one value "as
    // long as `custom` cannot be written without them". `CardCustomAction` is that value, and the
    // compile-error cases in "names a custom action" below prove the condition holds.
    const names = spec.props.map((prop) => prop.name);
    expect(names).toContain("actionIcon");
    expect(names).toContain("actionLabel");
    const action = spec.props.find((prop) => prop.name === "action") as { readonly description?: string } | undefined;
    expect(action?.description ?? "").toContain("a stack may bundle the three into one value");
    expect(Object.keys(pause).sort()).toEqual(["icon", "kind", "label"]);
  });
});

describe("the choices Card makes in React", () => {
  it("renders solid, vivid and glass as that Surface material, and tinted as solid (behaviors 1, 10)", () => {
    expect(cardVariants.map(surfaceMaterialOf)).toEqual(["solid", "vivid", "glass", "solid"]);
  });

  it("takes the radius cell from size and density (behavior 13)", () => {
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

  it("action.border rings the solid circular disc on vivid and glass", () => {
    const action = spec.tokens["action"] ?? {};
    for (const material of ["vivid", "glass"]) {
      expect(discValue(material, "--ds--card-disc-ring"), material).toBe(bound(cell(action["border"], material)));
    }
    // A material with no `border` cell leaves the disc unringed.
    expect(discValue("solid", "--ds--card-disc-ring")).toBe("transparent");
  });

  it("action.fill and action.glyphColor key the disc to the published material: only vivid takes the media pair (behavior 6)", () => {
    // The spec keys both cells by the material the Surface publishes, with `default` on
    // color.bg.fill.inverse / color.text.on-inverse and only `vivid` on the media pair. The scheme's
    // glass keeps the scheme's own inverse (ADR-0029 §1, §1.6; ADR-0030 §3.1-3.2), so it resolves
    // through `default` and the stylesheet writes no glass rule for it at all.
    const action = spec.tokens["action"] ?? {};
    expect(cell(action["fill"], "glass")).toBe(cell(action["fill"], "solid"));
    expect(cell(action["glyphColor"], "glass")).toBe(cell(action["glyphColor"], "solid"));
    for (const material of ["solid", "vivid", "glass", "glassLight", "inverse", "raised"]) {
      expect(discValue(material, "--ds--card-disc-fill"), material).toBe(bound(cell(action["fill"], material)));
      expect(discValue(material, "color"), material).toBe(bound(cell(action["glyphColor"], material)));
    }
    expect(discValue("vivid", "--ds--card-disc-fill")).toBe("var(--ds-color-bg-fill-inverse-media)");
    expect(discValue("glass", "--ds--card-disc-fill")).toBe("var(--ds-color-bg-fill-inverse)");
  });

  it("binds Card's own cells for the disc, never another component's comp tokens (ADR-0024 §5.2)", () => {
    expect(css).not.toContain("--ds-icon-button-");
  });

  it("action.borderWidth draws the disc's ring at border.hairline", () => {
    const action = spec.tokens["action"] ?? {};
    expect(declarationsOf(rules, ".ds-card-action-button")["box-shadow"]).toBe(`inset 0 0 0 ${bound(cell(action["borderWidth"]))} var(--ds--card-disc-ring)`);
  });

  it("iconRing.size, iconRing.border and iconRing.iconSize", () => {
    const ring = spec.tokens["iconRing"] ?? {};
    const selector = '.ds-card > [data-ds-slot="card-header"] > [data-ds-slot="card-heading"] > [data-ds-slot="card-icon-ring"]';
    expect(declared(selector, "inline-size")).toBe(bound(cell(ring["size"])));
    expect(declared(selector, "box-shadow")).toBe(`inset 0 0 0 var(--ds-border-hairline) ${bound(cell(ring["border"]))}`);
    expect(declared(`${selector} > [data-ds-slot="card-icon"]`, "inline-size")).toBe(bound(cell(ring["iconSize"])));
  });

  it("the action box and the header gap: one geometry for both stacks (behavior 14)", () => {
    // The two cells behavior 14 names, read from the spec and pinned against the sheet. Apple asserts the
    // same pair against `Card.yaml` and its own functions (DSCardBindingTests.headerEndsAtTheV2Block), so
    // the number cannot move on one side alone: the action is one `action.size` box for either affordance
    // and the heading is `header.gap` away from it.
    const box = cell(spec.tokens["action"]?.["size"]);
    const gap = cell(spec.tokens["header"]?.["gap"]);
    expect(box).toBe("size.control.md");
    expect(gap).toBe("space.5");
    const action = '.ds-card > [data-ds-slot="card-header"] > [data-ds-slot="card-action"]';
    expect(declared('.ds-card > [data-ds-slot="card-header"]', "gap")).toBe(bound(gap));
    expect(declared(action, "inline-size")).toBe(bound(box));
    expect(declared(action, "place-items")).toBe("center");
  });

  it("on vivid the heading reserves the V2 header block even with no affordance (behavior 14)", () => {
    // `DSCardAppearance.headerTrailingSpace(on: .vivid, actionWidth:_:)` returns size.control.md + space.5
    // whatever the action; with no action slot the heading is the header's only child, so the web reserves
    // the same block as its own padding. Below it the caption would sit over the grain, which Surface cuts
    // out of exactly this rectangle (Surface.css, ADR-0030 §4.4).
    const heading = '.ds-card[data-ds-material="vivid"] > [data-ds-slot="card-header"] > [data-ds-slot="card-heading"]:only-child';
    const reserve = `calc(${bound(cell(spec.tokens["action"]?.["size"]))} + ${bound(cell(spec.tokens["header"]?.["gap"]))})`;
    expect(declared(heading, "padding-inline-end")).toBe(reserve);
    // The same pair the bloom and the grain masks measure, so the text block and the cut-out cannot drift.
    const mask = declared('.ds-card:is([data-ds-material="glass"], [data-ds-material="glassLight"]) > [data-ds-slot="surface-bloom"]', "mask-size") ?? "";
    expect(mask).toContain("var(--ds-size-control-md) - var(--ds-space-5)");
  });

  it("aside.gap", () => {
    expect(declared('.ds-card > [data-ds-slot="card-footer"]', "gap")).toBe(bound(cell(spec.tokens["aside"]?.["gap"])));
  });

  it("the open glyph hides under ds-pointer until hover, press or focus; touch always shows it", () => {
    // These rules only ever meet a slot a pressable card rendered (behavior 4); Card.tsx draws none
    // without a handler, so there is nothing to reveal and nothing to hide.
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
    expect(base["--ds--card-press-scale"]).toBe("calc(1 - 0.03 * (1 - var(--ds-motion-presentation-crossfade)))");
    expect(base["--ds--card-select-duration"]).toContain("var(--ds-motion-spring-smooth-duration) * (1 - var(--ds-motion-presentation-crossfade))");
    expect(base["--ds--card-select-duration"]).toContain("var(--ds-motion-duration-base) * var(--ds-motion-presentation-crossfade)");
    expect(base["--ds--surface-shadow-duration"]).toBe("var(--ds--card-select-duration)");
    expect(declared(".ds-card[data-pressed]", "scale")).toBe("var(--ds--card-press-scale)");
  });

  it("presses at 0.97, the magnitude every Prism control shares (behavior 16)", () => {
    // Behavior 16 states the number, and the card, its custom disc and Button's pill all take it: before
    // specVersion 5 a pressed card shrank to 0.98 here and to 0.97 on Apple, which `motion.press` alone could
    // not see. `DSCardAppearance.pressedScale` is the same 0.97 on the Apple side.
    expect((spec.behavior ?? []).join("\n")).toContain("A press scales the whole card to 0.97");
    const magnitude = (value: string | undefined): string | undefined => /calc\(1 - ([\d.]+) \*/u.exec(value ?? "")?.[1];
    const base = declarationsOf(rules, ".ds-card");
    expect(magnitude(base["--ds--card-press-scale"])).toBe("0.03");
    expect(magnitude(declarationsOf(rules, ".ds-card-action-button")["--ds--card-disc-scale"])).toBe("0.03");
    const button = readFileSync(join(packageRoot, "src", "button", "Button.css"), "utf8");
    expect(magnitude(/--ds--button-press-scale:\s*([^;]+);/u.exec(button)?.[1])).toBe("0.03");
  });

  it("root.gap is the minimum between the rows of the anatomy (behavior 17)", () => {
    // The cell both stacks read: `row-gap` here, `DSCardAppearance.rowGap` on Apple
    // (`swift/Tests/DSComponentsTests/DSCardBindingTests.swift`, "theAnatomyRowsAreOneGapApart"). The body
    // absorbs the slack of a card taller than its content, and with no body the footer's auto margin does, so a
    // content-sized card keeps the gaps and nothing else — the layout `Spacer(minLength: 0)` gives on Apple.
    expect(cell(root["gap"])).toBe("space.4");
    expect(declared(".ds-card", "row-gap")).toBe(bound(cell(root["gap"])));
    expect(declared('.ds-card > [data-ds-slot="card-body"]', "flex")).toBe("1 1 auto");
    expect(declared('.ds-card > [data-ds-slot="card-footer"]', "margin-block-start")).toBe("auto");
    // The unit is separated by text, not by a margin (behavior 9), so the sheet gives its slot no rule at all.
    expect(rules.filter((rule) => rule.selectors.some((selector) => selector.includes("card-caption-unit")))).toEqual([]);
  });
});

describe("Card renders", () => {
  it("action open: one button named by its title, caption line and hero", () => {
    const out = html(<Card {...metric} onAction={noop} />);
    const tag = rootTag(out);
    expect(tag).toContain('role="button"');
    expect(tag).toContain('tabindex="0"');
    expect(tag).toContain('class="ds-surface ds-card"');
    expect(tag).toContain('data-ds-material="solid"');
    // The name is the composed string, not a list of ids: `aria-labelledby` concatenates what it
    // references with a space, and the rule joins with a comma (Card.yaml `accessibility.label`).
    expect(tag).toContain('aria-label="Line output, Last 24 hours, 86.4 %"');
    expect(tag).not.toContain("aria-labelledby");
    // Every part of the name is on screen, in the elements the card draws.
    expect(out).toContain(">Line output</span>");
    expect(out).toContain(">Last 24 hours</span>");
    expect(out).toContain('<span data-ds-slot="text-label">86.4 %</span>');
    expect(out).toContain('data-ds-icon="nav.open"');
    expect(out).not.toContain("<button");
  });

  it("action custom: a group whose one button carries the action's own glyph and name; action none: a group", () => {
    const custom = html(<Card title="Queued" action={pause} onAction={noop} />);
    expect(rootTag(custom)).toContain('role="group"');
    expect(rootTag(custom)).not.toContain("tabindex");
    expect(rootTag(custom)).toContain('data-ds-action="custom"');
    const button = /<button ([^>]*)>/.exec(custom)?.[1] ?? "";
    expect(button).toContain('aria-label="Pause line 4"');
    expect(button).not.toContain("aria-labelledby");
    expect(button).toContain('class="ds-card-action-button"');
    // The glyph is the operation's, not nav.open: Card.yaml's `actionIcon` and `actionLabel` are both
    // required with `action: custom` and never inferred, from the card or from each other.
    expect(custom).toContain('data-ds-icon="action.pause"');
    expect(custom).not.toContain('data-ds-icon="nav.open"');
    const none = html(<Card title="Queued" action="none" />);
    expect(rootTag(none)).toContain('role="group"');
    expect(none).not.toContain("card-action");
  });

  it("a card with no handler is neither announced nor focusable as a control, and draws no open glyph (behavior 4)", () => {
    // Card.yaml: "role: button when pressable (`action: open` with an `onAction`), otherwise group".
    // `action: open` alone activates nothing, so it is not pressable — the rule
    // `DSCardAppearance.isPressable(_:hasAction:)` states on the Apple side.
    const open = html(<Card {...metric} />);
    expect(rootTag(open)).toContain('role="group"');
    expect(rootTag(open)).not.toContain("tabindex");
    expect(rootTag(open)).not.toContain("data-pressed");
    expect(rootTag(open)).not.toContain("data-hovered");
    // Behavior 4: the glyph is the cue that the card opens, so a card with nothing to open draws no
    // glyph and no control — not a zero-opacity slot, which touch would still show. The header is then
    // laid out as `action: none` lays it out, which is the markup `action: none` produces.
    expect(open).not.toContain('data-ds-slot="card-action"');
    expect(open).not.toContain('data-ds-icon="nav.open"');
    expect(html(<Card {...metric} action="none" />).replaceAll(/ data-ds-action="[a-z]+"/gu, "")).toBe(open.replaceAll(/ data-ds-action="[a-z]+"/gu, ""));
    // The group is named by its title alone; only the pressable card takes the title, caption and hero
    // line, and the caption and hero are then read as the elements they are (accessibility.label).
    expect(rootTag(open)).toContain('aria-label="Line output"');
    // The custom circle is the same rule one level down: with nothing to press it keeps its look and
    // its name and stops being a button (`DSCardActionCircle` draws the bare disc when its action is nil).
    const custom = html(<Card title="Queued" action={pause} />);
    expect(custom).not.toContain("<button");
    expect(custom).toContain('role="img"');
    expect(custom).toContain('aria-label="Pause line 4"');
    expect(custom).toContain('class="ds-card-action-button"');
    expect(custom).toContain('data-ds-icon="action.pause"');
  });

  it("states pressability once, for both stacks (isCardPressable)", () => {
    const table = ([true, false] as const).map((hasAction) => (["none", "open", pause] as const).map((action) => isCardPressable(action, hasAction)));
    expect(table).toEqual([
      [false, true, false],
      [false, false, false],
    ]);
    expect((["none", "open", pause] as const).map(cardActionKind)).toEqual(["none", "open", "custom"]);
  });

  it("names a custom action or says so, where the types cannot reach (Card.yaml `actionLabel`, ADR-0011 rule 4)", () => {
    // The type makes the bare string "custom" and a payload without a label or an icon a compile
    // error, which is the check for a TypeScript caller:
    // @ts-expect-error an action kind with no glyph and no name is not a value of this prop
    const bare: CardProps["action"] = "custom";
    expect(bare).toBe("custom");
    // @ts-expect-error a custom action without a label
    const unnamed: CardProps["action"] = { kind: "custom", icon: "action.pause" };
    expect(unnamed).toBeDefined();
    // An untyped caller, or a label built at runtime, still reaches the component, so it says so in
    // development — on the server too, where no effect runs and the unnamed control would just ship.
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      html(<Card title="Queued" action={{ kind: "custom", icon: "action.pause", label: "  " }} onAction={noop} />);
      expect(errors.mock.calls.flat().join(" ")).toContain("needs a `label`");
      errors.mockClear();
      html(<Card title="Queued" action={{ kind: "custom", icon: "action.pause", label: "Pause line 4" }} onAction={noop} />);
      expect(errors).not.toHaveBeenCalled();
      // An id outside the registry has no glyph to draw. The glyph is Icon's box, which never throws
      // (Icon.yaml behavior 1: the types fail the build); it draws the disc with an empty box, and both the
      // card and the box say which id it was.
      const unknown = html(<Card title="Queued" action={{ kind: "custom", icon: "no.such.icon" as IconName, label: "Pause line 4" }} onAction={noop} />);
      expect(unknown).toContain('aria-label="Pause line 4"');
      expect(unknown).toMatch(/<span class="ds-icon" data-ds-slot="card-action-glyph" data-ds-icon="no.such.icon" [^>]*><\/span>/);
      expect(errors.mock.calls.flat().join(" ")).toContain("is not an id of the icon registry");
      expect(errors.mock.calls.flat().join(" ")).toContain('Icon: "no.such.icon"');
    } finally {
      errors.mockRestore();
    }
  });

  it("V3 on vivid: the unit joins the caption line with the separator, the hero holds the value, no icon ring", () => {
    // Behavior 9: one separator, the same string Apple writes (`DSCardAppearance.unitSeparator`), inside the
    // caption's own text — so the caption reads "Per batch · USD" and not "Per batchUSD", which is what a
    // margin-only gap announced and what a pressable card's single name then carried.
    expect(cardUnitSeparator).toBe(" · ");
    expect((spec.behavior ?? []).join("\n")).toContain("a space, a middle dot and a space");
    expect((spec.behavior ?? []).join("\n")).toContain("`Dollars per batch · kg`");
    const out = html(<Card variant="vivid" title="Average yield" caption="Per batch" icon="object.gps" hero={{ value: "2,450", unit: "USD" }} />);
    expect(out).toContain(`Per batch<span data-ds-slot="card-caption-unit">${cardUnitSeparator}USD</span>`);
    // What the caption element reads as text, which is what a screen reader announces and what
    // `cardCaptionLine` puts into a pressable card's name.
    const captionMarkup = /ds-card-caption[^>]*>(.*?)<\/span><\/span>/u.exec(out)?.[1] ?? "";
    expect(captionMarkup.replaceAll(/<[^>]*>/gu, "")).toBe(`Per batch${cardUnitSeparator}USD`);
    // With no caption of its own the unit stands alone, with no leading separator.
    const unitOnly = html(<Card variant="vivid" title="Average yield" hero={{ value: "2,450", unit: "USD" }} />);
    expect(unitOnly).toContain('<span data-ds-slot="card-caption-unit">USD</span>');
    expect(out).not.toContain("text-unit");
    expect(out).not.toContain("card-icon-ring");
    expect(rootTag(out)).toContain('data-ds-vivid="default"');
    const off = html(<Card title="Sensor" icon="object.gps" hero={{ value: "37", unit: "%" }} />);
    expect(off).toContain("card-icon-ring");
    expect(off).toContain('data-ds-slot="text-unit"');
  });

  it("draws every glyph through Icon's box: the ring in Icon's primary tone, the action in the color around it", () => {
    // One glyph path in the system (Icon.yaml): the ring's glyph is `size.icon.md` in the primary tone, which
    // Icon.css resolves against the material the card publishes, as `DSCardIconRing` draws
    // `DSGlyphTone.primary`; the action glyph is `size.icon.sm` with `tone: inherit`, so `action.color` and
    // the disc's glyph color still reach it. None of them has a `label`, so all are hidden.
    const glyphs = (out: string): string[] => [...out.matchAll(/<span (class="ds-icon"[^>]*)>/gu)].map((match) => match[1] ?? "");
    const open = glyphs(html(<Card title="Sensor" caption="Active" icon="object.gps" onAction={noop} />));
    expect(open).toHaveLength(2);
    expect(open[0]).toContain('data-ds-slot="card-icon" data-ds-icon="object.gps" data-ds-size="md" data-ds-surface="solid"');
    expect(open[0]).toContain('data-ds-tone="primary"');
    expect(open[1]).toContain('data-ds-slot="card-action-glyph" data-ds-icon="nav.open" data-ds-size="sm"');
    expect(open[1]).not.toContain("data-ds-tone");
    const custom = glyphs(html(<Card title="Queued" action={pause} onAction={noop} />));
    expect(custom).toHaveLength(1);
    expect(custom[0]).toContain('data-ds-slot="card-action-glyph" data-ds-icon="action.pause" data-ds-size="sm"');
    expect(custom[0]).not.toContain("data-ds-tone");
    for (const glyph of [...open, ...custom]) {
      expect(glyph).toContain('aria-hidden="true"');
      expect(glyph).not.toContain("role=");
    }
  });

  it("clamps the title to two lines and the caption to one, with an ellipsis (behavior 15)", () => {
    // The header block's budget, the same two numbers `DSCardAppearance.titleLines` and `.captionLines`
    // clamp to on Apple: Text's `ellipsis` truncation with `--ds--text-max-lines`. Without it a long title
    // grew the header past the block and pushed the hero out of a card whose size the grid sets.
    expect(cardTitleLines).toBe(2);
    expect(cardCaptionLines).toBe(1);
    const out = html(<Card {...metric} />);
    const title = /<[^>]*class="ds-text ds-card-title"[^>]*>/.exec(out)?.[0] ?? "";
    const caption = /<[^>]*class="ds-text ds-card-caption"[^>]*>/.exec(out)?.[0] ?? "";
    expect(title).toContain('data-ds-truncation="ellipsis"');
    expect(title).toContain(`--ds--text-max-lines:${cardTitleLines}`);
    expect(caption).toContain('data-ds-truncation="ellipsis"');
    expect(caption).toContain(`--ds--text-max-lines:${cardCaptionLines}`);
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
    // Pressable, so the whole anatomy is drawn: the action slot is the pressable card's (behavior 4).
    const out = html(
      <Card {...metric} onAction={noop} aside={<i>aside</i>}>
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

/**
 * Card.yaml `accessibility.label`, the one composition both stacks write: the title, the caption line and
 * the hero, in reading order, joined by `cardNameSeparator`, with a part the card does not draw left out
 * along with its separator. The Apple twin is `DSCardName.spoken(title:caption:)`, pinned over the same
 * examples by `accessibleName` in `swift/Tests/DSComponentsTests/DSCardBindingTests.swift`; the strings
 * below are the ones that suite expects, so a change on one stack fails on both.
 */
describe("the accessible name (Card.yaml accessibility.label)", () => {
  /** Every `examples[]` entry of the spec, by id. Each one is pressable: SCHEMA.md gives it its handler. */
  const names: Readonly<Record<string, string>> = {
    "solid-metric": "Line output, Last 24 hours, 86.4 %",
    "vivid-default-kpi": "Average yield, Dollars per batch, $2,450",
    "vivid-pair": "Average yield",
    "glass-vehicle": "Unit 4417, 21.11.2026, 14:05:22",
    "glass-selected": "Unit 4417",
    "tinted-focus": "Sensor, Active",
    compact: "Queued, 37",
  };

  it("is composed, and the spec says how", () => {
    expect(cardNameSeparator).toBe(", ");
    const label = spec.accessibility?.label ?? "";
    expect(label).toContain("joined by a comma and a space");
    // The rule's own worked examples, so the sentence and this table cannot drift apart.
    for (const id of ["solid-metric", "vivid-default-kpi", "glass-vehicle", "compact"]) expect(label).toContain(names[id]);
    expect(label).toContain("Average yield, Per batch · kg, 2,450");
  });

  it("names every spec example the way the rule composes it, and says it in the DOM", () => {
    expect(spec.examples.map((example) => example.id).sort()).toEqual(Object.keys(names).sort());
    for (const example of spec.examples) {
      // The spec's props are YAML, so their shape is the spec's word; the render below is the check.
      const props = example.props as unknown as CardProps;
      const expected = names[example.id];
      expect(cardAccessibleName({ ...props, variant: props.variant ?? "solid", pressable: true }), example.id).toBe(expected);
      expect(rootTag(html(<Card {...props} onAction={noop} />)), example.id).toContain(`aria-label="${expected}"`);
    }
  });

  it("puts the vivid unit on the caption line and not after the hero (behavior 9), with or without a caption", () => {
    // The reading the two stacks had split over: the unit is drawn on the caption line, so that is where
    // the name says it, once. `DSCardParts.spokenHero` drops it from the hero on vivid for the same reason.
    const withCaption: CardProps = { variant: "vivid", title: "Average yield", caption: "Per batch", hero: { value: "2,450", unit: "kg" } };
    const withoutCaption: CardProps = { variant: "vivid", title: "Average yield", hero: { value: "2,450", unit: "kg" } };
    const name = (props: CardProps): string => /aria-label="([^"]*)"/u.exec(rootTag(html(<Card {...props} onAction={noop} />)))?.[1] ?? "";
    expect(name(withCaption)).toBe("Average yield, Per batch · kg, 2,450");
    expect(name(withoutCaption)).toBe("Average yield, kg, 2,450");
    // Off vivid the same hero hangs its own unit, so the name reads it there instead (Text's "86.4 %").
    expect(name({ ...withCaption, variant: "solid" })).toBe("Average yield, Per batch, 2,450 kg");
    expect(cardCaptionLine("Per batch", "kg", true)).toBe(`Per batch${cardUnitSeparator}kg`);
    expect(cardCaptionLine(undefined, "kg", true)).toBe("kg");
    expect(cardCaptionLine("Per batch", "kg", false)).toBe("Per batch");
    expect(cardSpokenHero({ value: "86", trailing: ".4", unit: "%" }, false)).toBe("86.4 %");
    expect(cardSpokenHero({ value: "86", trailing: ".4", unit: "%" }, true)).toBe("86.4");
  });

  it("names a card that is not pressable by its title alone", () => {
    // Its caption and hero are elements of their own inside the group, so the group's name does not say
    // them a second time (`accessibility.label`, and `DSCardParts.accessibilityName` on Apple).
    for (const action of ["none", pause] as const) {
      expect(rootTag(html(<Card {...metric} action={action} onAction={noop} />)), cardActionKind(action)).toContain('aria-label="Line output"');
    }
    expect(rootTag(html(<Card {...metric} />))).toContain('aria-label="Line output"');
    expect(cardAccessibleName({ ...metric, variant: "solid", pressable: false })).toBe("Line output");
  });
});
