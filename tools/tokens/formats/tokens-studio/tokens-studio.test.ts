// The Tokens Studio flavor (ARCHITECTURE §9.9, §14 P1-5; ADR-0020 §3, ADR-0024 §11–§12, ADR-0026):
// set names and layout, `$themes.json` and `$metadata.json`, value encodings on an in-memory tree,
// and on the repository: every set a theme names exists, every alias resolves under every
// combination of one theme per group, theme objects satisfy `ThemeObject`, every translucent source
// color keeps its alpha (tints through the `studio.tokens` alpha modifier), `$root` becomes `default`
// and a colliding `default` sibling fails, and no color under `tokens/export/` is 8-digit hex.
// Style Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { TokenSetStatus, TokenTypes, type ThemeObject } from '@tokens-studio/types';
import { describe, expect, test } from 'vitest';
import { collectBundle, REPO_ROOT } from '../../ir/bundle.ts';
import { flavorPath } from '../../ir/naming.ts';
import type { IRToken, IRValue, TokenType } from '../../ir/types.ts';
import { loadModel } from '../../source/model.ts';
import { fsReader, memoryReader, type SourceReader } from '../../source/reader.ts';
import type { SourceModel } from '../../source/types.ts';
import { brokenCases, brokenReader, fixtureReader } from '../../test-support.ts';
import { fmt } from '../../transforms/format-number.ts';
import { bytesOf, renderAll, type FormatInput, type OutputFile } from '../index.ts';
import { renderTokensStudio, tokenFacts, TOKENS_STUDIO_ROOT } from '../tokens-studio.ts';
import { EXPORT_README_PATH } from './readme.ts';
import { METADATA_FILE, setNameOf, setPath, studioSets, studioThemes, THEME_MODIFIERS, THEMES_FILE, tokenSetOrder, type StudioTheme } from './sets.ts';
import { placeNode, tokenNodes, type JsonObject } from './tree.ts';
import { studioAlias, studioTypeOf, type TokenFacts } from './values.ts';

/** The comp set of tokens/prism.resolver.json, in resolver order: it resolves last, so it is the tail of every set order. */
const COMP_SETS = [
  'comp/area-chart', 'comp/avatar', 'comp/badge', 'comp/button', 'comp/card', 'comp/checkbox', 'comp/chip',
  'comp/dialog', 'comp/icon-button', 'comp/list-row', 'comp/pagination', 'comp/pill-tabs', 'comp/progress-bar',
  'comp/progress-ring', 'comp/radio', 'comp/ring-gauge', 'comp/segmented-control', 'comp/select', 'comp/sheet',
  'comp/sidebar', 'comp/skeleton', 'comp/slider', 'comp/sparkline', 'comp/spinner', 'comp/table',
  'comp/text-area', 'comp/text-field', 'comp/timeline', 'comp/toggle', 'comp/tooltip', 'comp/top-bar',
] as const;

async function inputOf(reader: SourceReader, root: string): Promise<FormatInput> {
  const r = await collectBundle({ root, reader });
  if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('\n'));
  return { bundle: r.bundle, model: r.model, root, reader };
}

let repo: Promise<FormatInput> | null = null;
function repoInput(): Promise<FormatInput> {
  repo ??= inputOf(fsReader(REPO_ROOT), REPO_ROOT);
  return repo;
}

function parsed(files: readonly OutputFile[]): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const f of files) if (f.path.endsWith('.json')) out.set(f.path, JSON.parse(new TextDecoder().decode(bytesOf(f))) as unknown);
  return out;
}

/** Every `{…}` reference inside a value (whole strings, typography fields, shadow layers, gradient strings). */
function refsIn(v: unknown): string[] {
  if (typeof v === 'string') return [...v.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1] ?? '');
  if (Array.isArray(v)) return v.flatMap(refsIn);
  if (v !== null && typeof v === 'object') return Object.values(v).flatMap(refsIn);
  return [];
}

function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v !== null && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => [k, ...strings(x)]);
  return [];
}

function cartesian<T>(lists: readonly (readonly T[])[]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((x) => [...prefix, x])), [[]]);
}

