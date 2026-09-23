import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif

/// The one route an SF Symbol is drawn at a registry weight (`spec/components/Icon.yaml` behaviors 3 and 4,
/// ADR-0013 decision 4, ADR-0021 §3 and §12).
///
/// A glyph's weight is a font weight — SwiftUI draws an SF Symbol at the weight of the font it is given — and only
/// DSCore builds a font (ADR-0021 §12, `lint:literals` kinds `typography/swift-font-api`, `swift-font-modifier` and
/// `swift-legibility-weight`). So `DSIcon` names the rung and this route draws it. DSCore does not depend on DSIcons,
/// so the route takes the rung's numbers (`DSIconWeight.number` and `boldText.number`) and never the registry's type.
///
/// **Why a font and not `.resizable()`.** A resized symbol is stretched to its box, whatever its own proportions:
/// an arrow is blown up to the size of a circle. The registry's point sizes (`DSIconSize.pointSize`, spec/icons
/// README "Size mapping table") are calibrated so that `circle` fills its box at the font route, and every other
/// symbol keeps San Francisco's own proportions to it — an arrow smaller than a circle, as Phosphor's 256 grid keeps
/// it on the web.
///
/// **Why the fit.** At those point sizes a few wide symbols draw ink outside their box (`dot.radiowaves.left.and.right`,
/// `eye`, `house`, `camera` among them), which Icon.yaml's anatomy rules out ("never drawn outside it"). So a symbol
/// whose layout frame is larger than `circle`'s at the same point size and weight is drawn smaller, by the ratio of
/// the two frames' longer sides, and never larger (`fittedPointSize`). The calibration family itself — `circle`,
/// `clock`, `*.circle` — is untouched, and every registry symbol then stays inside its box (`DSIconBoxTests`).
nonisolated public enum DSSymbol {
    /// The symbol the registry's point sizes are calibrated on (spec/icons/README.md, "Size mapping table"): the
    /// frame every other symbol is fitted into.
    public static let calibration = "circle"

    /// The weight a symbol renders at: `boldWeight` — the rung the registry's Bold Text ladder steps to — under Bold
    /// Text, `weight` otherwise (Icon.yaml behavior 4, ADR-0021 §3). Applied once, here: `DSSymbolImage` then tells
    /// SwiftUI the text is already bold, so it does not step the symbol a second time.
    public static func renderedWeight(_ weight: Int, boldWeight: Int, boldText: Bool) -> Int {
        boldText ? boldWeight : weight
    }

    /// The point size a symbol is drawn at: `pointSize × min(1, reference.max / frame.max)`, where `frame` is the
    /// symbol's layout frame at `pointSize` and `reference` is `calibration`'s at the same point size and weight. A
    /// symbol no larger than the reference keeps the registry's point size; a larger one shrinks until its longer side
    /// is the reference's. It never enlarges, and a degenerate frame leaves the point size alone.
    public static func fittedPointSize(_ pointSize: CGFloat, frame: CGSize, reference: CGSize) -> CGFloat {
        let side = max(frame.width, frame.height)
        let limit = max(reference.width, reference.height)
        guard side > 0, limit > 0 else { return pointSize }
        return pointSize * min(1, limit / side)
    }

    /// The layout frame of a system symbol at a point size, a token weight and a scale: the size the platform's
    /// symbol image reports, which is the frame SwiftUI lays the symbol out in at the same font. nil when this
    /// platform has no symbol of that name.
    public static func frame(systemName: String, pointSize: CGFloat, weight: Int, scale: Image.Scale) -> CGSize? {
        #if os(macOS)
        let configuration = NSImage.SymbolConfiguration(pointSize: pointSize, weight: fontWeight(weight), scale: symbolScale(scale))
        guard let image = NSImage(systemSymbolName: systemName, accessibilityDescription: nil)?
            .withSymbolConfiguration(configuration)
        else { return nil }
        return image.size
        #else
        let configuration = UIImage.SymbolConfiguration(pointSize: pointSize, weight: symbolWeight(weight), scale: symbolScale(scale))
        return UIImage(systemName: systemName, withConfiguration: configuration)?.size
        #endif
    }

    #if os(macOS)
    /// AppKit's weight for a token weight, on the ladder `DSTypography.systemWeight` uses for SwiftUI.
    private static func fontWeight(_ weight: Int) -> NSFont.Weight {
        switch weight {
        case ..<150: .ultraLight
        case ..<250: .thin
        case ..<350: .light
        case ..<450: .regular
        case ..<550: .medium
        case ..<650: .semibold
        case ..<750: .bold
        case ..<850: .heavy
        default: .black
        }
    }

    private static func symbolScale(_ scale: Image.Scale) -> NSImage.SymbolScale {
        switch scale {
        case .small: .small
        case .large: .large
        default: .medium
        }
    }
    #else
    /// UIKit's symbol weight for a token weight, on the ladder `DSTypography.systemWeight` uses for SwiftUI.
    private static func symbolWeight(_ weight: Int) -> UIImage.SymbolWeight {
        switch weight {
        case ..<150: .ultraLight
        case ..<250: .thin
        case ..<350: .light
        case ..<450: .regular
        case ..<550: .medium
        case ..<650: .semibold
        case ..<750: .bold
        case ..<850: .heavy
        default: .black
        }
    }

    private static func symbolScale(_ scale: Image.Scale) -> UIImage.SymbolScale {
        switch scale {
        case .small: .small
        case .large: .large
        default: .medium
        }
    }
    #endif
}

