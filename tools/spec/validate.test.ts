// spec:validate (roadmap P2-1): the repository's specs validate, every fixture fails with exactly the
// diagnostic it declares, and the grammar helpers behave on their own.
import { beforeAll, describe, expect, test } from 'vitest';
import { fsReader, memoryReader, overlayReader, REPO_ROOT, type Diagnostic, type IRBundle, type SourceReader } from '../tokens/api.ts';
import { axesOf, statesOf, walkBindings } from './bindings.ts';
import {
  BOOLEAN_NAMES_OWED, compGroup, GLASS_CHIP_FALLBACK_EXCEPTIONS, IMAGE_FIXTURES, MATERIAL_PUBLISHERS, MATERIALS_OWED, MATERIALS_SETTLED,
  NON_BINDABLE,
} from './config.ts';
import { loadSpec } from './load.ts';
import { bareWord, expandPath, isTokenPath, PATTERN_PROSE_FIELDS, proseTokenPaths } from './prose.ts';
import { bindableCategories, pointerToPath, SchemaShapeError } from './schema.ts';
import { caseReader, FIXTURES, repoDictionary, specCases, triples } from './test-support.ts';
import { booleanNameProblem, main, passed, runSpecValidate, unevenMaterials } from './validate.ts';

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

  test('fixtures in examples are the ones spec/SCHEMA.md documents, the image fixture only as an image source', () => {
    // spec/SCHEMA.md, "Slot content in examples": six fixtures fill a slot or a data prop, and `portrait` alone fills
    // a `string` prop that is an image's source (roadmap P4-7), written straight under that prop.
    const slot = new Set(['text', 'list', 'form', 'readout', 'buttonRow', 'pager']);
    const image = new Set(IMAGE_FIXTURES);
    const problems: string[] = [];
    let fixtures = 0;
    let images = 0;
    const walk = (v: unknown, where: string): void => {
      if (Array.isArray(v)) {
        v.forEach((item) => walk(item, where));
        return;
      }
      if (typeof v !== 'object' || v === null) return;
      const record = v as Record<string, unknown>;
      if ('fixture' in record) {
        fixtures++;
        const name = record['fixture'];
        if (typeof name !== 'string' || !(slot.has(name) || image.has(name))) problems.push(`${where}: fixture ${JSON.stringify(name)}`);
      }
      for (const child of Object.values(record)) walk(child, where);
    };
    for (const { path, value } of specs) {
      const types = new Map(records(value['props']).map((p) => [p['name'], p['type']]));
      for (const example of records(value['examples'])) {
        const where = `${path} ${String(example['id'])}`;
        walk(example['props'], where);
        for (const [prop, given] of Object.entries(records([example['props']])[0] ?? {})) {
          const name = typeof given === 'object' && given !== null && !Array.isArray(given) ? (given as Record<string, unknown>)['fixture'] : undefined;
          if (typeof name !== 'string' || !image.has(name)) continue;
          images++;
          if (types.get(prop) !== 'string') problems.push(`${where}: the image fixture \`${name}\` fills \`${prop}\`, which is not a string prop`);
        }
      }
    }
    expect(problems).toEqual([]);
    expect(fixtures).toBeGreaterThan(0);
    // Avatar's portraits, so the image half is not vacuous.
    expect(images).toBeGreaterThan(0);
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
      'example/prop',
      'example/tinted-scheme',
      'example/vivid-grid',
      'example/vivid-icon',
      'example/vivid-unit',
      'glass-chip/fallback',
      'glass-chip/nested-blur',
      'haptic/unknown',
      'material/uneven',
      'matrix/axis',
      'prop/boolean-name',
      'prose/unknown',
      'spec/file-name',
      'spec/no-schema',
      'spec/parse',
      'spec/schema',
      'spec/unknown-part',
      'strings/placeholder',
      'strings/unknown',
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

describe('the glass chip rules (ADR-0036 §10)', () => {
  // Each fixture breaks its rule in every way the rule can be broken, one way per part, so every branch of the
  // check is pinned here by its line and message, not only by the code the fixture block compares.
  const diagnose = async (name: string): Promise<readonly Diagnostic[]> => {
    const c = specCases().find((x) => x.name === name);
    if (c === undefined) throw new Error(`no fixture ${name}`);
    return (await runSpecValidate({ reader: caseReader(c), collected: await repoDictionary() })).diagnostics;
  };
  const run = async (name: string): Promise<string[]> => (await diagnose(name)).map((d) => `${d.line ?? 0} ${d.code} ${d.message}`);

  test('glass-chip/fallback: a cell missing, keyed apart from the background, keyed by the ground or of the wrong token, and prose without both settings', async () => {
    expect(await run('glass-chip-fallback')).toEqual([
      '46 glass-chip/fallback `tokens.root.background` binds material.glass.chip, and the part states no `fallbackBackground`',
      '59 glass-chip/fallback `tokens.track.fallbackBackground` answers whatever the props, and `background` binds the chip only under `floating`',
      '61 glass-chip/fallback `tokens.track.fallbackUnderlay` is keyed by the ground (`page`), and the chip falls back the same way on every ground',
      // TopBar's scroll edge, cell for cell, on a part that is not TopBar's: the exception names a part, not a shape.
      '67 glass-chip/fallback `tokens.scrollEdge.background` binds material.glass.chip, and the part states no `fallbackUnderlay`',
      "70 glass-chip/fallback `tokens.scrollEdge.fallbackBackground.soft` binds `color.bg.page`, and the chip's `fallbackBackground` is color.bg.surface.raised",
      "71 glass-chip/fallback `tokens.scrollEdge.fallbackBackground.hard` binds `color.bg.page`, and the chip's `fallbackBackground` is color.bg.surface.raised",
      '92 glass-chip/fallback `tokens.root` binds material.glass.chip as its background, and `accessibility.reduceTransparency` does not name Increase Contrast',
    ]);
  }, 60_000);

  test('glass-chip/fallback in state blocks: the chip bound only in a state, and fallback cells a state rebinds', async () => {
    const diagnostics = await diagnose('glass-chip-fallback-states');
    expect(diagnostics.map((d) => `${d.line ?? 0} ${d.code} ${d.message}`)).toEqual([
      // `field` binds the chip only in `readonly`, so a state block alone holds the part to the rule.
      '47 glass-chip/fallback `tokens.field.readonly.background` binds material.glass.chip, and the part states no `fallbackUnderlay`',
      // A cell missing on the part stops nothing: the state cells are still read, and `readonly` binds the wrong token.
      "51 glass-chip/fallback `tokens.field.readonly.fallbackUnderlay` binds `color.bg.surface`, and the chip's `fallbackUnderlay` is color.bg.page",
      // `pill` and `track` bind the right cells on the part, and a state rebinds one with the wrong token (in a
      // matrix, on `track`), by the ground, or keyed apart from the background. `pill.selected` restates both cells as
      // the part binds them, and is not reported.
      "62 glass-chip/fallback `tokens.pill.pressed.fallbackBackground` binds `color.bg.fill.neutral.subtle`, and the chip's `fallbackBackground` is color.bg.surface.raised",
      '68 glass-chip/fallback `tokens.pill.readonly.fallbackUnderlay` is keyed by the ground (`page`), and the chip falls back the same way on every ground',
      "84 glass-chip/fallback `tokens.track.pressed.fallbackUnderlay.floating` binds `color.bg.surface`, and the chip's `fallbackUnderlay` is color.bg.page",
      '86 glass-chip/fallback `tokens.track.selected.fallbackBackground` answers whatever the props, and `background` binds the chip only under `floating`',
      // `strip` binds the chip under `floating` on the part and under `inline` in `readonly`, so its fallback is keyed
      // by both: `fallbackBackground` is, `fallbackUnderlay` is not.
      '96 glass-chip/fallback `tokens.strip.fallbackUnderlay` is keyed under `floating`, and `background` binds the chip only under `floating`, `inline`',
      // The prose rule names the first part held, and that is `field`, whose chip only a state binds.
      '122 glass-chip/fallback `tokens.field` binds material.glass.chip as its background, and `accessibility.reduceTransparency` does not name Reduce Transparency',
    ]);
    // A state that binds no fallback keeps the part's, so the fix for a state's cell is to delete it, and only a
    // state's cell is told so; where the part states none, its own diagnostic says to bind it there.
    expect(diagnostics.flatMap((d) => (d.hint?.startsWith('delete ') === true ? [`${d.line ?? 0} ${d.hint.split(':')[0] ?? ''}`] : []))).toEqual([
      '51 delete `readonly.fallbackUnderlay`',
      '62 delete `pressed.fallbackBackground`',
      '68 delete `readonly.fallbackUnderlay`',
      '84 delete `pressed.fallbackUnderlay`',
      '86 delete `selected.fallbackBackground`',
    ]);
  }, 60_000);

  test("glass-chip/fallback: a part's cell that binds nothing is the schema's to report, and the state cells after it are still read", async () => {
    const c = specCases().find((x) => x.name === 'glass-chip-fallback-states');
    if (c === undefined) throw new Error('no fixture glass-chip-fallback-states');
    const path = 'spec/components/Sample.yaml';
    const fixture = caseReader(c);
    // `pill` states its fallbackBackground as `{}`, which binds nothing, and its `pressed` block then rebinds the cell
    // with the wrong token.
    const cell = '    fallbackBackground: color.bg.surface.raised\n    fallbackUnderlay: color.bg.page\n    radius: radius.control\n    pressed:\n';
    const text = fixture.readText(path).replace(cell, cell.replace('color.bg.surface.raised', '{}'));
    expect(text).not.toBe(fixture.readText(path));
    const empty = (await runSpecValidate({ reader: overlayReader(fixture, memoryReader({ [path]: text })), collected: await repoDictionary() })).diagnostics;
    const chip = (diagnostics: readonly Diagnostic[]): string[] => diagnostics.filter((d) => d.code === 'glass-chip/fallback').map((d) => `${d.line ?? 0} ${d.message}`);
    expect([...new Set(empty.filter((d) => d.code !== 'glass-chip/fallback').map((d) => `${d.line ?? 0} ${d.code}`))]).toEqual(['58 spec/schema']);
    // The chip check reports what it reports on the fixture as written, the state's wrong token included.
    expect(chip(empty)).toEqual(chip(await diagnose('glass-chip-fallback-states')));
    expect(chip(empty)).toContain("62 `tokens.pill.pressed.fallbackBackground` binds `color.bg.fill.neutral.subtle`, and the chip's `fallbackBackground` is color.bg.surface.raised");
  }, 60_000);

  test("glass-chip/nested-blur: the recipe's blur under `glass` and its saturation under `glassLight`, on the part and in a state block, and nothing else", async () => {
    expect(await run('glass-chip-nested-blur')).toEqual([
      '45 glass-chip/nested-blur `tokens.root.blur.glass` binds material.glass.chip.blur under `glass`',
      '49 glass-chip/nested-blur `tokens.root.saturate.glassLight` binds material.glass.chip.saturate under `glassLight`',
      // A state block's cells are read as the part's are: the blur under `glass` in `pressed` is reported, and the
      // same blur over a map beside it is not.
      '57 glass-chip/nested-blur `tokens.root.pressed.blur.glass` binds material.glass.chip.blur under `glass`',
    ]);
  }, 60_000);

  test("TopBar's scroll edge is the one named exception, and it still excepts something (P4-D10)", () => {
    expect(GLASS_CHIP_FALLBACK_EXCEPTIONS).toEqual([{ component: 'TopBar', part: 'scrollEdge', ticket: 'P4-D10' }]);
    // The exception is recorded, not decided (ADR-0036 §9.5). The day TopBar's ticket settles P4-D10 these cells
    // change, and the entry above goes with them rather than excepting a part that no longer needs it.
    const path = 'spec/components/TopBar.yaml';
    const tokens = loadSpec(path, fsReader(REPO_ROOT).readText(path)).value?.['tokens'] as Record<string, Record<string, unknown>> | undefined;
    const scrollEdge = tokens?.['scrollEdge'] ?? {};
    expect(scrollEdge['background']).toEqual({ soft: 'material.glass.chip', hard: 'material.glass.chip' });
    expect(scrollEdge['fallbackBackground']).toEqual({ soft: 'color.bg.page', hard: 'color.bg.page' });
    expect(scrollEdge['fallbackUnderlay']).toBeUndefined();
  });
});

describe('the materials a part keys (ADR-0040 §6)', () => {
  const diagnose = async (reader: SourceReader): Promise<string[]> =>
    (await runSpecValidate({ reader, collected: await repoDictionary() })).diagnostics.map((d) => `${d.line ?? 0} ${d.code} ${d.message}`);
  const bundle = async (): Promise<IRBundle> => {
    const collected = (await repoDictionary()).bundle;
    if (collected === null) throw new Error('the repository dictionary did not build');
    return collected;
  };
  const load = (path: string, text: string): Record<string, unknown> => loadSpec(path, text).value ?? {};

  test('material/uneven: each material keyed by one part, one only in a state block, and a statement that names one of two parts', async () => {
    const c = specCases().find((x) => x.name === 'material-uneven');
    if (c === undefined) throw new Error('no fixture material-uneven');
    expect(await diagnose(caseReader(c))).toEqual([
      // `mark` keys light glass only in its `selected` block: a state's colours are the part's, and are read.
      '41 material/uneven `mark` keys `glassLight`, and `materials.glassLight` does not name `root`, `label`',
      // `mark` keys the `accent` value of its `tone` prop, which is a prop and not the material, and `icon` binds no
      // colour, so it is held to nothing.
      '46 material/uneven `root` keys `inverse`, and `materials.inverse` does not name `label`, `mark`',
      // A statement is read part by part: it names `root` and not `mark`, and the diagnostic points at it.
      '64 material/uneven `label` keys `accent`, and `materials.accent` does not name `mark`',
    ]);
  }, 60_000);

  test('a settled spec is held on every part: Spinner without its light-glass cell fails, and passes once it states the absence', async () => {
    const path = 'spec/components/Spinner.yaml';
    const repo = fsReader(REPO_ROOT);
    const cell = '      glassLight: color.text.on-glass-light\n';
    const text = repo.readText(path);
    expect(text).toContain(cell);
    expect(MATERIALS_SETTLED).toContain('Spinner');
    const without = text.replace(cell, '');
    // A diagnostic about a part points at its value: the line after `arc:`, where its first property starts.
    const arc = without.split('\n').indexOf('  arc:') + 2;
    expect(await diagnose(overlayReader(repo, memoryReader({ [path]: without })))).toEqual([
      `${arc} material/uneven no colour-bearing part keys \`glassLight\`, and \`materials.glassLight\` does not name \`arc\``,
    ]);
    // Keyed on no part, the material is a decision only a settled spec is asked to state.
    expect(unevenMaterials(load(path, without), await bundle(), false)).toEqual([]);
    expect(unevenMaterials(load(path, without), await bundle(), true)).toEqual([{ material: 'glassLight', keyed: [], unnamed: ['arc'] }]);
    expect(without).not.toContain('\nmaterials:');
    const stated = without.replace('\nbehavior:\n', '\nmaterials:\n  glassLight: "`arc` is not drawn on light glass, in this test only."\n\nbehavior:\n');
    expect(await diagnose(overlayReader(repo, memoryReader({ [path]: stated })))).toEqual([]);
  }, 60_000);

  test('the owed specs only shrink: each is a component spec that still keys a material unevenly, and none is settled', async () => {
    const repo = fsReader(REPO_ROOT);
    const owed = MATERIALS_OWED.map((o) => o.component);
    expect(new Set(owed).size).toBe(owed.length);
    expect(new Set(MATERIALS_SETTLED).size).toBe(MATERIALS_SETTLED.length);
    expect(owed.filter((name) => MATERIALS_SETTLED.includes(name) || MATERIAL_PUBLISHERS.includes(name))).toEqual([]);
    for (const name of [...MATERIALS_SETTLED, ...MATERIAL_PUBLISHERS]) expect(repo.exists(`spec/components/${name}.yaml`), name).toBe(true);
    const problems: string[] = [];
    for (const { component, owner } of MATERIALS_OWED) {
      const path = `spec/components/${component}.yaml`;
      if (!repo.exists(path)) problems.push(`${component} has no spec: remove it from MATERIALS_OWED`);
      else if (unevenMaterials(load(path, repo.readText(path)), await bundle(), false).length === 0) {
        problems.push(`${component} keys its materials evenly now (${owner}): remove it from MATERIALS_OWED, or move it to MATERIALS_SETTLED`);
      }
    }
    expect(problems).toEqual([]);
  }, 60_000);
});

describe('the example, naming and label-key rules (roadmap P4-D3 (3))', () => {
  // Each fixture breaks its rule every way it can be broken, one way per example or prop, beside the forms the rule
  // lets through, so every branch is pinned by its line and message.
  const diagnose = async (name: string, remove: readonly string[] = []): Promise<readonly Diagnostic[]> => {
    const c = specCases().find((x) => x.name === name);
    if (c === undefined) throw new Error(`no fixture ${name}`);
    const reader = remove.length === 0 ? caseReader(c) : overlayReader(fsReader(REPO_ROOT), fsReader(`${FIXTURES}${c.name}`), remove);
    return (await runSpecValidate({ reader, collected: await repoDictionary() })).diagnostics;
  };
  const run = async (name: string, remove: readonly string[] = []): Promise<string[]> =>
    (await diagnose(name, remove)).map((d) => `${d.line ?? 0} ${d.code} ${d.message}`);

  test('example/prop: a prop the spec does not declare, and a value of the wrong type for each closed type; slot and action values are not read', async () => {
    expect(await run('example-prop')).toEqual([
      '106 example/prop example `undeclared` sets `tone`, which Sample does not declare',
      // A list sets a multi-value enum, and each of its items is read.
      '108 example/prop example `enum-value`: `Sample.size` has no value `lg` (sm, md)',
      '108 example/prop example `enum-value`: `Sample.variant` has no value `frosted` (solid, glass)',
      '110 example/prop example `boolean-value`: `Sample.isOn` is a boolean, not "yes"',
      '112 example/prop example `number-value`: `Sample.count` is a number, not "12"',
      '114 example/prop example `string-value`: `Sample.label` is a string, not 24',
      // An icon is an id of the registry: a name that reads like one is not, and neither is a mapping, which is how an
      // Avatar would be written into an icon slot.
      '116 example/prop example `icon-value`: `Sample.icon` is an icon of spec/icons/registry.json, not "avatar.sm"',
      '118 example/prop example `icon-mapping`: `Sample.icon` is an icon of spec/icons/registry.json, not {"avatar":{"size":"sm"}}',
      // A string takes spec/SCHEMA.md's image fixture (`image-fixture`, line 120, passes), written as SCHEMA writes it: a
      // fixture SCHEMA does not document is not one, and neither is the portrait with a parameter it does not take.
      '123 example/prop example `image-fixture-unknown`: `Sample.label` is a string, not {"fixture":"headshot"}',
      '125 example/prop example `image-fixture-parameters`: `Sample.label` is a string, not {"fixture":"portrait","size":"sm"}',
      // A pattern's examples are read against the pattern's own props.
      '92 example/prop example `fixed-columns` sets `columns`, which SamplePattern does not declare',
    ]);
  }, 60_000);

  test('composition/prop reads a value it fixes the way example/prop reads an example: an icon and a string are held too', async () => {
    expect((await run('composition-prop')).filter((d) => d.includes('`Card.action'))).toEqual([
      '58 composition/prop `Card.actionIcon` is an icon of spec/icons/registry.json, not "avatar.sm"',
      '58 composition/prop `Card.actionLabel` is a string, not 24',
    ]);
  }, 60_000);

  test("Chip's md-with-avatar carries its Avatar through the `avatar` slot P4-8 declared, and the check holds it to that prop", async () => {
    // P4-8 settled its defect (1) by giving the leading position a prop that carries the Avatar, a `slot` whose
    // anatomy names Avatar (Chip.yaml `avatar`, as ADR-0034 types a Badge slot). The example writes the Avatar there,
    // and the two ways of writing it in without that prop still fail: into `leadingIcon`, and into a prop Chip does not
    // declare. Without the declaration the example fails too, so the prop is what licenses it.
    const path = 'spec/components/Chip.yaml';
    const repo = fsReader(REPO_ROOT);
    const text = repo.readText(path);
    const props = 'props: { label: "Anna Petrova", size: md, avatar: { name: "Anna Petrova" } }';
    expect(text).toContain(`- id: md-with-avatar\n    ${props}`);
    const start = text.indexOf('  - name: avatar\n    type: slot\n');
    const end = text.indexOf('  - name: trailingIcon\n');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const written = async (changed: string): Promise<string[]> => {
      const reader = overlayReader(repo, memoryReader({ [path]: changed }));
      return (await runSpecValidate({ reader, collected: await repoDictionary() })).diagnostics.map((d) => `${d.code} ${d.message}`);
    };
    expect(await written(text)).toEqual([]);
    // Into `leadingIcon`, which is `type: icon`.
    expect(await written(text.replace(props, 'props: { label: "Anna Petrova", size: md, leadingIcon: { name: "Anna Petrova" } }'))).toEqual([
      'example/prop example `md-with-avatar`: `Chip.leadingIcon` is an icon of spec/icons/registry.json, not {"name":"Anna Petrova"}',
    ]);
    // Into a prop Chip does not declare.
    expect(await written(text.replace(props, 'props: { label: "Anna Petrova", size: md, leadingAvatar: { name: "Anna Petrova" } }'))).toEqual([
      'example/prop example `md-with-avatar` sets `leadingAvatar`, which Chip does not declare',
    ]);
    // The example as written, with the slot's declaration taken out of `props`.
    expect(await written(text.slice(0, start) + text.slice(end))).toEqual([
      'example/prop example `md-with-avatar` sets `avatar`, which Chip does not declare',
    ]);
  }, 60_000);

  test('prop/boolean-name: the imperative `show`, a bare adjective, a noun that ends in -s and two negations; the four verbs, and a non-boolean, pass', async () => {
    const diagnostics = await diagnose('prop-boolean-name');
    expect(diagnostics.map((d) => `${d.line ?? 0} ${d.code} ${d.message}`)).toEqual([
      "46 prop/boolean-name boolean prop `showValue` opens with the imperative `show`, and the rule's verb is `shows`: a name is a statement about the component, never an instruction",
      // A bare adjective: HeroNumber's, StatCard's and StatTile's `live` became `isLive` (P4-11).
      '49 prop/boolean-name boolean prop `live` is not a verb of the rule (`is…`, `has…`, `shows…`, `clamps…`, `grows…`, `delays…`) followed by what it says, so it does not state what is true of the component',
      // The verbs are a closed list, because a noun can end in -s too.
      '52 prop/boolean-name boolean prop `focusRing` is not a verb of the rule (`is…`, `has…`, `shows…`, `clamps…`, `grows…`, `delays…`) followed by what it says, so it does not state what is true of the component',
      '55 prop/boolean-name boolean prop `isNotReady` states a negation (`Not`)',
      '58 prop/boolean-name boolean prop `hasNoBorder` states a negation (`No`)',
      // A pattern's props are held to the rule as a component's are: a bare noun for a region it draws.
      '35 prop/boolean-name boolean prop `sidebar` is not a verb of the rule (`is…`, `has…`, `shows…`, `clamps…`, `grows…`, `delays…`) followed by what it says, so it does not state what is true of the component',
    ]);
    expect(diagnostics[0]?.hint).toBe('rename it `showsValue` (spec/SCHEMA.md, "One meaning, one name, one polarity")');
  }, 60_000);

  test('the owed boolean names only shrink: each is one the pass recorded, and each still names a boolean the rule rejects', () => {
    // The twenty-nine the spec-consistency pass of 2026-09-22 recorded (roadmap P4-D3 (1)), as it recorded them.
    // BOOLEAN_NAMES_OWED is what is left of them: it loses a name in the change that renames the prop, and gains none.
    const recorded = [
      'ProgressBar.showValue', 'ProgressRing.showValue', 'Slider.showValue', 'DeltaBadge.showIcon', 'Pagination.showPageNumbers',
      'HeroNumber.live', 'StatCard.live', 'StatTile.live', 'LineChart.scrollable', 'Skeleton.animated',
      'AreaChart.grid', 'LineChart.grid', 'ListRow.leader', 'RangeBand.bookends', 'Slider.ticks', 'Sparkline.extremes', 'Table.stickyHeader',
      'RingGauge.clampOverflow', 'TextArea.autoGrow', 'Spinner.delay',
      'AdaptiveShell.topBar', 'AdaptiveShell.commandPalette', 'DashboardGrid.tileGroup', 'DashboardGrid.band',
      'DetailScreen.readout', 'DetailScreen.actionBar', 'DetailScreen.hero', 'AdaptiveShell.sidebarCollapsed',
      'Surface.selected',
    ];
    expect(recorded).toHaveLength(29);
    const reader = fsReader(REPO_ROOT);
    const types = new Map<string, unknown>();
    for (const dir of ['spec/components', 'spec/patterns']) {
      for (const entry of reader.list(dir).filter((e) => !e.dir && e.name.endsWith('.yaml'))) {
        const path = `${dir}/${entry.name}`;
        const value = loadSpec(path, reader.readText(path)).value ?? {};
        for (const prop of Array.isArray(value['props']) ? (value['props'] as unknown[]) : []) {
          if (typeof prop === 'object' && prop !== null && 'name' in prop && 'type' in prop) types.set(`${String(value['name'])}.${String(prop.name)}`, prop.type);
        }
      }
    }
    const problems: string[] = [];
    for (const owed of BOOLEAN_NAMES_OWED) {
      const prop = owed.split('.')[1] ?? '';
      if (!recorded.includes(owed)) problems.push(`${owed} is no name P4-D3 recorded: a new prop follows the rule and never joins the list`);
      if (!types.has(owed)) problems.push(`${owed} names no prop: it was renamed, so remove it from BOOLEAN_NAMES_OWED`);
      else if (types.get(owed) !== 'boolean') problems.push(`${owed} is no boolean now: remove it from BOOLEAN_NAMES_OWED`);
      else if (booleanNameProblem(prop) === null) problems.push(`${owed} holds the rule now: remove it from BOOLEAN_NAMES_OWED`);
    }
    expect(problems).toEqual([]);
    expect(new Set(BOOLEAN_NAMES_OWED).size).toBe(BOOLEAN_NAMES_OWED.length);
  });

  test('the naming rule reads the verb and the words after it, and nothing else', () => {
    for (const name of ['isSelected', 'isOn', 'isReadOnly', 'hasNext', 'showsClose', 'clampsOverflow', 'growsWithValue', 'delaysAppearance']) expect(booleanNameProblem(name), name).toBeNull();
    // A verb alone says nothing; an imperative, a modal, a verb outside the list and a noun that ends in -s are no
    // statement about the component.
    for (const name of ['is', 'shows', 'show', 'showValue', 'canDismiss', 'hidesClose', 'statusIcon', 'selected']) expect(booleanNameProblem(name), name).not.toBeNull();
    // A negation anywhere after the verb, and only a whole word: `Note` and `Notch` are not `No` or `Not`.
    expect(booleanNameProblem('isNonBlocking')?.message).toBe('states a negation (`Non`)');
    expect(booleanNameProblem('showsLabelNot')?.message).toBe('states a negation (`Not`)');
    expect(booleanNameProblem('hasNote')).toBeNull();
    expect(booleanNameProblem('hasNotch')).toBeNull();
  });

  test("prose/unknown: the registry's label keys, one by one, as an alternation and as a glob, are no token paths; a word there that is neither is reported", async () => {
    const diagnostics = await diagnose('prose-icon-label');
    expect(diagnostics.map((d) => `${d.line ?? 0} ${d.code} ${d.message}`)).toEqual([
      '59 prose/unknown prose names `icon.gauge.needle`, which resolves to no token and is no label key of spec/icons/registry.json',
      '59 prose/unknown prose names `icon.nav.bakc`, which resolves to no token and is no label key of spec/icons/registry.json',
    ]);
    // The fix names the nearest label keys beside the nearest tokens.
    expect(diagnostics.map((d) => (d.hint ?? '').split('?')[0])).toEqual([
      'name a token or a label key: `icon.` names a token of that category or the label key of an entry of spec/icons/registry.json',
      'did you mean `icon.nav.back`, `icon.nav.down`, `icon.nav.home`',
    ]);
    // Without the registry the same prose is read as token paths alone, and every label key is reported: the misreading
    // that let a key resolve to nothing in Icon.yaml (ADR-0032). `icon.weight` is a token either way.
    expect(await run('prose-icon-label', ['spec/icons/registry.json'])).toEqual([
      '57 prose/unknown prose names `icon.nav.back`, which resolves to no token',
      '58 prose/unknown prose names `icon.nav.*`, which resolves to no token',
      '58 prose/unknown prose names `icon.status.warning|danger`, which resolves to no token',
      '59 prose/unknown prose names `icon.gauge.needle`, which resolves to no token',
      '59 prose/unknown prose names `icon.nav.bakc`, which resolves to no token',
    ]);
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

  test('only behavior, accessibility, usage, notes and materials are read', () => {
    const hits = proseTokenPaths(
      {
        summary: 'binds color.text.dimmed',
        behavior: ['The label takes color.text.primary.'],
        accessibility: { reduceMotion: 'a dip to opacity.disabled' },
        usage: { do: ['Use radius.card.'], dont: [] },
        notes: { design: 'see docs/research/visual-dna.md' },
        materials: { inverse: '`track` is color.text.on-inverse there.' },
      },
      categories,
    );
    expect(hits.map((h) => h.text)).toEqual(['color.text.primary', 'opacity.disabled', 'radius.card', 'color.text.on-inverse']);
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
