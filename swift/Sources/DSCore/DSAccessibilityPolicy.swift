import SwiftUI
import DSTokens

/// The contrast tier a piece of text must meet (ADR-0011, "Contrast tiers"). `tools/contrast` checks the token
/// pairs against these numbers; the tier is here so that components and their tests name one rule.
nonisolated public enum DSTextContrastTier: String, CaseIterable, Hashable, Sendable {
    /// Body, labels, values, control text, axis labels: every size below the large threshold.
    case functional
    /// Large functional text, and the decorative or dimmed tones, which exist only at the large threshold.
    case large

    /// The minimum contrast ratio of the tier (ADR-0011).
    public var minimumRatio: Double { self == .functional ? 4.5 : 3 }
}

/// The accessibility state Prism resolves once per scene and every component reads from (ADR-0011, ADR-0019 §5,
/// ADR-0021 §3 and §4, ADR-0023 §8.5). `DSTheme` builds it from the SwiftUI environment; previews and snapshot
/// tests force any field through `DSAccessibilityOverrides`.
///
/// It is the single place that turns an OS preference into a Prism decision: the three axis fields feed
/// `DSTokenContext`, `boldText` selects `DSTypeRole.boldWeight`, and `dynamicTypeSize` carries the reader's text
/// size to the rules that clamp on it.
nonisolated public struct DSAccessibilityPolicy: Hashable, Sendable {
    /// `legibilityWeight == .bold` on iOS, iPadOS and watchOS; macOS and the web have no such setting (ADR-0021 §3).
    public var boldText: Bool
    /// `colorSchemeContrast == .increased`.
    public var increasedContrast: Bool
    /// `accessibilityReduceTransparency`.
    public var reduceTransparency: Bool
    /// `accessibilityReduceMotion`.
    public var reduceMotion: Bool
    /// `dynamicTypeSize`; the reader's text size, which scales type roles and clamps the spec's largest ones.
    public var dynamicTypeSize: DynamicTypeSize

    public init(
        boldText: Bool = false,
        increasedContrast: Bool = false,
        reduceTransparency: Bool = false,
        reduceMotion: Bool = false,
        dynamicTypeSize: DynamicTypeSize = .large
    ) {
        self.boldText = boldText
        self.increasedContrast = increasedContrast
        self.reduceTransparency = reduceTransparency
        self.reduceMotion = reduceMotion
        self.dynamicTypeSize = dynamicTypeSize
    }

    // MARK: - Token-context axes (ADR-0019 §5)

    public var contrast: DSContrast { increasedContrast ? .increased : .standard }

    public var transparency: DSTransparency { reduceTransparency ? .reduced : .standard }

    /// ADR-0023 §8.5: `DSTokenContext.motion` is `.reduced` while this policy asks for it.
    public var motion: DSMotionMode { reduceMotion ? .reduced : .standard }

    /// True at the accessibility Dynamic Type sizes, where a spec may clamp or reflow (ADR-0011).
    public var isAccessibilitySize: Bool { dynamicTypeSize.isAccessibilitySize }

    // MARK: - Weight mapping (ADR-0021 §3)

    /// The floor every weight clears under Increase Contrast: `max(400, s)`. The token layer already applies it
    /// (the `*-increased-contrast` contexts carry the floored `DSTypeRole.weight`); this is the same rule, so a
    /// test can check the generated roles against it.
    public static func increasedContrastWeight(_ standard: Int) -> Int { max(regularWeight, standard) }

    /// Bold Text: `s <= 300 ? 400 : min(900, s + 200)`, computed from the standard weight and never from the
    /// Increase Contrast result. It is `DSTypeRole.boldWeight` in the generated tokens.
    public static func boldTextWeight(_ standard: Int) -> Int {
        standard <= lightWeight ? regularWeight : min(heaviestWeight, standard + boldTextStep)
    }

    /// The weight a role renders at: `boldWeight` under Bold Text, otherwise the context's own weight, which
    /// already carries the dark weight and the Increase Contrast floor (ADR-0021 §4, "Runtimes").
    public func weight(for role: DSTypeRole) -> Int { boldText ? role.boldWeight : role.weight }

    // MARK: - Thin and light floors (ADR-0021 §2, ADR-0011 rule 2)

    /// Thin weights (100, 200) render only on a metric role of at least this size, in the dark scheme.
    public static let thinWeightMinimumSize: CGFloat = 34
    /// Light (300) renders only from this size up.
    public static let lightWeightMinimumSize: CGFloat = 20
    /// Text at or above this size may use the large tier, and is the only place the dimmed tone is allowed.
    public static let largeTextMinimumSize: CGFloat = 24
    /// A bold face reaches the large tier from this size (ADR-0011: "≥ 24 px regular or ≥ 19 px bold").
    public static let largeBoldTextMinimumSize: CGFloat = 19

    private static let thinnestWeight = 100
    private static let lightWeight = 300
    private static let regularWeight = 400
    private static let boldFaceWeight = 700
    private static let heaviestWeight = 900
    private static let boldTextStep = 200

    /// The lowest weight a role may render at the given size (ADR-0021 §2): thin needs a metric role at
    /// `thinWeightMinimumSize`, light needs `lightWeightMinimumSize`, and everything else floors at 400.
    ///
    /// The build already proves that no permutation breaks this (`type/thin-weight`, `type/light-weight`), so
    /// this is a runtime backstop for a spec that renders a role at a size other than its token size.
    public static func weightFloor(atSize size: CGFloat, isMetricRole: Bool) -> Int {
        if size >= thinWeightMinimumSize, isMetricRole { return thinnestWeight }
        if size >= lightWeightMinimumSize { return lightWeight }
        return regularWeight
    }

    /// The weight DSCore renders: the mapped weight of `weight(for:)`, never below the floor for the size it is
    /// rendered at.
    public func renderedWeight(for role: DSTypeRole, atSize size: CGFloat, isMetricRole: Bool) -> Int {
        max(Self.weightFloor(atSize: size, isMetricRole: isMetricRole), weight(for: role))
    }

    // MARK: - Contrast tiers (ADR-0011)

    /// The tier text of this size and weight is checked at.
    public static func tier(forSize size: CGFloat, weight: Int) -> DSTextContrastTier {
        if size >= largeTextMinimumSize { return .large }
        if weight >= boldFaceWeight, size >= largeBoldTextMinimumSize { return .large }
        return .functional
    }

    /// Whether the dimmed tone (hero decimals, hung units) is permitted at this size. Below it, "tertiary" and
    /// "dimmed" are functional text and take the secondary tone (ADR-0011, `Text.yaml` behavior).
    public static func allowsDimmedTone(atSize size: CGFloat) -> Bool { size >= largeTextMinimumSize }

    /// The tone a role actually renders: `dimmed` falls back to `secondary` below the large threshold.
    public static func tone(_ tone: DSTextTone, atSize size: CGFloat) -> DSTextTone {
        tone == .dimmed && !allowsDimmedTone(atSize: size) ? .secondary : tone
    }
}

