/// <reference types="node" />
/**
 * Toggle (spec/components/Toggle.yaml, specVersion 1).
 *
 * - Toggle.css and the control row's ControlRow.css bind what Toggle.yaml binds, read off the spec cell by cell and
 *   checked as it wins through a small cascade: the row's cells on the root, which the row draws; the track's fill,
 *   outline and outline width and the knob's fill at rest and selected on every material; the track's geometry, the
 *   knob's inset, where the knob rests, the label's role, hover, press, focus and disabled.
 * - Motion: the knob rides motion.flip, motion.spring.snappy, and follows a drag with no animation of its own; the
 *   fill changes over motion.trackFill, motion.duration.quick, which Reduce Motion turns into a crossfade over
 *   motion.duration.base.
 * - The drag (behaviors 2 and 3), as the pure functions the component runs: the threshold the spec writes, the
 *   travel, the progress held between the ends, and what a release commits. A drag that ends where it began, or that
 *   crosses the middle and comes back, commits nothing. The real pointer runs in Chromium
 *   (web/apps/gallery/test/components.browser.test.tsx).
 * - The name (ADR-0041): the caller's route, drawn or hidden, the host's route through the name context, a caller's
 *   own label over the host's, and a switch with no name reported in development; no second name attribute, whatever
 *   a caller casts past the type.
 * - `accessibility`, per spec example: one switch, named as the table below writes, which
 *   web/apps/gallery/test/accessibility.browser.test.tsx reads off Chromium's tree and
 *   swift/Tests/DSSnapshotTests/DSToggleAccessibilityTreeTests.swift off the simulator's, for the same ids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density, type Modality, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Surface, Toggle, labelVisibilities, surfaceMaterials, type BackdropKind, type SurfaceMaterial, type ToggleProps } from "../src/index.ts";
import { NameContext, controlName, isNamed, type ControlName } from "../src/name/name.ts";
import { toggleLabelRole } from "../src/toggle/Toggle.tsx";
import { isToggleDrag, toggleDragCommit, toggleDragProgress, toggleDragThreshold, toggleTravel } from "../src/toggle/parts.ts";
import { tokenValue } from "../src/icon/weight.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss, splitTopLevel } from "./css.ts";
import { bindingAt, cell, cellName, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Toggle");
const rowCss = readFileSync(join(packageRoot, "src", "control-row", "ControlRow.css"), "utf8");
const css = readFileSync(join(packageRoot, "src", "toggle", "Toggle.css"), "utf8");
/** The two sheets in the order styles.css imports them: the row, then Toggle. */
const cascade = new Cascade(`${rowCss}\n${css}`);
const rules = flattenRules(parseCss(css));
const rowRules = flattenRules(parseCss(rowCss));

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);
const block = (binding: Binding | undefined): Record<string, Binding> => (binding ?? {}) as Record<string, Binding>;
const squash = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
const noop = (): void => undefined;
const ZERO_WIDTH = "calc(var(--ds-border-hairline) * 0)";

/** A cell of Toggle.yaml, read and named from one spec path and one key list (`Toggle.yaml tokens.track.border [vivid]`). */
function specCell(path: string, ...keys: readonly string[]): { readonly token: string | undefined; readonly name: string } {
  return { token: cell(bindingAt(spec, path), ...keys), name: cellName(spec, path, ...keys) };
}

/** The Toggle's root, React Aria's field, as the cascade sees it: on `material`, selected or not. */
function root(material: string, isOn: boolean, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-toggle"], attributes: { "data-ds-surface": material, "data-ds-label": "visible", ...(isOn ? { "data-selected": "true" } : {}), ...extra } };
}

/** The row, React Aria's switch button, as the cascade sees it. */
function row(attributes: Record<string, string> = {}, variants: readonly string[] = []): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-control-row"], attributes: { "data-ds-label": "visible", ...attributes }, variants };
}

function html(node: ReactNode): string {
  return renderToStaticMarkup(<Theme tokens={tokens}>{node}</Theme>);
}

/** Text as React's server render escaped it, back to the string the component wrote. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

/** The attributes of the element that carries `slot` inside a render. */
function tagOf(out: string, slot: string): string | undefined {
  return new RegExp(`<[a-z]+ ([^>]*data-ds-slot="${slot}"[^>]*)>`, "u").exec(out)?.[1];
}

/** The attributes of the switch's hidden input. */
function inputOf(out: string): string {
  const tag = /<input ([^>]*)\/?>/u.exec(out)?.[1];
  expect(tag, out).toBeDefined();
  return tag ?? "";
}

