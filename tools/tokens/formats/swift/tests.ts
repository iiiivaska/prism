// `swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift` (ARCHITECTURE §9.7.6): expectations
// generated directly from the IR, not from the table model, so a renderer bug in `DSTokenSet+*.swift`
// fails in Swift. Per brand: every non-color member in every context it varies in (colorScheme members
// in all eight scheme × contrast × transparency combinations), `weight` and `boldWeight` of every type
// role in every one of them (ADR-0021 rule 3), every colorset's appearances and every catalog color's
// asset name, the brand's faces; the `Spring.value` checkpoints of ADR-0023 §11 P4; and one
// `platformDefault` expectation per OS (ADR-0019 rule 12). A value that differs on watchOS is
// expected inside `#if os(watchOS)`. The file never reads SwiftUI's spring settling estimate.
//
// A test with more than CHECKS_PER_PART checks calls one private part function per chunk: Swift Testing
// runs tests on secondary threads with 512 KiB stacks, and a debug build keeps a stack slot for every
// temporary of a function, so a single function with every check of a large group overflows its stack
// (SIGBUS; the colorScheme type weights did at 22 roles in P1-9). The parts run one after another, so the
// stack holds one part at a time.
import { COLOR_SCHEME_MODIFIER, PLATFORM_DEFAULTS, PLATFORM_MODIFIER } from '../../config.ts';
import { stepResponse, settleMs } from '../../ir/spring.ts';
import type { IRToken } from '../../ir/types.ts';
import { appleOptions, DECIMALS, fmt, swiftLiteral } from '../../transforms/index.ts';
import type { FormatInput, FormatOutput } from '../index.ts';
import { faceExpr } from './brand.ts';
import { PLATFORM_BRANCHES, platformDefaultExpr } from './context.ts';
import {
  allMembers, DEFAULT_CONTEXT, modifierAxis, SWIFT_AXES, SWIFT_TESTS_ROOT, swiftAxis, swiftCase, swiftModel, variantAxis,
  type SwiftBrand, type SwiftContext, type SwiftMember, type SwiftModel,
} from './model.ts';
import { bareIdent, ident, swiftFile, swiftHeader, swiftString } from './syntax.ts';

export const TESTS_PATH = `${SWIFT_TESTS_ROOT}/GeneratedTokenTests.swift`;

/** The fractions of the settle at which ADR-0023 §11 P4 compares the curve. */
export const SPRING_CHECKPOINTS = [0.1, 0.25, 0.5, 0.75, 1] as const;

/** `DSTokenContext(brand: .prism, colorScheme: .dark)`: the brand and every non-default field. */
export function contextExpr(brand: SwiftBrand, ctx: SwiftContext): string {
  const args = [`brand: .${ident(brand.caseName)}`];
  for (const a of SWIFT_AXES) {
    const v = ctx[a.key];
    if (v !== undefined && v !== DEFAULT_CONTEXT[a.key]) args.push(`${a.key}: .${ident(swiftCase(a.key, v))}`);
  }
  return `DSTokenContext(${args.join(', ')})`;
}

function label(brand: SwiftBrand, ctx: SwiftContext): string {
  const parts = SWIFT_AXES.filter((a) => ctx[a.key] !== DEFAULT_CONTEXT[a.key]).map((a) => `${a.key}=${swiftCase(a.key, ctx[a.key] ?? '')}`);
  return `${brand.context}${parts.length === 0 ? '' : ` ${parts.join(' ')}`}`;
}

/** The contexts a member varies in: its axis, or the eight scheme combinations for a colorScheme member. */
function variations(axis: string | null): SwiftContext[] {
  if (axis === null) return [DEFAULT_CONTEXT];
  if (axis !== COLOR_SCHEME_MODIFIER) {
    const a = modifierAxis(axis);
    return a === null ? [DEFAULT_CONTEXT] : a.cases.map((c) => ({ ...DEFAULT_CONTEXT, [a.key]: c.web }));
  }
  const scheme = modifierAxis(COLOR_SCHEME_MODIFIER);
  const contrast = variantAxis('increasedContrast').key;
  const transparency = variantAxis('reducedTransparency').key;
  const out: SwiftContext[] = [];
  for (const s of scheme?.cases ?? []) {
    for (const c of swiftAxis(contrast).cases) {
      for (const t of swiftAxis(transparency).cases) out.push({ ...DEFAULT_CONTEXT, [scheme?.key ?? COLOR_SCHEME_MODIFIER]: s.web, [contrast]: c.web, [transparency]: t.web });
    }
  }
  return out;
}

