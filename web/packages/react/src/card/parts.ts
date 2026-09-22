/**
 * The enums of spec/components/Card.yaml (specVersion 5) and the choices Card makes in React: which
 * Surface material a variant renders, which `root.radius` cell a card takes, the line budget of the
 * header block, the separator that joins the vivid unit to the caption, and the composition of a
 * card's accessible name. test/card.test.tsx reads the spec and checks them.
 */
import type { Density } from "@iiiivaska/prism-tokens";
import type { IconName } from "../generated/icons.ts";
import type { SurfaceMaterial, SurfaceRadius } from "../surface/resolve.ts";
import type { TextTone } from "../text/tones.ts";

/** Card.yaml `variant`. */
export const cardVariants = ["solid", "vivid", "glass", "tinted"] as const;
export type CardVariant = (typeof cardVariants)[number];

/** Card.yaml `action`, the three kinds; `CardAction` is the value a card is given. */
export const cardActions = ["none", "open", "custom"] as const;
export type CardActionKind = (typeof cardActions)[number];

/**
 * The `custom` action: Card.yaml's one solid circular disc, with the two things the spec makes required
 * of it — `actionIcon`, "a registry id, required with `action: custom` and never inferred from the
 * card", and `actionLabel`, what the operation does, "never inferred from the glyph id, and never the
 * title" (ADR-0011 rule 4: every icon-only control has a registry label). A pause, a delete and an open
 * are three different operations behind one shape, so neither can be defaulted.
 *
 * Card.yaml `action` licenses a stack to bundle the three props into one value "as long as `custom`
 * cannot be written without them", which is what this object is; the web twin of
 * `DSCardAction.custom(glyph:label:)` (swift/Sources/DSComponents/Card/DSCardOptions.swift).
 */
export interface CardCustomAction {
  readonly kind: "custom";
  /** A registry id of spec/icons/registry.json, drawn at `action.iconSize`. */
  readonly icon: IconName;
  /** The button's accessibility name and its pointer tooltip: the operation ("Pause line 4"). */
  readonly label: string;
}

/**
 * Card.yaml `action`, `actionIcon` and `actionLabel` in one value: `none`, `open`, or one custom action
 * with its glyph and its name. The bare string `"custom"` is not a value of this prop — the payload is
 * part of the case, as it is on the Apple side, so a custom action cannot be written without the two
 * things it needs (Card.yaml `action`, `usage.dont`).
 */
export type CardAction = "none" | "open" | CardCustomAction;

/** The kind of an action, for the rules that do not need the glyph or the name (`DSCardActionKind`). */
export function cardActionKind(action: CardAction): CardActionKind {
  return typeof action === "string" ? action : action.kind;
}

/**
 * Whether the whole card is the button (Card.yaml behavior 3 with `accessibility.role`): "A card is
 * pressable when `action: open` and `onAction` is set". A card that is announced and focused as a
 * button but activates nothing is a dead control, as `DSCardAppearance.isPressable(_:hasAction:)` has
 * it on the Apple side. `custom` puts the press on its disc alone, and `none` is a group.
 *
 * It is also the test for the open glyph and for the hover cue: behavior 4 draws no glyph on an `open`
 * card with no handler, and behavior 11 gives a card with nothing to press no hover cue.
 */
export function isCardPressable(action: CardAction, hasAction: boolean): boolean {
  return action === "open" && hasAction;
}

/**
 * Card.yaml behavior 15: "The title takes two lines at most and the caption one, both truncating with an
 * ellipsis". The header block (ADR-0022 §4.1) is that budget, so a long title truncates instead of
 * growing the header, pushing the hero down and overflowing a card whose size the grid sets. The Apple
 * side clamps to the same two numbers (`DSCardAppearance.titleLines`, `.captionLines`).
 */
export const cardTitleLines = 2;
export const cardCaptionLines = 1;

/**
 * Card.yaml behavior 9: what joins the hero's unit to the caption line on vivid — a space, a middle dot and a
 * space, so a caption of `Dollars per batch` with a unit of `kg` is the one line `Dollars per batch · kg`.
 *
 * It is text inside the caption element, never a margin between two boxes: the caption's own text content carries
 * the break, and so does the caption part of the single name a pressable card carries (`cardCaptionLine`, which
 * composes both). Without it the caption read "Dollars per batchkg" to a screen reader while the pixels looked
 * right. Apple writes the same string as `DSCardAppearance.unitSeparator`; a card with no caption shows the unit
 * alone, with no leading separator.
 */
export const cardUnitSeparator = " · ";

/**
 * Card.yaml `accessibility.label`: what joins the parts of a pressable card's name — a comma and a space,
 * the pause an assistive technology reads between them. Apple writes the same string
 * (`DSCardName.separator`, `swift/Sources/DSComponents/Card/DSCard.swift`).
 */
