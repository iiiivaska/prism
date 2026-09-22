// gallery:build (roadmap P3-5; ADR-0005 decision 1, ADR-0006 rule 4, critic C-25).
//
// Collects both stacks' snapshots into `gallery/snapshots/` and writes the index — `gallery/index.html`
// and `gallery/index.json` — pairing the two by the one name of spec/SCHEMA.md:
//
//     <Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png
//
// The images are copies of what each harness compares against, so a gallery entry and a snapshot test
// are the same picture; the copies are gitignored and the two index files are committed. `--check`
// rebuilds nothing and fails when the committed index is stale, which is what CI runs.
//
// Diagnostics fail the run: a file that does not parse under the name rule, a platform key in the wrong
// root, a snapshot of an example no spec declares, a scheme the spec does not declare. A *missing pair*
// is not a diagnostic — it is a fact about the matrix, counted here and shown on the page, and Phase 4
// lands components one stack at a time.
//
//   node gallery/build.ts                 collect and write gallery/
//   node gallery/build.ts --check         write nothing; exit 1 when the committed index is stale
//   node gallery/build.ts --root <dir>    read (and write) another tree with the same layout
//
// Exit codes: 0 written and nothing is wrong; 1 a diagnostic or a stale index; 2 a usage error.
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fsReader, REPO_ROOT } from '../tokens/api.ts';
import { formatDiagnostics, sortDiagnostics } from '../tokens/ir/diagnostics.ts';
import { collect, copyImages, type Gallery } from './collect.ts';
import { GALLERY_DIR, INDEX_HTML, INDEX_JSON, SNAPSHOTS_DIR } from './config.ts';
import { fsImages } from './images.ts';
import { renderHtml, renderJson, sourceFacts, summaryLine } from './render.ts';

export { collect, copyImages } from './collect.ts';
export { renderHtml, renderJson, sourceFacts, summaryLine } from './render.ts';

export interface BuildResult {
  readonly gallery: Gallery;
  readonly html: string;
  readonly json: string;
}

/** The whole run as values: read the tree, pair by name, render both files. Writes nothing. */
export function buildGallery(root: string): BuildResult {
  const reader = fsReader(root);
  const images = fsImages(root);
  const gallery = collect({ reader, images });
  const sources = sourceFacts(reader);
  return { gallery, html: renderHtml(gallery, sources), json: renderJson(gallery, sources) };
}

interface Args {
  root: string;
  check: boolean;
}

export function parseArgs(argv: readonly string[]): Args | string {
  const args: Args = { root: REPO_ROOT, check: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    if (flag === '--check') {
      args.check = true;
      continue;
    }
    if (flag !== '--root') return `unknown argument ${JSON.stringify(flag)}`;
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) return `${flag} needs a path`;
    args.root = resolve(value);
    i++;
  }
  return args;
}

function write(root: string, path: string, text: string): void {
  const target = join(root, ...path.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}

/** CLI entry; returns the process exit code. */
export function main(argv: readonly string[]): number {
  const args = parseArgs(argv);
  if (typeof args === 'string') {
    console.error(`gallery:build: ${args}\nusage: node gallery/build.ts [--root <dir>] [--check]`);
    return 2;
  }

  let result: BuildResult;
  try {
    result = buildGallery(args.root);
  } catch (e) {
    console.error(`gallery:build: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  const { gallery, html, json } = result;
  const diagnostics = sortDiagnostics(gallery.diagnostics);
  const summary = summaryLine(gallery);
  let stale = false;

  if (args.check) {
    const reader = fsReader(args.root);
    for (const [path, expected] of [[INDEX_HTML, html], [INDEX_JSON, json]] as const) {
      let current: string | null;
      try {
        current = reader.exists(path) ? reader.readText(path) : null;
      } catch (e) {
        console.error(`gallery:build: cannot read ${path}: ${e instanceof Error ? e.message : String(e)}`);
        return 2;
      }
      if (current !== expected) {
        stale = true;
        console.error(current === null ? `gallery:build: ${path} is missing` : `gallery:build: ${path} is stale`);
      }
    }
    if (stale) console.error('gallery:build: run pnpm gallery:build and commit the result');
  } else {
    try {
      write(args.root, INDEX_HTML, html);
      write(args.root, INDEX_JSON, json);
      const copied = copyImages(gallery, fsImages(args.root));
      console.log(`gallery:build: ${copied} image(s) → ${SNAPSHOTS_DIR}`);
    } catch (e) {
      console.error(`gallery:build: cannot write ${GALLERY_DIR}: ${e instanceof Error ? e.message : String(e)}`);
      return 2;
    }
  }

  const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
  if (summaryFile !== undefined && summaryFile !== '') {
    try {
      appendFileSync(summaryFile, `## gallery\n\n${summary}\n\nPairs: \`${INDEX_HTML}\` (uploaded as the \`gallery\` artifact).\n`);
    } catch (e) {
      console.error(`gallery:build: cannot append to GITHUB_STEP_SUMMARY: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (diagnostics.length > 0) {
    console.error(formatDiagnostics(diagnostics));
    console.error(`gallery:build: ${summary}`);
    return 1;
  }
  if (stale) {
    console.error(`gallery:build: ${summary}`);
    return 1;
  }
  console.log(`gallery:build: ${summary}${args.check ? '' : ` → ${INDEX_HTML}`}`);
  if (gallery.counts.missing > 0) {
    console.log(`gallery:build: ${gallery.counts.missing} missing image(s); the page lists them as missing, and the parity report says which stack is behind`);
  }
  return 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
