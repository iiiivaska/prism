// `tokens:build` and `tokens:check` (ARCHITECTURE §3.1, §12 rule 10, §14 P1-5): usage errors, an
// end-to-end build of the valid fixture into a temporary root (every target, fonts included: build,
// check clean, stale output detected, `--only` deletes nothing), the determinism proof over the output
// bytes, and the ADR-0020 rule 7 scan of the repository's web outputs. Style Dictionary runs share a
// module singleton, so this file never uses test.concurrent.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { synthesizeFont } from '../fonts/fixtures/synthesize.ts';
import { main, parseArgs } from './build.ts';
import { OWNED_ROOTS, WEB_BANNED_STRINGS, WEB_OUTPUT_ROOT } from './config.ts';
import { renderAll, bytesOf, type FormatInput } from './formats/index.ts';
import { collectBundle, REPO_ROOT } from './ir/bundle.ts';
import { listFiles } from './output/write.ts';
import { fsReader, type SourceReader } from './source/reader.ts';
import { FIXTURES } from './test-support.ts';

const temps: string[] = [];
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});

function capture(): { out: string[]; err: string[]; io: { out: (t: string) => void; err: (t: string) => void } } {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (t) => out.push(t), err: (t) => err.push(t) } };
}

interface FixtureFont { family: string; file: string; version: string; sha256: string }

/**
 * The valid fixture's brand.json files name font files that the fixture does not commit, with
 * placeholder sha256 values, so `tokens:build` on a plain copy stops at `fonts/missing-file`. This puts
 * a tiny synthesized font (tools/fonts/fixtures/synthesize.ts) at every path a copy's brand.json
 * names, an OFL.txt beside it, and pins the sha256 of those bytes, so the font format runs too.
 * Returns the synthesized bytes by brand-relative path.
 */
