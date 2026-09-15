import SwiftUI
import UIKit

// One line per typography pattern (ADR-0021 §12); `expect:` names the rule the line must trip.
struct TypeLiterals: View {
    let face: String
    @Environment(\.legibilityWeight) private var legibility // expect: typography/swift-legibility-weight

    var body: some View {
        VStack {
            Text(verbatim: "a").font(.system(.body)) // expect: typography/swift-font-api
            Text(verbatim: "b").font(Font.custom(face, fixedSize: 17)) // expect: typography/swift-font-api
            Text(verbatim: "c").fontWeight(.semibold) // expect: typography/swift-font-modifier
            Text(verbatim: "d").monospacedDigit() // expect: typography/swift-font-modifier
        }
    }

    let platform = UIFont(descriptor: UIFontDescriptor(), size: 0) // expect: typography/swift-platform-font
}
