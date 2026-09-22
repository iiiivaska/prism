// A consuming iOS app, exactly as `agent/SKILL.md` describes one (roadmap P3-6).
//
// It exists to prove that the SwiftPM package Prism releases is usable from outside the monorepo:
// add the package, link `DSComponents`, wrap each scene's root in `DSTheme(brand:)` and read
// everything else from tokens. `tools/release/fixture-apple.ts` builds it for the iOS simulator
// against the local package or against a tag, and nothing in this folder may reach past the package's
// public API — a compile error here is a consumer's compile error.
import DSComponents
import DSCore
import SwiftUI

@main
struct PrismFixtureApp: App {
    var body: some Scene {
        WindowGroup {
            // SKILL rule: the brand is set once per scene, and nothing in the app re-brands.
            DSTheme(brand: .prism) {
                FixtureScreen()
            }
        }
    }
}
