// tokens:normalize (ARCHITECTURE §7.13, §14 P1-4; ADR-0023 rule 3): the hex and spring-fallback rules
// on the repository and on the tampered fixtures. Each `fixtures/tampered-*/` tree holds a tampered
// `tokens/` (and `brands/`) and, under `expected/`, the reviewed bytes `--write` must produce.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { checkText, fixText, main, normalizeSources, REPO_ROOT, sourceFiles, type Io } from './normalize.ts';
import { fsReader, memoryReader } from './source/reader.ts';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));
const CLI = fileURLToPath(new URL('./normalize.ts', import.meta.url));
const temps: string[] = [];

afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A writable copy of a fixture's tokens/ and brands/ trees. */
function copyFixture(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `prism-normalize-${name}-`));
  temps.push(dir);
  for (const sub of ['tokens', 'brands']) {
    const from = join(FIXTURES, name, sub);
    if (existsSync(from)) cpSync(from, join(dir, sub), { recursive: true });
  }
  return dir;
}

interface Run { readonly code: number; readonly out: string[]; readonly err: string[] }

function run(...argv: string[]): Run {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = { out: (l) => out.push(l), err: (l) => err.push(l), write: (root, file, text) => writeFileSync(join(root, file), text) };
  return { code: main(argv, io), out, err };
}

function bytes(root: string, files: readonly string[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f, readFileSync(join(root, f), 'utf8')]));
}

const HEX_FILES = ['brands/acme/brand.tokens.json', 'tokens/ref/color.tokens.json', 'tokens/sys/composite.tokens.json'];
const SPRING_FILES = ['tokens/ref/motion.tokens.json', 'tokens/sys/motion/reduced.tokens.json'];

const HEX_REPORT = [
  'tokens/ref/color.tokens.json:16  /ref/color/stale/$value/hex  "#5c6068" → "#5c6069"',
  'tokens/ref/color.tokens.json:21  /ref/color/missing/$value/hex  "#ffffff" → (missing)',
  'tokens/ref/color.tokens.json:42  /ref/color/upper/$root/$value/hex  "#f39444" → "#F39444"',
  'tokens/sys/composite.tokens.json:33  /sys/shadow/raised/$value/1/color/hex  "#000000" → "#010101"',
  'tokens/sys/composite.tokens.json:69  /sys/gradient/orchid/$value/1/color/hex  "#f39544" → "#f39444"',
  'tokens/sys/composite.tokens.json:87  /sys/border/ink/$value/color/hex  "#0a0c08" → (missing)',
  'brands/acme/brand.tokens.json:16  /ref/color/accent/500/$value/hex  "#f39444" → "#f39445"',
];

const SPRING_REPORT = [
  'tokens/ref/motion.tokens.json:38  /ref/motion/spring/interactive/$value/duration  {"value":220,"unit":"ms"} → "{ref.motion.duration.base}"',
  'tokens/ref/motion.tokens.json:60  /ref/motion/spring/snappy/$value/duration/value  487 → 488',
  'tokens/ref/motion.tokens.json:74  /ref/motion/spring/snappy/$extensions/app.prism/spring/settle  0.487 → 0.488',
  'tokens/ref/motion.tokens.json:94  /ref/motion/spring/smooth/$extensions/app.prism/spring/settle  0.587 → (missing)',
  'tokens/ref/motion.tokens.json:105  /ref/motion/spring/sheet/$value/duration/value  404 → 0.404',
  'tokens/ref/motion.tokens.json:106  /ref/motion/spring/sheet/$value/duration/unit  "ms" → "s"',
  'tokens/ref/motion.tokens.json:109  /ref/motion/spring/sheet/$value/delay/value  0 → 10',
  'tokens/sys/motion/reduced.tokens.json:10  /sys/motion/spring/snappy/$value/duration/value  367 → 250',
  'tokens/sys/motion/reduced.tokens.json:22  /sys/motion/spring/snappy/$extensions/app.prism/spring/settle  0.367 → (missing)',
];

