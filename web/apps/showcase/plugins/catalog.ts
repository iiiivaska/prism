/// <reference types="node" />
/**
 * Discovery for the Components screen (docs/showcase.md §1): the app holds no list of components.
 *
 * This plugin composes, at build time, the two things `pnpm parity:report` reads — every spec under
 * `spec/components/` and `spec/patterns/` (ADR-0006 rule 1) and the web implementation manifests
 * (rule 2) — into the virtual module `virtual:prism/catalog`. *Which* manifests those are is not
 * written here either: it is `MANIFESTS` of `tools/parity/config.ts` filtered to the web stack, so the
 * showcase reads exactly what the parity report reads. Today that is `web/packages/react` for layers
 * 0-2 and `web/packages/charts` for the data-viz layer (ADR-0007), and a chart component that lands
 * is a page, and a harness gate, with no edit here.
 * Nothing about a component is written in the app: its summary, props, states, behaviour, platform
 * support, platform notes and examples all come from its own spec file, so a component whose spec
 * lands is a row the next build, and a component whose *manifest entry* lands is a page with its
 * examples the next build.
 *
 * The anti-staleness mechanism docs/showcase.md §1 specifies: **the generated module names a symbol
 * that does not exist yet**. For every component in the manifest it emits
 *
 *     import { renderListRowExample } from "<app>/src/harness/renderers.tsx";
 *
 * so a component that ships without a harness entry cannot build. `assertRenderers` reports that as a
 * plain sentence before the bundler reports it as a missing export, because the sentence says what to
 * write and where. `pnpm -r build` runs this, so the gate costs CI no new step (docs/showcase.md §5).
 *
 * Each manifest is read as text with the same grammar `tools/parity/manifest.ts` specifies — a plain
 * literal of component name → platform → integer version — because the app must not import and
 * execute a package's source to learn what it implements. `tools/showcase/web/catalog.test.ts` holds
 * that grammar to the parser the parity report uses, and proves the gate fires.
 */
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { parse } from "yaml";
import { MANIFESTS } from "../../../../tools/parity/config.ts";

const MODULE_ID = "virtual:prism/catalog";
const RESOLVED_ID = `\0${MODULE_ID}`;

/**
 * The token half of discovery, from `@iiiivaska/prism-tokens/manifest.json` — an already-published
 * export of the package, resolved through its own `exports` map. It is read here rather than imported
 * as JSON in the app only so that its 564 entries reach TypeScript as one declared type instead of
 * 564 inferred literal ones; the file and the fields are the package's, not this app's.
 */
const TOKENS_ID = "virtual:prism/tokens";
const RESOLVED_TOKENS_ID = `\0${TOKENS_ID}`;

/**
 * One loader per brand the resolver declares (`modifiers[brand].contexts`), each a static import of
 * that brand's stylesheet, fonts and table, so a bundler can see them. A brand that lands in the
 * resolver is a working `?brand=` the next build, with no list written anywhere in the app.
 */
const BRANDS_ID = "virtual:prism/brands";
const RESOLVED_BRANDS_ID = `\0${BRANDS_ID}`;

/**
 * The manifests of this stack, from the parity report's own list: the `react` stack is the one that
 * declares the web platform keys of `spec/SCHEMA.md` (ADR-0003, ADR-0006 rule 2), across the two
 * packages that ship components (ADR-0007). Repository-relative POSIX paths.
 */
export const WEB_MANIFESTS: readonly string[] = MANIFESTS.filter((manifest) => manifest.stack === "react").map((manifest) => manifest.path);

/** One entry of `@iiiivaska/prism-tokens/manifest.json`. */
export interface TokenManifestEntry {
  readonly path: string;
  readonly id: string;
  readonly tier: string;
  /** The DTCG `$type`, which picks the specimen. */
  readonly type: string;
  readonly dependsOn: readonly string[];
  /** The token's own CSS variable, or `null` when it publishes sub-properties only (typography, strokeStyle). */
  readonly css: string | null;
  readonly cssVars: readonly string[];
  readonly tailwind: readonly string[];
  readonly tailwindTheme: readonly string[];
  /** The key in a `<brand>/tokens` table, or `null` for the `ref` tier, which has no JavaScript API. */
  readonly ts: string | null;
  /** The Swift member path, or `null`; shown so the two stacks can be compared by name. */
  readonly swift: string | null;
  readonly asset: string | null;
  readonly description: string | null;
  readonly deprecated: { readonly since?: string; readonly replacedBy?: string } | null;
}

/** One resolver modifier of the manifest; `brand` is where the brand switcher's list comes from. */
export interface TokenModifier {
  readonly name: string;
  readonly contexts: readonly string[];
  readonly default: string;
}

