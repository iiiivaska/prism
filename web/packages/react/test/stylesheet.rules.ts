/**
 * The checks of ADR-0019 rule 9 as ADR-0025 §3 amends it, and the stylesheet half of rule 10 (names in
 * the global CSS namespace carry `ds`), as functions over a parsed stylesheet so the test can run them
 * on the package's stylesheets and prove each one on a failing fixture.
 */
import { allAtRules, flattenRules, parseCss, rightmostCompound, splitTopLevel, type CssAtRule } from "./css.ts";

export interface Problem {
  readonly check: string;
  readonly detail: string;
}

/** The only root-axis variants a Prism stylesheet may use (ADR-0025 rule 2). */
const ALLOWED_VARIANTS = new Set(["ds-pointer", "ds-touch"]);

/** The three variants that serve consumer code only (ADR-0025 §1). */
const CONSUMER_VARIANTS = /\bds-(?:contrast-more|reduce-transparency|reduce-motion)\b/;

/** Sizes never switch with modality: sizes come from size.* tokens (ADR-0019 §4 item 6). */
const SIZING_PROPERTY =
  /^(?:width|height|min-width|min-height|max-width|max-height|inline-size|block-size|min-inline-size|min-block-size|max-inline-size|max-block-size|padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?|gap|row-gap|column-gap|inset(?:-[a-z-]+)?|top|right|bottom|left|font-size)$/;

/** The runtime contract's media features, which only generated CSS spells (ADR-0019 rule 1). */
const RUNTIME_MEDIA = /prefers-(?:color-scheme|contrast|reduced-transparency|reduced-motion)|\(\s*(?:any-)?(?:pointer|hover)\s*[:)]/;

/** The six axis attributes (ADR-0019 §1); a component stylesheet never selects on them. */
const AXIS_ATTRIBUTE = /data-ds-(?:color-scheme|contrast|transparency|density|modality|motion)\b/;

/** At-rules of Tailwind's language that must not survive the compile. */
const TAILWIND_AT_RULES = new Set(["variant", "custom-variant", "apply", "utility", "theme", "reference", "import", "tailwind", "source", "plugin", "config"]);

/** React Aria's state attributes, the only unprefixed attributes on Prism elements (ADR-0019 §6.1). */
const REACT_ARIA_STATES = new Set([
  "data-hovered",
  "data-pressed",
  "data-focused",
  "data-focus-visible",
  "data-focus-within",
  "data-disabled",
  "data-selected",
  "data-invalid",
  "data-readonly",
  "data-required",
  "data-pending",
  "data-open",
  "data-expanded",
  "data-placeholder",
  "data-dragging",
  "data-orientation",
  "data-rac",
]);

function withinVariant(atRules: readonly CssAtRule[], name: string): boolean {
  return atRules.some((at) => at.name === "variant" && at.params === name);
}

