/// <reference types="node" />
/**
 * Avatar (spec/components/Avatar.yaml, specVersion 1).
 *
 * - Avatar.css binds what Avatar.yaml binds, read off the spec cell by cell and checked as it wins on the root
 *   through a small cascade: the initials', the fallback glyph's and the ring's colour on every context the chip
 *   can publish, the size per size, the radius, the ring's width, the image's radius, the initials' role and the
 *   glyph's box.
 * - The circle is the Surface module's glass chip (ADR-0036). `root.background` is read on every ground and held to
 *   what Avatar hands the chip shape (`avatarBackground`), and `fallbackBackground`, `fallbackUnderlay`, `blur`,
 *   `saturate`, `edgeColor`, `edgeStartAlpha` and `edgeEndAlpha` to what the shape paints (surface/Surface.css) and
 *   where it paints it. Avatar.css sets neither `background-color` nor `background-image` on the root and names no
 *   glass recipe (ADR-0036 rule 2).
 * - Under a forced Reduce Transparency and a forced Increase Contrast every part is its `default` cell, read off a
 *   server render in which the chip has published `(raised, none)`.
 * - Behaviour: the initials vectors that `DSAvatarBindingTests.initialsVectors` asserts on Apple, the fallback order,
 *   the image element, the ring, the name and the hidden state, the attributes and handlers it withholds,
 *   ScopeAttributes.
 * - `accessibility`, per spec example: the names the table below writes, which
 *   web/apps/gallery/test/accessibility.browser.test.tsx reads off Chromium's tree and
 *   swift/Tests/DSSnapshotTests/DSAvatarAccessibilityTreeTests.swift off the simulator's, for the same ids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "react-aria-components";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Contrast, type Density, type Modality, type TokenContext, type Transparency } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import {
  Avatar,
  Backdrop,
  Surface,
  avatarSizes,
  backdropKinds,
  surfaceMaterials,
  type AvatarProps,
  type AvatarSize,
  type BackdropKind,
  type SurfaceMaterial,
} from "../src/index.ts";
import { avatarBackground, avatarFallbackIconSize, avatarInitials, avatarInitialsRole, hasAvatarName, isAvatarExposed } from "../src/avatar/parts.ts";
import { isIconExposed } from "../src/icon/Icon.tsx";
import { tokenValue } from "../src/icon/weight.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss, rightmostCompound } from "./css.ts";
import { bindingAt, cell, cellName, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Avatar");
const css = readFileSync(join(packageRoot, "src", "avatar", "Avatar.css"), "utf8");
const surfaceCss = readFileSync(join(packageRoot, "src", "surface", "Surface.css"), "utf8");
const cascade = new Cascade(css);
const surfaceRules = flattenRules(parseCss(surfaceCss));
const rules = flattenRules(parseCss(css));

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);
const block = (binding: Binding | undefined): Record<string, Binding> => (binding ?? {}) as Record<string, Binding>;
const squash = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

/** A cell of Avatar.yaml, read and named from one spec path and one key list (`Avatar.yaml tokens.ring.color [page, map]`). */
function specCell(path: string, ...keys: readonly string[]): { readonly token: string | undefined; readonly name: string } {
  return { token: cell(bindingAt(spec, path), ...keys), name: cellName(spec, path, ...keys) };
}

/** Every context a Surface, a Backdrop or the chip itself can publish: nine materials over four backdrop kinds. */
const grounds = surfaceMaterials.flatMap((material) => backdropKinds.map((backdrop) => ({ material, backdrop })));

/** The root of an Avatar as the cascade sees it, publishing `material` over `backdrop`. */
function root(material: string, backdrop: string, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return {
    classes: ["ds-surface-chip", "ds-avatar"],
    attributes: { "data-ds-surface": material, "data-ds-backdrop": backdrop, "data-ds-size": "md", ...extra },
  };
}

const value = (state: Parameters<Cascade["value"]>[0], property: string): string | undefined => cascade.value(state, property);

interface Staging {
  readonly locale?: string;
  readonly contrast?: Contrast;
  readonly transparency?: Transparency;
}

function html(node: ReactNode, staging: Staging = {}): string {
  const inner = staging.locale === undefined ? node : <I18nProvider locale={staging.locale}>{node}</I18nProvider>;
  return renderToStaticMarkup(
    <Theme tokens={tokens} contrast={staging.contrast} transparency={staging.transparency}>
      {inner}
    </Theme>,
  );
}

