// The font entries of every repo brand, as `fonts:check` reads them: the `brand` contexts of
// tokens/prism.resolver.json, each with its brands/<context>/brand.json (ADR-0020 §8, rule 2).
// Types mirror ARCHITECTURE §4.1 `BrandFont`; `api.brandMeta` (tools/tokens, P1-3) can replace
// loadBrands once it exists. Only the `fonts` object is validated here, strictly, because it is what
// the check trusts; the rest of brand.json belongs to tools/tokens/schema/brand.schema.json.

import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export const FONT_SLOTS = ["ui", "display", "mono"] as const;
export type FontSlot = (typeof FONT_SLOTS)[number];

export const FONT_PLATFORMS = ["apple", "web"] as const;
export type FontPlatform = (typeof FONT_PLATFORMS)[number];

export const RESOLVER_PATH = "tokens/prism.resolver.json";

/** One font entry of brand.json (ADR-0021 §11, ADR-0020 §8). */
export interface BrandFont {
  readonly family: string;
  /** Relative to the brand folder: `fonts/<family-dir>/<file>`. */
  readonly file: string;
  /** Name ID 5 without "Version ". */
  readonly version: string;
  readonly sha256: string;
  readonly platforms: readonly FontPlatform[];
  /** Weight ("100" … "900") → the PostScript name Core Text exposes; required when bundled on Apple. */
  readonly postscript: Readonly<Record<string, string>>;
}

export interface BrandFonts {
  readonly name: string;
  /** Repository-relative path of the brand.json. */
  readonly path: string;
  readonly fonts: Partial<Record<FontSlot, BrandFont>>;
}

export interface BrandProblem {
  /** Repository-relative file. */
  readonly file: string;
  /** JSON pointer inside the file; "" for the whole file. */
  readonly pointer: string;
  readonly message: string;
}

/** Reads repository files by repository-relative POSIX path. */
export interface TreeReader {
  /** The file's bytes, or null when it does not exist. */
  readFile(path: string): Uint8Array | null;
}

/** A reader over a directory tree. Paths that leave the root are errors. */
export function fsTreeReader(root: string): TreeReader {
  const base = resolve(root);
  return {
    readFile(path) {
      const full = resolve(base, ...path.split("/"));
      const rel = relative(base, full);
      if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
        throw new Error(`${path}: outside the repository root`);
      }
      try {
        return readFileSync(join(base, rel));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR") return null;
        throw error;
      }
    },
  };
}

export interface BrandLoad {
  readonly brands: readonly BrandFonts[];
  readonly problems: readonly BrandProblem[];
}

/**
 * Every `brand` context of the resolver with its brand.json fonts. Throws when the resolver itself
 * is missing or has no `brand` modifier: that is a layout error, not a brand problem.
 */
export function loadBrands(reader: TreeReader, resolverPath = RESOLVER_PATH): BrandLoad {
  const brands: BrandFonts[] = [];
  const problems: BrandProblem[] = [];
  for (const name of brandContexts(reader, resolverPath)) {
    const path = `brands/${name}/brand.json`;
    const bytes = reader.readFile(path);
    if (bytes === null) {
      problems.push({ file: path, pointer: "", message: `missing: the brand context "${name}" needs ${path} (ADR-0020 rule 2)` });
      continue;
    }
    const parsed = parseBrandFonts(path, new TextDecoder().decode(bytes));
    problems.push(...parsed.problems);
    brands.push({ name, path, fonts: parsed.fonts });
  }
  return { brands, problems };
}

/** The context names of the resolver's `brand` modifier, in declaration order. */
export function brandContexts(reader: TreeReader, resolverPath = RESOLVER_PATH): string[] {
  const bytes = reader.readFile(resolverPath);
  if (bytes === null) throw new Error(`${resolverPath}: not found`);
  let resolver: unknown;
  try {
    resolver = JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new Error(`${resolverPath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`, { cause: error });
  }
  const contexts = objectAt(objectAt(objectAt(resolver, "modifiers"), "brand"), "contexts");
  if (contexts === undefined) throw new Error(`${resolverPath}: no /modifiers/brand/contexts object`);
  const names = Object.keys(contexts);
  for (const name of names) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) throw new Error(`${resolverPath}: brand context "${name}" is not a kebab-case folder name`);
  }
  return names;
}

const ENTRY_KEYS = new Set(["family", "file", "version", "sha256", "platforms", "postscript"]);

