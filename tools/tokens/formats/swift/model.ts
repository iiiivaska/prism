// The Apple slice of the bundle and the Swift table model (ARCHITECTURE §2, §9.7, §9.8; ADR-0019 §2,
// ADR-0020 §5 and §7, ADR-0021, ADR-0022 §2.4, ADR-0023). Every repo brand ships in DSTokens and is
// chosen at runtime by `DSTokenContext.brand`; `apple` and `watch` merge through `#if os(watchOS)`
// and the colorsets' `watch` idiom entry. The model is plain data built once per bundle: the Swift
// context axes, the brands, the members of `DSColor`, `DSTokenSet` and its category structs, the
// colorsets with their per-brand entries and namespace folders, and the brand faces. The renderers of
// formats/swift/*.ts and swift-xcassets.ts print it; `verifySwiftTables` evaluates it for every
// context against the IR (§9.12). Swift contexts are kept in web vocabulary (WEB_RUNTIME values) and
// printed through `swiftCases`, so no format spells a context name itself (ADR-0019 rule 1).
import {
  APPLE_PLATFORMS, BASE_SCHEMES, BRAND_MODIFIER, COLOR_SCHEME_MODIFIER, PLATFORM_MODIFIER, SWIFT_CATEGORIES, SYSTEM_FONT_DESIGNS,
  WEB_RUNTIME, type SchemeVariant, type WebRuntimeAxis,
} from '../../config.ts';
import { unionShapes } from '../../ir/analyze.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { assetName, lowerCamel, swiftNameOf } from '../../ir/naming.ts';
import type { IRBundle, IRToken, TokenDeps, TokenType } from '../../ir/types.ts';
import type { BrandFont, BrandMeta, ModifierInfo } from '../../source/types.ts';
import { appleOptions, colorsetOf, swiftLiteral, swiftTransition } from '../../transforms/index.ts';
import { brandsOf, SINGLE_BRAND } from '../css/web.ts';
import { bareIdent, ident, upperCamel } from './syntax.ts';
import { xcodeJson, type XcodeJson } from './xcode-json.ts';

export const SWIFT_SOURCES_ROOT = 'swift/Sources/DSTokens/Generated';
export const SWIFT_TESTS_ROOT = 'swift/Tests/DSTokensTests/Generated';
export const XCASSETS_ROOT = 'swift/Sources/DSTokens/Resources/Colors.xcassets';
/** The colorset suffix of a reduced-transparency twin (ARCHITECTURE §8, §9.8). */
export const TWIN_SUFFIX = '-reduced-transparency';
export const WATCH_PLATFORM = 'watch';

// ---- context axes (ADR-0019 §1: the Swift names of the WEB_RUNTIME table) ----

export interface SwiftCase {
  /** The WEB_RUNTIME value, the vocabulary the model uses. */
  readonly web: string;
  /** The Swift enum case. */
  readonly swift: string;
}

export interface SwiftAxis {
  /** The WEB_RUNTIME key, which is also the `DSTokenContext` field. */
  readonly key: string;
  readonly runtime: WebRuntimeAxis;
  /** `DSColorScheme`, `DSContrast`, … */
  readonly type: string;
  /** In WEB_RUNTIME order; the first is the default. */
  readonly cases: readonly SwiftCase[];
}

export const SWIFT_AXES: readonly SwiftAxis[] = Object.entries(WEB_RUNTIME).map(([key, runtime]) => ({
  key,
  runtime,
  type: runtime.swiftType,
  cases: runtime.values.map((web) => ({ web, swift: runtime.swiftCases[web] ?? web })),
}));

export function swiftAxis(key: string): SwiftAxis {
  const a = SWIFT_AXES.find((x) => x.key === key);
  if (a === undefined) throw new Error(`no Swift context axis ${key}`);
  return a;
}

/** The Swift case of a web value (`contrast`, `more` → `increased`). */
export function swiftCase(key: string, web: string): string {
  return swiftAxis(key).cases.find((c) => c.web === web)?.swift ?? web;
}

/** The context axis of a colorScheme variant (`contrast`, `transparency`) and the value that turns it on. */
export function variantAxis(variant: Exclude<SchemeVariant, 'none'>): { readonly key: string; readonly on: string; readonly suffix: string } {
  for (const a of SWIFT_AXES) {
    const r = a.runtime.resolver;
    if ('variant' in r && r.variant === variant) return { key: a.key, on: r.value, suffix: r.suffix };
  }
  throw new Error(`WEB_RUNTIME has no ${variant} axis`);
}

/** The context axis of a resolver modifier (`colorScheme`, `density`, …), or null for brand and platform. */
export function modifierAxis(modifier: string): SwiftAxis | null {
  return SWIFT_AXES.find((a) => 'modifier' in a.runtime.resolver && a.runtime.resolver.modifier === modifier) ?? null;
}

