// The format registry (ARCHITECTURE §3.1, §9): every output is a pure function of the bundle (the font
// format also copies the brand font files it names). `renderAll` runs the formats in registry order and
// returns the files sorted by path with every diagnostic the formats found. Each target writes only its
// own part of `OWNED_ROOTS` (§9.0): the web files (`css`, `tailwind`, `ts`, `runtime`, `manifest`), the
// Swift sources and generated tests (`swift`), `Colors.xcassets` (`xcassets`), the font files (`fonts`,
// P1-8) and the two design-tool flavors under `tokens/export/` (`tokens-studio`, which also writes the
// export README, and `figma`). A new target is one `Format` entry here plus its renderer.
import type { Diagnostic } from '../ir/diagnostics.ts';
import type { IRBundle } from '../ir/types.ts';
import type { SourceReader } from '../source/reader.ts';
import type { SourceModel } from '../source/types.ts';
import { renderMotionCss } from './css-motion.ts';
import { renderTokensCss } from './css-variables-modes.ts';
import { renderFigmaNative } from './figma-native.ts';
import { renderFonts } from './fonts.ts';
import { renderManifest } from './manifest.ts';
import { renderRuntimeTs } from './runtime-ts.ts';
import { renderSwiftBrand } from './swift/brand.ts';
import { renderSwiftColors } from './swift/colors.ts';
import { renderSwiftContext } from './swift/context.ts';
import { renderSwiftTests } from './swift/tests.ts';
import { renderSwiftTokenSet } from './swift/token-set.ts';
import { renderSwiftTypes } from './swift/types.ts';
import { renderSwiftXcassets } from './swift-xcassets.ts';
import { renderTailwindTheme } from './tailwind-theme.ts';
import { renderTokensStudio } from './tokens-studio.ts';
import { renderTsTokens } from './ts-tokens.ts';

/** One generated file: a repository-relative POSIX path inside `OWNED_ROOTS` and its bytes. */
export interface OutputFile {
  readonly path: string;
  readonly contents: string | Uint8Array;
}

export interface FormatInput {
  readonly bundle: IRBundle;
  /** The source model the bundle was built from (the Tokens Studio flavor mirrors its documents). */
  readonly model: SourceModel;
  /** Absolute repository root: formats that copy files (fonts, P1-8) read them from here. */
  readonly root: string;
  readonly reader: SourceReader;
}

export interface FormatOutput {
  readonly files: readonly OutputFile[];
  readonly diagnostics?: readonly Diagnostic[];
}

export interface Format {
  /** The target name `--only` selects. */
  readonly target: string;
  readonly render: (input: FormatInput) => FormatOutput;
}

function all(...renders: readonly ((input: FormatInput) => FormatOutput)[]): (input: FormatInput) => FormatOutput {
  return (input) => {
    const outputs = renders.map((r) => r(input));
    return { files: outputs.flatMap((o) => o.files), diagnostics: outputs.flatMap((o) => o.diagnostics ?? []) };
  };
}

export const FORMATS: readonly Format[] = [
  { target: 'css', render: all(renderTokensCss, renderMotionCss) },
  { target: 'tailwind', render: renderTailwindTheme },
  { target: 'ts', render: renderTsTokens },
  { target: 'runtime', render: renderRuntimeTs },
  { target: 'manifest', render: renderManifest },
  { target: 'swift', render: all(renderSwiftTypes, renderSwiftContext, renderSwiftColors, renderSwiftBrand, renderSwiftTokenSet, renderSwiftTests) },
  { target: 'xcassets', render: renderSwiftXcassets },
  { target: 'fonts', render: renderFonts },
  { target: 'tokens-studio', render: renderTokensStudio },
  { target: 'figma', render: renderFigmaNative },
];

export const TARGETS: readonly string[] = FORMATS.map((f) => f.target);

export interface RenderResult {
  readonly files: readonly OutputFile[];
  readonly diagnostics: readonly Diagnostic[];
}

function comparePaths(a: OutputFile, b: OutputFile): number {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

/** Every output file, sorted by path; `only` limits the run to some targets (development, never with `--check`). */
export function renderAll(input: FormatInput, only?: readonly string[]): RenderResult {
  const files: OutputFile[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const f of FORMATS) {
    if (only !== undefined && !only.includes(f.target)) continue;
    const out = f.render(input);
    files.push(...out.files);
    diagnostics.push(...(out.diagnostics ?? []));
  }
  files.sort(comparePaths);
  for (let i = 1; i < files.length; i++) {
    if (files[i]?.path === files[i - 1]?.path) throw new Error(`two formats write ${files[i]?.path ?? ''}`);
  }
  return { files, diagnostics };
}

/** UTF-8 bytes of a file (text files are written as UTF-8 without BOM, §12 rule 5). */
export function bytesOf(file: OutputFile): Uint8Array {
  return typeof file.contents === 'string' ? new TextEncoder().encode(file.contents) : file.contents;
}
