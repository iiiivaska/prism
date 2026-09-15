// One source token in Tokens Studio's DTCG flavor (ARCHITECTURE §9.9, §7; ADR-0020 §3, ADR-0024 §12):
// `$type` is a Tokens Studio type and `$value` holds strings. Aliases stay aliases, rewritten to the
// flavor path (`{sys.color.bg.surface.$root}` → `{color.bg.surface.default}`), including aliased
// sub-values of composites. Literals go through the P1-4 renderers (`studioColor`, `studioDimension`,
// `studioTypography`, `studioShadow`, `studioGradient`, …): colors are `#rrggbb`, or `rgba()` below
// alpha 1, never 8-digit hex. An alias with `app.prism.alpha` keeps its alias and carries the
// `studio.tokens` alpha modifier. Values are the authored ones: no brand type scale and no derived
// typography weights (the Figma-native flavor shows those). Tokens Studio has no duration,
// cubicBezier or transition type and no object-form stroke style, so such tokens are omitted and
// listed in `tokens/export/README.md`.
import type { TokenTypesUnion } from '@tokens-studio/types';
import { EXTENSION_NAMESPACE } from '../../config.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { aliasTarget, flavorPath } from '../../ir/naming.ts';
import { normalize } from '../../ir/normalize.ts';
import type {
  IRBorder, IRColor, IRDimension, IRFontFamily, IRFontWeight, IRGradient, IRNumber, IRShadow, IRToken, IRTypography, IRValue, TokenType,
} from '../../ir/types.ts';
import { DECIMALS, fmt } from '../../transforms/format-number.ts';
import { studioAlphaModifier, studioColor, type StudioAlphaModifier } from '../../transforms/color.ts';
import { studioDimension } from '../../transforms/dimension.ts';
import { studioFontFamily, studioFontWeight } from '../../transforms/font.ts';
import { studioGradient } from '../../transforms/gradient.ts';
import { studioNumber } from '../../transforms/number.ts';
import { studioShadow, type StudioShadowLayer } from '../../transforms/shadow.ts';
import { studioTypography, type StudioTypography } from '../../transforms/typography.ts';
import type { SourceDoc, SourceToken } from '../../source/types.ts';

/** What the flavor needs to know about an id from the resolved bundle. */
export interface TokenFacts {
  /** The id's type (the same in every permutation, IR invariant 1); null for an unknown id. */
  type(id: string): TokenType | null;
  /** The id in one permutation: its alias target, its flag, the form of its stroke style. */
  token(id: string): IRToken | null;
}

export interface StudioBorder {
  readonly color: string;
  readonly width: string;
  readonly style: string;
}

export type StudioValue = string | StudioTypography | readonly StudioShadowLayer[] | StudioBorder;

export interface StudioToken {
  readonly $type: TokenTypesUnion;
  readonly $value: StudioValue;
  readonly $description?: string;
  readonly $extensions?: { readonly 'studio.tokens': { readonly modify: StudioAlphaModifier } };
}

export type StudioResult =
  | { readonly kind: 'token'; readonly token: StudioToken }
  | { readonly kind: 'omitted'; readonly type: TokenType; readonly reason: string };

/** Dimension categories with a Tokens Studio type of their own (the segment after `ref.` or `sys.`). */
const DIMENSION_CATEGORIES: Readonly<Record<string, TokenTypesUnion>> = { space: 'spacing', size: 'sizing', radius: 'borderRadius' };
/** Number categories with a Tokens Studio type of their own. */
const NUMBER_CATEGORIES: Readonly<Record<string, TokenTypesUnion>> = { opacity: 'opacity' };

