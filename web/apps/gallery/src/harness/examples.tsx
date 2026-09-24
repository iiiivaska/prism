/**
 * How the gallery renders a spec example (spec/SCHEMA.md "Examples and snapshots"): the example's props
 * go to the component as Storybook args; its `surface`, `backdrop` and `grid` fields choose the stage
 * around it, the same way the SwiftUI snapshot harness reads them (roadmap P3-3, P3-5).
 *
 * - `surface: map | image`: the component sits on that synthetic backdrop (harness.css), which `GalleryGround`
 *   declares with the package's `Backdrop`, so the component reads the page over that kind (ADR-0036 §8.7).
 * - `surface: <material>` on a component that does not render a Surface itself: it sits inside a Surface
 *   of that material, over `backdrop` when the material is glass.
 * - `grid`: a 2×2, row-major, one component per cell with the cell's vivid slot.
 *
 * Divider is staged by its own renderer (`renderDividerExample`): in a rule frame, and on a material in a
 * Surface with no padding, because its `inset: content` is measured from the container's edge.
 *
 * Icon is staged by its own renderer too (`renderIconExample`): no card-sized frame, because a 16 px glyph
 * in a `size.card-min` square is a picture of the frame; on a material, a Surface hugging the glyph. Badge,
 * IconButton and Avatar are staged the same way (`renderBadgeExample`, `renderIconButtonExample`,
 * `renderAvatarExample`).
 *
 * Surface and Text examples carry no strings, so the gallery supplies its own sample copy
 * (src/harness/content.ts); Button, Card, Icon, Badge, IconButton and Avatar examples carry their strings in
 * their props, and Divider draws none. An image prop names spec/SCHEMA.md's `portrait` fixture, which the
 * harness draws from tokens (src/harness/portrait.ts) and hands the component as its source.
 *
 * An example's props reach the component untouched, including the no-op handler the generated story adds
 * for every `action` prop the spec declares (spec/SCHEMA.md: both galleries pass one, so an example
 * renders the component's interactive form). Two exceptions: a component whose API bundles several of the
 * spec's props into one value, which the renderer assembles rather than spreads — Card's `action`,
 * `actionIcon` and `actionLabel` are the only such props today (`cardArgs`) — and a fixture, which the
 * renderer draws — Avatar's `image: { fixture: portrait }` (`AvatarExample`).
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
  type BadgeProps,
  type ButtonProps,
  type CardActionKind,
  type CardProps,
  type DividerOrientation,
  type DividerProps,
  type IconButtonProps,
  type IconName,
  type IconProps,
  type SurfaceMaterial,
  type SurfaceProps,
  type TextProps,
  type VividSlot,
} from "@iiiivaska/prism-react";
import { contentFor } from "./content.ts";
import { isPortraitFixture, usePortrait, type PortraitFixture } from "./portrait.ts";

/** The fields of a spec example beyond its props. */
export interface ExampleFields {
  readonly id: string;
  readonly surface?: string;
  readonly backdrop?: string;
  readonly grid?: readonly string[];
  readonly schemes?: readonly string[];
  readonly description?: string;
}

/**
 * The synthetic map or image an example sits on (harness.css), declared to the components on it with the package's
 * `Backdrop` (ADR-0036 §8.7), so a component staged straight on the ground reads the page over that kind, as it
 * would over an app's own map. `Backdrop` renders no element, so the stage's markup is what it was without it.
 */
function GalleryGround(props: { readonly kind: "map" | "image"; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-gallery-backdrop" data-ds-gallery-backdrop={props.kind}>
      <span data-ds-gallery-layer="blocks" aria-hidden="true" />
      <span data-ds-gallery-layer="park" aria-hidden="true" />
      <span data-ds-gallery-layer="water" aria-hidden="true" />
      <span data-ds-gallery-layer="roads" aria-hidden="true" />
      <Backdrop kind={props.kind}>{props.children}</Backdrop>
    </div>
  );
}

function Stage(props: { readonly children: ReactNode }): ReactNode {
  return <div className="ds-gallery-stage">{props.children}</div>;
}