function bundleFixtureFonts(root: string): Map<string, Uint8Array> {
  const written = new Map<string, Uint8Array>();
  for (const brand of readdirSync(join(root, 'brands')).sort()) {
    const path = join(root, 'brands', brand, 'brand.json');
    const meta = JSON.parse(readFileSync(path, 'utf8')) as { fonts: Record<string, FixtureFont> };
    for (const entry of Object.values(meta.fonts)) {
      const source = `brands/${brand}/${entry.file}`;
      let bytes = written.get(source);
      if (bytes === undefined) {
        bytes = synthesizeFont({ family: entry.family, version: `Version ${entry.version}` });
        mkdirSync(dirname(join(root, source)), { recursive: true });
        writeFileSync(join(root, source), bytes);
        writeFileSync(join(root, dirname(source), 'OFL.txt'), `Copyright 2026 the ${entry.family} fixture.\nA stand-in for the SIL Open Font License 1.1 text.\n`);
        written.set(source, bytes);
      }
      entry.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    writeFileSync(path, `${JSON.stringify(meta, null, 2)}\n`);
  }
  return written;
}

describe('arguments', () => {
  test('usage errors exit 2', async () => {
    expect(parseArgs(['--only', 'nope'])).toMatch(/--only takes targets/);
    expect(parseArgs(['--check', '--only', 'css'])).toMatch(/never runs with --check/);
    expect(parseArgs(['--root'])).toMatch(/needs a value/);
    expect(parseArgs(['--frobnicate'])).toMatch(/unknown argument/);
    expect(parseArgs(['--only', 'css,tailwind', '--json'])).toMatchObject({ only: ['css', 'tailwind'], json: true, check: false });
    const c = capture();
    expect(await main(['--check', '--only', 'css'], c.io)).toBe(2);
    expect(c.err.join('')).toContain('usage: node tokens/build.ts');
  });
});

describe('an end-to-end build of the valid fixture', () => {
  test('without its font files stops at the font format and writes nothing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'prism-build-'));
    temps.push(root);
    cpSync(`${FIXTURES}valid`, root, { recursive: true });
    const c = capture();
    expect(await main(['--json', '--root', root], c.io)).toBe(1);
    const report = JSON.parse(c.out.join('')) as { diagnostics: { code: string; file: string }[] };
    expect(report.diagnostics.map((d) => [d.code, d.file])).toEqual([
      ['fonts/missing-file', 'brands/alt/brand.json'],
      ['fonts/missing-file', 'brands/prism/brand.json'],
      ['fonts/missing-file', 'brands/prism/brand.json'],
    ]);
    for (const owned of OWNED_ROOTS) expect(listFiles(root, owned), owned).toEqual([]);
  }, 120_000);

  test('builds every target, checks clean, detects stale output, and a partial build deletes nothing', async () => {
    const root = mkdtempSync(join(tmpdir(), 'prism-build-'));
    temps.push(root);
    cpSync(`${FIXTURES}valid`, root, { recursive: true });
    const fonts = bundleFixtureFonts(root);
    let c = capture();
    expect(await main(['--root', root], c.io), c.out.join('')).toBe(0);
    const summary = /^tokens:build: (\d+) files, wrote (\d+), removed 0, unchanged 0\n$/.exec(c.out.join(''));
    expect(summary, c.out.join('')).not.toBeNull();
    expect(summary?.[2]).toBe(summary?.[1]);
    const written = OWNED_ROOTS.flatMap((owned) => listFiles(root, owned));
    expect(written.length).toBe(Number(summary?.[1]));
    // Every owned root receives output (ARCHITECTURE §9.0), the font root and the web fonts included.
    for (const owned of OWNED_ROOTS) expect(listFiles(root, owned).length, owned).toBeGreaterThan(0);
    const onest = fonts.get('brands/prism/fonts/onest/Onest[wght].ttf');
    expect(onest).toBeDefined();
    expect(readFileSync(join(root, 'swift/Sources/DSTokens/Resources/Fonts/onest/Onest[wght].ttf')).equals(Buffer.from(onest ?? []))).toBe(true);
    expect(written).toEqual(expect.arrayContaining([
      `${WEB_OUTPUT_ROOT}/alt/fonts/fonts.css`, `${WEB_OUTPUT_ROOT}/alt/fonts/inter/inter-wght.woff2`,
      `${WEB_OUTPUT_ROOT}/prism/fonts/fonts.css`, `${WEB_OUTPUT_ROOT}/prism/fonts/onest/OFL.txt`,
    ]));
    c = capture();
    expect(await main(['--check', '--root', root], c.io)).toBe(0);
    expect(c.out.join('')).toContain('up to date');

    const css = join(root, WEB_OUTPUT_ROOT, 'prism/tokens.css');
    writeFileSync(css, `${readFileSync(css, 'utf8')}/* edited */\n`);
    writeFileSync(join(root, WEB_OUTPUT_ROOT, 'stray.txt'), 'x');
    unlinkSync(join(root, WEB_OUTPUT_ROOT, 'motion.css'));
    c = capture();
    expect(await main(['--check', '--json', '--root', root], c.io)).toBe(1);
    const report = JSON.parse(c.out.join('')) as { diagnostics: { code: string; file: string; message: string }[] };
    expect(report.diagnostics.map((d) => [d.code, d.file])).toEqual([
      ['output/stale', `${WEB_OUTPUT_ROOT}/motion.css`],
      ['output/stale', `${WEB_OUTPUT_ROOT}/prism/tokens.css`],
      ['output/stale', `${WEB_OUTPUT_ROOT}/stray.txt`],
    ]);

    c = capture();
    expect(await main(['--only', 'css', '--root', root], c.io)).toBe(0);
    expect(readFileSync(join(root, WEB_OUTPUT_ROOT, 'stray.txt'), 'utf8')).toBe('x');
    c = capture();
    expect(await main(['--root', root], c.io)).toBe(0);
    c = capture();
    expect(await main(['--check', '--root', root], c.io)).toBe(0);
  }, 120_000);

  test('a stale normalized value stops the build before anything is resolved', async () => {
    const root = mkdtempSync(join(tmpdir(), 'prism-build-'));
    temps.push(root);
    cpSync(`${FIXTURES}valid`, root, { recursive: true });
    const file = join(root, 'tokens/ref/color.tokens.json');
    const text = readFileSync(file, 'utf8');
    const hex = /"hex": "(#[0-9a-f]{6})"/.exec(text)?.[1];
    expect(hex).toBeDefined();
    writeFileSync(file, text.replace(`"hex": "${hex ?? ''}"`, '"hex": "#000001"'));
    const c = capture();
    expect(await main(['--root', root], c.io)).toBe(1);
    expect(c.out.join('')).toContain('normalize/stale');
    expect(c.out.join('')).toContain('run `pnpm tokens:normalize`');
  }, 60_000);
});

