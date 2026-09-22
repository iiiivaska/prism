#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSTokens

/// Every axis the showcase can switch, and the one rule they all follow: **auto passes nothing**.
///
/// A nil field is not a default written into the app — it is the app declining to set the axis, so the OS and the
/// device decide it through `DSTokenContext.platformDefault` and the SwiftUI environment, exactly as
/// `web/apps/gallery/.storybook/preview.tsx` leaves an axis unset. What the runtime then resolves is printed from
/// `DSThemeValues().context`, so a control that does nothing is visible rather than assumed.
@Observable
public final class DSShowcaseAxes {
    /// Root-only (ADR-0020 §7): `DSTheme(brand:)` sets it once per scene. On Apple this is a plain switch,
    /// because the brand is per scene rather than per document as it is on the web.
    public var brand: DSBrand = .default
    public var colorScheme: ColorScheme?
    public var density: DSDensity?
    /// A root axis (ADR-0019 §1 item 4): applied *above* `DSTheme`, which is where a root axis is set.
    public var modality: DSModality?
    public var increasedContrast: Bool?
    public var reduceTransparency: Bool?
    public var reduceMotion: Bool?
    public var boldText: Bool?
    public var dynamicTypeSize: DynamicTypeSize?

    public init() {}

    /// True while every axis is on auto, which is what the app opens on.
    public var isAllAuto: Bool {
        brand == .default && colorScheme == nil && density == nil && modality == nil && increasedContrast == nil
            && reduceTransparency == nil && reduceMotion == nil && boldText == nil && dynamicTypeSize == nil
    }

    public func reset() {
        brand = .default
        colorScheme = nil
        density = nil
        modality = nil
        increasedContrast = nil
        reduceTransparency = nil
        reduceMotion = nil
        boldText = nil
        dynamicTypeSize = nil
    }
}

/// Whether the axis sheet is open, held apart from the axes themselves so that everything that can open it —
/// the toolbar button every screen carries, the Mac's View menu, and `-DSShowcaseAxes 1` — writes to one place.
///
/// It is in the environment because the button belongs to `DSScreen`, which is every screen including the ones a
/// `NavigationLink` pushes; a screen that had to be handed the axes to show the button would be a screen that can
/// forget to.
@Observable
public final class DSAxisPresentation {
    public var isPresented: Bool

    public init(isPresented: Bool = false) { self.isPresented = isPresented }
}

private struct DSAxisPresentationKey: EnvironmentKey {
    /// A fresh one per read, never a shared global: the root always injects the presentation it shares with the
    /// Mac's menu command, so this default exists only so that a screen compiles on its own.
    static var defaultValue: DSAxisPresentation { DSAxisPresentation() }
}

extension EnvironmentValues {
    /// The axis sheet's open state, read by the toolbar button `DSScreen` puts on every screen.
    var dsAxisPresentation: DSAxisPresentation {
        get { self[DSAxisPresentationKey.self] }
        set { self[DSAxisPresentationKey.self] = newValue }
    }
}

/// The nestable axes, applied inside the theme: scheme and density scope exactly as they do on the web, and the
/// accessibility policy is the one place an OS preference becomes a Prism decision (ADR-0019 §5).
struct DSAxisScope: ViewModifier {
    let axes: DSShowcaseAxes

    @ViewBuilder
    func body(content: Content) -> some View {
        let policy = content.dsAccessibilityPolicy(
            boldText: axes.boldText,
            increasedContrast: axes.increasedContrast,
            reduceTransparency: axes.reduceTransparency,
            reduceMotion: axes.reduceMotion,
            dynamicTypeSize: axes.dynamicTypeSize
        )
        switch (axes.density, axes.colorScheme) {
        case (.some(let density), .some(let scheme)):
            policy.dsDensity(density).environment(\.colorScheme, scheme)
        case (.some(let density), .none):
            policy.dsDensity(density)
        case (.none, .some(let scheme)):
            policy.environment(\.colorScheme, scheme)
        case (.none, .none):
            policy
        }
    }
}

/// The root of the app: the modality override above the theme, the theme itself, and the scoped axes inside it.
public struct DSShowcaseRoot: View {
    @State private var axes = DSShowcaseLaunch.axes()
    private let presentation: DSAxisPresentation

    /// The app shell passes the presentation it also hands to `DSShowcaseCommands`, so the Mac's View menu and the
    /// toolbar button open the same sheet. Without one the root makes its own, which is what a preview wants.
    public init(presentation: DSAxisPresentation? = nil) {
        let held = presentation ?? DSAxisPresentation()
        // `-DSShowcaseAxes 1` opens the sheet whoever owns the state, so a named launch is one code path.
        if DSShowcaseLaunch.opensAxes { held.isPresented = true }
        self.presentation = held
    }

    public var body: some View {
        themed
            .preferredColorScheme(axes.colorScheme)
            .environment(\.dsAxisPresentation, presentation)
    }

    @ViewBuilder
    private var themed: some View {
        let scene = DSTheme(brand: axes.brand) {
            DSShowcaseShell(axes: axes, presentation: presentation).modifier(DSAxisScope(axes: axes))
        }
        if let modality = axes.modality {
            scene.dsModality(modality)
        } else {
            scene
        }
    }
}

#if os(macOS)
/// **View ▸ Axes** (⌘⇧A): on the Mac a toolbar button is not the only way a reader reaches a panel, and a menu item
/// is also what makes the shortcut discoverable. The same `DSAxisPresentation` the root injects, so the menu, the
/// toolbar button and `-DSShowcaseAxes 1` are one state.
public struct DSShowcaseCommands: Commands {
    private let presentation: DSAxisPresentation

    public init(presentation: DSAxisPresentation) { self.presentation = presentation }

    public var body: some Commands {
        CommandGroup(after: .sidebar) {
            Button("Axes") { presentation.isPresented = true }
                .keyboardShortcut("a", modifiers: [.command, .shift])
        }
    }
}
#endif
#endif
