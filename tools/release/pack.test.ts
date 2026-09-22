// release:pack (roadmap P3-6): what each published package would ship is what ADR-0028, ADR-0021 §11
// and critic C-14 promise. The rules run against synthetic file lists, and once against this
// repository — that last case needs the packages built (`pnpm -r build`), the way the visual-regression
// fixture does; the `web` CI job builds before it tests.
import { describe, expect, test } from 'vitest';
import { checkPacked, exportTargets, main, parseArgs, runPack, tarballName, type Io, type Packed } from './pack.ts';
import { REPO_ROOT } from './targets.ts';

function packed(name: string, files: readonly string[], manifest: Record<string, unknown> = MANIFEST): Packed {
  return {
    name,
    version: '0.2.0',
    dir: `/tmp/${name}`,
    filename: `${name}.tgz`,
    files: [...files].sort((a, b) => a.localeCompare(b)),
    bytes: files.length,
    manifest,
  };
}

const MANIFEST = {
  license: 'MIT',
  exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' }, './package.json': './package.json' },
};

const BASE = ['LICENSE', 'package.json', 'dist/index.js', 'dist/index.d.ts'];

const status = (rows: readonly { check: string; status: string; detail: string }[], check: string) =>
  rows.find((r) => r.check === check);

describe('every published package', () => {
  test('carries its own LICENSE and says MIT (ADR-0028 rule 2)', () => {
    expect(status(checkPacked(packed('p', BASE)), 'license')?.status).toBe('pass');
    const noLicense = checkPacked(packed('p', ['package.json', 'dist/index.js', 'dist/index.d.ts']));
    expect(status(noLicense, 'license')?.status).toBe('fail');
    expect(status(noLicense, 'license')?.detail).toContain('ADR-0028 rule 2: LICENSE is not in the tarball');
    const notMit = checkPacked(packed('p', BASE, { ...MANIFEST, license: 'Apache-2.0' }));
    expect(status(notMit, 'license')?.detail).toContain('not "MIT"');
  });

  test('an export that names a file the tarball leaves out is the C-14 failure, caught here', () => {
    const rows = checkPacked(packed('p', ['LICENSE', 'package.json', 'dist/index.js']));
    expect(status(rows, 'exports')?.status).toBe('fail');
    expect(status(rows, 'exports')?.detail).toContain('. → ./dist/index.d.ts resolves to nothing');
    expect(status(rows, 'exports')?.detail).toContain('C-14');
  });

  test('a `*` subpath is expanded against the tarball, and needs at least one file', () => {
    const manifest = { license: 'MIT', exports: { './brands/*/tokens.css': './src/generated/*/tokens.css' } };
    const withBrands = ['LICENSE', 'package.json', 'src/generated/prism/tokens.css', 'src/generated/prism-native/tokens.css'];
    expect(status(checkPacked(packed('p', withBrands, manifest)), 'exports')?.detail).toBe('1 subpaths → 2 files');
    expect(status(checkPacked(packed('p', ['LICENSE', 'package.json'], manifest)), 'exports')?.status).toBe('fail');
  });

  test('the `style` field points into the tarball too', () => {
    const manifest = { ...MANIFEST, style: './src/generated/prism/tokens.css' };
    expect(status(checkPacked(packed('p', BASE, manifest)), 'exports')?.detail).toContain('"style"');
    expect(status(checkPacked(packed('p', BASE, manifest)), 'exports')?.status).toBe('fail');
  });

  test('a workspace: or catalog: specifier that reached the tarball is a broken install', () => {
    const manifest = {
      ...MANIFEST,
      dependencies: { 'react-aria-components': '^1.21.1' },
      peerDependencies: { '@iiiivaska/prism-tokens': 'workspace:^', react: '^19' },
      // devDependencies never reach a consumer's install, so a `catalog:` there is not a failure.
      devDependencies: { vitest: 'catalog:' },
    };
    const rows = checkPacked(packed('p', BASE, manifest));
    expect(status(rows, 'manifest')?.status).toBe('fail');
    expect(status(rows, 'manifest')?.detail).toContain('peerDependencies.@iiiivaska/prism-tokens workspace:^');
    expect(status(rows, 'manifest')?.detail).toContain('pack with pnpm, not npm');
    const resolved = { ...manifest, peerDependencies: { '@iiiivaska/prism-tokens': '^0.2.0', react: '^19' } };
    expect(status(checkPacked(packed('p', BASE, resolved)), 'manifest')?.status).toBe('pass');
  });

  test('the tarball is named the way both packers name it', () => {
    expect(tarballName('@iiiivaska/prism-tokens', '0.2.0')).toBe('iiiivaska-prism-tokens-0.2.0.tgz');
    expect(tarballName('prism', '1.0.0')).toBe('prism-1.0.0.tgz');
  });

  test('conditions and arrays in an export value are all targets', () => {
    expect(exportTargets({ types: './a.d.ts', import: ['./b.js', { default: './c.js' }] })).toEqual([
      './a.d.ts',
      './b.js',
      './c.js',
    ]);
  });
});

