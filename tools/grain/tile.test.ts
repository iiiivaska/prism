import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fnv1a32, grainHash, grainTile, grainTileChecksum, GRAIN_MINIMUM_TEXT_SIZE_PX, GRAIN_TILE_CHECKSUM, GRAIN_TILE_SIZE } from "./tile.ts";

const dsGrain = join(import.meta.dirname, "..", "..", "swift", "Sources", "DSCore", "DSGrain.swift");

describe("the grain tile (ADR-0030 §4.4, rule 9)", () => {
  it("matches the pinned checksum", () => {
    expect(grainTile()).toHaveLength(GRAIN_TILE_SIZE * GRAIN_TILE_SIZE);
    expect(grainTileChecksum()).toBe(GRAIN_TILE_CHECKSUM);
  });

  it("is value noise stretched to the full range", () => {
    const tile = grainTile();
    expect(Math.min(...tile)).toBe(0);
    expect(Math.max(...tile)).toBe(255);
    const mean = tile.reduce((sum, v) => sum + v, 0) / tile.length;
    expect(Math.abs(mean - 127.5)).toBeLessThan(4);
    expect(new Set(tile).size).toBeGreaterThan(200);
  });

  it("is a pure function of the cell", () => {
    expect(grainTile()).toEqual(grainTile());
    expect(grainHash(63, 31)).toBe(grainHash(63, 31));
    expect(grainHash(0, 0) >>> 24).not.toBe(grainHash(1, 0) >>> 24);
    // Every step stays inside 32 bits, which is what lets Swift reproduce it exactly.
    for (const [x, y] of [[0, 0], [1, 0], [127, 127], [63, 31]]) {
      const h = grainHash(x ?? 0, y ?? 0);
      expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true);
    }
  });

  it("starts with the pinned first row", () => {
    expect(Array.from(grainTile().slice(0, 8))).toEqual([0, 130, 4, 86, 8, 69, 248, 87]);
  });

  it("checksums with FNV-1a 32, against its published vectors", () => {
    const bytes = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
    expect(fnv1a32(new Uint8Array())).toBe("811c9dc5");
    expect(fnv1a32(bytes("a"))).toBe("e40c292c");
    expect(fnv1a32(bytes("foobar"))).toBe("bf9cf968");
  });
});

/**
 * The pin is only a pin if both stacks read the same numbers. `DSGrainTests` checks the Swift tile
 * against `DSGrain.checksum`; this checks that `DSGrain.checksum` is still this file's, so neither
 * side can drift on its own.
 */
describe("the Swift half of the pin", () => {
  const source = readFileSync(dsGrain, "utf8");

  it("carries the same checksum", () => {
    expect(source).toContain(`public static let checksum = "${GRAIN_TILE_CHECKSUM}"`);
  });

  it("carries the same tile size and small-text rule", () => {
    expect(source).toContain(`public static let tileSize = ${GRAIN_TILE_SIZE}`);
    expect(source).toContain(`public static let minimumTextSize: CGFloat = ${GRAIN_MINIMUM_TEXT_SIZE_PX}`);
  });
});
