// The CSS model of `<brand>/tokens.css` and `motion.css` (ARCHITECTURE §9.2, §9.3; ADR-0019).
//
// Every web token renders to one or more declarations: the base declaration and its derived ones
// (§8). For each declaration the model computes, in every runtime permutation of the brand's web
// scope, its *text* (`var(--ds-<target>)` where the token or a sub-value aliases an emitted token,
// else the literal) and its *literal* (the value it computes to, with its P3 and `linear()` twins).
// Membership follows from how the two vary, one axis at a time:
//
//   text and literal invariant                  → `:root`
//   text varies along a nestable axis A         → one block per context of A (every member in each, so a
//                                                 nested scope resets what an outer one set), A's media
//                                                 fallback block, and for colorScheme the variant groups
//   text varies along a root-only axis A        → `:root` for the default, `:root[attr="v"]` and A's media
//                                                 fallback for the members whose text differs there
//   text invariant, literal varies along
//     a nestable axis A                         → A's rescope block `:root, [attr]` (a custom property
//                                                 inherits its computed value, so nested scopes redeclare it)
//     a root-only axis A                        → `:root` in A's default block
//
// Selector forms, attribute names and queries come from WEB_RUNTIME through web.ts (ADR-0019 rule 1);
// fallback selectors list every valid value (rule 2); only colorScheme and density appear outside
// `:root` (rule 4). Twins follow the block they belong to, with the twin condition added.
import { COLOR_SCHEME_MODIFIER } from '../../config.ts';
import { error, type Diagnostic } from '../../ir/diagnostics.ts';
import { cssName } from '../../ir/naming.ts';
import type { IRToken, IRValue } from '../../ir/types.ts';
import { cssColor, cssGradient, cssParts, emitsAlias, part, TYPOGRAPHY_SUFFIX_OF, CSS_TWIN_CONDITIONS, type CssPart, type CssTwinKind } from '../../transforms/index.ts';
import { attr, isMotionToken, isWebToken, mediaFor, notValid, tokenAt, type WebAxis, type WebScope } from './web.ts';

export const CSS_LAYER = 'ds.tokens';

export interface CssDecl {
  readonly name: string;
  readonly value: string;
  /** The token the declaration renders; null for `color-scheme`. */
  readonly tokenId: string | null;
}

export interface CssRule {
  /** Block header comment; '' for none. */
  readonly comment: string;
  /** Media conditions, ANDed. */
  readonly media: readonly string[];
  /** `@supports` conditions, ANDed, inside the media conditions. */
  readonly supports: readonly string[];
  readonly selectors: readonly string[];
  readonly decls: readonly CssDecl[];
}

export interface CssSheet {
  readonly header: string;
  readonly layer: string;
  readonly rules: readonly CssRule[];
}

export type SheetName = 'tokens' | 'motion';

/** One declaration of one token, across the permutations of a web scope. */
export interface DeclSpec {
  readonly name: string;
  readonly tokenId: string;
  readonly suffix: string;
  readonly sheet: SheetName;
  /** Per permutation index of the scope: the declaration's text. */
  readonly texts: readonly string[];
  /** Per permutation index: the value it computes to, with twins (the IR's literal rendering). */
  readonly literals: readonly CssPart[];
}

/** How a declaration varies (runtime modifier names) and where it goes. */
export interface Membership {
  readonly spec: DeclSpec;
  readonly textAxes: readonly string[];
  readonly literalAxes: readonly string[];
  readonly place: { readonly kind: 'invariant' } | { readonly kind: 'axis' | 'rescope' | 'root'; readonly axis: string };
}

export interface CssModel {
  readonly scope: WebScope;
  readonly specs: readonly DeclSpec[];
  readonly memberships: readonly Membership[];
  readonly tokens: readonly CssRule[];
  readonly motion: readonly CssRule[];
  readonly diagnostics: readonly Diagnostic[];
}

// ---- literal and text rendering ----

const partsMemo = new Map<string, readonly CssPart[]>();

function literalParts(value: IRValue): readonly CssPart[] {
  const key = JSON.stringify(value);
  let hit = partsMemo.get(key);
  if (hit === undefined) {
    hit = cssParts(value);
    partsMemo.set(key, hit);
  }
  return hit;
}

function partKey(p: CssPart): string {
  return JSON.stringify([p.value, p.twins]);
}

/** A transition's base declaration: its own `-duration`, `-easing` and, when some context delays, `-delay` (§7.6). */
function transitionShorthand(name: string, withDelay: boolean): string {
  return `var(${name}-duration) var(${name}-easing)${withDelay ? ` var(${name}-delay)` : ''}`;
}

