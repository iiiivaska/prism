// fonts:check (ADR-0021 §11, ADR-0020 rule 14, ARCHITECTURE §3.3): checks every font file a repo
// brand serves, on either platform, against its brand.json entry:
//
//   files           the file exists, with an OFL.txt (the SIL Open Font License) in the same folder
//   sha256          its SHA-256 equals `sha256`
//   version         name ID 5 equals "Version " + `version`
//   cyrillic        the cmap covers U+0410–U+044F, U+0401 and U+0451 (Russian, Ё/ё included)
//   tabular-digits  at the default instance U+0030–U+0039 have equal advances, either without
//                   features or after the font's GSUB `tnum` single substitutions (lookup type 1,
//                   also inside type 7 extension lookups)
//   postscript      every `postscript` entry names an fvar instance at that `wght`: its
//                   `postScriptNameID` string, or name ID 6 for the instance at the default coordinates
//
// plus `brand.json` (the font entries are well formed) and `budget` (the files bundled into DSTokens,
// deduplicated by SHA-256, total at most 2 MiB). It prints one table row per file and check and exits
// 1 on any failure. The font files are emitted by tokens:build (tools/tokens/formats/fonts.ts), not here.
//
//   node fonts/check.ts               check this repository
//   node fonts/check.ts --root <dir>  check another tree with the same layout
//   node fonts/check.ts --json        print the rows as JSON instead of a table

import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import type { BrandFont, BrandFonts, BrandProblem, FontPlatform, FontSlot, TreeReader } from "./brands.ts";
import { fsTreeReader, loadBrands, RESOLVER_PATH } from "./brands.ts";
import type { FontFile, FontInstance } from "./font-file.ts";
import { FontParseError, readFontFile, substitute } from "./font-file.ts";

/** ADR-0020 rule 14: the font files bundled into DSTokens, deduplicated by SHA-256. Raising it needs an ADR. */
export const FONT_BUDGET_BYTES = 2 * 1024 * 1024;

/** Russian Cyrillic: А–я plus Ё and ё (ADR-0021 §11 check 4). */
export const REQUIRED_CODE_POINTS: readonly number[] = [0x401, ...range(0x410, 0x44f), 0x451];

export const DIGITS: readonly number[] = range(0x30, 0x39);

export const CHECKS = ["brand.json", "files", "sha256", "version", "cyrillic", "tabular-digits", "postscript", "budget"] as const;
export type CheckName = (typeof CHECKS)[number];
export type Status = "pass" | "fail" | "skip";

export interface CheckRow {
  /** Repository-relative path of the font file or brand.json; "DSTokens" for the budget. */
  readonly file: string;
  /** "prism (ui, display)"; brand names only for brand.json and the budget. */
  readonly servedBy: string;
  readonly check: CheckName;
  /** "skip" never fails the run by itself: it marks a check with nothing to check, or one whose prerequisite already failed. */
  readonly status: Status;
  readonly detail: string;
}

/** One font file as its brand serves it: the entries of every slot that names it, merged. */
export interface ServedFile {
  /** Repository-relative: brands/<brand>/<entry.file>. */
  readonly path: string;
  readonly brand: string;
  readonly brandJson: string;
  readonly slots: readonly FontSlot[];
  readonly entry: BrandFont;
}

export interface FontsCheckOptions {
  readonly resolverPath?: string;
  readonly budgetBytes?: number;
}

export interface FontsCheckResult {
  readonly rows: readonly CheckRow[];
  readonly ok: boolean;
}

/** Runs every check over the brands of the resolver read through `reader`. Throws only on a layout error (no resolver). */
export function runFontsCheck(reader: TreeReader, options: FontsCheckOptions = {}): FontsCheckResult {
  const { brands, problems } = loadBrands(reader, options.resolverPath ?? RESOLVER_PATH);
  const rows: CheckRow[] = [];
  const allFiles: ServedFile[] = [];
  for (const brand of brands) {
    const served = servedFiles(brand);
    const brandProblems = [...problems.filter((p) => p.file === brand.path), ...served.problems];
    rows.push(...brandJsonRows(brand, served.files, brandProblems));
    for (const file of served.files) rows.push(...checkServedFile(file, reader));
    allFiles.push(...served.files);
  }
  // A brand context without a brand.json has no BrandFonts; report its problem on its own.
  for (const problem of problems) {
    if (!brands.some((brand) => brand.path === problem.file)) rows.push(problemRow(problem, problem.file.split("/")[1] ?? ""));
  }
  rows.push(checkBudget(allFiles, reader, options.budgetBytes ?? FONT_BUDGET_BYTES));
  return { rows, ok: rows.every((row) => row.status !== "fail") };
}

