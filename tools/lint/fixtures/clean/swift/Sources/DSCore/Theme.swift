import DSTokens
import SwiftUI

/// Every value comes from DSTokens. Comments never count: the old accent was #0A84FF,
/// the hit target 44pt and the face "SF Pro" (see issue #1590).
public struct ThemeFixture {
    public var background: Color { DSColor.bgSurface }
    public var padding: CGFloat { DSSpace.s3 }
    public var font: Font { DSType.body }
    public let docs = "https://example.com/tokens#top"

    #if os(watchOS)
    public let usesGlass = false
    #else
    public let usesGlass = true
    #endif

    /* Block comment with #FFFFFF and "Onest", /* nested */ still a comment: 4px */
    public func check() { #expect(usesGlass || !usesGlass) }
}

#Preview {
    Text(verbatim: "Preview")
}
