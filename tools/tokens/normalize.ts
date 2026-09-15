// CLI `tokens:normalize` (ARCHITECTURE §7.13; ADR-0023 rule 3): source hygiene for derived values an
// author writes by hand. It walks every color object in tokens/**/*.tokens.json and
// brands/*/brand.tokens.json, composite sub-values included (shadow layers, gradient stops, border
// colors), and every token with `$extensions["app.prism"].spring`:
//
//   hex              the authored `hex` equals the hex of the CSS-gamut-mapped sRGB color (§7.2);
//                    a missing `hex` is stale too
//   spring-fallback  `$value.duration` is settleMs ms, `$value.delay` is 0 ms and
//                    `app.prism.spring.settle` is settleMs / 1000 (ADR-0023 §1, §3)
//
//   node tokens/normalize.ts --check [--root <dir>]   print `file:line  pointer  expected → actual`, exit 1 when stale
//   node tokens/normalize.ts --write [--root <dir>]   rewrite the stale values in place
//
// `--check` wins over `--write`, so `pnpm tokens:normalize --check` (whose script already passes
// `--write`) only reports. `--write` edits with jsonc-parser's `modify` + `applyEdits`, which touch
// only the target values and keep every other byte, authored floats such as `0.0` included (§15
// F26). Import jsonc-parser by package name: its lib/esm build does not load under Node ESM.
// Exit codes: 0 nothing stale (or everything rewritten), 1 stale values or unfixable problems, 2 usage.
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEdits, modify, type FormattingOptions, type Node } from 'jsonc-parser';
import { PATHS } from './config.ts';
import { irColor, isColorSpace } from './ir/color.ts';
import type { Diagnostic } from './ir/diagnostics.ts';
import { settleMs } from './ir/spring.ts';
import { escapePointer, parseJson, properties, valueOf, type JsonDoc } from './source/json.ts';
import { fsReader, type SourceReader } from './source/reader.ts';

export type NormalizeRule = 'hex' | 'spring-fallback';
export type JsonPath = readonly (string | number)[];

/** A derived value that differs from what the normalizer computes. `--write` replaces it. */
export interface StaleValue {
  readonly rule: NormalizeRule;
  readonly file: string;
  readonly line: number;
  /** JSON Pointer of the value (`/ref/color/accent/500/$value/hex`). */
  readonly pointer: string;
  readonly path: JsonPath;
  readonly tokenId: string;
  readonly expected: unknown;
  /** The authored value; undefined when it is missing. */
  readonly actual: unknown;
}

/** Something the normalizer cannot compute or rewrite (invalid JSON, an unknown color space, …). */
export interface NormalizeProblem {
  readonly file: string;
  readonly line?: number;
  readonly pointer?: string;
  readonly message: string;
}

export interface ColorObject {
  readonly file: string;
  readonly pointer: string;
  readonly tokenId: string;
  readonly value: Readonly<Record<string, unknown>>;
}

export interface NormalizeReport {
  readonly files: readonly string[];
  readonly colors: readonly ColorObject[];
  readonly springs: number;
  readonly stale: readonly StaleValue[];
  readonly problems: readonly NormalizeProblem[];
}

/** Repository root: tools/tokens/normalize.ts → ../../ */
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const TOKEN_SUFFIX = '.tokens.json';
const BRAND_TOKENS = 'brand.tokens.json';

/** tokens/**\/*.tokens.json and brands/*\/brand.tokens.json, in sorted order. */
export function sourceFiles(reader: SourceReader): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of reader.list(dir)) {
      const path = `${dir}/${e.name}`;
      if (e.dir) walk(path);
      else if (e.name.endsWith(TOKEN_SUFFIX)) out.push(path);
    }
  };
  walk(PATHS.tokens);
  for (const e of reader.list(PATHS.brands)) {
    const path = `${PATHS.brands}/${e.name}/${BRAND_TOKENS}`;
    if (e.dir && reader.exists(path)) out.push(path);
  }
  return out;
}

