import DSCore
import SwiftUI

// The token-driven counterpart of each typography pattern (ADR-0021 §12); `miss:` names the rule it must not trip.
struct TypeTokens: View {
    let tokens: DSTokenSet
    let weight: Int // miss: typography/swift-font-modifier, typography/swift-legibility-weight

    var body: some View {
        Text(verbatim: "a").dsText(tokens.typography.bodyMd) // miss: typography/swift-font-api, typography/swift-font-modifier
    }

    let platform = UIFontDescriptor() // miss: typography/swift-platform-font
}
