// Style Dictionary runs share a module singleton (GroupMessages), so this file never uses test.concurrent;
// the overlap test below starts two builds at once on purpose, inside one test.
import type { TransformedToken } from 'style-dictionary/types';
import { describe, expect, test } from 'vitest';
import { buildBundle, collectBundle } from '../ir/bundle.ts';
import { TokenBuildError, type Diagnostic } from '../ir/diagnostics.ts';
import { isNormalized } from '../ir/normalize.ts';
import type { Input, IRBundle, IRColor, IRGradient, IRTransition, IRTypography, PermutationIR } from '../ir/types.ts';
import { defaultInput, enumerate, merge, permKey } from '../resolver.ts';
import { loadModel } from '../source/model.ts';
import { memoryReader, overlayReader } from '../source/reader.ts';
import { brokenReader, casesWithPrefix, fixtureReader, pairs, runBroken } from '../test-support.ts';
import { finishPermutation, runPermutation, sdInput } from './sd.ts';

let mini: IRBundle | null = null;
async function miniBundle(): Promise<IRBundle> {
  mini ??= await buildBundle({ reader: fixtureReader('mini') });
  return mini;
}
function perm(b: IRBundle, key: string): PermutationIR {
  const p = b.permutations.get(key);
  if (p === undefined) throw new Error(`no permutation ${key}`);
  return p;
}
const LIGHT = 'colorScheme=light|density=compact|motion=default';
const DARK_REDUCED = 'colorScheme=dark|density=compact|motion=reduced';

