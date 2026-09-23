/**
 * `Button` (spec/components/Button.yaml, specVersion 3): one action, one label, an optional leading or
 * trailing icon, on React Aria Components' `Button`.
 *
 * - React Aria owns the behavior (Button.yaml behavior 1): `onPress` fires once on release inside the
 *   element, a drag outside cancels, Space and Enter activate, and the states reach the stylesheet as
 *   `data-hovered`, `data-pressed`, `data-focus-visible`, `data-disabled` and `data-pending`.
 * - The published material of the enclosing Surface is written as `data-ds-surface`, so the material
 *   cells of Button.yaml (the inverse-media primary on vivid, the ghost outline on vivid and glass)
 *   apply to what the Surface renders, the glass fallback included (ADR-0022 §3.1).
 * - `isLoading` is React Aria's pending state: the control keeps its focus and its width, presses and
 *   hover stop, the label is hidden and a Spinner takes its place, and the accessibility label becomes
 *   "<label>, loading" (Button.yaml behavior 3).
 * - `isDisabled` removes the control from the focus order and lowers its opacity (behavior 4).
 * - The icons are Icon's box (`IconPart`) at `size.icon.md` with `tone: inherit`, so they take the
 *   label's foreground and are hidden from assistive technology: the button's name is its label alone.
 * - The press scale, the hit region, the hover overlay and the Reduce Motion substitute are CSS
 *   (Button.css), driven by the tokens and `--ds-motion-presentation-crossfade` (ADR-0023 §8.4).
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop React Aria passes through,
 *   to its root element (ADR-0019 rule 8).
 */
import type { CSSProperties, ReactNode, Ref } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps, type PressEvent } from "react-aria-components";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import type { IconName } from "../generated/icons.ts";
import { IconPart } from "../icon/Icon.tsx";
import { useSurfaceContext } from "../surface/context.ts";
import type { ButtonSize, ButtonVariant } from "./variants.ts";

export interface ButtonProps
  extends ScopeAttributes,
    Omit<AriaButtonProps, "children" | "className" | "style" | "isPending" | "isDisabled" | "onPress" | "render"> {
  /** Default `primary`: the single solid pill of a group. */
  readonly variant?: ButtonVariant;
  /** Default `md`. */
  readonly size?: ButtonSize;
  /** The visible label and the accessibility label; it never wraps and truncates with an ellipsis. */
  readonly label: string;
  /** A registry id drawn before the label. */
  readonly leadingIcon?: IconName;
  /** A registry id drawn after the label. */
  readonly trailingIcon?: IconName;
  /** Replaces the label with a Spinner, keeps the width and disables input. Default false. */
  readonly isLoading?: boolean;
  /** Default false. Prefer explaining why an action is unavailable. */
  readonly isDisabled?: boolean;
  /** Fires once on release inside the hit area. */
  readonly onPress: (event: PressEvent) => void;
  /** Stretches the pill to its container and centers the content. Default false. */
  readonly fullWidth?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ref?: Ref<HTMLButtonElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

export function Button(props: ButtonProps): ReactNode {
  const {
    variant = "primary",
    size = "md",
    label,
    leadingIcon,
    trailingIcon,
    isLoading = false,
    isDisabled = false,
    onPress,
    fullWidth = false,
    className,
    style,
    ref,
    ...rest
  } = props;

  const surface = useSurfaceContext();
  const accessibleLabel = isLoading ? `${label}, loading` : rest["aria-label"];

  return (
    <AriaButton
      {...rest}
      ref={ref}
      className={joinClassNames("ds-button", className)}
      style={style}
      onPress={onPress}
      isDisabled={isDisabled}
      isPending={isLoading}
      aria-label={accessibleLabel}
      data-ds-slot="button"
      data-ds-variant={variant}
      data-ds-size={size}
      data-ds-surface={surface.material}
      data-ds-full-width={fullWidth ? "" : undefined}
    >
      {leadingIcon === undefined ? null : <IconPart slot="button-leading-icon" name={leadingIcon} size="md" tone="inherit" />}
      <span data-ds-slot="button-label">
        <span data-ds-slot="button-label-text">{label}</span>
        {isLoading ? (
          <svg data-ds-slot="button-spinner" aria-hidden="true" focusable="false">
            <circle data-ds-slot="button-spinner-ring" />
            <circle data-ds-slot="button-spinner-arc" pathLength={100} />
          </svg>
        ) : null}
      </span>
      {trailingIcon === undefined ? null : <IconPart slot="button-trailing-icon" name={trailingIcon} size="md" tone="inherit" />}
    </AriaButton>
  );
}
