/**
 * The checks of ADR-0019 rule 9 as ADR-0025 §3 amends it, the stylesheet half of rule 10 (names in the
 * global CSS namespace carry `ds`), how a stylesheet may read the direction (P5-3 finding SD-7), and the
 * stylesheet half of ADR-0022 rule 2 as ADR-0036 §10 amends it (who declares `backdrop-filter` and who
 * names a glass recipe variable), as functions over a parsed stylesheet so the test can run them on the
 * package's stylesheets and prove each one on a failing fixture.
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

/** The two `dir` values a Prism selector reads; `auto` and every other value set no direction (src/icon/Glyph.css). */
const RTL = '[dir="rtl" i]';
const LTR = '[dir="ltr" i]';

/** How many changes of direction, from the first rtl down, `nearestRtlSelector()` follows exactly. */
const DIRECTION_DEPTH = 4;

/**
 * The one form in which a Prism selector reads the direction (P5-3 finding SD-7): at or under an rtl, and
 * not at or under an ltr under that rtl, unless an rtl under that ltr again, to `depth` changes — the
 * nearest `dir` attribute's direction, written with nothing a build aimed at the browser floor rewrites
 * (src/icon/Glyph.css). Built here from the two attribute selectors, so a copy in a stylesheet that drops,
 * reorders or misspells a level does not match it.
 */
export function nearestRtlSelector(depth: number = DIRECTION_DEPTH): string {
  const chain = (length: number): string => Array.from({ length }, (_, index) => (index % 2 === 0 ? RTL : LTR)).join(" ");
  const atOrUnder = (length: number): string => `${chain(length)}, ${chain(length)} *`;
  const unless = (length: number): string => (length > depth ? "" : `:not(:where(${atOrUnder(length)})${unless(length + 1)})`);
  return `:is(${atOrUnder(1)})${unless(2)}`;
}