/** Text as React's server render escaped it, back to the string the component wrote. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

/** The attributes of the Avatar's root inside a render, found by its slot. */
function rootTag(out: string): string {
  const tag = /<span ([^>]*data-ds-slot="avatar"[^>]*)>/.exec(out)?.[1];
  expect(tag, out).toBeDefined();
  return tag ?? "";
}

function attribute(tag: string, name: string): string | undefined {
  const found = new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1];
  return found === undefined ? undefined : unescaped(found);
}

/** The accessible name the root carries, or null when it is hidden. */
function nameOf(out: string): string | null {
  const tag = rootTag(out);
  if (tag.includes('aria-hidden="true"')) {
    expect(tag).not.toContain("role=");
    expect(tag).not.toContain("aria-label");
    return null;
  }
  expect(attribute(tag, "role")).toBe("img");
  return attribute(tag, "aria-label") ?? null;
}

/** The initials a render draws: the text of the Text inside the initials part, or null when it draws the glyph. */
function initialsOf(out: string): string | null {
  const found = /<span class="ds-avatar-initials" data-ds-slot="avatar-initials"><span [^>]*>([^<]*)<\/span><\/span>/.exec(out)?.[1];
  return found === undefined ? null : unescaped(found);
}

/** The attributes of the image element, or undefined when the render has none. */
function imageTag(out: string): string | undefined {
  return /<img ([^>]*data-ds-slot="avatar-image"[^>]*)\/?>/.exec(out)?.[1];
}

/** The portrait fixture's stand-in: the component takes any source, and the markup is all these tests read. */
const PORTRAIT = "portrait.png";

/** A spec example's props as the component takes them: the `portrait` fixture becomes a source. */
function propsOf(example: (typeof spec.examples)[number]): AvatarProps {
  const { image, ...rest } = example.props as Record<string, unknown>;
  return { ...(rest as AvatarProps), ...(image === undefined ? {} : { image: PORTRAIT }) };
}

/** An example of Avatar.yaml, staged as the harnesses stage it: on the page, on a ground, or in a Surface. */
function staged(example: (typeof spec.examples)[number], staging: Staging = {}): string {
  const avatar = <Avatar {...propsOf(example)} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  if (fields.surface === undefined || fields.surface === "page") return html(avatar, staging);
  if (fields.surface === "map" || fields.surface === "image") return html(<Backdrop kind={fields.surface}>{avatar}</Backdrop>, staging);
  return html(
    <Surface material={fields.surface as SurfaceMaterial} backdrop={(fields.backdrop ?? "none") as BackdropKind} radius="card">
      {avatar}
    </Surface>,
    staging,
  );
}

function contextIn(density: Density, modality: Modality = "pointer"): TokenContext {
  return { colorScheme: "light", contrast: "standard", transparency: "standard", density, modality, motion: "standard" };
}

describe("the spec is the one this package implements", () => {
  it("is Avatar.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...avatarSizes]).toEqual(propValues(spec, "size"));
  });

  it("declares the props Avatar takes, with the defaults Avatar renders", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["name", "image", "size", "hasRing", "isDecorative"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ size: "md", hasRing: false, isDecorative: false });
    const tag = rootTag(html(<Avatar name="Anna Petrova" />));
    expect(attribute(tag, "data-ds-size")).toBe("md");
    expect(tag).not.toContain("data-ds-ring");
    expect(attribute(tag, "role")).toBe("img");
  });

  // The axis check: every matrix is keyed by the axis this suite loops over, so a cell keyed by anything else, or a
  // part or property this sheet does not map, fails here rather than passing unread.
  it("keys every matrix by the axes the tests below walk", () => {
    expect(Object.keys(spec.tokens)).toEqual(["root", "image", "initials", "fallbackIcon", "ring"]);
    const root = spec.tokens["root"] ?? {};
    expect(Object.keys(root)).toEqual([
      "background",
      "blur",
      "saturate",
      "fallbackBackground",
      "fallbackUnderlay",
      "edgeColor",
      "edgeStartAlpha",
      "edgeEndAlpha",
      "radius",
      "size",
    ]);
    expect(Object.keys(spec.tokens["image"] ?? {})).toEqual(["radius"]);
    expect(Object.keys(spec.tokens["initials"] ?? {})).toEqual(["typography", "color"]);
    expect(Object.keys(spec.tokens["fallbackIcon"] ?? {})).toEqual(["size", "color"]);
    expect(Object.keys(spec.tokens["ring"] ?? {})).toEqual(["color", "width"]);
    const materials = new Set<string>([...surfaceMaterials, "default"]);
    const backdrops = new Set<string>([...backdropKinds, "default"]);
    for (const path of ["root.background", "root.blur", "root.saturate", "root.edgeStartAlpha", "root.edgeEndAlpha", "initials.color", "fallbackIcon.color", "ring.color"]) {
      for (const [material, inner] of Object.entries(block(bindingAt(spec, path)))) {
        expect(materials.has(material), `${cellName(spec, path)} is keyed by ${material}`).toBe(true);
        if (typeof inner !== "string") for (const key of Object.keys(inner)) expect(backdrops.has(key), `${cellName(spec, path, material)} is keyed by ${key}`).toBe(true);
      }
    }
    for (const path of ["root.size", "initials.typography", "fallbackIcon.size"]) {
      expect(Object.keys(block(bindingAt(spec, path))), cellName(spec, path)).toEqual([...avatarSizes]);
    }
  });

  it("states no hover, press, focus or selection: an avatar is not a control (behavior 10)", () => {
    const fields = spec as unknown as { readonly states: readonly string[]; readonly haptics?: unknown };
    expect(fields.states).toEqual(["default"]);
    expect(fields.haptics).toBeUndefined();
  });
});

