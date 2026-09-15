// manifest.json (ARCHITECTURE §9.6; ADR-0019 §3, ADR-0020 §5–§6, ADR-0024 §13.3): the committed file
// is the build output; the runtime section mirrors WEB_RUNTIME with the Swift cases; every token has
// its names; `cssVars` equals what tokens.css and motion.css declare, and `css` is never a property
// that no sheet declares (ADR-0019 rule 13); Apple faces have no web names. Style Dictionary runs share
// a module singleton, so this file never uses test.concurrent.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { PLATFORM_DEFAULTS, WEB_OUTPUT_ROOT, WEB_RUNTIME } from '../config.ts';
import { collectBundle, REPO_ROOT } from '../ir/bundle.ts';
import { swiftNameOf } from '../ir/naming.ts';
import type { IRBundle } from '../ir/types.ts';
import { fsReader } from '../source/reader.ts';
import { bytesOf, renderAll, type FormatInput } from './index.ts';
import { buildManifest, MANIFEST_PATH, type Manifest } from './manifest.ts';

let repo: Promise<FormatInput> | null = null;
function repoInput(): Promise<FormatInput> {
  repo ??= collectBundle({ root: REPO_ROOT }).then((r) => {
    if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
    return { bundle: r.bundle, model: r.model, root: REPO_ROOT, reader: fsReader(REPO_ROOT) };
  });
  return repo;
}

async function repoBundle(): Promise<IRBundle> {
  return (await repoInput()).bundle;
}

describe('manifest.json', () => {
  test('the committed file is the build output', async () => {
    const m = buildManifest(await repoBundle(), 'tokens/prism.resolver.json');
    expect(readFileSync(`${REPO_ROOT}${MANIFEST_PATH}`, 'utf8') === `${JSON.stringify(m, null, 2)}\n`, `${MANIFEST_PATH} is stale`).toBe(true);
  }, 60_000);

  test('the runtime section and the platform defaults come from config.ts', async () => {
    const m: Manifest = buildManifest(await repoBundle(), 'tokens/prism.resolver.json');
    expect(Object.keys(m.runtime)).toEqual(Object.keys(WEB_RUNTIME));
    expect(m.runtime['colorScheme']).toEqual({
      attribute: 'data-ds-color-scheme', nestable: true,
      values: { light: { context: 'light', swift: 'DSColorScheme.light' }, dark: { context: 'dark', swift: 'DSColorScheme.dark' } },
      media: { value: 'dark', query: '(prefers-color-scheme: dark)' },
    });
    expect(m.runtime['contrast']?.values).toEqual({ standard: { variant: null, swift: 'DSContrast.standard' }, more: { variant: 'increased-contrast', swift: 'DSContrast.increased' } });
    expect(m.runtime['motion']?.values).toEqual({ standard: { context: 'default', swift: 'DSMotionMode.standard' }, reduce: { context: 'reduced', swift: 'DSMotionMode.reduced' } });
    expect(m.platformDefaults).toEqual(PLATFORM_DEFAULTS);
    expect(m.modifiers.map((x) => x.name)).toEqual(['brand', 'platform', 'colorScheme', 'density', 'modality', 'motion']);
    expect(m.tailwindVariants).toEqual(['ds-touch', 'ds-pointer', 'ds-contrast-more', 'ds-reduce-transparency', 'ds-reduce-motion']);
  }, 60_000);

  test('every token has its names; the example of ARCHITECTURE §9.6; Apple faces have no web names', async () => {
    const b = await repoBundle();
    const m = buildManifest(b, 'tokens/prism.resolver.json');
    expect(m.tokens).toHaveLength(b.permutations.values().next().value?.tokens.size ?? -1);
    expect(new Set(m.tokens.map((t) => t.path)).size).toBe(m.tokens.length);
    expect(m.tokens.find((t) => t.id === 'sys.color.text.secondary')).toMatchObject({
      path: 'color.text.secondary', tier: 'sys', type: 'color', dependsOn: ['colorScheme'], css: '--ds-color-text-secondary',
      tailwind: ['text-ds-secondary'], ts: 'color.text.secondary', swift: 'DSColor.textSecondary', asset: 'color-text-secondary',
    });
    expect(m.tokens.find((t) => t.id === 'sys.space.card-padding')).toMatchObject({ dependsOn: ['density'], swift: 'DSTokenSet.space.cardPadding', asset: null });
    expect(m.tokens.find((t) => t.id === 'sys.motion.spring.snappy')?.dependsOn).toEqual(['motion']);
    const apple = m.tokens.filter((t) => t.id.startsWith('ref.font.apple.'));
    expect(apple).toHaveLength(3);
    for (const t of apple) expect([t.css, t.tailwind, t.tailwindTheme, t.ts]).toEqual([null, [], [], null]);
    for (const t of m.tokens) {
      if (t.tier === 'sys') expect(swiftNameOf(t.id).kind, t.id).not.toBe('unknown');
      if (t.tier === 'ref') expect([t.ts, t.swift, t.tailwind]).toEqual([null, null, []]);
      for (const u of t.tailwind) expect(u).toContain('-ds-');
    }
  }, 60_000);

  test('cssVars are exactly the declared custom properties; css is the base one or null', async () => {
    const input = await repoInput();
    const m = buildManifest(input.bundle, 'tokens/prism.resolver.json');
    const byId = new Map(m.tokens.map((t) => [t.id, t]));
    expect(byId.get('sys.color.text.secondary')).toMatchObject({ css: '--ds-color-text-secondary', cssVars: ['--ds-color-text-secondary'] });
    // A typography role declares only its six derived properties (ARCHITECTURE §8, in §12 order): no base name.
    const body = ['-font-family', '-font-size', '-font-variant-numeric', '-font-weight', '-letter-spacing', '-line-height'];
    expect(byId.get('sys.type.body.md')).toMatchObject({ css: null, cssVars: body.map((s) => `--ds-type-body-md${s}`) });
    expect(byId.get('ref.type.body.md')).toMatchObject({ css: null, cssVars: body.map((s) => `--ds-ref-type-body-md${s}`) });
    expect(byId.get('sys.motion.spring.snappy')).toMatchObject({
      css: '--ds-motion-spring-snappy',
      cssVars: ['--ds-motion-spring-snappy', '--ds-motion-spring-snappy-delay', '--ds-motion-spring-snappy-duration', '--ds-motion-spring-snappy-easing'],
    });
    const css = renderAll(input, ['css']).files;
    const sheet = (path: string): string => new TextDecoder().decode(bytesOf(css.find((f) => f.path === path) ?? { path, contents: '' }));
    const motion = sheet(`${WEB_OUTPUT_ROOT}/motion.css`);
    const listed = new Set(m.tokens.flatMap((t) => t.cssVars));
    for (const brand of input.bundle.brands.keys()) {
      const declared = new Set([...`${sheet(`${WEB_OUTPUT_ROOT}/${brand}/tokens.css`)}\n${motion}`.matchAll(/^\s*(--ds-[a-z0-9-]+)\s*:/gm)].map((x) => x[1] ?? ''));
      expect(declared.size, brand).toBeGreaterThan(100);
      expect([...listed].filter((n) => !declared.has(n)), `${brand}: listed but never declared`).toEqual([]);
      expect([...declared].filter((n) => !listed.has(n)), `${brand}: declared but not listed`).toEqual([]);
    }
    for (const t of m.tokens) {
      expect(t.css === null || t.cssVars[0] === t.css, t.id).toBe(true);
      if (t.cssVars.length > 0 && t.css === null) expect(['typography', 'strokeStyle'], t.id).toContain(t.type);
    }
  }, 60_000);
});