function attribute(tag: string | undefined, name: string): string | undefined {
  if (tag === undefined) return undefined;
  const found = new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** The label the row draws, or undefined when it draws none. */
function drawnLabel(out: string): string | undefined {
  const found = /data-ds-slot="toggle-label"><span [^>]*>([^<]*)<\/span><\/span>/u.exec(out)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** A spec example's props as the component takes them, with the handler both galleries hand every example. */
function propsOf(example: (typeof spec.examples)[number]): ToggleProps {
  return { ...(example.props as unknown as ToggleProps), onChange: noop };
}

/** An example of Toggle.yaml, staged as the harnesses stage it: on the page, or inside a Surface of its material. */
function staged(example: (typeof spec.examples)[number]): string {
  const toggle = <Toggle {...propsOf(example)} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  if (fields.surface === undefined || fields.surface === "page") return html(toggle);
  return html(
    <Surface material={fields.surface as SurfaceMaterial} backdrop={(fields.backdrop ?? "none") as BackdropKind} radius="card">
      {toggle}
    </Surface>,
  );
}

function contextIn(density: Density, modality: Modality = "pointer"): TokenContext {
  return { colorScheme: "light", contrast: "standard", transparency: "standard", density, modality, motion: "standard" };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the spec is the one this package implements", () => {
  it("is Toggle.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...labelVisibilities]).toEqual(propValues(spec, "labelVisibility"));
  });

  it("declares the props Toggle takes, with the defaults Toggle renders", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["isOn", "label", "labelVisibility", "isDisabled", "onChange"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ isOn: false, labelVisibility: "visible", isDisabled: false });
    // ADR-0041 decision 2: FormField's declaration, exactly.
    const visibility = spec.props.find((prop) => prop.name === "labelVisibility") as unknown as { type: string; values: readonly string[] };
    expect(visibility.type).toBe("enum");
    expect(visibility.values).toEqual(["visible", "hidden"]);
    const out = html(<Toggle label="Night shading" onChange={noop} />);
    const tag = tagOf(out, "toggle");
    expect(tag).not.toContain("data-selected");
    expect(tag).not.toContain("data-disabled");
    expect(attribute(tag, "data-ds-label")).toBe("visible");
    expect(drawnLabel(out)).toBe("Night shading");
  });

  // The axis check: every matrix is keyed by the axis this suite loops over, so a cell keyed by anything else, or a
  // part or property this sheet does not map, fails here rather than passing unread.
  it("keys every matrix by the axes the tests below walk", () => {
    expect(Object.keys(spec.tokens)).toEqual(["root", "track", "knob", "label"]);
    expect(Object.keys(spec.tokens["root"] ?? {})).toEqual(["gap", "radius", "hover", "pressed", "disabled", "focus-visible"]);
    expect(Object.keys(spec.tokens["track"] ?? {})).toEqual(["background", "border", "borderWidth", "radius", "height", "padding", "selected"]);
    expect(Object.keys(spec.tokens["knob"] ?? {})).toEqual(["background", "radius", "selected"]);
    expect(Object.keys(spec.tokens["label"] ?? {})).toEqual(["typography"]);
    expect(Object.keys(block(bindingAt(spec, "track.selected")))).toEqual(["background"]);
    expect(Object.keys(block(bindingAt(spec, "knob.selected")))).toEqual(["background"]);
    const materials = new Set<string>([...surfaceMaterials, "default"]);
    for (const path of ["root.hover.overlay", "root.pressed.overlay", "track.background", "track.border", "track.selected.background", "knob.background", "knob.selected.background"]) {
      for (const key of Object.keys(block(bindingAt(spec, path)))) expect(materials.has(key), `${cellName(spec, path)} is keyed by ${key}`).toBe(true);
    }
    // The row's washes are keyed where the row draws no fill of its own, on inverse and accent (ADR-0042 §2).
    for (const path of ["root.hover.overlay", "root.pressed.overlay"]) {
      expect(Object.keys(block(bindingAt(spec, path))), cellName(spec, path)).toEqual(["default", "inverse", "accent"]);
    }
    // The ring, the opacity, the widths, radii and sizes have no material axis: every spec binds color.border.focus,
    // and the shared focus drawing picks the ring for the ground (ADR-0042 §1).
    for (const path of ["root.gap", "root.radius", "root.disabled.opacity", "root.focus-visible.ring", "root.focus-visible.ringWidth", "track.borderWidth", "track.radius", "track.height", "track.padding", "knob.radius", "label.typography"]) {
      expect(typeof bindingAt(spec, path), cellName(spec, path)).toBe("string");
    }
  });

  it("states the input states, the selection and the disabled state, and one haptic per flip, which the web does not play", () => {
    const fields = spec as unknown as { readonly states: readonly string[]; readonly haptics?: Readonly<Record<string, string>> };
    expect(fields.states).toEqual(["default", "hover", "pressed", "selected", "focus-visible", "disabled"]);
    expect(fields.haptics).toEqual({ on: "haptic.selection.on", off: "haptic.selection.off" });
    expect(css).not.toMatch(/vibrat/u);
  });
});

