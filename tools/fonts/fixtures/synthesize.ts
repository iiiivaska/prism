// Synthesizes tiny OpenType fonts in memory for the fonts:check tests (ARCHITECTURE §3.3): a
// Latin-only font, a font with proportional digits and no `tnum`, and variants of them. Nothing
// here is committed as a binary, so no fixture needs a license inventory entry. opentype.js writes
// CFF outlines; the check reads cmap, hmtx, name and GSUB the same way for either outline format.
// The `head` modified date is the current time, so tests hash the bytes they synthesize.

import opentype from "opentype.js";

export interface SynthesizeOptions {
  readonly family?: string;
  /** Name ID 5, written as given. */
  readonly version?: string;
  /** Adds U+0401, U+0410–U+044F and U+0451. */
  readonly cyrillic?: boolean;
  /** More mapped code points, e.g. U+0410–U+044F without Ё and ё. */
  readonly extraCodePoints?: readonly number[];
  /** Advances of U+0030–U+0039; all 600 by default. */
  readonly digitAdvances?: readonly number[];
  /** Digits (0–9) left out of the cmap. */
  readonly omitDigits?: readonly number[];
  /** Adds tabular digit glyphs of this advance and a GSUB `tnum` single substitution (lookup type 1) to them. */
  readonly tnumAdvance?: number;
  /** The digits (0–9) the `tnum` substitution covers; all ten by default. */
  readonly tnumDigits?: readonly number[];
  /** OS/2 usWeightClass; 400 by default. */
  readonly weightClass?: number;
}

const { Font, Glyph, Path } = opentype;

const RUSSIAN = [0x401, ...Array.from({ length: 64 }, (_, i) => 0x410 + i), 0x451];
const ALL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A box outline, so every glyph has ink. */
function box(width: number): InstanceType<typeof Path> {
  const path = new Path();
  path.moveTo(50, 0);
  path.lineTo(Math.max(60, width - 50), 0);
  path.lineTo(Math.max(60, width - 50), 700);
  path.lineTo(50, 700);
  path.close();
  return path;
}

export function synthesizeFont(options: SynthesizeOptions = {}): Uint8Array {
  const digitAdvances = options.digitAdvances ?? ALL_DIGITS.map(() => 600);
  if (digitAdvances.length !== 10) throw new Error("digitAdvances needs ten values");
  const glyphs = [new Glyph({ name: ".notdef", advanceWidth: 500, path: new Path() })];
  const add = (name: string, advanceWidth: number, unicode?: number): number => {
    glyphs.push(new Glyph({ name, advanceWidth, path: box(advanceWidth), ...(unicode === undefined ? {} : { unicode }) }));
    return glyphs.length - 1;
  };
  add("space", 250, 0x20);
  const digits = new Map<number, number>();
  for (const digit of ALL_DIGITS) {
    if (options.omitDigits?.includes(digit) === true) continue;
    digits.set(digit, add(`digit${digit}`, digitAdvances[digit] ?? 600, 0x30 + digit));
  }
  for (let cp = 0x41; cp <= 0x5a; cp++) add(String.fromCharCode(cp), 620, cp);
  for (let cp = 0x61; cp <= 0x7a; cp++) add(String.fromCharCode(cp), 540, cp);
  const extra = [...(options.cyrillic === true ? RUSSIAN : []), ...(options.extraCodePoints ?? [])];
  for (const cp of new Set(extra)) add(`uni${cp.toString(16).toUpperCase().padStart(4, "0")}`, 600, cp);
  const substitutions: { sub: number; by: number }[] = [];
  if (options.tnumAdvance !== undefined) {
    for (const digit of options.tnumDigits ?? ALL_DIGITS) {
      const sub = digits.get(digit);
      if (sub !== undefined) substitutions.push({ sub, by: add(`digit${digit}.tf`, options.tnumAdvance) });
    }
  }
  const font = new Font({
    familyName: options.family ?? "Synth",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs,
    version: options.version ?? "Version 1.000",
    weightClass: options.weightClass ?? 400,
  });
  for (const substitution of substitutions) font.substitution.addSingle("tnum", substitution);
  return new Uint8Array(font.toArrayBuffer());
}
