// The one normalizer (ARCHITECTURE §7.1, §5.4): a pure, idempotent function from a DTCG value (or an
// IR value, or a composite mixing both, because Style Dictionary hands a transitive transform the
// already-transformed targets of its references) to an IRValue with a `kind` at every level.
// Functional extension keys of the token itself are folded into the value, so they flow through
// aliases; `alpha` replaces the alpha of the resolved target (ADR-0020 §3). It never throws: invalid
// input pushes a diagnostic and returns the input unchanged.
import { EXTENSION_KEY_TYPES, METADATA_KEYS } from '../config.ts';
import { irColor, isColorSpace, withAlpha } from './color.ts';
import { error, type Diagnostic } from './diagnostics.ts';
import type {
  IRBorder, IRColor, IRCubicBezier, IRDimension, IRDuration, IRFontFamily, IRFontWeight, IRGradient,
  IRGradientStop, IRNumber, IRShadow, IRShadowLayer, IRSpring, IRStrokeStyle, IRTransition, IRTypography, IRValue,
  PermKey, StrokeKeyword, TextStyleName, TokenType,
} from './types.ts';
import { TOKEN_TYPES } from './types.ts';

export interface NormalizeWhere {
  readonly tokenId?: string;
  readonly file?: string;
  readonly line?: number;
  readonly permutation?: PermKey;
}

const FONT_WEIGHTS: Readonly<Record<string, number>> = {
  thin: 100, hairline: 100,
  'extra-light': 200, 'ultra-light': 200,
  light: 300,
  normal: 400, regular: 400, book: 400,
  medium: 500,
  'semi-bold': 600, 'demi-bold': 600,
  bold: 700,
  'extra-bold': 800, 'ultra-bold': 800,
  black: 900, heavy: 900,
  'extra-black': 950, 'ultra-black': 950,
};
const STROKE_KEYWORDS: readonly StrokeKeyword[] = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset'];
const LINE_CAPS = ['round', 'butt', 'square'] as const;
const TEXT_STYLES: readonly TextStyleName[] = [
  'largeTitle', 'title', 'title2', 'title3', 'headline', 'body', 'callout', 'subheadline', 'footnote', 'caption', 'caption2',
];

/**
 * Keys whose misplacement a source check reports with its own code (spring/fallback,
 * type/role-metadata, color/alpha-target); the normalizer does not report them again.
 */
const SOURCE_CHECKED_KEYS: readonly string[] = ['spring', 'slot', 'numeric', 'textStyle', 'darkWeight', 'alpha'];

class Invalid extends Error {}

function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function kindOf(v: unknown): string | null {
  const o = obj(v);
  return o !== null && typeof o['kind'] === 'string' ? o['kind'] : null;
}
function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Invalid(`${what} must be a finite number, got ${JSON.stringify(v)}`);
  return v;
}
function describe(v: unknown): string {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 80 ? `${s.slice(0, 77)}...` : s;
}

function color(v: unknown, what = 'color'): IRColor {
  if (kindOf(v) === 'color') return v as IRColor;
  const o = obj(v);
  if (o === null) throw new Invalid(`${what} must be a DTCG color object, got ${describe(v)}`);
  const space = o['colorSpace'];
  if (!isColorSpace(space)) throw new Invalid(`${what} has an unknown colorSpace ${describe(space)}`);
  const comps = o['components'];
  if (!Array.isArray(comps) || comps.length !== 3) throw new Invalid(`${what} must have three components`);
  const components = comps.map((c, i) => (c === 'none' ? 'none' : num(c, `${what} component ${i}`))) as [number | 'none', number | 'none', number | 'none'];
  const alpha = o['alpha'] === undefined ? 1 : num(o['alpha'], `${what} alpha`);
  if (alpha < 0 || alpha > 1) throw new Invalid(`${what} alpha must lie in [0, 1]`);
  return irColor(space, components, alpha);
}

function dimension(v: unknown, what = 'dimension'): IRDimension {
  if (kindOf(v) === 'dimension') return v as IRDimension;
  const o = obj(v);
  if (o === null) throw new Invalid(`${what} must be { value, unit }, got ${describe(v)}`);
  const value = num(o['value'], `${what} value`);
  const unit = o['unit'];
  if (unit !== 'px' && unit !== 'rem') throw new Invalid(`${what} unit must be px or rem, got ${describe(unit)}`);
  return { kind: 'dimension', value, unit, px: unit === 'rem' ? value * 16 : value };
}

function duration(v: unknown, what = 'duration'): IRDuration {
  if (kindOf(v) === 'duration') return v as IRDuration;
  const o = obj(v);
  if (o === null) throw new Invalid(`${what} must be { value, unit }, got ${describe(v)}`);
  const value = num(o['value'], `${what} value`);
  const unit = o['unit'];
  if (unit !== 'ms' && unit !== 's') throw new Invalid(`${what} unit must be ms or s, got ${describe(unit)}`);
  return { kind: 'duration', ms: unit === 's' ? value * 1000 : value };
}