function prop(node: Node, key: string): Node | undefined {
  return properties(node).find((p) => p.key === key)?.value;
}

function pointerOf(path: JsonPath): string {
  return path.map((s) => `/${escapePointer(String(s))}`).join('');
}

function isColorObject(node: Node): boolean {
  return node.type === 'object' && prop(node, 'colorSpace')?.type === 'string' && prop(node, 'components')?.type === 'array';
}

interface Collector {
  readonly doc: JsonDoc;
  readonly colors: ColorObject[];
  readonly stale: StaleValue[];
  readonly problems: NormalizeProblem[];
  springs: number;
}

function stale(c: Collector, rule: NormalizeRule, tokenId: string, path: JsonPath, at: Node, expected: unknown, actual: unknown): void {
  c.stale.push({ rule, file: c.doc.file, line: c.doc.line(at.offset), pointer: pointerOf(path), path, tokenId, expected, actual });
}

function problem(c: Collector, path: JsonPath, at: Node, message: string): void {
  c.problems.push({ file: c.doc.file, line: c.doc.line(at.offset), pointer: pointerOf(path), message });
}

function checkColor(c: Collector, tokenId: string, node: Node, path: JsonPath): void {
  const value = valueOf(node) as Record<string, unknown>;
  c.colors.push({ file: c.doc.file, pointer: pointerOf(path), tokenId, value });
  const space = value['colorSpace'];
  const comps = value['components'];
  if (!isColorSpace(space)) return problem(c, path, node, `unknown colorSpace ${JSON.stringify(space)}; cannot compute hex`);
  if (!Array.isArray(comps) || comps.length !== 3 || !comps.every((v) => v === 'none' || (typeof v === 'number' && Number.isFinite(v)))) {
    return problem(c, path, node, 'components must be three numbers or "none"; cannot compute hex');
  }
  const expected = irColor(space, comps as [number | 'none', number | 'none', number | 'none'], 1).hex;
  const hexNode = prop(node, 'hex');
  const actual = hexNode === undefined ? undefined : valueOf(hexNode);
  if (actual !== expected) stale(c, 'hex', tokenId, [...path, 'hex'], hexNode ?? node, expected, actual);
}

function walkValue(c: Collector, tokenId: string, node: Node, path: JsonPath): void {
  if (isColorObject(node)) return checkColor(c, tokenId, node, path);
  if (node.type === 'object') for (const p of properties(node)) walkValue(c, tokenId, p.value, [...path, p.key]);
  else if (node.type === 'array') (node.children ?? []).forEach((child, i) => walkValue(c, tokenId, child, [...path, i]));
}

/** `{ value, unit }` must equal `{ value: ms, unit: 'ms' }`; reports each field that differs. */
function checkDuration(c: Collector, tokenId: string, transition: Node, key: 'duration' | 'delay', ms: number, path: JsonPath): void {
  const node = prop(transition, key);
  const expected = { value: ms, unit: 'ms' };
  const at = [...path, key];
  if (node?.type !== 'object') {
    stale(c, 'spring-fallback', tokenId, at, node ?? transition, expected, node === undefined ? undefined : valueOf(node));
    return;
  }
  for (const [field, want] of [['value', ms], ['unit', 'ms']] as const) {
    const f = prop(node, field);
    const actual = f === undefined ? undefined : valueOf(f);
    if (actual !== want) stale(c, 'spring-fallback', tokenId, [...at, field], f ?? node, want, actual);
  }
}

