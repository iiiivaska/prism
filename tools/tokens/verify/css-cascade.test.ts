// The cascade simulator (ARCHITECTURE §9.12; ADR-0019 rules 2, 4 and 5): its own semantics on small
// cases, every scenario on both repository brands, and mutations of the model that it must catch.
// Style Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { cssModel, type CssModel, type CssRule } from '../formats/css/model.ts';
import { webScope, webScopes } from '../formats/css/web.ts';
import { collectBundle, REPO_ROOT } from '../ir/bundle.ts';
import type { IRBundle } from '../ir/types.ts';
import { Cascade, compile, contextOf, evalMedia, INVALID, matchesSelector, NEUTRAL_ENV, parseSelector, scenarios, simulate, webContexts, type El } from './css-cascade.ts';

let repo: Promise<IRBundle> | null = null;
function repoBundle(): Promise<IRBundle> {
  repo ??= collectBundle({ root: REPO_ROOT }).then((r) => {
    if (r.bundle === null) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
    return r.bundle;
  });
  return repo;
}

function el(attrs: Record<string, string>, parent: El | null = null, label = 'el'): El {
  return { label, attrs, parent };
}

describe('simulator semantics', () => {
  test('specificity: :root and attributes count one, :not() its most specific argument', () => {
    expect(parseSelector(':root').specificity).toBe(1);
    expect(parseSelector(':root:not([a="x"], [a="y"])').specificity).toBe(2);
    expect(parseSelector(':root[f="1"] [s="d"]').specificity).toBe(3);
    expect(parseSelector(':root:not([f="a"], [f="b"]):not([s="l"], [s="d"])').specificity).toBe(3);
    expect(() => parseSelector('.class')).toThrow(/unsupported selector/);
    expect(() => parseSelector('div > p')).toThrow(/unsupported selector/);
  });

  test('matching: :root, attribute tests, :not() lists and the descendant combinator', () => {
    const root = el({ f: '1' }, null, 'html');
    const child = el({ s: 'd' }, root);
    const grandchild = el({}, child);
    expect(matchesSelector(parseSelector(':root'), root)).toBe(true);
    expect(matchesSelector(parseSelector(':root'), child)).toBe(false);
    expect(matchesSelector(parseSelector(':root[f="1"] [s="d"]'), child)).toBe(true);
    expect(matchesSelector(parseSelector(':root[f="1"] [s="d"]'), grandchild)).toBe(false);
    expect(matchesSelector(parseSelector('[s]'), child)).toBe(true);
    expect(matchesSelector(parseSelector(':root:not([f="1"], [f="2"])'), root)).toBe(false);
    expect(matchesSelector(parseSelector(':root:not([f="2"], [f="3"])'), root)).toBe(true);
  });

  test('media: `not all and …` negates the whole query', () => {
    const touch = { ...NEUTRAL_ENV, hover: false };
    expect(evalMedia('not all and (hover: hover) and (pointer: fine)', NEUTRAL_ENV)).toBe(false);
    expect(evalMedia('not all and (hover: hover) and (pointer: fine)', touch)).toBe(true);
    expect(evalMedia('(hover: hover) and (pointer: fine)', touch)).toBe(false);
    expect(evalMedia('not all and (prefers-color-scheme: dark)', { ...NEUTRAL_ENV, prefersDark: true })).toBe(false);
    expect(() => evalMedia('(orientation: portrait)', NEUTRAL_ENV)).toThrow(/unsupported media feature/);
  });

  test('cascade: specificity, then source order; custom properties inherit their computed value', () => {
    const rules: CssRule[] = [
      { comment: '', media: [], supports: [], selectors: [':root'], decls: [{ name: '--a', value: '1', tokenId: 'a' }, { name: '--b', value: 'var(--a)', tokenId: 'b' }] },
      { comment: '', media: [], supports: [], selectors: ['[s="d"]'], decls: [{ name: '--a', value: '2', tokenId: 'a' }] },
      { comment: '', media: ['(prefers-color-scheme: dark)'], supports: [], selectors: [':root:not([s="l"], [s="d"])'], decls: [{ name: '--a', value: '3', tokenId: 'a' }] },
      { comment: '', media: [], supports: [], selectors: [':root'], decls: [{ name: '--c', value: 'var(--missing)', tokenId: 'c' }] },
    ];
    const root = el({}, null, 'html');
    const dark = el({ s: 'd' }, root);
    const c = new Cascade(compile(rules), { ...NEUTRAL_ENV, prefersDark: true });
    expect(c.value(root, '--a')).toBe('3');   // (0,2,0) beats :root
    expect(c.value(dark, '--a')).toBe('2');
    expect(c.value(dark, '--b')).toBe('3');   // computed on the root, inherited: why rescope blocks exist
    expect(c.value(root, '--c')).toBe(INVALID);
  });

  test('context: nestable axes take the nearest valid value, root-only axes read <html> only', () => {
    const root = el({ 'data-ds-color-scheme': 'dark', 'data-ds-contrast': 'bogus' }, null, 'html');
    const a = el({ 'data-ds-color-scheme': 'auto', 'data-ds-contrast': 'more', 'data-ds-density': 'comfortable' }, root);
    const b = el({ 'data-ds-color-scheme': 'light' }, a);
    const env = { ...NEUTRAL_ENV, prefersContrastMore: true, anyPointerCoarse: true };
    expect(contextOf(root, env)).toMatchObject({ colorScheme: 'dark', contrast: 'more', density: 'regular' });
    expect(contextOf(a, { ...env, prefersContrastMore: false })).toMatchObject({ colorScheme: 'dark', contrast: 'standard', density: 'comfortable' });
    expect(contextOf(b, env)).toMatchObject({ colorScheme: 'light', density: 'comfortable', modality: 'pointer' });
  });
});

