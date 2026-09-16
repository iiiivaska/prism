/**
 * Reading the effective context, and watching it (ADR-0019 §4 item 2).
 *
 * Detection exists for JavaScript consumers only. Nothing here copies a detected value into an
 * attribute: the stylesheets evaluate the same media queries themselves, so the first paint is right
 * without JavaScript and after server rendering (ADR-0019 §4 item 1).
 */
import { defaultContext, type RuntimeAxis, type TokenContext } from "../generated/runtime.ts";
import { axes, axisDefault, sameContext, specs } from "./axes.ts";

/** A media query list, memoised per view so a snapshot read costs one property access. */
const listsByView = new WeakMap<Window, Map<string, MediaQueryList>>();

function mediaList(view: Window, query: string): MediaQueryList | null {
  if (typeof view.matchMedia !== "function") return null;
  let byQuery = listsByView.get(view);
  if (byQuery === undefined) {
    byQuery = new Map<string, MediaQueryList>();
    listsByView.set(view, byQuery);
  }
  let list = byQuery.get(query);
  if (list === undefined) {
    list = view.matchMedia(query);
    byQuery.set(query, list);
  }
  return list;
}

function documentOf(element?: Element | null): Document | null {
  if (element) return element.ownerDocument;
  return typeof document === "undefined" ? null : document;
}

/** The attribute value on an element when the axis lists it, else `null` (ADR-0019 §1 item 2). */
function validAttribute(element: Element, axis: RuntimeAxis): string | null {
  const value = element.getAttribute(specs[axis].attribute);
  if (value === null) return null;
  return specs[axis].values.includes(value) ? value : null;
}

/**
 * The effective context at an element, `<html>` by default (ADR-0019 §4).
 *
 * - A nestable axis takes the nearest ancestor-or-self with a listed value, else the one on `<html>`,
 *   else its media fallback, else the axis default.
 * - A root-only axis takes the listed value on `<html>`, else its media fallback, else the default.
 *
 * Off the DOM (server rendering, a worker) it returns `defaultContext`, the resolver default that the
 * web `:root` blocks also carry (ADR-0019 §1 item 5).
 */
export function readContext(element?: Element | null): TokenContext {
  const doc = documentOf(element);
  if (doc === null) return defaultContext;
  const root: Element | null = doc.documentElement;
  const view = doc.defaultView;
  const resolved: Record<string, string> = {};

  for (const axis of axes) {
    let value: string | null = null;
    if (specs[axis].nestable) {
      for (let node: Element | null = element ?? root; node !== null; node = node.parentElement) {
        value = validAttribute(node, axis);
        if (value !== null) break;
      }
    }
    // Root-only axes, and a nestable axis on an element outside the document, still read `<html>`.
    if (value === null && root !== null) value = validAttribute(root, axis);
    if (value === null) {
      const list = view === null ? null : mediaList(view, specs[axis].media.query);
      value = list?.matches === true ? specs[axis].media.value : axisDefault(axis);
    }
    resolved[axis] = value;
  }

  return resolved as unknown as TokenContext;
}

/**
 * Calls `listener` whenever the context of `<html>` changes: on every `change` of the axis media
 * queries and on every `data-ds-*` mutation of `<html>` (ADR-0019 §4 item 2). An event that leaves
 * every axis on the same value delivers nothing.
 *
 * It watches `<html>` only, like the root-only axes themselves; code inside a nested scope reads
 * `readContext(element)` on the elements it owns. Returns the unsubscribe function.
 */
export function watchContext(listener: (context: TokenContext) => void): () => void {
  const doc = documentOf();
  if (doc === null) return () => undefined;
  const view = doc.defaultView;
  let last = readContext();
  const stops: (() => void)[] = [];

  const notify = (): void => {
    const next = readContext();
    if (sameContext(next, last)) return;
    last = next;
    listener(next);
  };

  if (view !== null) {
    for (const axis of axes) {
      const list = mediaList(view, specs[axis].media.query);
      if (list === null) continue;
      if (typeof list.addEventListener === "function") {
        list.addEventListener("change", notify);
        stops.push(() => {
          list.removeEventListener("change", notify);
        });
      } else if (typeof list.addListener === "function") {
        // Safari below 14 has no addEventListener on a MediaQueryList.
        list.addListener(notify);
        stops.push(() => {
          list.removeListener(notify);
        });
      }
    }
  }

  const Observer = view?.MutationObserver ?? globalThis.MutationObserver;
  if (typeof Observer === "function" && doc.documentElement !== null) {
    const observer = new Observer(notify);
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: axes.map((axis) => specs[axis].attribute),
    });
    stops.push(() => {
      observer.disconnect();
    });
  }

  return () => {
    for (const stop of stops) stop();
    stops.length = 0;
  };
}
