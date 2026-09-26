/// <reference types="node" />
/**
 * Button (spec/components/Button.yaml, specVersion 7).
 *
 * - Button.css binds what Button.yaml binds: every variant on every material the matrices key, the rest,
 *   pressed and hover fills, the outline's colour and width, sizes, label typography, icons, the spinner,
 *   disabled and focus-visible, read through a small cascade so the material cells are checked as they
 *   win on the element.
 * - Motion: the press rides comp.button.motion.press, and ADR-0023 §8.4 arrives through
 *   --ds-motion-presentation-crossfade (the press scale and the danger substitute).
 * - Server renders: React Aria's button with the published material, the loading and disabled states,
 *   icons from the brand table, ScopeAttributes.
 * - The loading name (behavior 3, ADR-0032): the app's `strings.Button.loading` filled with `label`,
 *   the English default and an app's template set through `<Theme strings>` alike, so the words are
 *   the table's and not Button's. `DSButtonBindingTests` holds `DSButton.loadingName` to the same names.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type StringsTable } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import { Button, Surface, buttonSizes, buttonVariants, defaultStrings, surfaceMaterials, type ButtonVariant } from "../src/index.ts";
import { fillTemplate } from "../src/strings.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Button");
const css = readFileSync(join(packageRoot, "src", "button", "Button.css"), "utf8");
const cascade = new Cascade(css);
const root = spec.tokens["root"] ?? {};
const noop = (): void => undefined;

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

/** Every material a Surface publishes: Button.yaml keys each of them in some cell (ADR-0040), and falls back to `default`. */
const materials = surfaceMaterials;

function on(variant: ButtonVariant, material: string, extra: Record<string, string> = {}): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-button"], attributes: { "data-ds-variant": variant, "data-ds-size": "md", "data-ds-surface": material, ...extra } };
}

function html(node: ReactNode, strings?: Partial<StringsTable>): string {
  return renderToStaticMarkup(
    <Theme tokens={tokens} strings={strings}>
      {node}
    </Theme>,
  );
}

/** The accessible name a render writes on its button: the `aria-label` of the root, if it has one. */
function nameOf(out: string): string | undefined {
  return /^<button [^>]*aria-label="([^"]*)"/.exec(out)?.[1];
}

