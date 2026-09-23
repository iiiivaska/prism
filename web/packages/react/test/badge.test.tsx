/// <reference types="node" />
/**
 * Badge (spec/components/Badge.yaml, specVersion 1).
 *
 * - Badge.css binds what Badge.yaml binds: every cell of `tokens`, read off the spec and checked as it wins
 *   on the root through a small cascade, for every variant, tone and emphasis; the border width on `outline`
 *   only and the padding on `count` only; no offset, which the host applies (behavior 13); the digits at
 *   `label.typography` with tabular figures (behavior 8).
 * - `motion`: new digits fade in over `motion.count` and at `reduceMotion`'s instant under Reduce Motion
 *   (Badge.css); the first drawing is no replacement. The fade itself is measured on a real element by
 *   web/apps/gallery/test/components.browser.test.tsx.
 * - Behaviour, through ./src/badge/text.ts and the rendered markup: the vectors (drawn digits, contribution,
 *   exposure) that `DSBadgeBindingTests.vectors` asserts byte for byte on Apple; the counts that render nothing, the dot that ignores `count`, the `max` the web reads as 99.
 * - Server renders: the root with its three attributes, the spec's defaults, the attributes and handlers it
 *   withholds, ScopeAttributes.
 * - `accessibility`, per spec example: every example stands alone with a `label`, so each is an image named
 *   by its contribution, the names the table below writes. The same names are read from Chromium's own tree by
 *   web/apps/gallery/test/accessibility.browser.test.tsx, and off the simulator by
 *   swift/Tests/DSSnapshotTests/DSBadgeAccessibilityTreeTests.swift, for the same ids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "react-aria-components";
import { describe, expect, it, vi } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme, type Density, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { packageRoot } from "../scripts/build-styles.ts";
import {
  Badge,
  Surface,
  badgeEmphases,
  badgeTones,
  badgeVariants,
  defaultStrings,
  textRoles,
  type BackdropKind,
  type BadgeEmphasis,
  type BadgeProps,
  type BadgeTone,
  type BadgeVariant,
  type StringsTable,
  type SurfaceMaterial,
} from "../src/index.ts";
import { BadgeHostContext } from "../src/badge/host.ts";
import { badgeContribution, badgeDefaultMax, badgeDrawn, badgeMax, hasBadgeLabel, isBadgeExposed, isBadgeVisible } from "../src/badge/text.ts";
import { isIconExposed } from "../src/icon/Icon.tsx";
import { tokenValue } from "../src/icon/weight.ts";
import { Cascade, declarationsOf } from "./cascade.ts";
import { allAtRules, flattenRules, parseCss } from "./css.ts";
import { cell, cssVariable, loadSpec, propValues, type Binding } from "./spec.ts";

const spec = loadSpec("Badge");
const css = readFileSync(join(packageRoot, "src", "badge", "Badge.css"), "utf8");
const cascade = new Cascade(css);
const rules = flattenRules(parseCss(css));
const root = spec.tokens["root"] ?? {};
const label = spec.tokens["label"] ?? {};

const bound = (path: string | undefined): string | undefined => (path === undefined ? undefined : `var(${cssVariable(path)})`);

/** The root of a badge with its three attributes, as the cascade sees it. */
function badge(variant: string, tone: string, emphasis: string): Parameters<Cascade["value"]>[0] {
  return { classes: ["ds-badge"], attributes: { "data-ds-variant": variant, "data-ds-tone": tone, "data-ds-emphasis": emphasis } };
}

const combinations = badgeVariants.flatMap((variant) => badgeTones.flatMap((tone) => badgeEmphases.map((emphasis) => ({ variant, tone, emphasis }))));

interface Staging {
  readonly locale?: string;
  readonly strings?: Partial<StringsTable>;
  readonly hosted?: boolean;
}

function html(node: ReactNode, staging: Staging = {}): string {
  let inner = node;
  if (staging.hosted === true) inner = <BadgeHostContext.Provider value={true}>{inner}</BadgeHostContext.Provider>;
  if (staging.locale !== undefined) inner = <I18nProvider locale={staging.locale}>{inner}</I18nProvider>;
  return renderToStaticMarkup(
    <Theme tokens={tokens} strings={staging.strings}>
      {inner}
    </Theme>,
  );
}

