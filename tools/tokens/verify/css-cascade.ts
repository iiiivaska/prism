// Cascade simulator over the CssRule model (ARCHITECTURE §9.12; ADR-0019 rules 2, 4 and 5). It
// evaluates `<brand>/tokens.css` and `motion.css` together on small element trees: selector matching
// for exactly the forms Prism emits (`:root`, attribute tests, `:not()` with a selector list, which
// counts as its most specific argument, and the descendant combinator), specificity, source order,
// one layer, inheritance of computed values, `var()` substitution, and `@media` / `@supports`
// conditions over an environment of media features. Every custom property of every element must
// compute to the IR's literal rendering for the element's effective context, which is derived here
// from the attribute rules of ADR-0019 §1, independently of the selectors under test:
//
//   colorScheme, density   nearest ancestor-or-self with a valid value, else `<html>`'s media fallback
//   contrast, transparency, modality, motion   the valid value on `<html>`, else its media fallback
//
// Only listed values count; absent, empty and unknown values behave like no attribute. The 96 runtime
// combinations per brand are the resolver's 72 permutations plus the 24 contrast + transparency
// combinations, synthesized as s ⊕ ΔIC(s) ⊕ ΔRT(s) (the deltas are disjoint, §5.7).
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import type { CssModel, CssRule, DeclSpec } from '../formats/css/model.ts';
import type { WebScope } from '../formats/css/web.ts';
import type { CssPart } from '../transforms/index.ts';
import { WEB_RUNTIME } from '../config.ts';

// ---- environment and media conditions ----

/** Media features and `@supports` answers of one simulated browser. */
export interface Env {
  readonly prefersDark: boolean;
  readonly prefersContrastMore: boolean;
  readonly prefersReducedTransparency: boolean;
  readonly anyPointerCoarse: boolean;
  readonly hover: boolean;
  readonly pointerFine: boolean;
  readonly prefersReducedMotion: boolean;
  readonly p3: boolean;
  /** `transition-timing-function: linear(0, 1)` is supported. */
  readonly linear: boolean;
}

export const NEUTRAL_ENV: Env = {
  prefersDark: false, prefersContrastMore: false, prefersReducedTransparency: false, anyPointerCoarse: false,
  hover: true, pointerFine: true, prefersReducedMotion: false, p3: false, linear: true,
};

function feature(term: string, env: Env): boolean {
  const m = /^\(\s*([a-z-]+)\s*:\s*([a-z0-9-]+)\s*\)$/.exec(term.trim());
  if (m === null) throw new Error(`cascade simulator: unsupported media feature ${term}`);
  const [, name, value] = m;
  switch (`${name ?? ''}:${value ?? ''}`) {
    case 'prefers-color-scheme:dark': return env.prefersDark;
    case 'prefers-color-scheme:light': return !env.prefersDark;
    case 'prefers-contrast:more': return env.prefersContrastMore;
    case 'prefers-reduced-transparency:reduce': return env.prefersReducedTransparency;
    case 'any-pointer:coarse': return env.anyPointerCoarse;
    case 'hover:hover': return env.hover;
    case 'pointer:fine': return env.pointerFine;
    case 'prefers-reduced-motion:reduce': return env.prefersReducedMotion;
    case 'color-gamut:p3': return env.p3;
    default: throw new Error(`cascade simulator: unsupported media feature ${term}`);
  }
}

/** `A and B`, `not all and A and B` (the whole query negated, MQ4 §2.2). */
export function evalMedia(query: string, env: Env): boolean {
  const q = query.trim();
  const NOT = /^not\s+all\s+and\s+/;
  if (NOT.test(q)) return !evalMedia(q.replace(NOT, ''), env);
  return q.split(/\s+and\s+/).every((t) => feature(t, env));
}

export function evalSupports(condition: string, env: Env): boolean {
  const c = condition.trim();
  if (c === 'not (transition-timing-function: linear(0, 1))') return !env.linear;
  if (c === '(transition-timing-function: linear(0, 1))') return env.linear;
  throw new Error(`cascade simulator: unsupported @supports condition ${condition}`);
}

// ---- elements and selectors ----

export interface El {
  readonly label: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly parent: El | null;
}