/** Resolves every alias of the flavor under every combination of one theme per group; returns the failures. */
function unresolved(files: ReadonlyMap<string, unknown>): { combinations: number; failures: string[] } {
  const themes = files.get(`${TOKENS_STUDIO_ROOT}/${THEMES_FILE}`) as StudioTheme[];
  const order = (files.get(`${TOKENS_STUDIO_ROOT}/${METADATA_FILE}`) as { tokenSetOrder: string[] }).tokenSetOrder;
  const groups = new Map<string, StudioTheme[]>();
  for (const t of themes) groups.set(t.group, [...(groups.get(t.group) ?? []), t]);
  const combos = cartesian([...groups.values()]);
  const failures: string[] = [];
  for (const combo of combos) {
    const enabled = new Set(combo.flatMap((t) => Object.keys(t.selectedTokenSets)));
    const merged = new Map<string, JsonObject>();
    for (const name of order) {
      if (!enabled.has(name)) continue;
      const set = files.get(setPath(name)) as JsonObject | undefined;
      if (set === undefined) failures.push(`set ${name} has no file`);
      for (const { path, node } of tokenNodes(set ?? {})) merged.set(path, node);
    }
    for (const [path, node] of merged) {
      for (const ref of refsIn(node['$value'])) if (!merged.has(ref)) failures.push(`${combo.map((t) => t.id).join(' + ')}: ${path} → {${ref}}`);
    }
  }
  return { combinations: combos.length, failures };
}

describe('names and layout', () => {
  test('a set is the document path under tokens/ without .tokens.json; brand files are brands/<name>', () => {
    expect(setNameOf('tokens/ref/color.palette.tokens.json')).toBe('ref/color.palette');
    expect(setNameOf('tokens/sys/color/dark-increased-contrast.tokens.json')).toBe('sys/color/dark-increased-contrast');
    expect(setNameOf('brands/prism-native/brand.tokens.json')).toBe('brands/prism-native');
    expect(setNameOf('inline:base#2')).toBe('inline/base/2');
    expect(setNameOf('inline:colorScheme.light#0')).toBe('inline/colorScheme/light/0');
    expect(setPath('sys/base')).toBe('tokens/export/tokens-studio/sys/base.json');
  });

  test('aliases follow the flavor path: sys. dropped, $root → default', () => {
    expect(studioAlias('sys.color.bg.surface.$root')).toBe('{color.bg.surface.default}');
    expect(studioAlias('ref.color.neutral.0')).toBe('{ref.color.neutral.0}');
    expect(studioAlias('comp.button.radius')).toBe('{comp.button.radius}');
  });

  test('placing never overwrites: a taken path and a path through a token are collisions', () => {
    const root: JsonObject = {};
    expect(placeNode(root, ['color', 'bg', 'surface', 'default'], { $value: 'a' })).toBeNull();
    expect(placeNode(root, ['color', 'bg', 'surface', 'default'], { $value: 'b' })).toBe('color.bg.surface.default');
    expect(placeNode(root, ['color', 'bg', 'surface', 'default', 'x'], { $value: 'c' })).toBe('color.bg.surface.default');
    expect(placeNode(root, ['color', 'bg'], { $value: 'd' })).toBe('color.bg');
    expect(tokenNodes(root)).toEqual([{ path: 'color.bg.surface.default', node: { $value: 'a' } }]);
  });
});

// ---- an in-memory tree: every value form, parsed by the source model (no resolution) ----

const px = (value: number): { value: number; unit: string } => ({ value, unit: 'px' });
const srgb = (c: number, alpha: number): object => ({ colorSpace: 'srgb', components: [c, c, c], alpha, hex: c === 1 ? '#ffffff' : '#000000' });