/** A reader that lists every directory in a shuffled order (ARCHITECTURE §12 rule 10). */
function shuffledReader(root: string, seed: number): SourceReader {
  const base = fsReader(root);
  let s = seed;
  const random = (): number => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  return {
    readText: (p) => base.readText(p),
    exists: (p) => base.exists(p),
    list: (dir) => [...base.list(dir)].sort(() => random() - 0.5),
  };
}

describe('determinism', () => {
  test('two builds with shuffled read order and another TZ and LANG give identical bytes', async () => {
    const render = async (reader: SourceReader): Promise<Map<string, string>> => {
      const r = await collectBundle({ root: REPO_ROOT, reader });
      if (r.bundle === null || r.model === null) throw new Error('the repository does not build');
      const input: FormatInput = { bundle: r.bundle, model: r.model, root: REPO_ROOT, reader };
      const out = renderAll(input);
      expect(out.diagnostics).toEqual([]);
      return new Map(out.files.map((f) => [f.path, Buffer.from(bytesOf(f)).toString('base64')]));
    };
    const first = await render(fsReader(REPO_ROOT));
    const saved = { TZ: process.env['TZ'], LANG: process.env['LANG'] };
    process.env['TZ'] = 'Asia/Tokyo';
    process.env['LANG'] = 'ru_RU.UTF-8';
    try {
      const second = await render(shuffledReader(REPO_ROOT, 7));
      expect([...second.keys()]).toEqual([...first.keys()]);
      for (const [path, bytes] of first) expect(second.get(path) === bytes, path).toBe(true);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  }, 120_000);
});

describe('the repository web outputs', () => {
  test('name no Apple font, load no remote font and carry no brand attribute (ADR-0020 rule 7)', async () => {
    const r = await collectBundle({ root: REPO_ROOT });
    if (r.bundle === null || r.model === null) throw new Error('the repository does not build');
    const reader = fsReader(REPO_ROOT);
    const files = renderAll({ bundle: r.bundle, model: r.model, root: REPO_ROOT, reader }).files.filter((f) => f.path.startsWith(`${WEB_OUTPUT_ROOT}/`));
    expect(files.map((f) => f.path.slice(WEB_OUTPUT_ROOT.length + 1))).toEqual([
      'manifest.json', 'motion.css',
      'prism-native/fonts/fonts.css', 'prism-native/fonts/inter/OFL.txt', 'prism-native/fonts/inter/inter-wght.woff2',
      'prism-native/tokens.css', 'prism-native/tokens.ts',
      'prism/fonts/fonts.css', 'prism/fonts/jetbrains-mono/OFL.txt', 'prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2',
      'prism/fonts/onest/OFL.txt', 'prism/fonts/onest/onest-wght.woff2',
      'prism/tokens.css', 'prism/tokens.ts',
      'runtime.ts', 'tailwind.css',
    ]);
    for (const f of files) {
      // woff2 is a compressed binary: it has no text to scan (formats/swift/fonts.test.ts checks it).
      if (f.path.endsWith('.woff2')) continue;
      const text = typeof f.contents === 'string' ? f.contents : new TextDecoder('utf-8', { fatal: true }).decode(f.contents);
      for (const banned of WEB_BANNED_STRINGS) expect(text.includes(banned), `${f.path} contains ${banned}`).toBe(false);
      if (f.path.endsWith('.css')) {
        for (const url of text.matchAll(/url\(\s*["']?([^"')\s]*)/g)) expect(url[1], `${f.path} loads ${url[1] ?? ''}`).toMatch(/^\.\/[^:]+$/);
      }
      // Generated text keeps the hygiene rules; OFL.txt is the upstream license, copied byte for byte.
      if (typeof f.contents !== 'string') continue;
      expect(text.endsWith('\n') && !text.endsWith('\n\n'), f.path).toBe(true);
      expect(text, f.path).not.toMatch(/[ \t]$/m);
      expect(text, f.path).not.toContain('\r');
    }
    for (const brand of ['prism', 'prism-native']) {
      const tokens = files.find((f) => f.path === `${WEB_OUTPUT_ROOT}/${brand}/tokens.css`)?.contents ?? '';
      expect(tokens).not.toContain('--ds-ref-font-apple');
    }
  }, 60_000);
});
