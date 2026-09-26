// What viz:validate reads and the numbers it holds the palette to (README.md, "The six checks"). The
// thresholds are the method's own (docs/research/dataviz-design.md §1 and §3 rule 32, from the dataviz skill;
// provenance in licenses/inventory.json, `dataviz-skill`); the token names are Prism's.
import { ADR_0011_THRESHOLDS } from '../contrast/thresholds.ts';
import type { Deficiency } from './color.ts';
import type { Scheme } from './relief.ts';

/** The categorical series slots, numbered 1…N; slot n is `color.chart.series.<n>`. */
export const SERIES = 'color.chart.series.*';
/** The now marker, held to checks 4 and 5 against every slot (ADR-0020 §4). */
export const NOW = 'color.chart.now';
/** The ground the marks sit on (critic G-14): check 6 measures every slot against it. */
export const PLOT = 'color.chart.plot';
/**
 * The layers the plot may sit on, each measured in turn over the page, as tokens/contrast-pairs.json's series
 * pairs measure them: validate.test.ts holds the two lists equal, so both gates see the same grounds.
 */
export const PLOT_UNDERLAYS: readonly string[] = ['color.bg.page', 'color.bg.surface', 'color.bg.surface.raised'];
/** The relief declaration, next to the resolver unless `--relief` names another path (relief.ts). */
export const RELIEF_FILE = 'viz-relief.json';

/** Check 2: the OKLCH lightness band per base scheme, bounds included. */
export const BAND: Readonly<Record<Scheme, readonly [number, number]>> = { light: [0.43, 0.77], dark: [0.48, 0.67] };
/** Check 3: the OKLCH chroma floor; below it a hue reads as gray. */
export const CHROMA_FLOOR = 0.1;
/** Check 4: the CVD ΔE target, and the floor that holds only for a pair whose slots ship direct labels. */
export const CVD_TARGET = 8;
export const CVD_FLOOR = 6;
/** Check 4 gates on these simulations; tritanopia is measured and reported, as the method does, not gated. */
export const CVD_GATED: readonly Deficiency[] = ['protan', 'deutan'];
/** Check 5: the normal-vision ΔE floor. No relief excuses it. */
export const NORMAL_FLOOR = 15;
/** Check 6: ADR-0011's boundary tier, the 3:1 of WCAG 1.4.11 for chart lines that carry meaning. */
export const CONTRAST_MIN = ADR_0011_THRESHOLDS.boundary;
/**
 * Check 1: the widest arc of the hue circle one slot's colors may span across a brand's contexts. 40° is the
 * method's own bound for one hue (its ordinal ramps: "hue spread > 40°, not a one-hue ramp").
 */
export const HUE_SPREAD_MAX = 40;
/**
 * Check 1: below this OKLCH chroma a color has no hue to anchor. 0.02 is one just-noticeable difference in
 * OKLab (the ΔEOK 0.02 of CSS Color 4's gamut mapping), so a color closer than that to the gray axis reads as gray.
 */
export const ACHROMATIC_BELOW = 0.02;

/** The owner of the seeded slots' findings: the chart-tokens ticket (roadmap P4-50, critic C-10). */
export const OWED_TO = 'P4-50';

/**
 * The findings of the first run on the seeded slots (2026-09-26, README.md "First run"), keyed as findingKey()
 * writes them: check, base scheme (`all` for check 1, which reads a brand's six contexts at once), subject and
 * the colors measured. They are P4-50's evidence (critic C-10), and viz:validate reports them as owed instead
 * of failing on them, for every brand whose slots still hold those colors. The list only shrinks:
 * validate.test.ts fails on an entry the run no longer finds, which P4-50's change removes, and on one the first
 * run did not record. P4-50 empties it, and viz:validate is then a gate on every finding.
 */
export const OWED: readonly string[] = [
  // Slot 1 is ink in light and white in dark: no hue, outside both bands, below the chroma floor. Whether slot 1
  // may be neutral is P4-50 (1).
  'hue-anchor all slot 1 #0d0e11 #ffffff',
  'band light slot 1 #0d0e11',
  'chroma light slot 1 #0d0e11',
  'band dark slot 1 #ffffff',
  'chroma dark slot 1 #ffffff',
  // Critic C-10: dark slots 2, 4, 5 and 6 above the dark band, light slot 4 and dark slot 6 below the chroma floor,
  // and the now marker the same color as dark slot 2.
  'band dark slot 2 #f39444',
  'band dark slot 4 #5bc8b5',
  'band dark slot 5 #d48bd0',
  'band dark slot 6 #d9c27a',
  'chroma light slot 4 #1f8f80',
  'chroma dark slot 6 #d9c27a',
  'cvd dark now–slot 2 #f39444 #f39444',
  'normal dark now–slot 2 #f39444 #f39444',
  // Found by the first run, beyond C-10: teal beside magenta under deuteranopia (6.5 in light, where direct labels
  // would carry it, and 5.7 in dark), and the now marker beside dark slot 6.
  'cvd light slots 4–5 #1f8f80 #a64fa3',
  'cvd dark slots 4–5 #5bc8b5 #d48bd0',
  'cvd dark now–slot 6 #f39444 #d9c27a',
  'normal dark now–slot 6 #f39444 #d9c27a',
];