const TREE: Readonly<Record<string, string>> = {
  'tokens/prism.resolver.json': JSON.stringify({
    version: '2025.10',
    sets: { ref: { sources: [{ $ref: 'ref/core.tokens.json' }] }, sys: { sources: [{ $ref: 'sys/base.tokens.json' }] } },
    modifiers: { colorScheme: { contexts: { light: [{ $ref: 'sys/color/light.tokens.json' }] }, default: 'light' } },
    resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/sets/sys' }, { $ref: '#/modifiers/colorScheme' }],
  }),
  'tokens/ref/core.tokens.json': JSON.stringify({
    ref: {
      color: { $type: 'color', ink: { $value: srgb(0, 1) }, veil: { $value: srgb(1, 0.64), $description: 'white veil' } },
      font: { ui: { $type: 'fontFamily', $value: ['Onest', 'system-ui'] } },
      type: {
        body: { $type: 'typography', $value: { fontFamily: '{ref.font.ui}', fontSize: px(15), fontWeight: 400, lineHeight: 1.5, letterSpacing: px(-0.15) } },
      },
      shadow: { lift: { $type: 'shadow', $value: [{ color: '{ref.color.veil}', offsetX: px(0), offsetY: px(2), blur: px(4), spread: px(0), inset: true }] } },
      gradient: {
        fade: {
          $type: 'gradient',
          $value: [{ color: '{ref.color.ink}', position: 0 }, { color: srgb(1, 0.5), position: 1 }],
          $extensions: { 'app.prism': { angle: 90 } },
        },
      },
      motion: { fast: { $type: 'duration', $value: { value: 100, unit: 'ms' } } },
      stroke: { $type: 'strokeStyle', dash: { $value: { dashArray: [px(4)], lineCap: 'round' } }, solid: { $value: 'solid' } },
      edge: { thin: { $type: 'border', $value: { color: '{ref.color.ink}', width: px(1), style: 'solid' } } },
      space: { 4: { $type: 'dimension', $value: px(12) } },
      opacity: { disabled: { $type: 'number', $value: 0.38 } },
    },
  }),
  'tokens/sys/base.tokens.json': JSON.stringify({
    sys: {
      space: { gap: { $type: 'dimension', $value: '{ref.space.4}' } },
      interaction: { hover: { $type: 'number', $value: 1, $extensions: { 'app.prism': { flag: true } } } },
      z: { base: { $type: 'number', $value: 0 } },
    },
  }),
  'tokens/sys/color/light.tokens.json': JSON.stringify({
    sys: {
      color: {
        $type: 'color',
        tint: { $value: '{ref.color.ink}', $extensions: { 'app.prism': { alpha: 0.12 } } },
        surface: { $root: { $value: '{ref.color.ink}' }, raised: { $value: srgb(1, 0.7) } },
      },
    },
  }),
};

const TYPES: Readonly<Record<string, TokenType>> = {
  'ref.color.ink': 'color', 'ref.color.veil': 'color', 'ref.font.ui': 'fontFamily', 'ref.type.body': 'typography',
  'ref.shadow.lift': 'shadow', 'ref.gradient.fade': 'gradient', 'ref.motion.fast': 'duration', 'ref.stroke.dash': 'strokeStyle',
  'ref.stroke.solid': 'strokeStyle', 'ref.edge.thin': 'border', 'ref.space.4': 'dimension', 'ref.opacity.disabled': 'number',
  'sys.space.gap': 'dimension', 'sys.interaction.hover': 'number', 'sys.z.base': 'number', 'sys.color.tint': 'color',
  'sys.color.surface.$root': 'color', 'sys.color.surface.raised': 'color',
};
const VALUES: Readonly<Record<string, IRValue>> = {
  'sys.interaction.hover': { kind: 'number', value: 1, flag: true },
  'sys.z.base': { kind: 'number', value: 0, flag: false },
  'ref.opacity.disabled': { kind: 'number', value: 0.38, flag: false },
  'ref.stroke.dash': { kind: 'strokeStyle', keyword: null, dashArray: [], lineCap: 'round' },
  'ref.stroke.solid': { kind: 'strokeStyle', keyword: 'solid', dashArray: [], lineCap: null },
};
const ALIASES: Readonly<Record<string, string>> = { 'sys.space.gap': 'ref.space.4', 'sys.color.tint': 'ref.color.ink', 'sys.color.surface.$root': 'ref.color.ink' };

