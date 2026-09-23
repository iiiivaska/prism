/// <reference types="node" />
/**
 * The internal svg inside every glyph box, Icon's and the ones Button and Card draw through `IconPart`
 * (ADR-0013):
 *
 * - the Phosphor map covers the registry id for id, with the component the registry names;
 * - the cut comes from the brand table's `icon.weight` (ADR-0013 decision 4, ADR-0020 §6), and a glyph
 *   with no table fails instead of guessing. Icon.yaml's own steps on top of it (behavior 3's size rule,
 *   `display`, the style cuts) are held to the spec by test/icon.test.tsx.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { clearBrandTokens, Theme } from "@iiiivaska/prism-tokens/react";
import { iconRegistry, iconWeights, type IconName } from "../src/generated/icons.ts";
import { Glyph } from "../src/icon/Glyph.tsx";
import { glyphs } from "../src/icon/glyphs.ts";
import { cutForWeight, tokenValue } from "../src/icon/weight.ts";

afterEach(() => {
  clearBrandTokens();
});

describe("the glyph map", () => {
  it("covers the registry, with the Phosphor component each entry names", () => {
    expect(Object.keys(glyphs).sort()).toEqual(Object.keys(iconRegistry).sort());
    for (const [id, entry] of Object.entries(iconRegistry)) {
      expect(glyphs[id as IconName].displayName, id).toBe(entry.component);
    }
  });
});

describe("the cut", () => {
  it("is the registry weight with the token's number, else the nearest", () => {
    for (const weight of Object.values(iconWeights)) expect(cutForWeight(weight.number)).toBe(weight.phosphor);
    expect(cutForWeight(420)).toBe("regular");
    expect(cutForWeight(150)).toBe("thin");
  });

  it("reads icon.weight from the brand table", () => {
    expect(tokenValue(tokens, "icon.weight", { colorScheme: "light", contrast: "standard", transparency: "standard", density: "compact", modality: "pointer", motion: "standard" })).toBe(tokens.table["icon.weight"].$value);
    const out = renderToStaticMarkup(
      <Theme tokens={tokens}>
        <Glyph name="nav.open" size="md" weight="control" style="outline" />
      </Theme>,
    );
    const regular = renderToStaticMarkup(<Theme tokens={tokens}>{createElement(glyphs["nav.open"], { weight: cutForWeight(tokens.table["icon.weight"].$value) })}</Theme>);
    expect(out).toContain(/<path d="[^"]+"/.exec(regular)?.[0] ?? "missing");
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('focusable="false"');
    expect(out).toContain('class="ds-glyph"');
    expect(out).toContain('data-ds-slot="icon-glyph"');
    expect(out).toContain('data-ds-mirror=""');
  });

  it("fails without a brand table", () => {
    expect(() => renderToStaticMarkup(<Glyph name="nav.open" size="md" weight="control" style="outline" />)).toThrow(/No brand table/);
  });
});
