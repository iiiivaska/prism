// The six checks of docs/research/dataviz-design.md §1 (README.md, "The six checks") over resolved palettes.
// Pure functions: validate.ts reads the palettes from the token bundle, and the tests build them from hex.
//
//   1 hue-anchor  every slot keeps one hue across a brand's colorScheme contexts
//   2 band        OKLCH lightness inside the base scheme's band
//   3 chroma      OKLCH chroma at least 0.10
//   4 cvd         adjacent slots, and the now marker against every slot, apart under protanopia and deuteranopia
//   5 normal      the same pairs apart under normal vision
//   6 contrast    every slot at least 3:1 against the plot, or a declared relief
import type { Triple } from '../tokens/api.ts';
import { deltaE, hueSpread, oklch, type Deficiency, type Lch } from './color.ts';
import {
  ACHROMATIC_BELOW, BAND, CHROMA_FLOOR, CONTRAST_MIN, CVD_FLOOR, CVD_GATED, CVD_TARGET, HUE_SPREAD_MAX, NORMAL_FLOOR,
} from './config.ts';
import type { Relief, Scheme } from './relief.ts';

export const CHECKS = ['hue-anchor', 'band', 'chroma', 'cvd', 'normal', 'contrast'] as const;
export type CheckId = (typeof CHECKS)[number];

/** A measured value passes, passes on a declared relief, or fails. */
export type Verdict = 'pass' | 'relieved' | 'fail';

/** contrast:check's tolerance, so that both gates give one verdict for one ratio. */
const EPSILON = 1e-9;

export interface Swatch {
  readonly hex: string;
  /** Gamma-encoded sRGB, CSS-gamut-mapped. */
  readonly srgb: Triple;
}

/** A slot's contrast against the plot: the worst of its grounds. */
export interface Ground {
  readonly ratio: number;
  /** Which ground, and the two composited colors: `on color.bg.surface: #6b84e0 on #26282d`. */
  readonly where: string;
}

/** One brand × colorScheme context's palette, as the checks read it. */
export interface Palette {
  readonly brand: string;
  /** The resolver's colorScheme context: `dark-increased-contrast`. */
  readonly colorScheme: string;
  /** Its base scheme, which picks the band. */
  readonly scheme: Scheme;
  /** Slot n at index n - 1. */
  readonly slots: readonly Swatch[];
  /** The now marker; null where the tree has none (a bare palette). */
  readonly now: Swatch | null;
  /** Slot n's contrast against the plot, at index n - 1. */
  readonly grounds: readonly Ground[];
  /** The reliefs declared for slot n in this brand and scheme, at index n - 1. */
  readonly reliefs: readonly (readonly Relief[])[];
}

export interface SlotMeasure {
  readonly slot: number;
  readonly hex: string;
  readonly lch: Lch;
  readonly band: Verdict;
  readonly chroma: Verdict;
  readonly ground: Ground;
  readonly contrast: Verdict;
  readonly reliefs: readonly Relief[];
}

export interface PairMeasure {
  /** `slots 4–5`, or `now–slot 2`. */
  readonly subject: string;
  /** The pair's slots; one for a now pair. */
  readonly slots: readonly number[];
  readonly colors: readonly [string, string];
  readonly normal: number;
  readonly normalVerdict: Verdict;
  /** The smaller ΔE of the gated simulations, and which one. */
  readonly cvd: number;
  readonly cvdKind: Deficiency;
  readonly cvdVerdict: Verdict;
  /** Reported only. */
  readonly tritan: number;
}

export interface PaletteMeasure {
  readonly palette: Palette;
  readonly slots: readonly SlotMeasure[];
  /** Slots n and n + 1, for n = 1…N - 1. */
  readonly adjacent: readonly PairMeasure[];
  /** The now marker against slot n, for n = 1…N; empty without a now marker. */
  readonly now: readonly PairMeasure[];
}

export interface AnchorMeasure {
  readonly brand: string;
  readonly slot: number;
  /** One entry per context of the brand: its color and OKLCH hue (null: achromatic). */
  readonly hues: readonly { readonly colorScheme: string; readonly hex: string; readonly h: number | null; readonly c: number }[];
  /** null when some context has no hue. */
  readonly spread: number | null;
  readonly verdict: Verdict;
}