type Simple =
  | { readonly kind: 'root' }
  | { readonly kind: 'has'; readonly name: string }
  | { readonly kind: 'eq'; readonly name: string; readonly value: string }
  | { readonly kind: 'not'; readonly list: readonly Compound[] };
type Compound = readonly Simple[];
interface Complex { readonly compounds: readonly Compound[]; readonly specificity: number }

function specificityOf(c: Compound): number {
  return c.reduce((n, s) => n + (s.kind === 'not' ? Math.max(0, ...s.list.map(specificityOf)) : 1), 0);
}

/** Parses the selector forms Prism emits; anything else throws, so a new form fails loudly. */
export function parseSelector(text: string): Complex {
  let i = 0;
  const s = text.trim();
  const fail = (): never => {
    throw new Error(`cascade simulator: unsupported selector ${text}`);
  };
  const compound = (inNot: boolean): Compound => {
    const out: Simple[] = [];
    for (;;) {
      if (s.startsWith(':root', i)) {
        out.push({ kind: 'root' });
        i += 5;
      } else if (s.startsWith(':not(', i)) {
        i += 5;
        const list: Compound[] = [];
        for (;;) {
          while (s[i] === ' ') i++;
          list.push(compound(true));
          while (s[i] === ' ') i++;
          if (s[i] === ',') {
            i++;
            continue;
          }
          if (s[i] === ')') {
            i++;
            break;
          }
          fail();
        }
        out.push({ kind: 'not', list });
      } else if (s[i] === '[') {
        const m = /^\[([a-z-]+)(?:="([^"]*)")?\]/.exec(s.slice(i));
        if (m === null) fail();
        const [whole = '', name = '', value] = m ?? [];
        out.push(value === undefined ? { kind: 'has', name } : { kind: 'eq', name, value });
        i += whole.length;
      } else break;
    }
    if (out.length === 0 || (inNot && out.some((x) => x.kind === 'not'))) fail();
    return out;
  };
  const compounds: Compound[] = [];
  for (;;) {
    compounds.push(compound(false));
    if (i >= s.length) break;
    if (s[i] !== ' ') fail();
    while (s[i] === ' ') i++;
  }
  return { compounds, specificity: compounds.reduce((n, c) => n + specificityOf(c), 0) };
}

function matchesCompound(c: Compound, el: El): boolean {
  return c.every((x) => {
    switch (x.kind) {
      case 'root': return el.parent === null;
      case 'has': return x.name in el.attrs;
      case 'eq': return el.attrs[x.name] === x.value;
      case 'not': return !x.list.some((inner) => matchesCompound(inner, el));
    }
  });
}

function matchesFrom(cs: readonly Compound[], k: number, el: El): boolean {
  const c = cs[k];
  if (c === undefined || !matchesCompound(c, el)) return false;
  if (k === 0) return true;
  for (let a = el.parent; a !== null; a = a.parent) if (matchesFrom(cs, k - 1, a)) return true;
  return false;
}

export function matchesSelector(sel: Complex, el: El): boolean {
  return matchesFrom(sel.compounds, sel.compounds.length - 1, el);
}

// ---- the cascade ----

interface CompiledRule {
  readonly rule: CssRule;
  readonly order: number;
  readonly selectors: readonly Complex[];
}

interface DeclRef { readonly rule: number; readonly value: string }

export interface Stylesheets {
  readonly rules: readonly CompiledRule[];
  /** Property → its declarations in source order. */
  readonly byProperty: ReadonlyMap<string, readonly DeclRef[]>;
}

export function compile(rules: readonly CssRule[]): Stylesheets {
  const compiled = rules.map((rule, order) => ({ rule, order, selectors: rule.selectors.map(parseSelector) }));
  const byProperty = new Map<string, DeclRef[]>();
  compiled.forEach((c) => {
    const seen = new Set<string>();
    for (const d of c.rule.decls) {
      if (seen.has(d.name)) throw new Error(`cascade simulator: ${d.name} is declared twice in one rule`);
      seen.add(d.name);
      const list = byProperty.get(d.name) ?? [];
      list.push({ rule: c.order, value: d.value });
      byProperty.set(d.name, list);
    }
  });
  return { rules: compiled, byProperty };
}

