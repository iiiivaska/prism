/// <reference types="node" />
/**
 * Chip (spec/components/Chip.yaml, specVersion 1).
 *
 * - Chip.css binds what Chip.yaml binds, read off the spec cell by cell and checked as it wins on the pill through a
 *   small cascade: the label's, the glyphs' and the stroke's colour at rest and selected on every context the chip
 *   can publish, the stroke's widths, the height and padding per size, the gap, the radius, the label's role, the
 *   glyphs' box, the hover and pressed layers, the focus ring and the disabled opacity.
 * - The pill is the Surface module's glass chip (ADR-0036). `root.background` is read on every ground and held to
 *   what Chip hands the chip shape (`chipBackground`), and `fallbackBackground`, `fallbackUnderlay`, `blur`,
 *   `saturate`, `edgeColor`, `edgeStartAlpha` and `edgeEndAlpha` to what the shape paints (surface/Surface.css) and
 *   where it paints it. Chip.css sets neither `background-color` nor `background-image` on the pill, names no glass
 *   recipe and declares no backdrop filter (ADR-0036 rule 2); the layers it paints are the body's.
 * - Under a forced Reduce Transparency and a forced Increase Contrast every part is its `default` cell and the check
 *   is gone, read off a server render in which the chip has published `(raised, none)`.
 * - An Avatar inside the pill reads the enclosure the pill hands it (ADR-0037): flat glass exactly where the pill
 *   renders glass, its own cell where the pill renders its own or falls back, on every ground and under every setting.
 *   The press half of ADR-0037 rule 4 runs in Chromium (web/apps/gallery/test/runtime.browser.test.tsx), where a
 *   press can be forced; here the pill hands its shape the same cell whatever the input state, because the cell is a
 *   function of the ground alone.
 * - Behaviour: the role from the props alone, the remove control and its name from the strings table, the leading and
 *   trailing positions, the attributes and handlers it withholds, ScopeAttributes.
 * - `accessibility`, per spec example: the names the table below writes, which
 *   web/apps/gallery/test/accessibility.browser.test.tsx reads off Chromium's tree and
 *   swift/Tests/DSSnapshotTests/DSChipAccessibilityTreeTests.swift off the simulator's, for the same ids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, defaultStrings, type Contrast, type Density, type Modality, type StringsTable, type TokenContext, type Transparency } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Backdrop, Chip, Surface, backdropKinds, chipKinds, chipSizes, surfaceMaterials, type BackdropKind, type ChipProps, type ChipSize, type SurfaceMaterial } from "../src/index.ts";
import { chipBackground, chipKind, chipLabelRole, chipLeading, chipRemoveName, drawsChipAvatar, isChipOverMedia, isChipRemoveKey, showsChipCheck, showsChipTrailingIcon } from "../src/chip/parts.ts";
import { avatarBackground } from "../src/avatar/parts.ts";
import { resolveSurfaceChip } from "../src/surface/resolve.ts";
import { tokenValue } from "../src/icon/weight.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss, rightmostCompound, splitTopLevel } from "./css.ts";
import { bindingAt, cell, cellName, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Chip");
const css = readFileSync(join(packageRoot, "src", "chip", "Chip.css"), "utf8");
const surfaceCss = readFileSync(join(packageRoot, "src", "surface", "Surface.css"), "utf8");
const cascade = new Cascade(css);
const surfaceRules = flattenRules(parseCss(surfaceCss));
const rules = flattenRules(parseCss(css));

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);
const block = (binding: Binding | undefined): Record<string, Binding> => (binding ?? {}) as Record<string, Binding>;
const squash = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
const noop = (): void => undefined;

/** A cell of Chip.yaml, read and named from one spec path and one key list (`Chip.yaml tokens.root.border [page, map]`). */
function specCell(path: string, ...keys: readonly string[]): { readonly token: string | undefined; readonly name: string } {
  return { token: cell(bindingAt(spec, path), ...keys), name: cellName(spec, path, ...keys) };
}

/** Every context a Surface, a Backdrop or the chip itself can publish: nine materials over four backdrop kinds. */
const grounds = surfaceMaterials.flatMap((material) => backdropKinds.map((backdrop) => ({ material, backdrop })));

/** The pill as the cascade sees it, publishing `material` over `backdrop`. */
function pill(material: string, backdrop: string, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return {
    classes: ["ds-surface-chip", "ds-chip"],
    attributes: { "data-ds-surface": material, "data-ds-backdrop": backdrop, "data-ds-size": "sm", "data-ds-kind": "button", ...extra },
  };
}

const value = (state: Parameters<Cascade["value"]>[0], property: string): string | undefined => cascade.value(state, property);

interface Staging {
  readonly contrast?: Contrast;
  readonly transparency?: Transparency;
  readonly strings?: Partial<StringsTable>;
}

function html(node: ReactNode, staging: Staging = {}): string {
  return renderToStaticMarkup(
    <Theme tokens={tokens} contrast={staging.contrast} transparency={staging.transparency} strings={staging.strings}>
      {node}
    </Theme>,
  );
}

/** Text as React's server render escaped it, back to the string the component wrote. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

/** The attributes of the element that carries `slot` inside a render. */
function tagOf(out: string, slot: string): string | undefined {
  return new RegExp(`<[a-z]+ ([^>]*data-ds-slot="${slot}"[^>]*)>`, "u").exec(out)?.[1];
}

/** The attributes of the Chip's pill inside a render. */
function pillTag(out: string): string {
  const tag = tagOf(out, "chip");
  expect(tag, out).toBeDefined();
  return tag ?? "";
}

