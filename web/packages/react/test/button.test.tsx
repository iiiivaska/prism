/// <reference types="node" />
/**
 * Button (spec/components/Button.yaml, specVersion 4).
 *
 * - Button.css binds what Button.yaml binds: every variant on every material the matrices key, the rest,
 *   pressed and hover fills, the outline's colour and width, sizes, label typography, icons, the spinner,
 *   disabled and focus-visible, read through a small cascade so the material cells are checked as they
 *   win on the element.
 * - Motion: the press rides comp.button.motion.press, and ADR-0023 §8.4 arrives through
 *   --ds-motion-presentation-crossfade (the press scale and the danger substitute).
 * - Server renders: React Aria's button with the published material, the loading and disabled states,
 *   icons from the brand table, ScopeAttributes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Button, Surface, buttonSizes, buttonVariants, type ButtonVariant } from "../src/index.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Button");
const css = readFileSync(join(packageRoot, "src", "button", "Button.css"), "utf8");
const cascade = new Cascade(css);
const root = spec.tokens["root"] ?? {};
const noop = (): void => undefined;

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

/** The materials Button.yaml keys its cells by, and one material with no cell of its own. */
const materials = ["solid", "vivid", "glass", "raised"] as const;

function on(variant: ButtonVariant, material: string, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-button"], attributes: { "data-ds-variant": variant, "data-ds-size": "md", "data-ds-surface": material, ...extra } };
}

function html(node: ReactNode): string {
  return renderToStaticMarkup(<Theme tokens={tokens}>{node}</Theme>);
}

describe("the spec is the one this package implements", () => {
  it("is Button.yaml specVersion 4", () => {
    expect(spec.specVersion).toBe(4);
    expect([...buttonVariants]).toEqual(propValues(spec, "variant"));
    expect([...buttonSizes]).toEqual(propValues(spec, "size"));
  });
});

