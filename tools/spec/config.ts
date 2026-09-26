// Paths and vocabularies spec:validate checks against (ADR-0006, ADR-0013, ADR-0022 §3.1, ADR-0023 §8.4,
// ADR-0024 §5, ADR-0029 §1.4, ADR-0030 §3, ADR-0032 rules 4 and 6, ADR-0036 §9, spec/SCHEMA.md). Everything here is a
// decision an ADR or spec/SCHEMA.md records; the bindable categories are not, because ADR-0024 §5.3 makes the regex in
// spec/component.schema.json their single copy (`bindableCategories()` in schema.ts reads it back).

/** Repository-relative layout of the contract. */
export const SPEC_DIR = 'spec';
export const COMPONENTS_DIR = `${SPEC_DIR}/components`;
export const PATTERNS_DIR = `${SPEC_DIR}/patterns`;
export const COMPONENT_SCHEMA = `${SPEC_DIR}/component.schema.json`;
/**
 * The pattern contract (spec/patterns/README.md, P2-5). It `$ref`s the component schema's definitions,
 * so both are loaded together; without it a pattern is reported as unchecked (`spec/no-schema`).
 */
export const PATTERN_SCHEMA = `${SPEC_DIR}/pattern.schema.json`;
export const HAPTICS = `${SPEC_DIR}/haptics.yaml`;
/**
 * The component-owned strings table (ADR-0032 rule 4): every `strings.<Component>.<name>` key a spec
 * may name, with the placeholders its English default fills.
 */
export const STRINGS = `${SPEC_DIR}/strings.yaml`;
/**
 * The icon registry (ADR-0013). A prop of `type: icon` takes one of its ids, and each entry's `label` is a key of the
 * form `icon.<id>` (ADR-0032 rule 6) that prose may name. `icon` is also a sys category (`icon.weight`), so the prose
 * check reads a word in that namespace against the registry's labels before it reads it as a token path.
 */
export const ICON_REGISTRY = `${SPEC_DIR}/icons/registry.json`;

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

/**
 * The glass chip (ADR-0036 §2): the recipe a part binds as its `background` when the Surface module's chip shape
 * draws that part. Avatar's and Chip's root, a SegmentedControl segment, Select's trigger, TextField's box,
 * Toolbar's floating track, TabBar's capsule and TopBar's scroll edge bind it.
 */
export const GLASS_CHIP = 'material.glass.chip';

/**
 * The chip's fallback, in TabBar's vocabulary (ADR-0036 §2.3, §9.1): the part is drawn as `fallbackBackground`
 * over `fallbackUnderlay`, the same on every ground, so each cell is keyed only the way `background` is keyed
 * where it binds the chip (Toolbar's `floating`). The underlay is load-bearing: `color.bg.surface.raised` is
 * white at α 0.09 in dark, and without the page under it the fallback is see-through over a map (ADR-0030 rule 6).
 */
export const GLASS_CHIP_FALLBACK: readonly { readonly property: string; readonly token: string }[] = [
  { property: 'fallbackBackground', token: 'color.bg.surface.raised' },
  { property: 'fallbackUnderlay', token: 'color.bg.page' },
];

/** The two settings a chip falls back under, which `accessibility.reduceTransparency` names (ADR-0036 §9.1). */
export const GLASS_CHIP_SETTINGS: readonly string[] = ['Reduce Transparency', 'Increase Contrast'];

/**
 * The one named exception to `glass-chip/fallback` (ADR-0036 §9.5): TopBar's scroll edge binds `color.bg.page`
 * with a hairline rule as its fallback, not the chip's. It is recorded, not decided: TopBar's own ticket either
 * moves the spec to the chip's fallback or amends ADR-0036 (roadmap P4-D10), and this entry goes with it.
 */
export const GLASS_CHIP_FALLBACK_EXCEPTIONS: readonly { readonly component: string; readonly part: string; readonly ticket: string }[] = [
  { component: 'TopBar', part: 'scrollEdge', ticket: 'P4-D10' },
];

