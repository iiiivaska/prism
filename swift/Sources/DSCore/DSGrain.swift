import CoreGraphics
import Foundation

/// The grain tile (ADR-0030 §4.4 item 4, rule 9).
///
/// Grain is monochrome value noise: one value per 1 × 1 pt cell, stretched to the full range and blended with
/// `overlay` at the token's opacity — the gradient's `grain` on vivid, the recipe's `grain` on glass. Both stacks
/// generate the same 128 × 128 tile from one 32-bit integer hash, so a Prism surface grains identically on Apple
/// and on the web.
///
/// **The pin.** `tools/grain/tile.ts` is the shared definition: the same hash, the same stretch and the same
/// checksum (`GRAIN_TILE_CHECKSUM`). `DSGrainTests` regenerates the tile here and compares its checksum with
/// `checksum` below; `tools/grain/tile.test.ts` does the same on the web side and asserts that this file still
/// carries the same value. Every step is 32-bit integer arithmetic, which both languages agree on exactly.
///
/// The geometry the tile is drawn with — how it tiles a surface, and the content boxes it is left out of —
/// belongs to `Surface.yaml` and P3-3. What lives here is the tile and the one rule DSCore can state on its own:
/// grain is not drawn under text below 13 pt.
nonisolated public enum DSGrain: Sendable {
    /// Cells per side. One cell is 1 pt: one CSS px, a 2 × 2 block of device pixels at 2×.
    public static let tileSize = 128

    /// Grain is not drawn under text below this size (ADR-0030 §4.4 item 4). On vivid all such text sits in the
    /// Card header block (ADR-0022 §4.2), so a Surface leaves the grain out of that block; a glass recipe with a
    /// non-zero grain leaves it out of the content box of such text.
    public static let minimumTextSize: CGFloat = 13

    /// FNV-1a 32 of the tile's 16 384 bytes, lower-case hex. Pinned in `tools/grain/tile.ts`
    /// (`GRAIN_TILE_CHECKSUM`); the two must stay equal.
    public static let checksum = "3aea6890"

    private static let mix: UInt32 = 1_274_126_177
    private static let xPrime: UInt32 = 374_761_393
    private static let yPrime: UInt32 = 668_265_263

    /// The 32-bit integer hash of one cell.
    public static func hash(x: Int, y: Int) -> UInt32 {
        var h = UInt32(truncatingIfNeeded: x) &* xPrime &+ UInt32(truncatingIfNeeded: y) &* yPrime
        h = (h ^ (h >> 13)) &* mix
        return h ^ (h >> 16)
    }

    /// The tile, row by row (`y * tileSize + x`): the hash's top octet, stretched so that the darkest cell is 0
    /// and the brightest 255.
    public static func tile(size: Int = tileSize) -> [UInt8] {
        var raw = [UInt8](repeating: 0, count: size * size)
        var minimum = UInt8.max
        var maximum = UInt8.min
        for y in 0..<size {
            for x in 0..<size {
                let value = UInt8(truncatingIfNeeded: hash(x: x, y: y) >> 24)
                raw[y * size + x] = value
                minimum = Swift.min(minimum, value)
                maximum = Swift.max(maximum, value)
            }
        }
        guard maximum > minimum else { return raw }
        let span = Int(maximum) - Int(minimum)
        // round(a × 255 / span) without a float: floor((a × 510 + span) / (2 × span)).
        return raw.map { UInt8(((Int($0) - Int(minimum)) * 510 + span) / (2 * span)) }
    }

    /// FNV-1a 32 of a byte sequence, as eight lower-case hex digits.
    public static func fnv1a32(_ bytes: [UInt8]) -> String {
        var hash: UInt32 = 0x811c_9dc5
        for byte in bytes { hash = (hash ^ UInt32(byte)) &* 0x0100_0193 }
        return String(format: "%08x", hash)
    }

    /// Whether grain is drawn under text of this size (ADR-0030 rule 9).
    public static func isDrawn(underTextOfSize size: CGFloat) -> Bool { size >= minimumTextSize }
}
