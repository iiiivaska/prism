/// <reference types="node" />
/**
 * IconButton (spec/components/IconButton.yaml, specVersion 2).
 *
 * - IconButton.css binds what IconButton.yaml binds: every cell of `tokens`, read off the spec and checked as
 *   it wins on the root through a small cascade, for every variant on every published material: the rest and
 *   pressed fills, the pressed overlay, the underlay, the ring's colour and width, the glyph's colour, the
 *   selected circle (primary's cells, whatever the variant), hover, sizes, the glyph box, disabled,
 *   focus-visible and the badge's offset. The matrices are keyed by the axes the loops walk, so a cell the
 *   sheet does not map fails here.
 * - Motion: the press rides motion.spring.snappy, selection motion.spring.smooth, and ADR-0023 §8.4 arrives
 *   through --ds-motion-presentation-crossfade; the pressed fill and danger's overlay show on every press, in
 *   every motion mode, and primary's pressed fill is one lightness step from its rest in every scheme (ADR-0039).
 * - Server renders: React Aria's button with its variant, size, material and selection; the name, which is
 *   `label` and, with a badge, the badge's contribution after `iconButtonValueSeparator`; the hidden glyph and
 *   the hidden badge; no hint of any kind; ScopeAttributes.
 * - `accessibility`, per spec example: one button, named byte for byte as the table below writes, the table
 *   `DSIconButtonNameCase.all` holds on Apple (label and value). The same names are read from Chromium's own
 *   tree by web/apps/gallery/test/accessibility.browser.test.tsx.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density, type Modality, type StringsTable, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import {
  IconButton,
  Surface,
  defaultStrings,
  iconButtonSizes,
  iconButtonVariants,
  surfaceMaterials,
  type BackdropKind,
  type IconButtonBadge,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
  type SurfaceMaterial,
} from "../src/index.ts";
import { badgeContribution } from "../src/badge/text.ts";
import { iconButtonValueSeparator } from "../src/icon-button/IconButton.tsx";
import { tokenValue } from "../src/icon/weight.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss } from "./css.ts";
import { bindingAt, cell, cellName, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("IconButton");
const css = readFileSync(join(packageRoot, "src", "icon-button", "IconButton.css"), "utf8");
const cascade = new Cascade(css);
const rules = flattenRules(parseCss(css));
const root = spec.tokens["root"] ?? {};
const icon = spec.tokens["icon"] ?? {};
const noop = (): void => undefined;

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);
const block = (binding: Binding | undefined): Record<string, Binding> => (binding ?? {}) as Record<string, Binding>;
const squash = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

/**
 * A cell of IconButton.yaml read and named from one spec path and one key list, so a failure names the very cell
 * it read: `IconButton.yaml tokens.root.border [ghost, vivid]`, the Apple helper's name for it.
 */
function specCell(path: string, ...keys: readonly string[]): { readonly token: string | undefined; readonly name: string } {
  return { token: cell(bindingAt(spec, path), ...keys), name: cellName(spec, path, ...keys) };
}

/** Every material a Surface publishes: the spec keys `vivid` and `glass`, and every other one takes `default`. */
const materials = surfaceMaterials;
const variants = propValues(spec, "variant") as IconButtonVariant[];
const combinations = variants.flatMap((variant) => materials.map((material) => ({ variant, material })));

/** The root of an IconButton as the cascade sees it. */
function on(variant: string, material: string, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-icon-button"], attributes: { "data-ds-variant": variant, "data-ds-size": "md", "data-ds-surface": material, ...extra } };
}

const value = (state: Parameters<Cascade["value"]>[0], property: string): string | undefined => cascade.value(state, property);
const ZERO_WIDTH = "calc(var(--ds-border-hairline) * 0)";

interface Staging {
  readonly locale?: string;
  readonly strings?: Partial<StringsTable>;
}

function html(node: ReactNode, staging: Staging = {}): string {
  const inner = staging.locale === undefined ? node : <I18nProvider locale={staging.locale}>{node}</I18nProvider>;
  return renderToStaticMarkup(
    <Theme tokens={tokens} strings={staging.strings}>
      {inner}
    </Theme>,
  );
}

/** Text as React's server render escaped it, back to the string the button wrote. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

/** The attributes of the button's root inside a render. */
function buttonTag(out: string): string {
  const tag = /<button ([^>]*data-ds-slot="icon-button"[^>]*)>/.exec(out)?.[1];
  expect(tag, out).toBeDefined();
  return tag ?? "";
}