/** Properties whose computed value inherits (custom properties always do). */
const INHERITED = new Set(['color-scheme']);
export const INVALID = '<guaranteed-invalid>';

export class Cascade {
  private readonly sheets: Stylesheets;
  private readonly env: Env;
  private readonly active: readonly boolean[];
  private readonly matched = new Map<El, Map<number, number>>();
  private readonly computed = new Map<El, Map<string, string>>();

  constructor(sheets: Stylesheets, env: Env) {
    this.sheets = sheets;
    this.env = env;
    this.active = sheets.rules.map((r) => r.rule.media.every((m) => evalMedia(m, env)) && r.rule.supports.every((s) => evalSupports(s, env)));
  }

  /** Rule index → specificity of its most specific matching selector, for the rules that apply to `el`. */
  private matches(el: El): Map<number, number> {
    let m = this.matched.get(el);
    if (m !== undefined) return m;
    m = new Map();
    for (const r of this.sheets.rules) {
      if (this.active[r.order] !== true) continue;
      let best = -1;
      for (const sel of r.selectors) if (sel.specificity > best && matchesSelector(sel, el)) best = sel.specificity;
      if (best >= 0) m.set(r.order, best);
    }
    this.matched.set(el, m);
    return m;
  }

  /** The cascaded (specified) value of a property on an element, or undefined when nothing declares it there. */
  specified(el: El, property: string): string | undefined {
    const decls = this.sheets.byProperty.get(property);
    if (decls === undefined) return undefined;
    const m = this.matches(el);
    let winner: DeclRef | undefined;
    let winnerSpec = -1;
    for (const d of decls) {
      const spec = m.get(d.rule);
      if (spec === undefined) continue;
      if (spec > winnerSpec || (spec === winnerSpec && winner !== undefined && d.rule > winner.rule)) {
        winner = d;
        winnerSpec = spec;
      }
    }
    return winner?.value;
  }

  /** The computed value: `var()` substituted on the declaring element; inherited where nothing is declared. */
  value(el: El, property: string, stack: readonly string[] = []): string {
    let cache = this.computed.get(el);
    if (cache === undefined) {
      cache = new Map();
      this.computed.set(el, cache);
    }
    const hit = cache.get(property);
    if (hit !== undefined) return hit;
    if (stack.includes(property)) return INVALID;
    const spec = this.specified(el, property);
    let out: string;
    if (spec === undefined) {
      const inherits = property.startsWith('--') || INHERITED.has(property);
      out = inherits && el.parent !== null ? this.value(el.parent, property) : INVALID;
    } else {
      out = this.substitute(el, spec, [...stack, property]);
    }
    cache.set(property, out);
    return out;
  }

  private substitute(el: El, text: string, stack: readonly string[]): string {
    let invalid = false;
    const out = text.replace(/var\((--[a-z0-9-]+)\)/g, (_m, name: string) => {
      const v = this.value(el, name, stack);
      if (v === INVALID) invalid = true;
      return v;
    });
    return invalid ? INVALID : out;
  }
}

// ---- expected values ----

/** One of the 96 runtime combinations, in web values. */
export type WebContext = Readonly<Record<string, string>>;

const AXES = Object.keys(WEB_RUNTIME);

function isValid(axis: string, value: string | undefined): value is string {
  return value !== undefined && (WEB_RUNTIME[axis]?.values.includes(value) ?? false);
}

function mediaValue(axis: string, env: Env): string {
  const r = WEB_RUNTIME[axis];
  if (r === undefined) throw new Error(`unknown axis ${axis}`);
  return evalMedia(r.media.query, env) ? r.media.value : (r.values[0] ?? '');
}

/** The effective context of an element under ADR-0019 §1. */
export function contextOf(el: El, env: Env): WebContext {
  let root = el;
  while (root.parent !== null) root = root.parent;
  const out: Record<string, string> = {};
  for (const axis of AXES) {
    const r = WEB_RUNTIME[axis];
    if (r === undefined) continue;
    const onRoot = root.attrs[r.attribute];
    let value: string | undefined;
    if (r.nestable) {
      for (let e: El | null = el; e !== null && value === undefined; e = e.parent) {
        const v = e.attrs[r.attribute];
        if (isValid(axis, v)) value = v;
      }
    } else if (isValid(axis, onRoot)) value = onRoot;
    out[axis] = value ?? mediaValue(axis, env);
  }
  return out;
}

