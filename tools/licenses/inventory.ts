// The provenance ledger (ADR-0015 rule 5, ADR-0031): the types of `licenses/inventory.json`, its
// JSON Schema validation and the small accessors `licenses:check` and `licenses:notices` share.
//
// The file is the single source for THIRD_PARTY_NOTICES.md and for the gate, so nothing here fixes
// up a malformed inventory: every problem becomes an issue with a JSON pointer, and the caller
// decides whether to keep going with the items that did parse.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import ajvFormats from "ajv-formats";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { RepoReader } from "./tree.ts";
import { readText } from "./tree.ts";

// ajv-formats is CommonJS: under `module: nodenext` its default import is `module.exports`, whose
// `default` property is the plugin at run time and in its declarations (as in tokens/validate.ts).
const addFormats = ajvFormats.default;

export const INVENTORY_PATH = "licenses/inventory.json";
export const SCHEMA_PATH = "licenses/inventory.schema.json";

/** The `permitted_use` vocabulary, in schema order. `licenses:check` fails when the two lists differ. */
export const PERMITTED_USE = [
  "own",
  "adapt-with-attribution",
  "dependency",
  "sdk-runtime",
  "inventory-only",
  "apple-mockups-only",
  "read-only",
  "principles-only",
] as const;
export type PermittedUse = (typeof PERMITTED_USE)[number];

/** The only two values a packaged item may carry (ADR-0015 rule 5, ADR-0031 rule 3). */
export const PACKAGEABLE_USE: readonly PermittedUse[] = ["own", "adapt-with-attribution"];

export const KINDS = ["font", "icons", "figma-kit", "code", "reference", "image", "other"] as const;
export type Kind = (typeof KINDS)[number];

/** One ledger entry. Optional fields are absent, never null. */
export interface InventoryItem {
  readonly id: string;
  readonly kind: Kind;
  readonly name: string;
  readonly version?: string;
  readonly spdx: string;
  readonly reserved_font_name?: boolean;
  readonly source: string;
  readonly license_url: string;
  readonly attribution: string;
  readonly permitted_use: PermittedUse;
  /** True when bytes of this item ship inside a Prism package; `packaged_as` then says which files. */
  readonly packaged: boolean;
  /** Repository-relative globs (`*`, `**`) naming the files this item's bytes are shipped as. */
  readonly packaged_as?: readonly string[];
  /** npm package names this item covers, for the dependency cross-check. */
  readonly npm?: readonly string[];
  /** SwiftPM repository URLs this item covers, for the dependency cross-check. */
  readonly swiftpm?: readonly string[];
  readonly notes?: string;
}

export interface Inventory {
  readonly updated: string;
  readonly permitted_use_values: readonly string[];
  readonly items: readonly InventoryItem[];
}

export interface Issue {
  /** Repository-relative file the issue is about. */
  readonly file: string;
  /** JSON pointer inside that file; "" for the whole file. */
  readonly pointer: string;
  readonly message: string;
}

export interface InventoryLoad {
  /** The parsed document, or null when the file is missing or is not JSON. */
  readonly inventory: Inventory | null;
  readonly issues: readonly Issue[];
}

/** The repository's own copy of the schema, which a checked fixture tree usually does not repeat. */
export function toolSchemaPath(): string {
  return join(import.meta.dirname, "..", "..", "licenses", SCHEMA_PATH.split("/")[1] ?? "inventory.schema.json");
}

/**
 * The inventory schema: `override` when given, otherwise the checked tree's own copy, otherwise the
 * repository copy beside this tool. Throws when the file is missing or is not JSON.
 */
export function loadSchema(reader: RepoReader, override?: string): { schema: object; source: string } {
  const source = override ?? (readText(reader, SCHEMA_PATH) === null ? toolSchemaPath() : SCHEMA_PATH);
  const text = source === SCHEMA_PATH ? readText(reader, SCHEMA_PATH) : readFileSync(source, "utf8");
  if (text === null) throw new Error(`${source}: not found`);
  const schema: unknown = JSON.parse(text);
  if (typeof schema !== "object" || schema === null) throw new Error(`${source}: not a JSON Schema document`);
  return { schema, source };
}

/** Compiles the inventory schema (JSON Schema 2020-12, `date` and `uri` formats from ajv-formats). */
export function compileSchema(schema: object): (data: unknown) => Issue[] {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return (data: unknown): Issue[] => {
    if (validate(data)) return [];
    return (validate.errors ?? []).map((error) => ({
      file: INVENTORY_PATH,
      pointer: error.instancePath,
      message: `${error.message ?? "is invalid"}${describeParams(error.params)}`,
    }));
  };
}

function describeParams(params: Record<string, unknown>): string {
  const values = params["allowedValues"];
  if (Array.isArray(values)) return ` (${values.map((value) => JSON.stringify(value)).join(", ")})`;
  const property = params["additionalProperty"];
  if (typeof property === "string") return ` "${property}"`;
  const missing = params["missingProperty"];
  if (typeof missing === "string") return ` "${missing}"`;
  const failing = params["failingKeyword"];
  if (typeof failing === "string") return ` (the "${failing}" branch: a packaged item needs packaged_as and a permitted_use of ${PACKAGEABLE_USE.join(" or ")})`;
  return "";
}

/**
 * Reads and validates `licenses/inventory.json`. `validate` comes from `compileSchema`; the parsed
 * document is returned even when it has schema issues, so the packaging checks can still run over
 * whatever items are well formed.
 */
export function loadInventory(reader: RepoReader, validate: (data: unknown) => Issue[]): InventoryLoad {
  const text = readText(reader, INVENTORY_PATH);
  if (text === null) return { inventory: null, issues: [{ file: INVENTORY_PATH, pointer: "", message: "missing (ADR-0015 rule 5)" }] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { inventory: null, issues: [{ file: INVENTORY_PATH, pointer: "", message: `invalid JSON: ${error instanceof Error ? error.message : String(error)}` }] };
  }
  const issues = validate(parsed);
  return { inventory: coerce(parsed), issues };
}

/** The document as an `Inventory`, keeping only the items that are objects with a string id. */
function coerce(parsed: unknown): Inventory | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(record["items"]) ? record["items"] : [];
  const items = rawItems.filter((item): item is InventoryItem => typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string");
  return {
    updated: typeof record["updated"] === "string" ? record["updated"] : "",
    permitted_use_values: Array.isArray(record["permitted_use_values"]) ? record["permitted_use_values"].filter((value): value is string => typeof value === "string") : [],
    items,
  };
}

/** The `permitted_use` enum of the schema document, or null when the schema does not have one. */
export function schemaPermittedUse(schema: unknown): string[] | null {
  const items = at(at(at(schema, "properties"), "items"), "items");
  const values = at(at(at(items, "properties"), "permitted_use"), "enum");
  if (!Array.isArray(values)) return null;
  return values.filter((value): value is string => typeof value === "string");
}

function at(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

/** "Onest 2.001" — the name with its version when the item carries one. */
export function displayName(item: InventoryItem): string {
  return item.version === undefined ? item.name : `${item.name} ${item.version}`;
}
