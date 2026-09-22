/// <reference types="node" />
/**
 * Text (spec/components/Text.yaml, specVersion 2).
 *
 * - The Text unit test over the tone table of ADR-0022 rule 6 and ADR-0029 rule 2: every published
 *   material, backdrop kind and tone against Text.yaml's own matrices, read with the binding grammar.
 * - Text.css binds every role's six declarations and every foreground, and sets font-synthesis: none.
 * - Server renders: headings, nesting, the metric's accessible value, numeric and truncation attributes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packageRoot } from "../scripts/build-styles.ts";
import { Surface, Text } from "../src/index.ts";
import type { SurfaceContextValue } from "../src/surface/context.ts";
import { surfaceMaterials, type BackdropKind } from "../src/surface/resolve.ts";
import {
  foregroundOf,
  textForegrounds,
  textNumerics,
  textRoles,
  textTones,
  textTruncations,
  trailingForegroundOf,
  unitForegroundOf,
  type TextRole,
  type TextTone,
} from "../src/text/tones.ts";
import { flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues } from "./spec.ts";

const spec = loadSpec("Text");
const PREFIX = "color.text.";

/** Every context Text can read: the solid family, the single-tone materials, and glass per backdrop. */
const glassBackdrops: readonly BackdropKind[] = ["map", "image", "vivid"];
const published = surfaceMaterials.flatMap((material): Pick<SurfaceContextValue, "material" | "backdrop">[] =>
  material === "glass" ? glassBackdrops.map((backdrop) => ({ material, backdrop })) : [{ material, backdrop: "none" }],
);

function specCell(part: "root" | "trailing" | "unit", surface: Pick<SurfaceContextValue, "material" | "backdrop">, tone?: TextTone): string | undefined {
  const color = spec.tokens[part]?.["color"];
  const keys = surface.material === "glass" ? [surface.material, surface.backdrop] : [surface.material];
  return tone === undefined ? cell(color, ...keys) : cell(color, ...keys, tone);
}

describe("the spec is the one this package implements", () => {
  it("is Text.yaml specVersion 2", () => {
    expect(spec.specVersion).toBe(2);
    expect([...textRoles]).toEqual(propValues(spec, "role"));
    expect([...textTones]).toEqual(propValues(spec, "tone"));
    expect([...textNumerics]).toEqual(propValues(spec, "numeric"));
    expect([...textTruncations]).toEqual(propValues(spec, "truncation"));
  });
});

describe("the tone table (ADR-0022 rule 6, ADR-0029 rule 2)", () => {
  const tones = textTones.filter((tone): tone is Exclude<TextTone, "inherit"> => tone !== "inherit");

  it.each(published)("root.color on $material over $backdrop, for a metric role of 24 px or more", (surface) => {
    for (const tone of tones) {
      expect(`${PREFIX}${foregroundOf(surface, tone, "metric-xl")}`, tone).toBe(specCell("root", surface, tone));
    }
  });

  it.each(published)("trailing.color and unit.color on $material over $backdrop", (surface) => {
    expect(`${PREFIX}${trailingForegroundOf(surface, "metric-xl")}`).toBe(specCell("trailing", surface));
    expect(`${PREFIX}${trailingForegroundOf(surface, "metric-lg")}`).toBe(specCell("trailing", surface));
    expect(`${PREFIX}${unitForegroundOf(surface)}`).toBe(specCell("unit", surface));
  });

  it.each(published)("dimmed and the trailing group resolve to secondary below 24 px on $material over $backdrop (behavior 5)", (surface) => {
    for (const role of textRoles.filter((candidate) => candidate !== "metric-xl" && candidate !== "metric-lg")) {
      expect(foregroundOf(surface, "dimmed", role), role).toBe(foregroundOf(surface, "secondary", role));
    }
    expect(trailingForegroundOf(surface, "metric-md")).toBe(foregroundOf(surface, "secondary", "metric-md"));
  });

  it("inherit resolves nothing", () => {
    expect(foregroundOf({ material: "solid", backdrop: "none" }, "inherit", "body-md")).toBeNull();
  });

  it("names every foreground the spec binds, and no other", () => {
    const bound = new Set<string>();
    const walk = (binding: unknown): void => {
      if (typeof binding === "string") bound.add(binding);
      else if (binding !== null && typeof binding === "object") Object.values(binding).forEach(walk);
    };
    for (const part of ["root", "trailing", "unit"]) walk(spec.tokens[part]?.["color"]);
    expect([...textForegrounds].map((foreground) => `${PREFIX}${foreground}`).sort()).toEqual([...bound].sort());
  });
});

