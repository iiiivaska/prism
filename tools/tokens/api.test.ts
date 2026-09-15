// Style Dictionary runs share a module singleton (GroupMessages), so this file never uses test.concurrent.
import { beforeAll, describe, expect, test } from 'vitest';
import {
  brandMeta, buildBundle, contrastContexts, contrastRatio, flatten, hexToRgba, lookup, LookupError, over, publicPath,
  relativeLuminance, type IRBundle, type PermutationIR,
} from './api.ts';
import { fixtureReader } from './test-support.ts';

let valid: IRBundle;
beforeAll(async () => {
  valid = await buildBundle({ reader: fixtureReader('valid') });
});

describe('publicPath', () => {
  test('drops sys. and $root, keeps ref. and comp.', () => {
    expect(publicPath('sys.color.bg.surface.$root')).toBe('color.bg.surface');
    expect(publicPath('comp.button.primary.bg.rest')).toBe('comp.button.primary.bg.rest');
    expect(publicPath('ref.color.neutral.100')).toBe('ref.color.neutral.100');
    expect(publicPath('sys.material.glass.dark.fill.$root')).toBe('material.glass.dark.fill');
  });
});

describe('lookup', () => {
  test('exact id, then sys.<name>, sys.<name>.$root, comp.<name>, ref.<name>', () => {
    expect(lookup(valid, 'sys.color.bg.page')).toEqual(['sys.color.bg.page']);
    expect(lookup(valid, 'color.bg.page')).toEqual(['sys.color.bg.page']);
    expect(lookup(valid, 'color.bg.surface')).toEqual(['sys.color.bg.surface.$root']);
    expect(lookup(valid, 'sys.color.bg.surface')).toEqual(['sys.color.bg.surface.$root']);
    expect(lookup(valid, 'material.glass.dark.fill')).toEqual(['sys.material.glass.dark.fill.$root']);
    expect(lookup(valid, 'comp.card.bg')).toEqual(['comp.card.bg']);
    expect(lookup(valid, 'button.radius')).toEqual(['comp.button.radius']);
    expect(lookup(valid, 'color.smoke.light')).toEqual(['ref.color.smoke.light']);
  });

  test('`*` matches one segment and `**` one or more; a $root token matches by its group path', () => {
    expect(lookup(valid, 'gradient.vivid.*')).toEqual(['sys.gradient.vivid.default']);
    expect(lookup(valid, 'color.bg.*')).toEqual(['sys.color.bg.page', 'sys.color.bg.surface.$root']);
    expect(lookup(valid, 'color.bg.**')).toEqual([
      'sys.color.bg.fill.accent', 'sys.color.bg.page', 'sys.color.bg.surface.$root', 'sys.color.bg.surface.raised', 'sys.color.bg.tint.accent',
    ]);
    expect(lookup(valid, 'ref.gradient.vivid.*')).toEqual(['ref.gradient.vivid.plum-dusk', 'ref.gradient.vivid.sky']);
    expect(lookup(valid, 'motion.spring.interactive|snappy')).toEqual(['sys.motion.spring.interactive', 'sys.motion.spring.snappy']);
  });

  test('an unknown name throws with the nearest public paths', () => {
    expect(() => lookup(valid, 'color.text.primry')).toThrow(LookupError);
    try {
      lookup(valid, 'color.text.primry');
    } catch (e) {
      expect((e as LookupError).suggestions[0]).toBe('color.text.primary');
    }
  });
});