describe("Button.css binds what Button.yaml binds", () => {
  const variants = propValues(spec, "variant") as ButtonVariant[];
  const combinations = variants.flatMap((variant) => materials.map((material) => ({ variant, material })));

  it.each(combinations)("root.background, root.foreground, root.border and root.borderWidth of $variant on $material", ({ variant, material }) => {
    expect(cascade.value(on(variant, material), "--ds--button-fill")).toBe(bound(cell(root["background"], variant, material)) ?? "transparent");
    expect(cascade.value(on(variant, material), "--ds--button-foreground")).toBe(bound(cell(root["foreground"], variant, material)));
    const border = cell(root["border"], variant, material);
    expect(cascade.value(on(variant, material), "--ds--button-border")).toBe(bound(border) ?? "transparent");
    // root.borderWidth is keyed by variant alone, so the outline keeps its width on every material (ADR-0033).
    const width = cell(root["borderWidth"], variant, material);
    expect(cascade.value(on(variant, material), "--ds--button-border-width")).toBe(bound(width) ?? "calc(var(--ds-border-hairline) * 0)");
    // Wherever an outline is drawn it has a width, and wherever there is a width there is an outline.
    expect(width === undefined, `${variant} on ${material}`).toBe(border === undefined);
  });

  it.each(combinations)("root.pressed.background of $variant on $material", ({ variant, material }) => {
    const pressed = cascade.value(on(variant, material, { "data-pressed": "" }), "--ds--button-fill");
    const rest = cascade.value(on(variant, material), "--ds--button-fill");
    const cellValue = bound(cell((root["pressed"] as Record<string, Binding> | undefined)?.["background"], variant));
    if (variant === "primary" && material === "vivid") {
      // Button.yaml's pressed cell has no vivid key; the white inverse-media pill keeps its fill so its ink
      // label stays legible (reported against the spec, see Button.css).
      expect(pressed).toBe(rest);
    } else {
      expect(pressed).toBe(cellValue ?? rest);
    }
  });

  it("the ghost has no fill at rest and the neutral subtle fill while pressed (ADR-0029 rule 9)", () => {
    expect(cell(root["background"], "ghost")).toBeUndefined();
    expect(cascade.value(on("ghost", "solid"), "--ds--button-fill")).toBe("transparent");
    expect(cascade.value(on("ghost", "solid", { "data-pressed": "" }), "--ds--button-fill")).toBe("var(--ds-button-ghost-bg-pressed)");
  });

  it("root.hover.overlay under ds-pointer only", () => {
    const overlay = bound(cell((root["hover"] as Record<string, Binding> | undefined)?.["overlay"]));
    const hovered = { ...on("primary", "solid", { "data-hovered": "" }) };
    expect(cascade.value({ ...hovered, variants: ["ds-pointer"] }, "--ds--button-hover")).toBe(overlay);
    expect(cascade.value({ ...hovered, variants: ["ds-touch"] }, "--ds--button-hover")).toBe("transparent");
  });

  it("root.radius, root.gap, root.height and root.paddingX", () => {
    const base = declarationsOf(cascade.rules, ".ds-button");
    expect(base["border-radius"]).toBe(bound(cell(root["radius"])));
    expect(base["gap"]).toBe(bound(cell(root["gap"])));
    expect(base["min-block-size"]).toBe("var(--ds--button-height)");
    expect(base["padding-inline"]).toBe("var(--ds--button-padding-x)");
    for (const size of buttonSizes) {
      const state = { classes: ["ds-button"], attributes: { "data-ds-size": size } };
      expect(cascade.value(state, "--ds--button-height"), size).toBe(bound(cell(root["height"], size)));
      expect(cascade.value(state, "--ds--button-padding-x"), size).toBe(bound(cell(root["paddingX"], size)));
    }
  });

  it.each(buttonSizes.map((size) => [size] as const))("label.typography of %s", (size) => {
    const variable = cssVariable(cell(spec.tokens["label"]?.["typography"], size) ?? "");
    expect(declarationsOf(cascade.rules, `.ds-button[data-ds-size="${size}"] > [data-ds-slot="button-label"]`)).toEqual({
      "font-family": `var(${variable}-font-family)`,
      "font-size": `var(${variable}-font-size)`,
      "font-weight": `var(${variable}-font-weight)`,
      "line-height": `var(${variable}-line-height)`,
      "letter-spacing": `var(${variable}-letter-spacing)`,
      "font-variant-numeric": `var(${variable}-font-variant-numeric)`,
    });
  });

  it("leadingIcon.size, trailingIcon.size and spinner.color", () => {
    const icons = declarationsOf(cascade.rules, '.ds-button > [data-ds-slot="button-leading-icon"]');
    expect(icons["inline-size"]).toBe(bound(cell(spec.tokens["leadingIcon"]?.["size"])));
    expect(bound(cell(spec.tokens["trailingIcon"]?.["size"]))).toBe(icons["block-size"]);
    expect(cascade.rules.some((rule) => rule.selectors.includes('.ds-button > [data-ds-slot="button-trailing-icon"]'))).toBe(true);
    for (const variant of ["primary", "secondary"] as const) {
      const spinner = declarationsOf(cascade.rules, `.ds-button[data-ds-variant="${variant}"] > [data-ds-slot="button-label"] > [data-ds-slot="button-spinner"]`);
      expect(spinner["color"], variant).toBe(bound(cell(spec.tokens["spinner"]?.["color"], variant)));
      // The bound spinner color is the variant's foreground on the default material.
      expect(cell(spec.tokens["spinner"]?.["color"], variant)).toBe(cell(root["foreground"], variant, "solid"));
    }
  });

  it("disabled.opacity and focus-visible.ring at ringWidth", () => {
    const disabled = (root["disabled"] as Record<string, Binding> | undefined) ?? {};
    const focus = (root["focus-visible"] as Record<string, Binding> | undefined) ?? {};
    expect(declarationsOf(cascade.rules, ".ds-button[data-disabled]")["opacity"]).toBe(bound(cell(disabled["opacity"])));
    expect(declarationsOf(cascade.rules, ".ds-button[data-focus-visible]")["outline"]).toBe(`${bound(cell(focus["ringWidth"]))} solid ${bound(cell(focus["ring"]))}`);
  });

  it("the danger tint paints the page under itself over media (ADR-0030 §6.2)", () => {
    for (const material of ["vivid", "glass", "glassLight"]) {
      expect(cascade.value(on("danger", material), "--ds--button-under"), material).toBe("var(--ds-color-bg-page)");
    }
    for (const material of ["solid", "raised"]) {
      expect(cascade.value(on("danger", material), "--ds--button-under"), material).toBe("transparent");
    }
  });

  it("the hit region is the larger of the pill and size.hit, never a modality variant (behavior 2)", () => {
    const hit = declarationsOf(cascade.rules, ".ds-button::before");
    expect(hit["inset-block"]).toBe("min(calc(var(--ds-size-hit) * 0), calc((100% - var(--ds-size-hit)) / 2))");
    expect(hit["inset-inline"]).toBe(hit["inset-block"]);
  });

  it("labels never wrap and truncate with an ellipsis (behavior 5)", () => {
    const text = declarationsOf(cascade.rules, '.ds-button > [data-ds-slot="button-label"] > [data-ds-slot="button-label-text"]');
    expect(text["white-space"]).toBe("nowrap");
    expect(text["text-overflow"]).toBe("ellipsis");
  });
});

