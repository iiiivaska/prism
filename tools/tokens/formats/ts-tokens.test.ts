// `<brand>/tokens.ts` and `runtime.ts` (ARCHITECTURE §9.5, §14 P1-5; ADR-0019 §3, ADR-0020 §6): the
// committed files equal the build, `resolveTokens` of the generated module equals the IR for all 96
// web contexts of each brand, both brands declare identical types, and runtime.ts is generated from
// config.ts alone. Style Dictionary runs share a module singleton, so this file never uses test.concurrent.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { PLATFORM_DEFAULTS, WEB_RUNTIME } from '../config.ts';
import { collectBundle, REPO_ROOT } from '../ir/bundle.ts';
import type { IRBundle } from '../ir/types.ts';
import { expectedTsValue, verifyTsTables } from '../verify/tables.ts';
import { webContexts } from '../verify/css-cascade.ts';
import { webScopes } from './css/web.ts';
import { checkPlatformDefaults, renderRuntimeText, RUNTIME_TS_PATH } from './runtime-ts.ts';
import { renderTokensTsText, tokensTsPath, tsTable } from './ts-tokens.ts';

let repo: Promise<IRBundle> | null = null;
function repoBundle(): Promise<IRBundle> {
  repo ??= collectBundle({ root: REPO_ROOT }).then((r) => {
    if (r.bundle === null) throw new Error(r.diagnostics.map((d) => d.message).join('\n'));
    return r.bundle;
  });
  return repo;
}

const read = (path: string): string => readFileSync(`${REPO_ROOT}${path}`, 'utf8');

interface GeneratedTokens {
  readonly table: Readonly<Record<string, unknown>>;
  resolveTokens(context?: Readonly<Record<string, string>>): Readonly<Record<string, unknown>>;
  cssVar(path: string): string;
}

describe('tokens.ts', () => {
  test('the committed files are the build output (run `pnpm tokens:build` otherwise)', async () => {
    const b = await repoBundle();
    for (const scope of webScopes(b)) {
      expect(read(tokensTsPath(scope.brand)) === renderTokensTsText(b, 'tokens/prism.resolver.json', scope), `${tokensTsPath(scope.brand)} is stale`).toBe(true);
    }
    expect(read(RUNTIME_TS_PATH)).toBe(renderRuntimeText());
  }, 60_000);

  test('resolveTokens of each generated module equals the IR in all 96 web contexts', async () => {
    const b = await repoBundle();
    let compared = 0;
    let expectedChecks = 0;
    for (const scope of webScopes(b)) {
      const mod = (await import(`${REPO_ROOT}${tokensTsPath(scope.brand)}`)) as GeneratedTokens;
      const ids = tsTable(b, scope).map((e) => [e.path, e.id] as const);
      expect(Object.keys(mod.table)).toEqual(ids.map(([p]) => p));
      const contexts = webContexts(scope);
      expect(contexts).toHaveLength(96);
      expectedChecks += contexts.length * ids.length;
      for (const ctx of contexts) {
        const resolved = mod.resolveTokens(ctx);
        for (const [path, id] of ids) {
          expect(resolved[path], `${scope.brand} ${path} ${JSON.stringify(ctx)}`).toEqual(expectedTsValue(scope, id, ctx));
          compared++;
        }
      }
      expect(mod.resolveTokens()).toEqual(mod.resolveTokens({ colorScheme: 'light', contrast: 'standard', transparency: 'standard', density: 'compact', modality: 'pointer', motion: 'standard' }));
      expect(mod.cssVar('color.bg.page')).toBe('var(--ds-color-bg-page)');
    }
    expect(compared).toBe(expectedChecks);
    expect(compared).toBeGreaterThan(40_000);
    expect(verifyTsTables(b)).toEqual([]);
  }, 120_000);

  test('both brands declare identical types; only sys and comp paths, never an Apple face', async () => {
    const b = await repoBundle();
    const typesOf = (text: string): string => {
      const body = text.split('\n').slice(1).join('\n');
      const start = body.indexOf('export const table');
      const end = body.indexOf('export type TokenPath');
      return body.slice(0, start) + body.slice(end);
    };
    const [a, c] = webScopes(b).map((s) => read(tokensTsPath(s.brand)));
    expect(typesOf(a ?? '')).toBe(typesOf(c ?? ''));
    for (const text of [a ?? '', c ?? '']) {
      expect(text).not.toMatch(/^ {2}'ref\./m);
      expect(text).not.toContain('ref.font.apple');
      expect(text).toMatch(/^import \{ defaultContext, type TokenContext \} from '\.\.\/runtime\.ts';$/m);
    }
  }, 60_000);

  test('entry shapes follow the union shape: $values per axis, contrast deltas per base scheme, flags as booleans', async () => {
    const b = await repoBundle();
    const [scope] = webScopes(b);
    if (scope === undefined) throw new Error('no scope');
    const entry = (path: string) => tsTable(b, scope).find((e) => e.path === path);
    expect(entry('color.text.secondary')).toMatchObject({ axis: 'colorScheme', valueType: 'ColorValue' });
    expect(entry('color.text.secondary')?.deltas.map((d) => [d.key, d.values.map(([k]) => k)])).toEqual([['$increasedContrast', ['light', 'dark']]]);
    expect(entry('color.text.accent')?.deltas.map((d) => d.values.map(([k]) => k))).toEqual([['light']]);
    expect(entry('space.card-padding')).toMatchObject({ axis: 'density', values: [['compact', 16], ['regular', 24], ['comfortable', 24]] });
    expect(entry('interaction.hover')).toMatchObject({ axis: 'modality', valueType: 'boolean', values: [['pointer', true], ['touch', false]] });
    expect(entry('motion.spring.snappy')?.values.map(([k]) => k)).toEqual(['standard', 'reduce']);
    expect(entry('type.body.md')).toMatchObject({ axis: null, cssVar: null, valueType: 'TypeRoleValue' });
    expect(entry('space.4')).toMatchObject({ axis: null, value: 12, cssVar: '--ds-space-4' });
  }, 60_000);
});

describe('runtime.ts', () => {
  test('is generated from WEB_RUNTIME and PLATFORM_DEFAULTS alone', async () => {
    const mod = (await import(`${REPO_ROOT}${RUNTIME_TS_PATH}`)) as {
      webRuntime: Record<string, unknown>; defaultContext: Record<string, string>; platformDefaults: Record<string, unknown>;
    };
    expect(Object.keys(mod.webRuntime)).toEqual(Object.keys(WEB_RUNTIME));
    for (const [axis, r] of Object.entries(WEB_RUNTIME)) {
      expect(mod.webRuntime[axis]).toEqual({ attribute: r.attribute, values: r.values, nestable: r.nestable, media: r.media });
      expect(mod.defaultContext[axis]).toBe(r.values[0]);
    }
    expect(mod.platformDefaults).toEqual(PLATFORM_DEFAULTS);
    expect(checkPlatformDefaults()).toEqual([]);
  });
});
