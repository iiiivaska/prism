// The brand kind applies to `web/packages/react/src` and `web/packages/charts/src` only: the app and
// the tokens package itself import a brand's table and its CSS, once per document (ADR-0020 §6).
import * as tokens from "@iiiivaska/prism-tokens/brands/prism-native/tokens"; // miss: brand/token-module
import "@iiiivaska/prism-tokens/brands/prism/tokens.css"; // miss: brand/stylesheet

export const table = tokens.table;
