import CoreText
import Foundation
import SwiftUI
import DSTokens

/// One type role, named by its `DSTokenSet.Typography` key path (ADR-0021 §4).
///
/// The key path is the whole identity: the generated table is the list of roles, so DSCore does not mirror it.
/// The only thing DSCore adds is which key paths are metric roles, because ADR-0021 §2's thin-weight floor asks
/// for it, and that is four names rather than twenty-two.
///
///     Text(verbatim: value).dsText(\.metricXl)
nonisolated public enum DSTextRoles: Sendable {
    /// The roles a weight below 300 may render on (ADR-0021 §2). A computed list, because a key path is not
    /// `Sendable` and so cannot be a stored global.
    public static var metric: [KeyPath<DSTokenSet.Typography, DSTypeRole>] {
        [\.metricXl, \.metricLg, \.metricMd, \.metricUnit]
    }

    public static func isMetric(_ role: KeyPath<DSTokenSet.Typography, DSTypeRole>) -> Bool {
        metric.contains(role)
    }
}

/// The ascent and descent of a resolved face, as fractions of the size (ADR-0021 §8: A and D "come from the
/// resolved face at runtime"). They do not depend on the size, so one lookup per face serves every size.
@MainActor
public enum DSFontMetrics {
    /// Onest: 0.97 and 0.305 (ADR-0021 T1). A face Core Text cannot produce falls back to these.
    public static let fallback = (ascent: 0.97, descent: 0.305)

    private static var cache: [String: (ascent: Double, descent: Double)] = [:]
    private static let probeSize: CGFloat = 100

    /// The metrics of the bundled face with this PostScript name, or of the system face when it is nil.
    public static func metrics(postScriptName: String?) -> (ascent: Double, descent: Double) {
        let key = postScriptName ?? "" // the system face
        if let cached = cache[key] { return cached }
        let font = postScriptName.map { CTFontCreateWithName($0 as CFString, probeSize, nil) }
            ?? CTFontCreateUIFontForLanguage(.system, probeSize, nil)
        let ascent = font.map { CTFontGetAscent($0) / probeSize } ?? 0
        let descent = font.map { CTFontGetDescent($0) / probeSize } ?? 0
        let resolved = ascent > 0 && descent > 0 ? (ascent: Double(ascent), descent: Double(descent)) : fallback
        cache[key] = resolved
        return resolved
    }

    /// Empties the cache; tests use it, nothing in a running app needs to.
    public static func reset() { cache.removeAll() }
}

