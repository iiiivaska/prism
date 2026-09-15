// prism/spring (ADR-0023 §2, §3, §5, §11 P5–P7; ARCHITECTURE §7.6, §14 P1-4).
import { readFileSync } from 'node:fs';
import { spring as physicsGenerator } from 'motion';
import { describe, expect, it } from 'vitest';
import type { IRTransition } from '../ir/types.ts';
import { validateAppPrism } from '../source/schemas.ts';
import {
  cssLinear, cssTransition, cssTransitionParts, figmaSpring, rdp, REST_THRESHOLD, roundedPhysics, sampleSpring, settleMs,
  springCurve, springPhysics, stepResponse, swiftSpring, swiftTransition, tsSpring, tsTransition,
} from './spring.ts';

const REPO = new URL('../../../', import.meta.url);

/** ADR-0023 §3: (duration, bounce) → settle. */
const SPRINGS = [
  { name: 'interactive', duration: 0.15, bounce: 0, settle: 220 },
  { name: 'snappy', duration: 0.35, bounce: 0.15, settle: 487 },
  { name: 'smooth', duration: 0.4, bounce: 0, settle: 587 },
  { name: 'sheet', duration: 0.3, bounce: 0.2, settle: 404 },
  { name: 'bouncy', duration: 0.5, bounce: 0.3, settle: 818 },
] as const;
/** ADR-0023 §8.2: snappy, sheet, bouncy, smooth under Reduce Motion. */
const REDUCED = [
  { name: 'snappy', duration: 0.25, bounce: 0, settle: 367 },
  { name: 'sheet', duration: 0.25, bounce: 0, settle: 367 },
  { name: 'bouncy', duration: 0.3, bounce: 0, settle: 440 },
  { name: 'smooth', duration: 0.3, bounce: 0, settle: 440 },
] as const;

const SNAPPY_LINEAR =
  'linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%, 0.095 5.75%, 0.1854 8.62%, 0.4096 14.99%, 0.5127 18.07%, 0.6119 21.36%, ' +
  '0.693 24.44%, 0.762 27.52%, 0.8229 30.8%, 0.8718 34.09%, 0.9121 37.58%, 0.9455 41.48%, 0.9709 45.79%, 0.9885 50.51%, ' +
  '0.9996 55.85%, 1.0046 61.19%, 1.0063 67.97%, 1)';
const REDUCED_SNAPPY_LINEAR =
  'linear(0, 0.0047 1.09%, 0.022 2.45%, 0.0491 3.81%, 0.0835 5.18%, 0.1571 7.63%, 0.3667 13.9%, 0.4615 16.89%, 0.5547 20.16%, ' +
  '0.6359 23.43%, 0.705 26.7%, 0.7672 30.25%, 0.8176 33.79%, 0.8607 37.6%, 0.8985 41.96%, 0.9294 46.87%, 0.9533 52.32%, ' +
  '0.9712 58.58%, 0.9831 65.4%, 0.9914 73.84%, 1)';

/** A grid over the admitted range (duration 0.1–1 s, bounce 0–0.4), with M8's worst case and M9's extremes. */
const ADMITTED = [0.1, 0.12, 0.15, 0.2, 0.3, 0.45, 0.6, 0.8, 1].flatMap((duration) =>
  [0, 0.05, 0.08, 0.14, 0.2, 0.3, 0.33, 0.4].map((bounce) => ({ duration, bounce })),
);

/** The CSS `linear()` easing parsed back: stops as (progress 0–1, value). */
function parseLinear(css: string): { p: number; v: number }[] {
  const m = /^linear\((.*)\)$/.exec(css);
  if (m === null) throw new Error(`not a linear() easing: ${css}`);
  const items = (m[1] ?? '').split(', ');
  return items.map((item, i) => {
    const [v, pos] = item.split(' ');
    const p = pos === undefined ? (i === 0 ? 0 : 1) : Number(pos.replace('%', '')) / 100;
    return { p, v: Number(v) };
  });
}

function evaluate(stops: readonly { p: number; v: number }[], p: number): number {
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a === undefined || b === undefined) break;
    if (p <= b.p) return b.p === a.p ? b.v : a.v + ((b.v - a.v) * (p - a.p)) / (b.p - a.p);
  }
  return stops[stops.length - 1]?.v ?? NaN;
}

