// The grain tile both stacks generate (ADR-0030 §4.4 item 4, rule 9).
//
// Grain is monochrome value noise: one value per 1 × 1 pt cell, stretched to the full range [0, 1] and
// blended with `overlay` at the token's opacity (the gradient's `grain` or the glass recipe's). The tile
// is 128 × 128 cells and comes from one 32-bit integer hash of the cell coordinates, so nothing about it
// depends on a random seed, a platform PRNG or a float: every operation below is 32-bit integer
// arithmetic, which Swift and TypeScript agree on exactly.
//
// This file is the pin ADR-0030 §4.4 asks P3-1 and P3-4 for. `DSGrain` (swift/Sources/DSCore/DSGrain.swift)
// carries the same algorithm and the same checksum, `DSGrainTests` checks the Swift tile against it, and
// `tile.test.ts` checks this one and asserts that the Swift constant still says the same thing.

/** Cells per side. One cell is 1 pt (one CSS px, a 2 × 2 block of device pixels at 2×). */
export const GRAIN_TILE_SIZE = 128;

/** Grain is not drawn under text below this size (ADR-0030 §4.4 item 4, rule 9). */
export const GRAIN_MINIMUM_TEXT_SIZE_PX = 13;

/** FNV-1a 32 of the 16 384 stretched bytes, lower-case hex. The number both stacks' tests compare against. */
export const GRAIN_TILE_CHECKSUM = "3aea6890";

const MIX = 1274126177;
const X_PRIME = 374761393;
const Y_PRIME = 668265263;

/** A 32-bit integer hash of one cell; `Math.imul` is the 32-bit wrapping multiply Swift's `&*` is. */
export function grainHash(x: number, y: number): number {
  let h = (Math.imul(x, X_PRIME) + Math.imul(y, Y_PRIME)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), MIX) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The tile, row by row (y × size + x), as bytes: the hash's top octet, stretched so that the tile's
 * darkest cell is 0 and its brightest 255.
 */
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
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = Math.round((((raw[i] ?? 0) - min) * 255) / span);
  return out;
}

/** FNV-1a 32 of a byte sequence, as eight lower-case hex digits. */
export function fnv1a32(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** The checksum of the tile this file generates. */
export function grainTileChecksum(): string {
  return fnv1a32(grainTile());
}
