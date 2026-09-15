import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Gsub } from "opentype.js";
import { describe, expect, it } from "vitest";
import { coverageGlyphs, featureSubstitutions, FontParseError, readFontFile, substitute } from "./font-file.ts";
import { synthesizeFont } from "./fixtures/synthesize.ts";

const repo = join(import.meta.dirname, "..", "..");
const read = (path: string): Uint8Array => readFileSync(join(repo, path));
const onest = readFontFile(read("brands/prism/fonts/onest/Onest[wght].ttf"));
const jetbrains = readFontFile(read("brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf"));
const inter = readFontFile(read("brands/prism-native/fonts/inter/InterVariable.ttf"));
const digits = (font: ReturnType<typeof readFontFile>, tnum: boolean): (number | null)[] =>
  Array.from({ length: 10 }, (_, i) => {
    const glyph = font.glyphFor(0x30 + i) ?? 0;
    return font.advance(tnum ? substitute(font.tnum, glyph) : glyph);
  });

describe("readFontFile on the bundled fonts (ADR-0021 T1, T2, T3)", () => {
  it("reads name IDs 5 and 6", () => {
    expect([onest.version, onest.postScriptName]).toEqual(["Version 2.001", "Onest-Regular"]);
    expect([jetbrains.version, jetbrains.postScriptName]).toEqual(["Version 2.211", "JetBrainsMono-Regular"]);
    expect([inter.version, inter.postScriptName]).toEqual(["Version 4.001;git-9221beed3", "InterVariable"]);
  });

  it("reads fvar axes and named instances with their PostScript names", () => {
    expect(onest.axes).toEqual([{ tag: "wght", min: 100, default: 400, max: 900 }]);
    expect(onest.instances.map((i) => i.postScriptName)).toEqual([
      "Onest-Thin", "Onest-ExtraLight", "Onest-Light", "Onest-Regular", "Onest-Medium",
      "Onest-SemiBold", "Onest-Bold", "Onest-ExtraBold", "Onest-Black",
    ]);
    expect(jetbrains.axes).toEqual([{ tag: "wght", min: 100, default: 400, max: 800 }]);
    expect(jetbrains.instances.map((i) => [i.coordinates.wght, i.postScriptName, i.isDefault])).toEqual([
      [100, "JetBrainsMonoRoman-Thin", false],
      [200, "JetBrainsMonoRoman-ExtraLight", false],
      [300, "JetBrainsMonoRoman-Light", false],
      [400, "JetBrainsMonoRoman-Regular", true],
      [500, "JetBrainsMonoRoman-Medium", false],
      [700, "JetBrainsMonoRoman-Bold", false],
      [800, "JetBrainsMonoRoman-ExtraBold", false],
    ]);
    // Inter 4.1: opsz 14–32 and wght 100–900 (ADR-0020 §5); the named instances sit at opsz 14.
    expect(inter.axes).toEqual([
      { tag: "opsz", min: 14, default: 14, max: 32 },
      { tag: "wght", min: 100, default: 400, max: 900 },
    ]);
    expect(inter.instances.filter((i) => i.isDefault).map((i) => i.coordinates)).toEqual([{ opsz: 14, wght: 400 }]);
  });

  it("reads digit advances and applies the tnum single substitutions", () => {
    expect(digits(onest, false)).toEqual([665, 363, 566, 599, 633, 616, 623, 505, 622, 620]);
    expect(digits(onest, true)).toEqual(Array(10).fill(672));
    expect(digits(jetbrains, false)).toEqual(Array(10).fill(600));
    expect(jetbrains.tnum.lookups).toEqual([]);
    expect(new Set(digits(inter, false)).size).toBeGreaterThan(1);
    expect(digits(inter, true)).toEqual(Array(10).fill(1328));
  });

  it("maps the Russian alphabet including Ё and ё", () => {
    for (const font of [onest, jetbrains, inter]) {
      expect(font.glyphFor(0x401)).not.toBeNull();
      expect(font.glyphFor(0x451)).not.toBeNull();
      expect(font.glyphFor(0x42f)).not.toBeNull();
    }
    expect(onest.glyphFor(0xe000)).toBeNull();
    expect(onest.advance(-1)).toBeNull();
    expect(onest.advance(1_000_000)).toBeNull();
  });
});