/** The runtime modifier a member depends on in the Apple scopes of the analysis (null: none). */
function axisOf(model: SwiftModel, id: string): string | null {
  let axis: string | null = null;
  for (const s of model.bundle.analysis.scopes.values()) {
    const platform = s.input[PLATFORM_MODIFIER];
    if (platform !== undefined && !model.platforms.includes(platform)) continue;
    const d = s.deps.get(id);
    if (d === undefined) continue;
    const a = d.axes[0] ?? (d.increasedContrast.length > 0 || d.reducedTransparency.length > 0 ? COLOR_SCHEME_MODIFIER : null);
    if (a !== null) axis = a;
  }
  return axis;
}

interface Check {
  readonly actual: string;
  readonly expected: string;
  readonly watch: string;
  readonly name: string;
}

/** The lines of one check: a `check(…)` call, or its `#if os(watchOS)` pair when the watch value differs. */
function checkItem(c: Check, indent: string): string[] {
  if (c.watch === c.expected) return [`${indent}check(${c.actual}, ${c.expected}, ${swiftString(c.name)})`];
  return ['#if os(watchOS)', `${indent}check(${c.actual}, ${c.watch}, ${swiftString(c.name)})`, '#else', `${indent}check(${c.actual}, ${c.expected}, ${swiftString(c.name)})`, '#endif'];
}

function checkLines(checks: readonly Check[], indent: string): string[] {
  return checks.flatMap((c) => checkItem(c, indent));
}

/** The most checks one generated function holds (see the header). */
export const CHECKS_PER_PART = 48;

/**
 * Checks that share one context: `setup` builds the `DSTokenSet` their `t.` accessors read, once per
 * part that needs it; each item is the lines of one check, indented for a function body.
 */
interface Block {
  readonly setup: string | null;
  readonly items: readonly (readonly string[])[];
}

/** One `@Test`; above CHECKS_PER_PART checks, it calls one private part function per chunk of a block. */
function testFunction(name: string, blocks: readonly Block[]): string[] {
  const parts: string[][] = [];
  for (const b of blocks) {
    for (let i = 0; i < b.items.length; i += CHECKS_PER_PART) {
      const chunk = b.items.slice(i, i + CHECKS_PER_PART);
      const needsSet = b.setup !== null && chunk.some((item) => item.some((l) => l.includes('check(t.')));
      parts.push([...(needsSet && b.setup !== null ? [`        ${b.setup}`] : []), ...chunk.flat()]);
    }
  }
  const [only] = parts;
  if (only === undefined) return [];
  if (parts.length === 1) return ['', `    @Test func ${name}() {`, ...only, '    }'];
  const out = ['', `    @Test func ${name}() {`, ...parts.map((_, i) => `        ${name}Part${i + 1}()`), '    }'];
  parts.forEach((body, i) => out.push('', `    private func ${name}Part${i + 1}() {`, ...body, '    }'));
  return out;
}

/** A block of plain lines (one item per line). */
function lineBlock(lines: readonly string[]): Block {
  return { setup: null, items: lines.map((l) => [l]) };
}

