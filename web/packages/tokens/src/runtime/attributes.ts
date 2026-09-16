/**
 * The two pure functions of the web runtime (ADR-0019 §4): the attributes for `<html>` and the
 * attributes for a nested scope. Both are safe on the server — they touch no DOM and no `matchMedia`.
 */
import type { ScopeAttributes, TokenContext } from "../generated/runtime.ts";
import { axes, isAxisValue, specs, type ScopeContext } from "./axes.ts";

/**
 * The `data-ds-*` attributes for `<html>`, for server rendering and for hand-written markup.
 *
 * Only explicit choices become attributes (ADR-0019 §4 item 1): an axis left out, or given a value
 * the axis does not list, produces no attribute, so the stylesheet's media fallback keeps deciding it.
 * With no attribute the server's HTML follows the media queries, and a `<Theme>` with the same values
 * changes nothing on hydration (ADR-0019 §4 item 5).
 *
 * ```ts
 * <html {...rootAttributes({ colorScheme: persisted.scheme })}>
 * ```
 */
export function rootAttributes(context: Partial<TokenContext> = {}): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const axis of axes) {
    const value: unknown = context[axis];
    if (isAxisValue(axis, value)) attributes[specs[axis].attribute] = value;
  }
  return attributes;
}

/**
 * The attributes for a nested scope on any element (ADR-0019 §1 item 4). Only `colorScheme` and
 * `density` nest; contrast, transparency, modality and motion are read from `<html>` only and are
 * ignored anywhere else, in CSS and in `readContext`.
 *
 * ```tsx
 * <section {...scope({ colorScheme: "dark" })}>…</section>
 * ```
 */
export function scope(context: ScopeContext = {}): ScopeAttributes {
  const attributes: Record<string, string> = {};
  for (const axis of axes) {
    if (!specs[axis].nestable) continue;
    const value: unknown = (context as Record<string, unknown>)[axis];
    if (isAxisValue(axis, value)) attributes[specs[axis].attribute] = value;
  }
  return attributes;
}
