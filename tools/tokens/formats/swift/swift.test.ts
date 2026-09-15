// The Apple formats (ARCHITECTURE §9.7, §9.8, §14 P1-5; ADR-0020 §7, ADR-0021, ADR-0023): file snapshots
// of the Swift sources and the catalog on the valid fixture (two brands with distinct colors), the table
// evaluator against the IR on the repository and the fixtures (and a wrong shape it must catch), the
// colorset entry rules, namespace folders, names, the ADR-0021 weights and the ADR-0023 spring literals.
// Style Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { collectBundle, REPO_ROOT } from '../../ir/bundle.ts';
import { swiftName } from '../../ir/naming.ts';
import { fsReader, memoryReader, overlayReader } from '../../source/reader.ts';
import { fixtureReader } from '../../test-support.ts';
import { renderAll, type FormatInput, type OutputFile } from '../index.ts';
import { allMembers, DEFAULT_CONTEXT, swiftModel, verifySwiftTables, XCASSETS_ROOT, type SwiftModel } from './model.ts';
import { xcodeJson } from './xcode-json.ts';

const cache = new Map<string, Promise<FormatInput>>();

function input(name: 'valid' | 'mini' | 'repo'): Promise<FormatInput> {
  let hit = cache.get(name);
  if (hit === undefined) {
    hit = (async () => {
      const reader = name === 'repo' ? fsReader(REPO_ROOT) : fixtureReader(name);
      const r = await collectBundle(name === 'repo' ? { root: REPO_ROOT, reader } : { reader });
      if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('\n'));
      return { bundle: r.bundle, model: r.model, root: name === 'repo' ? REPO_ROOT : '/nonexistent', reader };
    })();
    cache.set(name, hit);
  }
  return hit;
}

function model(i: FormatInput): SwiftModel {
  const m = swiftModel(i.bundle);
  if (m === null) throw new Error('no Apple platform');
  return m;
}

function text(files: readonly OutputFile[], path: string): string {
  const f = files.find((x) => x.path === path);
  if (f === undefined || typeof f.contents !== 'string') throw new Error(`${path} was not rendered`);
  return f.contents;
}

const SOURCES = 'swift/Sources/DSTokens/Generated';

describe('the valid fixture', () => {
  test('the Swift sources, the generated tests and the catalog match their snapshots', async () => {
    const { files, diagnostics } = renderAll(await input('valid'), ['swift', 'xcassets']);
    expect(diagnostics).toEqual([]);
    for (const f of files.filter((x) => x.path.endsWith('.swift'))) {
      await expect(f.contents).toMatchFileSnapshot(`__snapshots__/valid/${f.path.split('/').pop() ?? ''}.snap`);
    }
    const catalog = files.filter((x) => x.path.startsWith(`${XCASSETS_ROOT}/`)).map((x) => `// ${x.path.slice(XCASSETS_ROOT.length + 1)}\n${String(x.contents)}`);
    await expect(catalog.join('\n')).toMatchFileSnapshot('__snapshots__/valid/Colors.xcassets.snap');
  }, 60_000);

  test('a brand with its own colors gets its own namespace folder; its entries follow its own values (ADR-0020 §7)', async () => {
    const i = await input('valid');
    const m = model(i);
    expect([...m.namespaces]).toEqual([['prism', 'prism'], ['alt', 'alt']]);
    const { files } = renderAll(i, ['xcassets', 'swift']);
    for (const ns of ['prism', 'alt']) {
      expect(JSON.parse(text(files, `${XCASSETS_ROOT}/${ns}/Contents.json`))).toEqual({ info: { author: 'xcode', version: 1 }, properties: { 'provides-namespace': true } });
    }
    const brand = text(files, `${SOURCES}/DSBrand.swift`);
    expect(brand).toContain('case .prism: "prism"');
    expect(brand).toContain('case .alt: "alt"');
    const colors = text(files, `${SOURCES}/DSColor.swift`);
    expect(colors).toContain('case .prism: prismAppearances');
    expect(colors).toContain('case .alt: altAppearances');
  }, 60_000);

  test('the mini fixture (no brand, platform or modality modifier) renders one brand and every file', async () => {
    const { files, diagnostics } = renderAll(await input('mini'), ['swift', 'xcassets']);
    expect(diagnostics).toEqual([]);
    expect(text(files, `${SOURCES}/DSBrand.swift`)).toContain('case defaultBrand = "default"');
    expect(files.some((f) => f.path === `${XCASSETS_ROOT}/default/Contents.json`)).toBe(true);
  }, 60_000);
});