const FACTS: TokenFacts = {
  type: (id) => TYPES[id] ?? null,
  token: (id) => (TYPES[id] === undefined ? null : ({ id, aliasOf: ALIASES[id] ?? null, value: VALUES[id] ?? { kind: 'dimension', value: 0, unit: 'px', px: 0 } } as unknown as IRToken)),
};

function treeModel(files: Readonly<Record<string, string>> = TREE): SourceModel {
  const { model, diagnostics } = loadModel(memoryReader(files));
  if (model === null) throw new Error(diagnostics.map((d) => d.message).join('\n'));
  return model;
}

describe('values (an in-memory tree)', () => {
  const { sets, diagnostics } = studioSets(treeModel(), FACTS);
  const tokens = new Map(sets.flatMap((s) => tokenNodes(s.tree).map((t) => [`${s.name}:${t.path}`, t.node] as const)));

  test('no diagnostics; one set per document in resolution order', () => {
    expect(diagnostics).toEqual([]);
    expect(sets.map((s) => s.name)).toEqual(['ref/core', 'sys/base', 'sys/color/light']);
    expect(tokenSetOrder(treeModel())).toEqual(['ref/core', 'sys/base', 'sys/color/light']);
  });

  test('colors: #rrggbb when opaque, rgba() below alpha 1; a tint keeps its alias and gets the alpha modifier', () => {
    expect(tokens.get('ref/core:ref.color.ink')).toEqual({ $type: 'color', $value: '#000000' });
    expect(tokens.get('ref/core:ref.color.veil')).toEqual({ $type: 'color', $value: 'rgba(255, 255, 255, 0.64)', $description: 'white veil' });
    expect(tokens.get('sys/color/light:color.tint')).toEqual({
      $type: 'color', $value: '{ref.color.ink}', $extensions: { 'studio.tokens': { modify: { type: 'alpha', value: '0.12', space: 'srgb', format: 'hex' } } },
    });
    expect(tokens.get('sys/color/light:color.surface.default')).toEqual({ $type: 'color', $value: '{ref.color.ink}' });
    expect(tokens.get('sys/color/light:color.surface.raised')).toEqual({ $type: 'color', $value: 'rgba(255, 255, 255, 0.7)' });
  });

  test('composites keep aliased sub-values and render the rest as strings', () => {
    expect(tokens.get('ref/core:ref.type.body')).toEqual({
      $type: 'typography', $value: { fontFamily: '{ref.font.ui}', fontSize: '15px', fontWeight: '400', lineHeight: '150%', letterSpacing: '-0.15px' },
    });
    expect(tokens.get('ref/core:ref.shadow.lift')).toEqual({
      $type: 'boxShadow', $value: [{ x: '0px', y: '2px', blur: '4px', spread: '0px', color: '{ref.color.veil}', type: 'innerShadow' }],
    });
    expect(tokens.get('ref/core:ref.gradient.fade')).toEqual({ $type: 'color', $value: 'linear-gradient(90deg, {ref.color.ink} 0%, rgba(255, 255, 255, 0.5) 100%)' });
    expect(tokens.get('ref/core:ref.edge.thin')).toEqual({ $type: 'border', $value: { color: '{ref.color.ink}', width: '1px', style: 'solid' } });
    expect(tokens.get('ref/core:ref.font.ui')).toEqual({ $type: 'fontFamilies', $value: 'Onest, system-ui' });
  });

  test('categories: space → spacing (an alias follows its own category), opacity, flags → boolean, other numbers', () => {
    expect(tokens.get('ref/core:ref.space.4')).toEqual({ $type: 'spacing', $value: '12px' });
    expect(tokens.get('sys/base:space.gap')).toEqual({ $type: 'spacing', $value: '{ref.space.4}' });
    expect(tokens.get('ref/core:ref.opacity.disabled')).toEqual({ $type: 'opacity', $value: '0.38' });
    expect(tokens.get('sys/base:interaction.hover')).toEqual({ $type: 'boolean', $value: 'true' });
    expect(tokens.get('sys/base:z.base')).toEqual({ $type: 'number', $value: '0' });
  });

  test('durations and object-form stroke styles are omitted; a keyword stroke style stays', () => {
    const core = sets.find((s) => s.name === 'ref/core');
    expect(core?.omitted.map((o) => [o.id, o.type])).toEqual([['ref.motion.fast', 'duration'], ['ref.stroke.dash', 'strokeStyle']]);
    expect(tokens.get('ref/core:ref.stroke.solid')).toEqual({ $type: 'strokeStyle', $value: 'solid' });
  });

  test('a component token takes the Tokens Studio type of its alias target', () => {
    const facts: TokenFacts = {
      type: (id) => (id.includes('radius') ? 'dimension' : null),
      token: (id) => ({ id, aliasOf: id === 'comp.button.radius' ? 'sys.radius.pill' : id === 'sys.radius.pill' ? 'ref.radius.pill' : null } as unknown as IRToken),
    };
    expect(studioTypeOf('comp.button.radius', facts)).toBe('borderRadius');
    expect(studioTypeOf('sys.radius.pill', facts)).toBe('borderRadius');
  });
});