function attribute(tag: string | undefined, name: string): string | undefined {
  if (tag === undefined) return undefined;
  const found = new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** The element name of the body: `button` for a filter or a button chip, `span` for a static label. */
function bodyElement(out: string): string | undefined {
  return /<([a-z]+) [^>]*data-ds-slot="chip-body"/u.exec(out)?.[1];
}

/** The text the label draws. */
function labelOf(out: string): string | undefined {
  const found = /data-ds-slot="chip-label"><span [^>]*>([^<]*)<\/span><\/span>/u.exec(out)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** A spec example's props as the component takes them, with the handlers both galleries hand every example. */
function propsOf(example: (typeof spec.examples)[number]): ChipProps {
  return { ...(example.props as unknown as ChipProps), onPress: noop, onRemove: noop };
}

/** An example of Chip.yaml, staged as the harnesses stage it: on the page, on a ground, or in a Surface. */
function staged(example: (typeof spec.examples)[number], staging: Staging = {}): string {
  const chip = <Chip {...propsOf(example)} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  if (fields.surface === undefined || fields.surface === "page") return html(chip, staging);
  if (fields.surface === "map" || fields.surface === "image") return html(<Backdrop kind={fields.surface}>{chip}</Backdrop>, staging);
  return html(
    <Surface material={fields.surface as SurfaceMaterial} backdrop={(fields.backdrop ?? "none") as BackdropKind} radius="card">
      {chip}
    </Surface>,
    staging,
  );
}

/** A node staged on a ground: the page, the page over a kind (`Backdrop`), or a Surface of a material over a backdrop. */
function onGround(material: SurfaceMaterial, backdrop: BackdropKind, node: ReactNode): ReactNode {
  if (material === "page") return backdrop === "none" ? node : <Backdrop kind={backdrop}>{node}</Backdrop>;
  return (
    <Surface material={material} backdrop={backdrop}>
      {node}
    </Surface>
  );
}

function contextIn(density: Density, modality: Modality = "pointer"): TokenContext {
  return { colorScheme: "light", contrast: "standard", transparency: "standard", density, modality, motion: "standard" };
}

/** The contexts the parts' cells are keyed by, and the part, the variable Chip.css sets for it, and its selected path. */
const PARTS = [
  ["label.color", "--ds--chip-label", "label.selected.color"],
  ["leadingIcon.color", "--ds--chip-leading", "leadingIcon.selected.color"],
  ["trailingIcon.color", "--ds--chip-trailing", "trailingIcon.color"],
  ["root.border", "--ds--chip-border", "root.selected.border"],
] as const;

describe("the spec is the one this package implements", () => {
  it("is Chip.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...chipSizes]).toEqual(propValues(spec, "size"));
  });

  it("declares the props Chip takes, with the defaults Chip renders, and no default for isSelected (behavior 1)", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["label", "size", "leadingIcon", "avatar", "trailingIcon", "isSelected", "isRemovable", "isDisabled", "onPress", "onRemove"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ size: "sm", isRemovable: false, isDisabled: false });
    const types = Object.fromEntries(spec.props.map((prop) => [prop.name, (prop as unknown as { type: string }).type]));
    expect(types["avatar"]).toBe("slot");
    expect(types["isSelected"]).toBe("boolean");
    const tag = pillTag(html(<Chip label="Last 24 hours" />));
    expect(attribute(tag, "data-ds-size")).toBe("sm");
    expect(attribute(tag, "data-ds-kind")).toBe("label");
    expect(tag).not.toContain("data-ds-selected");
    expect(tag).not.toContain("data-ds-removable");
    expect(tag).not.toContain("data-disabled");
  });

  // The axis check: every matrix is keyed by the axis this suite loops over, so a cell keyed by anything else, or a
  // part or property this sheet does not map, fails here rather than passing unread.
  it("keys every matrix by the axes the tests below walk", () => {
    expect(Object.keys(spec.tokens)).toEqual(["root", "label", "leadingIcon", "trailingIcon"]);
    expect(Object.keys(spec.tokens["root"] ?? {})).toEqual([
      "background",
      "blur",
      "saturate",
      "fallbackBackground",
      "fallbackUnderlay",
      "edgeColor",
      "edgeStartAlpha",
      "edgeEndAlpha",
      "border",
      "borderWidth",
      "radius",
      "height",
      "paddingX",
      "gap",
      "hover",
      "pressed",
      "selected",
      "focus-visible",
      "disabled",
    ]);
    expect(Object.keys(block(bindingAt(spec, "root.hover")))).toEqual(["overlay"]);
    expect(Object.keys(block(bindingAt(spec, "root.pressed")))).toEqual(["overlay"]);
    expect(Object.keys(block(bindingAt(spec, "root.selected")))).toEqual(["border", "borderWidth"]);
    expect(Object.keys(block(bindingAt(spec, "root.focus-visible")))).toEqual(["ring", "ringWidth"]);
    expect(Object.keys(block(bindingAt(spec, "root.disabled")))).toEqual(["opacity"]);
    expect(Object.keys(spec.tokens["label"] ?? {})).toEqual(["typography", "color", "selected"]);
    expect(Object.keys(spec.tokens["leadingIcon"] ?? {})).toEqual(["size", "color", "selected"]);
    expect(Object.keys(spec.tokens["trailingIcon"] ?? {})).toEqual(["size", "color"]);
    const materials = new Set<string>([...surfaceMaterials, "default"]);
    const backdrops = new Set<string>([...backdropKinds, "default"]);
    const contextPaths = [
      "root.background",
      "root.blur",
      "root.saturate",
      "root.edgeStartAlpha",
      "root.edgeEndAlpha",
      "root.border",
      "root.selected.border",
      "label.color",
      "label.selected.color",
      "leadingIcon.color",
      "leadingIcon.selected.color",
      "trailingIcon.color",
    ];
    for (const path of contextPaths) {
      for (const [material, inner] of Object.entries(block(bindingAt(spec, path)))) {
        expect(materials.has(material), `${cellName(spec, path)} is keyed by ${material}`).toBe(true);
        if (typeof inner !== "string") for (const key of Object.keys(inner)) expect(backdrops.has(key), `${cellName(spec, path, material)} is keyed by ${key}`).toBe(true);
      }
    }
    for (const path of ["root.height", "root.paddingX", "label.typography"]) {
      expect(Object.keys(block(bindingAt(spec, path))), cellName(spec, path)).toEqual([...chipSizes]);
    }
    // The press and the hover are layers with no material axis (behavior, "The hover overlay and the pressed fill").
    expect(typeof bindingAt(spec, "root.pressed.overlay")).toBe("string");
    expect(typeof bindingAt(spec, "root.hover.overlay")).toBe("string");
  });

  it("states the input states, the selection and the disabled state, and the one press haptic", () => {
    const fields = spec as unknown as { readonly states: readonly string[]; readonly haptics?: Readonly<Record<string, string>> };
    expect(fields.states).toEqual(["default", "hover", "pressed", "selected", "focus-visible", "disabled"]);
    expect(fields.haptics).toEqual({ press: "haptic.impact.light" });
    expect([...chipKinds]).toEqual(["filter", "button", "label"]);
  });
});

