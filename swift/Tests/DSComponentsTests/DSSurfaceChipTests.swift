import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// The glass chip shape, `dsSurfaceChip(_:in:elevation:gate:publishes:)` (ADR-0036 §3, §4, as ADR-0037 amends them),
/// read through environment probes: a view inside the chip records what the chip hands it.
///
/// - While glass or the component's own cell renders, the chip publishes the ground it sits on, so every other part of
///   the component keys on the media under the glass (§4.3).
/// - Under a forced Reduce Transparency, under a forced Increase Contrast and when the component asks for `raised`, it
///   publishes `(raised, none)`, so every part takes its default cell (§4.2, ADR-0036 rule 5).
/// - It leaves the Surface geometry alone: no padding, no concentric radius, no depth of its own (§2.3).
/// - It hands its content an enclosure (ADR-0037 §1, rule 3): `opaque` after a chip that renders its own cell, after a
///   fallback and after glass with no media under the `content` gate; `translucent` after a glass chip, a `chrome` chip
///   and a chip that renders nothing; `none` under `dsBackdrop(_:_:)`. Surface neither reads nor writes it.
///
/// The render is only the vehicle: nothing here reads a pixel, so the suite runs on the host, as `DSBackdropTests`
/// does. The web twin is `web/packages/react/test/surface-chip.test.tsx`'s server-rendered probe host.
@Suite("The glass chip publishes its ground (ADR-0036 §3, §4) and hands on its enclosure (ADR-0037 §1)")
struct DSSurfaceChipTests {
    /// What a view inside the chip reads from the environment.
    struct Reading: Equatable {
        var context: DSSurfaceContext?
        var geometry: DSSurfaceGeometry?
        var enclosure: DSSurfaceChipEnclosure?
        var hasPixels = false
    }

    /// Renders `view` in a theme whose contrast and transparency are forced, so the chip resolves the same on every
    /// host whatever its settings, and returns what the reader saw.
    @MainActor
    static func read(
        increasedContrast: Bool = false,
        reduceTransparency: Bool = false,
        _ view: (DSSurfaceChipReader) -> some View
    ) -> Reading {
        let probe = DSSurfaceChipProbe()
        let content = DSTheme { view(DSSurfaceChipReader(probe: probe)) }
            .dsAccessibilityPolicy(increasedContrast: increasedContrast, reduceTransparency: reduceTransparency)
        _ = ImageRenderer(content: content).cgImage
        return probe.reading
    }

    static let media: [DSBackdropKind] = DSBackdropKind.allCases.filter { $0 != .none }

    /// The component's answer on every ground: the recipe.
    static let glass: (DSSurfaceContext) -> DSSurfaceChipCell = { _ in .glass }
    /// The component's answer on every ground: a cell of its own.
    static let own: (DSSurfaceContext) -> DSSurfaceChipCell = { _ in .own(\.color.bgSurface) }
    /// The component's answer on every ground: no fill.
    static let nothing: (DSSurfaceContext) -> DSSurfaceChipCell = { _ in DSSurfaceChipCell.none }

    // MARK: - What the chip publishes