function transitionLiteral(parts: readonly CssPart[], withDelay: boolean): CssPart {
  const get = (suffix: string): CssPart | undefined => parts.find((p) => p.suffix === suffix);
  const duration = get('-duration')?.value ?? '';
  const easing = get('-easing');
  const delay = withDelay ? ` ${get('-delay')?.value ?? ''}` : '';
  const twin = easing?.twins.find((t) => t.kind === 'noLinear');
  return part('', `${duration} ${easing?.value ?? ''}${delay}`, twin === undefined ? [] : [{ kind: 'noLinear', value: `${duration} ${twin.value}${delay}` }]);
}

/** Sub-alias key → the derived declaration it feeds, for the composites whose parts may reference a token. */
const SUB_PART: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  typography: TYPOGRAPHY_SUFFIX_OF,
  transition: { timingFunction: '-easing', duration: '-duration', delay: '-delay' },
};

interface RenderedToken {
  readonly literals: readonly CssPart[];
  readonly texts: readonly string[];
}

/** The literal parts and texts of one token in one permutation (`withDelay`: some context of a transition delays). */
function renderToken(t: IRToken, lookup: (id: string) => IRToken | undefined, withDelay: boolean): RenderedToken {
  let literals = literalParts(t.value);
  const name = cssName(t.id);
  if (t.value.kind === 'transition') literals = literals.map((p) => (p.suffix === '' ? transitionLiteral(literals, withDelay) : p));
  const baseLiteralOf = (id: string): CssPart | undefined => {
    const target = lookup(id);
    return target === undefined ? undefined : literalParts(target.value).find((p) => p.suffix === '');
  };
  const alias = emitsAlias(t);
  const target = alias === null || !isWebToken(alias) ? undefined : lookup(alias);
  const texts = literals.map((p) => {
    if (t.value.kind === 'transition' && p.suffix === '') return transitionShorthand(name, withDelay);
    if (target !== undefined && alias !== null) {
      const mine = partKey(p);
      const theirs = literalParts(target.value).find((q) => q.suffix === p.suffix);
      // A whole-value alias computes to its target's value; the check keeps a renderer quirk from
      // turning into a wrong var().
      if (theirs !== undefined && partKey(theirs) === mine) return `var(${cssName(alias)}${p.suffix})`;
      return p.value;
    }
    const subs = SUB_PART[t.value.kind];
    if (subs !== undefined) {
      for (const [key, suffix] of Object.entries(subs)) {
        const s = t.subAliases[key];
        if (suffix !== p.suffix || s === undefined || !isWebToken(s)) continue;
        const theirs = baseLiteralOf(s);
        if (theirs !== undefined && partKey(theirs) === partKey(p)) return `var(${cssName(s)})`;
      }
    }
    if (t.value.kind === 'gradient' && p.suffix === '') {
      const g = t.value;
      let replaced = false;
      const overrides = g.stops.map((stop, i) => {
        const s = t.subAliases[`stops.${i}.color`];
        if (s === undefined || !isWebToken(s)) return null;
        const theirs = baseLiteralOf(s);
        const own = cssColor(stop.color);
        const ownPart = part('', own.base, own.p3 === null ? [] : [{ kind: 'p3', value: own.p3 }]);
        if (theirs === undefined || partKey(theirs) !== partKey(ownPart)) return null;
        replaced = true;
        return `var(${cssName(s)})`;
      });
      if (replaced) return cssGradient(g, overrides).find((q) => q.suffix === '')?.value ?? p.value;
    }
    return p.value;
  });
  return { literals, texts };
}

