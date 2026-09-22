/// <reference types="node" />
/**
 * The grain tile of the web Surface (ADR-0030 §4.4 item 4, rule 9).
 *
 * The same 128 × 128 value noise as `tools/grain/tile.ts` and DSCore's `DSGrain`: one 32-bit integer
 * hash per cell, its top octet stretched to the full range. `test/grain.test.ts` checks this tile against
 * the checksum pinned in `tools/grain/tile.ts`, so the web cannot drift from the pin on its own.
 *
 * The build encodes it as a grayscale PNG (one image px per CSS px, so the tile draws at its intrinsic
 * size with no length in the stylesheet) and appends it to styles.css as `--ds--surface-grain-tile`.
 * Node only: it runs in the package build and the tests, never in a consumer's bundle.
 */
import { crc32, deflateSync } from "node:zlib";

export const GRAIN_TILE_SIZE = 128;

const MIX = 1274126177;
const X_PRIME = 374761393;
const Y_PRIME = 668265263;

/** The hash of one cell; `Math.imul` is the 32-bit wrapping multiply of Swift's `&*`. */
export function grainHash(x: number, y: number): number {
  let h = (Math.imul(x, X_PRIME) + Math.imul(y, Y_PRIME)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), MIX) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The tile row by row (`y × size + x`), stretched so the darkest cell is 0 and the brightest 255. */
export function grainTile(size: number = GRAIN_TILE_SIZE): Uint8Array {
  const raw = new Uint8Array(size * size);
  let min = 255;
  let max = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = grainHash(x, y) >>> 24;
      raw[y * size + x] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (max === min) return raw;
  const span = max - min;
  return raw.map((value) => Math.round(((value - min) * 255) / span));
}

/** FNV-1a 32 of a byte sequence, as eight lower-case hex digits: the checksum the pin uses. */
export function fnv1a32(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** The tile as an 8-bit grayscale PNG: filter type 0 on every row, one IDAT. */
export function grainTilePng(size: number = GRAIN_TILE_SIZE): Buffer {
  const tile = grainTile(size);
  const scanlines = Buffer.alloc(size * (size + 1));
  for (let y = 0; y < size; y++) {
    scanlines[y * (size + 1)] = 0;
    scanlines.set(tile.subarray(y * size, (y + 1) * size), y * (size + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // color type: grayscale
  header[10] = 0; // compression
  header[11] = 0; // filter method
  header[12] = 0; // no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

/** The CSS rule the build appends to styles.css. */
export function grainTileRule(): string {
  const uri = `data:image/png;base64,${grainTilePng().toString("base64")}`;
  return `@layer ds.components {\n  .ds-surface {\n    --ds--surface-grain-tile: url("${uri}");\n  }\n}\n`;
}
