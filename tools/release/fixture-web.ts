// The Vite consumer fixture (roadmap P3-6; agent/SKILL.md "Setting up a consuming app", critic C-14).
//
// `fixtures/vite-app/` is an ordinary Vite app that installs Prism the way a consumer does — from the
// tarballs npm would publish, not from the workspace. This script is what builds it:
//
//   1. `release:pack` (this repository's packer, the same one the release workflow runs) for @iiiivaska/prism-tokens
//      and @iiiivaska/prism-react;
//   2. a copy of the fixture in a work directory, with the two `file:` specifiers pointing at those
//      tarballs;
//   3. `npm install` — which resolves the peers and the runtime dependencies from the registry, the
//      way a consumer's install does;
//   4. `vite build` — every package subpath the app names is resolved through the packed `exports`
//      map, so a subpath the tarball leaves out fails here (C-14);
//   5. `node smoke.mjs` — the built page in Chromium: the tokens applied, the bundled font loaded and
//      the runtime switched the scheme.
//
//   node release/fixture-web.ts                      pack and build
//   node release/fixture-web.ts --tarballs <dir>     use the tarballs already in <dir>
//   node release/fixture-web.ts --work <dir>         build there (default: a temporary directory)
//   node release/fixture-web.ts --skip-smoke         stop after `vite build`
//
// The workspace link is deliberately not used: a symlinked package resolves subpaths against the
// source tree, so a file the tarball leaves out still resolves and the fixture would prove nothing.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { packPackage } from './pack.ts';
import { publishedPackages, REPO_ROOT, StampError } from './targets.ts';

export const FIXTURE_DIR = 'fixtures/vite-app';

/** The packages the fixture installs, and the `file:` specifier each one replaces. */
export const INSTALLED: readonly string[] = ['@iiiivaska/prism-tokens', '@iiiivaska/prism-react'];

export interface FixtureWebArgs {
  readonly root: string;
  readonly tarballs: string | null;
  readonly work: string | null;
  readonly skipSmoke: boolean;
}

export const USAGE = 'usage: node release/fixture-web.ts [--tarballs <dir>] [--work <dir>] [--skip-smoke] [--root <dir>]';

export function parseArgs(argv: readonly string[]): FixtureWebArgs | string {
  let root = REPO_ROOT;
  let tarballs: string | null = null;
  let work: string | null = null;
  let skipSmoke = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skip-smoke') skipSmoke = true;
    else if (a === '--tarballs' || a === '--work' || a === '--root') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--tarballs') tarballs = resolve(v);
      else if (a === '--work') work = resolve(v);
      else root = resolve(v);
    } else return `unknown argument ${a ?? ''}`;
  }
  return { root, tarballs, work, skipSmoke };
}

/** `<scope>-<name>-<version>.tgz`, the name a packed tarball carries. */
function tarballName(name: string, version: string): string {
  return `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
}

function run(command: string, args: readonly string[], cwd: string): void {
  execFileSync(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
}

export interface FixtureWebResult {
  readonly work: string;
  readonly tarballs: readonly string[];
  readonly dist: string;
}

export function build(args: FixtureWebArgs): FixtureWebResult {
  const fixture = join(args.root, FIXTURE_DIR);
  if (!existsSync(join(fixture, 'package.json'))) throw new StampError(`${FIXTURE_DIR} is not there`);
  const work = args.work ?? mkdtempSync(join(tmpdir(), 'prism-fixture-web-'));
  mkdirSync(work, { recursive: true });

  // The fixture is copied, never built in place: the repository keeps sources, not node_modules.
  for (const entry of readdirSync(fixture)) cpSync(join(fixture, entry), join(work, entry), { recursive: true });

  const packages = publishedPackages(args.root).filter((p) => INSTALLED.includes(p.name));
  if (packages.length !== INSTALLED.length) throw new StampError(`the workspace does not publish all of ${INSTALLED.join(', ')}`);
  const tarballs: string[] = [];
  for (const p of packages) {
    const version = p.version ?? '';
    const expected = tarballName(p.name, version);
    if (args.tarballs === null) {
      if (!existsSync(join(args.root, p.dir, 'dist'))) {
        throw new StampError(`${p.name} is not built: run \`pnpm -r build\` before the fixture`);
      }
      packPackage(join(args.root, p.dir), work);
    } else {
      const source = join(args.tarballs, expected);
      if (!existsSync(source)) throw new StampError(`${source} is not there: pack with \`pnpm release:pack --out ${args.tarballs}\``);
      cpSync(source, join(work, expected));
    }
    tarballs.push(expected);
  }

  // The two `file:` specifiers become the tarballs this run packed, so the lockfile-free install in a
  // work directory is reproducible and names the version it installed.
  const manifestPath = join(work, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { dependencies?: Record<string, string> };
  for (const p of packages) manifest.dependencies = { ...manifest.dependencies, [p.name]: `file:./${tarballName(p.name, p.version ?? '')}` };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  run('npm', ['install', '--no-audit', '--no-fund'], work);
  run('npm', ['run', 'build'], work);
  if (!args.skipSmoke) run('node', ['smoke.mjs'], work);
  return { work, tarballs, dist: join(work, 'dist') };
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

export function main(argv: readonly string[], io: Io = defaultIo): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`fixture-web: ${args}\n${USAGE}`);
    return 2;
  }
  try {
    const result = build(args);
    io.out(`fixture-web: installed ${result.tarballs.join(', ')}`);
    io.out(`fixture-web: built ${result.dist}`);
    return 0;
  } catch (e) {
    io.err(`fixture-web: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
