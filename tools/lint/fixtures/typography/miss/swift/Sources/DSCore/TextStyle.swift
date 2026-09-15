import SwiftUI
import UIKit

// DSCore builds fonts (ADR-0021 §9): the typography kind does not apply here.
struct DSTextModifier: ViewModifier {
    let face: String
    let size: CGFloat
    @Environment(\.legibilityWeight) private var legibility // miss: typography/swift-legibility-weight

    func body(content: Content) -> some View {
        content
            .font(Font.custom(face, fixedSize: size)) // miss: typography/swift-font-api
            .monospacedDigit() // miss: typography/swift-font-modifier
    }

    func metrics() -> UIFont { UIFont(descriptor: UIFontDescriptor(), size: size) } // miss: typography/swift-platform-font
}
