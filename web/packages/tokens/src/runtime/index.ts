/**
 * The framework-free web runtime of ADR-0019 §4. It imports no React, so the package's root export
 * stays usable from any framework, from a worker and from the server (ADR-0019 §4 "Package layout").
 */
export { isAxisValue, type NestableAxis, type ScopeContext } from "./axes.ts";
export { rootAttributes, scope } from "./attributes.ts";
export { readContext, watchContext } from "./context.ts";
export { mountRoot } from "./mount.ts";
export { brandTokens, clearBrandTokens, peekBrandTokens, setBrandTokens, type BrandTokens } from "./brand.ts";