    @Test @MainActor func publishesTheGroundWhileGlassRenders() {
        for kind in Self.media {
            let onMedia = Self.read { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(onMedia.context == DSSurfaceContext(material: .page, backdrop: kind), "page over \(kind)")
            #expect(onMedia.enclosure == .translucent, "page over \(kind): glass renders")

            // On the scheme's glass the chip renders the recipe's fill and edge, and still publishes the glass ground.
            let onGlass = Self.read { reader in
                DSSurfaceView(material: .glass, backdrop: kind) {
                    reader.dsSurfaceChip(Self.glass, in: Capsule())
                }
                .dsBackdrop(kind) { Color.gray }
            }
            #expect(onGlass.context == DSSurfaceContext(material: .glass, backdrop: kind), "glass over \(kind)")
            #expect(onGlass.enclosure == .translucent, "glass over \(kind): glass renders")
        }
        let onVivid = Self.read { reader in
            DSSurfaceView(material: .vivid) {
                reader.dsSurfaceChip(Self.glass, in: Capsule())
            }
        }
        #expect(onVivid.context == DSSurfaceContext(material: .vivid))
        #expect(onVivid.enclosure == .translucent)
    }

    @Test @MainActor func publishesTheGroundWhileItsOwnCellRenders() {
        let atTheRoot = Self.read { reader in
            reader.dsSurfaceChip(Self.own, in: Capsule())
        }
        #expect(atTheRoot.context == .root)
        // A component's own cell is paint, not media, whatever its alpha (ADR-0037 §1).
        #expect(atTheRoot.enclosure == .opaque)

        let onSolid = Self.read { reader in
            DSSurfaceView(material: .solid) {
                reader.dsSurfaceChip(Self.own, in: Capsule())
            }
        }
        #expect(onSolid.context == DSSurfaceContext(material: .solid))
        #expect(onSolid.enclosure == .opaque)

        for kind in Self.media {
            let onMedia = Self.read { reader in
                reader.dsSurfaceChip(Self.own, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(onMedia.context == DSSurfaceContext(material: .page, backdrop: kind), "page over \(kind)")
            #expect(onMedia.enclosure == .opaque, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedUnderAForcedReduceTransparency() {
        for kind in Self.media {
            let reading = Self.read(reduceTransparency: true) { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            // The fallback is paint, so nothing inside it has media under it.
            #expect(reading.enclosure == .opaque, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedUnderAForcedIncreaseContrast() {
        for kind in Self.media {
            let reading = Self.read(increasedContrast: true) { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            #expect(reading.enclosure == .opaque, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedWhenTheComponentAsksForIt() {
        for kind in Self.media {
            let reading = Self.read { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule(), publishes: .raised).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            // It asked for `raised` and still renders the recipe.
            #expect(reading.enclosure == .translucent, "page over \(kind)")
        }
    }

    /// With no media under it, glass falls back under the `content` gate and renders under `chrome`.
    @Test @MainActor func theGateDecidesWhetherNoMediaIsAnInvalidBackdrop() {
        let content = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule())
        }
        #expect(content.context == DSSurfaceContext(material: .raised, backdrop: .none))
        #expect(content.enclosure == .opaque)

        let chrome = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule(), gate: .chrome)
        }
        #expect(chrome.context == .root)
        #expect(chrome.enclosure == .translucent)
    }

    // MARK: - What the chip leaves alone

    /// The chip adds no padding, never sets or reads the concentric geometry and adds no depth: a view inside it sees the
    /// geometry it would see without it.
    @Test @MainActor func leavesTheSurfaceGeometryAlone() {
        let withoutChip = Self.read { reader in
            DSSurfaceView(material: .solid, radius: .card) { reader }
        }
        let withChip = Self.read { reader in
            DSSurfaceView(material: .solid, radius: .card) {
                reader.dsSurfaceChip(Self.own, in: Capsule())
            }
        }
        #expect(withoutChip.geometry != nil)
        #expect(withChip.geometry == withoutChip.geometry)

        let atTheRoot = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(.map) { Color.gray }
        }
        #expect(atTheRoot.geometry == nil)
    }

    /// The chip never hands pixels down: with no backdrop above it, nothing inside it has any.
    @Test @MainActor func handsNoPixelsDown() {
        for cell in [Self.glass, Self.own] {
            let reading = Self.read { reader in
                reader.dsSurfaceChip(cell, in: Capsule(), gate: .chrome)
            }
            #expect(!reading.hasPixels)
        }
        let underBackdrop = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(.image) { Color.gray }
        }
        #expect(underBackdrop.hasPixels)
    }

    // MARK: - The enclosure (ADR-0037 §1)

    @Test @MainActor func theEnclosureIsNoneWhereNoChipEnclosesTheView() {
        #expect(Self.read { reader in reader }.enclosure == DSSurfaceChipEnclosure.none)
        let inASurface = Self.read { reader in
            DSSurfaceView(material: .vivid) { reader }
        }
        #expect(inASurface.enclosure == DSSurfaceChipEnclosure.none)
    }

    /// A chip that renders nothing lets the media through, as glass does.
    @Test @MainActor func aChipThatRendersNothingHandsTranslucent() {
        for kind in Self.media {
            let reading = Self.read { reader in
                reader.dsSurfaceChip(Self.nothing, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .page, backdrop: kind), "page over \(kind)")
            #expect(reading.enclosure == .translucent, "page over \(kind)")
        }
    }

    @Test @MainActor func theEnclosureTurnsOpaqueAtTheFirstOwnCellAndStaysOpaque() {
        // A chip rendering its own cell inside a glass chip hands on `opaque`.
        let ownInsideGlass = Self.read { reader in
            reader
                .dsSurfaceChip(Self.own, in: Circle())
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(ownInsideGlass.enclosure == .opaque)
        #expect(ownInsideGlass.context == DSSurfaceContext(material: .page, backdrop: .map))

        // A glass chip inside a glass chip renders glass, and hands on `translucent`.
        let glassInsideGlass = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Circle())
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(glassInsideGlass.enclosure == .translucent)
        #expect(glassInsideGlass.context == DSSurfaceContext(material: .page, backdrop: .map))

        // In an opaque enclosure a chip hands on `opaque` whatever it renders: here the recipe under `chrome`, and
        // nothing.
        let chromeInsideOwn = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Circle(), gate: .chrome)
                .dsSurfaceChip(Self.own, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(chromeInsideOwn.enclosure == .opaque)
        #expect(chromeInsideOwn.context == DSSurfaceContext(material: .page, backdrop: .map))
        let nothingInsideOwn = Self.read { reader in
            reader
                .dsSurfaceChip(Self.nothing, in: Circle())
                .dsSurfaceChip(Self.own, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(nothingInsideOwn.enclosure == .opaque)
    }

    /// ADR-0037 rule 2: inside a chip that renders its own cell a glass chip has no media under it, so under the
    /// `content` gate it falls back and publishes `(raised, none)`, although the ground is the page over a map.
    @Test @MainActor func aGlassChipInsideAnOwnCellFallsBackUnderContent() {
        let content = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Circle())
                .dsSurfaceChip(Self.own, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(content.context == DSSurfaceContext(material: .raised, backdrop: .none))
        #expect(content.enclosure == .opaque)

        // The control: inside a chip that renders nothing, the same glass chip renders glass on the map.
        let insideNothing = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Circle())
                .dsSurfaceChip(Self.nothing, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(insideNothing.context == DSSurfaceContext(material: .page, backdrop: .map))
        #expect(insideNothing.enclosure == .translucent)
    }

    /// Surface neither reads nor writes the enclosure: a Surface inside a chip passes it through.
    @Test @MainActor func aSurfacePassesTheEnclosureThrough() {
        let surfaceInsideGlass = Self.read { reader in
            DSSurfaceView(material: .solid) { reader }
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(surfaceInsideGlass.enclosure == .translucent)
        #expect(surfaceInsideGlass.context == DSSurfaceContext(material: .solid))

        let surfaceInsideOwn = Self.read { reader in
            DSSurfaceView(material: .solid) { reader }
                .dsSurfaceChip(Self.own, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(surfaceInsideOwn.enclosure == .opaque)
    }

    @Test @MainActor func dsBackdropSetsNoneForEveryKind() {
        for kind in DSBackdropKind.allCases {
            for (outer, name) in [(Self.glass, "glass"), (Self.own, "own")] {
                let reading = Self.read { reader in
                    reader
                        .dsBackdrop(kind) { Color.gray }
                        .dsSurfaceChip(outer, in: Capsule())
                        .dsBackdrop(.map) { Color.gray }
                }
                #expect(reading.enclosure == DSSurfaceChipEnclosure.none, "\(kind) inside \(name)")
            }
        }
        // The same chips without the inner backdrop do enclose the reader, so the readings above are the modifier's.
        let insideGlass = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(insideGlass.enclosure == .translucent)
        let insideOwn = Self.read { reader in
            reader
                .dsSurfaceChip(Self.own, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(insideOwn.enclosure == .opaque)
    }
}

final class DSSurfaceChipProbe {
    var reading = DSSurfaceChipTests.Reading()
}

/// Records the surface context, the Surface geometry, the enclosure and whether backdrop pixels reach it.
struct DSSurfaceChipReader: View {
    let probe: DSSurfaceChipProbe
    @Environment(\.dsSurfaceContext) private var context
    @Environment(\.dsSurfaceGeometry) private var geometry
    @Environment(\.dsSurfaceChipEnclosure) private var enclosure
    @Environment(\.dsBackdropSource) private var pixels

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(probe: DSSurfaceChipProbe) {
        self.probe = probe
    }

    var body: some View {
        probe.reading = DSSurfaceChipTests.Reading(
            context: context, geometry: geometry, enclosure: enclosure, hasPixels: pixels != nil
        )
        return Color.clear.frame(width: 1, height: 1)
    }
}