/** One Swift context without its brand, in web vocabulary: axis key → WEB_RUNTIME value. */
export type SwiftContext = Readonly<Record<string, string>>;

/** The resolver default (`DSTokenContext.default`): every axis at its first value. */
export const DEFAULT_CONTEXT: SwiftContext = Object.fromEntries(SWIFT_AXES.map((a) => [a.key, a.cases[0]?.web ?? '']));

/** Every Swift context (96 today): the product of the axes in SWIFT_AXES order. */
export function allContexts(): SwiftContext[] {
  let out: Record<string, string>[] = [{}];
  for (const a of SWIFT_AXES) out = out.flatMap((prefix) => a.cases.map((c) => ({ ...prefix, [a.key]: c.web })));
  return out;
}

// ---- brands, platforms and resolver inputs ----

export interface SwiftBrand {
  /** The resolver `brand` context (`prism-native`), or SINGLE_BRAND without a brand modifier. */
  readonly context: string;
  /** The `DSBrand` case (`prismNative`). */
  readonly caseName: string;
  readonly meta: BrandMeta | null;
}

function brandCaseName(context: string): string {
  const camel = lowerCamel([context]);
  // `default` is also the name of `DSBrand.default`, and a reserved word needs no case of its own.
  return ident(camel) !== camel || camel === 'default' ? `${camel}Brand` : camel;
}

/** How a Swift colorset member picks its catalog entry (ADR-0020 §7). */
export interface Colorset {
  readonly id: string;
  /** The colorset name inside a namespace folder (`color-text-secondary`, `…-reduced-transparency`). */
  readonly name: string;
  /** The `DSColorToken` case. */
  readonly caseName: string;
  readonly reducedTransparency: boolean;
}

export type MemberImpl =
  /** A catalog color: `DSColorToken.<case>.color(brand)`, the twin while transparency is reduced. */
  | { readonly kind: 'colorset'; readonly colorset: Colorset; readonly twin: Colorset | null }
  /** Literal switch tables over `fields` (none: a constant). */
  | { readonly kind: 'table'; readonly fields: readonly string[] }
  /** A `comp` member initialized from its target's accessor for the same context (§9.7.4). */
  | { readonly kind: 'alias'; readonly target: SwiftMember };

export interface SwiftMember {
  readonly id: string;
  readonly type: TokenType;
  /** The declaring type: `DSColor`, a category struct (`Material`) or a component struct (`Button`). */
  readonly owner: string;
  /** The `DSTokenSet` property that reaches the owner: `color`, `material`, `components`. */
  readonly group: string;
  /** The `Components` property of a component member (`button`), else null. */
  readonly component: string | null;
  /** The declared identifier, backticked when reserved. */
  readonly name: string;
  /** The path from a `DSTokenSet` value: `color.textSecondary`, `components.button.primaryBgRest`. */
  readonly accessor: string;
  readonly swiftType: string;
  readonly description: string | null;
  readonly deprecated: string | true | null;
  readonly impl: MemberImpl;
}

export interface SwiftGroup {
  /** The `DSTokenSet` property (`material`), `components` for the components. */
  readonly property: string;
  /** The nested struct (`Material`, `Components`). */
  readonly type: string;
  readonly members: readonly SwiftMember[];
  /** The component structs of `Components`, in canonical order; empty for a category. */
  readonly components: readonly { readonly property: string; readonly type: string; readonly members: readonly SwiftMember[] }[];
}

export interface SwiftFace {
  /** `DSFontSlot` case. */
  readonly slot: string;
  readonly families: readonly string[];
  /** Relative to `Resources/Fonts` (`onest/Onest[wght].ttf`); null for a system face. */
  readonly file: string | null;
  readonly postScriptNames: readonly (readonly [number, string])[];
  readonly opticalSize: number | null;
  /** `DSSystemFontDesign` case for a system face (ADR-0020 §5), else null. */
  readonly system: string | null;
}

/** The five catalog entries of a colorset for one brand (ARCHITECTURE §9.8), as IR tokens. */
export interface ColorsetEntries {
  readonly any: IRToken;
  readonly dark: IRToken;
  readonly highContrast: IRToken;
  readonly darkHighContrast: IRToken;
  readonly watch: IRToken;
  /** Whether the brand's token depends on colorScheme: four universal entries plus `watch`, else one. */
  readonly dependsOnScheme: boolean;
}

