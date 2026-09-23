/// <reference types="node" />
/**
 * Icon (spec/components/Icon.yaml, specVersion 1).
 *
 * - Icon.css binds what Icon.yaml binds: every tone on every material a Surface can publish, and on the
 *   scheme's glass every backdrop kind, read through a small cascade so each cell is checked as it wins on
 *   the element; the three boxes, which are the same in every density (behavior 10).
 * - The weight: `tokens.root.weight` and behavior 3's size rule through ./weight.ts, the twin of
 *   `DSIconAppearance.effectiveWeight(_:size:)`, and the style cuts that replace it on the web (behavior 6).
 * - `motion`: a glyph that replaces another fades in over `motion.symbolChange`, and at `reduceMotion`'s
 *   instant under Reduce Motion (Glyph.css); the first drawing is no replacement. The fade itself is
 *   measured on a real element by web/apps/gallery/test/components.browser.test.tsx.
 * - Server renders: the box with its size, material, backdrop and tone, the glyph filling it, the mirror,
 *   the spec's defaults, an unknown id, the attributes the box withholds, ScopeAttributes.
 * - `accessibility`, per spec example: only `named-standalone` is an image, named `Locked for editing`,
 *   and every other glyph is hidden; no registry label is ever a name (behaviors 13 and 14, ADR-0032). The
 *   role and the name each example is handed to a screen reader as are also read from Chromium's own tree,
 *   by web/apps/gallery/test/accessibility.browser.test.tsx; the Apple twin is
 *   swift/Tests/DSSnapshotTests/DSIconAccessibilityTreeTests.swift, for the same ids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import {
  Icon,
  Surface,
  backdropKinds,
  glyphSizes,
  glyphTones,
  glyphWeights,
  iconRegistry,
  iconStyles,
  surfaceMaterials,
  type BackdropKind,
  type GlyphSize,
  type GlyphWeight,
  type IconName,
  type IconProps,
  type IconStyle,
  type SurfaceMaterial,
} from "../src/index.ts";
import { isIconExposed } from "../src/icon/Icon.tsx";
import { glyphs } from "../src/icon/glyphs.ts";
import { cutForWeight, effectiveGlyphWeight, glyphCut, tokenValue, weightToken } from "../src/icon/weight.ts";
import { Cascade } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Icon");
const css = readFileSync(join(packageRoot, "src", "icon", "Icon.css"), "utf8");
const cascade = new Cascade(css);
const rules = flattenRules(parseCss(css));
const root = spec.tokens["root"] ?? {};
const colors = (root["color"] ?? {}) as Record<string, Binding>;
const glassColors = (colors["glass"] ?? {}) as Record<string, Binding>;

/** The seven tones the matrix keys; `inherit` is not a key, it is the absence of a color. */
const tones = glyphTones.filter((tone) => tone !== "inherit");
const densities: readonly Density[] = ["compact", "regular", "comfortable", "watch"];
const contextIn = (density: Density): TokenContext => ({ colorScheme: "light", contrast: "standard", transparency: "standard", density, modality: "pointer", motion: "standard" });

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

function box(material: string, backdrop: string, tone?: string): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-icon"], attributes: { "data-ds-surface": material, "data-ds-backdrop": backdrop, ...(tone === undefined ? {} : { "data-ds-tone": tone }) } };
}

function html(node: ReactNode, theme: { contrast?: "standard" | "more"; transparency?: "standard" | "reduce" } = {}): string {
  return renderToStaticMarkup(
    <Theme tokens={tokens} {...theme}>
      {node}
    </Theme>,
  );
}

/** The attributes of the Icon's own box inside a render, found by its slot. */
function iconTag(out: string): string {
  return /<span ([^>]*data-ds-slot="icon"[^>]*)>/.exec(out)?.[1] ?? "";
}

/** The path data of a glyph's svg, which tells one Phosphor cut from another. */
function pathOf(out: string): string {
  return /<path d="([^"]+)"/.exec(out)?.[1] ?? "missing";
}