function attribute(tag: string, name: string): string | undefined {
  const found = new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** The accessible name the root carries. */
function nameOf(out: string): string | undefined {
  return attribute(buttonTag(out), "aria-label");
}

/** An example of IconButton.yaml, staged as the harnesses stage it: on the page, or in a Surface hugging it. */
function staged(example: (typeof spec.examples)[number]): string {
  const button = <IconButton {...(example.props as unknown as IconButtonProps)} onPress={noop} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  if (fields.surface === undefined) return html(button);
  return html(
    <Surface material={fields.surface as SurfaceMaterial} backdrop={(fields.backdrop ?? "none") as BackdropKind} radius="card">
      {button}
    </Surface>,
  );
}

function contextIn(density: Density, modality: Modality = "pointer"): TokenContext {
  return { colorScheme: "light", contrast: "standard", transparency: "standard", density, modality, motion: "standard" };
}

describe("the spec is the one this package implements", () => {
  it("is IconButton.yaml specVersion 2", () => {
    expect(spec.specVersion).toBe(2);
    expect([...iconButtonVariants]).toEqual(propValues(spec, "variant"));
    expect([...iconButtonSizes]).toEqual(propValues(spec, "size"));
  });

  it("declares the props IconButton takes, with the defaults IconButton renders", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["variant", "size", "glyph", "label", "badge", "isSelected", "isDisabled", "onPress"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ variant: "secondary", size: "md", isSelected: false, isDisabled: false });
    const tag = buttonTag(html(<IconButton glyph="action.settings" label="Open settings" onPress={noop} />));
    expect(attribute(tag, "data-ds-variant")).toBe("secondary");
    expect(attribute(tag, "data-ds-size")).toBe("md");
    expect(tag).not.toContain("data-ds-selected");
    expect(tag).not.toContain("disabled");
  });

  // The axis check: every matrix is keyed by the axis this suite loops over, so a cell keyed by anything else, or
  // a part or property this sheet does not map, fails here rather than passing unread.
  it("keys every matrix by the axes the tests below walk", () => {
    expect(Object.keys(spec.tokens)).toEqual(["root", "icon", "badge"]);
    expect(Object.keys(root)).toEqual(["background", "underlay", "border", "borderWidth", "radius", "size", "hover", "pressed", "selected", "disabled", "focus-visible"]);
    expect(Object.keys(icon)).toEqual(["size", "color", "selected"]);
    expect(Object.keys(spec.tokens["badge"] ?? {})).toEqual(["offset"]);
    const materialKeys = new Set(["default", "vivid", "glass"]);
    const byVariant = [root["background"], root["underlay"], root["border"], root["borderWidth"], block(root["pressed"])["background"], block(root["pressed"])["overlay"], icon["color"]];
    for (const matrix of byVariant) {
      for (const [variant, inner] of Object.entries(block(matrix))) {
        expect(variants, variant).toContain(variant);
        if (typeof inner !== "string") for (const key of Object.keys(inner)) expect(materialKeys.has(key), `${variant}.${key}`).toBe(true);
      }
    }
    for (const matrix of [block(root["selected"])["background"], block(icon["selected"])["color"]]) {
      expect(Object.keys(block(matrix))).toEqual(["default", "vivid", "glass"]);
    }
    expect(Object.keys(block(root["size"]))).toEqual([...iconButtonSizes]);
    expect(Object.keys(block(icon["size"]))).toEqual([...iconButtonSizes]);
    expect(Object.keys(block(block(root["selected"])))).toEqual(["background"]);
    expect(Object.keys(block(block(icon["selected"])))).toEqual(["color"]);
  });

  it("plays haptic.press.button only, which the web does not play (behavior 14, D5)", () => {
    const fields = spec as unknown as { readonly haptics?: Readonly<Record<string, string>> };
    expect(fields.haptics).toEqual({ press: "haptic.press.button" });
    expect(css).not.toMatch(/vibrat/u);
  });
});

