// Literal-values guard: tokens/README.md "Rules" 1, docs/decisions.md process rule 2, ADR-0023 §12
// (motion), ADR-0021 §12 (typography) and ADR-0019 rule 1 (runtime).
//
// Implementation code takes every color, size, font, duration, easing, spring and type role from
// generated token accessors, and every runtime attribute and media query from the generated
// `runtime.ts`. This scans swift/Sources and web/packages/*/src (generated output excluded) and
// prints `path:line:column` for each hit, then exits 1 when anything is found. swift/Tests is scanned
// only for the rules that say so (`settlingDuration`, ADR-0023 §12). Comments are skipped; string
// contents are scanned. Node 24 runs it from source (native type stripping); it has no dependencies.
//
// One pattern table serves every kind, so no name is reported twice: `color`, `dimension` and `font`
// (literal values), `motion` (ADR-0023 §12), `typography` (ADR-0021 §12) and `runtime` (ADR-0019
// rule 1, P1-5). `runtime` owns the six data-ds-* axis attributes, the preference and pointer media
// features (`prefers-reduced-motion` included) and Tailwind's media-only variants (`dark:`,
// `contrast-more:`, `contrast-less:`, `motion-safe:`, `motion-reduce:`, `pointer-*:`,
// `any-pointer-*:`) in class strings and `@variant` rules (ADR-0023 §12, rule 8); `motion` and
// `typography` do not repeat them. It checks TypeScript, JavaScript and CSS only and skips `*.test.*`
// files, which spell the names on purpose to check the contract. `material` (ADR-0022) and `brand`
// (ADR-0020) join the table in P3.
//
//   node lint/literals.ts               scan this repository
//   node lint/literals.ts --root <dir>  scan another tree with the same layout (tests)

import type { Dirent } from "node:fs";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

export type LiteralKind = "color" | "dimension" | "font" | "motion" | "typography" | "runtime";

export interface Finding {
  /** Path relative to the scanned root, with forward slashes. */
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly kind: LiteralKind;
  /** The pattern that matched, e.g. `motion/css-time`. */
  readonly rule: string;
  readonly text: string;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
}

/** Directories scanned, relative to the root; `*` matches exactly one path segment. */
export const SCAN_DIRS: readonly string[] = ["swift/Sources", "web/packages/*/src"];

/** Test directories: scanned only by the rules marked `tests` (ADR-0023 §12: `settlingDuration`). */
export const TEST_SCAN_DIRS: readonly string[] = ["swift/Tests"];

/** Generated token output is the one place in the scanned trees where literals belong. */
export const EXCLUDED_DIRS: readonly string[] = [
  "swift/Sources/DSTokens/Generated",
  "web/packages/*/src/generated",
];

/** DSCore alone reads the OS settings and builds fonts (ADR-0021 §9, ADR-0023 §8.5). */
const DSCORE = "swift/Sources/DSCore/";

type Language = "swift" | "css" | "script";
type Scope = "sources" | "tests";

interface Syntax {
  readonly language: Language;
  /** `//` starts a comment that runs to the end of the line. */
  readonly lineComments: boolean;
  /** Block comments nest (Swift). */
  readonly nestedBlockComments: boolean;
  /** Characters that open a string literal. */
  readonly quotes: string;
}

const SCRIPT: Syntax = { language: "script", lineComments: true, nestedBlockComments: false, quotes: "\"'`" };

