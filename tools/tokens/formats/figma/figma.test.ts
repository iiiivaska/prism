// The Figma-native flavor (ARCHITECTURE §9.10, §14 P1-5; ADR-0024 §12, ADR-0026): code syntax
// derived from the naming rules, the variables of each value kind, and on the repository: 12 files
// at platform=web and the other defaults, each valid against the DTCG 2025.10 format schema, only
// `sys` and `comp`, only sRGB colors, px dimensions, second durations and single font names, every
// translucent color keeping its alpha, identical names and types in every file, and every variable's
// `WEB` and `iOS` code syntax equal to the generated web and Swift names (ADR-0026 rule 3). Plus
// ADR-0026 rules 1 and 2 on the source. Style Dictionary runs share a module singleton, so this file
// never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { WEB_OUTPUT_ROOT } from '../../config.ts';
import { collectBundle, REPO_ROOT } from '../../ir/bundle.ts';
import { irColor } from '../../ir/color.ts';
import { flavorPath } from '../../ir/naming.ts';
import type { IRToken, IRValue } from '../../ir/types.ts';
import { loadModel } from '../../source/model.ts';
import { fsReader, memoryReader, type SourceReader } from '../../source/reader.ts';
import { fixtureReader } from '../../test-support.ts';
import { round } from '../../transforms/format-number.ts';
import { loadValidators } from '../../validate.ts';
import { renderFigmaNative } from '../figma-native.ts';
import { bytesOf, renderAll, type FormatInput } from '../index.ts';
import { buildManifest } from '../manifest.ts';
import { tokenNodes, type JsonObject } from '../tokens-studio/tree.ts';
import { CODE_SYNTAX_KEY, codeSyntax, SWIFT_SPRING_FIELDS, SWIFT_TYPE_ROLE_FIELDS, type FigmaPart } from './code-syntax.ts';
import { figmaMetadataDiagnostics, typeFacts, type TypeFact } from './metadata.ts';
import { FIGMA_OMITTED, figmaFiles, SCOPES_KEY, TRANSITION_OMITTED, variablesOf, type FigmaVariable } from './variables.ts';

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

function token(id: string, value: IRValue, extra: Partial<IRToken> = {}): IRToken {
  const tier = id.split('.')[0] as IRToken['tier'];
  return {
    id, path: id, tier, type: value.kind, value, raw: null, aliasOf: null, subAliases: {}, alpha: null,
    description: null, deprecated: null, metadata: {}, source: { file: 'x', layer: { kind: 'set', name: 'sys' }, line: 1 }, ...extra,
  };
}

const TYPE_ROLE: IRValue = {
  kind: 'typography', fontFamily: { kind: 'fontFamily', families: ['Onest', 'system-ui'], opsz: null },
  fontSize: { kind: 'dimension', value: 15, unit: 'px', px: 15 }, fontWeight: { kind: 'fontWeight', weight: 400 }, boldWeight: 600,
  darkWeight: null, lineHeight: 1.5, letterSpacing: { kind: 'dimension', value: 0, unit: 'px', px: 0 }, slot: 'ui', numeric: 'proportional', textStyle: 'body',
};
const SPRING: IRValue = {
  kind: 'transition', duration: { kind: 'duration', ms: 487 }, delay: { kind: 'duration', ms: 0 },
  timingFunction: { kind: 'cubicBezier', points: [0.23, 1, 0.32, 1] }, spring: { duration: 0.35, bounce: 0.15, blendDuration: 0 },
};
const px = (v: number): IRValue => ({ kind: 'dimension', value: v, unit: 'px', px: v });

