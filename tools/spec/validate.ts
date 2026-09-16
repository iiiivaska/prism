// spec:validate (roadmap P2-1; ADR-0006, ADR-0022 rules 8 and 9, ADR-0023 rule 9, ADR-0024 §5 and
// rule 7, ADR-0029 §2.5 and §3.3, ADR-0030 §8 and rule 10).
//
// Every spec/components/*.yaml (and spec/patterns/*.yaml once spec/pattern.schema.json exists) is
// checked against its JSON Schema and against the built token dictionary:
//
//   spec/parse                   the file does not parse, or does not round-trip through `yaml`
//   spec/schema                  a JSON Schema error
//   spec/file-name               `name` does not match the file name
//   spec/unknown-part            `tokens` binds a part that `anatomy` does not declare
//   spec/no-schema               a pattern spec exists but spec/pattern.schema.json does not
//   matrix/axis                  a binding matrix mixes axes, or uses a key from none
//   binding/unknown              a bound token path is in no permutation of the dictionary
//   binding/not-bindable         a `ref.*` path, or a `sys` category ADR-0024 §5.3 does not bind
//   binding/foreign-comp         another component's comp token
//   comp/orphan                  a comp token of this component that its spec does not bind
//   comp/no-spec                 a comp group with no spec file
//   prose/unknown                a token path in behavior, accessibility, usage or notes that does not resolve
//   category/unclassified        a sys category that is neither in the schema regex nor in NON_BINDABLE
//   haptic/unknown               a haptics binding that spec/haptics.yaml does not declare
//   example/light-glass-backdrop light glass over something other than an image or a map
//   example/vivid-unit           a vivid example whose hero carries the unit (V3)
//   example/vivid-icon           a vivid example that sets an icon (ADR-0022 rule 8)
//   example/tinted-scheme        a `tinted` example that does not declare light only
//   example/vivid-grid           a 2×2 whose diagonals are not one slot pair
//
// Token paths resolve through tools/tokens/api.ts `lookup()`, the same name grammar the rest of the
// tooling uses; nothing here re-implements resolution.
//
//   node spec/validate.ts               check this repository
//   node spec/validate.ts --root <dir>  check another tree with the same layout
//   node spec/validate.ts --json        print the diagnostics as JSON instead of a report
//
// Fixtures run through `runSpecValidate({ reader })` with an overlay of the repository, so a case
// holds only the spec files its defect touches (tools/spec/test-support.ts).
//
// Exit codes: 0 every spec is valid, 1 a diagnostic, 2 usage or layout error.
import { appendFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import type { ValidateFunction } from 'ajv';
import { parse as parseYaml } from 'yaml';
import {
  collectBundle, fsReader, lookup, LookupError, REPO_ROOT,
  type CollectResult, type Diagnostic, type IRBundle, type SourceReader,
} from '../tokens/api.ts';
// `error` and `sortDiagnostics` are the diagnostic constructors the token pipeline uses; api.ts
// re-exports only the printers, so the shared shape comes from the module itself (ARCHITECTURE §4.2).
import { error, formatDiagnostics, formatDiagnosticsJson, sortDiagnostics } from '../tokens/ir/diagnostics.ts';
import { walkBindings } from './bindings.ts';
import {
  COMPONENT_SCHEMA, COMPONENTS_DIR, compGroup, HAPTICS, LIGHT_GLASS_BACKDROPS,
  LIGHT_GLASS_MATERIALS, LIGHT_ONLY_VARIANTS, NON_BINDABLE, PATTERN_SCHEMA, PATTERNS_DIR, VIVID_SLOT_PAIRS,
} from './config.ts';
import { loadSpec, type JsonPath, type SpecDoc } from './load.ts';
import { proseTokenPaths } from './prose.ts';
import { bindableCategories, compileSchema, errorMessage, pointerToPath, SchemaShapeError } from './schema.ts';

export interface SpecValidateOptions {
  /** Tree to read; default: the repository. Ignored when `reader` is given. */
  readonly root?: string;
  readonly reader?: SourceReader;
  /** Repository-relative resolver path; default tokens/prism.resolver.json. */
  readonly resolver?: string;
  /** A dictionary already collected from the same reader (tests build it once). */
  readonly collected?: CollectResult;
}

export interface SpecValidateResult {
  /** Every spec file read, repository-relative, in the order checked. */
  readonly files: readonly string[];
  readonly diagnostics: readonly Diagnostic[];
}

export function passed(result: SpecValidateResult): boolean {
  return result.diagnostics.length === 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function yamlFiles(reader: SourceReader, dir: string): string[] {
  return reader
    .list(dir)
    .filter((e) => !e.dir && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')))
    .map((e) => posix.join(dir, e.name));
}

/** The `sys` categories the dictionary holds. */
function categoriesOf(ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    if (!id.startsWith('sys.')) continue;
    const category = id.split('.')[1];
    if (category !== undefined) out.add(category);
  }
  return out;
}

/** `comp.<group>` → the ids the dictionary holds under it. */
function compGroups(ids: Iterable<string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of ids) {
    if (!id.startsWith('comp.')) continue;
    const group = id.split('.')[1];
    if (group === undefined) continue;
    const known = out.get(group);
    if (known === undefined) out.set(group, [id]);
    else known.push(id);
  }
  return out;
}

export async function runSpecValidate(opts: SpecValidateOptions = {}): Promise<SpecValidateResult> {
  const reader = opts.reader ?? fsReader(opts.root ?? REPO_ROOT);
  const diagnostics: Diagnostic[] = [];
  const files: string[] = [];

  const collected = opts.collected ?? (await collectBundle({ reader, resolver: opts.resolver }));
  const bundle = collected.bundle;
  if (bundle === null) {
    // Without a dictionary no path can be resolved; the token build's own diagnostics say why.
    return { files, diagnostics: sortDiagnostics(collected.diagnostics) };
  }
  const ids = new Set(bundle.permutations.values().next().value?.tokens.keys() ?? []);

  let validateComponent: ValidateFunction;
  let bindable: Set<string>;
  try {
    const text = reader.readText(COMPONENT_SCHEMA);
    validateComponent = compileSchema(text, COMPONENT_SCHEMA);
    bindable = bindableCategories(text, COMPONENT_SCHEMA);
  } catch (e) {
    const message = e instanceof SchemaShapeError || e instanceof Error ? e.message : String(e);
    return { files, diagnostics: [error('spec/schema', message, { file: COMPONENT_SCHEMA, hint: 'the component schema must compile and keep the token-path alternation of ADR-0024 §5.3' })] };
  }

  // ADR-0024 §5.3: every sys category is bindable or non-bindable, and a new one is classified in the
  // change that adds it.
  for (const category of [...categoriesOf(ids)].sort()) {
    const isBindable = bindable.has(category);
    const isNonBindable = NON_BINDABLE.includes(category);
    if (isBindable && isNonBindable) {
      diagnostics.push(error('category/unclassified', `sys.${category} is both in the schema's token-path regex and in NON_BINDABLE`, {
        file: COMPONENT_SCHEMA, hint: `remove "${category}" from one of them`,
      }));
    } else if (!isBindable && !isNonBindable) {
      diagnostics.push(error('category/unclassified', `sys.${category} is neither spec-bindable nor listed in NON_BINDABLE (ADR-0024 §5.3)`, {
        file: COMPONENT_SCHEMA,
        hint: `add "${category}" to $defs/tokenPath's alternation, or to NON_BINDABLE in tools/spec/config.ts`,
      }));
    }
  }

  const haptics = loadHaptics(reader, HAPTICS, diagnostics);

  const specs: { doc: SpecDoc; value: Record<string, unknown> }[] = [];
  for (const path of yamlFiles(reader, COMPONENTS_DIR)) {
    files.push(path);
    const doc = loadSpec(path, reader.readText(path));
    for (const problem of doc.problems) {
      diagnostics.push(error('spec/parse', problem.message, { file: path, line: problem.line, hint: 'the spec must parse and round-trip as plain YAML' }));
    }
    if (doc.value === null) continue;
    specs.push({ doc, value: doc.value });
  }

  const patternFiles = yamlFiles(reader, PATTERNS_DIR);
  let validatePattern: ValidateFunction | null = null;
  if (patternFiles.length > 0) {
    if (reader.exists(PATTERN_SCHEMA)) {
      try {
        validatePattern = compileSchema(reader.readText(PATTERN_SCHEMA), PATTERN_SCHEMA);
      } catch (e) {
        diagnostics.push(error('spec/schema', e instanceof Error ? e.message : String(e), { file: PATTERN_SCHEMA }));
      }
    } else {
      for (const path of patternFiles) {
        diagnostics.push(error('spec/no-schema', `${PATTERN_SCHEMA} does not exist, so this pattern is unchecked`, {
          file: path, line: 1, hint: `add ${PATTERN_SCHEMA} with the pattern ticket (spec/patterns/README.md)`,
        }));
      }
    }
  }
  for (const path of patternFiles) {
    files.push(path);
    const doc = loadSpec(path, reader.readText(path));
    for (const problem of doc.problems) {
      diagnostics.push(error('spec/parse', problem.message, { file: path, line: problem.line, hint: 'the pattern must parse and round-trip as plain YAML' }));
    }
    if (doc.value !== null && validatePattern !== null) schemaDiagnostics(validatePattern, doc, doc.value, diagnostics);
  }

  const bound = new Map<string, Set<string>>();
  const categories = categoriesOf(ids);
  for (const { doc, value } of specs) {
    schemaDiagnostics(validateComponent, doc, value, diagnostics);
    checkSpec(doc, value, { bundle, bindable, categories, haptics, diagnostics, bound });
  }

  checkCompTokens(specs, compGroups(ids), bound, collected, diagnostics);
  return { files, diagnostics: sortDiagnostics(diagnostics) };
}

/** The haptic ids spec/haptics.yaml declares; null when the file is absent or unreadable. */
function loadHaptics(reader: SourceReader, path: string, diagnostics: Diagnostic[]): Set<string> | null {
  if (!reader.exists(path)) return null;
  let parsed: unknown;
  try {
    parsed = parseYaml(reader.readText(path)) as unknown;
  } catch (e) {
    diagnostics.push(error('spec/parse', e instanceof Error ? e.message : String(e), { file: path }));
    return null;
  }
  const table = isRecord(parsed) ? parsed['haptics'] : undefined;
  if (!isRecord(table)) {
    diagnostics.push(error('spec/parse', 'the haptics registry has no `haptics` mapping', { file: path, hint: 'declare each id under `haptics:`' }));
    return null;
  }
  return new Set(Object.keys(table));
}

function schemaDiagnostics(validate: ValidateFunction, doc: SpecDoc, value: Record<string, unknown>, diagnostics: Diagnostic[]): void {
  if (validate(value)) return;
  for (const e of validate.errors ?? []) {
    // `oneOf` repeats what its branches already said.
    if (e.keyword === 'oneOf' || e.keyword === 'if') continue;
    const at = pointerToPath(e.instancePath);
    diagnostics.push(error('spec/schema', errorMessage(e), {
      file: doc.path, line: doc.lineOf(at), hint: 'see spec/SCHEMA.md for the field and spec/component.schema.json for its shape',
    }));
  }
}

interface SpecContext {
  readonly bundle: IRBundle;
  readonly bindable: ReadonlySet<string>;
  /** The sys categories the dictionary holds; the first segment of a prose candidate. */
  readonly categories: ReadonlySet<string>;
  readonly haptics: ReadonlySet<string> | null;
  readonly diagnostics: Diagnostic[];
  /** comp group → the ids its spec binds. */
  readonly bound: Map<string, Set<string>>;
}

function checkSpec(doc: SpecDoc, spec: Record<string, unknown>, ctx: SpecContext): void {
  const { diagnostics } = ctx;
  const name = typeof spec['name'] === 'string' ? spec['name'] : '';
  const base = posix.basename(doc.path).replace(/\.ya?ml$/, '');
  if (name !== '' && name !== base) {
    diagnostics.push(error('spec/file-name', `\`name: ${name}\` does not match the file name ${base}`, {
      file: doc.path, line: doc.lineOf(['name']), hint: `rename the file to ${name}.yaml, or the spec to ${base}`,
    }));
  }
  const group = compGroup(name === '' ? base : name);
  const own = ctx.bound.get(group) ?? new Set<string>();
  ctx.bound.set(group, own);

  const anatomy = new Set(
    (Array.isArray(spec['anatomy']) ? spec['anatomy'] : [])
      .map((p) => (isRecord(p) && typeof p['part'] === 'string' ? p['part'] : ''))
      .filter((p) => p !== ''),
  );
  const { bindings, problems, parts } = walkBindings(spec);
  for (const problem of problems) {
    diagnostics.push(error('matrix/axis', problem.message, { file: doc.path, line: doc.lineOf(problem.at), hint: problem.hint }));
  }
  for (const part of parts) {
    if (anatomy.has(part.name)) continue;
    diagnostics.push(error('spec/unknown-part', `\`tokens.${part.name}\` binds a part that anatomy does not declare`, {
      file: doc.path, line: doc.lineOf(part.at), hint: `add \`- part: ${part.name}\` to anatomy, or bind the part that carries it`,
    }));
  }

  for (const binding of bindings) {
    const where = { file: doc.path, line: doc.lineOf(binding.at) };
    const segments = binding.path.split('.');
    const head = segments[0] ?? '';
    if (head === 'ref') {
      diagnostics.push(error('binding/not-bindable', `\`${binding.path}\` is a ref token; specs bind sys roles and their own comp tokens (ADR-0024 §5.2)`, {
        ...where, hint: 'bind the sys role that aliases it, or add a comp token for the choice',
      }));
      continue;
    }
    if (head === 'sys') {
      diagnostics.push(error('binding/not-bindable', `\`${binding.path}\` carries the sys prefix; a spec writes the public path`, {
        ...where, hint: `write \`${segments.slice(1).join('.')}\``,
      }));
      continue;
    }
    if (head === 'comp') {
      const other = segments[1] ?? '';
      if (other !== group) {
        diagnostics.push(error('binding/foreign-comp', `\`${binding.path}\` belongs to comp.${other}, not to this spec's comp.${group}`, {
          ...where, hint: `bind the sys role it aliases, or a comp.${group}.* token of this component`,
        }));
        continue;
      }
    } else if (!ctx.bindable.has(head)) {
      diagnostics.push(error('binding/not-bindable', `sys.${head} is not a spec-bindable category (ADR-0024 §5.3)`, {
        ...where, hint: `bind a category the schema's token-path regex lists, or reach ${head} through a comp.${group}.* token`,
      }));
      continue;
    }
    const hits = resolveIds(ctx.bundle, binding.path);
    if (hits.length === 0) {
      diagnostics.push(error('binding/unknown', `\`${binding.path}\` is in no permutation of the built dictionary`, {
        ...where, hint: suggestion(ctx.bundle, binding.path),
      }));
      continue;
    }
    // `lookup` falls back to `ref.<name>` (ADR-0024 §13.2), which a public path must never reach:
    // `gradient.vivid.orchid` is a reference gradient, not the `gradient.vivid.*` role a spec binds.
    const outside = hits.filter((id) => !id.startsWith('sys.') && !id.startsWith(`comp.${group}.`));
    if (outside.length > 0) {
      diagnostics.push(error('binding/not-bindable', `\`${binding.path}\` resolves to ${outside.join(', ')}, which is not a sys role of this spec's tier`, {
        ...where, hint: `bind the sys role of the same name, or a comp.${group}.* token of this component (ADR-0024 §5.2)`,
      }));
      continue;
    }
    for (const id of hits) if (id.startsWith('comp.')) own.add(id);
  }

  const haptics = spec['haptics'];
  if (isRecord(haptics) && ctx.haptics !== null) {
    for (const [key, value] of Object.entries(haptics)) {
      if (typeof value !== 'string' || ctx.haptics.has(value)) continue;
      diagnostics.push(error('haptic/unknown', `\`${value}\` is not in the haptics registry`, {
        file: doc.path, line: doc.lineOf(['haptics', key]), hint: 'bind an id spec/haptics.yaml declares',
      }));
    }
  }

  for (const hit of proseTokenPaths(spec, ctx.categories)) {
    if (resolveIds(ctx.bundle, hit.text).length > 0) continue;
    diagnostics.push(error('prose/unknown', `prose names \`${hit.text}\`, which resolves to no token`, {
      file: doc.path, line: doc.lineOf(hit.at), hint: suggestion(ctx.bundle, hit.text),
    }));
  }

  checkExamples(doc, spec, diagnostics);
}

/** Ids for a public path or glob; [] when nothing matches. Resolution itself is tools/tokens's. */
function resolveIds(bundle: IRBundle, path: string): readonly string[] {
  try {
    return lookup(bundle, path);
  } catch (e) {
    if (e instanceof LookupError) return [];
    throw e;
  }
}

/** `lookup`'s own nearest-name suggestions, as the diagnostic's fix. */
function suggestion(bundle: IRBundle, path: string): string {
  try {
    lookup(bundle, path);
  } catch (e) {
    if (e instanceof LookupError && e.suggestions.length > 0) return `did you mean ${e.suggestions.map((s) => `\`${s}\``).join(', ')}?`;
  }
  return 'name a token of the built dictionary (tokens/README.md lists them)';
}

/** The example rules ADR-0022 rule 8, ADR-0029 §2.5 and ADR-0030 §8 and rule 10 give spec:validate. */
function checkExamples(doc: SpecDoc, spec: Record<string, unknown>, diagnostics: Diagnostic[]): void {
  const examples = spec['examples'];
  if (!Array.isArray(examples)) return;
  examples.forEach((example, i) => {
    if (!isRecord(example)) return;
    const id = typeof example['id'] === 'string' ? example['id'] : String(i);
    const props = isRecord(example['props']) ? example['props'] : {};
    const material = typeof props['material'] === 'string' ? props['material'] : typeof props['variant'] === 'string' ? props['variant'] : '';
    const surface = typeof example['surface'] === 'string' ? example['surface'] : '';
    // `backdrop` on the example says what the enclosing `surface` material sits on; without one, the
    // `surface` field is the backdrop itself (`surface: map`).
    const declared = typeof example['backdrop'] === 'string' ? example['backdrop'] : surface;
    const backdrop = typeof props['backdrop'] === 'string' ? props['backdrop'] : declared;
    const at: JsonPath = ['examples', i];

    const lightGlass = LIGHT_GLASS_MATERIALS.includes(material) || LIGHT_GLASS_MATERIALS.includes(surface);
    if (lightGlass && !LIGHT_GLASS_BACKDROPS.includes(backdrop)) {
      diagnostics.push(error('example/light-glass-backdrop', `example \`${id}\` renders light glass over ${backdrop === '' ? 'no backdrop' : `\`${backdrop}\``}`, {
        file: doc.path, line: doc.lineOf(at),
        hint: `examples render in both schemes, so light glass sits only over ${LIGHT_GLASS_BACKDROPS.join(' or ')} (ADR-0022 rule 8)`,
      }));
    }

    if (material === 'vivid' || surface === 'vivid') {
      const hero = props['hero'];
      if (isRecord(hero) && 'unit' in hero) {
        diagnostics.push(error('example/vivid-unit', `example \`${id}\` puts the metric unit in the hero on vivid`, {
          file: doc.path, line: doc.lineOf([...at, 'props', 'hero']),
          hint: 'on vivid the hero holds only the value; the unit joins the caption in the header block (ADR-0030 §8, V3)',
        }));
      }
      if (props['icon'] !== undefined && props['icon'] !== false && props['icon'] !== null) {
        diagnostics.push(error('example/vivid-icon', `example \`${id}\` sets an icon on vivid`, {
          file: doc.path, line: doc.lineOf([...at, 'props', 'icon']),
          hint: 'a vivid example draws no icon ring: the gradient is the accent, and no pair checks a ring on it (ADR-0022 rule 8)',
        }));
      }
    }

    if (LIGHT_ONLY_VARIANTS.includes(material)) {
      const schemes = example['schemes'];
      const light = Array.isArray(schemes) && schemes.length === 1 && schemes[0] === 'light';
      if (!light) {
        diagnostics.push(error('example/tinted-scheme', `example \`${id}\` is \`${material}\`, which is a light-scheme look`, {
          file: doc.path, line: doc.lineOf(at), hint: 'declare `schemes: [light]` on the example (ADR-0030 §3.3)',
        }));
      }
    }

    const grid = example['grid'];
    if (Array.isArray(grid)) {
      const cells = grid.map((c) => (typeof c === 'string' ? c : String(c)));
      const [a, b, c, d] = cells;
      const diagonals = cells.length === 4 && a === d && b === c && a !== b;
      const pair = diagonals && VIVID_SLOT_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
      if (!pair) {
        diagnostics.push(error('example/vivid-grid', `example \`${id}\` lays out [${cells.join(', ')}], which is not one slot pair on its diagonals`, {
          file: doc.path, line: doc.lineOf([...at, 'grid']),
          hint: `a 2×2 alternates ${VIVID_SLOT_PAIRS.map(([x, y]) => `${x} and ${y}`).join(' or ')} on its diagonals, so it is one temperature (ADR-0029 §2.5)`,
        }));
      }
    }
  });
}