/** One `examples[]` entry of a spec (spec/SCHEMA.md, "Examples and snapshots"). */
export interface CatalogExample {
  readonly id: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly surface?: string;
  readonly backdrop?: string;
  readonly grid?: readonly string[];
  readonly schemes?: readonly string[];
  readonly description?: string;
}

export interface CatalogProp {
  readonly name: string;
  readonly type: string;
  readonly values?: readonly string[];
  readonly default?: unknown;
  readonly required?: boolean;
  readonly description?: string;
}

/** A spec as the showcase needs it; every field is copied from the YAML, none is invented. */
export interface CatalogSpec {
  readonly name: string;
  readonly kind: "component" | "pattern";
  readonly layer: string;
  readonly specVersion: number;
  readonly status: string;
  readonly since: string | null;
  readonly summary: string;
  /** Repository-relative POSIX path of the spec file. */
  readonly file: string;
  /** Platform key → `full` | `adapted` | `none`, as the spec declares it. */
  readonly platforms: Readonly<Record<string, string>>;
  /** `notes.platform.<key>`, when the spec gives one. */
  readonly platformNotes: Readonly<Record<string, string>>;
  readonly props: readonly CatalogProp[];
  readonly states: readonly string[];
  readonly behavior: readonly string[];
  readonly examples: readonly CatalogExample[];
}

/** Component name → platform key → the spec version the web packages implement there. */
export type ImplementedTable = Readonly<Record<string, Readonly<Record<string, number>>>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** The `examples[]` of a spec, with the fields spec/SCHEMA.md gives them. */
function examplesOf(spec: Record<string, unknown>): CatalogExample[] {
  const raw = spec["examples"];
  if (!Array.isArray(raw)) return [];
  const examples: CatalogExample[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = stringOf(item["id"]);
    if (id === null) continue;
    const example: Record<string, unknown> = { id, props: isRecord(item["props"]) ? item["props"] : {} };
    for (const key of ["surface", "backdrop", "description"] as const) {
      const value = stringOf(item[key]);
      if (value !== null) example[key] = value;
    }
    for (const key of ["grid", "schemes"] as const) {
      if (Array.isArray(item[key])) example[key] = stringList(item[key]);
    }
    examples.push(example as unknown as CatalogExample);
  }
  return examples;
}

function propsOf(spec: Record<string, unknown>): CatalogProp[] {
  const raw = spec["props"];
  if (!Array.isArray(raw)) return [];
  const props: CatalogProp[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = stringOf(item["name"]);
    const type = stringOf(item["type"]);
    if (name === null || type === null) continue;
    const prop: Record<string, unknown> = { name, type };
    if (Array.isArray(item["values"])) prop["values"] = item["values"].map((v) => String(v));
    if (item["default"] !== undefined) prop["default"] = item["default"];
    if (item["required"] === true) prop["required"] = true;
    const description = stringOf(item["description"]);
    if (description !== null) prop["description"] = description;
    props.push(prop as unknown as CatalogProp);
  }
  return props;
}

function platformNotesOf(spec: Record<string, unknown>): Record<string, string> {
  const notes = spec["notes"];
  if (!isRecord(notes)) return {};
  const platform = notes["platform"];
  if (!isRecord(platform)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(platform)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function readSpecs(root: string, dir: string, kind: CatalogSpec["kind"]): CatalogSpec[] {
  const absolute = join(root, dir);
  const specs: CatalogSpec[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (entry.isDirectory() || !/\.ya?ml$/.test(entry.name)) continue;
    const file = `${dir}/${entry.name}`;
    const parsed: unknown = parse(readFileSync(join(absolute, entry.name), "utf8"));
    if (!isRecord(parsed)) continue;
    const name = stringOf(parsed["name"]);
    const specVersion = parsed["specVersion"];
    if (name === null || typeof specVersion !== "number") continue;
    const platforms: Record<string, string> = {};
    if (isRecord(parsed["platforms"])) {
      for (const [key, value] of Object.entries(parsed["platforms"])) {
        if (typeof value === "string") platforms[key] = value;
      }
    }
    specs.push({
      name,
      kind,
      layer: stringOf(parsed["layer"]) ?? "",
      specVersion,
      status: stringOf(parsed["status"]) ?? "",
      since: stringOf(parsed["since"]),
      summary: (stringOf(parsed["summary"]) ?? "").trim(),
      file,
      platforms,
      platformNotes: platformNotesOf(parsed),
      props: propsOf(parsed),
      states: stringList(parsed["states"]),
      behavior: stringList(parsed["behavior"]),
      examples: examplesOf(parsed),
    });
  }
  specs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return specs;
}

/**
 * The `implemented` literal of a manifest, read as text — the grammar of `tools/parity/manifest.ts`:
 * component name → platform key → integer version, comments and whitespace skipped, nothing else.
 *
 * The literal ends at the first `};`, which is also how an **empty** table is read: `web/packages/charts`
 * ships no data-viz component yet and writes `= {};` on one line, and a grammar that insisted on a
 * closing brace of its own would refuse the very manifest the next components land in.
 */
export function readImplemented(source: string, file: string): ImplementedTable {
  const literal = /\bconst\s+implemented\b[^=]*=\s*\{([\s\S]*?)\}\s*;/.exec(source)?.[1];
  if (literal === undefined) {
    throw new Error(`${file} has no \`const implemented = { … };\` literal (tools/parity/manifest.ts grammar)`);
  }
  const table: Record<string, Record<string, number>> = {};
  for (const entry of literal.matchAll(/"?([A-Za-z_$][\w$]*)"?\s*:\s*\{([^}]*)\}/g)) {
    const component = entry[1];
    const body = entry[2];
    if (component === undefined || body === undefined) continue;
    const versions: Record<string, number> = {};
    for (const pair of body.matchAll(/"([^"]+)"\s*:\s*(\d+)/g)) {
      const platform = pair[1];
      const version = pair[2];
      if (platform === undefined || version === undefined) continue;
      versions[platform] = Number.parseInt(version, 10);
    }
    table[component] = versions;
  }
  return table;
}