describe('the repository stylesheets', () => {
  test('every scenario computes the IR for every custom property, in both brands (ADR-0019 scenarios)', async () => {
    const b = await repoBundle();
    for (const scope of webScopes(b)) {
      expect(webContexts(scope)).toHaveLength(96);
      const report = simulate(cssModel(scope));
      expect(report.mismatches, scope.brand).toEqual([]);
      expect(report.scenarios).toBe(scenarios(scope).length);
      expect(report.checks).toBeGreaterThan(1_000_000);
    }
  }, 120_000);

  describe('mutations the simulator catches', () => {
    async function model(): Promise<CssModel> {
      return cssModel(webScope(await repoBundle(), 'prism'));
    }
    const mutate = (m: CssModel, f: (rules: CssRule[]) => CssRule[]): CssModel => ({ ...m, tokens: f([...m.tokens]) });
    const failures = (m: CssModel): number => simulate(m, 1_000_000).mismatches.length;

    test('without the colorScheme rescope block, nested scopes keep the root value', async () => {
      const m = await model();
      expect(failures(mutate(m, (rs) => rs.filter((r) => !r.comment.startsWith('colorScheme rescope'))))).toBeGreaterThan(0);
    }, 60_000);

    test('`:not([attr])` instead of the valid-value list fails the unknown-value scenarios (ADR-0019 rule 2)', async () => {
      const m = await model();
      const bare = mutate(m, (rs) => rs.map((r) => ({ ...r, selectors: r.selectors.map((s) => s.replace(/:not\(\[data-ds-density="compact"\], \[data-ds-density="regular"\], \[data-ds-density="comfortable"\]\)/, ':not([data-ds-density])')) })));
      expect(failures(bare)).toBeGreaterThan(0);
    }, 60_000);

    test('without the density fallback, coarse pointers stay compact', async () => {
      const m = await model();
      expect(failures(mutate(m, (rs) => rs.filter((r) => !r.media.includes('(any-pointer: coarse)'))))).toBeGreaterThan(0);
    }, 60_000);

    test('without the descendant form of a contrast delta, nested schemes lose Increase Contrast', async () => {
      const m = await model();
      expect(failures(mutate(m, (rs) => rs.map((r) => ({ ...r, selectors: r.selectors.filter((s) => !/^:root\[data-ds-contrast="more"\] /.test(s)) })).filter((r) => r.selectors.length > 0)))).toBeGreaterThan(0);
    }, 60_000);

    test('keying the modality fallback on `(pointer: coarse)` breaks the independent pointer features (ADR-0019 rule 5)', async () => {
      const m = await model();
      expect(failures(mutate(m, (rs) => rs.map((r) => ({ ...r, media: r.media.map((q) => (q === 'not all and (hover: hover) and (pointer: fine)' ? '(any-pointer: coarse)' : q)) }))))).toBeGreaterThan(0);
    }, 60_000);

    test('dropping the P3 twins shows in the gamut scenarios', async () => {
      const m = await model();
      expect(failures(mutate(m, (rs) => rs.filter((r) => !r.media.includes('(color-gamut: p3)'))))).toBeGreaterThan(0);
    }, 60_000);
  });
});
