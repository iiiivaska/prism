// release:pack (roadmap P3-6; ADR-0031 rule 2, ADR-0021 §11, critic C-14).
//
// What each published package would actually ship, checked before anything is published. The packer
// is the only thing that knows the answer — `files`, `.npmignore` and npm's own always-included and
// never-included lists decide the file set together, and pnpm rewrites the `workspace:` and
// `catalog:` specifiers into real ranges while it packs — so this tool packs the tarball, reads it
// back and holds it against what the documents promise:
//
//   license       ADR-0031 rule 2: every published package carries its own copy of LICENSE
//   manifest      the package.json inside the tarball: the version, the `license` field ADR-0031
//                 rule 2 names and no `workspace:` or `catalog:` specifier left for a consumer to
//                 resolve.
//                 `pnpm pack` rewrites them and `npm pack` does not, which is why the tarballs the
//                 fixtures install and the ones a release publishes are both packed with pnpm.
//   exports       every subpath of `exports` (and `style`) resolves to a file the tarball carries,
//                 `*` patterns expanded against the tarball itself. This is critic C-14's failure
//                 mode: an export map that names a file the tarball leaves out 404s in the consumer
//                 and not here.
//   spec          C-14 and agent/SKILL.md: @iiiivaska/prism-react ships spec/ — every component and
//                 pattern contract, SCHEMA.md, both JSON schemas and haptics.yaml — because the skill
//                 sends agents to node_modules/@iiiivaska/prism-react/spec/. Not spec/icons/, which
//                 pairs ids with SF Symbol names (ADR-0013 rule 5).
//   fonts         ADR-0021 §11 and ADR-0031 rule 3: every brand @iiiivaska/prism-tokens serves ships
//                 its fonts.css, its font files and the OFL text beside them.
//   conflict      no packed path looks like a sync conflict copy ("index 2.js", "SCHEMA 2.md",
//                 "README 2"): the checkout lives in iCloud-synced ~/Documents, and iCloud writes such
//                 copies beside files a build rewrites, inside the very folders `files` publishes. The
//                 builds clear dist/ and spec/ before they write (tsdown's `clean`, copy-spec.ts), but a
//                 copy can land after a build, so the tarball is where it is caught. The failure names
//                 every such file.
//
//   node release/pack.ts                 check every published package
//   node release/pack.ts --list          also print every file each tarball carries
//   node release/pack.ts --out <dir>     keep the tarballs there (the consumer fixtures install
//                                        exactly these files); without it they go to a temporary
//                                        directory and are deleted
//   node release/pack.ts --root <dir>    another tree with the same layout (a scratch clone)
//   node release/pack.ts --json          the result as JSON
//
// It never publishes and never touches the network: `pnpm pack` reads the working tree.
//
// Exit codes: 0 every check passes, 1 a check fails, 2 a usage error.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PACKAGE_LICENSE } from '../licenses/check.ts';
import { publishedPackages, REPO_ROOT, StampError } from './targets.ts';

export interface Packed {
  readonly name: string;
  readonly version: string;
  readonly dir: string;
  readonly filename: string;
  /** Every path inside the tarball, without the `package/` wrapper, sorted. */
  readonly files: readonly string[];
  /** The tarball's own size on disk. */
  readonly bytes: number;
  /** The package.json inside the tarball: what a consumer's installer reads. */
  readonly manifest: Record<string, unknown>;
}

export interface CheckRow {
  readonly package: string;
  readonly check: string;
  readonly status: 'pass' | 'fail';
  readonly detail: string;
}

export interface PackResult {
  readonly packages: readonly Packed[];
  readonly rows: readonly CheckRow[];
  readonly exitCode: number;
}

