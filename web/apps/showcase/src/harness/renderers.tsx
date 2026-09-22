/**
 * The example harness: one entry per component the web manifests implement (`web/packages/react`,
 * and `web/packages/charts` for the data-viz layer).
 *
 * `plugins/catalog.ts` imports `render<Name>Example` for every component the manifest declares, so a
 * component that ships without an entry here does not build — that is the whole anti-staleness
 * mechanism of docs/showcase.md §1, and the reason this file is hand-written while everything around
 * it is generated.
 *
 * How an example is staged is spec/SCHEMA.md's "Examples and snapshots", read exactly as
 * `web/apps/gallery/src/harness/examples.tsx` and the SwiftUI snapshot harness read it:
 *
 *  - `surface: map | image` — the component sits on that synthetic backdrop (harness.css).
 *  - `surface: <material>` on a component that renders no Surface of its own — it sits inside a
 *    Surface of that material, over `backdrop` when the material is glass.
 *  - `grid` — a 2×2, row-major, one component per cell with the cell's vivid slot.
 *
 * The props reach the component untouched, including the no-op handler the Components screen adds for
 * every `action` prop the spec declares (spec/SCHEMA.md: both galleries pass one, so an example
 * renders the component's interactive form).
 */
import type { ReactElement, ReactNode } from "react";
import {
  Button,
  Card,
  Surface,
  Text,
  type BackdropKind,
  type ButtonProps,
  type CardProps,
  type SurfaceMaterial,
  type SurfaceProps,
  type TextProps,
  type TextRole,
  type VividSlot,
} from "@iiiivaska/prism-react";
import type { CatalogExample } from "../../plugins/catalog.ts";
import { contentFor } from "./content.ts";

function Backdrop(props: { readonly kind: "map" | "image"; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-sc-backdrop" data-ds-sc-backdrop={props.kind}>
      <span data-ds-sc-layer="blocks" aria-hidden="true" />
      <span data-ds-sc-layer="park" aria-hidden="true" />
      <span data-ds-sc-layer="water" aria-hidden="true" />
      <span data-ds-sc-layer="roads" aria-hidden="true" />
      {props.children}
    </div>
  );
}

function Stage(props: { readonly children: ReactNode }): ReactElement {
  return <div className="ds-sc-stage">{props.children}</div>;
}

function onBackdrop(kind: string | undefined, node: ReactNode): ReactNode {
  return kind === "map" || kind === "image" ? <Backdrop kind={kind}>{node}</Backdrop> : node;
}

/**
 * A component that does not render the example's `surface` itself sits on it: on the synthetic map or
 * image, or inside a card-sized Surface of that material, over `backdrop` when the material is glass.
 */
function onExampleSurface(example: CatalogExample, node: ReactNode): ReactNode {
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return node;
  if (material === "map" || material === "image") return onBackdrop(material, node);
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <div className="ds-sc-frame" data-ds-sc-shape="card">
      <Surface material={material} backdrop={backdrop}>
        {node}
      </Surface>
    </div>
  );
  return onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface);
}

function SurfaceContent(props: { readonly exampleId: string }): ReactNode {
  const content = contentFor("Surface", props.exampleId);
  return (
    <div className="ds-sc-surface-content">
      <Text role={(content.role ?? "headline") as TextRole}>{content.primary}</Text>
      {content.secondary === undefined ? null : (
        <Text role="caption" tone="secondary">
          {content.secondary}
        </Text>
      )}
    </div>
  );
}

export function renderSurfaceExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = props as unknown as SurfaceProps;
  const shape = args.radius === "pill" ? "pill" : "card";
  if (example.grid !== undefined) {
    return (
      <Stage>
        {onBackdrop(
          example.surface,
          <div className="ds-sc-grid">
            {example.grid.map((slot, index) => (
              <Surface key={index} {...args} vivid={slot as VividSlot} style={{ blockSize: "100%" }}>
                <SurfaceContent exampleId={example.id} />
              </Surface>
            ))}
          </div>,
        )}
      </Stage>
    );
  }
  return (
    <Stage>
      {onBackdrop(
        example.surface,
        <div className="ds-sc-frame" data-ds-sc-shape={shape}>
          <Surface {...args}>
            <SurfaceContent exampleId={example.id} />
          </Surface>
        </div>,
      )}
    </Stage>
  );
}

export function renderTextExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = props as unknown as TextProps;
  const content = contentFor("Text", example.id);
  const text = (
    <Text {...args}>
      {content.primary}
      {content.secondary === undefined ? null : (
        <>
          <br />
          <Text role={args.role} tone="secondary">
            {content.secondary}
          </Text>
        </>
      )}
    </Text>
  );
  return <Stage>{onExampleSurface(example, text)}</Stage>;
}

export function renderButtonExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  return <Stage>{onExampleSurface(example, <Button {...(props as unknown as ButtonProps)} />)}</Stage>;
}

export function renderCardExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = props as unknown as CardProps;
  if (example.grid !== undefined) {
    return (
      <Stage>
        {onBackdrop(
          example.surface,
          <div className="ds-sc-grid">
            {example.grid.map((slot, index) => (
              <Card key={index} {...args} vivid={slot as VividSlot} />
            ))}
          </div>,
        )}
      </Stage>
    );
  }
  return (
    <Stage>
      {onBackdrop(
        example.surface,
        <div className="ds-sc-frame" data-ds-sc-shape="card">
          <Card {...args} />
        </div>,
      )}
    </Stage>
  );
}
