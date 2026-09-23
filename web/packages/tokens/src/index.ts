// The brand-invariant root export of @iiiivaska/prism-tokens (ADR-0019 §4, ADR-0020 §6): the web
// runtime table and the context types generated from tools/tokens/config.ts, plus the framework-free
// runtime of ADR-0019 §4 and the component-owned strings table of ADR-0032. It imports no React and no
// brand: a brand's values come from `./tokens` (the default brand) or `./brands/<brand>/tokens`, its
// stylesheet from `./tokens.css` or `./brands/<brand>/tokens.css`. `<Theme>`, `useTokenContext` and
// `useStrings` are in `./react`.
// Never hand-write token values here.
export {
  defaultContext,
  platformDefaults,
  webRuntime,
  type ColorScheme,
  type Contrast,
  type Density,
  type Modality,
  type Motion,
  type RuntimeAxis,
  type ScopeAttributes,
  type TokenContext,
  type Transparency,
} from "./generated/runtime.ts";

export {
  brandTokens,
  clearBrandTokens,
  isAxisValue,
  mountRoot,
  peekBrandTokens,
  readContext,
  rootAttributes,
  scope,
  setBrandTokens,
  watchContext,
  type BrandTokens,
  type NestableAxis,
  type ScopeContext,
} from "./runtime/index.ts";

/**
 * The component-owned strings of ADR-0032: Prism's English defaults for the table an app replaces at the
 * root (`<Theme strings>` in `./react`), and its types. The key list is `spec/strings.yaml`. The template
 * fill the components make is internal to `@iiiivaska/prism-react` (ADR-0032 decision 5).
 */
export { defaultStrings, type StringKey, type StringsTable } from "./runtime/strings.ts";

/** System version, stamped from VERSION by the release workflow; mirrors `DSTokensInfo.version`. */
export const version = "0.1.0";
