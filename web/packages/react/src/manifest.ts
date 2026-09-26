/**
 * Implemented spec versions per component and platform (ADR-0006 rule 2, critic G-20 and G-21): the
 * web twin of `DSComponentsManifest` in `swift/Sources/DSComponents/Manifest.swift`.
 *
 * `implemented.Button["web-touch"]` is the `specVersion` of `spec/components/Button.yaml` that this
 * package implements under touch modality, so a component that ships on the desktop before the phone
 * (or the other way round) can say so (ADR-0010). The keys are the web platform keys of
 * `spec/SCHEMA.md`; the Apple keys belong to the Swift manifests, and the data-viz components to
 * `@iiiivaska/prism-charts` (ADR-0007).
 *
 * A platform with no entry is not implemented yet; the parity report prints it as `–` and, once any
 * platform implements the component, marks every `full` or `adapted` platform behind the spec.
 *
 * Edited by hand in the same change as the component, in the order of ADR-0006 rule 6: spec
 * (`specVersion`), tokens, both implementations, manifests, snapshots. `pnpm parity:report` reads
 * this literal as text, so keep it a plain object literal — string keys, integer values, no
 * expressions (the grammar is in `tools/parity/manifest.ts`, the report in `tools/parity/report.md`).
 * Every key is a named export of the package (ADR-0019 rule 11, `test/exports.test.ts`).
 */

/** The web platform keys of `spec/SCHEMA.md`; the Apple keys live in the Swift manifests. */
export type WebPlatform = "web-touch" | "web-desktop";

/** Component name → platform → the spec version this package implements there. */
export type ImplementedVersions = Readonly<Record<string, Readonly<Partial<Record<WebPlatform, number>>>>>;

export const implemented: ImplementedVersions = {
  Avatar: { "web-touch": 1, "web-desktop": 1 },
  Badge: { "web-touch": 1, "web-desktop": 1 },
  Button: { "web-touch": 5, "web-desktop": 5 },
  Card: { "web-touch": 5, "web-desktop": 5 },
  Divider: { "web-touch": 2, "web-desktop": 2 },
  Icon: { "web-touch": 3, "web-desktop": 3 },
  IconButton: { "web-touch": 1, "web-desktop": 1 },
  Surface: { "web-touch": 3, "web-desktop": 3 },
  Text: { "web-touch": 2, "web-desktop": 2 },
};