describe("the pill is the Surface module's glass chip (ADR-0036)", () => {
  // Chip hands the chip shape exactly the spec's `root.background` cell on every ground, and the stylesheet hands it
  // the own cell as a custom property; nothing of Chip names a recipe, a setting or a fallback.
  it.each(grounds)("root.background on $material over $backdrop is what Chip hands the chip", ({ material, backdrop }) => {
    const background = specCell("root.background", material, backdrop);
    const fill = chipBackground({ material, backdrop });
    const expected = background.token === undefined ? "none" : background.token === "material.glass.chip" ? "glass" : "own";
    expect(fill, background.name).toBe(expected);
    if (fill === "own") {
      expect(value(pill(material, backdrop, { "data-ds-surface-chip": "own" }), "--ds--surface-chip-own"), background.name).toBe(bound(background.token));
    }
    // Media is exactly where the pill binds the recipe.
    expect(isChipOverMedia({ material, backdrop }), background.name).toBe(fill === "glass");
  });

  it("has no fill of its own on accent and on inverse, on any backdrop (behavior, `root.background`)", () => {
    for (const material of ["accent", "inverse"] as const) {
      for (const backdrop of backdropKinds) {
        const background = specCell("root.background", material, backdrop);
        expect(background.token, background.name).toBeUndefined();
        expect(chipBackground({ material, backdrop }), background.name).toBe("none");
      }
    }
    expect(Object.keys(block(bindingAt(spec, "root.background")))).not.toContain("default");
  });

  it("root.fallbackBackground and root.fallbackUnderlay are what the chip paints under its fallback: raised over the page", () => {
    const background = specCell("root.fallbackBackground");
    const underlay = specCell("root.fallbackUnderlay");
    const fallback = declarationsOf(surfaceRules, '.ds-surface-chip[data-ds-surface-chip="fallback"]');
    expect(fallback["--ds--surface-chip-fill"], background.name).toBe(bound(background.token));
    expect(fallback["--ds--surface-chip-under"], underlay.name).toBe(bound(underlay.token));
    expect(background.token, background.name).toBe("color.bg.surface.raised");
    expect(underlay.token, underlay.name).toBe("color.bg.page");
  });

  // Blur and saturation are bound exactly where the chip draws a backdrop filter: glass over media and on vivid, and
  // never on the scheme's glass, where it draws the fill and the edge flat (ADR-0036 §5). The edge is bound exactly
  // where glass renders at all.
  it.each(grounds)("root.blur, root.saturate and the edge cells on $material over $backdrop are where the chip draws them", ({ material, backdrop }) => {
    const glass = chipBackground({ material, backdrop }) === "glass";
    const filters = glass && material !== "glass" && material !== "glassLight";
    const blur = specCell("root.blur", material, backdrop);
    const saturate = specCell("root.saturate", material, backdrop);
    expect(blur.token, blur.name).toBe(filters ? "material.glass.chip.blur" : undefined);
    expect(saturate.token, saturate.name).toBe(filters ? "material.glass.chip.saturate" : undefined);
    const start = specCell("root.edgeStartAlpha", material, backdrop);
    const end = specCell("root.edgeEndAlpha", material, backdrop);
    expect(start.token, start.name).toBe(glass ? "material.glass.chip.edge.start" : undefined);
    expect(end.token, end.name).toBe(glass ? "material.glass.chip.edge.end" : undefined);
  });

  it("the chip paints those cells from the recipe's variables: the filter, its flat form, the edge ramp and its colour", () => {
    const glassRule = declarationsOf(surfaceRules, '.ds-surface-chip[data-ds-surface-chip="glass"]');
    expect(squash(glassRule["backdrop-filter"])).toBe(
      `blur(${bound(specCell("root.blur", "vivid").token) ?? ""}) saturate(${bound(specCell("root.saturate", "vivid").token) ?? ""})`,
    );
    expect(glassRule["--ds--surface-chip-fill"], cellName(spec, "root.background", "vivid")).toBe(bound(specCell("root.background", "vivid").token));
    expect(declarationsOf(surfaceRules, '.ds-surface-chip[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]')).toEqual({ "backdrop-filter": "none" });
    const edge = squash(declarationsOf(surfaceRules, '.ds-surface-chip > [data-ds-slot="surface-chip-edge"]')["background-image"]);
    for (const path of ["root.edgeColor", "root.edgeStartAlpha", "root.edgeEndAlpha"]) {
      const token = cell(bindingAt(spec, path), "vivid");
      expect(edge, cellName(spec, path, "vivid")).toContain(bound(token) ?? "unset");
    }
  });

  it("sets neither background-color nor background-image on the pill, names no glass recipe and declares no backdrop filter (ADR-0036 rule 2)", () => {
    for (const rule of rules) {
      const onPill = rule.selectors.some((selector) => rightmostCompound(selector).startsWith(".ds-chip") && !rightmostCompound(selector).startsWith(".ds-chip-"));
      for (const declaration of rule.declarations) {
        const where = `${rule.selectors.join(", ")}: ${declaration.property}`;
        if (onPill) expect(["background", "background-color", "background-image"], where).not.toContain(declaration.property);
        expect(["backdrop-filter", "-webkit-backdrop-filter"], where).not.toContain(declaration.property);
        expect(declaration.value, where).not.toMatch(/--ds-material-glass-|backdrop-filter/u);
      }
    }
    expect(rules.some((rule) => rule.selectors.includes(".ds-chip"))).toBe(true);
  });

  it("extends the chip shape's transitions with the press scale, rather than restating them (Surface.css, ADR-0036 rule 13)", () => {
    const base = declarationsOf(rules, ".ds-chip");
    expect(splitTopLevel(squash(base["transition"]))).toEqual([
      "var(--ds--surface-chip-transition)",
      `scale var(--ds-motion-spring-snappy-duration) var(--ds-motion-spring-snappy-easing)`,
    ]);
    expect(declarationsOf(surfaceRules, ".ds-surface-chip")["transition"]).toBe("var(--ds--surface-chip-transition)");
    // The scale and the opacity sit on the pill, the element that carries the backdrop filter, which keeps the blur.
    expect(declarationsOf(rules, ".ds-chip[data-pressed]")).toEqual({ scale: "var(--ds--chip-press-scale)" });
    expect(declarationsOf(rules, ".ds-chip[data-disabled]")).toEqual({ opacity: bound(specCell("root.disabled.opacity").token) });
  });

  // A server render of the pill on each staging: the rendering the chip resolved, the context it publishes, and the
  // flat form on the scheme's glass.
  it.each<readonly [string, (node: ReactNode) => ReactNode, string, string, string, boolean]>([
    ["the page", (node) => node, "own", "page", "none", false],
    ["the page over a map", (node) => <Backdrop kind="map">{node}</Backdrop>, "glass", "page", "map", false],
    ["the page over an image", (node) => <Backdrop kind="image">{node}</Backdrop>, "glass", "page", "image", false],
    ["the page over vivid", (node) => <Backdrop kind="vivid">{node}</Backdrop>, "glass", "page", "vivid", false],
    ["a vivid Surface", (node) => <Surface material="vivid">{node}</Surface>, "glass", "vivid", "none", false],
    ["the scheme's glass over a map", (node) => <Surface material="glass" backdrop="map">{node}</Surface>, "glass", "glass", "map", true],
    ["light glass over an image", (node) => <Surface material="glassLight" backdrop="image">{node}</Surface>, "own", "glassLight", "image", false],
    ["a raised Surface", (node) => <Surface material="raised">{node}</Surface>, "own", "raised", "none", false],
    ["an accent Surface", (node) => <Surface material="accent">{node}</Surface>, "none", "accent", "none", false],
    ["an inverse Surface", (node) => <Surface material="inverse">{node}</Surface>, "none", "inverse", "none", false],
  ])("on %s it renders %s and publishes %s over %s", (_ground, stage, rendering, material, backdrop, flat) => {
    const tag = pillTag(html(stage(<Chip label="Depots" onPress={noop} />)));
    expect(attribute(tag, "class")).toBe("ds-surface-chip ds-chip");
    expect(attribute(tag, "data-ds-surface-chip")).toBe(rendering);
    expect(attribute(tag, "data-ds-surface")).toBe(material);
    expect(attribute(tag, "data-ds-backdrop")).toBe(backdrop);
    expect(attribute(tag, "data-ds-surface-chip-flat")).toBe(flat ? "" : undefined);
    expect(attribute(tag, "data-ds-elevation")).toBe("flat");
  });

  it("draws the recipe's edge first among the pill's children whenever glass renders, and never otherwise", () => {
    const onMap = html(
      <Backdrop kind="map">
        <Chip label="Depots" onPress={noop} />
      </Backdrop>,
    );
    expect(onMap).toMatch(/data-ds-slot="chip"[^>]*><span data-ds-slot="surface-chip-edge" aria-hidden="true"><\/span>/u);
    expect(html(<Chip label="Depots" onPress={noop} />)).not.toContain("surface-chip-edge");
  });
});

