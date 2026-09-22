/**
 * A small cascade for the binding tests: which declaration of a component stylesheet wins on an element
 * described by its classes and attributes. It understands the compound selectors Prism's component
 * sheets use on a root element (`.class`, `[attr]`, `[attr="value"]`, `:is(…)` of those) and skips every
 * selector with a combinator, a pseudo-element or another pseudo-class, so a test asks only about the
 * root. Rules inside `@variant` blocks count only when the test names that variant; rules inside any
 * other at-rule but `@layer` (forced colors) never count.
 */
import { flattenRules, parseCss, splitTopLevel, type FlatRule } from "./css.ts";

export interface ElementState {
  readonly classes: readonly string[];
  /** Attribute name → value; `""` for a boolean attribute. */
  readonly attributes: Readonly<Record<string, string>>;
  /** The `@variant` blocks that apply (`ds-pointer`, `ds-touch`). */
  readonly variants?: readonly string[];
}

interface Condition {
  readonly specificity: number;
  matches(state: ElementState): boolean;
}

function simpleCondition(token: string): Condition | null {
  const className = /^\.([\w-]+)$/.exec(token);
  if (className !== null) return { specificity: 1, matches: (state) => state.classes.includes(className[1] ?? "") };
  const attribute = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(token);
  if (attribute !== null) {
    const [, name = "", value] = attribute;
    return { specificity: 1, matches: (state) => (value === undefined ? name in state.attributes : state.attributes[name] === value) };
  }
  return null;
}

/** The conditions of one compound, or null when it holds anything this cascade does not model. */
function conditionsOf(compound: string): Condition[] | null {
  const conditions: Condition[] = [];
  let rest = compound.trim();
  while (rest !== "") {
    const is = /^:is\(/.exec(rest);
    if (is !== null) {
      let depth = 0;
      let end = 0;
      for (let i = 3; i < rest.length; i++) {
        if (rest[i] === "(") depth++;
        else if (rest[i] === ")" && --depth === 0) {
          end = i;
          break;
        }
      }
      const alternatives = splitTopLevel(rest.slice(4, end)).map((alternative) => conditionsOf(alternative));
      if (alternatives.some((alternative) => alternative === null)) return null;
      const valid = alternatives as Condition[][];
      conditions.push({
        specificity: Math.max(...valid.map((alternative) => alternative.reduce((sum, condition) => sum + condition.specificity, 0))),
        matches: (state) => valid.some((alternative) => alternative.every((condition) => condition.matches(state))),
      });
      rest = rest.slice(end + 1);
      continue;
    }
    const simple = /^(\.[\w-]+|\[[\w-]+(?:="[^"]*")?\])/.exec(rest);
    if (simple === null) return null;
    const condition = simpleCondition(simple[1] ?? "");
    if (condition === null) return null;
    conditions.push(condition);
    rest = rest.slice(simple[1]?.length ?? 0);
  }
  return conditions;
}

export class Cascade {
  readonly rules: readonly FlatRule[];

  constructor(css: string) {
    this.rules = flattenRules(parseCss(css));
  }

  /** The winning value of `property` on the element, or undefined when no rule declares it. */
  value(state: ElementState, property: string): string | undefined {
    let best: { specificity: number; order: number; value: string } | undefined;
    this.rules.forEach((rule, order) => {
      const variants = rule.atRules.filter((at) => at.name === "variant").map((at) => at.params);
      if (rule.atRules.some((at) => at.name !== "variant" && at.name !== "layer")) return;
      if (!variants.every((variant) => (state.variants ?? []).includes(variant))) return;
      const declaration = rule.declarations.filter((candidate) => candidate.property === property).at(-1);
      if (declaration === undefined) return;
      for (const selector of rule.selectors) {
        const conditions = conditionsOf(selector);
        if (conditions === null || !conditions.every((condition) => condition.matches(state))) continue;
        const specificity = conditions.reduce((sum, condition) => sum + condition.specificity, 0);
        if (best === undefined || specificity > best.specificity || (specificity === best.specificity && order >= best.order)) {
          best = { specificity, order, value: declaration.value };
        }
      }
    });
    return best?.value;
  }
}

/** Every declaration of a selector written exactly so, merged in source order. */
export function declarationsOf(rules: readonly FlatRule[], selector: string): Record<string, string> {
  return Object.fromEntries(
    rules.filter((rule) => rule.selectors.includes(selector) && rule.atRules.every((at) => at.name === "layer")).flatMap((rule) => rule.declarations.map((declaration) => [declaration.property, declaration.value])),
  );
}
