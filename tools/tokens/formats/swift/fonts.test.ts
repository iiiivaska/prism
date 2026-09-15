// Font emission (formats/fonts.ts; ADR-0021 §11, ADR-0020 §5 and §7, ARCHITECTURE §9.0): the Apple files
// equal their sources byte for byte, deduplicated, each with its OFL.txt; the web gets one woff2 and
// OFL.txt per served file and a fonts.css per brand; the woff2 encoder is deterministic (V12); a missing
// or re-pinned source file stops the build, and so does a folder that two families or two different
// OFL.txt files would share, reported as a diagnostic, never as a path written twice. Style Dictionary
// runs share a module singleton, so this file never uses test.concurrent.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { WEB_OUTPUT_ROOT } from '../../config.ts';
import { collectBundle, REPO_ROOT } from '../../ir/bundle.ts';
import { fsReader } from '../../source/reader.ts';
import type { BrandFont, BrandMeta } from '../../source/types.ts';
import { encodeWoff2, familyDir, familyKebab, renderFonts, SWIFT_FONTS_ROOT } from '../fonts.ts';
import { renderAll, type FormatInput, type OutputFile } from '../index.ts';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

async function repoInput(root: string = REPO_ROOT): Promise<FormatInput> {
  const reader = fsReader(root);
  const r = await collectBundle({ root, reader });
  if (r.bundle === null || r.model === null) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('\n'));
  return { bundle: r.bundle, model: r.model, root, reader };
}

function bytes(path: string): Buffer {
  return readFileSync(join(REPO_ROOT, path));
}

describe('the repository fonts', () => {
  test('Apple: every file a brand bundles on Apple, byte for byte, once, with its OFL.txt; nothing web-only', async () => {
    const { files, diagnostics } = renderFonts(await repoInput());
    expect(diagnostics).toEqual([]);
    const apple = files.filter((f) => f.path.startsWith(`${SWIFT_FONTS_ROOT}/`));
    expect(apple.map((f) => f.path)).toEqual([
      `${SWIFT_FONTS_ROOT}/onest/Onest[wght].ttf`, `${SWIFT_FONTS_ROOT}/onest/OFL.txt`,
      `${SWIFT_FONTS_ROOT}/jetbrains-mono/JetBrainsMono[wght].ttf`, `${SWIFT_FONTS_ROOT}/jetbrains-mono/OFL.txt`,
    ]);
    const source: Record<string, string> = {
      'onest/Onest[wght].ttf': 'brands/prism/fonts/onest/Onest[wght].ttf', 'onest/OFL.txt': 'brands/prism/fonts/onest/OFL.txt',
      'jetbrains-mono/JetBrainsMono[wght].ttf': 'brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf',
      'jetbrains-mono/OFL.txt': 'brands/prism/fonts/jetbrains-mono/OFL.txt',
    };
    for (const f of apple) {
      const rel = f.path.slice(SWIFT_FONTS_ROOT.length + 1);
      expect(Buffer.from(f.contents).equals(bytes(source[rel] ?? '')), rel).toBe(true);
    }
  }, 120_000);

  test('web: one woff2 and OFL.txt per served file in its family folder, and fonts.css with one @font-face each', async () => {
    const { files } = renderFonts(await repoInput());
    const web = files.filter((f) => f.path.startsWith(`${WEB_OUTPUT_ROOT}/`)).map((f) => f.path.slice(WEB_OUTPUT_ROOT.length + 1)).sort();
    expect(web).toEqual([
      'prism-native/fonts/fonts.css', 'prism-native/fonts/inter/OFL.txt', 'prism-native/fonts/inter/inter-wght.woff2',
      'prism/fonts/fonts.css', 'prism/fonts/jetbrains-mono/OFL.txt', 'prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2',
      'prism/fonts/onest/OFL.txt', 'prism/fonts/onest/onest-wght.woff2',
    ]);
    for (const f of files.filter((x) => x.path.endsWith('.woff2'))) {
      expect(Buffer.from(f.contents).subarray(0, 4).toString('latin1'), f.path).toBe('wOF2');
    }
    const css = String(files.find((f) => f.path === `${WEB_OUTPUT_ROOT}/prism/fonts/fonts.css`)?.contents);
    expect(css.match(/@font-face/g)?.length).toBe(2);
    expect(css).toContain('font-family: "Onest";\n  src: url("./onest/onest-wght.woff2") format("woff2");\n  font-weight: 100 900;\n  font-style: normal;\n  font-display: swap;');
    expect(css).toContain('font-family: "JetBrains Mono";\n  src: url("./jetbrains-mono/jetbrains-mono-wght.woff2") format("woff2");\n  font-weight: 100 800;');
    expect(css).toContain('sha256 966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31');
    const native = String(files.find((f) => f.path === `${WEB_OUTPUT_ROOT}/prism-native/fonts/fonts.css`)?.contents);
    expect(native).toContain('font-family: "Inter";');
    for (const text of [css, native]) {
      expect(text).not.toMatch(/https?:/);
      expect(text.endsWith('\n') && !text.endsWith('\n\n')).toBe(true);
    }
  }, 120_000);

  test('the woff2 encoder gives byte-identical output in two fresh runs (V12)', () => {
    const ttf = bytes('brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf');
    const [a] = encodeWoff2([ttf]);
    const [b] = encodeWoff2([ttf]);
    expect(a?.length).toBeGreaterThan(1000);
    expect(Buffer.from(a ?? []).equals(Buffer.from(b ?? []))).toBe(true);
  }, 120_000);

  test('paths and names', () => {
    expect(familyDir('fonts/onest/Onest[wght].ttf')).toBe('onest');
    expect(familyKebab('JetBrains Mono')).toBe('jetbrains-mono');
  });
});

