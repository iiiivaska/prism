/**
 * The three virtual modules the app's own Vite plugins build (web/apps/showcase/plugins). They hold
 * the whole of what the app knows about Prism; nothing here is a list written by hand.
 *
 * The types are referenced with `import("…").T` rather than with an `import` statement at the top of
 * each block: an ambient module declaration resolves those uniformly, whatever order the blocks are
 * declared in.
 */
declare module "virtual:prism/catalog" {
  /** Every spec under `spec/components/`, in name order — implemented or not. */
  export const components: readonly import("../plugins/catalog.ts").CatalogSpec[];
  /** Every spec under `spec/patterns/`: contracts with no implementation manifest (ADR-0012 rule 3). */
  export const patterns: readonly import("../plugins/catalog.ts").CatalogSpec[];
  /** `implemented` of every web manifest, read as text and merged into one table. */
  export const implemented: import("../plugins/catalog.ts").ImplementedTable;
  /** The manifests that table was read from, repository-relative: what this app can honestly report. */
  export const manifests: readonly string[];
  /** Where a spec path is linked from, built from the package manifest's repository URL. */
  export const specSource: { readonly repository: string; readonly blob: string };
  /** Component name → the harness entry that stages its examples. One per manifest entry, or no build. */
  export const renderers: Readonly<Record<string, import("./harness/types.ts").ExampleRenderer>>;
}

declare module "virtual:prism/tokens" {
  /** Every entry of `@iiiivaska/prism-tokens/manifest.json`, in the manifest's own order. */
  export const tokens: readonly import("../plugins/catalog.ts").TokenManifestEntry[];
  /** The resolver modifiers; `brand` is the list the brand switcher offers. */
  export const modifiers: readonly import("../plugins/catalog.ts").TokenModifier[];
  /** Where each platform starts (ADR-0019 §2), shown on the Overview screen. */
  export const platformDefaults: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

declare module "virtual:prism/brands" {
  /** Brand id → load that brand's stylesheet, its fonts and its table. One per resolver context. */
  export const brandLoaders: Readonly<Record<string, () => Promise<import("@iiiivaska/prism-react").BrandTokens>>>;
}

declare module "virtual:prism/glyphs" {
  /** Registry id → Phosphor cut → the markup inside that cut's `<svg>`. */
  export const glyphs: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** The cuts every entry carries, in weight order. */
  export const glyphCuts: readonly string[];
}
