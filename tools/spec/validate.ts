// spec:validate (roadmap P2-1 and P4-D3; ADR-0006, ADR-0022 rules 8 and 9, ADR-0023 rule 9, ADR-0024 §5 and
// rule 7, ADR-0029 §2.5 and §3.3, ADR-0030 §8 and rule 10, ADR-0032 rules 4 and 6, ADR-0036 §10, spec/SCHEMA.md).
//
// Every spec/components/*.yaml is checked against spec/component.schema.json, and every
// spec/patterns/*.yaml against spec/pattern.schema.json (which `$ref`s the component schema), and both
// against the built token dictionary. A pattern is documented like a component (ADR-0012 rule 3), so it
// takes every component check, binds `sys` roles only, resolves the token paths of its recipe
// (`layout`, `rules`, `composition`) like prose, and composes specs that exist with props they declare:
//
//   spec/parse                   the file does not parse, or does not round-trip through `yaml`
//   spec/schema                  a JSON Schema error
//   spec/file-name               `name` does not match the file name
//   spec/unknown-part            `tokens` binds a part that `anatomy` does not declare
//   spec/no-schema               a pattern spec exists but spec/pattern.schema.json does not
//   matrix/axis                  a binding matrix mixes axes, or uses a key from none
//   binding/unknown              a bound token path is in no permutation of the dictionary
//   binding/not-bindable         a `ref.*` path, or a `sys` category ADR-0024 §5.3 does not bind
//   binding/foreign-comp         another component's comp token, or any comp token in a pattern
//   comp/orphan                  a comp token of this component that its spec does not bind
//   comp/no-spec                 a comp group with no spec file
//   prose/unknown                a token path in behavior, accessibility, usage or notes (and a pattern's
//                                layout, rules or composition) that does not resolve; a word in the icon registry's
//                                label namespace (`icon.<id>`, ADR-0032 rule 6) is read as a label key first, since
//                                `icon` is a token category too, and is reported only when it is neither
//   category/unclassified        a sys category that is neither in the schema regex nor in NON_BINDABLE
//   haptic/unknown               a haptics binding that spec/haptics.yaml does not declare
//   strings/unknown              prose names a `strings.<Component>.<name>` key that spec/strings.yaml does not declare
//   strings/placeholder          a `{name}` written after a key (its English default, or a mention of one of its
//                                placeholders) that the entry does not declare; also a `{name}` in an entry's own
//                                default that its `placeholders` do not declare (ADR-0032 rule 4)
//   composition/unknown          a pattern composes a name with no spec in spec/components/ or spec/patterns/
//   composition/prop             a pattern sets a prop the composed spec does not declare, or a value its type does not allow
//   prop/boolean-name            a boolean prop whose name is not a verb of BOOLEAN_VERBS in the third person and a word
//                                after it (`isSelected`, `hasNext`, `showsClose`, `clampsOverflow`), or one that states a
//                                negation (spec/SCHEMA.md, "One meaning, one name, one polarity"); the names roadmap
//                                P4-D3 still owes, BOOLEAN_NAMES_OWED, pass until each is renamed
//   example/prop                 an example sets a prop its spec does not declare, or a value its type does not allow:
//                                a boolean, number or string of that type, one of an enum's values, an id of the icon
//                                registry for an icon (spec/SCHEMA.md, "Examples and snapshots"); a string also takes
//                                SCHEMA's image fixture, `{ fixture: portrait }` (IMAGE_FIXTURES)
//   example/light-glass-backdrop light glass over something other than an image or a map
//   example/vivid-unit           a vivid example whose hero carries the unit (V3)
//   example/vivid-icon           a vivid example that sets an icon (ADR-0022 rule 8)
//   example/tinted-scheme        a `tinted` example that does not declare light only
//   example/vivid-grid           a 2×2 whose diagonals are not one slot pair
//   glass-chip/fallback          a part whose `background` binds material.glass.chip, on the part or in a state
//                                block, does not state the chip's fallback: `fallbackBackground:
//                                color.bg.surface.raised` over `fallbackUnderlay: color.bg.page` on the part, keyed
//                                as `background` is where it binds the chip, the same cells in any state block
//                                that rebinds them, and a reduceTransparency that names both of its settings
//                                (ADR-0036 §9.1); TopBar's scroll edge is the one named exception until P4-D10
//   glass-chip/nested-blur       material.glass.chip.blur or .saturate bound under a `glass` or `glassLight` key,
//                                where a chip draws no backdrop filter (ADR-0036 §5)
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
// `lookup()`'s grammar and its nearest-name ranking over any set of ids; api.ts applies them to the dictionary only,
// and the icon registry's label keys are read with the same grammar, so no second one is written here.
import { findIds, suggest } from '../tokens/ir/lookup.ts';
import { statesOf, walkBindings } from './bindings.ts';
import {
  BACKDROPS, BOOLEAN_NAMES_OWED, BOOLEAN_NEGATIONS, BOOLEAN_VERBS, COMPONENT_SCHEMA, COMPONENTS_DIR, compGroup,
  DEFAULT_KEY, GLASS_CHIP, GLASS_CHIP_FALLBACK, GLASS_CHIP_FALLBACK_EXCEPTIONS, GLASS_CHIP_FILTERS, GLASS_CHIP_SETTINGS,
  HAPTICS, ICON_REGISTRY, IMAGE_FIXTURES, LIGHT_GLASS_BACKDROPS, LIGHT_GLASS_MATERIALS, LIGHT_ONLY_VARIANTS, MATERIALS,
  NESTED_GLASS_KEYS, NON_BINDABLE, PATTERN_SCHEMA, PATTERNS_DIR, STRINGS, VIVID_SLOT_PAIRS,
} from './config.ts';
import { loadSpec, type JsonPath, type SpecDoc } from './load.ts';
import { PATTERN_PROSE_FIELDS, PROSE_FIELDS, proseStrings, proseTokenPaths } from './prose.ts';
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
  let componentSchema: string;
  try {
    componentSchema = reader.readText(COMPONENT_SCHEMA);
    validateComponent = compileSchema(componentSchema, COMPONENT_SCHEMA);
    bindable = bindableCategories(componentSchema, COMPONENT_SCHEMA);
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
  const strings = loadStrings(reader, STRINGS, diagnostics);
  const icons = loadIcons(reader, ICON_REGISTRY, diagnostics);

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
        validatePattern = compileSchema(reader.readText(PATTERN_SCHEMA), PATTERN_SCHEMA, [{ text: componentSchema, path: COMPONENT_SCHEMA }]);
      } catch (e) {
        diagnostics.push(error('spec/schema', e instanceof Error ? e.message : String(e), {
          file: PATTERN_SCHEMA, hint: `the pattern schema must compile, with its $refs into ${COMPONENT_SCHEMA} resolving`,
        }));
      }
    } else {
      for (const path of patternFiles) {
        diagnostics.push(error('spec/no-schema', `${PATTERN_SCHEMA} does not exist, so this pattern is unchecked`, {
          file: path, line: 1, hint: `add ${PATTERN_SCHEMA} (spec/patterns/README.md)`,
        }));
      }
    }
  }
  const patterns: { doc: SpecDoc; value: Record<string, unknown> }[] = [];
  for (const path of patternFiles) {
    files.push(path);
    const doc = loadSpec(path, reader.readText(path));
    for (const problem of doc.problems) {
      diagnostics.push(error('spec/parse', problem.message, { file: path, line: problem.line, hint: 'the pattern must parse and round-trip as plain YAML' }));
    }
    // An unchecked pattern is `spec/no-schema` and nothing else: without its schema its shape is unknown.
    if (doc.value !== null && validatePattern !== null) patterns.push({ doc, value: doc.value });
  }

  const bound = new Map<string, Set<string>>();
  const categories = categoriesOf(ids);
  for (const { doc, value } of specs) {
    schemaDiagnostics(validateComponent, COMPONENT_SCHEMA, doc, value, diagnostics);
    checkSpec(doc, value, { bundle, bindable, categories, haptics, strings, icons, diagnostics, bound, kind: 'component' });
  }
  if (validatePattern !== null) {
    // A pattern may compose a component or another pattern (DashboardGrid places a DetailScreen).
    const composable = new Map<string, Record<string, unknown>>();
    for (const { doc, value } of [...specs, ...patterns]) composable.set(specName(doc, value), value);
    for (const { doc, value } of patterns) {
      schemaDiagnostics(validatePattern, PATTERN_SCHEMA, doc, value, diagnostics);
      checkSpec(doc, value, { bundle, bindable, categories, haptics, strings, icons, diagnostics, bound, kind: 'pattern' });
      checkComposition(doc, value, composable, icons, diagnostics);
    }
  }

  checkCompTokens(specs, compGroups(ids), bound, collected, diagnostics);
  return { files, diagnostics: sortDiagnostics(diagnostics) };
}