function checkSpring(c: Collector, tokenId: string, token: Node, spring: Node, path: JsonPath): void {
  c.springs++;
  const springPath = [...path, '$extensions', 'app.prism', 'spring'];
  const s = valueOf(spring) as Record<string, unknown>;
  const duration = s['duration'];
  const bounce = s['bounce'];
  if (typeof duration !== 'number' || typeof bounce !== 'number' || !(duration > 0) || !(bounce >= 0 && bounce < 1)) {
    return problem(c, springPath, spring, 'spring needs a positive duration and a bounce in [0, 1); cannot compute the settle');
  }
  const settle = settleMs(duration, bounce);
  const value = prop(token, '$value');
  if (value?.type !== 'object') {
    return problem(c, [...path, '$value'], value ?? token, 'a spring needs a literal transition $value (spring/fallback); cannot rewrite its fallback');
  }
  checkDuration(c, tokenId, value, 'duration', settle, [...path, '$value']);
  checkDuration(c, tokenId, value, 'delay', 0, [...path, '$value']);
  const settleNode = prop(spring, 'settle');
  const actual = settleNode === undefined ? undefined : valueOf(settleNode);
  const expected = settle / 1000;
  if (actual !== expected) stale(c, 'spring-fallback', tokenId, [...springPath, 'settle'], settleNode ?? spring, expected, actual);
}

function walkToken(c: Collector, node: Node, path: JsonPath): void {
  const tokenId = path.join('.');
  const value = prop(node, '$value');
  if (value !== undefined) walkValue(c, tokenId, value, [...path, '$value']);
  const ext = prop(node, '$extensions');
  const prism = ext === undefined ? undefined : prop(ext, 'app.prism');
  const spring = prism === undefined ? undefined : prop(prism, 'spring');
  if (spring?.type === 'object') checkSpring(c, tokenId, node, spring, path);
}

function walkGroup(c: Collector, node: Node, path: JsonPath): void {
  for (const p of properties(node)) {
    // Group properties ($type, $description, $extensions, $deprecated, $schema) are not children;
    // `$root` is the one `$` name that is a token.
    if (p.value.type !== 'object' || (p.key.startsWith('$') && p.key !== '$root')) continue;
    if (prop(p.value, '$value') !== undefined) walkToken(c, p.value, [...path, p.key]);
    else walkGroup(c, p.value, [...path, p.key]);
  }
}

/** Checks one document's text; `file` names it in the report. */
export function checkText(file: string, text: string): Omit<NormalizeReport, 'files'> {
  const diagnostics: Diagnostic[] = [];
  const doc = parseJson(file, text, diagnostics);
  if (doc === null || diagnostics.length > 0) {
    const problems = diagnostics.map((d) => ({ file, ...(d.line === undefined ? {} : { line: d.line }), message: `${d.message}; not checked` }));
    return { colors: [], springs: 0, stale: [], problems };
  }
  const c: Collector = { doc, colors: [], stale: [], problems: [], springs: 0 };
  walkGroup(c, doc.root, []);
  c.stale.sort((a, b) => a.line - b.line || (a.pointer < b.pointer ? -1 : a.pointer > b.pointer ? 1 : 0));
  return { colors: c.colors, springs: c.springs, stale: c.stale, problems: c.problems };
}

/** Checks every source file the reader lists. Reads only; nothing is written. */
export function normalizeSources(reader: SourceReader): NormalizeReport {
  const files = sourceFiles(reader);
  const colors: ColorObject[] = [];
  const staleValues: StaleValue[] = [];
  const problems: NormalizeProblem[] = [];
  let springs = 0;
  for (const file of files) {
    const r = checkText(file, reader.readText(file));
    colors.push(...r.colors);
    staleValues.push(...r.stale);
    problems.push(...r.problems);
    springs += r.springs;
  }
  return { files, colors, springs, stale: staleValues, problems };
}

function formattingOf(text: string): FormattingOptions {
  const indent = /^([ \t]+)\S/m.exec(text)?.[1] ?? '  ';
  return { insertSpaces: !indent.startsWith('\t'), tabSize: indent.startsWith('\t') ? 1 : indent.length, eol: text.includes('\r\n') ? '\r\n' : '\n' };
}