/** Groups a brand's entries by file. Entries naming one file must agree on family, version and sha256; platforms and PostScript names merge. */
export function servedFiles(brand: BrandFonts): { files: ServedFile[]; problems: BrandProblem[] } {
  const files = new Map<string, { slots: FontSlot[]; entry: BrandFont }>();
  const problems: BrandProblem[] = [];
  for (const [slot, entry] of Object.entries(brand.fonts) as [FontSlot, BrandFont][]) {
    const known = files.get(entry.file);
    if (known === undefined) {
      files.set(entry.file, { slots: [slot], entry });
      continue;
    }
    const first = known.slots[0] ?? slot;
    const conflicts = (["family", "version", "sha256"] as const).filter((key) => known.entry[key] !== entry[key]);
    for (const key of conflicts) {
      problems.push({
        file: brand.path,
        pointer: `/fonts/${slot}/${key}`,
        message: `"${entry[key]}" differs from /fonts/${first}/${key} "${known.entry[key]}", which names the same file`,
      });
    }
    const postscript: Record<string, string> = { ...known.entry.postscript };
    for (const [weight, name] of Object.entries(entry.postscript)) {
      const other = postscript[weight];
      if (other !== undefined && other !== name) {
        problems.push({
          file: brand.path,
          pointer: `/fonts/${slot}/postscript/${weight}`,
          message: `"${name}" differs from /fonts/${first}/postscript/${weight} "${other}", which names the same file`,
        });
      }
      postscript[weight] ??= name;
    }
    const platforms = [...new Set<FontPlatform>([...known.entry.platforms, ...entry.platforms])].sort();
    known.slots.push(slot);
    known.entry = { ...known.entry, platforms, postscript: Object.fromEntries(Object.entries(postscript).sort(([a], [b]) => Number(a) - Number(b))) };
  }
  return {
    files: [...files.values()].map(({ slots, entry }) => ({ path: `brands/${brand.name}/${entry.file}`, brand: brand.name, brandJson: brand.path, slots, entry })),
    problems,
  };
}

/** The six per-file checks, in ADR-0021 §11 order. */
export function checkServedFile(file: ServedFile, reader: TreeReader): CheckRow[] {
  const servedBy = `${file.brand} (${file.slots.join(", ")})`;
  const rows: CheckRow[] = [];
  const row = (check: CheckName, status: Status, detail: string): void => {
    rows.push({ file: file.path, servedBy, check, status, detail });
  };
  const at = (key: keyof BrandFont): string => `${file.brandJson} /fonts/${file.slots[0] ?? "ui"}/${key}`;

  const bytes = reader.readFile(file.path);
  const oflPath = posix.join(posix.dirname(file.path), "OFL.txt");
  const ofl = reader.readFile(oflPath);
  const fileProblems: string[] = [];
  if (bytes === null) fileProblems.push(`the font file does not exist (${at("file")})`);
  if (ofl === null) fileProblems.push(`no ${oflPath} beside the font`);
  else if (!/open\s+font\s+license/i.test(new TextDecoder().decode(ofl))) fileProblems.push(`${oflPath} is not the SIL Open Font License text`);
  if (fileProblems.length > 0) row("files", "fail", fileProblems.join("; "));
  else row("files", "pass", `font ${formatBytes(bytes?.length ?? 0)}, OFL.txt beside it`);

  if (bytes === null) {
    for (const check of ["sha256", "version", "cyrillic", "tabular-digits", "postscript"] as const) row(check, "skip", "not run: the font file is missing");
    return rows;
  }

  const actual = sha256(bytes);
  if (actual === file.entry.sha256) row("sha256", "pass", actual);
  else row("sha256", "fail", `the file hashes to ${actual}, but ${at("sha256")} says ${file.entry.sha256}`);

  let font: FontFile;
  try {
    font = readFontFile(bytes);
  } catch (error) {
    if (!(error instanceof FontParseError)) throw error;
    for (const check of ["version", "cyrillic", "tabular-digits", "postscript"] as const) row(check, "fail", `cannot parse the font: ${error.message}`);
    return rows;
  }

  const expectedVersion = `Version ${file.entry.version}`;
  if (font.version === expectedVersion) row("version", "pass", `name ID 5 "${font.version}"`);
  else {
    const found = font.version === null ? "the font has no name ID 5" : `name ID 5 is "${font.version}"`;
    row("version", "fail", `${found}, but ${at("version")} "${file.entry.version}" needs "${expectedVersion}"`);
  }

  const missing = REQUIRED_CODE_POINTS.filter((cp) => font.glyphFor(cp) === null);
  if (missing.length === 0) row("cyrillic", "pass", `cmap covers U+0410–U+044F, U+0401 and U+0451 (${REQUIRED_CODE_POINTS.length} code points)`);
  else row("cyrillic", "fail", `cmap lacks ${missing.length} of ${REQUIRED_CODE_POINTS.length} required code points: ${formatCodePoints(missing)}`);

  const [digitsStatus, digitsDetail] = tabularDigits(font);
  row("tabular-digits", digitsStatus, digitsDetail);

  const [psStatus, psDetail] = postscriptNames(font, file.entry);
  row("postscript", psStatus, psDetail);
  return rows;
}

