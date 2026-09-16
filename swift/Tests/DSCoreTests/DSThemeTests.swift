import SwiftUI
import Testing
import DSTokens
@testable import DSCore

#if os(iOS)
import UIKit
#endif

/// ADR-0019 §5 and rule 12 (the mapping and the two scopes), ADR-0020 §7 (brand is root-only) and ADR-0019 §2
/// (the per-platform defaults and the iPadOS pointer switch).
///
/// `GeneratedTokenTests` asserts `platformDefault` itself per OS; these tests assert what DSCore does with it.
@Suite("Theme, context and the two Prism axes (ADR-0019 §5)")
struct DSThemeTests {
    // MARK: - The environment mapping

    @Test func theEnvironmentMapsOntoTheContext() {
        let policy = DSAccessibilityPolicy(
            boldText: true, increasedContrast: true, reduceTransparency: true, reduceMotion: true
        )
        let context = DSContextResolver.context(
            brand: .prismNative,
            colorScheme: .dark,
            policy: policy,
            density: .comfortable,
            modality: .touch,
            fixesColorSchemeToDark: false
        )
        #expect(context.brand == .prismNative)
        #expect(context.colorScheme == .dark)
        #expect(context.contrast == .increased)
        #expect(context.transparency == .reduced)
        #expect(context.motion == .reduced)
        #expect(context.density == .comfortable)
        #expect(context.modality == .touch)
    }