/** `<scope>-<name>-<version>.tgz`, the name both packers write. */
export function tarballName(name: string, version: string): string {
  return `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
}

/** A string field of a parsed manifest; anything else is absent. */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function tar(args: readonly string[]): string {
  return execFileSync('tar', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
}

/**
 * `pnpm pack` over one package directory, and the tarball read back. pnpm rather than npm: it is the
 * packer `pnpm publish` uses, and the only one that rewrites the `workspace:` and `catalog:`
 * specifiers a consumer's installer cannot resolve.
 */
export function packPackage(dir: string, out: string): Packed {
  mkdirSync(out, { recursive: true });
  const source = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Record<string, unknown>;
  const filename = tarballName(text(source['name']), text(source['version']));
  const tarball = join(out, filename);
  rmSync(tarball, { force: true });
  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] });
  if (!existsSync(tarball)) {
    throw new StampError(`pnpm pack wrote no ${filename} in ${out} (it wrote ${readdirSync(out).join(', ')})`);
  }
  const manifest = JSON.parse(tar(['-xzOf', tarball, 'package/package.json'])) as Record<string, unknown>;
  const files = tar(['-tzf', tarball])
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.endsWith('/'))
    .map((line) => line.replace(/^package\//u, ''))
    .sort((a, b) => a.localeCompare(b));
  return {
    name: text(manifest['name']),
    version: text(manifest['version']),
    dir,
    filename,
    files,
    bytes: statSync(tarball).size,
    manifest,
  };
}

/** `./dist/index.js` and `dist/index.js` are the same file in a tarball listing. */
function normalize(target: string): string {
  return target.replace(/^\.\//u, '');
}

/** Every file an `exports` value names, flattened through its conditions. */
export function exportTargets(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const v of value) exportTargets(v, into);
  else if (value !== null && typeof value === 'object') for (const v of Object.values(value)) exportTargets(v, into);
  return into;
}

/** A `*` in an export target stands for one or more path characters, as Node resolves it. */
function matchesTarget(target: string, files: readonly string[]): string[] {
  const path = normalize(target);
  if (!path.includes('*')) return files.includes(path) ? [path] : [];
  const re = new RegExp(`^${path.split('*').map((p) => p.replace(/[.+^${}()|[\]\\?]/gu, '\\$&')).join('(.+)')}$`, 'u');
  return files.filter((f) => re.test(f));
}

interface Rule {
  readonly check: string;
  /** Returns the detail of a pass, or throws the detail of a failure. */
  readonly run: (manifest: Record<string, unknown>, files: readonly string[]) => string;
}

class RuleFailure extends Error {}

function fail(detail: string): never {
  throw new RuleFailure(detail);
}

function need(files: readonly string[], path: string, what: string): string {
  if (!files.includes(path)) fail(`${what}: ${path} is not in the tarball`);
  return path;
}

/** How many files under a directory the tarball carries. */
function under(files: readonly string[], prefix: string): string[] {
  return files.filter((f) => f.startsWith(prefix));
}

/**
 * Whether a packed path looks like a copy a sync service wrote beside a file it could not merge: a
 * segment whose stem — the name before its last extension, or the whole name when it has none — ends in
 * a space and digits, which is how iCloud names them ("index 2.js", "index.d 2.ts", "README 2"). Every
 * segment is read, so a copied folder ("components 2/") is caught with everything inside it.
 */
export function isConflictCopy(path: string): boolean {
  return path.split('/').some((segment) => / \d+(\.[^.]*)?$/u.test(segment));
}

const EVERY_PACKAGE: readonly Rule[] = [
  {
    check: 'license',
    run: (manifest, files) => {
      need(files, 'LICENSE', 'ADR-0031 rule 2');
      // The same constant the P2-4 gate checks in the working tree, asserted here on the packed
      // tarball: Prism's license is proprietary, so the field is npm's `SEE LICENSE IN <filename>`.
      if (manifest['license'] !== PACKAGE_LICENSE) {
        fail(`ADR-0031 rule 2: "license" is ${JSON.stringify(manifest['license'])}, not ${JSON.stringify(PACKAGE_LICENSE)}`);
      }
      return `LICENSE shipped, "license": ${JSON.stringify(PACKAGE_LICENSE)}`;
    },
  },
  {
    check: 'manifest',
    run: (manifest, files) => {
      need(files, 'package.json', 'the packer');
      // `pnpm pack` and `pnpm publish` rewrite these; `npm pack` leaves them, and npm then refuses to
      // install the tarball ("Unsupported URL Type \"workspace:\"").
      const unresolved: string[] = [];
      for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
        const deps = manifest[field];
        if (deps === undefined || deps === null || typeof deps !== 'object') continue;
        for (const [name, range] of Object.entries(deps as Record<string, unknown>)) {
          if (typeof range === 'string' && /^(workspace|catalog):/u.test(range)) unresolved.push(`${field}.${name} ${range}`);
        }
      }
      if (unresolved.length > 0) fail(`a consumer's installer cannot resolve ${unresolved.join(', ')}; pack with pnpm, not npm`);
      return 'package.json shipped, every specifier resolved';
    },
  },
  {
    check: 'exports',
    run: (manifest, files) => {
      const map = manifest['exports'];
      if (map === undefined || map === null || typeof map !== 'object') fail('no `exports` map');
      const subpaths = Object.entries(map as Record<string, unknown>);
      let resolved = 0;
      for (const [subpath, value] of subpaths) {
        for (const target of exportTargets(value)) {
          const hits = matchesTarget(target, files);
          if (hits.length === 0) fail(`${subpath} → ${target} resolves to nothing in the tarball (critic C-14)`);
          resolved += hits.length;
        }
      }
      const style = manifest['style'];
      if (typeof style === 'string' && matchesTarget(style, files).length === 0) {
        fail(`"style": ${style} is not in the tarball`);
      }
      return `${String(subpaths.length)} subpaths → ${String(resolved)} files`;
    },
  },
  {
    check: 'conflict',
    run: (_manifest, files) => {
      const copies = files.filter(isConflictCopy);
      if (copies.length > 0) {
        const named = copies.map((f) => JSON.stringify(f)).join(', ');
        const what = copies.length === 1 ? 'looks like a sync conflict copy' : 'look like sync conflict copies';
        fail(`${named} ${what} ("<name> <n>.<ext>"), which no build writes: delete and rebuild, or pack from a clean clone`);
      }
      return `no conflict copy among ${String(files.length)} file(s)`;
    },
  },
];

