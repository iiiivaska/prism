// spec:validate (roadmap P2-1): the repository's specs validate, every fixture fails with exactly the
// diagnostic it declares, and the grammar helpers behave on their own.
import { beforeAll, describe, expect, test } from 'vitest';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { axesOf, statesOf, walkBindings } from './bindings.ts';
import { compGroup, NON_BINDABLE } from './config.ts';
import { loadSpec } from './load.ts';
import { bareWord, expandPath, isTokenPath, proseTokenPaths } from './prose.ts';
import { bindableCategories, pointerToPath, SchemaShapeError } from './schema.ts';
import { caseReader, repoDictionary, specCases, triples } from './test-support.ts';
import { main, passed, runSpecValidate } from './validate.ts';

const COMPONENT_SCHEMA = 'spec/component.schema.json';

// The dictionary is built once for the whole file; the Style Dictionary run takes several seconds.
beforeAll(async () => {
  await repoDictionary();
}, 120_000);

describe('the repository', () => {
  test('every spec validates against the schema, the dictionary and the example rules', async () => {
    const collected = await repoDictionary();
    const result = await runSpecValidate({ reader: fsReader(REPO_ROOT), collected });
    expect(result.diagnostics).toEqual([]);
    expect(passed(result)).toBe(true);
    // The four slice specs of ADR-0012; P2-5 adds the rest.
    expect(result.files).toEqual([
      'spec/components/Button.yaml',
      'spec/components/Card.yaml',
      'spec/components/Surface.yaml',
      'spec/components/Text.yaml',
    ]);
  }, 60_000);

  test('the schema regex is the single copy of the bindable set, and it is disjoint from NON_BINDABLE', () => {
    const text = fsReader(REPO_ROOT).readText(COMPONENT_SCHEMA);
    const bindable = bindableCategories(text, COMPONENT_SCHEMA);
    expect([...bindable].sort()).toEqual(
      ['border', 'chart', 'color', 'elevation', 'gradient', 'icon', 'material', 'motion', 'opacity', 'radius', 'size', 'space', 'stroke', 'type', 'z'],
    );
    expect(NON_BINDABLE.filter((c) => bindable.has(c))).toEqual([]);
  });

  test('every sys category of the dictionary is classified', async () => {
    const collected = await repoDictionary();
    const ids = [...(collected.bundle?.permutations.values().next().value?.tokens.keys() ?? [])];
    const categories = new Set(ids.flatMap((id) => (id.startsWith('sys.') ? [id.split('.')[1] ?? ''] : [])));
    const bindable = bindableCategories(fsReader(REPO_ROOT).readText(COMPONENT_SCHEMA), COMPONENT_SCHEMA);
    const unclassified = [...categories].filter((c) => !bindable.has(c) && !NON_BINDABLE.includes(c));
    expect(unclassified).toEqual([]);
  });

  test('the CLI exits 0 and prints a summary', async () => {
    const logged: string[] = [];
    const log = console.log;
    console.log = (line: string): void => void logged.push(line);
    try {
      expect(await main([])).toBe(0);
    } finally {
      console.log = log;
    }
    expect(logged.join('\n')).toMatch(/^spec:validate: 4 specs, 0 diagnostic\(s\)/);
  }, 120_000);

  test('the CLI rejects an unknown argument', async () => {
    const err = console.error;
    console.error = (): void => undefined;
    try {
      expect(await main(['--nope'])).toBe(2);
      expect(await main(['--root'])).toBe(2);
    } finally {
      console.error = err;
    }
  }, 30_000);
});