describe('contrastContexts (P1-6)', () => {
  test('brand × colorScheme at platform=web and the other defaults', () => {
    const ctx = contrastContexts(valid);
    expect(ctx).toHaveLength(12);
    expect(ctx.map((c) => `${c.brand}/${c.colorScheme}`).slice(0, 3)).toEqual(['prism/light', 'prism/dark', 'prism/light-increased-contrast']);
    const darkIC = ctx.find((c) => c.brand === 'prism' && c.colorScheme === 'dark-increased-contrast');
    expect(darkIC).toMatchObject({ scheme: 'dark', variant: 'increasedContrast', permutation: 'brand=prism|platform=web|colorScheme=dark-increased-contrast|density=compact|modality=pointer|motion=default' });
    const secondary = darkIC?.color('color.text.secondary');
    expect(secondary).toMatchObject({ id: 'sys.color.text.secondary', srgb: [1, 1, 1], alpha: 0.8, hex: '#ffffff', aliasChain: ['sys.color.text.secondary'] });
    const page = ctx[0]?.color('color.bg.page');
    expect(page?.aliasChain).toEqual(['sys.color.bg.page', 'ref.color.slot.light.bg-page', 'ref.color.neutral.100']);
    const vivid = ctx[1]?.gradient('gradient.vivid.*');
    expect(vivid?.map((g) => g.id)).toEqual(['sys.gradient.vivid.default']);
    expect(vivid?.[0]?.stops).toHaveLength(2);
    expect(() => ctx[0]?.color('color.bg.*')).toThrow(/exactly one color/);
    const alt = ctx.find((c) => c.brand === 'alt' && c.colorScheme === 'light');
    expect(alt?.color('color.bg.tint.accent').hex).not.toBe(ctx[0]?.color('color.bg.tint.accent').hex);
  });

  test('throws when a color differs between web and apple for the same context', () => {
    const perms = new Map(valid.permutations);
    const key = 'brand=prism|platform=apple|colorScheme=light|density=compact|modality=pointer|motion=default';
    const apple = perms.get(key) as PermutationIR;
    const tokens = new Map(apple.tokens);
    const page = tokens.get('sys.color.bg.page');
    if (page === undefined || page.value.kind !== 'color') throw new Error('fixture');
    tokens.set('sys.color.bg.page', { ...page, value: { ...page.value, hex: '#000000' } });
    perms.set(key, { ...apple, tokens });
    expect(() => contrastContexts({ ...valid, permutations: perms })).toThrow(/sys.color.bg.page differs between platform=web and platform=apple/);
  });
});

describe('brandMeta', () => {
  test('reads brand.json per brand context without resolving', async () => {
    const brands = await brandMeta({ reader: fixtureReader('valid') });
    expect([...brands.keys()]).toEqual(['prism', 'alt']);
    expect(brands.get('prism')?.fonts.mono).toMatchObject({ family: 'JetBrains Mono', platforms: ['apple', 'web'] });
    expect(brands.get('alt')).toMatchObject({ preset: 'native', extends: 'prism' });
    expect(brands.get('alt')?.fonts.mono).toBeUndefined();   // fonts are not inherited through extends
  });
});

describe('color math (§10)', () => {
  test('white on black is 21:1; compositing is source-over in gamma sRGB', () => {
    expect(contrastRatio([1, 1, 1], [0, 0, 0])).toBeCloseTo(21, 10);
    expect(relativeLuminance([1, 1, 1])).toBe(1);
    const half = over({ srgb: [1, 1, 1], alpha: 0.5 }, { srgb: [0, 0, 0], alpha: 1 });
    expect(half).toEqual({ srgb: [0.5, 0.5, 0.5], alpha: 1 });
    expect(flatten([{ srgb: [0, 0, 0], alpha: 1 }, { srgb: [1, 1, 1], alpha: 0.06 }, { srgb: [1, 1, 1], alpha: 0.55 }])[0]).toBeCloseTo(0.577, 3);
    expect(() => flatten([{ srgb: [0, 0, 0], alpha: 0.5 }])).toThrow(/opaque/);
    expect(hexToRgba('#5B6366')).toEqual({ srgb: [0x5b / 255, 0x63 / 255, 0x66 / 255], alpha: 1 });
    expect(hexToRgba('#00000040').alpha).toBeCloseTo(0.251, 3);
  });
});