describe("Toggle.css and ControlRow.css bind what Toggle.yaml binds", () => {
  // Every expectation names the cell it checks, as the Apple helper does, so a wrong cell fails under its own path.
  it.each(surfaceMaterials.map((material) => [material] as const))("the track and the knob on %s, off and on", (material) => {
    const off = root(material, false);
    const trackOff = specCell("track.background", material);
    expect(cascade.value(off, "--ds--toggle-track"), trackOff.name).toBe(bound(trackOff.token) ?? "transparent");
    const border = specCell("track.border", material);
    expect(border.token, `${border.name} is set`).toBeDefined();
    expect(cascade.value(off, "--ds--toggle-border"), border.name).toBe(bound(border.token));
    const width = specCell("track.borderWidth");
    expect(cascade.value(off, "--ds--toggle-border-width"), `${width.name} on ${material}`).toBe(bound(width.token));
    const knobOff = specCell("knob.background", material);
    expect(cascade.value(off, "--ds--toggle-knob"), knobOff.name).toBe(bound(knobOff.token));
    expect(cascade.value(off, "--ds--toggle-progress"), "off rests at the leading end (behavior 3)").toBe("0");

    // On: the selected cells, and no outline (behavior 5, "On is the inverse solid ... with no outline").
    const on = root(material, true);
    const trackOn = specCell("track.selected.background", material);
    expect(trackOn.token, `${trackOn.name} is set`).toBeDefined();
    expect(cascade.value(on, "--ds--toggle-track"), trackOn.name).toBe(bound(trackOn.token));
    expect(cascade.value(on, "--ds--toggle-border"), `${border.name} is not drawn on`).toBe("transparent");
    expect(cascade.value(on, "--ds--toggle-border-width"), `${width.name} is not drawn on`).toBe(ZERO_WIDTH);
    const knobOn = specCell("knob.selected.background", material);
    expect(cascade.value(on, "--ds--toggle-knob"), knobOn.name).toBe(bound(knobOn.token));
    expect(cascade.value(on, "--ds--toggle-progress"), "on rests at the trailing end (behavior 3)").toBe("1");
  });

  it("track.borderWidth is the hairline: the off track is the ghost pill, and its 3:1 is its colour's (behavior 6, ADR-0033)", () => {
    expect(specCell("track.borderWidth").token).toBe("border.hairline");
    expect(spec.behavior?.some((sentence) => sentence.startsWith("The outline is a hairline, as every outline of a control that acts is (ADR-0033)"))).toBe(true);
  });

  it("the track and the knob take those colours: the fill and the inset outline on the track, the fill on the knob", () => {
    const track = declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-track"]');
    expect(track["background-color"], cellName(spec, "track.background")).toBe("var(--ds--toggle-track)");
    expect(track["box-shadow"], `${cellName(spec, "track.border")}, ${cellName(spec, "track.borderWidth")}`).toBe("inset 0 0 0 var(--ds--toggle-border-width) var(--ds--toggle-border)");
    const knob = declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-knob"]');
    expect(knob["background-color"], cellName(spec, "knob.background")).toBe("var(--ds--toggle-knob)");
  });

  it("track.height, track.radius, track.padding and knob.radius: a pill twice as wide as tall, and a circle inset on every side (behavior 4)", () => {
    const height = bound(specCell("track.height").token);
    const inset = bound(specCell("track.padding").token);
    expect(height).toBe("var(--ds-toggle-height)");
    expect(inset).toBe("var(--ds-toggle-inset)");
    const track = declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-track"]');
    expect(track["block-size"], cellName(spec, "track.height")).toBe(height);
    expect(track["inline-size"], cellName(spec, "track.height")).toBe(`calc(${height ?? ""} * 2)`);
    expect(track["border-radius"], cellName(spec, "track.radius")).toBe(bound(specCell("track.radius").token));
    const knob = declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-knob"]');
    expect(knob["inline-size"], cellName(spec, "track.padding")).toBe(`calc(${height ?? ""} - ${inset ?? ""} * 2)`);
    expect(knob["block-size"], cellName(spec, "track.padding")).toBe(`calc(${height ?? ""} - ${inset ?? ""} * 2)`);
    expect(knob["inset-block-start"], cellName(spec, "track.padding")).toBe(inset);
    // It travels comp.toggle.height along the inline axis, which follows the writing direction (behavior 3).
    expect(knob["inset-inline-start"]).toBe(`calc(${inset ?? ""} + ${height ?? ""} * var(--ds--toggle-progress))`);
    expect(knob["border-radius"], cellName(spec, "knob.radius")).toBe(bound(specCell("knob.radius").token));
    expect(knob["pointer-events"]).toBe("none");
    // No physical side anywhere: left and right would not mirror under dir="rtl".
    expect(`${rowCss}\n${css}`).not.toMatch(/\b(?:left|right)\s*:|margin-(?:left|right)|padding-(?:left|right)|translate(?:X)?\(/u);
  });

  it("the track follows density and nothing else: comp.toggle.height is size.control.sm, and the knob's inset one value everywhere", () => {
    const densities = (spec as unknown as { density: readonly Density[] }).density;
    expect(densities).toEqual(["compact", "regular", "comfortable"]);
    const heights = densities.map((density) => tokenValue(tokens, "comp.toggle.height", contextIn(density)));
    expect(heights.map(Number), cellName(spec, "track.height")).toEqual([28, 32, 44]);
    const insets = new Set(densities.flatMap((density) => (["pointer", "touch"] as const).map((modality) => JSON.stringify(tokenValue(tokens, "comp.toggle.inset", contextIn(density, modality))))));
    expect([...insets], cellName(spec, "track.padding")).toEqual(["4"]);
    // radius.control is at least half of every height, so the track's ends are round and the knob is a circle.
    for (const density of densities) {
      const radius = Number(tokenValue(tokens, "radius.control", contextIn(density)));
      expect(radius, `${cellName(spec, "track.radius")} in ${density}`).toBeGreaterThanOrEqual(Number(tokenValue(tokens, "comp.toggle.height", contextIn(density))) / 2);
    }
  });

  it("the row's cells, tokens.root and tokens.label, are the control row's on the Toggle's root, the washes by material", () => {
    const cells: readonly (readonly [string, string])[] = [
      ["root.gap", "--ds--control-row-gap"],
      ["root.radius", "--ds--control-row-radius"],
      ["root.disabled.opacity", "--ds--control-row-disabled"],
      ["root.focus-visible.ring", "--ds--control-row-ring"],
      ["root.focus-visible.ringWidth", "--ds--control-row-ring-width"],
    ];
    const washes: readonly (readonly [string, string])[] = [
      ["root.hover.overlay", "--ds--control-row-hover"],
      ["root.pressed.overlay", "--ds--control-row-press"],
    ];
    for (const material of surfaceMaterials) {
      for (const isOn of [false, true]) {
        for (const [path, property] of cells) {
          const bindingCell = specCell(path);
          expect(cascade.value(root(material, isOn), property), `${bindingCell.name} on ${material}`).toBe(bound(bindingCell.token));
        }
        // The row draws no fill of its own, so on inverse and accent the wash is the material's own (ADR-0042 §2).
        for (const [path, property] of washes) {
          const wash = specCell(path, material);
          expect(wash.token, `${wash.name} is set`).toBeDefined();
          expect(cascade.value(root(material, isOn), property), wash.name).toBe(bound(wash.token));
        }
      }
    }
    expect(specCell("root.hover.overlay", "inverse").token).toBe("color.bg.fill.on-inverse-subtle");
    expect(specCell("root.pressed.overlay", "accent").token).toBe("color.bg.fill.on-accent-subtle");
    // label.typography: the row measures its first line in the label's own size and line height.
    const typography = specCell("label.typography");
    expect(typography.token, typography.name).toBe(`type.${toggleLabelRole.replace("-", ".")}`);
    expect(cascade.value(root("page", false), "--ds--control-row-font-size"), typography.name).toBe("var(--ds-type-body-md-font-size)");
    expect(cascade.value(root("page", false), "--ds--control-row-line-height"), typography.name).toBe("var(--ds-type-body-md-line-height)");
    expect(html(<Toggle label="Night shading" onChange={noop} />), typography.name).toContain(`data-ds-role="${toggleLabelRole}" data-ds-foreground="primary"`);
    // The track is the row's control: its height is centred on the first line, and a bare row follows its radius.
    expect(cascade.value(root("page", false), "--ds--control-row-control-size"), cellName(spec, "track.height")).toBe(bound(specCell("track.height").token));
    expect(cascade.value(root("page", false), "--ds--control-row-control-radius"), cellName(spec, "track.radius")).toBe(bound(specCell("track.radius").token));
  });

  it("the row draws those cells: its gap and outline, its overlay, hover under ds-pointer only, pressed replacing hover", () => {
    const base = declarationsOf(rowRules, ".ds-control-row");
    expect(base["gap"], cellName(spec, "root.gap")).toBe("var(--ds--control-row-gap)");
    expect(base["border-radius"], cellName(spec, "root.radius")).toBe("var(--ds--control-row-radius)");
    expect(base["background-color"]).toBe("var(--ds--control-row-overlay)");
    expect(base["display"]).toBe("flex");
    expect(base["align-items"]).toBe("flex-start");
    expect(cascade.value(row(), "--ds--control-row-overlay")).toBe("transparent");
    const hover = specCell("root.hover.overlay");
    expect(cascade.value(row({ "data-hovered": "true" }, ["ds-pointer"]), "--ds--control-row-overlay"), `${hover.name} under ds-pointer`).toBe("var(--ds--control-row-hover)");
    expect(cascade.value(row({ "data-hovered": "true" }, ["ds-touch"]), "--ds--control-row-overlay"), `${hover.name} under ds-touch`).toBe("transparent");
    const pressed = specCell("root.pressed.overlay");
    expect(cascade.value(row({ "data-pressed": "true" }), "--ds--control-row-overlay"), pressed.name).toBe("var(--ds--control-row-press)");
    expect(cascade.value(row({ "data-pressed": "true", "data-hovered": "true" }, ["ds-pointer"]), "--ds--control-row-overlay"), `${pressed.name} replaces the hover`).toBe("var(--ds--control-row-press)");
    // A row of the track alone is as wide as the track, and its outline is the track's.
    expect(cascade.value(row({ "data-ds-label": "hidden" }), "border-radius"), cellName(spec, "track.radius")).toBe("var(--ds--control-row-control-radius)");
    expect(cascade.value(row({ "data-ds-label": "hidden" }), "inline-size")).toBe("fit-content");
  });

  it("root.focus-visible and root.disabled: the ring outside the row, following its outline, and the whole row dimmed", () => {
    expect(cascade.value(row({ "data-focus-visible": "true" }), "outline"), `${cellName(spec, "root.focus-visible.ring")}, ${cellName(spec, "root.focus-visible.ringWidth")}`).toBe(
      "var(--ds--control-row-ring-width) solid var(--ds--control-row-ring)",
    );
    expect(cascade.value(row(), "outline")).toBe("none");
    expect(cascade.value(row({ "data-disabled": "true" }), "opacity"), cellName(spec, "root.disabled.opacity")).toBe("var(--ds--control-row-disabled)");
  });

  it("the label leads and wraps, the track trails and is centred on the label's first line (behavior 9)", () => {
    expect(declarationsOf(rowRules, ".ds-control-row > .ds-control-row-label")).toEqual({ flex: "1 1 auto", "min-inline-size": "0" });
    expect(declarationsOf(rowRules, ".ds-control-row > .ds-control-row-control")).toEqual({ flex: "none" });
    expect(declarationsOf(rowRules, '.ds-control-row[data-ds-label="visible"] > .ds-control-row-label')["padding-block-start"]).toBe(
      "max(calc(var(--ds-size-hit) * 0), calc((var(--ds--control-row-control-size) - 1lh) / 2))",
    );
    expect(declarationsOf(rowRules, '.ds-control-row[data-ds-label="visible"] > .ds-control-row-control')["margin-block-start"]).toBe(
      "max(calc(var(--ds-size-hit) * 0), calc((1lh - var(--ds--control-row-control-size)) / 2))",
    );
    const out = html(<Toggle label="Night shading" onChange={noop} />);
    // The label, then the track: the track trails, and under dir="rtl" the flex row mirrors (behavior 3).
    expect(out.indexOf('data-ds-slot="toggle-label"')).toBeLessThan(out.indexOf('data-ds-slot="toggle-track"'));
    expect(attribute(tagOf(out, "toggle-label"), "class")).toBe("ds-control-row-label");
    expect(attribute(tagOf(out, "toggle-track"), "class")).toBe("ds-control-row-control");
  });

  it("the hit region reaches size.hit around the row, whose own box never grows with modality (behavior 7)", () => {
    expect(declarationsOf(rowRules, ".ds-control-row::before")).toEqual({
      content: '""',
      position: "absolute",
      "inset-block": "min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))",
      "inset-inline": "min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))",
    });
    expect(declarationsOf(rowRules, ".ds-control-row")["position"]).toBe("relative");
  });

  it("reads no runtime axis: the row's only at-rules are the layer and the pointer variant, Toggle's the layer and forced colors", () => {
    expect([...new Set(allAtRules(parseCss(rowCss)).map((at) => `${at.name} ${at.params}`))]).toEqual(["layer ds.components", "variant ds-pointer"]);
    expect([...new Set(allAtRules(parseCss(css)).map((at) => `${at.name} ${at.params}`))]).toEqual(["layer ds.components", "media (forced-colors: active)"]);
    // test/cascade.ts cannot read :not(), so no selector uses it.
    expect([...rules, ...rowRules].flatMap((rule) => rule.selectors).filter((selector) => selector.includes(":not("))).toEqual([]);
  });
});

describe("motion (Toggle.yaml motion, ADR-0023 §8.4)", () => {
  const crossfade = "var(--ds-motion-presentation-crossfade)";

  it("moves the knob on motion.flip, motion.spring.snappy, and holds it to the pointer with no animation while a drag holds it", () => {
    const flip = specCell("motion.flip");
    expect(flip.token).toBe("motion.spring.snappy");
    const knob = splitTopLevel(squash(declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-knob"]')["transition"]));
    expect(knob[0], flip.name).toBe("inset-inline-start var(--ds-motion-spring-snappy-duration) var(--ds-motion-spring-snappy-easing)");
    const dragging = splitTopLevel(squash(declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-track"][data-ds-dragging] > [data-ds-slot="toggle-knob"]')["transition"]));
    expect(dragging.some((entry) => entry.startsWith("inset-inline-start")), "a drag moves the knob with no animation (behavior 2)").toBe(false);
  });

  it("changes the fill over motion.trackFill, motion.duration.quick, which Reduce Motion turns into a crossfade over motion.duration.base", () => {
    const trackFill = specCell("motion.trackFill");
    expect(trackFill.token).toBe("motion.duration.quick");
    expect(specCell("motion.reduceMotion").token).toBe("crossfade");
    expect(squash(declarationsOf(rules, ".ds-toggle")["--ds--toggle-fill-duration"]), trackFill.name).toBe(
      `calc( var(--ds-motion-duration-quick) * (1 - ${crossfade}) + var(--ds-motion-duration-base) * ${crossfade} )`,
    );
    const fill = "var(--ds--toggle-fill-duration) var(--ds-motion-easing-out)";
    expect(splitTopLevel(squash(declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-track"]')["transition"])), trackFill.name).toEqual([
      `background-color ${fill}`,
      `box-shadow ${fill}`,
    ]);
    expect(splitTopLevel(squash(declarationsOf(rules, '.ds-toggle [data-ds-slot="toggle-knob"]')["transition"]))[1], trackFill.name).toBe(`background-color ${fill}`);
    // Nothing scales, rotates or blurs, in either motion mode.
    expect(`${rowCss}\n${css}`).not.toMatch(/\bscale\b|rotate|blur\(|@keyframes/u);
  });

  it("hovers and presses on Button's web timing: motion.duration.base on motion.easing.out (spec/SCHEMA.md, P4-D6)", () => {
    expect(squash(declarationsOf(rowRules, ".ds-control-row")["transition"])).toBe("background-color var(--ds-motion-duration-base) var(--ds-motion-easing-out)");
    expect(spec.behavior?.some((sentence) => sentence.includes("Hover takes its stack's Button timing"))).toBe(true);
  });
});

describe("the drag (behaviors 2 and 3)", () => {
  it("is 10 pt of travel from where the press began, the spec's value", () => {
    const sentence = spec.behavior?.find((candidate) => candidate.startsWith("A press on the track becomes a drag once it has moved"));
    const written = Number(/moved (\d+) pt from where it began/u.exec(sentence ?? "")?.[1]);
    expect(toggleDragThreshold).toBe(written);
    expect(isToggleDrag(9.9, 0)).toBe(false);
    expect(isToggleDrag(6, 8)).toBe(true);
    expect(isToggleDrag(0, -10)).toBe(true);
  });

  it("travels comp.toggle.height: at regular density a 64 × 32 track, a 24 knob and 32 of travel", () => {
    expect(toggleTravel({ width: 64, height: 32 }, { width: 24, height: 24 })).toBe(32);
    expect(toggleTravel({ width: 56, height: 28 }, { width: 20, height: 20 })).toBe(28);
    expect(toggleTravel({ width: 88, height: 44 }, { width: 36, height: 36 })).toBe(44);
  });

  it("holds the knob between the two ends, from the end it started at", () => {
    expect(toggleDragProgress(false, 16, 32)).toBe(0.5);
    expect(toggleDragProgress(false, -40, 32)).toBe(0);
    expect(toggleDragProgress(false, 400, 32)).toBe(1);
    expect(toggleDragProgress(true, -8, 32)).toBe(0.75);
    expect(toggleDragProgress(true, 40, 32)).toBe(1);
  });

  /** A drag replayed as the pointer's inline travel at each move, and what its release commits. */
  function replay(isOn: boolean, path: readonly number[], travel = 32): boolean | null {
    let progress = isOn ? 1 : 0;
    for (const translation of path) progress = toggleDragProgress(isOn, translation, travel);
    return toggleDragCommit(isOn, progress);
  }

  it("fires nothing for a drag that ends where it began, from either end", () => {
    expect(replay(false, [12, 20, 6, 0])).toBeNull();
    expect(replay(true, [-12, -20, -6, 0])).toBeNull();
  });

  it("fires nothing for a drag that crosses the middle and comes back", () => {
    expect(replay(false, [10, 24, 30, 12, 4])).toBeNull();
    expect(replay(true, [-10, -24, -30, -12, -4])).toBeNull();
  });

  it("commits the half the knob's centre is nearest, once, and keeps the value on the middle itself", () => {
    expect(replay(false, [10, 20])).toBe(true);
    expect(replay(true, [-10, -20])).toBe(false);
    expect(replay(false, [10, 16])).toBeNull();
    expect(replay(true, [-10, -16])).toBeNull();
    // Past the far end is the far end, and back past the near end is the near end.
    expect(replay(false, [80])).toBe(true);
    expect(replay(false, [-30])).toBeNull();
  });
});

describe("the name (ADR-0041)", () => {
  it("is the caller's label, drawn as the row's label and so the input's name, with no aria-label beside it", () => {
    const out = html(<Toggle label="Night shading" onChange={noop} />);
    expect(drawnLabel(out)).toBe("Night shading");
    expect(attribute(inputOf(out), "aria-label")).toBeUndefined();
    expect(attribute(inputOf(out), "aria-labelledby")).toBeUndefined();
    expect(attribute(tagOf(out, "toggle-row"), "data-ds-label")).toBe("visible");
  });

  it("is the same label, hidden: the input's aria-label, and the row the track alone", () => {
    const out = html(<Toggle label="Night shading" labelVisibility="hidden" onChange={noop} />);
    expect(drawnLabel(out)).toBeUndefined();
    expect(attribute(inputOf(out), "aria-label")).toBe("Night shading");
    expect(attribute(tagOf(out, "toggle"), "data-ds-label")).toBe("hidden");
    expect(attribute(tagOf(out, "toggle-row"), "data-ds-label")).toBe("hidden");
    expect(out.replace(/<[^>]*>/gu, "")).toBe("");
  });

  it("is the pair a host hands over through the name context when the switch has no label of its own", () => {
    for (const hosted of [
      { label: "Night shading", labelVisibility: "hidden" },
      { label: "Night shading", labelVisibility: "visible" },
    ] as const satisfies readonly ControlName[]) {
      const out = html(
        <NameContext.Provider value={hosted}>
          <Toggle onChange={noop} />
        </NameContext.Provider>,
      );
      expect(drawnLabel(out), hosted.labelVisibility).toBe(hosted.labelVisibility === "visible" ? "Night shading" : undefined);
      expect(attribute(inputOf(out), "aria-label"), hosted.labelVisibility).toBe(hosted.labelVisibility === "hidden" ? "Night shading" : undefined);
    }
    // A caller's labelVisibility without a label does not split the host's pair.
    const split = html(
      <NameContext.Provider value={{ label: "Night shading", labelVisibility: "hidden" }}>
        <Toggle labelVisibility="visible" onChange={noop} />
      </NameContext.Provider>,
    );
    expect(drawnLabel(split)).toBeUndefined();
    expect(attribute(inputOf(split), "aria-label")).toBe("Night shading");
  });

  it("keeps the caller's own pair inside a host: the context changes nothing about a switch given a label", () => {
    const out = html(
      <NameContext.Provider value={{ label: "Route layer", labelVisibility: "hidden" }}>
        <Toggle label="Night shading" onChange={noop} />
      </NameContext.Provider>,
    );
    expect(drawnLabel(out)).toBe("Night shading");
    expect(attribute(inputOf(out), "aria-label")).toBeUndefined();
    expect(out).not.toContain("Route layer");
    expect(controlName("Night shading", undefined, { label: "Route layer", labelVisibility: "hidden" })).toEqual({ label: "Night shading", labelVisibility: "visible" });
    expect(controlName(undefined, "visible", null)).toBeNull();
  });

  it("reports a switch with no name, or a blank one, in development, and nothing for a named one", () => {
    const error = vi.spyOn(console, "error").mockImplementation(noop);
    html(<Toggle onChange={noop} />);
    html(<Toggle label="   " labelVisibility="hidden" onChange={noop} />);
    expect(error).toHaveBeenCalledTimes(2);
    expect(String(error.mock.calls[0]?.[0])).toContain("Toggle: the control has no name");
    error.mockClear();
    html(<Toggle label="Night shading" labelVisibility="hidden" onChange={noop} />);
    html(
      <NameContext.Provider value={{ label: "Night shading", labelVisibility: "hidden" }}>
        <Toggle onChange={noop} />
      </NameContext.Provider>,
    );
    expect(error).not.toHaveBeenCalled();
    expect(isNamed(null)).toBe(false);
    expect(isNamed({ label: " ", labelVisibility: "visible" })).toBe(false);
  });

  it("keeps its own name, state and parts over what a caller casts past the type", () => {
    const cast = {
      label: "Night shading",
      "aria-label": "Something else",
      "aria-labelledby": "elsewhere",
      isSelected: true,
      name: "setting",
      children: "extra",
      onPress: () => {
        throw new Error("a press handler reached the switch");
      },
      onChange: noop,
    } as unknown as ToggleProps;
    const out = html(<Toggle {...cast} />);
    const input = inputOf(out);
    expect(attribute(input, "aria-label")).toBeUndefined();
    expect(attribute(input, "aria-labelledby")).toBeUndefined();
    expect(attribute(input, "name")).toBeUndefined();
    expect(input).not.toContain("checked");
    expect(out).not.toContain("extra");
    expect(drawnLabel(out)).toBe("Night shading");
  });

  it("forwards ScopeAttributes to its root (ADR-0019 rule 8), and marks a disabled switch on the root, the row and the input", () => {
    const out = html(<Toggle label="Night shading" isDisabled data-ds-color-scheme="dark" data-ds-density="regular" onChange={noop} />);
    const tag = tagOf(out, "toggle");
    expect(attribute(tag, "data-ds-color-scheme")).toBe("dark");
    expect(attribute(tag, "data-ds-density")).toBe("regular");
    expect(attribute(tag, "data-disabled")).toBe("true");
    expect(attribute(tagOf(out, "toggle-row"), "data-disabled")).toBe("true");
    expect(inputOf(out)).toContain('disabled=""');
    // The scope attributes stay on the root; the input carries none.
    expect(inputOf(out)).not.toContain("data-ds-");
  });
});

/**
 * Toggle.yaml `accessibility`: every example is one switch, named by its `label`, drawn or hidden, and carrying its
 * value. The same names are read off Chromium's tree by web/apps/gallery/test/accessibility.browser.test.tsx and off
 * the simulator's by DSToggleAccessibilityTreeTests.
 */
describe("the accessibility the spec writes (Toggle.yaml accessibility)", () => {
  interface Expected {
    readonly name: string;
    readonly isOn: boolean;
    readonly drawn: boolean;
    readonly disabled?: true;
  }

  const expected: Readonly<Record<string, Expected>> = {
    off: { name: "Night shading", isOn: false, drawn: true },
    on: { name: "Night shading", isOn: true, drawn: true },
    "on-disabled": { name: "Night shading", isOn: true, drawn: true, disabled: true },
    bare: { name: "Night shading", isOn: false, drawn: false },
    "on-vivid": { name: "Live readings", isOn: true, drawn: true },
    "off-on-vivid": { name: "Live readings", isOn: false, drawn: true },
    "on-glass-over-map": { name: "Follow the vehicle", isOn: true, drawn: true },
    "label-ru": { name: "Показывать ночное затенение маршрута следования", isOn: false, drawn: true },
  };

  it("covers every example of the spec, in its order", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expected));
    expect((spec.accessibility as { traits?: readonly string[] } | undefined)?.traits).toEqual(["toggle"]);
    expect(spec.accessibility?.role).toBe("switch");
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s", (id, example) => {
    const want = expected[id];
    const out = staged(example);
    const input = inputOf(out);
    expect(attribute(input, "role"), id).toBe("switch");
    expect(attribute(input, "type"), id).toBe("checkbox");
    expect(input.includes('checked=""'), id).toBe(want?.isOn === true);
    expect(input.includes('disabled=""'), id).toBe(want?.disabled === true);
    // The name is `label`, byte for byte: drawn, it is the label element's only text; hidden, the aria-label.
    expect(drawnLabel(out), id).toBe(want?.drawn === true ? want.name : undefined);
    expect(attribute(input, "aria-label"), id).toBe(want?.drawn === false ? want.name : undefined);
    expect(out.replace(/<[^>]*>/gu, ""), id).toBe(want?.drawn === true ? want.name : "");
    // Nothing else carries a role or a name of its own: the track and the knob are hidden.
    expect(out.match(/\srole="/gu)?.length ?? 0, id).toBe(1);
    expect(attribute(tagOf(out, "toggle-track"), "aria-hidden"), id).toBe("true");
    if (want !== undefined) {
      expect(want.name).toBe(want.name.normalize("NFC"));
      expect(Buffer.byteLength(want.name, "utf8"), id).toBe(id === "label-ru" ? 90 : want.name.length);
    }
  });

  it("stages each example's cells: the ground it declares is the material the switch reads", () => {
    for (const example of spec.examples) {
      const fields = example as unknown as { readonly surface?: string };
      expect(attribute(tagOf(staged(example), "toggle"), "data-ds-surface"), example.id).toBe(fields.surface ?? "page");
    }
  });
});