export interface SwiftModel {
  readonly bundle: IRBundle;
  readonly brands: readonly SwiftBrand[];
  readonly defaultBrand: SwiftBrand;
  /** Platform contexts in resolver order (`apple`, `watch`), or [null] without a platform modifier. */
  readonly platforms: readonly (string | null)[];
  /** The platform the non-watch OSes read (`#else` of `#if os(watchOS)`). */
  readonly primary: string | null;
  /** The platform watchOS reads: `watch` when the resolver has it, else the primary one. */
  readonly watch: string | null;
  readonly colorMembers: readonly SwiftMember[];
  readonly groups: readonly SwiftGroup[];
  readonly colorsets: readonly Colorset[];
  /** Brand context → its colorset namespace folder (ADR-0020 §7: byte-identical brands share). */
  readonly namespaces: ReadonlyMap<string, string>;
  /** Namespace folder → colorset name → Contents.json text. */
  readonly colorsetFiles: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly diagnostics: readonly Diagnostic[];
  /** The IR token of `id` in a Swift context: the base scheme, then its contrast or transparency delta (§9.7.1). */
  tokenIn(brand: string, platform: string | null, ctx: SwiftContext, id: string): IRToken;
  /** The Swift literal a table member prints for a token. */
  literal(member: SwiftMember, token: IRToken): string;
  entries(colorset: Colorset, brand: string): ColorsetEntries;
  faces(brand: string, platform: string | null): readonly SwiftFace[];
}

const VALUE_TYPES: Readonly<Record<TokenType, string>> = {
  color: 'Color', dimension: 'CGFloat', duration: 'TimeInterval', number: 'Double', fontFamily: '[String]', fontWeight: 'Int',
  cubicBezier: 'DSCubicBezier', strokeStyle: 'DSStrokeStyle', border: 'DSBorderToken', shadow: 'DSShadowToken',
  gradient: 'DSGradientToken', typography: 'DSTypeRole', transition: 'DSSpringToken',
};

/** Names a component struct may not take: they would shadow a type the generated members use. */
const RESERVED_TYPE_NAMES = new Set([
  'Color', 'CGFloat', 'Double', 'Int', 'Bool', 'String', 'TimeInterval', 'Spring', 'Animation', 'Font', 'Bundle',
  ...Object.values(VALUE_TYPES),
]);

/** A bundled Apple font file below `Resources/Fonts`: `fonts/onest/Onest[wght].ttf` → `onest/Onest[wght].ttf` (ADR-0021 §11). */
export function bundledFontPath(file: string): string {
  const parts = file.split('/').filter((s) => s !== '' && s !== '.');
  return parts.slice(-2).join('/');
}

const cache = new WeakMap<IRBundle, SwiftModel | null>();

/**
 * The Swift model of a bundle, or null when the resolver has a platform modifier without an Apple
 * context (nothing to emit). A resolver without a platform modifier is the same on every platform.
 */
export function swiftModel(bundle: IRBundle): SwiftModel | null {
  const hit = cache.get(bundle);
  if (hit !== undefined) return hit;
  const model = buildModel(bundle);
  cache.set(bundle, model);
  return model;
}

