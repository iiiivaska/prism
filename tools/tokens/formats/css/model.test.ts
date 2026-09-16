// The CSS model and its rendering (ARCHITECTURE §9.2, §9.3, §14 P1-5): the block list and selectors,
// ADR-0019 rules 2 and 4 on every selector, `@layer` wrapping, alpha tokens as literals, no Apple
// faces, twins and the render ↔ model round trip (the mini fixture's snapshots are in
// formats/index.test.ts). Style Dictionary runs share a module singleton, so this file never uses
// test.concurrent.
import { describe, expect, test } from 'vitest';
import { collectBundle, REPO_ROOT } from '../../ir/bundle.ts';
import type { IRBundle } from '../../ir/types.ts';
import { selectorProblems } from '../../verify/index.ts';
import { classify, cssModel, CSS_LAYER, type CssRule, type DeclSpec } from './model.ts';
import { mediaLevels, renderSheet } from './render.ts';
import { webScope, webScopes, type WebScope } from './web.ts';
import { part } from '../../transforms/index.ts';

let repo: Promise<IRBundle> | null = null;
function repoBundle(): Promise<IRBundle> {
  repo ??= collectBundle({ root: REPO_ROOT }).then((r) => {
    if (r.bundle === null) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
    return r.bundle;
  });
  return repo;
}

/** Parses the text renderSheet prints back into rules (comments, nested at-rules, selectors, declarations). */
function parseRendered(text: string): CssRule[] {
  const lines = text.split('\n');
  const rules: CssRule[] = [];
  const media: string[] = [];
  const supports: string[] = [];
  const stack: ('media' | 'supports' | 'layer')[] = [];
  let comment = '';
  let selectors: string[] = [];
  let decls: { name: string; value: string; tokenId: null }[] | null = null;
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (line === '') continue;
    if (decls !== null) {
      if (line === '}') {
        rules.push({ comment, media: [...media], supports: [...supports], selectors, decls });
        comment = '';
        selectors = [];
        decls = null;
        continue;
      }
      const m = /^([^:]+): (.*);$/.exec(line);
      if (m === null) throw new Error(`bad declaration ${line}`);
      decls.push({ name: m[1] ?? '', value: m[2] ?? '', tokenId: null });
      continue;
    }
    const c = /^\/\* (.*) \*\/$/.exec(line);
    if (c !== null) comment = c[1] ?? '';
    else if (line.startsWith('@layer ')) stack.push('layer');
    else if (line.startsWith('@media ')) {
      stack.push('media');
      media.push(line.slice('@media '.length, -2));
    } else if (line.startsWith('@supports ')) {
      stack.push('supports');
      supports.push(line.slice('@supports '.length, -2));
    } else if (line === '}') {
      const kind = stack.pop();
      if (kind === 'media') media.pop();
      if (kind === 'supports') supports.pop();
    } else if (line.endsWith(',')) selectors.push(line.slice(0, -1));
    else if (line.endsWith(' {')) {
      selectors.push(line.slice(0, -2));
      decls = [];
    } else throw new Error(`unexpected line ${line}`);
  }
  return rules;
}

/** A rule with the media conditions grouped the way renderSheet prints them. */
function printed(rule: CssRule): CssRule {
  return { ...rule, media: mediaLevels(rule.media), decls: rule.decls.map((d) => ({ ...d, tokenId: null })) };
}

describe('render', () => {
  test('ANDs plain media conditions and nests a `not` query in its own @media', () => {
    expect(mediaLevels(['(prefers-contrast: more)', '(prefers-color-scheme: dark)'])).toEqual(['(prefers-contrast: more) and (prefers-color-scheme: dark)']);
    expect(mediaLevels(['(prefers-contrast: more)', 'not all and (prefers-color-scheme: dark)'])).toEqual(['(prefers-contrast: more)', 'not all and (prefers-color-scheme: dark)']);
    expect(mediaLevels(['not all and (hover: hover) and (pointer: fine)', '(color-gamut: p3)'])).toEqual(['not all and (hover: hover) and (pointer: fine)', '(color-gamut: p3)']);
    const text = renderSheet({
      header: '/* h */',
      layer: CSS_LAYER,
      rules: [{ comment: 'c', media: ['not all and (hover: hover) and (pointer: fine)', '(color-gamut: p3)'], supports: ['not (transition-timing-function: linear(0, 1))'], selectors: [':root', '[a="b"]'], decls: [{ name: '--ds-x', value: '1', tokenId: 'x' }] }],
    });
    expect(text).toBe([
      '/* h */',
      '@layer ds.tokens {',
      '  /* c */',
      '  @media not all and (hover: hover) and (pointer: fine) {',
      '    @media (color-gamut: p3) {',
      '      @supports not (transition-timing-function: linear(0, 1)) {',
      '        :root,',
      '        [a="b"] {',
      '          --ds-x: 1;',
      '        }',
      '      }',
      '    }',
      '  }',
      '}',
      '',
    ].join('\n'));
  });
});

