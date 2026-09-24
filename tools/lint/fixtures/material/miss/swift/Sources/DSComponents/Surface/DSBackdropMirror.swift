// The Surface directory is the Surface module's drawing on Apple (ADR-0036 §1): it reads the backdrop's
// pixels and saturates and blurs them by a glass recipe, so the names that fail in any other directory
// outside DSCore pass here. `miss:` names the rule that must not trip.
import SwiftUI
import DSCore

struct DSBackdropMirrorFixture<S: Shape>: View {
    @Environment(\.dsBackdropSource) private var inherited // miss: material/swift-backdrop-pixels
    let backdrop: DSBackdropSource // miss: material/swift-backdrop-pixels
    let recipe: DSGlassRecipe // miss: material/swift-backdrop-pixels
    let shape: S

    var body: some View {
        backdrop.content
            .saturation(recipe.saturate) // miss: material/swift-backdrop-pixels
            .blur(radius: recipe.blurRadius, opaque: true) // miss: material/swift-backdrop-pixels
            .clipShape(shape)
    }
}