/** The spec's `name`, or its file name when `name` is missing (which the schema reports). */
function specName(doc: SpecDoc, value: Record<string, unknown>): string {
  return typeof value['name'] === 'string' && value['name'] !== '' ? value['name'] : posix.basename(doc.path).replace(/\.ya?ml$/, '');
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

/** What spec:validate reads from the icon registry (ADR-0013, ADR-0032 rule 6). */
interface IconRegistry {
  /** Every entry's id: the values a prop of `type: icon` takes. */
  readonly ids: ReadonlySet<string>;
  /** Every entry's `label`, a key of the form `icon.<id>` that prose may name and that is no token path. */
  readonly labels: ReadonlySet<string>;
  /** The first segment of every label (`icon`): a prose word there is read as a label key before a token path. */
  readonly namespaces: ReadonlySet<string>;
}

/**
 * The icon registry's ids and label keys; null when the file is absent or unreadable, and then icon values and label
 * keys go unchecked. The registry's own rules are `icons:validate`'s; this reads only what the specs name from it.
 */
function loadIcons(reader: SourceReader, path: string, diagnostics: Diagnostic[]): IconRegistry | null {
  if (!reader.exists(path)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(reader.readText(path)) as unknown;
  } catch (e) {
    diagnostics.push(error('spec/parse', e instanceof Error ? e.message : String(e), {
      file: path, hint: 'the icon registry must parse, or no icon prop and no label key can be checked; `pnpm icons:validate` checks the rest of it',
    }));
    return null;
  }
  const entries = isRecord(parsed) ? parsed['icons'] : undefined;
  if (!isRecord(entries)) {
    diagnostics.push(error('spec/parse', 'the icon registry has no `icons` mapping', { file: path, hint: 'declare each entry under `icons` (spec/icons/README.md)' }));
    return null;
  }
  const labels = new Set<string>();
  for (const entry of Object.values(entries)) if (isRecord(entry) && typeof entry['label'] === 'string') labels.add(entry['label']);
  return { ids: new Set(Object.keys(entries)), labels, namespaces: new Set([...labels].map((l) => l.split('.')[0] ?? '')) };
}

/** A strings key as a spec names it: `strings.<Component>.<name>`, the component in PascalCase (ADR-0032 rule 3). */
const STRING_KEY = /(?<![\w.])strings\.([A-Z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*)/g;
/** A key as spec/strings.yaml declares it, without the `strings.` prefix. */
const TABLE_KEY = /^[A-Z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/;
/** A `{placeholder}` in a template: the name grammar both stacks' fill accepts. */
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1] ?? ''))];
}

