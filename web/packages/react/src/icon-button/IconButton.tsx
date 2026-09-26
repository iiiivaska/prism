/**
 * `IconButton` (spec/components/IconButton.yaml, specVersion 3): a circular action carrying one glyph and
 * no label, on React Aria Components' `Button`, the element Button is built on.
 *
 * - React Aria owns the behavior (behavior 1): `onPress` fires once on release inside the element, a drag
 *   outside cancels, Space and Enter activate, and the states reach the stylesheet as `data-hovered`,
 *   `data-pressed`, `data-focus-visible` and `data-disabled` (`notes.platform.web-desktop`).
 * - The published material of the enclosing Surface is written as `data-ds-surface`, so the material cells
 *   (the white solid on vivid, the knocked-out solid on inverse and accent, the rings in each material's
 *   own tone, the danger underlay) apply to what the Surface renders, the glass fallback included
 *   (ADR-0022 §3.1, ADR-0040, `accessibility.reduceTransparency`).
 * - The circle is a square of `root.size` at `radius.control`, which follows density and never modality or
 *   Dynamic Type; the hit region is the larger of the circle and `size.hit`, drawn invisibly around it
 *   (behaviors 2 and 7, IconButton.css).
 * - The glyph is Icon's box (`IconPart`) at `icon.size` with `tone: inherit`, so it takes the circle's
 *   foreground and, with no `label`, is hidden from assistive technology (behavior 8, Icon.yaml).
 * - `isSelected` renders the circle as `primary` renders it, in every state, and is announced with
 *   `aria-current="true"` (the selected trait on Apple); the role stays `button` (behavior 6). The stylesheet
 *   reads `data-ds-selected`; `data-ds-variant` is always the caller's variant.
 * - The name (behaviors 4 and 5): `label`, never inferred from the glyph id and never drawn. No tooltip and
 *   no `title`, `aria-describedby` or `aria-description` substitute is written, because each would put the
 *   name into the tree a second time and Prism has no Tooltip yet.
 * - The `badge` slot (behavior 16, ADR-0034) is typed as Badge's own props, so the button can
 *   read what the badge says in the same render. The badge is drawn in the circle's top-trailing corner,
 *   `tokens.badge.offset` outside it, inside `BadgeHostContext`, so it hides itself; its contribution
 *   (`badgeContribution`, the `strings.Badge.count` sentence with the true count) is the button's
 *   accessibility value. A button has no value on the web, so the value follows the label in the name after
 *   `iconButtonValueSeparator`, as VoiceOver reads a label and then its value (`notes.platform.web-desktop`):
 *   "Open notifications, 3 unread", which is Apple's label "Open notifications" and value "3 unread".
 * - IconButton plays no haptic on the web: the registry maps haptic.press.button to `web: none`.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop React Aria passes through, to
 *   its root element (ADR-0019 rule 8).
 */
