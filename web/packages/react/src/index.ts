/**
 * Implemented spec version per component and platform (ADR-0006 rule 2, critic G-21), the web twin
 * of `DSComponentsManifest` in swift/Sources/DSComponents/Manifest.swift. The parity report (roadmap
 * P2-3) compares it with `specVersion` in spec/components/*.yaml. Edited by hand in the same change
 * as the component, in ./manifest.ts — the file ADR-0006 rule 2 names.
 */
export { implemented, type ImplementedVersions, type WebPlatform } from "./manifest.ts";

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
