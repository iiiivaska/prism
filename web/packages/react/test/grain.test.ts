/// <reference types="node" />
/**
 * The web half of the grain pin (ADR-0030 §4.4 item 4, rule 9): the tile the build ships equals the
 * checksum `tools/grain/tile.ts` pins, which DSCore's `DSGrain` also carries.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildStyles, packageRoot } from "../scripts/build-styles.ts";
import { fnv1a32, GRAIN_TILE_SIZE, grainTile, grainTilePng } from "../scripts/grain.ts";

const pinFile = join(packageRoot, "..", "..", "..", "tools", "grain", "tile.ts");
const pin = readFileSync(pinFile, "utf8");

function pinned(name: string): string {
  const match = new RegExp(`export const ${name} = "?([\\w]+)"?;`).exec(pin);
  if (match?.[1] === undefined) throw new Error(`${name} not found in tools/grain/tile.ts`);
  return match[1];
}

/** The pixels of an 8-bit grayscale, non-interlaced PNG with filter type 0 on every row. */
function decodeGrayscalePng(png: Buffer): { width: number; height: number; pixels: Uint8Array } {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("latin1", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect([data[8], data[9], data[12]]).toEqual([8, 0, 0]);
    } else if (type === "IDAT") {
      idat.push(data);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width + 1)]).toBe(0);
    pixels.set(raw.subarray(y * (width + 1) + 1, (y + 1) * (width + 1)), y * width);
  }
  return { width, height, pixels };
}

describe("the grain tile (ADR-0030 rule 9)", () => {
  it("has the pinned size and checksum", () => {
    expect(String(GRAIN_TILE_SIZE)).toBe(pinned("GRAIN_TILE_SIZE"));
    expect(fnv1a32(grainTile())).toBe(pinned("GRAIN_TILE_CHECKSUM"));
  });

  it("ships in styles.css as a PNG whose pixels are the pinned tile", async () => {
    const css = await buildStyles();
    const uri = /--ds--surface-grain-tile: url\("data:image\/png;base64,([A-Za-z0-9+/=]+)"\)/.exec(css)?.[1];
    expect(uri).toBeDefined();
    const png = Buffer.from(uri ?? "", "base64");
    expect(png.equals(grainTilePng())).toBe(true);
    const { width, height, pixels } = decodeGrayscalePng(png);
    expect([width, height]).toEqual([GRAIN_TILE_SIZE, GRAIN_TILE_SIZE]);
    expect(fnv1a32(pixels)).toBe(pinned("GRAIN_TILE_CHECKSUM"));
  });
});
