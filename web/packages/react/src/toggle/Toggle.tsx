/**
 * `Toggle` (spec/components/Toggle.yaml, specVersion 1): a binary switch that takes effect the moment it is flipped,
 * on React Aria Components' `SwitchField` and `SwitchButton`.
 *
 * - React Aria owns the switch (behavior 1): the input is visually hidden and has the `switch` role, a press
 *   anywhere in the row flips it on release, Space flips it and Enter does not, and the states reach the stylesheet
 *   as `data-selected`, `data-pressed`, `data-hovered`, `data-focus-visible` and `data-disabled`
 *   (`notes.platform.web-desktop`). The root is the field, and the row is the label element, which the control row
 *   draws (../control-row/ControlRow.css): the label leading and wrapping, the track trailing and centred on the
 *   label's first line, the hit region and the overlay. The focus ring around the row is the shared one
 *   (`useFocusRing`, `focus/FocusRing.css`): the ring the ground the Toggle sits on takes (ADR-0042 §1).
 * - The name (ADR-0041): `label`, drawn as the row's label unless `labelVisibility` is `hidden`, when it is the
 *   input's `aria-label` and nothing is drawn; with no `label`, the pair the host publishes through `NameContext`.
 *   `aria-label`, `aria-labelledby` and every other name attribute stay out of the props, and the component's own
 *   attributes win at runtime, so nothing a caller casts past the type renames the switch. A switch with no name is
 *   reported in development (`checkControlName`).
 * - The published material of the enclosing Surface is written as `data-ds-surface`, so the material cells apply to
 *   what the Surface renders, the glass fallback included (ADR-0022 §3.1, ADR-0040, `accessibility.reduceTransparency`).
 * - The drag (behavior 2): React Aria's switch has no drag, so the track carries its own pointer handling. A press
 *   on the track that moves `toggleDragThreshold` is a drag: the row's own press is cancelled, so it fires nothing of
 *   its own, and the knob follows the pointer, held between the ends, until the release commits the nearest half
 *   (`toggleDragCommit`). A press that moves less is a tap, which the row's press flips.
 * - Which end is on (behavior 3): the knob's progress runs from the track's leading end, off, to its trailing end, on,
 *   along the inline axis, so the stylesheet mirrors it under `dir="rtl"`, and a drag reads its direction from the
 *   track's computed `direction`.
 * - Toggle plays no haptic on the web: the registry maps haptic.selection.on and .off to `web: none`.
 * - It accepts `ScopeAttributes` and forwards them, with every other DOM prop it does not withhold, to its root
 *   element (ADR-0019 rule 8).
 */
import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import { SwitchButton, SwitchField, type SwitchFieldProps } from "react-aria-components";
import type { ScopeAttributes } from "@iiiivaska/prism-tokens/react";
import { ControlRowLabel } from "../control-row/ControlRow.tsx";
import { useFocusRing } from "../focus/useFocusRing.ts";
import { checkControlName, useControlName, type LabelVisibility } from "../name/name.ts";
import { useSurfaceContext } from "../surface/context.ts";
import type { TextRole } from "../text/tones.ts";
import { isToggleDrag, toggleDragCommit, toggleDragProgress, toggleTravel } from "./parts.ts";

/** Toggle.yaml `tokens.label.typography`, `type.body.md`, as the Text role the row's label renders. */
export const toggleLabelRole: TextRole = "body-md";

/**
 * The props a Toggle does not take, left out of `ToggleProps` and dropped again at runtime.
 *
 * - `aria-label`, `aria-labelledby`, `aria-describedby` and `aria-details`: `label` is the only name a switch has
 *   (ADR-0041 decision 6), and it has no description.
 * - `isSelected`, `defaultSelected`, `onChange`, `isDisabled` and `isReadOnly`: the spec's `isOn`, `onChange` and
 *   `isDisabled` in their place, and no read-only state.
 * - `name`, `value`, `form`, `isRequired`, `isInvalid`, `validate` and `validationBehavior`: a Toggle applies its
 *   change at once and never sits in a form that submits later (behavior 8).
 * - `onPress`, `onPressStart`, `onPressEnd`, `onPressChange`, `onPressUp` and `onClick`: a flip is `onChange`, and a
 *   press that a drag took over is not a press of the switch.
 * - `children`, `render` and `inputRef`: the switch draws its own parts.
 */
const WITHHELD = [
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details",
  "isSelected",
  "defaultSelected",
  "onChange",
  "isDisabled",
  "isReadOnly",
  "name",
  "value",
  "form",
  "isRequired",
  "isInvalid",
  "validate",
  "validationBehavior",
  "onPress",
  "onPressStart",
  "onPressEnd",
  "onPressChange",
  "onPressUp",
  "onClick",
  "children",
  "render",
  "inputRef",
] as const;

export interface ToggleProps extends ScopeAttributes, Omit<SwitchFieldProps, (typeof WITHHELD)[number] | "className" | "style"> {
  /** Toggle.yaml `isOn`. Default false; true is the `selected` state, the inverse solid with the knob at the trailing end. */
  readonly isOn?: boolean;
  /**
   * Toggle.yaml `label`: the switch's name, drawn as the row's label unless `labelVisibility` is `hidden`. Unset, the
   * name is the one a host hands over (ADR-0041); a Toggle named by neither is a defect.
   */
  readonly label?: string;
  /** Toggle.yaml `labelVisibility`. Default `visible`; `hidden` keeps `label` as the name and draws the track alone. */
  readonly labelVisibility?: LabelVisibility;
  /** Toggle.yaml `isDisabled`. Default false: lowers the opacity and removes the switch from input and the focus order. */
  readonly isDisabled?: boolean;
  /** Toggle.yaml `onChange`: fired once with the new value, on release for a tap, on Space, and on release for a drag that commits. */
  readonly onChange: (isOn: boolean) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ref?: Ref<HTMLDivElement>;
}