export interface Finding {
  readonly check: CheckId;
  readonly brand: string;
  /** The colorScheme contexts it was found in: one for checks 2 to 6, the brand's contexts for check 1. */
  readonly contexts: readonly string[];
  /** The base scheme; null for check 1, which reads every scheme at once. */
  readonly scheme: Scheme | null;
  readonly subject: string;
  /** The colors measured, in subject order. */
  readonly colors: readonly string[];
  readonly measured: string;
  readonly limit: string;
}

/** A finding's identity across brands and contexts: the same check failing on the same colors. */
export function findingKey(f: Pick<Finding, 'check' | 'scheme' | 'subject' | 'colors'>): string {
  return [f.check, f.scheme ?? 'all', f.subject, ...f.colors].join(' ');
}

/** Floors a value to `digits` decimals, so that a displayed "at least" value never overstates a pass. */
export function floorTo(value: number, digits: number): string {
  const f = 10 ** digits;
  return (Math.floor((value + EPSILON) * f) / f).toFixed(digits);
}

/** Ceils a value to `digits` decimals, so that a displayed "at most" value never understates a failure. */
export function ceilTo(value: number, digits: number): string {
  const f = 10 ** digits;
  return (Math.ceil((value - EPSILON) * f) / f).toFixed(digits);
}

export const LIMITS: Readonly<Record<CheckId, (scheme: Scheme | null) => string>> = {
  'hue-anchor': () => `one hue, spread ≤ ${HUE_SPREAD_MAX}°, C ≥ ${ACHROMATIC_BELOW} in every context`,
  band: (scheme) => (scheme === null ? '' : `L ${BAND[scheme][0]}–${BAND[scheme][1]}`),
  chroma: () => `C ≥ ${CHROMA_FLOOR.toFixed(2)}`,
  cvd: () => `ΔE ≥ ${CVD_TARGET}, or ≥ ${CVD_FLOOR} with direct labels`,
  normal: () => `ΔE ≥ ${NORMAL_FLOOR}`,
  contrast: () => `≥ ${CONTRAST_MIN}:1, or a declared relief`,
};

function measureSlot(p: Palette, index: number): SlotMeasure {
  const swatch = p.slots[index];
  const ground = p.grounds[index];
  if (swatch === undefined || ground === undefined) throw new Error(`${p.brand} ${p.colorScheme}: slot ${index + 1} has no color or no ground`);
  const lch = oklch(swatch.srgb, ACHROMATIC_BELOW);
  const [lo, hi] = BAND[p.scheme];
  const reliefs = p.reliefs[index] ?? [];
  return {
    slot: index + 1,
    hex: swatch.hex,
    lch,
    band: lch.l >= lo && lch.l <= hi ? 'pass' : 'fail',
    chroma: lch.c + EPSILON >= CHROMA_FLOOR ? 'pass' : 'fail',
    ground,
    contrast: ground.ratio + EPSILON >= CONTRAST_MIN ? 'pass' : reliefs.length > 0 ? 'relieved' : 'fail',
    reliefs,
  };
}

/** Checks 4 and 5 for one pair; `labelled` says whether every slot of the pair ships direct labels. */
function measurePair(subject: string, slots: readonly number[], a: Swatch, b: Swatch, labelled: boolean): PairMeasure {
  const normal = deltaE(a.srgb, b.srgb);
  let cvd = Infinity;
  let cvdKind: Deficiency = CVD_GATED[0] ?? 'deutan';
  for (const kind of CVD_GATED) {
    const d = deltaE(a.srgb, b.srgb, kind);
    if (d < cvd) {
      cvd = d;
      cvdKind = kind;
    }
  }
  return {
    subject,
    slots,
    colors: [a.hex, b.hex],
    normal,
    normalVerdict: normal + EPSILON >= NORMAL_FLOOR ? 'pass' : 'fail',
    cvd,
    cvdKind,
    cvdVerdict: cvd + EPSILON >= CVD_TARGET ? 'pass' : cvd + EPSILON >= CVD_FLOOR && labelled ? 'relieved' : 'fail',
    tritan: deltaE(a.srgb, b.srgb, 'tritan'),
  };
}

