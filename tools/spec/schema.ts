// Ajv compilation of the spec schemas and the one place that reads the bindable `sys` categories back
// out of the schema. ADR-0024 §5.3 makes the token-path regex of spec/component.schema.json the single
// copy of that set, so `bindableCategories` parses it instead of repeating it; `category/unclassified`
// then proves that every category the dictionary holds is either in that regex or in NON_BINDABLE.
// The spec schemas declare JSON Schema 2020-12, which needs Ajv's 2020 build; `ajv`'s default entry
// carries draft-07 only (the DTCG schemas of tools/tokens/validate.ts are draft-07).
import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

/** `^(comp\.[a-z0-9-]+|color|…|z)\.[a-z0-9.-]+$` → the category alternatives. */
const TOKEN_PATH_SHAPE = /^\^\((.+)\)\\\.\[a-z0-9\.-\]\+\$$/;

export class SchemaShapeError extends Error {}

export function compileSchema(text: string, path: string): ValidateFunction {
  let schema: unknown;
  try {
    schema = JSON.parse(text);
  } catch (e) {
    throw new SchemaShapeError(`${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  // The spec schemas use no formats, so Ajv needs no ajv-formats plugin here.
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  try {
    return ajv.compile(schema as Record<string, unknown>);
  } catch (e) {
    throw new SchemaShapeError(`${path} does not compile: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * The spec-bindable `sys` categories, read out of the schema's `$defs/tokenPath` pattern
 * (ADR-0024 §5.3). Throws when the pattern no longer has that shape, so the regex and this reader
 * cannot drift apart silently.
 */
export function bindableCategories(text: string, path: string): Set<string> {
  let pattern: unknown;
  try {
    pattern = (JSON.parse(text) as { $defs?: { tokenPath?: { pattern?: unknown } } }).$defs?.tokenPath?.pattern;
  } catch (e) {
    throw new SchemaShapeError(`${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (typeof pattern !== 'string') throw new SchemaShapeError(`${path} has no $defs/tokenPath/pattern`);
  const body = TOKEN_PATH_SHAPE.exec(pattern)?.[1];
  if (body === undefined) throw new SchemaShapeError(`${path}: $defs/tokenPath/pattern is not the alternation ADR-0024 §5.3 describes`);
  const alternatives = body.split('|');
  if (!alternatives.includes('comp\\.[a-z0-9-]+')) throw new SchemaShapeError(`${path}: $defs/tokenPath/pattern must allow comp.<component>.*`);
  const categories = alternatives.filter((a) => /^[a-z]+$/.test(a));
  if (categories.length + 1 !== alternatives.length) {
    throw new SchemaShapeError(`${path}: $defs/tokenPath/pattern holds an alternative that is neither comp.<component> nor a category`);
  }
  return new Set(categories);
}

/** Ajv's instancePath (`/tokens/root/background`) as a JSON path, with array indices as numbers. */
export function pointerToPath(pointer: string): (string | number)[] {
  if (pointer === '') return [];
  return pointer
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map((s) => (/^(0|[1-9][0-9]*)$/.test(s) ? Number(s) : s));
}

/** `/tokens/root  must be object` — Ajv's own wording, with the failing value's place in front. */
export function errorMessage(error: ErrorObject): string {
  const where = error.instancePath === '' ? 'the document' : error.instancePath;
  const params = error.params as Record<string, unknown>;
  const extra =
    typeof params['additionalProperty'] === 'string' ? ` ("${params['additionalProperty']}")`
    : typeof params['missingProperty'] === 'string' ? ` ("${params['missingProperty']}")`
    : Array.isArray(params['allowedValues']) ? ` (${(params['allowedValues'] as unknown[]).map((v) => JSON.stringify(v)).join(', ')})`
    : typeof params['pattern'] === 'string' ? ` (${params['pattern']})`
    : '';
  return `${where} ${error.message ?? 'is invalid'}${extra}`;
}