function phosphorPath(name: IconName, cut: string): string {
  return pathOf(renderToStaticMarkup(createElement(glyphs[name], { weight: cut as never })));
}

/** An example of Icon.yaml, staged as the gallery stages it: on its material, over its backdrop. */
function staged(example: (typeof spec.examples)[number]): string {
  const icon = <Icon {...(example.props as unknown as IconProps)} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  const material = fields.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page" || material === "map" || material === "image") return html(icon);
  return html(
    <Surface material={material} backdrop={(fields.backdrop ?? "none") as BackdropKind}>
      {icon}
    </Surface>,
  );
}

describe("the spec is the one this package implements", () => {
  it("is Icon.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...glyphSizes]).toEqual(propValues(spec, "size"));
    expect([...glyphWeights]).toEqual(propValues(spec, "weight"));
    expect(Object.keys(iconStyles)).toEqual(propValues(spec, "style"));
    expect([...glyphTones]).toEqual(propValues(spec, "tone"));
  });

  it("declares the props Icon takes, with the defaults Icon renders", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["name", "size", "weight", "style", "tone", "label", "isDecorative"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ size: "md", weight: "control", style: "outline", tone: "primary", isDecorative: false });
    const tag = iconTag(html(<Icon name="action.play" />));
    expect(tag).toContain('data-ds-size="md"');
    expect(tag).toContain('data-ds-tone="primary"');
    expect(tag).toContain('aria-hidden="true"');
    // `style` defaults to the spec's `outline`, never the entry's `defaultStyle` (action.play's is filled).
    expect(iconRegistry["action.play"].defaultStyle).toBe("filled");
    expect(pathOf(html(<Icon name="action.play" />))).toBe(phosphorPath("action.play", "regular"));
  });

  it("keys root.color by the published material, glass by its backdrop kind too, and inherit nowhere", () => {
    expect(Object.keys(colors).filter((key) => key !== "default" && !(surfaceMaterials as readonly string[]).includes(key))).toEqual([]);
    expect(Object.keys(glassColors)).toEqual(["map", "image", "vivid"]);
    expect(Object.keys((colors["default"] ?? {}) as Record<string, Binding>)).toEqual(tones);
    for (const material of Object.keys(colors).filter((key) => key !== "glass")) {
      expect(Object.keys(colors[material] as Record<string, Binding>), material).toEqual(tones);
    }
    for (const backdrop of Object.keys(glassColors)) {
      expect(Object.keys(glassColors[backdrop] as Record<string, Binding>), backdrop).toEqual(tones);
    }
  });
});