describe("the spec is the one this package implements", () => {
  it("is Button.yaml specVersion 7", () => {
    expect(spec.specVersion).toBe(7);
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
    const cellValue = bound(cell((root["pressed"] as Record<string, Binding> | undefined)?.["background"], variant, material));
    expect(pressed).toBe(cellValue ?? rest);
  });

  // ADR-0039: the pressed pill is one lightness step from its rest, in every scheme and under Increase Contrast, so
  // the press is never the fill already on screen. The pixels are Apple's `DSButtonReduceMotionTests`.
  it("gives primary's pressed cells a value of their own in every colour scheme context (ADR-0039)", () => {
    const pressedCells = (root["pressed"] as Record<string, Binding> | undefined)?.["background"];
    for (const colorScheme of ["light", "dark"] as const) {
      for (const contrast of ["standard", "more"] as const) {
        const resolved = tokens.resolveTokens({ colorScheme, contrast }) as unknown as Readonly<Record<string, { readonly hex: string; readonly alpha: number }>>;
        // A colour is its hex and its alpha: the knocked-out pressed step on the lit tile is the tile's ink at 88 %.
        const colour = (token: string | undefined): string | undefined => {
          const value = resolved[token ?? ""];
          return value === undefined ? undefined : `${value.hex}/${String(value.alpha)}`;
        };
        for (const material of materials) {
          const rest = cell(root["background"], "primary", material);
          const pressed = cell(pressedCells, "primary", material);
          const context = `${colorScheme}, contrast ${contrast}, on ${material}: ${pressed ?? "no cell"} against ${rest ?? "no cell"}`;
          expect(colour(pressed), context).toBeDefined();
          expect(colour(pressed), context).not.toBe(colour(rest));
        }
      }
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
      const base = declarationsOf(cascade.rules, `.ds-button[data-ds-variant="${variant}"] > [data-ds-slot="button-label"] > [data-ds-slot="button-spinner"]`);
      for (const material of materials) {
        const keyed = declarationsOf(cascade.rules, `.ds-button[data-ds-variant="${variant}"][data-ds-surface="${material}"] > [data-ds-slot="button-label"] > [data-ds-slot="button-spinner"]`);
        const spinner = cell(spec.tokens["spinner"]?.["color"], variant, material);
        expect(keyed["color"] ?? base["color"], `${variant} on ${material}`).toBe(bound(spinner));
        // The spinner turns in the colour of the label it replaces, knocked out on inverse and accent too.
        expect(spinner, `${variant} on ${material}`).toBe(cell(root["foreground"], variant, material));
      }
    }
  });

  it("disabled.opacity and focus-visible.ring at ringWidth", () => {
    const disabled = (root["disabled"] as Record<string, Binding> | undefined) ?? {};
    const focus = (root["focus-visible"] as Record<string, Binding> | undefined) ?? {};
    expect(declarationsOf(cascade.rules, ".ds-button[data-disabled]")["opacity"]).toBe(bound(cell(disabled["opacity"])));
    expect(declarationsOf(cascade.rules, ".ds-button[data-focus-visible]")["outline"]).toBe(`${bound(cell(focus["ringWidth"]))} solid ${bound(cell(focus["ring"]))}`);
  });

  it("root.underlay: the danger tint paints the page under itself off the solid ladder (ADR-0030 §6.2, ADR-0040 §3)", () => {
    const underlay = root["underlay"] as Record<string, Binding> | undefined;
    expect(Object.keys((underlay?.["danger"] ?? {}) as Record<string, Binding>)).toEqual(["vivid", "glass", "glassLight", "inverse", "accent"]);
    for (const variant of variants) {
      for (const material of materials) {
        expect(cascade.value(on(variant, material), "--ds--button-under"), `${variant} on ${material}`).toBe(bound(cell(underlay, variant, material)) ?? "transparent");
      }
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

  it("isLoading: pending, the label kept for its width, a Spinner and the English strings.Button.loading as the name", () => {
    const out = html(<Button label="Saving" isLoading onPress={noop} />);
    expect(out).toContain('data-pending="true"');
    expect(out).toContain('aria-disabled="true"');
    expect(nameOf(out)).toBe("Saving, loading");
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

describe("the loading name is the strings table's (behavior 3, ADR-0032)", () => {
  it("is strings.Button.loading filled with the label, and \"Saving, loading\" is the table's English default", () => {
    expect(defaultStrings["Button.loading"]).toBe("{label}, loading");
    expect(nameOf(html(<Button label="Saving" isLoading onPress={noop} />))).toBe(fillTemplate(defaultStrings["Button.loading"], { label: "Saving" }));
  });

  it("speaks the app's template, set once at the root through <Theme strings>", () => {
    const strings = { "Button.loading": "{label}: загрузка" } as const;
    expect(nameOf(html(<Button label="Сохранение" isLoading onPress={noop} />, strings))).toBe("Сохранение: загрузка");
    // The template the app writes may drop the label; the name is then the app's words alone.
    expect(nameOf(html(<Button label="Сохранение" isLoading onPress={noop} />, { "Button.loading": "Загрузка" }))).toBe("Загрузка");
  });

  it("names a button that is not loading by its label alone, whatever the table says", () => {
    const out = html(<Button label="Сохранение" onPress={noop} />, { "Button.loading": "{label}: загрузка" });
    expect(nameOf(out)).toBeUndefined();
    expect(out).toContain('<span data-ds-slot="button-label-text">Сохранение</span>');
  });

  it("places the label as written and never reads it as a template", () => {
    expect(nameOf(html(<Button label="{label}" isLoading onPress={noop} />))).toBe("{label}, loading");
  });
});
