/// <reference types="node" />
/**
 * Divider (spec/components/Divider.yaml, specVersion 1).
 *
 * - Divider.css binds what Divider.yaml binds: the colour cell of every material a Surface can publish,
 *   read through a small cascade so each cell is checked as it wins on the element, the thickness along
 *   each orientation and the inset of each `inset` value, as padding inside the root.
 * - Server renders: a hidden `div` by default, React Aria's separator when `isDecorative` is false, the
 *   published material (the glass fallback included), no children, ScopeAttributes.
 * - `accessibility`: every spec example's role, hidden state and accessible name. The name is the empty
 *   string for all six, because the Divider composes no string; on Apple the same examples are no
 *   accessibility element at all, which swift/Tests/DSSnapshotTests/DSDividerAccessibilityTreeTests.swift
 *   reads off the tree the simulator publishes, so neither stack announces a name.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Divider, Surface, dividerInsets, dividerOrientations, surfaceMaterials, type DividerProps } from "../src/index.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Divider");
const css = readFileSync(join(packageRoot, "src", "divider", "Divider.css"), "utf8");
const cascade = new Cascade(css);
const rules = flattenRules(parseCss(css));
const root = spec.tokens["root"] ?? {};

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

/** The `none` inset, in the form Surface.css writes for `padding: none`. */
const NO_INSET = "calc(var(--ds-space-card-padding) * 0)";

function on(attributes: Record<string, string>): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-divider"], attributes: { "data-ds-orientation": "horizontal", "data-ds-inset": "none", "data-ds-surface": "page", ...attributes } };
}

function html(node: ReactNode, theme: { contrast?: "standard" | "more"; transparency?: "standard" | "reduce" } = {}): string {
  return renderToStaticMarkup(
    <Theme tokens={tokens} {...theme}>
      {node}
    </Theme>,
  );
}

/** The attributes of the first element in a render, which is the Divider's root when it is rendered alone. */
function rootTag(out: string): string {
  return /^<div([^>]*)>/.exec(out)?.[1] ?? "";
}

/** The Divider's own element inside a render that stages it, found by its slot. */
function dividerTag(out: string): string {
  return /<div([^>]*data-ds-slot="divider"[^>]*)>/.exec(out)?.[1] ?? "";
}

describe("the spec is the one this package implements", () => {
  it("is Divider.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...dividerOrientations]).toEqual(propValues(spec, "orientation"));
    expect([...dividerInsets]).toEqual(propValues(spec, "inset"));
  });

  it("declares isDecorative, defaulting true (spec/SCHEMA.md, one meaning, one name, one polarity)", () => {
    const prop = spec.props.find((candidate) => candidate.name === "isDecorative");
    expect(prop?.default).toBe(true);
    expect(spec.props.map((candidate) => candidate.name)).toEqual(["orientation", "inset", "isDecorative"]);
  });

  it("keys root.color by the published material only, with no default (behavior 7)", () => {
    const keys = Object.keys((root["color"] ?? {}) as Record<string, Binding>);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => !(surfaceMaterials as readonly string[]).includes(key))).toEqual([]);
    // No fallback cell, so inverse and accent are not set and the line paints nothing there.
    expect(keys).not.toContain("default");
    expect(cell(root["color"], "inverse")).toBeUndefined();
    expect(cell(root["color"], "accent")).toBeUndefined();
  });
});