describe("IconButton.css binds what IconButton.yaml binds", () => {
  // Every expectation below names the cell it checks, as the Apple helper does (`specCell(...).name`), so a wrong cell
  // fails under its own spec path and keys rather than under a title that lists several properties.
  it.each(combinations)("root.background, root.underlay, root.border, root.borderWidth and icon.color of $variant on $material", ({ variant, material }) => {
    const state = on(variant, material);
    const fill = specCell("root.background", variant, material);
    expect(value(state, "--ds--icon-button-fill"), fill.name).toBe(bound(fill.token) ?? "transparent");
    const under = specCell("root.underlay", variant, material);
    expect(value(state, "--ds--icon-button-under"), under.name).toBe(bound(under.token) ?? "transparent");
    const border = specCell("root.border", variant, material);
    expect(value(state, "--ds--icon-button-border"), border.name).toBe(bound(border.token) ?? "transparent");
    // root.borderWidth is keyed by variant alone, so the ring keeps its width on every material (ADR-0033).
    const width = specCell("root.borderWidth", variant);
    expect(value(state, "--ds--icon-button-border-width"), `${width.name} on ${material}`).toBe(bound(width.token) ?? ZERO_WIDTH);
    // Wherever a ring is drawn it has a width, and wherever there is a width there is a ring.
    expect(width.token === undefined, `${width.name} is set exactly where ${border.name} is`).toBe(border.token === undefined);
    const foreground = specCell("icon.color", variant, material);
    expect(foreground.token, `${foreground.name} is set`).toBeDefined();
    expect(value(state, "--ds--icon-button-foreground"), foreground.name).toBe(bound(foreground.token));
  });

  it.each(combinations)("root.pressed.background and root.pressed.overlay of $variant on $material", ({ variant, material }) => {
    const pressed = on(variant, material, { "data-pressed": "" });
    const rest = value(on(variant, material), "--ds--icon-button-fill");
    const fill = specCell("root.pressed.background", variant, material);
    expect(value(pressed, "--ds--icon-button-fill"), `${fill.name}, or the rest fill where it is not set`).toBe(bound(fill.token) ?? rest);
    // The overlay is the cell itself on every press: never multiplied by the crossfade flag (behavior 13).
    const overlay = specCell("root.pressed.overlay", variant);
    expect(value(pressed, "--ds--icon-button-press"), `${overlay.name} on ${material}`).toBe(bound(overlay.token) ?? "transparent");
    expect(value(on(variant, material), "--ds--icon-button-press"), `${overlay.name} on ${material}, at rest`).toBe("transparent");
  });

  // Behavior 6 and D3: a selected circle renders as `primary` renders it, whatever its variant.
  it.each(combinations)("a selected $variant on $material is primary's circle, pressed or not", ({ variant, material }) => {
    const selected = on(variant, material, { "data-ds-selected": "" });
    const pressed = on(variant, material, { "data-ds-selected": "", "data-pressed": "" });
    const fill = specCell("root.selected.background", material);
    const foreground = specCell("icon.selected.color", material);
    const border = specCell("root.border", "primary", material);
    const width = specCell("root.borderWidth", "primary");
    const under = specCell("root.underlay", "primary", material);
    for (const [state, which] of [[selected, `a selected ${variant}`], [pressed, `a selected ${variant}, pressed`]] as const) {
      expect(value(state, "--ds--icon-button-foreground"), `${foreground.name}, ${which}`).toBe(bound(foreground.token));
      // Every cell that is not selection's own is primary's: no ring, no underlay.
      expect(value(state, "--ds--icon-button-border"), `${border.name}, ${which}`).toBe(bound(border.token) ?? "transparent");
      expect(value(state, "--ds--icon-button-border-width"), `${width.name}, ${which}`).toBe(bound(width.token) ?? ZERO_WIDTH);
      expect(value(state, "--ds--icon-button-under"), `${under.name}, ${which}`).toBe(bound(under.token) ?? "transparent");
    }
    // At rest the `selected` cell; pressed, primary's pressed cell, as a pressed primary circle (ADR-0039).
    expect(value(selected, "--ds--icon-button-fill"), `${fill.name}, a selected ${variant}`).toBe(bound(fill.token));
    const pressedFill = specCell("root.pressed.background", "primary", material);
    expect(value(pressed, "--ds--icon-button-fill"), `${pressedFill.name}, a selected ${variant}, pressed`).toBe(bound(pressedFill.token));
    expect(value(pressed, "--ds--icon-button-fill"), `a selected ${variant} on ${material}, pressed, is a pressed primary circle`).toBe(
      value(on("primary", material, { "data-pressed": "" }), "--ds--icon-button-fill"),
    );
    // Primary's overlay, which is none: a selected danger lays no overlay either.
    const overlay = specCell("root.pressed.overlay", "primary");
    expect(value(pressed, "--ds--icon-button-press"), `${overlay.name}, a selected ${variant} on ${material}, pressed`).toBe(bound(overlay.token) ?? "transparent");
    expect(value(selected, "--ds--icon-button-press"), `${overlay.name}, a selected ${variant} on ${material}, at rest`).toBe("transparent");
  });

  // ADR-0039: the pressed solid is one lightness step from its rest, in every scheme and under Increase Contrast, so the
  // press is never the fill already on screen. The pixels are Apple's `DSIconButtonReduceMotionTests`.
  it("gives primary's pressed cells a value of their own in every colour scheme context (ADR-0039)", () => {
    expect(specCell("root.pressed.overlay", "primary").token, "a solid's press lays no overlay on it").toBeUndefined();
    for (const colorScheme of ["light", "dark"] as const) {
      for (const contrast of ["standard", "more"] as const) {
        const resolved = tokens.resolveTokens({ colorScheme, contrast }) as unknown as Readonly<Record<string, { readonly hex: string }>>;
        for (const material of materials) {
          const rest = specCell("root.background", "primary", material);
          const pressed = specCell("root.pressed.background", "primary", material);
          const context = `${colorScheme}, contrast ${contrast}: ${pressed.name} against ${rest.name}`;
          expect(resolved[pressed.token ?? ""]?.hex, context).toBeDefined();
          expect(resolved[pressed.token ?? ""]?.hex, context).not.toBe(resolved[rest.token ?? ""]?.hex);
        }
      }
    }
  });

  it("gives the selected cells primary's values on every material (D3)", () => {
    for (const material of materials) {
      const fill = specCell("root.selected.background", material);
      const primaryFill = specCell("root.background", "primary", material);
      expect(fill.token, `${fill.name} is ${primaryFill.name}`).toBe(primaryFill.token);
      const foreground = specCell("icon.selected.color", material);
      const primaryForeground = specCell("icon.color", "primary", material);
      expect(foreground.token, `${foreground.name} is ${primaryForeground.name}`).toBe(primaryForeground.token);
    }
  });

  it("paints the underlay on vivid and on the scheme's glass only: not on light glass, not on any other material", () => {
    expect(Object.keys(block(block(root["underlay"])["danger"])), `${cellName(spec, "root.underlay", "danger")} is keyed by vivid and glass alone`).toEqual(["vivid", "glass"]);
    for (const material of materials) {
      const under = specCell("root.underlay", "danger", material);
      const expected = material === "vivid" || material === "glass" ? "var(--ds-color-bg-page)" : "transparent";
      expect(value(on("danger", material), "--ds--icon-button-under"), under.name).toBe(expected);
    }
  });

  it("root.hover.overlay under ds-pointer only", () => {
    const overlay = specCell("root.hover.overlay");
    for (const variant of variants) {
      const hovered = on(variant, "solid", { "data-hovered": "" });
      expect(value({ ...hovered, variants: ["ds-pointer"] }, "--ds--icon-button-hover"), `${overlay.name}, ${variant} under ds-pointer`).toBe(bound(overlay.token));
      expect(value({ ...hovered, variants: ["ds-touch"] }, "--ds--icon-button-hover"), `${overlay.name}, ${variant} under ds-touch`).toBe("transparent");
    }
  });

  it("root.radius and root.size: a square of the size cell at radius.control, with no padding", () => {
    const base = declarationsOf(cascade.rules, ".ds-icon-button");
    const radius = specCell("root.radius");
    const size = cellName(spec, "root.size");
    expect(base["border-radius"], radius.name).toBe(bound(radius.token));
    expect(base["inline-size"], `${size}: the inline size`).toBe("var(--ds--icon-button-size)");
    expect(base["block-size"], `${size}: the block size`).toBe("var(--ds--icon-button-size)");
    expect(base["padding"], `${size}: the square has no padding`).toBe("0");
    expect(base["flex"], `${size}: the square neither grows nor shrinks`).toBe("none");
    expect(base["box-sizing"], `${size}: the ring is inside the square`).toBe("border-box");
    for (const key of iconButtonSizes) {
      const side = specCell("root.size", key);
      const state = { classes: ["ds-icon-button"], attributes: { "data-ds-size": key } };
      expect(value(state, "--ds--icon-button-size"), side.name).toBe(bound(side.token));
    }
  });

  it.each(iconButtonSizes.map((size) => [size] as const))("icon.size of %s: the glyph box, and Icon's own size", (size) => {
    const box = specCell("icon.size", size);
    const glyph = declarationsOf(cascade.rules, `.ds-icon-button[data-ds-size="${size}"] > [data-ds-slot="icon-button-glyph"]`);
    expect(glyph, box.name).toEqual({ "inline-size": bound(box.token), "block-size": bound(box.token) });
    const out = html(<IconButton size={size} glyph="action.settings" label="Open settings" onPress={noop} />);
    expect(out, `${box.name}: Icon's own size`).toMatch(new RegExp(`<span class="ds-icon" data-ds-slot="icon-button-glyph" data-ds-icon="action.settings" data-ds-size="${size}" `));
  });

  it("paints what it binds: the underlay, the three layers in Button's order, the ring inside the circle and the foreground", () => {
    const base = declarationsOf(cascade.rules, ".ds-icon-button");
    const named = (...paths: readonly string[]): string => paths.map((path) => cellName(spec, path)).join(", ");
    expect(base["background-color"], `${named("root.underlay")}: painted under the fill`).toBe("var(--ds--icon-button-under)");
    // The first image is on top: hover over the pressed overlay over the fill.
    expect(squash(base["background-image"]), `${named("root.hover.overlay", "root.pressed.overlay", "root.background")}: painted in that order, top first`).toBe(
      "linear-gradient(var(--ds--icon-button-hover), var(--ds--icon-button-hover)), linear-gradient(var(--ds--icon-button-press), var(--ds--icon-button-press)), linear-gradient(var(--ds--icon-button-fill), var(--ds--icon-button-fill))",
    );
    expect(base["box-shadow"], `${named("root.borderWidth", "root.border")}: the ring, inside the circle`).toBe("inset 0 0 0 var(--ds--icon-button-border-width) var(--ds--icon-button-border)");
    expect(base["border"], `${named("root.border")}: no border outside the circle`).toBe("none");
    expect(base["color"], `${named("icon.color")}: the foreground`).toBe("var(--ds--icon-button-foreground)");
    expect(base["position"], `${named("badge.offset")}: the badge's containing block`).toBe("relative");
  });

  it("root.disabled.opacity and root.focus-visible.ring at ringWidth, outside the circle", () => {
    const opacity = specCell("root.disabled.opacity");
    const ring = specCell("root.focus-visible.ring");
    const ringWidth = specCell("root.focus-visible.ringWidth");
    expect(declarationsOf(cascade.rules, ".ds-icon-button[data-disabled]"), opacity.name).toEqual({ opacity: bound(opacity.token) });
    expect(declarationsOf(cascade.rules, ".ds-icon-button[data-focus-visible]"), `${ring.name} at ${ringWidth.name}`).toEqual({ outline: `${bound(ringWidth.token)} solid ${bound(ring.token)}` });
  });

  it("the hit region is the larger of the circle and size.hit, never a modality variant (behavior 2)", () => {
    const hit = declarationsOf(cascade.rules, ".ds-icon-button::before");
    const size = cellName(spec, "root.size");
    expect(hit["inset-block"], `${size}: the hit region reaches size.hit past a smaller circle`).toBe("min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))");
    expect(hit["inset-inline"], `${size}: the hit region on both axes`).toBe(hit["inset-block"]);
    expect(hit["position"], `${size}: the hit region is out of flow`).toBe("absolute");
  });

  it("badge.offset: the badge part sits space.1 outside the top-trailing corner, out of flow and taking no pointer (behavior 16)", () => {
    const offset = specCell("badge.offset");
    expect(offset.token, offset.name).toBe("space.1");
    const part = declarationsOf(cascade.rules, '.ds-icon-button > [data-ds-slot="icon-button-badge"]');
    expect(part, offset.name).toEqual({
      position: "absolute",
      "inset-block-start": `calc(${bound(offset.token) ?? ""} * -1)`,
      "inset-inline-end": `calc(${bound(offset.token) ?? ""} * -1)`,
      display: "flex",
      "pointer-events": "none",
    });
  });

  it("reads no runtime axis: its only at-rules are the colour properties, the layer, the pointer variant and forced colors", () => {
    expect(allAtRules(parseCss(css)).map((at) => `${at.name} ${at.params}`)).toEqual([
      "property --ds--icon-button-fill",
      "property --ds--icon-button-hover",
      "property --ds--icon-button-press",
      "layer ds.components",
      "variant ds-pointer",
      "media (forced-colors: active)",
    ]);
    // test/cascade.ts cannot read :not(), so no selector uses it.
    expect(rules.flatMap((rule) => rule.selectors).filter((selector) => selector.includes(":not("))).toEqual([]);
    const forced = rules.filter((rule) => rule.atRules.some((at) => at.name === "media"));
    expect(forced.map((rule) => [rule.selectors, Object.fromEntries(rule.declarations.map((declaration) => [declaration.property, declaration.value]))])).toEqual([
      [[".ds-icon-button"], { outline: "var(--ds-border-hairline) solid ButtonText" }],
    ]);
  });

  it("follows density with the circle and nothing else: the side in each density, the glyph box and the offset in none", () => {
    const densities = (spec as unknown as { density: readonly Density[] }).density;
    expect(densities).toEqual(["compact", "regular", "comfortable"]);
    const sides = densities.map((density) => iconButtonSizes.map((size) => tokenValue(tokens, specCell("root.size", size).token ?? "", contextIn(density))));
    expect(new Set(sides.map((row) => JSON.stringify(row))).size, `${cellName(spec, "root.size")} differs in every density`).toBe(densities.length);
    for (const fixed of [...iconButtonSizes.map((size) => specCell("icon.size", size)), specCell("badge.offset")]) {
      expect(new Set(densities.map((density) => JSON.stringify(tokenValue(tokens, fixed.token ?? "", contextIn(density))))).size, `${fixed.name} is one value in every density`).toBe(1);
    }
    // radius.control is at least half of every side in every density and modality, so the square is a circle.
    const radius = specCell("root.radius");
    for (const density of densities) {
      for (const modality of ["pointer", "touch"] as const) {
        const half = Number(tokenValue(tokens, radius.token ?? "", contextIn(density, modality)));
        for (const size of iconButtonSizes) {
          const side = specCell("root.size", size);
          const length = Number(tokenValue(tokens, side.token ?? "", contextIn(density, modality)));
          expect(half, `${radius.name} is at least half of ${side.name}, ${density} ${modality}`).toBeGreaterThanOrEqual(length / 2);
        }
      }
    }
  });
});