describe("motion (Button.yaml motion, ADR-0023 §8.4)", () => {
  const base = declarationsOf(cascade.rules, ".ds-button");

  it("presses on comp.button.motion.press and scales to 0.97 only outside Reduce Motion", () => {
    const press = cssVariable(spec.motion?.["press"] ?? "");
    expect(base["transition"]).toContain(`scale var(${press}-duration) var(${press}-easing)`);
    expect(base["--ds--button-press-scale"]).toBe("calc(1 - 0.03 * (1 - var(--ds-motion-presentation-crossfade)))");
    expect(declarationsOf(cascade.rules, ".ds-button[data-pressed]")["scale"]).toBe("var(--ds--button-press-scale)");
    expect(spec.motion?.["reduceMotion"]).toBe("crossfade");
  });

  it("changes fills over motion.duration.base with motion.easing.out, and the danger substitute only under Reduce Motion", () => {
    expect(base["transition"]).toContain("--ds--button-fill var(--ds-motion-duration-base) var(--ds-motion-easing-out)");
    expect(base["transition"]).toContain("--ds--button-press var(--ds-motion-duration-base) var(--ds-motion-easing-out)");
    expect(cascade.value(on("danger", "solid", { "data-pressed": "" }), "--ds--button-press")).toBe(
      "color-mix(in oklab, var(--ds-color-bg-fill-neutral-subtle) calc(var(--ds-motion-presentation-crossfade) * 100%), transparent)",
    );
  });

  it("stops the spinner under Reduce Motion: no turn, the full circle at opacity.dimmed-row", () => {
    const spinner = '.ds-button > [data-ds-slot="button-label"] > [data-ds-slot="button-spinner"]';
    expect(declarationsOf(cascade.rules, spinner)["animation"]).toContain("calc(var(--ds-motion-duration-slower) * (1 - var(--ds-motion-presentation-crossfade)))");
    expect(declarationsOf(cascade.rules, `${spinner} > [data-ds-slot="button-spinner-arc"]`)["opacity"]).toBe("calc(1 - var(--ds-motion-presentation-crossfade))");
    expect(declarationsOf(cascade.rules, `${spinner} > [data-ds-slot="button-spinner-ring"]`)["opacity"]).toBe("calc(var(--ds-opacity-dimmed-row) * var(--ds-motion-presentation-crossfade))");
    expect(css).toContain("rotate: calc(1turn * (1 - var(--ds-motion-presentation-crossfade)))");
  });
});

