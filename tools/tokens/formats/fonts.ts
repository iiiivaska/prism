// Font emission (P1-8; ADR-0021 §11, ADR-0020 §5 and §7, ARCHITECTURE §9.0): `tokens:build` writes the
// font files, so the stale check guards them.
//
//   Apple  every font file a repo brand bundles on Apple, with its OFL.txt, copied byte for byte into
//          swift/Sources/DSTokens/Resources/Fonts/<family-dir>/ (Package.swift `.copy("Resources/Fonts")`),
//          one copy per destination path: brands that bundle the same bytes at the same path share it,
//          and different bytes at a taken path fail (`fonts/path-collision`). Each brand's DSBrand face
//          names its own path, so the same bytes under two paths are two copies (ARCHITECTURE §16.3).
//   Web    for every font file a brand serves on the web, web/packages/tokens/src/generated/<brand>/fonts/
//          receives <family-dir>/<family-kebab>-wght.woff2 (the same TTF, not subset), <family-dir>/OFL.txt
//          and fonts.css with one @font-face per file.
//
// Each family keeps its own folder on the web too, because every family's OFL.txt carries its own
// copyright line and one brand serves several families (prism: Onest and JetBrains Mono). So a folder
// holds one family and one OFL.txt, written once however many files the folder holds: a second family
// in a taken folder fails (`fonts/shared-folder`), and so does a different OFL.txt for a taken Apple
// folder (`fonts/path-collision`, the rule for any taken path). The format reports these and never
// writes a path twice, so `renderAll` never sees a duplicate.
//
// The woff2 encoder (`woff2-encoder`, Google's encoder compiled to WebAssembly; deterministic, V12) is
// asynchronous while formats are synchronous, so it runs in a worker thread that the build waits for
// with `Atomics.wait`. Results are cached by the source SHA-256 for the life of the process.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MessageChannel, receiveMessageOnPort, Worker } from 'node:worker_threads';
import { FONT_SLOTS, WEB_OUTPUT_ROOT } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import type { BrandFont, BrandMeta } from '../source/types.ts';
import { readFontFile } from '../../fonts/font-file.ts';
import type { FormatInput, FormatOutput, OutputFile } from './index.ts';

/** The Swift resource folder, copied whole into the DSTokens bundle. */
export const SWIFT_FONTS_DIR = 'Fonts';
export const SWIFT_FONTS_ROOT = `swift/Sources/DSTokens/Resources/${SWIFT_FONTS_DIR}`;
export const LICENSE_FILE = 'OFL.txt';

/** The folder of a font file inside its brand's `fonts/`: `fonts/onest/Onest[wght].ttf` → `onest`. */
export function familyDir(file: string): string {
  const parts = file.split('/').filter((s) => s !== '' && s !== '.');
  return parts.length >= 2 ? parts[parts.length - 2] ?? '' : '';
}

function basename(file: string): string {
  return file.split('/').filter((s) => s !== '').pop() ?? file;
}