describe('fixtures', () => {
  const cases = specCases();

  test('each diagnostic code has a fixture', () => {
    const codes = new Set(cases.flatMap((c) => c.expect.map((e) => e.code)));
    expect([...codes].sort()).toEqual([
      'binding/foreign-comp',
      'binding/not-bindable',
      'binding/unknown',
      'category/unclassified',
      'comp/no-spec',
      'comp/orphan',
      'example/light-glass-backdrop',
      'example/tinted-scheme',
      'example/vivid-grid',
      'example/vivid-icon',
      'example/vivid-unit',
      'haptic/unknown',
      'matrix/axis',
      'prose/unknown',
      'spec/file-name',
      'spec/no-schema',
      'spec/parse',
      'spec/schema',
      'spec/unknown-part',
    ]);
  });

  test.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    const collected = await repoDictionary();
    const result = await runSpecValidate({ reader: caseReader(c), collected });
    expect(triples(result.diagnostics)).toEqual(triples(c.expect));
    expect(passed(result)).toBe(c.expect.length === 0);
    for (const d of result.diagnostics) {
      expect(d.severity).toBe('error');
      expect(d.hint, `${d.code} carries a fix`).toBeTruthy();
      if (d.file?.endsWith('.yaml') === true) expect(d.line, `${d.code} carries a line`).toBeGreaterThan(0);
    }
  }, 60_000);
});

describe('the binding-matrix grammar', () => {
  const spec = {
    name: 'Sample',
    props: [
      { name: 'variant', type: 'enum', values: ['primary', 'ghost'] },
      { name: 'size', type: 'enum', values: ['sm', 'md'] },
    ],
    states: ['default', 'pressed', 'focus-visible'],
    tokens: {},
  };

  test('the axes are the enum props, the published material and the published backdrop', () => {
    expect(axesOf(spec).map((a) => a.name)).toEqual(['prop variant', 'prop size', 'material', 'backdrop']);
    expect(statesOf(spec)).toEqual(new Set(['pressed', 'focus-visible']));
  });

  test('a state block holds properties, and a matrix keyed by one axis is accepted', () => {
    const { bindings, problems, parts } = walkBindings({
      ...spec,
      tokens: {
        root: {
          radius: 'radius.card',
          background: { primary: { default: 'color.bg.fill.inverse', vivid: 'color.bg.fill.inverse-media' } },
          pressed: { background: { primary: 'color.bg.fill.accent' } },
        },
      },
      motion: { press: 'motion.spring.snappy', reduceMotion: 'crossfade' },
    });
    expect(problems).toEqual([]);
    expect(parts.map((p) => p.name)).toEqual(['root']);
    expect(bindings.map((b) => `${b.block}:${b.path}`)).toEqual([
      'tokens:radius.card',
      'tokens:color.bg.fill.inverse',
      'tokens:color.bg.fill.inverse-media',
      'tokens:color.bg.fill.accent',
      'motion:motion.spring.snappy',
    ]);
  });

  test('a key on no axis, a mixed matrix and a state inside a state block are reported', () => {
    const mixed = walkBindings({ ...spec, tokens: { root: { color: { primary: 'color.text.primary', vivid: 'color.text.on-vivid' } } } });
    expect(mixed.problems.map((p) => p.message)).toEqual(['the matrix keys come from more than one axis: primary (prop variant), vivid (material/backdrop)']);

    const unknown = walkBindings({ ...spec, tokens: { root: { focus: { ring: 'color.border.focus' } } } });
    expect(unknown.problems[0]?.message).toContain('"ring" is not a matrix key');

    const nested = walkBindings({ ...spec, tokens: { root: { pressed: { 'focus-visible': { ring: 'color.border.focus' } } } } });
    expect(nested.problems[0]?.message).toContain('a state block holds no states');
  });

  test('a variant without a cell is no fill, not an inherited one', () => {
    const { bindings, problems } = walkBindings({ ...spec, tokens: { root: { background: { primary: 'color.bg.fill.inverse' } } } });
    expect(problems).toEqual([]);
    expect(bindings.map((b) => b.path)).toEqual(['color.bg.fill.inverse']);
  });

  test('a kebab-case comp group comes from the spec name', () => {
    expect(compGroup('Button')).toBe('button');
    expect(compGroup('StatTile')).toBe('stat-tile');
    expect(compGroup('RingGauge')).toBe('ring-gauge');
  });
});

