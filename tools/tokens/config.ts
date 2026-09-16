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
  'ref.gradient.vivid.orchid|olive|rose|sky|ember-night|plum-dusk|forest-moss|navy-cyan|night-lagoon',
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
  platform: { include: ['sys.font.**', 'sys.type.metric.xl'], exclude: [] },
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
  /** Swift type name (ADR-0019 §1). */
  readonly swiftType: string;
  /** Swift case per web value: Swift keeps its enum case names, the manifest maps one to the other (ADR-0019 §1 rule 1). */
  readonly swiftCases: Readonly<Record<string, string>>;
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
    swiftCases: { light: 'light', dark: 'dark' },
  },
  contrast: {
    attribute: 'data-ds-contrast',
    values: ['standard', 'more'],
    nestable: false,
    media: { value: 'more', query: '(prefers-contrast: more)' },
    resolver: { variant: 'increasedContrast', suffix: '-increased-contrast', value: 'more' },
    swiftType: 'DSContrast',
    swiftCases: { standard: 'standard', more: 'increased' },
  },
  transparency: {
    attribute: 'data-ds-transparency',
    values: ['standard', 'reduce'],
    nestable: false,
    media: { value: 'reduce', query: '(prefers-reduced-transparency: reduce)' },
    resolver: { variant: 'reducedTransparency', suffix: '-reduced-transparency', value: 'reduce' },
    swiftType: 'DSTransparency',
    swiftCases: { standard: 'standard', reduce: 'reduced' },
  },
  density: {
    attribute: 'data-ds-density',
    values: ['compact', 'regular', 'comfortable', 'watch'],
    nestable: true,
    media: { value: 'regular', query: '(any-pointer: coarse)' },
    resolver: { modifier: 'density', contexts: { compact: 'compact', regular: 'regular', comfortable: 'comfortable', watch: 'watch' } },
    swiftType: 'DSDensity',
    swiftCases: { compact: 'compact', regular: 'regular', comfortable: 'comfortable', watch: 'watch' },
  },
  modality: {
    attribute: 'data-ds-modality',
    values: ['pointer', 'touch'],
    nestable: false,
    media: { value: 'touch', query: 'not all and (hover: hover) and (pointer: fine)' },
    resolver: { modifier: 'modality', contexts: { pointer: 'pointer', touch: 'touch' } },
    swiftType: 'DSModality',
    swiftCases: { pointer: 'pointer', touch: 'touch' },
  },
  motion: {
    attribute: 'data-ds-motion',
    values: ['standard', 'reduce'],
    nestable: false,
    media: { value: 'reduce', query: '(prefers-reduced-motion: reduce)' },
    resolver: { modifier: 'motion', contexts: { standard: 'default', reduce: 'reduced' } },
    swiftType: 'DSMotionMode',
    swiftCases: { standard: 'standard', reduce: 'reduced' },
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
/**
 * What a sys color alias (whole value or color sub-value) may target (ADR-0020 §3); a role recipe's
 * `$root` aliases an appearance recipe's `$root` (ADR-0029 §1.2).
 */
export const SYS_COLOR_ALIAS_TARGETS: readonly string[] = ['ref.color.**', 'sys.color.**', 'sys.material.glass.**'];

/** Materials (ADR-0022 §1.4, §2.1). */
export const MATERIAL_PREFIX = 'sys.material';
export const GLASS_PREFIX = 'sys.material.glass';
export const GLASS_SCRIM = 'sys.material.glass.scrim';
export const BLUR_PREFIX = 'ref.blur';
/**
 * The scheme's glass (ADR-0029 §1.2): each role recipe `sys.material.glass.<role>` aliases, field by
 * field, the appearance recipe `sys.material.glass.<scheme>.<role>` of the base scheme file it sits in
 * (`material/role-recipe`). Adding a role needs an ADR.
 */
export const GLASS_ROLE_RECIPES: readonly string[] = ['fill', 'chip'];

/** Smoked-glass tints are neutral: OKLCH chroma at most SMOKE_MAX_CHROMA (ADR-0029 §1.1, `color/smoke-chroma`). */
export const SMOKE_PREFIX = 'ref.color.smoke';
export const SMOKE_MAX_CHROMA = 0.007;
/** Every `sys.color.edge.*` is the brand's white, with or without alpha (ADR-0030 §4.1, `color/edge-neutral`). */
export const EDGE_PREFIX = 'sys.color.edge';
export const EDGE_TARGET = 'ref.color.neutral.0';

/** Motion (ADR-0023). */
export const EASING_REF_PREFIX = 'ref.motion.easing';
export const SPRING_MAX_REDUCED_S = 0.3;
export const DURATION_MAX_REDUCED_MS = 150;
export const CROSSFADE_ID = 'sys.motion.presentation.crossfade';
export const INTERACTIVE_SPRING_ID = 'sys.motion.spring.interactive';
export const EASING_SYS_PREFIX = 'sys.motion.easing';

/** Gradients (ADR-0024 §6). */
export const GRADIENT_SYS_PREFIX = 'sys.gradient';
/**
 * The vivid slot pairs (ADR-0029 §2.5): a 2×2 alternates one pair on its diagonals, so each pair
 * resolves to gradients of one `temperature` in every permutation (`gradient/slot-temperature`).
 */
export const GRADIENT_SLOT_PAIRS: readonly (readonly [string, string])[] = [
  ['sys.gradient.vivid.1', 'sys.gradient.vivid.2'],
  ['sys.gradient.vivid.3', 'sys.gradient.vivid.4'],
];

/** Extension keys (§5.4, ADR-0024 §4.1). */
export const EXTENSION_NAMESPACE = 'app.prism';
export const FOLDED_KEYS: readonly string[] = [
  'spring', 'slot', 'numeric', 'textStyle', 'darkWeight', 'opsz', 'flag', 'angle', 'grain', 'scheme', 'temperature', 'bloom',
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
  temperature: 'gradient',
  bloom: 'gradient',
  alpha: 'color',
};

// ---- P1-5: outputs, the web runtime defaults, Tailwind and Swift tables (ARCHITECTURE §8, §9) ----

/**
 * The directories the token writer owns (ARCHITECTURE §9.0, ADR-0024 §11): it writes changed files,
 * deletes files it no longer produces and never writes anywhere else. CI's stale check lists the
 * same roots (`.github/workflows/ci.yml`, `generated=`; the font root joins once
 * `tools/tokens/formats/fonts.ts` exists); `output/roots.test.ts` asserts the equality.
 */
export const OWNED_ROOTS: readonly string[] = [
  'swift/Sources/DSTokens/Generated',
  'swift/Sources/DSTokens/Resources/Colors.xcassets',
  'swift/Tests/DSTokensTests/Generated',
  'web/packages/tokens/src/generated',
  'tokens/export',
  // P1-8 (ADR-0021 §11): every font file a repo brand bundles on Apple, with its OFL.txt.
  'swift/Sources/DSTokens/Resources/Fonts',
];

/** Where the web outputs go (ARCHITECTURE §9.0): `<brand>/tokens.css`, `<brand>/tokens.ts`, the shared files. */
export const WEB_OUTPUT_ROOT = 'web/packages/tokens/src/generated';

/** One per-platform default context (ADR-0019 §2), in web vocabulary (TokenContext values). */
export interface PlatformDefault {
  readonly colorScheme?: string;
  readonly density: string;
  readonly modality: string;
}

/**
 * ADR-0019 §2: where each platform starts. Web: compact + pointer while no input is coarse and the
 * primary input hovers finely (the fallbacks of WEB_RUNTIME do the rest); iOS and iPadOS regular +
 * touch (iPadOS pointer while a mouse or trackpad is connected); macOS compact + pointer; watchOS
 * watch (regular with a 16 px card padding, ADR-0029 §3.2) + touch + dark. The one hand-written copy
 * (ADR-0019 rule 1).
 */
export const PLATFORM_DEFAULTS: Readonly<Record<string, PlatformDefault>> = {
  web: { density: 'compact', modality: 'pointer' },
  ios: { density: 'regular', modality: 'touch' },
  ipados: { density: 'regular', modality: 'touch' },
  macos: { density: 'compact', modality: 'pointer' },
  watchos: { colorScheme: 'dark', density: 'watch', modality: 'touch' },
};

/** Tokens that go to motion.css instead of tokens.css (ARCHITECTURE §9.2, §9.3). */
export const MOTION_CSS_TYPES: readonly string[] = ['duration', 'cubicBezier', 'transition'];
export const MOTION_CSS_PREFIXES: readonly string[] = ['ref.motion.**', 'sys.motion.**'];

/** Ids no web output emits (ADR-0020 §5): the Apple faces. The manifest lists them without web names. */
export const WEB_EXCLUDED: readonly string[] = ['ref.font.apple.**'];

/** Text no generated web file contains (ADR-0020 rule 7). */
export const WEB_BANNED_STRINGS: readonly string[] = [
  'SF Pro', 'SF Mono', 'SF Compact', 'New York', 'Menlo', '-apple-system', 'BlinkMacSystemFont',
  'data-ds-brand', 'fonts.googleapis.com', 'fonts.gstatic.com',
];

/** One Tailwind theme variable a token feeds: its namespace, the CSS part it references, an optional sub-key. */
export interface TailwindThemeVar {
  readonly namespace: string;
  /** The declaration suffix of the token the variable references ('' for the base declaration). */
  readonly part: string;
  /** Tailwind's `--<namespace>-<name>--<subKey>` companion variable (typography line height and so on). */
  readonly subKey?: string;
}

/**
 * Which `sys` tokens become Tailwind theme variables (ARCHITECTURE §9.4): the name is `prefix` plus
 * the id segments after `strip`, `$root` dropped, joined with '-'. `sys.border.*` widths get no
 * namespace: they would collide with `--border-color-ds-*` (ADR-0024 §6).
 */
export interface TailwindThemeRule {
  readonly match: string;
  readonly strip: string;
  readonly prefix: string;
  readonly type: string;
  readonly vars: readonly TailwindThemeVar[];
}
export const TAILWIND_THEME: readonly TailwindThemeRule[] = [
  { match: 'sys.color.bg.**', strip: 'sys.color.bg', prefix: '', type: 'color', vars: [{ namespace: '--background-color', part: '' }] },
  { match: 'sys.color.text.**', strip: 'sys.color.text', prefix: '', type: 'color', vars: [{ namespace: '--text-color', part: '' }] },
  { match: 'sys.color.icon.**', strip: 'sys.color.icon', prefix: 'icon', type: 'color', vars: [{ namespace: '--text-color', part: '' }, { namespace: '--fill', part: '' }] },
  { match: 'sys.color.border.**', strip: 'sys.color.border', prefix: '', type: 'color', vars: [{ namespace: '--border-color', part: '' }, { namespace: '--outline-color', part: '' }] },
  { match: 'sys.color.accent.**', strip: 'sys.color.accent', prefix: 'accent', type: 'color', vars: [{ namespace: '--background-color', part: '' }, { namespace: '--fill', part: '' }, { namespace: '--stroke', part: '' }] },
  { match: 'sys.color.chart.**', strip: 'sys.color.chart', prefix: 'chart', type: 'color', vars: [{ namespace: '--color', part: '' }] },
  { match: 'sys.space.**', strip: 'sys.space', prefix: '', type: 'dimension', vars: [{ namespace: '--spacing', part: '' }] },
  { match: 'sys.size.**', strip: 'sys.size', prefix: '', type: 'dimension', vars: [{ namespace: '--spacing', part: '' }] },
  { match: 'sys.radius.**', strip: 'sys.radius', prefix: '', type: 'dimension', vars: [{ namespace: '--radius', part: '' }] },
  { match: 'sys.elevation.**', strip: 'sys.elevation', prefix: 'elevation', type: 'shadow', vars: [{ namespace: '--shadow', part: '' }] },
  { match: 'sys.shadow.**', strip: 'sys.shadow', prefix: '', type: 'shadow', vars: [{ namespace: '--shadow', part: '' }] },
  { match: 'sys.font.**', strip: 'sys.font', prefix: '', type: 'fontFamily', vars: [{ namespace: '--font', part: '' }] },
  {
    match: 'sys.type.**', strip: 'sys.type', prefix: '', type: 'typography',
    vars: [
      { namespace: '--text', part: '-font-size' },
      { namespace: '--text', part: '-font-weight', subKey: 'font-weight' },
      { namespace: '--text', part: '-letter-spacing', subKey: 'letter-spacing' },
      { namespace: '--text', part: '-line-height', subKey: 'line-height' },
    ],
  },
  { match: 'sys.motion.easing.**', strip: 'sys.motion.easing', prefix: '', type: 'cubicBezier', vars: [{ namespace: '--ease', part: '' }] },
  { match: 'sys.motion.spring.**', strip: 'sys.motion.spring', prefix: 'spring', type: 'transition', vars: [{ namespace: '--ease', part: '-easing' }, { namespace: '--transition-duration', part: '-duration' }] },
  { match: 'sys.motion.duration.**', strip: 'sys.motion.duration', prefix: '', type: 'duration', vars: [{ namespace: '--transition-duration', part: '' }] },
  { match: 'sys.opacity.**', strip: 'sys.opacity', prefix: '', type: 'number', vars: [{ namespace: '--opacity', part: '' }] },
  { match: 'sys.z.**', strip: 'sys.z', prefix: '', type: 'number', vars: [{ namespace: '--z-index', part: '' }] },
];

/**
 * The composite typography utility (ADR-0019 §3, rule 14): one `@utility type-ds-<role>` per
 * `sys.type.<role>`, setting these properties in this order from the role's derived declarations.
 */
export const TAILWIND_TYPE_UTILITY = {
  match: 'sys.type.**',
  strip: 'sys.type',
  prefix: 'type-ds-',
  properties: [
    ['font-family', '-font-family'],
    ['font-size', '-font-size'],
    ['font-weight', '-font-weight'],
    ['line-height', '-line-height'],
    ['letter-spacing', '-letter-spacing'],
    ['font-variant-numeric', '-font-variant-numeric'],
  ],
} as const;

/**
 * The utility families Tailwind 4.3.3 derives from each theme namespace Prism feeds, copied from its
 * class list (`__unstable__loadDesignSystem(...).getClassList()`); the Tailwind compile test re-derives
 * them and fails when a Tailwind update changes one. The collision check (ARCHITECTURE §9.4) maps every
 * theme variable through this table: two variables that yield the same utility name fail the build,
 * even where Tailwind's lookup order (`text`: `--text-color`, `--color`, then `--text`) would pick one silently.
 */
export const TAILWIND_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  '--background-color': ['bg', 'from', 'mask-b-from', 'mask-b-to', 'mask-conic-from', 'mask-conic-to', 'mask-l-from', 'mask-l-to', 'mask-linear-from', 'mask-linear-to', 'mask-r-from', 'mask-r-to', 'mask-radial-from', 'mask-radial-to', 'mask-t-from', 'mask-t-to', 'mask-x-from', 'mask-x-to', 'mask-y-from', 'mask-y-to', 'to', 'via'],
  '--text-color': ['text'],
  '--border-color': ['border', 'border-b', 'border-be', 'border-bs', 'border-e', 'border-l', 'border-r', 'border-s', 'border-t', 'border-x', 'border-y', 'divide'],
  '--outline-color': ['outline'],
  '--fill': ['fill'],
  '--stroke': ['stroke'],
  '--color': ['accent', 'bg', 'border', 'border-b', 'border-be', 'border-bs', 'border-e', 'border-l', 'border-r', 'border-s', 'border-t', 'border-x', 'border-y', 'caret', 'decoration', 'divide', 'drop-shadow', 'fill', 'from', 'inset-ring', 'inset-shadow', 'mask-b-from', 'mask-b-to', 'mask-conic-from', 'mask-conic-to', 'mask-l-from', 'mask-l-to', 'mask-linear-from', 'mask-linear-to', 'mask-r-from', 'mask-r-to', 'mask-radial-from', 'mask-radial-to', 'mask-t-from', 'mask-t-to', 'mask-x-from', 'mask-x-to', 'mask-y-from', 'mask-y-to', 'outline', 'placeholder', 'ring', 'ring-offset', 'scrollbar-thumb', 'scrollbar-track', 'shadow', 'stroke', 'text', 'text-shadow', 'to', 'via'],
  '--spacing': ['-bottom', '-indent', '-inset', '-inset-be', '-inset-bs', '-inset-e', '-inset-s', '-inset-x', '-inset-y', '-left', '-m', '-mb', '-mbe', '-mbs', '-me', '-ml', '-mr', '-ms', '-mt', '-mx', '-my', '-right', '-scroll-m', '-scroll-mb', '-scroll-mbe', '-scroll-mbs', '-scroll-me', '-scroll-ml', '-scroll-mr', '-scroll-ms', '-scroll-mt', '-scroll-mx', '-scroll-my', '-space-x', '-space-y', '-top', '-translate', '-translate-x', '-translate-y', '-translate-z', 'basis', 'block', 'border-spacing', 'border-spacing-x', 'border-spacing-y', 'bottom', 'gap', 'gap-x', 'gap-y', 'h', 'indent', 'inline', 'inset', 'inset-be', 'inset-bs', 'inset-e', 'inset-s', 'inset-x', 'inset-y', 'leading', 'left', 'm', 'max-block', 'max-h', 'max-inline', 'max-w', 'mb', 'mbe', 'mbs', 'me', 'min-block', 'min-h', 'min-inline', 'min-w', 'ml', 'mr', 'ms', 'mt', 'mx', 'my', 'p', 'pb', 'pbe', 'pbs', 'pe', 'pl', 'pr', 'ps', 'pt', 'px', 'py', 'right', 'scroll-m', 'scroll-mb', 'scroll-mbe', 'scroll-mbs', 'scroll-me', 'scroll-ml', 'scroll-mr', 'scroll-ms', 'scroll-mt', 'scroll-mx', 'scroll-my', 'scroll-p', 'scroll-pb', 'scroll-pbe', 'scroll-pbs', 'scroll-pe', 'scroll-pl', 'scroll-pr', 'scroll-ps', 'scroll-pt', 'scroll-px', 'scroll-py', 'size', 'space-x', 'space-y', 'top', 'translate', 'translate-x', 'translate-y', 'translate-z', 'w'],
  '--radius': ['rounded', 'rounded-b', 'rounded-bl', 'rounded-br', 'rounded-e', 'rounded-ee', 'rounded-es', 'rounded-l', 'rounded-r', 'rounded-s', 'rounded-se', 'rounded-ss', 'rounded-t', 'rounded-tl', 'rounded-tr'],
  '--shadow': ['shadow'],
  '--font': ['font'],
  '--text': ['text'],
  '--ease': ['ease'],
  '--transition-duration': ['duration'],
  '--opacity': ['backdrop-opacity', 'opacity'],
  '--z-index': ['-z', 'z'],
};

