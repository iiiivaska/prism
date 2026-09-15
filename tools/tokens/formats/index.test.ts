// The format registry (ARCHITECTURE §3.1, §9.0): every target of §9 is registered once, each target
// writes only inside its own part of the owned roots, `renderAll` sorts its files, and the web outputs
// of the mini fixture match their file snapshots. The per-target tests (css/, swift/, tokens-studio/,
// figma/, swift/fonts.test.ts) cover the contents. Style Dictionary runs share a module singleton, so
// this file never uses test.concurrent.
import { describe, expect, test } from 'vitest';
import { OWNED_ROOTS, PATHS, WEB_OUTPUT_ROOT } from '../config.ts';
import { collectBundle } from '../ir/bundle.ts';
import { ownerOf } from '../output/write.ts';
import { fixtureReader } from '../test-support.ts';
import { verifyAll } from '../verify/index.ts';
import { SWIFT_FONTS_ROOT } from './fonts.ts';
import { FORMATS, renderAll, TARGETS, type FormatInput } from './index.ts';
import { SWIFT_SOURCES_ROOT, SWIFT_TESTS_ROOT, XCASSETS_ROOT } from './swift/model.ts';

async function miniInput(): Promise<FormatInput> {
  const reader = fixtureReader('mini');
  const r = await collectBundle({ reader });
  if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('\n'));
  return { bundle: r.bundle, model: r.model, root: '/nonexistent', reader };
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WEB = escape(`${WEB_OUTPUT_ROOT}/`);
const BRAND = '[a-z0-9-]+';

/** Where each target may write (ARCHITECTURE §9.0): a file of one target never lands in another's place. */
const TARGET_PATHS: Readonly<Record<string, RegExp>> = {
  css: new RegExp(`^${WEB}(?:${BRAND}/tokens\\.css|motion\\.css)$`),
  tailwind: new RegExp(`^${WEB}tailwind\\.css$`),
  ts: new RegExp(`^${WEB}${BRAND}/tokens\\.ts$`),
  runtime: new RegExp(`^${WEB}runtime\\.ts$`),
  manifest: new RegExp(`^${WEB}manifest\\.json$`),
  swift: new RegExp(`^(?:${escape(SWIFT_SOURCES_ROOT)}|${escape(SWIFT_TESTS_ROOT)})/[^/]+\\.swift$`),
  xcassets: new RegExp(`^${escape(XCASSETS_ROOT)}/(?:[^/]+/)*Contents\\.json$`),
  fonts: new RegExp(`^(?:${escape(SWIFT_FONTS_ROOT)}/[^/]+/[^/]+|${WEB}${BRAND}/fonts/(?:fonts\\.css|[^/]+/[^/]+))$`),
  'tokens-studio': new RegExp(`^${escape(PATHS.export)}/(?:README\\.md|tokens-studio/.+\\.json)$`),
  figma: new RegExp(`^${escape(PATHS.export)}/figma/${BRAND}/[a-z-]+\\.json$`),
};

describe('the registry', () => {
  test('registers every target once', () => {
    expect(TARGETS).toEqual(['css', 'tailwind', 'ts', 'runtime', 'manifest', 'swift', 'xcassets', 'fonts', 'tokens-studio', 'figma']);
    expect(new Set(FORMATS.map((f) => f.target)).size).toBe(FORMATS.length);
    expect(Object.keys(TARGET_PATHS)).toEqual([...TARGETS]);
  });

  test('each target writes only inside its own part of the owned roots; the union is sorted and verifies', async () => {
    const input = await miniInput();
    const union: string[] = [];
    for (const target of TARGETS) {
      const { files, diagnostics } = renderAll(input, [target]);
      expect(diagnostics, target).toEqual([]);
      // The mini fixture has no brand.json, so it bundles and serves no font; every other target writes.
      if (target === 'fonts') expect(files, target).toEqual([]);
      else expect(files.length, target).toBeGreaterThan(0);
      for (const f of files) {
        expect(f.path, target).toMatch(TARGET_PATHS[target] ?? /$^/);
        expect(ownerOf(f.path, OWNED_ROOTS), f.path).not.toBeNull();
      }
      union.push(...files.map((f) => f.path));
    }
    const { files, diagnostics } = renderAll(input);
    expect(diagnostics).toEqual([]);
    expect(files.map((f) => f.path)).toEqual([...union].sort());
    // A resolver without brand, platform or modality modifiers still verifies (cascade, tables, names).
    expect(verifyAll(input, files)).toEqual([]);
  }, 60_000);

  test('the web outputs of the mini fixture match their snapshots', async () => {
    const web = renderAll(await miniInput()).files.filter((f) => f.path.startsWith(`${WEB_OUTPUT_ROOT}/`));
    expect(web.map((f) => f.path.slice(WEB_OUTPUT_ROOT.length + 1))).toEqual([
      'default/tokens.css', 'default/tokens.ts', 'manifest.json', 'motion.css', 'runtime.ts', 'tailwind.css',
    ]);
    for (const f of web) {
      const name = f.path.slice(WEB_OUTPUT_ROOT.length + 1).replace(/\//g, '__');
      await expect(typeof f.contents === 'string' ? f.contents : '').toMatchFileSnapshot(`__snapshots__/mini/${name}.snap`);
    }
  }, 60_000);
});
