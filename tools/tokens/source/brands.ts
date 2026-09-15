// Brands (ARCHITECTURE §3.1, ADR-0020 §8): loads `brands/<context>/brand.json` for each context of
// the `brand` modifier, validates it against schema/brand.schema.json, and checks registration: every
// `brands/<name>/` folder is a brand context and back, the name matches the folder, and a brand's
// `extends` equals its context's layering (the parent's sources, then its own brand.tokens.json).
// Fonts are per brand: `extends` does not inherit brand.json entries.
import { PATHS } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { isPlainObject, parseJson, valueOf } from './json.ts';
import type { SourceReader } from './reader.ts';
import { validateBrandJson } from './schemas.ts';
import type { BrandFont, BrandMeta, ContextName, Platform, SourceDoc } from './types.ts';

export function brandJsonPath(name: string): string {
  return `${PATHS.brands}/${name}/brand.json`;
}
export function brandTokensPath(name: string): string {
  return `${PATHS.brands}/${name}/brand.tokens.json`;
}

function toFont(value: unknown): BrandFont | null {
  if (!isPlainObject(value) || typeof value['family'] !== 'string') return null;
  const platforms = Array.isArray(value['platforms'])
    ? value['platforms'].filter((p): p is Platform => p === 'apple' || p === 'web')
    : [];
  const postscript: Record<string, string> = {};
  if (isPlainObject(value['postscript'])) {
    for (const [k, v] of Object.entries(value['postscript'])) if (typeof v === 'string') postscript[k] = v;
  }
  return {
    family: value['family'],
    file: typeof value['file'] === 'string' ? value['file'] : null,
    version: typeof value['version'] === 'string' ? value['version'] : null,
    sha256: typeof value['sha256'] === 'string' ? value['sha256'] : null,
    platforms,
    postscript,
  };
}

/**
 * Loads the brand metadata of every brand context. `contexts` is the `brand` modifier's context map,
 * or null when the resolver has no brand modifier (then only stray brand folders are reported).
 */
export function loadBrands(
  reader: SourceReader,
  contexts: ReadonlyMap<ContextName, readonly SourceDoc[]> | null,
  diagnostics: Diagnostic[],
): Map<ContextName, BrandMeta> {
  const brands = new Map<ContextName, BrandMeta>();
  const names = contexts === null ? [] : [...contexts.keys()];

  for (const entry of reader.list(PATHS.brands)) {
    if (entry.dir && !names.includes(entry.name)) {
      diagnostics.push(
        error('brand/registration', `brand folder ${PATHS.brands}/${entry.name}/ is not a context of the brand modifier`, {
          file: brandJsonPath(entry.name),
          hint: `add "${entry.name}": [ { "$ref": "../${PATHS.brands}/${entry.name}/brand.tokens.json" } ] to the brand modifier, or remove the folder`,
        }),
      );
    }
  }
  if (contexts === null) return brands;

  const extendsOf = new Map<string, string | null>();
  for (const name of names) {
    const file = brandJsonPath(name);
    let text: string;
    try {
      text = reader.readText(file);
    } catch {
      diagnostics.push(error('brand/registration', `brand context "${name}" has no ${file}`, { file, hint: `add ${PATHS.brands}/${name}/ with brand.json and brand.tokens.json (brands/README.md)` }));
      continue;
    }
    const json = parseJson(file, text, diagnostics);
    if (json === null) continue;
    const value = valueOf(json.root);
    for (const problem of validateBrandJson(value)) {
      diagnostics.push(error('brand/schema', `brand.json${problem.pointer.replace(/\//g, '.')} ${problem.message}`, { file, line: 1 }));
    }
    if (!isPlainObject(value)) continue;
    if (value['name'] !== name) {
      diagnostics.push(error('brand/registration', `brand.json "name" is ${JSON.stringify(value['name'])}, but the folder and context are "${name}"`, { file, line: 1 }));
    }
    const ext = typeof value['extends'] === 'string' ? value['extends'] : null;
    extendsOf.set(name, ext);
    const fonts: Partial<Record<'ui' | 'display' | 'mono', BrandFont>> = {};
    if (isPlainObject(value['fonts'])) {
      for (const slot of ['ui', 'display', 'mono'] as const) {
        const f = toFont(value['fonts'][slot]);
        if (f !== null) fonts[slot] = f;
      }
    }
    brands.set(name, {
      name,
      displayName: typeof value['displayName'] === 'string' ? value['displayName'] : name,
      version: typeof value['version'] === 'string' ? value['version'] : '0.0.0',
      preset: value['preset'] === 'native' ? 'native' : 'signature',
      extends: ext,
      fonts,
    });
  }

  // Layering: sources(parent) followed by the brand's own brand.tokens.json.
  const expected = (name: string, seen: readonly string[]): string[] | null => {
    if (seen.includes(name)) return null;
    const parent = extendsOf.get(name) ?? null;
    const own = brandTokensPath(name);
    if (parent === null) return [own];
    if (!names.includes(parent)) return null;
    const base = expected(parent, [...seen, name]);
    return base === null ? null : [...base, own];
  };
  for (const name of names) {
    if (!extendsOf.has(name)) continue;
    const parent = extendsOf.get(name) ?? null;
    const file = brandJsonPath(name);
    if (parent !== null && !names.includes(parent)) {
      diagnostics.push(error('brand/registration', `brand "${name}" extends "${parent}", which is not a brand context`, { file, line: 1 }));
      continue;
    }
    const want = expected(name, []);
    if (want === null) {
      diagnostics.push(error('brand/registration', `brand "${name}" has an extends cycle`, { file, line: 1 }));
      continue;
    }
    const have = (contexts.get(name) ?? []).map((d) => d.file);
    if (want.length !== have.length || want.some((f, i) => f !== have[i])) {
      diagnostics.push(
        error('brand/registration', `context "${name}" of the brand modifier loads [${have.join(', ')}], but brand.json ${parent === null ? 'has no extends' : `extends "${parent}"`}, which means [${want.join(', ')}]`, {
          file,
          line: 1,
          hint: `set the context to ${JSON.stringify(want.map((f) => ({ $ref: `../${f}` })))}`,
        }),
      );
    }
  }
  return brands;
}
