// Literal-values guard: tokens/README.md "Rules" 1 and docs/decisions.md process rule 2.
//
// Implementation code takes every color, size and font from generated token accessors. This
// scans swift/Sources and web/packages/*/src (generated output excluded) for hex and numeric
// colors, px/pt dimensions and font-family names, prints `path:line:column` for each hit and
// exits 1 when anything is found. Comments are skipped; string contents are scanned. Node 24
// runs it from source (native type stripping); it has no dependencies.
//
//   node lint/literals.ts               scan this repository
//   node lint/literals.ts --root <dir>  scan another tree with the same layout (tests)

import type { Dirent } from "node:fs";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

export type LiteralKind = "color" | "dimension" | "font";

export interface Finding {
  /** Path relative to the scanned root, with forward slashes. */
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly kind: LiteralKind;
  readonly text: string;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
}

/** Directories scanned, relative to the root; `*` matches exactly one path segment. */
export const SCAN_DIRS: readonly string[] = ["swift/Sources", "web/packages/*/src"];

/** Generated token output is the one place in the scanned trees where literals belong. */
export const EXCLUDED_DIRS: readonly string[] = [
  "swift/Sources/DSTokens/Generated",
  "web/packages/*/src/generated",
];

interface Syntax {
  /** `//` starts a comment that runs to the end of the line. */
  readonly lineComments: boolean;
  /** Block comments nest (Swift). */
  readonly nestedBlockComments: boolean;
  /** Characters that open a string literal. */
  readonly quotes: string;
}

const SCRIPT: Syntax = { lineComments: true, nestedBlockComments: false, quotes: "\"'`" };

const SYNTAX_BY_EXTENSION: Readonly<Record<string, Syntax>> = {
  ".swift": { lineComments: true, nestedBlockComments: true, quotes: '"' },
  ".css": { lineComments: false, nestedBlockComments: false, quotes: "\"'" },
  ".ts": SCRIPT,
  ".tsx": SCRIPT,
  ".mts": SCRIPT,
  ".cts": SCRIPT,
  ".js": SCRIPT,
  ".jsx": SCRIPT,
  ".mjs": SCRIPT,
  ".cjs": SCRIPT,
};

/** Families Prism ships or considered (docs/research/fonts.md), Apple and CSS system faces, common platform fonts. */
const FONT_FAMILIES: readonly string[] = [
  "Onest",
  "Inter",
  "Manrope",
  "Geologica",
  "Geist",
  "Sofia Sans",
  "Golos Text",
  "JetBrains Mono",
  "SF Pro",
  "SF Compact",
  "SF Mono",
  "New York",
  "-apple-system",
  "BlinkMacSystemFont",
  ".AppleSystemUIFont",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "Helvetica Neue",
  "Helvetica",
  "Arial",
  "Roboto",
  "Segoe UI",
  "Menlo",
  "Monaco",
  "Consolas",
  "Courier New",
  "Times New Roman",
  "Georgia",
  "Verdana",
];

function familyPattern(names: readonly string[]): RegExp {
  const alternatives = [...names]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"));
  return new RegExp(`(?<![\\w-])(?:${alternatives.join("|")})(?!\\w)`, "g");
}

interface Rule {
  readonly kind: LiteralKind;
  readonly pattern: RegExp;
}

