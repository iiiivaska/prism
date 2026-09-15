// `prism/spring` (ADR-0023 §2, §3, §5; ARCHITECTURE §7.6): Apple's two-parameter spring as a physics
// triplet, its ε = 0.001 floor settle, and the CSS `linear()` curve, plus the transition renderers
// for CSS, Swift, TS and Figma.
//
// The curve samples Motion's physics generator every millisecond from 0 to settleMs − 1 with
// near-zero rest thresholds (Motion's defaults snap to the target near extrema), sets the value at
// settleMs to exactly 1, simplifies the samples with Ramer–Douglas–Peucker on vertical distance
// (tolerance 0.002) and serializes them with Prism's number formatter. Motion's `toString()`,
// `generateLinearEasing` and `visualDuration` are never used (ADR-0023 M6, M7); the closed form of
// ir/spring.ts is the test oracle and the source of the settle.
import { spring as physicsGenerator } from 'motion';
import { settleMs, springPhysics, type SpringPhysics } from '../ir/spring.ts';
import type { IRSpring, IRTransition } from '../ir/types.ts';
import { cssCubicBezier, swiftCubicBezier } from './cubic-bezier.ts';
import { cssDuration, ms, seconds } from './duration.ts';
import { DECIMALS, fmt, round } from './format-number.ts';
import { memoByJson, part, sortParts, type CssPart } from './types.ts';

export { SETTLE_EPSILON, settleMs, springPhysics, stepResponse, type SpringPhysics } from '../ir/spring.ts';

/** RDP tolerance on vertical distance (ADR-0023 §5 step 3). */
export const RDP_TOLERANCE = 0.002;
/** `restDelta` and `restSpeed` of the generator: close enough to zero that it never snaps (M6). */
export const REST_THRESHOLD = 1e-9;

export interface SpringParams {
  readonly duration: number;
  readonly bounce: number;
}

export interface CurveStop {
  /** Whole milliseconds from the start. */
  readonly t: number;
  readonly value: number;
}

export interface SpringCurve {
  readonly settleMs: number;
  /** Kept samples in time order; the first is (0, 0) and the last (settleMs, 1). */
  readonly stops: readonly CurveStop[];
}

/** The physics triplet at 4 decimals, as Swift and `tokens.ts` carry it (ADR-0023 §2, P1). */
export function roundedPhysics(s: SpringParams): { readonly mass: 1; readonly stiffness: number; readonly damping: number } {
  const p: SpringPhysics = springPhysics(s.duration, s.bounce);
  return { mass: 1, stiffness: round(p.stiffness, DECIMALS.physics), damping: round(p.damping, DECIMALS.physics) };
}

/** Motion's generator at t = 0, 1, …, settleMs − 1 ms, then exactly 1 at settleMs (ADR-0023 §5 steps 1–2). */
export function sampleSpring(s: SpringParams): number[] {
  const end = settleMs(s.duration, s.bounce);
  if (end < 1) throw new RangeError(`spring (${s.duration}, ${s.bounce}) settles in under 1 ms`);
  const { stiffness, damping } = springPhysics(s.duration, s.bounce);
  const gen = physicsGenerator({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: REST_THRESHOLD, restSpeed: REST_THRESHOLD });
  const values: number[] = [];
  // `next` returns one shared state object, so read its value before the next call.
  for (let t = 0; t < end; t++) values.push(gen.next(t).value);
  values.push(1);
  return values;
}

/**
 * Ramer–Douglas–Peucker on vertical distance over samples 1 ms apart: between two kept samples, keep
 * the one farthest from their chord (the earliest on a tie) while that distance exceeds `tolerance`.
 * Returns the kept indices in ascending order; the first and the last are always kept.
 */
export function rdp(values: readonly number[], tolerance: number = RDP_TOLERANCE): number[] {
  const n = values.length;
  if (n <= 2) return [...values.keys()];
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];
  for (let span = stack.pop(); span !== undefined; span = stack.pop()) {
    const [a, z] = span;
    const ya = values[a] ?? 0;
    const rise = (values[z] ?? 0) - ya;
    let best = -1;
    let bestDistance = tolerance;
    for (let i = a + 1; i < z; i++) {
      const distance = Math.abs((values[i] ?? 0) - (ya + (rise * (i - a)) / (z - a)));
      if (distance > bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = true;
      stack.push([best, z], [a, best]);
    }
  }
  const out: number[] = [];
  keep.forEach((k, i) => {
    if (k) out.push(i);
  });
  return out;
}

/** The simplified curve of a spring (memoized by its parameters). */
export const springCurve = memoByJson((s: SpringParams): SpringCurve => {
  const values = sampleSpring({ duration: s.duration, bounce: s.bounce });
  return { settleMs: values.length - 1, stops: rdp(values).map((t) => ({ t, value: values[t] ?? 1 })) };
});

/**
 * `linear(0, v t%, …, 1)`: values to 4 decimals, positions `100 · t / settleMs` to 2 decimals, and no
 * position on the first and the last stop (ADR-0023 §5 step 4).
 */
export function cssLinear(curve: SpringCurve): string {
  const last = curve.stops.length - 1;
  const parts = curve.stops.map(({ t, value }, i) => {
    const v = fmt(value, DECIMALS.linearValue);
    return i === 0 || i === last ? v : `${v} ${fmt((100 * t) / curve.settleMs, DECIMALS.linearPosition)}%`;
  });
  return `linear(${parts.join(', ')})`;
}