function partKey(p: CssPart): string {
  return JSON.stringify([p.value, p.twins]);
}

/** The literal a declaration must compute to in a context; null when the resolver has no context for it (fixtures). */
export function expectedLiteral(scope: WebScope, spec: DeclSpec, ctx: WebContext): CssPart | null {
  const input: Record<string, string> = {};
  let scheme: string | undefined;
  for (const a of scope.axes) {
    const c = a.contexts.get(ctx[a.axis] ?? '');
    if (c === undefined) return null;
    input[a.axis] = c;
    if (a.axis === 'colorScheme') scheme = ctx[a.axis];
  }
  const base = spec.literals[scope.index(input)];
  if (base === undefined) return null;
  const active = scope.variants.filter((v) => 'variant' in v.runtime.resolver && ctx[v.axis] === v.runtime.resolver.value);
  const deltas: CssPart[] = [];
  for (const v of active) {
    const cv = scheme === undefined ? undefined : v.contexts.get(scheme);
    if (cv === undefined) continue;
    const p = spec.literals[scope.index({ ...input, colorScheme: cv })];
    if (p !== undefined && partKey(p) !== partKey(base)) deltas.push(p);
  }
  // Disjoint deltas (§5.7): at most one of them changes this declaration.
  return deltas[0] ?? base;
}

export function expectedText(literal: CssPart, env: Env): string {
  if (env.p3) {
    const t = literal.twins.find((x) => x.kind === 'p3');
    if (t !== undefined) return t.value;
  }
  if (!env.linear) {
    const t = literal.twins.find((x) => x.kind === 'noLinear');
    if (t !== undefined) return t.value;
  }
  return literal.value;
}

// ---- scenarios (§9.12) ----

export interface Scenario {
  readonly name: string;
  readonly env: Env;
  /** Every element of the tree; the first is `<html>`. */
  readonly elements: readonly El[];
}

interface Node { readonly attrs: Readonly<Record<string, string>>; readonly children?: readonly Node[] }

function tree(node: Node, label = 'html', parent: El | null = null): El[] {
  const el: El = { label, attrs: node.attrs, parent };
  const out = [el];
  (node.children ?? []).forEach((c, i) => out.push(...tree(c, `${label}>${i}${Object.keys(c.attrs).length === 0 ? '' : JSON.stringify(c.attrs)}`, el)));
  return out;
}

function attrsFor(ctx: WebContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const axis of AXES) {
    const r = WEB_RUNTIME[axis];
    const v = ctx[axis];
    if (r !== undefined && v !== undefined) out[r.attribute] = v;
  }
  return out;
}

/** The environment whose media fallbacks select the opposite of every value of `ctx` (attributes must win). */
function oppositeEnv(ctx: WebContext, p3: boolean, linear: boolean): Env {
  return {
    prefersDark: ctx['colorScheme'] !== 'dark',
    prefersContrastMore: ctx['contrast'] !== 'more',
    prefersReducedTransparency: ctx['transparency'] !== 'reduce',
    anyPointerCoarse: ctx['density'] !== 'regular',
    hover: ctx['modality'] === 'touch',
    pointerFine: ctx['modality'] === 'touch',
    prefersReducedMotion: ctx['motion'] !== 'reduce',
    p3, linear,
  };
}

/** The 96 runtime combinations the scope can express (values without a resolver context are skipped). */
export function webContexts(scope: WebScope): WebContext[] {
  let out: Record<string, string>[] = [{}];
  for (const axis of AXES) {
    const r = WEB_RUNTIME[axis];
    if (r === undefined) continue;
    const a = scope.axes.find((x) => x.axis === axis);
    const v = scope.variants.find((x) => x.axis === axis);
    const values = a !== undefined ? [...a.contexts.keys()] : v !== undefined ? r.values : [r.values[0] ?? ''];
    out = out.flatMap((prefix) => values.map((value) => ({ ...prefix, [axis]: value })));
  }
  return out;
}

