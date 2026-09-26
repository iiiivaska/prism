/**
 * `Chip` (spec/components/Chip.yaml, specVersion 1): a small pill with one short label, a leading glyph or
 * Avatar, and a trailing glyph or a remove control.
 *
 * - The root is the pill, and the Surface module's glass chip (ADR-0036 §2 to §7): `useSurfaceChip` resolves
 *   Chip's `root.background` cell on the ground the pill reads (`chipBackground`, ./parts.ts) and the root carries
 *   its props — the rendering, whether glass renders without a backdrop filter, and the context the chip publishes
 *   as `data-ds-surface` and `data-ds-backdrop`. Surface.css paints the pill: the chip recipe over a map, an image,
 *   vivid or the scheme's glass; `comp.chip.bg.rest` elsewhere, which Chip.css hands the chip as
 *   `--ds--surface-chip-own`; nothing on accent and inverse; and under Reduce Transparency and Increase Contrast the
 *   fallback, `color.bg.surface.raised` over `color.bg.page`, decided in React before the stylesheet sees it. Chip
 *   reads no setting and never sets the root's background (ADR-0036 rule 2). The root also carries the press scale
 *   and the disabled opacity, so they sit on the element that carries the backdrop filter and keep the blur
 *   (ADR-0036 F4, rule 13).
 * - The role follows from the props alone (behavior 1, ./parts.ts `chipKind`): a chip that sets `isSelected`,
 *   true or false, is a filter, React Aria's `ToggleButton`, whose `aria-pressed` is `isSelected`; one that leaves
 *   it unset and has `onPress` or `isRemovable` is React Aria's `Button`; and one with none of the three is a
 *   static label, a `span`. That control, the body, covers the pill and holds its content, and it paints the
 *   layers over whatever the chip renders: the hover overlay, the pressed fill and the stroke. So no press or hover
 *   ever changes what the chip shape is handed (ADR-0037 §5), and the body's own `data-pressed` is lifted onto the
 *   root only to scale it.
 * - The other parts read what the chip publishes, never the ground: the label, the glyphs, the check and the stroke
 *   take Chip's own cells from the root's `data-ds-surface`, `data-ds-backdrop` and `data-ds-selected` (Chip.css),
 *   and sit inside `SurfaceChipScope`, so a glyph and the Avatar read the published context and the enclosure too.
 *   Under the fallback the chip publishes `(raised, none)`, so every part takes its `default` cell and the check is
 *   not drawn, by construction (ADR-0036 §4). The label is Text and the glyphs are Icon's box with
 *   `tone: inherit`: the tone tables would give `on-vivid` on vivid, where Chip binds `color.text.on-glass-fill`.
 * - The leading position holds, in one order, status.check while a selected chip sits over media or on inverse;
 *   the Avatar, on the md chip; or `leadingIcon`. The Avatar is drawn at size sm and decorative, so the body's name
 *   is the label alone; it is a chip inside a chip, and reads the enclosure the pill hands it (ADR-0037): flat
 *   glass where the pill renders glass, its own cell where the pill renders its own or falls back.
 * - `isRemovable` takes the trailing position: the body keeps a glyph-sized space there, and the remove control, a
 *   second React Aria `Button` beside the body — never inside it, since a button holds no control — sits over
 *   that space and draws nav.close. It is named by the app's `strings.Chip.remove` template filled with the
 *   label (`chipRemoveName`), so React Aria's own remove string never supplies it, and it fires `onRemove` without
 *   firing `onPress`. Delete and Backspace on the body fire it too.
 * - Chip plays no haptic on the web: the registry maps haptic.impact.light to `web: none`.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop it does not withhold, to its root
 *   element (ADR-0019 rule 8).
 */
import { useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Button as AriaButton, ToggleButton, type ButtonProps as AriaButtonProps, type PressEvent } from "react-aria-components";
import { useStrings, type ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { Avatar, type AvatarProps } from "../avatar/Avatar.tsx";
import type { IconName } from "../generated/icons.ts";
import { IconPart } from "../icon/Icon.tsx";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip } from "../surface/SurfaceChip.tsx";
import { Text } from "../text/Text.tsx";
import type { ChipSize } from "./options.ts";
import { chipBackground, chipKind, chipLabelRole, chipLeading, chipRemoveName, drawsChipAvatar, isChipRemoveKey, showsChipTrailingIcon } from "./parts.ts";

/**
 * The DOM props a Chip does not take, left out of `ChipProps` and dropped again at runtime.
 *
 * - `role`, `aria-hidden`, `aria-roledescription`, `aria-pressed` and `aria-checked`: the root is the pill and has
 *   no role; the chip's role and state are its body's, from `isSelected`, `onPress` and `isRemovable`.
 * - `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-description`, `aria-details` and `title`: the label
 *   is the only name a chip has (`accessibility.label`), and a chip has no hint.
 * - `tabIndex` and `contentEditable`: the body and the remove control are the chip's focus stops, and the pill is
 *   never a third.
 * - `children` and `dangerouslySetInnerHTML`: the pill draws its own parts and nothing else.
 */
const WITHHELD = [
  "role",
  "aria-hidden",
  "aria-roledescription",
  "aria-pressed",
  "aria-checked",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "title",
  "tabIndex",
  "contentEditable",
  "children",
  "dangerouslySetInnerHTML",
] as const;

/** Every key of `T` but a DOM event handler: the chip's handlers are `onPress` and `onRemove`, and nothing else. */
type WithoutHandlers<T> = { [K in keyof T as K extends `on${string}` ? never : K]: T[K] };

/**
 * Chip.yaml `avatar`: the Avatar the leading position holds, as Avatar's own props (ADR-0034's form for a slot
 * whose anatomy names one component). The chip draws it at size sm and decorative, because its `label` names the
 * chip, so `size` and `isDecorative` are not the caller's to pass.
 */
export type ChipAvatar = Pick<AvatarProps, "name" | "image" | "hasRing">;

export interface ChipProps extends ScopeAttributes, WithoutHandlers<Omit<HTMLAttributes<HTMLSpanElement>, (typeof WITHHELD)[number] | "color">> {
  /** Chip.yaml `label`: the visible label and the chip's name. It never wraps and never truncates. */
  readonly label: string;
  /** Chip.yaml `size`. Default `sm`; the pill is the control height of its size. */
  readonly size?: ChipSize;
  /** Chip.yaml `leadingIcon`: a registry id drawn before the label. */
  readonly leadingIcon?: IconName;
  /** Chip.yaml `avatar`: an Avatar in the leading position, drawn at size sm and decorative, on the md chip only. */
  readonly avatar?: ChipAvatar;
  /** Chip.yaml `trailingIcon`: a registry id after the label, showing what the press does. Not drawn while removable. */
  readonly trailingIcon?: IconName;
  /**
   * Chip.yaml `isSelected`: set it, true or false, on a filter chip and on no other. A chip that carries it is a
   * toggle button, pressed while it is true; unset, the chip is a button or a static label.
   */
  readonly isSelected?: boolean;
  /** Chip.yaml `isRemovable`. Default false; true draws the remove control in the trailing position. */
  readonly isRemovable?: boolean;
  /** Chip.yaml `isDisabled`. Default false. */
  readonly isDisabled?: boolean;
  /** Chip.yaml `onPress`: fires once on release inside the hit region; a filter chip's press asks to toggle it. */
  readonly onPress?: (event: PressEvent) => void;
  /** Chip.yaml `onRemove`: fires from the remove control, and from Delete or Backspace on the chip. */
  readonly onRemove?: () => void;
  readonly ref?: Ref<HTMLSpanElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** The caller's props without `WITHHELD` and without an event handler, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key) && !key.startsWith("on"))) as T;
}

type KeyDownHandler = NonNullable<AriaButtonProps["onKeyDown"]>;