/** The families `manifest.json` lists per token (every family stays usable; these are the documented ones). */
export const TAILWIND_MANIFEST_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  '--background-color': ['bg'],
  '--text-color': ['text'],
  '--border-color': ['border', 'divide'],
  '--outline-color': ['outline'],
  '--fill': ['fill'],
  '--stroke': ['stroke'],
  '--color': ['bg', 'text', 'border', 'fill', 'stroke'],
  '--spacing': ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'gap', 'gap-x', 'gap-y', 'space-x', 'space-y', 'w', 'min-w', 'max-w', 'h', 'min-h', 'max-h', 'size', 'inset', 'top', 'right', 'bottom', 'left'],
  '--radius': ['rounded'],
  '--shadow': ['shadow'],
  '--font': ['font'],
  '--text': ['text'],
  '--ease': ['ease'],
  '--transition-duration': ['duration'],
  '--opacity': ['opacity'],
  '--z-index': ['z'],
};

/**
 * The root-level `ds-*` variants of tailwind.css (ADR-0019 §3, ARCHITECTURE §9.4): an attribute form
 * and a media form each, from WEB_RUNTIME. There is no scheme or density variant.
 */
export const TAILWIND_VARIANTS: readonly { readonly name: string; readonly axis: string; readonly value: string }[] = [
  { name: 'ds-touch', axis: 'modality', value: 'touch' },
  { name: 'ds-pointer', axis: 'modality', value: 'pointer' },
  { name: 'ds-contrast-more', axis: 'contrast', value: 'more' },
  { name: 'ds-reduce-transparency', axis: 'transparency', value: 'reduce' },
  { name: 'ds-reduce-motion', axis: 'motion', value: 'reduce' },
];

/**
 * Swift categories (ARCHITECTURE §8): the first public-path segment of a `sys` token names its
 * `DSTokenSet` member struct; `color` members live on the brand-scoped `DSColor` (ADR-0020 §7) and
 * `font` in `DSBrand.faces`. `comp.<c>` tokens live in `components.<c>`. An unknown category fails the build.
 */
export const SWIFT_CATEGORIES: Readonly<Record<string, string>> = {
  color: 'DSColor', material: 'material', border: 'border', shadow: 'shadow', elevation: 'elevation',
  space: 'space', size: 'size', radius: 'radius', type: 'typography', font: 'DSBrand', motion: 'motion',
  gradient: 'gradient', opacity: 'opacity', z: 'zIndex', icon: 'icon', chart: 'chart', stroke: 'stroke',
  interaction: 'interaction',
};
/** A Swift member that would start with a digit takes its category's prefix (`space.4` → `step4`). */
export const NUMERIC_PREFIX: Readonly<Record<string, string>> = { space: 'step', elevation: 'level' };
export const NUMERIC_PREFIX_DEFAULT = 'n';