const SYNTAX_BY_EXTENSION: Readonly<Record<string, Syntax>> = {
  ".swift": { language: "swift", lineComments: true, nestedBlockComments: true, quotes: '"' },
  ".css": { language: "css", lineComments: false, nestedBlockComments: false, quotes: "\"'" },
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

/** A match inside one file's comment-free code. */
interface Span {
  readonly start: number;
  readonly end: number;
}

interface Rule {
  readonly id: string;
  readonly kind: LiteralKind;
  /**
   * Global, applied per line. A named group `hit` (with the `d` flag) marks the reported span;
   * without it the whole match is reported.
   */
  readonly pattern?: RegExp;
  /** Whole-file matcher over the comment-free code, for rules that need context (CSS blocks). */
  readonly match?: (code: string) => Span[];
  /** Languages the rule applies to; default all. */
  readonly languages?: readonly Language[];
  /** In script files the reported span must lie inside a string literal (class strings, inline CSS). */
  readonly scriptStrings?: boolean;
  /** Also applies under TEST_SCAN_DIRS. */
  readonly tests?: boolean;
  /** Root-relative directory prefixes where the rule does not apply. */
  readonly exempt?: readonly string[];
  /** Skips test files (`*.test.*`), which spell the checked names on purpose (ADR-0019 rule 1). */
  readonly skipTestFiles?: boolean;
}

/** A test file by name: `Theme.test.tsx`, `runtime.test.ts`. */
const TEST_FILE = /\.test\.[^./]+$/;

/** The CSS properties whose values carry motion (`transition-duration`, `animationTimingFunction`, …). */
const MOTION_PROPERTY = String.raw`(?<![\w-])(?:transition|animation)(?:-[a-z-]+|[A-Z][A-Za-z]*)?["']?\s*:[^;{}]*?`;

/** CSS-wide keywords a declaration may use instead of a token. */
const CSS_WIDE = String.raw`(?:inherit|initial|unset|revert|revert-layer)\b`;

/** The attribute suffixes of the six runtime axes (ADR-0019 §1): `data-ds-` + the kebab-case `TokenContext` field. */
const RUNTIME_ATTRIBUTES = String.raw`(?:color-scheme|contrast|transparency|density|modality|motion)`;

/** Tailwind's media-only variants (ADR-0019 Consequences, ADR-0023 §12): `pointer-*` is fine, coarse or none. */
const MEDIA_VARIANTS = String.raw`(?:dark|contrast-more|contrast-less|motion-safe|motion-reduce|(?:any-)?pointer-(?:fine|coarse|none))`;

const RULES: readonly Rule[] = [
  // ---- color, dimension, font: literal values (tokens/README.md, Rules 1) ----
  // #rgb, #rgba, #rrggbb, #rrggbbaa (Swift directives such as #if or #Preview are not hex).
  { id: "color/hex", kind: "color", pattern: /(?<![\w&#])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi },
  // CSS color functions with a literal first channel; relative syntax over var() stays allowed.
  { id: "color/function", kind: "color", pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+.\d]/gi },
  {
    id: "color/color-function",
    kind: "color",
    pattern:
      /\bcolor\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\s+[-+.\d]/gi,
  },
  // SwiftUI, UIKit and AppKit colors built from numeric components, and Xcode color literals.
  {
    id: "color/native",
    kind: "color",
    pattern: /\b(?:Color|UIColor|NSColor|CGColor)\s*\((?:\s*\.\w+\s*,)?\s*(?:red|white|hue|displayP3Red|srgbRed)\s*:/g,
  },
  { id: "color/color-literal", kind: "color", pattern: /#colorLiteral\s*\(/g },
  // Dimensions with a px or pt unit.
  { id: "dimension/unit", kind: "dimension", pattern: /(?<![\w$.])(?:\d+(?:\.\d+)?|\.\d+)(?:px|pt)(?!\w)/g },
  // Font declarations with a literal value instead of a token accessor or var(--ds-*).
  {
    id: "font/family-declaration",
    kind: "font",
    pattern: /\bfont-family\s*:(?!\s*(?:var\(|inherit\b|initial\b|unset\b|revert\b|revert-layer\b))[^;{}]*/gi,
  },
  { id: "font/family-property", kind: "font", pattern: /\bfontFamily\s*[:=]\s*["'`]/g },
  { id: "font/custom", kind: "font", pattern: /\.custom\(\s*"/g },
  { id: "font/platform-name", kind: "font", pattern: /\b(?:UIFont|NSFont)\s*\(\s*name\s*:\s*"/g },
  { id: "font/family-name", kind: "font", pattern: familyPattern(FONT_FAMILIES) },

  // ---- motion (ADR-0023 §12) ----
  // Swift: animation and spring constructors with a numeric literal argument.
  {
    id: "motion/swift-animation-literal",
    kind: "motion",
    languages: ["swift"],
    pattern:
      /(?:(?<![\w.])Spring|\.(?:spring|interactiveSpring|snappy|smooth|bouncy|easeIn|easeOut|easeInOut|linear|timingCurve))\((?=[^()]*?(?<![\w.$])(?:\d+(?:\.\d+)?|\.\d+)(?![\w.]))/g,
  },
  // Swift: `withAnimation {` without an animation argument.
  { id: "motion/swift-bare-with-animation", kind: "motion", languages: ["swift"], pattern: /\bwithAnimation\s*(?:\(\s*\))?\s*\{/g },
  // Swift: `withAnimation(` or `.animation(` whose first argument is a bare Apple preset.
  {
    id: "motion/swift-preset",
    kind: "motion",
    languages: ["swift"],
    pattern:
      /(?:\bwithAnimation|\.animation)\(\s*\.(?:default|spring|snappy|smooth|bouncy|interactiveSpring|easeIn|easeOut|easeInOut|linear)(?![\w(])/g,
  },
  // CSS (and CSS inside script strings): time literals in transition* and animation* declarations.
  {
    id: "motion/css-time",
    kind: "motion",
    languages: ["css", "script"],
    scriptStrings: true,
    pattern: new RegExp(`${MOTION_PROPERTY}(?<![\\w.#-])(?<hit>(?:\\d+(?:\\.\\d+)?|\\.\\d+)m?s)\\b`, "gd"),
  },
  // CSS: cubic-bezier() or linear() with a numeric first argument.
  {
    id: "motion/css-easing",
    kind: "motion",
    languages: ["css", "script"],
    scriptStrings: true,
    pattern: /(?<![\w-])(?<hit>(?:cubic-bezier|linear)\(\s*[-+]?(?:\d|\.\d)[^)]*\)?)/dg,
  },
  // CSS: easing keywords in transition* and animation* declarations (tuned beyond ADR-0023 §12: a
  // keyword is as much an easing literal as cubic-bezier()).
  {
    id: "motion/css-easing-keyword",
    kind: "motion",
    languages: ["css", "script"],
    scriptStrings: true,
    pattern: new RegExp(`${MOTION_PROPERTY}(?<![\\w-])(?<hit>(?:ease(?:-in-out|-in|-out)?|linear|step-start|step-end)(?![\\w(-])|steps\\([^)]*\\))`, "gd"),
  },
  // TS/TSX: a numeric literal for stiffness, damping or mass (ADR-0023 §6: take the triplet from tokens.ts).
  {
    id: "motion/ts-physics",
    kind: "motion",
    languages: ["script"],
    pattern: /(?<![\w$.])(?<hit>(?:stiffness|damping|mass)["']?\s*(?::|=)\s*\{?\s*[-+]?(?:\d|\.\d)[\d.]*)/dg,
  },
  // TS/TSX: any `bounce` key or prop: Motion never gets duration-based springs (ADR-0023 §6).
  { id: "motion/ts-bounce", kind: "motion", languages: ["script"], pattern: /(?<![\w$.])(?<hit>bounce)(?=["']?\s*:(?!:)|\s*=\s*\{)/dg },
  // TS/TSX: Motion's own reduced-motion switches (ADR-0023 §8.5).
  { id: "motion/ts-use-reduced-motion", kind: "motion", languages: ["script"], pattern: /(?<![\w$])useReducedMotion(?![\w$])/g },
  {
    id: "motion/ts-reduced-motion-prop",
    kind: "motion",
    languages: ["script"],
    pattern: /(?<![\w$.]|(?:const|let|var)\s+)(?<hit>reducedMotion)(?=["']?\s*(?::|=(?!=)))/dg,
  },
  // TS/TSX class strings: Tailwind duration, delay and easing utilities (tuned beyond ADR-0023 §12;
  // `duration-ds-*` and `ease-ds-*` are the token utilities).
  {
    id: "motion/tailwind-timing",
    kind: "motion",
    languages: ["script"],
    scriptStrings: true,
    pattern: /(?<![\w-])(?<hit>(?:duration|delay)-(?:\d+|\[[^\]\s]+\])|ease-(?:linear|in-out|in|out|\[[^\]\s]+\]))(?![\w-])/dg,
  },
  // Identifier bans: Apple's settlingDuration is not the ε settle; Motion's generateLinearEasing and
  // visualDuration are not how Prism builds or configures springs (ADR-0023 §3, §5, §6).
  { id: "motion/settling-duration", kind: "motion", tests: true, pattern: /(?<![\w$])settlingDuration(?![\w$])/g },
  { id: "motion/generate-linear-easing", kind: "motion", pattern: /(?<![\w$])generateLinearEasing(?![\w$])/g },
  { id: "motion/visual-duration", kind: "motion", pattern: /(?<![\w$])visualDuration(?![\w$])/g },
  { id: "motion/reduce-motion-setting", kind: "motion", exempt: [DSCORE], pattern: /(?<![\w$])accessibilityReduceMotion(?![\w$])/g },

  // ---- typography (ADR-0021 §12) ----
  // CSS: literal font-weight and font-style (a var(--ds-…) value or a CSS-wide keyword passes).
  {
    id: "typography/css-weight-style",
    kind: "typography",
    languages: ["css", "script"],
    scriptStrings: true,
    pattern: new RegExp(String.raw`(?<![\w-])(?<hit>font-(?:weight|style)\s*:(?!\s*(?:var\(--ds-|${CSS_WIDE}))[^;{}"'\x60\]]*)`, "gd"),
  },
  // CSS: font-synthesis with any value other than none (ADR-0021 §10).
  {
    id: "typography/css-synthesis",
    kind: "typography",
    languages: ["css", "script"],
    scriptStrings: true,
    pattern: /(?<![\w-])(?<hit>font-synthesis(?:-[a-z-]+)?\s*:(?!\s*none\s*(?:!important\s*)?(?:[;}\]"'`]|$))[^;{}\]"'`]*)/dg,
  },
  // CSS: font-size (or the font shorthand) on html or :root; the rem base is the browser default (ADR-0021 §6).
  { id: "typography/css-root-font-size", kind: "typography", languages: ["css"], match: rootFontSize },
  // TS/TSX class strings: Tailwind weight utilities and italic (ADR-0021 §1, §10).
  {
    id: "typography/tailwind-weight",
    kind: "typography",
    languages: ["script"],
    scriptStrings: true,
    pattern: /(?<![\w-])(?<hit>font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\]))(?![\w-])/dg,
  },
  { id: "typography/italic", kind: "typography", languages: ["script"], scriptStrings: true, pattern: /(?<![\w-])(?<hit>italic|oblique)(?![\w-])/dg },
  // TS/TSX: an inline style weight (tuned beyond ADR-0021 §12, which lists CSS and class strings).
  {
    id: "typography/ts-font-weight",
    kind: "typography",
    languages: ["script"],
    pattern: /(?<![\w$.])(?<hit>fontWeight["']?\s*(?::|=)\s*\{?\s*(?:[-+]?\d[\d.]*|(["'`])(?!var\(--ds-)[^"'`]*\2?))/dg,
  },
  // Swift outside DSCore: font construction and weight modifiers; a string-literal family is
  // already a `font` literal and is not reported twice.
  {
    id: "typography/swift-font-api",
    kind: "typography",
    languages: ["swift"],
    exempt: [DSCORE],
    pattern: /(?:(?<![\w.])Font\.|\.font\(\s*\.)(?:custom|system)\((?!\s*")/g,
  },
  {
    id: "typography/swift-font-modifier",
    kind: "typography",
    languages: ["swift"],
    exempt: [DSCORE],
    pattern: /\.(?:fontWeight|weight|bold|italic|monospacedDigit)\(/g,
  },
  {
    id: "typography/swift-platform-font",
    kind: "typography",
    languages: ["swift"],
    exempt: [DSCORE],
    pattern: /(?<![\w.])(?:UIFont|NSFont)\((?!\s*name\s*:\s*")/g,
  },
  {
    id: "typography/swift-legibility-weight",
    kind: "typography",
    languages: ["swift"],
    exempt: [DSCORE],
    pattern: /(?<![\w$])legibilityWeight(?![\w$])/g,
  },

  // ---- runtime (ADR-0019 rule 1; ADR-0023 §12 and rule 8): TypeScript, JavaScript and CSS, no test files ----
  // The six axis attributes of WEB_RUNTIME (tools/tokens/config.ts), in CSS selectors, JSX and strings;
  // component part attributes such as `data-ds-slot` stay allowed.
  {
    id: "runtime/attribute",
    kind: "runtime",
    languages: ["css", "script"],
    skipTestFiles: true,
    pattern: new RegExp(String.raw`(?<![\w-])data-ds-${RUNTIME_ATTRIBUTES}(?![\w-])`, "g"),
  },
  // The same attributes through the DOM `dataset` (tuned beyond ADR-0019 rule 1: `dataset.dsMotion` is `data-ds-motion`).
  {
    id: "runtime/dataset",
    kind: "runtime",
    languages: ["script"],
    skipTestFiles: true,
    pattern: /(?<![\w$])dataset\s*(?:\??\.\s*|\[\s*["'`])(?<hit>ds(?:ColorScheme|Contrast|Transparency|Density|Modality|Motion))(?![\w$])/dg,
  },
  // The preference media features; in script files only inside strings (`matchMedia("…")`).
  {
    id: "runtime/media-preference",
    kind: "runtime",
    languages: ["css", "script"],
    scriptStrings: true,
    skipTestFiles: true,
    pattern: /(?<![\w-])prefers-(?:color-scheme|contrast|reduced-transparency|reduced-motion)(?![\w-])/g,
  },
  // The pointer media features `(pointer: …)`, `(any-pointer: …)`, `(hover: …)`, `(any-hover: …)` and their
  // boolean forms; the `:hover` pseudo-class and `pointer-events` are not media features.
  {
    id: "runtime/media-pointer",
    kind: "runtime",
    languages: ["css", "script"],
    scriptStrings: true,
    skipTestFiles: true,
    pattern: /\(\s*(?<hit>(?:any-)?(?:pointer|hover))\s*[:)]/dg,
  },
  // TS/TSX class strings: Tailwind's media-only variants, which read the OS setting and ignore Prism's
  // attributes (ADR-0019 Consequences); the `ds-*` variants are the ones to use.
  {
    id: "runtime/tailwind-variant",
    kind: "runtime",
    languages: ["script"],
    scriptStrings: true,
    skipTestFiles: true,
    pattern: new RegExp(String.raw`(?<![\w-])(?<hit>${MEDIA_VARIANTS}:)(?=[\w!\[*@-])`, "dg"),
  },
  // CSS: the same variants in `@variant` rules (ADR-0019 §4 item 6: only `@variant ds-…`).
  {
    id: "runtime/variant-rule",
    kind: "runtime",
    languages: ["css", "script"],
    scriptStrings: true,
    skipTestFiles: true,
    pattern: new RegExp(String.raw`@variant\s+(?<hit>${MEDIA_VARIANTS})(?![\w-])`, "dg"),
  },
];

/** Every rule id, for tests that require one hit and one miss per pattern. */
export const RULE_IDS: readonly string[] = RULES.map((r) => r.id);

/** Where to look next in each kind's findings. */
const GUIDANCE: Readonly<Record<LiteralKind, string>> = {
  color: "take colors, dimensions and fonts from generated token accessors (tokens/README.md, Rules 1)",
  dimension: "take colors, dimensions and fonts from generated token accessors (tokens/README.md, Rules 1)",
  font: "take colors, dimensions and fonts from generated token accessors (tokens/README.md, Rules 1)",
  motion: "take durations, easings and springs from the motion tokens and read Reduce Motion from Prism's context (ADR-0023 §12)",
  typography: "take weights and type from the type roles; only DSCore builds fonts (ADR-0021 §12)",
  runtime: "take attribute names and media queries from the generated runtime.ts (webRuntime) and switch CSS with the generated ds-* variants (ADR-0019 rule 1)",
};

/**
 * `font-size` (or the `font` shorthand) declared directly in a rule whose nearest selector names
 * `html` or `:root`, at-rules in between included. Works on comment-free CSS.
 */
function rootFontSize(code: string): Span[] {
  const out: Span[] = [];
  const stack: string[] = [];
  let segment = 0;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === "{") {
      stack.push(code.slice(segment, i).trim());
      segment = i + 1;
    } else if (ch === "}" || ch === ";") {
      if (ch === "}") stack.pop();
      segment = i + 1;
    } else if (ch === ":" && stack.length > 0) {
      const property = /(?:^|\s)(font(?:-size)?)\s*$/.exec(code.slice(segment, i));
      const selector = [...stack].reverse().find((s) => !s.startsWith("@")) ?? "";
      if (property?.[1] !== undefined && /(?:^|[\s,>+~(])(?:html|:root)(?![\w-])/.test(selector)) {
        const start = segment + property.index + property[0].indexOf(property[1]);
        let end = i;
        while (end < code.length && code[end] !== ";" && code[end] !== "}" && code[end] !== "\n") end++;
        out.push({ start, end });
      }
    }
  }
  return out;
}

interface Lexed {
  /** The source with comment characters replaced by spaces; newlines kept. */
  readonly code: string;
  /** 1 for every character inside a string literal. */
  readonly inString: Uint8Array;
}

/**
 * A small lexer rather than a parser: it tracks strings only so that `//` or `/*` inside a string
 * does not start a comment, and marks string contents. Strings end at a newline unless they are
 * template literals, which is enough for single-line string literals in Swift, TypeScript and CSS.
 */
function lex(source: string, syntax: Syntax): Lexed {
  const out = source.split("");
  const inString = new Uint8Array(source.length);
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
      inString[i] = 1;
      if (char === "\\") {
        inString[i + 1] = 1;
        i++;
      } else if (char === quote || (char === "\n" && quote !== "`")) quote = undefined;
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
  return { code: out.join(""), inString };
}

/**
 * Replaces comment characters with spaces and keeps newlines, so offsets and line numbers of the
 * remaining code are unchanged.
 */
export function blankComments(source: string, syntax: Syntax): string {
  return lex(source, syntax).code;
}

function applies(rule: Rule, language: Language, file: string, scope: Scope): boolean {
  if (scope === "tests" && rule.tests !== true) return false;
  if (rule.languages !== undefined && !rule.languages.includes(language)) return false;
  if (rule.skipTestFiles === true && TEST_FILE.test(basename(file))) return false;
  return !(rule.exempt ?? []).some((dir) => file.startsWith(dir));
}

/**
 * Findings for one file's source text; `extension` selects the comment and string syntax, `file`
 * (root-relative) the rules that apply there, and `scope` whether it lies under a test directory.
 */
export function scanSource(source: string, extension: string, file = "", scope: Scope = "sources"): Finding[] {
  const syntax = SYNTAX_BY_EXTENSION[extension];
  if (syntax === undefined) return [];
  const { code, inString } = lex(source, syntax);
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const report = (rule: Rule, start: number, end: number): void => {
    if (rule.scriptStrings === true && syntax.language === "script" && inString[start] !== 1) return;
    const line = lineOf(start);
    const column = start - (lineStarts[line] ?? 0) + 1;
    const key = `${line}:${column}:${rule.kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ file, line: line + 1, column, kind: rule.kind, rule: rule.id, text: code.slice(start, end).trim() });
  };
  const lines = code.split("\n");
  for (const rule of RULES) {
    if (!applies(rule, syntax.language, file, scope)) continue;
    if (rule.match !== undefined) {
      for (const span of rule.match(code)) report(rule, span.start, span.end);
      continue;
    }
    if (rule.pattern === undefined) continue;
    lines.forEach((text, index) => {
      const base = lineStarts[index] ?? 0;
      for (const match of text.matchAll(rule.pattern as RegExp)) {
        const hit = match.indices?.groups?.["hit"];
        const start = hit === undefined ? match.index : hit[0];
        const end = hit === undefined ? match.index + match[0].length : hit[1];
        report(rule, base + start, base + end);
      }
    });
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column || (a.rule < b.rule ? -1 : 1));
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

/**
 * Scans every configured directory under `root`; throws when a source scan directory matches
 * nothing. Test directories are optional.
 */
export function scanTree(root: string): ScanResult {
  const excluded = new Set(EXCLUDED_DIRS.flatMap((pattern) => expandDirs(root, pattern)));
  const findings: Finding[] = [];
  let filesScanned = 0;
  const walk = (dir: string, scope: Scope): void => {
    for (const entry of sortedEntries(join(root, dir))) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!excluded.has(path)) walk(path, scope);
      } else if (entry.isFile() && SYNTAX_BY_EXTENSION[extname(entry.name)] !== undefined) {
        filesScanned++;
        findings.push(...scanSource(readFileSync(join(root, path), "utf8"), extname(entry.name), path, scope));
      }
    }
  };
  for (const pattern of SCAN_DIRS) {
    const dirs = expandDirs(root, pattern);
    if (dirs.length === 0) throw new Error(`${pattern} matches no directory under ${root}`);
    dirs.forEach((dir) => walk(dir, "sources"));
  }
  for (const pattern of TEST_SCAN_DIRS) expandDirs(root, pattern).forEach((dir) => walk(dir, "tests"));
  findings.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || a.column - b.column));
  return { findings, filesScanned };
}

export function formatFinding(finding: Finding): string {
  return `${finding.file}:${finding.line}:${finding.column}: ${finding.kind} literal ${JSON.stringify(finding.text)} (${finding.rule})`;
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
    console.log(`lint:literals: no literal values in ${filesScanned} files under ${[...SCAN_DIRS, ...TEST_SCAN_DIRS].join(", ")}`);
    return 0;
  }
  for (const finding of findings) console.log(formatFinding(finding));
  const files = new Set(findings.map((finding) => finding.file)).size;
  const guidance = [...new Set(findings.map((finding) => GUIDANCE[finding.kind]))].join("; ");
  console.error(`lint:literals: ${findings.length} literal values in ${files} files; ${guidance}`);
  return 1;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
