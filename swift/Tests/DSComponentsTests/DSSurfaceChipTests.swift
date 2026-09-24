import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// The glass chip shape, `dsSurfaceChip(_:in:elevation:gate:publishes:)` (ADR-0036 §3, §4), read through environment
/// probes: a view inside the chip records what the chip hands it.
///
/// - While glass or the component's own cell renders, the chip publishes the ground it sits on, so every other part of
///   the component keys on the media under the glass (§4.3).
/// - Under a forced Reduce Transparency, under a forced Increase Contrast and when the component asks for `raised`, it
///   publishes `(raised, none)`, so every part takes its default cell (§4.2, ADR-0036 rule 5).
/// - It leaves the Surface geometry alone: no padding, no concentric radius, no depth of its own (§2.3).
/// - It tells its content that a glass chip encloses it when it renders the recipe or is itself enclosed, Surface
///   neither reads nor writes that, and `dsBackdrop(_:_:)` clears it (§3 step 8).
///
/// The render is only the vehicle: nothing here reads a pixel, so the suite runs on the host, as `DSBackdropTests`
/// does. The web twin is `web/packages/react/test/surface-chip.test.tsx`'s server-rendered probe host.
@Suite("The glass chip publishes its ground (ADR-0036 §3, §4)")
struct DSSurfaceChipTests {
    /// What a view inside the chip reads from the environment.
    struct Reading: Equatable {
        var context: DSSurfaceContext?
        var geometry: DSSurfaceGeometry?
        var insideGlassChip: Bool?
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

    // MARK: - What the chip publishes

