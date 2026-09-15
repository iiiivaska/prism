// tokens:validate: offline DTCG 2025.10 schema validation (ADR-0024 §10, tools/tokens/ARCHITECTURE.md
// §3.1, roadmap P1-1).
//
// 1. Checks the vendored schema bytes in schema/dtcg-2025.10/ against its SHA256SUMS. A refresh is a
//    deliberate change: download both files, update SHA256SUMS and review the diff.
// 2. Compiles each schema in its own Ajv 8 instance with ajv-formats (the schemas use the formats
//    `uri-reference` and `json-pointer-uri-fragment`). One shared instance fails, because
//    resolver.json embeds format.json under the same `$id` (ADR-0024 T7).
// 3. Validates tokens/**/*.tokens.json and brands/*/brand.tokens.json against format.json, and
//    tokens/prism.resolver.json against resolver.json, and prints file and JSON pointer per error.
//
// The schemas check structure only: types, value shapes, names that start with `$`. Prism's own rules
// (references, kebab-case names, group types, ownership, orthogonality) are checked by tokens:lint
// and tokens:build. Node 24 runs this file from source (native type stripping).
//
//   node tokens/validate.ts                  validate this repository
//   node tokens/validate.ts --root <dir>     validate another tree with the same layout (tests)
//
// Exit codes: 0 valid, 1 a schema error or a checksum mismatch, 2 usage or layout error.

import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import ajvFormats from "ajv-formats";

// ajv-formats is CommonJS: under `module: nodenext` its default import is `module.exports`, whose
// `default` property is the plugin at run time and in its declarations.
const addFormats = ajvFormats.default;

/** The vendored DTCG 2025.10 schemas, their checksums and license (ADR-0024 §10). */
export const SCHEMA_DIR = join(import.meta.dirname, "schema", "dtcg-2025.10");
export const SCHEMA_FILES = ["format.json", "resolver.json"] as const;
export type SchemaName = (typeof SCHEMA_FILES)[number];
/** Repository-relative path of the resolver document. */
export const RESOLVER = "tokens/prism.resolver.json";

export interface Issue {
  /** Path relative to the validated root (or to the schema folder for checksum issues), with forward slashes. */
  readonly file: string;
  /** JSON Pointer into the file; empty for the whole file. */
  readonly pointer: string;
  readonly message: string;
}

export interface Validators {
  readonly format: ValidateFunction;
  readonly resolver: ValidateFunction;
}

export interface Result {
  /** Every file validated, repository-relative, in the order checked. */
  readonly files: readonly string[];
  readonly issues: readonly Issue[];
}

/** Parses `shasum -a 256` output: `<64 hex digits>  <name>` per line (`*<name>` for binary mode). */
export function parseChecksums(text: string): Map<string, string> {
  const sums = new Map<string, string>();
  for (const [index, raw] of text.split("\n").entries()) {
    const line = raw.trim();
    if (line === "") continue;
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!match?.[1] || !match[2]) throw new Error(`SHA256SUMS line ${index + 1} is not "<sha256>  <file>"`);
    sums.set(match[2], match[1]);
  }
  return sums;
}

/** Compares file bytes with the expected SHA-256 of every schema; `read` returns undefined for a missing file. */
export function checksumIssues(sums: ReadonlyMap<string, string>, read: (name: string) => Uint8Array | undefined): Issue[] {
  const issues: Issue[] = [];
  for (const name of SCHEMA_FILES) {
    const expected = sums.get(name);
    if (expected === undefined) {
      issues.push({ file: "SHA256SUMS", pointer: "", message: `no checksum for ${name}` });
      continue;
    }
    const bytes = read(name);
    if (bytes === undefined) {
      issues.push({ file: name, pointer: "", message: "missing" });
      continue;
    }
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected) {
      issues.push({ file: name, pointer: "", message: `SHA-256 ${actual} does not match SHA256SUMS (${expected}); refresh deliberately or restore the published bytes` });
    }
  }
  return issues;
}

/** Checks the vendored schema bytes in `dir` against its SHA256SUMS. */
export function verifyChecksums(dir: string = SCHEMA_DIR): Issue[] {
  const sumsPath = join(dir, "SHA256SUMS");
  if (!existsSync(sumsPath)) return [{ file: "SHA256SUMS", pointer: "", message: "missing" }];
  return checksumIssues(parseChecksums(readFileSync(sumsPath, "utf8")), (name) => {
    const path = join(dir, name);
    return existsSync(path) ? readFileSync(path) : undefined;
  });
}