const PER_PACKAGE: Readonly<Record<string, readonly Rule[]>> = {
  '@iiiivaska/prism-tokens': [
    {
      check: 'fonts',
      run: (_manifest, files) => {
        const brands = [...new Set(under(files, 'src/generated/').map((f) => f.split('/')[2] ?? ''))].filter(
          (brand) => brand !== '' && under(files, `src/generated/${brand}/`).length > 0 && !brand.includes('.'),
        );
        if (brands.length === 0) fail('no brand folder under src/generated/');
        const detail: string[] = [];
        for (const brand of brands) {
          const fonts = under(files, `src/generated/${brand}/fonts/`);
          need(files, `src/generated/${brand}/fonts/fonts.css`, `ADR-0021 §11 (${brand})`);
          const faces = fonts.filter((f) => f.endsWith('.woff2'));
          if (faces.length === 0) fail(`ADR-0021 §11: ${brand} ships no .woff2 face`);
          for (const face of faces) {
            const ofl = `${face.slice(0, face.lastIndexOf('/'))}/OFL.txt`;
            need(files, ofl, `ADR-0031 rule 3 (${brand})`);
          }
          detail.push(`${brand}: ${String(faces.length)} face(s)`);
        }
        return detail.join(', ');
      },
    },
  ],
  '@iiiivaska/prism-react': [
    {
      check: 'spec',
      run: (_manifest, files) => {
        need(files, 'spec/SCHEMA.md', 'critic C-14');
        need(files, 'spec/component.schema.json', 'critic C-14');
        need(files, 'spec/pattern.schema.json', 'critic C-14');
        need(files, 'spec/haptics.yaml', 'critic C-14');
        const components = under(files, 'spec/components/').filter((f) => f.endsWith('.yaml'));
        const patterns = under(files, 'spec/patterns/').filter((f) => f.endsWith('.yaml'));
        if (components.length === 0) fail('critic C-14: no component spec in the tarball');
        if (patterns.length === 0) fail('critic C-14: no pattern spec in the tarball');
        const icons = under(files, 'spec/icons/');
        if (icons.length > 0) fail(`ADR-0013 rule 5: spec/icons/ must not ship (${String(icons.length)} file(s))`);
        return `${String(components.length)} component + ${String(patterns.length)} pattern spec(s), no spec/icons/`;
      },
    },
  ],
};