describe("motion (IconButton.yaml motion, ADR-0023 §8.4)", () => {
  const base = declarationsOf(cascade.rules, ".ds-icon-button");
  const selected = declarationsOf(cascade.rules, ".ds-icon-button[data-ds-selected][data-ds-variant][data-ds-surface]");
  const crossfade = "var(--ds-motion-presentation-crossfade)";

  it("presses on motion.spring.snappy and scales to 0.97 only outside Reduce Motion", () => {
    const pressCell = specCell("motion.press");
    const press = cssVariable(pressCell.token ?? "");
    expect(press, pressCell.name).toBe("--ds-motion-spring-snappy");
    expect(squash(base["transition"]), `${pressCell.name}: the scale's transition`).toContain(`scale var(${press}-duration) var(${press}-easing)`);
    const reduceMotion = specCell("motion.reduceMotion");
    expect(base["--ds--icon-button-press-scale"], `${reduceMotion.name}: 0.97, and 1 under the crossfade`).toBe(`calc(1 - 0.03 * (1 - ${crossfade}))`);
    expect(declarationsOf(cascade.rules, ".ds-icon-button[data-pressed]"), `${pressCell.name}: the press scales`).toEqual({ scale: "var(--ds--icon-button-press-scale)" });
    expect(reduceMotion.token, reduceMotion.name).toBe("crossfade");
  });

  it("changes the fill and the overlays of a press over motion.duration.base with motion.easing.out, in every motion mode", () => {
    const cells = { "--ds--icon-button-fill": "root.pressed.background", "--ds--icon-button-press": "root.pressed.overlay", "--ds--icon-button-hover": "root.hover.overlay" };
    for (const [property, path] of Object.entries(cells)) {
      expect(squash(base["transition"]), `${cellName(spec, path)}: ${property} over motion.duration.base`).toContain(`${property} var(--ds-motion-duration-base) var(--ds-motion-easing-out)`);
    }
    expect(css).not.toContain("color-mix");
  });

  it("selects on motion.spring.smooth, and crossfades over motion.duration.base under Reduce Motion", () => {
    const selectCell = specCell("motion.select");
    const select = cssVariable(selectCell.token ?? "");
    expect(select, selectCell.name).toBe("--ds-motion-spring-smooth");
    expect(squash(base["--ds--icon-button-select-duration"]), `${selectCell.name}, crossfaded under Reduce Motion`).toBe(`calc( var(${select}-duration) * (1 - ${crossfade}) + var(--ds-motion-duration-base) * ${crossfade} )`);
    const timing = `var(--ds--icon-button-select-duration) var(${select}-easing)`;
    for (const property of ["color", "box-shadow", "background-color"]) {
      expect(squash(base["transition"]), `${selectCell.name}: ${property}`).toContain(`${property} ${timing}`);
      expect(squash(selected["transition"]), `${selectCell.name}: ${property}, arriving selected`).toContain(`${property} ${timing}`);
    }
    // Arriving in the selected state the fill moves on the selection's timing; a press of a selected circle keeps
    // the press's timing for the scale, and its fill, arriving pressed, takes the press's timing too: the base
    // rule's list, word for word.
    expect(squash(selected["transition"]), `${selectCell.name}: the fill, arriving selected`).toContain(`--ds--icon-button-fill ${timing}`);
    const pressCell = specCell("motion.press");
    expect(squash(selected["transition"]), `${pressCell.name}: a selected circle's press`).toContain(`scale var(${cssVariable(pressCell.token ?? "")}-duration)`);
    const selectedPressed = declarationsOf(cascade.rules, ".ds-icon-button[data-ds-selected][data-ds-variant][data-ds-surface][data-pressed]");
    expect(squash(selectedPressed["transition"]), `${cellName(spec, "root.pressed.background", "primary")}: a selected circle's press`).toBe(squash(base["transition"]));
    expect(squash(selectedPressed["transition"])).toContain("--ds--icon-button-fill var(--ds-motion-duration-base) var(--ds-motion-easing-out)");
  });
});

