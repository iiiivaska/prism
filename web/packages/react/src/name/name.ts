/**
 * A control's name (ADR-0041): its `label`, the same string whether the control draws it or not, and
 * `labelVisibility`, which decides whether a control that draws its label draws it. The Apple twins are
 * `DSLabelVisibility` and `DSControlName` (swift/Sources/DSComponents/Control/DSControlName.swift).
 *
 * - **The type.** `LabelVisibility` is the one type every Prism control that declares `labelVisibility` shares
 *   (ADR-0041 decision 2): `visible` draws the label, `hidden` draws nothing and keeps the same string as the
 *   accessible name. `visible` is a request, which a ground that draws no label may refuse.
 * - **The caller's route** (decision 4): a control given `label` names itself with it, drawn or hidden as its own
 *   `labelVisibility` says, and whatever a host publishes changes nothing about it.
 * - **The host's route** (decision 5): a host that holds a caller-built control and draws that control's name
 *   itself, ListRow for its trailing control and FormField for its `control`, publishes the pair it draws
 *   through `NameContext`, to the slot that holds the control and to nothing else. A control given no `label` of
 *   its own takes the pair whole, `labelVisibility` included; one given a `label` keeps its own pair. That is
 *   React Aria's own order, the component's props over its context's (`useContextProps`).
 * - **No name** (decision 7): a control with neither is a defect, which `checkControlName` reports in development
 *   with `console.error`, as IconButton reports a blank `label`.
 *
 * `NameContext` is internal, never exported from the package: ADR-0041 keeps the context inside Prism until
 * P4-34 decides whether an app's own control may read it (decision 10, proposed). `LabelVisibility` and
 * `labelVisibilities` are public, because `labelVisibility` is a public prop.
 */
import { createContext, useContext } from "react";
import { isDevelopment } from "../env.ts";

/** ADR-0041 decision 2: `labelVisibility`, declared as FormField declares it, in its order. */
export const labelVisibilities = ["visible", "hidden"] as const;
export type LabelVisibility = (typeof labelVisibilities)[number];

/** The pair a control is named by: the words, and whether the control draws them. */
export interface ControlName {
  readonly label: string;
  readonly labelVisibility: LabelVisibility;
}

/**
 * The host's route: the pair a host that draws a control's name publishes to the slot that holds the control
 * (ADR-0041 decision 5). `null` outside such a host, which is everywhere today: ListRow (P4-31) and FormField
 * (P4-34) are its first publishers, and P4-34 extends this one context rather than adding a second.
 */
export const NameContext = createContext<ControlName | null>(null);

/**
 * The pair a control is named by: its own when it was given a `label`, with its own `labelVisibility` or the
 * default, `visible`; otherwise the pair its host publishes, whole; otherwise `null`, a control with no name.
 * A caller's `labelVisibility` without a `label` does not split the host's pair.
 */
export function controlName(label: string | undefined, labelVisibility: LabelVisibility | undefined, hosted: ControlName | null): ControlName | null {
  if (label !== undefined) return { label, labelVisibility: labelVisibility ?? "visible" };
  return hosted;
}

/** `controlName` with the pair the nearest host publishes. */
export function useControlName(label: string | undefined, labelVisibility: LabelVisibility | undefined): ControlName | null {
  return controlName(label, labelVisibility, useContext(NameContext));
}

/** Whether a pair names anything: a pair with words that are not all white space. */
export function isNamed(name: ControlName | null): name is ControlName {
  return name !== null && name.label.trim() !== "";
}

/**
 * ADR-0041 decision 7, checked while the control renders so a server render says it too (IconButton's
 * `checkProps`): a control with no `label` of its own and no pair from a host, or with a blank one, names
 * nothing.
 */
export function checkControlName(component: string, name: ControlName | null): void {
  if (!isDevelopment() || isNamed(name)) return;
  console.error(
    `${component}: the control has no name. Pass \`label\`, with \`labelVisibility: "hidden"\` where it is not drawn, or place it in a host that hands its name over (${component}.yaml \`label\`, ADR-0041).`,
  );
}
