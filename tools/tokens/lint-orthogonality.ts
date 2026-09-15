// tokens:lint, second step: resolver orthogonality through @terrazzo/parser (ADR-0024 §9.2; ARCHITECTURE
// §3.1, §14 P1-2). `tz lint` passes a non-orthogonal resolver (ARCHITECTURE F21, F36), so this script parses
// the resolver with the parser API and requires `resolver.orthogonal === true` and
// `listPermutations().length` equal to the product of the modifiers' context counts. Terrazzo withholds
// `listPermutations` above its `permutationLimit` (1000 by default), so the limit is raised to that product.
// Terrazzo's check names no id, so the script also walks the modifier contexts of `resolver.source` and
// prints every id that two modifiers write; it fails when the walk and Terrazzo's flag disagree.
// `orthogonal`, `listPermutations`, `permutationLimit` and `source` are undocumented Terrazzo internals
// (ARCHITECTURE F36, §16.2): lint-orthogonality.test.ts fails loudly if they change. From P1-3 on,
// tokens:build is authoritative (ownership, completeness, composition; ADR-0024 §9.2).
//
//   node tokens/lint-orthogonality.ts                  the repository resolver
//   node tokens/lint-orthogonality.ts --root <dir>     <dir>/tokens/prism.resolver.json (fixtures)
//
// Exit codes: 0 orthogonal with every permutation, 1 an id written by two modifiers or a permutation-count
// mismatch, 2 a usage error or a resolver Terrazzo cannot load.

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineConfig, Logger, parse } from '@terrazzo/parser';

/** Repository-relative path of the resolver document. */
export const RESOLVER = 'tokens/prism.resolver.json';
/** Terrazzo's default `permutationLimit`. */
const TERRAZZO_DEFAULT_LIMIT = 1000;

/** One modifier with its contexts, each a list of loaded token documents (Terrazzo's normalized source). */
export interface ModifierSource {
  readonly name: string;
  readonly contexts: Readonly<Record<string, readonly unknown[]>>;
}

/** An id that more than one modifier writes, with every `modifier/context` that writes it. */
export interface Overlap {
  readonly id: string;
  readonly writers: readonly string[];
}