describe("readFontFile on synthesized fonts", () => {
  it("reads a static CFF font without fvar", () => {
    const font = readFontFile(synthesizeFont({ version: "Version 3.100", digitAdvances: [500, 510, 520, 530, 540, 550, 560, 570, 580, 590], tnumAdvance: 640 }));
    expect(font.version).toBe("Version 3.100");
    expect(font.postScriptName).toBe("SynthRegular");
    expect(font.axes).toEqual([]);
    expect(font.instances).toEqual([]);
    expect(font.weightClass).toBe(400);
    expect(font.glyphFor(0x410)).toBeNull();
    expect(digits(font, false)).toEqual([500, 510, 520, 530, 540, 550, 560, 570, 580, 590]);
    expect(digits(font, true)).toEqual(Array(10).fill(640));
  });

  it("throws FontParseError on bytes that are not a font", () => {
    expect(() => readFontFile(new TextEncoder().encode("not a font at all"))).toThrow(FontParseError);
  });
});

describe("featureSubstitutions", () => {
  const gsub: Gsub = {
    features: [
      { tag: "tnum", feature: { lookupListIndexes: [3] } },
      { tag: "pnum", feature: { lookupListIndexes: [0] } },
      // A second tnum record (another script) adds lookup 1; lookups apply in LookupList order.
      { tag: "tnum", feature: { lookupListIndexes: [1, 2] } },
    ],
    lookups: [
      { lookupType: 1, lookupFlag: 0, subtables: [{ substFormat: 1, coverage: { format: 1, glyphs: [10] }, deltaGlyphId: 500 }] },
      // Type 7 extension lookup wrapping a type 1 format 1 subtable (ADR-0021 §11 check 5).
      {
        lookupType: 7,
        lookupFlag: 0,
        subtables: [{ substFormat: 1, lookupType: 1, extension: { substFormat: 1, coverage: { format: 1, glyphs: [10, 11] }, deltaGlyphId: 10 } }],
      },
      // A contextual lookup is not applied, and is reported.
      { lookupType: 6, lookupFlag: 0, subtables: [{}] },
      // Type 1 format 2 with a range coverage; glyph 20 is the result of lookup 1.
      {
        lookupType: 1,
        lookupFlag: 0,
        subtables: [
          { substFormat: 2, coverage: { format: 2, ranges: [{ start: 20, end: 21, index: 0 }] }, substitute: [30, 31] },
          { substFormat: 2, coverage: { format: 1, glyphs: [20] }, substitute: [99] },
        ],
      },
    ],
  };

  it("collects type 1 and type 7-wrapped type 1 lookups of every record of the feature, in LookupList order", () => {
    const tnum = featureSubstitutions(gsub, "tnum");
    expect(tnum.lookups.map((lookup) => [...lookup])).toEqual([
      [[10, 20], [11, 21]],
      [[20, 30], [21, 31]],
    ]);
    expect(tnum.ignoredLookupTypes).toEqual([6]);
    // 10 → 20 (extension lookup 1) → 30 (lookup 3; its first subtable wins over the second).
    expect(substitute(tnum, 10)).toBe(30);
    expect(substitute(tnum, 12)).toBe(12);
  });

  it("returns nothing for an absent GSUB or feature", () => {
    expect(featureSubstitutions(undefined, "tnum")).toEqual({ lookups: [], ignoredLookupTypes: [] });
    expect(featureSubstitutions(gsub, "zero")).toEqual({ lookups: [], ignoredLookupTypes: [] });
  });

  it("wraps glyph + delta at 16 bits and skips extension subtables of other types", () => {
    const wrapped = featureSubstitutions(
      {
        features: [{ tag: "tnum", feature: { lookupListIndexes: [0] } }],
        lookups: [
          {
            lookupType: 7,
            lookupFlag: 0,
            subtables: [
              { substFormat: 1, lookupType: 4, extension: {} },
              { substFormat: 1, lookupType: 1, extension: { substFormat: 1, coverage: { format: 1, glyphs: [65535] }, deltaGlyphId: 2 } },
            ],
          },
        ],
      },
      "tnum",
    );
    expect([...(wrapped.lookups[0] ?? [])]).toEqual([[65535, 1]]);
    expect(wrapped.ignoredLookupTypes).toEqual([4]);
  });

  it("expands coverage tables in coverage-index order", () => {
    expect(coverageGlyphs({ format: 1, glyphs: [4, 9] })).toEqual([4, 9]);
    expect(coverageGlyphs({ format: 2, ranges: [{ start: 40, end: 41, index: 2 }, { start: 7, end: 8, index: 0 }] })).toEqual([7, 8, 40, 41]);
  });
});
