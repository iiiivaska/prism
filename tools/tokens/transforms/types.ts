// Shared renderer types (ARCHITECTURE §7.1, §9.2). A CSS rendering of one token is a list of parts:
// the base declaration (suffix '') and its derived declarations (§8), each with the twins that
// re-declare it under a condition. The CSS model (P1-5) turns parts into declarations; it never
// calls Color.js, Motion or Style Dictionary itself.

/** Why a declaration has a twin: a P3 color, or a `linear()` easing that needs a fallback. */
export type CssTwinKind = 'p3' | 'noLinear';

export interface CssTwinCondition {
  readonly atRule: '@media' | '@supports';
  readonly condition: string;
}

/** The at-rule and condition of each twin kind (ARCHITECTURE §9.2 item 5, §7.6). */
export const CSS_TWIN_CONDITIONS: Readonly<Record<CssTwinKind, CssTwinCondition>> = {
  p3: { atRule: '@media', condition: '(color-gamut: p3)' },
  noLinear: { atRule: '@supports', condition: 'not (transition-timing-function: linear(0, 1))' },
};

export interface CssTwin {
  readonly kind: CssTwinKind;
  readonly value: string;
}

export interface CssPart {
  /** '' for the base declaration, else the derived suffix of §8 ('-font-size', '-easing', …). */
  readonly suffix: string;
  readonly value: string;
  readonly twins: readonly CssTwin[];
}

/** Options of the Apple color renderers (ADR-0020 §3). */
export interface AppleColorOptions {
  /**
   * The token is an alias with its own `app.prism.alpha`: Swift and colorsets render the target's
   * Display P3 components with the token's alpha, whatever space the target was authored in.
   */
  readonly alphaAlias?: boolean;
}

export function part(suffix: string, value: string, twins: readonly CssTwin[] = []): CssPart {
  return Object.freeze({ suffix, value, twins: Object.freeze([...twins]) });
}

/** Parts in §12 order: the base declaration first, then derived declarations by suffix in code-unit order. */
export function sortParts(parts: readonly CssPart[]): readonly CssPart[] {
  return Object.freeze(
    [...parts].sort((a, b) => (a.suffix === b.suffix ? 0 : a.suffix === '' ? -1 : b.suffix === '' ? 1 : a.suffix < b.suffix ? -1 : 1)),
  );
}

/** Memoizes a one-argument renderer by the argument's JSON (ARCHITECTURE §7.1); results are frozen. */
export function memoByJson<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<string, R>();
  return (arg: A): R => {
    const key = JSON.stringify(arg);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const out = deepFreeze(fn(arg));
    cache.set(key, out);
    return out;
  };
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}