describe('tokens.css and motion.css of the repository', () => {
  test('every brand renders without diagnostics, and the text round-trips to the model', async () => {
    const b = await repoBundle();
    for (const scope of webScopes(b)) {
      const model = cssModel(scope);
      expect(model.diagnostics, scope.brand).toEqual([]);
      for (const rules of [model.tokens, model.motion]) {
        const text = renderSheet({ header: '/* h */', layer: CSS_LAYER, rules });
        expect(text.startsWith('/* h */\n@layer ds.tokens {\n')).toBe(true);
        expect(text.endsWith('\n}\n')).toBe(true);
        expect(text).not.toMatch(/[ \t]$/m);
        expect(parseRendered(text)).toEqual(rules.map(printed));
      }
    }
  }, 60_000);

  test('the blocks come in the order of ARCHITECTURE §9.2', async () => {
    const model = cssModel(webScope(await repoBundle(), 'prism'));
    const comments = model.tokens.map((r) => r.comment).filter((c) => c !== '');
    expect(comments).toEqual([
      'invariant',
      'colorScheme: light (default)',
      'colorScheme: dark',
      'colorScheme: dark under (prefers-color-scheme: dark) without a valid data-ds-color-scheme',
      'colorScheme rescope: same text in every context, value depends on colorScheme',
      'colorScheme variant: light-increased-contrast (delta over light)',
      'colorScheme variant: dark-increased-contrast (delta over dark)',
      'density: compact (default)',
      'density: regular',
      'density: comfortable',
      'density: watch',
      'density: regular under (any-pointer: coarse) without a valid data-ds-density',
      'density rescope: same text in every context, value depends on density',
      'modality: pointer (default)',
      'modality: touch',
      'modality: touch under not all and (hover: hover) and (pointer: fine) without a valid data-ds-modality',
    ]);
    const selectorsOf = (comment: string): readonly string[] => model.tokens.find((r) => r.comment === comment)?.selectors ?? [];
    expect(selectorsOf('colorScheme: light (default)')).toEqual([':root', '[data-ds-color-scheme="light"]']);
    expect(selectorsOf('colorScheme rescope: same text in every context, value depends on colorScheme')).toEqual([':root', '[data-ds-color-scheme]']);
    expect(selectorsOf('density: regular under (any-pointer: coarse) without a valid data-ds-density')).toEqual([':root:not([data-ds-density="compact"], [data-ds-density="regular"], [data-ds-density="comfortable"], [data-ds-density="watch"])']);
    expect(selectorsOf('modality: touch')).toEqual([':root[data-ds-modality="touch"]']);
    // The four variant groups of light increased contrast (ARCHITECTURE §9.2 item 3).
    const at = model.tokens.findIndex((r) => r.comment === 'colorScheme variant: light-increased-contrast (delta over light)');
    const groups = model.tokens.slice(at, at + 4).filter((r) => r.media.every((m) => m !== '(color-gamut: p3)'));
    expect(groups.map((r) => [r.media, r.selectors])).toEqual([
      [[], [':root[data-ds-contrast="more"][data-ds-color-scheme="light"]', ':root[data-ds-contrast="more"] [data-ds-color-scheme="light"]']],
      [['not all and (prefers-color-scheme: dark)'], [':root[data-ds-contrast="more"]:not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"])']],
      [['(prefers-contrast: more)'], [':root:not([data-ds-contrast="standard"], [data-ds-contrast="more"])[data-ds-color-scheme="light"]', ':root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]) [data-ds-color-scheme="light"]']],
      [['(prefers-contrast: more)', 'not all and (prefers-color-scheme: dark)'], [':root:not([data-ds-contrast="standard"], [data-ds-contrast="more"]):not([data-ds-color-scheme="light"], [data-ds-color-scheme="dark"])']],
    ]);
    // Reduced transparency carries no delta after ADR-0022, so it emits no block.
    expect(model.tokens.some((r) => r.selectors.some((s) => s.includes('data-ds-transparency')))).toBe(false);
    const motion = model.motion.map((r) => [r.comment, r.media, r.supports, r.selectors]);
    expect(motion).toEqual([
      ['invariant', [], [], [':root']],
      ['', [], ['not (transition-timing-function: linear(0, 1))'], [':root']],
      ['motion: standard (default)', [], [], [':root']],
      ['motion: reduce', [], [], [':root[data-ds-motion="reduce"]']],
      ['', [], ['not (transition-timing-function: linear(0, 1))'], [':root[data-ds-motion="reduce"]']],
      ['motion: reduce under (prefers-reduced-motion: reduce) without a valid data-ds-motion', ['(prefers-reduced-motion: reduce)'], [], [':root:not([data-ds-motion="standard"], [data-ds-motion="reduce"])']],
      ['', ['(prefers-reduced-motion: reduce)'], ['not (transition-timing-function: linear(0, 1))'], [':root:not([data-ds-motion="standard"], [data-ds-motion="reduce"])']],
    ]);
  }, 60_000);

  test('selectors keep ADR-0019 rules 2 and 4; declarations follow token order', async () => {
    const b = await repoBundle();
    for (const scope of webScopes(b)) {
      const model = cssModel(scope);
      for (const rule of [...model.tokens, ...model.motion]) {
        expect(selectorProblems(rule), rule.selectors.join(', ')).toEqual([]);
        const order = rule.decls.filter((d) => d.tokenId !== null).map((d) => model.specs.findIndex((s) => s.name === d.name));
        expect([...order].sort((x, y) => x - y)).toEqual(order);
      }
      const text = renderSheet({ header: '', layer: CSS_LAYER, rules: model.tokens });
      expect(text).not.toMatch(/:not\(\[data-ds-[a-z-]+\]\)/);
    }
    expect(selectorProblems({ comment: '', media: [], supports: [], selectors: [':root:not([data-ds-density])', '[data-ds-contrast="more"]', ':root [data-ds-motion="reduce"]'], decls: [] })).toHaveLength(3);
  }, 60_000);

  test('alpha aliases render as literals of their target, never var(); Apple faces are not emitted', async () => {
    const model = cssModel(webScope(await repoBundle(), 'prism'));
    const light = model.tokens.find((r) => r.comment === 'colorScheme: light (default)');
    const decl = (name: string): string | undefined => light?.decls.find((d) => d.name === name)?.value;
    expect(decl('--ds-color-bg-tint-accent')).toBe('oklch(0.7517 0.1475 57.6 / 0.12)');
    expect(decl('--ds-material-glass-dark-fill')).toBe('oklch(0.1504 0.007 265 / 0.55)');
    expect(decl('--ds-color-bg-page')).toBe('var(--ds-ref-color-slot-light-bg-page)');
    const scope = webScope(await repoBundle(), 'prism');
    let alphaTexts = 0;
    for (const spec of model.specs) {
      expect(spec.tokenId.startsWith('ref.font.apple.'), spec.tokenId).toBe(false);
      scope.perms.forEach((p, i) => {
        if (p.tokens.get(spec.tokenId)?.alpha === null) return;
        alphaTexts++;
        expect(spec.texts[i]?.startsWith('var('), `${spec.name} in ${p.key}`).toBe(false);
      });
    }
    expect(alphaTexts).toBeGreaterThan(0);
  }, 60_000);

  test('twins: P3 re-declarations for out-of-sRGB colors, linear() fallbacks for spring easings', async () => {
    const model = cssModel(webScope(await repoBundle(), 'prism'));
    const p3 = model.tokens.filter((r) => r.media.includes('(color-gamut: p3)'));
    expect(p3.flatMap((r) => r.decls.map((d) => d.name))).toEqual(['--ds-ref-color-accent-50', '--ds-ref-color-accent-300']);
    expect(p3[0]?.decls[0]?.value).toBe('oklch(0.9794 0.0169 76.1)');
    const noLinear = model.motion.filter((r) => r.supports.length > 0).flatMap((r) => r.decls);
    expect(noLinear.every((d) => d.name.endsWith('-easing') && d.value.startsWith('cubic-bezier('))).toBe(true);
    expect(noLinear.some((d) => d.name === '--ds-ref-motion-spring-snappy-easing' && d.value === 'cubic-bezier(0.23, 1, 0.32, 1)')).toBe(true);
    const snappy = model.specs.find((s) => s.name === '--ds-ref-motion-spring-snappy');
    expect(snappy?.texts[0]).toBe('var(--ds-ref-motion-spring-snappy-duration) var(--ds-ref-motion-spring-snappy-easing)');
    expect(snappy?.literals[0]?.value.startsWith('487ms linear(0, 0.0055 1.23%')).toBe(true);
  }, 60_000);
});

