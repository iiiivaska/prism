// Tier and size rules (ADR-0011, ARCHITECTURE §10 step 7). The pairs file carries the numbers; this
// module maps a pair's tier and minimum text size to the one threshold it must reach, and refuses a
// file that lowers a threshold below ADR-0011's floor.
//
//   functional   4.5:1, or functionalLarge (3:1) when the pair's text is at least 24 px (large text)
//   decorative   3:1, and only for text of at least 24 px
//   boundary     3:1 for UI component edges and chart lines that carry meaning

export const TIERS = ['functional', 'decorative', 'boundary'] as const;
export type Tier = (typeof TIERS)[number];

export const THRESHOLD_KEYS = ['functional', 'functionalLarge', 'decorative', 'boundary'] as const;
export type ThresholdKey = (typeof THRESHOLD_KEYS)[number];
export type Thresholds = Readonly<Record<ThresholdKey, number>>;

/** ADR-0011's contrast tiers. The pairs file may raise a threshold, never lower one. */
export const ADR_0011_THRESHOLDS: Thresholds = { functional: 4.5, functionalLarge: 3, decorative: 3, boundary: 3 };

/**
 * ADR-0011's large text: at least 24 px regular. Its "or 19 px bold" alternative is not modelled, so a
 * pair that relies on bold text states 24 px.
 */
export const LARGE_TEXT_PX = 24;

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value);
}

/** The threshold a pair must reach (ARCHITECTURE §10 step 7). */
export function thresholdKey(tier: Tier, minSizePx: number | null): ThresholdKey {
  if (tier === 'functional') return minSizePx !== null && minSizePx >= LARGE_TEXT_PX ? 'functionalLarge' : 'functional';
  return tier;
}

/** Why a tier and size cannot go together, or null. */
export function sizeProblem(tier: Tier, minSizePx: number | null): string | null {
  if (tier === 'decorative' && (minSizePx === null || minSizePx < LARGE_TEXT_PX)) {
    return `the decorative tier applies only at >= ${LARGE_TEXT_PX} px; set "minSizePx" to at least ${LARGE_TEXT_PX} (ADR-0011)`;
  }
  return null;
}

/** Validates the file's `thresholds` object: the four keys, numbers, none below ADR-0011's floor. */
export function parseThresholds(raw: unknown): { readonly thresholds: Thresholds | null; readonly problems: readonly string[] } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { thresholds: null, problems: [`"thresholds" must be an object with ${THRESHOLD_KEYS.join(', ')}`] };
  }
  const record = raw as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of Object.keys(record)) {
    if (!(THRESHOLD_KEYS as readonly string[]).includes(key)) problems.push(`"thresholds.${key}" is not a threshold; known: ${THRESHOLD_KEYS.join(', ')}`);
  }
  const out: Partial<Record<ThresholdKey, number>> = {};
  for (const key of THRESHOLD_KEYS) {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      problems.push(`"thresholds.${key}" must be a number`);
      continue;
    }
    if (value < ADR_0011_THRESHOLDS[key]) {
      problems.push(`"thresholds.${key}" is ${value}, below ADR-0011's ${ADR_0011_THRESHOLDS[key]}; the file may raise a threshold, never lower it`);
    }
    out[key] = value;
  }
  if (problems.length > 0) return { thresholds: null, problems };
  return { thresholds: out as Thresholds, problems };
}