/** Every declaration of every web token of the scope, in canonical token order, base first (§12). */
export function declSpecs(scope: WebScope): { specs: DeclSpec[]; diagnostics: Diagnostic[] } {
  const specs: DeclSpec[] = [];
  const diagnostics: Diagnostic[] = [];
  const defaultPerm = scope.perms[scope.defaultIndex];
  if (defaultPerm === undefined) return { specs, diagnostics };
  for (const id of scope.ids) {
    if (!isWebToken(id)) continue;
    const first = tokenAt(defaultPerm, id);
    const sheet: SheetName = isMotionToken(id, first.type) ? 'motion' : 'tokens';
    const withDelay = first.type === 'transition' && scope.perms.some((p) => {
      const v = tokenAt(p, id).value;
      return v.kind === 'transition' && v.delay.ms !== 0;
    });
    const rendered = scope.perms.map((p) => renderToken(tokenAt(p, id), (x) => p.tokens.get(x), withDelay));
    const suffixes = rendered[scope.defaultIndex]?.literals.map((p) => p.suffix) ?? [];
    const mismatch = rendered.findIndex((r) => r.literals.map((p) => p.suffix).join('|') !== suffixes.join('|'));
    if (mismatch >= 0) {
      diagnostics.push(error('css/part-mismatch', `${id} renders the declarations ${suffixes.join(', ') || '(base)'} in ${defaultPerm.key} but ${rendered[mismatch]?.literals.map((p) => p.suffix).join(', ') || '(base)'} in ${scope.perms[mismatch]?.key ?? ''}; a token's CSS declarations are the same in every context`, { tokenId: id, file: first.source.file, line: first.source.line }));
      continue;
    }
    suffixes.forEach((suffix, k) => {
      specs.push({
        name: `${cssName(id)}${suffix}`,
        tokenId: id,
        suffix,
        sheet,
        texts: rendered.map((r) => r.texts[k] ?? ''),
        literals: rendered.map((r) => r.literals[k] ?? part(suffix, '')),
      });
    });
  }
  const seen = new Map<string, string>();
  for (const s of specs) {
    const prev = seen.get(s.name);
    if (prev !== undefined && prev !== s.tokenId) {
      diagnostics.push(error('naming/css-collision', `${prev} and ${s.tokenId} both emit ${s.name}`, { tokenId: s.tokenId, hint: 'rename one of the tokens' }));
    }
    seen.set(s.name, s.tokenId);
  }
  return { specs, diagnostics };
}

// ---- membership ----

function variesAlong(scope: WebScope, values: readonly string[], axis: WebAxis): boolean {
  const base = values[scope.defaultIndex];
  return axis.modifier.contexts.some((c) => c !== axis.modifier.default && values[scope.single(axis.axis, c)] !== base);
}

/**
 * For a declaration varying along `axes` (≤ 1) every permutation has the value of its single-axis
 * variation; returns the first permutation index where it does not (a masked interaction), else -1.
 */
function firstCompositionFailure(scope: WebScope, values: readonly string[], axes: readonly string[]): number {
  const [a] = axes;
  for (let i = 0; i < values.length; i++) {
    const input = scope.inputs[i] ?? {};
    const expected = a === undefined ? values[scope.defaultIndex] : values[scope.single(a, input[a] ?? '')];
    if (values[i] !== expected) return i;
  }
  return -1;
}

export function classify(scope: WebScope, specs: readonly DeclSpec[]): { memberships: Membership[]; diagnostics: Diagnostic[] } {
  const memberships: Membership[] = [];
  const diagnostics: Diagnostic[] = [];
  const reported = new Set<string>();
  const report = (code: string, spec: DeclSpec, message: string, hint?: string): void => {
    if (reported.has(`${code}|${spec.tokenId}`)) return;
    reported.add(`${code}|${spec.tokenId}`);
    diagnostics.push(error(code, message, { tokenId: spec.tokenId, ...(hint === undefined ? {} : { hint }) }));
  };
  for (const spec of specs) {
    const literalKeys = spec.literals.map(partKey);
    const textAxes = scope.axes.filter((a) => variesAlong(scope, spec.texts, a)).map((a) => a.axis);
    const literalAxes = scope.axes.filter((a) => variesAlong(scope, literalKeys, a)).map((a) => a.axis);
    const all = [...new Set([...textAxes, ...literalAxes])];
    if (spec.sheet === 'tokens' && all.includes('motion')) {
      report('css/motion-literal', spec, `${spec.name} (${spec.tokenId}) depends on motion but is not a motion token; motion-dependent text belongs in motion.css (ARCHITECTURE §9.2)`, 'make it a duration, cubicBezier or transition token, or move it under sys.motion');
      continue;
    }
    if (spec.sheet === 'motion' && all.some((a) => a !== 'motion')) {
      report('css/motion-axes', spec, `${spec.name} (${spec.tokenId}) is a motion token that depends on ${all.filter((a) => a !== 'motion').join(', ')}; motion.css switches on the motion axis only (ARCHITECTURE §9.3)`);
      continue;
    }
    if (textAxes.length > 1 || literalAxes.length > 1 || (textAxes.length === 1 && literalAxes.length === 1 && textAxes[0] !== literalAxes[0])) {
      report('css/text-axes', spec, `${spec.name} (${spec.tokenId}) has text depending on ${textAxes.join(', ') || 'nothing'} and value depending on ${literalAxes.join(', ') || 'nothing'}; a CSS declaration depends on at most one runtime axis (ARCHITECTURE §5.7 item 7)`, 'alias a token of the same modifier');
      continue;
    }
    const brokenText = firstCompositionFailure(scope, spec.texts, textAxes);
    const brokenLiteral = firstCompositionFailure(scope, literalKeys, literalAxes);
    if (brokenText >= 0 || brokenLiteral >= 0) {
      report('css/composition', spec, `${spec.name} (${spec.tokenId}) in ${scope.perms[Math.max(brokenText, brokenLiteral)]?.key ?? ''} differs from its single-axis variation; the blocks of tokens.css cannot express it`);
      continue;
    }
    const [textAxis] = textAxes;
    const [literalAxis] = literalAxes;
    let place: Membership['place'];
    if (textAxis !== undefined) place = { kind: 'axis', axis: textAxis };
    else if (literalAxis !== undefined) {
      const axis = scope.axes.find((a) => a.axis === literalAxis);
      place = { kind: axis?.runtime.nestable === true ? 'rescope' : 'root', axis: literalAxis };
    } else place = { kind: 'invariant' };
    memberships.push({ spec, textAxes, literalAxes, place });
  }
  return { memberships, diagnostics };
}