/**
 * The tables of every web manifest as one: component name → platform → version. A component is
 * declared in exactly one of them (`LAYER_MANIFEST` of tools/parity/config.ts), so nothing here has to
 * choose between two answers — merging is how the showcase stops caring which package a component
 * ships from.
 */
export function mergeImplemented(tables: readonly ImplementedTable[]): ImplementedTable {
  const merged: Record<string, Record<string, number>> = {};
  for (const table of tables) {
    for (const [component, versions] of Object.entries(table)) {
      const existing = merged[component];
      if (existing === undefined) merged[component] = { ...versions };
      else Object.assign(existing, versions);
    }
  }
  return merged;
}

/** `Button` → `renderButtonExample`: the harness entry one component needs (docs/showcase.md §1). */
export function rendererName(component: string): string {
  return `render${component}Example`;
}

/**
 * Fails the build when a component the manifest declares has no harness entry, before the bundler
 * fails on the missing import. The message is the whole point: it says what to write and where.
 */
export function assertRenderers(
  implemented: ImplementedTable,
  harnessSource: string,
  harnessFile: string,
  manifestFiles: readonly string[] = WEB_MANIFESTS,
): void {
  const missing = Object.keys(implemented).filter((component) => !harnessSource.includes(`export function ${rendererName(component)}`));
  if (missing.length === 0) return;
  const lines = missing.map((component) => `  ${rendererName(component)}(props, example)  — for ${component}`);
  throw new Error(
    [
      `The showcase has no way to stage ${missing.join(", ")}.`,
      `${harnessFile} must export:`,
      ...lines,
      `The web manifests (${manifestFiles.join(", ")}) say the packages implement these, so the showcase must show them.`,
    ].join("\n"),
  );
}

interface TokenManifestRead {
  readonly manifestPath: string;
  readonly manifest: Record<string, unknown>;
}

/** `@iiiivaska/prism-tokens/manifest.json`, resolved through the package's own `exports` map. */
function readTokenManifest(): TokenManifestRead {
  const manifestPath = createRequire(import.meta.url).resolve("@iiiivaska/prism-tokens/manifest.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!isRecord(manifest) || !Array.isArray(manifest["tokens"])) {
    throw new Error(`${manifestPath} has no \`tokens\` array; run \`pnpm tokens:build\``);
  }
  return { manifestPath, manifest };
}

/** The brands the resolver declares, the default first. */
function brandContexts(read: TokenManifestRead): string[] {
  const modifiers: unknown[] = Array.isArray(read.manifest["modifiers"]) ? (read.manifest["modifiers"] as unknown[]) : [];
  const brand = modifiers.find((entry) => isRecord(entry) && entry["name"] === "brand");
  const contexts: unknown[] = isRecord(brand) && Array.isArray(brand["contexts"]) ? (brand["contexts"] as unknown[]) : [];
  const ids = contexts.filter((value): value is string => typeof value === "string");
  if (ids.length === 0) throw new Error("The token manifest declares no `brand` modifier contexts; run `pnpm tokens:build`");
  return ids;
}

export interface CatalogOptions {
  /** Repository root; the specs and the manifest are read from it. */
  readonly repositoryRoot: string;
  /** This app's root, which holds src/harness/renderers.tsx. */
  readonly appRoot: string;
}

