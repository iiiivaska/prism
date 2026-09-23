/**
 * The Phosphor cut a glyph renders (ADR-0013 decision 4): `icon.weight` is a token, and a Phosphor weight
 * is a separately drawn cut, not a stroke width a stylesheet could switch. So the value comes from
 * JavaScript, from the brand table the app hands to Prism (`<Theme tokens>` or `setBrandTokens()`,
 * ADR-0020 §6), resolved for `useTokenContext()`. The package imports no brand (rule 13), and a glyph
 * rendered without a table fails the way `useBrandTokens()` fails, instead of guessing a weight.
 *
 * Icon.yaml decides the cut in three steps, and `glyphCut` takes them in order, on the style `drawnStyle`
 * leaves (behavior 6, ADR-0035: an entry with no filled drawing draws its outline for `filled`):
 *
 * 1. Behavior 3: `display` is allowed only at `lg`; asked for at `sm` or `md` it resolves to `control`, so
 *    the size wins over the weight and nothing fails (`effectiveGlyphWeight`, the twin of
 *    `DSIconAppearance.effectiveWeight(_:size:)`).
 * 2. `tokens.root.weight`: `control` binds `icon.weight` and `display` binds `icon.weight-display`
 *    (`weightToken`), whose number picks the registry rung (`cutForWeight`).
 * 3. Behavior 6: a `filled` or `duotone` glyph has one cut on the web, Phosphor's `fill` or `duotone`,
 *    which replaces the weight's (`iconStyles`, the registry's style table).
 *
 * The web has no Bold Text setting, so the rung never steps here (behavior 4).
 */
import { useBrandTokens, useTokenContext, type BrandTokens, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { iconRegistry, iconStyles, iconWeights, type IconName, type IconStyle, type PhosphorCut } from "../generated/icons.ts";
import type { GlyphSize, GlyphWeight } from "./options.ts";

/** The shape every row of a `<brand>/tokens` table has (the generated `Entry`). */
interface TableEntry {
  readonly $value?: unknown;
  readonly $values?: Readonly<Record<string, unknown>>;
}

/** Resolved tables per brand module and context, so a context-dependent token is resolved once. */
const resolvedByBrand = new WeakMap<BrandTokens, Map<string, Readonly<Record<string, unknown>>>>();

function contextKey(context: TokenContext): string {
  return [context.colorScheme, context.contrast, context.transparency, context.density, context.modality, context.motion].join(" ");
}

/** One token's value for a context: an invariant row is read directly, any other through `resolveTokens`. */
export function tokenValue(tokens: BrandTokens, path: string, context: TokenContext): unknown {
  const entry = (tokens.table as Readonly<Record<string, TableEntry | undefined>>)[path];
  if (entry === undefined) throw new Error(`The brand table has no token ${path}; it was built from another version of @iiiivaska/prism-tokens.`);
  if (entry.$values === undefined) return entry.$value;
  let byContext = resolvedByBrand.get(tokens);
  if (byContext === undefined) {
    byContext = new Map();
    resolvedByBrand.set(tokens, byContext);
  }
  const key = contextKey(context);
  let resolved = byContext.get(key);
  if (resolved === undefined) {
    resolved = tokens.resolveTokens(context) as Readonly<Record<string, unknown>>;
    byContext.set(key, resolved);
  }
  return resolved[path];
}

/** The cut of a numeric weight token: the registry's weight with that number, else the nearest one. */
export function cutForWeight(weight: number): PhosphorCut {
  let best = iconWeights.regular;
  for (const candidate of Object.values(iconWeights)) {
    if (Math.abs(candidate.number - weight) < Math.abs(best.number - weight)) best = candidate;
  }
  return best.phosphor;
}

/** Behavior 3: `display` draws only at `lg`; at `sm` and `md` it is `control`. */
export function effectiveGlyphWeight(weight: GlyphWeight, size: GlyphSize): GlyphWeight {
  return size === "lg" ? weight : "control";
}

const WEIGHT_TOKEN: Readonly<Record<GlyphWeight, string>> = {
  control: "icon.weight",
  display: "icon.weight-display",
};

/** Icon.yaml `tokens.root.weight`: the token each weight binds. */
export function weightToken(weight: GlyphWeight): string {
  return WEIGHT_TOKEN[weight];
}

/**
 * Behavior 6 and ADR-0035: the style a glyph is drawn in. `filled` is Phosphor's fill cut only for an entry that has a
 * filled drawing; an entry the registry marks `fill: false` has an SF Symbol with no fill variant, so Apple draws the
 * plain symbol, and the web draws the outline too, never a fill cut that would enclose a stroke glyph in a solid shape
 * (a tick in a solid square is a checked Checkbox). The twin of `DSIconAppearance.drawnStyle(_:for:)`.
 */
export function drawnStyle(name: IconName, style: IconStyle): IconStyle {
  return style === "filled" && !iconRegistry[name].fill ? "outline" : style;
}

/** The Phosphor cut of a glyph: the style's own cut when it has one, else the cut of the weight's token. */
export function glyphCut(weight: GlyphWeight, size: GlyphSize, style: IconStyle, tokens: BrandTokens, context: TokenContext): PhosphorCut {
  const styled = iconStyles[style];
  if (styled !== null && styled !== undefined) return styled;
  const path = weightToken(effectiveGlyphWeight(weight, size));
  const value = tokenValue(tokens, path, context);
  if (typeof value !== "number") throw new Error(`${path} is not a number in the brand table.`);
  return cutForWeight(value);
}

/** The Phosphor cut for a glyph, from the app's brand table and the token context. */
export function useGlyphCut(weight: GlyphWeight, size: GlyphSize, style: IconStyle): PhosphorCut {
  return glyphCut(weight, size, style, useBrandTokens(), useTokenContext());
}