/** Text as React's server render escaped it, back to the string the badge wrote. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

/** The attributes of the Badge's root inside a render, found by its slot. */
function badgeTag(out: string): string | undefined {
  return /<span ([^>]*data-ds-slot="badge"[^>]*)>/.exec(out)?.[1];
}

/** The digits a render draws: the text of the Text inside the label part. */
function digitsOf(out: string): string | undefined {
  const digits = /<span class="ds-badge-label" data-ds-slot="badge-label"[^>]*><span [^>]*>([^<]*)<\/span><\/span>/.exec(out)?.[1];
  return digits === undefined ? undefined : unescaped(digits);
}

/** The accessible name the root carries, or null when it is hidden. */
function nameOf(out: string): string | null {
  const tag = badgeTag(out) ?? "";
  if (tag.includes('aria-hidden="true"')) {
    expect(tag).not.toContain("role=");
    expect(tag).not.toContain("aria-label");
    return null;
  }
  expect(tag).toContain('role="img"');
  const name = /aria-label="([^"]*)"/.exec(tag)?.[1];
  expect(name).toBeDefined();
  return unescaped(name ?? "");
}

/** An example of Badge.yaml, staged as the harnesses stage it: on the page, or in a Surface hugging it. */
function staged(example: (typeof spec.examples)[number]): string {
  const mark = <Badge {...example.props} />;
  const fields = example as unknown as { readonly surface?: string; readonly backdrop?: string };
  if (fields.surface === undefined) return html(mark);
  return html(
    <Surface material={fields.surface as SurfaceMaterial} backdrop={(fields.backdrop ?? "none") as BackdropKind} radius="card">
      {mark}
    </Surface>,
  );
}

describe("the spec is the one this package implements", () => {
  it("is Badge.yaml specVersion 1", () => {
    expect(spec.specVersion).toBe(1);
    expect([...badgeVariants]).toEqual(propValues(spec, "variant"));
    expect([...badgeTones]).toEqual(propValues(spec, "tone"));
    expect([...badgeEmphases]).toEqual(propValues(spec, "emphasis"));
  });

  it("declares the props Badge takes, with the defaults Badge renders", () => {
    expect(spec.props.map((prop) => prop.name)).toEqual(["variant", "tone", "emphasis", "count", "max", "label"]);
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.default !== undefined).map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ variant: "count", tone: "neutral", emphasis: "filled", max: badgeDefaultMax });
    const tag = badgeTag(html(<Badge count={3} />)) ?? "";
    expect(tag).toContain('data-ds-variant="count"');
    expect(tag).toContain('data-ds-tone="neutral"');
    expect(tag).toContain('data-ds-emphasis="filled"');
    expect(digitsOf(html(<Badge count={100} />))).toBe("99+");
  });

  it("binds exactly the parts and properties this sheet maps, with no material axis", () => {
    expect(Object.keys(spec.tokens)).toEqual(["root", "label"]);
    expect(Object.keys(root)).toEqual(["background", "border", "borderWidth", "radius", "height", "minWidth", "paddingX"]);
    expect(Object.keys(label)).toEqual(["typography", "color"]);
    // The emphasis keys the colour cells, and never a material: Badge reads no surface context.
    expect(Object.keys(root["background"] as Record<string, Binding>)).toEqual(["filled"]);
    expect(Object.keys(root["border"] as Record<string, Binding>)).toEqual(["outline"]);
    expect(Object.keys(label["color"] as Record<string, Binding>)).toEqual([...badgeEmphases]);
    expect(css).not.toContain("data-ds-surface");
  });
});