describe('code syntax (ADR-0026 decision 2): one derivation from the naming rules', () => {
  test('whole tokens: the CSS custom property in var() and the member path on the token set', () => {
    const color = irColor('srgb', [1, 1, 1], 0.06);
    expect(codeSyntax(token('sys.color.bg.surface.$root', color), null)).toEqual({ WEB: 'var(--ds-color-bg-surface)', iOS: 'tokens.color.bgSurface' });
    expect(codeSyntax(token('sys.space.4', px(12)), null)).toEqual({ WEB: 'var(--ds-space-4)', iOS: 'tokens.space.step4' });
    expect(codeSyntax(token('sys.material.glass.dark.fill.$root', color), null)).toEqual({ WEB: 'var(--ds-material-glass-dark-fill)', iOS: 'tokens.material.glassDarkFill' });
    expect(codeSyntax(token('comp.button.primary.bg.rest', color), null)).toEqual({ WEB: 'var(--ds-button-primary-bg-rest)', iOS: 'tokens.components.button.primaryBgRest' });
    expect(codeSyntax(token('sys.font.ui', { kind: 'fontFamily', families: ['Onest'], opsz: null }), null)).toEqual({ WEB: 'var(--ds-font-ui)', iOS: 'tokens.context.brand.faces[.ui]' });
    expect(codeSyntax(token('ref.color.neutral.0', color), null)).toBeNull();
  });

  test('split composites: typography primitives and spring halves', () => {
    const role = token('sys.type.body.md', TYPE_ROLE);
    const part = (field: 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'): FigmaPart => ({ kind: 'typography', field });
    expect(codeSyntax(role, part('fontFamily'))).toEqual({ WEB: 'var(--ds-type-body-md-font-family)', iOS: 'tokens.context.brand.faces[.ui]' });
    expect(codeSyntax(role, part('fontSize'))).toEqual({ WEB: 'var(--ds-type-body-md-font-size)', iOS: 'tokens.typography.bodyMd.size' });
    expect(codeSyntax(role, part('fontWeight'))?.iOS).toBe('tokens.typography.bodyMd.weight');
    expect(codeSyntax(role, part('lineHeight'))).toEqual({ WEB: 'var(--ds-type-body-md-line-height)', iOS: 'tokens.typography.bodyMd.lineHeight' });
    expect(codeSyntax(role, part('letterSpacing'))).toEqual({ WEB: 'var(--ds-type-body-md-letter-spacing)', iOS: 'tokens.typography.bodyMd.trackingEm' });
    const spring = token('sys.motion.spring.snappy', SPRING);
    expect(codeSyntax(spring, { kind: 'spring', field: 'duration' })).toEqual({ WEB: 'var(--ds-motion-spring-snappy)', iOS: 'tokens.motion.springSnappy.duration' });
    expect(codeSyntax(spring, { kind: 'spring', field: 'bounce' })).toEqual({ WEB: 'var(--ds-motion-spring-snappy)', iOS: 'tokens.motion.springSnappy.bounce' });
  });
});

describe('variables of each value kind', () => {
  test('a flag is a number marked boolean; scopes come from figma metadata; a description stays', () => {
    const flag = variablesOf(token('sys.interaction.hover', { kind: 'number', value: 1, flag: true }, { description: 'hover states exist' })) as FigmaVariable[];
    expect(flag.map((v) => v.node)).toEqual([{
      $type: 'number', $value: 1, $description: 'hover states exist',
      $extensions: { [CODE_SYNTAX_KEY]: { WEB: 'var(--ds-interaction-hover)', iOS: 'tokens.interaction.hover' }, 'com.figma.type': 'boolean' },
    }]);
    const gap = variablesOf(token('sys.space.card-padding', px(16), { metadata: { figma: { collection: 'density', scopes: ['GAP'] } } })) as FigmaVariable[];
    expect(gap[0]?.node).toEqual({
      $type: 'dimension', $value: { value: 16, unit: 'px' },
      $extensions: { [CODE_SYNTAX_KEY]: { WEB: 'var(--ds-space-card-padding)', iOS: 'tokens.space.cardPadding' }, [SCOPES_KEY]: ['GAP'] },
    });
  });

  test('a translucent color keeps its alpha; hex is the color without alpha', () => {
    const v = variablesOf(token('sys.color.text.secondary', irColor('srgb', [1, 1, 1], 0.64))) as FigmaVariable[];
    expect(v[0]?.node.$value).toEqual({ colorSpace: 'srgb', components: [1, 1, 1], alpha: 0.64, hex: '#ffffff' });
  });

  test('typography splits into five primitives and a spring into duration and bounce', () => {
    const role = variablesOf(token('sys.type.body.md', TYPE_ROLE)) as FigmaVariable[];
    expect(role.map((v) => [v.path.join('/'), v.node.$type, v.node.$value])).toEqual([
      ['type/body/md/font-family', 'fontFamily', 'Onest'],
      ['type/body/md/font-size', 'dimension', { value: 15, unit: 'px' }],
      ['type/body/md/font-weight', 'number', 400],
      ['type/body/md/line-height', 'number', 1.5],
      ['type/body/md/letter-spacing', 'dimension', { value: 0, unit: 'px' }],
    ]);
    const spring = variablesOf(token('comp.button.motion.press', SPRING)) as FigmaVariable[];
    expect(spring.map((v) => [v.path.join('/'), v.node.$type, v.node.$value])).toEqual([
      ['comp/button/motion/press/duration', 'duration', { value: 0.35, unit: 's' }],
      ['comp/button/motion/press/bounce', 'number', 0.15],
    ]);
  });

  test('shadows, gradients, cubic Béziers, stroke styles, borders and plain transitions are omitted', () => {
    expect(variablesOf(token('sys.motion.easing.out', { kind: 'cubicBezier', points: [0, 0, 1, 1] }))).toEqual({ id: 'sys.motion.easing.out', type: 'cubicBezier', reason: FIGMA_OMITTED.cubicBezier });
    expect(variablesOf(token('sys.motion.fade', { ...SPRING, spring: null }))).toEqual({ id: 'sys.motion.fade', type: 'transition', reason: TRANSITION_OMITTED });
  });
});

const SWIFT_GENERATED = 'swift/Sources/DSTokens/Generated/';

/** Every variable of a file with its dotted path. */
function nodesOf(tree: JsonObject): Map<string, JsonObject> {
  return new Map(tokenNodes(tree).map((t) => [t.path, t.node]));
}

describe('the repository flavor', () => {
  test('12 files, brand × colorScheme at platform=web with the other modifiers at their defaults', async () => {
    const input = await repoInput();
    const out = renderFigmaNative(input);
    expect(out.diagnostics).toEqual([]);
    const files = figmaFiles(input.bundle);
    expect(files.map((f) => f.mode.path)).toEqual(
      ['prism', 'prism-native'].flatMap((b) => ['light', 'dark', 'light-increased-contrast', 'dark-increased-contrast', 'light-reduced-transparency', 'dark-reduced-transparency'].map((s) => `tokens/export/figma/${b}/${s}.json`)),
    );
    for (const f of files) {
      expect(f.mode.permutation.key).toBe(`brand=${f.mode.brand}|platform=web|colorScheme=${f.mode.colorScheme}|density=compact|modality=pointer|motion=default`);
    }
    expect(out.files.map((f) => f.path)).toEqual(files.map((f) => f.mode.path));
  }, 60_000);

  test('every file validates against the DTCG 2025.10 format schema', async () => {
    const validate = loadValidators().format;
    for (const f of renderFigmaNative(await repoInput()).files) {
      const json: unknown = JSON.parse(new TextDecoder().decode(bytesOf(f)));
      expect(validate(json), `${f.path}: ${JSON.stringify(validate.errors?.slice(0, 3))}`).toBe(true);
    }
  }, 60_000);

  test('only sys and comp; only sRGB colors, px dimensions, second durations, single font names and numbers', async () => {
    const input = await repoInput();
    for (const f of figmaFiles(input.bundle)) {
      const perm = f.mode.permutation;
      const exported = new Set(f.variables.map((v) => v.id));
      for (const t of perm.tokens.values()) {
        if (t.tier === 'ref') expect(exported.has(t.id), t.id).toBe(false);
        else if (!exported.has(t.id)) expect(f.omitted.map((o) => o.id), `${f.mode.path} drops ${t.id}`).toContain(t.id);
      }
      for (const o of f.omitted) expect(['shadow', 'gradient', 'cubicBezier', 'strokeStyle', 'border', 'transition']).toContain(o.type);
      for (const v of f.variables) {
        const ir = perm.tokens.get(v.id);
        const value = v.node.$value as Record<string, unknown>;
        const where = `${f.mode.path} ${v.path.join('/')}`;
        switch (v.node.$type) {
          case 'color':
            expect(value['colorSpace'], where).toBe('srgb');
            expect((value['components'] as number[]).every((c) => c >= 0 && c <= 1 && round(c, 4) === c), where).toBe(true);
            expect(value['hex'], where).toMatch(/^#[0-9a-f]{6}$/);
            expect(value['hex'], where).toBe(ir?.value.kind === 'color' ? ir.value.hex : null);
            break;
          case 'dimension':
            expect(value['unit'], where).toBe('px');
            break;
          case 'duration':
            expect(value['unit'], where).toBe('s');
            break;
          case 'fontFamily':
            expect(v.node.$value, where).toMatch(/^[^,]+$/);
            expect(v.node.$value, where).toBe(ir?.value.kind === 'fontFamily' ? ir.value.families[0] : ir?.value.kind === 'typography' ? ir.value.fontFamily.families[0] : null);
            break;
          case 'number':
            expect(Number.isFinite(v.node.$value), where).toBe(true);
            if (ir?.value.kind === 'number' && ir.value.flag) {
              expect(v.node.$extensions['com.figma.type'], where).toBe('boolean');
              expect([0, 1]).toContain(v.node.$value);
            }
            break;
        }
      }
    }
  }, 60_000);

  test('every translucent color keeps its alpha in every file that exports it (ADR-0024 §12)', async () => {
    const input = await repoInput();
    const files = figmaFiles(input.bundle);
    const kept = new Set<string>();
    for (const f of files) {
      for (const v of f.variables) {
        if (v.node.$type !== 'color') continue;
        const ir = f.mode.permutation.tokens.get(v.id);
        if (ir?.value.kind !== 'color') throw new Error(`${v.id} is no color in the IR`);
        const alpha = (v.node.$value as { alpha: number }).alpha;
        expect(alpha, `${f.mode.path} ${v.id}`).toBe(round(ir.value.alpha, 3));
        if (ir.value.alpha < 1) {
          expect(alpha, `${f.mode.path} ${v.id}`).toBeLessThan(1);
          kept.add(`${ir.source.file}#${v.id}#${alpha}`);
        }
      }
    }
    // Every translucent color the sys and comp sources declare (a literal below alpha 1 or an alias
    // with app.prism.alpha) reaches some file with that alpha.
    let declared = 0;
    for (const doc of input.model.docs.values()) {
      for (const t of doc.tokens.values()) {
        if (t.id.startsWith('ref.')) continue;
        const v = t.node['$value'] as Record<string, unknown> | string;
        const ext = (t.node['$extensions'] as Record<string, Record<string, unknown>> | undefined)?.['app.prism'];
        const alpha = typeof ext?.['alpha'] === 'number' ? ext['alpha'] : typeof v === 'object' && typeof v['alpha'] === 'number' && 'colorSpace' in v ? v['alpha'] : null;
        if (alpha === null || alpha >= 1) continue;
        declared++;
        expect(kept.has(`${doc.file}#${t.id}#${round(alpha, 3)}`), `${doc.file} ${t.id} alpha ${alpha}`).toBe(true);
      }
    }
    expect(declared).toBeGreaterThan(50);
  }, 60_000);

  test('every file has the same names and types', async () => {
    const shapes = figmaFiles((await repoInput()).bundle).map((f) => f.variables.map((v) => `${v.path.join('/')}:${v.node.$type}`));
    for (const s of shapes) expect(s).toEqual(shapes[0]);
    expect(shapes[0]?.length).toBeGreaterThan(250);
  }, 60_000);

  test('every variable has WEB and iOS code syntax equal to the generated web names and the manifest Swift names (ADR-0026 rule 3)', async () => {
    const input = await repoInput();
    const manifest = new Map(buildManifest(input.bundle, input.model.resolverFile).tokens.map((t) => [t.id, t]));
    const rendered = renderAll(input, ['css']).files;
    const text = (path: string): string => {
      const f = rendered.find((x) => x.path === path);
      return f === undefined ? '' : new TextDecoder().decode(bytesOf(f));
    };
    let checked = 0;
    for (const f of figmaFiles(input.bundle)) {
      const css = `${text(`${WEB_OUTPUT_ROOT}/${f.mode.brand}/tokens.css`)}\n${text(`${WEB_OUTPUT_ROOT}/motion.css`)}`;
      const declared = new Set([...css.matchAll(/^\s*(--ds-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
      expect(declared.size, `${f.mode.brand}/tokens.css declares custom properties`).toBeGreaterThan(100);
      for (const [path, node] of nodesOf(f.tree)) {
        const syntax = (node['$extensions'] as Record<string, unknown>)[CODE_SYNTAX_KEY] as Record<string, string> | undefined;
        expect(Object.keys(syntax ?? {}), path).toEqual(['WEB', 'iOS']);
        const v = f.variables.find((x) => x.path.join('.') === path);
        const m = v === undefined ? undefined : manifest.get(v.id);
        if (v === undefined || m === undefined) throw new Error(`${path} has no manifest entry`);
        // WEB: a custom property that tokens.css or motion.css declares, one of the token's manifest cssVars.
        const web = /^var\((--ds-[a-z0-9-]+)\)$/.exec(syntax?.['WEB'] ?? '')?.[1] ?? '';
        expect(declared.has(web), `${f.mode.path} ${path}: ${web} is not declared`).toBe(true);
        expect(m.cssVars, path).toContain(web);
        // iOS: the manifest's Swift name on a DSTokenSet named `tokens` (+ the DSTypeRole or DSSpringToken field).
        const base = (m.swift ?? '').replace(/^DSColor\./, 'tokens.color.').replace(/^DSTokenSet\./, 'tokens.').replace(/^DSBrand\.faces/, 'tokens.context.brand.faces');
        const ios = syntax?.['iOS'] ?? '';
        if (v.part === null) {
          expect(ios, path).toBe(base);
        } else if (v.part.kind === 'typography' && v.part.field === 'fontFamily') {
          // The family of a role is the brand face of its slot, the same expression `sys.font.<slot>` has.
          const role = f.mode.permutation.tokens.get(v.id)?.value;
          const slot = role?.kind === 'typography' ? role.slot : '?';
          expect(ios, path).toBe(`tokens.context.brand.faces[.${slot}]`);
          expect(manifest.get(`sys.font.${slot}`)?.swift, path).toBe(`DSBrand.faces[.${slot}]`);
        } else {
          const fields: Readonly<Record<string, string>> = v.part.kind === 'typography' ? SWIFT_TYPE_ROLE_FIELDS : SWIFT_SPRING_FIELDS;
          const field = fields[v.part.field];
          expect(ios, path).toBe(`${base}.${field}`);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(3000);
  }, 120_000);

  test('every identifier of an iOS code syntax is a name swift/Sources/DSTokens/Generated declares (ADR-0026 rule 3)', async (ctx) => {
    const input = await repoInput();
    const generated = renderAll(input, ['swift']).files.filter((f) => f.path.startsWith(SWIFT_GENERATED));
    const swift = generated.map((f) => new TextDecoder().decode(bytesOf(f))).join('\n');
    // Until the Swift format renders the token set, the colors, the brands and the value types (its P1-5
    // part), the test above checks the iOS names against manifest.json only.
    const needed = ['DSTokenSet.swift', 'DSColor.swift', 'DSBrand.swift', 'DSTokenTypes.swift'].map((n) => `${SWIFT_GENERATED}${n}`);
    ctx.skip(!needed.every((p) => generated.some((f) => f.path === p)), `the Swift format does not render ${needed.join(', ')} yet`);
    // Every member of the path is a stored or computed property the generated Swift declares
    // (`let name:` / `var name:`), and a `faces[.slot]` subscript names a `DSFontSlot` case.
    const declared = new Set([...swift.matchAll(/\b(?:let|var)\s+`?([A-Za-z_][A-Za-z0-9_]*)`?\s*:/g)].map((m) => m[1]));
    const slots = new Set((/enum DSFontSlot\b[^{]*\{([^}]*)\}/.exec(swift)?.[1] ?? '').match(/[A-Za-z]+/g)?.filter((w) => w !== 'case') ?? []);
    expect(slots.size).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const f of figmaFiles(input.bundle)) {
      for (const [path, node] of nodesOf(f.tree)) {
        const ios = ((node['$extensions'] as Record<string, Record<string, string>>)[CODE_SYNTAX_KEY])?.['iOS'] ?? '';
        const slot = /\[\.([A-Za-z0-9]+)\]$/.exec(ios)?.[1];
        if (slot !== undefined && !slots.has(slot)) missing.push(`${f.mode.path} ${path}: ${ios} (DSFontSlot.${slot})`);
        for (const name of ios.replace(/\[\.[A-Za-z0-9]+\]$/, '').replace(/`/g, '').split('.').slice(1)) {
          if (!declared.has(name)) missing.push(`${f.mode.path} ${path}: ${ios} (${name})`);
        }
      }
    }
    expect(missing).toEqual([]);
  }, 120_000);
});

// ---- ADR-0026 rules 1 and 2 on the source ----

const TREE: Readonly<Record<string, string>> = {
  'tokens/prism.resolver.json': JSON.stringify({
    version: '2025.10',
    sets: {
      ref: { sources: [{ $ref: 'ref/core.tokens.json' }] },
      sys: { sources: [{ $ref: 'sys/base.tokens.json' }] },
      comp: { sources: [{ $ref: 'comp/card.tokens.json' }] },
    },
    modifiers: {
      colorScheme: { contexts: { light: [{ $ref: 'sys/color/light.tokens.json' }] }, default: 'light' },
      density: { contexts: { compact: [{ $ref: 'sys/density/compact.tokens.json' }] }, default: 'compact' },
    },
    resolutionOrder: [{ $ref: '#/sets/ref' }, { $ref: '#/sets/sys' }, { $ref: '#/modifiers/colorScheme' }, { $ref: '#/modifiers/density' }, { $ref: '#/sets/comp' }],
  }),
  'tokens/ref/core.tokens.json': JSON.stringify({
    ref: {
      color: { ink: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1, hex: '#000000' }, $extensions: { 'app.prism': { figma: { collection: 'base', scopes: [] } } } } },
      space: { 4: { $type: 'dimension', $value: { value: 12, unit: 'px' } } },
    },
  }),
  'tokens/sys/base.tokens.json': JSON.stringify({
    sys: {
      space: { gap: { $type: 'dimension', $value: '{ref.space.4}', $extensions: { 'app.prism': { figma: { collection: 'base', scopes: ['GAP'] } } } } },
      radius: { card: { $type: 'dimension', $value: { value: 16, unit: 'px' } } },
      type: { body: { $type: 'typography', $value: { fontFamily: 'Onest', fontSize: { value: 15, unit: 'px' }, fontWeight: 400, lineHeight: 1.5, letterSpacing: { value: 0, unit: 'px' } }, $extensions: { 'app.prism': { figma: { collection: 'base', scopes: [] } } } } },
      interaction: { hover: { $type: 'number', $value: 1, $extensions: { 'app.prism': { flag: true, figma: { collection: 'base', scopes: [] } } } } },
      z: { base: { $type: 'number', $value: 0, $extensions: { 'app.prism': { figma: { collection: 'base', scopes: [], codeSyntax: { WEB: 'var(--z)' } } } } } },
    },
  }),
  'tokens/sys/color/light.tokens.json': JSON.stringify({
    sys: { color: { page: { $type: 'color', $value: '{ref.color.ink}', $extensions: { 'app.prism': { figma: { collection: 'base', scopes: ['FRAME_FILL'] } } } } } },
  }),
  'tokens/sys/density/compact.tokens.json': JSON.stringify({
    sys: { space: { pad: { $type: 'dimension', $value: { value: 8, unit: 'px' }, $extensions: { 'app.prism': { figma: { collection: 'density', scopes: ['GAP'] } } } } } },
  }),
  'tokens/comp/card.tokens.json': JSON.stringify({
    comp: { card: { bg: { $type: 'color', $value: '{sys.color.page}', $extensions: { 'app.prism': { figma: { collection: 'component', scopes: ['FRAME_FILL'] } } } } } },
  }),
};

const FACTS: Readonly<Record<string, TypeFact>> = {
  'ref.color.ink': { type: 'color', flag: false }, 'ref.space.4': { type: 'dimension', flag: false }, 'sys.space.gap': { type: 'dimension', flag: false },
  'sys.radius.card': { type: 'dimension', flag: false }, 'sys.type.body': { type: 'typography', flag: false }, 'sys.interaction.hover': { type: 'number', flag: true },
  'sys.z.base': { type: 'number', flag: false }, 'sys.color.page': { type: 'color', flag: false }, 'sys.space.pad': { type: 'dimension', flag: false },
  'comp.card.bg': { type: 'color', flag: false },
};

describe('ADR-0026 rules 1 and 2 on the source', () => {
  test('the repository keeps them: scopes and the owning collection on every scoped-type sys and comp declaration, nothing else', async () => {
    const input = await repoInput();
    expect(figmaMetadataDiagnostics(input.model, typeFacts(input.bundle))).toEqual([]);
  }, 60_000);

  test('each rule fails on a crafted tree', () => {
    const { model } = loadModel(memoryReader(TREE));
    if (model === null) throw new Error('the crafted tree does not parse');
    const typeOf = (id: string): TypeFact | null => FACTS[id] ?? null;
    const codes = (requireScopes: boolean): string[][] => figmaMetadataDiagnostics(model, typeOf, { requireScopes }).map((d) => [d.code, d.tokenId ?? '']);
    expect(codes(true)).toEqual([
      ['figma/misplaced', 'ref.color.ink'],
      ['figma/misplaced', 'sys.interaction.hover'],
      ['figma/scopes', 'sys.radius.card'],
      ['figma/collection', 'sys.radius.card'],
      ['figma/misplaced', 'sys.type.body'],
      ['figma/code-syntax', 'sys.z.base'],
      ['figma/collection', 'sys.color.page'],
    ]);
    // The build runs every rule but the scopes rule, which the fixtures without Figma metadata would fail.
    expect(codes(false)).toEqual([
      ['figma/misplaced', 'ref.color.ink'],
      ['figma/misplaced', 'sys.interaction.hover'],
      ['figma/misplaced', 'sys.type.body'],
      ['figma/code-syntax', 'sys.z.base'],
      ['figma/collection', 'sys.color.page'],
    ]);
  });
});

describe('the mini fixture (no brand or platform modifier)', () => {
  test('one file per colorScheme context under the default brand, valid DTCG, no diagnostics', async () => {
    const input = await inputOf(fixtureReader('mini'), '/nonexistent');
    const out = renderFigmaNative(input);
    expect(out.diagnostics).toEqual([]);
    expect(out.files.map((f) => f.path)).toEqual(['tokens/export/figma/default/light.json', 'tokens/export/figma/default/dark.json']);
    const validate = loadValidators().format;
    for (const f of out.files) expect(validate(JSON.parse(new TextDecoder().decode(bytesOf(f))))).toBe(true);
    const light = nodesOf(JSON.parse(new TextDecoder().decode(bytesOf(out.files[0] ?? { path: '', contents: '{}' }))) as JsonObject);
    expect([...light.keys()].every((p) => !p.startsWith('ref.'))).toBe(true);
    expect([...light.keys()]).toContain(flavorPath('sys.color.bg.surface.$root').join('.'));
  }, 60_000);
});
