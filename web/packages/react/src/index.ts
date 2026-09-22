/**
 * `@iiiivaska/prism-react`: Prism's React components on React Aria Components, styled by
 * `@iiiivaska/prism-react/styles.css` over the `--ds-*` tokens (ADR-0003, ADR-0019, ADR-0025).
 *
 * Every public component that renders a DOM element accepts `ScopeAttributes` and forwards them to its
 * root element (ADR-0019 rule 8); no export carries a `DS` prefix and every key of `implemented` is a
 * named export (rule 11). The package imports no brand: values that JavaScript needs come from the table
 * the app hands to `<Theme tokens>` or `setBrandTokens()` (ADR-0020 §6, rule 13).
 */

/**
 * The web runtime of `@iiiivaska/prism-tokens/react`, re-exported (ADR-0019 §4): `<Theme>`,
 * `useTokenContext`, `scope()`, `rootAttributes()` and the brand-table handover, so an app needs one
 * import for the root and the components.
 */
export {
  Theme,
  brandTokens,
  defaultContext,
  mountRoot,
  peekBrandTokens,
  platformDefaults,
  readContext,
  rootAttributes,
  scope,
  setBrandTokens,
  useBrandTokens,
  useTokenContext,
  watchContext,
  webRuntime,
  type BrandTokens,
  type ColorScheme,
  type Contrast,
  type Density,
  type Modality,
  type Motion,
  type ScopeAttributes,
  type ThemeProps,
  type TokenContext,
  type Transparency,
} from "@iiiivaska/prism-tokens/react";

/**
 * Implemented spec version per component and platform (ADR-0006 rule 2, critic G-21), the web twin
 * of `DSComponentsManifest` in swift/Sources/DSComponents/Manifest.swift. The parity report (roadmap
 * P2-3) compares it with `specVersion` in spec/components/*.yaml. Edited by hand in the same change
 * as the component, in ./manifest.ts — the file ADR-0006 rule 2 names.
 */
export { implemented, type ImplementedVersions, type WebPlatform } from "./manifest.ts";

/** Surface (spec/components/Surface.yaml, specVersion 3). */
export { Surface, type SurfaceProps } from "./surface/Surface.tsx";
/**
 * What the nearest Surface publishes. Only Surface resolves and publishes a material (ADR-0022 rule 1),
 * so the context itself and the resolver stay inside the package.
 */
export { useSurfaceContext, type SurfaceContextValue } from "./surface/context.ts";
export {
  backdropKinds,
  surfaceElevations,
  surfaceMaterials,
  surfacePaddings,
  surfaceRadii,
  vividSlots,
  type BackdropKind,
  type SurfaceElevation,
  type SurfaceMaterial,
  type SurfacePadding,
  type SurfaceRadius,
  type VividSlot,
} from "./surface/resolve.ts";

/** Text (spec/components/Text.yaml, specVersion 2). */
export { Text, type HeadingLevel, type TextProps } from "./text/Text.tsx";
export {
  textNumerics,
  textRoles,
  textTones,
  textTruncations,
  type TextNumeric,
  type TextRole,
  type TextTone,
  type TextTruncation,
} from "./text/tones.ts";

/** Button (spec/components/Button.yaml, specVersion 3), on React Aria Components' `Button`. */
export { Button, type ButtonProps } from "./button/Button.tsx";
export { buttonSizes, buttonVariants, type ButtonSize, type ButtonVariant } from "./button/variants.ts";

/** Card (spec/components/Card.yaml, specVersion 5): the corner-pinned card on a Surface. */
export { Card, type CardProps } from "./card/Card.tsx";
export {
  cardAccessibleName,
  cardActions,
  cardNameSeparator,
  cardSizes,
  cardUnitSeparator,
  cardVariants,
  type CardAction,
  type CardActionKind,
  type CardCustomAction,
  type CardHero,
  type CardName,
  type CardSize,
  type CardVariant,
} from "./card/parts.ts";

/**
 * The icon registry (ADR-0013, ADR-0019 §6, critic G-20): the map is `iconRegistry` and the component
 * that reads it is `Icon`, so both live in this package. Generated from spec/icons/registry.json by
 * `pnpm icons:build`; it carries Phosphor names only, never an SF Symbol name (ADR-0013 rule 5).
 */
export {
  iconRegistry,
  iconRegistryVersion,
  iconSizes,
  iconSource,
  iconStyles,
  iconWeights,
  type IconEntry,
  type IconName,
  type IconSize,
  type IconStyle,
  type IconWeight,
  type PhosphorCut,
} from "./generated/icons.ts";