describe('one permutation through Style Dictionary', () => {
  test('IR snapshot of the mini default permutation', async () => {
    const { model } = loadModel(fixtureReader('mini'));
    if (model === null) throw new Error('model');
    const input = defaultInput(model);
    const merged = merge(model, input);
    const ir = await runPermutation(merged.tree, { key: permKey(model, input), input, model, provenance: merged.provenance, diagnostics: [] });
    expect(ir.key).toBe(LIGHT);
    // Color math is rounded to 10 decimals so the snapshot does not pin ULP noise.
    const rounded = JSON.parse(JSON.stringify([...ir.tokens.values()], (_k, v: unknown) => (typeof v === 'number' ? Math.round(v * 1e10) / 1e10 : v))) as unknown;
    expect(rounded).toMatchSnapshot();
  });

  test('every value is plain data with a kind at every level', async () => {
    const b = await miniBundle();
    for (const p of b.permutations.values()) {
      for (const t of p.tokens.values()) {
        expect(isNormalized(t.value), t.id).toBe(true);
        expect(Object.getPrototypeOf(t.value)).toBe(Object.prototype);
      }
    }
  });

  test('an alias gets its target type; a literal gets the $type of its own group', async () => {
    const b = await miniBundle();
    const p = perm(b, LIGHT);
    expect(p.tokens.get('comp.card.bg')?.type).toBe('color');
    expect(p.tokens.get('comp.card.title')?.type).toBe('typography');
    expect(p.tokens.get('comp.button.motion.press')?.type).toBe('transition');
    // sys.type.* sit under a group typed number in another document and carry their own $type
    expect(p.tokens.get('sys.type.body.md')?.type).toBe('typography');
    expect(p.tokens.get('ref.type.scale')?.type).toBe('number');
  });

  test('a spring on a literal ref transition flows through sys and comp aliases, default and reduced', async () => {
    const b = await miniBundle();
    const press = (key: string) => perm(b, key).tokens.get('comp.button.motion.press')?.value as IRTransition;
    expect(press(LIGHT).spring).toEqual({ duration: 0.35, bounce: 0.15, blendDuration: 0 });
    expect(press(LIGHT).duration.ms).toBe(487);
    expect(press(DARK_REDUCED).spring).toEqual({ duration: 0.25, bounce: 0, blendDuration: 0 });
    expect(press(DARK_REDUCED).duration.ms).toBe(367);
    expect(perm(b, LIGHT).tokens.get('comp.button.motion.press')?.aliasOf).toBe('sys.motion.spring.snappy');
  });

  test('a sys alias with app.prism.alpha resolves to its target with that alpha', async () => {
    const b = await miniBundle();
    const p = perm(b, LIGHT);
    const tint = p.tokens.get('sys.color.bg.tint.accent');
    const target = p.tokens.get('ref.color.accent.500')?.value as IRColor;
    expect(tint?.alpha).toBe(0.12);
    expect(tint?.value).toEqual({ ...target, alpha: 0.12 });
    // an alias of the alpha alias inherits the translucent result
    expect((p.tokens.get('comp.button.bg')?.value as IRColor).alpha).toBe(0.12);
    expect((perm(b, DARK_REDUCED).tokens.get('comp.button.bg')?.value as IRColor).alpha).toBe(0.14);
  });

  test('typography slot, numeric, textStyle, darkWeight and font opsz survive two alias hops', async () => {
    const b = await miniBundle();
    const title = (key: string) => perm(b, key).tokens.get('comp.card.title')?.value as IRTypography;
    expect(title(LIGHT)).toMatchObject({ slot: 'display', numeric: 'proportional', textStyle: 'largeTitle', darkWeight: 200 });
    expect(title(LIGHT).fontFamily.opsz).toBe(32);
    expect(title(LIGHT).fontWeight.weight).toBe(300);
    expect(title(DARK_REDUCED).fontWeight.weight).toBe(200);
    expect(perm(b, LIGHT).tokens.get('ref.type.body.md')?.subAliases).toEqual({ fontFamily: 'ref.font.ui' });
  });

  test('the gradient keys and app.prism.flag flow through aliases (valid fixture)', async () => {
    const base = fixtureReader('valid');
    const button = JSON.parse(base.readText('tokens/comp/button.tokens.json')) as { comp: { button: Record<string, unknown> } };
    button.comp.button['hover'] = { $value: '{sys.interaction.hover}' };
    const r = await collectBundle({
      reader: overlayReader(base, memoryReader({ 'tokens/comp/button.tokens.json': JSON.stringify(button) })),
      filter: { brand: ['prism'], platform: ['web'], colorScheme: ['light', 'dark'], density: ['compact'], modality: ['pointer', 'touch'], motion: ['default'] },
    });
    expect(r.diagnostics).toEqual([]);
    const b = r.bundle;
    if (b === null) throw new Error('bundle');
    const key = (scheme: string, modality: string) => `brand=prism|platform=web|colorScheme=${scheme}|density=compact|modality=${modality}|motion=default`;
    const keys = (g: IRGradient) => ({ angle: g.angle, grain: g.grain, scheme: g.scheme, bloom: g.bloom });
    for (const [scheme, target, want] of [
      ['light', 'ref.gradient.vivid.sky', { angle: 165, grain: 0.06, scheme: 'light', bloom: { alpha: 0.3, blur: 150 } }],
      ['dark', 'ref.gradient.vivid.plum-dusk', { angle: 200, grain: 0.05, scheme: 'dark', bloom: null }],
    ] as const) {
      const p = perm(b, key(scheme, 'pointer'));
      const alias = p.tokens.get('sys.gradient.vivid.default');
      expect(alias?.aliasOf).toBe(target);
      expect(keys(alias?.value as IRGradient)).toEqual(want);
      expect(keys(alias?.value as IRGradient)).toEqual(keys(p.tokens.get(target)?.value as IRGradient));
    }
    expect(perm(b, key('light', 'pointer')).tokens.get('comp.button.hover')?.value).toEqual({ kind: 'number', value: 1, flag: true });
    expect(perm(b, key('light', 'touch')).tokens.get('comp.button.hover')?.value).toEqual({ kind: 'number', value: 0, flag: true });
  });

  test('an out-of-sRGB color keeps its authored components and carries its mapped twins', async () => {
    const b = await miniBundle();
    const c = perm(b, LIGHT).tokens.get('ref.color.accent.300')?.value as IRColor;
    expect(c).toMatchObject({ space: 'oklch', components: [0.8506, 0.1133, 68.2], inSrgb: false, inP3: true, hex: '#ffc07a' });
  });

  test('descriptions and metadata never reach Style Dictionary, so a brace in prose is not a reference', async () => {
    const tree = { ref: { a: { $type: 'number', $value: 1, $description: 'see {nothing.here}', $extensions: { 'app.prism': { flag: true, a11y: { pairsWith: ['x'] } } } } } };
    expect(sdInput(tree)).toEqual({ ref: { a: { $type: 'number', $value: 1, $extensions: { 'app.prism': { flag: true } } } } });
    const base = fixtureReader('mini');
    const doc = JSON.parse(base.readText('tokens/ref/core.tokens.json')) as { ref: { space: Record<string, { $description?: string }> } };
    const step = doc.ref.space['2'];
    if (step !== undefined) step.$description = 'the {ref.space.missing} step';
    const r = await collectBundle({ reader: overlayReader(base, memoryReader({ 'tokens/ref/core.tokens.json': JSON.stringify(doc) })), filter: { density: ['compact'], motion: ['default'] } });
    expect(r.diagnostics).toEqual([]);
    expect(r.bundle?.permutations.get(LIGHT)?.tokens.get('ref.space.2')?.description).toBe('the {ref.space.missing} step');
  });
});