describe("Badge.css binds what Badge.yaml binds", () => {
  it.each(combinations)("root.background, root.border and root.borderWidth of $variant $tone $emphasis", ({ variant, tone, emphasis }) => {
    const state = badge(variant, tone, emphasis);
    expect(cascade.value(state, "--ds--badge-fill")).toBe(bound(cell(root["background"], emphasis, tone)) ?? "transparent");
    expect(cascade.value(state, "--ds--badge-border")).toBe(bound(cell(root["border"], emphasis, tone)) ?? "transparent");
    // A filled badge has no stroke at all: the width is bound on `outline` only (behavior 11).
    expect(cascade.value(state, "--ds--badge-border-width")).toBe(bound(cell(root["borderWidth"], emphasis)) ?? "calc(var(--ds-border-hairline) * 0)");
  });

  it.each(combinations)("label.color of $variant $tone $emphasis", ({ variant, tone, emphasis }) => {
    const expected = bound(cell(label["color"], emphasis, tone));
    expect(expected).toBeDefined();
    expect(cascade.value(badge(variant, tone, emphasis), "--ds--badge-foreground")).toBe(expected);
  });

  it.each(badgeVariants.map((variant) => [variant] as const))("root.height, root.minWidth and root.paddingX of %s", (variant) => {
    for (const tone of badgeTones) {
      for (const emphasis of badgeEmphases) {
        const state = badge(variant, tone, emphasis);
        expect(cascade.value(state, "--ds--badge-height")).toBe(bound(cell(root["height"], variant)));
        expect(cascade.value(state, "--ds--badge-min-width")).toBe(bound(cell(root["minWidth"], variant)));
        expect(cascade.value(state, "--ds--badge-padding-x")).toBe(bound(cell(root["paddingX"], variant)) ?? "calc(var(--ds-space-1) * 0)");
      }
    }
    expect(cell(root["height"], variant)).toBeDefined();
    expect(cell(root["minWidth"], variant)).toBeDefined();
  });

  it("paints what it binds: the radius, the floors, the padding, the fill, the stroke inside the pill and the colour", () => {
    const base = declarationsOf(cascade.rules, ".ds-badge");
    expect(base["border-radius"]).toBe(bound(cell(root["radius"])));
    expect(base["min-block-size"]).toBe("var(--ds--badge-height)");
    expect(base["min-inline-size"]).toBe("var(--ds--badge-min-width)");
    expect(base["padding-inline"]).toBe("var(--ds--badge-padding-x)");
    expect(base["padding-block"]).toBe("0");
    expect(base["background-color"]).toBe("var(--ds--badge-fill)");
    expect(base["box-shadow"]).toBe("inset 0 0 0 var(--ds--badge-border-width) var(--ds--badge-border)");
    expect(base["border"]).toBe("none");
    expect(base["color"]).toBe("var(--ds--badge-foreground)");
    // The pill hugs its digits and never wraps them; it is never a tap target (behaviors 1 and 2).
    expect(base["white-space"]).toBe("nowrap");
    expect(base["box-sizing"]).toBe("border-box");
    expect(base["pointer-events"]).toBe("none");
    expect(base["user-select"]).toBe("none");
  });

  it("applies no offset of its own: the host places the badge (behavior 13)", () => {
    expect(root).not.toHaveProperty("offset");
    expect(spec.behavior?.[12]).toMatch(/^Badge applies no offset of its own/u);
    const layered = rules.filter((rule) => rule.atRules.every((at) => at.name === "layer"));
    const properties = layered.flatMap((rule) => rule.declarations.map((declaration) => declaration.property));
    expect(properties.filter((property) => /offset|^(?:position|inset|top|right|bottom|left|translate|transform)$/u.test(property))).toEqual([]);
    expect(declarationsOf(cascade.rules, ".ds-badge")["margin"]).toBe("0");
    expect(properties.filter((property) => property.startsWith("margin"))).toEqual(["margin"]);
  });

  it("draws the digits at label.typography, with tabular figures (behavior 8, ADR-0021 §5)", () => {
    const role = (cell(label["typography"]) ?? "").replace(/^type\./u, "");
    expect(role).toBe("micro");
    expect(textRoles).toContain(role);
    const out = html(<Badge count={8} label="queued runs" />);
    expect(out).toContain(`<span class="ds-text" data-ds-slot="text" data-ds-role="${role}" data-ds-numeric="tabular">8</span>`);
    // The Text inherits the root's colour (`tone: inherit` writes no foreground).
    expect(out).not.toContain("data-ds-foreground");
  });

  it("keeps the label part a flex box, so the pill is as tall as the digits' line and not the text around it", () => {
    expect(declarationsOf(cascade.rules, ".ds-badge-label")).toEqual({ display: "flex" });
  });

  it("switches nothing with density: every token it binds is the same in each density the spec lists", () => {
    const densities = (spec as unknown as { density: readonly Density[] }).density;
    expect(densities).toEqual(["compact", "regular", "comfortable"]);
    const contextIn = (density: Density): TokenContext => ({ colorScheme: "light", contrast: "standard", transparency: "standard", density, modality: "pointer", motion: "standard" });
    const dimensions = ["borderWidth", "radius", "height", "minWidth", "paddingX"].flatMap((property) => {
      const binding = root[property];
      return typeof binding === "string" ? [binding] : Object.values(binding as Record<string, Binding>).filter((value): value is string => typeof value === "string");
    });
    expect(dimensions.length).toBeGreaterThan(0);
    for (const path of dimensions) {
      expect(new Set(densities.map((density) => JSON.stringify(tokenValue(tokens, path, contextIn(density))))).size, path).toBe(1);
    }
    // And the sheet reads no runtime axis: its only at-rules are the layer and forced colors.
    expect(allAtRules(parseCss(css)).map((at) => `${at.name} ${at.params}`)).toEqual(["keyframes ds-badge-replace", "layer ds.components", "media (forced-colors: active)"]);
  });

  it("keeps its shape under forced colors, as a CanvasText outline inside the pill", () => {
    const forced = rules.filter((rule) => rule.atRules.some((at) => at.name === "media" && at.params === "(forced-colors: active)"));
    expect(forced.map((rule) => [rule.selectors, Object.fromEntries(rule.declarations.map((declaration) => [declaration.property, declaration.value]))])).toEqual([
      [[".ds-badge"], { outline: "var(--ds-border-hairline) solid CanvasText", "outline-offset": "calc(var(--ds-border-hairline) * -1)" }],
    ]);
  });
});