/** P6: the largest distance between the parsed curve and the closed form, every 0.1 ms over [0, settleMs]. */
function curveError(s: { duration: number; bounce: number }): { error: number; stops: number; css: string } {
  const curve = springCurve(s);
  const css = cssLinear(curve);
  const stops = parseLinear(css);
  const x = stepResponse(s.duration, s.bounce);
  let error = 0;
  for (let k = 0; k <= curve.settleMs * 10; k++) {
    const t = k / 10;
    error = Math.max(error, Math.abs(evaluate(stops, t / curve.settleMs) - x(t / 1000)));
  }
  return { error, stops: stops.length, css };
}

function transition(duration: number, bounce: number, blendDuration = 0, delayMs = 0): IRTransition {
  return {
    kind: 'transition',
    duration: { kind: 'duration', ms: settleMs(duration, bounce) },
    delay: { kind: 'duration', ms: delayMs },
    timingFunction: { kind: 'cubicBezier', points: [0.23, 1, 0.32, 1] },
    spring: { duration, bounce, blendDuration },
  };
}

describe('physics (ADR-0023 §2)', () => {
  it("reproduces Apple's documented (0.5, 0.3) and SwiftUI's Spring(duration:bounce:) values", () => {
    expect(roundedPhysics({ duration: 0.5, bounce: 0.3 })).toEqual({ mass: 1, stiffness: 157.9137, damping: 17.5929 });
    expect(roundedPhysics({ duration: 0.35, bounce: 0.15 })).toEqual({ mass: 1, stiffness: 322.2728, damping: 30.5183 });
    expect(roundedPhysics({ duration: 0.15, bounce: 0 })).toEqual({ mass: 1, stiffness: 1754.5963, damping: 83.7758 });
    expect(roundedPhysics({ duration: 0.25, bounce: 0 })).toEqual({ mass: 1, stiffness: 631.6547, damping: 50.2655 });
    expect(springPhysics(0.3, 0.2).dampingRatio).toBeCloseTo(0.8, 15);
  });
});

describe('settle (ADR-0023 §3: ε = 0.001, floor)', () => {
  it.each(SPRINGS)('$name ($duration, $bounce) settles at $settle ms', ({ duration, bounce, settle }) => {
    expect(settleMs(duration, bounce)).toBe(settle);
  });

  it.each(REDUCED)('reduced $name ($duration, $bounce) settles at $settle ms', ({ duration, bounce, settle }) => {
    expect(settleMs(duration, bounce)).toBe(settle);
  });

  it('the repository authors exactly these springs and settles', () => {
    const read = (file: string): Record<string, { $extensions?: { 'app.prism'?: { spring?: { duration: number; bounce: number; settle?: number } } } }> => {
      const doc = JSON.parse(readFileSync(new URL(file, REPO), 'utf8')) as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
      const root = doc['ref'] ?? doc['sys'];
      return (root?.['motion']?.['spring'] ?? {}) as ReturnType<typeof read>;
    };
    const ref = read('tokens/ref/motion.tokens.json');
    for (const s of SPRINGS) expect(ref[s.name]?.$extensions?.['app.prism']?.spring).toMatchObject({ duration: s.duration, bounce: s.bounce, settle: s.settle / 1000 });
    const reduced = read('tokens/sys/motion/reduced.tokens.json');
    for (const s of REDUCED) expect(reduced[s.name]?.$extensions?.['app.prism']?.spring).toMatchObject({ duration: s.duration, bounce: s.bounce, settle: s.settle / 1000 });
  });

  it('floors: rounding would change snappy, smooth, sheet and bouncy', () => {
    const lastCrossing = (d: number, b: number): number => {
      const x = stepResponse(d, b);
      let t = settleMs(d, b) / 1000;
      while (Math.abs(1 - x(t + 1e-6)) >= 0.001 || Math.abs(1 - x(t + 2e-6)) >= 0.001) t += 1e-6;
      return t * 1000;
    };
    expect(Math.round(lastCrossing(0.35, 0.15))).toBe(488);
    expect(Math.round(lastCrossing(0.4, 0))).toBe(588);
    expect(Math.round(lastCrossing(0.3, 0.2))).toBe(405);
    expect(Math.round(lastCrossing(0.5, 0.3))).toBe(819);
  });
});

