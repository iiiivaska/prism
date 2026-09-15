// A failing input for each guard of the formats, the build's self-verification (ARCHITECTURE §9.12,
// §14 P1-5) and the build's normalize step that no other test drives: every check below is shown to fire
// on a crafted defect, not only to stay quiet on the repository and the fixtures. The source and IR
// diagnostics have their broken fixtures (fixtures/broken, test-support.ts); the other font guards are in
// formats/swift/fonts.test.ts, and verify/css-cascade.test.ts mutates the repository stylesheets. Two
// backstops have no known input: `build/incomplete` (build() never narrows the product, and a partial id
// set is reported as an error before it) and `engine/style-dictionary` (Style Dictionary failing on a
// tree that Prism's own checks accept). Style Dictionary runs share a module singleton, so this file
// never uses test.concurrent.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { main } from './build.ts';
import { BRAND_MODIFIER, PLATFORM_DEFAULTS, WEB_OUTPUT_ROOT, WEB_RUNTIME } from './config.ts';
import { classify, cssModel, declSpecs, type CssRule, type DeclSpec } from './formats/css/model.ts';
import { tokenAt, webScope, type WebScope } from './formats/css/web.ts';
import { renderMotionCss } from './formats/css-motion.ts';
import { renderFonts, SWIFT_FONTS_ROOT } from './formats/fonts.ts';
import type { FormatInput, OutputFile } from './formats/index.ts';
import { buildManifest, swiftCategoryDiagnostics } from './formats/manifest.ts';
import { checkPlatformDefaults } from './formats/runtime-ts.ts';
import { swiftModel } from './formats/swift/model.ts';
import { checkTailwind, tailwindModel } from './formats/tailwind-theme.ts';
import { studioSets } from './formats/tokens-studio/sets.ts';
import type { TokenFacts } from './formats/tokens-studio/values.ts';
import { tsTable } from './formats/ts-tokens.ts';
import { collectBundle, REPO_ROOT } from './ir/bundle.ts';
import type { Diagnostic, IRBundle, IRToken, PermutationIR } from './ir/types.ts';
import { loadModel } from './source/model.ts';
import { fsReader, memoryReader, overlayReader, type SourceReader } from './source/reader.ts';
import { FIXTURES, fixtureReader, pairs } from './test-support.ts';
import { part } from './transforms/index.ts';
import { cascadeDiagnostics } from './verify/css-cascade.ts';
import { webFileProblems, webModelProblems } from './verify/index.ts';
import { verifyTsTables } from './verify/tables.ts';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'prism-guards-'));
  temps.push(root);
  return root;
}

function first<T>(items: readonly T[], what: string): T {
  const [x] = items;
  if (x === undefined) throw new Error(`no ${what}`);
  return x;
}

const codes = (ds: readonly Diagnostic[] | undefined): string[] => [...new Set((ds ?? []).map((d) => d.code))].sort();

const inputs = new Map<string, Promise<FormatInput>>();