    @Test func itStartsFromThePlatformDefault() {
        let context = DSContextResolver.context(
            brand: .prism,
            colorScheme: DSPlatform.fixesColorSchemeToDark ? .dark : .light,
            policy: DSAccessibilityPolicy(),
            density: DSTokenContext.platformDefault.density,
            modality: DSTokenContext.platformDefault.modality
        )
        #expect(context == DSTokenContext(
            brand: .prism,
            colorScheme: DSPlatform.fixesColorSchemeToDark ? .dark : .light,
            density: DSTokenContext.platformDefault.density,
            modality: DSTokenContext.platformDefault.modality
        ))
        #expect(context.density == DSTokenContext.platformDefault.density)
        #expect(context.modality == DSTokenContext.platformDefault.modality)
    }

    /// ADR-0019 §5: on watchOS the scheme is fixed to dark, whatever the environment says.
    @Test func watchOSFixesTheSchemeToDark() {
        for scheme in [ColorScheme.light, .dark] {
            let watch = DSContextResolver.context(
                brand: .prism, colorScheme: scheme, policy: DSAccessibilityPolicy(),
                density: .watch, modality: .touch, fixesColorSchemeToDark: true
            )
            #expect(watch.colorScheme == .dark)
        }
        let phone = DSContextResolver.context(
            brand: .prism, colorScheme: .light, policy: DSAccessibilityPolicy(),
            density: .regular, modality: .touch, fixesColorSchemeToDark: false
        )
        #expect(phone.colorScheme == .light)
    }

    @Test func thePolicyForcesThePreferences() {
        let forced = DSAccessibilityOverrides(increasedContrast: true, reduceTransparency: true).policy(
            legibilityWeight: nil, colorSchemeContrast: .standard,
            reduceTransparency: false, reduceMotion: false, dynamicTypeSize: .large
        )
        let context = DSContextResolver.context(
            brand: .prism, colorScheme: .light, policy: forced,
            density: .compact, modality: .pointer, fixesColorSchemeToDark: false
        )
        #expect(context.contrast == .increased)
        #expect(context.transparency == .reduced)
    }

    // MARK: - Modality, the root axis with a runtime input

    @Test func modalityFollowsAConnectedPointingDevice() {
        // iPadOS: touch by default, pointer while a mouse or trackpad is attached.
        #expect(DSContextResolver.modality(base: .touch, pointingDeviceConnected: false, detectsPointingDevice: true) == .touch)
        #expect(DSContextResolver.modality(base: .touch, pointingDeviceConnected: true, detectsPointingDevice: true) == .pointer)
        // Where the platform reports nothing, the default stands ("iPad stays touch" if the mechanism fails).
        #expect(DSContextResolver.modality(base: .touch, pointingDeviceConnected: true, detectsPointingDevice: false) == .touch)
        #expect(DSContextResolver.modality(base: .pointer, pointingDeviceConnected: false, detectsPointingDevice: false) == .pointer)
    }

    /// `dsModality(_:)` above a `DSTheme` wins over the OS. Without this the root would always recompute from
    /// the pointing-device monitor and silently discard the override, which is the usage both doc comments
    /// prescribe for previews, snapshots and an app that knows better — and on macOS there is no other way to
    /// force `touch` at all, because the base there is already `pointer`.
    @Test func anOverrideAboveTheThemeWins() {
        #expect(
            DSContextResolver.modality(base: .pointer, pointingDeviceConnected: false, detectsPointingDevice: true, override: .touch) == .touch
        )
        #expect(
            DSContextResolver.modality(base: .touch, pointingDeviceConnected: true, detectsPointingDevice: true, override: .touch) == .touch
        )
        #expect(
            DSContextResolver.modality(base: .touch, pointingDeviceConnected: false, detectsPointingDevice: true, override: .pointer) == .pointer
        )
        #expect(
            DSContextResolver.modality(base: .pointer, pointingDeviceConnected: false, detectsPointingDevice: false, override: nil) == .pointer,
            "no override leaves the OS rule alone"
        )

        // Through a real view tree, above and inside the theme, which is what P3-3 and P3-5 snapshots need.
        let probe = DSContextProbe()
        render(
            DSTheme(brand: .prism, pointingDevice: DSPointingDevice(isConnected: false)) {
                VStack {
                    DSContextReader(id: "root", probe: probe)
                    VStack { DSContextReader(id: "inside", probe: probe) }
                        .dsModality(.pointer)
                }
            }
            .dsModality(.touch)
        )
        #expect(probe.contexts["root"]?.modality == .touch, "an override above DSTheme reaches the scene")
        #expect(probe.contexts["inside"]?.modality == .pointer, "and one inside it overrides that subtree")

        let unforced = DSContextProbe()
        render(
            DSTheme(brand: .prism, pointingDevice: DSPointingDevice(isConnected: false)) {
                DSContextReader(id: "root", probe: unforced)
            }
        )
        #expect(unforced.contexts["root"]?.modality == DSTokenContext.platformDefault.modality, "and without one the OS decides")
    }

    @Test func theMonitorIsTheSeamThatMakesDetectionTestable() {
        let monitor = DSPointingDevice()
        #expect(!monitor.isConnected)
        #expect(monitor.detectsPointingDevice, "a monitor an app or a test constructs is authoritative")
        monitor.setConnected(true)
        #expect(monitor.isConnected)
        monitor.setConnected(false)
        #expect(!monitor.isConnected)

        // The shared monitor only counts where the platform reports pointing devices (iPadOS).
        #expect(DSPointingDevice.shared.detectsPointingDevice == DSPointingDevice.platformDetectsPointingDevice)
        #if os(iOS)
        #expect(DSPointingDevice.platformDetectsPointingDevice == (UIDevice.current.userInterfaceIdiom == .pad))
        #else
        #expect(!DSPointingDevice.platformDetectsPointingDevice)
        #endif
    }

    // MARK: - Brand, the root axis without one (ADR-0020 §7)

    @Test func theBrandIsSetOncePerScene() {
        let root = DSContextResolver.brand(requested: .prismNative, inherited: .prism, isNested: false)
        #expect(root.brand == .prismNative)
        #expect(!root.conflict)

        let nestedSame = DSContextResolver.brand(requested: .prism, inherited: .prism, isNested: true)
        #expect(nestedSame.brand == .prism)
        #expect(!nestedSame.conflict, "a nested theme with the same brand is not an error")

        let nestedOther = DSContextResolver.brand(requested: .prismNative, inherited: .prism, isNested: true)
        #expect(nestedOther.conflict, "a nested DSTheme with another brand is a programming error (debug assertion)")
        #expect(nestedOther.brand == .prism, "and the scene keeps its brand")
    }

    // MARK: - Nesting, through a real view tree

    /// ADR-0019 §5, "Nested scopes": DSCore derives the context from the environment wherever tokens are read, so
    /// a nested scheme or density scope resolves as on the web, while modality and brand stay the root's.
    @Test func densityNestsWhileModalityAndBrandStayAtTheRoot() {
        let probe = DSContextProbe()
        let pointer = DSPointingDevice(isConnected: true)
        let noPointer = DSPointingDevice(isConnected: false)

        render(
            DSTheme(brand: .prismNative, pointingDevice: pointer) {
                VStack {
                    DSContextReader(id: "root", probe: probe)
                    VStack {
                        DSContextReader(id: "dense", probe: probe)
                        VStack { DSContextReader(id: "nested-density", probe: probe) }
                            .dsDensity(.watch)
                    }
                    .dsDensity(.comfortable)
                    DSTheme(brand: .prismNative, pointingDevice: noPointer) {
                        DSContextReader(id: "nested-theme", probe: probe)
                    }
                    VStack { DSContextReader(id: "dark", probe: probe) }
                        .environment(\.colorScheme, .dark)
                    VStack { DSContextReader(id: "forced", probe: probe) }
                        .dsAccessibilityPolicy(boldText: true, increasedContrast: true)
                }
            }
        )

        let root = probe.contexts["root"]
        #expect(root?.brand == .prismNative)
        #expect(root?.density == DSTokenContext.platformDefault.density)
        #expect(root?.modality == .pointer, "the injected monitor reports a pointing device")

        #expect(probe.contexts["dense"]?.density == .comfortable, "density nests")
        #expect(probe.contexts["nested-density"]?.density == .watch, "the nearest density scope wins")

        let nested = probe.contexts["nested-theme"]
        #expect(nested?.brand == .prismNative)
        #expect(nested?.modality == .pointer, "modality is root-only: the nested theme's monitor is ignored")
        #expect(nested?.density == DSTokenContext.platformDefault.density)

        if !DSPlatform.fixesColorSchemeToDark {
            #expect(probe.contexts["root"]?.colorScheme == .light)
            #expect(probe.contexts["dark"]?.colorScheme == .dark, "a nested color-scheme scope resolves like a web scope")
        }

        #expect(probe.contexts["forced"]?.contrast == .increased, "a forced preference applies to its subtree")
        #expect(probe.policies["forced"]?.boldText == true)
        #expect(probe.policies["root"]?.boldText == false)
        #expect(probe.contexts["root"]?.contrast == .standard)
    }

    @Test func theTokenStoreCachesOneSetPerContext() {
        DSTokenStore.reset()
        let context = DSTokenContext(colorScheme: .dark, density: .regular)
        let first = DSTokenStore.tokens(for: context)
        let second = DSTokenStore.tokens(for: context)
        #expect(first == second)
        #expect(first.context == context)
        #expect(DSTokenStore.tokens(for: DSTokenContext()) != first)
    }

    @Test func theEnvironmentDefaultsAreThePlatformDefaults() {
        var environment = EnvironmentValues()
        #expect(environment.dsDensity == DSTokenContext.platformDefault.density)
        #expect(environment.dsModality == DSTokenContext.platformDefault.modality)
        #expect(environment.dsBrand == .default)
        #expect(environment.dsSurfaceContext == .root)
        #expect(environment.dsAccessibilityOverrides == .none)
        environment.dsDensity = .watch
        #expect(environment.dsDensity == .watch)
    }

    private func render(_ view: some View) {
        let renderer = ImageRenderer(content: view.frame(width: 64, height: 240))
        _ = renderer.cgImage
    }
}

/// Collects what each probe resolved, so a real view tree can be inspected after one render pass.
@MainActor
final class DSContextProbe {
    var contexts: [String: DSTokenContext] = [:]
    var policies: [String: DSAccessibilityPolicy] = [:]

    func record(_ id: String, context: DSTokenContext, policy: DSAccessibilityPolicy) {
        contexts[id] = context
        policies[id] = policy
    }
}

/// A leaf that resolves the theme the way a P3-3 component will.
private struct DSContextReader: View {
    let id: String
    let probe: DSContextProbe
    private var theme = DSThemeValues()

    var body: some View {
        probe.record(id, context: theme.context, policy: theme.policy)
        return Rectangle().frame(width: 8, height: 8)
    }
}