describe('a reduced-transparency delta (none today, ADR-0022; the rule stays for future deltas)', () => {
  test('gets a -reduced-transparency twin colorset in every namespace, which DSColor picks while transparency is reduced', async () => {
    const base = fixtureReader('valid');
    const resolver = JSON.parse(base.readText('tokens/prism.resolver.json')) as { modifiers: { colorScheme: { contexts: Record<string, unknown[]> } } };
    resolver.modifiers.colorScheme.contexts['light-reduced-transparency'] = [{ $ref: 'sys/color/light.tokens.json' }, { $ref: 'sys/color/light-reduced-transparency.tokens.json' }];
    const delta = { sys: { color: { $type: 'color', bg: { tint: { accent: { $value: '{ref.color.accent.500}', $extensions: { 'app.prism': { alpha: 0.3 } } } } } } } };
    const reader = overlayReader(base, memoryReader({
      'tokens/prism.resolver.json': JSON.stringify(resolver),
      'tokens/sys/color/light-reduced-transparency.tokens.json': JSON.stringify(delta),
    }));
    const r = await collectBundle({ reader });
    if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('\n'));
    const i: FormatInput = { bundle: r.bundle, model: r.model, root: '/nonexistent', reader };
    const { files, diagnostics } = renderAll(i, ['swift', 'xcassets']);
    expect(diagnostics).toEqual([]);
    for (const ns of ['prism', 'alt']) {
      const twin = JSON.parse(text(files, `${XCASSETS_ROOT}/${ns}/color-bg-tint-accent-reduced-transparency.colorset/Contents.json`)) as { colors: { color: { components: Record<string, string> } }[] };
      // Any holds the light reduced-transparency value, its high-contrast entry repeats it (disjoint deltas).
      expect(twin.colors.map((c) => c.color.components['alpha'])).toEqual(['0.3000', '0.1400', '0.3000', '0.1400', '0.1400']);
    }
    const colors = text(files, `${SOURCES}/DSColor.swift`);
    expect(colors).toContain('case bgTintAccentReducedTransparency = "color-bg-tint-accent-reduced-transparency"');
    expect(colors).toContain('public var bgTintAccent: Color { transparency == .reduced ? DSColorToken.bgTintAccentReducedTransparency.color(brand) : DSColorToken.bgTintAccent.color(brand) }');
    expect(verifySwiftTables(model(i))).toEqual([]);
  }, 60_000);
});

describe('the table evaluator (ARCHITECTURE §9.12)', () => {
  test('the tables equal the IR for every context, platform and brand', async () => {
    for (const name of ['repo', 'valid', 'mini'] as const) expect(verifySwiftTables(model(await input(name))), name).toEqual([]);
  }, 120_000);

  test('a member that switches on the wrong axis is reported', async () => {
    const m = model(await input('repo'));
    const wrong: SwiftModel = {
      ...m,
      colorMembers: [],
      groups: m.groups.map((g) => ({
        ...g,
        components: [],
        members: g.members.map((x) => (x.id === 'sys.space.card-padding' && x.impl.kind === 'table' ? { ...x, impl: { kind: 'table' as const, fields: [] } } : x)),
      })),
    };
    const diags = verifySwiftTables(wrong);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.code).toBe('swift/table-mismatch');
    expect(diags[0]?.tokenId).toBe('sys.space.card-padding');
  }, 120_000);
});