/**
 * The keys spec/strings.yaml declares, each with the placeholders its entry declares; null when the
 * file does not parse. An absent table declares nothing, so every key a spec names is then unknown.
 */
function loadStrings(reader: SourceReader, path: string, diagnostics: Diagnostic[]): Map<string, Set<string>> | null {
  if (!reader.exists(path)) return new Map();
  const doc = loadSpec(path, reader.readText(path));
  for (const problem of doc.problems) {
    diagnostics.push(error('spec/parse', problem.message, { file: path, line: problem.line, hint: 'the strings table must parse and round-trip as plain YAML' }));
  }
  if (doc.value === null) return null;
  const table = doc.value['strings'];
  if (!isRecord(table)) {
    diagnostics.push(error('spec/parse', 'the strings table has no `strings` mapping', { file: path, line: 1, hint: 'declare each key under `strings:` (ADR-0032 rule 4)' }));
    return null;
  }
  const out = new Map<string, Set<string>>();
  for (const [key, entry] of Object.entries(table)) {
    const line = doc.lineOf(['strings', key]);
    const template = isRecord(entry) && typeof entry['default'] === 'string' ? entry['default'] : null;
    const listed: unknown = isRecord(entry) ? entry['placeholders'] : undefined;
    const declared = Array.isArray(listed) && listed.every((p): p is string => typeof p === 'string') ? new Set<string>(listed) : null;
    if (!TABLE_KEY.test(key) || template === null || declared === null) {
      diagnostics.push(error('spec/parse', `\`${key}\` is not a strings entry`, {
        file: path, line, hint: 'write `<Component>.<name>: { default: "…", placeholders: [...] }`, the component spelled as its spec `name` (ADR-0032 rules 3 and 4)',
      }));
      continue;
    }
    for (const name of placeholdersIn(template)) {
      if (declared.has(name)) continue;
      diagnostics.push(error('strings/placeholder', `the English default of \`${key}\` fills \`{${name}}\`, which its placeholders do not declare`, {
        file: path, line, hint: `add ${name} to the entry's placeholders, or take it out of the default`,
      }));
    }
    out.set(key, declared);
  }
  return out;
}

/**
 * ADR-0032 rule 4: every `strings.<Component>.<name>` a spec names is a key of spec/strings.yaml, and
 * every `{name}` the prose writes after it - the English default written out beside the key, or a
 * mention of one of its placeholders - up to the next key or the end of that string, is a placeholder
 * the entry declares.
 */
function checkStrings(doc: SpecDoc, spec: Record<string, unknown>, table: ReadonlyMap<string, ReadonlySet<string>>, fields: readonly string[], diagnostics: Diagnostic[]): void {
  for (const { text, at } of proseStrings(spec, fields)) {
    const mentions = [...text.matchAll(STRING_KEY)];
    const reported = new Set<string>();
    mentions.forEach((m, i) => {
      const key = m[1] ?? '';
      const where = { file: doc.path, line: doc.lineOf(at) };
      const declared = table.get(key);
      if (declared === undefined) {
        if (reported.has(key)) return;
        reported.add(key);
        diagnostics.push(error('strings/unknown', `prose names \`strings.${key}\`, which ${STRINGS} does not declare`, {
          ...where, hint: `declare \`${key}\` in ${STRINGS} with its placeholders and English default, or name a key it declares (ADR-0032 rule 4)`,
        }));
        return;
      }
      const end = mentions[i + 1]?.index ?? text.length;
      for (const name of placeholdersIn(text.slice(m.index + m[0].length, end))) {
        if (declared.has(name) || reported.has(`${key}{${name}}`)) continue;
        reported.add(`${key}{${name}}`);
        diagnostics.push(error('strings/placeholder', `prose fills \`{${name}}\` in \`strings.${key}\`, which declares ${declared.size === 0 ? 'no placeholders' : [...declared].map((p) => `{${p}}`).join(', ')}`, {
          ...where, hint: `write the placeholders ${STRINGS} declares for \`${key}\`, or declare \`${name}\` there first (ADR-0032 rule 4)`,
        }));
      }
    });
  }
}