/** Compiles one schema in its own Ajv 8 instance with ajv-formats, in strict mode. */
export function compileSchema(schema: object): ValidateFunction {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

/** The two validators, each from its own Ajv instance (ADR-0024 T7). */
export function loadValidators(dir: string = SCHEMA_DIR): Validators {
  const read = (name: SchemaName): object => JSON.parse(readFileSync(join(dir, name), "utf8")) as object;
  return { format: compileSchema(read("format.json")), resolver: compileSchema(read("resolver.json")) };
}

/** `tokens/**\/*.tokens.json` and `brands/*\/brand.tokens.json` under `root`, repository-relative and sorted. */
export function listTokenFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string, rel: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), childRel);
      else if (entry.isFile() && entry.name.endsWith(".tokens.json")) files.push(childRel);
    }
  };
  walk(join(root, "tokens"), "tokens");
  let brands: Dirent[] = [];
  try {
    brands = readdirSync(join(root, "brands"), { withFileTypes: true });
  } catch {
    // no brands folder: nothing to add
  }
  for (const brand of brands) {
    const rel = `brands/${brand.name}/brand.tokens.json`;
    if (brand.isDirectory() && existsSync(join(root, rel))) files.push(rel);
  }
  return files.sort();
}

function errorMessage(error: ErrorObject): string {
  const params = error.params as Record<string, unknown>;
  if (error.keyword === "additionalProperties" && typeof params["additionalProperty"] === "string") {
    return `${error.message ?? "is invalid"}: ${JSON.stringify(params["additionalProperty"])}`;
  }
  if (error.keyword === "enum" && Array.isArray(params["allowedValues"])) {
    return `${error.message ?? "is invalid"}: ${params["allowedValues"].map((value) => JSON.stringify(value)).join(", ")}`;
  }
  return error.message ?? `fails ${error.keyword}`;
}

const COMBINATORS = new Set(["oneOf", "anyOf", "allOf", "if", "not"]);

/**
 * The errors worth printing. The DTCG schemas try every token type through `oneOf` and `if`/`then`,
 * so one bad value yields dozens of branch errors. Keep the deepest errors of each branch (an error
 * whose instance path another error extends is dropped), and drop combinator summaries at a path
 * that also has a concrete error.
 */
export function mostSpecific(errors: readonly ErrorObject[]): ErrorObject[] {
  const deepest = errors.filter((error) => !errors.some((other) => other.instancePath.startsWith(`${error.instancePath}/`)));
  return deepest.filter(
    (error) =>
      !COMBINATORS.has(error.keyword) ||
      !deepest.some((other) => other.instancePath === error.instancePath && !COMBINATORS.has(other.keyword)),
  );
}

/** Validates one file; a file that is not JSON is one issue at the whole file. */
export function validateFile(root: string, file: string, validate: ValidateFunction): Issue[] {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(join(root, file), "utf8"));
  } catch (error) {
    return [{ file, pointer: "", message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}` }];
  }
  if (validate(data)) return [];
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const error of mostSpecific(validate.errors ?? [])) {
    const issue: Issue = { file, pointer: error.instancePath, message: `${errorMessage(error)} (${error.schemaPath})` };
    const key = `${issue.pointer} ${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(issue);
  }
  return issues.sort((a, b) => (a.pointer < b.pointer ? -1 : a.pointer > b.pointer ? 1 : 0));
}

/** Validates every token file against format.json and the resolver against resolver.json. */
export function validateTree(root: string, validators: Validators = loadValidators()): Result {
  if (!existsSync(join(root, RESOLVER))) throw new Error(`${RESOLVER} not found under ${root}`);
  const tokenFiles = listTokenFiles(root);
  const issues: Issue[] = [];
  for (const file of tokenFiles) issues.push(...validateFile(root, file, validators.format));
  issues.push(...validateFile(root, RESOLVER, validators.resolver));
  return { files: [...tokenFiles, RESOLVER], issues };
}

export function formatIssue(issue: Issue): string {
  return `${issue.file}#${issue.pointer}: ${issue.message}`;
}

/** CLI entry; returns the process exit code (0 valid, 1 schema or checksum failure, 2 usage or layout error). */
export function main(argv: readonly string[]): number {
  let root = resolve(import.meta.dirname, "..", "..");
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    const value = argv[i + 1];
    if (flag !== "--root") {
      console.error(`tokens:validate: unknown argument ${JSON.stringify(flag)}`);
      return 2;
    }
    if (value === undefined || value.startsWith("--")) {
      console.error("tokens:validate: --root needs a path");
      return 2;
    }
    root = resolve(value);
    i++;
  }
  let checksums: Issue[];
  try {
    checksums = verifyChecksums();
  } catch (error) {
    console.error(`tokens:validate: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  if (checksums.length > 0) {
    for (const issue of checksums) console.log(`tools/tokens/schema/dtcg-2025.10/${formatIssue(issue)}`);
    console.error("tokens:validate: the vendored DTCG schemas do not match SHA256SUMS (ADR-0024 §10)");
    return 1;
  }
  let result: Result;
  try {
    result = validateTree(root);
  } catch (error) {
    console.error(`tokens:validate: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  if (result.issues.length === 0) {
    console.log(`tokens:validate: ${result.files.length} files valid against the DTCG 2025.10 schemas (${result.files.length - 1} token files, 1 resolver)`);
    return 0;
  }
  for (const issue of result.issues) console.log(formatIssue(issue));
  const files = new Set(result.issues.map((issue) => issue.file)).size;
  console.error(`tokens:validate: ${result.issues.length} schema errors in ${files} of ${result.files.length} files`);
  return 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