describe('a broken source', () => {
  function copyRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'prism-fonts-'));
    temps.push(root);
    for (const dir of ['tokens', 'brands']) cpSync(join(REPO_ROOT, dir), join(root, dir), { recursive: true });
    return root;
  }

  test('a missing file and a file that no longer matches its sha256 are errors', async () => {
    const root = copyRoot();
    rmSync(join(root, 'brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf'));
    const inter = join(root, 'brands/prism-native/fonts/inter/InterVariable.ttf');
    writeFileSync(inter, Buffer.concat([readFileSync(inter), Buffer.from([0])]));
    const { diagnostics } = renderFonts(await repoInput(root));
    expect((diagnostics ?? []).map((d) => [d.code, d.file])).toEqual([
      ['fonts/missing-file', 'brands/prism/brand.json'],
      ['fonts/sha256', 'brands/prism-native/brand.json'],
    ]);
  }, 120_000);

  function uniquePaths(files: readonly OutputFile[]): boolean {
    return new Set(files.map((f) => f.path)).size === files.length;
  }

  test('two families in one folder are one fonts/shared-folder error, never a path written twice', async () => {
    const root = copyRoot();
    cpSync(join(root, 'brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf'), join(root, 'brands/prism/fonts/onest/JetBrainsMono[wght].ttf'));
    const brandJson = join(root, 'brands/prism/brand.json');
    writeFileSync(brandJson, readFileSync(brandJson, 'utf8').replace('"fonts/jetbrains-mono/JetBrainsMono[wght].ttf"', '"fonts/onest/JetBrainsMono[wght].ttf"'));
    const input = await repoInput(root);
    const fonts = renderFonts(input);
    expect((fonts.diagnostics ?? []).map((d) => [d.code, d.file])).toEqual([['fonts/shared-folder', 'brands/prism/brand.json']]);
    expect(fonts.diagnostics?.[0]?.message).toContain('brands/prism/fonts/onest/JetBrainsMono[wght].ttf (JetBrains Mono) lands in');
    expect(uniquePaths(fonts.files)).toBe(true);
    // The pipeline stage that used to throw "two formats write …/onest/OFL.txt".
    expect(renderAll(input, ['fonts']).diagnostics.map((d) => d.code)).toEqual(['fonts/shared-folder']);
  }, 120_000);

  test('an Apple family folder that brands share holds one OFL.txt; a different OFL.txt there is a fonts/path-collision', async () => {
    const input = await repoInput();
    const root = copyRoot();
    const prism = input.bundle.brands.get('prism');
    const onest = prism?.fonts.ui;
    if (prism === undefined || onest === undefined) throw new Error('prism has no ui font');
    // A second brand bundles the same Onest bytes at the same path and a second file of the family in
    // the same folder, both on Apple only.
    mkdirSync(join(root, 'brands/alt/fonts/onest'), { recursive: true });
    for (const name of ['Onest[wght].ttf', 'OFL.txt']) cpSync(join(root, 'brands/prism/fonts/onest', name), join(root, 'brands/alt/fonts/onest', name));
    cpSync(join(root, 'brands/prism/fonts/onest/Onest[wght].ttf'), join(root, 'brands/alt/fonts/onest/Onest-Display[wght].ttf'));
    const apple = (file: string): BrandFont => ({ ...onest, file, platforms: ['apple'] });
    const alt: BrandMeta = { ...prism, name: 'alt', fonts: { ui: apple('fonts/onest/Onest[wght].ttf'), display: apple('fonts/onest/Onest-Display[wght].ttf') } };
    const withAlt: FormatInput = { ...input, root, bundle: { ...input.bundle, brands: new Map([['prism', prism], ['alt', alt]]) } };

    const shared = renderFonts(withAlt);
    expect(shared.diagnostics).toEqual([]);
    expect(uniquePaths(shared.files)).toBe(true);
    expect(shared.files.filter((f) => f.path.startsWith(`${SWIFT_FONTS_ROOT}/onest/`)).map((f) => f.path)).toEqual([
      `${SWIFT_FONTS_ROOT}/onest/Onest[wght].ttf`, `${SWIFT_FONTS_ROOT}/onest/OFL.txt`, `${SWIFT_FONTS_ROOT}/onest/Onest-Display[wght].ttf`,
    ]);

    writeFileSync(join(root, 'brands/alt/fonts/onest/OFL.txt'), `${readFileSync(join(root, 'brands/alt/fonts/onest/OFL.txt'), 'utf8')}\n`);
    const clash = renderFonts(withAlt);
    // One diagnostic for the one differing license, although two files of the folder bring it.
    expect((clash.diagnostics ?? []).map((d) => [d.code, d.file])).toEqual([['fonts/path-collision', 'brands/alt/brand.json']]);
    expect(clash.diagnostics?.[0]?.message).toBe(
      `brands/alt/fonts/onest/OFL.txt and brands/prism/fonts/onest/OFL.txt differ, and both would be ${SWIFT_FONTS_ROOT}/onest/OFL.txt (ADR-0021 §11)`,
    );
    expect(uniquePaths(clash.files)).toBe(true);
    const license = clash.files.find((f) => f.path === `${SWIFT_FONTS_ROOT}/onest/OFL.txt`);
    expect(Buffer.from(license?.contents ?? []).equals(bytes('brands/prism/fonts/onest/OFL.txt'))).toBe(true);
  }, 120_000);
});
