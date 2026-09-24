// The Surface directory draws glass but decides no fallback: only DSCore compares Prism's transparency
// context, for Surface and the chip alike (ADR-0036 §3, §10), so the comparison fails here as in any
// other directory outside DSCore. `expect:` names the rule the line must trip. The pixels and the recipe
// on the other lines are this directory's own and pass.
import SwiftUI
import DSCore

struct DSSurfaceChipFixture: View {
    @Environment(\.dsBackdropSource) private var pixels
    let recipe: DSGlassRecipe
    let context: DSTokenContext

    var body: some View {
        pixels?.content
            .saturation(recipe.saturate)
            .blur(radius: recipe.blurRadius)
            .opacity(context.transparency == .reduced ? 0 : 1) // expect: material/swift-transparency-read
    }
}
