// The Phosphor catalog as tools/icons sees it (ADR-0013 decision 2): the machine-readable name list
// of `@phosphor-icons/core`, the installed version, and the raw SVG of one cut.
//
// `icons` is the package's own export, so a name the registry invents, or one Phosphor renamed and
// keeps only as an alias, is caught against the same data the web bundle renders from.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { icons as catalogIcons } from "@phosphor-icons/core";
import { PHOSPHOR_PACKAGE } from "./config.ts";
import type { PhosphorCut } from "./registry.ts";

const require = createRequire(import.meta.url);

/** One catalog entry, narrowed to the fields the registry is checked against. */
export interface CatalogEntry {
  readonly name: string;
  readonly pascalName: string;
  /** The older name this icon still answers to; the registry must use `name` instead. */
  readonly alias?: string;
  readonly tags: readonly string[];
}

export interface Catalog {
  /** The installed package version, which `sources.phosphor.version` must equal. */
  readonly version: string;
  /** Canonical name -> entry. */
  readonly byName: ReadonlyMap<string, CatalogEntry>;
  /** Alias -> canonical name. */
  readonly canonicalOf: ReadonlyMap<string, string>;
  /** Absolute path of one cut's SVG file, or null when the package has no such file. */
  readonly assetPath: (name: string, cut: PhosphorCut) => string | null;
}

/** `regular` keeps the bare name; every other cut appends its own suffix. */
export function assetFile(name: string, cut: PhosphorCut): string {
  return cut === "regular" ? `${name}.svg` : `${name}-${cut}.svg`;
}

function installedVersion(): string {
  // The package exports map has no "./package.json" entry, so resolve the module entry and read the
  // manifest next to its dist/ folder.
  const entry = require.resolve(PHOSPHOR_PACKAGE);
  const manifest: unknown = JSON.parse(readFileSync(join(dirname(dirname(entry)), "package.json"), "utf8"));
  const version = (manifest as { version?: unknown }).version;
  if (typeof version !== "string") throw new Error(`${PHOSPHOR_PACKAGE} has no version in its package.json`);
  return version;
}

let cached: Catalog | null = null;

/** Loads the installed catalog once per process. */
export function loadCatalog(): Catalog {
  if (cached) return cached;
  const byName = new Map<string, CatalogEntry>();
  const canonicalOf = new Map<string, string>();
  for (const raw of catalogIcons as readonly { name: string; pascal_name: string; alias?: { name: string }; tags: readonly string[] }[]) {
    byName.set(raw.name, { name: raw.name, pascalName: raw.pascal_name, alias: raw.alias?.name, tags: raw.tags });
    if (raw.alias) canonicalOf.set(raw.alias.name, raw.name);
  }
  cached = {
    version: installedVersion(),
    byName,
    canonicalOf,
    assetPath: (name, cut) => {
      try {
        return require.resolve(`${PHOSPHOR_PACKAGE}/assets/${cut}/${assetFile(name, cut)}`);
      } catch {
        return null;
      }
    },
  };
  return cached;
}

/** The SVG bytes of one cut, as UTF-8 text with a trailing newline removed. */
export function readAsset(catalog: Catalog, name: string, cut: PhosphorCut): string | null {
  const path = catalog.assetPath(name, cut);
  if (path === null) return null;
  return readFileSync(path, "utf8").trimEnd();
}

/** The MIT licence shipped with the installed package; copied next to the generated asset catalog. */
export function readLicense(): string {
  const entry = require.resolve(PHOSPHOR_PACKAGE);
  return readFileSync(join(dirname(dirname(entry)), "LICENSE"), "utf8");
}
