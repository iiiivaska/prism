// spec:validate (roadmap P2-1): the repository's specs validate, every fixture fails with exactly the
// diagnostic it declares, and the grammar helpers behave on their own.
import { beforeAll, describe, expect, test } from 'vitest';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { axesOf, statesOf, walkBindings } from './bindings.ts';
import { compGroup, NON_BINDABLE } from './config.ts';
import { loadSpec } from './load.ts';
import { bareWord, expandPath, isTokenPath, PATTERN_PROSE_FIELDS, proseTokenPaths } from './prose.ts';
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
    // Every file under spec/components/, sorted, then every file under spec/patterns/: the ADR-0012
    // slice, the P2-5 wave-1 primitives and chart parts, the wave-2 composites and the three v1 patterns.
    expect(result.files).toEqual([
      'spec/components/Alert.yaml', 'spec/components/AreaChart.yaml', 'spec/components/Avatar.yaml',
      'spec/components/Badge.yaml', 'spec/components/Banner.yaml', 'spec/components/Button.yaml',
      'spec/components/Card.yaml', 'spec/components/ChartContainer.yaml', 'spec/components/Checkbox.yaml',
      'spec/components/Chip.yaml', 'spec/components/CommandPalette.yaml', 'spec/components/ContextMenu.yaml',
      'spec/components/DeltaBadge.yaml', 'spec/components/Dialog.yaml', 'spec/components/Divider.yaml',
      'spec/components/EmptyState.yaml', 'spec/components/FormField.yaml', 'spec/components/HeroNumber.yaml',
      'spec/components/Icon.yaml', 'spec/components/IconButton.yaml', 'spec/components/LineChart.yaml',
      'spec/components/ListRow.yaml', 'spec/components/Menu.yaml', 'spec/components/Pagination.yaml',
      'spec/components/PillTabs.yaml', 'spec/components/Popover.yaml', 'spec/components/ProgressBar.yaml',
      'spec/components/ProgressRing.yaml', 'spec/components/Radio.yaml', 'spec/components/RangeBand.yaml',
      'spec/components/ReferenceLine.yaml', 'spec/components/RingGauge.yaml', 'spec/components/SearchField.yaml',
      'spec/components/SegmentedControl.yaml', 'spec/components/Select.yaml', 'spec/components/Sheet.yaml',
      'spec/components/Sidebar.yaml', 'spec/components/Skeleton.yaml', 'spec/components/Slider.yaml',
      'spec/components/Sparkline.yaml', 'spec/components/Spinner.yaml', 'spec/components/StatCard.yaml',
      'spec/components/StatTile.yaml', 'spec/components/StatusPill.yaml', 'spec/components/Stepper.yaml',
      'spec/components/Surface.yaml', 'spec/components/TabBar.yaml', 'spec/components/Table.yaml',
      'spec/components/Text.yaml', 'spec/components/TextArea.yaml', 'spec/components/TextField.yaml',
      'spec/components/Timeline.yaml', 'spec/components/Toast.yaml', 'spec/components/Toggle.yaml',
      'spec/components/Toolbar.yaml', 'spec/components/Tooltip.yaml', 'spec/components/TopBar.yaml',
      'spec/patterns/AdaptiveShell.yaml', 'spec/patterns/DashboardGrid.yaml', 'spec/patterns/DetailScreen.yaml',
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
    expect(logged.join('\n')).toMatch(/^spec:validate: 60 specs, 0 diagnostic\(s\)/);
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

describe('the contract spec/SCHEMA.md states in prose', () => {
  const reader = fsReader(REPO_ROOT);
  const specs = reader
    .list('spec/components')
    .filter((e) => !e.dir && e.name.endsWith('.yaml'))
    .map((e) => {
      const path = `spec/components/${e.name}`;
      return { path, value: loadSpec(path, reader.readText(path)).value ?? {} };
    });
  const records = (v: unknown): Record<string, unknown>[] =>
    Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)) : [];

  test('every anatomy `parent` names a part listed before it', () => {
    const problems: string[] = [];
    let parents = 0;
    for (const { path, value } of specs) {
      const listed = new Set<string>();
      for (const part of records(value['anatomy'])) {
        const name = typeof part['part'] === 'string' ? part['part'] : '';
        const parent = part['parent'];
        if (typeof parent === 'string') {
          parents++;
          if (!listed.has(parent)) problems.push(`${path}: ${name} names parent ${parent}, which is not listed before it`);
        }
        listed.add(name);
      }
    }
    expect(problems).toEqual([]);
    // Dialog declares its tree (spec/SCHEMA.md, Anatomy), so the check is not vacuous.
    expect(parents).toBeGreaterThan(0);
  });

  test('a loading state is entered by `isLoading`, the one name Prism gives it', () => {
    const problems: string[] = [];
    for (const { path, value } of specs) {
      const props = records(value['props']);
      const states = Array.isArray(value['states']) ? value['states'] : [];
      const isLoading = props.find((p) => p['name'] === 'isLoading');
      if (states.includes('loading') && (isLoading === undefined || isLoading['type'] !== 'boolean')) problems.push(`${path}: \`loading\` has no boolean isLoading prop`);
      if (props.some((p) => p['name'] === 'isBusy')) problems.push(`${path}: isBusy is spelled isLoading`);
    }
    expect(problems).toEqual([]);
  });

  test('slot fixtures in examples are the ones spec/SCHEMA.md documents', () => {
    const documented = new Set(['text', 'list', 'form', 'readout', 'buttonRow', 'pager']);
    const problems: string[] = [];
    let fixtures = 0;
    const walk = (v: unknown, where: string): void => {
      if (Array.isArray(v)) {
        v.forEach((item) => walk(item, where));
        return;
      }
      if (typeof v !== 'object' || v === null) return;
      const record = v as Record<string, unknown>;
      if ('fixture' in record) {
        fixtures++;
        if (typeof record['fixture'] !== 'string' || !documented.has(record['fixture'])) problems.push(`${where}: fixture ${JSON.stringify(record['fixture'])}`);
      }
      for (const child of Object.values(record)) walk(child, where);
    };
    for (const { path, value } of specs) {
      for (const example of records(value['examples'])) walk(example['props'], `${path} ${String(example['id'])}`);
    }
    expect(problems).toEqual([]);
    expect(fixtures).toBeGreaterThan(0);
  });
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
      'composition/prop',
      'composition/unknown',
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

  test('a pattern also resolves the token paths of its layout, rules and composition', () => {
    const pattern = {
      behavior: ['The grid keeps its gaps.'],
      layout: { gap: 'size.card.min', columns: { compact: 1 } },
      rules: ['One hero at type.metric.xl.'],
      composition: [{ component: 'Card', where: 'a cell at radius.card' }],
    };
    expect(proseTokenPaths(pattern, categories)).toEqual([]);
    expect(proseTokenPaths(pattern, categories, PATTERN_PROSE_FIELDS).map((h) => h.text)).toEqual(['size.card.min', 'type.metric.xl', 'radius.card']);
    expect(proseTokenPaths(pattern, categories, PATTERN_PROSE_FIELDS)[0]?.at).toEqual(['layout', 'gap']);
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