/** Why Tokens Studio cannot hold a token of this type (null when it can). */
export const OMITTED_TYPES: Readonly<Partial<Record<TokenType, string>>> = {
  duration: 'Tokens Studio has no duration type',
  cubicBezier: 'Tokens Studio has no cubicBezier type',
  transition: 'Tokens Studio has no transition type',
};
const OBJECT_STROKE = 'Tokens Studio stroke styles are keywords only (object-form strokeStyle)';

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** The category an id's type mapping looks at: the segment after `ref.` or `sys.`; none for `comp`. */
function categoryOf(id: string): string | null {
  const [tier, category] = id.split('.');
  return (tier === 'ref' || tier === 'sys') && category !== undefined ? category : null;
}

/** An alias reference in the flavor: `{sys.color.bg.surface.$root}` → `{color.bg.surface.default}`. */
export function studioAlias(target: string): string {
  return `{${flavorPath(target).join('.')}}`;
}

/** A stroke style (or a border's style) that is an object, not a keyword. */
function objectStroke(v: IRValue | undefined): boolean {
  if (v?.kind === 'strokeStyle') return v.keyword === null;
  if (v?.kind === 'border') return v.style.keyword === null;
  return false;
}

/**
 * The Tokens Studio type of an id: `space.*` → `spacing`, `size.*` → `sizing`, `radius.*` →
 * `borderRadius`, other dimensions → `dimension`; `opacity.*` numbers → `opacity`, flags → `boolean`,
 * other numbers → `number`. A token outside those categories (every `comp` token) takes the type of
 * its alias target, so a component radius stays a `borderRadius`. Null when the type is omitted.
 */
export function studioTypeOf(id: string, facts: TokenFacts, seen: ReadonlySet<string> = new Set()): TokenTypesUnion | null {
  const type = facts.type(id);
  const ir = facts.token(id);
  const follow = (fallback: TokenTypesUnion): TokenTypesUnion => {
    const target = ir?.aliasOf ?? null;
    if (target === null || seen.has(target)) return fallback;
    return studioTypeOf(target, facts, new Set([...seen, id])) ?? fallback;
  };
  switch (type) {
    case 'color':
    case 'gradient':
      return 'color';
    case 'dimension':
      return DIMENSION_CATEGORIES[categoryOf(id) ?? ''] ?? follow('dimension');
    case 'number':
      if (ir?.value.kind === 'number' && ir.value.flag) return 'boolean';
      return NUMBER_CATEGORIES[categoryOf(id) ?? ''] ?? follow('number');
    case 'fontFamily':
      return 'fontFamilies';
    case 'fontWeight':
      return 'fontWeights';
    case 'typography':
      return 'typography';
    case 'shadow':
      return 'boxShadow';
    case 'strokeStyle':
      return objectStroke(ir?.value) ? null : 'strokeStyle';
    case 'border':
      return objectStroke(ir?.value) ? null : 'border';
    case 'duration':
    case 'cubicBezier':
    case 'transition':
    case null:
      return null;
  }
}

class Unsupported extends Error {}

/** Normalizes one literal (sub-)value with the renderers' input type; the build already validated it. */
function norm<T extends IRValue>(type: TokenType, value: unknown, ext: unknown, diagnostics: Diagnostic[], where: { tokenId: string; file: string; line: number }): T {
  const found: Diagnostic[] = [];
  const out = normalize(type, value, ext, found, where);
  if (found.length > 0) {
    diagnostics.push(...found.map((d) => error('tokens-studio/value', d.message, { ...where })));
    throw new Unsupported(found[0]?.message ?? 'invalid value');
  }
  return out as T;
}

const TYPOGRAPHY_FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
/** Values that stand in for aliased typography fields while the literal fields render. */
const TYPOGRAPHY_PLACEHOLDERS: Readonly<Record<(typeof TYPOGRAPHY_FIELDS)[number], unknown>> = {
  fontFamily: 'placeholder',
  fontSize: { value: 16, unit: 'px' },
  fontWeight: 400,
  lineHeight: 1,
  letterSpacing: { value: 0, unit: 'px' },
};

type Where = { tokenId: string; file: string; line: number };

