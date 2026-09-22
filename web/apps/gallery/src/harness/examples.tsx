/**
 * How the gallery renders a spec example (spec/SCHEMA.md "Examples and snapshots"): the example's props
 * go to the component as Storybook args; its `surface`, `backdrop` and `grid` fields choose the stage
 * around it, the same way the SwiftUI snapshot harness reads them (roadmap P3-3, P3-5).
 *
 * - `surface: map | image`: the component sits on that synthetic backdrop (harness.css).
 * - `surface: <material>` on a component that does not render a Surface itself: it sits inside a Surface
 *   of that material, over `backdrop` when the material is glass.
 * - `grid`: a 2×2, row-major, one component per cell with the cell's vivid slot.
 *
 * Surface and Text examples carry no strings, so the gallery supplies its own sample copy
 * (src/harness/content.ts); Button and Card examples carry their strings in their props.
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
  type VividSlot,
} from "@iiiivaska/prism-react";
import { contentFor } from "./content.ts";

/** The fields of a spec example beyond its props. */
export interface ExampleFields {
  readonly id: string;
  readonly surface?: string;
  readonly backdrop?: string;
  readonly grid?: readonly string[];
  readonly schemes?: readonly string[];
  readonly description?: string;
}

function Backdrop(props: { readonly kind: "map" | "image"; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-gallery-backdrop" data-ds-gallery-backdrop={props.kind}>
      <span data-ds-gallery-layer="blocks" aria-hidden="true" />
      <span data-ds-gallery-layer="park" aria-hidden="true" />
      <span data-ds-gallery-layer="water" aria-hidden="true" />
      <span data-ds-gallery-layer="roads" aria-hidden="true" />
      {props.children}
    </div>
  );
}

function Stage(props: { readonly children: ReactNode }): ReactNode {
  return <div className="ds-gallery-stage">{props.children}</div>;
}

function onBackdrop(kind: string | undefined, node: ReactNode): ReactNode {
  return kind === "map" || kind === "image" ? <Backdrop kind={kind}>{node}</Backdrop> : node;
}

function SurfaceContent(props: { readonly exampleId: string }): ReactNode {
  const content = contentFor("Surface", props.exampleId);
  return (
    <div className="ds-gallery-surface-content">
      <Text role={content.role ?? "headline"}>{content.primary}</Text>
      {content.secondary === undefined ? null : (
        <Text role="caption" tone="secondary">
          {content.secondary}
        </Text>
      )}
    </div>
  );
}

export function renderSurfaceExample(args: SurfaceProps, example: ExampleFields): ReactElement {
  const shape = args.radius === "pill" ? "pill" : "card";
  if (example.grid !== undefined) {
    return (
      <Stage>
        {onBackdrop(
          example.surface,
          <div className="ds-gallery-grid">
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
        <div className="ds-gallery-frame" data-ds-gallery-shape={shape}>
          <Surface {...args}>
            <SurfaceContent exampleId={example.id} />
          </Surface>
        </div>,
      )}
    </Stage>
  );
}

export function renderTextExample(args: TextProps, example: ExampleFields): ReactElement {
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

/**
 * A component that does not render the example's `surface` itself sits on it: on the synthetic map or
 * image, or inside a card-sized Surface of that material, over `backdrop` when the material is glass.
 */
function onExampleSurface(example: ExampleFields, node: ReactNode): ReactNode {
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return node;
  if (material === "map" || material === "image") return onBackdrop(material, node);
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <div className="ds-gallery-frame" data-ds-gallery-shape="card">
      <Surface material={material} backdrop={backdrop}>
        {node}
      </Surface>
    </div>
  );
  return onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface);
}

export function renderButtonExample(args: ButtonProps, example: ExampleFields): ReactElement {
  return <Stage>{onExampleSurface(example, <Button {...args} />)}</Stage>;
}

export function renderCardExample(args: CardProps, example: ExampleFields): ReactElement {
  if (example.grid !== undefined) {
    return (
      <Stage>
        {onBackdrop(
          example.surface,
          <div className="ds-gallery-grid">
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
        <div className="ds-gallery-frame" data-ds-gallery-shape="card">
          <Card {...args} />
        </div>,
      )}
    </Stage>
  );
}
