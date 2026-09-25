// A component beside the Surface module's chip shape (ADR-0036 §2, §7): the chip hands `dsSurfaceChip`
// its background table and reads what the shape publishes, so it names no backdrop pixels or glass
// recipe and compares no transparency. `miss:` names the rule the line must not trip. The last lines are
// near misses, each at a boundary of the transparency pattern: a longer name, another enum's case, and a
// switch the line only names.
import SwiftUI
import DSCore
import DSTokens

struct DSChip: View {
    private var ds = DSThemeValues()

    var body: some View {
        Text(verbatim: "Label")
            .foregroundStyle(ds.tokens[keyPath: DSGlyphTone.primary.color(on: ds.surface)]) // miss: material/swift-transparency-read
            .dsSurfaceChip(DSChipAppearance.background(on:), in: Capsule()) // miss: material/swift-backdrop-pixels
    }
}

enum DSChipAppearance {
    /// The part's `background` cell by ground; the shape alone decides whether the glass renders.
    static func background(on ground: DSSurfaceContext) -> DSSurfaceChipCell {
        ground.backdrop == .none ? .own(\.color.bgSurfaceRaised) : .glass // miss: material/swift-transparency-read
    }

    /// Increase Contrast is a setting a component may compare; only DSCore compares transparency.
    static func strokesHairline(_ context: DSTokenContext) -> Bool {
        context.contrast == .increased // miss: material/swift-transparency-read
    }

    /// A forced context names transparency as an argument, which compares nothing.
    static let reduced = DSTokenContext(colorScheme: .light, transparency: .reduced) // miss: material/swift-transparency-read

    /// A parameter named `transparency` that is handed on, and a key path to it, compare nothing either.
    static func forced(_ scheme: DSColorScheme, transparency: DSTransparency) -> DSTokenContext { // miss: material/swift-transparency-read
        DSTokenContext(colorScheme: scheme, transparency: transparency) // miss: material/swift-transparency-read
    }

    static let transparencyPath = \DSTokenContext.transparency // miss: material/swift-transparency-read

    /// A name that only ends in `transparency` is another name, whatever joins it: an underscore, or a `$`,
    /// which Swift names may hold.
    static func isClear(_ layer: DSChipLayerStyle) -> Bool {
        layer.edge_transparency == 0 // miss: material/swift-transparency-read
            && layer.edge$transparency == 0 // miss: material/swift-transparency-read
    }

    /// Another enum's case by that name is not the context's transparency: nothing is read off a value.
    static func isTransparencyAxis(_ axis: DSContextAxisFixture) -> Bool {
        axis == .transparency // miss: material/swift-transparency-read
    }

    /// A message that names a switch over transparency is not one: no brace follows it.
    static func refuseOwnFallback() {
        assertionFailure("only DSCore may switch over transparency") // miss: material/swift-transparency-read
    }
}

#Preview {
    DSChip()
        .dsBackdrop(.map) { DSExampleMap() } // miss: material/swift-backdrop-pixels
        .dsAccessibilityPolicy(reduceTransparency: true) // miss: material/swift-reduce-transparency
}
