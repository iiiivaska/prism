import CoreGraphics
import Foundation

/// Blur radii on Apple (ADR-0030 §4.3, ADR-0022 §2.1).
///
/// Every blur value in the token set is a CSS blur: `filter: blur(r)` and `backdrop-filter: blur(r)` take r as
/// the **standard deviation** of the Gaussian, which is why ADR-0030 §4.3 brought the vivid bloom down from 150
/// to 75. SwiftUI's `.blur(radius:)` does not document what its radius is.
///
/// **Measured (P3-1 verify item, settled 2026-09-16).** `DSBlurTests.swiftUIRadiusIsNotTheCSSStandardDeviation`
/// blurs a step edge with `ImageRenderer` and reads the standard deviation back three ways — the second moment of
/// the step's derivative and the 10 %/90 % and 25 %/75 % crossings — at radii from 4 to 75. SwiftUI renders
/// σ ≈ 0.90 × radius, not σ = radius. DSCore therefore scales the token value, as ADR-0030 §4.3 says it must.
nonisolated public enum DSBlur: Sendable {
    /// The Gaussian standard deviation SwiftUI renders per point of `.blur(radius:)`, measured on iOS, watchOS
    /// and macOS. 1.0 would mean SwiftUI and CSS agreed.
    public static let standardDeviationPerRadius: CGFloat = 0.90

    /// The `.blur(radius:)` that renders a CSS `blur(value)` — the token value is the standard deviation.
    public static func radius(cssStandardDeviation value: CGFloat) -> CGFloat {
        value / standardDeviationPerRadius
    }

    /// The standard deviation a `.blur(radius:)` renders; the inverse, for tests and for reading a measurement
    /// back against a token.
    public static func standardDeviation(radius: CGFloat) -> CGFloat {
        radius * standardDeviationPerRadius
    }
}