describe('the repository flavor', () => {
  test('one set per source document, in tokenSetOrder, with $themes.json, $metadata.json and the export README', async () => {
    const input = await repoInput();
    const out = renderTokensStudio(input);
    expect(out.diagnostics).toEqual([]);
    const order = tokenSetOrder(input.model);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toHaveLength(input.model.docs.size);
    expect(out.files.map((f) => f.path)).toEqual([...order.map(setPath), `${TOKENS_STUDIO_ROOT}/${THEMES_FILE}`, `${TOKENS_STUDIO_ROOT}/${METADATA_FILE}`, EXPORT_README_PATH]);
    for (const name of ['ref/color.palette', 'sys/base', 'sys/color/dark', 'comp/button', 'brands/prism', 'brands/prism-native']) expect(order).toContain(name);
    const at = (n: string): number => order.indexOf(n);
    expect(at('brands/prism')).toBeLessThan(at('brands/prism-native'));
    expect(at('brands/prism-native')).toBeLessThan(at('sys/base'));
    expect(at('sys/color/light')).toBeLessThan(at('sys/color/light-increased-contrast'));
    expect(at('sys/motion/default')).toBeLessThan(at('sys/motion/reduced'));
    expect(order.slice(-COMP_SETS.length)).toEqual(COMP_SETS);
    const files = parsed(out.files);
    expect(files.get(`${TOKENS_STUDIO_ROOT}/${METADATA_FILE}`)).toEqual({ tokenSetOrder: order });
  }, 60_000);

  test('$themes.json: one grouped theme per context of brand, colorScheme and density, shaped as ThemeObject', async () => {
    const input = await repoInput();
    const themes = studioThemes(input.model);
    const typed: ThemeObject[] = themes.map((t) => ({ ...t, selectedTokenSets: t.selectedTokenSets as Record<string, TokenSetStatus> }));
    expect(typed).toHaveLength(2 + 6 + 4);
    const times = (n: number, group: string): string[] => Array.from({ length: n }, () => group);
    expect(themes.map((t) => t.group)).toEqual([...times(2, 'brand'), ...times(6, 'colorScheme'), ...times(4, 'density')]);
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length);
    const order = tokenSetOrder(input.model);
    const statuses: readonly string[] = Object.values(TokenSetStatus);
    for (const t of themes) {
      expect(Object.keys(t).sort()).toEqual(['group', 'id', 'name', 'selectedTokenSets']);
      expect(t.id).toBe(`${t.group}-${t.name}`);
      expect(THEME_MODIFIERS).toContain(t.group);
      for (const [set, status] of Object.entries(t.selectedTokenSets)) {
        expect(order, `${t.id} names ${set}`).toContain(set);
        expect(statuses).toContain(status);
      }
    }
    const byId = new Map(themes.map((t) => [t.id, Object.keys(t.selectedTokenSets)]));
    // The example of ARCHITECTURE §9.9.
    expect(byId.get('brand-prism')).toEqual([
      'ref/color.palette', 'ref/gradient', 'ref/dimension', 'ref/typography', 'ref/motion', 'ref/elevation', 'ref/opacity', 'brands/prism',
      'sys/base', 'sys/platform/web', 'sys/modality/pointer', 'sys/motion/default', ...COMP_SETS,
    ]);
    expect(byId.get('brand-prism-native')).toContain('brands/prism');
    expect(byId.get('brand-prism-native')).toContain('brands/prism-native');
    expect(byId.get('colorScheme-dark-increased-contrast')).toEqual(['sys/color/dark', 'sys/color/dark-increased-contrast']);
    expect(byId.get('colorScheme-light-reduced-transparency')).toEqual(['sys/color/light']);
    expect(byId.get('density-compact')).toEqual(['sys/density/compact']);
  }, 60_000);

  test('every alias resolves under every combination of one theme per group', async () => {
    const files = parsed(renderTokensStudio(await repoInput()).files);
    const { combinations, failures } = unresolved(files);
    expect(combinations).toBe(2 * 6 * 4);
    expect(failures).toEqual([]);
  }, 60_000);

  test('every $type is a Tokens Studio type; values are strings; nothing carries code syntax', async () => {
    const input = await repoInput();
    const { sets } = studioSets(input.model, tokenFacts(input.bundle));
    const types: readonly string[] = Object.values(TokenTypes);
    for (const s of sets) {
      for (const { path, node } of tokenNodes(s.tree)) {
        expect(types, `${s.name} ${path}`).toContain(node['$type']);
        for (const leaf of strings(node['$value'])) expect(typeof leaf).toBe('string');
        expect(JSON.stringify(node)).not.toContain('codeSyntax');
        expect(JSON.stringify(node)).not.toContain('app.prism');
      }
    }
    // Tokens Studio has no duration, cubicBezier or transition type and keyword-only stroke styles.
    for (const o of sets.flatMap((s) => s.omitted)) expect(['duration', 'cubicBezier', 'transition', 'strokeStyle']).toContain(o.type);
  }, 60_000);

  test('every translucent source color keeps its alpha in the set that exports it (ADR-0024 §12, ADR-0020 §3)', async () => {
    const input = await repoInput();
    const { sets } = studioSets(input.model, tokenFacts(input.bundle));
    const bySource = new Map(sets.map((s) => [s.source, new Map(tokenNodes(s.tree).map((t) => [t.path, t.node]))]));
    const rgba = (alpha: number): RegExp => new RegExp(`^rgba\\(\\d{1,3}, \\d{1,3}, \\d{1,3}, ${fmt(alpha, 3).replace('.', '\\.')}\\)$`);
    const translucent = (c: unknown): number | null => {
      if (c === null || typeof c !== 'object' || Array.isArray(c)) return null;
      const a = (c as Record<string, unknown>)['alpha'];
      return typeof a === 'number' && a < 1 ? a : null;
    };
    let checked = 0;
    for (const doc of input.model.docs.values()) {
      const nodes = bySource.get(doc.file);
      for (const token of doc.tokens.values()) {
        const node = nodes?.get(flavorPath(token.id).join('.'));
        const value = token.node['$value'];
        const ext = (token.node['$extensions'] as Record<string, Record<string, unknown>> | undefined)?.['app.prism'];
        const where = `${doc.file} ${token.id}`;
        if (typeof ext?.['alpha'] === 'number') {
          expect(node?.['$value'], where).toMatch(/^\{[^{}]+\}$/);
          expect(node?.['$extensions'], where).toEqual({ 'studio.tokens': { modify: { type: 'alpha', value: fmt(ext['alpha'], 3), space: 'srgb', format: 'hex' } } });
          checked++;
        }
        const whole = translucent(value);
        if (whole !== null) {
          expect(node?.['$value'], where).toMatch(rgba(whole));
          checked++;
        }
        if (Array.isArray(value) || (value !== null && typeof value === 'object' && 'offsetX' in value)) {
          const layers = Array.isArray(value) ? value : [value];
          layers.forEach((layer: Record<string, unknown>, i) => {
            const a = translucent(layer['color']);
            if (a !== null && 'offsetX' in layer) {
              expect((node?.['$value'] as Record<string, string>[] | undefined)?.[i]?.['color'], `${where} layer ${i}`).toMatch(rgba(a));
              checked++;
            }
            if (a !== null && 'position' in layer) {
              const stops = [...String(node?.['$value']).matchAll(/(#[0-9a-f]{6}|rgba\([^)]*\)|\{[^{}]+\}) [\d.]+%/g)].map((m) => m[1]);
              expect(stops[i], `${where} stop ${i}`).toMatch(rgba(a));
              checked++;
            }
          });
        }
      }
    }
    expect(checked).toBeGreaterThan(70);
  }, 60_000);

  test('$root becomes default and aliases follow; a default sibling of a $root collides', async () => {
    const input = await repoInput();
    const files = parsed(renderTokensStudio(input).files);
    const light = files.get(setPath('sys/color/light')) as JsonObject;
    expect(tokenNodes(light).map((t) => t.path)).toContain('color.bg.surface.default');
    const card = new Map(tokenNodes(files.get(setPath('comp/card')) as JsonObject).map((t) => [t.path, t.node]));
    expect(card.get('comp.card.solid.bg')?.['$value']).toBe('{color.bg.surface.default}');

    const c = brokenCases().find((x) => x.name === 'naming-root-default-collision');
    if (c === undefined) throw new Error('the naming-root-default-collision fixture is missing');
    const { model } = loadModel(brokenReader(c));
    if (model === null) throw new Error('the broken fixture does not parse');
    const { diagnostics } = studioSets(model, { type: () => 'color', token: () => null });
    expect(diagnostics.map((d) => [d.code, d.file])).toContainEqual(['naming/flavor-collision', 'tokens/sys/color/light.tokens.json']);
    expect(diagnostics.find((d) => d.code === 'naming/flavor-collision')?.message).toContain('color.bg.surface.default');
  }, 60_000);

  test('no color string under tokens/export is a # value longer than 7 characters (ADR-0024 §12)', async () => {
    const out = renderAll(await repoInput(), ['tokens-studio', 'figma']);
    expect(out.files.length).toBeGreaterThan(30);
    let colors = 0;
    for (const [path, json] of parsed(out.files)) {
      for (const s of strings(json)) {
        for (const m of s.matchAll(/#[0-9a-fA-F]+\b/g)) {
          expect(m[0].length, `${path}: ${s}`).toBeLessThanOrEqual(7);
          colors++;
        }
      }
    }
    expect(colors).toBeGreaterThan(100);
  }, 60_000);

  test('the export README lists every token either flavor omits', async () => {
    const input = await repoInput();
    const readme = renderTokensStudio(input).files.find((f) => f.path === EXPORT_README_PATH);
    const text = typeof readme?.contents === 'string' ? readme.contents : '';
    const { sets } = studioSets(input.model, tokenFacts(input.bundle));
    for (const o of sets.flatMap((s) => s.omitted)) expect(text).toContain(`\`${o.id}\``);
    expect(text).toContain('`sys.elevation.1`');
    expect(text).toContain('`sys.gradient.vivid.default`');
    expect(text.endsWith('\n') && !text.endsWith('\n\n')).toBe(true);
    expect(text).not.toMatch(/[ \t]$/m);
  }, 60_000);
});

describe('the mini fixture (inline sources, a set referencing a set, no brand modifier)', () => {
  test('renders without diagnostics; colorScheme anchors the themes; every alias resolves', async () => {
    const input = await inputOf(fixtureReader('mini'), '/nonexistent');
    const out = renderTokensStudio(input);
    expect(out.diagnostics).toEqual([]);
    const order = tokenSetOrder(input.model);
    expect(order).toContain('inline/base/2');
    const themes = studioThemes(input.model);
    expect(themes[0]?.group).toBe('colorScheme');
    expect(Object.keys(themes[0]?.selectedTokenSets ?? {})).toContain('inline/base/2');
    const { combinations, failures } = unresolved(parsed(out.files));
    expect(combinations).toBe(2 * 3);
    expect(failures).toEqual([]);
  }, 60_000);
});
