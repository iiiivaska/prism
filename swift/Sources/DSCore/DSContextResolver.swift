import SwiftUI
import DSTokens

/// The pure rules that turn the platform default, the SwiftUI environment and Prism's own two axes into a
/// `DSTokenContext` (ADR-0019 §5). Every input is a parameter, so the whole table runs on the host.
///
/// | Context field | Source | Scope |
/// |---|---|---|
/// | `brand` | `DSTheme(brand:)` | root (ADR-0020 §7) |
/// | `colorScheme` | `\.colorScheme`, fixed to dark on watchOS | nests through SwiftUI's own environment |
/// | `contrast` | `\.colorSchemeContrast` through `DSAccessibilityPolicy` | root |
/// | `transparency` | `\.accessibilityReduceTransparency` through the policy | root |
/// | `motion` | `\.accessibilityReduceMotion` through the policy | root |
/// | `density` | `\.dsDensity`, default `platformDefault.density` | nests |
/// | `modality` | `\.dsModality`, set by `DSTheme` | root |
nonisolated public enum DSContextResolver: Sendable {
    /// The context tokens resolve in at one point of the view tree.
    ///
    /// `base` is where DSCore starts on this OS (`DSTokenContext.platformDefault`, ADR-0019 §2). Density and
    /// modality arrive already resolved from the environment, so nesting is SwiftUI's; the platform default only
    /// supplies the values nothing has overridden.
    public static func context(
        base: DSTokenContext = .platformDefault,
        brand: DSBrand,
        colorScheme: ColorScheme,
        policy: DSAccessibilityPolicy,
        density: DSDensity,
        modality: DSModality,
        fixesColorSchemeToDark: Bool = DSPlatform.fixesColorSchemeToDark
    ) -> DSTokenContext {
        var context = base
        context.brand = brand
        context.colorScheme = fixesColorSchemeToDark ? .dark : (colorScheme == .dark ? .dark : .light)
        context.contrast = policy.contrast
        context.transparency = policy.transparency
        context.motion = policy.motion
        context.density = density
        context.modality = modality
        return context
    }

    /// The modality a scene root publishes (ADR-0019 §2): an explicit override, else the platform default, and
    /// `pointer` on the platforms that report a pointing device while one is connected.
    ///
    /// The override is what `dsModality(_:)` writes above a `DSTheme`. Without it a root theme would always
    /// recompute from the OS, and no preview, snapshot or app could force a modality — on macOS not even by
    /// handing in a `DSPointingDevice`, since the base there is already `pointer`.
    public static func modality(
        base: DSModality = DSTokenContext.platformDefault.modality,
        pointingDeviceConnected: Bool,
        detectsPointingDevice: Bool,
        override: DSModality? = nil
    ) -> DSModality {
        if let override { return override }
        guard detectsPointingDevice else { return base }
        return pointingDeviceConnected ? .pointer : base
    }

    /// The brand a `DSTheme` publishes, and whether the nesting is the programming error ADR-0020 §7 names.
    /// Brand is root-only: a nested theme keeps the scene's brand, and `DSTheme` asserts on the conflict in
    /// debug builds. Returning the decision instead of trapping keeps the rule testable.
    public static func brand(
        requested: DSBrand,
        inherited: DSBrand,
        isNested: Bool
    ) -> (brand: DSBrand, conflict: Bool) {
        guard isNested else { return (requested, false) }
        return (inherited, requested != inherited)
    }
}

/// The token values at one point of the view tree, derived from the environment wherever tokens are read, so that
/// nested color-scheme and density scopes resolve as they do on the web (ADR-0019 §5, "Nested scopes").
///
/// P3-3's components hold one: `private var ds = DSThemeValues()`, then `ds.tokens.color.textPrimary`.
@MainActor
public struct DSThemeValues: DynamicProperty {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var colorSchemeContrast
    @Environment(\.accessibilityReduceTransparency) private var environmentReduceTransparency
    @Environment(\.accessibilityReduceMotion) private var environmentReduceMotion
    @Environment(\.legibilityWeight) private var legibilityWeight
    @Environment(\.dynamicTypeSize) private var environmentDynamicTypeSize
    @Environment(\.dsDensity) private var density
    @Environment(\.dsModality) private var modality
    @Environment(\.dsBrand) private var themeBrand
    @Environment(\.dsSurfaceContext) private var surfaceContext
    @Environment(\.dsAccessibilityOverrides) private var overrides

    public init() {}

    /// The scene's brand (ADR-0020 §7). Components read colors through `tokens`; the text route needs the brand
    /// itself, for `DSBrand.faces` (ADR-0021 §9).
    public var brand: DSBrand { themeBrand }

    /// The resolved preferences, with any forced by `dsAccessibilityPolicy(…)` applied (ADR-0019 §5).
    public var policy: DSAccessibilityPolicy {
        overrides.policy(
            legibilityWeight: legibilityWeight,
            colorSchemeContrast: colorSchemeContrast,
            reduceTransparency: environmentReduceTransparency,
            reduceMotion: environmentReduceMotion,
            dynamicTypeSize: environmentDynamicTypeSize
        )
    }

    /// The context these tokens resolve in.
    public var context: DSTokenContext {
        DSContextResolver.context(
            brand: brand,
            colorScheme: colorScheme,
            policy: policy,
            density: density,
            modality: modality
        )
    }

    /// Every token value for `context`, from the shared cache.
    public var tokens: DSTokenSet { DSTokenStore.tokens(for: context) }

    /// What the enclosing Surface published (ADR-0022 §3.1, ADR-0029 §1.4).
    public var surface: DSSurfaceContext { surfaceContext }

    /// The motion values and the Reduce Motion substitutions of ADR-0023 §8.4.
    public var motion: DSMotion { DSMotion(tokens.motion) }
}

/// One `DSTokenSet` per context (ARCHITECTURE §9.7.4: "DSCore caches one per context"). Building a set walks
/// every category table, and a view tree asks for the same handful of contexts over and over.
@MainActor
public enum DSTokenStore {
    private static var cache: [DSTokenContext: DSTokenSet] = [:]

    public static func tokens(for context: DSTokenContext) -> DSTokenSet {
        if let cached = cache[context] { return cached }
        let set = DSTokenSet(context)
        cache[context] = set
        return set
    }

    /// Empties the cache. Tests and previews use it; nothing in a running app needs to.
    public static func reset() { cache.removeAll() }
}