describe("Motion's physics generator (P5)", () => {
  it.each([...SPRINGS, ...REDUCED])('equals the closed form within 1e-9 at every millisecond: $name ($duration, $bounce)', ({ duration, bounce }) => {
    const { stiffness, damping } = springPhysics(duration, bounce);
    const gen = physicsGenerator({ keyframes: [0, 1], stiffness, damping, mass: 1, restDelta: REST_THRESHOLD, restSpeed: REST_THRESHOLD });
    const x = stepResponse(duration, bounce);
    let error = 0;
    for (let t = 0; t <= settleMs(duration, bounce); t++) error = Math.max(error, Math.abs(gen.next(t).value - x(t / 1000)));
    expect(error).toBeLessThanOrEqual(1e-9);
  });

  it('the bouncy regression: no plateau of exact 1s before the settle (default rest thresholds snap near extrema)', () => {
    const values = sampleSpring({ duration: 0.5, bounce: 0.3 });
    expect(values.slice(0, -1).filter((v) => v === 1)).toEqual([]);
    const x = stepResponse(0.5, 0.3);
    expect(Math.abs((values[700] ?? NaN) - x(0.7))).toBeLessThan(1e-9);
    expect(springCurve({ duration: 0.5, bounce: 0.3 }).stops.slice(0, -1).some((s) => s.value === 1)).toBe(false);
  });
});

describe('the CSS curve (P6)', () => {
  it('snappy and reduced snappy equal ARCHITECTURE §7.6 and §9.3 byte for byte', () => {
    expect(cssLinear(springCurve({ duration: 0.35, bounce: 0.15 }))).toBe(SNAPPY_LINEAR);
    expect(cssLinear(springCurve({ duration: 0.25, bounce: 0 }))).toBe(REDUCED_SNAPPY_LINEAR);
  });

  it('exact linear() strings of every spring', () => {
    const table = Object.fromEntries(
      [...SPRINGS, ...REDUCED.filter((s) => s.name === 'snappy' || s.name === 'bouncy')].map((s) => [
        `${s.duration}/${s.bounce}`,
        cssLinear(springCurve(s)),
      ]),
    );
    expect(table).toMatchInlineSnapshot(`
      {
        "0.15/0": "linear(0, 0.0033 0.91%, 0.0191 2.27%, 0.045 3.64%, 0.0785 5%, 0.16 7.73%, 0.3577 13.64%, 0.4587 16.82%, 0.562 20.45%, 0.6401 23.64%, 0.7068 26.82%, 0.77 30.45%, 0.821 34.09%, 0.8616 37.73%, 0.9005 42.27%, 0.9289 46.82%, 0.9529 52.27%, 0.9712 58.64%, 0.9831 65.45%, 0.9912 73.64%, 1)",
        "0.25/0": "linear(0, 0.0047 1.09%, 0.022 2.45%, 0.0491 3.81%, 0.0835 5.18%, 0.1571 7.63%, 0.3667 13.9%, 0.4615 16.89%, 0.5547 20.16%, 0.6359 23.43%, 0.705 26.7%, 0.7672 30.25%, 0.8176 33.79%, 0.8607 37.6%, 0.8985 41.96%, 0.9294 46.87%, 0.9533 52.32%, 0.9712 58.58%, 0.9831 65.4%, 0.9914 73.84%, 1)",
        "0.3/0": "linear(0, 0.0051 1.14%, 0.0191 2.27%, 0.045 3.64%, 0.0847 5.23%, 0.16 7.73%, 0.3652 13.86%, 0.4587 16.82%, 0.5559 20.23%, 0.6349 23.41%, 0.7068 26.82%, 0.7664 30.23%, 0.8182 33.86%, 0.8594 37.5%, 0.8988 42.05%, 0.9289 46.82%, 0.9529 52.27%, 0.9712 58.64%, 0.9831 65.45%, 0.9914 73.86%, 1)",
        "0.3/0.2": "linear(0, 0.0052 1.24%, 0.0235 2.72%, 0.058 4.46%, 0.1034 6.19%, 0.1975 9.16%, 0.434 15.84%, 0.5337 18.81%, 0.6317 22.03%, 0.717 25.25%, 0.7841 28.22%, 0.8443 31.44%, 0.8925 34.65%, 0.9326 38.12%, 0.9641 41.83%, 0.987 45.79%, 1.0029 50.25%, 1.0122 55.45%, 1.0147 65.1%, 1)",
        "0.35/0.15": "linear(0, 0.0055 1.23%, 0.0239 2.67%, 0.0526 4.11%, 0.095 5.75%, 0.1854 8.62%, 0.4096 14.99%, 0.5127 18.07%, 0.6119 21.36%, 0.693 24.44%, 0.762 27.52%, 0.8229 30.8%, 0.8718 34.09%, 0.9121 37.58%, 0.9455 41.48%, 0.9709 45.79%, 0.9885 50.51%, 0.9996 55.85%, 1.0046 61.19%, 1.0063 67.97%, 1)",
        "0.4/0": "linear(0, 0.0056 1.19%, 0.0209 2.39%, 0.0476 3.75%, 0.0816 5.11%, 0.1582 7.67%, 0.3633 13.8%, 0.4604 16.87%, 0.5574 20.27%, 0.6375 23.51%, 0.709 26.92%, 0.7682 30.32%, 0.8189 33.9%, 0.8611 37.65%, 0.8992 42.08%, 0.9301 47.02%, 0.9537 52.47%, 0.9712 58.6%, 0.9831 65.42%, 0.9913 73.76%, 1)",
        "0.5/0.3": "linear(0, 0.0074 1.22%, 0.028 2.44%, 0.063 3.79%, 0.1126 5.26%, 0.1607 6.48%, 0.2186 7.82%, 0.4798 13.45%, 0.5926 16.01%, 0.6987 18.7%, 0.7859 21.27%, 0.8585 23.84%, 0.9194 26.53%, 0.9658 29.22%, 1.0019 32.15%, 1.0215 34.47%, 1.0355 37.04%, 1.0436 39.85%, 1.046 42.91%, 1.0406 48.17%, 1.0119 62.71%, 1.0027 70.54%, 0.998 82.4%, 1)",
      }
    `);
  });

  it.each([...SPRINGS, ...REDUCED])('$name ($duration, $bounce): within 0.0025 of the closed form, from 0 to 1, at most 40 stops', (s) => {
    const r = curveError(s);
    expect(r.error).toBeLessThanOrEqual(0.0025);
    expect(r.stops).toBeLessThanOrEqual(40);
    expect(r.css.startsWith('linear(0, ')).toBe(true);
    expect(r.css.endsWith(', 1)')).toBe(true);
  });

  it('holds across the admitted range (ADR-0023 §1, M8, M9)', () => {
    const worst = { error: 0, stops: 0 };
    for (const s of ADMITTED) {
      const r = curveError(s);
      worst.error = Math.max(worst.error, r.error);
      worst.stops = Math.max(worst.stops, r.stops);
      expect(r.css.startsWith('linear(0, ') && r.css.endsWith(', 1)')).toBe(true);
    }
    expect(worst.error).toBeLessThanOrEqual(0.0025);
    expect(worst.stops).toBeLessThanOrEqual(40);
  });
});

