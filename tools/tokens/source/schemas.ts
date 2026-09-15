// The two Prism-owned JSON Schemas (ARCHITECTURE §3.1): `$extensions["app.prism"]` and brand.json.
// Each is compiled once, in its own Ajv instance, from the file next to this module (tool data, not
// token source, so it is not read through the SourceReader).
import { readFileSync } from 'node:fs';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';

function compile(file: string): ValidateFunction {
  const schema = JSON.parse(readFileSync(new URL(`../schema/${file}`, import.meta.url), 'utf8')) as object;
  const ajv = new Ajv({ allErrors: true, strict: true });
  return ajv.compile(schema);
}

let appPrism: ValidateFunction | null = null;
let brand: ValidateFunction | null = null;

export interface SchemaProblem { readonly pointer: string; readonly message: string }

function problems(errors: readonly ErrorObject[] | null | undefined): SchemaProblem[] {
  return (errors ?? []).map((e) => {
    const extra =
      e.keyword === 'additionalProperties' && typeof e.params['additionalProperty'] === 'string'
        ? ` ("${e.params['additionalProperty']}")`
        : e.keyword === 'enum' && Array.isArray(e.params['allowedValues'])
          ? ` (${(e.params['allowedValues'] as unknown[]).map((v) => JSON.stringify(v)).join(', ')})`
          : '';
    return { pointer: e.instancePath, message: `${e.message ?? e.keyword}${extra}` };
  });
}

/** Problems of an `app.prism` extension object; empty when valid. */
export function validateAppPrism(value: unknown): SchemaProblem[] {
  appPrism ??= compile('app-prism.schema.json');
  return appPrism(value) ? [] : problems(appPrism.errors);
}

/** Problems of a brand.json document; empty when valid. */
export function validateBrandJson(value: unknown): SchemaProblem[] {
  brand ??= compile('brand.schema.json');
  return brand(value) ? [] : problems(brand.errors);
}