describe("motion (Badge.yaml motion)", () => {
  const motionProperty = (property: string): boolean => property.startsWith("transition") || property.startsWith("animation");

  it("fades new digits in over motion.count, and at instant under Reduce Motion", () => {
    expect(spec.motion).toEqual({ count: "motion.duration.quick", reduceMotion: "instant" });
    expect(spec.accessibility?.["reduceMotion"]).toContain("does not roll or count up");
    const animated = rules.filter((rule) => rule.declarations.some((declaration) => motionProperty(declaration.property)));
    expect(animated.map((rule) => rule.selectors)).toEqual([[".ds-badge-label[data-ds-replaced]"]]);
    const animation = (animated[0]?.declarations.find((declaration) => declaration.property === "animation")?.value ?? "").replace(/\s+/g, " ");
    const crossfade = "var(--ds-motion-presentation-crossfade)";
    expect(animation).toBe(
      `ds-badge-replace calc(var(${cssVariable(spec.motion?.["count"] ?? "")}) * (1 - ${crossfade}) + var(${cssVariable("motion.duration.instant")}) * ${crossfade}) var(${cssVariable("motion.easing.out")})`,
    );
    // The keyframes only fade in: nothing moves, scales or pulses (behavior 15).
    expect(css.replace(/\s+/g, " ")).toContain("@keyframes ds-badge-replace { from { opacity: 0; } }");
  });

  it("marks only a replacement: a badge's first drawing does not fade", () => {
    const out = html(<Badge count={9} label="queued runs" />);
    expect(out).toContain('data-ds-slot="badge-label"');
    expect(out).not.toContain("data-ds-replaced");
  });
});

/**
 * The vectors both stacks assert: each row's drawn digits, contribution and exposure, as the pure functions
 * compute them and as the badge renders them. `DSBadgeBindingTests.vectors` asserts the same rows on Apple:
 * the fourteen of the table below, plus a count badge under each blank label and under the counts 0, -2 and
 * none, which the two tests after the table cover here, so the two stacks draw and say the same bytes.
 */
