// Apple two-parameter spring physics and the settle time (ADR-0023 §2, §3; ARCHITECTURE §7.6).
// The IR analysis needs settle for the motion policy (§5.7 item 9); P1-4's transforms/spring.ts builds
// the CSS curve on top of these functions.
//
// mass 1, stiffness (2π / duration)², damping 4π(1 − bounce) / duration, damping ratio 1 − bounce.
// settleMs = floor(1000 · t_last), t_last = the last t in [0, 5 s] with |1 − x(t)| ≥ 0.001 for the unit
// step response from rest (closed form: critical branch for bounce 0, underdamped otherwise).

export const SETTLE_EPSILON = 0.001;
const HORIZON_S = 5;
const SAMPLE_S = 1e-5;     // 0.01 ms
const RESOLUTION_S = 1e-6; // 1 µs

export interface SpringPhysics { readonly mass: 1; readonly stiffness: number; readonly damping: number; readonly dampingRatio: number }

export function springPhysics(duration: number, bounce: number): SpringPhysics {
  const omega = (2 * Math.PI) / duration;
  return { mass: 1, stiffness: omega * omega, damping: (4 * Math.PI * (1 - bounce)) / duration, dampingRatio: 1 - bounce };
}

/** x(t) of the unit step response from rest (x(0) = 0, x'(0) = 0), t in seconds. */
export function stepResponse(duration: number, bounce: number): (t: number) => number {
  if (!(duration > 0) || bounce < 0 || bounce >= 1) throw new Error(`unsupported spring (${duration}, ${bounce})`);
  const w0 = (2 * Math.PI) / duration;
  const zeta = 1 - bounce;
  if (bounce === 0) return (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  const k = (zeta * w0) / wd;
  return (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + k * Math.sin(wd * t));
}

const memo = new Map<string, number>();

/** Settle in whole milliseconds (floor), ADR-0023 §3. */
export function settleMs(duration: number, bounce: number): number {
  const key = `${duration}|${bounce}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const x = stepResponse(duration, bounce);
  const away = (t: number): boolean => Math.abs(1 - x(t)) >= SETTLE_EPSILON;
  const w0 = (2 * Math.PI) / duration;
  const zeta = 1 - bounce;
  // Beyond `tail` the envelope e^(−ζω0t)·(1 + ω0t) (critical) or e^(−ζω0t)/√(1−ζ²) (underdamped)
  // is below ε, so no later sample can be ε away from the target.
  let tail = HORIZON_S;
  if (bounce > 0) {
    tail = Math.min(HORIZON_S, Math.log(1 / (SETTLE_EPSILON * Math.sqrt(1 - zeta * zeta))) / (zeta * w0));
  }
  let last = -1;
  const steps = Math.ceil(tail / SAMPLE_S);
  for (let i = 0; i <= steps; i++) if (away(i * SAMPLE_S)) last = i;
  let result: number;
  if (last < 0) result = 0;
  else {
    let lo = last * SAMPLE_S;
    let hi = lo + SAMPLE_S;
    while (hi - lo > RESOLUTION_S / 8) {
      const mid = (lo + hi) / 2;
      if (away(mid)) lo = mid;
      else hi = mid;
    }
    result = Math.floor(1000 * lo);
  }
  memo.set(key, result);
  return result;
}