// ---- blocks ----

interface Entry {
  readonly spec: DeclSpec | null;
  readonly name: string;
  readonly text: string;
  readonly literal: CssPart | null;
}

const TWIN_KINDS: readonly CssTwinKind[] = ['p3', 'noLinear'];

function entry(spec: DeclSpec, index: number): Entry {
  return { spec, name: spec.name, text: spec.texts[index] ?? '', literal: spec.literals[index] ?? null };
}

function colorSchemeEntry(value: string): Entry {
  return { spec: null, name: 'color-scheme', text: value, literal: null };
}

/** The rule and, after it, one twin rule per twin kind its literal declarations carry (§9.2 item 5). */
function emit(out: CssRule[], comment: string, media: readonly string[], selectors: readonly string[], entries: readonly Entry[]): void {
  if (entries.length === 0) return;
  out.push({ comment, media, supports: [], selectors, decls: entries.map((e) => ({ name: e.name, value: e.text, tokenId: e.spec?.tokenId ?? null })) });
  for (const kind of TWIN_KINDS) {
    const twinDecls: CssDecl[] = [];
    for (const e of entries) {
      if (e.literal === null || e.spec === null || e.text !== e.literal.value) continue;
      const twin = e.literal.twins.find((t) => t.kind === kind);
      if (twin !== undefined) twinDecls.push({ name: e.name, value: twin.value, tokenId: e.spec.tokenId });
    }
    if (twinDecls.length === 0) continue;
    const c = CSS_TWIN_CONDITIONS[kind];
    out.push({
      comment: '',
      media: c.atRule === '@media' ? [...media, c.condition] : media,
      supports: c.atRule === '@supports' ? [c.condition] : [],
      selectors,
      decls: twinDecls,
    });
  }
}

function nestableBlocks(out: CssRule[], scope: WebScope, axis: WebAxis, members: readonly Membership[], rescope: readonly Membership[]): void {
  const rt = axis.runtime;
  const isScheme = axis.axis === COLOR_SCHEME_MODIFIER;
  const blockFor = (value: string, context: string): Entry[] => {
    const i = scope.single(axis.axis, context);
    const es = members.map((m) => entry(m.spec, i));
    return isScheme ? [colorSchemeEntry(value), ...es] : es;
  };
  const defaultValue = rt.values[0] ?? '';
  for (const [value, context] of axis.contexts) {
    const selectors = value === defaultValue ? [':root', attr(rt, value)] : [attr(rt, value)];
    emit(out, `${axis.axis}: ${value}${value === defaultValue ? ' (default)' : ''}`, [], selectors, blockFor(value, context));
  }
  const fallback = axis.contexts.get(rt.media.value);
  if (fallback !== undefined && (isScheme || members.length > 0)) {
    emit(out, `${axis.axis}: ${rt.media.value} under ${rt.media.query} without a valid ${rt.attribute}`, [rt.media.query], [`:root${notValid(rt)}`], blockFor(rt.media.value, fallback));
  }
  emit(out, `${axis.axis} rescope: same text in every context, value depends on ${axis.axis}`, [], [':root', `[${rt.attribute}]`], rescope.map((m) => entry(m.spec, scope.defaultIndex)));
  if (isScheme) variantBlocks(out, scope, axis, members);
}