export interface Result {
  /** The resolver file, absolute. */
  readonly resolver: string;
  /** Terrazzo's `resolver.orthogonal`. */
  readonly orthogonal: boolean;
  /** Product of the context counts of the modifiers in `resolutionOrder`. */
  readonly expected: number;
  /** `listPermutations().length`, or undefined when Terrazzo withholds `listPermutations`. */
  readonly permutations: number | undefined;
  /** Ids that two or more modifiers write, sorted by id. */
  readonly overlaps: readonly Overlap[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Every token id of a token document or group: the dot path of each node with a `$value` (`$root` kept). */
export function tokenIds(node: unknown, path: readonly string[] = []): string[] {
  if (!isRecord(node)) return [];
  if ('$value' in node) return path.length > 0 ? [path.join('.')] : [];
  const ids: string[] = [];
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') && key !== '$root') continue;
    ids.push(...tokenIds(child, [...path, key]));
  }
  return ids;
}

/** Ids written by more than one modifier, walking every source of every context. */
export function findOverlaps(modifiers: readonly ModifierSource[]): Overlap[] {
  const writers = new Map<string, Map<string, string[]>>(); // id → modifier → contexts
  for (const modifier of modifiers) {
    for (const [context, sources] of Object.entries(modifier.contexts)) {
      for (const source of sources) {
        for (const id of tokenIds(source)) {
          let byModifier = writers.get(id);
          if (byModifier === undefined) writers.set(id, (byModifier = new Map<string, string[]>()));
          const contexts = byModifier.get(modifier.name) ?? [];
          if (!contexts.includes(context)) contexts.push(context);
          byModifier.set(modifier.name, contexts);
        }
      }
    }
  }
  const overlaps: Overlap[] = [];
  for (const [id, byModifier] of writers) {
    if (byModifier.size < 2) continue;
    overlaps.push({ id, writers: [...byModifier].flatMap(([name, contexts]) => contexts.map((c) => `${name}/${c}`)) });
  }
  return overlaps.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Product of the context counts of a resolver document's modifiers (named and inline), before parsing. */
export function contextProduct(resolverDocument: unknown): number {
  if (!isRecord(resolverDocument)) return 1;
  const counts: number[] = [];
  const named = resolverDocument['modifiers'];
  if (isRecord(named)) {
    for (const modifier of Object.values(named)) {
      if (isRecord(modifier) && isRecord(modifier['contexts'])) counts.push(Object.keys(modifier['contexts']).length);
    }
  }
  const order = resolverDocument['resolutionOrder'];
  if (Array.isArray(order)) {
    for (const item of order as unknown[]) {
      if (isRecord(item) && item['type'] === 'modifier' && isRecord(item['contexts'])) counts.push(Object.keys(item['contexts']).length);
    }
  }
  return counts.reduce((product, n) => product * n, 1);
}

/** Parses the resolver file with @terrazzo/parser (offline) and reports orthogonality, permutations and overlaps. */
export function lintOrthogonality(resolverPath: string): Promise<Result> {
  const file = pathToFileURL(resolve(resolverPath));
  return lintResolver(readFileSync(file, 'utf8'), file);
}

/** `lintOrthogonality` for resolver text; relative `$ref`s resolve against `file`. */
export async function lintResolver(src: string, file: URL): Promise<Result> {
  const limit = Math.max(TERRAZZO_DEFAULT_LIMIT, contextProduct(JSON.parse(src) as unknown));
  const logger = new Logger({ level: 'error' });
  const config = defineConfig({ tokens: [file.href], plugins: [], permutationLimit: limit }, { logger, cwd: new URL('./', file) });
  const { resolver } = await parse([{ filename: file, src }], {
    config,
    logger,
    skipLint: true,
    req: (url: URL) => {
      if (url.protocol !== 'file:') return Promise.reject(new Error(`${url.href}: only local files are read (offline lint)`));
      return Promise.resolve(readFileSync(url, 'utf8'));
    },
  });
  const modifiers: ModifierSource[] = [];
  for (const item of resolver.source.resolutionOrder) {
    if (item.type === 'modifier') modifiers.push({ name: item.name, contexts: item.contexts });
  }
  return {
    resolver: fileURLToPath(file),
    orthogonal: resolver.orthogonal,
    expected: modifiers.reduce((product, m) => product * Object.keys(m.contexts).length, 1),
    permutations: resolver.listPermutations?.().length,
    overlaps: findOverlaps(modifiers),
  };
}

/** The problems that fail the lint; empty when the resolver passes. */
export function problems(result: Result): string[] {
  const out: string[] = [];
  for (const overlap of result.overlaps) out.push(`${overlap.id} is written by ${overlap.writers.join(', ')}`);
  if (!result.orthogonal && result.overlaps.length === 0) {
    out.push('Terrazzo reports the resolver as non-orthogonal, but no id is written by two modifiers ($extends or a Terrazzo change?)');
  }
  if (result.orthogonal && result.overlaps.length > 0) {
    out.push('Terrazzo reports the resolver as orthogonal although the ids above are written by two modifiers (Terrazzo change?)');
  }
  if (result.permutations === undefined) {
    out.push(`Terrazzo withheld listPermutations for ${result.expected} permutations`);
  } else if (result.permutations !== result.expected) {
    out.push(`Terrazzo lists ${result.permutations} permutations; the context counts multiply to ${result.expected}`);
  }
  return out;
}

/** CLI entry; returns the process exit code (0 pass, 1 lint failure, 2 usage or load error). */
export async function main(argv: readonly string[]): Promise<number> {
  let root = resolve(import.meta.dirname, '..', '..');
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    const value = argv[i + 1];
    if (flag !== '--root') {
      console.error(`tokens:lint: unknown argument ${JSON.stringify(flag)}`);
      return 2;
    }
    if (value === undefined || value.startsWith('--')) {
      console.error('tokens:lint: --root needs a path');
      return 2;
    }
    root = resolve(value);
    i++;
  }
  const resolverPath = join(root, RESOLVER);
  let result: Result;
  try {
    result = await lintOrthogonality(resolverPath);
  } catch (error) {
    console.error(`tokens:lint: cannot load ${resolverPath} with @terrazzo/parser:\n${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const failures = problems(result);
  if (failures.length === 0) {
    console.log(`tokens:lint: resolver orthogonal (@terrazzo/parser), ${result.expected} permutations (${resolverPath})`);
    return 0;
  }
  for (const failure of failures) console.log(failure);
  const count = failures.length === 1 ? '1 orthogonality problem' : `${failures.length} orthogonality problems`;
  console.error(`tokens:lint: ${count} in ${resolverPath}; no id may be written by two modifiers (ADR-0024 §9)`);
  return 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
