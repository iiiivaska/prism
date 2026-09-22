// The web half of the anti-staleness gate (docs/showcase.md §5).
//
// The web showcase writes no catalogue: `web/apps/showcase/plugins/catalog.ts` builds it during
// `pnpm -r build` (docs/showcase.md §1), so there is no committed file to be stale. What *can* be
// stale is the app: a component lands in a manifest and nothing stages it. The plugin's gate is what
// stops that, and until now only a real `vite build` exercised it — a regression in the manifest
// grammar would have shown up as a component silently missing its page rather than as a failure.
//
// So this file runs beside `tools/showcase/apple/catalog.test.ts`, in the same `pnpm -r test` on
// ubuntu with no browser and no bundler, and holds three things true:
//
//   1. the plugin's manifest grammar reads the real manifests exactly as `tools/parity/manifest.ts`
//      does, which is the parser the parity report trusts;
//   2. a component with no harness entry fails, naming the function to write and the file to write it
//      in — including a component that lands in the *charts* manifest, which is where the data-viz
//      layer ships (ADR-0007);
//   3. it passes for what this build implements, so the gate is not simply always red.
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../tokens/ir/bundle.ts';
import { fsReader } from '../../tokens/source/reader.ts';
import { MANIFESTS } from '../../parity/config.ts';
import { parseManifest } from '../../parity/manifest.ts';
import {
  assertRenderers,
  mergeImplemented,
  readImplemented,
  rendererName,
  WEB_MANIFESTS,
  type ImplementedTable,
} from '../../../web/apps/showcase/plugins/catalog.ts';

const reader = fsReader(REPO_ROOT);

/** The file the plugin checks for `render<Name>Example`, and the name it prints when one is missing. */
const HARNESS = 'web/apps/showcase/src/harness/renderers.tsx';

function tableOf(path: string): ImplementedTable {
  return readImplemented(reader.readText(path), path);
}

describe('the web showcase catalogue', () => {
  it('reads every web manifest the parity report reads', () => {
    expect([...WEB_MANIFESTS]).toEqual(
      MANIFESTS.filter((manifest) => manifest.platforms.some((platform) => platform.startsWith('web-'))).map((manifest) => manifest.path),
    );
    expect(WEB_MANIFESTS.length).toBeGreaterThan(1);
  });

  for (const manifest of MANIFESTS.filter((entry) => WEB_MANIFESTS.includes(entry.path))) {
    it(`parses ${manifest.path} exactly as tools/parity/manifest.ts does`, () => {
      const source = reader.readText(manifest.path);
      const parity = parseManifest(source, manifest.syntax);
      expect(parity.problems).toEqual([]);
      const expected = Object.fromEntries(
        parity.entries.map((entry) => [entry.name, Object.fromEntries(entry.versions.map((version) => [version.platform, version.version]))]),
      );
      expect(tableOf(manifest.path)).toEqual(expected);
    });
  }

  it('merges the two tables into one, so a page does not depend on which package ships the component', () => {
    const merged = mergeImplemented(WEB_MANIFESTS.map(tableOf));
    for (const path of WEB_MANIFESTS) {
      for (const [component, versions] of Object.entries(tableOf(path))) {
        expect(merged[component]).toMatchObject(versions);
      }
    }
  });

  it('stages every component this build implements', () => {
    const merged = mergeImplemented(WEB_MANIFESTS.map(tableOf));
    expect(Object.keys(merged).length).toBeGreaterThan(0);
    expect(() => {
      assertRenderers(merged, reader.readText(HARNESS), HARNESS);
    }).not.toThrow();
  });

  it('names a renderer that does not exist yet when a component lands, which is what stops the app going stale', () => {
    const landed = { ...mergeImplemented(WEB_MANIFESTS.map(tableOf)), Divider: { 'web-touch': 1, 'web-desktop': 1 } };
    expect(() => {
      assertRenderers(landed, reader.readText(HARNESS), HARNESS);
    }).toThrowError(/The showcase has no way to stage Divider[\s\S]*renderDividerExample\(props, example\)/);
    expect(rendererName('Divider')).toBe('renderDividerExample');
  });

  it('gates a data-viz component the same way, which is where the next components land', () => {
    // The charts manifest with one component in it: `web/packages/charts` ships the data-viz layer
    // (ADR-0007), so a Sparkline that lands there must reach the showcase exactly as a Button does.
    const charts = MANIFESTS.find((manifest) => manifest.path.includes('charts'));
    expect(charts?.path).toBe('web/packages/charts/src/manifest.ts');
    const source = reader
      .readText(charts?.path ?? '')
      .replace('export const implemented: ImplementedVersions = {};', 'export const implemented: ImplementedVersions = {\n  Sparkline: { "web-touch": 1, "web-desktop": 1 },\n};');
    const table = readImplemented(source, charts?.path ?? '');
    expect(table['Sparkline']).toEqual({ 'web-touch': 1, 'web-desktop': 1 });
    expect(() => {
      assertRenderers(mergeImplemented([tableOf('web/packages/react/src/manifest.ts'), table]), reader.readText(HARNESS), HARNESS);
    }).toThrowError(/renderSparklineExample/);
  });

  it('says which manifests it read when it fails, so the sentence names where the component came from', () => {
    try {
      assertRenderers({ Divider: { 'web-desktop': 1 } }, '', HARNESS);
      expect.unreachable('the gate did not fire');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const path of WEB_MANIFESTS) expect(message).toContain(path);
      expect(message).toContain(HARNESS);
    }
  });
});