describe("Icon.css binds what Icon.yaml binds", () => {
  it.each(surfaceMaterials.filter((material) => material !== "glass").map((material) => [material] as const))("root.color of every tone on %s, whatever the backdrop", (material) => {
    for (const backdrop of backdropKinds) {
      for (const tone of tones) {
        expect(cascade.value(box(material, backdrop, tone), "color"), `${backdrop} ${tone}`).toBe(bound(cell(colors, material, tone)));
      }
    }
  });

  it.each(Object.keys(glassColors).map((backdrop) => [backdrop] as const))("root.color of every tone on glass over %s", (backdrop) => {
    for (const tone of tones) {
      const expected = bound(cell(colors, "glass", backdrop, tone));
      expect(expected, tone).toBeDefined();
      expect(cascade.value(box("glass", backdrop, tone), "color"), tone).toBe(expected);
    }
  });

  it("gives glass over none, which Surface never renders, the media row, as Text does", () => {
    for (const tone of tones) {
      expect(cascade.value(box("glass", "none", tone), "color"), tone).toBe(cascade.value(box("glass", "image", tone), "color"));
    }
  });

  it("sets no color for tone inherit, on any material (behavior 9)", () => {
    for (const material of surfaceMaterials) {
      for (const backdrop of backdropKinds) expect(cascade.value(box(material, backdrop), "color"), `${material} ${backdrop}`).toBeUndefined();
    }
  });

  it.each(glyphSizes.map((size) => [size] as const))("root.size of %s: a square box", (size) => {
    const state = { classes: ["ds-icon"], attributes: { "data-ds-size": size } };
    expect(cascade.value(state, "inline-size")).toBe(bound(cell(root["size"], size)));
    expect(cascade.value(state, "block-size")).toBe(bound(cell(root["size"], size)));
  });

  it("keeps one box in every density Icon lists (behavior 10)", () => {
    expect(spec as unknown as { density: readonly string[] }).toHaveProperty("density", densities);
    for (const size of glyphSizes) {
      const path = cell(root["size"], size) ?? "";
      const values = densities.map((density) => tokenValue(tokens, path, contextIn(density)));
      expect(new Set(values).size, path).toBe(1);
    }
    // And the sheet has nothing to switch it with: no media query, no variant, only the layer.
    expect(allAtRules(parseCss(css)).map((at) => at.name)).toEqual(["layer"]);
  });

  it("makes the box a block that keeps its size in a flex row, and draws nothing else", () => {
    const base = rules.find((rule) => rule.selectors.includes(".ds-icon"));
    expect(Object.fromEntries(base?.declarations.map((declaration) => [declaration.property, declaration.value]) ?? [])).toEqual({ display: "block", flex: "none" });
    const properties = new Set(rules.flatMap((rule) => rule.declarations.map((declaration) => declaration.property)));
    expect([...properties].sort()).toEqual(["block-size", "color", "display", "flex", "inline-size"]);
  });
});

describe("the weight (tokens.root.weight, behaviors 3 and 6)", () => {
  it("binds icon.weight and icon.weight-display", () => {
    for (const weight of glyphWeights) expect(weightToken(weight), weight).toBe(cell(root["weight"], weight));
  });

  it("draws display only at lg: below it the size wins and the control cut renders (behavior 3)", () => {
    const table = glyphWeights.map((weight) => glyphSizes.map((size) => effectiveGlyphWeight(weight, size)));
    expect(table).toEqual([
      ["control", "control", "control"],
      ["control", "control", "display"],
    ]);
    // The regular cut at every density for control, and display's cut is the brand's icon.weight-display.
    for (const density of densities) {
      const context = contextIn(density);
      expect(glyphCut("control", "md", "outline", tokens, context), density).toBe(cutForWeight(tokens.table["icon.weight"].$value));
      expect(glyphCut("display", "lg", "outline", tokens, context), density).toBe(cutForWeight(tokens.table["icon.weight-display"].$value));
      expect(glyphCut("display", "sm", "outline", tokens, context), density).toBe(glyphCut("control", "sm", "outline", tokens, context));
      expect(glyphCut("display", "md", "outline", tokens, context), density).toBe(glyphCut("control", "md", "outline", tokens, context));
    }
    expect(cutForWeight(tokens.table["icon.weight"].$value)).toBe("regular");
    expect(cutForWeight(tokens.table["icon.weight-display"].$value)).toBe("thin");
  });

  it("gives a filled or duotone glyph its one web cut, whatever the weight (behavior 6)", () => {
    for (const style of ["filled", "duotone"] as const satisfies readonly IconStyle[]) {
      for (const weight of glyphWeights) {
        for (const size of glyphSizes) expect(glyphCut(weight, size, style, tokens, contextIn("compact")), `${style} ${weight} ${size}`).toBe(iconStyles[style]);
      }
    }
    expect(iconStyles).toEqual({ outline: null, filled: "fill", duotone: "duotone" });
  });

  it("renders the cut it resolves", () => {
    const cases: readonly (readonly [GlyphWeight, GlyphSize, IconStyle, string])[] = [
      ["control", "md", "outline", "regular"],
      ["display", "lg", "outline", "thin"],
      ["display", "sm", "outline", "regular"],
      ["control", "sm", "filled", "fill"],
      ["display", "lg", "duotone", "duotone"],
    ];
    for (const [weight, size, style, cut] of cases) {
      expect(pathOf(html(<Icon name="object.sparkle" size={size} weight={weight} style={style} />)), `${weight} ${size} ${style}`).toBe(phosphorPath("object.sparkle", cut));
    }
  });
});