/** The argument lists of each `:is()` in a compound, and the compound without any pseudo-class arguments. */
function splitPseudoArguments(compound: string): { readonly own: string; readonly isArguments: readonly string[][] } {
  let own = "";
  const isArguments: string[][] = [];
  let i = 0;
  while (i < compound.length) {
    const match = /^:([a-z-]+)\(/.exec(compound.slice(i));
    if (match !== null) {
      let depth = 0;
      let j = i + match[0].length - 1;
      for (; j < compound.length; j++) {
        if (compound[j] === "(") depth++;
        else if (compound[j] === ")" && --depth === 0) break;
      }
      if (match[1] === "is") isArguments.push(splitTopLevel(compound.slice(i + match[0].length, j)));
      i = j + 1;
      continue;
    }
    own += compound[i];
    i++;
  }
  return { own, isArguments };
}

/**
 * Whether a compound selector carries `[data-ds-slot…]` or a `.ds-…` class of its own (rule 9). The
 * arguments of `:not()`, `:where()`, `:has()` and the like do not count; an `:is()` counts when every
 * one of its arguments is scoped.
 */
export function compoundIsScoped(compound: string): boolean {
  const { own, isArguments } = splitPseudoArguments(compound);
  if (/\[data-ds-slot[\]~|^$*=]/.test(own) || /\.ds-[\w-]/.test(own)) return true;
  return isArguments.some((argumentsOfIs) => argumentsOfIs.length > 0 && argumentsOfIs.every((argument) => compoundIsScoped(argument)));
}

/** Rule 9, source half: variants, hover, sizes and the consumer-only variants. */
export function sourceProblems(css: string): Problem[] {
  const problems: Problem[] = [];
  const tree = parseCss(css);
  if (CONSUMER_VARIANTS.test(css)) {
    problems.push({ check: "consumer-variant", detail: "ds-contrast-more, ds-reduce-transparency and ds-reduce-motion serve consumer code only (ADR-0025 rule 2)" });
  }
  for (const at of allAtRules(tree)) {
    if (at.name === "variant" && !ALLOWED_VARIANTS.has(at.params)) {
      problems.push({ check: "variant", detail: `@variant ${at.params}: only ds-pointer and ds-touch (ADR-0025 rule 2)` });
    }
    if ((at.name === "media" || at.name === "supports" || at.name === "container") && RUNTIME_MEDIA.test(at.params)) {
      problems.push({ check: "media", detail: `@${at.name} ${at.params}: root axes reach component CSS only through @variant (ADR-0019 §4 item 6)` });
    }
  }
  for (const rule of flattenRules(tree)) {
    for (const selector of rule.selectors) {
      if (AXIS_ATTRIBUTE.test(selector)) problems.push({ check: "axis-attribute", detail: `${selector}: selects an axis attribute (ADR-0019 rule 1)` });
      if (selector.includes("[data-hovered]") && !withinVariant(rule.atRules, "ds-pointer")) {
        problems.push({ check: "hover", detail: `${selector}: [data-hovered] outside @variant ds-pointer (ADR-0019 rule 9)` });
      }
    }
    if (withinVariant(rule.atRules, "ds-pointer") || withinVariant(rule.atRules, "ds-touch")) {
      for (const declaration of rule.declarations) {
        if (SIZING_PROPERTY.test(declaration.property)) {
          problems.push({ check: "size-in-variant", detail: `${declaration.property} inside a modality variant sets a size (ADR-0019 rule 9)` });
        }
      }
    }
  }
  return problems;
}

/** Rule 9, compiled half, and the stylesheet half of rule 10. */
export function compiledProblems(css: string): Problem[] {
  const problems: Problem[] = [];
  const tree = parseCss(css);
  for (const at of allAtRules(tree)) {
    if (TAILWIND_AT_RULES.has(at.name)) problems.push({ check: "tailwind-left", detail: `@${at.name} ${at.params} survived the compile (ADR-0019 rule 9)` });
    if (at.name === "layer") {
      for (const name of splitTopLevel(at.params)) {
        if (name !== "ds" && !name.startsWith("ds.")) problems.push({ check: "layer-name", detail: `@layer ${name}: layers are ds.* (ADR-0019 §6.1)` });
      }
    }
    if ((at.name === "keyframes" || at.name === "property" || at.name === "counter-style" || at.name === "font-feature-values") && !/^-?-?ds-/.test(at.params.replace(/^--/, ""))) {
      problems.push({ check: "global-name", detail: `@${at.name} ${at.params}: global names carry ds (ADR-0019 §6.1)` });
    }
    if (at.name === "container" && !/^(?:ds-|\(|not\b|style\()/.test(at.params)) {
      problems.push({ check: "global-name", detail: `@container ${at.params}: container names carry ds (ADR-0019 §6.1)` });
    }
  }
  const inside = (atRules: readonly CssAtRule[]): boolean => atRules.some((at) => at.name === "property" || at.name === "keyframes" || at.name === "font-face");
  for (const rule of flattenRules(tree)) {
    if (inside(rule.atRules) || rule.selectors.length === 0) continue;
    for (const selector of rule.selectors) {
      const compound = rightmostCompound(selector);
      if (!compoundIsScoped(compound)) {
        problems.push({ check: "unscoped-selector", detail: `${selector}: the rightmost compound has no [data-ds-slot…] or .ds-… (ADR-0019 rule 9)` });
      }
      for (const className of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
        if (!className[1]?.startsWith("ds-")) problems.push({ check: "global-name", detail: `${selector}: class .${className[1]} does not carry ds (ADR-0019 §6.1)` });
      }
      for (const attribute of selector.matchAll(/\[(data-[\w-]+)/g)) {
        const name = attribute[1] ?? "";
        if (!name.startsWith("data-ds-") && !REACT_ARIA_STATES.has(name)) {
          problems.push({ check: "global-name", detail: `${selector}: attribute ${name} is neither data-ds-* nor a React Aria state (ADR-0019 §6.1)` });
        }
      }
    }
    for (const declaration of rule.declarations) {
      if (declaration.property.startsWith("--") && !declaration.property.startsWith("--ds-")) {
        problems.push({ check: "global-name", detail: `${declaration.property}: custom properties carry ds (ADR-0019 §6.1)` });
      }
      if (declaration.property === "animation-name" || declaration.property === "container-name") {
        for (const name of splitTopLevel(declaration.value)) {
          if (name !== "none" && !name.startsWith("ds-") && !name.startsWith("var(")) {
            problems.push({ check: "global-name", detail: `${declaration.property}: ${name} does not carry ds (ADR-0019 §6.1)` });
          }
        }
      }
    }
  }
  return problems;
}