function cubicBezier(v: unknown, what = 'cubicBezier'): IRCubicBezier {
  if (kindOf(v) === 'cubicBezier') return v as IRCubicBezier;
  if (!Array.isArray(v) || v.length !== 4) throw new Invalid(`${what} must be [x1, y1, x2, y2], got ${describe(v)}`);
  const p = v.map((x, i) => num(x, `${what} point ${i}`)) as [number, number, number, number];
  if (p[0] < 0 || p[0] > 1 || p[2] < 0 || p[2] > 1) throw new Invalid(`${what} x coordinates must lie in [0, 1]`);
  return { kind: 'cubicBezier', points: p };
}

function fontFamily(v: unknown, what = 'fontFamily'): IRFontFamily {
  if (kindOf(v) === 'fontFamily') return v as IRFontFamily;
  if (typeof v === 'string' && v !== '') return { kind: 'fontFamily', families: [v], opsz: null };
  if (Array.isArray(v) && v.length > 0 && v.every((f) => typeof f === 'string' && f !== '')) {
    return { kind: 'fontFamily', families: v as string[], opsz: null };
  }
  throw new Invalid(`${what} must be a non-empty string or array of strings, got ${describe(v)}`);
}

function fontWeight(v: unknown, what = 'fontWeight'): IRFontWeight {
  if (kindOf(v) === 'fontWeight') return v as IRFontWeight;
  if (typeof v === 'string') {
    const w = Object.hasOwn(FONT_WEIGHTS, v) ? FONT_WEIGHTS[v] : undefined;   // not "constructor" through the prototype
    if (w === undefined) throw new Invalid(`${what} keyword ${describe(v)} is not a DTCG font weight`);
    return { kind: 'fontWeight', weight: w };
  }
  const w = num(v, what);
  if (w < 1 || w > 1000) throw new Invalid(`${what} must lie in [1, 1000]`);
  return { kind: 'fontWeight', weight: w };
}

function strokeStyle(v: unknown, what = 'strokeStyle'): IRStrokeStyle {
  if (kindOf(v) === 'strokeStyle') return v as IRStrokeStyle;
  if (typeof v === 'string') {
    if (!(STROKE_KEYWORDS as readonly string[]).includes(v)) throw new Invalid(`${what} keyword ${describe(v)} is unknown`);
    return { kind: 'strokeStyle', keyword: v as StrokeKeyword, dashArray: [], lineCap: null };
  }
  const o = obj(v);
  if (o === null || !Array.isArray(o['dashArray'])) throw new Invalid(`${what} must be a keyword or { dashArray, lineCap }`);
  const cap = o['lineCap'];
  if (!(LINE_CAPS as readonly unknown[]).includes(cap)) throw new Invalid(`${what} lineCap must be round, butt or square`);
  return {
    kind: 'strokeStyle',
    keyword: null,
    dashArray: o['dashArray'].map((d, i) => dimension(d, `${what} dashArray ${i}`)),
    lineCap: cap as (typeof LINE_CAPS)[number],
  };
}

function border(v: unknown): IRBorder {
  if (kindOf(v) === 'border') return v as IRBorder;
  const o = obj(v);
  if (o === null) throw new Invalid(`border must be { color, width, style }, got ${describe(v)}`);
  return { kind: 'border', color: color(o['color'], 'border color'), width: dimension(o['width'], 'border width'), style: strokeStyle(o['style'], 'border style') };
}

function shadowLayer(v: unknown, i: number): IRShadowLayer {
  if (kindOf(v) === 'shadowLayer') return v as IRShadowLayer;
  const o = obj(v);
  if (o === null) throw new Invalid(`shadow layer ${i} must be an object`);
  const inset = o['inset'] ?? false;
  if (typeof inset !== 'boolean') throw new Invalid(`shadow layer ${i} inset must be a boolean`);
  return {
    kind: 'shadowLayer',
    color: color(o['color'], `shadow layer ${i} color`),
    offsetX: dimension(o['offsetX'], `shadow layer ${i} offsetX`),
    offsetY: dimension(o['offsetY'], `shadow layer ${i} offsetY`),
    blur: dimension(o['blur'], `shadow layer ${i} blur`),
    spread: dimension(o['spread'], `shadow layer ${i} spread`),
    inset,
  };
}

function shadow(v: unknown): IRShadow {
  if (kindOf(v) === 'shadow') return v as IRShadow;
  const layers = Array.isArray(v) ? v : [v];
  if (layers.length === 0) throw new Invalid('shadow must have at least one layer');
  return { kind: 'shadow', layers: layers.map((l, i) => shadowLayer(l, i)) };
}