import type { CSSProperties, ReactNode, Ref } from "react";
import { Button as AriaButton, useLocale, type ButtonProps as AriaButtonProps, type PressEvent } from "react-aria-components";
import { useStrings, type ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { Badge, type BadgeProps } from "../badge/Badge.tsx";
import { BadgeHostContext } from "../badge/host.ts";
import { badgeContribution, isBadgeVisible } from "../badge/text.ts";
import { isDevelopment } from "../env.ts";
import { iconRegistry, type IconName } from "../generated/icons.ts";
import { IconPart } from "../icon/Icon.tsx";
import { useSurfaceContext } from "../surface/context.ts";
import type { IconButtonSize, IconButtonVariant } from "./options.ts";

/**
 * What separates the label from the badge's contribution in the web's accessible name: the web's rendering
 * of VoiceOver's pause between a label and its value, since `role="button"` takes no `aria-valuetext`.
 * Punctuation, not a word, with the standing of `cardNameSeparator` (ADR-0032).
 */
export const iconButtonValueSeparator = ", ";

/** Badge.yaml's six props: the badge IconButton draws in its corner and reads into its name (ADR-0034). */
export type IconButtonBadge = Pick<BadgeProps, "variant" | "tone" | "emphasis" | "count" | "max" | "label">;

export interface IconButtonProps
  extends ScopeAttributes,
    Omit<
      AriaButtonProps,
      "children" | "className" | "style" | "isPending" | "isDisabled" | "onPress" | "render" | "aria-label" | "aria-labelledby" | "aria-pressed" | "aria-current"
    > {
  /** Default `secondary`: the raised puck. */
  readonly variant?: IconButtonVariant;
  /** Default `md`. The circle follows density, never modality or Dynamic Type. */
  readonly size?: IconButtonSize;
  /** A registry id, drawn by Icon. */
  readonly glyph: IconName;
  /** The accessible name on every platform. Never inferred from the glyph, and never drawn: no tooltip, no title. */
  readonly label: string;
  /** An optional Badge anchored `space.1` outside the circle's top-trailing corner; its count joins the name. */
  readonly badge?: IconButtonBadge;
  /** Default false. Renders the inverse solid whatever the variant, and is announced as selected. */
  readonly isSelected?: boolean;
  /** Default false. Lowers the opacity and removes the control from the focus order. */
  readonly isDisabled?: boolean;
  /** Fires once on release inside the hit area. */
  readonly onPress: (event: PressEvent) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ref?: Ref<HTMLButtonElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

/**
 * The two things the types cannot hold for an untyped caller or a label built at runtime, checked in
 * development while the button renders, so a server render says it too (Card's `checkCustomAction`): a blank
 * `label` names nothing, and IconButton.yaml makes it required because the glyph is not a name (ADR-0011
 * rule 4); a glyph outside the registry is not a Prism icon (ADR-0013).
 */
function checkProps(glyph: unknown, label: unknown): void {
  if (!isDevelopment()) return;
  if (typeof label !== "string" || label.trim() === "") {
    console.error("IconButton: `label` is required and names the action; it is never inferred from the glyph (IconButton.yaml `label`, ADR-0011 rule 4).");
  }
  if (typeof glyph !== "string" || !Object.hasOwn(iconRegistry, glyph)) {
    console.error(`IconButton: the glyph "${String(glyph)}" is not an id of the icon registry (spec/icons/registry.json, ADR-0013).`);
  }
}

export function IconButton(props: IconButtonProps): ReactNode {
  const { variant = "secondary", size = "md", glyph, label, badge, isSelected = false, isDisabled = false, onPress, className, style, ref, ...rest } = props;

  const surface = useSurfaceContext();
  const { locale } = useLocale();
  const strings = useStrings();
  checkProps(glyph, label);

  const badgeVariant = badge?.variant ?? "count";
  const hasBadge = badge !== undefined && isBadgeVisible(badgeVariant, badge.count);
  // Behavior 16: the badge's words are Badge's own (`strings.Badge.count` with the true count, or the count
  // alone), read through Badge's function; nothing here composes them.
  const contribution = hasBadge ? badgeContribution(badgeVariant, badge.count, badge.label, locale, strings) : undefined;
  const name = contribution === undefined ? label : `${label}${iconButtonValueSeparator}${contribution}`;

  return (
    <AriaButton
      {...rest}
      ref={ref}
      className={joinClassNames("ds-icon-button", className)}
      style={style}
      onPress={onPress}
      isDisabled={isDisabled}
      // The component's own attributes after the caller's: the name is `label` and the badge's value, and
      // nothing a caller casts past the type relabels the button or announces it as a toggle.
      aria-label={name}
      aria-labelledby={undefined}
      aria-pressed={undefined}
      aria-current={isSelected ? "true" : undefined}
      data-ds-slot="icon-button"
      data-ds-variant={variant}
      data-ds-size={size}
      data-ds-surface={surface.material}
      data-ds-selected={isSelected ? "" : undefined}
    >
      <IconPart slot="icon-button-glyph" name={glyph} size={size} tone="inherit" />
      {hasBadge ? (
        <span data-ds-slot="icon-button-badge">
          <BadgeHostContext.Provider value={true}>
            <Badge variant={badge.variant} tone={badge.tone} emphasis={badge.emphasis} count={badge.count} max={badge.max} label={badge.label} />
          </BadgeHostContext.Provider>
        </span>
      ) : null}
    </AriaButton>
  );
}
