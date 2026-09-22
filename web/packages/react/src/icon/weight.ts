/**
 * The Phosphor cut a glyph renders (ADR-0013 decision 4): `icon.weight` is a token, and a Phosphor weight
 * is a separately drawn cut, not a stroke width a stylesheet could switch. So the value comes from
 * JavaScript, from the brand table the app hands to Prism (`<Theme tokens>` or `setBrandTokens()`,
 * ADR-0020 §6), resolved for `useTokenContext()`. The package imports no brand (rule 13), and a glyph
 * rendered without a table fails the way `useBrandTokens()` fails, instead of guessing a weight.
 */
import { useBrandTokens, useTokenContext, type BrandTokens, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { iconWeights, type PhosphorCut } from "../generated/icons.ts";

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

/** `control` is `icon.weight`, the cut of glyphs inside controls and cards; `display` is `icon.weight-display`. */
export type GlyphWeight = "control" | "display";

const WEIGHT_TOKEN: Readonly<Record<GlyphWeight, string>> = {
  control: "icon.weight",
  display: "icon.weight-display",
};

/** The Phosphor cut for a glyph weight, from the app's brand table. */
export function useGlyphCut(weight: GlyphWeight = "control"): PhosphorCut {
  const tokens = useBrandTokens();
  const context = useTokenContext();
  const value = tokenValue(tokens, WEIGHT_TOKEN[weight], context);
  if (typeof value !== "number") throw new Error(`${WEIGHT_TOKEN[weight]} is not a number in the brand table.`);
  return cutForWeight(value);
}
