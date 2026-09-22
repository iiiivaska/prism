/**
 * Does anything actually respond to an axis? (docs/showcase.md §3.)
 *
 * The axis bar switches every axis through the published runtime and prints what the runtime
 * resolved, so "auto → dark" is visible. That is not enough to keep the promise the design makes —
 * *a control that does nothing is visible rather than assumed* — because resolving is not painting.
 * So the app measures it, once, on the document it is running in, and never says it in advance.
 *
 * There are two ways a Prism axis reaches pixels on the web, and an axis that takes the second one
 * only is exactly where a reader is most likely to be misled:
 *
 *  1. **through the tokens** — the brand stylesheet writes a block under the axis's attribute or its
 *     media query, and every `--ds-*` value inside it moves;
 *  2. **through a component** — the axis changes nothing in CSS, and a component reads it from
 *     `useTokenContext()` and renders differently. Reduce Transparency is this case today: no brand
 *     stylesheet carries a `data-ds-transparency` declaration, and `Surface` still swaps glass for the
 *     opaque fallback of ADR-0022 §1.2, which is visible on every glass card on the screen.
 *
 * Measuring only the first and labelling the axis from it would print "nothing responds" over an axis
 * the stack demonstrably honours. So the probe has two stages, and the second runs only where the
 * first found nothing:
 *
 *  - **Tokens.** Collect every `--ds-*` custom property the loaded stylesheets declare, clear every
 *    axis attribute from `<html>`, write one axis's values onto it in turn and read those properties
 *    back off `getComputedStyle(<html>)`; count the ones that change.
 *  - **Components.** For an axis that moved no property, stage every example of every component the
 *    manifest implements — the same catalogue entries and the same harness the Components screen
 *    uses — into an off-screen React root, render it once per axis value with that value on `<html>`,
 *    and compare the markup each component produced. The components whose markup differs are named;
 *    the axis is called inert only when neither stage found anything.
 *
 * Two details are the difference between a measurement and a guess. Each axis is probed under both
 * colour schemes, because a modifier may only exist in one of them (the token manifest declares
 * `transparency` contexts per scheme), and the component stage repeats per scheme for the same
 * reason. And the probe reads `<html>` itself, not a detached element: `contrast`, `transparency`,
 * `modality` and `motion` are root-only axes (ADR-0019 §1 item 4), so their blocks are written
 * `:root[…]`, a nested probe would report every one of them as dead, and `readContext()` — which is
 * what a component reads — looks at `<html>` too. Both stages start from a root with *every* axis
 * cleared, because a visitor holding `contrast: more` would already have forced the glass fallback
 * and transparency would measure as dead through no fault of its own.
 *
 * It runs once, in one task, and restores every attribute it touched before yielding, so nothing
 * paints in between, the off-screen root is unmounted, and the `MutationObserver` behind
 * `watchContext` sees the context it started with. The cost is one style recalculation per state —
 * 39 states over the 918 `--ds-*` properties this brand declares — plus, per inert axis, one
 * synchronous render of the staged examples per scheme and value. Measured on the built app, the
 * whole of it stays under the 50 ms a browser counts as a long task: the only long task the page
 * reports is the bundle's own first render, before the first paint the probe waits for.
 *
 * What it is not: a claim about *pixels*. A responding axis is one whose tokens move or whose
 * components render differently; whether that difference is visible is what the gallery and the VRT
 * suite answer. A stylesheet the document cannot read (cross-origin) is skipped, a browser that gives
 * nothing back leaves the axis unlabelled rather than labelled wrongly, and a component stage that
 * cannot run at all reports that it did not run rather than reporting silence as proof.
 */
import { createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { webRuntime } from "@iiiivaska/prism-react";
import { components as specs, renderers } from "virtual:prism/catalog";
import { argsFor } from "./sections/Components.tsx";

/** What one axis was measured to move in this document. */
export interface AxisResponse {
  /** How many `--ds-*` custom properties its values move. */
  readonly tokens: number;
  /**
   * How many staged spec examples come out with different markup under it. Measured only when
   * `tokens` is 0 — an axis the stylesheets already answer needs no second opinion — and 0 whenever
   * `staged` is 0, where it means "not measured" rather than "nothing".
   */
  readonly examples: number;
  /**
   * The components those examples belong to, in name order. It is deliberately not "the components
   * that respond": an example is a component on the stage its spec declares, so a `Button` example
   * inside a glass `Surface` changes because the Surface does, and the bar says *examples of* these.
   */
  readonly components: readonly string[];
  /** How many spec examples the component stage rendered; 0 when the stage did not run. */
  readonly staged: number;
}

/** Axis name → what responds to it. */
export type AxisProbe = Readonly<Record<string, AxisResponse>>;

const AXES = Object.keys(webRuntime) as (keyof typeof webRuntime)[];
const PREFIX = "--ds-";

function collect(rules: CSSRuleList, names: Set<string>): void {
  for (const rule of Array.from(rules)) {
    const style: CSSStyleDeclaration | undefined = (rule as { style?: CSSStyleDeclaration }).style;
    if (style !== undefined) {
      for (let i = 0; i < style.length; i += 1) {
        const name = style.item(i);
        if (name.startsWith(PREFIX)) names.add(name);
      }
    }
    // `@media`, `@supports`, `@layer`: the axis blocks live inside them.
    const nested: CSSRuleList | undefined = (rule as { cssRules?: CSSRuleList }).cssRules;
    if (nested !== undefined) collect(nested, names);
  }
}

/** Every `--ds-*` custom property this document's stylesheets declare, in no particular order. */
export function declaredProperties(doc: Document): string[] {
  const names = new Set<string>();
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // A cross-origin stylesheet cannot be read; it is not one of ours.
      continue;
    }
    collect(rules, names);
  }
  return [...names];
}

function readValues(element: Element, names: readonly string[]): string[] {
  const computed = getComputedStyle(element);
  return names.map((name) => computed.getPropertyValue(name));
}

function differences(before: readonly string[], after: readonly string[]): number {
  let count = 0;
  for (let i = 0; i < before.length; i += 1) if (before[i] !== after[i]) count += 1;
  return count;
}

/** One spec example, ready to be staged as many times as the probe needs it. */
interface StagedExample {
  readonly component: string;
  readonly key: string;
  readonly node: () => ReactNode;
}

/**
 * Every example of every component the manifest implements, staged by the harness entry the
 * catalogue named — the same call the Components screen makes, including the no-op handler each
 * `action` prop needs. The list is the catalogue's, so a component that lands is probed with no edit
 * here, and a component that has no renderer cannot be in it.
 */
function stagedExamples(): StagedExample[] {
  const staged: StagedExample[] = [];
  for (const spec of specs) {
    const render = renderers[spec.name];
    if (render === undefined) continue;
    for (const example of spec.examples) {
      const args = argsFor(spec, example);
      staged.push({ component: spec.name, key: `${spec.name}/${example.id}`, node: () => render(args, example) });
    }
  }
  return staged;
}

/** Off the flow, out of the page, and out of the accessibility tree: the probe is not a picture. */
const STAGE_STYLE = "position:fixed;inset-block-start:0;inset-inline-start:-20000px;inline-size:1024px;block-size:0;overflow:hidden;pointer-events:none;";

interface ComponentStage {
  /** The component each snapshot belongs to, by index. */
  readonly of: readonly string[];
  /** Renders the whole set against the document as it stands, and returns one markup snapshot each. */
  readonly paint: () => string[];
  readonly dispose: () => void;
}

/**
 * An off-screen React root holding one copy of every staged example. It renders synchronously, so a
 * render reads `<html>` exactly as the probe has left it: `useTokenContext()` is a
 * `useSyncExternalStore` over `readContext()`, which reads the attributes on `<html>` at render time,
 * and `watchContext`'s observer never gets a turn inside one task.
 */
function createComponentStage(doc: Document): ComponentStage | null {
  const staged = stagedExamples();
  if (staged.length === 0 || doc.body === null) return null;

  const host = doc.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("style", STAGE_STYLE);
  doc.body.appendChild(host);
  const root = createRoot(host);

  return {
    of: staged.map((entry) => entry.component),
    paint: () => {
      // A fresh element tree per paint: React bails out of re-rendering an element it is given by
      // reference twice, and the whole point of a second paint is that the same input renders again.
      flushSync(() => {
        root.render(createElement("div", null, staged.map((entry) => createElement("div", { key: entry.key }, entry.node()))));
      });
      const parent = host.firstElementChild;
      return staged.map((_, index) => parent?.children.item(index)?.innerHTML ?? "");
    },
    dispose: () => {
      root.unmount();
      host.remove();
    },
  };
}