/** Checks 2 to 6 on one palette. */
export function measurePalette(p: Palette): PaletteMeasure {
  const slots = p.slots.map((_, i) => measureSlot(p, i));
  const labelled = (n: number): boolean => (p.reliefs[n - 1] ?? []).includes('direct-labels');
  const adjacent: PairMeasure[] = [];
  for (let n = 1; n < p.slots.length; n++) {
    const a = p.slots[n - 1];
    const b = p.slots[n];
    if (a !== undefined && b !== undefined) adjacent.push(measurePair(`slots ${n}–${n + 1}`, [n, n + 1], a, b, labelled(n) && labelled(n + 1)));
  }
  // The now marker always carries its label or value (its token's description; visual-dna B3), so a now pair
  // in the floor band needs the slot's direct labels alone.
  const now: PairMeasure[] = [];
  if (p.now !== null) {
    for (let n = 1; n <= p.slots.length; n++) {
      const s = p.slots[n - 1];
      if (s !== undefined) now.push(measurePair(`now–slot ${n}`, [n], p.now, s, labelled(n)));
    }
  }
  return { palette: p, slots, adjacent, now };
}

/** Check 1 over one brand's palettes (its colorScheme contexts), slot by slot. */
export function measureAnchors(brand: string, palettes: readonly Palette[]): AnchorMeasure[] {
  const count = Math.max(0, ...palettes.map((p) => p.slots.length));
  const out: AnchorMeasure[] = [];
  for (let n = 1; n <= count; n++) {
    const hues = palettes.flatMap((p) => {
      const s = p.slots[n - 1];
      if (s === undefined) return [];
      const { c, h } = oklch(s.srgb, ACHROMATIC_BELOW);
      return [{ colorScheme: p.colorScheme, hex: s.hex, h, c }];
    });
    const defined = hues.map((x) => x.h).filter((h): h is number => h !== null);
    const spread = defined.length === hues.length ? hueSpread(defined) : null;
    out.push({ brand, slot: n, hues, spread, verdict: spread !== null && spread <= HUE_SPREAD_MAX + EPSILON ? 'pass' : 'fail' });
  }
  return out;
}

function distinctHexes(hexes: readonly string[]): string[] {
  return [...new Set(hexes)];
}

/** The findings of one palette's measure: every check 2 to 6 that failed. */
export function paletteFindings(m: PaletteMeasure): Finding[] {
  const p = m.palette;
  const base = { brand: p.brand, contexts: [p.colorScheme], scheme: p.scheme };
  const out: Finding[] = [];
  for (const s of m.slots) {
    const subject = `slot ${s.slot}`;
    if (s.band === 'fail') out.push({ ...base, check: 'band', subject, colors: [s.hex], measured: `L ${s.lch.l.toFixed(3)}`, limit: LIMITS.band(p.scheme) });
    if (s.chroma === 'fail') out.push({ ...base, check: 'chroma', subject, colors: [s.hex], measured: `C ${floorTo(s.lch.c, 3)}`, limit: LIMITS.chroma(p.scheme) });
    if (s.contrast === 'fail') out.push({ ...base, check: 'contrast', subject, colors: [s.hex], measured: `${floorTo(s.ground.ratio, 2)}:1 (${s.ground.where})`, limit: LIMITS.contrast(p.scheme) });
  }
  for (const pair of [...m.adjacent, ...m.now]) {
    if (pair.cvdVerdict === 'fail') out.push({ ...base, check: 'cvd', subject: pair.subject, colors: pair.colors, measured: `ΔE ${floorTo(pair.cvd, 1)} (${pair.cvdKind})`, limit: LIMITS.cvd(p.scheme) });
    if (pair.normalVerdict === 'fail') out.push({ ...base, check: 'normal', subject: pair.subject, colors: pair.colors, measured: `ΔE ${floorTo(pair.normal, 1)}`, limit: LIMITS.normal(p.scheme) });
  }
  return out;
}

/** The findings of check 1. */
export function anchorFindings(measures: readonly AnchorMeasure[]): Finding[] {
  return measures
    .filter((a) => a.verdict === 'fail')
    .map((a) => {
      const flat = a.hues.filter((x) => x.h === null).map((x) => x.colorScheme);
      const where = flat.length === a.hues.length ? 'any context' : flat.join(', ');
      return {
        check: 'hue-anchor' as const,
        brand: a.brand,
        contexts: a.hues.map((x) => x.colorScheme),
        scheme: null,
        subject: `slot ${a.slot}`,
        colors: distinctHexes(a.hues.map((x) => x.hex)),
        measured: a.spread === null ? `no hue in ${where} (C < ${ACHROMATIC_BELOW})` : `spread ${ceilTo(a.spread, 1)}°`,
        limit: LIMITS['hue-anchor'](null),
      };
    });
}
