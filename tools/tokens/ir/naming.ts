// Naming (ARCHITECTURE §8). P1-3 holds the public path only; P1-5 adds the CSS, Tailwind, TS,
// Swift, asset and flavor names and their collision checks.
import type { Tier } from './types.ts';

/**
 * Public path: `$root` dropped, `sys.` dropped, `ref.` and `comp.` kept (ADR-0024 §1.3).
 * 'sys.color.bg.surface.$root' → 'color.bg.surface'; 'comp.button.primary.bg.rest' stays.
 */
export function publicPath(id: string): string {
  const parts = id.split('.').filter((s) => s !== '$root');
  if (parts[0] === 'sys') parts.shift();
  return parts.join('.');
}

export function tierOf(id: string): Tier | null {
  const first = id.split('.', 1)[0];
  return first === 'ref' || first === 'sys' || first === 'comp' ? first : null;
}

/** The id without a trailing `.$root`. */
export function stripRoot(id: string): string {
  return id.endsWith('.$root') ? id.slice(0, -'.$root'.length) : id;
}

export const ALIAS_RE = /^\{([^{}]+)\}$/;

/** The target id of a whole-value alias (`"{a.b}"`), else null. */
export function aliasTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = ALIAS_RE.exec(value);
  return m?.[1] === undefined ? null : m[1].trim();
}
