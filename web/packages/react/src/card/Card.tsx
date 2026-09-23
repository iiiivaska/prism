/**
 * `Card` (spec/components/Card.yaml, specVersion 5): the corner-pinned card, a `Surface` with a fixed
 * anatomy.
 *
 * - Layout (behavior 2): the header, title and caption with the optional icon ring above them, pins to
 *   the top-left with the action at the top-right padding corner; the body slot fills the middle, which
 *   may stay empty; the hero pins to the bottom-left and the aside slot to the bottom-right on the hero's
 *   baseline, wrapping below it when both cannot fit.
 * - The three rows are `root.gap` apart at the minimum (behavior 17), the `row-gap` of `.ds-card`. A card
 *   with no children renders no body slot at all, as `DSCardAnatomy` draws none when `hasContent` is
 *   false, so a content-sized card keeps one gap between its header and its footer on both stacks.
 * - Materials (behaviors 1, 10): `solid`, `vivid` and `glass` render that Surface material; `tinted` is a
 *   solid surface filled with color.bg.tint.accent over the page. Glass falls back inside Surface, and a
 *   selected glass card then publishes `inverse` (ADR-0022 §1.6). Title, caption and action colors follow
 *   the material the Surface publishes, and on the scheme's glass its backdrop kind (behavior 12).
 * - `action: open` with an `onAction` makes the whole card one button: React Aria's `Pressable` gives it
 *   press, Enter and Space, its name is the title, the caption line and the hero joined by
 *   `cardNameSeparator` (`cardAccessibleName`, written into `aria-label` so the string is the rule's and not
 *   the browser's space-joined reading of `aria-labelledby`), and the nav.open glyph shows on hover or focus
 *   under pointer and always under touch. Without a handler there is nothing to press, so the card stays a
 *   group named by its title alone, its caption and hero read as the elements they are: "role: button when
 *   pressable (`action: open` with an `onAction`), otherwise group" (Card.yaml accessibility), the same rule as
 *   `DSCardAppearance.isPressable(_:hasAction:)`. `custom` renders one solid circular button carrying its
 *   own glyph and its own name, the only pressable part. `none` is a group.
 * - The open glyph is the cue that the card opens, not decoration (Card.yaml behavior 4, specVersion 3),
 *   so an `open` card with no `onAction` draws no glyph and no control, under pointer and under touch
 *   alike, and its header is laid out as `action: none` lays it out. `DSCardAppearance.showsOpenGlyph`
 *   takes pressability the same way.
 * - Every glyph is Icon's box (`IconPart`, Icon.yaml): the icon ring's at `size.icon.md` in Icon's
 *   `primary` tone, the tone `DSCardIconRing` draws, and the action's at `size.icon.sm` with `tone:
 *   inherit`, so it takes `action.color` or the disc's glyph color. None carries a `label`, so none is
 *   read: the card's name and the custom action's `label` say what they mean.
 * - Hover and press are written only on a pressable card (`action: open` with a handler), which is what
 *   Card.yaml behavior 11 now says: "a card with nothing to press takes no hover cue". The Apple side
 *   reaches it through the shared rule of `DSControlAppearance.showsHover` ("hover exists only under
 *   pointer modality, and only on a control that takes input").
 * - `isSelected` passes `selected` to the Surface and adds Card's own cue: the floating shadow and the
 *   selection outline (behavior 7).
 * - V3 (behavior 9, ADR-0030 §8): on vivid the hero holds only its value and trailing group; a `unit`
 *   joins the caption line in the header block, `cardUnitSeparator` between them — text inside the
 *   caption, the same string `DSCardAppearance.unitSeparator` holds, so the caption's own text content
 *   carries the break and so does the caption part of the name (`cardCaptionLine` composes both, and the
 *   hero then drops the unit it no longer carries). The icon ring is not drawn.
 * - The header geometry is behavior 14, one set of numbers for both stacks: the affordance takes one
 *   `action.size` box whichever it is, with the open glyph centred in it, and the heading is separated
 *   from it by the header's `gap` (`header.gap`). On vivid the heading reserves that block even when no
 *   affordance is drawn, because it is the region Surface cuts the grain and the bloom out of (ADR-0022
 *   §4.1); off vivid a card with no affordance gives the heading the whole content width. The Apple side
 *   reserves the same room in `DSCardAppearance.headerTrailingSpace(on:actionWidth:_:)`.
 * - Title and caption carry the header block's line budget (behavior 15): two lines and one, both with
 *   an ellipsis, so a long title truncates rather than growing the header and overflowing the card.
 * - The radius cell follows `size` and density (behavior 13): density is read from Prism's token context,
 *   at the root and, after mount, at the card's own element, so a nested density scope counts.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Button as AriaButton, Pressable, type PressEvent } from "react-aria-components";
import { readContext, useTokenContext, type Density, type ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { isDevelopment } from "../env.ts";
import { iconRegistry, type IconName } from "../generated/icons.ts";
import { IconPart } from "../icon/Icon.tsx";
import { Surface } from "../surface/Surface.tsx";
import type { BackdropKind, VividSlot } from "../surface/resolve.ts";
import { Text } from "../text/Text.tsx";
import {
  cardAccessibleName,
  cardActionKind,
  cardCaptionLine,
  cardCaptionLines,
  cardTitleLines,
  cardUnitSeparator,
  isCardPressable,
  radiusCellOf,
  surfaceMaterialOf,
  surfaceRadiusOf,
  type CardAction,
  type CardCustomAction,
  type CardHero,
  type CardSize,
  type CardVariant,
} from "./parts.ts";

export interface CardProps extends ScopeAttributes, Omit<HTMLAttributes<HTMLDivElement>, "title" | "color" | "role" | "children"> {
  /** Default `solid`. */
  readonly variant?: CardVariant;
  /** The gradient slot of a vivid card; unset takes gradient.vivid.default. */
  readonly vivid?: VividSlot;
  readonly title: string;
  /** On vivid it also carries the hero's unit (V3). */
  readonly caption?: string;
  /** A registry id drawn in the hairline icon ring above the title; not drawn on vivid. */
  readonly icon?: IconName;
  /**
   * Default `open`: with an `onAction`, the whole card is pressable and draws the nav.open glyph;
   * without one it draws neither. `{ kind: "custom", icon, label }` bundles Card.yaml's `action`,
   * `actionIcon` and `actionLabel` into the one value the spec licenses a stack to use, so `custom`
   * cannot be written without its glyph and its name — a custom operation is not the card's title.
   * `none` is a group.
   */
  readonly action?: CardAction;
  /** Fires when the card (`open`) or its disc (`custom`) is pressed; without it there is no control. */
  readonly onAction?: (event: PressEvent) => void;
  /** The bottom-left metric. */
  readonly hero?: CardHero;
  /** Default `regular`. */
  readonly size?: CardSize;
  /** What the card sits on; glass renders only over image, map or vivid. Default `none`. */
  readonly backdrop?: BackdropKind;
  /** Default false. */
  readonly isSelected?: boolean;
  /** The bottom-right slot: meta text of 24 px or more on vivid, or a Sparkline. */
  readonly aside?: ReactNode;
  /** The body slot, between the header and the hero. */
  readonly children?: ReactNode;
  readonly ref?: Ref<HTMLDivElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (typeof ref === "function") ref(value);
  else if (ref !== null && ref !== undefined) (ref as { current: T }).current = value;
}