describe('@iiiivaska/prism-react ships the specs the skill sends agents to (C-14)', () => {
  const spec = [
    'spec/SCHEMA.md',
    'spec/component.schema.json',
    'spec/pattern.schema.json',
    'spec/haptics.yaml',
    'spec/components/Button.yaml',
    'spec/patterns/DetailScreen.yaml',
  ];

  test('passes with the whole contract and no spec/icons/', () => {
    const rows = checkPacked(packed('@iiiivaska/prism-react', [...BASE, ...spec]));
    expect(status(rows, 'spec')?.status).toBe('pass');
    expect(status(rows, 'spec')?.detail).toBe('1 component + 1 pattern spec(s), no spec/icons/');
  });

  test('fails when the component contracts are missing', () => {
    const rows = checkPacked(packed('@iiiivaska/prism-react', [...BASE, ...spec.filter((f) => !f.includes('components/'))]));
    expect(status(rows, 'spec')?.detail).toContain('no component spec in the tarball');
  });

  test('fails when spec/icons/ would ship (ADR-0013 rule 5: it names SF Symbols)', () => {
    const rows = checkPacked(packed('@iiiivaska/prism-react', [...BASE, ...spec, 'spec/icons/registry.json']));
    expect(status(rows, 'spec')?.detail).toContain('spec/icons/ must not ship');
  });
});

describe('@iiiivaska/prism-tokens ships every brand it serves (ADR-0021 §11, ADR-0028 rule 3)', () => {
  const brand = (name: string, face: string) => [
    `src/generated/${name}/tokens.css`,
    `src/generated/${name}/fonts/fonts.css`,
    `src/generated/${name}/fonts/${face}/${face}-wght.woff2`,
    `src/generated/${name}/fonts/${face}/OFL.txt`,
  ];

  test('a face beside its OFL text passes, per brand', () => {
    const files = [...BASE, ...brand('prism', 'onest'), ...brand('prism-native', 'inter')];
    const rows = checkPacked(packed('@iiiivaska/prism-tokens', files));
    expect(status(rows, 'fonts')?.status).toBe('pass');
    expect(status(rows, 'fonts')?.detail).toBe('prism-native: 1 face(s), prism: 1 face(s)');
  });

  test('a face with no OFL text beside it fails (ADR-0028 rule 3)', () => {
    const files = [...BASE, ...brand('prism', 'onest').filter((f) => !f.endsWith('OFL.txt'))];
    expect(status(checkPacked(packed('@iiiivaska/prism-tokens', files)), 'fonts')?.detail).toContain('ADR-0028 rule 3');
  });

  test('a brand with no fonts.css fails (ADR-0021 §11)', () => {
    const files = [...BASE, ...brand('prism', 'onest').filter((f) => !f.endsWith('fonts/fonts.css'))];
    expect(status(checkPacked(packed('@iiiivaska/prism-tokens', files)), 'fonts')?.detail).toContain('ADR-0021 §11');
  });
});

describe('this repository', () => {
  test('every published package would ship what the documents promise', () => {
    // Needs `pnpm -r build`: the export maps point at dist/, which the packages generate.
    const result = runPack({ root: REPO_ROOT, out: null, list: false, json: false });
    expect(result.rows.filter((r) => r.status === 'fail')).toEqual([]);
    expect(result.packages.map((p) => p.name)).toEqual([
      '@iiiivaska/prism-charts',
      '@iiiivaska/prism-react',
      '@iiiivaska/prism-tokens',
    ]);
    expect(result.exitCode).toBe(0);
  });

  test('usage errors are usage errors', () => {
    const io: Io = { out: () => undefined, err: () => undefined };
    expect(main(['--nope'], io)).toBe(2);
    expect(parseArgs(['--out'])).toBe('--out needs a value');
  });
});
