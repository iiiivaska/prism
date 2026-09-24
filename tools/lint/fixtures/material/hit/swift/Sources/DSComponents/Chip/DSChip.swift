// One line per Swift pattern of ADR-0036 §10 in a component, outside the Surface module; `expect:` names
// the rule the line must trip. This chip draws its glass itself: it reads the backdrop's pixels, builds
// the recipe, saturates and blurs, and decides its own fallback, where `dsSurfaceChip` does all of it.
import SwiftUI
import DSCore
import DSTokens

struct DSChip: View {
    private var ds = DSThemeValues()
    @Environment(\.dsBackdropSource) private var pixels // expect: material/swift-backdrop-pixels

    var body: some View {
        Capsule()
            .fill(fill)
            .background { mirror }
    }

    private var recipe: DSGlassRecipe { // expect: material/swift-backdrop-pixels
        DSGlassAppearance.chip.recipe(ds.tokens.material) // expect: material/swift-backdrop-pixels
    }

    private var mirror: some View {
        pixels?.content
            .saturation(recipe.saturate) // expect: material/swift-backdrop-pixels
            .blur(radius: recipe.blurRadius) // expect: material/swift-backdrop-pixels
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
}
