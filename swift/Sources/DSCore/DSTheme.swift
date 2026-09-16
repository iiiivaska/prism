import SwiftUI
import DSTokens

/// The root of a Prism scene (ADR-0019 §5, ADR-0020 §7, ADR-0021 §9).
///
/// It does three things and nothing else:
///  1. **Sets the brand once per scene.** `DSTokenContext.brand` is root-only, as one brand per document is on the
///     web. A nested `DSTheme` with another brand is a programming error: it keeps the scene's brand and trips a
///     debug assertion (`DSContextResolver.brand(requested:inherited:isNested:)` is the rule, so it is testable).
///  2. **Registers the brand's fonts** synchronously, from `init`, before the first render, once per process
///     (ADR-0021 §9, critic R-04).
///  3. **Publishes the root axis, modality.** The OS decides it, and on iPadOS a connected pointing device
///     switches it to `pointer` while it is attached. A `dsModality(_:)` above the theme wins over the OS, for
///     previews, snapshots and an app that knows better. A nested `DSTheme` leaves the value alone.
///
/// Everything else is derived where tokens are read (`DSThemeValues`), so a nested `.environment(\.colorScheme,
/// .dark)` or `.dsDensity(_:)` scope resolves exactly like a nested scope on the web. Density is not a theme
/// input for the same reason.
///
///     DSTheme {
///         ContentView()
///     }
public struct DSTheme<Content: View>: View {
    private let requestedBrand: DSBrand
    private let pointingDevice: DSPointingDevice
    private let content: Content

    @Environment(\.dsBrand) private var inheritedBrand
    @Environment(\.dsModality) private var inheritedModality
    @Environment(\.dsModalityOverride) private var modalityOverride
    @Environment(\.dsThemeIsInstalled) private var isNested

    /// - Parameters:
    ///   - brand: the scene's brand; root-only (ADR-0020 §7).
    ///   - pointingDevice: the modality input. The default monitor watches the OS; previews and tests hand in
    ///     their own, which is authoritative wherever it is used.
    public init(
        brand: DSBrand = .default,
        pointingDevice: DSPointingDevice = .shared,
        @ViewBuilder content: () -> Content
    ) {
        requestedBrand = brand
        self.pointingDevice = pointingDevice
        self.content = content()
        DSFontRegistrar.register(brand)
    }

    public var body: some View {
        let resolved = DSContextResolver.brand(requested: requestedBrand, inherited: inheritedBrand, isNested: isNested)
        assert(
            !resolved.conflict,
            "DSTheme sets the brand once per scene (ADR-0020 §7). A nested DSTheme may not change it; this one keeps \(resolved.brand)."
        )
        return content
            .environment(\.dsBrand, resolved.brand)
            .environment(\.dsModality, resolvedModality)
            .environment(\.dsThemeIsInstalled, true)
    }

    /// Modality is a root axis (ADR-0019 §1 item 4): only the outermost theme decides it, and only when nothing
    /// above it has forced one with `dsModality(_:)`. Previews, snapshots and an app that detects its own
    /// pointing device need that override, and the OS cannot supply `touch` on macOS at all.
    private var resolvedModality: DSModality {
        guard !isNested else { return inheritedModality }
        return DSContextResolver.modality(
            pointingDeviceConnected: pointingDevice.isConnected,
            detectsPointingDevice: pointingDevice.detectsPointingDevice,
            override: modalityOverride
        )
    }
}