/** `JetBrains Mono` → `jetbrains-mono`. */
export function familyKebab(family: string): string {
  return family.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function webFontsDir(brand: string): string {
  return `${WEB_OUTPUT_ROOT}/${brand}/fonts`;
}

/** One font file a brand serves: the entry and the slots that name it. */
export interface ServedFont {
  readonly brand: string;
  readonly entry: BrandFont & { readonly file: string };
  readonly slots: readonly string[];
  /** Repository-relative source path: `brands/<brand>/<entry.file>`. */
  readonly source: string;
}

/** The files a brand serves on a platform, one per `file`, in slot order (ADR-0021 §11). */
export function servedFonts(brand: string, meta: BrandMeta, platform: 'apple' | 'web'): ServedFont[] {
  const byFile = new Map<string, { entry: BrandFont & { readonly file: string }; slots: string[] }>();
  for (const slot of FONT_SLOTS) {
    const entry = meta.fonts[slot];
    if (entry === undefined || entry.file === null || !entry.platforms.includes(platform)) continue;
    const file = entry.file;
    const hit = byFile.get(file);
    if (hit !== undefined) hit.slots.push(slot);
    else byFile.set(file, { entry: { ...entry, file }, slots: [slot] });
  }
  return [...byFile.values()].map(({ entry, slots }) => ({ brand, entry, slots, source: `brands/${brand}/${entry.file}` }));
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// ---- woff2 (V12): the asynchronous WebAssembly encoder, waited for synchronously ----

const WORKER_SOURCE = `
const { workerData } = require('node:worker_threads');
const { port, signal, url } = workerData;
import(url).then(({ compress }) => {
  port.once('message', async (fonts) => {
    try {
      const out = [];
      for (const bytes of fonts) out.push(await compress(bytes));
      port.postMessage({ fonts: out });
    } catch (e) {
      port.postMessage({ error: String(e && e.stack || e) });
    }
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0);
  });
}, (e) => {
  port.postMessage({ error: String(e && e.stack || e) });
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
`;

const WOFF2_TIMEOUT_MS = 180_000;

/**
 * woff2 of each TTF, byte-identical across runs and machines (ADR-0021 §11, V12), in a fresh worker.
 * Exported for the determinism test; the format goes through the cache in `woff2Of`.
 */
export function encodeWoff2(fonts: readonly Uint8Array[]): Uint8Array[] {
  if (fonts.length === 0) return [];
  const signal = new Int32Array(new SharedArrayBuffer(4));
  const { port1, port2 } = new MessageChannel();
  const url = import.meta.resolve('woff2-encoder');
  const worker = new Worker(WORKER_SOURCE, { eval: true, workerData: { port: port2, signal, url }, transferList: [port2] });
  try {
    port1.postMessage(fonts.map((f) => new Uint8Array(f)));
    if (Atomics.wait(signal, 0, 0, WOFF2_TIMEOUT_MS) === 'timed-out') throw new Error(`the woff2 encoder did not finish within ${WOFF2_TIMEOUT_MS} ms`);
    const reply = receiveMessageOnPort(port1)?.message as { fonts?: Uint8Array[]; error?: string } | undefined;
    if (reply?.fonts === undefined) throw new Error(`the woff2 encoder failed: ${reply?.error ?? 'no reply'}`);
    return reply.fonts.map((f) => new Uint8Array(f));
  } finally {
    port1.close();
    void worker.terminate();
  }
}

const woff2Cache = new Map<string, Uint8Array>();

function woff2Of(fonts: readonly { readonly sha: string; readonly bytes: Uint8Array }[]): Map<string, Uint8Array> {
  const missing = fonts.filter((f, i) => !woff2Cache.has(f.sha) && fonts.findIndex((g) => g.sha === f.sha) === i);
  const encoded = encodeWoff2(missing.map((f) => f.bytes));
  missing.forEach((f, i) => {
    const out = encoded[i];
    if (out !== undefined) woff2Cache.set(f.sha, out);
  });
  return new Map(fonts.map((f) => [f.sha, woff2Cache.get(f.sha) ?? new Uint8Array()]));
}

// ---- fonts.css ----

function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** `font-weight` of a face: the `wght` axis range of a variable font, else its OS/2 weight class. */
function weightRange(bytes: Uint8Array): string {
  const font = readFontFile(bytes);
  const wght = font.axes.find((a) => a.tag === 'wght');
  if (wght !== undefined) return wght.min === wght.max ? String(wght.min) : `${wght.min} ${wght.max}`;
  return String(font.weightClass ?? 400);
}

export function fontsCss(brand: string, faces: readonly { readonly served: ServedFont; readonly href: string; readonly weight: string }[]): string {
  const lines = [`/* Generated by tools/tokens from brands/${brand}/brand.json (brand "${brand}"). Do not edit; run \`pnpm tokens:build\`. */`];
  for (const f of faces) {
    const e = f.served.entry;
    lines.push(
      '',
      `/* ${e.family} ${e.version ?? ''}, ${e.file}, sha256 ${e.sha256 ?? ''} */`,
      '@font-face {',
      `  font-family: ${cssString(e.family)};`,
      `  src: url(${cssString(f.href)}) format("woff2");`,
      `  font-weight: ${f.weight};`,
      '  font-style: normal;',
      '  font-display: swap;',
      '}',
    );
  }
  return `${lines.join('\n')}\n`;
}

// ---- the format ----

interface Loaded {
  readonly bytes: Uint8Array;
  /** The OFL.txt beside the file: its repository-relative path, bytes and SHA-256. */
  readonly licensePath: string;
  readonly license: Uint8Array;
  readonly sha: string;
  readonly licenseSha: string;
}

/** The family that first took a destination folder, and the OFL.txt it wrote there. */
interface Folder {
  readonly family: string;
  readonly source: string;
  readonly licensePath: string;
  readonly licenseSha: string;
}

/**
 * Claims the destination folder `where` (`<root>/<family-dir>/`) for `f`: `new` (write its OFL.txt),
 * `taken` (the same family with the same OFL.txt is already there) or `conflict`, reported once per
 * cause: per pair of font files for a second family, so a file served on both platforms is reported
 * once, and per pair of OFL.txt files for a different license.
 */
function claimFolder(
  folders: Map<string, Folder>, where: string, f: ServedFont, l: Loaded, report: (key: string, d: Diagnostic) => void,
): 'new' | 'taken' | 'conflict' {
  const held = folders.get(where);
  if (held === undefined) {
    folders.set(where, { family: f.entry.family, source: f.source, licensePath: l.licensePath, licenseSha: l.licenseSha });
    return 'new';
  }
  const file = `brands/${f.brand}/brand.json`;
  if (held.family !== f.entry.family) {
    report(`shared-folder|${held.source}|${f.source}`, error(
      'fonts/shared-folder',
      `${f.source} (${f.entry.family}) lands in ${where}, which holds ${held.source} (${held.family}); a family folder holds one family and its ${LICENSE_FILE} (ADR-0021 §11)`,
      { file, hint: `move the file into a folder of its own under brands/${f.brand}/fonts/, with that family's ${LICENSE_FILE}, and update \`file\`` },
    ));
    return 'conflict';
  }
  if (held.licenseSha !== l.licenseSha) {
    report(`license|${held.licensePath}|${l.licensePath}`, error(
      'fonts/path-collision',
      `${l.licensePath} and ${held.licensePath} differ, and both would be ${where}${LICENSE_FILE} (ADR-0021 §11)`,
      { file, hint: `give both brands the same ${LICENSE_FILE}, or rename one family folder` },
    ));
    return 'conflict';
  }
  return 'taken';
}

export function renderFonts(input: FormatInput): FormatOutput {
  const files: OutputFile[] = [];
  const diagnostics: Diagnostic[] = [];
  const reported = new Set<string>();
  const report = (key: string, d: Diagnostic): void => {
    if (reported.has(key)) return;
    reported.add(key);
    diagnostics.push(d);
  };
  const loaded = new Map<string, Loaded | null>();
  const load = (f: ServedFont): Loaded | null => {
    const hit = loaded.get(f.source);
    if (hit !== undefined) return hit;
    const abs = join(input.root, f.source);
    const licensePath = `${f.source.slice(0, f.source.lastIndexOf('/'))}/${LICENSE_FILE}`;
    let out: Loaded | null = null;
    if (!existsSync(abs)) {
      diagnostics.push(error('fonts/missing-file', `brand "${f.brand}" serves ${f.source}, which does not exist`, { file: `brands/${f.brand}/brand.json`, hint: 'add the file or fix `file` in brand.json; `pnpm fonts:check` checks every font entry' }));
    } else if (!existsSync(join(input.root, licensePath))) {
      diagnostics.push(error('fonts/missing-license', `${f.source} has no ${LICENSE_FILE} beside it (ADR-0021 §11)`, { file: licensePath }));
    } else {
      const bytes = new Uint8Array(readFileSync(abs));
      const sha = sha256(bytes);
      if (f.entry.sha256 !== null && sha !== f.entry.sha256) {
        diagnostics.push(error('fonts/sha256', `${f.source} has SHA-256 ${sha}, but brand "${f.brand}" pins ${f.entry.sha256}`, { file: `brands/${f.brand}/brand.json`, hint: 'restore the pinned file or update `sha256` and `version` in brand.json' }));
      } else {
        const license = new Uint8Array(readFileSync(join(input.root, licensePath)));
        out = { bytes, licensePath, license, sha, licenseSha: sha256(license) };
      }
    }
    loaded.set(f.source, out);
    return out;
  };

  // Apple: one copy per destination path, in resolver brand order, and one OFL.txt per family folder,
  // which brands share; a different file at a taken path fails.
  const swiftPaths = new Map<string, string>();
  const swiftFolders = new Map<string, Folder>();
  for (const [brand, meta] of input.bundle.brands) {
    for (const f of servedFonts(brand, meta, 'apple')) {
      const l = load(f);
      if (l === null) continue;
      const folder = `${SWIFT_FONTS_ROOT}/${familyDir(f.entry.file)}/`;
      const claim = claimFolder(swiftFolders, folder, f, l, report);
      if (claim === 'conflict') continue;
      const path = `${folder}${basename(f.entry.file)}`;
      const prev = swiftPaths.get(path);
      if (prev === l.sha) continue;
      if (prev !== undefined) {
        diagnostics.push(error('fonts/path-collision', `brand "${brand}" bundles ${f.source} at ${path}, where another brand bundles a different file (ADR-0021 §11)`, { file: `brands/${brand}/brand.json`, hint: 'rename the family folder or file of one brand' }));
        continue;
      }
      swiftPaths.set(path, l.sha);
      files.push({ path, contents: l.bytes });
      if (claim === 'new') files.push({ path: `${folder}${LICENSE_FILE}`, contents: l.license });
    }
  }

  // Web: per brand, one woff2 per served file, one OFL.txt per family folder and one fonts.css.
  const web = [...input.bundle.brands].map(([brand, meta]) => ({ brand, fonts: servedFonts(brand, meta, 'web') }));
  const toEncode = web.flatMap((w) => w.fonts.map(load)).filter((l): l is Loaded => l !== null);
  const woff2 = woff2Of(toEncode);
  for (const { brand, fonts } of web) {
    const faces: { served: ServedFont; href: string; weight: string }[] = [];
    const used = new Set<string>();
    const webFolders = new Map<string, Folder>();
    for (const f of fonts) {
      const l = load(f);
      if (l === null) continue;
      const dir = familyDir(f.entry.file);
      const claim = claimFolder(webFolders, `${webFontsDir(brand)}/${dir}/`, f, l, report);
      if (claim === 'conflict') continue;
      const name = `${familyKebab(f.entry.family)}-wght.woff2`;
      const rel = `${dir}/${name}`;
      if (used.has(rel)) {
        diagnostics.push(error('fonts/path-collision', `brand "${brand}" serves two web files as ${rel}`, { file: `brands/${brand}/brand.json` }));
        continue;
      }
      used.add(rel);
      files.push({ path: `${webFontsDir(brand)}/${rel}`, contents: woff2.get(l.sha) ?? new Uint8Array() });
      if (claim === 'new') files.push({ path: `${webFontsDir(brand)}/${dir}/${LICENSE_FILE}`, contents: l.license });
      faces.push({ served: f, href: `./${rel}`, weight: weightRange(l.bytes) });
    }
    if (faces.length > 0) files.push({ path: `${webFontsDir(brand)}/fonts.css`, contents: fontsCss(brand, faces) });
  }
  return { files, diagnostics };
}