function schemaDiagnostics(validate: ValidateFunction, schema: string, doc: SpecDoc, value: Record<string, unknown>, diagnostics: Diagnostic[]): void {
  if (validate(value)) return;
  for (const e of validate.errors ?? []) {
    // `oneOf`, `anyOf` and `if` repeat what their branches already said.
    if (e.keyword === 'oneOf' || e.keyword === 'anyOf' || e.keyword === 'if') continue;
    const at = pointerToPath(e.instancePath);
    diagnostics.push(error('spec/schema', errorMessage(e), {
      file: doc.path, line: doc.lineOf(at),
      hint: schema === PATTERN_SCHEMA
        ? `see spec/patterns/README.md and spec/SCHEMA.md for the field and ${PATTERN_SCHEMA} for its shape`
        : `see spec/SCHEMA.md for the field and ${COMPONENT_SCHEMA} for its shape`,
    }));
  }
}

interface SpecContext {
  readonly bundle: IRBundle;
  readonly bindable: ReadonlySet<string>;
  /** The sys categories the dictionary holds; the first segment of a prose candidate. */
  readonly categories: ReadonlySet<string>;
  readonly haptics: ReadonlySet<string> | null;
  /** spec/strings.yaml: key → the placeholders its entry declares; null when the table does not parse. */
  readonly strings: ReadonlyMap<string, ReadonlySet<string>> | null;
  /** The icon registry's ids and label keys; null when it is absent or does not parse. */
  readonly icons: IconRegistry | null;
  readonly diagnostics: Diagnostic[];
  /** comp group → the ids its spec binds. */
  readonly bound: Map<string, Set<string>>;
  /**
   * A component owns the comp group of its name (ADR-0024 §5.2). A pattern owns none: it is a recipe
   * with no implementation (ADR-0012 rule 3), so it binds sys roles, and a value that belongs to a
   * composed component stays that component's cell.
   */
  readonly kind: 'component' | 'pattern';
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
  const group = ctx.kind === 'component' ? compGroup(name === '' ? base : name) : null;
  const own = group === null ? new Set<string>() : (ctx.bound.get(group) ?? new Set<string>());
  if (group !== null) ctx.bound.set(group, own);

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
      if (group === null) {
        diagnostics.push(error('binding/foreign-comp', `\`${binding.path}\` is a component token, and a pattern binds sys roles only`, {
          ...where, hint: `bind the sys role \`${binding.path}\` aliases; a value comp.${other} owns stays that component's cell (ADR-0012 rule 3, ADR-0024 §5.2)`,
        }));
        continue;
      }
      if (other !== group) {
        diagnostics.push(error('binding/foreign-comp', `\`${binding.path}\` belongs to comp.${other}, not to this spec's comp.${group}`, {
          ...where, hint: `bind the sys role it aliases, or a comp.${group}.* token of this component`,
        }));
        continue;
      }
    } else if (!ctx.bindable.has(head)) {
      diagnostics.push(error('binding/not-bindable', `sys.${head} is not a spec-bindable category (ADR-0024 §5.3)`, {
        ...where,
        hint: group === null
          ? "bind a category the schema's token-path regex lists; a pattern reaches no other category"
          : `bind a category the schema's token-path regex lists, or reach ${head} through a comp.${group}.* token`,
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
    const outside = hits.filter((id) => !id.startsWith('sys.') && (group === null || !id.startsWith(`comp.${group}.`)));
    if (outside.length > 0) {
      diagnostics.push(error('binding/not-bindable', `\`${binding.path}\` resolves to ${outside.join(', ')}, which is not a sys role of this spec's tier`, {
        ...where,
        hint: group === null
          ? 'bind the sys role of the same name (ADR-0024 §5.2)'
          : `bind the sys role of the same name, or a comp.${group}.* token of this component (ADR-0024 §5.2)`,
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

  const proseFields = ctx.kind === 'pattern' ? PATTERN_PROSE_FIELDS : PROSE_FIELDS;
  if (ctx.strings !== null) checkStrings(doc, spec, ctx.strings, proseFields, diagnostics);

  for (const hit of proseTokenPaths(spec, ctx.categories, proseFields)) {
    // The registry's label keys share the `icon` category's namespace and are no token paths (ADR-0032 rule 6), so a
    // word there is read as a label key first. Read as a token path alone, a key resolves to nothing, and a check that
    // cannot tell the two apart is how a key that nothing resolves went unnoticed in Icon.yaml (roadmap P4-D3 (3)).
    const icons = ctx.icons !== null && ctx.icons.namespaces.has(hit.text.split('.')[0] ?? '') ? ctx.icons : null;
    if (icons !== null && findIds(icons.labels, hit.text).length > 0) continue;
    if (resolveIds(ctx.bundle, hit.text).length > 0) continue;
    diagnostics.push(error('prose/unknown', `prose names \`${hit.text}\`, which resolves to no token${icons === null ? '' : ` and is no label key of ${ICON_REGISTRY}`}`, {
      file: doc.path, line: doc.lineOf(hit.at), hint: icons === null ? suggestion(ctx.bundle, hit.text) : labelSuggestion(ctx.bundle, icons, hit.text),
    }));
  }

  const named = name === '' ? base : name;
  checkBooleanNames(doc, spec, named, diagnostics);
  checkExampleProps(doc, spec, named, ctx.icons?.ids ?? null, diagnostics);
  checkExamples(doc, spec, diagnostics);
  checkGlassChip(doc, spec, named, diagnostics);
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

/** `lookup`'s own nearest names for a path that resolves to nothing; [] when it has none. */
function nearTokens(bundle: IRBundle, path: string): readonly string[] {
  try {
    lookup(bundle, path);
  } catch (e) {
    if (e instanceof LookupError) return e.suggestions;
  }
  return [];
}

/** `lookup`'s own nearest-name suggestions, as the diagnostic's fix. */
function suggestion(bundle: IRBundle, path: string): string {
  const near = nearTokens(bundle, path);
  return near.length > 0 ? `did you mean ${near.map((s) => `\`${s}\``).join(', ')}?` : 'name a token of the built dictionary (tokens/README.md lists them)';
}

/** The fix for a word in the label namespace that is neither a token nor a label key: the nearest of both. */
function labelSuggestion(bundle: IRBundle, icons: IconRegistry, path: string): string {
  const near = [...nearTokens(bundle, path), ...suggest(icons.labels, path)];
  const namespace = `\`${path.split('.')[0] ?? ''}.\` names a token of that category or the label key of an entry of ${ICON_REGISTRY}`;
  return near.length > 0 ? `did you mean ${near.map((s) => `\`${s}\``).join(', ')}? (${namespace})` : `name a token or a label key: ${namespace}`;
}

/** Why a boolean prop's name breaks the naming rule, and the fix. */
export interface BooleanNameProblem {
  /** Follows "boolean prop `<name>`". */
  readonly message: string;
  readonly hint: string;
}

const NAMING_RULE = 'spec/SCHEMA.md, "One meaning, one name, one polarity"';

/**
 * Whether a boolean prop's name holds spec/SCHEMA.md's "One meaning, one name, one polarity": a statement whose subject
 * is the component, so a verb of BOOLEAN_VERBS in the third person and a word after it (`isSelected`, `hasNext`,
 * `showsClose`, `clampsOverflow`), with no negation after the verb (`isNotReady`). Null when it holds. The rule's other
 * halves, one name for one meaning and one polarity across specs, are a reader's to check.
 */
export function booleanNameProblem(name: string): BooleanNameProblem | null {
  const [verb = '', ...rest] = name.split(/(?=[A-Z])/);
  if (verb === 'show' && rest.length > 0) {
    return {
      message: "opens with the imperative `show`, and the rule's verb is `shows`: a name is a statement about the component, never an instruction",
      hint: `rename it \`shows${rest.join('')}\` (${NAMING_RULE})`,
    };
  }
  if (!BOOLEAN_VERBS.includes(verb) || rest.length === 0) {
    return {
      message: `is not a verb of the rule (${BOOLEAN_VERBS.map((v) => `\`${v}…\``).join(', ')}) followed by what it says, so it does not state what is true of the component`,
      hint: `name the condition that is true, with the component as its subject: \`is<Adjective>\` for a condition (\`isSelected\`), \`has<Thing>\` for something it has or lacks (\`hasNext\`), \`shows<Part>\` for a part the flag draws (\`showsClose\`), or a behavior's own verb in the third person (\`clampsOverflow\`), which joins BOOLEAN_VERBS in tools/spec/config.ts if it is new (${NAMING_RULE})`,
    };
  }
  const negation = rest.find((word) => BOOLEAN_NEGATIONS.includes(word));
  if (negation === undefined) return null;
  return {
    message: `states a negation (\`${negation}\`)`,
    hint: `name the condition that is true (\`isReady\`, not \`isNotReady\`), and let the default say which way the component starts (${NAMING_RULE})`,
  };
}