export function prismCatalog(options: CatalogOptions): Plugin {
  const { repositoryRoot, appRoot } = options;
  const manifestFiles = WEB_MANIFESTS.map((path) => ({ path, absolute: join(repositoryRoot, ...path.split("/")) }));
  const harnessFile = join(appRoot, "src", "harness", "renderers.tsx");
  const componentsDir = join(repositoryRoot, "spec", "components");
  const patternsDir = join(repositoryRoot, "spec", "patterns");
  const packageFile = join(repositoryRoot, "web", "packages", "react", "package.json");

  return {
    name: "prism-showcase-catalog",

    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID;
      if (id === TOKENS_ID) return RESOLVED_TOKENS_ID;
      if (id === BRANDS_ID) return RESOLVED_BRANDS_ID;
      return null;
    },

    load(id) {
      if (id === RESOLVED_BRANDS_ID) {
        const loaders = brandContexts(readTokenManifest()).map(
          (brand) =>
            `  ${JSON.stringify(brand)}: async () => {\n` +
            `    await import("@iiiivaska/prism-tokens/brands/${brand}/tokens.css");\n` +
            `    await import("@iiiivaska/prism-tokens/brands/${brand}/fonts.css");\n` +
            `    return await import("@iiiivaska/prism-tokens/brands/${brand}/tokens");\n` +
            "  }",
        );
        return [
          "// Generated by web/apps/showcase/plugins/catalog.ts from the `brand` modifier of the token manifest.",
          `export const brandLoaders = {\n${loaders.join(",\n")}\n};`,
          "",
        ].join("\n");
      }
      if (id === RESOLVED_TOKENS_ID) {
        const { manifestPath, manifest } = readTokenManifest();
        this.addWatchFile(manifestPath);
        return [
          "// The published @iiiivaska/prism-tokens/manifest.json, read through the package's exports map.",
          `export const tokens = ${JSON.stringify(manifest["tokens"])};`,
          `export const modifiers = ${JSON.stringify(manifest["modifiers"] ?? [])};`,
          `export const platformDefaults = ${JSON.stringify(manifest["platformDefaults"] ?? {})};`,
          "",
        ].join("\n");
      }
      if (id !== RESOLVED_ID) return null;

      const components = readSpecs(repositoryRoot, "spec/components", "component");
      const patterns = readSpecs(repositoryRoot, "spec/patterns", "pattern");
      const implemented = mergeImplemented(manifestFiles.map((manifest) => readImplemented(readFileSync(manifest.absolute, "utf8"), manifest.path)));
      assertRenderers(implemented, readFileSync(harnessFile, "utf8"), "web/apps/showcase/src/harness/renderers.tsx");

      const pkg: unknown = JSON.parse(readFileSync(packageFile, "utf8"));
      const url = isRecord(pkg) && isRecord(pkg["repository"]) ? stringOf(pkg["repository"]["url"]) : null;
      // `https://github.com/iiiivaska/prism.git` → the tree a spec path hangs off.
      const repository = (url ?? "").replace(/\.git$/, "");

      // The whole point of the module: a name that does not resolve until the harness has the entry.
      const staged = Object.keys(implemented).sort();
      const imports = staged.map((component) => rendererName(component));

      // A rebuild when a spec, a manifest or the harness changes.
      for (const dir of [componentsDir, patternsDir]) {
        for (const entry of readdirSync(dir)) if (/\.ya?ml$/.test(entry)) this.addWatchFile(join(dir, entry));
      }
      for (const manifest of manifestFiles) this.addWatchFile(manifest.absolute);
      this.addWatchFile(harnessFile);

      return [
        "// Generated by web/apps/showcase/plugins/catalog.ts from spec/components, spec/patterns and",
        `// ${WEB_MANIFESTS.join(", ")}. Nothing here is hand-written.`,
        imports.length === 0
          ? ""
          : `import { ${imports.join(", ")} } from ${JSON.stringify(harnessFile)};`,
        `export const components = ${JSON.stringify(components)};`,
        `export const patterns = ${JSON.stringify(patterns)};`,
        `export const implemented = ${JSON.stringify(implemented)};`,
        `export const manifests = ${JSON.stringify(WEB_MANIFESTS)};`,
        `export const specSource = ${JSON.stringify({ repository, blob: `${repository}/blob/main` })};`,
        `export const renderers = { ${staged.map((component) => `${JSON.stringify(component)}: ${rendererName(component)}`).join(", ")} };`,
        "",
      ].join("\n");
    },

    handleHotUpdate(context) {
      const touched =
        manifestFiles.some((manifest) => context.file === manifest.absolute) ||
        context.file === harnessFile ||
        context.file.startsWith(componentsDir) ||
        context.file.startsWith(patternsDir);
      if (!touched) return;
      const module = context.server.moduleGraph.getModuleById(RESOLVED_ID);
      if (module !== undefined) context.server.moduleGraph.invalidateModule(module);
    },
  };
}
