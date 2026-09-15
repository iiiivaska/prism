// The brand-invariant root export of @iiiivaska/prism-tokens (ADR-0019 §4, ADR-0020 §6): the web
// runtime table and the context types generated from tools/tokens/config.ts. It imports no React and
// no brand: a brand's values come from `./tokens` (the default brand) or `./brands/<brand>/tokens`,
// its stylesheet from `./tokens.css` or `./brands/<brand>/tokens.css`. P3-2 adds the runtime
// functions of ADR-0019 §4. Never hand-write token values here.
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

/** System version, stamped from VERSION by the release workflow; mirrors `DSTokensInfo.version`. */
export const version = "0.1.0";