/** A selector with its whitespace as the compiled stylesheet spells it, so one written over several lines compares equal. */
function normalizeSelector(selector: string): string {
  return selector
    .replace(/\s+/g, " ")
    .replace(/\(\s/g, "(")
    .replace(/\s\)/g, ")")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

/**
 * SD-7's guard. No `:dir()` anywhere: Chrome has it only from 120, above Prism's floor of 111, and a
 * build aimed at the floor rewrites it into `:is(:lang(ar), :lang(he), …)`, which a `dir` attribute never
 * matches, so a consumer's build mirrored nothing. And every selector that reads `dir` reads it through
 * `nearestRtlSelector()` and nothing else: with that form taken out, no `[dir` may remain, so neither a
 * bare `[dir="rtl"]` ancestor, which an ltr element inside it does not stop, nor one written in front of
 * the form passes.
 */
export function directionProblems(css: string): Problem[] {
  const problems: Problem[] = [];
  const tree = parseCss(css);
  const pseudo = /:dir\(/i;
  for (const at of allAtRules(tree)) {
    if (pseudo.test(at.params)) problems.push({ check: "dir-pseudo", detail: `@${at.name} ${at.params}: :dir() (P5-3 finding SD-7)` });
  }
  const form = nearestRtlSelector();
  for (const rule of flattenRules(tree)) {
    for (const selector of rule.selectors) {
      if (pseudo.test(selector)) {
        problems.push({ check: "dir-pseudo", detail: `${selector}: :dir() is newer than Chrome 111, and a build aimed at the floor rewrites it into :lang(), which a dir attribute never matches (P5-3 finding SD-7)` });
      } else if (/\[\s*dir\b/i.test(normalizeSelector(selector).split(form).join(""))) {
        problems.push({ check: "dir-attribute", detail: `${selector}: reads dir other than through nearestRtlSelector(), the nearest dir attribute (src/icon/Glyph.css)` });
      }
    }
  }
  return problems;
}

/** The selectors that read the direction, each without the `nearestRtlSelector()` it carries. */
export function directionReaders(css: string): string[] {
  const form = nearestRtlSelector();
  return flattenRules(parseCss(css))
    .flatMap((rule) => rule.selectors.map(normalizeSelector))
    .filter((selector) => selector.includes(form))
    .map((selector) => selector.replace(form, ""));
}

/** The one stylesheet that declares `backdrop-filter`, relative to `src/` (ADR-0036 §10). */
const SURFACE_STYLESHEET = "surface/Surface.css";

/** The Surface module's directory on the web, relative to `src/` (ADR-0036 §1). */
const SURFACE_MODULE = "surface/";

/**
 * The four selectors of `surface/Surface.css` that may declare `backdrop-filter` (ADR-0036 §10): the
 * scheme's glass and light glass of a Surface, and the chip's glass with and without its filter.
 */
const BACKDROP_FILTER_SELECTORS: readonly string[] = [
  '.ds-surface[data-ds-material="glass"]',
  '.ds-surface[data-ds-material="glassLight"]',
  '.ds-surface-chip[data-ds-surface-chip="glass"]',
  '.ds-surface-chip[data-ds-surface-chip="glass"][data-ds-surface-chip-flat]',
];

/** The property, prefixed or not; CSS property names are ASCII case-insensitive. */
const BACKDROP_FILTER = /^(?:-webkit-)?backdrop-filter$/i;

/**
 * A glass recipe's variable: every `--ds-material-glass-*` name but the scrim, which text over media may
 * use anywhere (ADR-0029 §1.7). The same names `lint:literals` rule `material/web-glass-recipe` reports.
 */
const GLASS_RECIPE_VARIABLE = /(?<![\w-])--ds-material-glass(?!\w)(?!-scrim(?![\w-]))[\w-]*/g;

/** A stylesheet's path relative to `src/`, with forward slashes on every platform. */
function sourcePath(file: string): string {
  return file.replaceAll("\\", "/");
}

/**
 * ADR-0036 §10, the first of the two declaration-level checks: only `surface/Surface.css` declares
 * `backdrop-filter` or `-webkit-backdrop-filter`, in any case, and there only on
 * `BACKDROP_FILTER_SELECTORS`, every selector of a list included; a declaration with no selector fails
 * as `(no selector)`, and a selector is compared, and named, as the compiled stylesheet spells it, on
 * one line. The path must be that one exactly, not a `Surface.css` in another directory. A value that
 * names the property (a `transition`), a custom property whose name ends in it, a property whose name
 * only starts like it, an at-rule's condition and a comment declare nothing. An `@apply` of a Tailwind
 * backdrop utility declares the property only after the compile, so this check does not see it;
 * `lint:literals` reports it in the source. `file` is the stylesheet's path relative to `src/`.
 */
export function backdropFilterProblems(css: string, file: string): Problem[] {
  const path = sourcePath(file);
  const problems: Problem[] = [];
  for (const rule of flattenRules(parseCss(css))) {
    for (const declaration of rule.declarations) {
      if (!BACKDROP_FILTER.test(declaration.property)) continue;
      if (path !== SURFACE_STYLESHEET) {
        problems.push({
          check: "backdrop-filter",
          detail: `${path}: ${declaration.property} outside ${SURFACE_STYLESHEET}; a component's glass part blurs through the Surface module's chip shape (ADR-0036 §7, §10)`,
        });
        continue;
      }
      const selectors = rule.selectors.length === 0 ? ["(no selector)"] : rule.selectors.map(normalizeSelector);
      for (const selector of selectors.filter((candidate) => !BACKDROP_FILTER_SELECTORS.includes(candidate))) {
        problems.push({
          check: "backdrop-filter-selector",
          detail: `${selector}: ${declaration.property} on none of the four glass selectors of ${SURFACE_STYLESHEET} (ADR-0036 §10)`,
        });
      }
    }
  }
  return problems;
}

/**
 * ADR-0036 §10, the second check: no stylesheet outside `surface/` names a glass recipe variable, as a
 * declaration's property or in its value, and each problem names every variable of its declaration once.
 * Comments are not read, and the scrim passes, but not a name longer than the scrim's; a variable whose
 * name only starts or ends like a recipe's is not one. `surface/` is the module's own directory at the
 * root of `src/`, not a `surfaces/` beside it, a `surface/` further down or a `Surface.css` elsewhere.
 * An at-rule's prelude is not read either (`@container style(--ds-material-glass-chip: …)`);
 * `lint:literals` reports a recipe variable there. `file` is the stylesheet's path relative to `src/`.
 */
export function glassRecipeProblems(css: string, file: string): Problem[] {
  const path = sourcePath(file);
  if (path.startsWith(SURFACE_MODULE)) return [];
  const problems: Problem[] = [];
  for (const rule of flattenRules(parseCss(css))) {
    for (const declaration of rule.declarations) {
      const text = `${declaration.property}: ${declaration.value}`;
      const names = new Set([...text.matchAll(GLASS_RECIPE_VARIABLE)].map((match) => match[0]));
      if (names.size === 0) continue;
      problems.push({
        check: "glass-recipe-variable",
        detail: `${rule.selectors.join(", ") || "(no selector)"} { ${declaration.property} } names ${[...names].join(", ")} outside ${SURFACE_MODULE}; a component's own cell reaches its chip as --ds--surface-chip-own (ADR-0036 §7, §10)`,
      });
    }
  }
  return problems;
}