function variantBlocks(out: CssRule[], scope: WebScope, scheme: WebAxis, members: readonly Membership[]): void {
  const S = scheme.runtime;
  for (const variant of scope.variants) {
    const V = variant.runtime;
    const flagValue = 'variant' in V.resolver ? V.resolver.value : '';
    const F = attr(V, flagValue);
    const flagMedia = mediaFor(V, flagValue);
    for (const [s, cv] of variant.contexts) {
      const cs = scheme.contexts.get(s);
      if (cs === undefined) continue;
      const iv = scope.single(scheme.axis, cv);
      const ib = scope.single(scheme.axis, cs);
      const delta = members.filter((m) => m.spec.texts[iv] !== m.spec.texts[ib]).map((m) => entry(m.spec, iv));
      if (delta.length === 0) continue;
      const S_s = attr(S, s);
      const schemeMedia = mediaFor(S, s);
      emit(out, `${scheme.axis} variant: ${cv} (delta over ${cs})`, [], [`:root${F}${S_s}`, `:root${F} ${S_s}`], delta);
      if (schemeMedia !== null) emit(out, '', [schemeMedia], [`:root${F}${notValid(S)}`], delta);
      if (flagMedia !== null) {
        emit(out, '', [flagMedia], [`:root${notValid(V)}${S_s}`, `:root${notValid(V)} ${S_s}`], delta);
        if (schemeMedia !== null) emit(out, '', [flagMedia, schemeMedia], [`:root${notValid(V)}${notValid(S)}`], delta);
      }
    }
  }
}

function rootBlocks(out: CssRule[], scope: WebScope, axis: WebAxis, members: readonly Membership[], rooted: readonly Membership[]): void {
  const rt = axis.runtime;
  const defaultValue = rt.values[0] ?? '';
  const at = (context: string): number => scope.single(axis.axis, context);
  const defaultContext = axis.contexts.get(defaultValue) ?? axis.modifier.default;
  // Members and rooted declarations share the default block, in token order (§12 rule 1).
  const order = new Map(scope.ids.map((id, i) => [id, i]));
  const byToken = (a: Membership, b: Membership): number => (order.get(a.spec.tokenId) ?? 0) - (order.get(b.spec.tokenId) ?? 0) || (a.spec.suffix < b.spec.suffix ? -1 : a.spec.suffix > b.spec.suffix ? 1 : 0);
  emit(out, `${axis.axis}: ${defaultValue} (default)`, [], [':root'], [...members, ...rooted].sort(byToken).map((m) => entry(m.spec, at(defaultContext))));
  const differing = (context: string): Entry[] => members.filter((m) => m.spec.texts[at(context)] !== m.spec.texts[at(defaultContext)]).map((m) => entry(m.spec, at(context)));
  for (const [value, context] of axis.contexts) {
    if (value === defaultValue) continue;
    emit(out, `${axis.axis}: ${value}`, [], [`:root${attr(rt, value)}`], differing(context));
  }
  const fallback = axis.contexts.get(rt.media.value);
  if (fallback !== undefined && rt.media.value !== defaultValue) {
    emit(out, `${axis.axis}: ${rt.media.value} under ${rt.media.query} without a valid ${rt.attribute}`, [rt.media.query], [`:root${notValid(rt)}`], differing(fallback));
  }
}

function sheetRules(scope: WebScope, memberships: readonly Membership[], sheet: SheetName): CssRule[] {
  const mine = memberships.filter((m) => m.spec.sheet === sheet);
  const out: CssRule[] = [];
  emit(out, 'invariant', [], [':root'], mine.filter((m) => m.place.kind === 'invariant').map((m) => entry(m.spec, scope.defaultIndex)));
  for (const axis of scope.axes) {
    const members = mine.filter((m) => m.place.kind === 'axis' && m.place.axis === axis.axis);
    const others = mine.filter((m) => (m.place.kind === 'rescope' || m.place.kind === 'root') && m.place.axis === axis.axis);
    if (members.length === 0 && others.length === 0) continue;
    if (axis.runtime.nestable) nestableBlocks(out, scope, axis, members, others);
    else rootBlocks(out, scope, axis, members, others);
  }
  return out;
}

const modelCache = new WeakMap<WebScope, CssModel>();

/** The CSS model of one brand's web scope: both sheets, their declarations and every diagnostic. */
export function cssModel(scope: WebScope): CssModel {
  const hit = modelCache.get(scope);
  if (hit !== undefined) return hit;
  const { specs, diagnostics } = declSpecs(scope);
  const classified = classify(scope, specs);
  const model: CssModel = {
    scope,
    specs,
    memberships: classified.memberships,
    tokens: sheetRules(scope, classified.memberships, 'tokens'),
    motion: sheetRules(scope, classified.memberships, 'motion'),
    diagnostics: [...diagnostics, ...classified.diagnostics],
  };
  modelCache.set(scope, model);
  return model;
}
