// Thin adapter over the font parser (opentype.js 2.0, ARCHITECTURE §3.3 and V6): the facts
// `fonts:check` needs from one font file, as plain data. Nothing here decides pass or fail; check.ts
// does. Widths are the `hmtx` advances, which describe the default instance of a variable font.

import type { Coverage, ExtensionSubst, Font, Gsub, Names, SingleSubstFormat1, SingleSubstFormat2 } from "opentype.js";
import opentype from "opentype.js";

export interface FontAxis {
  readonly tag: string;
  readonly min: number;
  readonly default: number;
  readonly max: number;
}

export interface FontInstance {
  readonly coordinates: Readonly<Record<string, number>>;
  /** The instance's `postScriptNameID` string; null when it has none. */
  readonly postScriptName: string | null;
  /** Every axis at its default: Core Text exposes this instance under name ID 6 (ADR-0021 T3). */
  readonly isDefault: boolean;
}

/** The single-substitution lookups of one GSUB feature, in LookupList order (the order they apply in). */
export interface FeatureSubstitutions {
  /** One map per lookup of type 1, or type 7 wrapping type 1: glyph → substitute. */
  readonly lookups: readonly ReadonlyMap<number, number>[];
  /** Lookup types of the feature's other lookups, which the check does not apply. */
  readonly ignoredLookupTypes: readonly number[];
}

export interface FontFile {
  /** Name ID 5, e.g. "Version 2.001". */
  readonly version: string | null;
  /** Name ID 6. */
  readonly postScriptName: string | null;
  /** `fvar` axes; empty for a static font. */
  readonly axes: readonly FontAxis[];
  /** `fvar` named instances; empty for a static font. */
  readonly instances: readonly FontInstance[];
  /** OS/2 `usWeightClass`; null without an OS/2 table. */
  readonly weightClass: number | null;
  /** The GSUB `tnum` single substitutions. */
  readonly tnum: FeatureSubstitutions;
  /** The cmap glyph of a code point; null when the cmap does not map it. */
  glyphFor(codePoint: number): number | null;
  /** The `hmtx` advance width of a glyph, in font units; null for an unknown glyph. */
  advance(glyph: number): number | null;
}

export class FontParseError extends Error {
  override readonly name = "FontParseError";
}

/** Parses a TrueType or CFF OpenType file. Throws FontParseError when the parser rejects it. */
export function readFontFile(bytes: Uint8Array): FontFile {
  let font: Font;
  try {
    // An exact-size ArrayBuffer copy: a Node Buffer is a view into a larger shared pool.
    font = opentype.parse(new Uint8Array(bytes).buffer, { lowMemory: false });
  } catch (error) {
    throw new FontParseError(error instanceof Error ? error.message : String(error), { cause: error });
  }
  const { tables } = font;
  const axes: FontAxis[] = (tables.fvar?.axes ?? []).map((axis) => ({
    tag: axis.tag,
    min: axis.minValue,
    default: axis.defaultValue,
    max: axis.maxValue,
  }));
  const instances: FontInstance[] = (tables.fvar?.instances ?? []).map((instance) => ({
    coordinates: { ...instance.coordinates },
    postScriptName: instance.postScriptNameID === undefined ? null : localized(instance.postScriptName || undefined),
    isDefault: axes.every((axis) => instance.coordinates[axis.tag] === axis.default),
  }));
  const glyphIndexMap = tables.cmap?.glyphIndexMap ?? {};
  return {
    version: nameString(font.names, "version"),
    postScriptName: nameString(font.names, "postScriptName"),
    axes,
    instances,
    weightClass: tables.os2?.usWeightClass ?? null,
    tnum: featureSubstitutions(tables.gsub, "tnum"),
    glyphFor(codePoint) {
      const glyph = glyphIndexMap[codePoint];
      return glyph === undefined || glyph === 0 ? null : glyph;
    },
    advance(glyph) {
      if (!Number.isInteger(glyph) || glyph < 0 || glyph >= font.glyphs.length) return null;
      return font.glyphs.get(glyph)?.advanceWidth ?? null;
    },
  };
}

/**
 * The single substitutions of every `tag` feature record (all scripts and languages), per lookup in
 * LookupList order. Lookup type 1 counts, and so do type 1 subtables wrapped in a type 7 extension
 * lookup (ADR-0021 §11 check 5). Within a lookup the first subtable that covers a glyph wins.
 */
export function featureSubstitutions(gsub: Gsub | undefined, tag: string): FeatureSubstitutions {
  if (gsub === undefined) return { lookups: [], ignoredLookupTypes: [] };
  const indexes = new Set<number>();
  for (const record of gsub.features) {
    if (record.tag !== tag) continue;
    for (const index of record.feature.lookupListIndexes) indexes.add(index);
  }
  const lookups: Map<number, number>[] = [];
  const ignored = new Set<number>();
  for (const index of [...indexes].sort((a, b) => a - b)) {
    const lookup = gsub.lookups[index];
    if (lookup === undefined) continue;
    const singles: (SingleSubstFormat1 | SingleSubstFormat2)[] = [];
    for (const subtable of lookup.subtables) {
      // A type 7 lookup wraps every subtable in an extension record naming the real lookup type.
      const type = lookup.lookupType === 7 ? (subtable as ExtensionSubst).lookupType : lookup.lookupType;
      const body = lookup.lookupType === 7 ? (subtable as ExtensionSubst).extension : subtable;
      if (type === 1) singles.push(body as SingleSubstFormat1 | SingleSubstFormat2);
      else ignored.add(type);
    }
    if (singles.length === 0) continue;
    const map = new Map<number, number>();
    for (const subtable of singles) addSingleSubstitutions(map, subtable);
    lookups.push(map);
  }
  return { lookups, ignoredLookupTypes: [...ignored].sort((a, b) => a - b) };
}

/** Applies the lookups in order: each one replaces the glyph when it covers it. */
export function substitute(substitutions: FeatureSubstitutions, glyph: number): number {
  let current = glyph;
  for (const lookup of substitutions.lookups) current = lookup.get(current) ?? current;
  return current;
}

function addSingleSubstitutions(map: Map<number, number>, subtable: SingleSubstFormat1 | SingleSubstFormat2): void {
  coverageGlyphs(subtable.coverage).forEach((glyph, coverageIndex) => {
    if (map.has(glyph)) return;
    if (subtable.substFormat === 1) {
      map.set(glyph, (glyph + subtable.deltaGlyphId) & 0xffff);
    } else {
      const replacement = subtable.substitute[coverageIndex];
      if (replacement !== undefined) map.set(glyph, replacement);
    }
  });
}

/** Coverage glyphs in coverage-index order. */
export function coverageGlyphs(coverage: Coverage): number[] {
  if (coverage.format === 1) return [...coverage.glyphs];
  const glyphs: number[] = [];
  for (const range of coverage.ranges) {
    for (let glyph = range.start; glyph <= range.end; glyph++) glyphs[range.index + glyph - range.start] = glyph;
  }
  return glyphs;
}

/** Windows records first (the platform Core Text and browsers read), then Macintosh, then Unicode. */
function nameString(names: Names, key: string): string | null {
  for (const platform of [names.windows, names.macintosh, names.unicode]) {
    const value = localized(platform?.[key]);
    if (value !== null) return value;
  }
  return null;
}

/** English when present, else the first language. */
function localized(record: Readonly<Record<string, string>> | undefined): string | null {
  if (record === undefined) return null;
  return record.en ?? Object.values(record)[0] ?? null;
}