describe("what a badge draws and says (behaviors 3 to 5, 7, 9 and 10)", () => {
  interface Vector {
    readonly case: string;
    readonly variant: BadgeVariant;
    readonly count?: number;
    readonly max?: number;
    readonly label?: string;
    readonly staging?: Staging;
    /** The digits drawn; `null` for a dot, which draws none. */
    readonly drawn: string | null;
    readonly contribution: string | undefined;
    readonly exposed: boolean;
  }

  const vectors: readonly Vector[] = [
    { case: "a count", variant: "count", count: 3, max: 99, label: "unread alerts", drawn: "3", contribution: "3 unread alerts", exposed: true },
    { case: "an overflow, named by the true count", variant: "count", count: 128, max: 99, label: "open incidents", drawn: "99+", contribution: "128 open incidents", exposed: true },
    { case: "a count at max", variant: "count", count: 99, max: 99, label: "x", drawn: "99", contribution: "99 x", exposed: true },
    { case: "a count with no label", variant: "count", count: 3, max: 99, drawn: "3", contribution: "3", exposed: false },
    { case: "a grouped count", variant: "count", count: 1234, max: 9999, label: "queued runs", drawn: "1,234", contribution: "1,234 queued runs", exposed: true },
    { case: "a grouped count in de-DE", variant: "count", count: 1234, max: 9999, label: "queued runs", staging: { locale: "de-DE" }, drawn: "1.234", contribution: "1.234 queued runs", exposed: true },
    { case: "a grouped overflow", variant: "count", count: 12345, max: 9999, label: "queued runs", drawn: "9,999+", contribution: "12,345 queued runs", exposed: true },
    { case: "the app's Badge.count", variant: "count", count: 3, max: 99, label: "unread alerts", staging: { strings: { "Badge.count": "{label}: {count}" } }, drawn: "3", contribution: "unread alerts: 3", exposed: true },
    { case: "the app's Badge.overflow", variant: "count", count: 128, max: 99, label: "x", staging: { strings: { "Badge.overflow": ">{max}" } }, drawn: ">99", contribution: "128 x", exposed: true },
    { case: "a label that looks like a placeholder", variant: "count", count: 3, max: 99, label: "{count}", drawn: "3", contribution: "3 {count}", exposed: true },
    { case: "a dot", variant: "dot", label: "unread", drawn: null, contribution: "unread", exposed: true },
    { case: "a dot, which ignores count", variant: "dot", count: 5, label: "new", drawn: null, contribution: "new", exposed: true },
    { case: "a dot with no label", variant: "dot", drawn: null, contribution: undefined, exposed: false },
    { case: "a hosted badge", variant: "count", count: 3, max: 99, label: "unread alerts", staging: { hosted: true }, drawn: "3", contribution: "3 unread alerts", exposed: false },
  ];

  it.each(vectors)("$case", (vector) => {
    const locale = vector.staging?.locale ?? "en-US";
    const strings = { ...defaultStrings, ...vector.staging?.strings };
    expect(isBadgeVisible(vector.variant, vector.count)).toBe(true);
    if (vector.drawn !== null) expect(badgeDrawn(vector.count ?? 0, vector.max, locale, strings)).toBe(vector.drawn);
    expect(badgeContribution(vector.variant, vector.count, vector.label, locale, strings)).toBe(vector.contribution);
    expect(isBadgeExposed(hasBadgeLabel(vector.label), vector.staging?.hosted === true)).toBe(vector.exposed);

    const out = html(<Badge variant={vector.variant} count={vector.count} max={vector.max} label={vector.label} />, vector.staging);
    expect(badgeTag(out), vector.case).toBeDefined();
    expect(digitsOf(out) ?? null).toBe(vector.drawn);
    if (vector.drawn === null) expect(out).not.toContain("badge-label");
    expect(nameOf(out)).toBe(vector.exposed ? (vector.contribution ?? "") : null);
  });

  it("treats every blank label as no label: the count alone, and hidden (Icon's rule)", () => {
    // DSBadgeBindingTests holds Apple's list, which is DSIconBindingTests.blankLabels: nothing, spaces, a tab
    // and a line feed, a no-break space, an ideographic space and U+FEFF.
    for (const blank of ["", "  ", "\t\n", " ", "　", "﻿"]) {
      expect(hasBadgeLabel(blank), JSON.stringify(blank)).toBe(false);
      expect(hasBadgeLabel(blank), JSON.stringify(blank)).toBe(isIconExposed(blank, false));
      expect(badgeContribution("count", 3, blank, "en-US", defaultStrings), JSON.stringify(blank)).toBe("3");
      expect(badgeContribution("dot", undefined, blank, "en-US", defaultStrings), JSON.stringify(blank)).toBeUndefined();
      const out = html(<Badge count={3} label={blank} />);
      expect(digitsOf(out), JSON.stringify(blank)).toBe("3");
      expect(nameOf(out), JSON.stringify(blank)).toBeNull();
    }
    // What trim() keeps is a label, on both stacks, and it is written as the caller wrote it.
    for (const kept of ["\u0085", "​"]) expect(hasBadgeLabel(kept), JSON.stringify(kept)).toBe(true);
    expect(nameOf(html(<Badge count={3} label=" unread " />))).toBe("3  unread ");
  });

  it("renders nothing for a count that is not a whole number of at least 1, and contributes nothing (behavior 9)", () => {
    for (const count of [0, -2, -1, undefined, Number.NaN, 2.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(isBadgeVisible("count", count), String(count)).toBe(false);
      expect(badgeContribution("count", count, "unread alerts", "en-US", defaultStrings), String(count)).toBeUndefined();
      expect(html(<Badge count={count} label="unread alerts" />), String(count)).toBe("");
    }
    // The largest count it draws, above the default max.
    expect(digitsOf(html(<Badge count={Number.MAX_SAFE_INTEGER} label="x" />))).toBe("99+");
    expect(nameOf(html(<Badge count={Number.MAX_SAFE_INTEGER} label="x" />))).toBe("9,007,199,254,740,991 x");
  });

  it("draws a dot whatever its count, with no digits and no padding", () => {
    for (const count of [undefined, 0, -1, 5, Number.NaN]) {
      const out = html(<Badge variant="dot" tone="critical" count={count} label="unread" />);
      expect(badgeTag(out), String(count)).toContain('data-ds-variant="dot"');
      expect(out, String(count)).not.toContain("badge-label");
      expect(nameOf(out), String(count)).toBe("unread");
    }
  });

  it("reads a max that is not a safe integer as 99, and compares the numbers before formatting them", () => {
    for (const max of [Number.NaN, 2.5, Number.POSITIVE_INFINITY, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      expect(badgeMax(max), String(max)).toBe(99);
      expect(digitsOf(html(<Badge count={100} max={max} label="x" />)), String(max)).toBe("99+");
      expect(digitsOf(html(<Badge count={99} max={max} label="x" />)), String(max)).toBe("99");
    }
    expect(badgeMax(9)).toBe(9);
    expect(digitsOf(html(<Badge count={10} max={9} label="x" />))).toBe("9+");
    // 1,000 > 999 as numbers, whatever the formatted strings would sort as.
    expect(badgeDrawn(1000, 999, "en-US", defaultStrings)).toBe("999+");
    expect(badgeDrawn(1000, 1000, "en-US", defaultStrings)).toBe("1,000");
  });
});

describe("Badge renders", () => {
  it("one span with its variant, tone and emphasis and no material, around its digits", () => {
    const out = html(<Badge count={12} tone="critical" label="open incidents" />);
    expect(out).toBe(
      '<span class="ds-badge" data-ds-slot="badge" data-ds-variant="count" data-ds-tone="critical" data-ds-emphasis="filled" role="img" aria-label="12 open incidents"><span class="ds-badge-label" data-ds-slot="badge-label"><span class="ds-text" data-ds-slot="text" data-ds-role="micro" data-ds-numeric="tabular">12</span></span></span>',
    );
    // On any material it writes the same root: the fills are opaque and Badge reads no surface.
    const vivid = badgeTag(html(<Surface material="vivid"><Badge count={12} tone="critical" label="open incidents" /></Surface>));
    expect(vivid).toBe(badgeTag(out));
  });

  it("draws a dot as an empty span", () => {
    expect(html(<Badge variant="dot" tone="accent" label="new" />)).toBe(
      '<span class="ds-badge" data-ds-slot="badge" data-ds-variant="dot" data-ds-tone="accent" data-ds-emphasis="filled" role="img" aria-label="new"></span>',
    );
  });

  it("keeps its own attributes over the caller's, and merges the class name", () => {
    const Loose = Badge as unknown as (props: Record<string, unknown>) => ReactNode;
    const tag = badgeTag(html(<Loose count={3} className="app-count" data-ds-variant="dot" data-ds-tone="accent" data-ds-slot="x" id="count" />)) ?? "";
    expect(tag).toContain('class="ds-badge app-count"');
    expect(tag).toContain('data-ds-variant="count"');
    expect(tag).toContain('data-ds-tone="neutral"');
    expect(tag).toContain('id="count"');
  });

  it("drops what would name, describe or focus the badge, named or not, even past the type", () => {
    const Loose = Badge as unknown as (props: Record<string, unknown>) => ReactNode;
    const withheld = {
      role: "status",
      "aria-hidden": "false",
      "aria-roledescription": "counter",
      "aria-label": "Count",
      "aria-labelledby": "heading",
      "aria-describedby": "note",
      "aria-description": "A count",
      "aria-details": "details",
      title: "Count",
      tabIndex: 0,
      contentEditable: true,
      children: "content",
      dangerouslySetInnerHTML: { __html: "<b>x</b>" },
    };
    for (const name of [undefined, "unread alerts"]) {
      const out = html(<Loose count={3} label={name} id="count" {...withheld} />);
      const tag = badgeTag(out) ?? "";
      const named = String(name);
      for (const attribute of ["tabindex", "contenteditable", "title", "aria-labelledby", "aria-describedby", "aria-description", "aria-details", "aria-roledescription"]) {
        expect(tag, `${named} ${attribute}`).not.toContain(`${attribute}=`);
      }
      expect(out, named).not.toContain("content<");
      expect(out, named).not.toContain("<b>x</b>");
      expect(tag, named).not.toContain('role="status"');
      expect(tag, named).not.toContain('aria-label="Count"');
      expect(tag, named).toContain('id="count"');
      expect(nameOf(out), named).toBe(name === undefined ? null : "3 unread alerts");
    }
  });

  it("takes no event handler, so a badge never carries a gesture (behavior 1)", () => {
    type Handlers = Extract<keyof BadgeProps, `on${string}`>;
    const noHandler: [Handlers] extends [never] ? true : false = true;
    expect(noHandler).toBe(true);
    const handler = vi.fn();
    const pressable = [
      // @ts-expect-error Badge.yaml behavior 1: a badge is never the target of a gesture
      <Badge key="click" count={3} onClick={handler} />,
      // @ts-expect-error Badge.yaml behavior 1: a badge is never the target of a gesture
      <Badge key="pointer" count={3} label="unread alerts" onPointerDown={handler} />,
    ];
    for (const node of pressable) {
      const tag = badgeTag(html(node)) ?? "";
      expect(tag).not.toMatch(/\son[a-z]+=/u);
      expect(tag).not.toContain("tabindex");
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("forwards ScopeAttributes to the root, named or not, dot or count (ADR-0019 rule 8)", () => {
    for (const node of [<Badge key="a" count={3} data-ds-color-scheme="dark" data-ds-density="regular" />, <Badge key="b" variant="dot" label="new" data-ds-color-scheme="dark" data-ds-density="regular" />]) {
      const tag = badgeTag(html(node)) ?? "";
      expect(tag).toContain('data-ds-color-scheme="dark"');
      expect(tag).toContain('data-ds-density="regular"');
    }
  });
});

/**
 * Badge.yaml `accessibility` and behavior 10: every example stands alone with a `label`, so each is one
 * image named by its contribution. The names below are the bytes both stacks hand a screen reader for each
 * example, the table `DSBadgeNameCase.all` (DSBadgeBindingTests.swift) holds on Apple:
 * `DSBadgeAccessibilityTreeTests.names` reads the same names off the simulator for the same ids, and
 * web/apps/gallery/test/accessibility.browser.test.tsx off Chromium's tree.
 */
describe("the accessibility the spec writes (Badge.yaml accessibility)", () => {
  const expected: Readonly<Record<string, { readonly name: string; readonly drawn: string | null; readonly bytes: number }>> = {
    "count-neutral": { name: "3 unread alerts", drawn: "3", bytes: 15 },
    "count-critical": { name: "12 open incidents", drawn: "12", bytes: 17 },
    "count-accent": { name: "7 items needing attention", drawn: "7", bytes: 25 },
    "count-overflow": { name: "128 open incidents", drawn: "99+", bytes: 18 },
    "outline-neutral": { name: "4 queued runs", drawn: "4", bytes: 13 },
    "outline-critical": { name: "2 open incidents", drawn: "2", bytes: 16 },
    "dot-critical": { name: "unread", drawn: null, bytes: 6 },
    "dot-accent": { name: "new", drawn: null, bytes: 3 },
    "on-vivid": { name: "3 unread alerts", drawn: "3", bytes: 15 },
    "on-glass-over-map": { name: "2 open incidents", drawn: "2", bytes: 16 },
  };

  it("covers every example of the spec", () => {
    expect(spec.examples.map((example) => example.id)).toEqual(Object.keys(expected));
  });

  it.each(spec.examples.map((example) => [example.id, example] as const))("%s: an image named by its contribution", (id, example) => {
    const out = staged(example);
    const want = expected[id];
    expect(nameOf(out)).toBe(want?.name);
    expect(Buffer.byteLength(want?.name ?? "", "utf8")).toBe(want?.bytes);
    expect(want?.name).toMatch(/^[\x20-\x7e]+$/u);
    expect(want?.name).toBe(want?.name.trim());
    expect(digitsOf(out) ?? null).toBe(want?.drawn);
    // Written by no one but the badge: no title, no labelledby, no description.
    const tag = badgeTag(out) ?? "";
    for (const attribute of ["title=", "aria-labelledby", "aria-describedby", "aria-description"]) expect(tag).not.toContain(attribute);
  });

  it("states the rule the way the spec does", () => {
    expect(spec.accessibility?.role).toMatch(/^none by itself/u);
    expect(spec.accessibility?.role).toContain("which the web exposes as an image");
    expect(spec.accessibility?.["traits"]).toEqual([]);
    expect(spec.accessibility?.label).toContain('("unread")');
    const notes = (spec as unknown as { notes: { platform: Record<string, string> } }).notes.platform;
    for (const platform of ["web-touch", "web-desktop"]) expect(notes[platform]).toMatch(/^An exposed badge \(behavior\) is `role="img"` named by `aria-label`; every other badge is `aria-hidden`/u);
  });

  it("puts only a filled badge over media (behavior 12)", () => {
    const overMedia = spec.examples.filter((example) => (example as unknown as { surface?: string }).surface !== undefined);
    expect(overMedia.map((example) => example.id)).toEqual(["on-vivid", "on-glass-over-map"]);
    for (const example of overMedia) {
      const emphasis = (example.props["emphasis"] ?? spec.props.find((prop) => prop.name === "emphasis")?.default) as BadgeEmphasis;
      expect(emphasis, example.id).toBe("filled");
      expect(badgeTag(staged(example)), example.id).toContain('data-ds-emphasis="filled"');
    }
  });

  it("stages each example's cells: the tone and emphasis it writes, whatever the material around it", () => {
    for (const example of spec.examples) {
      const tag = badgeTag(staged(example)) ?? "";
      const attribute = (name: string): string | undefined => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
      const tone = attribute("data-ds-tone") as BadgeTone;
      const emphasis = attribute("data-ds-emphasis") as BadgeEmphasis;
      const variant = attribute("data-ds-variant") as BadgeVariant;
      expect(variant, example.id).toBe(example.props["variant"]);
      expect(tone, example.id).toBe(example.props["tone"]);
      expect(cascade.value(badge(variant, tone, emphasis), "--ds--badge-fill"), example.id).toBe(bound(cell(root["background"], emphasis, tone)) ?? "transparent");
    }
  });
});