describe("the circle is the Surface module's glass chip (ADR-0036)", () => {
  // Avatar hands the chip shape exactly the spec's `root.background` cell on every ground, and the stylesheet hands it
  // the own cell as a custom property; nothing of Avatar names a recipe, a setting or a fallback.
  it.each(grounds)("root.background on $material over $backdrop is what Avatar hands the chip", ({ material, backdrop }) => {
    const background = specCell("root.background", material, backdrop);
    const fill = avatarBackground({ material, backdrop });
    const expected = background.token === undefined ? "none" : background.token === "material.glass.chip" ? "glass" : "own";
    expect(fill, background.name).toBe(expected);
    if (fill === "own") {
      expect(value(root(material, backdrop, { "data-ds-surface-chip": "own" }), "--ds--surface-chip-own"), background.name).toBe(bound(background.token));
    }
  });

  it("has no fill of its own on accent and on inverse, on any backdrop (behavior, `root.background`)", () => {
    for (const material of ["accent", "inverse"] as const) {
      for (const backdrop of backdropKinds) {
        const background = specCell("root.background", material, backdrop);
        expect(background.token, background.name).toBeUndefined();
        expect(avatarBackground({ material, backdrop }), background.name).toBe("none");
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
    const glass = avatarBackground({ material, backdrop }) === "glass";
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

  it("sets neither background-color nor background-image, names no glass recipe and declares no backdrop filter (ADR-0036 rule 2)", () => {
    for (const rule of rules) {
      for (const declaration of rule.declarations) {
        expect(["background", "background-color", "background-image", "backdrop-filter", "-webkit-backdrop-filter"], `${rule.selectors.join(", ")}: ${declaration.property}`).not.toContain(
          declaration.property,
        );
        expect(declaration.value, `${rule.selectors.join(", ")}: ${declaration.property}`).not.toMatch(/--ds-material-glass-/u);
      }
    }
    // The root is the chip's, which Surface.css paints.
    const avatarRoots = rules.filter((rule) => rule.selectors.some((selector) => rightmostCompound(selector).startsWith(".ds-avatar")));
    expect(avatarRoots.length).toBeGreaterThan(0);
  });

  // A server render of the root on each staging: the rendering the chip resolved, the context it publishes, and the
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
    const tag = rootTag(html(stage(<Avatar name="Anna Petrova" />)));
    expect(attribute(tag, "class")).toBe("ds-surface-chip ds-avatar");
    expect(attribute(tag, "data-ds-surface-chip")).toBe(rendering);
    expect(attribute(tag, "data-ds-surface")).toBe(material);
    expect(attribute(tag, "data-ds-backdrop")).toBe(backdrop);
    expect(attribute(tag, "data-ds-surface-chip-flat")).toBe(flat ? "" : undefined);
    expect(attribute(tag, "data-ds-elevation")).toBe("flat");
  });

  it("draws the recipe's edge first among the root's children whenever glass renders, and never otherwise", () => {
    const onMap = html(
      <Backdrop kind="map">
        <Avatar name="Anna Petrova" />
      </Backdrop>,
    );
    expect(onMap).toMatch(/data-ds-slot="avatar"[^>]*><span data-ds-slot="surface-chip-edge" aria-hidden="true"><\/span>/u);
    expect(html(<Avatar name="Anna Petrova" />)).not.toContain("surface-chip-edge");
  });
});

describe("Avatar.css binds what Avatar.yaml binds", () => {
  // Every expectation names the cell it checks, as the Apple helper does, so a wrong cell fails under its own path.
  it.each(grounds)("initials.color, fallbackIcon.color and ring.color on $material over $backdrop", ({ material, backdrop }) => {
    const state = root(material, backdrop);
    for (const [path, property] of [
      ["initials.color", "--ds--avatar-initials"],
      ["fallbackIcon.color", "--ds--avatar-icon"],
      ["ring.color", "--ds--avatar-ring"],
    ] as const) {
      const color = specCell(path, material, backdrop);
      expect(color.token, `${color.name} is set`).toBeDefined();
      expect(value(state, property), color.name).toBe(bound(color.token));
    }
  });

  it("the parts take those colours: the initials and the glyph as their colour, the ring as an inset stroke of ring.width", () => {
    expect(declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-initials"]')["color"], cellName(spec, "initials.color")).toBe("var(--ds--avatar-initials)");
    expect(declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-fallback-icon"]')["color"], cellName(spec, "fallbackIcon.color")).toBe("var(--ds--avatar-icon)");
    const ring = declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-ring"]');
    const width = specCell("ring.width");
    expect(ring["box-shadow"], `${width.name}, ${cellName(spec, "ring.color")}`).toBe(`inset 0 0 0 ${bound(width.token) ?? ""} var(--ds--avatar-ring)`);
    // Flush with the edge and inside the circle, so the layout never moves (behavior 6).
    expect(ring["position"]).toBe("absolute");
    expect(ring["inset"]).toBe("0");
    expect(ring["border-radius"]).toBe("inherit");
  });

  it("root.size and root.radius: a square of the control height at radius.control, which clips what it holds", () => {
    const base = declarationsOf(rules, ".ds-avatar");
    const radius = specCell("root.radius");
    expect(base["border-radius"], radius.name).toBe(bound(radius.token));
    expect(base["inline-size"], cellName(spec, "root.size")).toBe("var(--ds--avatar-size)");
    expect(base["block-size"], cellName(spec, "root.size")).toBe("var(--ds--avatar-size)");
    expect(base["padding"]).toBe("0");
    expect(base["flex"]).toBe("none");
    expect(base["box-sizing"]).toBe("border-box");
    expect(base["overflow"], "the circle clips everything inside it (anatomy)").toBe("hidden");
    for (const size of avatarSizes) {
      const side = specCell("root.size", size);
      expect(value({ classes: ["ds-avatar"], attributes: { "data-ds-size": size } }, "--ds--avatar-size"), side.name).toBe(bound(side.token));
    }
  });

  it("image.radius: the image is clipped at radius.control, covers the circle and fades in once it has decoded", () => {
    const image = declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-image"]');
    const radius = specCell("image.radius");
    expect(image["border-radius"], radius.name).toBe(bound(radius.token));
    expect(image["object-fit"]).toBe("cover");
    expect(image["position"]).toBe("absolute");
    expect(image["inset"]).toBe("0");
    expect(image["opacity"]).toBe("0");
    expect(declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-image"][data-ds-loaded]')).toEqual({ opacity: "1" });
  });

  it.each(avatarSizes.map((size) => [size] as const))("initials.typography and fallbackIcon.size of %s", (size) => {
    const role = specCell("initials.typography", size);
    expect(`type.${avatarInitialsRole(size).replace("-", ".")}`, role.name).toBe(role.token);
    const box = specCell("fallbackIcon.size", size);
    expect(`size.icon.${avatarFallbackIconSize(size)}`, box.name).toBe(box.token);
    // The rendered parts: the Text at that role, and Icon's box at that size with no tone of its own.
    expect(html(<Avatar name="Anna Petrova" size={size} />), role.name).toContain(`data-ds-role="${avatarInitialsRole(size)}"`);
    const glyph = html(<Avatar size={size} />);
    expect(glyph, box.name).toMatch(new RegExp(`<span class="ds-icon" data-ds-slot="avatar-fallback-icon" data-ds-icon="object.user" data-ds-size="${avatarFallbackIconSize(size)}" `));
    expect(glyph).not.toContain("data-ds-tone");
  });

  it("follows density with the circle, and nothing else: the side in each density, the glyph box in none", () => {
    const densities = (spec as unknown as { density: readonly Density[] }).density;
    expect(densities).toEqual(["compact", "regular", "comfortable"]);
    const sides = densities.map((density) => avatarSizes.map((size) => tokenValue(tokens, specCell("root.size", size).token ?? "", contextIn(density))));
    expect(new Set(sides.map((row) => JSON.stringify(row))).size, `${cellName(spec, "root.size")} differs in every density`).toBe(densities.length);
    for (const box of avatarSizes.map((size) => specCell("fallbackIcon.size", size))) {
      expect(new Set(densities.map((density) => JSON.stringify(tokenValue(tokens, box.token ?? "", contextIn(density))))).size, `${box.name} is one value in every density`).toBe(1);
    }
    // radius.control is at least half of every side in every density and modality, so the square is a circle.
    const radius = specCell("root.radius");
    for (const density of densities) {
      for (const modality of ["pointer", "touch"] as const) {
        const half = Number(tokenValue(tokens, radius.token ?? "", contextIn(density, modality)));
        for (const size of avatarSizes) {
          const side = Number(tokenValue(tokens, specCell("root.size", size).token ?? "", contextIn(density, modality)));
          expect(half, `${radius.name} is at least half of ${cellName(spec, "root.size", size)}, ${density} ${modality}`).toBeGreaterThanOrEqual(side / 2);
        }
      }
    }
  });

  it("reads no runtime axis: its only at-rules are the layer and forced colors", () => {
    expect(allAtRules(parseCss(css)).map((at) => `${at.name} ${at.params}`)).toEqual(["layer ds.components", "media (forced-colors: active)"]);
    // test/cascade.ts cannot read :not(), so no selector uses it.
    expect(rules.flatMap((rule) => rule.selectors).filter((selector) => selector.includes(":not("))).toEqual([]);
  });
});

describe("motion (Avatar.yaml motion, ADR-0023 §8.4)", () => {
  it("fades the image in over motion.imageLoad with motion.easing.out, in every motion mode", () => {
    const image = declarationsOf(rules, '.ds-avatar > [data-ds-slot="avatar-image"]');
    const imageLoad = specCell("motion.imageLoad");
    expect(imageLoad.token, imageLoad.name).toBe("motion.duration.base");
    expect(squash(image["transition"]), imageLoad.name).toBe(`opacity ${bound(imageLoad.token) ?? ""} var(--ds-motion-easing-out)`);
    // `crossfade`: the fade is an opacity change, which Reduce Motion keeps; motion.css shortens the duration itself.
    expect(specCell("motion.reduceMotion").token).toBe("crossfade");
    expect(css).not.toMatch(/presentation-crossfade/u);
    expect(css).not.toMatch(/\b(?:scale|transform|translate|rotate)\s*:/u);
  });
});

/**
 * Behavior 2's initials, byte for byte the table `DSAvatarBindingTests.initialsVectors` asserts on Apple: the name, the
 * locale the transform runs in, and the initials, or null for the glyph.
 */
const INITIALS: readonly (readonly [name: string | undefined, locale: string, initials: string | null])[] = [
  ["Anna Petrova", "en-US", "AP"],
  ["Northgate", "en-US", "N"],
  ["Анна Петрова", "en-US", "АП"],
  ["  anna   petrova  ", "en-US", "AP"],
  ["anna maria petrova", "en-US", "AP"],
  ["Jean-Luc Picard", "en-US", "JP"],
  ["(Anna) Petrova", "en-US", "AP"],
  ["Unit 4417", "en-US", "U"],
  ["4417", "en-US", null],
  ["", "en-US", null],
  ["   ", "en-US", null],
  [" \t\n　", "en-US", null],
  [undefined, "en-US", null],
  ["ilker işık", "tr-TR", "İİ"],
  ["ilker işık", "en-US", "II"],
  ["Émile Zola", "fr-FR", "ÉZ"],
  ["Émile Zola", "fr-FR", "ÉZ"],
  ["李 小龍", "zh-CN", "李小"],
];

describe("behaviour", () => {
  it.each(INITIALS)("initials of %j in %s: %j (behavior 2)", (name, locale, initials) => {
    expect(avatarInitials(name, locale)).toBe(initials);
    expect(initialsOf(html(<Avatar name={name} />, { locale }))).toBe(initials);
  });

  it("falls back in one order: the image over its initials, then the initials, then object.user (behavior 1)", () => {
    const both = html(<Avatar name="Anna Petrova" image={PORTRAIT} />);
    expect(imageTag(both)).toBeDefined();
    expect(initialsOf(both), "the initials stay under the image while it loads").toBe("AP");
    expect(both.indexOf("avatar-initials")).toBeLessThan(both.indexOf("avatar-image"));
    const initials = html(<Avatar name="Anna Petrova" />);
    expect(imageTag(initials)).toBeUndefined();
    expect(initialsOf(initials)).toBe("AP");
    expect(initials).not.toContain("object.user");
    const glyph = html(<Avatar />);
    expect(initialsOf(glyph)).toBeNull();
    expect(glyph).toContain('data-ds-icon="object.user"');
    // An image with no name draws the glyph under it.
    expect(html(<Avatar image={PORTRAIT} />)).toContain('data-ds-icon="object.user"');
    // An empty source is no source.
    expect(imageTag(html(<Avatar name="Anna Petrova" image="" />))).toBeUndefined();
  });

  it("renders the image with an empty alt, hidden until it has decoded (behavior 13, notes.platform.web-desktop)", () => {
    const image = imageTag(html(<Avatar name="Anna Petrova" image={PORTRAIT} />)) ?? "";
    expect(attribute(image, "src")).toBe(PORTRAIT);
    // The circle is the one image and carries the name; the picture inside it is never a second image of that name.
    expect(attribute(image, "alt")).toBe("");
    expect(attribute(image, "class")).toBe("ds-avatar-image");
    // The server has no decoded image: it is marked loaded only on the client.
    expect(image).not.toContain("data-ds-loaded");
    for (const [why, node] of [
      ["decorative", <Avatar key="decorative" name="Anna Petrova" image={PORTRAIT} isDecorative />],
      ["no name", <Avatar key="nameless" image={PORTRAIT} />],
      ["a blank name", <Avatar key="blank" name="   " image={PORTRAIT} />],
    ] as const) {
      expect(attribute(imageTag(html(node)) ?? "", "alt"), why).toBe("");
    }
  });

  it("draws the ring inside the circle, last among its parts, when hasRing is set (behavior 6)", () => {
    const ringed = html(<Avatar name="Anna Petrova" image={PORTRAIT} hasRing />);
    expect(attribute(rootTag(ringed), "data-ds-ring")).toBe("");
    expect(ringed).toMatch(/<span class="ds-avatar-ring" data-ds-slot="avatar-ring" aria-hidden="true"><\/span><\/span>$/u);
    const plain = html(<Avatar name="Anna Petrova" image={PORTRAIT} />);
    expect(plain).not.toContain("avatar-ring");
    expect(rootTag(plain)).not.toContain("data-ds-ring");
  });

  it("is exposed as an image named by name, and hidden when decorative or when it has no name to announce (behaviors 11 and 12)", () => {
    expect(nameOf(html(<Avatar name="Anna Petrova" />))).toBe("Anna Petrova");
    expect(nameOf(html(<Avatar name="Anna Petrova" image={PORTRAIT} hasRing />))).toBe("Anna Petrova");
    // A name with no letter still names the avatar: it draws the glyph and is announced by its name.
    expect(nameOf(html(<Avatar name="4417" />))).toBe("4417");
    expect(nameOf(html(<Avatar name="Anna Petrova" isDecorative />))).toBeNull();
    expect(nameOf(html(<Avatar />))).toBeNull();
    expect(nameOf(html(<Avatar isDecorative={false} />))).toBeNull();
    for (const blank of ["", "   ", "\t\n", " ", "　", "﻿"]) {
      expect(nameOf(html(<Avatar name={blank} />)), JSON.stringify(blank)).toBeNull();
      expect(hasAvatarName(blank), JSON.stringify(blank)).toBe(false);
      // Icon's blank rule, the same characters.
      expect(isAvatarExposed(blank, false), JSON.stringify(blank)).toBe(isIconExposed(blank, false));
    }
    // No word is invented for the glyph: a hidden avatar carries no name at all, and nothing but the initials is text.
    const hidden = html(<Avatar />);
    expect(hidden).not.toMatch(/aria-label|alt=|title=/u);
    expect(hidden.replace(/<[^>]*>/gu, "")).toBe("");
  });

  it("upper-cases the initials in the app's locale (behavior 2)", () => {
    expect(initialsOf(html(<Avatar name="ilker işık" />, { locale: "tr-TR" }))).toBe("İİ");
    expect(initialsOf(html(<Avatar name="ilker işık" />, { locale: "en-US" }))).toBe("II");
    // The name is announced as written, never upper-cased.
    expect(nameOf(html(<Avatar name="ilker işık" />, { locale: "tr-TR" }))).toBe("ilker işık");
  });

  it("keeps its own name, role and parts over what a caller casts past the type, and runs no handler", () => {
    const Loose = Avatar as unknown as (props: Record<string, unknown>) => ReactNode;
    const tag = rootTag(
      html(
        <Loose
          name="Anna Petrova"
          role="button"
          aria-label="Profile"
          aria-hidden="false"
          aria-describedby="hint"
          title="Anna"
          tabIndex={0}
          onClick={() => undefined}
          data-ds-surface="glass"
          className="app-avatar"
          id="me"
        >
          child
        </Loose>,
      ),
    );
    expect(attribute(tag, "role")).toBe("img");
    expect(attribute(tag, "aria-label")).toBe("Anna Petrova");
    expect(tag).not.toMatch(/aria-hidden|aria-describedby|title=|tabindex|onclick/iu);
    expect(attribute(tag, "data-ds-surface")).toBe("page");
    expect(attribute(tag, "class")).toBe("ds-surface-chip ds-avatar app-avatar");
    expect(attribute(tag, "id")).toBe("me");
    expect(html(<Loose name="Anna Petrova">child</Loose>)).not.toContain("child");
  });

  it("forwards ScopeAttributes to the root (ADR-0019 rule 8)", () => {
    const tag = rootTag(html(<Avatar name="Anna Petrova" data-ds-color-scheme="dark" data-ds-density="compact" />));
    expect(attribute(tag, "data-ds-color-scheme")).toBe("dark");
    expect(attribute(tag, "data-ds-density")).toBe("compact");
  });
});

/**
 * Avatar.yaml `accessibility.reduceTransparency` and ADR-0036 rule 5: under Reduce Transparency and under Increase
 * Contrast the chip falls back and publishes `(raised, none)` on every ground where Avatar asks for glass, so every
 * part takes its `default` cell. Read off the server render: the root's rendering and the context it publishes, the
 * context the fallback glyph reads inside the chip's scope, and the cells that context selects.
 */
describe("under a forced Reduce Transparency and Increase Contrast every part is its default cell", () => {
  // Where the chip itself asks for glass it falls back and publishes `(raised, none)`. Inside a glass Surface the
  // Surface falls back first and publishes `raised` over the backdrop it declared, where Avatar asks for its own cell:
  // either way the parts read `raised`.
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
      const out = html(stage(<Avatar />), staging);
      const tag = rootTag(out);
      expect(attribute(tag, "data-ds-surface-chip")).toBe(rendering);
      expect(attribute(tag, "data-ds-surface")).toBe("raised");
      expect(attribute(tag, "data-ds-backdrop")).toBe(backdrop);
      // The glyph inside reads the published context, not the ground.
      expect(out).toMatch(new RegExp(`data-ds-slot="avatar-fallback-icon"[^>]*data-ds-surface="raised" data-ds-backdrop="${backdrop}"`, "u"));
      const state = root("raised", backdrop, { "data-ds-surface-chip": rendering });
      for (const [path, property] of [
        ["initials.color", "--ds--avatar-initials"],
        ["fallbackIcon.color", "--ds--avatar-icon"],
        ["ring.color", "--ds--avatar-ring"],
      ] as const) {
        const fallback = block(bindingAt(spec, path))["default"];
        expect(typeof fallback, `${cellName(spec, path)} has a default cell`).toBe("string");
        expect(value(state, property), `${cellName(spec, path, "default")}`).toBe(bound(fallback as string));
      }
    },
  );

  it("is the standard cells again with both settings standard", () => {
    const tag = rootTag(html(<Backdrop kind="map">{<Avatar />}</Backdrop>));
    expect(attribute(tag, "data-ds-surface-chip")).toBe("glass");
    expect(attribute(tag, "data-ds-surface")).toBe("page");
    expect(attribute(tag, "data-ds-backdrop")).toBe("map");
  });
});

/**
 * Avatar.yaml `accessibility` and behaviors 11 and 12: every example with a `name` and not `isDecorative` is one image
 * named by that name, byte for byte, and every other is hidden. The same names are read off Chromium's tree by
 * web/apps/gallery/test/accessibility.browser.test.tsx and off the simulator's by DSAvatarAccessibilityTreeTests.
 */
describe("the accessibility the spec writes (Avatar.yaml accessibility)", () => {
  interface Expected {
    readonly name: string | null;
    readonly initials: string | null;
    readonly image: boolean;
    readonly rendering: "glass" | "own";
    readonly flat?: true;
  }

  const expected: Readonly<Record<string, Expected>> = {
    "image-md": { name: "Anna Petrova", initials: "AP", image: true, rendering: "own" },
    "initials-md": { name: "Anna Petrova", initials: "AP", image: false, rendering: "own" },
    "initials-one-word": { name: "Northgate", initials: "N", image: false, rendering: "own" },
    "fallback-icon": { name: null, initials: null, image: false, rendering: "own" },
    ringed: { name: "Anna Petrova", initials: "AP", image: true, rendering: "own" },
    "size-sm": { name: "Anna Petrova", initials: "AP", image: false, rendering: "own" },
    "size-lg": { name: "Anna Petrova", initials: "AP", image: true, rendering: "own" },
    decorative: { name: null, initials: "AP", image: true, rendering: "own" },
    "ringed-over-map": { name: "Anna Petrova", initials: "AP", image: true, rendering: "glass" },
    "initials-over-map": { name: "Anna Petrova", initials: "AP", image: false, rendering: "glass" },
    "on-glass-over-image": { name: "Anna Petrova", initials: "AP", image: false, rendering: "glass", flat: true },
    "russian-initials": { name: "Анна Петрова", initials: "АП", image: false, rendering: "own" },
  };

  it("covers every example of the spec, in its order", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expected));
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s", (id, example) => {
    const want = expected[id];
    const out = staged(example);
    const tag = rootTag(out);
    expect(nameOf(out), id).toBe(want?.name);
    expect(initialsOf(out), id).toBe(want?.initials);
    expect(imageTag(out) !== undefined, id).toBe(want?.image);
    expect(attribute(tag, "data-ds-surface-chip"), id).toBe(want?.rendering);
    expect(attribute(tag, "data-ds-surface-chip-flat"), id).toBe(want?.flat === true ? "" : undefined);
    // Nothing but the root carries a role or a name, and the only text is the initials the circle draws.
    expect(out.match(/\srole="/gu)?.length ?? 0, id).toBe(want?.name === null ? 0 : 1);
    expect(out.replace(/<[^>]*>/gu, ""), id).toBe(want?.initials ?? "");
    if (want?.name !== null && want?.name !== undefined) {
      expect(Buffer.byteLength(want.name, "utf8")).toBe(want.name === "Анна Петрова" ? 23 : want.name.length);
      expect(want.name).toBe(want.name.normalize("NFC"));
    }
  });

  it("stages each example's cells: the ground it declares is the context the chip reads", () => {
    for (const example of spec.examples) {
      const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
      const tag = rootTag(staged(example));
      const material = fields.surface === undefined || fields.surface === "map" || fields.surface === "image" ? "page" : fields.surface;
      const backdrop = fields.surface === "map" || fields.surface === "image" ? fields.surface : (fields.backdrop ?? "none");
      expect(attribute(tag, "data-ds-surface"), example.id).toBe(material);
      expect(attribute(tag, "data-ds-backdrop"), example.id).toBe(backdrop);
      const background = specCell("root.background", material, backdrop);
      expect(attribute(tag, "data-ds-surface-chip"), background.name).toBe(background.token === "material.glass.chip" ? "glass" : "own");
      const size = (example.props["size"] as AvatarSize | undefined) ?? "md";
      expect(attribute(tag, "data-ds-size"), example.id).toBe(size);
    }
    expect(spec.examples.filter((example) => example.props["image"] !== undefined).every((example) => JSON.stringify(example.props["image"]) === '{"fixture":"portrait"}')).toBe(true);
  });
});