function onBackdrop(kind: string | undefined, node: ReactNode): ReactNode {
  return kind === "map" || kind === "image" ? <GalleryGround kind={kind}>{node}</GalleryGround> : node;
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

/**
 * The frame a Divider stretches along: `size.card-min` long, with `size.row` of empty space on either side
 * of the line, so a horizontal rule is 200 × 89 at regular density and 200 × 65 at compact, and a vertical
 * one the same frame turned on its side. The frame's padding places the line, so it sits on whole pixels
 * rather than wherever centring would round it. The SwiftUI snapshot harness and both showcases stage the
 * same frame (`DSExampleRuleFrame`, and `ds-sc-rule-frame` in web/apps/showcase).
 */
function RuleFrame(props: { readonly orientation: DividerOrientation; readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-gallery-rule-frame" data-ds-gallery-rule-frame={props.orientation}>
      {props.children}
    </div>
  );
}

/**
 * A Divider on its example's `surface`: on the page, or inside a Surface of that material, over `backdrop`
 * when the material is glass. Unlike `onExampleSurface`, the Surface has no padding and no card-sized frame
 * of its own; it hugs the rule frame. `inset: content` trims the line by `space.card-padding` from the
 * container's edge, so a padded Surface would apply the card padding twice.
 */
export function renderDividerExample(args: DividerProps, example: ExampleFields): ReactElement {
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
 * `title.color.default`, "the row's own foreground" the example describes, and it holds no text, so it adds
 * nothing to what a screen reader is handed. The SwiftUI harness and the web showcase stage the same row.
 */
function RowForeground(props: { readonly children: ReactNode }): ReactNode {
  return <div data-ds-gallery-foreground="row">{props.children}</div>;
}

/**
 * An Icon on its example's `surface`, staged the same way in all four harnesses (the SwiftUI snapshots,
 * both showcases and here): straight on the stage, with no card-sized frame, or inside a Surface of that
 * material with `radius: card` and its default card padding, hugging the glyph, over `backdrop` when the
 * material is glass. `tone: inherit` sits in the row foreground (`RowForeground`).
 */
export function renderIconExample(args: IconProps, example: ExampleFields): ReactElement {
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
 * A Badge on its example's `surface`, staged the same way in all four harnesses (the SwiftUI snapshots, both
 * showcases and here), which is Icon's staging: straight on the stage, with no card-sized frame, or inside a
 * Surface of that material with `radius: card` and its default card padding, hugging the badge, over
 * `backdrop` when the material is glass. Inside the Surface the badge sits in a flex box (`ds-gallery-mark`),
 * so the Surface is as tall as the pill and no line of text around it adds height, as `DSSurfaceView` hugs
 * the badge on Apple. Only filled badges are staged over media (Badge.yaml behavior 12).
 */
export function renderBadgeExample(args: BadgeProps, example: ExampleFields): ReactElement {
  const mark = <Badge {...args} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{mark}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, mark)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-gallery-mark">{mark}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * An IconButton on its example's `surface`, staged the same way in all four harnesses (the SwiftUI snapshots,
 * both showcases and here), which is Badge's staging: straight on the stage, with no card-sized frame, or inside
 * a Surface of that material with `radius: card` and its default card padding, hugging the circle in a flex box
 * (`ds-gallery-mark`), over `backdrop` when the material is glass. The stage's padding holds the badge, which
 * overhangs the circle's top-trailing corner by `badge.offset`, and the focus ring outside the circle.
 */
export function renderIconButtonExample(args: IconButtonProps, example: ExampleFields): ReactElement {
  const button = <IconButton {...args} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{button}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, button)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-gallery-mark">{button}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * Avatar.yaml's own props, which are Avatar's props but for `image`: an example writes it as spec/SCHEMA.md's
 * `portrait` fixture, never as a source (roadmap P4-7), and `AvatarExample` draws the fixture and hands Avatar its
 * `data:` URL. A generated story's args are the example's props verbatim, so they carry the fixture.
 */
export type AvatarExampleArgs = Omit<AvatarProps, "image"> & {
  readonly image?: string | PortraitFixture;
};

/**
 * An Avatar with its example's props, the `portrait` fixture drawn in the colours of the context it renders in. An
 * image prop that names any other fixture cannot be staged, and throws the way `contentFor` throws: the gallery is the
 * canon, and a story that cannot be staged is a defect to fix, not a picture to record.
 */
function AvatarExample(props: { readonly args: AvatarExampleArgs }): ReactNode {
  const { image, ...rest } = props.args;
  const portrait = usePortrait();
  if (image !== undefined && typeof image !== "string" && !isPortraitFixture(image)) {
    throw new Error(`An Avatar example's image is ${JSON.stringify(image)}: an example fills an image's source with { fixture: portrait } and nothing else (spec/SCHEMA.md, "Slot content in examples").`);
  }
  return <Avatar {...rest} image={image === undefined ? undefined : typeof image === "string" ? image : portrait} />;
}

/**
 * An Avatar on its example's `surface`, staged the same way in all four harnesses (the SwiftUI snapshots, both
 * showcases and here), which is Badge's and IconButton's staging: straight on the stage with no card-sized frame, on
 * the synthetic map or image, which `GalleryGround` declares with the package's `Backdrop`, so the circle reads the
 * page over that kind and renders the glass chip, or inside a Surface of that material with `radius: card` and its
 * default card padding, hugging the circle in a flex box (`ds-gallery-mark`), over `backdrop` when the material is
 * glass.
 */
export function renderAvatarExample(args: AvatarExampleArgs, example: ExampleFields): ReactElement {
  const avatar = <AvatarExample args={args} />;
  const material = example.surface as SurfaceMaterial | "map" | "image" | undefined;
  if (material === undefined || material === "page") return <Stage>{avatar}</Stage>;
  if (material === "map" || material === "image") return <Stage>{onBackdrop(material, avatar)}</Stage>;
  const backdrop = (example.backdrop ?? "none") as BackdropKind;
  const surface = (
    <Surface material={material} backdrop={backdrop} radius="card">
      <div className="ds-gallery-mark">{avatar}</div>
    </Surface>
  );
  return <Stage>{onBackdrop(backdrop === "map" || backdrop === "image" ? backdrop : undefined, surface)}</Stage>;
}

/**
 * Card.yaml's own props, which are not Card's props: the spec writes `action`, `actionIcon` and
 * `actionLabel` as three, and React carries them as one `CardAction`. A generated story's args are the
 * example's props verbatim (scripts/stories.ts), so they are the spec's three, and `cardArgs` assembles
 * them; `Card` itself is never handed this shape.
 */
export type CardExampleArgs = Omit<CardProps, "action"> & {
  readonly action?: CardActionKind;
  readonly actionIcon?: IconName;
  readonly actionLabel?: string;
};

/**
 * The one prop of Card that is not the spec's own prop.
 *
 * Card.yaml writes `action`, `actionIcon` and `actionLabel`; React carries them as the single `CardAction` the
 * spec licenses a stack to bundle them into, so `custom` cannot be written without its glyph and its name (the
 * twin of `DSCardAction.custom(glyph:label:)`). Spread untouched, the example's props would hand `Card` the bare
 * string `"custom"` — which is not a value of the prop, so the card would draw no disc at all — and leak
 * `actionIcon` and `actionLabel` onto the DOM node the rest of the props spread onto.
 *
 * null is "these props cannot be staged": an `action` this build does not know, or a `custom` one missing its
 * registry glyph or the name of its operation. Neither is ever inferred — not from the glyph id, and not from the
 * card's title (Card.yaml `actionIcon`, `actionLabel`; ADR-0011 rule 4) — so there is nothing to draw in its place.
 *
 * It reads the props exactly as `cardArgs` in web/apps/showcase/src/harness/renderers.tsx reads them, so one
 * example is the same card in both web apps. What the two do with a null differs, because their jobs do: the
 * showcase is a page and says so in the example's own place, while the gallery is the canon and the gate, so it
 * throws the way `contentFor` throws — a story that cannot be staged is a defect to fix, not a picture to record.
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

export function renderCardExample(props: Readonly<Record<string, unknown>>, example: ExampleFields): ReactElement {
  const args = cardArgs(props);
  if (args === null) {
    throw new Error(
      `Card example ${example.id} cannot be staged: \`action\` is none, open or custom, and a custom action carries an \`actionIcon\` of the icon registry and a non-blank \`actionLabel\` naming the operation, neither of them inferred (Card.yaml \`actionIcon\`, \`actionLabel\`; ADR-0011 rule 4).`,
    );
  }
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
