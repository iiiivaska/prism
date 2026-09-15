// Canonical order (ARCHITECTURE §12 rule 1): ids compare segment by segment, `$root` first, numeric
// segments numerically (`space.2 < space.10`), others by UTF-16 code unit (never localeCompare);
// the tiers order `ref < sys < comp`. Contexts keep declaration order.

const TIER_RANK: Readonly<Record<string, number>> = { ref: 0, sys: 1, comp: 2 };
const NUMERIC = /^(0|[1-9][0-9]*)$/;

function segmentRank(segment: string): number {
  if (segment === '$root') return 0;
  if (NUMERIC.test(segment)) return 1;
  return 2;
}

export function compareSegments(a: string, b: string): number {
  if (a === b) return 0;
  const ra = segmentRank(a);
  const rb = segmentRank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 1) return Number(a) - Number(b);
  return a < b ? -1 : 1;
}

export function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  const sa = a.split('.');
  const sb = b.split('.');
  const ta = TIER_RANK[sa[0] ?? ''] ?? 3;
  const tb = TIER_RANK[sb[0] ?? ''] ?? 3;
  if (ta !== tb) return ta - tb;
  const n = Math.min(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const c = compareSegments(sa[i] ?? '', sb[i] ?? '');
    if (c !== 0) return c;
  }
  return sa.length - sb.length;
}

export function sortIds(ids: Iterable<string>): string[] {
  return [...ids].sort(compareIds);
}
