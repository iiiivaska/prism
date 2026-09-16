// Paths and vocabularies spec:validate checks against (ADR-0006, ADR-0022 §3.1, ADR-0023 §8.4,
// ADR-0024 §5, ADR-0029 §1.4, ADR-0030 §3). Everything here is a decision an ADR records; the
// bindable categories are not, because ADR-0024 §5.3 makes the regex in spec/component.schema.json
// their single copy (`bindableCategories()` in schema.ts reads it back).

/** Repository-relative layout of the contract. */
export const SPEC_DIR = 'spec';
export const COMPONENTS_DIR = `${SPEC_DIR}/components`;
export const PATTERNS_DIR = `${SPEC_DIR}/patterns`;
export const COMPONENT_SCHEMA = `${SPEC_DIR}/component.schema.json`;
/** Added with the first pattern ticket (spec/patterns/README.md); patterns are checked once it exists. */
export const PATTERN_SCHEMA = `${SPEC_DIR}/pattern.schema.json`;
export const HAPTICS = `${SPEC_DIR}/haptics.yaml`;

/**
 * `sys` categories that no spec may bind (ADR-0024 §5.3). Every other category the dictionary holds
 * must appear in the schema's token-path regex, or `category/unclassified` fires: a new category is
 * classified in the change that adds it.
 */
export const NON_BINDABLE: readonly string[] = ['shadow', 'font', 'interaction'];

/**
 * The materials a Surface publishes to its descendants (ADR-0022 §3.1, ADR-0030 §3.4). They are a
 * binding-matrix axis: a cell keyed by one of them applies when the enclosing Surface publishes that
 * material, not because the component asked for it.
 */
export const MATERIALS: readonly string[] = ['page', 'solid', 'raised', 'nested', 'inverse', 'vivid', 'glass', 'glassLight', 'accent'];

/** The backdrop kind a Surface publishes beside its material (ADR-0029 §1.4); the second glass axis. */
export const BACKDROPS: readonly string[] = ['none', 'image', 'map', 'vivid'];

/** The reserved matrix key: the cell every value without one of its own falls back to. */
export const DEFAULT_KEY = 'default';

/** Light glass renders in both schemes only over these backdrops (ADR-0022 rule 8, ADR-0029 §1.6). */
export const LIGHT_GLASS_BACKDROPS: readonly string[] = ['image', 'map'];

/**
 * Materials whose fill is light glass: an example that renders one, or sits inside one, needs a
 * LIGHT_GLASS_BACKDROPS backdrop. ADR-0022 rule 8 writes the set as "Surface `glassLight`, or a glass
 * Card with `isSelected`", which was true while a selected glass card switched its fill to
 * `material.glass.light.fill`. ADR-0029 §1.2 removed that switch: the scheme's glass is already light
 * glass in the light scheme, and selection is now a floating shadow plus an outline (Card.yaml), which
 * leaves the material alone. So `selected` is not part of this set, and a selected glass example over
 * `backdrop: vivid`, which ADR-0029 §1.6 allows in light, is not a light-glass violation.
 */
export const LIGHT_GLASS_MATERIALS: readonly string[] = ['glassLight'];

/** The accent tint is a light-scheme look (ADR-0030 §3.3): its examples declare light only. */
export const LIGHT_ONLY_VARIANTS: readonly string[] = ['tinted'];

/** The vivid slots of ADR-0024 §6; `default` names the unset case (ADR-0022 §4.4). */
export const VIVID_SLOTS: readonly string[] = ['1', '2', '3', '4'];

/**
 * A 2×2 of vivid tiles alternates one slot pair on its diagonals, so the grid is one temperature
 * (ADR-0029 §2.5).
 */
export const VIVID_SLOT_PAIRS: readonly (readonly [string, string])[] = [
  ['1', '2'],
  ['3', '4'],
];

/** Kebab-case component name: the `comp.<component>` group a spec owns (ADR-0024 §5.2). */
export function compGroup(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
