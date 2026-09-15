// Pure data for the token pipeline (ARCHITECTURE §3.1). P1-3 subset: repository paths, the
// ownership table with the brand allowlist (ADR-0024 §9, ADR-0020 §1), the semantic-slot table
// (ADR-0020 §2), the web runtime table whose first values are the resolver defaults (ADR-0019 §3),
// the colorScheme structure, the ADR-0021 typography constants, the font keyword lists (ADR-0020 §5)
// and the extension key lists (§5.4). P1-5 adds OWNED_ROOTS, PLATFORM_DEFAULTS and the Swift and
// Tailwind tables.
//
// Id patterns use the glob grammar of ir/glob.ts: segments joined by '.', `a|b` alternation inside a
// segment, `*` for exactly one segment, `**` for one or more, `N…M` for a numeric range.

/** Repository-relative paths (POSIX). */
export const PATHS = {
  resolver: 'tokens/prism.resolver.json',
  tokens: 'tokens',
  sys: 'tokens/sys',
  export: 'tokens/export',
  brands: 'brands',
} as const;

/** The resolver set that holds the primitives brands override (ADR-0020 §1). */
export const REF_SET = 'ref';

export const TIERS = ['ref', 'sys', 'comp'] as const;

/** Modifiers that vary at runtime inside one artifact; the others (brand, platform) form scopes (§5.7). */
export const RUNTIME_AXES = ['colorScheme', 'density', 'modality', 'motion'] as const;

/** The brand modifier and the platform modifier (scopes, ADR-0020 §7). */
export const BRAND_MODIFIER = 'brand';
export const PLATFORM_MODIFIER = 'platform';
/** Platform contexts that feed the Apple outputs (ADR-0020 §5: `watch` layers on `apple`). */
export const APPLE_PLATFORMS: readonly string[] = ['apple', 'watch'];
export const WEB_PLATFORM = 'web';

/**
 * The brand allowlist (ADR-0020 §1): the `brand` row of OWNERSHIP. Adding an id needs an ADR
 * (ADR-0020 rule 15); `source/analyze.test.ts` snapshots this list.
 */
export const BRAND_OVERRIDABLE: readonly string[] = [
  'ref.color.neutral.0|50|100|150|200|300|400|500|600|700|800|850|900|950|1000',
  'ref.color.accent.50|100|200|300|400|500|600|700|800|900|950',
  'ref.color.slot.light|dark.bg-page|bg-fill-accent|text-on-accent|text-accent',
  'ref.color.series.light|dark.*',
  'ref.gradient.vivid.orchid|olive|rose|sky|ember-night|plum-dusk|forest-moss|navy-cyan',
  'ref.font.ui|display|mono',
  'ref.font.apple.ui|display|mono',
  'ref.type.scale',
  'ref.radius.1…10',
];