export function renderTestsText(model: SwiftModel, resolver: string): string {
  const lines: string[] = [
    swiftHeader(resolver),
    'import SwiftUI',
    'import Testing',
    'import DSTokens',
    '',
    'private func check<T: Equatable>(_ actual: T, _ expected: T, _ name: String, sourceLocation: SourceLocation = #_sourceLocation) {',
    '    #expect(actual == expected, "\\(name)", sourceLocation: sourceLocation)',
    '}',
    '',
    '/// ADR-0023 §11 P4: `Spring.value` against the closed form at fractions of the settle, within 1e-4.',
    'private func checkSpring(_ token: DSSpringToken, _ samples: [(time: Double, value: Double)], _ name: String, sourceLocation: SourceLocation = #_sourceLocation) {',
    '    for sample in samples {',
    '        let value: Double = token.spring.value(target: 1.0, initialVelocity: 0.0, time: sample.time)',
    '        #expect(abs(value - sample.value) <= 1e-4, "\\(name) at \\(sample.time) s: \\(value), closed form \\(sample.value)", sourceLocation: sourceLocation)',
    '    }',
    '}',
    '',
    '@Suite("Generated token values") struct GeneratedTokenTests {',
  ];
  const members = allMembers(model);
  const irLiteral = (m: SwiftMember, t: IRToken): string => model.literal(m.impl.kind === 'alias' ? m.impl.target : m, t);
  const colorOf = (m: SwiftMember, brand: SwiftBrand, ctx: SwiftContext): string => {
    const target = m.impl.kind === 'alias' ? m.impl.target : m;
    if (target.impl.kind !== 'colorset') return '';
    const reduce = variantAxis('reducedTransparency');
    const cs = ctx[reduce.key] === reduce.on && target.impl.twin !== null ? target.impl.twin : target.impl.colorset;
    const ns = model.namespaces.get(brand.context) ?? brand.context;
    return `Color(${swiftString(`${ns}/${cs.name}`)}, bundle: DSTokensBundle.bundle)`;
  };

  for (const b of model.brands) {
    const byAxis = new Map<string, Map<string, { ctx: SwiftContext; checks: Check[] }>>();
    for (const m of members) {
      const isColor = m.swiftType === 'Color';
      const axis = axisOf(model, m.id);
      for (const ctx of isColor ? [DEFAULT_CONTEXT, { ...DEFAULT_CONTEXT, [variantAxis('reducedTransparency').key]: variantAxis('reducedTransparency').on }] : variations(axis)) {
        const group = isColor ? 'colors' : axis ?? 'constants';
        const perCtx = byAxis.get(group) ?? new Map<string, { ctx: SwiftContext; checks: Check[] }>();
        byAxis.set(group, perCtx);
        const key = JSON.stringify(ctx);
        const entry = perCtx.get(key) ?? { ctx, checks: [] };
        perCtx.set(key, entry);
        const actual = m.group === 'color' ? `DSColor(brand: .${ident(b.caseName)}, transparency: .${ident(swiftCase(variantAxis('reducedTransparency').key, ctx[variantAxis('reducedTransparency').key] ?? ''))}).${bareIdent(m.name)}` : `t.${m.accessor}`;
        if (isColor) {
          const e = colorOf(m, b, ctx);
          entry.checks.push({ actual, expected: e, watch: e, name: `${label(b, ctx)}: ${m.accessor}` });
          continue;
        }
        const expected = irLiteral(m, model.tokenIn(b.context, model.primary, ctx, m.id));
        const watch = irLiteral(m, model.tokenIn(b.context, model.watch, ctx, m.id));
        entry.checks.push({ actual, expected, watch, name: `${label(b, ctx)}: ${m.accessor}` });
      }
    }
    for (const [group, perCtx] of byAxis) {
      const blocks: Block[] = [...perCtx.values()].map(({ ctx, checks }) => ({
        setup: `let t = DSTokenSet(${contextExpr(b, ctx)})`,
        items: checks.map((c) => checkItem(c, '        ')),
      }));
      lines.push(...testFunction(`${b.caseName}${group.charAt(0).toUpperCase()}${group.slice(1)}`, blocks));
    }

    // ADR-0021 rule 3: weight and boldWeight of every type role in every scheme × contrast × transparency context.
    const weights: Block[] = [];
    for (const ctx of variations(COLOR_SCHEME_MODIFIER)) {
      const checks: Check[] = [];
      for (const m of members) {
        if (m.type !== 'typography') continue;
        const at = (platform: string | null): IRToken => model.tokenIn(b.context, platform, ctx, m.id);
        const w = (t: IRToken, f: 'weight' | 'boldWeight'): string => (t.value.kind === 'typography' ? fmt(f === 'weight' ? t.value.fontWeight.weight : t.value.boldWeight, 0) : '');
        checks.push(
          { actual: `t.${m.accessor}.weight`, expected: w(at(model.primary), 'weight'), watch: w(at(model.watch), 'weight'), name: `${label(b, ctx)}: ${m.accessor}.weight` },
          { actual: `t.${m.accessor}.boldWeight`, expected: w(at(model.primary), 'boldWeight'), watch: w(at(model.watch), 'boldWeight'), name: `${label(b, ctx)}: ${m.accessor}.boldWeight` },
        );
      }
      if (checks.length > 0) weights.push({ setup: `let t = DSTokenSet(${contextExpr(b, ctx)})`, items: checks.map((c) => checkItem(c, '        ')) });
    }
    lines.push(...testFunction(`${b.caseName}TypeWeights`, weights));

    // The catalog values behind every colorset, and the brand's faces, preset and namespace.
    const catalog: string[] = [];
    for (const c of model.colorsets) {
      const e = model.entries(c, b.context);
      const lit = (t: IRToken): string => swiftLiteral(t.value, appleOptions(t));
      const expected = e.dependsOnScheme
        ? `DSColorAppearances(any: ${lit(e.any)}, dark: ${lit(e.dark)}, highContrast: ${lit(e.highContrast)}, darkHighContrast: ${lit(e.darkHighContrast)}, watch: ${lit(e.watch)})`
        : `DSColorAppearances(any: ${lit(e.any)}, dark: ${lit(e.any)}, highContrast: ${lit(e.any)}, darkHighContrast: ${lit(e.any)}, watch: ${lit(e.any)})`;
      catalog.push(`        check(DSColorToken.${ident(c.caseName)}.appearances(.${ident(b.caseName)}), ${expected}, ${swiftString(`${b.context}: ${c.name}`)})`);
      catalog.push(`        check(DSColorToken.${ident(c.caseName)}.assetName(.${ident(b.caseName)}), ${swiftString(`${model.namespaces.get(b.context) ?? b.context}/${c.name}`)}, ${swiftString(`${b.context}: ${c.name} asset name`)})`);
    }
    const faceDict = (platform: string | null): string => {
      const faces = model.faces(b.context, platform);
      return faces.length === 0 ? '[:]' : `[${faces.map((f) => `.${ident(f.slot)}: ${faceExpr(f)}`).join(', ')}]`;
    };
    const facesCheck: Check = { actual: `DSBrand.${ident(b.caseName)}.faces`, expected: faceDict(model.primary), watch: faceDict(model.watch), name: `${b.context}: faces` };
    catalog.push(...checkLines([facesCheck], '        '));
    catalog.push(`        check(DSBrand.${ident(b.caseName)}.colorNamespace, ${swiftString(model.namespaces.get(b.context) ?? b.context)}, ${swiftString(`${b.context}: colorNamespace`)})`);
    if (b.meta !== null) catalog.push(`        check(DSBrand.${ident(b.caseName)}.preset, .${b.meta.preset}, ${swiftString(`${b.context}: preset`)})`);
    lines.push(...testFunction(`${b.caseName}Catalog`, [{ setup: null, items: catalogItems(catalog) }]));
  }

  // ADR-0023 §11 P4: one entry per distinct spring, reached through the first member and context that has it.
  const springs: string[] = [];
  const seen = new Set<string>();
  for (const b of model.brands) {
    for (const m of members) {
      const target = m.impl.kind === 'alias' ? m.impl.target : m;
      if (target.swiftType !== 'DSSpringToken') continue;
      for (const ctx of variations(axisOf(model, m.id))) {
        const t = model.tokenIn(b.context, model.primary, ctx, m.id);
        if (t.value.kind !== 'transition' || t.value.spring === null) continue;
        const { duration, bounce } = t.value.spring;
        const key = `${duration}|${bounce}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const settle = settleMs(duration, bounce) / 1000;
        const x = stepResponse(duration, bounce);
        const samples = SPRING_CHECKPOINTS.map((f) => {
          const time = fmt(f * settle, 6);
          return `(${time}, ${fmt(x(Number(time)), DECIMALS.other)})`;
        });
        springs.push(`        checkSpring(DSTokenSet(${contextExpr(b, ctx)}).${m.accessor}, [${samples.join(', ')}], ${swiftString(`${label(b, ctx)}: ${m.accessor} (${fmt(duration, 4)}, ${fmt(bounce, 4)})`)})`);
      }
    }
  }
  lines.push(...testFunction('springCurves', [lineBlock(springs)]));

  // ADR-0019 §2, rule 12: one expectation per OS.
  const platform: string[] = [];
  for (const br of PLATFORM_BRANCHES) {
    const d = PLATFORM_DEFAULTS[br.platform];
    if (d === undefined) continue;
    platform.push(br.condition, `        check(DSTokenContext.platformDefault, ${platformDefaultExpr(d)}, ${swiftString(`${br.platform} platformDefault`)})`);
  }
  if (platform.length > 0) platform.push('#endif');
  lines.push(...testFunction('platformDefault', [{ setup: null, items: platform.length === 0 ? [] : [platform] }]));
  lines.push('}');
  return swiftFile(lines);
}

/** The catalog lines as items: an `#if os(watchOS)` … `#endif` group stays one item. */
function catalogItems(lines: readonly string[]): string[][] {
  const out: string[][] = [];
  let open: string[] | null = null;
  for (const l of lines) {
    if (open !== null) {
      open.push(l);
      if (l === '#endif') {
        out.push(open);
        open = null;
      }
    } else if (l.startsWith('#if ')) open = [l];
    else out.push([l]);
  }
  if (open !== null) out.push(open);
  return out;
}

export function renderSwiftTests(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  return { files: [{ path: TESTS_PATH, contents: renderTestsText(model, input.model.resolverFile) }] };
}