describe("IconButton renders", () => {
  it("React Aria's button with its variant, size, the material it sits on, and the glyph hidden in the circle's colour", () => {
    const out = html(<IconButton variant="ghost" size="lg" glyph="action.filter" label="Filter results" onPress={noop} />);
    expect(out).toMatch(/^<button [^>]*type="button"/);
    const tag = buttonTag(out);
    expect(attribute(tag, "class")).toBe("ds-icon-button");
    expect(attribute(tag, "data-ds-variant")).toBe("ghost");
    expect(attribute(tag, "data-ds-size")).toBe("lg");
    expect(attribute(tag, "data-ds-surface")).toBe("page");
    expect(attribute(tag, "aria-label")).toBe("Filter results");
    // The glyph is Icon's box under IconButton's part name; `tone: inherit` writes no data-ds-tone, so it takes
    // the circle's foreground, and with no `label` it is hidden (Icon.yaml behaviors 9 and 14).
    expect(out).toMatch(/<span class="ds-icon" data-ds-slot="icon-button-glyph" data-ds-icon="action.filter" data-ds-size="lg" [^>]*aria-hidden="true"><svg /);
    expect(out).not.toContain("data-ds-tone");
    expect(out).not.toContain('role="img"');
    // The label is spoken, never drawn.
    expect(out).not.toContain(">Filter results<");
    expect(html(<Surface material="vivid"><IconButton variant="ghost" glyph="nav.open" label="Open" onPress={noop} /></Surface>)).toContain('data-ds-surface="vivid"');
  });

  it("the material a glass Surface actually renders", () => {
    const out = renderToStaticMarkup(
      <Theme tokens={tokens} contrast="more">
        <Surface material="glass" backdrop="map">
          <IconButton variant="primary" glyph="action.locate" label="Center on the vehicle" onPress={noop} />
        </Surface>
      </Theme>,
    );
    expect(attribute(buttonTag(out), "data-ds-surface")).toBe("raised");
  });

  it("isSelected: data-ds-selected and aria-current, and the caller's variant; an unselected circle carries neither", () => {
    const selected = buttonTag(html(<IconButton variant="ghost" glyph="object.map" label="Map view" isSelected onPress={noop} />));
    expect(attribute(selected, "data-ds-selected")).toBe("");
    expect(attribute(selected, "aria-current")).toBe("true");
    expect(attribute(selected, "data-ds-variant")).toBe("ghost");
    expect(selected).not.toContain("aria-pressed");
    const unselected = buttonTag(html(<IconButton variant="ghost" glyph="object.map" label="Map view" onPress={noop} />));
    expect(unselected).not.toContain("data-ds-selected");
    expect(unselected).not.toContain("aria-current");
  });

  it("isDisabled: disabled and out of the focus order", () => {
    const tag = buttonTag(html(<IconButton glyph="action.refresh" label="Refresh readings" isDisabled onPress={noop} />));
    expect(tag).toContain('disabled=""');
    expect(attribute(tag, "data-disabled")).toBe("true");
  });

  it("draws the badge in its part, hidden by the host flag, and reads its contribution into the name after the separator", () => {
    const out = html(<IconButton glyph="object.notification" label="Open notifications" badge={{ variant: "count", tone: "neutral", count: 3, label: "unread" }} onPress={noop} />);
    expect(iconButtonValueSeparator).toBe(", ");
    expect(nameOf(out)).toBe("Open notifications, 3 unread");
    const part = /<span data-ds-slot="icon-button-badge">(.*?)<\/span><\/button>/.exec(out)?.[1] ?? "";
    expect(part).toMatch(/^<span class="ds-badge" data-ds-slot="badge" data-ds-variant="count" data-ds-tone="neutral" data-ds-emphasis="filled" aria-hidden="true">/);
    expect(part).not.toMatch(/\srole=/u);
    expect(part).not.toContain("aria-label");
    // The badge is the button's last child, after the glyph.
    expect(out.indexOf("icon-button-glyph")).toBeLessThan(out.indexOf("icon-button-badge"));
  });

  it.each<readonly [string, IconButtonBadge, string]>([
    ["a count with a label", { count: 3, label: "unread" }, "Open notifications, 3 unread"],
    ["an overflow, named by the true count", { count: 128, max: 99, label: "unread" }, "Open notifications, 128 unread"],
    ["a count with no label, the count alone", { count: 3 }, "Open notifications, 3"],
    ["a count with a blank label", { count: 3, label: "  " }, "Open notifications, 3"],
    ["a dot with a label", { variant: "dot", label: "new" }, "Open notifications, new"],
    ["a dot with no label, which says nothing", { variant: "dot" }, "Open notifications"],
  ])("names %s", (_case, badge, name) => {
    const out = html(<IconButton glyph="object.notification" label="Open notifications" badge={badge} onPress={noop} />);
    expect(nameOf(out)).toBe(name);
    expect(out).toContain('data-ds-slot="icon-button-badge"');
    const contribution = badgeContribution(badge.variant ?? "count", badge.count, badge.label, "en-US", defaultStrings);
    expect(nameOf(out)).toBe(contribution === undefined ? "Open notifications" : `Open notifications${iconButtonValueSeparator}${contribution}`);
  });

  it("draws no badge part, and says nothing of one, when the badge renders nothing (Badge.yaml behavior 9)", () => {
    for (const count of [0, -1, undefined, 2.5]) {
      const out = html(<IconButton glyph="object.notification" label="Open notifications" badge={{ count, label: "unread" }} onPress={noop} />);
      expect(nameOf(out), String(count)).toBe("Open notifications");
      expect(out, String(count)).not.toContain("icon-button-badge");
      expect(out, String(count)).not.toContain("ds-badge");
    }
  });

  it("says the count in the locale and the words of the app's table, through Badge's own function (ADR-0032)", () => {
    const badge = { count: 1234, max: 9999, label: "queued runs" } as const;
    const button = <IconButton glyph="object.notification" label="Open queue" badge={badge} onPress={noop} />;
    expect(nameOf(html(button))).toBe("Open queue, 1,234 queued runs");
    expect(nameOf(html(button, { locale: "de-DE" }))).toBe("Open queue, 1.234 queued runs");
    expect(nameOf(html(button, { strings: { "Badge.count": "{label}: {count}" } }))).toBe("Open queue, queued runs: 1,234");
  });

  it("writes no hint of any kind: no title, no description, no pressed state, and no Tooltip (behavior 5)", () => {
    for (const node of [
      <IconButton key="plain" glyph="action.settings" label="Open settings" onPress={noop} />,
      <IconButton key="selected" glyph="object.map" label="Map view" isSelected onPress={noop} />,
      <IconButton key="badge" glyph="object.notification" label="Open notifications" badge={{ count: 3, label: "unread" }} onPress={noop} />,
    ]) {
      const out = html(node);
      for (const name of ["title", "aria-describedby", "aria-description", "aria-details", "aria-pressed", "aria-labelledby", "aria-haspopup"]) {
        expect(out, name).not.toContain(`${name}=`);
      }
    }
  });

  it("keeps its own name and state over what a caller casts past the type", () => {
    const Loose = IconButton as unknown as (props: Record<string, unknown>) => ReactNode;
    const tag = buttonTag(
      html(<Loose glyph="action.settings" label="Open settings" onPress={noop} aria-label="Settings" aria-labelledby="heading" aria-pressed="true" aria-current="page" data-ds-variant="danger" className="app-action" id="settings" />),
    );
    expect(attribute(tag, "aria-label")).toBe("Open settings");
    expect(tag).not.toContain("aria-labelledby");
    expect(tag).not.toContain("aria-pressed");
    expect(tag).not.toContain("aria-current");
    expect(attribute(tag, "data-ds-variant")).toBe("secondary");
    expect(attribute(tag, "class")).toBe("ds-icon-button app-action");
    expect(attribute(tag, "id")).toBe("settings");
  });

  it("says so in development when the name is blank or the glyph is not a registry id", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const Loose = IconButton as unknown as (props: Record<string, unknown>) => ReactNode;
      html(<IconButton glyph="action.settings" label="Open settings" onPress={noop} />);
      expect(errors).not.toHaveBeenCalled();
      html(<IconButton glyph="action.settings" label="  " onPress={noop} />);
      expect(errors).toHaveBeenCalledWith(expect.stringMatching(/^IconButton: `label` is required/u));
      errors.mockClear();
      html(<Loose glyph="action.brew" label="Brew" onPress={noop} />);
      expect(errors).toHaveBeenCalledWith(expect.stringMatching(/^IconButton: the glyph "action.brew" is not an id of the icon registry/u));
    } finally {
      errors.mockRestore();
    }
  });

  it("forwards ScopeAttributes to the button (ADR-0019 rule 8)", () => {
    const tag = buttonTag(html(<IconButton glyph="action.settings" label="Open settings" onPress={noop} data-ds-color-scheme="dark" data-ds-density="compact" />));
    expect(attribute(tag, "data-ds-color-scheme")).toBe("dark");
    expect(attribute(tag, "data-ds-density")).toBe("compact");
  });
});

