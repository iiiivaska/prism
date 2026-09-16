/**
 * Writing a choice onto `<html>` (ADR-0019 §4 item 1, rule 6). `<Theme>` calls this in a layout
 * effect; an app without React calls it itself.
 */
import type { TokenContext } from "../generated/runtime.ts";
import { axes, isAxisValue, specs } from "./axes.ts";

interface Previous {
  readonly attribute: string;
  readonly value: string | null;
}

/**
 * Writes the listed values it is given onto `<html>` and returns a cleanup that restores what was
 * there before.
 *
 * It writes only the axes it is given, never a detected or derived value, and never removes a value
 * it did not write (ADR-0019 rule 6). An axis left out, or given a value the axis does not list, is
 * left alone, so the stylesheet's media fallback keeps deciding it. Off the DOM it does nothing.
 */
export function mountRoot(context: Partial<TokenContext> = {}): () => void {
  if (typeof document === "undefined") return () => undefined;
  const root: Element | null = document.documentElement;
  if (root === null) return () => undefined;

  const previous: Previous[] = [];
  for (const axis of axes) {
    const value: unknown = context[axis];
    if (!isAxisValue(axis, value)) continue;
    const { attribute } = specs[axis];
    previous.push({ attribute, value: root.getAttribute(attribute) });
    root.setAttribute(attribute, value);
  }

  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (let i = previous.length - 1; i >= 0; i -= 1) {
      const entry = previous[i];
      if (entry === undefined) continue;
      if (entry.value === null) root.removeAttribute(entry.attribute);
      else root.setAttribute(entry.attribute, entry.value);
    }
  };
}