    @Test @MainActor func publishesTheGroundWhileGlassRenders() {
        for kind in Self.media {
            let onMedia = Self.read { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(onMedia.context == DSSurfaceContext(material: .page, backdrop: kind), "page over \(kind)")
            #expect(onMedia.insideGlassChip == true, "page over \(kind): glass renders")

            // On the scheme's glass the chip renders the recipe's fill and edge, and still publishes the glass ground.
            let onGlass = Self.read { reader in
                DSSurfaceView(material: .glass, backdrop: kind) {
                    reader.dsSurfaceChip(Self.glass, in: Capsule())
                }
                .dsBackdrop(kind) { Color.gray }
            }
            #expect(onGlass.context == DSSurfaceContext(material: .glass, backdrop: kind), "glass over \(kind)")
            #expect(onGlass.insideGlassChip == true, "glass over \(kind): glass renders")
        }
        let onVivid = Self.read { reader in
            DSSurfaceView(material: .vivid) {
                reader.dsSurfaceChip(Self.glass, in: Capsule())
            }
        }
        #expect(onVivid.context == DSSurfaceContext(material: .vivid))
        #expect(onVivid.insideGlassChip == true)
    }

    @Test @MainActor func publishesTheGroundWhileItsOwnCellRenders() {
        let atTheRoot = Self.read { reader in
            reader.dsSurfaceChip(Self.own, in: Capsule())
        }
        #expect(atTheRoot.context == .root)
        #expect(atTheRoot.insideGlassChip == false)

        let onSolid = Self.read { reader in
            DSSurfaceView(material: .solid) {
                reader.dsSurfaceChip(Self.own, in: Capsule())
            }
        }
        #expect(onSolid.context == DSSurfaceContext(material: .solid))
        #expect(onSolid.insideGlassChip == false)

        for kind in Self.media {
            let onMedia = Self.read { reader in
                reader.dsSurfaceChip(Self.own, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(onMedia.context == DSSurfaceContext(material: .page, backdrop: kind), "page over \(kind)")
            #expect(onMedia.insideGlassChip == false, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedUnderAForcedReduceTransparency() {
        for kind in Self.media {
            let reading = Self.read(reduceTransparency: true) { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            // The fallback renders no recipe, so nothing inside is enclosed by glass.
            #expect(reading.insideGlassChip == false, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedUnderAForcedIncreaseContrast() {
        for kind in Self.media {
            let reading = Self.read(increasedContrast: true) { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule()).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            #expect(reading.insideGlassChip == false, "page over \(kind)")
        }
    }

    @Test @MainActor func publishesRaisedWhenTheComponentAsksForIt() {
        for kind in Self.media {
            let reading = Self.read { reader in
                reader.dsSurfaceChip(Self.glass, in: Capsule(), publishes: .raised).dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .raised, backdrop: .none), "page over \(kind)")
            // It asked for `raised` and still renders the recipe.
            #expect(reading.insideGlassChip == true, "page over \(kind)")
        }
    }

    /// With no media under it, glass falls back under the `content` gate and renders under `chrome`.
    @Test @MainActor func theGateDecidesWhetherNoMediaIsAnInvalidBackdrop() {
        let content = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule())
        }
        #expect(content.context == DSSurfaceContext(material: .raised, backdrop: .none))
        #expect(content.insideGlassChip == false)

        let chrome = Self.read { reader in
            reader.dsSurfaceChip(Self.glass, in: Capsule(), gate: .chrome)
        }
        #expect(chrome.context == .root)
        #expect(chrome.insideGlassChip == true)
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

    // MARK: - The enclosing-chip flag (§3 step 8)

    @Test @MainActor func theFlagIsSetForTheContentOfAGlassChipAndEveryChipInsideIt() {
        #expect(Self.read { reader in reader }.insideGlassChip == false)

        // A chip rendering its own cell inside a glass chip passes the flag on.
        let ownInsideGlass = Self.read { reader in
            reader
                .dsSurfaceChip(Self.own, in: Circle())
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(ownInsideGlass.insideGlassChip == true)
        #expect(ownInsideGlass.context == DSSurfaceContext(material: .page, backdrop: .map))

        // A glass chip inside a glass chip renders glass, and its content is enclosed.
        let glassInsideGlass = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Circle())
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(glassInsideGlass.insideGlassChip == true)

        // Surface neither reads nor writes the flag: a Surface inside a glass chip passes it through.
        let surfaceInsideGlass = Self.read { reader in
            DSSurfaceView(material: .solid) { reader }
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(surfaceInsideGlass.insideGlassChip == true)
        #expect(surfaceInsideGlass.context == DSSurfaceContext(material: .solid))
    }

    @Test @MainActor func dsBackdropClearsTheFlag() {
        for kind in DSBackdropKind.allCases {
            let reading = Self.read { reader in
                reader
                    .dsBackdrop(kind) { Color.gray }
                    .dsSurfaceChip(Self.glass, in: Capsule())
                    .dsBackdrop(.map) { Color.gray }
            }
            #expect(reading.insideGlassChip == false, "\(kind)")
        }
        // The same chip without the inner backdrop does enclose the reader, so the reading above is the modifier's.
        let enclosed = Self.read { reader in
            reader
                .dsSurfaceChip(Self.glass, in: Capsule())
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(enclosed.insideGlassChip == true)
    }
}

final class DSSurfaceChipProbe {
    var reading = DSSurfaceChipTests.Reading()
}

/// Records the surface context, the Surface geometry, the enclosing-chip flag and whether backdrop pixels reach it.
struct DSSurfaceChipReader: View {
    let probe: DSSurfaceChipProbe
    @Environment(\.dsSurfaceContext) private var context
    @Environment(\.dsSurfaceGeometry) private var geometry
    @Environment(\.dsInsideGlassChip) private var insideGlassChip
    @Environment(\.dsBackdropSource) private var pixels

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(probe: DSSurfaceChipProbe) {
        self.probe = probe
    }

    var body: some View {
        probe.reading = DSSurfaceChipTests.Reading(
            context: context, geometry: geometry, insideGlassChip: insideGlassChip, hasPixels: pixels != nil
        )
        return Color.clear.frame(width: 1, height: 1)
    }
}