describe('membership', () => {
  /** A two-axis scope (colorScheme light/dark × density compact/regular) for crafted declarations. */
  function fakeScope(): WebScope {
    const axes = ['colorScheme', 'density'] as const;
    const contexts = { colorScheme: ['light', 'dark'], density: ['compact', 'regular'] };
    const inputs = contexts.colorScheme.flatMap((c) => contexts.density.map((d) => ({ colorScheme: c, density: d })));
    const index = (input: Readonly<Record<string, string>>): number => inputs.findIndex((i) => i.colorScheme === (input['colorScheme'] ?? 'light') && i.density === (input['density'] ?? 'compact'));
    return {
      brand: 'fake',
      axes: axes.map((a) => ({ axis: a, modifier: { name: a, contexts: contexts[a], default: contexts[a][0] ?? '' }, runtime: { attribute: '', values: contexts[a], nestable: true, media: { value: '', query: '' }, resolver: { modifier: a, contexts: {} }, swiftType: '', swiftCases: {} }, contexts: new Map(contexts[a].map((c) => [c, c])) })),
      variants: [],
      perms: inputs.map((_, i) => ({ key: String(i), input: {}, tokens: new Map() })),
      inputs,
      defaults: { colorScheme: 'light', density: 'compact' },
      defaultIndex: 0,
      ids: [],
      index,
      single: (m, c) => index({ colorScheme: 'light', density: 'compact', [m]: c }),
    };
  }
  const spec = (texts: string[], literals: string[]): DeclSpec => ({ name: '--ds-x', tokenId: 'sys.x', suffix: '', sheet: 'tokens', texts, literals: literals.map((l) => part('', l)) });

  test('invariant, axis, rescope; two-axis text and masked interactions fail', () => {
    const scope = fakeScope();
    const place = (texts: string[], literals: string[]): unknown => {
      const r = classify(scope, [spec(texts, literals)]);
      return r.diagnostics.length > 0 ? r.diagnostics.map((d) => d.code) : r.memberships[0]?.place;
    };
    // inputs: [light compact, light regular, dark compact, dark regular]
    expect(place(['a', 'a', 'a', 'a'], ['1', '1', '1', '1'])).toEqual({ kind: 'invariant' });
    expect(place(['a', 'a', 'b', 'b'], ['1', '1', '2', '2'])).toEqual({ kind: 'axis', axis: 'colorScheme' });
    expect(place(['v', 'v', 'v', 'v'], ['1', '2', '1', '2'])).toEqual({ kind: 'rescope', axis: 'density' });
    expect(place(['a', 'b', 'c', 'd'], ['1', '2', '3', '4'])).toEqual(['css/text-axes']);
    expect(place(['a', 'a', 'a', 'b'], ['1', '1', '1', '2'])).toEqual(['css/composition']);
    expect(place(['a', 'b', 'a', 'b'], ['1', '1', '2', '2'])).toEqual(['css/text-axes']);
  });

  test('a motion-dependent declaration in tokens.css fails', () => {
    const scope = fakeScope();
    const s = { ...spec(['a', 'a', 'a', 'a'], ['1', '1', '1', '1']), sheet: 'motion' as const };
    expect(classify(scope, [{ ...s, texts: ['a', 'a', 'b', 'b'], literals: ['1', '1', '2', '2'].map((l) => part('', l)) }]).diagnostics.map((d) => d.code)).toEqual(['css/motion-axes']);
  });
});
