// Reference-copy guard: ADR-0015 rules 1-3 (docs/adr/0015-references-inspiration-only.md), critic
// R-01 and visual-dna B26.
//
// The reference shots enter the repository only as URLs plus analysis in Prism's own words, and
// samples use invented copy. This scans contracts, samples and renders (the SCAN_TARGETS below) for
// the strings in reference-copy.denylist.txt, which is derived from docs/research/refs-*.md, prints
// `path:line` for each hit and exits 1 when anything is found. Matching is case-insensitive and
// tolerant of spacing, so a phrase split across lines, or across tags in HTML, is still caught.
// Every file is also read with its backslash escapes decoded (`\u0412`, `\'`, `\n`), as JSON, YAML,
// JavaScript and Swift strings write them, and Markdown is also read without its emphasis and code
// delimiters. Comments count: reference copy in a comment is still reference copy in a public
// repository. The analyses that quote the copy on purpose (refs-*.md, visual-dna.md, critic.md) and
// the denylist are exempt. Binary files are skipped, so text baked into a PNG is out of reach:
// re-render images from cleaned sources. Node 24 runs it from source (native type stripping); it has
// no dependencies.
//
//   node lint/reference-copy.ts                     scan this repository
//   node lint/reference-copy.ts --root <dir>        scan another tree with the same layout (tests)
//   node lint/reference-copy.ts --denylist <file>   use another denylist (tests)

import type { Dirent } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { expandDirs } from "./literals.ts";

export interface Entry {
  readonly text: string;
  /** 1-based line in the denylist file. */
  readonly line: number;
  /** Matcher for plain text. */
  readonly pattern: RegExp;
  /** Matcher for the visible text of markup (`markupText`), where removed tags may sit anywhere. */
  readonly markupPattern: RegExp;
}

export interface Finding {
  /** Path relative to the scanned root, with forward slashes. */
  readonly file: string;
  readonly line: number;
  /** The denylist entry that matched. */
  readonly entry: string;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
}

export interface ScanTarget {
  /** Root-relative directory, scanned with its whole subtree; `*` matches exactly one path segment. */
  readonly dir: string;
  /** A required target that matches no directory is a layout error; an optional one is scanned when present. */
  readonly required: boolean;
}

export const SCAN_TARGETS: readonly ScanTarget[] = [
  { dir: "spec", required: true },
  { dir: "tokens", required: true },
  { dir: "brands", required: true },
  { dir: "agent", required: true },
  { dir: "web/packages/*/src", required: true },
  // The whole app: stories, `.storybook/` config and VRT specs are all samples. Build output is skipped.
  { dir: "web/apps/*", required: false },
  { dir: "swift/Sources", required: true },
  { dir: "swift/Tests", required: true },
  // Holds only rendered snapshots (P3-5); a fresh checkout has no gallery/ until the first one lands.
  { dir: "gallery", required: false },
  // The font harnesses, their renders (binary, skipped) and the font metadata beside them.
  { dir: "docs/research/fonts", required: true },
];

/** Files that quote reference copy on purpose; never scanned, even if a target comes to cover them. */
export function isExempt(path: string): boolean {
  return (
    /^docs\/research\/(?:refs-[^/]*\.md|visual-dna\.md|critic\.md)$/.test(path) ||
    path === "tools/lint/reference-copy.denylist.txt"
  );
}

/** Dependencies and build output (the ignored folders in .gitignore); never scanned, at any depth. */
const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "dist",
  ".turbo",
  "storybook-static",
  "test-results",
  "playwright-report",
  ".build",
  "DerivedData",
]);

/** Markup whose text is also scanned with tags removed and entities decoded. */
const MARKUP_EXTENSIONS: ReadonlySet<string> = new Set([".html", ".htm", ".svg"]);

/** Markdown, whose text is also scanned as markup and without emphasis or code delimiters. */
const MARKDOWN_EXTENSIONS: ReadonlySet<string> = new Set([".md", ".mdx", ".markdown"]);

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Stands in for a removed tag in `markupText`: not a word character, and skipped inside an entry. */
const TAG = "\uE000";

/**
 * The matcher for one denylist entry: case-insensitive; a run of spaces matches any whitespace or
 * none (line breaks included); ' and ’ match each other; an entry that starts or ends with a letter
 * or digit is anchored at a word edge there. With `markup`, removed tags may also sit between any two
 * characters, so `142,<span>580</span>` still reads as one number and a tag edge is a word edge.
 */