/**
 * `prop/boolean-name`: every boolean prop a spec declares holds the naming rule, except the names roadmap P4-D3 still
 * owes (BOOLEAN_NAMES_OWED), each until the change that renames it.
 */
function checkBooleanNames(doc: SpecDoc, spec: Record<string, unknown>, name: string, diagnostics: Diagnostic[]): void {
  const props = spec['props'];
  if (!Array.isArray(props)) return;
  props.forEach((prop, i) => {
    if (!isRecord(prop) || prop['type'] !== 'boolean' || typeof prop['name'] !== 'string') return;
    const problem = booleanNameProblem(prop['name']);
    if (problem === null || BOOLEAN_NAMES_OWED.includes(`${name}.${prop['name']}`)) return;
    diagnostics.push(error('prop/boolean-name', `boolean prop \`${prop['name']}\` ${problem.message}`, {
      file: doc.path, line: doc.lineOf(['props', i, 'name']), hint: problem.hint,
    }));
  });
}

/** A spec's declared props, by name. */
function declaredProps(spec: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const declared = new Map<string, Record<string, unknown>>();
  for (const prop of Array.isArray(spec['props']) ? spec['props'] : []) {
    if (isRecord(prop) && typeof prop['name'] === 'string') declared.set(prop['name'], prop);
  }
  return declared;
}