function typographyValue(value: unknown, diagnostics: Diagnostic[], where: Where): StudioTypography {
  if (!isObject(value)) throw new Unsupported('typography must be an object');
  const filled: Record<string, unknown> = { ...value };
  const aliases = new Map<string, string>();
  for (const f of TYPOGRAPHY_FIELDS) {
    const target = aliasTarget(value[f]);
    if (target !== null) {
      aliases.set(f, studioAlias(target));
      filled[f] = TYPOGRAPHY_PLACEHOLDERS[f];
    }
  }
  const rendered: Record<string, string> = { ...studioTypography(norm<IRTypography>('typography', filled, {}, diagnostics, where)) };
  for (const [f, alias] of aliases) rendered[f] = alias;
  return rendered as unknown as StudioTypography;
}

const SHADOW_FIELDS: Readonly<Record<string, string>> = { offsetX: 'x', offsetY: 'y', blur: 'blur', spread: 'spread', color: 'color' };
const SHADOW_PLACEHOLDERS: Readonly<Record<string, unknown>> = {
  offsetX: { value: 0, unit: 'px' }, offsetY: { value: 0, unit: 'px' }, blur: { value: 0, unit: 'px' }, spread: { value: 0, unit: 'px' },
  color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 },
};

function shadowValue(value: unknown, diagnostics: Diagnostic[], where: Where): readonly StudioShadowLayer[] {
  const layers = Array.isArray(value) ? value : [value];
  const filled: Record<string, unknown>[] = [];
  const aliases: Map<string, string>[] = [];
  for (const layer of layers) {
    if (!isObject(layer)) throw new Unsupported('a shadow layer that is a reference');
    const f: Record<string, unknown> = { ...layer };
    const a = new Map<string, string>();
    for (const key of Object.keys(SHADOW_FIELDS)) {
      const target = aliasTarget(layer[key]);
      if (target !== null) {
        a.set(SHADOW_FIELDS[key] ?? key, studioAlias(target));
        f[key] = SHADOW_PLACEHOLDERS[key];
      }
    }
    filled.push(f);
    aliases.push(a);
  }
  const rendered = studioShadow(norm<IRShadow>('shadow', filled, {}, diagnostics, where));
  return rendered.map((layer, i) => {
    const out: Record<string, string> = { ...layer };
    for (const [key, alias] of aliases[i] ?? []) out[key] = alias;
    return out as unknown as StudioShadowLayer;
  });
}

/** A gradient with aliased stops: the `studioGradient` format with `{…}` in place of those stop colors. */
function gradientValue(value: unknown, ext: Record<string, unknown>, diagnostics: Diagnostic[], where: Where): string {
  if (!Array.isArray(value)) throw new Unsupported('gradient must be an array of stops');
  const authored: readonly unknown[] = value;
  const stopAliases = authored.map((s) => (isObject(s) ? aliasTarget(s['color']) : null));
  if (stopAliases.every((a) => a === null)) return studioGradient(norm<IRGradient>('gradient', authored, ext, diagnostics, where));
  const filled = authored.map((s, i) => (stopAliases[i] === null || !isObject(s) ? s : { ...s, color: SHADOW_PLACEHOLDERS['color'] }));
  const g = norm<IRGradient>('gradient', filled, ext, diagnostics, where);
  const stops = g.stops.map((s, i) => {
    const alias = stopAliases[i] ?? null;
    return `${alias === null ? studioColor(s.color) : studioAlias(alias)} ${fmt(s.position * 100, DECIMALS.linearPosition)}%`;
  });
  return `linear-gradient(${fmt(g.angle ?? 180, DECIMALS.other)}deg, ${stops.join(', ')})`;
}