function buildModel(bundle: IRBundle): SwiftModel | null {
  const diagnostics: Diagnostic[] = [];
  const mods: readonly ModifierInfo[] = bundle.model.modifiers;
  const platformMod = mods.find((m) => m.name === PLATFORM_MODIFIER);
  const platforms: (string | null)[] = platformMod === undefined ? [null] : platformMod.contexts.filter((c) => APPLE_PLATFORMS.includes(c));
  if (platforms.length === 0) return null;
  const primary = platforms.find((p) => p !== WATCH_PLATFORM) ?? platforms[0] ?? null;
  const watch = platforms.includes(WATCH_PLATFORM) ? WATCH_PLATFORM : primary;
  const brands: SwiftBrand[] = brandsOf(bundle).map((context) => ({
    context,
    caseName: brandCaseName(context),
    meta: bundle.brands.get(context) ?? null,
  }));
  const defaultContext = mods.find((m) => m.name === BRAND_MODIFIER)?.default ?? SINGLE_BRAND;
  const defaultBrand = brands.find((b) => b.context === defaultContext) ?? brands[0];
  if (defaultBrand === undefined) throw new Error('the bundle has no brand');

  // Resolver inputs of a Swift context (§9.7.1): `(s, standard, standard)` → s; a contrast or
  // transparency variant → its `s<suffix>` context; both → s ⊕ ΔIC(s) ⊕ ΔRT(s), which `tokenIn`
  // composes from the two variant contexts because the deltas are disjoint (§5.7 item 4).
  const variants = [variantAxis('increasedContrast'), variantAxis('reducedTransparency')];
  const hasBrandModifier = mods.some((m) => m.name === BRAND_MODIFIER);
  const schemeMod = mods.find((m) => m.name === COLOR_SCHEME_MODIFIER);
  const keyCache = new Map<string, readonly (string | null)[]>();
  const keysFor = (brand: string, platform: string | null, ctx: SwiftContext): readonly (string | null)[] => {
    const ck = `${brand}|${platform ?? ''}|${SWIFT_AXES.map((a) => ctx[a.key] ?? '').join('|')}`;
    const hit = keyCache.get(ck);
    if (hit !== undefined) return hit;
    const selected: Record<string, string> = {};
    for (const m of mods) {
      if (m.name === BRAND_MODIFIER) selected[m.name] = brand;
      else if (m.name === PLATFORM_MODIFIER) selected[m.name] = platform ?? m.default;
      else {
        // A value whose context the resolver lacks (a fixture without `comfortable`) takes the default.
        const axis = modifierAxis(m.name);
        const web = axis === null ? undefined : ctx[axis.key];
        const r = axis?.runtime.resolver;
        const c = r !== undefined && 'modifier' in r && web !== undefined ? r.contexts[web] : undefined;
        selected[m.name] = c !== undefined && m.contexts.includes(c) ? c : m.default;
      }
    }
    const keyOf = (sel: Record<string, string>): string => mods.map((m) => `${m.name}=${sel[m.name] ?? m.default}`).join('|');
    const out: (string | null)[] = [keyOf(selected)];
    const base = selected[COLOR_SCHEME_MODIFIER];
    for (const v of variants) {
      const variantContext = `${base ?? ''}${v.suffix}`;
      const on = ctx[v.key] === v.on && schemeMod !== undefined && base !== undefined && schemeMod.contexts.includes(variantContext);
      out.push(on ? keyOf({ ...selected, [COLOR_SCHEME_MODIFIER]: variantContext }) : null);
    }
    keyCache.set(ck, out);
    return out;
  };
  const valueKeys = new WeakMap<IRToken, string>();
  const valueKey = (t: IRToken): string => {
    let k = valueKeys.get(t);
    if (k === undefined) {
      k = JSON.stringify(t.value);
      valueKeys.set(t, k);
    }
    return k;
  };
  const tokenAtKey = (key: string, id: string): IRToken => {
    const t = bundle.permutations.get(key)?.tokens.get(id);
    if (t === undefined) throw new Error(`${id} is missing from ${key}; the Swift formats need the full product`);
    return t;
  };
  const tokenIn = (brand: string, platform: string | null, ctx: SwiftContext, id: string): IRToken => {
    const [baseKey, ...variantKeys] = keysFor(brand, platform, ctx);
    const base = tokenAtKey(baseKey ?? '', id);
    for (const k of variantKeys) {
      if (k === null) continue;
      const v = tokenAtKey(k, id);
      if (valueKey(v) !== valueKey(base)) return v;
    }
    return base;
  };

  // Shapes are the union over the brands of the Apple platforms (ADR-0020 §7).
  const shapes = unionShapes(bundle.analysis, platformMod === undefined ? undefined : platforms.filter((p): p is string => p !== null));
  const defaultPerm = bundle.permutations.get(keysFor(defaultBrand.context, primary, DEFAULT_CONTEXT)[0] ?? '');
  if (defaultPerm === undefined) throw new Error('the default Apple permutation is not in the bundle');
  const ids = [...defaultPerm.tokens.keys()];

  const literalCache = new WeakMap<IRToken, Map<string, string>>();
  const literal = (member: SwiftMember, token: IRToken): string => {
    let m = literalCache.get(token);
    if (m === undefined) {
      m = new Map();
      literalCache.set(token, m);
    }
    const hit = m.get(member.swiftType);
    if (hit !== undefined) return hit;
    const text = member.swiftType === 'DSTransitionToken' && token.value.kind === 'transition'
      ? swiftTransition(token.value)
      : swiftLiteral(token.value, appleOptions(token));
    m.set(member.swiftType, text);
    return text;
  };

  // Every Apple permutation of every brand, for type decisions that must hold everywhere.
  const applePerms = [...bundle.permutations.values()].filter((p) => platformMod === undefined || platforms.includes(p.input[PLATFORM_MODIFIER] ?? ''));
  const everywhere = (id: string, test: (t: IRToken) => boolean): boolean => applePerms.every((p) => {
    const t = p.tokens.get(id);
    return t === undefined || test(t);
  });

  const swiftTypeOf = (t: IRToken): string => {
    if (t.type === 'number') return t.value.kind === 'number' && t.value.flag ? 'Bool' : 'Double';
    if (t.type === 'transition') {
      return everywhere(t.id, (x) => x.value.kind === 'transition' && x.value.spring !== null) ? 'DSSpringToken' : 'DSTransitionToken';
    }
    return VALUE_TYPES[t.type];
  };

  // A member switches on its one runtime axis; a colorScheme member also on contrast and transparency
  // where a variant delta touches it (§9.7.4), from the union shape.
  const fieldsOf = (deps: TokenDeps | undefined): string[] => {
    if (deps === undefined) return [];
    const modifier = deps.axes[0] ?? (deps.increasedContrast.length > 0 || deps.reducedTransparency.length > 0 ? COLOR_SCHEME_MODIFIER : undefined);
    if (modifier === undefined) return [];
    const key = modifierAxis(modifier)?.key ?? modifier;
    if (modifier !== COLOR_SCHEME_MODIFIER) return [key];
    const out = [key];
    if (deps.increasedContrast.length > 0) out.push(variantAxis('increasedContrast').key);
    if (deps.reducedTransparency.length > 0) out.push(variantAxis('reducedTransparency').key);
    return out;
  };

  // ---- colorsets (ARCHITECTURE §9.8): sys.color.* and the sys.material.glass color tokens ----
  const colorsets: Colorset[] = [];
  const colorsetById = new Map<string, { base: Colorset; twin: Colorset | null }>();
  const caseNames = new Map<string, string>();
  for (const id of ids) {
    const t = defaultPerm.tokens.get(id);
    if (t === undefined || t.tier !== 'sys' || t.type !== 'color') continue;
    const name = assetName(id, t.type);
    if (name === null) {
      diagnostics.push(error('swift/color-without-colorset', `${id} is a color outside sys.color and sys.material.glass, so it has no colorset (ARCHITECTURE §9.8)`, { tokenId: id, file: t.source.file, line: t.source.line }));
      continue;
    }
    // `DSColorToken` cases: the `DSColor` member for sys.color, the lowerCamel public path otherwise
    // (`materialGlassDarkFill`, ARCHITECTURE §9.7.3).
    const s = swiftNameOf(id);
    const caseName = s.kind === 'color' ? bareIdent(s.member) : lowerCamel(t.path.split('.'));
    const base: Colorset = { id, name, caseName, reducedTransparency: false };
    const deps = shapes.get(id);
    const twin: Colorset | null = deps !== undefined && deps.reducedTransparency.length > 0
      ? { id, name: `${name}${TWIN_SUFFIX}`, caseName: `${caseName}ReducedTransparency`, reducedTransparency: true }
      : null;
    for (const c of twin === null ? [base] : [base, twin]) {
      const prev = caseNames.get(c.caseName);
      if (prev !== undefined) diagnostics.push(error('swift/name-collision', `${id} and ${prev} both map to DSColorToken.${c.caseName}`, { tokenId: id }));
      caseNames.set(c.caseName, id);
      colorsets.push(c);
    }
    colorsetById.set(id, { base, twin });
  }

  // ---- members ----
  const colorMembers: SwiftMember[] = [];
  const categoryMembers = new Map<string, SwiftMember[]>();
  const componentMembers = new Map<string, SwiftMember[]>();
  const byId = new Map<string, SwiftMember>();
  const docOf = (t: IRToken): { description: string | null; deprecated: string | true | null } => ({ description: t.description, deprecated: t.deprecated });

  const comps: IRToken[] = [];
  for (const id of ids) {
    const t = defaultPerm.tokens.get(id);
    if (t === undefined || t.tier === 'ref') continue;
    if (t.tier === 'comp') {
      comps.push(t);
      continue;
    }
    const s = swiftNameOf(id);
    if (s.kind === 'unknown') {
      diagnostics.push(error('swift/unknown-category', `${id}: the sys category "${s.category}" has no Swift category (config.SWIFT_CATEGORIES)`, { tokenId: id, file: t.source.file, line: t.source.line }));
      continue;
    }
    if (s.kind === 'brandFace' || s.kind === 'none') continue;
    const cs = colorsetById.get(id);
    if (t.type === 'color' && cs === undefined) continue;
    const impl: MemberImpl = cs !== undefined ? { kind: 'colorset', colorset: cs.base, twin: cs.twin } : { kind: 'table', fields: fieldsOf(shapes.get(id)) };
    if (s.kind === 'color') {
      const m: SwiftMember = { id, type: t.type, owner: 'DSColor', group: 'color', component: null, name: ident(s.member), accessor: `color.${bareIdent(s.member)}`, swiftType: 'Color', ...docOf(t), impl };
      colorMembers.push(m);
      byId.set(id, m);
      continue;
    }
    const [group = '', member = ''] = s.path;
    const m: SwiftMember = {
      id, type: t.type, owner: upperCamel([group]), group, component: null, name: ident(member),
      accessor: `${group}.${bareIdent(member)}`, swiftType: t.type === 'color' ? 'Color' : swiftTypeOf(t), ...docOf(t), impl,
    };
    const list = categoryMembers.get(group) ?? [];
    list.push(m);
    categoryMembers.set(group, list);
    byId.set(id, m);
  }
  for (const t of comps) {
    const s = swiftNameOf(t.id);
    if (s.kind !== 'tokenSet') continue;
    const [, component = '', member = ''] = s.path;
    const target = t.aliasOf === null || t.alpha !== null ? undefined : byId.get(t.aliasOf);
    let impl: MemberImpl;
    let swiftType: string;
    if (target !== undefined) {
      impl = { kind: 'alias', target };
      swiftType = target.swiftType;
    } else if (t.type === 'color') {
      diagnostics.push(error('swift/alias-target', `${t.id} must alias a sys color with a colorset; it aliases ${t.aliasOf ?? 'nothing'} (ARCHITECTURE §9.7.4, §9.8)`, { tokenId: t.id, file: t.source.file, line: t.source.line }));
      continue;
    } else {
      impl = { kind: 'table', fields: fieldsOf(shapes.get(t.id)) };
      swiftType = swiftTypeOf(t);
    }
    const m: SwiftMember = {
      id: t.id, type: t.type, owner: '', group: 'components', component: component, name: ident(member),
      accessor: `components.${component}.${bareIdent(member)}`, swiftType, ...docOf(t), impl,
    };
    const list = componentMembers.get(component) ?? [];
    list.push(m);
    componentMembers.set(component, list);
    byId.set(t.id, m);
  }

  const groups: SwiftGroup[] = [];
  for (const property of Object.values(SWIFT_CATEGORIES)) {
    const members = categoryMembers.get(property);
    if (members === undefined || members.length === 0) continue;
    groups.push({ property, type: upperCamel([property]), members, components: [] });
  }
  if (componentMembers.size > 0) {
    const components = [...componentMembers].map(([property, members]) => {
      let type = upperCamel([property]);
      if (RESERVED_TYPE_NAMES.has(type) || groups.some((g) => g.type === type) || type === 'Components') type = `${type}Tokens`;
      return { property, type, members: members.map((m) => ({ ...m, owner: type })) };
    });
    groups.push({ property: 'components', type: 'Components', members: [], components });
  }
  for (const g of [{ type: 'DSColor', members: colorMembers }, ...groups.flatMap((x) => [x, ...x.components])]) {
    const seen = new Map<string, string>();
    for (const m of g.members) {
      const prev = seen.get(bareIdent(m.name));
      if (prev !== undefined) diagnostics.push(error('swift/name-collision', `${m.id} and ${prev} both map to ${g.type}.${bareIdent(m.name)}`, { tokenId: m.id }));
      seen.set(bareIdent(m.name), m.id);
    }
  }

  // ---- colorset entries, files and namespaces (ADR-0020 §7) ----
  // A colorset's entries follow its own brand's dependencies (ADR-0020 §7), over the Apple scopes.
  const brandDependsOnScheme = (brand: string, id: string): boolean => {
    for (const s of bundle.analysis.scopes.values()) {
      const input = s.input;
      if (hasBrandModifier && input[BRAND_MODIFIER] !== brand) continue;
      if (platformMod !== undefined && !platforms.includes(input[PLATFORM_MODIFIER] ?? '')) continue;
      const d = s.deps.get(id);
      if (d !== undefined && ((d.axes as readonly string[]).includes(COLOR_SCHEME_MODIFIER) || d.increasedContrast.length > 0 || d.reducedTransparency.length > 0)) return true;
    }
    return false;
  };
  const contrastAxis = variantAxis('increasedContrast');
  const transparencyAxis = variantAxis('reducedTransparency');
  const schemeKey = modifierAxis(COLOR_SCHEME_MODIFIER)?.key ?? COLOR_SCHEME_MODIFIER;
  const off = (key: string): string => swiftAxis(key).cases[0]?.web ?? '';
  const schemeCtx = (scheme: string, more: boolean, reduce: boolean): SwiftContext => ({
    ...DEFAULT_CONTEXT,
    [schemeKey]: scheme,
    [contrastAxis.key]: more ? contrastAxis.on : off(contrastAxis.key),
    [transparencyAxis.key]: reduce ? transparencyAxis.on : off(transparencyAxis.key),
  });
  const [lightScheme, darkScheme] = BASE_SCHEMES;
  const entriesCache = new Map<string, ColorsetEntries>();
  const entries = (colorset: Colorset, brand: string): ColorsetEntries => {
    const ck = `${colorset.name}|${brand}`;
    const hit = entriesCache.get(ck);
    if (hit !== undefined) return hit;
    const rt = colorset.reducedTransparency;
    const at = (platform: string | null, scheme: string, more: boolean): IRToken => tokenIn(brand, platform, schemeCtx(scheme, more, rt), colorset.id);
    const out: ColorsetEntries = {
      any: at(primary, lightScheme, false),
      dark: at(primary, darkScheme, false),
      highContrast: at(primary, lightScheme, true),
      darkHighContrast: at(primary, darkScheme, true),
      watch: at(watch, darkScheme, false),
      dependsOnScheme: brandDependsOnScheme(brand, colorset.id),
    };
    entriesCache.set(ck, out);
    return out;
  };
  const colorsetText = (e: ColorsetEntries): string => {
    const entry = (t: IRToken, appearances: XcodeJson | null, idiom: string): XcodeJson => {
      const c = colorsetOf(t);
      const color: XcodeJson = { 'color-space': c['color-space'], components: { ...c.components } };
      return appearances === null ? { color, idiom } : { appearances, color, idiom };
    };
    const luminosity = { appearance: 'luminosity', value: 'dark' };
    const contrast = { appearance: 'contrast', value: 'high' };
    const colors: XcodeJson[] = e.dependsOnScheme
      ? [
        entry(e.any, null, 'universal'),
        entry(e.dark, [luminosity], 'universal'),
        entry(e.highContrast, [contrast], 'universal'),
        entry(e.darkHighContrast, [luminosity, contrast], 'universal'),
        entry(e.watch, null, 'watch'),
      ]
      : [entry(e.any, null, 'universal')];
    return xcodeJson({ colors, info: { author: 'xcode', version: 1 } });
  };
  const namespaces = new Map<string, string>();
  const colorsetFiles = new Map<string, Map<string, string>>();
  for (const b of brands) {
    const files = new Map<string, string>();
    for (const c of colorsets) files.set(c.name, colorsetText(entries(c, b.context)));
    let ns = b.context;
    for (const [earlier, earlierFiles] of colorsetFiles) {
      if (earlierFiles.size === files.size && [...files].every(([k, v]) => earlierFiles.get(k) === v)) {
        ns = earlier;
        break;
      }
    }
    namespaces.set(b.context, ns);
    if (!colorsetFiles.has(ns)) colorsetFiles.set(ns, files);
  }

  // ---- faces (ADR-0020 §5): each brand's sys.font.* at platform=apple plus its brand.json ----
  const faceIds = ids.filter((id) => swiftNameOf(id).kind === 'brandFace');
  const facesCache = new Map<string, readonly SwiftFace[]>();
  const reported = new Set<string>();
  const faces = (brand: string, platform: string | null): readonly SwiftFace[] => {
    const ck = `${brand}|${platform ?? ''}`;
    const hit = facesCache.get(ck);
    if (hit !== undefined) return hit;
    const meta = bundle.brands.get(brand) ?? null;
    const out: SwiftFace[] = [];
    for (const id of faceIds) {
      const s = swiftNameOf(id);
      if (s.kind !== 'brandFace') continue;
      const t = tokenIn(brand, platform, DEFAULT_CONTEXT, id);
      if (t.value.kind !== 'fontFamily') continue;
      const families = t.value.families;
      const first = families[0] ?? '';
      const system = families.length === 1 ? SYSTEM_FONT_DESIGNS[first] ?? null : null;
      const entry: BrandFont | undefined = meta?.fonts[s.slot as 'ui' | 'display' | 'mono'];
      let file: string | null = null;
      let postScriptNames: (readonly [number, string])[] = [];
      if (system === null) {
        if (entry !== undefined && entry.file !== null && entry.family === first && entry.platforms.includes('apple')) {
          file = bundledFontPath(entry.file);
          postScriptNames = Object.entries(entry.postscript).map(([w, n]) => [Number(w), n] as const).sort((a, b) => a[0] - b[0]);
        } else if (meta !== null && !reported.has(`${brand}|${id}`)) {
          reported.add(`${brand}|${id}`);
          diagnostics.push(error('swift/apple-face', `brand "${brand}": ${id} names ${JSON.stringify(first)}, which is neither a system keyword nor a family its brand.json bundles on Apple (ADR-0020 §5)`, { tokenId: id, file: t.source.file, line: t.source.line }));
        }
      }
      out.push({ slot: s.slot, families, file, postScriptNames, opticalSize: t.value.opsz, system });
    }
    facesCache.set(ck, out);
    return out;
  };
  for (const b of brands) for (const p of platforms) faces(b.context, p);

  return {
    bundle, brands, defaultBrand, platforms, primary, watch, colorMembers, groups, colorsets, namespaces, colorsetFiles,
    diagnostics, tokenIn, literal, entries, faces,
  };
}