/// The rendering rules of ADR-0021 §8 and §9, as pure functions so the whole table runs on the host.
nonisolated public enum DSTypography: Sendable {
    /// SwiftUI's weight for a token weight (ADR-0021 §9 item 3, the Native preset's ladder).
    public static func systemWeight(_ weight: Int) -> Font.Weight {
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

    /// The first-baseline correction of ADR-0021 §8: `Δ = size × (1 − lineHeight / 2 − (A − D) / 2)`.
    ///
    /// SwiftUI puts the first baseline 1.0 × the size below the top of the line; CSS puts it at
    /// `(lineHeight − (A + D)) / 2 + A`. DSCore raises the text by the difference without changing the line box.
    public static func baselineShift(
        size: CGFloat,
        lineHeight: Double,
        ascent: Double,
        descent: Double
    ) -> CGFloat {
        size * CGFloat(1 - lineHeight / 2 - (ascent - descent) / 2)
    }

    /// Tracking in points: the role's em fraction times the scaled size (ADR-0021 §9 item 5, §6).
    public static func tracking(trackingEm: Double, size: CGFloat) -> CGFloat {
        size * CGFloat(trackingEm)
    }

    /// The role `dsText(_:figures:)` renders: the token role, with its figures replaced when the caller overrides
    /// them (ADR-0021 §5). Every other field — size, weight, Bold Text weight, line height, tracking, text style
    /// and slot — stays the role's own, and `nil` or the figures the role already carries return it untouched.
    ///
    /// The metric identity the thin floor of ADR-0021 §2 reads is the role's key path, which the route keeps
    /// beside this value, so a `metric-xl` set to `tabular` renders at the weight `metric-xl` renders at.
    public static func role(_ role: DSTypeRole, figures: DSNumericSpacing?) -> DSTypeRole {
        guard let figures, figures != role.numeric else { return role }
        return DSTypeRole(
            slot: role.slot,
            size: role.size,
            weight: role.weight,
            boldWeight: role.boldWeight,
            lineHeight: role.lineHeight,
            trackingEm: role.trackingEm,
            numeric: figures,
            textStyle: role.textStyle
        )
    }
}

extension View {
    /// Renders this text through ADR-0021 §9's single route: the Dynamic-Type-scaled role size, the weight §4
    /// chooses (Bold Text included, exactly once), the brand's face for the role's slot, tabular figures where
    /// the role asks for them, tracking, the CSS line height and §8's first-baseline correction.
    ///
    /// Both presets take the same route: `Font.custom(_:fixedSize:)` for a bundled face, `Font.system` for a
    /// system one, over a size `@ScaledMetric(relativeTo: role.textStyle)` has already scaled. `Font.system(size:)`
    /// does not scale by itself (ADR-0021 T6), and tracking and the baseline shift need the scaled size anyway.
    ///
    /// `figures` overrides the figures the role carries, for the callers ADR-0021 §5 names — "a `metric.xl` set to
    /// `numeric: tabular`", a counter that must not jitter while it updates. It changes the figures and nothing
    /// else: the role key path is still the role's own, so the metric identity ADR-0021 §2's thin floor reads
    /// travels with it and an override never moves the weight.
    ///
    ///     Text(verbatim: "12,9").dsText(\.metricXl)
    ///     Text(verbatim: "12,9").dsText(\.metricXl, figures: .tabular)
    public func dsText(
        _ role: KeyPath<DSTokenSet.Typography, DSTypeRole>,
        figures: DSNumericSpacing? = nil
    ) -> some View {
        modifier(DSTextModifier(role: role, figures: figures))
    }
}

/// Resolves the role in the context this view renders in, then hands it to the scaled modifier, whose
/// `@ScaledMetric` is built from the resolved role's own size and text style.
private struct DSTextModifier: ViewModifier {
    let role: KeyPath<DSTokenSet.Typography, DSTypeRole>
    let figures: DSNumericSpacing?
    private var ds = DSThemeValues()

    init(role: KeyPath<DSTokenSet.Typography, DSTypeRole>, figures: DSNumericSpacing?) {
        self.role = role
        self.figures = figures
    }

    func body(content: Content) -> some View {
        let resolved = DSTypography.role(ds.tokens.typography[keyPath: role], figures: figures)
        return content.modifier(
            DSScaledTextModifier(
                role: resolved,
                // The identity is the key path, not the value: a figures override keeps the metric floor.
                isMetricRole: DSTextRoles.isMetric(role),
                face: ds.brand.faces[resolved.slot],
                policy: ds.policy
            )
        )
    }
}

/// The seven items of ADR-0021 §9, in order.
private struct DSScaledTextModifier: ViewModifier {
    @ScaledMetric private var size: CGFloat
    private let role: DSTypeRole
    private let isMetricRole: Bool
    private let face: DSFontFace?
    private let policy: DSAccessibilityPolicy

    init(role: DSTypeRole, isMetricRole: Bool, face: DSFontFace?, policy: DSAccessibilityPolicy) {
        self.role = role
        self.isMetricRole = isMetricRole
        self.face = face
        self.policy = policy
        // Item 1: the role's size, scaled by the role's Dynamic Type style.
        _size = ScaledMetric(wrappedValue: role.size, relativeTo: role.textStyle.fontTextStyle)
    }

    /// Item 2: the weight §4 chooses, floored for the size it renders at (ADR-0021 §2).
    private var weight: Int {
        policy.renderedWeight(for: role, atSize: size, isMetricRole: isMetricRole)
    }

    /// Items 3 and 4: the face for the slot, and tabular figures when the role asks for them.
    private var font: Font {
        let base: Font
        if let name = face?.postScriptName(for: weight) {
            base = .custom(name, fixedSize: size)
        } else {
            base = .system(size: size, weight: DSTypography.systemWeight(weight), design: face?.system?.fontDesign ?? .default)
        }
        return role.numeric == .tabular ? base.monospacedDigit() : base
    }

    /// Item 6's second half: §8's first-baseline correction, from the resolved face's own ascent and descent.
    private var baselineShift: CGFloat {
        let metrics = DSFontMetrics.metrics(postScriptName: face?.postScriptName(for: weight))
        return DSTypography.baselineShift(size: size, lineHeight: role.lineHeight, ascent: metrics.ascent, descent: metrics.descent)
    }

    func body(content: Content) -> some View {
        let shift = baselineShift
        return content
            .font(font)
            .tracking(DSTypography.tracking(trackingEm: role.trackingEm, size: size))
            .lineHeight(.multiple(factor: role.lineHeight))
            .offset(y: -shift)
            .alignmentGuide(.firstTextBaseline) { $0[.firstTextBaseline] - shift }
            .alignmentGuide(.lastTextBaseline) { $0[.lastTextBaseline] - shift }
            // Item 7: Prism has already applied Bold Text, and SwiftUI would step a system face a second
            // time (ADR-0021 T8).
            .environment(\.legibilityWeight, .regular)
    }
}

#Preview("Native preset renders system fonts") {
    DSTheme(brand: .prismNative) {
        VStack(alignment: .leading, spacing: 12) {
            Text(verbatim: "Prism").dsText(\.displayLg)
            Text(verbatim: "12,9").dsText(\.metricXl)
            Text(verbatim: "The quick brown fox").dsText(\.bodyMd)
            Text(verbatim: "CAPTION").dsText(\.eyebrow)
        }
        .padding()
    }
}

#Preview("Signature preset renders the brand faces") {
    DSTheme(brand: .prism) {
        VStack(alignment: .leading, spacing: 12) {
            Text(verbatim: "Prism").dsText(\.displayLg)
            Text(verbatim: "12,9").dsText(\.metricXl)
            Text(verbatim: "The quick brown fox").dsText(\.bodyMd)
            Text(verbatim: "CAPTION").dsText(\.eyebrow)
        }
        .padding()
    }
}