function borderValue(value: unknown, diagnostics: Diagnostic[], where: Where): StudioBorder {
  if (!isObject(value)) throw new Unsupported('border must be an object');
  const part = (key: 'color' | 'width' | 'style', render: (v: unknown) => string): string => {
    const target = aliasTarget(value[key]);
    return target === null ? render(value[key]) : studioAlias(target);
  };
  return {
    color: part('color', (v) => studioColor(norm<IRColor>('color', v, {}, diagnostics, where))),
    width: part('width', (v) => studioDimension(norm<IRDimension>('dimension', v, {}, diagnostics, where))),
    style: part('style', (v) => {
      const s = norm<IRBorder['style']>('strokeStyle', v, {}, diagnostics, where);
      if (s.keyword === null) throw new Unsupported(OBJECT_STROKE);
      return s.keyword;
    }),
  };
}

/** The Tokens Studio `$value` of a literal (a token whose value is not one whole reference). */
function literalValue(type: TokenType, value: unknown, ext: Record<string, unknown>, diagnostics: Diagnostic[], where: Where): StudioValue {
  switch (type) {
    case 'color':
      return studioColor(norm<IRColor>('color', value, ext, diagnostics, where));
    case 'dimension':
      return studioDimension(norm<IRDimension>('dimension', value, ext, diagnostics, where));
    case 'number':
      return studioNumber(norm<IRNumber>('number', value, ext, diagnostics, where)).value;
    case 'fontFamily':
      return studioFontFamily(norm<IRFontFamily>('fontFamily', value, ext, diagnostics, where));
    case 'fontWeight':
      return studioFontWeight(norm<IRFontWeight>('fontWeight', value, ext, diagnostics, where));
    case 'typography':
      return typographyValue(value, diagnostics, where);
    case 'shadow':
      return shadowValue(value, diagnostics, where);
    case 'gradient':
      return gradientValue(value, ext, diagnostics, where);
    case 'border':
      return borderValue(value, diagnostics, where);
    case 'strokeStyle': {
      if (typeof value !== 'string') throw new Unsupported(OBJECT_STROKE);
      return norm<IRBorder['style']>('strokeStyle', value, ext, diagnostics, where).keyword ?? '';
    }
    case 'duration':
    case 'cubicBezier':
    case 'transition':
      throw new Unsupported(OMITTED_TYPES[type] ?? type);
  }
}

function prismExtensions(token: SourceToken): Record<string, unknown> {
  const e = token.node['$extensions'];
  const ns = isObject(e) ? e[EXTENSION_NAMESPACE] : undefined;
  return isObject(ns) ? ns : {};
}

/** One source token of `doc` in the flavor, or why it is omitted. */
export function studioToken(doc: SourceDoc, token: SourceToken, facts: TokenFacts, diagnostics: Diagnostic[]): StudioResult {
  const where: Where = { tokenId: token.id, file: doc.file, line: token.loc.line };
  const type = facts.type(token.id) ?? token.ownType ?? token.groupType;
  if (type === null) {
    // The typing preprocessor reports an untyped token (type/untyped) before any format runs.
    diagnostics.push(error('tokens-studio/value', `${token.id} has no type`, { ...where }));
    return { kind: 'omitted', type: 'number', reason: 'the token has no type' };
  }
  const value = token.node['$value'];
  const ext = prismExtensions(token);
  const target = aliasTarget(value);
  const omittedType = OMITTED_TYPES[type];
  if (omittedType !== undefined) return { kind: 'omitted', type, reason: omittedType };
  const studioType = studioTypeOf(token.id, facts);
  if (studioType === null) return { kind: 'omitted', type, reason: OBJECT_STROKE };
  let studioValue: StudioValue;
  try {
    studioValue = target === null ? literalValue(type, value, ext, diagnostics, where) : studioAlias(target);
  } catch (e) {
    if (!(e instanceof Unsupported)) throw e;
    return { kind: 'omitted', type, reason: e.message };
  }
  const description = token.node['$description'];
  const alpha = ext['alpha'];
  return {
    kind: 'token',
    token: {
      $type: studioType,
      $value: studioValue,
      ...(typeof description === 'string' ? { $description: description } : {}),
      ...(target !== null && typeof alpha === 'number' ? { $extensions: { 'studio.tokens': { modify: studioAlphaModifier(alpha) } } } : {}),
    },
  };
}
