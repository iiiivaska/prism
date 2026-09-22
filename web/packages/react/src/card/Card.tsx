/**
 * `Card` (spec/components/Card.yaml, specVersion 2): the corner-pinned card, a `Surface` with a fixed
 * anatomy.
 *
 * - Layout (behavior 2): the header, title and caption with the optional icon ring above them, pins to
 *   the top-left with the action at the top-right padding corner; the body slot fills the middle, which
 *   may stay empty; the hero pins to the bottom-left and the aside slot to the bottom-right on the hero's
 *   baseline, wrapping below it when both cannot fit.
 * - Materials (behaviors 1, 7): `solid`, `vivid` and `glass` render that Surface material; `tinted` is a
 *   solid surface filled with color.bg.tint.accent over the page. Glass falls back inside Surface, and a
 *   selected glass card then publishes `inverse` (ADR-0022 §1.6). Title, caption and action colors follow
 *   the material the Surface publishes, and on the scheme's glass its backdrop kind (behavior 9).
 * - `action: open` makes the whole card one button: React Aria's `Pressable` gives it press, Enter and
 *   Space, its label is title, caption and hero value (`aria-labelledby`), and the nav.open glyph shows on
 *   hover or focus under pointer and always under touch. `custom` renders one solid circular button, the
 *   only pressable part. `none` is a group.
 * - Hover and press are written only on a pressable card (`action: open`). Card.yaml behavior 8 states
 *   the hover overlay without that condition, and it is the outlier: the Apple side gates it the same
 *   way, through the shared rule of `DSControlAppearance.showsHover` ("hover exists only under pointer
 *   modality, and only on a control that takes input"), so an `action: custom` or `none` card takes no
 *   hover affordance for something it cannot press. Both stacks agreeing against one spec sentence is a
 *   spec wording fix (behavior 8 and notes.platform.macos), not two implementation fixes; until it
 *   lands, `test/components.browser.test.tsx` pins this choice on both stacks' side of the argument.
 * - `isSelected` passes `selected` to the Surface and adds Card's own cue: the floating shadow and the
 *   selection outline (behavior 4).
 * - V3 (behavior 6, ADR-0030 §8): on vivid the hero holds only its value and trailing group; a `unit`
 *   joins the caption line in the header block, and the icon ring is not drawn.
 * - The radius cell follows `size` and density (behavior 10): density is read from Prism's token context,
 *   at the root and, after mount, at the card's own element, so a nested density scope counts.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop, to its root element
 *   (ADR-0019 rule 8).
 */
import {
  useCallback,
  useEffect,
  useId,
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
import type { IconName } from "../generated/icons.ts";
import { Glyph } from "../icon/Glyph.tsx";
import { Surface } from "../surface/Surface.tsx";
import type { BackdropKind, VividSlot } from "../surface/resolve.ts";
import { Text } from "../text/Text.tsx";
import { radiusCellOf, surfaceMaterialOf, surfaceRadiusOf, type CardAction, type CardHero, type CardSize, type CardVariant } from "./parts.ts";

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
  /** Default `open`: the whole card is pressable. `custom`: one solid circular button. */
  readonly action?: CardAction;
  /** Fires when the card (`open`) or its button (`custom`) is pressed. */
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
  const titleId = useId();
  const captionId = useId();
  const heroId = useId();

  const onVivid = variant === "vivid";
  const pressable = action === "open";
  const radiusCell = radiusCellOf(size, scopedDensity ?? rootDensity);
  const unitInCaption = onVivid && hero?.unit !== undefined && hero.unit !== "";
  const drawsIconRing = icon !== undefined && !onVivid;

  useEffect(() => {
    if (!isDevelopment()) return;
    if (onVivid && icon !== undefined) console.debug("Card: the icon ring is not drawn on vivid (Card.yaml behavior 6, ADR-0022 §4.2).");
    if (unitInCaption) console.debug("Card: on vivid the hero unit joins the caption line; put it in `caption` (V3, ADR-0030 §8).");
  }, [onVivid, icon, unitInCaption]);

  const hasCaption = (caption !== undefined && caption !== "") || unitInCaption;
  const labelledBy = [titleId, hasCaption ? captionId : null, hero === undefined ? null : heroId].filter((id) => id !== null).join(" ");

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
      aria-labelledby={pressable ? labelledBy : titleId}
      data-ds-variant={variant}
      data-ds-card-radius={radiusCell}
      data-ds-action={action}
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
              <Glyph name={icon} slot="card-icon" />
            </span>
          ) : null}
          <Text role="headline" id={titleId} className="ds-card-title">
            {title}
          </Text>
          {hasCaption ? (
            <Text role="caption" tone="secondary" id={captionId} className="ds-card-caption">
              {caption}
              {unitInCaption ? (
                <span data-ds-slot="card-caption-unit" data-ds-after-caption={caption !== undefined && caption !== "" ? "" : undefined}>
                  {hero?.unit}
                </span>
              ) : null}
            </Text>
          ) : null}
        </div>
        {action === "open" ? (
          <span data-ds-slot="card-action" data-ds-action="open">
            <Glyph name="nav.open" slot="card-action-glyph" />
          </span>
        ) : null}
        {action === "custom" ? (
          <span data-ds-slot="card-action" data-ds-action="custom">
            <AriaButton className="ds-card-action-button" data-ds-slot="card-action-button" aria-labelledby={titleId} onPress={onAction}>
              <Glyph name="nav.open" slot="card-action-glyph" />
            </AriaButton>
          </span>
        ) : null}
      </div>
      <div data-ds-slot="card-body">{children}</div>
      {hero === undefined && aside === undefined ? null : (
        <div data-ds-slot="card-footer">
          {hero === undefined ? null : (
            <Text
              role="metric-lg"
              tone={hero.tone ?? "primary"}
              trailing={hero.trailing}
              unit={onVivid ? undefined : hero.unit}
              id={heroId}
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