/** ADR-0021 §11 check 5. */
export function tabularDigits(font: FontFile): [Status, string] {
  const glyphs = DIGITS.map((cp) => font.glyphFor(cp));
  const unmapped = DIGITS.filter((_, i) => glyphs[i] === null);
  if (unmapped.length > 0) return ["fail", `cmap lacks ${formatCodePoints(unmapped)}`];
  const plain = glyphs.map((glyph) => font.advance(glyph ?? 0));
  if (allEqual(plain)) return ["pass", `0–9 all ${plain[0]} units without features`];
  const ignored = font.tnum.ignoredLookupTypes.length > 0 ? `; tnum lookup types ${font.tnum.ignoredLookupTypes.join(", ")} not applied` : "";
  if (font.tnum.lookups.length === 0) {
    return ["fail", `proportional digits (0–9 advances ${plain.join(" ")}) and no GSUB tnum single substitution${ignored}`];
  }
  const tabular = glyphs.map((glyph) => font.advance(substitute(font.tnum, glyph ?? 0)));
  if (allEqual(tabular)) return ["pass", `0–9 all ${tabular[0]} units after tnum (without features ${plain.join(" ")})`];
  return ["fail", `unequal advances without features (${plain.join(" ")}) and after tnum (${tabular.join(" ")})${ignored}`];
}

/** ADR-0021 §11 check 6. A static font counts as one default instance at its OS/2 weight. */
export function postscriptNames(font: FontFile, entry: BrandFont): [Status, string] {
  const wanted = Object.entries(entry.postscript);
  if (wanted.length === 0) {
    return entry.platforms.includes("apple") ? ["fail", "no postscript entries, but the file is bundled on Apple"] : ["skip", "none: the file is not bundled on Apple"];
  }
  const instances: readonly FontInstance[] =
    font.instances.length > 0 || font.weightClass === null
      ? font.instances
      : [{ coordinates: { wght: font.weightClass }, postScriptName: font.postScriptName, isDefault: true }];
  const exposed = (instance: FontInstance): string | null => (instance.isDefault ? font.postScriptName : instance.postScriptName);
  const problems: string[] = [];
  let usesNameId6 = false;
  for (const [weight, name] of wanted) {
    const atWeight = instances.filter((instance) => instance.coordinates.wght === Number(weight));
    if (atWeight.length === 0) {
      const weights = [...new Set(instances.map((instance) => instance.coordinates.wght))].join(" ");
      problems.push(`${weight} "${name}": no ${font.axes.length > 0 ? "fvar instance" : "font"} at wght ${weight} (instances at ${weights || "none"})`);
      continue;
    }
    const names = atWeight.map(exposed);
    if (names.includes(name)) {
      if (atWeight.some((instance) => instance.isDefault && exposed(instance) === name && instance.postScriptName !== name)) usesNameId6 = true;
      continue;
    }
    const described = atWeight.map((instance) =>
      instance.isDefault ? `"${font.postScriptName}" (name ID 6: the default instance)` : `"${instance.postScriptName ?? "no PostScript name"}"`,
    );
    problems.push(`${weight} "${name}": Core Text exposes ${described.join(" or ")}`);
  }
  if (problems.length > 0) return ["fail", problems.join("; ")];
  const note = usesNameId6 ? "; the default instance takes name ID 6" : "";
  return ["pass", `${wanted.map(([weight]) => weight).join(" ")} name ${font.axes.length > 0 ? "fvar instances" : "the font"}${note}`];
}