describe('prose paths', () => {
  const categories = new Set(['color', 'motion', 'opacity', 'radius', 'size', 'type']);

  test('punctuation around a word is not part of the path', () => {
    expect(bareWord('`opacity.disabled`,')).toBe('opacity.disabled');
    expect(bareWord('size.hit.')).toBe('size.hit');
    expect(bareWord('(color.text.primary)')).toBe('color.text.primary');
  });

  test('a token path starts at a tier or a sys category', () => {
    expect(isTokenPath('color.text.primary', categories)).toBe(true);
    expect(isTokenPath('type.label.*', categories)).toBe(true);
    expect(isTokenPath('ref.color.neutral.0', categories)).toBe(true);
    expect(isTokenPath('comp.button.gap', categories)).toBe(true);
    // Not paths: a component name, a file, an alias, a number, a version.
    expect(isTokenPath('surface.vivid', categories)).toBe(false);
    expect(isTokenPath('docs/research/visual-dna.md', categories)).toBe(false);
    expect(isTokenPath('motion.css', categories)).toBe(false);
    expect(isTokenPath('{color.text.primary}', categories)).toBe(false);
    expect(isTokenPath('0.97', categories)).toBe(false);
    expect(isTokenPath('e.g', categories)).toBe(false);
    expect(isTokenPath('comp.button', categories)).toBe(false);
  });

  test('alternations and ranges expand', () => {
    expect(expandPath('motion.spring|duration.base')).toEqual(['motion.spring.base', 'motion.duration.base']);
    expect(expandPath('elevation.0…2')).toEqual(['elevation.0', 'elevation.1', 'elevation.2']);
  });

  test('only behavior, accessibility, usage and notes are read', () => {
    const hits = proseTokenPaths(
      {
        summary: 'binds color.text.dimmed',
        behavior: ['The label takes color.text.primary.'],
        accessibility: { reduceMotion: 'a dip to opacity.disabled' },
        usage: { do: ['Use radius.card.'], dont: [] },
        notes: { design: 'see docs/research/visual-dna.md' },
      },
      categories,
    );
    expect(hits.map((h) => h.text)).toEqual(['color.text.primary', 'opacity.disabled', 'radius.card']);
    expect(hits[0]?.at).toEqual(['behavior', 0]);
  });
});

describe('loading and schema helpers', () => {
  test('a line number points at the value', () => {
    const doc = loadSpec('x.yaml', 'name: Sample\ntokens:\n  root:\n    radius: radius.card\n');
    expect(doc.problems).toEqual([]);
    expect(doc.lineOf(['tokens', 'root', 'radius'])).toBe(4);
    expect(doc.lineOf(['nope'])).toBe(1);
  });

  test('a duplicate key is a parse problem', () => {
    const doc = loadSpec('x.yaml', 'name: Sample\nname: Other\n');
    expect(doc.problems.length).toBeGreaterThan(0);
    expect(doc.value).toBeNull();
  });

  test('a document that is not a mapping is a parse problem', () => {
    expect(loadSpec('x.yaml', '- one\n- two\n').problems[0]?.message).toBe('the document is not a mapping');
  });

  test('a JSON pointer becomes a JSON path', () => {
    expect(pointerToPath('')).toEqual([]);
    expect(pointerToPath('/tokens/root/background')).toEqual(['tokens', 'root', 'background']);
    expect(pointerToPath('/examples/2/props')).toEqual(['examples', 2, 'props']);
  });

  test('a token-path regex of another shape is refused', () => {
    const schema = JSON.stringify({ $defs: { tokenPath: { pattern: '^[a-z.]+$' } } });
    expect(() => bindableCategories(schema, 'x.json')).toThrow(SchemaShapeError);
  });
});
