import SwiftUI
import DSTokens

// The three Prism environment values of ADR-0019 §5 and ADR-0022 §1, plus the two roots `DSTheme` owns.
//
// Scope follows the web contract exactly (ADR-0019 §1 item 4):
//   * `dsDensity` and `dsSurfaceContext` nest — the nearest ancestor-or-self wins, as `data-ds-density` and the
//     published material do on the web;
//   * `dsModality` and `dsBrand` are root-only — `DSTheme` writes them once per scene and a nested `DSTheme`
//     leaves them alone, as `<html>` and one brand per document do on the web. `dsModality(_:)` is the one way
//     past that: it writes `dsModalityOverride`, which the root theme prefers to the OS.
// `colorScheme`, `colorSchemeContrast`, `accessibilityReduceTransparency`, `accessibilityReduceMotion`,
// `legibilityWeight` and `dynamicTypeSize` stay SwiftUI's own values; DSCore reads them at the point tokens are
// read (`DSThemeValues`), so a nested `.environment(\.colorScheme, .dark)` scope resolves like a nested web scope.

private struct DSDensityKey: EnvironmentKey {
    static let defaultValue = DSTokenContext.platformDefault.density
}

private struct DSModalityKey: EnvironmentKey {
    static let defaultValue = DSTokenContext.platformDefault.modality
}

private struct DSBrandKey: EnvironmentKey {
    static let defaultValue = DSBrand.default
}

private struct DSSurfaceContextKey: EnvironmentKey {
    static let defaultValue = DSSurfaceContext.root
}

private struct DSAccessibilityOverridesKey: EnvironmentKey {
    static let defaultValue = DSAccessibilityOverrides.none
}

private struct DSThemeInstalledKey: EnvironmentKey {
    static let defaultValue = false
}

private struct DSModalityOverrideKey: EnvironmentKey {
    static let defaultValue: DSModality? = nil
}

extension EnvironmentValues {
    /// Density, the nestable axis (ADR-0019 §1 item 4, §5): spacing, control and row sizes, never typography
    /// (ADR-0021 §6). Starts at `DSTokenContext.platformDefault.density` and is set with `dsDensity(_:)`.
    public var dsDensity: DSDensity {
        get { self[DSDensityKey.self] }
        set { self[DSDensityKey.self] = newValue }
    }

    /// Input modality, a root value (ADR-0019 §1 item 4, §5): hit area, hover and tooltips. `DSTheme` sets it
    /// from the OS and, on iPadOS, from whether a pointing device is connected; a nested `DSTheme` does not
    /// change it. `dsModality(_:)` overrides it, above the theme as well as inside it, by writing
    /// `dsModalityOverride`, which the root theme reads before it asks the pointing-device monitor.
    public internal(set) var dsModality: DSModality {
        get { self[DSModalityKey.self] }
        set { self[DSModalityKey.self] = newValue }
    }

    /// A modality an app, a preview or a snapshot forced with `dsModality(_:)`. `DSTheme` honours it instead of
    /// the OS, so the override works above the theme, which is where a root axis is naturally set.
    internal var dsModalityOverride: DSModality? {
        get { self[DSModalityOverrideKey.self] }
        set { self[DSModalityOverrideKey.self] = newValue }
    }

    /// The brand of the scene (ADR-0020 §7), set once by `DSTheme(brand:)`.
    public internal(set) var dsBrand: DSBrand {
        get { self[DSBrandKey.self] }
        set { self[DSBrandKey.self] = newValue }
    }

    /// The material and backdrop kind the nearest publisher published (ADR-0022 §3.1, ADR-0029 §1.4). Text,
    /// charts and component parts read their foreground family from it; it nests, and the nearest publisher wins.
    ///
    /// Reading is public. Writing is `package` (ADR-0036 §8.4): in app code the two publishers are `DSSurfaceView`,
    /// which publishes the material it paints, and `dsBackdrop(_:_:)`, which publishes the page over media the app
    /// paints itself. Anything else could publish a material nothing paints, which the glass fallback never sees.
    public package(set) var dsSurfaceContext: DSSurfaceContext {
        get { self[DSSurfaceContextKey.self] }
        set { self[DSSurfaceContextKey.self] = newValue }
    }

    /// Forced accessibility preferences for previews and snapshots (ADR-0019 §5).
    public internal(set) var dsAccessibilityOverrides: DSAccessibilityOverrides {
        get { self[DSAccessibilityOverridesKey.self] }
        set { self[DSAccessibilityOverridesKey.self] = newValue }
    }

    /// True inside a `DSTheme`; a second, nested theme uses it to leave the root values alone.
    internal var dsThemeIsInstalled: Bool {
        get { self[DSThemeInstalledKey.self] }
        set { self[DSThemeInstalledKey.self] = newValue }
    }
}

extension View {
    /// Sets the density for this subtree (ADR-0019 §5: density nests).
    public func dsDensity(_ density: DSDensity) -> some View {
        environment(\.dsDensity, density)
    }

    /// Sets the input modality. Modality is a root axis (ADR-0019 §1 item 4): apply this above `DSTheme`, in a
    /// preview, a snapshot or an app that knows better than the OS, and the theme publishes it instead of what
    /// the OS reports. Applied inside a scene it overrides the theme for that subtree.
    ///
    /// It writes two values: the modality itself, for anything already reading it, and the override the root
    /// `DSTheme` consults before the pointing-device monitor — without which the theme would recompute modality
    /// from the OS and discard what it inherited.
    public func dsModality(_ modality: DSModality) -> some View {
        environment(\.dsModalityOverride, modality).environment(\.dsModality, modality)
    }

    /// Publishes a surface context to descendants: Prism's own writer, `package` since ADR-0036 §8.4. It is called by
    /// the two public publishers, `DSSurfaceView` (the context `DSSurface.resolve` produces) and `dsBackdrop(_:_:)`
    /// (the page over the declared kind), and by a Prism composite whose spec publishes a material it does not paint
    /// (ADR-0036 rule 9).
    package func dsSurfaceContext(_ context: DSSurfaceContext) -> some View {
        environment(\.dsSurfaceContext, context)
    }

    /// Forces accessibility preferences for this subtree (previews, snapshots). Fields left nil keep the value
    /// they inherit, so nested calls compose.
    public func dsAccessibilityPolicy(
        boldText: Bool? = nil,
        increasedContrast: Bool? = nil,
        reduceTransparency: Bool? = nil,
        reduceMotion: Bool? = nil,
        dynamicTypeSize: DynamicTypeSize? = nil
    ) -> some View {
        modifier(
            DSAccessibilityOverrideModifier(
                overrides: DSAccessibilityOverrides(
                    boldText: boldText,
                    increasedContrast: increasedContrast,
                    reduceTransparency: reduceTransparency,
                    reduceMotion: reduceMotion,
                    dynamicTypeSize: dynamicTypeSize
                )
            )
        )
    }
}

/// Merges its overrides into the inherited ones, so `dsAccessibilityPolicy` calls nest.
private struct DSAccessibilityOverrideModifier: ViewModifier {
    @Environment(\.dsAccessibilityOverrides) private var inherited
    let overrides: DSAccessibilityOverrides

    func body(content: Content) -> some View {
        content.environment(\.dsAccessibilityOverrides, inherited.merging(overrides))
    }
}