function joinClassNames(...names: readonly (string | undefined)[]): string {
  return names.filter((name) => name !== undefined && name !== "").join(" ");
}

const withheld: ReadonlySet<string> = new Set(WITHHELD);

/** The caller's props without `WITHHELD`, for a caller that casts past the type. */
function withoutWithheld<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([key]) => !withheld.has(key))) as T;
}

/** A drag in progress: the pointer that holds the knob, where it pressed, and the geometry it was measured against. */
interface Drag {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly isOn: boolean;
  readonly travel: number;
  /** -1 under right-to-left, where the trailing end is the left one; 1 otherwise. */
  readonly direction: 1 | -1;
  isDragging: boolean;
}

/**
 * Behavior 2 on the track. React Aria's press on the row starts too, because the track is inside the row: a tap is
 * that press. Once the pointer moves `toggleDragThreshold`, the press becomes a drag, and the row's press is
 * cancelled the way React Aria cancels one, with a `pointercancel` its document listener receives, so it neither
 * fires nor flips the switch on release; the drag holds the pointer and commits on release.
 */
function useToggleDrag(isOn: boolean, isDisabled: boolean, onChange: (isOn: boolean) => void) {
  const drag = useRef<Drag | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const end = (): void => {
    drag.current = null;
    setProgress(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLSpanElement>): void => {
    if (isDisabled || event.button !== 0 || !event.isPrimary) return;
    const track = event.currentTarget;
    const knob = track.firstElementChild;
    if (knob === null) return;
    const travel = toggleTravel(track.getBoundingClientRect(), knob.getBoundingClientRect());
    const direction = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, isOn, travel, direction, isDragging: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLSpanElement>): void => {
    const current = drag.current;
    if (current === null || event.pointerId !== current.pointerId) return;
    // A press released off the track before it became a drag never reached `onPointerUp` here; a pointer that moves
    // with no button down is no press at all.
    if ((event.buttons & 1) === 0) {
      end();
      return;
    }
    const dx = event.clientX - current.startX;
    if (!current.isDragging) {
      if (!isToggleDrag(dx, event.clientY - current.startY)) return;
      current.isDragging = true;
      const track = event.currentTarget;
      // The row's press ends here, unfired: the drag commits on release instead (behavior 2).
      track.ownerDocument.dispatchEvent(new PointerEvent("pointercancel", { pointerId: event.pointerId, pointerType: event.pointerType }));
      try {
        track.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser no longer tracks cannot be captured; the drag still ends on its release here.
      }
    }
    setProgress(toggleDragProgress(current.isOn, dx * current.direction, current.travel));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLSpanElement>): void => {
    const current = drag.current;
    if (current === null || event.pointerId !== current.pointerId) return;
    end();
    if (!current.isDragging) return;
    const next = toggleDragCommit(current.isOn, toggleDragProgress(current.isOn, (event.clientX - current.startX) * current.direction, current.travel));
    if (next !== null) onChange(next);
  };

  // A drag the browser takes back, for a scroll or because the track went away, commits nothing.
  const onPointerCancel = (event: ReactPointerEvent<HTMLSpanElement>): void => {
    if (drag.current !== null && event.pointerId === drag.current.pointerId) end();
  };

  return { progress, trackProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel } };
}

export function Toggle(props: ToggleProps): ReactNode {
  const { isOn = false, label, labelVisibility, isDisabled = false, onChange, className, style, ref, ...loose } = props;
  const rest = withoutWithheld(loose);
  const surface = useSurfaceContext();
  // The row sits on the ground the Toggle sits on: the ring that ground takes, and over an image its band (ADR-0042 §1).
  const { className: ringClassName, ...ring } = useFocusRing();
  const name = useControlName(label, labelVisibility);
  checkControlName("Toggle", name);
  const isDrawn = name !== null && name.labelVisibility === "visible";
  const drawn = isDrawn ? "visible" : "hidden";
  const { progress, trackProps } = useToggleDrag(isOn, isDisabled, onChange);

  return (
    <SwitchField
      {...rest}
      ref={ref}
      className={joinClassNames("ds-toggle", className)}
      style={style}
      isSelected={isOn}
      isDisabled={isDisabled}
      onChange={onChange}
      // The component's own attributes after the caller's: the name is `label`, drawn or hidden, and nothing else.
      aria-label={isDrawn ? undefined : name?.label}
      aria-labelledby={undefined}
      aria-describedby={undefined}
      aria-details={undefined}
      data-ds-slot="toggle"
      data-ds-surface={surface.material}
      data-ds-label={drawn}
    >
      <SwitchButton className={`ds-control-row ${ringClassName}`} data-ds-slot="toggle-row" data-ds-label={drawn} {...ring}>
        {isDrawn ? (
          <ControlRowLabel slot="toggle-label" role={toggleLabelRole}>
            {name.label}
          </ControlRowLabel>
        ) : null}
        <span
          {...trackProps}
          className="ds-control-row-control"
          data-ds-slot="toggle-track"
          data-ds-dragging={progress === null ? undefined : ""}
          style={progress === null ? undefined : ({ "--ds--toggle-progress": progress } as CSSProperties)}
          aria-hidden="true"
        >
          <span data-ds-slot="toggle-knob" />
        </span>
      </SwitchButton>
    </SwitchField>
  );
}
