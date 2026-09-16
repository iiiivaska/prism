// icons:validate / icons:build (roadmap P2-2, ADR-0013, ADR-0019 §6).
//
// 1. Validates spec/icons/registry.json against spec/icons/registry.schema.json (Ajv 8).
// 2. Cross-checks every `web.phosphor` against the installed @phosphor-icons/core catalog — the same
//    data the web bundle renders from — and the pinned version against the installed one.
// 3. Enforces the registry's own rules: labels, tags, one open set, per-platform `rtlMirror`, unique
//    Phosphor-derived bindings, deprecations, and the numeric icon tokens and px icon boxes against
//    the weight and size tables (critic C-22, C-23, C-24).
// 4. Checks ADR-0013 rule 5: no dotted SF Symbol name under web/, gallery/ or the design-tool exports.
// 5. Renders the generated artifacts and compares them with the committed files; `--write` writes them.
//
// SF Symbols availability at the OS floor, the NSImage smoke test and the CoreGlyphs mirroring table
// need macOS and live in tools/icons-apple, which the `apple` CI job runs.
//
//   node icons/validate.ts                validate and fail on stale generated output
//   node icons/validate.ts --write        write the generated output (pnpm icons:build)
//   node icons/validate.ts --root <dir>   work on another tree with the same layout (tests)
//   node icons/validate.ts --json         print the issues as JSON
//
// Exit codes: 0 clean, 1 an issue or stale output, 2 usage or layout error.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAgainstCatalog, checkRegistryRules, checkSfNamesAbsent, checkTables, checkTokens, type ScannedFile, type TokenDocument } from "./checks.ts";
import { renderAll } from "./codegen.ts";
import { OWNED_ROOTS, PATHS, SF_FREE_ROOTS, SF_FREE_SKIP } from "./config.ts";
import { loadCatalog, type Catalog } from "./phosphor.ts";
import { error, loadRegistry, type Issue, type Registry } from "./registry.ts";
import { writeOutputs } from "../tokens/output/write.ts";

/** Absolute repository root: the pnpm scripts run from tools/, never from the repository root. */
export const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Text files the SF-name rule reads; everything else in the scanned roots is skipped. */
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json", ".md", ".html", ".svg", ".yaml", ".yml", ".txt"]);

export interface RunOptions {
  readonly root: string;
  /** Write the generated files instead of comparing them. */
  readonly write: boolean;
}

export interface RunResult {
  readonly issues: readonly Issue[];
  /** Generated files rendered, whether or not they were written. */
  readonly generated: number;
  readonly written: { readonly added: readonly string[]; readonly changed: readonly string[]; readonly removed: readonly string[] };
  readonly ok: boolean;
}

function readJson(path: string): TokenDocument | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as TokenDocument;
}

/** Every text file under the roots ADR-0013 rule 5 keeps free of SF Symbol names. */
export function scanTextFiles(root: string, roots: readonly string[] = SF_FREE_ROOTS): readonly ScannedFile[] {
  const files: ScannedFile[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (SF_FREE_SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push({ path: relative(root, path).replaceAll("\\", "/"), text: readFileSync(path, "utf8") });
    }
  };
  for (const scanned of roots) {
    const abs = join(root, scanned);
    if (existsSync(abs)) walk(abs);
  }
  return files;
}

/** Every check, plus the generated output in write or compare mode. */
export function run(options: RunOptions, catalog: Catalog = loadCatalog()): RunResult {
  const { root, write } = options;
  const loaded = loadRegistry(root);
  const registry: Registry | null = loaded.registry;
  if (registry === null) return { issues: loaded.issues, generated: 0, written: { added: [], changed: [], removed: [] }, ok: false };
  const issues: Issue[] = [
    ...loaded.issues,
    ...checkTables(registry),
    ...checkAgainstCatalog(registry, catalog),
    ...checkRegistryRules(registry),
  ];
  const sysBase = readJson(join(root, PATHS.sysBase));
  const refDimensions = readJson(join(root, PATHS.refDimensions));
  if (sysBase === null || refDimensions === null) {
    issues.push(error("tokens/missing", PATHS.sysBase, "the token documents the weight and size tables answer for are not in this tree"));
  } else {
    issues.push(...checkTokens(registry, sysBase, refDimensions));
  }
  issues.push(...checkSfNamesAbsent(registry, scanTextFiles(root)));

  const rendered = renderAll(registry, catalog);
  for (const missing of rendered.missing) issues.push(error("phosphor/asset-missing", "Icons.xcassets", `no SVG for ${missing}`));
  const report = writeOutputs(rendered.files, { root, owned: OWNED_ROOTS, check: !write });
  if (!write) {
    for (const path of report.added) issues.push(error("generated/stale", path, "is missing; run `pnpm icons:build` and commit the result"));
    for (const path of report.changed) issues.push(error("generated/stale", path, "differs from the registry; run `pnpm icons:build` and commit the result"));
    for (const path of report.removed) issues.push(error("generated/stale", path, "is no longer generated; run `pnpm icons:build` and commit the removal"));
  }
  const ok = issues.every((issue) => issue.severity !== "error");
  return { issues, generated: rendered.files.length, written: report, ok };
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function formatIssue(issue: Issue): string {
  const where = issue.where === "" ? "" : ` ${issue.where}`;
  return `${issue.severity === "error" ? "error" : "warn "} ${issue.code}${where}: ${issue.message}`;
}

export function main(argv: readonly string[]): number {
  let root = REPO_ROOT;
  let write = false;
  let asJson = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--write") {
      write = true;
      continue;
    }
    if (flag === "--json") {
      asJson = true;
      continue;
    }
    if (flag === "--root") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        console.error("icons:validate: --root needs a path");
        return 2;
      }
      root = resolve(value);
      i++;
      continue;
    }
    console.error(`icons:validate: unknown argument ${JSON.stringify(flag)}`);
    return 2;
  }
  let result: RunResult;
  try {
    result = run({ root, write });
  } catch (e) {
    console.error(`icons:validate: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  if (asJson) {
    console.log(JSON.stringify({ ok: result.ok, generated: result.generated, issues: result.issues, written: result.written }, null, 2));
    return result.ok ? 0 : 1;
  }
  for (const issue of result.issues) console.log(formatIssue(issue));
  const errors = result.issues.filter((issue) => issue.severity === "error").length;
  const warnings = result.issues.length - errors;
  if (write) {
    const { added, changed, removed } = result.written;
    console.log(`icons:build: ${result.generated} generated files (${added.length} added, ${changed.length} changed, ${removed.length} removed)`);
  } else if (errors === 0) {
    console.log(`icons:validate: registry valid, ${result.generated} generated files current${warnings > 0 ? `, ${count(warnings, "warning")}` : ""}`);
  }
  if (errors > 0) console.error(`icons:validate: ${count(errors, "error")}${warnings > 0 ? ` and ${count(warnings, "warning")}` : ""}`);
  return result.ok ? 0 : 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