const BOOLEAN_ENV_KEYS = ['prefersDark', 'prefersContrastMore', 'prefersReducedTransparency', 'anyPointerCoarse', 'hover', 'pointerFine', 'prefersReducedMotion'] as const;

export function scenarios(scope: WebScope): Scenario[] {
  const out: Scenario[] = [];
  const contexts = webContexts(scope);
  const attr = (axis: string): string => WEB_RUNTIME[axis]?.attribute ?? '';
  const plainChild: Node = { attrs: {} };
  // 1. every combination as root attributes, against the opposite media; 5. with gamut and linear() varied.
  for (const ctx of contexts) {
    for (const [p3, linear] of [[false, true], [true, false]] as const) {
      out.push({ name: `attributes ${JSON.stringify(ctx)}${p3 ? ' p3' : ''}${linear ? '' : ' no-linear'}`, env: oppositeEnv(ctx, p3, linear), elements: tree({ attrs: attrsFor(ctx), children: [plainChild] }) });
    }
  }
  // 2. the same preferences through media only; 8. `(any-pointer: coarse)`, `(hover: hover)` and `(pointer: fine)` as independent booleans.
  for (let bits = 0; bits < 1 << BOOLEAN_ENV_KEYS.length; bits++) {
    const env: Record<string, boolean> = { p3: (bits & 1) === 1, linear: (bits & 2) === 0 };
    BOOLEAN_ENV_KEYS.forEach((k, i) => (env[k] = (bits >> i & 1) === 1));
    out.push({ name: `media ${bits.toString(2)}`, env: env as unknown as Env, elements: tree({ attrs: {}, children: [plainChild] }) });
  }
  // 3. nested scheme scopes at depth 3 under contrast and transparency; 6. empty and unknown values,
  // and root-only attributes on nested elements (ignored).
  const S = attr('colorScheme');
  const schemeValues = [...(scope.axes.find((a) => a.axis === 'colorScheme')?.contexts.keys() ?? [])];
  const odd = ['', 'auto'];
  const nestedSchemes: Node[] = [...schemeValues, ...odd, null].map((s1) => ({
    attrs: s1 === null ? { [attr('contrast')]: 'more', [attr('modality')]: 'touch', [attr('motion')]: 'reduce' } : { [S]: s1 },
    children: [...schemeValues, 'bogus', null].map((s2) => ({
      attrs: s2 === null ? {} : { [S]: s2, [attr('transparency')]: 'reduce' },
      children: schemeValues.map((s3) => ({ attrs: { [S]: s3 } })),
    })),
  }));
  const rootSchemes: (Record<string, string> | null)[] = [...schemeValues.map((v) => ({ [S]: v })), {}, { [S]: 'auto' }];
  const flags: Record<string, string>[] = [{}, { [attr('contrast')]: 'more' }, { [attr('transparency')]: 'reduce' }, { [attr('contrast')]: 'more', [attr('transparency')]: 'reduce' }, { [attr('contrast')]: 'standard' }, { [attr('contrast')]: 'bogus' }];
  for (const rootScheme of rootSchemes) {
    for (const f of flags) {
      for (const prefersDark of [false, true]) {
        for (const prefersContrastMore of [false, true]) {
          out.push({
            name: `nested schemes root ${JSON.stringify({ ...rootScheme, ...f })} dark=${String(prefersDark)} contrast=${String(prefersContrastMore)}`,
            env: { ...NEUTRAL_ENV, prefersDark, prefersContrastMore, prefersReducedTransparency: prefersContrastMore, p3: prefersDark, linear: !prefersContrastMore },
            elements: tree({ attrs: { ...rootScheme, ...f }, children: nestedSchemes }),
          });
        }
      }
    }
  }
  // 4. nested density scopes; 7. the density root fallback with and without nested scopes.
  const D = attr('density');
  const densityValues = [...(scope.axes.find((a) => a.axis === 'density')?.contexts.keys() ?? [])];
  const nestedDensity: Node[] = [...densityValues, '', 'huge', null].map((d1) => ({
    attrs: d1 === null ? {} : { [D]: d1 },
    children: [...densityValues, 'x', null].map((d2) => ({ attrs: d2 === null ? {} : { [D]: d2 }, children: [plainChild] })),
  }));
  for (const rootDensity of [...densityValues, null, '', 'huge']) {
    for (const anyPointerCoarse of [false, true]) {
      for (const [hover, pointerFine] of [[true, true], [false, false], [true, false], [false, true]] as const) {
        out.push({
          name: `nested density root ${String(rootDensity)} coarse=${String(anyPointerCoarse)} hover=${String(hover)} fine=${String(pointerFine)}`,
          env: { ...NEUTRAL_ENV, anyPointerCoarse, hover, pointerFine },
          elements: tree({ attrs: rootDensity === null ? {} : { [D]: rootDensity }, children: nestedDensity }),
        });
      }
    }
  }
  // 6. empty and unknown values of the root-only axes on <html>, under each media answer.
  for (const axis of ['contrast', 'transparency', 'modality', 'motion']) {
    for (const bad of odd) {
      for (const on of [false, true]) {
        const env: Env = { ...NEUTRAL_ENV, prefersContrastMore: on, prefersReducedTransparency: on, prefersReducedMotion: on, hover: !on, pointerFine: !on };
        out.push({ name: `root ${axis}="${bad}" media=${String(on)}`, env, elements: tree({ attrs: { [attr(axis)]: bad }, children: [plainChild] }) });
      }
    }
  }
  return out;
}