export interface OwnershipRow {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

/**
 * Which token ids each modifier may write (ADR-0024 §9.1). The single machine copy of the table;
 * `tokens/README.md` mirrors it and `docs.test.ts` checks the mirror.
 */
export const OWNERSHIP: Readonly<Record<string, OwnershipRow>> = {
  brand: { include: BRAND_OVERRIDABLE, exclude: [] },
  platform: { include: ['sys.font.**'], exclude: [] },
  colorScheme: {
    include: ['sys.color.**', 'sys.material.**', 'sys.shadow.**', 'sys.elevation.**', 'sys.gradient.**'],
    exclude: [],
  },
  density: { include: ['sys.space.**', 'sys.size.**'], exclude: ['sys.size.hit'] },
  modality: { include: ['sys.size.hit', 'sys.interaction.**'], exclude: [] },
  motion: { include: ['sys.motion.**'], exclude: [] },
};

/** Base color schemes and the variant suffixes of the colorScheme modifier (ARCHITECTURE §2, ADR-0019 §1). */
export const COLOR_SCHEME_MODIFIER = 'colorScheme';
export const BASE_SCHEMES = ['light', 'dark'] as const;
export type BaseScheme = (typeof BASE_SCHEMES)[number];
export type SchemeVariant = 'none' | 'increasedContrast' | 'reducedTransparency';
export const SCHEME_VARIANT_SUFFIXES: Readonly<Record<string, Exclude<SchemeVariant, 'none'>>> = {
  '-increased-contrast': 'increasedContrast',
  '-reduced-transparency': 'reducedTransparency',
};

/** Motion contexts compared by the motion policy (ADR-0023 §8.3). */
export const MOTION_MODIFIER = 'motion';
export const MOTION_DEFAULT_CONTEXT = 'default';
export const MOTION_REDUCED_CONTEXT = 'reduced';

/**
 * Semantic slots (ADR-0020 §2): `ref.color.slot.<scheme>.<slot>` is a whole-value alias, without
 * alpha, of a step of `group`; exactly `sys` aliases it, in that scheme's base file. Adding a row
 * needs an ADR (ADR-0020 rule 15).
 */
export interface SlotRow {
  readonly slot: string;
  readonly sys: string;
  readonly group: string;
}
export const SEMANTIC_SLOTS: readonly SlotRow[] = [
  { slot: 'bg-page', sys: 'sys.color.bg.page', group: 'ref.color.neutral' },
  { slot: 'bg-fill-accent', sys: 'sys.color.bg.fill.accent', group: 'ref.color.accent' },
  { slot: 'text-on-accent', sys: 'sys.color.text.on-accent', group: 'ref.color.neutral' },
  { slot: 'text-accent', sys: 'sys.color.text.accent', group: 'ref.color.accent' },
];
export const SLOT_PREFIX = 'ref.color.slot';

/** Brand ramps a series alias may target (ADR-0020 §4). */
export const BRAND_RAMPS: readonly string[] = ['ref.color.neutral', 'ref.color.accent'];

export interface WebRuntimeAxis {
  /** `data-ds-` plus the kebab-case context field. */
  readonly attribute: string;
  /** Closed values; the first is the default. */
  readonly values: readonly string[];
  /** Whether the attribute acts on any element (true) or on `<html>` only. */
  readonly nestable: boolean;
  /** The one media fallback: the value it selects and its query. */
  readonly media: { readonly value: string; readonly query: string };
  /** Resolver mapping: a modifier with a context per value, or a colorScheme variant suffix. */
  readonly resolver:
    | { readonly modifier: string; readonly contexts: Readonly<Record<string, string>> }
    | { readonly variant: Exclude<SchemeVariant, 'none'>; readonly suffix: string; readonly value: string };
  /** Swift type name (ADR-0019 §1); P1-5 adds the case names. */
  readonly swiftType: string;
}

/** ADR-0019 §1 and §3: the one hand-written definition of the web runtime contract. */
export const WEB_RUNTIME: Readonly<Record<string, WebRuntimeAxis>> = {
  colorScheme: {
    attribute: 'data-ds-color-scheme',
    values: ['light', 'dark'],
    nestable: true,
    media: { value: 'dark', query: '(prefers-color-scheme: dark)' },
    resolver: { modifier: 'colorScheme', contexts: { light: 'light', dark: 'dark' } },
    swiftType: 'DSColorScheme',
  },
  contrast: {
    attribute: 'data-ds-contrast',
    values: ['standard', 'more'],
    nestable: false,
    media: { value: 'more', query: '(prefers-contrast: more)' },
    resolver: { variant: 'increasedContrast', suffix: '-increased-contrast', value: 'more' },
    swiftType: 'DSContrast',
  },
  transparency: {
    attribute: 'data-ds-transparency',
    values: ['standard', 'reduce'],
    nestable: false,
    media: { value: 'reduce', query: '(prefers-reduced-transparency: reduce)' },
    resolver: { variant: 'reducedTransparency', suffix: '-reduced-transparency', value: 'reduce' },
    swiftType: 'DSTransparency',
  },
  density: {
    attribute: 'data-ds-density',
    values: ['compact', 'regular', 'comfortable'],
    nestable: true,
    media: { value: 'regular', query: '(any-pointer: coarse)' },
    resolver: { modifier: 'density', contexts: { compact: 'compact', regular: 'regular', comfortable: 'comfortable' } },
    swiftType: 'DSDensity',
  },
  modality: {
    attribute: 'data-ds-modality',
    values: ['pointer', 'touch'],
    nestable: false,
    media: { value: 'touch', query: 'not all and (hover: hover) and (pointer: fine)' },
    resolver: { modifier: 'modality', contexts: { pointer: 'pointer', touch: 'touch' } },
    swiftType: 'DSModality',
  },
  motion: {
    attribute: 'data-ds-motion',
    values: ['standard', 'reduce'],
    nestable: false,
    media: { value: 'reduce', query: '(prefers-reduced-motion: reduce)' },
    resolver: { modifier: 'motion', contexts: { standard: 'default', reduce: 'reduced' } },
    swiftType: 'DSMotionMode',
  },
};

/**
 * The resolver default each modifier must declare (ADR-0019 rule 3): the resolver context of the
 * first value of its WEB_RUNTIME axis. `brand` and `platform` have no attribute.
 */
export function webDefaultContexts(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const axis of Object.values(WEB_RUNTIME)) {
    if ('modifier' in axis.resolver) {
      const first = axis.values[0];
      const context = first === undefined ? undefined : axis.resolver.contexts[first];
      if (context !== undefined) out.set(axis.resolver.modifier, context);
    }
  }
  return out;
}

