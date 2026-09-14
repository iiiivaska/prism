import SwiftUI

public struct ThemeFixture {
    public var background: Color { Color(red: 0.97, green: 0.97, blue: 0.98) }
    public var accent: Color { Color(hex: "#0A84FF") }
    public var font: Font { .custom("Onest", size: 17) }
    public var mono: Font { Font.custom("JetBrains Mono", size: 13) }
    public let legacy = #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)
    public let caption = "Caption at 11pt"
}