describe("Divider.css binds what Divider.yaml binds", () => {
  it.each(surfaceMaterials.map((material) => [material] as const))("root.color on %s", (material) => {
    for (const orientation of dividerOrientations) {
      for (const inset of dividerInsets) {
        const state = on({ "data-ds-surface": material, "data-ds-orientation": orientation, "data-ds-inset": inset });
        expect(cascade.value(state, "--ds--divider-color"), `${orientation} ${inset}`).toBe(bound(cell(root["color"], material)) ?? "transparent");
      }
    }
  });

  it("root.thickness along each orientation", () => {
    const thickness = bound(cell(root["thickness"]));
    expect(thickness).toBe("var(--ds-border-hairline)");
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="horizontal"]')["block-size"]).toBe(thickness);
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="vertical"]')["inline-size"]).toBe(thickness);
    // The long axis is never sized: the line runs the length of its container (behavior 2).
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="horizontal"]')["inline-size"]).toBeUndefined();
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="vertical"]')["block-size"]).toBeUndefined();
  });

  it.each(dividerInsets.map((inset) => [inset] as const))("root.inset of %s", (inset) => {
    for (const orientation of dividerOrientations) {
      expect(cascade.value(on({ "data-ds-inset": inset, "data-ds-orientation": orientation }), "--ds--divider-inset"), orientation).toBe(bound(cell(root["inset"], inset)) ?? NO_INSET);
    }
  });

  it("trims the long axis by the inset, inside the root and never as a margin (behaviors 3 and 4)", () => {
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="horizontal"]')["padding-inline"]).toBe("var(--ds--divider-inset)");
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="vertical"]')["padding-block"]).toBe("var(--ds--divider-inset)");
    const base = declarationsOf(rules, ".ds-divider");
    expect(base["box-sizing"]).toBe("border-box");
    expect(base["background-color"]).toBe("var(--ds--divider-color)");
    expect(base["background-clip"]).toBe("content-box");
    expect(base["margin"]).toBe("0");
    const margins = rules.flatMap((rule) => rule.declarations.filter((declaration) => declaration.property.startsWith("margin") && declaration.value !== "0"));
    expect(margins).toEqual([]);
  });

  it("paints one line and nothing else (behavior 1): no border, no shadow, no second fill", () => {
    const properties = new Set(rules.flatMap((rule) => rule.declarations.map((declaration) => declaration.property)));
    for (const property of ["box-shadow", "background-image", "outline", "border-color", "border-width"]) expect(properties.has(property), property).toBe(false);
    expect(declarationsOf(rules, ".ds-divider")["border"]).toBe("0");
  });

  it("stretches on the cross axis of a flex parent and keeps its thickness on the main one", () => {
    const base = declarationsOf(rules, ".ds-divider");
    expect(base["flex"]).toBe("none");
    expect(base["align-self"]).toBe("stretch");
    expect(declarationsOf(rules, '.ds-divider[data-ds-orientation="vertical"]')["min-block-size"]).toBe("100%");
  });

  it("draws the line in CanvasText under forced colors, on every material the line is drawn on", () => {
    const forced = rules.filter((rule) => rule.atRules.some((at) => at.name === "media" && at.params === "(forced-colors: active)"));
    expect(forced.length).toBeGreaterThan(0);
    // The sheet as a browser in forced colors reads it: the media block applies, in its place. The cascade
    // above never counts a media block, so it is read as a layer here, which the cascade does count.
    const forcedCascade = new Cascade(css.replace("@media (forced-colors: active)", "@layer ds.forced-colors"));
    for (const material of surfaceMaterials) {
      const state = on({ "data-ds-surface": material });
      // A material with no colour cell paints nothing, in forced colors too.
      const drawn = cell(root["color"], material) !== undefined;
      expect(forcedCascade.value(state, "--ds--divider-color"), material).toBe(drawn ? "CanvasText" : "transparent");
      if (drawn) expect(forcedCascade.value(state, "forced-color-adjust"), material).toBe("none");
    }
  });
});

