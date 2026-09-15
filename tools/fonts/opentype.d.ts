// Types for the part of opentype.js 2.0 that tools/fonts uses. 2.0 ships no type declarations, and
// @types/opentype.js describes the 1.3 API (for example `names.version`, which 2.0 moved under
// `names.<platform>`), so this file declares only what font-file.ts reads and
// fixtures/synthesize.ts writes (ARCHITECTURE §3.3, V6). Shapes follow dist/opentype.mjs 2.0.0.
declare module "opentype.js" {
  /** One platform's name records: key (`version` for name ID 5, `postScriptName` for 6, or a numeric id of 256 and up) → language → string. */
  export type NameRecords = Readonly<Record<string, Readonly<Record<string, string>> | undefined>>;

  export interface Names {
    readonly windows?: NameRecords;
    readonly macintosh?: NameRecords;
    readonly unicode?: NameRecords;
  }

  export interface CoverageFormat1 {
    readonly format: 1;
    readonly glyphs: readonly number[];
  }
  export interface CoverageRange {
    readonly start: number;
    readonly end: number;
    /** Coverage index of `start`. */
    readonly index: number;
  }
  export interface CoverageFormat2 {
    readonly format: 2;
    readonly ranges: readonly CoverageRange[];
  }
  export type Coverage = CoverageFormat1 | CoverageFormat2;

  /** GSUB lookup type 1, format 1: glyph + delta. */
  export interface SingleSubstFormat1 {
    readonly substFormat: 1;
    readonly coverage: Coverage;
    readonly deltaGlyphId: number;
  }
  /** GSUB lookup type 1, format 2: glyph → substitute[coverage index]. */
  export interface SingleSubstFormat2 {
    readonly substFormat: 2;
    readonly coverage: Coverage;
    readonly substitute: readonly number[];
  }
  /** GSUB lookup type 7: opentype.js parses the wrapped subtable into `extension`. */
  export interface ExtensionSubst {
    readonly substFormat: 1;
    readonly lookupType: number;
    readonly extension: unknown;
  }

  export interface Lookup {
    readonly lookupType: number;
    readonly lookupFlag: number;
    readonly subtables: readonly unknown[];
  }
  export interface FeatureRecord {
    readonly tag: string;
    readonly feature: { readonly lookupListIndexes: readonly number[] };
  }
  export interface Gsub {
    readonly features: readonly FeatureRecord[];
    readonly lookups: readonly Lookup[];
  }

  export interface FvarAxis {
    readonly tag: string;
    readonly minValue: number;
    readonly defaultValue: number;
    readonly maxValue: number;
  }
  export interface FvarInstance {
    readonly coordinates: Readonly<Record<string, number>>;
    /** Absent when the table has no PostScript name field or the id is 0xFFFF. */
    readonly postScriptNameID?: number;
    /** Language → string; `""` or absent when the instance has no PostScript name. */
    readonly postScriptName?: Readonly<Record<string, string>> | "";
  }
  export interface Fvar {
    readonly axes: readonly FvarAxis[];
    readonly instances: readonly FvarInstance[];
  }

  export interface Tables {
    readonly cmap?: { readonly glyphIndexMap: Readonly<Record<number, number>> };
    readonly gsub?: Gsub;
    readonly fvar?: Fvar;
    readonly os2?: { readonly usWeightClass: number };
    readonly [tag: string]: unknown;
  }

  export class Path {
    constructor();
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    close(): void;
  }

  export interface GlyphOptions {
    readonly name: string;
    readonly unicode?: number;
    readonly advanceWidth: number;
    readonly path: Path;
  }
  export class Glyph {
    constructor(options: GlyphOptions);
    readonly index: number;
    readonly advanceWidth?: number;
  }

  export interface FontOptions {
    readonly familyName: string;
    readonly styleName: string;
    readonly unitsPerEm: number;
    readonly ascender: number;
    readonly descender: number;
    readonly glyphs: readonly Glyph[];
    /** Name ID 5, written as given. */
    readonly version?: string;
    readonly postScriptName?: string;
    readonly weightClass?: number;
  }
  export class Font {
    constructor(options: FontOptions);
    readonly names: Names;
    readonly tables: Tables;
    readonly glyphs: { readonly length: number; get(index: number): Glyph | undefined };
    readonly substitution: {
      addSingle(feature: string, substitution: { readonly sub: number; readonly by: number }, script?: string, language?: string): void;
    };
    toArrayBuffer(): ArrayBuffer;
  }

  const opentype: {
    parse(buffer: ArrayBuffer | Uint8Array, options?: { readonly lowMemory?: boolean }): Font;
    readonly Font: typeof Font;
    readonly Glyph: typeof Glyph;
    readonly Path: typeof Path;
  };
  export default opentype;
}
