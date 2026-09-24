/**
 * What an Avatar draws and says, as pure functions of its props, the ground it reads and the locale
 * (spec/components/Avatar.yaml, specVersion 1), so every rule runs in a unit test and the component only renders
 * what these return. The Apple twins are `DSAvatarAppearance` (swift/Sources/DSComponents/Avatar/), and both
 * stacks assert the same initials vectors byte for byte: `DSAvatarBindingTests.initialsVectors` on Apple and
 * test/avatar.test.tsx here.
 */
import type { GlyphSize } from "../icon/options.ts";
import type { SurfaceContextValue } from "../surface/context.ts";
import type { SurfaceChipFill } from "../surface/resolve.ts";
import type { TextRole } from "../text/tones.ts";
import type { AvatarSize } from "./options.ts";

/**
 * Avatar.yaml `tokens.root.background`, as the Surface module's chip shape asks for it (ADR-0036 §2.2): the spec's
 * cell on the ground the circle sits on, and nothing more.
 *
 * - `glass` where the cell binds `material.glass.chip`: the page over a map, an image or vivid, a vivid Surface and
 *   the scheme's glass. The chip shape decides whether the recipe renders or falls back.
 * - `own` where it binds `comp.avatar.bg`, the page on nothing, the solid ladder and light glass; the stylesheet
 *   hands that cell to the chip as `--ds--surface-chip-own` (Avatar.css).
 * - `none` on accent and inverse, where the matrix has no cell and no `default`, so the circle has no fill of its
 *   own (behavior, "On an accent or an inverse surface").
 */
export function avatarBackground(ground: Pick<SurfaceContextValue, "material" | "backdrop">): SurfaceChipFill {
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

/** The words of a name: what `String.prototype.trim` keeps, split at the same whitespace (`\s` is trim's set). */
const WORD_SEPARATOR = /\s+/u;

/**
 * The first letter of a word, with the combining marks that follow it: a code point of general category L, then
 * any of category M. Apple reads the same categories off `Unicode.Scalar.Properties.generalCategory`
 * (`DSAvatarAppearance.initials`), so the two stacks take the same letters from the same name.
 */
const FIRST_LETTER = /\p{L}\p{M}*/u;

/**
 * Avatar.yaml behavior 2: the first letter of the first word and the first letter of the last word of `name`,
 * upper-cased with the locale-aware transform of `locale` (React Aria's `useLocale()`, the app's own locale), so
 * Turkish gives "İ" for "i". A word is what the whitespace between words leaves once the name is trimmed, and a word
 * with no letter in it is not one the initials are taken from, so "Unit 4417" gives "U". A one-word name gives one
 * letter, and a name with no letter in it, a blank one or none gives null: the circle then shows object.user. The
 * same rule holds for Latin and Cyrillic, so "Анна Петрова" gives "АП".
 */
export function avatarInitials(name: string | undefined, locale: string): string | null {
  if (typeof name !== "string") return null;
  const letters = name
    .trim()
    .split(WORD_SEPARATOR)
    .map((word) => FIRST_LETTER.exec(word)?.[0])
    .filter((letter): letter is string => letter !== undefined);
  const first = letters[0];
  if (first === undefined) return null;
  const last = letters.length > 1 ? (letters.at(-1) ?? "") : "";
  return `${first}${last}`.toLocaleUpperCase(locale);
}

/**
 * Whether `name` names anything: a string with something left after `trim()`, Icon's blank rule
 * (`isIconExposed`). An avatar with no `name`, or a blank one, has nothing to announce (Avatar.yaml
 * `accessibility.label`, ADR-0032 rules 1 and 5).
 */
export function hasAvatarName(name: string | undefined): name is string {
  return typeof name === "string" && name.trim() !== "";
}

/**
 * Avatar.yaml `accessibility` and behaviors 11 and 12: an avatar is exposed, as an image named by `name`, only when it
 * has a name and `isDecorative` is false. With no name it is hidden whatever `isDecorative` says, and no word is
 * invented for the object.user glyph. The Apple twin is `DSAvatarAppearance.isExposed(hasName:isDecorative:)`.
 */
export function isAvatarExposed(name: string | undefined, isDecorative: boolean): name is string {
  return !isDecorative && hasAvatarName(name);
}

/** Avatar.yaml `tokens.initials.typography`: `type.label.sm`, `.md` or `.lg`, by size. */
export function avatarInitialsRole(size: AvatarSize): TextRole {
  switch (size) {
    case "sm":
      return "label-sm";
    case "md":
      return "label-md";
    case "lg":
      return "label-lg";
  }
}

/** Avatar.yaml `tokens.fallbackIcon.size`: Icon's `sm` box on the small circle and its `md` box on the other two. */
export function avatarFallbackIconSize(size: AvatarSize): GlyphSize {
  switch (size) {
    case "sm":
      return "sm";
    case "md":
    case "lg":
      return "md";
  }
}