describe("Text.css", () => {
  const rules = flattenRules(parseCss(readFileSync(join(packageRoot, "src", "text", "Text.css"), "utf8")));
  const declarations = (selector: string): Record<string, string> =>
    Object.fromEntries(rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.declarations.map((declaration) => [declaration.property, declaration.value])));

  it.each(textRoles.map((role) => [role] as const))("binds root.typography of %s", (role) => {
    const variable = cssVariable(cell(spec.tokens["root"]?.["typography"], role) ?? "");
    expect(declarations(`.ds-text[data-ds-role="${role}"]`)).toEqual({
      "font-family": `var(${variable}-font-family)`,
      "font-size": `var(${variable}-font-size)`,
      "font-weight": `var(${variable}-font-weight)`,
      "line-height": `var(${variable}-line-height)`,
      "letter-spacing": `var(${variable}-letter-spacing)`,
      "font-variant-numeric": `var(${variable}-font-variant-numeric)`,
    });
  });

  it("binds unit.typography and unit.gap", () => {
    const unit = declarations('.ds-text [data-ds-slot="text-unit"]');
    const variable = cssVariable(spec.tokens["unit"]?.["typography"] as string);
    expect(unit["font-size"]).toBe(`var(${variable}-font-size)`);
    expect(unit["font-family"]).toBe(`var(${variable}-font-family)`);
    expect(unit["margin-inline-start"]).toBe(`var(${cssVariable(spec.tokens["unit"]?.["gap"] as string)})`);
  });

  it.each(textForegrounds.map((foreground) => [foreground] as const))("maps foreground %s to its variable", (foreground) => {
    const selector = `:is(.ds-text, [data-ds-slot="text-trailing"], [data-ds-slot="text-unit"])[data-ds-foreground="${foreground}"]`;
    expect(declarations(selector)["color"]).toBe(`var(--ds-color-text-${foreground})`);
  });

  it("sets font-synthesis: none (ADR-0021 §10) and the figures of ADR-0021 §5", () => {
    expect(declarations(".ds-text")["font-synthesis"]).toBe("none");
    expect(declarations('.ds-text[data-ds-numeric="tabular"]')["font-variant-numeric"]).toBe("tabular-nums");
    expect(declarations('.ds-text[data-ds-numeric="proportional"]')["font-variant-numeric"]).toBe("normal");
  });
});

describe("Text renders", () => {
  const html = (node: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(node);

  it("a span with its role, foreground and no heading for body roles", () => {
    expect(html(<Text>Hello</Text>)).toBe('<span class="ds-text" data-ds-slot="text" data-ds-role="body-md" data-ds-foreground="primary">Hello</span>');
  });

  it.each([
    ["display-xl", "h1"],
    ["title-lg", "h1"],
    ["title-md", "h2"],
    ["title-sm", "h3"],
  ] as const)("a heading for %s (%s)", (role: TextRole, element) => {
    const out = html(<Text role={role}>Heading</Text>);
    expect(out).toMatch(new RegExp(`^<${element} [^>]*>Heading</${element}>$`));
    expect(out).toContain('class="ds-text"');
    expect(out).toContain(`data-ds-role="${role}"`);
  });

  it("the heading level it is given, and a span for a Text inside a Text", () => {
    expect(html(<Text role="title-lg" headingLevel={2}>A</Text>)).toMatch(/^<h2 /);
    const nested = html(
      <Text role="title-lg">
        First line <Text role="title-lg" tone="secondary">second line</Text>
      </Text>,
    );
    expect(nested).toMatch(/^<h1 [^>]*>First line <span class="ds-text" data-ds-slot="text" data-ds-role="title-lg" data-ds-foreground="secondary">second line<\/span><\/h1>$/);
  });

  it("a metric's dimmed trailing group, hung unit and one accessible value", () => {
    const out = html(
      <Text role="metric-xl" trailing=".4" unit="%">
        86
      </Text>,
    );
    expect(out).toContain('<span data-ds-slot="text-label">86.4 %</span><span aria-hidden="true">86<span data-ds-slot="text-trailing" data-ds-foreground="dimmed">.4</span><span data-ds-slot="text-unit" data-ds-foreground="secondary">%</span></span>');
  });

  it("no trailing group or unit on a role that is not a metric", () => {
    expect(html(<Text role="caption" trailing=".4" unit="%">86</Text>)).not.toContain("text-unit");
  });

  it("tones from the Surface it sits in", () => {
    const out = html(
      <Surface material="glass" backdrop="map">
        <Text role="caption" tone="secondary">
          Caption
        </Text>
      </Surface>,
    );
    expect(out).toContain('data-ds-foreground="on-glass-fill-secondary"');
    const vivid = html(
      <Surface material="vivid">
        <Text role="headline">Headline</Text>
      </Surface>,
    );
    expect(vivid).toContain('data-ds-foreground="on-vivid"');
  });

  it("numeric and truncation attributes, and the line count as a custom property", () => {
    expect(html(<Text role="data" numeric="tabular">12</Text>)).toContain('data-ds-numeric="tabular"');
    const fade = html(<Text truncation="fade">Prose</Text>);
    expect(fade).toContain('data-ds-truncation="fade"');
    expect(fade).toContain('style="--ds--text-max-lines:3"');
    const id = html(<Text truncation="ellipsis">id</Text>);
    expect(id).toContain('data-ds-single-line=""');
  });
});