/**
 * IconButton.yaml `accessibility` and behaviors 4, 6, 15 and 16: every example is exactly one button named by
 * its `label`, and `with-badge` also by the badge's contribution after the separator. The names are the bytes
 * both stacks hand a screen reader: on Apple the label is the part before the first `", "` and the value the part
 * after it (`DSIconButtonNameCase.all`, DSIconButtonBindingTests.swift, and `DSIconButtonAccessibilityTreeTests`
 * off the simulator), and web/apps/gallery/test/accessibility.browser.test.tsx reads the same names off Chromium's
 * tree.
 */
describe("the accessibility the spec writes (IconButton.yaml accessibility)", () => {
  interface Expected {
    readonly name: string;
    readonly bytes: number;
    readonly selected?: true;
    readonly disabled?: true;
  }

  const expected: Readonly<Record<string, Expected>> = {
    "secondary-md": { name: "Open settings", bytes: 13 },
    "primary-md": { name: "Add a site", bytes: 10 },
    "ghost-md": { name: "Filter results", bytes: 14 },
    "plain-sm": { name: "Open details", bytes: 12 },
    "danger-md": { name: "Delete route", bytes: 12 },
    "selected-in-group": { name: "Map view", bytes: 8, selected: true },
    "lg-touch": { name: "Start the run", bytes: 13 },
    disabled: { name: "Refresh readings", bytes: 16, disabled: true },
    "on-vivid": { name: "Open the yield card", bytes: 19 },
    "on-glass-over-map": { name: "Center on the vehicle", bytes: 21 },
    "label-ru": { name: "Обновить показания линии", bytes: 46 },
    "with-badge": { name: "Open notifications, 3 unread", bytes: 28 },
  };

  it("covers every example of the spec, in its order", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expected));
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s: one button named by its label", (id, example) => {
    const want = expected[id];
    const out = staged(example);
    expect(out.match(/<button /gu)?.length, id).toBe(1);
    const tag = buttonTag(out);
    expect(nameOf(out)).toBe(want?.name);
    expect(Buffer.byteLength(want?.name ?? "", "utf8")).toBe(want?.bytes);
    expect(want?.name).toBe(want?.name.normalize("NFC"));
    expect(want?.name).toBe(want?.name.trim());
    // The name before the separator is the example's own label, byte for byte, never the glyph's id.
    const label = example.props["label"] as string;
    expect(want?.name.startsWith(label)).toBe(true);
    expect(want?.name).not.toContain(example.props["glyph"] as string);
    expect(attribute(tag, "aria-current")).toBe(want?.selected === true ? "true" : undefined);
    expect(tag.includes('disabled=""')).toBe(want?.disabled === true);
    // Nothing else in the staging is an element: the glyph and any badge are hidden, and the only text is the
    // digits the hidden badge draws.
    expect(out).not.toMatch(/\srole="/u);
    const hasBadge = example.props["badge"] !== undefined;
    expect(out.replace(/<[^>]*>/gu, "")).toBe(hasBadge ? "3" : "");
    if (hasBadge) expect(out).toMatch(/<span class="ds-badge" [^>]*aria-hidden="true">/u);
  });

  it("names the Russian label as written: Cyrillic, one sentence, the circle unchanged", () => {
    const example = spec.examples.find((candidate) => candidate.id === "label-ru");
    if (example === undefined) throw new Error("IconButton.yaml has no label-ru example");
    const label = example.props["label"] as string;
    expect([...label].length).toBe(24);
    // U+041E to U+044F, the range the P4-4 contract names, and the spaces between the words.
    expect([...label].every((character) => character === " " || (character.codePointAt(0) ?? 0) >= 0x041e && (character.codePointAt(0) ?? 0) <= 0x044f)).toBe(true);
    expect(attribute(buttonTag(staged(example)), "data-ds-size")).toBe("md");
  });

  it("stages each example's cells: the props it writes, whatever the material around it", () => {
    for (const example of spec.examples) {
      const props = example.props as Record<string, unknown>;
      const fields = example as unknown as { readonly surface?: string };
      const tag = buttonTag(staged(example));
      const variant = attribute(tag, "data-ds-variant") as IconButtonVariant;
      const size = attribute(tag, "data-ds-size") as IconButtonSize;
      const material = attribute(tag, "data-ds-surface") ?? "";
      expect(variant, example.id).toBe(props["variant"]);
      expect(size, example.id).toBe(props["size"]);
      expect(material, example.id).toBe(fields.surface ?? "page");
      const state = on(variant, material, props["isSelected"] === true ? { "data-ds-selected": "" } : {});
      const fill = props["isSelected"] === true ? cell(block(root["selected"])["background"], material) : cell(root["background"], variant, material);
      expect(value(state, "--ds--icon-button-fill"), example.id).toBe(bound(fill) ?? "transparent");
    }
    const withBadge = spec.examples.find((example) => example.id === "with-badge");
    expect(withBadge?.props["badge"]).toEqual({ variant: "count", tone: "neutral", count: 3, label: "unread" });
    expect(spec.examples.filter((example) => example.props["badge"] !== undefined).map((example) => example.id)).toEqual(["with-badge"]);
  });
});