function inputOf(key: string, reader: SourceReader, root?: string): Promise<FormatInput> {
  let hit = inputs.get(key);
  if (hit === undefined) {
    hit = (async () => {
      const r = await collectBundle(root === undefined ? { reader } : { root, reader });
      if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.tokenId ?? ''} ${d.message}`).join('\n'));
      return { bundle: r.bundle, model: r.model, root: root ?? '/nonexistent', reader };
    })();
    inputs.set(key, hit);
  }
  return hit;
}

const mini = (): Promise<FormatInput> => inputOf('mini', fixtureReader('mini'));
const repo = (): Promise<FormatInput> => inputOf('repo', fsReader(REPO_ROOT), REPO_ROOT);

type JsonObject = { [key: string]: unknown };

function objectAt(root: JsonObject, path: readonly string[]): JsonObject {
  let cur: unknown = root;
  for (const key of path) {
    cur = (cur as JsonObject)[key];
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur)) throw new Error(`${path.join('.')} is not an object`);
  }
  return cur as JsonObject;
}

/** `base` with each listed JSON file changed in place by its edit. */
function edited(base: SourceReader, edits: Readonly<Record<string, (doc: JsonObject) => void>>): SourceReader {
  const files: Record<string, string> = {};
  for (const [path, edit] of Object.entries(edits)) {
    const doc = JSON.parse(base.readText(path)) as JsonObject;
    edit(doc);
    files[path] = JSON.stringify(doc);
  }
  return overlayReader(base, memoryReader(files));
}

/**
 * The mini fixture plus defects that every source check accepts but the formats must refuse: a
 * `sys.color.text-primary` beside `sys.color.text.primary` (one CSS name, one Swift name), a color
 * outside `sys.color` with a component color aliasing it, and a `sys` category without a Swift home.
 */
const miniDefects = (): Promise<FormatInput> => inputOf('mini-defects', edited(fixtureReader('mini'), {
  'tokens/sys/color/light.tokens.json': (d) => { objectAt(d, ['sys', 'color'])['text-primary'] = { $value: '{ref.color.neutral.900}' }; },
  'tokens/sys/color/dark.tokens.json': (d) => { objectAt(d, ['sys', 'color'])['text-primary'] = { $value: '{ref.color.neutral.0}' }; },
  'tokens/sys/base.tokens.json': (d) => {
    const sys = objectAt(d, ['sys']);
    sys['chart'] = { ink: { $type: 'color', $value: '{ref.color.neutral.900}' } };
    sys['nope'] = { gap: { $type: 'dimension', $value: '{ref.space.2}' } };
  },
  'tokens/prism.resolver.json': (d) => {
    const sources = objectAt(d, ['sets', 'base'])['sources'] as JsonObject[];
    const inline = sources.find((s) => 'comp' in s);
    if (inline === undefined) throw new Error('the mini resolver has no inline comp source');
    objectAt(inline, ['comp', 'card'])['ink'] = { $value: '{sys.chart.ink}' };
  },
}));

function withToken(p: PermutationIR, token: IRToken): PermutationIR {
  return { ...p, tokens: new Map(p.tokens).set(token.id, token) };
}

/** The bundle with `change` applied to every permutation. */
function withPermutations(bundle: IRBundle, change: (p: PermutationIR) => PermutationIR): IRBundle {
  return { ...bundle, permutations: new Map([...bundle.permutations].map(([k, p]) => [k, change(p)])) };
}

describe('self-verification (verify/)', () => {
  test('web/banned-name: an Apple font, a remote font host or the brand attribute in any web text file', () => {
    const files: OutputFile[] = [
      { path: `${WEB_OUTPUT_ROOT}/prism/tokens.css`, contents: ':root { --ds-font-ui: "SF Pro", system-ui; }\n' },
      { path: `${WEB_OUTPUT_ROOT}/prism/fonts/fonts.css`, contents: '@import url("https://fonts.googleapis.com/css2?family=Onest");\n' },
      { path: `${WEB_OUTPUT_ROOT}/prism/tokens.ts`, contents: 'export const attribute = "data-ds-brand";\n' },
      // Apple outputs name Apple faces, and woff2 is a binary without text: neither is scanned.
      { path: 'swift/Sources/DSTokens/Generated/DSBrand.swift', contents: 'let face = "SF Pro"\n' },
      { path: `${WEB_OUTPUT_ROOT}/prism/fonts/onest/onest-wght.woff2`, contents: new TextEncoder().encode('SF Pro') },
    ];
    expect(webFileProblems(files).map((d) => [d.code, d.file])).toEqual([
      ['web/banned-name', `${WEB_OUTPUT_ROOT}/prism/tokens.css`],
      ['web/banned-name', `${WEB_OUTPUT_ROOT}/prism/fonts/fonts.css`],
      ['web/banned-name', `${WEB_OUTPUT_ROOT}/prism/tokens.ts`],
    ]);
  });

  test('css/selector-form and naming/ds-prefix: a bare :not(), a root-only attribute outside :root, names without ds', async () => {
    const scope = webScope((await mini()).bundle, 'default');
    const model = cssModel(scope);
    const tw = tailwindModel(scope);
    expect(webModelProblems(model, tw)).toEqual([]);
    const nestable = first(Object.values(WEB_RUNTIME).filter((r) => r.nestable), 'nestable axis');
    const rootOnly = first(Object.values(WEB_RUNTIME).filter((r) => !r.nestable), 'root-only axis');
    const rule = (selector: string): CssRule => ({ comment: '', media: [], supports: [], selectors: [selector], decls: [] });
    const selectors = { ...model, tokens: [...model.tokens, rule(`:root:not([${nestable.attribute}])`), rule(`[${rootOnly.attribute}="${rootOnly.values.at(-1) ?? ''}"]`)] };
    const found = webModelProblems(selectors, tw);
    expect(found.map((d) => d.code)).toEqual(['css/selector-form', 'css/selector-form']);
    expect(found[0]?.message).toContain('ADR-0019 rule 2');
    expect(found[1]?.message).toContain('ADR-0019 rule 4');

    const spec = first(model.specs, 'declaration');
    const names = webModelProblems({ ...model, specs: [...model.specs, { ...spec, name: '--prism-x' }] }, {
      theme: [...tw.theme, { ...first(tw.theme, 'theme variable'), variable: '--color-prism-x' }],
      utilities: [...tw.utilities, { ...first(tw.utilities, 'type utility'), name: 'type-body' }],
      variants: [...tw.variants, { name: 'contrast-more', body: '' }],
    });
    expect(names.map((d) => d.code)).toEqual(['naming/ds-prefix', 'naming/ds-prefix', 'naming/ds-prefix', 'naming/ds-prefix']);
  }, 60_000);

  test('ts/table-mismatch: a tokens.ts entry that resolves to another value than the IR', async () => {
    const { bundle } = await mini();
    expect(verifyTsTables(bundle)).toEqual([]);
    const target = first(tsTable(bundle, webScope(bundle, 'default')), 'table entry').id;
    const tampered = (b: IRBundle, s: WebScope): ReturnType<typeof tsTable> => tsTable(b, s).map((e) => (
      e.id === target ? { ...e, value: 12345, values: e.values.map(([k]) => [k, 12345] as const), deltas: [] } : e
    ));
    const found = verifyTsTables(bundle, 20, tampered);
    expect(codes(found)).toEqual(['ts/table-mismatch']);
    expect(found[0]?.tokenId).toBe(target);
    expect(found[0]?.message).toContain('resolves to 12345');
    // Past the limit, one line counts the rest.
    const limited = verifyTsTables(bundle, 1, tampered);
    expect(limited).toHaveLength(2);
    expect(limited[1]?.message).toMatch(/^brand "default": \d+ more table mismatches$/);
  }, 60_000);

  test('css/cascade-mismatch: stylesheets without the colorScheme blocks compute the wrong values', async () => {
    const model = cssModel(webScope((await mini()).bundle, 'default'));
    expect(cascadeDiagnostics(model)).toEqual([]);
    const attribute = WEB_RUNTIME['colorScheme']?.attribute ?? '';
    const found = cascadeDiagnostics({ ...model, tokens: model.tokens.filter((r) => !r.selectors.some((s) => s.includes(attribute))) });
    expect(found.length).toBeGreaterThan(0);
    expect(codes(found)).toEqual(['css/cascade-mismatch']);
  }, 60_000);
});

describe('the CSS and Tailwind models', () => {
  test('naming/css-collision: two tokens that emit one custom property', async () => {
    const { bundle } = await miniDefects();
    expect(pairs(cssModel(webScope(bundle, 'default')).diagnostics)).toEqual(['naming/css-collision|sys.color.text-primary']);
  }, 60_000);

  test('css/part-mismatch: a token that renders other declarations in another context', async () => {
    const scope = webScope((await mini()).bundle, 'default');
    const def = scope.perms[scope.defaultIndex];
    if (def === undefined) throw new Error('no default permutation');
    const dimension = first(scope.ids.filter((id) => id.startsWith('sys.') && tokenAt(def, id).value.kind === 'dimension'), 'sys dimension');
    const role = first(scope.ids.filter((id) => tokenAt(def, id).value.kind === 'typography'), 'typography role');
    const other = scope.perms.findIndex((_, i) => i !== scope.defaultIndex);
    const perms = scope.perms.map((p, i) => (i === other ? withToken(p, { ...tokenAt(p, dimension), value: tokenAt(p, role).value }) : p));
    expect(declSpecs(scope).diagnostics).toEqual([]);
    expect(pairs(declSpecs({ ...scope, perms }).diagnostics)).toEqual([`css/part-mismatch|${dimension}`]);
  }, 60_000);

  test('css/motion-literal: a tokens.css declaration that depends on the motion axis', async () => {
    const scope = webScope((await mini()).bundle, 'default');
    const texts = scope.inputs.map((input) => (input['motion'] === 'reduced' ? 'b' : 'a'));
    expect(new Set(texts)).toEqual(new Set(['a', 'b']));
    const spec: DeclSpec = { name: '--ds-x', tokenId: 'sys.x', suffix: '', sheet: 'tokens', texts, literals: texts.map((t) => part('', t)) };
    expect(classify(scope, [spec]).diagnostics.map((d) => d.code)).toEqual(['css/motion-literal']);
    // The same declaration in motion.css switches on the motion axis.
    expect(classify(scope, [{ ...spec, sheet: 'motion' }]).memberships.map((m) => m.place)).toEqual([{ kind: 'axis', axis: 'motion' }]);
  }, 60_000);

  test('tailwind/unknown-var: a theme variable whose declaration tokens.css drops', async () => {
    const { bundle } = await mini();
    expect(checkTailwind(bundle).diagnostics).toEqual([]);
    const scope = webScope(bundle, 'default');
    const def = scope.perms[scope.defaultIndex];
    if (def === undefined) throw new Error('no default permutation');
    const role = first(scope.ids.filter((id) => id.startsWith('sys.') && tokenAt(def, id).value.kind === 'typography'), 'sys typography role');
    const dimension = first(scope.ids.filter((id) => tokenAt(def, id).value.kind === 'dimension'), 'dimension');
    // The role renders other declarations in the density=regular permutations (css/part-mismatch), so
    // tokens.css declares none of its parts while tailwind.css still references them.
    const broken = withPermutations(bundle, (p) => (p.input['density'] === 'regular' ? withToken(p, { ...tokenAt(p, role), value: tokenAt(p, dimension).value }) : p));
    const found = checkTailwind(broken).diagnostics;
    expect(codes(found)).toEqual(['tailwind/unknown-var']);
    expect(found.every((d) => d.message.includes(`--ds-${role.split('.').slice(1).join('-')}-`))).toBe(true);
  }, 60_000);

  test('format/brand-variant: a motion token that differs between brands', async () => {
    const input = await repo();
    expect(renderMotionCss(input).diagnostics).toEqual([]);
    const def = first([...input.bundle.permutations.values()], 'permutation');
    const duration = first([...def.tokens.values()].filter((t) => t.value.kind === 'duration'), 'duration token');
    const broken = withPermutations(input.bundle, (p) => {
      const t = tokenAt(p, duration.id);
      return p.input[BRAND_MODIFIER] === 'prism-native' && t.value.kind === 'duration' ? withToken(p, { ...t, value: { ...t.value, ms: t.value.ms + 7 } }) : p;
    });
    const found = renderMotionCss({ ...input, bundle: broken }).diagnostics ?? [];
    expect(found.map((d) => d.code)).toEqual(['format/brand-variant']);
    expect(found[0]?.message).toContain('brand "prism-native"');
  }, 60_000);
});

describe('the Apple models and the manifest', () => {
  test('swift/name-collision, swift/color-without-colorset, swift/alias-target and swift/unknown-category', async () => {
    const clean = swiftModel((await mini()).bundle);
    expect(clean?.diagnostics).toEqual([]);
    const m = swiftModel((await miniDefects()).bundle);
    expect(pairs(m?.diagnostics ?? [])).toEqual([
      'swift/alias-target|comp.card.ink',
      'swift/color-without-colorset|sys.chart.ink',
      // DSColorToken.textPrimary (the colorset case) and DSColor.textPrimary (the member).
      'swift/name-collision|sys.color.text-primary',
      'swift/unknown-category|sys.nope.gap',
    ]);
    const collisions = (m?.diagnostics ?? []).filter((d) => d.code === 'swift/name-collision').map((d) => d.message);
    expect(collisions).toEqual([
      'sys.color.text-primary and sys.color.text.primary both map to DSColorToken.textPrimary',
      'sys.color.text-primary and sys.color.text.primary both map to DSColor.textPrimary',
    ]);
  }, 60_000);

  test('naming/swift-category: a manifest token whose sys category has no Swift member struct', async () => {
    const { bundle, model } = await miniDefects();
    expect(pairs(swiftCategoryDiagnostics(buildManifest(bundle, model.resolverFile)))).toEqual(['naming/swift-category|sys.nope.gap']);
    const clean = await mini();
    expect(swiftCategoryDiagnostics(buildManifest(clean.bundle, clean.model.resolverFile))).toEqual([]);
  }, 60_000);

  test('swift/apple-face: an Apple face that is neither a system keyword nor a family the brand bundles on Apple', async () => {
    const { bundle } = await repo();
    expect(swiftModel(bundle)?.diagnostics).toEqual([]);
    const unbundled: IRBundle = { ...bundle, brands: new Map([...bundle.brands].map(([name, meta]) => [name, name === 'prism' ? { ...meta, fonts: {} } : meta])) };
    const found = swiftModel(unbundled)?.diagnostics ?? [];
    // Reported once per brand and face, although both Apple platforms read each face.
    expect(found.map((d) => `${d.code}|${d.tokenId ?? ''}`)).toEqual(['swift/apple-face|sys.font.display', 'swift/apple-face|sys.font.mono', 'swift/apple-face|sys.font.ui']);
    expect(found.every((d) => d.message.startsWith('brand "prism": sys.font.'))).toBe(true);
  }, 60_000);

  test('runtime/platform-default: a platform default that is not a value of its axis', () => {
    expect(checkPlatformDefaults()).toEqual([]);
    const found = checkPlatformDefaults({ ...PLATFORM_DEFAULTS, web: { density: 'spacious', modality: 'pointer' } });
    expect(found.map((d) => [d.code, d.message])).toEqual([
      ['runtime/platform-default', 'PLATFORM_DEFAULTS.web.density is "spacious", which is not a value of WEB_RUNTIME.density (ADR-0019 §2)'],
    ]);
  });
});

describe('the flavors and the files a build copies', () => {
  test('tokens-studio/value: a token without a type and a literal the renderers cannot read', () => {
    const { model, diagnostics } = loadModel(memoryReader({
      'tokens/prism.resolver.json': JSON.stringify({
        version: '2025.10',
        sets: { ref: { sources: [{ $ref: 'ref/core.tokens.json' }] } },
        modifiers: {},
        resolutionOrder: [{ $ref: '#/sets/ref' }],
      }),
      'tokens/ref/core.tokens.json': JSON.stringify({
        ref: { space: { gap: { $type: 'dimension', $value: { value: 12, unit: 'px' } }, wide: { $value: 'wide' } }, bare: { $value: 1 } },
      }),
    }));
    if (model === null) throw new Error(diagnostics.map((d) => d.message).join('\n'));
    const types: Readonly<Record<string, 'dimension'>> = { 'ref.space.gap': 'dimension', 'ref.space.wide': 'dimension' };
    const facts: TokenFacts = { type: (id) => types[id] ?? null, token: () => null };
    const found = studioSets(model, facts).diagnostics;
    expect(pairs(found)).toEqual(['tokens-studio/value|ref.bare', 'tokens-studio/value|ref.space.wide']);
    expect(found.find((d) => d.tokenId === 'ref.bare')?.message).toBe('ref.bare has no type');
  });

  test('fonts/missing-license: a served font file without its OFL.txt', async () => {
    const input = await repo();
    const root = tempRoot();
    cpSync(join(REPO_ROOT, 'brands'), join(root, 'brands'), { recursive: true });
    rmSync(join(root, 'brands/prism/fonts/onest/OFL.txt'));
    const { files, diagnostics } = renderFonts({ ...input, root });
    expect((diagnostics ?? []).map((d) => [d.code, d.file])).toEqual([['fonts/missing-license', 'brands/prism/fonts/onest/OFL.txt']]);
    // Nothing of the family is written, on either platform.
    expect(files.filter((f) => f.path.startsWith(`${SWIFT_FONTS_ROOT}/onest/`) || f.path.includes('/fonts/onest/'))).toEqual([]);
    expect(files.some((f) => f.path.startsWith(`${SWIFT_FONTS_ROOT}/jetbrains-mono/`))).toBe(true);
  }, 120_000);

  test('normalize/problem: a color the normalizer cannot read stops tokens:build before anything is resolved', async () => {
    const root = tempRoot();
    cpSync(`${FIXTURES}valid`, root, { recursive: true });
    const file = join(root, 'tokens/ref/color.tokens.json');
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('"colorSpace": "oklch"');
    writeFileSync(file, text.replace('"colorSpace": "oklch"', '"colorSpace": "cmyk"'));
    const out: string[] = [];
    expect(await main(['--json', '--root', root], { out: (t) => out.push(t), err: () => undefined })).toBe(1);
    const report = JSON.parse(out.join('')) as { diagnostics: { code: string; file: string; message: string }[] };
    expect(report.diagnostics.map((d) => [d.code, d.file])).toEqual([['normalize/problem', 'tokens/ref/color.tokens.json']]);
    expect(report.diagnostics[0]?.message).toContain('unknown colorSpace "cmyk"');
  }, 60_000);
});