// ---- tables (ARCHITECTURE §9.7.4) ----

export interface CaseRow {
  /** Web values of the member's fields, in field order. */
  readonly values: readonly string[];
  readonly literal: string;
}

const tableCache = new WeakMap<SwiftModel, Map<string, readonly CaseRow[]>>();

/** The literal switch table of a table member for one brand and platform: one row per field combination. */
export function caseTable(model: SwiftModel, member: SwiftMember, brand: string, platform: string | null): readonly CaseRow[] {
  if (member.impl.kind !== 'table') return [];
  let byKey = tableCache.get(model);
  if (byKey === undefined) {
    byKey = new Map();
    tableCache.set(model, byKey);
  }
  const ck = `${member.id}|${member.swiftType}|${brand}|${platform ?? ''}`;
  const hit = byKey.get(ck);
  if (hit !== undefined) return hit;
  const fields = member.impl.fields;
  let combos: string[][] = [[]];
  for (const f of fields) combos = combos.flatMap((prefix) => swiftAxis(f).cases.map((c) => [...prefix, c.web]));
  const rows = combos.map((values) => {
    const ctx: Record<string, string> = { ...DEFAULT_CONTEXT };
    fields.forEach((f, i) => {
      ctx[f] = values[i] ?? '';
    });
    return { values, literal: model.literal(member, model.tokenIn(brand, platform, ctx, member.id)) };
  });
  byKey.set(ck, rows);
  return rows;
}