/** The text with every stale value of this file replaced by its expected value; other bytes are kept. */
export function fixText(text: string, staleValues: readonly StaleValue[]): string {
  const formattingOptions = formattingOf(text);
  let out = text;
  for (const s of staleValues) out = applyEdits(out, modify(out, [...s.path], s.expected, { formattingOptions }));
  return out;
}

export function formatStale(s: StaleValue): string {
  const actual = s.actual === undefined ? '(missing)' : JSON.stringify(s.actual);
  return `${s.file}:${s.line}  ${s.pointer}  ${JSON.stringify(s.expected)} → ${actual}`;
}

export function formatProblem(p: NormalizeProblem): string {
  return `${p.file}${p.line === undefined ? '' : `:${p.line}`}${p.pointer === undefined ? '' : `  ${p.pointer}`}  ${p.message}`;
}

export interface Io {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  readonly write: (root: string, file: string, text: string) => void;
}

const defaultIo: Io = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  write: (root, file, text) => writeFileSync(join(root, file), text),
};

const USAGE = 'usage: node tokens/normalize.ts --check|--write [--root <dir>]';

/** CLI entry; returns the exit code. */
export function main(argv: readonly string[], io: Io = defaultIo): number {
  let check = false;
  let write = false;
  let root = REPO_ROOT;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') check = true;
    else if (a === '--write') write = true;
    else if (a === '--root') {
      const v = argv[i + 1];
      if (v === undefined) {
        io.err(`tokens:normalize: --root needs a directory\n${USAGE}`);
        return 2;
      }
      root = resolve(v);
      i++;
    } else {
      io.err(`tokens:normalize: unknown argument ${a ?? ''}\n${USAGE}`);
      return 2;
    }
  }
  if (!check && !write) {
    io.err(`tokens:normalize: pass --check or --write\n${USAGE}`);
    return 2;
  }
  const reader = fsReader(root);
  const report = normalizeSources(reader);
  if (report.files.length === 0) {
    io.err(`tokens:normalize: no ${PATHS.tokens}/**/*${TOKEN_SUFFIX} under ${root}`);
    return 2;
  }
  for (const p of report.problems) io.out(formatProblem(p));
  const counted = `${report.colors.length} colors and ${report.springs} springs in ${report.files.length} files`;

  if (check) {
    for (const s of report.stale) io.out(formatStale(s));
    if (report.stale.length > 0) {
      const files = new Set(report.stale.map((s) => s.file)).size;
      io.err(`tokens:normalize: ${report.stale.length} stale values in ${files} files (expected → actual); run \`pnpm tokens:normalize\` to rewrite them`);
    }
    if (report.problems.length > 0) io.err(`tokens:normalize: ${report.problems.length} problems the normalizer cannot fix`);
    if (report.stale.length === 0 && report.problems.length === 0) io.out(`tokens:normalize: ${counted} are normalized`);
    return report.stale.length > 0 || report.problems.length > 0 ? 1 : 0;
  }

  const byFile = new Map<string, StaleValue[]>();
  for (const s of report.stale) byFile.set(s.file, [...(byFile.get(s.file) ?? []), s]);
  let remaining = 0;
  for (const [file, values] of byFile) {
    const before = reader.readText(file);
    const after = fixText(before, values);
    const again = checkText(file, after);
    remaining += again.stale.length + again.problems.length;
    if (after !== before) io.write(root, file, after);
    io.out(`tokens:normalize: wrote ${file} (${values.length} values)`);
  }
  if (remaining > 0) io.err(`tokens:normalize: ${remaining} values are still stale after the rewrite`);
  if (report.problems.length > 0) io.err(`tokens:normalize: ${report.problems.length} problems the normalizer cannot fix`);
  if (report.stale.length === 0) io.out(`tokens:normalize: ${counted} are normalized; nothing to rewrite`);
  return remaining > 0 || report.problems.length > 0 ? 1 : 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
