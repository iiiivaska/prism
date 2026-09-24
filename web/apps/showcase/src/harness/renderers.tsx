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
 *  - `surface: map | image` — the component sits on that synthetic backdrop (harness.css), which
 *    `ShowcaseGround` declares with the package's `Backdrop`, so the component reads the page over that
 *    kind (ADR-0036 §8.7).
 *  - `surface: <material>` on a component that renders no Surface of its own — it sits inside a
 *    Surface of that material, over `backdrop` when the material is glass.
 *  - `grid` — a 2×2, row-major, one component per cell with the cell's vivid slot.
 *
 * Divider is staged by its own entry (`renderDividerExample`), as the gallery stages it: in a rule frame,
 * and on a material in a Surface with no padding, because its `inset: content` is measured from the
 * container's edge.
 *
 * Icon is staged by its own entry (`renderIconExample`), as the gallery stages it: with no card-sized
 * frame, and on a material in a Surface hugging the glyph. Badge, IconButton and Avatar are staged the same
 * way (`renderBadgeExample`, `renderIconButtonExample`, `renderAvatarExample`).
 *
 * The props reach the component untouched, including the no-op handler the Components screen adds for
 * every `action` prop the spec declares (spec/SCHEMA.md: both galleries pass one, so an example
 * renders the component's interactive form). Two exceptions: a component whose API bundles several of the
 * spec's props into one value, which an entry here assembles rather than spreads — Card's `action`,
 * `actionIcon` and `actionLabel` are the only such props today (`cardArgs`) — and a fixture, which an entry
 * draws: Avatar's `image: { fixture: portrait }` (./portrait.ts, spec/SCHEMA.md).
 */
import type { ReactElement, ReactNode } from "react";
import {
  Avatar,
  Backdrop,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  IconButton,
  Surface,
  Text,
  iconRegistry,
  type AvatarProps,
  type BackdropKind,
  type ButtonProps,
  type CardProps,
  type DividerOrientation,
  type DividerProps,
  type IconButtonProps,
  type IconName,
  type IconProps,
  type SurfaceMaterial,
  type SurfaceProps,
  type TextProps,
  type TextRole,
  type VividSlot,
} from "@iiiivaska/prism-react";
import type { CatalogExample } from "../../plugins/catalog.ts";
import { contentFor } from "./content.ts";
import { isPortraitFixture, usePortrait } from "./portrait.ts";

/**
 * The synthetic map or image an example sits on (harness.css), declared to the components on it with the package's
 * `Backdrop` (ADR-0036 §8.7), so a component staged straight on the ground reads the page over that kind, as it
 * would over an app's own map. `Backdrop` renders no element, so the stage's markup is what it was without it.
 */
function ShowcaseGround(props: { readonly kind: "map" | "image"; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-sc-backdrop" data-ds-sc-backdrop={props.kind}>
      <span data-ds-sc-layer="blocks" aria-hidden="true" />
      <span data-ds-sc-layer="park" aria-hidden="true" />
      <span data-ds-sc-layer="water" aria-hidden="true" />
      <span data-ds-sc-layer="roads" aria-hidden="true" />
      <Backdrop kind={props.kind}>{props.children}</Backdrop>
    </div>
  );
}

function Stage(props: { readonly children: ReactNode }): ReactElement {
  return <div className="ds-sc-stage">{props.children}</div>;
}

function onBackdrop(kind: string | undefined, node: ReactNode): ReactNode {
  return kind === "map" || kind === "image" ? <ShowcaseGround kind={kind}>{node}</ShowcaseGround> : node;
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

/**
 * The frame a Divider stretches along: `size.card-min` long, with `size.row` of empty space on either side
 * of the line — the gallery's `RuleFrame` and the SwiftUI harness's `DSExampleRuleFrame`, the same numbers.
 */
function RuleFrame(props: { readonly orientation: DividerOrientation; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-sc-rule-frame" data-ds-sc-rule-frame={props.orientation}>
      {props.children}
    </div>
  );
}

/**
 * A Divider on its example's `surface`, staged exactly as `renderDividerExample` in
 * web/apps/gallery/src/harness/examples.tsx stages it: on the page, or inside a Surface of that material
 * with no padding, hugging the rule frame, over `backdrop` when the material is glass. A padded Surface
 * would apply the card padding twice to `inset: content`.
 */
export function renderDividerExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = props as unknown as DividerProps;
  const rule = (
    <RuleFrame orientation={args.orientation ?? "horizontal"}>
      <Divider {...args} />
    </RuleFrame>
  );
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{rule}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, rule)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card" padding="none">
      {rule}
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * The row an `inherit-in-row` glyph sits in: its foreground is `color.text.primary`, ListRow.yaml's
 * `title.color.default`, "the row's own foreground" the example describes, with no text of its own — the
 * gallery's `RowForeground` and the SwiftUI harness's row, the same color.
 */
function RowForeground(props: { readonly children: ReactNode }): ReactNode {
  return <div data-ds-sc-foreground="row">{props.children}</div>;
}

/**
 * An Icon on its example's `surface`, staged exactly as `renderIconExample` in
 * web/apps/gallery/src/harness/examples.tsx stages it: straight on the stage, with no card-sized frame, or
 * inside a Surface of that material with `radius: card` and its default card padding, hugging the glyph,
 * over `backdrop` when the material is glass. `tone: inherit` sits in the row foreground.
 */
export function renderIconExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = props as unknown as IconProps;
  const glyph = args.tone === "inherit" ? (
    <RowForeground>
      <Icon {...args} />
    </RowForeground>
  ) : (
    <Icon {...args} />
  );
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{glyph}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, glyph)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      {glyph}
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * A Badge on its example's `surface`, staged exactly as `renderBadgeExample` in
 * web/apps/gallery/src/harness/examples.tsx stages it, which is Icon's staging: straight on the stage, with no
 * card-sized frame, or inside a Surface of that material with `radius: card` and its default card padding,
 * hugging the badge in a flex box (`ds-sc-mark`), over `backdrop` when the material is glass.
 */