describe("Chip.css binds what Chip.yaml binds", () => {
  // Every expectation names the cell it checks, as the Apple helper does, so a wrong cell fails under its own path.
  it.each(grounds)("the label, the glyphs and the stroke on $material over $backdrop, at rest and selected", ({ material, backdrop }) => {
    for (const selected of [false, true]) {
      const state = pill(material, backdrop, selected ? { "data-ds-selected": "" } : {});
      for (const [rest, property, chosen] of PARTS) {
        const path = selected ? chosen : rest;
        const color = specCell(path, material, backdrop);
        expect(color.token, `${color.name} is set`).toBeDefined();
        expect(value(state, property), `${color.name}${selected ? " (selected)" : ""}`).toBe(bound(color.token));
      }
      const width = specCell(selected ? "root.selected.borderWidth" : "root.borderWidth");
      expect(value(state, "--ds--chip-border-width"), width.name).toBe(bound(width.token));
    }
  });

  it("the parts take those colours: the label and the glyphs as their colour, the stroke as an inset shadow over the layers", () => {
    expect(declarationsOf(rules, ".ds-chip-label")["color"], cellName(spec, "label.color")).toBe("var(--ds--chip-label)");
    expect(declarationsOf(rules, '.ds-chip :is([data-ds-slot="chip-leading-icon"], [data-ds-slot="chip-check"])')["color"], cellName(spec, "leadingIcon.color")).toBe("var(--ds--chip-leading)");
    expect(declarationsOf(rules, '.ds-chip :is([data-ds-slot="chip-trailing-icon"], [data-ds-slot="chip-remove-icon"])')["color"], cellName(spec, "trailingIcon.color")).toBe(
      "var(--ds--chip-trailing)",
    );
    const body = declarationsOf(rules, ".ds-chip-body");
    expect(body["box-shadow"], `${cellName(spec, "root.border")}, ${cellName(spec, "root.borderWidth")}`).toBe("inset 0 0 0 var(--ds--chip-border-width) var(--ds--chip-border)");
    // The body covers the pill: its layers and its stroke are the pill's, drawn over whatever the chip renders.
    expect(body["border-radius"]).toBe("inherit");
    expect(squash(body["background-image"])).toBe("linear-gradient(var(--ds--chip-hover), var(--ds--chip-hover)), linear-gradient(var(--ds--chip-press), var(--ds--chip-press))");
    expect(body["background-color"]).toBe("transparent");
    expect(body["white-space"]).toBe("nowrap");
  });

  it("root.height, root.paddingX, root.gap and root.radius: one row of the control height, which never wraps", () => {
    const body = declarationsOf(rules, ".ds-chip-body");
    expect(body["min-block-size"], cellName(spec, "root.height")).toBe("var(--ds--chip-height)");
    expect(body["padding-inline-end"], cellName(spec, "root.paddingX")).toBe("var(--ds--chip-padding-x)");
    expect(body["padding-inline-start"], cellName(spec, "root.paddingX")).toBe("var(--ds--chip-padding-start)");
    expect(body["gap"], cellName(spec, "root.gap")).toBe(bound(specCell("root.gap").token));
    expect(declarationsOf(rules, ".ds-chip")["border-radius"], cellName(spec, "root.radius")).toBe(bound(specCell("root.radius").token));
    for (const size of chipSizes) {
      const state = { classes: ["ds-chip"], attributes: { "data-ds-size": size } };
      const height = specCell("root.height", size);
      const padding = specCell("root.paddingX", size);
      expect(value(state, "--ds--chip-height"), height.name).toBe(bound(height.token));
      expect(value(state, "--ds--chip-padding-x"), padding.name).toBe(bound(padding.token));
      // Without an Avatar the leading side is paddingX too.
      expect(value(state, "--ds--chip-padding-start")).toBe("var(--ds--chip-padding-x)");
    }
    // With an Avatar the leading inset is the Avatar's own inset, so the circle is concentric with the pill's end.
    expect(value({ classes: ["ds-chip"], attributes: { "data-ds-size": "md", "data-ds-avatar": "" } }, "--ds--chip-padding-start")).toBe(
      "calc((var(--ds-size-control-md) - var(--ds-size-control-sm)) / 2)",
    );
  });

  it.each(chipSizes.map((size) => [size] as const))("label.typography, leadingIcon.size and trailingIcon.size of %s", (size) => {
    const role = specCell("label.typography", size);
    expect(`type.${chipLabelRole(size).replace("-", ".")}`, role.name).toBe(role.token);
    const out = html(<Chip label="Routes" size={size} leadingIcon="action.filter" trailingIcon="action.copy" onPress={noop} />);
    expect(out, role.name).toContain(`data-ds-role="${chipLabelRole(size)}"`);
    for (const [path, slot] of [
      ["leadingIcon.size", "chip-leading-icon"],
      ["trailingIcon.size", "chip-trailing-icon"],
    ] as const) {
      const box = specCell(path);
      expect(box.token, box.name).toBe("size.icon.sm");
      const glyph = tagOf(out, slot);
      expect(attribute(glyph, "data-ds-size"), box.name).toBe("sm");
      // No tone of its own: the glyph takes the colour Chip.css sets on it.
      expect(glyph ?? "").not.toContain("data-ds-tone");
    }
  });

  it("follows density with the pill's height, and nothing else: paddingX and the gap are one value in every density", () => {
    const densities = (spec as unknown as { density: readonly Density[] }).density;
    expect(densities).toEqual(["compact", "regular", "comfortable"]);
    const heights = densities.map((density) => chipSizes.map((size) => tokenValue(tokens, specCell("root.height", size).token ?? "", contextIn(density))));
    expect(new Set(heights.map((row) => JSON.stringify(row))).size, `${cellName(spec, "root.height")} differs in every density`).toBe(densities.length);
    for (const box of [...chipSizes.map((size) => specCell("root.paddingX", size)), specCell("root.gap")]) {
      expect(new Set(densities.map((density) => JSON.stringify(tokenValue(tokens, box.token ?? "", contextIn(density))))).size, `${box.name} is one value in every density`).toBe(1);
    }
    // radius.chip is at least half of every height in every density and modality, so the pill's ends are round.
    const radius = specCell("root.radius");
    for (const density of densities) {
      for (const modality of ["pointer", "touch"] as const) {
        const half = Number(tokenValue(tokens, radius.token ?? "", contextIn(density, modality)));
        for (const size of chipSizes) {
          const height = Number(tokenValue(tokens, specCell("root.height", size).token ?? "", contextIn(density, modality)));
          expect(half, `${radius.name} is at least half of ${cellName(spec, "root.height", size)}, ${density} ${modality}`).toBeGreaterThanOrEqual(height / 2);
        }
      }
    }
  });

  it("root.hover.overlay under ds-pointer only, and root.pressed.overlay on every press: layers over the chip's rendering", () => {
    const overlay = specCell("root.hover.overlay");
    const hovered = { classes: ["ds-chip-body"], attributes: { "data-hovered": "" } };
    expect(cascade.value({ ...hovered, variants: ["ds-pointer"] }, "--ds--chip-hover"), `${overlay.name} under ds-pointer`).toBe(bound(overlay.token));
    expect(cascade.value({ ...hovered, variants: ["ds-touch"] }, "--ds--chip-hover"), `${overlay.name} under ds-touch`).toBe("transparent");
    const pressed = specCell("root.pressed.overlay");
    expect(cascade.value({ classes: ["ds-chip-body"], attributes: { "data-pressed": "" } }, "--ds--chip-press"), pressed.name).toBe(bound(pressed.token));
    expect(cascade.value({ classes: ["ds-chip-body"], attributes: {} }, "--ds--chip-press")).toBe("transparent");
    // Both are registered colours, so they crossfade over motion.duration.base.
    const registered = allAtRules(parseCss(css)).filter((at) => at.name === "property").map((at) => at.params);
    expect(registered).toEqual(["--ds--chip-press", "--ds--chip-hover"]);
  });

  it("root.focus-visible: the ring outside the pill, and outside the remove control's glyph when that control has focus", () => {
    const ring = specCell("root.focus-visible.ring");
    const width = specCell("root.focus-visible.ringWidth");
    const expected = { outline: `${bound(width.token) ?? ""} solid ${bound(ring.token) ?? ""}` };
    expect(declarationsOf(rules, ".ds-chip-body[data-focus-visible]"), `${ring.name}, ${width.name}`).toEqual(expected);
    expect(declarationsOf(rules, ".ds-chip-remove[data-focus-visible]"), `${ring.name}, ${width.name}`).toEqual(expected);
    // The remove control's box is round, so its ring is a circle.
    expect(declarationsOf(rules, ".ds-chip-remove")["border-radius"]).toBe("var(--ds-radius-control)");
  });

  it("the hit regions: the pill's reaches size.hit for a control and not for a label, the remove control's its own, above the body's", () => {
    const region = {
      content: '""',
      position: "absolute",
      "inset-block": "min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))",
      "inset-inline": "min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))",
    };
    expect(declarationsOf(rules, '.ds-chip:is([data-ds-kind="filter"], [data-ds-kind="button"]) > .ds-chip-body::before')).toEqual(region);
    expect(declarationsOf(rules, ".ds-chip-remove::before")).toEqual(region);
    const remove = declarationsOf(rules, ".ds-chip-remove");
    expect(remove["position"]).toBe("absolute");
    expect(remove["z-index"]).toBe("1");
    // Over the place the body keeps for it, root.paddingX from the trailing edge, in the glyph's box.
    expect(remove["inset-inline-end"], cellName(spec, "root.paddingX")).toBe("var(--ds--chip-padding-x)");
    expect(remove["inline-size"], cellName(spec, "trailingIcon.size")).toBe(bound(specCell("trailingIcon.size").token));
    const space = declarationsOf(rules, '.ds-chip [data-ds-slot="chip-remove-space"]');
    expect(space["inline-size"], cellName(spec, "trailingIcon.size")).toBe(bound(specCell("trailingIcon.size").token));
  });

  it("reads no runtime axis: its only at-rules are the colour registrations, the layer, the pointer variant and forced colors", () => {
    expect([...new Set(allAtRules(parseCss(css)).map((at) => `${at.name} ${at.params}`))]).toEqual([
      "property --ds--chip-press",
      "property --ds--chip-hover",
      "layer ds.components",
      "variant ds-pointer",
      "media (forced-colors: active)",
    ]);
    // test/cascade.ts cannot read :not(), so no selector uses it.
    expect(rules.flatMap((rule) => rule.selectors).filter((selector) => selector.includes(":not("))).toEqual([]);
  });
});