describe('the repository', () => {
  test('renders without diagnostics; every brand shares one API (ADR-0020 rule 9)', async () => {
    const { files, diagnostics } = renderAll(await input('repo'), ['swift', 'xcassets']);
    expect(diagnostics).toEqual([]);
    const m = model(await input('repo'));
    expect(m.brands.map((b) => [b.context, b.caseName])).toEqual([['prism', 'prism'], ['prism-native', 'prismNative']]);
    // prism-native's colorsets are byte-identical to prism's, so it shares the folder.
    expect([...m.namespaces]).toEqual([['prism', 'prism'], ['prism-native', 'prism']]);
    expect(files.filter((f) => /\/Contents\.json$/.test(f.path) && !f.path.includes('.colorset/')).map((f) => f.path)).toEqual([
      `${XCASSETS_ROOT}/Contents.json`, `${XCASSETS_ROOT}/prism/Contents.json`,
    ]);
  }, 60_000);

  test('colorset entries: four universal entries plus watch when the color depends on colorScheme, one otherwise; no twins while ΔRT is empty', async () => {
    const i = await input('repo');
    const m = model(i);
    const { files } = renderAll(i, ['xcassets']);
    const colorsets = files.filter((f) => f.path.endsWith('.colorset/Contents.json'));
    expect(colorsets.length).toBe(m.colorsets.length);
    expect(m.colorsets.some((c) => c.reducedTransparency)).toBe(false);
    for (const f of colorsets) {
      const json = JSON.parse(String(f.contents)) as { colors: { idiom: string; appearances?: { appearance: string; value: string }[] }[] };
      const shape = json.colors.map((c) => `${c.idiom}:${(c.appearances ?? []).map((a) => `${a.appearance}=${a.value}`).join('+')}`);
      expect([
        ['universal:'],
        ['universal:', 'universal:luminosity=dark', 'universal:contrast=high', 'universal:luminosity=dark+contrast=high', 'watch:'],
      ]).toContainEqual(shape);
    }
    const secondary = JSON.parse(text(files, `${XCASSETS_ROOT}/prism/color-text-secondary.colorset/Contents.json`)) as { colors: { color: { 'color-space': string; components: Record<string, string> } }[] };
    // ARCHITECTURE §9.8's sample: P3 neutral.600 / white 0.64 / neutral.700 / white 0.8 / white 0.64 on watch.
    expect(secondary.colors.map((c) => [c.color['color-space'], c.color.components['red'], c.color.components['alpha']])).toEqual([
      ['display-p3', '0.3636', '1.0000'], ['srgb', '1.0000', '0.6400'], ['display-p3', '0.2539', '1.0000'], ['srgb', '1.0000', '0.8000'], ['srgb', '1.0000', '0.6400'],
    ]);
    const onAccent = JSON.parse(text(files, `${XCASSETS_ROOT}/prism/color-text-on-accent.colorset/Contents.json`)) as { colors: unknown[] };
    expect(onAccent.colors.length).toBe(1);
  }, 60_000);

  test('every Swift name of the manifest is declared (ARCHITECTURE §8, §9.6)', async () => {
    const i = await input('repo');
    const { files } = renderAll(i, ['swift']);
    const all = files.filter((f) => f.path.startsWith(`${SOURCES}/`)).map((f) => String(f.contents)).join('\n');
    const perm = [...i.bundle.permutations.values()][0];
    let checked = 0;
    for (const id of perm?.tokens.keys() ?? []) {
      const name = swiftName(id);
      if (name === null) continue;
      checked++;
      const member = name.startsWith('DSBrand.faces[.') ? name.slice('DSBrand.faces[.'.length, -1) : name.split('.').pop() ?? '';
      if (name.startsWith('DSColor.')) expect(all, name).toContain(`public var ${member}: Color`);
      else if (name.startsWith('DSBrand.faces')) expect(all, name).toContain(`.${member}: DSFontFace(`);
      else expect(all, name).toMatch(new RegExp(`public let \`?${member}\`?: `));
    }
    expect(checked).toBeGreaterThan(180);
  }, 60_000);

  test('DSColor is brand-scoped: no public static returns a token value (ADR-0020 rule 11)', async () => {
    const { files } = renderAll(await input('repo'), ['swift']);
    const statics = files.filter((f) => f.path.startsWith(`${SOURCES}/`)).flatMap((f) => String(f.contents).split('\n').filter((l) => /\bstatic\b/.test(l)).map((l) => l.trim()));
    expect(statics).toEqual([
      'public static let `default`: DSBrand = .prism',
      'public static let `default` = DSTokenContext()',
      'public static let platformDefault = DSTokenContext(colorScheme: .dark, density: .comfortable, modality: .touch)',
      'public static let platformDefault = DSTokenContext(density: .compact, modality: .pointer)',
      'public static let platformDefault = DSTokenContext(density: .regular, modality: .touch)',
      'package static var bundle: Bundle { .module }',
    ]);
    const colors = text(files, `${SOURCES}/DSColor.swift`);
    expect(colors).toContain('public struct DSColor: Hashable, Sendable {');
    expect(colors).toContain('public init(brand: DSBrand, transparency: DSTransparency) {');
  }, 60_000);

  test('member identifiers are valid, escaped Swift names; the generated files end in one newline without trailing blanks', async () => {
    const i = await input('repo');
    for (const member of allMembers(model(i))) expect(member.name, member.id).toMatch(/^(?:[a-z][A-Za-z0-9]*|`[a-z][A-Za-z0-9]*`)$/);
    const { files } = renderAll(i, ['swift', 'xcassets']);
    for (const f of files) {
      const t = String(f.contents);
      expect(t.endsWith('\n') && !t.endsWith('\n\n'), f.path).toBe(true);
      expect(t, f.path).not.toMatch(/[ \t]$/m);
    }
  }, 60_000);

  test('type roles carry the ADR-0021 weights per scheme and contrast; springs the ADR-0023 literals', async () => {
    const m = model(await input('repo'));
    const role = (scheme: string, contrast: string): unknown => {
      const t = m.tokenIn('prism', m.primary, { ...DEFAULT_CONTEXT, colorScheme: scheme, contrast }, 'sys.type.metric.xl');
      return t.value.kind === 'typography' ? [t.value.fontWeight.weight, t.value.boldWeight] : null;
    };
    expect([role('light', 'standard'), role('dark', 'standard'), role('light', 'more'), role('dark', 'more')]).toEqual([[300, 400], [200, 400], [400, 400], [400, 400]]);
    const { files } = renderAll(await input('repo'), ['swift']);
    const typography = text(files, `${SOURCES}/DSTokenSet+Typography.swift`);
    expect(typography).toContain('switch (c.colorScheme, c.contrast) {');
    expect(typography).toMatch(/case \(\.dark, \.standard\):[\s\S]*?self\.metricXl = DSTypeRole\(slot: \.display, size: 48, weight: 200, boldWeight: 400,/);
    const motion = text(files, `${SOURCES}/DSTokenSet+Motion.swift`);
    expect(motion).toContain('self.springSnappy = DSSpringToken(duration: 0.35, bounce: 0.15, blendDuration: 0, settle: 0.487, mass: 1, stiffness: 322.2728, damping: 30.5183)');
    expect(motion).toContain('self.springSnappy = DSSpringToken(duration: 0.25, bounce: 0, blendDuration: 0, settle: 0.367, mass: 1, stiffness: 631.6547, damping: 50.2655)');
    const tests = text(files, 'swift/Tests/DSTokensTests/Generated/GeneratedTokenTests.swift');
    expect(tests).not.toContain('settlingDuration');
    expect(tests).toContain('checkSpring(');
    expect(tests).toContain('check(DSTokenContext.platformDefault, DSTokenContext(colorScheme: .dark, density: .comfortable, modality: .touch), "watchos platformDefault")');
  }, 60_000);
});

describe('xcodeJson', () => {
  test('writes the layout Xcode writes: sorted keys, "key" : value, expanded objects and arrays, final newline', () => {
    expect(xcodeJson({ info: { version: 1, author: 'xcode' }, colors: [{ idiom: 'universal' }] })).toBe(
      '{\n  "colors" : [\n    {\n      "idiom" : "universal"\n    }\n  ],\n  "info" : {\n    "author" : "xcode",\n    "version" : 1\n  }\n}\n',
    );
  });
});
