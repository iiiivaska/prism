// The rows of the parity report: every spec, read through the P2-1 loader so `spec:validate` and
// `parity:report` see the same files, the same parse result and the same lines (ADR-0006 rule 1).
//
// Only the header a parity cell needs is read here — name, layer, `specVersion` and the `platforms`
// block. Everything else about a spec is `spec:validate`'s business, and a header this module cannot
// use is reported with a pointer to it rather than re-validated.
import { posix } from 'node:path';
import type { Diagnostic, SourceReader } from '../tokens/api.ts';
import { error } from '../tokens/ir/diagnostics.ts';
import { loadSpec, type SpecDoc } from '../spec/load.ts';
import { COMPONENTS_DIR, LAYERS, PATTERNS_DIR, PLATFORMS, SUPPORT, type Layer, type Platform, type Support } from './config.ts';

export interface SpecRow {
  /** Repository-relative POSIX path. */
  readonly file: string;
  readonly name: string;
  readonly layer: Layer;
  readonly specVersion: number;
  /** Every platform of PLATFORMS; a spec that declares none of them never becomes a row. */
  readonly platforms: ReadonlyMap<Platform, Support>;
  readonly doc: SpecDoc;
}

export interface SpecReadResult {
  /** Every spec file read, in the order read: components, then patterns. */
  readonly files: readonly string[];
  /** The rows the report can print, sorted by layer and then name. */
  readonly specs: readonly SpecRow[];
  readonly diagnostics: readonly Diagnostic[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The YAML files of a spec directory, in name order (the listing `spec:validate` walks). */
export function specFiles(reader: SourceReader, dir: string): string[] {
  return reader
    .list(dir)
    .filter((e) => !e.dir && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')))
    .map((e) => posix.join(dir, e.name));
}

const VALIDATE = 'run `pnpm spec:validate`: the parity report reads a spec header it validates';

export function readSpecs(reader: SourceReader): SpecReadResult {
  const files: string[] = [];
  const specs: SpecRow[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const file of [...specFiles(reader, COMPONENTS_DIR), ...specFiles(reader, PATTERNS_DIR)]) {
    files.push(file);
    const doc = loadSpec(file, reader.readText(file));
    for (const problem of doc.problems) {
      diagnostics.push(error('spec/parse', problem.message, { file, line: problem.line, hint: VALIDATE }));
    }
    if (doc.value === null) continue;
    const row = header(doc, doc.value, diagnostics);
    if (row !== null) specs.push(row);
  }

  specs.sort((a, b) => LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { files, specs, diagnostics };
}

function header(doc: SpecDoc, spec: Record<string, unknown>, diagnostics: Diagnostic[]): SpecRow | null {
  const file = doc.path;
  const fallback = posix.basename(file).replace(/\.ya?ml$/, '');
  const bad = (field: string, message: string, hint = VALIDATE): null => {
    diagnostics.push(error('parity/header', message, { file, line: doc.lineOf([field]), hint }));
    return null;
  };

  const name = spec['name'];
  if (typeof name !== 'string' || name === '') return bad('name', '`name` is missing or not a string');

  const layer = spec['layer'];
  if (typeof layer !== 'string') return bad('layer', `${name} has no \`layer\``);
  if (!(LAYERS as readonly string[]).includes(layer)) {
    // ADR-0012 rule 2: the report refuses a layer it cannot route to a manifest.
    diagnostics.push(error('parity/layer', `${name} declares the unknown layer \`${layer}\``, {
      file, line: doc.lineOf(['layer']), hint: `use one of ${LAYERS.join(', ')} (ADR-0012)`,
    }));
    return null;
  }

  const specVersion = spec['specVersion'];
  if (typeof specVersion !== 'number' || !Number.isInteger(specVersion) || specVersion < 1) {
    return bad('specVersion', `${name} has no integer \`specVersion\` of 1 or more`);
  }

  const declared = spec['platforms'];
  if (!isRecord(declared)) return bad('platforms', `${name} has no \`platforms\` block`);
  const platforms = new Map<Platform, Support>();
  for (const platform of PLATFORMS) {
    const support = declared[platform];
    if (typeof support === 'string' && (SUPPORT as readonly string[]).includes(support)) {
      platforms.set(platform, support as Support);
      continue;
    }
    diagnostics.push(error('parity/header', `${name} does not declare \`platforms.${platform}\` as ${SUPPORT.join(', ')}`, {
      file, line: doc.lineOf(['platforms']), hint: VALIDATE,
    }));
  }
  if (platforms.size === 0) return null;
  if (name !== fallback) {
    diagnostics.push(error('parity/header', `\`name: ${name}\` does not match the file name ${fallback}`, {
      file, line: doc.lineOf(['name']), hint: 'the manifests key components by `name`, so the two must agree',
    }));
  }
  return { file, name, layer: layer as Layer, specVersion, platforms, doc };
}