export interface CssTransition {
  /** `-duration`: settleMs for a spring, else the authored duration. */
  readonly duration: string;
  /** `-delay`. */
  readonly delay: string;
  /** `-easing`: the spring's `linear()` curve, else the token's `cubic-bezier()`. */
  readonly easing: string;
  /** The `@supports not (… linear() …)` twin of `-easing`: the token's timingFunction; null without a spring. */
  readonly fallbackEasing: string | null;
  /** The literal shorthand `<duration> <easing>[ <delay>]`; the delay only when it is not 0. */
  readonly value: string;
  /** The shorthand with the fallback easing; null without a spring. */
  readonly fallbackValue: string | null;
}

/** CSS of a transition token (ARCHITECTURE §7.6 "Per target"). */
export function cssTransition(t: IRTransition): CssTransition {
  const delay = cssDuration(t.delay);
  const tail = t.delay.ms === 0 ? '' : ` ${delay}`;
  const cubic = cssCubicBezier(t.timingFunction);
  if (t.spring === null) {
    const duration = cssDuration(t.duration);
    return { duration, delay, easing: cubic, fallbackEasing: null, value: `${duration} ${cubic}${tail}`, fallbackValue: null };
  }
  const curve = springCurve({ duration: t.spring.duration, bounce: t.spring.bounce });
  const duration = `${fmt(curve.settleMs, DECIMALS.ms)}ms`;
  const easing = cssLinear(curve);
  return {
    duration,
    delay,
    easing,
    fallbackEasing: cubic,
    value: `${duration} ${easing}${tail}`,
    fallbackValue: `${duration} ${cubic}${tail}`,
  };
}

/** CSS parts of a transition: the literal shorthand, `-delay`, `-duration` and `-easing`, in §12 order. */
export function cssTransitionParts(t: IRTransition): readonly CssPart[] {
  const c = cssTransition(t);
  const noLinear = (value: string | null): { kind: 'noLinear'; value: string }[] => (value === null ? [] : [{ kind: 'noLinear', value }]);
  return sortParts([
    part('', c.value, noLinear(c.fallbackValue)),
    part('-delay', c.delay),
    part('-duration', c.duration),
    part('-easing', c.easing, noLinear(c.fallbackEasing)),
  ]);
}

/**
 * Swift `DSSpringToken(duration:bounce:blendDuration:settle:mass:stiffness:damping:)`; `settle` is the
 * ε = 0.001 settle in seconds, never `Spring.settlingDuration` (ADR-0023 §3).
 */
export function swiftSpring(s: IRSpring): string {
  const { stiffness, damping } = roundedPhysics(s);
  const f = (n: number): string => fmt(n, DECIMALS.other);
  const settle = fmt(settleMs(s.duration, s.bounce) / 1000, DECIMALS.seconds);
  return `DSSpringToken(duration: ${f(s.duration)}, bounce: ${f(s.bounce)}, blendDuration: ${f(s.blendDuration)}, settle: ${settle}, mass: 1, stiffness: ${fmt(stiffness, DECIMALS.physics)}, damping: ${fmt(damping, DECIMALS.physics)})`;
}

/** Swift `DSTransitionToken(duration:delay:curve:spring:)`. */
export function swiftTransition(t: IRTransition): string {
  const spring = t.spring === null ? 'nil' : swiftSpring(t.spring);
  return `DSTransitionToken(duration: ${seconds(t.duration)}, delay: ${seconds(t.delay)}, curve: ${swiftCubicBezier(t.timingFunction)}, spring: ${spring})`;
}

/** `tokens.ts` SpringValue (ARCHITECTURE §9.5): Apple parameters, the physics triplet for Motion, the CSS forms. */
export interface TsSpring {
  readonly duration: number;
  readonly bounce: number;
  readonly blendDuration: number;
  readonly mass: 1;
  readonly stiffness: number;
  readonly damping: number;
  readonly settleMs: number;
  readonly easing: string;
  readonly fallback: string;
  readonly css: string;
}

export function tsSpring(t: IRTransition): TsSpring {
  if (t.spring === null) throw new TypeError('tsSpring needs a transition with a spring; use tsTransition');
  const s = t.spring;
  const c = cssTransition(t);
  const { stiffness, damping } = roundedPhysics(s);
  return {
    duration: round(s.duration, DECIMALS.other),
    bounce: round(s.bounce, DECIMALS.other),
    blendDuration: round(s.blendDuration, DECIMALS.other),
    mass: 1,
    stiffness,
    damping,
    settleMs: springCurve({ duration: s.duration, bounce: s.bounce }).settleMs,
    easing: c.easing,
    fallback: c.fallbackEasing ?? c.easing,
    css: c.value,
  };
}

/** `tokens.ts` value of a transition without a spring: milliseconds and the CSS forms. */
export interface TsTransition {
  readonly duration: number;
  readonly delay: number;
  readonly easing: string;
  readonly css: string;
}

export function tsTransition(t: IRTransition): TsTransition {
  return { duration: ms(t.duration), delay: ms(t.delay), easing: cssCubicBezier(t.timingFunction), css: cssTransition({ ...t, spring: null }).value };
}

/** Figma-native flavor: a spring splits into `…/duration` (seconds) and `…/bounce` (ARCHITECTURE §9.10). */
export interface FigmaSpring {
  readonly duration: { readonly value: number; readonly unit: 's' };
  readonly bounce: number;
}

export function figmaSpring(s: IRSpring): FigmaSpring {
  return { duration: { value: round(s.duration, DECIMALS.seconds), unit: 's' }, bounce: round(s.bounce, DECIMALS.other) };
}