// ---- running ----

export interface CascadeReport {
  readonly scenarios: number;
  readonly elements: number;
  readonly checks: number;
  readonly mismatches: readonly string[];
}

/** Runs every scenario against the brand's tokens.css and motion.css; returns mismatches (capped at `limit`). */
export function simulate(model: CssModel, limit = 50): CascadeReport {
  const sheets = compile([...model.tokens, ...model.motion]);
  const scope = model.scope;
  const mismatches: string[] = [];
  let elements = 0;
  let checks = 0;
  let total = 0;
  const list = scenarios(scope);
  const hasScheme = scope.axes.some((a) => a.axis === 'colorScheme');
  // The expected texts of every declaration per context and gamut / linear() answer (96 × 4 at most).
  const expected = new Map<string, readonly (string | null)[]>();
  const expectedFor = (ctx: WebContext, env: Env): readonly (string | null)[] => {
    const key = `${JSON.stringify(ctx)}|${String(env.p3)}|${String(env.linear)}`;
    let hit = expected.get(key);
    if (hit === undefined) {
      hit = model.specs.map((spec) => {
        const literal = expectedLiteral(scope, spec, ctx);
        return literal === null ? null : expectedText(literal, env);
      });
      expected.set(key, hit);
    }
    return hit;
  };
  for (const sc of list) {
    const cascade = new Cascade(sheets, sc.env);
    for (const el of sc.elements) {
      elements++;
      const ctx = contextOf(el, sc.env);
      const scheme = ctx['colorScheme'];
      if (hasScheme && scheme !== undefined) {
        const got = cascade.value(el, 'color-scheme');
        checks++;
        if (got !== scheme) {
          total++;
          if (mismatches.length < limit) mismatches.push(`${sc.name}: ${el.label} color-scheme computes to ${got}, expected ${scheme}`);
        }
      }
      const wants = expectedFor(ctx, sc.env);
      model.specs.forEach((spec, k) => {
        const want = wants[k];
        if (want === null || want === undefined) return;
        const got = cascade.value(el, spec.name);
        checks++;
        if (got !== want) {
          total++;
          if (mismatches.length < limit) mismatches.push(`${sc.name}: ${el.label} ${spec.name} computes to ${got}, expected ${want} (context ${JSON.stringify(ctx)})`);
        }
      });
    }
  }
  if (total > mismatches.length) mismatches.push(`… ${total - mismatches.length} more mismatches`);
  return { scenarios: list.length, elements, checks, mismatches };
}

export function cascadeDiagnostics(model: CssModel): Diagnostic[] {
  const report = simulate(model);
  return report.mismatches.map((m) => error('css/cascade-mismatch', `brand "${model.scope.brand}": ${m}`, { hint: 'fix formats/css/model.ts; the simulator encodes ADR-0019 §1' }));
}