/// Forced preferences for previews and snapshot tests (ADR-0019 §5, ADR-0021 §4, ADR-0023 §8.5). A nil field
/// follows the SwiftUI environment; a set field wins. Nested modifiers merge, so a snapshot can force Bold Text
/// inside a scope that already forces Increase Contrast.
nonisolated public struct DSAccessibilityOverrides: Hashable, Sendable {
    public var boldText: Bool?
    public var increasedContrast: Bool?
    public var reduceTransparency: Bool?
    public var reduceMotion: Bool?
    public var dynamicTypeSize: DynamicTypeSize?

    public init(
        boldText: Bool? = nil,
        increasedContrast: Bool? = nil,
        reduceTransparency: Bool? = nil,
        reduceMotion: Bool? = nil,
        dynamicTypeSize: DynamicTypeSize? = nil
    ) {
        self.boldText = boldText
        self.increasedContrast = increasedContrast
        self.reduceTransparency = reduceTransparency
        self.reduceMotion = reduceMotion
        self.dynamicTypeSize = dynamicTypeSize
    }

    public static let none = DSAccessibilityOverrides()

    /// `other` over `self`: every field `other` sets replaces this one's.
    public func merging(_ other: DSAccessibilityOverrides) -> DSAccessibilityOverrides {
        DSAccessibilityOverrides(
            boldText: other.boldText ?? boldText,
            increasedContrast: other.increasedContrast ?? increasedContrast,
            reduceTransparency: other.reduceTransparency ?? reduceTransparency,
            reduceMotion: other.reduceMotion ?? reduceMotion,
            dynamicTypeSize: other.dynamicTypeSize ?? dynamicTypeSize
        )
    }

    /// The policy this override produces over the environment values DSCore reads (ADR-0019 §5).
    public func policy(
        legibilityWeight: LegibilityWeight?,
        colorSchemeContrast: ColorSchemeContrast,
        reduceTransparency environmentTransparency: Bool,
        reduceMotion environmentMotion: Bool,
        dynamicTypeSize environmentTypeSize: DynamicTypeSize
    ) -> DSAccessibilityPolicy {
        DSAccessibilityPolicy(
            boldText: boldText ?? (legibilityWeight == .bold),
            increasedContrast: increasedContrast ?? (colorSchemeContrast == .increased),
            reduceTransparency: reduceTransparency ?? environmentTransparency,
            reduceMotion: reduceMotion ?? environmentMotion,
            dynamicTypeSize: dynamicTypeSize ?? environmentTypeSize
        )
    }
}
