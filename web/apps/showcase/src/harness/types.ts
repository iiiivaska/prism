/**
 * What a harness entry is. One per component in the web manifest; the catalogue names
 * `render<Name>Example` and the build fails until ./renderers.tsx exports it (docs/showcase.md §1).
 */
import type { ReactElement } from "react";
import type { CatalogExample } from "../../plugins/catalog.ts";

/**
 * Stages one spec example: the example's `props` go to the component untouched, and its `surface`,
 * `backdrop` and `grid` fields choose the stage around it — the same reading of spec/SCHEMA.md that
 * the gallery harness and the SwiftUI snapshot harness make.
 */
export type ExampleRenderer = (props: Readonly<Record<string, unknown>>, example: CatalogExample) => ReactElement;
