// Palettes from hex for the unit tests, and the fixture trees of validate.test.ts: `fixtures/base` is a valid
// minimal token tree whose palette passes every check, and every other folder under `fixtures/` holds only the
// files its case replaces, overlaid on the base (tools/tokens/source/reader.ts `overlayReader`).
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contrastRatio, fsReader, hexToRgba, overlayReader, type SourceReader } from '../tokens/api.ts';
import type { Palette, Swatch } from './checks.ts';
import type { Relief, Scheme } from './relief.ts';

export const FIXTURES = join(import.meta.dirname, 'fixtures');
export const BASE = 'base';

export function swatch(hex: string): Swatch {
  return { hex: hex.toLowerCase(), srgb: hexToRgba(hex).srgb };
}

/** A palette measured against one opaque surface, as the method's validator measures it. */
export function hexPalette(opts: {
  readonly scheme: Scheme;
  readonly slots: readonly string[];
  readonly surface: string;
  readonly now?: string;
  readonly brand?: string;
  readonly colorScheme?: string;
  readonly reliefs?: Readonly<Record<number, readonly Relief[]>>;
}): Palette {
  const surface = hexToRgba(opts.surface).srgb;
  return {
    brand: opts.brand ?? '',
    colorScheme: opts.colorScheme ?? opts.scheme,
    scheme: opts.scheme,
    slots: opts.slots.map(swatch),
    now: opts.now === undefined ? null : swatch(opts.now),
    grounds: opts.slots.map((hex) => ({ ratio: contrastRatio(hexToRgba(hex).srgb, surface), where: `on ${opts.surface}` })),
    reliefs: opts.slots.map((_, i) => opts.reliefs?.[i + 1] ?? []),
  };
}

/** The fixture case as a reader: the base tree with the case's files over it. */
export function caseReader(name: string): SourceReader {
  const base = fsReader(join(FIXTURES, BASE));
  return name === BASE ? base : overlayReader(base, fsReader(join(FIXTURES, name)));
}

/** The fixture case written out as one tree in a temporary folder, for the CLI, which reads a --root. */
export function materialize(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `viz-validate-${name}-`));
  cpSync(join(FIXTURES, BASE), dir, { recursive: true });
  if (name !== BASE) cpSync(join(FIXTURES, name), dir, { recursive: true });
  return dir;
}