const RULES: readonly Rule[] = [
  // #rgb, #rgba, #rrggbb, #rrggbbaa (Swift directives such as #if or #Preview are not hex).
  { kind: "color", pattern: /(?<![\w&#])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi },
  // CSS color functions with a literal first channel; relative syntax over var() stays allowed.
  { kind: "color", pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+.\d]/gi },
  {
    kind: "color",
    pattern:
      /\bcolor\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\s+[-+.\d]/gi,
  },
  // SwiftUI, UIKit and AppKit colors built from numeric components, and Xcode color literals.
  {
    kind: "color",
    pattern: /\b(?:Color|UIColor|NSColor|CGColor)\s*\((?:\s*\.\w+\s*,)?\s*(?:red|white|hue|displayP3Red|srgbRed)\s*:/g,
  },
  { kind: "color", pattern: /#colorLiteral\s*\(/g },
  // Dimensions with a px or pt unit.
  { kind: "dimension", pattern: /(?<![\w$.])(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt)(?!\w)/g },
  // Font declarations with a literal value instead of a token accessor or var(--ds-*).
  {
    kind: "font",
    pattern: /\bfont-family\s*:(?!\s*(?:var\(|inherit\b|initial\b|unset\b|revert\b|revert-layer\b))[^;{}]*/gi,
  },
  { kind: "font", pattern: /\bfontFamily\s*[:=]\s*["'`]/g },
  { kind: "font", pattern: /\.custom\(\s*"/g },
  { kind: "font", pattern: /\b(?:UIFont|NSFont)\s*\(\s*name\s*:\s*"/g },
  { kind: "font", pattern: familyPattern(FONT_FAMILIES) },
];

/**
 * Replaces comment characters with spaces and keeps newlines, so offsets and line numbers of the
 * remaining code are unchanged. A small lexer rather than a parser: it tracks strings only so that
 * `//` or `/*` inside a string does not start a comment. Strings end at a newline unless they are
 * template literals, which is enough for single-line string literals in Swift, TypeScript and CSS.
 */
export function blankComments(source: string, syntax: Syntax): string {
  const out = source.split("");
  const blank = (index: number): void => {
    if (out[index] !== "\n") out[index] = " ";
  };
  let blockDepth = 0;
  let inLineComment = false;
  let quote: string | undefined;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      else blank(i);
    } else if (blockDepth > 0) {
      if (char === "*" && next === "/") {
        blank(i);
        blank(++i);
        blockDepth--;
      } else if (syntax.nestedBlockComments && char === "/" && next === "*") {
        blank(i);
        blank(++i);
        blockDepth++;
      } else {
        blank(i);
      }
    } else if (quote !== undefined) {
      if (char === "\\") i++;
      else if (char === quote || (char === "\n" && quote !== "`")) quote = undefined;
    } else if (char === "/" && next === "*") {
      blank(i);
      blank(++i);
      blockDepth = 1;
    } else if (syntax.lineComments && char === "/" && next === "/") {
      blank(i);
      inLineComment = true;
    } else if (char !== undefined && syntax.quotes.includes(char)) {
      quote = char;
    }
  }
  return out.join("");
}

/** Findings for one file's source text; `extension` selects the comment and string syntax. */
export function scanSource(source: string, extension: string, file = ""): Finding[] {
  const syntax = SYNTAX_BY_EXTENSION[extension];
  if (syntax === undefined) return [];
  const findings: Finding[] = [];
  const seen = new Set<string>();
  blankComments(source, syntax)
    .split("\n")
    .forEach((text, index) => {
      for (const { kind, pattern } of RULES) {
        for (const match of text.matchAll(pattern)) {
          const column = match.index + 1;
          const key = `${index}:${column}:${kind}`;
          if (seen.has(key)) continue;
          seen.add(key);
          findings.push({ file, line: index + 1, column, kind, text: match[0].trim() });
        }
      }
    });
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function sortedEntries(path: string): Dirent[] {
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Expands a root-relative directory pattern (`*` = one segment) to the directories that exist. */
export function expandDirs(root: string, pattern: string): string[] {
  let dirs = [""];
  for (const segment of pattern.split("/")) {
    const next: string[] = [];
    for (const dir of dirs) {
      if (segment === "*") {
        if (!isDirectory(join(root, dir))) continue;
        for (const entry of sortedEntries(join(root, dir))) {
          if (entry.isDirectory()) next.push(dir === "" ? entry.name : `${dir}/${entry.name}`);
        }
      } else {
        const candidate = dir === "" ? segment : `${dir}/${segment}`;
        if (isDirectory(join(root, candidate))) next.push(candidate);
      }
    }
    dirs = next;
  }
  return dirs;
}

/** Scans every configured directory under `root`; throws when a scan directory matches nothing. */
export function scanTree(root: string): ScanResult {
  const excluded = new Set(EXCLUDED_DIRS.flatMap((pattern) => expandDirs(root, pattern)));
  const findings: Finding[] = [];
  let filesScanned = 0;
  const walk = (dir: string): void => {
    for (const entry of sortedEntries(join(root, dir))) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!excluded.has(path)) walk(path);
      } else if (entry.isFile() && SYNTAX_BY_EXTENSION[extname(entry.name)] !== undefined) {
        filesScanned++;
        findings.push(...scanSource(readFileSync(join(root, path), "utf8"), extname(entry.name), path));
      }
    }
  };
  for (const pattern of SCAN_DIRS) {
    const dirs = expandDirs(root, pattern);
    if (dirs.length === 0) throw new Error(`${pattern} matches no directory under ${root}`);
    dirs.forEach(walk);
  }
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || a.column - b.column));
  return { findings, filesScanned };
}

export function formatFinding(finding: Finding): string {
  return `${finding.file}:${finding.line}:${finding.column}: ${finding.kind} literal ${JSON.stringify(finding.text)}`;
}

/** CLI entry; returns the process exit code (0 clean, 1 literals found, 2 usage or layout error). */
export function main(argv: readonly string[]): number {
  const rootFlag = argv.indexOf("--root");
  const rootArgument = rootFlag === -1 ? undefined : argv[rootFlag + 1];
  if (rootFlag !== -1 && rootArgument === undefined) {
    console.error("lint:literals: --root needs a directory");
    return 2;
  }
  const root = resolve(rootArgument ?? join(import.meta.dirname, "..", ".."));
  let result: ScanResult;
  try {
    result = scanTree(root);
  } catch (error) {
    console.error(`lint:literals: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  const { findings, filesScanned } = result;
  if (findings.length === 0) {
    console.log(`lint:literals: no literal values in ${filesScanned} files under ${SCAN_DIRS.join(", ")}`);
    return 0;
  }
  for (const finding of findings) console.log(formatFinding(finding));
  const files = new Set(findings.map((finding) => finding.file)).size;
  console.error(
    `lint:literals: ${findings.length} literal values in ${files} files; take colors, dimensions and fonts from generated token accessors (tokens/README.md, Rules 1)`,
  );
  return 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
