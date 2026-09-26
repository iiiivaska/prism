/**
 * What a Toggle does with a drag, as pure functions of the value and the pointer's travel
 * (spec/components/Toggle.yaml, specVersion 1, behaviors 2 and 3), so every rule runs in a unit test and the
 * component only renders what these return. The Apple twin is `DSToggleDrag` in
 * swift/Sources/DSComponents/Toggle/DSToggleAppearance.swift, and both stacks read the same sentences out of the
 * same spec (`DSToggleBindingTests`, test/toggle.test.tsx).
 *
 * The knob's place is a progress along the track, 0 at the off end and 1 at the on end, whatever the writing
 * direction: the off end is the track's leading end, and a drag toward the trailing end, the end away from the
 * label, turns the switch on (behavior 3). The stylesheet places the knob at `inset + height × progress` along the
 * inline axis, so the same progress is the right end left to right and the left end right to left.
 */

/**
 * Behavior 2: the distance, in CSS pixels, a press on the track moves before it is a drag: 10 pt, SwiftUI's own
 * drag minimum, which the spec writes down as a value because Prism has no token for a gesture's distance. A press
 * that moves less is a tap, and the row's press flips the switch.
 */
export const toggleDragThreshold = 10;

/** Whether a pointer that moved this far from where it pressed has become a drag. */
export function isToggleDrag(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= toggleDragThreshold;
}

/**
 * The knob's travel along the track, from the boxes the stylesheet drew: the track's width less the knob's and
 * less the inset on either side, where the inset is what the knob leaves above and below it (behavior 4: a
 * circle inset by comp.toggle.inset on every side). At regular density that is 64 − 24 − 8 = 32.
 */
export function toggleTravel(track: { readonly width: number; readonly height: number }, knob: { readonly width: number; readonly height: number }): number {
  return Math.max(0, track.width - knob.width - (track.height - knob.height));
}

/**
 * Where a drag holds the knob: the end it started at plus the pointer's travel along the inline axis, as a share
 * of the knob's travel, held between the two ends. `translation` is inline: positive toward the trailing end, so
 * a right-to-left row passes the pointer's horizontal travel negated.
 */
export function toggleDragProgress(isOn: boolean, translation: number, travel: number): number {
  const start = isOn ? 1 : 0;
  if (travel <= 0) return start;
  return Math.min(1, Math.max(0, start + translation / travel));
}

/**
 * Behavior 2: what a drag commits on release, from the knob's progress: the half of the track the knob's centre is
 * nearest, on past the middle and off before it; a knob left exactly on the middle keeps the value. `null` when
 * the value does not change, so a drag that ends where it began, or that crosses the middle and comes back, fires
 * nothing; otherwise the value `onChange` fires with, once.
 */
export function toggleDragCommit(isOn: boolean, progress: number): boolean | null {
  const next = progress > 0.5 ? true : progress < 0.5 ? false : isOn;
  return next === isOn ? null : next;
}
