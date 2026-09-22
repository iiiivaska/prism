#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Where the app opens, and what the axes start at, read from launch arguments.
///
/// SwiftUI registers `-key value` launch arguments in `UserDefaults`, so any of these can be handed to
/// `xcrun simctl launch` or `open --args`. It exists so that a state can be *named*: a screenshot run, a demo or
/// a bug report opens the app exactly where it means to, instead of describing a sequence of taps. Nothing here
/// is a default the app carries — every key absent is every axis on auto, which is what a plain launch gives.
///
///     xcrun simctl launch "iPhone 17" com.example.prism.showcase \
///       -DSShowcaseSection foundations -DSShowcaseTokenGroup sys.color -DSShowcaseColorScheme dark
enum DSShowcaseLaunch {
    private static func string(_ key: String) -> String? {
        let value = UserDefaults.standard.string(forKey: key)
        return value?.isEmpty == false ? value : nil
    }

    private static func flag(_ key: String) -> Bool? {
        guard let value = string(key)?.lowercased() else { return nil }
        if ["1", "true", "on", "yes"].contains(value) { return true }
        if ["0", "false", "off", "no"].contains(value) { return false }
        return nil
    }

    static var section: DSShowcaseSection? { string("DSShowcaseSection").flatMap(DSShowcaseSection.init(rawValue:)) }

    /// A token group by its id, `sys.color` or `comp.button`.
    static var tokenGroup: DSTokenGroup? {
        guard let id = string("DSShowcaseTokenGroup") else { return nil }
        return DSTokenCatalog.groups.first { $0.id == id }
    }

    /// A component or pattern by its spec name.
    static var component: DSComponentEntry? {
        guard let name = string("DSShowcaseComponent") else { return nil }
        return DSShowcaseCatalog.named(name)
    }

    /// One example of one component, `Card/solid-metric`.
    static var example: DSExampleRef? {
        guard let value = string("DSShowcaseExample") else { return nil }
        let parts = value.split(separator: "/", maxSplits: 1).map(String.init)
        guard parts.count == 2, let entry = DSShowcaseCatalog.named(parts[0]) else { return nil }
        guard let example = entry.examples.first(where: { $0.id == parts[1] }) else { return nil }
        return DSExampleRef(component: entry.name, example: example)
    }

    /// One icon of the registry, by its semantic id.
    static var icon: DSIconName? { string("DSShowcaseIcon").flatMap(DSIconName.init(rawValue:)) }

    static var opensAxes: Bool { flag("DSShowcaseAxes") ?? false }

    /// The axes the app starts with; every key absent leaves every axis on auto.
    static func axes() -> DSShowcaseAxes {
        let axes = DSShowcaseAxes()
        if let brand = string("DSShowcaseBrand").flatMap(DSBrand.init(rawValue:)) { axes.brand = brand }
        switch string("DSShowcaseColorScheme") {
        case "light": axes.colorScheme = .light
        case "dark": axes.colorScheme = .dark
        default: break
        }
        axes.density = string("DSShowcaseDensity").flatMap(DSDensity.init(rawValue:))
        axes.modality = string("DSShowcaseModality").flatMap(DSModality.init(rawValue:))
        axes.increasedContrast = flag("DSShowcaseIncreasedContrast")
        axes.reduceTransparency = flag("DSShowcaseReduceTransparency")
        axes.reduceMotion = flag("DSShowcaseReduceMotion")
        axes.boldText = flag("DSShowcaseBoldText")
        axes.dynamicTypeSize = string("DSShowcaseDynamicType").flatMap(DSShowcaseLaunch.typeSize)
        return axes
    }

    static func typeSize(_ name: String) -> DynamicTypeSize? {
        DSAxisSheet.typeSizes.first { DSAxisSheet.label($0).hasPrefix(name) }
    }
}
#endif