/** ADR-0020 rule 14: the files bundled on Apple, deduplicated by SHA-256, total at most `budget` bytes. */
export function checkBudget(files: readonly ServedFile[], reader: TreeReader, budget: number): CheckRow {
  const apple = files.filter((file) => file.entry.platforms.includes("apple"));
  const sizes = new Map<string, number>();
  for (const file of apple) {
    const bytes = reader.readFile(file.path);
    if (bytes !== null) sizes.set(sha256(bytes), bytes.length);
  }
  const total = [...sizes.values()].reduce((sum, size) => sum + size, 0);
  const brands = [...new Set(apple.map((file) => file.brand))];
  const counted = `${sizes.size} file${sizes.size === 1 ? "" : "s"} after SHA-256 deduplication`;
  const base = { file: "DSTokens", servedBy: brands.join(", ") || "none", check: "budget" as const };
  if (total <= budget) return { ...base, status: "pass", detail: `${formatBytes(total)} of ${formatBytes(budget)} (${counted})` };
  return {
    ...base,
    status: "fail",
    detail: `${formatBytes(total)} exceed the ${formatBytes(budget)} budget (${counted}); ADR-0020 rule 14: move brands to route 2, or raise the budget by ADR`,
  };
}

function brandJsonRows(brand: BrandFonts, files: readonly ServedFile[], problems: readonly BrandProblem[]): CheckRow[] {
  if (problems.length > 0) return problems.map((problem) => problemRow(problem, brand.name));
  const entries = Object.keys(brand.fonts).length;
  return [
    {
      file: brand.path,
      servedBy: brand.name,
      check: "brand.json",
      status: "pass",
      detail: `${entries} font entr${entries === 1 ? "y" : "ies"}, ${files.length} file${files.length === 1 ? "" : "s"}`,
    },
  ];
}

function problemRow(problem: BrandProblem, brand: string): CheckRow {
  return { file: problem.file, servedBy: brand, check: "brand.json", status: "fail", detail: `${problem.pointer || "/"}: ${problem.message}` };
}

/** Markdown table: one row per file and check. */
export function formatTable(rows: readonly CheckRow[]): string {
  const cell = (text: string): string => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = ["| File | Served by | Check | Result | Detail |", "|---|---|---|---|---|"];
  for (const row of rows) {
    lines.push(`| \`${cell(row.file)}\` | ${cell(row.servedBy)} | ${row.check} | ${row.status === "fail" ? "**FAIL**" : row.status} | ${cell(row.detail)} |`);
  }
  return lines.join("\n");
}

/** `path: check: reason` for every failed row. */
export function formatFailures(rows: readonly CheckRow[]): string[] {
  return rows.filter((row) => row.status === "fail").map((row) => `${row.file}: ${row.check}: ${row.detail}`);
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function allEqual(values: readonly (number | null)[]): boolean {
  return values.every((value) => value !== null && value === values[0]);
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function hex(cp: number): string {
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** "U+0401, U+0410–U+044F": consecutive code points collapse into ranges. */
export function formatCodePoints(codePoints: readonly number[]): string {
  const sorted = [...codePoints].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] ?? 0) + 1) j++;
    const start = sorted[i] ?? 0;
    const end = sorted[j] ?? 0;
    parts.push(start === end ? hex(start) : `${hex(start)}–${hex(end)}`);
    i = j + 1;
  }
  return parts.join(", ");
}

function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString("en-US")} bytes`;
}

/** CLI entry; returns the process exit code (0 every check passes, 1 a check fails, 2 usage or layout error). */
export function main(argv: readonly string[]): number {
  let root = join(import.meta.dirname, "..", "..");
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    if (flag === "--json") {
      json = true;
      continue;
    }
    if (flag !== "--root") {
      console.error(`fonts:check: unknown argument ${JSON.stringify(flag)}`);
      return 2;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      console.error("fonts:check: --root needs a path");
      return 2;
    }
    root = value;
    i++;
  }
  let result: FontsCheckResult;
  try {
    result = runFontsCheck(fsTreeReader(resolve(root)));
  } catch (error) {
    console.error(`fonts:check: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const table = formatTable(result.rows);
  console.log(json ? JSON.stringify(result.rows, null, 2) : table);
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    try {
      appendFileSync(summaryFile, `## fonts:check\n\n${table}\n`);
    } catch (error) {
      console.error(`fonts:check: cannot append to GITHUB_STEP_SUMMARY: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const files = new Set(result.rows.filter((row) => row.check === "files").map((row) => row.file)).size;
  if (result.ok) {
    const summary = `fonts:check: ${files} font files pass every check`;
    // With --json, stdout carries only the JSON.
    if (json) console.error(summary);
    else console.log(summary);
    return 0;
  }
  for (const line of formatFailures(result.rows)) console.error(line);
  console.error(`fonts:check: ${result.rows.filter((row) => row.status === "fail").length} failed checks (ADR-0021 §11, ADR-0020 rule 14)`);
  return 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