/** ADR-0024 §5.5: every comp token is bound by its component's spec, and every comp group has one. */
function checkCompTokens(
  specs: readonly { doc: SpecDoc; value: Record<string, unknown> }[],
  groups: ReadonlyMap<string, readonly string[]>,
  bound: ReadonlyMap<string, ReadonlySet<string>>,
  collected: CollectResult,
  diagnostics: Diagnostic[],
): void {
  const byGroup = new Map<string, { doc: SpecDoc; value: Record<string, unknown> }>();
  for (const spec of specs) {
    const name = typeof spec.value['name'] === 'string' ? spec.value['name'] : posix.basename(spec.doc.path).replace(/\.ya?ml$/, '');
    byGroup.set(compGroup(name), spec);
  }
  for (const [group, ids] of [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const spec = byGroup.get(group);
    if (spec === undefined) {
      const file = declaringFile(collected, group);
      diagnostics.push(error('comp/no-spec', `comp.${group} has no spec in spec/components/`, {
        ...(file === null ? {} : { file }), tokenId: `comp.${group}`,
        hint: `add the spec that binds comp.${group}.*, or delete the group (ADR-0024 §5.5)`,
      }));
      continue;
    }
    const seen = bound.get(group) ?? new Set<string>();
    for (const id of [...ids].sort()) {
      if (seen.has(id)) continue;
      diagnostics.push(error('comp/orphan', `\`${id}\` is bound by no cell of ${posix.basename(spec.doc.path)}`, {
        file: spec.doc.path, line: spec.doc.lineOf(['tokens']), tokenId: id,
        hint: 'bind it, or delete the token: a component token exists only for a choice its spec makes (ADR-0024 §5.4)',
      }));
    }
  }
}

/** The token file that declares a comp group, for a `comp/no-spec` an agent can act on. */
function declaringFile(collected: CollectResult, group: string): string | null {
  for (const doc of collected.model?.docs.values() ?? []) {
    for (const id of doc.tokens.keys()) if (id.startsWith(`comp.${group}.`)) return doc.file;
  }
  return null;
}

/** CLI entry; returns the process exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  let root = REPO_ROOT;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? '';
    if (flag === '--json') {
      json = true;
      continue;
    }
    const value = argv[i + 1];
    if (flag === '--root') {
      if (value === undefined || value.startsWith('--')) {
        console.error('spec:validate: --root needs a path');
        return 2;
      }
      root = resolve(value);
      i++;
      continue;
    }
    console.error(`spec:validate: unknown argument ${JSON.stringify(flag)}`);
    return 2;
  }

  let result: SpecValidateResult;
  try {
    result = await runSpecValidate({ root });
  } catch (e) {
    console.error(`spec:validate: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  if (json) {
    process.stdout.write(formatDiagnosticsJson(result.diagnostics));
    console.error(`spec:validate: ${result.files.length} specs, ${result.diagnostics.length} diagnostic(s)`);
    return result.diagnostics.length === 0 ? 0 : 1;
  }

  const summary = `spec:validate: ${result.files.length} specs, ${result.diagnostics.length} diagnostic(s)`;
  const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
  if (summaryFile !== undefined && summaryFile !== '') {
    const body = result.diagnostics.length === 0 ? summary : `${summary}\n\n\`\`\`\n${formatDiagnostics(result.diagnostics)}\n\`\`\``;
    try {
      appendFileSync(summaryFile, `## spec:validate\n\n${body}\n`);
    } catch (e) {
      console.error(`spec:validate: cannot append to GITHUB_STEP_SUMMARY: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (result.diagnostics.length === 0) {
    console.log(`${summary}: every binding, prose path and example holds`);
    return 0;
  }
  console.error(formatDiagnostics(result.diagnostics));
  console.error(summary);
  return 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