function sameTable(a: readonly CaseRow[], b: readonly CaseRow[]): boolean {
  return a.length === b.length && a.every((r, i) => r.literal === b[i]?.literal);
}

/** Whether a table member's literals differ between the brands (it then switches on `c.brand` first). */
export function brandDependent(model: SwiftModel, member: SwiftMember): boolean {
  if (member.impl.kind !== 'table' || model.brands.length < 2) return false;
  return model.platforms.some((p) => {
    const first = caseTable(model, member, model.defaultBrand.context, p);
    return model.brands.some((b) => !sameTable(first, caseTable(model, member, b.context, p)));
  });
}

/** Whether a table member differs between `apple` and `watch` (it then sits in `#if os(watchOS)`). */
export function platformDependent(model: SwiftModel, member: SwiftMember): boolean {
  if (member.impl.kind !== 'table' || model.watch === model.primary) return false;
  return model.brands.some((b) => !sameTable(caseTable(model, member, b.context, model.primary), caseTable(model, member, b.context, model.watch)));
}

/** Every member in declaration order: the colors, then each group's members and component members. */
export function allMembers(model: SwiftModel): SwiftMember[] {
  return [...model.colorMembers, ...model.groups.flatMap((g) => [...g.members, ...g.components.flatMap((c) => c.members)])];
}