export const cardNameSeparator = ", ";

/**
 * The caption line the header draws: the caption, and on vivid the hero's unit joined to it by
 * `cardUnitSeparator` (behavior 9), or that unit alone when the card has no caption of its own. An empty
 * string is no caption and no unit.
 *
 * One function for the line that is drawn and the line the name reads, so the separator lands in both
 * (`DSCardCaptionLine` on Apple).
 */
export function cardCaptionLine(caption: string | undefined, unit: string | undefined, onVivid: boolean): string | undefined {
  const text = caption === undefined || caption === "" ? undefined : caption;
  const joined = onVivid && unit !== undefined && unit !== "" ? unit : undefined;
  if (joined === undefined) return text;
  return text === undefined ? joined : `${text}${cardUnitSeparator}${joined}`;
}

/**
 * The hero as `Text` speaks a metric: the value with its trailing group straight after it and, off vivid, a
 * space and the unit ("86.4 %") — the string Text already gives that element. On vivid the unit is on the
 * caption line instead (behavior 9), so the name does not say it a second time. `DSCardParts.spokenHero`
 * composes the same string.
 */
export function cardSpokenHero(hero: CardHero | undefined, onVivid: boolean): string | undefined {
  if (hero === undefined) return undefined;
  const value = `${hero.value}${hero.trailing ?? ""}`;
  if (onVivid || hero.unit === undefined || hero.unit === "") return value;
  return `${value} ${hero.unit}`;
}

/** What a card's accessible name is composed of: the props it draws its header and hero from. */
export interface CardName {
  readonly variant: CardVariant;
  readonly title: string;
  readonly caption?: string;
  readonly hero?: CardHero;
  /** A pressable card is one element and carries all three parts; a group is named by its title alone. */
  readonly pressable: boolean;
}

/**
 * Card.yaml `accessibility.label`, as one string: the title, the caption line and the hero, in that reading
 * order, joined by `cardNameSeparator`, with a part the card does not draw left out along with its
 * separator. A card that is not pressable is a group named by its title alone, because its caption and hero
 * are then elements of their own and reading them into the group's name would say them twice.
 *
 * It is written into `aria-label` rather than gathered from the parts with `aria-labelledby`: that attribute
 * concatenates the referenced elements with a space, which is not this rule and not what
 * `DSCardName.spoken(title:caption:)` composes on Apple. The same props therefore name a card the same way
 * on both stacks, character for character.
 */
export function cardAccessibleName(card: CardName): string {
  const onVivid = card.variant === "vivid";
  const parts = card.pressable
    ? [card.title, cardCaptionLine(card.caption, card.hero?.unit, onVivid), cardSpokenHero(card.hero, onVivid)]
    : [card.title];
  return parts.filter((part) => part !== undefined && part !== "").join(cardNameSeparator);
}

/** Card.yaml `size`. */
export const cardSizes = ["compact", "regular", "large"] as const;
export type CardSize = (typeof cardSizes)[number];

/** Card.yaml `hero`: rendered with Text `metric-lg`; `unit` joins the caption line on vivid (V3). */
export interface CardHero {
  readonly value: string;
  /** The dimmed trailing group (`.4` of `86.4`). */
  readonly trailing?: string;
  /** The hung unit; on vivid it moves into the caption line (ADR-0030 §8). */
  readonly unit?: string;
  /** Default `primary`. */
  readonly tone?: TextTone;
}

/**
 * The Surface material a variant asks for (Card.yaml behavior 1). `tinted` publishes `solid`, never
 * `page`: its fill is color.bg.tint.accent over the color.bg.page every opaque surface paints under
 * itself (behavior 10, ADR-0030 §5.1), so its text takes the standard tones and its selection cue is the
 * solid outline color.border.strong. Glass may still fall back inside Surface.
 */
export function surfaceMaterialOf(variant: CardVariant): SurfaceMaterial {
  switch (variant) {
    case "solid":
    case "tinted":
      return "solid";
    case "vivid":
      return "vivid";
    case "glass":
      return "glass";
  }
}

/**
 * The `root.radius` cell (behavior 13): `size: large` takes comp.card.radius.large, `size: compact` and
 * compact density take comp.card.radius.compact, and everything else comp.card.radius.regular.
 */
export function radiusCellOf(size: CardSize, density: Density): CardSize {
  if (size === "large") return "large";
  return size === "compact" || density === "compact" ? "compact" : "regular";
}

/** The Surface radius that carries the same `sys.radius.*` token as a card radius cell. */
export const surfaceRadiusOf: Readonly<Record<CardSize, SurfaceRadius>> = {
  compact: "cardCompact",
  regular: "card",
  large: "cardLarge",
};
