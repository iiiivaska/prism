// `pnpm showcase:apple` — write the Xcode project, build the app, install and launch it.
//
//   node showcase/apple/run.ts                      regenerate, build for the iPhone 17 simulator, launch
//   node showcase/apple/run.ts --platform macos     the same on the Mac, and open the built app
//   node showcase/apple/run.ts --generate           only regenerate the catalogues (what CI checks)
//   node showcase/apple/run.ts --print-project      write the project and stop
//   node showcase/apple/run.ts --no-launch          build only
//
//   --device <name>        simulator to run on (default: iPhone 17)
//   --work <dir>           derived data and resolved packages (default: a temporary directory)
//
// Everything expensive stays here: CI compiles `DSShowcase` inside the package it already builds, and boots a
// simulator for this app only in the `showcase-apps` job, which runs this script when a person dispatches `ci`
// with that input (docs/showcase.md §5).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../../tokens/ir/bundle.ts';
import { APP_NAME, BUNDLE_ID, writeProject } from './project.ts';
import { main as generate } from './generate.ts';

export const USAGE =
  'usage: node showcase/apple/run.ts [--platform ios|macos] [--device <name>] [--generate] [--print-project] [--no-launch] [--check] [--work <dir>] [--root <dir>]';

export interface Args {
  readonly root: string;
  readonly platform: 'ios' | 'macos';
  readonly device: string;
  readonly generateOnly: boolean;
  readonly printProject: boolean;
  readonly launch: boolean;
  readonly check: boolean;
  readonly work: string | null;
}

export function parseArgs(argv: readonly string[]): Args | string {
  let root = REPO_ROOT;
  let platform: 'ios' | 'macos' = 'ios';
  let device = 'iPhone 17';
  let generateOnly = false;
  let printProject = false;
  let launch = true;
  let check = false;
  let work: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--generate') generateOnly = true;
    else if (a === '--print-project') printProject = true;
    else if (a === '--no-launch') launch = false;
    else if (a === '--check') check = true;
    else if (a === '--platform' || a === '--device' || a === '--work' || a === '--root') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return `${a} needs a value`;
      i++;
      if (a === '--platform') {
        if (v !== 'ios' && v !== 'macos') return `--platform is ios or macos, got ${JSON.stringify(v)}`;
        platform = v;
      } else if (a === '--device') device = v;
      else if (a === '--work') work = v;
      else root = v;
    } else return `unknown argument ${a ?? ''}`;
  }
  return { root, platform, device, generateOnly, printProject, launch, check, work };
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

function run(command: string, args: readonly string[]): string {
  return execFileSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function main(argv: readonly string[], io: Io = defaultIo): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    io.err(`showcase:apple: ${args}\n${USAGE}`);
    return 2;
  }

  const code = generate(args.check ? ['--check', '--root', args.root] : ['--root', args.root], io);
  if (code !== 0) return code;
  if (args.generateOnly || args.check) return 0;

  const project = writeProject(args.root);
  io.out(`showcase:apple: project ${project}`);
  if (args.printProject) return 0;

  const work = args.work ?? mkdtempSync(join(tmpdir(), 'prism-showcase-'));
  mkdirSync(work, { recursive: true });
  const derived = join(work, 'DerivedData');
  // A device is named, or identified by UDID when two simulators share a name (an iPhone 17 per OS version).
  const isUdid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(args.device);
  const destination = args.platform === 'macos'
    ? 'platform=macOS'
    : `platform=iOS Simulator,${isUdid ? 'id' : 'name'}=${args.device}`;

  execFileSync(
    'xcodebuild',
    [
      'build',
      '-project', project,
      '-scheme', APP_NAME,
      '-configuration', 'Debug',
      '-destination', destination,
      '-derivedDataPath', derived,
      '-clonedSourcePackagesDirPath', join(work, 'SourcePackages'),
      '-skipMacroValidation',
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );

  const products = join(derived, 'Build', 'Products');
  const app = args.platform === 'macos'
    ? join(products, 'Debug', `${APP_NAME}.app`)
    : join(products, 'Debug-iphonesimulator', `${APP_NAME}.app`);
  if (!existsSync(app)) {
    io.err(`showcase:apple: xcodebuild reported success but ${app} is not there`);
    return 1;
  }
  io.out(`showcase:apple: built ${app}`);
  if (!args.launch) return 0;

  if (args.platform === 'macos') {
    run('open', [app]);
    io.out(`showcase:apple: opened ${APP_NAME}`);
    return 0;
  }

  // `boot` fails when the device is already booted, which is not a failure of this script.
  try {
    run('xcrun', ['simctl', 'boot', args.device]);
  } catch {
    io.out(`showcase:apple: ${args.device} is already booted`);
  }
  run('xcrun', ['simctl', 'install', args.device, app]);
  run('xcrun', ['simctl', 'launch', args.device, BUNDLE_ID]);
  io.out(`showcase:apple: launched ${BUNDLE_ID} on ${args.device}`);
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
