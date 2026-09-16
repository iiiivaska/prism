/**
 * How an app hands its brand's table to Prism (ADR-0020 §6, the API roadmap ticket P3-2 names).
 *
 * On the web brand is a build-time axis: a document loads exactly one brand's `tokens.css`, there is
 * no `data-ds-brand` attribute and no brand prop. JavaScript that needs brand values — canvas and
 * visx drawing code, Motion's spring physics (ADR-0025 §2) — cannot read them from CSS, so the app
 * imports the matching table and hands it over once:
 *
 * ```ts
 * import * as tokens from "@iiiivaska/prism-tokens/brands/prism-native/tokens";
 * import { setBrandTokens } from "@iiiivaska/prism-tokens";
 *
 * setBrandTokens(tokens);
 * ```
 *
 * or, in React, `<Theme tokens={tokens}>`. `@iiiivaska/prism-react` and `@iiiivaska/prism-charts`
 * import no `<brand>/tokens` module and no brand's CSS (ADR-0020 rule 13): they call `brandTokens()`.
 * Code that needs the table and has none fails; it never falls back to another brand, whose colors
 * would disagree with the stylesheet the document loaded.
 */
import type { TokenContext } from "../generated/runtime.ts";
import { isDevelopment } from "./env.ts";

/**
 * What a `<brand>/tokens` module provides. Every brand's module has the same shape (ADR-0020 rule 9),
 * so this structural type accepts any of them; `brandTokens<typeof tokens>()` recovers the precise
 * `TokenTable` and `ResolvedTokens` of the brand the app imported.
 */
export interface BrandTokens {
  /** Every `sys.*` and `comp.*` token, keyed by token path; the module's `TokenTable`. */
  readonly table: object;
  /** Every token's value for one context; the module's `ResolvedTokens` (ADR-0019 §4 item 2). */
  resolveTokens(context?: Partial<TokenContext>): object;
}

let current: BrandTokens | undefined;

/**
 * Hands a brand's table to Prism. Call it once, at start-up, with the module whose `tokens.css` the
 * document loads. Calling it again with the same module is a no-op; a second, different table is a
 * programming error (one brand per document, ADR-0020 §6) and throws in development.
 */
export function setBrandTokens(tokens: BrandTokens): void {
  if (current !== undefined && current !== tokens && isDevelopment()) {
    throw new Error(
      "setBrandTokens received a second, different brand table. A document loads one brand (ADR-0020 §6); import the other brand's tokens.css and table instead.",
    );
  }
  current = tokens;
}

/**
 * The table the app handed over. Throws when there is none, naming the call that fixes it: falling
 * back to another brand would disagree with the stylesheet the document loaded (ADR-0020 §6).
 *
 * Pass the imported module's type to keep its precise entries: `brandTokens<typeof tokens>()`.
 */
export function brandTokens<T extends BrandTokens = BrandTokens>(): T {
  if (current === undefined) {
    throw new Error(
      'No brand table. Hand one to Prism once at start-up: `import * as tokens from "@iiiivaska/prism-tokens/tokens"` (the reference brand) or "@iiiivaska/prism-tokens/brands/<brand>/tokens", then `setBrandTokens(tokens)` or `<Theme tokens={tokens}>`.',
    );
  }
  return current as T;
}

/** The table if one was handed over, else `undefined`. For code that must not throw. */
export function peekBrandTokens(): BrandTokens | undefined {
  return current;
}

/** Forgets the table. For tests and hot reloading; an app calls `setBrandTokens` once and never this. */
export function clearBrandTokens(): void {
  current = undefined;
}