/** The rules for one package, against the tarball it packed. */
export function checkPacked(packed: Packed): CheckRow[] {
  const rules = [...EVERY_PACKAGE, ...(PER_PACKAGE[packed.name] ?? [])];
  return rules.map((rule) => {
    try {
      return { package: packed.name, check: rule.check, status: 'pass' as const, detail: rule.run(packed.manifest, packed.files) };
    } catch (e) {
      if (e instanceof RuleFailure) return { package: packed.name, check: rule.check, status: 'fail' as const, detail: e.message };
      throw e;
    }
  });
}

export interface PackArgs {
  readonly root: string;
  readonly out: string | null;
  readonly list: boolean;
  readonly json: boolean;
}

export const USAGE = 'usage: node release/pack.ts [--out <dir>] [--list] [--root <dir>] [--json]';

export function parseArgs(argv: readonly string[]): PackArgs | string {
  let root = REPO_ROOT;
  let out: string | null = null;
  let list = false;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') list = true;
    else if (a === '--json') json = true;
    else if (a === '--out' || a === '--root') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--out') out = resolve(v);
      else root = resolve(v);
    } else return `unknown argument ${a ?? ''}`;
  }
  return { root, out, list, json };
}

export function runPack(args: PackArgs): PackResult {
  const packages = publishedPackages(args.root);
  const out = args.out ?? mkdtempSync(join(tmpdir(), 'prism-pack-'));
  const packed: Packed[] = [];
  const rows: CheckRow[] = [];
  try {
    for (const p of packages) {
      const dir = join(args.root, p.dir);
      if (!existsSync(join(dir, 'dist'))) {
        throw new StampError(`${p.name} is not built: run \`pnpm -r build\` before packing (no ${p.dir}/dist)`);
      }
      const one = packPackage(dir, out);
      packed.push(one);
      rows.push(...checkPacked(one));
    }
  } finally {
    if (args.out === null) rmSync(out, { recursive: true, force: true });
  }
  return { packages: packed, rows, exitCode: rows.some((r) => r.status === 'fail') ? 1 : 0 };
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

export function render(result: PackResult, list: boolean): string[] {
  const lines: string[] = [];
  for (const p of result.packages) {
    lines.push(`${p.name}@${p.version} → ${p.filename}: ${String(p.files.length)} file(s), ${String(Math.round(p.bytes / 1024))} kB packed`);
    if (list) for (const f of p.files) lines.push(`    ${f}`);
    for (const row of result.rows.filter((r) => r.package === p.name)) {
      lines.push(`  ${row.status === 'pass' ? 'pass' : 'FAIL'}  ${row.check.padEnd(8)} ${row.detail}`);
    }
  }
  return lines;
}

export function main(argv: readonly string[], io: Io = defaultIo): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`release:pack: ${args}\n${USAGE}`);
    return 2;
  }
  let result: PackResult;
  try {
    result = runPack(args);
  } catch (e) {
    if (e instanceof StampError) {
      io.err(`release:pack: ${e.message}`);
      return 1;
    }
    throw e;
  }
  if (args.json) io.out(JSON.stringify(result, null, 2));
  else for (const line of render(result, args.list)) io.out(line);
  for (const row of result.rows.filter((r) => r.status === 'fail')) io.err(`release:pack: ${row.package} ${row.check}: ${row.detail}`);
  return result.exitCode;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));

/** The brands `@iiiivaska/prism-tokens` serves, from the generated folders in the working tree. */
export function brandsIn(root: string = REPO_ROOT): string[] {
  const dir = join(root, 'web/packages/tokens/src/generated');
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
