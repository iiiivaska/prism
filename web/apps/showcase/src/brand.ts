/**
 * Which brand this document is (ADR-0020 §6).
 *
 * On the web brand is a build-time axis: a document loads exactly one brand's `tokens.css`, there is
 * no `data-ds-brand` attribute and `setBrandTokens` throws on a second, different table. So the brand
 * control is a link that reloads the document with `?brand=<id>`, and `main.tsx` loads that brand's
 * stylesheet, its fonts and its table before mounting.
 *
 * The list of brands is the resolver's own: `modifiers` of the token manifest carries the `brand`
 * modifier with its contexts and its default. A brand that lands in the resolver is a link here.
 */
import { modifiers } from "virtual:prism/tokens";

const brandModifier = modifiers.find((modifier) => modifier.name === "brand");

/** Every brand the resolver declares, the default first. */
export const brandIds: readonly string[] = brandModifier?.contexts ?? [];

/** The brand a document loads when `?brand=` says nothing usable. */
export const defaultBrandId: string = brandModifier?.default ?? (brandIds[0] ?? "");

/** The brand this document was asked for, falling back to the resolver's default. */
export function currentBrandId(): string {
  const asked = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("brand");
  return asked !== null && brandIds.includes(asked) ? asked : defaultBrandId;
}

/** The link that reloads this document as another brand, keeping the screen you are on. */
export function brandLink(id: string): string {
  if (typeof location === "undefined") return "";
  const query = id === defaultBrandId ? "" : `?brand=${encodeURIComponent(id)}`;
  return `${location.pathname}${query}${location.hash}`;
}