describe('the repository', () => {
  it('has nothing stale: every authored hex and spring fallback equals the normalizer', () => {
    const report = normalizeSources(fsReader(REPO_ROOT));
    expect(report.problems).toEqual([]);
    expect(report.stale).toEqual([]);
    expect(report.colors.length).toBeGreaterThan(100);
    // five ref springs and the four reduced overrides (ADR-0023 §3, §8.2)
    expect(report.springs).toBeGreaterThanOrEqual(9);
    expect(report.files).toContain('tokens/sys/motion/reduced.tokens.json');
    expect(report.files.every((f) => f.endsWith('.tokens.json') && !f.startsWith('tokens/export/'))).toBe(true);
  });

  it('`pnpm tokens:normalize --check` reports nothing: --check wins over the script\'s --write', () => {
    const r = spawnSync(process.execPath, [CLI, '--write', '--check'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^tokens:normalize: \d+ colors and \d+ springs in \d+ files are normalized\n$/);
    expect(r.stderr).toBe('');
  });
});

describe.each([
  ['tampered-hex', HEX_FILES, HEX_REPORT, '7 stale values in 3 files'],
  ['tampered-spring', SPRING_FILES, SPRING_REPORT, '9 stale values in 2 files'],
])('%s', (name, files, report, summary) => {
  it('--check exits 1 and prints file:line, pointer, expected and actual for every stale value', () => {
    const r = run('--check', '--root', join(FIXTURES, name));
    expect(r.code).toBe(1);
    expect(r.out).toEqual(report);
    expect(r.err).toEqual([`tokens:normalize: ${summary} (expected → actual); run \`pnpm tokens:normalize\` to rewrite them`]);
  });

  it('--check wins over --write: nothing is written', () => {
    const root = copyFixture(name);
    const before = bytes(root, files);
    const r = run('--write', '--check', '--root', root);
    expect(r.code).toBe(1);
    expect(bytes(root, files)).toEqual(before);
  });

  it('--write rewrites exactly the stale values and leaves every other byte unchanged', () => {
    const root = copyFixture(name);
    const r = run('--write', '--root', root);
    expect(r.code).toBe(0);
    expect(r.err).toEqual([]);
    expect(bytes(root, files)).toEqual(bytes(join(FIXTURES, name, 'expected'), files));
  });

  it('a second run is a no-op', () => {
    const root = copyFixture(name);
    expect(run('--write', '--root', root).code).toBe(0);
    const after = bytes(root, files);
    const mtimes = files.map((f) => statSync(join(root, f)).mtimeMs);
    const check = run('--check', '--root', root);
    expect(check.code).toBe(0);
    expect(check.out).toEqual([expect.stringMatching(/ are normalized$/)]);
    const again = run('--write', '--root', root);
    expect(again.code).toBe(0);
    expect(again.out).toEqual([expect.stringMatching(/are normalized; nothing to rewrite$/)]);
    expect(bytes(root, files)).toEqual(after);
    expect(files.map((f) => statSync(join(root, f)).mtimeMs)).toEqual(mtimes);
  });
});

describe('walk', () => {
  it('reads tokens/**/*.tokens.json and brands/*/brand.tokens.json only (flavors under tokens/export are *.json)', () => {
    const files = sourceFiles(fsReader(join(FIXTURES, 'tampered-hex')));
    expect(files).toEqual(['tokens/ref/color.tokens.json', 'tokens/sys/composite.tokens.json', 'brands/acme/brand.tokens.json']);
  });

  it('checks color sub-values of shadows, gradients and borders, and skips aliased colors', () => {
    const r = normalizeSources(fsReader(join(FIXTURES, 'tampered-hex')));
    expect(r.colors.map((c) => c.pointer)).toContain('/sys/shadow/raised/$value/0/color');
    expect(r.colors.map((c) => c.pointer)).toContain('/sys/gradient/orchid/$value/1/color');
    expect(r.colors.map((c) => c.pointer)).toContain('/sys/border/ink/$value/color');
    expect(r.colors.map((c) => c.tokenId)).not.toContain('sys.border.focus');
  });

  it('reports what it cannot fix instead of rewriting it', () => {
    const bad = checkText('t.tokens.json', JSON.stringify({
      a: { $type: 'color', $value: { colorSpace: 'cmyk', components: [0, 0, 0], hex: '#000000' } },
      s: {
        $type: 'transition',
        $value: '{ref.motion.spring.snappy}',
        $extensions: { 'app.prism': { spring: { duration: 0.35, bounce: 0.15, settle: 0.487 } } },
      },
      n: { $type: 'transition', $value: {}, $extensions: { 'app.prism': { spring: { duration: 0.35, bounce: 1.2 } } } },
    }, null, 2));
    expect(bad.stale).toEqual([]);
    expect(bad.problems.map((p) => `${p.pointer ?? ''}: ${p.message}`)).toEqual([
      '/a/$value: unknown colorSpace "cmyk"; cannot compute hex',
      '/s/$value: a spring needs a literal transition $value (spring/fallback); cannot rewrite its fallback',
      '/n/$extensions/app.prism/spring: spring needs a positive duration and a bounce in [0, 1); cannot compute the settle',
    ]);
  });

  it('skips a file with invalid JSON or duplicate keys and says so', () => {
    const broken = checkText('t.tokens.json', '{ "a": { "$value": 1, "$value": 2 } }');
    expect(broken.problems).toEqual([expect.objectContaining({ file: 't.tokens.json', line: 1, message: expect.stringMatching(/duplicate key "\$value".*not checked$/) as unknown })]);
    expect(checkText('t.tokens.json', '{ "a": ').problems.length).toBeGreaterThan(0);
  });

  it('fixText is idempotent and keeps authored number spellings', () => {
    const text = '{\n  "c": {\n    "$value": { "colorSpace": "srgb", "components": [0.0, 1.0, 0.0], "alpha": 1.0, "hex": "#00ff01" }\n  }\n}\n';
    const once = fixText(text, checkText('t.tokens.json', text).stale);
    expect(once).toBe(text.replace('#00ff01', '#00ff00'));
    expect(fixText(once, checkText('t.tokens.json', once).stale)).toBe(once);
  });

  it('works over any SourceReader', () => {
    const reader = memoryReader({
      'tokens/a.tokens.json': JSON.stringify({ a: { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 1, hex: '#ffffff' } } }),
      'brands/x/brand.tokens.json': '{}',
      'brands/y/brand.json': '{}',
    });
    const r = normalizeSources(reader);
    expect(r.files).toEqual(['tokens/a.tokens.json', 'brands/x/brand.tokens.json']);
    expect(r.stale).toEqual([]);
  });
});

describe('CLI usage', () => {
  it.each([
    [[], /pass --check or --write/],
    [['--check', '--nope'], /unknown argument --nope/],
    [['--check', '--root'], /--root needs a directory/],
    [['--check', '--root', join(FIXTURES, 'does-not-exist')], /no tokens\/\*\*\/\*\.tokens\.json under/],
  ])('%j exits 2', (argv, message) => {
    const r = run(...argv);
    expect(r.code).toBe(2);
    expect(r.err.join('\n')).toMatch(message);
  });
});