describe("Button renders", () => {
  it("React Aria's button with its variant, size and the material it sits on", () => {
    const out = html(<Button label="Continue" onPress={noop} />);
    expect(out).toMatch(/^<button [^>]*type="button"/);
    expect(out).toContain('class="ds-button"');
    expect(out).toContain('data-ds-slot="button"');
    expect(out).toContain('data-ds-variant="primary"');
    expect(out).toContain('data-ds-size="md"');
    expect(out).toContain('data-ds-surface="page"');
    expect(out).toContain('<span data-ds-slot="button-label-text">Continue</span>');
    expect(html(<Surface material="vivid"><Button variant="ghost" label="Open" onPress={noop} /></Surface>)).toContain('data-ds-surface="vivid"');
  });

  it("the material a glass Surface actually renders", () => {
    const out = renderToStaticMarkup(
      <Theme tokens={tokens} contrast="more">
        <Surface material="glass" backdrop="map">
          <Button variant="ghost" label="Open" onPress={noop} />
        </Surface>
      </Theme>,
    );
    expect(out).toContain('data-ds-surface="raised"');
  });

  it("isLoading: pending, the label kept for its width, a Spinner and the label \"<label>, loading\"", () => {
    const out = html(<Button label="Saving" isLoading onPress={noop} />);
    expect(out).toContain('data-pending="true"');
    expect(out).toContain('aria-disabled="true"');
    expect(out).toContain('aria-label="Saving, loading"');
    expect(out).toContain('<span data-ds-slot="button-label-text">Saving</span>');
    expect(out).toContain('<svg data-ds-slot="button-spinner" aria-hidden="true" focusable="false"><circle data-ds-slot="button-spinner-ring"></circle><circle data-ds-slot="button-spinner-arc" pathLength="100"></circle></svg>');
  });

  it("isDisabled: disabled and out of the focus order", () => {
    const out = html(<Button label="Continue" isDisabled onPress={noop} />);
    expect(out).toContain("disabled=\"\"");
    expect(out).toContain('data-disabled="true"');
  });

  it("isFullWidth, and icons drawn by Icon's box: md, the label's color, hidden, in the brand table's cut", () => {
    const out = html(<Button label="Filter" leadingIcon="action.filter" trailingIcon="nav.open" isFullWidth onPress={noop} />);
    expect(out).toContain('data-ds-full-width=""');
    // The part is Icon's box under Button's part name; `tone: inherit` writes no data-ds-tone, so the glyph
    // takes the label's foreground, and a glyph with no `label` is hidden (Icon.yaml behaviors 9 and 14).
    expect(out).toMatch(/<span class="ds-icon" data-ds-slot="button-leading-icon" data-ds-icon="action.filter" data-ds-size="md" [^>]*aria-hidden="true"><svg [^>]*class="ds-glyph" data-ds-slot="icon-glyph">/);
    expect(out).toMatch(/<span class="ds-icon" data-ds-slot="button-trailing-icon" data-ds-icon="nav.open" data-ds-size="md" [^>]*aria-hidden="true"><svg [^>]*class="ds-glyph" data-ds-slot="icon-glyph" data-ds-mirror="">/);
    expect(out).not.toContain("data-ds-tone");
    expect(out).not.toContain('role="img"');
    expect(out.indexOf("button-leading-icon")).toBeLessThan(out.indexOf("button-label"));
    expect(out.indexOf("button-label")).toBeLessThan(out.indexOf("button-trailing-icon"));
  });

  it("forwards ScopeAttributes to the button (ADR-0019 rule 8)", () => {
    const out = html(<Button label="Continue" onPress={noop} data-ds-color-scheme="dark" data-ds-density="compact" />);
    expect(out).toMatch(/^<button [^>]*data-ds-color-scheme="dark"/);
    expect(out).toMatch(/^<button [^>]*data-ds-density="compact"/);
  });
});