export function entryPattern(entry: string, markup = false): RegExp {
  const text = entry.trim();
  const gap = markup ? `[\\s${TAG}]*` : "\\s*";
  const glue = markup ? `${TAG}*` : "";
  const body = text
    .split(/\s+/)
    .map((word) =>
      [...word]
        .map((char) => (char === "'" || char === "’" ? "['’]" : char.replace(/[\\^$.*+?()[\]{}|/]/, "\\$&")))
        .join(glue),
    )
    .join(gap);
  const chars = [...text];
  const start = WORD_CHAR.test(chars[0] ?? "") ? "(?<![\\p{L}\\p{N}])" : "";
  const end = WORD_CHAR.test(chars.at(-1) ?? "") ? "(?![\\p{L}\\p{N}])" : "";
  return new RegExp(`${start}${body}${end}`, "giu");
}

/** Parses the denylist; throws on entries shorter than four characters, duplicates or an empty list. */
export function parseDenylist(source: string): Entry[] {
  const entries: Entry[] = [];
  const seen = new Map<string, number>();
  source.split("\n").forEach((raw, index) => {
    const text = raw.trim();
    if (text === "" || text.startsWith("#")) return;
    const line = index + 1;
    const key = text.toLowerCase().replace(/\s+/g, "").replace(/’/g, "'");
    if ([...key].length < 4) throw new Error(`denylist line ${line}: ${JSON.stringify(text)} is shorter than four characters`);
    const first = seen.get(key);
    if (first !== undefined) throw new Error(`denylist line ${line}: ${JSON.stringify(text)} repeats line ${first}`);
    seen.set(key, line);
    entries.push({ text, line, pattern: entryPattern(text), markupPattern: entryPattern(text, true) });
  });
  if (entries.length === 0) throw new Error("the denylist has no entries");
  return entries;
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  deg: "°",
  gt: ">",
  hellip: "…",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  minus: "−",
  nbsp: "\u00A0",
  ndash: "–",
  plusmn: "±",
  quot: '"',
  rsquo: "’",
  thinsp: "\u2009",
};

/**
 * Visible text of markup: each tag or comment becomes one TAG marker (its line breaks kept, so line
 * numbers do not move) and entities are decoded.
 */
export function markupText(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->|<[^>]*>/g, (tag) => TAG + tag.replace(/[^\n]/g, ""))
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (name.startsWith("#")) {
        const hex = name[1] === "x" || name[1] === "X";
        const codePoint = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
        return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
      }
      return ENTITIES[name.toLowerCase()] ?? entity;
    });
}

/**
 * Visible text of Markdown: `markupText` (inline HTML, entities), with each run of emphasis or code
 * delimiters (`*`, `_`, `~`, backticks) also one TAG marker, so `**Zephyr** Hub` reads as one phrase.
 */
