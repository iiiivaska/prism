// A component beside the Surface module's chip shape (ADR-0036 §2, §7): the chip hands `dsSurfaceChip`
// its background table and reads what the shape publishes, so it names no backdrop pixels or glass
// recipe and compares no transparency. `miss:` names the rule the line must not trip.
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
}

#Preview {
    DSChip()
        .dsBackdrop(.map) { DSExampleMap() } // miss: material/swift-backdrop-pixels
        .dsAccessibilityPolicy(reduceTransparency: true) // miss: material/swift-reduce-transparency
}