describe('IR construction backstops (engine/to-ir.ts)', () => {
  test('a token without a source declaration or with an unnormalized value fails the permutation', () => {
    const { model } = loadModel(fixtureReader('mini'));
    if (model === null) throw new Error('model');
    const input = defaultInput(model);
    const merged = merge(model, input);
    const meta = { key: permKey(model, input), input, model, provenance: merged.provenance, diagnostics: [] as Diagnostic[] };
    const tokens = [
      { path: ['ref', 'ghost'], $type: 'number', $value: { kind: 'number', value: 1, flag: false } },
      { path: ['ref', 'space', '2'], $type: 'dimension', $value: { value: 8, unit: 'px' } },
    ] as unknown as TransformedToken[];
    expect(() => finishPermutation(tokens, meta)).toThrow(TokenBuildError);
    expect(meta.diagnostics.map((d) => [d.code, d.tokenId])).toEqual([['ir/provenance', 'ref.ghost'], ['ir/not-normalized', 'ref.space.2']]);
  });
});

describe('no state survives a run', () => {
  test('P1, P2, two failing trees, then P2 and P1 again give identical IR', async () => {
    const { model } = loadModel(fixtureReader('mini'));
    if (model === null) throw new Error('model');
    const all = enumerate(model);
    const p1 = defaultInput(model);
    const p2 = all[all.length - 1];
    if (p2 === undefined) throw new Error('inputs');
    type Tree = { comp: { card: { bg: { $value: unknown } } }; ref: { space: Record<string, { $value: unknown }> } };
    const run = async (input: Input, edit?: (tree: Tree) => void): Promise<string> => {
      const merged = merge(model, input);
      const tree = edit === undefined ? merged.tree : (structuredClone(merged.tree) as unknown as Tree);
      edit?.(tree as Tree);
      const ir = await runPermutation(tree, { key: permKey(model, input), input, model, provenance: merged.provenance, diagnostics: [] });
      return JSON.stringify({ key: ir.key, input: ir.input, tokens: [...ir.tokens.entries()] });
    };
    const before = [await run(p1), await run(p2)];
    await expect(run(p2, (t) => { t.comp.card.bg.$value = '{sys.color.bg.nothing}'; })).rejects.toBeInstanceOf(TokenBuildError);
    await expect(run(p1, (t) => { const step = t.ref.space['2']; if (step !== undefined) step.$value = { value: 1, unit: 'em' }; })).rejects.toBeInstanceOf(TokenBuildError);
    // reversed order: a run's output depends on its own tree only, not on the run before it
    const after = [await run(p2), await run(p1)];
    expect(after[1] === before[0] && after[0] === before[1]).toBe(true);
    expect(before[0]).not.toBe(before[1]);
  });

  test('two builds started at once through the exported API never see each other\'s Style Dictionary messages', async () => {
    // GroupMessages is process-wide; resolveTokens queues every run, so a caller that overlaps two
    // builds (tokens:diff builds a baseline and a head bundle in one process) gets each build's own result.
    const [c] = casesWithPrefix('ref-broken');
    if (c === undefined) throw new Error('fixture');
    const [b, v] = await Promise.all([collectBundle({ reader: brokenReader(c) }), collectBundle({ reader: fixtureReader('valid') })]);
    expect(pairs(b.diagnostics)).toEqual(['ref/broken|comp.card.bg']);
    expect(v.diagnostics).toEqual([]);
    expect(v.bundle?.permutations.size).toBe(192);
  }, 60_000);
});

describe('broken fixtures of the Style Dictionary stage', () => {
  for (const c of casesWithPrefix('ref-broken', 'ref-cycle', 'ref-group-reference', 'ref-syntax', 'type-untyped', 'type-alias-mismatch', 'value-invalid', 'tier-sys-literal', 'type-flag-mismatch')) {
    test(`${c.name}: ${c.description}`, async () => {
      const { got, want, result } = await runBroken(c);
      expect(got).toEqual(want);
      expect(result.bundle).toBeNull();
    });
  }

  test('a broken reference names both tokens and suggests the nearest id', async () => {
    const [c] = casesWithPrefix('ref-broken');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'ref/broken',
      tokenId: 'comp.card.bg',
      file: 'tokens/comp/card.tokens.json',
      hint: 'did you mean {sys.color.bg.surface.$root}?',
    });
    expect(result.diagnostics[0]?.message).toContain('{sys.color.bg.surfce}');
  });

  test('a group reference fails with the .$root hint', async () => {
    const [c] = casesWithPrefix('ref-group-reference');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics[0]?.hint).toBe('write {sys.color.bg.surface.$root}');
  });

  test('a normalizer diagnostic fails the run instead of warning', async () => {
    const [c] = casesWithPrefix('value-invalid');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.bundle).toBeNull();
    expect(result.diagnostics[0]).toMatchObject({ code: 'value/invalid', severity: 'error' });
    expect(result.diagnostics[0]?.message).toContain('px or rem');
  });

  test('an alias that declares its own spring fails with extension/alias-override', async () => {
    const [c] = casesWithPrefix('extension-alias-override');
    if (c === undefined) throw new Error('fixture');
    const { result } = await runBroken(c);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['extension/alias-override']);
  });
});