export function Chip(props: ChipProps): ReactNode {
  const { label, size = "sm", leadingIcon, avatar, trailingIcon, isSelected, isRemovable = false, isDisabled = false, onPress, onRemove, className, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const strings = useStrings();
  const chip = useSurfaceChip(chipBackground);
  const [isPressed, setPressed] = useState(false);

  const kind = chipKind(isSelected, onPress !== undefined, isRemovable);
  const selected = isSelected === true;
  const drawsAvatar = drawsChipAvatar(size, avatar !== undefined);
  const leading = chipLeading(selected, chip.published, drawsAvatar, leadingIcon !== undefined);

  // The caller's props first, the component's own after them, so the component's attributes win.
  const own = {
    ...chip.rootProps,
    className: joinClassNames(chip.rootProps.className, "ds-chip", className),
    "data-ds-slot": "chip",
    "data-ds-size": size,
    "data-ds-kind": kind,
    "data-ds-selected": selected ? "" : undefined,
    "data-ds-avatar": leading === "avatar" ? "" : undefined,
    "data-ds-removable": isRemovable ? "" : undefined,
    "data-pressed": kind !== "label" && !isDisabled && isPressed ? "" : undefined,
    "data-disabled": isDisabled ? "" : undefined,
  };

  const content = (
    <>
      {leading === "check" ? <IconPart slot="chip-check" name="status.check" size="sm" tone="inherit" /> : null}
      {leading === "avatar" && avatar !== undefined ? <Avatar name={avatar.name} image={avatar.image} hasRing={avatar.hasRing} size="sm" isDecorative /> : null}
      {leading === "icon" && leadingIcon !== undefined ? <IconPart slot="chip-leading-icon" name={leadingIcon} size="sm" tone="inherit" /> : null}
      <span className="ds-chip-label" data-ds-slot="chip-label">
        <Text role={chipLabelRole(size)} tone="inherit">
          {label}
        </Text>
      </span>
      {isRemovable ? <span data-ds-slot="chip-remove-space" aria-hidden="true" /> : null}
      {showsChipTrailingIcon(isRemovable, trailingIcon !== undefined) && trailingIcon !== undefined ? (
        <IconPart slot="chip-trailing-icon" name={trailingIcon} size="sm" tone="inherit" />
      ) : null}
    </>
  );

  // Delete and Backspace remove a removable chip (`accessibility.keyboard`); every other key goes on to React Aria,
  // so Space and Enter still press it.
  const onKeyDown: KeyDownHandler | undefined = isRemovable
    ? (event) => {
        if (isChipRemoveKey(event.key)) {
          event.preventDefault();
          onRemove?.();
        } else {
          event.continuePropagation();
        }
      }
    : undefined;

  const body =
    kind === "label" ? (
      <span className="ds-chip-body" data-ds-slot="chip-body">
        {content}
      </span>
    ) : kind === "filter" ? (
      <ToggleButton className="ds-chip-body" data-ds-slot="chip-body" isSelected={selected} isDisabled={isDisabled} onPress={onPress} onPressChange={setPressed} onKeyDown={onKeyDown}>
        {content}
      </ToggleButton>
    ) : (
      <AriaButton className="ds-chip-body" data-ds-slot="chip-body" isDisabled={isDisabled} onPress={onPress} onPressChange={setPressed} onKeyDown={onKeyDown}>
        {content}
      </AriaButton>
    );

  return (
    <span {...rest} {...own} ref={ref}>
      <SurfaceChipEdge chip={chip} />
      <SurfaceChipScope chip={chip}>
        {body}
        {isRemovable ? (
          <AriaButton
            className="ds-chip-remove"
            data-ds-slot="chip-remove"
            aria-label={chipRemoveName(label, strings)}
            isDisabled={isDisabled}
            onPress={() => {
              onRemove?.();
            }}
          >
            <IconPart slot="chip-remove-icon" name="nav.close" size="sm" tone="inherit" />
          </AriaButton>
        ) : null}
      </SurfaceChipScope>
    </span>
  );
}
