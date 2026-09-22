// Writes the three generated sources of the Apple showcase (docs/showcase.md §1).
//
//   node showcase/apple/generate.ts            write swift/Showcase/Sources/DSShowcase/Generated
//   node showcase/apple/generate.ts --check    compare only; exit 1 on any difference
//
// The writer owns `GENERATED_ROOT` and nothing else: it writes changed bytes, deletes files it no
// longer produces inside that root, and never touches anything outside it. `catalog.test.ts` runs the
// same comparison under `pnpm -r test`, so a spec, a manifest or a token that moves without a
// regenerate fails on ubuntu, with no simulator and no Xcode.
import { REPO_ROOT } from '../../tokens/ir/bundle.ts';
import { fsReader } from '../../tokens/source/reader.ts';
import { writeOutputs } from '../../tokens/output/write.ts';
import { GENERATED_ROOT, renderCatalogs } from './catalog.ts';

export const USAGE = 'usage: node showcase/apple/generate.ts [--check] [--root <dir>]';

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

const defaultIo: Io = { out: (l) => console.log(l), err: (l) => console.error(l) };

export function main(argv: readonly string[], io: Io = defaultIo): number {
  let check = false;
  let root = REPO_ROOT;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') check = true;
    else if (a === '--root') {
      const v = argv[i + 1];
      if (v === undefined) {
        io.err(`showcase: --root needs a value\n${USAGE}`);
        return 2;
      }
      root = v;
      i++;
    } else {
      io.err(`showcase: unknown argument ${a ?? ''}\n${USAGE}`);
      return 2;
    }
  }

  const reader = fsReader(root);
  const { files, problems } = renderCatalogs(reader);
  if (problems.length > 0) {
    for (const problem of problems) io.err(`showcase: ${problem}`);
    return 1;
  }

  const report = writeOutputs(files, { root, owned: [GENERATED_ROOT], check });
  const changed = report.added.length + report.changed.length + report.removed.length;
  if (check) {
    if (changed === 0) {
      io.out(`showcase: ${report.unchanged} generated file(s) are current`);
      return 0;
    }
    for (const path of report.added) io.err(`showcase: missing  ${path}`);
    for (const path of report.changed) io.err(`showcase: stale    ${path}`);
    for (const path of report.removed) io.err(`showcase: orphaned ${path}`);
    io.err('showcase: run `pnpm showcase:apple --generate`');
    return 1;
  }
  io.out(`showcase: wrote ${changed} file(s), ${report.unchanged} unchanged, under ${GENERATED_ROOT}`);
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
