import DSTokens

/// `DSCore` is the theme layer: it turns the OS state into Prism's token context and owns the four decisions no
/// component may take for itself.
///
///  * `DSTheme` sets the brand once per scene, registers its fonts and publishes the root modality;
///    `DSThemeValues` derives `DSTokenContext` and `DSTokenSet` wherever tokens are read (ADR-0019 §5,
///    ADR-0020 §7).
///  * `DSAccessibilityPolicy` is the one place an OS preference becomes a Prism decision, and the one place a
///    preview or a snapshot can force one (ADR-0011, ADR-0021 §3, ADR-0023 §8.5).
///  * `DSSurface` resolves materials, including the single glass fallback, and publishes the material and
///    backdrop kind that text tones read (ADR-0022, ADR-0029, ADR-0030). `DSGradient` draws a vivid gradient on
///    the CSS gradient line, interpolated in OKLab, `DSBlur` turns a CSS blur into a SwiftUI radius, and
///    `DSGrain` is the tile both stacks generate (ADR-0022 §4.1, ADR-0030 §4.3, §4.4).
///  * `dsText(_:)` is the one route text renders through: the scaled role size, the weight Bold Text chooses,
///    the brand's face, figures, tracking, the CSS line height and the first-baseline correction (ADR-0021 §8,
///    §9).
///  * `DSMotion` and `DSHaptics` carry the motion values and the semantic haptics registry (ADR-0023).
///
/// DSCore is therefore the only Prism target that names `accessibilityReduceTransparency`, `colorSchemeContrast`,
/// `accessibilityReduceMotion`, `legibilityWeight` or a font construction, and `lint:literals` keeps it that way.
public enum DSCoreInfo {
    public static let version = DSTokensInfo.version
}