/** `useLayoutEffect` warns during server rendering, where there is nothing to measure. */
const useIsomorphicLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/**
 * The two things a `custom` action must carry, checked in development where the types cannot reach: an
 * untyped caller, or a label built at runtime from an empty string. Card.yaml makes `actionIcon` and
 * `actionLabel` required with `action: custom` and "never inferred", and ADR-0011 rule 4 gives every
 * icon-only control a registry label; a disc with a blank name is announced by nothing and a glyph
 * outside the registry is not a Prism icon.
 */
function checkCustomAction(action: CardCustomAction): void {
  if (!isDevelopment()) return;
  if (typeof action.label !== "string" || action.label.trim() === "") {
    console.error("Card: a custom action needs a `label` naming the operation; the card's title names its content, not the action (Card.yaml `actionLabel`, ADR-0011 rule 4).");
  }
  if (!(action.icon in iconRegistry)) {
    console.error(`Card: the custom action's icon "${action.icon}" is not an id of the icon registry (spec/icons/registry.json, ADR-0013).`);
  }
}

export function Card(props: CardProps): ReactNode {
  const {
    variant = "solid",
    vivid,
    title,
    caption,
    icon,
    action = "open",
    onAction,
    hero,
    size = "regular",
    backdrop = "none",
    isSelected = false,
    aside,
    children,
    className,
    onPointerEnter,
    onPointerLeave,
    ref,
    ...rest
  } = props;

  const rootDensity = useTokenContext().density;
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [scopedDensity, setScopedDensity] = useState<Density | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (element !== null) setScopedDensity(readContext(element).density);
  }, [element, rootDensity]);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node);
      assignRef(ref, node);
    },
    [ref],
  );

  const [isPressed, setPressed] = useState(false);
  const [isHovered, setHovered] = useState(false);

  const onVivid = variant === "vivid";
  const kind = cardActionKind(action);
  const custom = typeof action === "string" ? null : action;
  const hasHandler = onAction !== undefined;
  const pressable = isCardPressable(action, hasHandler);
  const radiusCell = radiusCellOf(size, scopedDensity ?? rootDensity);
  const unitInCaption = onVivid && hero?.unit !== undefined && hero.unit !== "";
  const drawsIconRing = icon !== undefined && !onVivid;

  // The name and the glyph are checked while the card renders, not in an effect: an unnamed control is
  // shipped by a server render too, and there the effects never run.
  if (custom !== null) checkCustomAction(custom);

  useEffect(() => {
    if (!isDevelopment()) return;
    if (onVivid && icon !== undefined) console.debug("Card: the icon ring is not drawn on vivid (Card.yaml behavior 9, ADR-0022 §4.2).");
    if (unitInCaption) console.debug("Card: on vivid the hero unit joins the caption line; put it in `caption` (V3, ADR-0030 §8).");
    if (kind === "open" && !hasHandler) {
      console.debug("Card: `action: open` makes the whole card pressable only with an `onAction`; without one it stays a group and draws no open glyph (Card.yaml behavior 4).");
    }
    if (kind === "custom" && !hasHandler) {
      console.debug("Card: a custom action without an `onAction` is drawn as a labelled disc, not a button (Card.yaml behavior 5).");
    }
  }, [onVivid, icon, unitInCaption, kind, hasHandler]);

  const hasCaptionText = caption !== undefined && caption !== "";
  const captionLine = cardCaptionLine(caption, hero?.unit, onVivid);
  const hasCaption = captionLine !== undefined;
  // Behavior 2 and 17: the body slot is drawn only when the card was given one, so an empty card keeps one
  // `root.gap` between its header and its footer instead of two around a box of nothing.
  const hasBody = children !== undefined && children !== null && children !== false;
  // Card.yaml `accessibility.label`: the name is composed here, not gathered by `aria-labelledby`, which
  // would concatenate the title, the caption line and the hero with a space instead of the comma the rule
  // asks for and Apple writes (`DSCardName`). A group takes its title alone.
  const name = cardAccessibleName({ variant, title, caption, hero, pressable });

  const card = (
    <Surface
      {...rest}
      ref={setRefs}
      className={joinClassNames("ds-card", className)}
      material={surfaceMaterialOf(variant)}
      vivid={vivid}
      radius={surfaceRadiusOf[radiusCell]}
      padding="card"
      backdrop={backdrop}
      selected={isSelected}
      role={pressable ? "button" : "group"}
      aria-label={name}
      data-ds-variant={variant}
      data-ds-card-radius={radiusCell}
      data-ds-action={kind}
      data-pressed={pressable && isPressed ? "" : undefined}
      data-hovered={pressable && isHovered ? "" : undefined}
      onPointerEnter={(event: PointerEvent<HTMLDivElement>) => {
        onPointerEnter?.(event);
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={(event: PointerEvent<HTMLDivElement>) => {
        onPointerLeave?.(event);
        setHovered(false);
      }}
    >
      <span data-ds-slot="card-overlay" aria-hidden="true" />
      <div data-ds-slot="card-header">
        <div data-ds-slot="card-heading">
          {drawsIconRing && icon !== undefined ? (
            <span data-ds-slot="card-icon-ring">
              <IconPart slot="card-icon" name={icon} size="md" tone="primary" />
            </span>
          ) : null}
          <Text role="headline" className="ds-card-title" truncation="ellipsis" maxLines={cardTitleLines}>
            {title}
          </Text>
          {hasCaption ? (
            <Text role="caption" tone="secondary" className="ds-card-caption" truncation="ellipsis" maxLines={cardCaptionLines}>
              {caption}
              {unitInCaption ? (
                // Behavior 9: the separator is part of the caption's text, so the line reads "Per batch · kg"
                // wherever the caption is read — on screen, in `textContent`, and in the one name a pressable
                // card carries. What this element reads is `cardCaptionLine`, the name's own caption part.
                <span data-ds-slot="card-caption-unit">{hasCaptionText ? `${cardUnitSeparator}${hero?.unit ?? ""}` : hero?.unit}</span>
              ) : null}
            </Text>
          ) : null}
        </div>
        {pressable ? (
          <span data-ds-slot="card-action" data-ds-action="open">
            <IconPart slot="card-action-glyph" name="nav.open" size="sm" tone="inherit" />
          </span>
        ) : null}
        {custom === null ? null : (
          <span data-ds-slot="card-action" data-ds-action="custom">
            {hasHandler ? (
              <AriaButton className="ds-card-action-button" data-ds-slot="card-action-button" aria-label={custom.label} onPress={onAction}>
                <IconPart slot="card-action-glyph" name={custom.icon} size="sm" tone="inherit" />
              </AriaButton>
            ) : (
              // Nothing to press: the disc keeps its look and its name and is not a control, the way
              // `DSCardActionCircle` draws a `DSCardActionDisc` when its action is nil.
              <span className="ds-card-action-button" data-ds-slot="card-action-button" role="img" aria-label={custom.label}>
                <IconPart slot="card-action-glyph" name={custom.icon} size="sm" tone="inherit" />
              </span>
            )}
          </span>
        )}
      </div>
      {hasBody ? <div data-ds-slot="card-body">{children}</div> : null}
      {hero === undefined && aside === undefined ? null : (
        <div data-ds-slot="card-footer">
          {hero === undefined ? null : (
            <Text
              role="metric-lg"
              tone={hero.tone ?? "primary"}
              trailing={hero.trailing}
              unit={onVivid ? undefined : hero.unit}
              className="ds-card-hero"
            >
              {hero.value}
            </Text>
          )}
          {aside === undefined ? null : <div data-ds-slot="card-aside">{aside}</div>}
        </div>
      )}
    </Surface>
  );

  return pressable ? (
    <Pressable onPress={onAction} onPressChange={setPressed}>
      {card}
    </Pressable>
  ) : (
    card
  );
}