/// The fitted point size of each symbol, measured once per point size, weight and scale: a frame is a lookup in the
/// symbol font, and a view asks for the same handful of them on every render.
@MainActor
enum DSSymbolFit {
    private struct Key: Hashable {
        let systemName: String
        let pointSize: CGFloat
        let weight: Int
        let scale: Image.Scale
    }

    private static var cache: [Key: CGFloat] = [:]

    /// `DSSymbol.fittedPointSize` for this symbol against `DSSymbol.calibration`; the registry's point size when
    /// either frame cannot be measured.
    static func pointSize(systemName: String, pointSize: CGFloat, weight: Int, scale: Image.Scale) -> CGFloat {
        let key = Key(systemName: systemName, pointSize: pointSize, weight: weight, scale: scale)
        if let cached = cache[key] { return cached }
        let fitted: CGFloat
        if let frame = DSSymbol.frame(systemName: systemName, pointSize: pointSize, weight: weight, scale: scale),
           let reference = DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: pointSize, weight: weight, scale: scale) {
            fitted = DSSymbol.fittedPointSize(pointSize, frame: frame, reference: reference)
        } else {
            fitted = pointSize
        }
        cache[key] = fitted
        return fitted
    }
}

/// An SF Symbol in a square box, at a registry weight: the drawing half of `DSIcon`.
///
/// In order: the weight Bold Text chooses (`DSSymbol.renderedWeight`, from Prism's accessibility policy, which
/// previews and snapshots can force), the point size fitted to the calibration frame (`DSSymbol.fittedPointSize`),
/// and the symbol drawn at that font, centred in `box`. SwiftUI's own Bold Text step is switched off for the symbol,
/// because Prism has already applied it — the text route's item 7 (ADR-0021 T8).
///
/// It sets no variant, rendering mode, colour, mirroring or accessibility: the caller applies `.symbolVariant`,
/// `.symbolRenderingMode`, `.flipsForRightToLeftLayoutDirection`, its foreground and its accessibility outside it,
/// and the first two reach the symbol through the environment.
public struct DSSymbolImage: View {
    private let systemName: String
    private let box: CGFloat
    private let pointSize: CGFloat
    private let scale: Image.Scale
    private let weight: Int
    private let boldWeight: Int

    private var ds = DSThemeValues()

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.

    /// - Parameters:
    ///   - systemName: the SF Symbol, as the registry binds it (`DSIconName.symbol`).
    ///   - box: the square the symbol is centred in (`size.icon.*`).
    ///   - pointSize: the registry's calibrated point size for that box (`DSIconSize.pointSize`).
    ///   - scale: the symbol scale the registry measured at (`DSIconSize.scale`).
    ///   - weight: the rung's token weight (`DSIconWeight.number`).
    ///   - boldWeight: the token weight of the rung Bold Text steps it to (`DSIconWeight.boldText.number`).
    public init(systemName: String, box: CGFloat, pointSize: CGFloat, scale: Image.Scale, weight: Int, boldWeight: Int) {
        self.systemName = systemName
        self.box = box
        self.pointSize = pointSize
        self.scale = scale
        self.weight = weight
        self.boldWeight = boldWeight
    }

    public var body: some View {
        let rendered = DSSymbol.renderedWeight(weight, boldWeight: boldWeight, boldText: ds.policy.boldText)
        let fitted = DSSymbolFit.pointSize(systemName: systemName, pointSize: pointSize, weight: rendered, scale: scale)
        return Image(systemName: systemName)
            .font(.system(size: fitted, weight: DSTypography.systemWeight(rendered)))
            .imageScale(scale)
            // Prism has already applied Bold Text; SwiftUI would step the symbol a second time (ADR-0021 T8).
            .environment(\.legibilityWeight, .regular)
            .frame(width: box, height: box)
    }
}