// ADR-0021 constants. The role → text-style table lives only in the source.
export const THIN_MIN_PX = 34;
export const LIGHT_MIN_PX = 20;
export const WEIGHT_FLOOR = 400;
export const STANDARD_WEIGHTS: readonly number[] = [300, 400, 500];
export const DARK_WEIGHTS: readonly number[] = [100, 200];
export const TYPE_SCALE: readonly [number, number] = [1, 1.25];
export const TYPE_SCALE_ID = 'ref.type.scale';
export const TYPE_ROLE_PREFIX = 'ref.type';
export const METRIC_ROLE_PREFIX = 'ref.type.metric';
export const DS_TEXT_STYLES: readonly string[] = [
  'largeTitle', 'title', 'title2', 'title3', 'headline', 'body',
  'callout', 'subheadline', 'footnote', 'caption', 'caption2',
];

/** CSS generic font keywords (ARCHITECTURE §7.11). */
export const CSS_GENERIC_FAMILIES: readonly string[] = [
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif',
  'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong',
];

/** Apple system-face keywords → SwiftUI design (ADR-0020 §5). */
export const SYSTEM_FONT_DESIGNS: Readonly<Record<string, string>> = {
  'system-ui': 'default',
  'ui-rounded': 'rounded',
  'ui-monospace': 'monospaced',
  'ui-serif': 'serif',
};

export const FONT_SLOTS = ['ui', 'display', 'mono'] as const;
export type FontSlot = (typeof FONT_SLOTS)[number];

/** `sys` rules of ADR-0020 §3: categories whose tokens are always whole-value aliases, and types likewise. */
export const SYS_ALIAS_PREFIXES: readonly string[] = ['sys.radius'];
export const SYS_ALIAS_TYPES: readonly string[] = ['gradient'];
/** What a sys color alias (whole value or color sub-value) may target (ADR-0020 §3). */
export const SYS_COLOR_ALIAS_TARGETS: readonly string[] = ['ref.color.**', 'sys.color.**'];

/** Materials (ADR-0022 §1.4, §2.1). */
export const MATERIAL_PREFIX = 'sys.material';
export const GLASS_PREFIX = 'sys.material.glass';
export const GLASS_SCRIM = 'sys.material.glass.scrim';
export const BLUR_PREFIX = 'ref.blur';

/** Motion (ADR-0023). */
export const EASING_REF_PREFIX = 'ref.motion.easing';
export const SPRING_MAX_REDUCED_S = 0.3;
export const DURATION_MAX_REDUCED_MS = 150;
export const CROSSFADE_ID = 'sys.motion.presentation.crossfade';
export const INTERACTIVE_SPRING_ID = 'sys.motion.spring.interactive';
export const EASING_SYS_PREFIX = 'sys.motion.easing';

/** Gradients (ADR-0024 §6). */
export const GRADIENT_SYS_PREFIX = 'sys.gradient';

/** Extension keys (§5.4, ADR-0024 §4.1). */
export const EXTENSION_NAMESPACE = 'app.prism';
export const FOLDED_KEYS: readonly string[] = [
  'spring', 'slot', 'numeric', 'textStyle', 'darkWeight', 'opsz', 'flag', 'angle', 'grain', 'scheme', 'bloom',
];
/** The one functional key declared on aliases only (ADR-0020 §3). */
export const ALIAS_ONLY_KEYS: readonly string[] = ['alpha'];
export const METADATA_KEYS: readonly string[] = ['a11y', 'figma', 'llm', 'brand'];
export const TYPOGRAPHY_ROLE_KEYS: readonly string[] = ['slot', 'numeric', 'textStyle', 'darkWeight'];

/** Which token type each functional key applies to. */
export const EXTENSION_KEY_TYPES: Readonly<Record<string, string>> = {
  spring: 'transition',
  slot: 'typography',
  numeric: 'typography',
  textStyle: 'typography',
  darkWeight: 'typography',
  opsz: 'fontFamily',
  flag: 'number',
  angle: 'gradient',
  grain: 'gradient',
  scheme: 'gradient',
  bloom: 'gradient',
  alpha: 'color',
};
