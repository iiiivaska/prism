import Foundation

/// The resource bundle of `DSIcons`, which holds the generated Phosphor image sets.
///
/// SwiftPM gives each target a `Bundle.module` of its own, internal to that target, and `DSIcons` does not publish
/// its bundle, so a glyph in another target looks the bundle up where SwiftPM places it: `Prism_DSIcons.bundle` beside
/// the main executable's resources or inside the bundle that loaded this code. The registry generator (tools/icons)
/// can make this unnecessary by publishing the image from `DSIcons`.
nonisolated enum DSIconBundle {
    static let name = "Prism_DSIcons.bundle"

    static let bundle: Bundle? = {
        let hosts = [Bundle.main, Bundle(for: DSIconBundleMarker.self)]
        let roots: [URL?] = hosts.flatMap { host -> [URL?] in
            [host.resourceURL, host.bundleURL, host.bundleURL.deletingLastPathComponent()]
        }
        for root in roots.compactMap({ $0 }) {
            if let bundle = Bundle(url: root.appendingPathComponent(name)) { return bundle }
        }
        return nil
    }()
}

private final class DSIconBundleMarker {}