export function markdownText(source: string): string {
  return markupText(source).replace(/[*_~`]+/g, TAG);
}

/** Escapes that decode to a control character; they read as a space, which keeps word edges. */
const CONTROL_ESCAPES: ReadonlySet<string> = new Set(["0", "a", "b", "e", "f", "n", "r", "t", "v"]);

/**
 * Source with backslash escapes decoded as JSON, YAML, JavaScript and Swift strings write them:
 * `\u0412`, `\u{412}`, `\U00000412`, `\x41`, and a backslash before any other character (`\'`, `\"`,
 * `\\`). Python's `json.dumps` and PyYAML escape every non-ASCII character this way by default.
 * Control escapes and code points that are line breaks read as a space, and a backslash before a real
 * line break is dropped, so line numbers do not move.
 */
export function unescapedText(source: string): string {
  return source.replace(
    /\\(?:u\{([\dA-Fa-f]{1,6})\}|u([\dA-Fa-f]{4})|U([\dA-Fa-f]{8})|x([\dA-Fa-f]{2})|([\s\S]))/g,
    (escape, braced?: string, u4?: string, u8?: string, x2?: string, char?: string) => {
      const hex = braced ?? u4 ?? u8 ?? x2;
      if (hex !== undefined) {
        const codePoint = Number.parseInt(hex, 16);
        if (codePoint > 0x10ffff) return escape;
        const decoded = String.fromCodePoint(codePoint);
        return decoded === "\n" || decoded === "\r" ? " " : decoded;
      }
      if (char === undefined || char === "\n" || char === "\r") return char ?? escape;
      return CONTROL_ESCAPES.has(char) ? " " : char;
    },
  );
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) line++;
  return line;
}

/**
 * Findings for one file's text. Every file is scanned as written and, when it has a backslash, with
 * its escapes decoded. Markup files are also scanned as visible text with the tags removed (attribute
 * values count in the first pass), and Markdown also without its emphasis and code delimiters.
 */
export function scanSource(source: string, file: string, entries: readonly Entry[]): Finding[] {
  const extension = extname(file).toLowerCase();
  const passes: { readonly text: string; readonly markup: boolean }[] = [{ text: source, markup: false }];
  if (source.includes("\\")) passes.push({ text: unescapedText(source), markup: false });
  if (MARKUP_EXTENSIONS.has(extension)) passes.push({ text: markupText(source), markup: true });
  if (MARKDOWN_EXTENSIONS.has(extension)) passes.push({ text: markdownText(source), markup: true });
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const { text, markup } of passes) {
    for (const entry of entries) {
      for (const match of text.matchAll(markup ? entry.markupPattern : entry.pattern)) {
        const line = lineAt(text, match.index);
        const key = `${line}\n${entry.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({ file, line, entry: entry.text });
      }
    }
  }
  return findings.sort((a, b) => a.line - b.line || (a.entry < b.entry ? -1 : a.entry > b.entry ? 1 : 0));
}

function sortedEntries(path: string): Dirent[] {
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Scans every target under `root`; throws when a required target matches no directory. */
export function scanTree(root: string, entries: readonly Entry[]): ScanResult {
  const findings: Finding[] = [];
  const visited = new Set<string>();
  let filesScanned = 0;
  const scanFile = (path: string): void => {
    if (visited.has(path) || isExempt(path)) return;
    visited.add(path);
    const bytes = readFileSync(join(root, path));
    if (bytes.subarray(0, 8000).includes(0)) return; // binary: fonts, images
    filesScanned++;
    findings.push(...scanSource(bytes.toString("utf8"), path, entries));
  };
  const walk = (dir: string): void => {
    for (const entry of sortedEntries(join(root, dir))) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(path);
      } else if (entry.isFile()) {
        scanFile(path);
      }
    }
  };
  for (const target of SCAN_TARGETS) {
    const dirs = expandDirs(root, target.dir);
    if (dirs.length === 0 && target.required) throw new Error(`${target.dir} matches no directory under ${root}`);
    for (const dir of dirs) walk(dir);
  }
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return { findings, filesScanned };
}

export function formatFinding(finding: Finding): string {
  return `${finding.file}:${finding.line}: reference UI copy ${JSON.stringify(finding.entry)}`;
}

/** CLI entry; returns the process exit code (0 clean, 1 reference copy found, 2 usage, denylist or layout error). */
export function main(argv: readonly string[]): number {
  const options = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    const value = argv[i + 1];
    if (flag !== "--root" && flag !== "--denylist") {
      console.error(`lint:reference-copy: unknown argument ${JSON.stringify(flag)}`);
      return 2;
    }
    if (value === undefined || value.startsWith("--")) {
      console.error(`lint:reference-copy: ${flag} needs a path`);
      return 2;
    }
    options.set(flag, value);
    i++;
  }
  const root = resolve(options.get("--root") ?? join(import.meta.dirname, "..", ".."));
  const denylist = resolve(options.get("--denylist") ?? join(import.meta.dirname, "reference-copy.denylist.txt"));
  let entries: Entry[];
  let result: ScanResult;
  try {
    entries = parseDenylist(readFileSync(denylist, "utf8"));
    result = scanTree(root, entries);
  } catch (error) {
    console.error(`lint:reference-copy: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const { findings, filesScanned } = result;
  if (findings.length === 0) {
    console.log(`lint:reference-copy: no reference UI copy in ${filesScanned} files (${entries.length} denylist entries)`);
    return 0;
  }
  for (const finding of findings) console.log(formatFinding(finding));
  const files = new Set(findings.map((finding) => finding.file)).size;
  console.error(
    `lint:reference-copy: ${findings.length} hits in ${files} files; replace them with invented copy (ADR-0015 rule 3, tools/lint/reference-copy.denylist.txt)`,
  );
  return 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
