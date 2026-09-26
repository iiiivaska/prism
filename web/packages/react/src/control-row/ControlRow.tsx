/**
 * The parts of the control row (roadmap P4-12) that are React: the label a row draws. The row itself is the label
 * element React Aria's `SwitchButton`, `CheckboxButton` or `RadioButton` renders, classed `ds-control-row`, and
 * ./ControlRow.css draws it from the cells each component binds on its own root. Internal to this package; the
 * Apple twin is `DSControlRow`.
 */
import type { ReactNode } from "react";
import { TextContext } from "react-aria-components";
import { Text } from "../text/Text.tsx";
import type { TextRole } from "../text/tones.ts";

export interface ControlRowLabelProps {
  /** The component's own name for the part, written as `data-ds-slot` (`toggle-label`). */
  readonly slot: string;
  /** The spec's `label.typography`, as a Text role. */
  readonly role: TextRole;
  /** The words, the control's `label` or its host's (ADR-0041). */
  readonly children: string;
}

/**
 * The row's label: a Text of the spec's role in the primary tone, so it resolves its own foreground against the
 * material the enclosing Surface publishes, and wraps to as many lines as it needs.
 *
 * React Aria's field components (`SwitchField`, `CheckboxField`, `RadioField`) hand their descendants a
 * `TextContext` whose slots are the field's description and error message, and React Aria's `Text` inside one
 * refuses to render without a `slot`. The label is neither, so the context is cleared around it.
 */
export function ControlRowLabel(props: ControlRowLabelProps): ReactNode {
  return (
    <span className="ds-control-row-label" data-ds-slot={props.slot}>
      <TextContext.Provider value={null}>
        <Text role={props.role} tone="primary">
          {props.children}
        </Text>
      </TextContext.Provider>
    </span>
  );
}
