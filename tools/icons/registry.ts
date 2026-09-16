// The icon registry as data: the types of spec/icons/registry.schema.json, the loader, and the JSON
// Schema gate in front of every other check (roadmap P2-2, ADR-0013).
//
// Nothing here reads the Phosphor catalog or the SF Symbols availability plist: schema first, so the
// rules in checks.ts and the Swift validator can rely on the shape.

import { readFileSync } from "node:fs";
import { join } from "node:path";
// The registry schema declares JSON Schema 2020-12, which needs Ajv's 2020 build; `ajv`'s default
// entry carries draft-07 only.
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import { PATHS } from "./config.ts";

export const WEIGHT_NAMES = ["thin", "light", "regular", "medium", "bold", "heavy"] as const;
export type WeightName = (typeof WEIGHT_NAMES)[number];

export const STYLE_NAMES = ["outline", "filled", "duotone"] as const;
export type StyleName = (typeof STYLE_NAMES)[number];

export const SIZE_NAMES = ["xs", "sm", "md", "lg"] as const;
export type SizeName = (typeof SIZE_NAMES)[number];

/** The Phosphor cuts an image set is generated for: the four weight cuts plus the two style cuts. */
export const PHOSPHOR_CUTS = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;
export type PhosphorCut = (typeof PHOSPHOR_CUTS)[number];

export interface Sources {
  readonly phosphor: { readonly package: string; readonly version: string };
  readonly sfSymbols: { readonly release: number; readonly maxYear: string; readonly osFloor: string };
}

export interface Weight {
  readonly number: number;
  readonly phosphor: PhosphorCut;
  readonly sf: string;
  readonly boldText: WeightName;
}

export interface Style {
  readonly phosphor: string;
  readonly sf: { readonly variant?: string; readonly renderingMode?: string };
}

export interface Size {
  readonly token: string;
  readonly px: number;
  readonly sf: { readonly pointSize: number; readonly scale: "small" | "medium" | "large" };
}

export interface RtlMirror {
  readonly web: boolean;
  readonly apple: boolean;
}

export interface AppleBinding {
  readonly symbol?: string;
  readonly custom?: string;
  readonly minOS?: string;
  readonly fallback?: string;
}

export interface Icon {
  readonly label: string;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly rtlMirror?: RtlMirror;
  readonly defaultStyle?: StyleName;
  readonly since: string;
  readonly deprecated?: { readonly since: string; readonly replacedBy: string };
  readonly web: { readonly phosphor: string };
  readonly apple: AppleBinding;
  readonly figma?: { readonly component?: string };
}

export interface Registry {
  readonly $schema?: string;
  readonly version: string;
  readonly sources: Sources;
  readonly weights: Readonly<Record<WeightName, Weight>>;
  readonly styles: Readonly<Record<StyleName, Style>>;
  readonly sizes: Readonly<Record<SizeName, Size>>;
  readonly icons: Readonly<Record<string, Icon>>;
}

export type Severity = "error" | "warning";

export interface Issue {
  /** Stable machine name of the rule, printed with every line and asserted by the tests. */
  readonly code: string;
  readonly severity: Severity;
  /** The icon id, weight or size the issue is about; empty for document-level issues. */
  readonly where: string;
  readonly message: string;
}

export function error(code: string, where: string, message: string): Issue {
  return { code, severity: "error", where, message };
}

export function warning(code: string, where: string, message: string): Issue {
  return { code, severity: "warning", where, message };
}

/** An icon's mirror flags; an absent `rtlMirror` means neither stack flips. */
export function mirrorOf(icon: Icon): RtlMirror {
  return icon.rtlMirror ?? { web: false, apple: false };
}

/** The image-set stem of a Phosphor-derived Apple binding, `<custom>.<cut>`. */
export function assetName(custom: string, cut: PhosphorCut): string {
  return `${custom}.${cut}`;
}

function formatAjvError(e: ErrorObject): Issue {
  const where = e.instancePath === "" ? "" : e.instancePath.replace(/^\//, "").replaceAll("/", ".");
  const extra = e.keyword === "additionalProperties" ? ` (${JSON.stringify((e.params as { additionalProperty?: string }).additionalProperty)})` : "";
  return error("schema", where, `${e.message ?? "is invalid"}${extra}`);
}

/**
 * Validates a parsed registry document against the schema at `schemaPath`. Returns the typed registry
 * only when the document is valid; a schema error is always fatal, because every later rule indexes
 * the shape the schema guarantees.
 */
export function validateSchema(document: unknown, schemaPath: string): { registry: Registry | null; issues: readonly Issue[] } {
  const schema: unknown = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema as object);
  if (validate(document)) return { registry: document as Registry, issues: [] };
  return { registry: null, issues: (validate.errors ?? []).map(formatAjvError) };
}

/** Reads and schema-validates `spec/icons/registry.json` under `root`. */
export function loadRegistry(root: string, registryPath: string = PATHS.registry, schemaPath: string = PATHS.schema): { registry: Registry | null; issues: readonly Issue[] } {
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(join(root, registryPath), "utf8"));
  } catch (e) {
    return { registry: null, issues: [error("registry/unreadable", registryPath, e instanceof Error ? e.message : String(e))] };
  }
  return validateSchema(document, join(root, schemaPath));
}