function gradient(v: unknown): IRGradient {
  if (kindOf(v) === 'gradient') return v as IRGradient;
  if (!Array.isArray(v) || v.length < 2) throw new Invalid(`gradient must be an array of at least two stops, got ${describe(v)}`);
  const stops = v.map((s, i): IRGradientStop => {
    if (kindOf(s) === 'gradientStop') return s as IRGradientStop;
    const o = obj(s);
    if (o === null) throw new Invalid(`gradient stop ${i} must be { color, position }`);
    const position = num(o['position'], `gradient stop ${i} position`);
    if (position < 0 || position > 1) throw new Invalid(`gradient stop ${i} position must lie in [0, 1]`);
    return { kind: 'gradientStop', color: color(o['color'], `gradient stop ${i} color`), position };
  });
  return { kind: 'gradient', stops, angle: null, grain: null, scheme: null, temperature: null, bloom: null };
}

export function boldWeightOf(s: number): number {
  return s <= 300 ? 400 : Math.min(900, s + 200);
}

function typography(v: unknown): IRTypography {
  if (kindOf(v) === 'typography') return v as IRTypography;
  const o = obj(v);
  if (o === null) throw new Invalid(`typography must be an object, got ${describe(v)}`);
  const weight = fontWeight(o['fontWeight'], 'typography fontWeight');
  return {
    kind: 'typography',
    fontFamily: fontFamily(o['fontFamily'], 'typography fontFamily'),
    fontSize: dimension(o['fontSize'], 'typography fontSize'),
    fontWeight: weight,
    boldWeight: boldWeightOf(weight.weight),
    darkWeight: null,
    lineHeight: num(o['lineHeight'], 'typography lineHeight'),
    letterSpacing: dimension(o['letterSpacing'], 'typography letterSpacing'),
    // Defaults for tokens that are not roles; `type/role-metadata` reports a role without them.
    slot: 'ui',
    numeric: 'proportional',
    textStyle: 'body',
  };
}

function transition(v: unknown): IRTransition {
  if (kindOf(v) === 'transition') return v as IRTransition;
  const o = obj(v);
  if (o === null) throw new Invalid(`transition must be { duration, delay, timingFunction }, got ${describe(v)}`);
  return {
    kind: 'transition',
    duration: duration(o['duration'], 'transition duration'),
    delay: duration(o['delay'], 'transition delay'),
    timingFunction: cubicBezier(o['timingFunction'], 'transition timingFunction'),
    spring: null,
  };
}

function number(v: unknown): IRNumber {
  if (kindOf(v) === 'number') return v as IRNumber;
  return { kind: 'number', value: num(v, 'number'), flag: false };
}

function base(type: TokenType, v: unknown): IRValue {
  switch (type) {
    case 'color': return color(v);
    case 'dimension': return dimension(v);
    case 'duration': return duration(v);
    case 'number': return number(v);
    case 'fontFamily': return fontFamily(v);
    case 'fontWeight': return fontWeight(v);
    case 'cubicBezier': return cubicBezier(v);
    case 'strokeStyle': return strokeStyle(v);
    case 'border': return border(v);
    case 'transition': return transition(v);
    case 'shadow': return shadow(v);
    case 'gradient': return gradient(v);
    case 'typography': return typography(v);
  }
}

