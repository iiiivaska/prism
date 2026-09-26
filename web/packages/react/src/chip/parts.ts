/**
 * What a Chip draws and says, as pure functions of its props and the context its pill reads or publishes
 * (spec/components/Chip.yaml, specVersion 1), so every rule runs in a unit test and the component only renders
 * what these return. The Apple twins are `DSChipAppearance` (swift/Sources/DSComponents/Chip/), and both stacks
 * read the same cells out of the same spec (`DSChipBindingTests`, test/chip.test.tsx).
 */
import type { StringsTable } from "@iiiivaska/prism-tokens/react";
import { fillTemplate } from "../strings.ts";
import type { SurfaceContextValue } from "../surface/context.ts";
import type { SurfaceChipFill } from "../surface/resolve.ts";
import type { TextRole } from "../text/tones.ts";
import type { ChipKind, ChipSize } from "./options.ts";

type Ground = Pick<SurfaceContextValue, "material" | "backdrop">;

/**
 * Chip.yaml `tokens.root.background`, as the Surface module's chip shape asks for it (ADR-0036 §2.2): the spec's
 * cell on the ground the pill sits on, and nothing more.
 *
 * - `glass` where the cell binds `material.glass.chip`: the page over a map, an image or vivid, a vivid Surface and
 *   the scheme's glass. The chip shape decides whether the recipe renders or falls back.
 * - `own` where it binds `comp.chip.bg.rest`: the page on nothing, the solid ladder and light glass; the stylesheet
 *   hands that cell to the chip as `--ds--surface-chip-own` (Chip.css).
 * - `none` on accent and inverse, where the matrix has no cell and no `default`, so the pill has no fill of its own
 *   (behavior, "On an accent or an inverse surface").
 *
 * It never reads the press or the hover: those fills are layers over whatever the chip renders, so no input state
 * changes what the chip shape is handed (ADR-0037 §5, rule 4).
 */
export function chipBackground(ground: Ground): SurfaceChipFill {
  switch (ground.material) {
    case "page":
      return ground.backdrop === "none" ? "own" : "glass";
    case "solid":
    case "raised":
    case "nested":
    case "glassLight":
      return "own";
    case "vivid":
    case "glass":
      return "glass";
    case "inverse":
    case "accent":
      return "none";
  }
}

/**
 * Whether a context puts the chip over media: the page over a map, an image or vivid, a vivid Surface, or the
 * scheme's glass — the grounds where Chip.yaml keys its media cells and `root.background` binds the chip recipe.
 * Light glass is not one of them: Chip.yaml writes it the pill's own fill, so every part takes its `default` cell.
 */
export function isChipOverMedia(context: Ground): boolean {
  switch (context.material) {
    case "page":
      return context.backdrop !== "none";
    case "vivid":
    case "glass":
      return true;
    case "solid":
    case "raised":
    case "nested":
    case "glassLight":
    case "inverse":
    case "accent":
      return false;
  }
}

/**
 * Behavior, "Over media that ladder collapses": a selected chip draws status.check in the leading position over
 * media, where every tone is one glass foreground, and on inverse, where every tone is color.text.on-inverse. It is
 * asked on the context the pill publishes, so under the chip's fallback, which publishes `raised`, there is no check.
 */
export function showsChipCheck(context: Ground): boolean {
  return isChipOverMedia(context) || context.material === "inverse";
}

/**
 * Behavior 1: the role follows from the props alone. A chip that sets `isSelected`, true or false, is a filter; one
 * that leaves it unset and has `onPress` or `isRemovable` is a button; one with none of the three is a static label.
 */
export function chipKind(isSelected: boolean | undefined, hasPress: boolean, isRemovable: boolean): ChipKind {
  if (isSelected !== undefined) return "filter";
  return hasPress || isRemovable ? "button" : "label";
}

/** Chip.yaml `tokens.label.typography`: `type.label.sm` or `.md`, by size. */
export function chipLabelRole(size: ChipSize): TextRole {
  switch (size) {
    case "sm":
      return "label-sm";
    case "md":
      return "label-md";
  }
}

/** Behavior, "An identifier chip may put an Avatar": only the md chip draws one. */
export function drawsChipAvatar(size: ChipSize, hasAvatar: boolean): boolean {
  return hasAvatar && size === "md";
}

/** What the leading position holds: the check, the Avatar, the caller's glyph, or nothing. */
export type ChipLeading = "check" | "avatar" | "icon" | null;

/**
 * The leading position, in its one order: status.check while a chip is selected where it shows (`showsChipCheck`),
 * replacing whatever the position held; otherwise the Avatar, on the md chip; otherwise `leadingIcon`.
 */
export function chipLeading(isSelected: boolean, published: Ground, drawsAvatar: boolean, hasLeadingIcon: boolean): ChipLeading {
  if (isSelected && showsChipCheck(published)) return "check";
  if (drawsAvatar) return "avatar";
  return hasLeadingIcon ? "icon" : null;
}

/** Behavior, "`trailingIcon` is a glyph inside the chip's one control": `isRemovable` takes the trailing position. */
export function showsChipTrailingIcon(isRemovable: boolean, hasTrailingIcon: boolean): boolean {
  return hasTrailingIcon && !isRemovable;
}

/**
 * The remove control's name: the app's `strings.Chip.remove` template, "Remove {label}" in Prism's English
 * defaults, filled with the chip's own `label` (ADR-0032 rules 1, 2 and 7). React Aria's own remove string never
 * supplies it. The Apple twin is `DSChip.removeName(locale:strings:)`, which fills the same template.
 */
export function chipRemoveName(label: string, strings: StringsTable): string {
  return fillTemplate(strings["Chip.remove"], { label });
}

/** `accessibility.keyboard`: Delete and Backspace remove a removable chip. */
export function isChipRemoveKey(key: string): boolean {
  return key === "Delete" || key === "Backspace";
}