export function renderBadgeExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const mark = <Badge {...props} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{mark}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, mark)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-sc-mark">{mark}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * IconButton.yaml's `glyph` and `label` are required and never inferred, the one from the other or from anything
 * else (behavior 4, ADR-0011 rule 4), so props without a registry glyph or with a blank label cannot be staged:
 * null, the web's reading of `DSIconButtonRenderer` returning nil. The `badge` slot is the spec's mapping of
 * Badge's own props, which is `IconButtonBadge` as it stands; anything but a mapping cannot be staged either.
 */
function iconButtonArgs(props: Readonly<Record<string, unknown>>): IconButtonProps | null {
  const { glyph, label, badge } = props;
  if (typeof glyph !== "string" || !(glyph in iconRegistry)) return null;
  if (typeof label !== "string" || label.trim() === "") return null;
  const args = props as unknown as IconButtonProps;
  if (badge === undefined) return args;
  if (typeof badge !== "object" || badge === null || Array.isArray(badge)) return null;
  return { ...args, badge };
}

/**
 * An IconButton on its example's `surface`, staged exactly as `renderIconButtonExample` in
 * web/apps/gallery/src/harness/examples.tsx stages it, which is Badge's staging: straight on the stage, with no
 * card-sized frame, or inside a Surface of that material with `radius: card` and its default card padding,
 * hugging the circle in a flex box (`ds-sc-mark`), over `backdrop` when the material is glass.
 */
export function renderIconButtonExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = iconButtonArgs(props);
  if (args === null) return <Unstageable example={example} />;
  const button = <IconButton {...args} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{button}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, button)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-sc-mark">{button}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * An Avatar with its example's props, the `portrait` fixture drawn in the colours of the page's context. The props
 * are read as `renderAvatarExample` in web/apps/gallery/src/harness/examples.tsx reads them.
 */