describe("motion (Chip.yaml motion, ADR-0023 §8.4)", () => {
  const crossfade = "var(--ds-motion-presentation-crossfade)";

  it("scales the pill to 0.97 on motion.spring.snappy, and not at all under Reduce Motion", () => {
    const press = specCell("motion.press");
    expect(press.token).toBe("motion.spring.snappy");
    const base = declarationsOf(rules, ".ds-chip");
    expect(base["--ds--chip-press-scale"], press.name).toBe(`calc(1 - 0.03 * (1 - ${crossfade}))`);
    expect(squash(base["transition"]), press.name).toContain("scale var(--ds-motion-spring-snappy-duration) var(--ds-motion-spring-snappy-easing)");
  });

  it("moves the stroke and the label tone on motion.spring.smooth, which Reduce Motion turns into a crossfade over motion.duration.base", () => {
    const select = specCell("motion.select");
    expect(select.token).toBe("motion.spring.smooth");
    expect(specCell("motion.reduceMotion").token).toBe("crossfade");
    const base = declarationsOf(rules, ".ds-chip");
    expect(squash(base["--ds--chip-select-duration"]), select.name).toBe(
      `calc( var(--ds-motion-spring-smooth-duration) * (1 - ${crossfade}) + var(--ds-motion-duration-base) * ${crossfade} )`,
    );
    const body = splitTopLevel(squash(declarationsOf(rules, ".ds-chip-body")["transition"]));
    expect(body).toEqual([
      "--ds--chip-press var(--ds-motion-duration-base) var(--ds-motion-easing-out)",
      "--ds--chip-hover var(--ds-motion-duration-base) var(--ds-motion-easing-out)",
      "box-shadow var(--ds--chip-select-duration) var(--ds-motion-spring-smooth-easing)",
    ]);
    // The label and the leading glyph carry their own colours, so each moves its own tone; the trailing glyph's cell
    // has no selected form, and the check appears and leaves with the selection, with no fade of its own.
    const tone = "color var(--ds--chip-select-duration) var(--ds-motion-spring-smooth-easing)";
    expect(squash(declarationsOf(rules, ".ds-chip-label")["transition"]), select.name).toBe(tone);
    expect(squash(declarationsOf(rules, '.ds-chip :is([data-ds-slot="chip-leading-icon"], [data-ds-slot="chip-check"])')["transition"]), select.name).toBe(tone);
    expect(declarationsOf(rules, '.ds-chip :is([data-ds-slot="chip-trailing-icon"], [data-ds-slot="chip-remove-icon"])')["transition"]).toBeUndefined();
    expect(css).not.toMatch(/@keyframes/u);
  });
});