describe('rdp', () => {
  it('keeps the endpoints and splits at the farthest sample, the earliest on a tie', () => {
    expect(rdp([0, 0, 0, 0])).toEqual([0, 3]);
    expect(rdp([0, 1, 0, 1, 0], 0.5)).toEqual([0, 1, 2, 3, 4]);
    // samples 1 and 3 tie at 1 from the first chord and 1 is kept; from the chord (1, 1)–(4, 0) samples 2 and 3 are only 0.67 off
    expect(rdp([0, 1, 0, 1, 0], 0.9)).toEqual([0, 1, 4]);
    expect(rdp([0, 0.001, 0.002, 0.003], 0.002)).toEqual([0, 3]);
    expect(rdp([0, 0.5, 1], 0.1)).toEqual([0, 2]);
    expect(rdp([1])).toEqual([0]);
  });

  it('the first stop is (0, 0) and the last (settleMs, 1)', () => {
    const c = springCurve({ duration: 0.35, bounce: 0.15 });
    expect(c.stops[0]).toEqual({ t: 0, value: 0 });
    expect(c.stops.at(-1)).toEqual({ t: 487, value: 1 });
    expect(c.settleMs).toBe(487);
  });
});

describe('per target (ARCHITECTURE §7.6)', () => {
  it('CSS: -duration is settleMs, -easing the linear() curve, and its @supports-not twin the timingFunction (P7)', () => {
    const c = cssTransition(transition(0.35, 0.15));
    expect(c).toEqual({
      duration: '487ms',
      delay: '0ms',
      easing: SNAPPY_LINEAR,
      fallbackEasing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      value: `487ms ${SNAPPY_LINEAR}`,
      fallbackValue: '487ms cubic-bezier(0.23, 1, 0.32, 1)',
    });
    expect(cssTransitionParts(transition(0.35, 0.15)).map((p) => [p.suffix, p.twins.map((t) => `${t.kind}: ${t.value}`)])).toEqual([
      ['', ['noLinear: 487ms cubic-bezier(0.23, 1, 0.32, 1)']],
      ['-delay', []],
      ['-duration', []],
      ['-easing', ['noLinear: cubic-bezier(0.23, 1, 0.32, 1)']],
    ]);
  });

  it('CSS: a transition without a spring renders <duration> cubic-bezier(…); a delay joins the shorthand', () => {
    const plain: IRTransition = { ...transition(0.35, 0.15), spring: null, duration: { kind: 'duration', ms: 250 } };
    expect(cssTransition(plain)).toEqual({
      duration: '250ms', delay: '0ms', easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fallbackEasing: null,
      value: '250ms cubic-bezier(0.23, 1, 0.32, 1)', fallbackValue: null,
    });
    expect(cssTransition({ ...plain, delay: { kind: 'duration', ms: 50 } }).value).toBe('250ms cubic-bezier(0.23, 1, 0.32, 1) 50ms');
    expect(cssTransitionParts(plain).every((p) => p.twins.length === 0)).toBe(true);
  });

  it('Swift: DSSpringToken with the ε settle, never settlingDuration', () => {
    expect(swiftSpring({ duration: 0.35, bounce: 0.15, blendDuration: 0 })).toBe(
      'DSSpringToken(duration: 0.35, bounce: 0.15, blendDuration: 0, settle: 0.487, mass: 1, stiffness: 322.2728, damping: 30.5183)',
    );
    expect(swiftSpring({ duration: 0.15, bounce: 0, blendDuration: 0.25 })).toBe(
      'DSSpringToken(duration: 0.15, bounce: 0, blendDuration: 0.25, settle: 0.22, mass: 1, stiffness: 1754.5963, damping: 83.7758)',
    );
    expect(swiftTransition(transition(0.25, 0))).toBe(
      'DSTransitionToken(duration: 0.367, delay: 0, curve: DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1), ' +
        'spring: DSSpringToken(duration: 0.25, bounce: 0, blendDuration: 0, settle: 0.367, mass: 1, stiffness: 631.6547, damping: 50.2655))',
    );
    expect(swiftTransition({ ...transition(0.25, 0), spring: null })).toBe(
      'DSTransitionToken(duration: 0.367, delay: 0, curve: DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1), spring: nil)',
    );
  });

  it('TS: SpringValue with the physics triplet for Motion and the CSS forms', () => {
    expect(tsSpring(transition(0.35, 0.15))).toEqual({
      duration: 0.35, bounce: 0.15, blendDuration: 0, mass: 1, stiffness: 322.2728, damping: 30.5183, settleMs: 487,
      easing: SNAPPY_LINEAR, fallback: 'cubic-bezier(0.23, 1, 0.32, 1)', css: `487ms ${SNAPPY_LINEAR}`,
    });
    expect(() => tsSpring({ ...transition(0.35, 0.15), spring: null })).toThrow(TypeError);
    expect(tsTransition({ ...transition(0.35, 0.15), spring: null, delay: { kind: 'duration', ms: 20 } })).toEqual({
      duration: 487, delay: 20, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', css: '487ms cubic-bezier(0.23, 1, 0.32, 1) 20ms',
    });
  });

  it('Figma: a spring splits into duration (s) and bounce', () => {
    expect(figmaSpring({ duration: 0.35, bounce: 0.15, blendDuration: 0 })).toEqual({ duration: { value: 0.35, unit: 's' }, bounce: 0.15 });
  });
});