describe("Divider renders", () => {
  it("a hidden div by default, with its orientation, inset and the material it sits on", () => {
    expect(html(<Divider />)).toBe(
      '<div class="ds-divider" data-ds-slot="divider" data-ds-orientation="horizontal" data-ds-inset="none" data-ds-surface="page" aria-hidden="true"></div>',
    );
    const vertical = rootTag(html(<Divider orientation="vertical" inset="content" />));
    expect(vertical).toContain('data-ds-orientation="vertical"');
    expect(vertical).toContain('data-ds-inset="content"');
  });

  it("React Aria's separator, as a div, when isDecorative is false", () => {
    const horizontal = html(<Divider isDecorative={false} />);
    expect(horizontal).toMatch(/^<div [^>]*role="separator"/);
    expect(horizontal).not.toContain("aria-hidden");
    // Horizontal is the separator role's default orientation, so React Aria leaves it unsaid.
    expect(horizontal).not.toContain("aria-orientation");
    expect(horizontal).not.toContain("<hr");
    const vertical = rootTag(html(<Divider orientation="vertical" isDecorative={false} />));
    expect(vertical).toContain('role="separator"');
    expect(vertical).toContain('aria-orientation="vertical"');
    expect(vertical).toContain('class="ds-divider"');
    expect(vertical).toContain('data-ds-slot="divider"');
    expect(vertical).toContain('data-ds-surface="page"');
  });

  it("the material the enclosing Surface publishes", () => {
    expect(dividerTag(html(<Surface material="vivid"><Divider /></Surface>))).toContain('data-ds-surface="vivid"');
    expect(dividerTag(html(<Surface material="glass" backdrop="map"><Divider isDecorative={false} /></Surface>))).toContain('data-ds-surface="glass"');
  });

  it("the raised cell under the glass fallback, with no fallback of its own (behavior 9)", () => {
    for (const theme of [{ contrast: "more" }, { transparency: "reduce" }] as const) {
      const out = html(
        <Surface material="glass" backdrop="map">
          <Divider inset="content" />
        </Surface>,
        theme,
      );
      expect(dividerTag(out), JSON.stringify(theme)).toContain('data-ds-surface="raised"');
    }
  });

  it("no children, even when handed some", () => {
    const Loose = Divider as unknown as (props: DividerProps & { readonly children?: ReactNode }) => ReactNode;
    expect(html(<Loose>content</Loose>)).not.toContain("content");
    expect(html(<Loose isDecorative={false}>content</Loose>)).not.toContain("content");
  });

  it("keeps its own attributes over the caller's, and merges the class name", () => {
    const Loose = Divider as unknown as (props: Record<string, unknown>) => ReactNode;
    const tag = rootTag(html(<Loose className="app-rule" aria-hidden="false" data-ds-slot="rule" data-ds-surface="vivid" />));
    expect(tag).toContain('class="ds-divider app-rule"');
    expect(tag).toContain('aria-hidden="true"');
    expect(tag).toContain('data-ds-slot="divider"');
    expect(tag).toContain('data-ds-surface="page"');
  });

  it("drops what would name, describe or focus the line, decorative or not, even past the type", () => {
    // Divider.yaml `label: none` and `keyboard: not focusable`: a caller that casts past DividerProps still
    // cannot make the root a tab stop (a focusable element under aria-hidden) or give it words Apple has no
    // parameter for. Everything else still reaches the root.
    const Loose = Divider as unknown as (props: Record<string, unknown>) => ReactNode;
    const withheld = {
      role: "presentation",
      "aria-orientation": "vertical",
      "aria-roledescription": "rule",
      "aria-label": "Section end",
      "aria-labelledby": "heading",
      "aria-describedby": "note",
      "aria-description": "Ends the section",
      "aria-details": "details",
      title: "Section end",
      tabIndex: 0,
      contentEditable: true,
    };
    for (const isDecorative of [true, false]) {
      const tag = rootTag(html(<Loose isDecorative={isDecorative} id="rule" {...withheld} />));
      const label = String(isDecorative);
      for (const attribute of ["tabindex", "contenteditable", "title", "aria-label", "aria-labelledby", "aria-describedby", "aria-description", "aria-details", "aria-roledescription"]) {
        expect(tag, `${label} ${attribute}`).not.toContain(`${attribute}=`);
      }
      expect(tag, label).not.toContain('role="presentation"');
      expect(tag, label).not.toContain('aria-orientation="vertical"');
      expect(tag, label).toContain('id="rule"');
      expect(tag.includes('aria-hidden="true"'), label).toBe(isDecorative);
      expect(tag.includes('role="separator"'), label).toBe(!isDecorative);
    }
  });

  it("forwards ScopeAttributes to the root, decorative or not (ADR-0019 rule 8)", () => {
    for (const isDecorative of [true, false]) {
      const tag = rootTag(html(<Divider isDecorative={isDecorative} data-ds-color-scheme="dark" data-ds-density="regular" />));
      expect(tag, String(isDecorative)).toContain('data-ds-color-scheme="dark"');
      expect(tag, String(isDecorative)).toContain('data-ds-density="regular"');
    }
  });
});

/**
 * Divider.yaml `accessibility`: role none while `isDecorative` is true, separator otherwise, and
 * `label: none`. Every example's name is the empty string. The one difference between the stacks is the
 * role of `semantic`: the web exposes the line as a separator, and SwiftUI has no separator trait, so
 * `DSDivider` is never an accessibility element (Divider.yaml `notes.platform.ios`, ADR-0032), which
 * DSDividerAccessibilityTreeTests measures on the simulator for the same ids. Neither stack announces a
 * name.
 */
describe("the accessible name and role of every spec example (Divider.yaml accessibility)", () => {
  const names: Readonly<Record<string, string>> = {
    horizontal: "",
    "horizontal-inset": "",
    vertical: "",
    semantic: "",
    "on-vivid": "",
    "on-glass-over-map": "",
  };

  it("says the Divider has no label", () => {
    expect(spec.accessibility?.label).toMatch(/^none\b/u);
    expect(spec.accessibility?.role).toContain("separator");
  });

  it("names every example with the empty string, exposes only the non-decorative one, and hides the rest", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(names));
    const isDecorativeByDefault = spec.props.find((prop) => prop.name === "isDecorative")?.default;
    for (const example of spec.examples) {
      // The spec's props are YAML, so their shape is the spec's word; the render below is the check.
      const props = example.props as unknown as DividerProps;
      const isDecorative = (example.props["isDecorative"] ?? isDecorativeByDefault) as boolean;
      const out = html(<Divider {...props} />);
      const tag = rootTag(out);
      expect(tag, example.id).toContain('data-ds-slot="divider"');
      expect(tag.includes('aria-hidden="true"'), example.id).toBe(isDecorative);
      expect(tag.includes('role="separator"'), example.id).toBe(!isDecorative);
      for (const attribute of ["aria-label", "aria-labelledby", "title"]) expect(tag, `${example.id} ${attribute}`).not.toContain(`${attribute}=`);
      // The separator role takes its name from the author alone, and there is none: no label, no text.
      const text = out.replace(/<[^>]*>/gu, "");
      expect(text, example.id).toBe(names[example.id]);
    }
  });

  it("exposes exactly one example, semantic, as a separator", () => {
    const exposed = spec.examples.filter((example) => example.props["isDecorative"] === false).map((example) => example.id);
    expect(exposed).toEqual(["semantic"]);
  });
});