describe("behaviour", () => {
  it("decides its role from the props alone (behavior 1): a filter, a button or a static label", () => {
    expect(chipKind(true, true, false)).toBe("filter");
    expect(chipKind(false, false, false)).toBe("filter");
    expect(chipKind(undefined, true, false)).toBe("button");
    expect(chipKind(undefined, false, true)).toBe("button");
    expect(chipKind(undefined, false, false)).toBe("label");

    const filter = html(<Chip label="Last 24 hours" isSelected onPress={noop} />);
    expect(bodyElement(filter)).toBe("button");
    expect(attribute(tagOf(filter, "chip-body"), "aria-pressed")).toBe("true");
    expect(attribute(pillTag(filter), "data-ds-kind")).toBe("filter");
    expect(attribute(pillTag(filter), "data-ds-selected")).toBe("");
    const off = html(<Chip label="Last 24 hours" isSelected={false} onPress={noop} />);
    expect(attribute(tagOf(off, "chip-body"), "aria-pressed")).toBe("false");
    expect(pillTag(off)).not.toContain("data-ds-selected");

    const button = html(<Chip label="B-4417" trailingIcon="action.copy" onPress={noop} />);
    expect(bodyElement(button)).toBe("button");
    expect(tagOf(button, "chip-body") ?? "").not.toContain("aria-pressed");
    expect(attribute(pillTag(button), "data-ds-kind")).toBe("button");

    const label = html(<Chip label="North yard" />);
    expect(bodyElement(label)).toBe("span");
    expect(label).not.toMatch(/<button|\srole="/u);
    expect(attribute(pillTag(label), "data-ds-kind")).toBe("label");
  });

  it("draws the remove control beside the body, named by the app's strings.Chip.remove template (ADR-0032 rules 1, 2 and 7)", () => {
    const out = html(<Chip label="North yard" isRemovable onPress={noop} onRemove={noop} />);
    const remove = tagOf(out, "chip-remove");
    expect(remove).toBeDefined();
    expect(attribute(remove, "aria-label")).toBe("Remove North yard");
    expect(attribute(remove, "class")).toBe("ds-chip-remove");
    // Beside the body, never inside it: the body closes before the remove control opens.
    expect(out.indexOf("</button>")).toBeLessThan(out.indexOf('data-ds-slot="chip-remove"'));
    expect(out).toContain('data-ds-slot="chip-remove-space"');
    expect(tagOf(out, "chip-remove-icon") ?? "").toContain('data-ds-icon="nav.close"');
    expect(chipRemoveName("North yard", defaultStrings)).toBe("Remove North yard");
    // The app's table replaces the template, and React Aria's own string never supplies the name.
    const translated = html(<Chip label="Северный двор" isRemovable onRemove={noop} />, { strings: { "Chip.remove": "Удалить: {label}" } });
    expect(attribute(tagOf(translated, "chip-remove"), "aria-label")).toBe("Удалить: Северный двор");
    // A template that drops the label is the app's words alone, and a label is placed as written, never read as a
    // template (Button's loading name is the precedent, G-24).
    const wordless = html(<Chip label="North yard" isRemovable onRemove={noop} />, { strings: { "Chip.remove": "Удалить" } });
    expect(attribute(tagOf(wordless, "chip-remove"), "aria-label")).toBe("Удалить");
    expect(attribute(tagOf(html(<Chip label="{label}" isRemovable onRemove={noop} />), "chip-remove"), "aria-label")).toBe("Remove {label}");
    // A removable chip with no onPress is still a control: its body is a button, for Delete and Backspace.
    expect(bodyElement(translated)).toBe("button");
    expect(html(<Chip label="North yard" onPress={noop} />)).not.toContain("chip-remove");
    expect(isChipRemoveKey("Delete") && isChipRemoveKey("Backspace")).toBe(true);
    expect(isChipRemoveKey(" ") || isChipRemoveKey("Enter") || isChipRemoveKey("x")).toBe(false);
  });

  it("gives isRemovable the trailing position: a trailingIcon given with it is not drawn (behavior, `trailingIcon`)", () => {
    expect(showsChipTrailingIcon(false, true)).toBe(true);
    expect(showsChipTrailingIcon(true, true)).toBe(false);
    expect(showsChipTrailingIcon(false, false)).toBe(false);
    const both = html(<Chip label="B-4417" trailingIcon="action.copy" isRemovable onPress={noop} onRemove={noop} />);
    expect(both).not.toContain('data-ds-icon="action.copy"');
    expect(both).toContain('data-ds-icon="nav.close"');
    expect(html(<Chip label="B-4417" trailingIcon="action.copy" onPress={noop} />)).toContain('data-ds-icon="action.copy"');
  });

  it("puts an Avatar in the leading position on the md chip only, at size sm and decorative, in place of leadingIcon", () => {
    expect(drawsChipAvatar("md", true)).toBe(true);
    expect(drawsChipAvatar("sm", true)).toBe(false);
    expect(drawsChipAvatar("md", false)).toBe(false);
    const md = html(<Chip label="Anna Petrova" size="md" avatar={{ name: "Anna Petrova" }} leadingIcon="object.user" onPress={noop} />);
    const avatar = tagOf(md, "avatar");
    expect(attribute(avatar, "data-ds-size")).toBe("sm");
    expect(attribute(avatar, "aria-hidden")).toBe("true");
    expect(avatar ?? "").not.toMatch(/role=|aria-label/u);
    expect(attribute(pillTag(md), "data-ds-avatar")).toBe("");
    expect(md).not.toContain('data-ds-icon="object.user"');
    // The sm chip draws no Avatar, and the leading glyph keeps its place.
    const sm = html(<Chip label="Anna Petrova" size="sm" avatar={{ name: "Anna Petrova" }} leadingIcon="object.user" onPress={noop} />);
    expect(tagOf(sm, "avatar")).toBeUndefined();
    expect(pillTag(sm)).not.toContain("data-ds-avatar");
    expect(sm).toContain('data-ds-icon="object.user"');
  });

  it("puts status.check in the leading position of a selected chip over media and on inverse, and nowhere else", () => {
    for (const { material, backdrop } of grounds) {
      const expected = isChipOverMedia({ material, backdrop }) || material === "inverse";
      expect(showsChipCheck({ material, backdrop }), `${material} over ${backdrop}`).toBe(expected);
      expect(chipLeading(true, { material, backdrop }, true, true), `${material} over ${backdrop}`).toBe(expected ? "check" : "avatar");
      expect(chipLeading(false, { material, backdrop }, true, true), `${material} over ${backdrop}`).toBe("avatar");
    }
    expect(chipLeading(false, { material: "page", backdrop: "none" }, false, true)).toBe("icon");
    expect(chipLeading(false, { material: "page", backdrop: "none" }, false, false)).toBeNull();
    const onMap = html(
      <Backdrop kind="map">
        <Chip label="Depots" isSelected leadingIcon="object.map-pin" onPress={noop} />
      </Backdrop>,
    );
    expect(onMap).toContain('data-ds-slot="chip-check" data-ds-icon="status.check"');
    expect(onMap).not.toContain('data-ds-icon="object.map-pin"');
    const onInverse = html(
      <Surface material="inverse">
        <Chip label="Depots" isSelected onPress={noop} />
      </Surface>,
    );
    expect(onInverse).toContain('data-ds-icon="status.check"');
    const onPage = html(<Chip label="Depots" isSelected leadingIcon="object.map-pin" onPress={noop} />);
    expect(onPage).not.toContain("status.check");
    expect(onPage).toContain('data-ds-icon="object.map-pin"');
  });

  it("keeps its own name, role and parts over what a caller casts past the type, and runs no stray handler", () => {
    const Loose = Chip as unknown as (props: Record<string, unknown>) => ReactNode;
    const out = html(
      <Loose
        label="Depots"
        onPress={noop}
        role="checkbox"
        aria-label="Sites"
        aria-pressed="true"
        aria-hidden="true"
        title="Depots"
        tabIndex={0}
        onClick={() => undefined}
        data-ds-surface="glass"
        className="app-chip"
        id="depots"
      >
        child
      </Loose>,
    );
    const tag = pillTag(out);
    expect(tag).not.toMatch(/\srole=|aria-label|aria-pressed|aria-hidden|title=|tabindex|onclick/iu);
    expect(attribute(tag, "data-ds-surface")).toBe("page");
    expect(attribute(tag, "class")).toBe("ds-surface-chip ds-chip app-chip");
    expect(attribute(tag, "id")).toBe("depots");
    expect(out).not.toContain("child");
    expect(labelOf(out)).toBe("Depots");
  });

  it("forwards ScopeAttributes to the pill (ADR-0019 rule 8)", () => {
    const tag = pillTag(html(<Chip label="Depots" data-ds-color-scheme="dark" data-ds-density="compact" />));
    expect(attribute(tag, "data-ds-color-scheme")).toBe("dark");
    expect(attribute(tag, "data-ds-density")).toBe("compact");
  });

  it("marks a disabled chip on the pill and disables its controls", () => {
    const out = html(<Chip label="Last 24 hours" isDisabled isRemovable onPress={noop} onRemove={noop} />);
    expect(attribute(pillTag(out), "data-disabled")).toBe("");
    expect(tagOf(out, "chip-body") ?? "").toContain("disabled");
    expect(tagOf(out, "chip-remove") ?? "").toContain("disabled");
  });
});

/**
 * Chip.yaml `accessibility.reduceTransparency` and ADR-0036 rule 5: under Reduce Transparency and under Increase
 * Contrast the chip falls back and publishes `(raised, none)` on every ground where Chip asks for glass, so every part
 * takes its `default` cell and the check is gone. Read off the server render: the pill's rendering and the context it
 * publishes, the context the glyphs read inside the chip's scope, and the cells that context selects.
 */
describe("under a forced Reduce Transparency and Increase Contrast every part is its default cell", () => {
  const stagings: readonly (readonly [string, (node: ReactNode) => ReactNode, string, string])[] = [
    ["the page over a map", (node) => <Backdrop kind="map">{node}</Backdrop>, "fallback", "none"],
    ["the page over an image", (node) => <Backdrop kind="image">{node}</Backdrop>, "fallback", "none"],
    ["the page over vivid", (node) => <Backdrop kind="vivid">{node}</Backdrop>, "fallback", "none"],
    ["a vivid Surface", (node) => <Surface material="vivid">{node}</Surface>, "fallback", "none"],
    ["the scheme's glass over an image", (node) => <Surface material="glass" backdrop="image">{node}</Surface>, "own", "image"],
  ];
  const settings: readonly (readonly [string, Staging])[] = [
    ["Reduce Transparency", { transparency: "reduce" }],
    ["Increase Contrast", { contrast: "more" }],
  ];

  it.each(stagings.flatMap(([ground, stage, rendering, backdrop]) => settings.map(([setting, staging]) => [ground, setting, stage, staging, rendering, backdrop] as const)))(
    "on %s under %s",
    (_ground, _setting, stage, staging, rendering, backdrop) => {
      for (const selected of [false, true]) {
        const out = html(stage(<Chip label="Depots" leadingIcon="object.map-pin" isSelected={selected} onPress={noop} />), staging);
        const tag = pillTag(out);
        expect(attribute(tag, "data-ds-surface-chip")).toBe(rendering);
        expect(attribute(tag, "data-ds-surface")).toBe("raised");
        expect(attribute(tag, "data-ds-backdrop")).toBe(backdrop);
        // The glyph inside reads the published context, not the ground, and no check replaces it.
        expect(out).toMatch(new RegExp(`data-ds-slot="chip-leading-icon"[^>]*data-ds-surface="raised" data-ds-backdrop="${backdrop}"`, "u"));
        expect(out).not.toContain("status.check");
        const state = pill("raised", backdrop, { "data-ds-surface-chip": rendering, ...(selected ? { "data-ds-selected": "" } : {}) });
        for (const [rest, property, chosen] of PARTS) {
          const path = selected ? chosen : rest;
          const fallback = block(bindingAt(spec, path))["default"];
          expect(typeof fallback, `${cellName(spec, path)} has a default cell`).toBe("string");
          expect(value(state, property), `${cellName(spec, path, "default")}`).toBe(bound(fallback as string));
        }
      }
    },
  );

  it("is the standard cells again with both settings standard", () => {
    const tag = pillTag(html(<Backdrop kind="map">{<Chip label="Depots" onPress={noop} />}</Backdrop>));
    expect(attribute(tag, "data-ds-surface-chip")).toBe("glass");
    expect(attribute(tag, "data-ds-surface")).toBe("page");
    expect(attribute(tag, "data-ds-backdrop")).toBe("map");
  });
});

/**
 * ADR-0037 with a real host: an Avatar in a Chip reads the enclosure the pill hands it. It renders glass exactly where
 * the pill does, always flat, and its own cell where the pill renders its own or falls back — on every ground a
 * harness can stage and under every setting. The pill's cell is a function of the ground alone (`chipBackground`), so
 * no input state can change it; the browser suite presses the chip and reads the same attributes.
 */
describe("a Chip with its Avatar (ADR-0037)", () => {
  const settings: readonly (readonly [string, Staging])[] = [
    ["standard", {}],
    ["Reduce Transparency", { transparency: "reduce" }],
    ["Increase Contrast", { contrast: "more" }],
  ];

  it.each(grounds.flatMap((ground) => settings.map(([setting, staging]) => [ground.material, ground.backdrop, setting, staging] as const)))(
    "on %s over %s under %s",
    (material, backdrop, _setting, staging) => {
      const out = html(onGround(material, backdrop, <Chip label="Anna Petrova" size="md" avatar={{ name: "Anna Petrova" }} onPress={noop} />), staging);
      const chip = pillTag(out);
      const avatar = tagOf(out, "avatar");
      expect(avatar, out).toBeDefined();
      const chipRendering = attribute(chip, "data-ds-surface-chip");
      const avatarRendering = attribute(avatar, "data-ds-surface-chip");
      // Glass exactly where the pill renders glass, and flat there: a chip inside a chip samples nothing.
      expect(avatarRendering === "glass", `${material} over ${backdrop}: the pill renders ${chipRendering}, the Avatar ${avatarRendering}`).toBe(chipRendering === "glass");
      if (avatarRendering === "glass") expect(attribute(avatar, "data-ds-surface-chip-flat")).toBe("");
      // Where the pill paints its own cell or its fallback the Avatar has no media under it and takes its own cell.
      if (chipRendering === "own" || chipRendering === "fallback") expect(avatarRendering).toBe("own");
      // What the Avatar reads is what the pill publishes.
      expect(attribute(avatar, "data-ds-surface")).toBe(attribute(chip, "data-ds-surface"));
      expect(attribute(avatar, "data-ds-backdrop")).toBe(attribute(chip, "data-ds-backdrop"));
    },
  );

  it("resolves the Avatar the way the Surface module does, from the pill's resolution alone", () => {
    for (const { material, backdrop } of grounds) {
      for (const [, staging] of settings) {
        const settingsOf = { contrast: staging.contrast ?? "standard", transparency: staging.transparency ?? "standard" } as const;
        const host = resolveSurfaceChip(chipBackground({ material, backdrop }), { material, backdrop, depth: 0 }, { enclosure: "none", gate: "content", publishes: "ground" }, settingsOf);
        const nested = resolveSurfaceChip(avatarBackground(host.published), host.published, { enclosure: host.encloses, gate: "content", publishes: "ground" }, settingsOf);
        expect(nested.blursBackdrop, `${material} over ${backdrop}`).toBe(false);
        expect(nested.rendered === "glass", `${material} over ${backdrop}`).toBe(host.rendered === "glass");
      }
    }
  });
});

/**
 * Chip.yaml `accessibility`: every example is one control named by its label, a filter carrying its state, and a
 * removable one a second control named by the strings table. The same names are read off Chromium's tree by
 * web/apps/gallery/test/accessibility.browser.test.tsx and off the simulator's by DSChipAccessibilityTreeTests.
 */
describe("the accessibility the spec writes (Chip.yaml accessibility)", () => {
  interface Expected {
    readonly name: string;
    /** `true` or `false` for a filter chip, the state it carries; absent for a button chip. */
    readonly pressed?: boolean;
    readonly remove?: string;
    readonly disabled?: true;
    readonly rendering: "glass" | "own";
    readonly flat?: true;
    /** Text drawn inside a hidden part: the initials of a decorative Avatar. */
    readonly hidden?: string;
  }

  const expected: Readonly<Record<string, Expected>> = {
    "default-sm": { name: "Last 24 hours", rendering: "own" },
    selected: { name: "Last 24 hours", pressed: true, rendering: "own" },
    "with-leading-icon": { name: "Routes", rendering: "own" },
    removable: { name: "North yard", remove: "Remove North yard", rendering: "own" },
    "identifier-copy": { name: "B-4417", rendering: "own" },
    "md-size": { name: "Depots", rendering: "own" },
    disabled: { name: "Last 24 hours", disabled: true, rendering: "own" },
    "md-with-avatar": { name: "Anna Petrova", rendering: "own", hidden: "AP" },
    "on-map": { name: "Depots", rendering: "glass" },
    "selected-on-map": { name: "Depots", pressed: true, rendering: "glass" },
    "on-vivid": { name: "Yield", rendering: "glass" },
    "on-glass-over-image": { name: "In service", rendering: "glass", flat: true },
    "russian-label": { name: "Последние 24 часа", pressed: true, rendering: "own" },
  };

  it("covers every example of the spec, in its order", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expected));
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s", (id, example) => {
    const want = expected[id];
    const out = staged(example);
    const tag = pillTag(out);
    const body = tagOf(out, "chip-body");
    expect(bodyElement(out), id).toBe("button");
    expect(labelOf(out), id).toBe(want?.name);
    expect(attribute(body, "aria-pressed"), id).toBe(want?.pressed === undefined ? undefined : String(want.pressed));
    expect(attribute(tagOf(out, "chip-remove"), "aria-label"), id).toBe(want?.remove);
    expect(body?.includes("disabled") ?? false, id).toBe(want?.disabled === true);
    expect(attribute(tag, "data-ds-surface-chip"), id).toBe(want?.rendering);
    expect(attribute(tag, "data-ds-surface-chip-flat"), id).toBe(want?.flat === true ? "" : undefined);
    // Nothing carries a role or a name of its own: the body's name is its text, the label, and every glyph, the check
    // and the Avatar are hidden, the Avatar's initials with it.
    expect(out.match(/\srole="/gu) ?? [], id).toEqual([]);
    expect(out.match(/aria-label="/gu)?.length ?? 0, id).toBe(want?.remove === undefined ? 0 : 1);
    expect(out.replace(/<[^>]*>/gu, ""), id).toBe(`${want?.hidden ?? ""}${want?.name ?? ""}`);
    if (want?.hidden !== undefined) expect(attribute(tagOf(out, "avatar"), "aria-hidden"), id).toBe("true");
    if (want !== undefined) {
      expect(want.name).toBe(want.name.normalize("NFC"));
      expect(Buffer.byteLength(want.name, "utf8")).toBe(want.name === "Последние 24 часа" ? 30 : want.name.length);
    }
  });

  it("stages each example's cells: the ground it declares is the context the chip reads", () => {
    for (const example of spec.examples) {
      const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
      const tag = pillTag(staged(example));
      const material = fields.surface === undefined || fields.surface === "map" || fields.surface === "image" ? "page" : fields.surface;
      const backdrop = fields.surface === "map" || fields.surface === "image" ? fields.surface : (fields.backdrop ?? "none");
      expect(attribute(tag, "data-ds-surface"), example.id).toBe(material);
      expect(attribute(tag, "data-ds-backdrop"), example.id).toBe(backdrop);
      const background = specCell("root.background", material, backdrop);
      expect(attribute(tag, "data-ds-surface-chip"), background.name).toBe(background.token === "material.glass.chip" ? "glass" : "own");
      const size = (example.props["size"] as ChipSize | undefined) ?? "sm";
      expect(attribute(tag, "data-ds-size"), example.id).toBe(size);
    }
    // The one Avatar an example writes is a mapping of Avatar's own props, the slot's form (spec/SCHEMA.md).
    expect(spec.examples.filter((example) => example.props["avatar"] !== undefined).map((example) => [example.id, example.props["avatar"]])).toEqual([["md-with-avatar", { name: "Anna Petrova" }]]);
  });
});
