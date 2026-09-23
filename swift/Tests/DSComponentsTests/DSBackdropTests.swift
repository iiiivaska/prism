import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `dsBackdrop(_:_:)` (ADR-0036 §8): an app declares the page over media it paints itself, and the declaration also
/// hands the media's pixels to the glass inside.
///
/// - It publishes `(page, kind)` to the view it modifies, and nothing else: no Surface geometry, so the concentric rule
///   of a Surface inside it is the one it had without it.
/// - The nearest publisher wins: a `DSSurfaceView` inside it publishes its own context, and a `dsBackdrop` inside a
///   Surface overrides the Surface's for its subtree.
/// - `.none` publishes nothing, and still hands the pixels down.
///
/// The render is only the vehicle: nothing here reads a pixel, so the suite runs on the host. The web twin is
/// `web/packages/react/test/backdrop.test.tsx`.
@Suite("dsBackdrop publishes the page over media (ADR-0036 §8)")
struct DSBackdropTests {
    /// What a view inside the modifier reads from the environment.
    struct Reading {
        var context: DSSurfaceContext?
        var geometry: DSSurfaceGeometry?
        var hasPixels = false
    }

    @MainActor
    static func read(_ view: (DSBackdropReader) -> some View) -> Reading {
        let probe = DSBackdropProbe()
        // Forced standard contrast and transparency, so a glass Surface renders glass whatever the host's settings.
        let content = DSTheme { view(DSBackdropReader(probe: probe)) }
            .dsAccessibilityPolicy(increasedContrast: false, reduceTransparency: false)
        _ = ImageRenderer(content: content).cgImage
        return probe.reading
    }

    static let media: [DSBackdropKind] = DSBackdropKind.allCases.filter { $0 != .none }

    @Test @MainActor func publishesThePageOverEachKindAndNoGeometry() {
        #expect(Self.media == [.image, .map, .vivid])
        for kind in Self.media {
            let reading = Self.read { reader in
                reader.dsBackdrop(kind) { Color.gray }
            }
            #expect(reading.context == DSSurfaceContext(material: .page, backdrop: kind), "\(kind)")
            #expect(reading.geometry == nil, "\(kind)")
            #expect(reading.hasPixels, "\(kind)")
        }
    }

    /// Without the modifier the same reader sees the root and no pixels, so the readings above are the modifier's.
    @Test @MainActor func theRootIsThePageOnNothing() {
        let reading = Self.read { reader in reader }
        #expect(reading.context == .root)
        #expect(reading.geometry == nil)
        #expect(!reading.hasPixels)
    }

    @Test @MainActor func noneLeavesTheRootAndStillHandsThePixelsDown() {
        let reading = Self.read { reader in
            reader.dsBackdrop(.none) { Color.gray }
        }
        #expect(reading.context == .root)
        #expect(reading.hasPixels)

        // `(page, none)` is the root, so only inside a Surface does "publishes nothing" differ from publishing it.
        let inside = Self.read { reader in
            DSSurfaceView(material: .solid) {
                reader.dsBackdrop(.none) { Color.gray }
            }
        }
        #expect(inside.context == DSSurfaceContext(material: .solid))
        #expect(inside.hasPixels)
    }

    @Test @MainActor func aSurfaceInsideItPublishesItsOwnContext() {
        let opaque = Self.read { reader in
            DSSurfaceView(material: .solid) { reader }
                .dsBackdrop(.map) { Color.gray }
        }
        #expect(opaque.context == DSSurfaceContext(material: .solid))
        #expect(opaque.geometry != nil)

        let glass = Self.read { reader in
            DSSurfaceView(material: .glass, backdrop: .image) { reader }
                .dsBackdrop(.map) { Color.gray }
        }
        let expected: DSSurfaceMaterial = DSPlatform.isWatch ? .raised : .glass
        #expect(glass.context == DSSurfaceContext(material: expected, backdrop: .image))
    }

    @Test @MainActor func insideASurfaceTheNearestPublisherWins() {
        for kind in Self.media {
            let reading = Self.read { reader in
                DSSurfaceView(material: .raised) {
                    reader.dsBackdrop(kind) { Color.gray }
                }
            }
            #expect(reading.context == DSSurfaceContext(material: .page, backdrop: kind), "\(kind)")
            // The Surface's geometry still reaches the content: the modifier publishes no geometry of its own.
            #expect(reading.geometry != nil, "\(kind)")
        }
    }

    @Test @MainActor func theNearestBackdropWins() {
        let reading = Self.read { reader in
            reader
                .dsBackdrop(.map) { Color.gray }
                .dsBackdrop(.image) { Color.gray }
        }
        #expect(reading.context == DSSurfaceContext(material: .page, backdrop: .map))
    }
}

final class DSBackdropProbe {
    var reading = DSBackdropTests.Reading()
}

/// Records the surface context, the Surface geometry and whether backdrop pixels reach it.
struct DSBackdropReader: View {
    let probe: DSBackdropProbe
    @Environment(\.dsSurfaceContext) private var context
    @Environment(\.dsSurfaceGeometry) private var geometry
    @Environment(\.dsBackdropSource) private var pixels

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(probe: DSBackdropProbe) {
        self.probe = probe
    }

    var body: some View {
        probe.reading = DSBackdropTests.Reading(context: context, geometry: geometry, hasPixels: pixels != nil)
        return Color.clear.frame(width: 1, height: 1)
    }
}
