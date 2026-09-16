import Foundation
import Testing
@testable import DSCore

/// ADR-0030 rule 9, the Apple half: "the grain tile is the same on both stacks, and grain is not drawn under text
/// below 13 px", checked by the tile checksum test.
///
/// The pin is `tools/grain/tile.ts`: the same hash, the same stretch and the same `GRAIN_TILE_CHECKSUM`.
/// `tools/grain/tile.test.ts` checks the web tile against it and asserts that `DSGrain.checksum` below still says
/// the same thing, so neither stack can drift on its own.
@Suite("Grain tile (ADR-0030 §4.4, rule 9)")
struct DSGrainTests {
    @Test func theTileMatchesThePinnedChecksum() {
        let tile = DSGrain.tile()
        #expect(tile.count == DSGrain.tileSize * DSGrain.tileSize)
        #expect(DSGrain.fnv1a32(tile) == DSGrain.checksum, "the tile no longer matches tools/grain/tile.ts")
    }

    /// Value noise, stretched to the full range: the darkest cell is 0 and the brightest 255 (ADR-0030 §4.4).
    @Test func theTileFillsTheRange() {
        let tile = DSGrain.tile()
        #expect(tile.min() == 0)
        #expect(tile.max() == 255)
        let mean = Double(tile.reduce(0) { $0 + Int($1) }) / Double(tile.count)
        #expect(abs(mean - 127.5) < 4, "mean \(mean): the noise is not uniform")
        #expect(Set(tile).count > 200, "only \(Set(tile).count) distinct values")
    }

    /// The tile is a pure function of the cell, so it tiles seamlessly in the sense that matters: nothing about
    /// it depends on a seed, a PRNG or the order cells are visited.
    @Test func theTileIsAPureFunctionOfTheCell() {
        let tile = DSGrain.tile()
        let again = DSGrain.tile()
        #expect(tile == again)
        for (x, y) in [(0, 0), (1, 0), (0, 1), (127, 127), (63, 31)] {
            #expect(DSGrain.hash(x: x, y: y) == DSGrain.hash(x: x, y: y))
        }
        // Neighbouring cells are independent: value noise, not a ramp.
        #expect(DSGrain.hash(x: 0, y: 0) >> 24 != DSGrain.hash(x: 1, y: 0) >> 24)
    }

    /// The first row of the tile, as `tools/grain/tile.ts` generates it. A transcription error in either stack's
    /// 32-bit arithmetic shows up here before the checksum does, and says where.
    @Test func theFirstRowIsThePinnedOne() {
        let tile = DSGrain.tile()
        #expect(Array(tile.prefix(8)) == [0, 130, 4, 86, 8, 69, 248, 87])
    }

    @Test func grainIsNotDrawnUnderSmallText() {
        #expect(DSGrain.minimumTextSize == 13)
        #expect(!DSGrain.isDrawn(underTextOfSize: 12))
        #expect(!DSGrain.isDrawn(underTextOfSize: 12.9))
        #expect(DSGrain.isDrawn(underTextOfSize: 13))
        #expect(DSGrain.isDrawn(underTextOfSize: 48))
    }

    /// FNV-1a 32 against its published test vectors, so a broken checksum function cannot make the tile check
    /// pass by accident.
    @Test func theChecksumIsFNV1a32() {
        #expect(DSGrain.fnv1a32([]) == "811c9dc5")
        #expect(DSGrain.fnv1a32(Array("a".utf8)) == "e40c292c")
        #expect(DSGrain.fnv1a32(Array("foobar".utf8)) == "bf9cf968")
    }
}