/** Validates and reads the `fonts` object of one brand.json. Entries with problems are left out. */
export function parseBrandFonts(path: string, text: string): { fonts: Partial<Record<FontSlot, BrandFont>>; problems: BrandProblem[] } {
  const problems: BrandProblem[] = [];
  const fonts: Partial<Record<FontSlot, BrandFont>> = {};
  const problem = (pointer: string, message: string): void => {
    problems.push({ file: path, pointer, message });
  };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    problem("", `invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return { fonts, problems };
  }
  if (!isObject(json)) {
    problem("", "must be a JSON object");
    return { fonts, problems };
  }
  if (!("fonts" in json)) return { fonts, problems };
  const entries = json.fonts;
  if (!isObject(entries)) {
    problem("/fonts", "must be an object of font slots");
    return { fonts, problems };
  }
  for (const [slot, entry] of Object.entries(entries)) {
    const at = `/fonts/${slot}`;
    if (!(FONT_SLOTS as readonly string[]).includes(slot)) {
      problem(at, `unknown font slot; expected ${FONT_SLOTS.join(", ")}`);
      continue;
    }
    const before = problems.length;
    const font = parseEntry(entry, at, problem);
    if (font !== null && problems.length === before) fonts[slot as FontSlot] = font;
  }
  return { fonts, problems };
}

function parseEntry(entry: unknown, at: string, problem: (pointer: string, message: string) => void): BrandFont | null {
  if (!isObject(entry)) {
    problem(at, "must be an object with family, file, version, sha256, platforms and, when bundled on Apple, postscript");
    return null;
  }
  for (const key of Object.keys(entry)) {
    if (!ENTRY_KEYS.has(key)) problem(`${at}/${key}`, `unknown key; a font entry has ${[...ENTRY_KEYS].join(", ")}`);
  }
  const text = (key: string): string | null => {
    const value = entry[key];
    if (typeof value === "string" && value.length > 0) return value;
    problem(`${at}/${key}`, value === undefined ? "required" : "must be a non-empty string");
    return null;
  };
  const family = text("family");
  const file = text("file");
  if (file !== null && !isFontPath(file)) {
    problem(`${at}/file`, `"${file}" must be fonts/<family-dir>/<file> inside the brand folder (ADR-0021 §11)`);
  }
  const version = text("version");
  if (version?.startsWith("Version ")) problem(`${at}/version`, `name ID 5 without "Version ": write "${version.slice(8)}"`);
  const sha256 = text("sha256");
  if (sha256 !== null && !/^[0-9a-f]{64}$/.test(sha256)) problem(`${at}/sha256`, "must be 64 lowercase hex digits");

  let platforms: FontPlatform[] = [];
  const rawPlatforms = entry.platforms;
  if (
    !Array.isArray(rawPlatforms) ||
    rawPlatforms.length === 0 ||
    !rawPlatforms.every((p) => (FONT_PLATFORMS as readonly unknown[]).includes(p)) ||
    new Set(rawPlatforms).size !== rawPlatforms.length
  ) {
    problem(`${at}/platforms`, `${rawPlatforms === undefined ? "required: " : ""}a non-empty list of distinct values from ${FONT_PLATFORMS.join(", ")}`);
  } else {
    platforms = rawPlatforms as FontPlatform[];
  }

  const postscript: Record<string, string> = {};
  const rawPostscript = entry.postscript;
  if (rawPostscript !== undefined) {
    if (!isObject(rawPostscript)) {
      problem(`${at}/postscript`, "must be an object: weight → PostScript name");
    } else {
      for (const [weight, name] of Object.entries(rawPostscript)) {
        if (!/^[1-9]00$/.test(weight)) problem(`${at}/postscript/${weight}`, "weight must be 100, 200, … or 900 (ADR-0021 §1)");
        else if (typeof name !== "string" || !/^[\x21-\x7e]{1,63}$/.test(name) || /[[\](){}<>/%]/.test(name)) {
          problem(`${at}/postscript/${weight}`, "must be a PostScript name: 1–63 printable ASCII characters without spaces or [](){}<>/%");
        } else postscript[weight] = name;
      }
    }
  }
  const emptyPostscript = rawPostscript === undefined || (isObject(rawPostscript) && Object.keys(rawPostscript).length === 0);
  if (platforms.includes("apple") && emptyPostscript) {
    problem(`${at}/postscript`, "required, with at least one weight, when the file is bundled on Apple (ADR-0021 §11)");
  }
  if (family === null || file === null || version === null || sha256 === null) return null;
  return { family, file, version, sha256, platforms, postscript: sortedWeights(postscript) };
}

/** `fonts/<family-dir>/<file>`: exactly three plain segments, the layout ADR-0021 §11 prescribes. */
function isFontPath(file: string): boolean {
  const parts = file.split("/");
  return parts.length === 3 && parts[0] === "fonts" && parts.every((part) => part !== "" && part !== "." && part !== ".." && !part.includes("\\"));
}

function sortedWeights(map: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => Number(a) - Number(b)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined;
  const child = value[key];
  return isObject(child) ? child : undefined;
}