function AvatarExample(props: { readonly args: AvatarProps; readonly image: unknown }): ReactNode {
  const portrait = usePortrait();
  return <Avatar {...props.args} image={props.image === undefined ? undefined : typeof props.image === "string" ? props.image : portrait} />;
}

/**
 * An Avatar on its example's `surface`, staged exactly as `renderAvatarExample` in
 * web/apps/gallery/src/harness/examples.tsx stages it, which is Badge's staging: straight on the stage, with no
 * card-sized frame, on the synthetic map or image declared with `Backdrop`, or inside a Surface of that material with
 * `radius: card` and its default card padding, hugging the circle in a flex box (`ds-sc-mark`), over `backdrop` when
 * the material is glass. An image prop that is neither a source nor the `portrait` fixture cannot be staged: the
 * page says so, the web's reading of `DSAvatarRenderer` returning nil.
 */
export function renderAvatarExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const { image, ...rest } = props;
  if (image !== undefined && typeof image !== "string" && !isPortraitFixture(image)) return <Unstageable example={example} />;
  const args = rest as unknown as AvatarProps;
  const avatar = <AvatarExample args={args} image={image} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{avatar}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, avatar)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-sc-mark">{avatar}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * The web twin of an Apple renderer returning nil (`DSExampleRenderer.content(for:)`): the example is in the
 * spec and this build cannot draw it, which the page says in the example's own place rather than staging
 * something else there. The sentence is the one the Apple showcase prints.
 */
function Unstageable(props: { readonly example: CatalogExample }): ReactElement {
  return (
    <Stage>
      <Text role="caption" tone="secondary">
        `{props.example.id}` is not staged here. The example is in the spec; this build cannot draw it.
      </Text>
    </Stage>
  );
}

/**
 * The one prop of Card that is not the spec's own prop.
 *
 * Card.yaml writes `action`, `actionIcon` and `actionLabel`; React carries them as the single `CardAction` the
 * spec licenses a stack to bundle them into, so `custom` cannot be written without its glyph and its name (the
 * twin of `DSCardAction.custom(glyph:label:)`). Spread untouched, the example's props would hand `Card` the bare
 * string `"custom"` — which is not a value of the prop, so the card would draw no disc at all — and leak
 * `actionIcon` and `actionLabel` onto the DOM node the rest of the props spread onto.
 *
 * null is "this build cannot stage these props", the web's reading of the Apple renderer's nil: an `action` this
 * build does not know, or a `custom` one missing its registry glyph or the name of its operation. Neither is ever
 * inferred — not from the glyph id, and not from the card's title (Card.yaml `actionIcon`, `actionLabel`;
 * ADR-0011 rule 4) — so there is nothing to draw in its place.
 *
 * The gallery reads the three props the same way, character for character (`cardArgs`,
 * `web/apps/gallery/src/harness/examples.tsx`), so one example is one card in both web apps; it throws on a null
 * instead of drawing this note, because it is the gate rather than a page.
 */
function cardArgs(props: Readonly<Record<string, unknown>>): CardProps | null {
  const { action, actionIcon, actionLabel, ...rest } = props;
  const args = rest as unknown as CardProps;
  if (action === undefined || action === "open") return { ...args, action: "open" };
  if (action === "none") return { ...args, action: "none" };
  if (action !== "custom") return null;
  if (typeof actionIcon !== "string" || !(actionIcon in iconRegistry)) return null;
  if (typeof actionLabel !== "string" || actionLabel.trim() === "") return null;
  return { ...args, action: { kind: "custom", icon: actionIcon as IconName, label: actionLabel } };
}

export function renderCardExample(props: Readonly<Record<string, unknown>>, example: CatalogExample): ReactElement {
  const args = cardArgs(props);
  if (args === null) return <Unstageable example={example} />;
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
