// One line per Swift pattern of ADR-0036 §10 in a component, outside the Surface module; `expect:` names
// the rule the line must trip. This chip draws its glass itself: it reads the backdrop's pixels, builds
// the recipe, saturates and blurs, and decides its own fallback, where `dsSurfaceChip` does all of it.
// Each spelling a pattern names has a line of its own: every operator on either side, every value
// `.transparency` is read off, every kind of operand, a member read off it and a parameter by its name.
import SwiftUI
import DSCore
import DSTokens

struct DSChip: View {
    private var ds = DSThemeValues()
    @Environment(\.dsBackdropSource) private var pixels // expect: material/swift-backdrop-pixels
    private let contexts: [DSTokenContext] = []
    private let optionalContext: DSTokenContext? = nil
    private let copy$ = DSTokenContext()

    var body: some View {
        Capsule()
            .fill(fill)
            .background { mirror }
    }

    private var source: DSBackdropSource? { pixels } // expect: material/swift-backdrop-pixels

    private var recipe: DSGlassRecipe { // expect: material/swift-backdrop-pixels
        DSGlassAppearance.chip.recipe(ds.tokens.material) // expect: material/swift-backdrop-pixels
    }

    private var mirror: some View {
        pixels?.content
            .saturation(recipe.saturate) // expect: material/swift-backdrop-pixels
            .blur(radius: recipe.blurRadius) // expect: material/swift-backdrop-pixels
    }

    private var resaturated: some View {
        mirror.saturation (recipe.saturate) // expect: material/swift-backdrop-pixels
    }

    private var fill: Color {
        ds.tokens.context.transparency == .reduced ? ds.tokens.color.bgSurfaceRaised : recipe.fill // expect: material/swift-transparency-read
    }

    private var isOpaque: Bool {
        .standard != ds.tokens.context.transparency // expect: material/swift-transparency-read
    }

    private var edgeCount: Int {
        switch ds.tokens.context.transparency { // expect: material/swift-transparency-read
        case .standard: 1
        case .reduced: 0
        }
    }

    private var dropsCheck: Bool {
        if case .reduced = ds.tokens.context.transparency { return true } // expect: material/swift-transparency-read
        return false
    }

    /// The other operators, on either side of it.
    private var operators: [Bool] {
        [
            ds.tokens.context.transparency ~= .reduced, // expect: material/swift-transparency-read
            .reduced == ds.tokens.context.transparency, // expect: material/swift-transparency-read
            .reduced ~= ds.tokens.context.transparency, // expect: material/swift-transparency-read
        ]
    }

    /// `.transparency` read off a call, a subscript, an optional, a forced unwrap and a name that holds `$`.
    private var readsOffValues: [Bool] {
        [
            resolved(for: .light).transparency == .reduced, // expect: material/swift-transparency-read
            contexts[0].transparency == .reduced, // expect: material/swift-transparency-read
            optionalContext?.transparency == .reduced, // expect: material/swift-transparency-read
            optionalContext!.transparency == .reduced, // expect: material/swift-transparency-read
            copy$.transparency == .reduced, // expect: material/swift-transparency-read
        ]
    }

    /// Every kind of operand on the right: `$0`, `?.`, `!`, and a call and a subscript with their arguments.
    private var operands: [Bool] {
        [
            contexts.allSatisfy { .reduced == $0.transparency }, // expect: material/swift-transparency-read
            .reduced == optionalContext?.transparency, // expect: material/swift-transparency-read
            .reduced == optionalContext!.transparency, // expect: material/swift-transparency-read
            .reduced == resolved(for: .dark).transparency, // expect: material/swift-transparency-read
            .reduced == ds.tokens[keyPath: \.context].transparency, // expect: material/swift-transparency-read
        ]
    }

    /// A member read off it.
    private var reducedByName: Bool {
        ds.tokens.context.transparency.rawValue == "reduced" // expect: material/swift-transparency-read
    }

    /// A parameter named `transparency`: the component picks its own fallback.
    private static func drawsEdge(for transparency: DSTransparency) -> Bool {
        transparency == .standard // expect: material/swift-transparency-read
    }

    private func resolved(for scheme: DSColorScheme) -> DSTokenContext { ds.tokens.context }
}