/**
 * `example/prop`: both galleries hand an example's props to the component as written (spec/SCHEMA.md, "Examples and
 * snapshots"), so an example sets only props its spec declares, with values their types allow — what a pattern's
 * composition was already held to (roadmap P4-D3 (3)). A prop no stack can take, or a value it cannot hold, would reach
 * a story, a snapshot and the showcase on both stacks. `slot` and `data` props take the forms of "Slot content in
 * examples", and every `action` prop gets the galleries' own handler, so none of the three is read here; a `string`
 * that is an image's source takes that section's image fixture, which the galleries draw (IMAGE_FIXTURES). Whether an
 * example sets every `required` prop is a second question, which this check does not ask.
 */
function checkExampleProps(doc: SpecDoc, spec: Record<string, unknown>, name: string, icons: ReadonlySet<string> | null, diagnostics: Diagnostic[]): void {
  const examples = spec['examples'];
  if (!Array.isArray(examples)) return;
  const declared = declaredProps(spec);
  examples.forEach((example, i) => {
    if (!isRecord(example) || !isRecord(example['props'])) return;
    const id = typeof example['id'] === 'string' ? example['id'] : String(i);
    for (const [key, value] of Object.entries(example['props'])) {
      const where = { file: doc.path, line: doc.lineOf(['examples', i, 'props', key]) };
      const prop = declared.get(key);
      if (prop === undefined) {
        diagnostics.push(error('example/prop', `example \`${id}\` sets \`${key}\`, which ${name} does not declare`, {
          ...where,
          hint: declared.size === 0
            ? `${name} declares no props: declare \`${key}\` first, or take it out of the example`
            : `set one of ${[...declared.keys()].join(', ')}, or declare \`${key}\` first: no stack can take a prop its spec does not declare (spec/SCHEMA.md, "Examples and snapshots")`,
        }));
        continue;
      }
      const problem = propValueProblem(prop, value, icons);
      if (problem === null) continue;
      diagnostics.push(error('example/prop', `example \`${id}\`: \`${name}.${key}\` ${problem}`, {
        ...where, hint: `set a value ${name}'s \`${key}\` prop allows, or change the prop first (spec/SCHEMA.md, "Examples and snapshots")`,
      }));
    }
  });
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

/** One cell of a binding matrix, with the keys that reach it and what those keys are. */
interface MatrixCell {
  /** The token path the cell binds. */
  readonly path: string;
  /** Every key from the property down to the cell, as the spec writes them. */
  readonly keys: readonly string[];
  /** The keys at levels keyed by one of the spec's props, outermost first. */
  readonly props: readonly string[];
  /** The first key at a level keyed by the published material or backdrop kind; null when no level is. */
  readonly ground: string | null;
}

/**
 * Every cell of one binding. A level whose keys other than `default` are all published materials, or all
 * backdrop kinds, is keyed by the ground; a level of `default` alone is keyed by nothing; any other level is
 * keyed by a prop (spec/SCHEMA.md, "The binding-matrix grammar"; `matrix/axis` reports a level that is neither).
 */
function matrixCells(binding: unknown, keys: readonly string[] = [], props: readonly string[] = [], ground: string | null = null): MatrixCell[] {
  if (typeof binding === 'string') return [{ path: binding, keys, props, ground }];
  if (!isRecord(binding)) return [];
  const named = Object.keys(binding).filter((k) => k !== DEFAULT_KEY);
  const byGround = named.length > 0 && (named.every((k) => MATERIALS.includes(k)) || named.every((k) => BACKDROPS.includes(k)));
  const byProp = named.length > 0 && !byGround;
  return Object.entries(binding).flatMap(([key, child]) =>
    matrixCells(child, [...keys, key], byProp ? [...props, key] : props, ground ?? (byGround ? key : null)));
}

/** The prop keys that reach a set of cells, each written `a.b`; `''` is a cell no prop keys. */
function propKeyings(cells: readonly MatrixCell[]): Set<string> {
  return new Set(cells.map((c) => c.props.join('.')));
}

/** Whether a set of prop keyings is one cell whatever the props. */
function unkeyed(keyings: ReadonlySet<string>): boolean {
  return keyings.size === 1 && keyings.has('');
}

/** A set of prop keyings as a diagnostic names it. */
function under(keyings: ReadonlySet<string>): string {
  return [...keyings].sort().map((k) => (k === '' ? 'no prop' : `\`${k}\``)).join(', ');
}

/** The chip's fallback as a hint names it: `color.bg.surface.raised over color.bg.page`. */
const CHIP_FALLBACK = GLASS_CHIP_FALLBACK.map((f) => f.token).join(' over ');

/**
 * The glass chip's two corpus rules (ADR-0036 §10).
 *
 * `glass-chip/fallback` (§9.1, rule 10): a part whose `background` binds material.glass.chip, on the part or in a
 * state block, binds `fallbackBackground` and `fallbackUnderlay` on the part to the chip's fallback, keyed as
 * `background` is keyed where it binds the chip and never by the ground, and the spec's
 * `accessibility.reduceTransparency` names both settings the chip falls back under. A state block keeps the part's
 * cells unless it binds its own, so a state block that rebinds either cell is held to the same token and keying:
 * the chip has one fallback in every state. The parts GLASS_CHIP_FALLBACK_EXCEPTIONS names are not held to it.
 *
 * `glass-chip/nested-blur` (§5, rule 6): no cell of any part binds the chip's blur or saturation under a `glass`
 * or `glassLight` key.
 */
function checkGlassChip(doc: SpecDoc, spec: Record<string, unknown>, name: string, diagnostics: Diagnostic[]): void {
  const tokens = spec['tokens'];
  if (!isRecord(tokens)) return;
  const states = statesOf(spec);
  // The first part held to the fallback rule, which the reduceTransparency diagnostic names.
  let held: string | null = null;
  for (const [part, body] of Object.entries(tokens)) {
    if (!isRecord(body)) continue;
    // The part's own properties and those of its state blocks, each with the place it is written.
    const properties = Object.entries(body).flatMap(([key, value]): { at: JsonPath; property: string; value: unknown }[] =>
      states.has(key) && isRecord(value)
        ? Object.entries(value).map(([property, cell]) => ({ at: ['tokens', part, key, property], property, value: cell }))
        : [{ at: ['tokens', part, key], property: key, value }]);

    for (const { at, value } of properties) {
      for (const cell of matrixCells(value)) {
        const nested = cell.keys.find((k) => NESTED_GLASS_KEYS.includes(k));
        if (nested === undefined || !GLASS_CHIP_FILTERS.includes(cell.path)) continue;
        const where = [...at, ...cell.keys];
        diagnostics.push(error('glass-chip/nested-blur', `\`${where.join('.')}\` binds ${cell.path} under \`${nested}\``, {
          file: doc.path, line: doc.lineOf(where),
          hint: "a glass chip on the scheme's glass, on light glass or inside another glass chip draws its fill and edge and no backdrop filter (ADR-0036 §5): delete this cell and keep the fill and edge cells",
        }));
      }
    }

    const backgrounds = properties.filter((p) => p.property === 'background' && matrixCells(p.value).some((c) => c.path === GLASS_CHIP));
    const first = backgrounds[0];
    if (first === undefined || GLASS_CHIP_FALLBACK_EXCEPTIONS.some((e) => e.component === name && e.part === part)) continue;
    held ??= part;
    const chip = propKeyings(backgrounds.flatMap((p) => matrixCells(p.value)).filter((c) => c.path === GLASS_CHIP));
    const bound = `\`${first.at.join('.')}\` binds ${GLASS_CHIP}`;
    for (const { property, token } of GLASS_CHIP_FALLBACK) {
      if (!(property in body)) {
        diagnostics.push(error('glass-chip/fallback', `${bound}, and the part states no \`${property}\``, {
          file: doc.path, line: doc.lineOf(first.at),
          hint: `bind \`${property}: ${token}\` on the part${unkeyed(chip) ? '' : `, keyed under ${under(chip)} as \`background\` is`}: under the fallback the chip is ${CHIP_FALLBACK} (ADR-0036 §9.1)`,
        }));
      }
      // The part's cell, and the cell of every state block that rebinds it, each held to the same token and keying.
      for (const { at, value } of properties.filter((p) => p.property === property)) {
        const cells = matrixCells(value);
        // A cell that is not a binding at all is the schema's and `matrix/axis`'s to report.
        if (cells.length === 0) continue;
        // A state block that binds no fallback keeps the part's, so a state's own cell is at best a copy of it, and the
        // fix for a wrong one is to delete it.
        const inState = at.length > 3
          ? `delete \`${at.slice(2).join('.')}\`: a state block that binds no \`${property}\` keeps the part's, and the chip has one fallback, ${CHIP_FALLBACK}, in every state (ADR-0022 §1.1, ADR-0036 §9.1)`
          : null;
        const grounded = cells.find((c) => c.ground !== null);
        if (grounded !== undefined) {
          diagnostics.push(error('glass-chip/fallback', `\`${at.join('.')}\` is keyed by the ground (\`${grounded.ground ?? ''}\`), and the chip falls back the same way on every ground`, {
            file: doc.path, line: doc.lineOf(at),
            hint: inState ?? 'bind one token path, or key it only by the props `background` is keyed by where it binds the chip (ADR-0036 §2.3, §9.1)',
          }));
        }
        for (const cell of cells) {
          if (cell.path === token) continue;
          const where = [...at, ...cell.keys];
          diagnostics.push(error('glass-chip/fallback', `\`${where.join('.')}\` binds \`${cell.path}\`, and the chip's \`${property}\` is ${token}`, {
            file: doc.path, line: doc.lineOf(where),
            hint: inState ?? `bind ${token}: the chip has one fallback, ${CHIP_FALLBACK} (ADR-0022 §1.1, ADR-0036 §2.3); a part that needs another is an amendment to ADR-0036, as roadmap P4-D10 records for TopBar`,
          }));
        }
        const fallback = propKeyings(cells);
        if (fallback.size === chip.size && [...fallback].every((k) => chip.has(k))) continue;
        diagnostics.push(error('glass-chip/fallback', `\`${at.join('.')}\` ${unkeyed(fallback) ? 'answers whatever the props' : `is keyed under ${under(fallback)}`}, and \`background\` binds the chip ${unkeyed(chip) ? 'whatever the props' : `only under ${under(chip)}`}`, {
          file: doc.path, line: doc.lineOf(at),
          hint: inState ?? `key \`${property}\` the way \`background\` is keyed where it binds the chip, as Toolbar keys its fallback under \`floating\` (ADR-0036 §9.1)`,
        }));
      }
    }
  }

  const accessibility = spec['accessibility'];
  const text = isRecord(accessibility) ? accessibility['reduceTransparency'] : undefined;
  // A missing field is the schema's to report (ADR-0022 rule 9).
  if (held === null || typeof text !== 'string') return;
  const unnamed = GLASS_CHIP_SETTINGS.filter((setting) => !text.includes(setting));
  if (unnamed.length === 0) return;
  diagnostics.push(error('glass-chip/fallback', `\`tokens.${held}\` binds ${GLASS_CHIP} as its background, and \`accessibility.reduceTransparency\` does not name ${unnamed.join(' or ')}`, {
    file: doc.path, line: doc.lineOf(['accessibility', 'reduceTransparency']),
    hint: `say what ${GLASS_CHIP_SETTINGS.join(' and ')} do to the part: Prism's Surface module draws it as ${CHIP_FALLBACK} at the same radius, with blur, saturation and the inner edge dropped, and it publishes raised, so every part takes its default cell (ADR-0036 §9.1)`,
  }));
}

/**
 * A pattern composes specs that exist and sets only props they declare, with values their types allow
 * (spec/patterns/README.md). The recipe is what an agent copies onto a screen, so a prop the composed
 * spec does not have, or an enum value it does not list, would be copied into code that cannot exist.
 * Props the pattern forwards are prose (`forwards`); only the ones it fixes in `props` are checked.
 */
function checkComposition(
  doc: SpecDoc,
  pattern: Record<string, unknown>,
  composable: ReadonlyMap<string, Record<string, unknown>>,
  icons: IconRegistry | null,
  diagnostics: Diagnostic[],
): void {
  const composition = pattern['composition'];
  if (!Array.isArray(composition)) return;
  composition.forEach((item, i) => {
    if (!isRecord(item) || typeof item['component'] !== 'string') return;
    const name = item['component'];
    const at: JsonPath = ['composition', i];
    const target = composable.get(name);
    if (target === undefined) {
      diagnostics.push(error('composition/unknown', `composition names \`${name}\`, which has no spec in ${COMPONENTS_DIR}/ or ${PATTERNS_DIR}/`, {
        file: doc.path, line: doc.lineOf([...at, 'component']),
        hint: 'compose a component or pattern that has a spec, or write its spec first (spec/SCHEMA.md)',
      }));
      return;
    }
    const declared = declaredProps(target);
    const props = isRecord(item['props']) ? item['props'] : {};
    for (const [key, value] of Object.entries(props)) {
      const where = { file: doc.path, line: doc.lineOf([...at, 'props', key]) };
      const prop = declared.get(key);
      if (prop === undefined) {
        diagnostics.push(error('composition/prop', `\`${name}\` declares no prop \`${key}\``, {
          ...where, hint: declared.size === 0 ? `${name} has no props to set` : `set one of ${[...declared.keys()].join(', ')}, or forward the value instead`,
        }));
        continue;
      }
      const problem = propValueProblem(prop, value, icons?.ids ?? null);
      if (problem !== null) {
        diagnostics.push(error('composition/prop', `\`${name}.${key}\` ${problem}`, {
          ...where, hint: `set a value ${name}'s \`${key}\` prop allows`,
        }));
      }
    }
  });
}

/**
 * Why a value an example sets or a composition fixes does not fit a declared prop, or null when it does. Only closed
 * types are checked: a `slot` or `data` prop takes spec/SCHEMA.md's slot forms, an `action` prop the galleries' handler,
 * and an `icon` prop goes unchecked when the registry could not be read (`icons` null).
 */
function propValueProblem(prop: Record<string, unknown>, value: unknown, icons: ReadonlySet<string> | null): string | null {
  const type = prop['type'];
  if (type === 'boolean') return typeof value === 'boolean' ? null : `is a boolean, not ${JSON.stringify(value)}`;
  if (type === 'number') return typeof value === 'number' ? null : `is a number, not ${JSON.stringify(value)}`;
  if (type === 'string') return typeof value === 'string' || isImageFixture(value) ? null : `is a string, not ${JSON.stringify(value)}`;
  if (type === 'icon' && icons !== null) return typeof value === 'string' && icons.has(value) ? null : `is an icon of ${ICON_REGISTRY}, not ${JSON.stringify(value)}`;
  if (type === 'enum' && Array.isArray(prop['values'])) {
    const allowed = prop['values'].filter((v): v is string => typeof v === 'string');
    // A list value sets a multi-value enum (Sheet's `detents: [peek, medium]`): each item must be allowed.
    const given = Array.isArray(value) ? value : [value];
    const bad = given.filter((v) => typeof v !== 'string' || !allowed.includes(v));
    return bad.length === 0 ? null : `has no value ${bad.map((v) => `\`${String(v)}\``).join(', ')} (${allowed.join(', ')})`;
  }
  return null;
}

/**
 * Whether a value is one of spec/SCHEMA.md's image fixtures, written as SCHEMA writes it: `{ fixture: <name> }` and
 * nothing else, so a fixture that takes parameters, or one SCHEMA does not document, is no image.
 */
function isImageFixture(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length === 1 && typeof value['fixture'] === 'string' && IMAGE_FIXTURES.includes(value['fixture']);
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