/** The recipe's two filters: what a chip does not draw on glass (ADR-0036 §5). */
export const GLASS_CHIP_FILTERS: readonly string[] = ['material.glass.chip.blur', 'material.glass.chip.saturate'];

/**
 * The keys a spec never binds a chip filter under: on the scheme's glass and on light glass a chip draws its fill
 * and edge and no backdrop filter, so the two stacks draw one picture (ADR-0036 §5 and rule 6, ADR-0009 decision 3).
 */
export const NESTED_GLASS_KEYS: readonly string[] = ['glass', 'glassLight'];

/**
 * The verbs a boolean prop's name opens with (spec/SCHEMA.md, "One meaning, one name, one polarity"). A boolean is named
 * for the condition that is true, as a statement whose subject is the component, so its name is a verb in the third
 * person followed by what it says: `is` for a condition of the component (`isSelected`), `has` for something it has or
 * lacks (`hasNext`), `shows` for a part the flag draws (`showsClose`), and, for a behavior the component performs, that
 * behavior's own verb. `clamps` is SCHEMA's example of the last (`RingGauge.clampsOverflow`, not `clampOverflow`). The
 * list is closed, because a word that ends in -s is not therefore a verb (`focusRing`, `statusIcon`, `glassFill` are
 * bare nouns): a behavior verb joins it in the change that first names a prop with it, the way a new sys category is
 * classified in the change that adds it. `grows` and `delays` joined it with P4-11, for the two props roadmap P4-D3
 * classes as behaviors and no condition, part or possession names: a TextArea that grows with its value
 * (`TextArea.growsWithValue`, which was `autoGrow`) and a Spinner that holds itself back before it appears
 * (`Spinner.delaysAppearance`, which was `delay`). `isAutoGrowing` or `hasDelay` would state the behavior as a
 * condition or a thing the component owns, which is what the rule's third form exists to avoid.
 */
export const BOOLEAN_VERBS: readonly string[] = ['is', 'has', 'shows', 'clamps', 'grows', 'delays'];

/**
 * The fixtures spec/SCHEMA.md writes for a `string` prop that is an image's source ("Slot content in examples"): an
 * example writes Avatar's `image` as `{ fixture: portrait }`, never as a file name or a URL, and each gallery draws the
 * picture from tokens (roadmap P4-7). `example/prop` takes one of these, written as SCHEMA writes it, for a string.
 */
export const IMAGE_FIXTURES: readonly string[] = ['portrait'];

/**
 * The words a boolean's name never holds after its verb: a name never states a negation (`isNotReady`, `hasNoBorder`);
 * it names the condition that is true, and the default says which way the component starts (spec/SCHEMA.md).
 */
export const BOOLEAN_NEGATIONS: readonly string[] = ['Not', 'No', 'Non'];

/**
 * The boolean props still named against that rule, as `<spec name>.<prop>`: of the twenty-nine that the
 * spec-consistency pass of 2026-09-22 found (roadmap P4-D3 (1)), the ones nothing has renamed yet. P4-11 renamed the
 * twenty-eight in specs no stack implements, in place. `prop/boolean-name` lets exactly these through. The list only
 * shrinks: a name leaves it in the change that renames the prop, in place where nothing implements it and with a
 * `specVersion` bump on both stacks where something does, and validate.test.ts fails on an entry that no longer names a
 * boolean the rule rejects, and on one the pass did not record. A new prop follows the rule from its first commit and
 * never joins it.
 */
export const BOOLEAN_NAMES_OWED: readonly string[] = [
  // A bare adjective where Card, Chip and IconButton say `isSelected`, in an implemented component: its rename is a
  // `specVersion` bump on both stacks.
  'Surface.selected',
];

/** Kebab-case component name: the `comp.<component>` group a spec owns (ADR-0024 §5.2). */
export function compGroup(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