describe("Icon renders", () => {
  it("one box, with its size, the material and backdrop it sits on and its tone, around the glyph", () => {
    const out = html(<Icon name="action.settings" size="lg" tone="accent" />);
    expect(out).toMatch(/^<span class="ds-icon" data-ds-slot="icon" data-ds-icon="action.settings" data-ds-size="lg" data-ds-surface="page" data-ds-backdrop="none" data-ds-tone="accent" aria-hidden="true"><svg [^>]*aria-hidden="true" focusable="false" class="ds-glyph" data-ds-slot="icon-glyph"><path d="[^"]+"><\/path><\/svg><\/span>$/);
    const glass = iconTag(html(<Surface material="glass" backdrop="map"><Icon name="object.map-pin" tone="secondary" /></Surface>));
    expect(glass).toContain('data-ds-surface="glass"');
    expect(glass).toContain('data-ds-backdrop="map"');
  });

  it("writes no tone for inherit, so the glyph takes the color around it", () => {
    const tag = iconTag(html(<Icon name="status.online" size="sm" tone="inherit" />));
    expect(tag).not.toContain("data-ds-tone");
    expect(tag).toContain('data-ds-size="sm"');
  });

  it("the raised cells under the glass fallback, with no fallback of its own", () => {
    for (const theme of [{ contrast: "more" }, { transparency: "reduce" }] as const) {
      const tag = iconTag(html(<Surface material="glass" backdrop="map"><Icon name="object.map-pin" tone="secondary" /></Surface>, theme));
      expect(tag, JSON.stringify(theme)).toContain('data-ds-surface="raised"');
    }
  });

  it("mirrors exactly the glyphs the registry marks rtlMirror on the web (behavior 11)", () => {
    for (const [name, entry] of Object.entries(iconRegistry) as [IconName, (typeof iconRegistry)[IconName]][]) {
      expect(html(<Icon name={name} />).includes('data-ds-mirror=""'), name).toBe(entry.rtlMirror);
    }
  });

  it("draws an empty box for an id outside the registry, says so in development, and never throws (behavior 1)", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const out = html(<Icon name={"no.such.icon" as IconName} />);
      expect(out).toMatch(/^<span class="ds-icon" data-ds-slot="icon" data-ds-icon="no.such.icon" [^>]*><\/span>$/);
      expect(errors.mock.calls.flat().join(" ")).toContain('Icon: "no.such.icon" is not an id of the icon registry');
      errors.mockClear();
      html(<Icon name="nav.back" />);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("keeps its own attributes over the caller's, and merges the class name", () => {
    const Loose = Icon as unknown as (props: Record<string, unknown>) => ReactNode;
    const tag = iconTag(html(<Loose name="nav.back" className="app-glyph" data-ds-size="lg" data-ds-surface="vivid" data-ds-tone="accent" id="glyph" />));
    expect(tag).toContain('class="ds-icon app-glyph"');
    expect(tag).toContain('data-ds-size="md"');
    expect(tag).toContain('data-ds-surface="page"');
    expect(tag).toContain('data-ds-tone="primary"');
    expect(tag).toContain('id="glyph"');
  });

  it("drops what would name, describe or focus the glyph, named or not, even past the type", () => {
    // `label` is the only name (Icon.yaml accessibility.label) and a glyph is never focusable: a caller that
    // casts past IconProps still cannot hand the box another name, a hint, a role or a tab stop. Everything
    // else still reaches the box.
    const Loose = Icon as unknown as (props: Record<string, unknown>) => ReactNode;
    const withheld = {
      role: "button",
      "aria-hidden": "false",
      "aria-roledescription": "glyph",
      "aria-label": "Lock",
      "aria-labelledby": "heading",
      "aria-describedby": "note",
      "aria-description": "A lock",
      "aria-details": "details",
      title: "Lock",
      tabIndex: 0,
      contentEditable: true,
      children: "content",
    };
    for (const label of [undefined, "Locked for editing"]) {
      const out = html(<Loose name="object.lock" label={label} id="lock" {...withheld} />);
      const tag = iconTag(out);
      const named = String(label);
      for (const attribute of ["tabindex", "contenteditable", "title", "aria-labelledby", "aria-describedby", "aria-description", "aria-details", "aria-roledescription"]) {
        expect(tag, `${named} ${attribute}`).not.toContain(`${attribute}=`);
      }
      expect(out, named).not.toContain("content<");
      expect(tag, named).not.toContain('role="button"');
      expect(tag, named).not.toContain('aria-label="Lock"');
      expect(tag, named).toContain('id="lock"');
      expect(tag.includes('aria-hidden="true"'), named).toBe(label === undefined);
      expect(tag.includes('role="img"'), named).toBe(label !== undefined);
    }
  });

  it("takes no markup of its own, so the box draws its glyph and nothing else", () => {
    // `dangerouslySetInnerHTML` beside the glyph child is not a style choice but a crash: React refuses a
    // node with both. Withheld in the type, and dropped at runtime for a caller that casts past it.
    // @ts-expect-error the box draws its glyph and nothing else
    const typed = <Icon name="object.lock" dangerouslySetInnerHTML={{ __html: "<b>x</b>" }} />;
    const cast = <Icon {...({ name: "object.lock", dangerouslySetInnerHTML: { __html: "<b>x</b>" } } as unknown as IconProps)} />;
    for (const node of [typed, cast]) {
      const markup = html(node);
      expect(markup).not.toContain("<b>x</b>");
      expect(iconTag(markup)).toBeTruthy();
    }
  });

  it("takes no event handler, so a glyph never carries a gesture (behavior 12, usage.dont)", () => {
    // The type is the check for a TypeScript caller: no `on*` key survives in IconProps, so a clickable
    // glyph — focusable by nothing, named by nothing — does not compile. A glyph that acts is an IconButton.
    type Handlers = Extract<keyof IconProps, `on${string}`>;
    const noHandler: [Handlers] extends [never] ? true : false = true;
    expect(noHandler).toBe(true);
    const handler = vi.fn();
    const clickable = [
      // @ts-expect-error Icon.yaml behavior 12: Icon never carries a gesture
      <Icon key="click" name="object.lock" onClick={handler} />,
      // @ts-expect-error Icon.yaml behavior 12: Icon never carries a gesture
      <Icon key="pointer" name="object.lock" onPointerDown={handler} />,
      // @ts-expect-error Icon.yaml behavior 12: Icon never carries a gesture
      <Icon key="key" name="object.lock" label="Locked for editing" onKeyDown={handler} />,
    ];
    // An untyped caller reaches the component anyway, and the handlers are dropped before the box renders;
    // web/apps/gallery/test/components.browser.test.tsx presses and clicks a mounted box to show that none
    // of them runs. On the server nothing of them is written, and nothing makes the box focusable.
    for (const node of clickable) {
      const tag = iconTag(html(node));
      expect(tag).not.toMatch(/\son[a-z]+=/u);
      expect(tag).not.toContain("tabindex");
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("forwards ScopeAttributes to the box, named or not (ADR-0019 rule 8)", () => {
    for (const label of [undefined, "Locked for editing"]) {
      const tag = iconTag(html(<Icon name="object.lock" label={label} data-ds-color-scheme="dark" data-ds-density="regular" />));
      expect(tag, String(label)).toContain('data-ds-color-scheme="dark"');
      expect(tag, String(label)).toContain('data-ds-density="regular"');
    }
  });
});

/**
 * Icon.yaml `accessibility` and behaviors 13 and 14: the one name a glyph has is the `label` its caller
 * writes, and only when `isDecorative` is false; the registry entry's `label` field is never spoken. The
 * names below are the bytes both stacks hand a screen reader for each example: `named-standalone` is
 * `Locked for editing` on Apple too (`DSIconAccessibilityTreeTests`), and every other example is hidden
 * on both.
 */
describe("the accessibility the spec writes (Icon.yaml accessibility)", () => {
  const expectedNames: Readonly<Record<string, string | null>> = {
    "control-md": null,
    "corner-sm": null,
    "display-lg": null,
    "status-filled": null,
    "accent-mark": null,
    "inherit-in-row": null,
    decorative: null,
    "named-standalone": "Locked for editing",
    "on-vivid": null,
    "on-glass-over-map": null,
    "on-glass-light-over-image": null,
  };

  it("covers every example of the spec", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expectedNames));
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s: an image named by its label, or hidden", (id, example) => {
    const tag = iconTag(staged(example));
    const name = expectedNames[id];
    if (name === null || name === undefined) {
      expect(tag).toContain('aria-hidden="true"');
      expect(tag).not.toContain("role=");
      expect(tag).not.toContain("aria-label");
    } else {
      expect(tag).toContain('role="img"');
      expect(tag).toContain(`aria-label="${name}"`);
      expect(tag).not.toContain("aria-hidden");
    }
    expect(tag).not.toContain("title=");
    expect(tag).not.toContain("aria-labelledby");
    expect(tag).not.toContain("icon.");
  });

  it("names Locked for editing in 18 ASCII bytes, exactly as the spec writes it", () => {
    const label = spec.examples.find((example) => example.id === "named-standalone")?.props["label"];
    expect(label).toBe("Locked for editing");
    expect(Buffer.byteLength(String(label), "utf8")).toBe(18);
  });

  it("stages each example's color cell on its material", () => {
    // What the harnesses stage, read through the cascade: the published material and backdrop of each
    // example with its tone, as the snapshot pair shows it.
    for (const example of spec.examples) {
      const tag = iconTag(staged(example));
      const attribute = (name: string): string | undefined => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
      const material = attribute("data-ds-surface") ?? "";
      const backdrop = attribute("data-ds-backdrop") ?? "";
      const tone = attribute("data-ds-tone");
      const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
      const expectedMaterial = fields.surface === undefined || fields.surface === "map" || fields.surface === "image" ? "page" : fields.surface;
      expect(material, example.id).toBe(expectedMaterial);
      if (tone === undefined) {
        expect(example.props["tone"], example.id).toBe("inherit");
        continue;
      }
      const keys = material === "glass" ? [material, backdrop, tone] : [material, tone];
      expect(cascade.value(box(material, backdrop, tone), "color"), example.id).toBe(bound(cell(colors, ...keys)));
    }
  });

  it("exposes a glyph only with a non-blank label and isDecorative false; a blank label never makes an unnamed image", () => {
    const table = ([undefined, "", "  ", "Locked for editing"] as const).map((label) => [false, true].map((isDecorative) => isIconExposed(label, isDecorative)));
    expect(table).toEqual([
      [false, false],
      [false, false],
      [false, false],
      [true, false],
    ]);
    const hidden = [<Icon key="a" name="object.lock" label="Locked for editing" isDecorative />, <Icon key="b" name="object.lock" isDecorative={false} />, <Icon key="c" name="object.lock" label="  " />];
    for (const node of hidden) {
      const tag = iconTag(html(node));
      expect(tag).toContain('aria-hidden="true"');
      expect(tag).not.toContain("role=");
      expect(tag).not.toContain("aria-label");
    }
    // The label is written byte for byte, untrimmed.
    expect(iconTag(html(<Icon name="object.lock" label=" Locked " />))).toContain('aria-label=" Locked "');
  });

  it("hides every label that is blank by the rule both stacks share", () => {
    // The list DSIconBindingTests.blankLabels holds on Apple, one string per kind of whitespace: nothing,
    // spaces, a tab and a line feed, a no-break space, an ideographic space and U+FEFF. `trim()` removes
    // exactly the characters DSIconAppearance.blankCharacters spells out, so a label that resolves to one
    // of these is hidden on both stacks, and never an unnamed image.
    for (const blank of ["", "  ", "\t\n", "\u00a0", "\u3000", "\ufeff"]) {
      expect(isIconExposed(blank, false), JSON.stringify(blank)).toBe(false);
      const tag = iconTag(html(<Icon name="object.lock" label={blank} />));
      expect(tag, JSON.stringify(blank)).toContain('aria-hidden="true"');
      expect(tag, JSON.stringify(blank)).not.toContain("role=");
      expect(tag, JSON.stringify(blank)).not.toContain("aria-label");
    }
    // What trim() keeps, Apple's set keeps: U+0085 and a zero-width space are not blank on either stack.
    for (const kept of ["\u0085", "\u200b"]) expect(isIconExposed(kept, false), JSON.stringify(kept)).toBe(true);
  });

  it("never names a glyph from the registry: no entry's label field reaches the markup (ADR-0032 rule 6)", () => {
    for (const [name, entry] of Object.entries(iconRegistry) as [IconName, (typeof iconRegistry)[IconName]][]) {
      const out = html(<Icon name={name} />);
      expect(out, name).not.toContain(entry.label);
      expect(out, name).not.toContain("aria-label");
    }
  });

  it("states the rule the way the spec does", () => {
    expect(spec.accessibility?.role).toMatch(/^image when `label` is set and `isDecorative` is false/u);
    expect(spec.accessibility?.label).toMatch(/^the `label` prop/u);
    expect(spec.examples.filter((example) => typeof example.props["label"] === "string").map((example) => example.id)).toEqual(["named-standalone"]);
  });
});

describe("motion (Icon.yaml motion)", () => {
  const glyphRules = flattenRules(parseCss(readFileSync(join(packageRoot, "src", "icon", "Glyph.css"), "utf8")));
  const motionProperty = (property: string): boolean => property.startsWith("transition") || property.startsWith("animation");

  it("fades a glyph that replaces another in over symbolChange, and at instant under Reduce Motion", () => {
    expect(spec.motion).toEqual({ symbolChange: "motion.duration.quick", reduceMotion: "instant" });
    expect(spec.accessibility?.reduceMotion).toContain("replaced at motion.duration.instant");
    // The box never animates; only the glyph that replaces another does, and nothing else in Glyph.css.
    expect(rules.flatMap((rule) => rule.declarations.map((declaration) => declaration.property)).filter(motionProperty)).toEqual([]);
    const animated = glyphRules.filter((rule) => rule.declarations.some((declaration) => motionProperty(declaration.property)));
    expect(animated.map((rule) => rule.selectors)).toEqual([[".ds-glyph[data-ds-replaced]"]]);
    const animation = (animated[0]?.declarations.find((declaration) => declaration.property === "animation")?.value ?? "").replace(/\s+/g, " ");
    // symbolChange while the crossfade flag is 0, motion.duration.instant while it is 1 (ADR-0023 §8.4), on
    // motion.easing.out, the easing of a state change off the spring path (ADR-0023 §9).
    const crossfade = "var(--ds-motion-presentation-crossfade)";
    expect(animation).toBe(
      `ds-glyph-replace calc(var(${cssVariable(spec.motion?.["symbolChange"] ?? "")}) * (1 - ${crossfade}) + var(${cssVariable("motion.duration.instant")}) * ${crossfade}) var(${cssVariable("motion.easing.out")})`,
    );
  });

  it("marks only a replacement: a glyph's first drawing does not fade", () => {
    const out = html(<Icon name="nav.open" />);
    expect(out).toContain('data-ds-slot="icon-glyph"');
    expect(out).not.toContain("data-ds-replaced");
  });
});