/**
 * The staged examples whose markup changes with this axis, measured under each colour scheme in turn.
 * The axis's own attribute is the only one written; everything else on `<html>` is as the caller left
 * it, which is with every axis cleared.
 */
function respondingExamples(root: Element, axis: keyof typeof webRuntime, stage: ComponentStage): { examples: number; components: string[] } {
  const { attribute, values } = webRuntime[axis];
  const moved = new Set<number>();
  const schemeAttribute = webRuntime.colorScheme.attribute;

  for (const scheme of [null, ...webRuntime.colorScheme.values]) {
    if (axis === "colorScheme" && scheme !== null) continue;
    if (scheme === null) root.removeAttribute(schemeAttribute);
    else root.setAttribute(schemeAttribute, scheme);

    const shots: string[][] = [];
    for (const value of values) {
      root.setAttribute(attribute, value);
      shots.push(stage.paint());
    }
    root.removeAttribute(attribute);

    const first = shots[0];
    if (first !== undefined) {
      for (const shot of shots) {
        for (let index = 0; index < shot.length; index += 1) {
          if (shot[index] !== first[index]) moved.add(index);
        }
      }
    }
  }
  root.removeAttribute(schemeAttribute);
  const components = new Set<string>();
  for (const index of moved) {
    const component = stage.of[index];
    if (component !== undefined) components.add(component);
  }
  return { examples: moved.size, components: [...components].sort() };
}

/**
 * Probes every axis of the runtime against the document it is given, and restores it. Returns null
 * when the document declares no `--ds-*` property at all, which is a document with no brand in it and
 * nothing to say about.
 */
export function probeAxes(doc: Document): AxisProbe | null {
  const root = doc.documentElement;
  const names = declaredProperties(doc);
  if (names.length === 0) return null;

  const saved = AXES.map((axis) => ({ attribute: webRuntime[axis].attribute, value: root.getAttribute(webRuntime[axis].attribute) }));
  const restore = (): void => {
    for (const entry of saved) {
      if (entry.value === null) root.removeAttribute(entry.attribute);
      else root.setAttribute(entry.attribute, entry.value);
    }
  };

  const tokens: Record<string, number> = {};
  const responded: Record<string, { examples: number; components: string[] }> = {};
  let staged = 0;
  let stage: ComponentStage | null = null;
  try {
    // A clean root: the visitor's own choices must not decide what an axis is measured against.
    for (const entry of saved) root.removeAttribute(entry.attribute);

    for (const scheme of [null, ...webRuntime.colorScheme.values]) {
      if (scheme === null) root.removeAttribute(webRuntime.colorScheme.attribute);
      else root.setAttribute(webRuntime.colorScheme.attribute, scheme);
      const base = readValues(root, names);

      for (const axis of AXES) {
        // The scheme is the frame here; it is measured by the frame moving, in the first pass.
        if (axis === "colorScheme" && scheme !== null) continue;
        const { attribute, values } = webRuntime[axis];
        let moved = tokens[axis] ?? 0;
        for (const value of values) {
          root.setAttribute(attribute, value);
          moved = Math.max(moved, differences(base, readValues(root, names)));
        }
        root.removeAttribute(attribute);
        tokens[axis] = moved;
      }
    }
    root.removeAttribute(webRuntime.colorScheme.attribute);

    // Second stage, and only where the first found nothing: an axis the stylesheets answer is already
    // measured, and staging the whole example set again would say nothing new for the time it costs.
    const inert = AXES.filter((axis) => tokens[axis] === 0);
    if (inert.length > 0) {
      stage = createComponentStage(doc);
      if (stage !== null) {
        staged = stage.of.length;
        for (const axis of inert) responded[axis] = respondingExamples(root, axis, stage);
      }
    }
  } finally {
    stage?.dispose();
    restore();
  }

  const probe: Record<string, AxisResponse> = {};
  for (const axis of AXES) {
    const answer = responded[axis];
    probe[axis] = {
      tokens: tokens[axis] ?? 0,
      examples: answer?.examples ?? 0,
      components: answer?.components ?? [],
      staged: answer === undefined ? 0 : staged,
    };
  }
  return probe;
}