describe('the app.prism schema (ADR-0023 §1)', () => {
  const spring = (s: Record<string, unknown>): string[] => validateAppPrism({ spring: s }).map((p) => `${p.pointer} ${p.message}`);
  it('admits the bounds', () => {
    expect(spring({ duration: 0.1, bounce: 0 })).toEqual([]);
    expect(spring({ duration: 1, bounce: 0.4, blendDuration: 1, settle: 1.651 })).toEqual([]);
    expect(spring({ duration: 0.15, bounce: 0, blendDuration: 0 })).toEqual([]);
  });
  it.each([
    [{ duration: 0.09, bounce: 0 }, '/spring/duration'],
    [{ duration: 350, bounce: 0.15 }, '/spring/duration'],
    [{ duration: 1.01, bounce: 0 }, '/spring/duration'],
    [{ duration: 0.35, bounce: -0.2 }, '/spring/bounce'],
    [{ duration: 0.35, bounce: 0.41 }, '/spring/bounce'],
    [{ duration: 0.35, bounce: 0, blendDuration: -0.1 }, '/spring/blendDuration'],
    [{ duration: 0.35, bounce: 0, blendDuration: 1.5 }, '/spring/blendDuration'],
  ])('rejects %j at %s', (s, pointer) => {
    expect(spring(s).some((p) => p.startsWith(`${pointer} `))).toBe(true);
  });
});