// ---- the table evaluator (ARCHITECTURE §9.12) ----

/**
 * Evaluates the Swift tables exactly as the generated initializers switch over them, for every Swift
 * context × platform × brand, against the IR: a table member picks the row of its fields' values; a
 * colorset member picks the catalog entry the OS would (scheme and contrast on iOS and macOS, the
 * `watch` entry in the dark scheme on watchOS, whose catalog keeps no contrast entries, §16.2), the twin
 * while transparency is reduced; an alias member takes its target. Reports at most `limit` mismatches.
 */
export function verifySwiftTables(model: SwiftModel, limit = 20): Diagnostic[] {
  const out: Diagnostic[] = [];
  let total = 0;
  const report = (m: SwiftMember, brand: string, platform: string | null, ctx: SwiftContext, got: string, want: string): void => {
    total++;
    if (total > limit) return;
    out.push(error('swift/table-mismatch', `brand "${brand}", platform "${platform ?? '-'}": ${m.accessor} is ${got.slice(0, 160)} in ${JSON.stringify(ctx)}, but the IR gives ${want.slice(0, 160)}`, { tokenId: m.id, hint: 'fix formats/swift/model.ts' }));
  };
  const members = allMembers(model);
  const contexts = allContexts();
  const contrast = variantAxis('increasedContrast');
  const transparency = variantAxis('reducedTransparency');
  const schemeKey = modifierAxis(COLOR_SCHEME_MODIFIER)?.key ?? COLOR_SCHEME_MODIFIER;
  const darkScheme = BASE_SCHEMES[1];
  for (const b of model.brands) {
    for (const platform of model.platforms) {
      const tables = new Map<string, readonly CaseRow[]>();
      for (const m of members) if (m.impl.kind === 'table') tables.set(m.id, caseTable(model, m, b.context, platform));
      const isWatch = platform === model.watch && model.watch !== model.primary;
      for (const ctx of contexts) {
        for (const m of members) {
          const target = m.impl.kind === 'alias' ? m.impl.target : m;
          if (target.impl.kind === 'table') {
            const fields = target.impl.fields;
            const row = tables.get(target.id)?.find((r) => r.values.every((v, i) => ctx[fields[i] ?? ''] === v));
            const want = model.literal(target, model.tokenIn(b.context, platform, ctx, m.id));
            if (row === undefined || row.literal !== want) report(m, b.context, platform, ctx, row?.literal ?? 'no row', want);
          } else if (target.impl.kind === 'colorset') {
            const dark = ctx[schemeKey] === darkScheme;
            const more = ctx[contrast.key] === contrast.on;
            // watchOS renders the dark palette from the `watch` entry, without contrast entries.
            if (isWatch && (!dark || more)) continue;
            const cs = ctx[transparency.key] === transparency.on && target.impl.twin !== null ? target.impl.twin : target.impl.colorset;
            const e = model.entries(cs, b.context);
            const chosen = isWatch ? e.watch : !e.dependsOnScheme ? e.any : dark ? (more ? e.darkHighContrast : e.dark) : more ? e.highContrast : e.any;
            const got = JSON.stringify(colorsetOf(chosen));
            const want = JSON.stringify(colorsetOf(model.tokenIn(b.context, platform, ctx, m.id)));
            if (got !== want) report(m, b.context, platform, ctx, got, want);
          }
        }
      }
    }
  }
  if (total > limit) out.push(error('swift/table-mismatch', `${total - limit} more Swift table mismatches`));
  return out;
}