/** Folds the token's own functional extension keys into the value (§5.4). */
function fold(value: IRValue, ext: Record<string, unknown>): IRValue {
  switch (value.kind) {
    case 'color': {
      const a = ext['alpha'];
      return typeof a === 'number' ? withAlpha(value, a) : value;
    }
    case 'number': {
      const f = ext['flag'];
      return typeof f === 'boolean' && f !== value.flag ? { ...value, flag: f } : value;
    }
    case 'fontFamily': {
      const o = ext['opsz'];
      return typeof o === 'number' && o !== value.opsz ? { ...value, opsz: o } : value;
    }
    case 'typography': {
      let t = value;
      const slot = ext['slot'];
      if ((slot === 'ui' || slot === 'display' || slot === 'mono') && slot !== t.slot) t = { ...t, slot };
      const numeric = ext['numeric'];
      if ((numeric === 'proportional' || numeric === 'tabular') && numeric !== t.numeric) t = { ...t, numeric };
      const style = ext['textStyle'];
      if (typeof style === 'string' && (TEXT_STYLES as readonly string[]).includes(style) && style !== t.textStyle) {
        t = { ...t, textStyle: style as TextStyleName };
      }
      const dark = ext['darkWeight'];
      if (typeof dark === 'number' && dark !== t.darkWeight) t = { ...t, darkWeight: dark };
      return t;
    }
    case 'transition': {
      const s = obj(ext['spring']);
      if (s === null) return value;
      const spring: IRSpring = {
        duration: num(s['duration'], 'app.prism.spring.duration'),
        bounce: num(s['bounce'], 'app.prism.spring.bounce'),
        blendDuration: s['blendDuration'] === undefined ? 0 : num(s['blendDuration'], 'app.prism.spring.blendDuration'),
      };
      const same = value.spring !== null && value.spring.duration === spring.duration && value.spring.bounce === spring.bounce &&
        value.spring.blendDuration === spring.blendDuration;
      return same ? value : { ...value, spring };
    }
    case 'gradient': {
      let g = value;
      const angle = ext['angle'];
      if (typeof angle === 'number' && angle !== g.angle) g = { ...g, angle };
      const grain = ext['grain'];
      if (typeof grain === 'number' && grain !== g.grain) g = { ...g, grain };
      const scheme = ext['scheme'];
      if ((scheme === 'light' || scheme === 'dark') && scheme !== g.scheme) g = { ...g, scheme };
      const temperature = ext['temperature'];
      if ((temperature === 'warm' || temperature === 'cool') && temperature !== g.temperature) g = { ...g, temperature };
      const bloom = obj(ext['bloom']);
      if (bloom !== null) {
        const next = { alpha: num(bloom['alpha'], 'app.prism.bloom.alpha'), blur: bloom['blur'] === undefined || bloom['blur'] === null ? null : num(bloom['blur'], 'app.prism.bloom.blur') };
        if (g.bloom === null || g.bloom.alpha !== next.alpha || g.bloom.blur !== next.blur) g = { ...g, bloom: next };
      }
      return g;
    }
    default:
      return value;
  }
}

/**
 * `normalize(type, value, ownExtensions, diagnostics) → IRValue`. `ownExtensions` is the token's own
 * `$extensions["app.prism"]` (aliases carry none except `alpha`; source checks enforce it).
 */
export function normalize(type: TokenType, value: unknown, ownExtensions: unknown, diagnostics: Diagnostic[], where: NormalizeWhere = {}): unknown {
  // An untyped token has already been reported (type/untyped) by the typing preprocessor.
  if ((type as unknown) === undefined || (type as unknown) === null) return value;
  if (!(TOKEN_TYPES as readonly unknown[]).includes(type)) {
    diagnostics.push(error('value/invalid', `cannot normalize a value of unknown $type ${JSON.stringify(type)}`, { ...where }));
    return value;
  }
  const ext = obj(ownExtensions) ?? {};
  for (const key of Object.keys(ext)) {
    if (METADATA_KEYS.includes(key) || SOURCE_CHECKED_KEYS.includes(key)) continue;
    const applies = Object.hasOwn(EXTENSION_KEY_TYPES, key) ? EXTENSION_KEY_TYPES[key] : undefined;
    if (applies !== undefined && applies !== type) {
      diagnostics.push(
        error('extension/schema', `$extensions["app.prism"].${key} applies to ${applies} tokens, but ${where.tokenId ?? 'the token'} is a ${type} token`, {
          ...where,
          hint: `remove "${key}"`,
        }),
      );
    }
  }
  try {
    return fold(base(type, value), ext);
  } catch (e) {
    if (!(e instanceof Invalid)) throw e;
    diagnostics.push(error('value/invalid', `invalid ${type} value: ${e.message}`, { ...where }));
    return value;
  }
}

/** True when every level of the value carries a `kind` (IR invariant 4). */
export function isNormalized(value: unknown): boolean {
  const k = kindOf(value);
  if (k === null) return false;
  const v = value as Record<string, unknown>;
  switch (k) {
    case 'color': case 'dimension': case 'duration': case 'number': case 'fontFamily': case 'fontWeight': case 'cubicBezier':
      return true;
    case 'strokeStyle':
      return (v['dashArray'] as unknown[]).every(isNormalized);
    case 'border':
      return isNormalized(v['color']) && isNormalized(v['width']) && isNormalized(v['style']);
    case 'shadow':
      return (v['layers'] as unknown[]).every((l) => {
        const o = obj(l);
        return o !== null && o['kind'] === 'shadowLayer' && ['color', 'offsetX', 'offsetY', 'blur', 'spread'].every((f) => isNormalized(o[f]));
      });
    case 'gradient':
      return (v['stops'] as unknown[]).every((s) => {
        const o = obj(s);
        return o !== null && o['kind'] === 'gradientStop' && isNormalized(o['color']);
      });
    case 'typography':
      return ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing'].every((f) => isNormalized(v[f]));
    case 'transition':
      return ['duration', 'delay', 'timingFunction'].every((f) => isNormalized(v[f]));
    default:
      return false;
  }
}
