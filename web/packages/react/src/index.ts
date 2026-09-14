/**
 * Implemented spec version per component (ADR-0006), the web twin of `DSComponentsManifest` in
 * swift/Sources/DSComponents/Manifest.swift. The parity report (roadmap P2-3) compares it with
 * `specVersion` in spec/components/*.yaml. Edited by hand in the same change as the component;
 * the first components arrive with P3-4.
 */
export const implemented: Readonly<Record<string, number>> = {};
