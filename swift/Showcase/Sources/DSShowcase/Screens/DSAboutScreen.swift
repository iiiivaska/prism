#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// What this app is, what it reads, and what it is honest about not being.
struct DSAboutScreen: View {
    private var ds = DSThemeValues()

    var body: some View {
        let tokens = ds.tokens
        DSScreen("About") {
            DSBlock("What the chrome is", note: nil) {
                DSText(
                    verbatim: "The sidebar, the toolbar, the sheets and the lists around the content are plain SwiftUI, not Prism. Sidebar and TabBar are specified and unimplemented, and AdaptiveShell is a pattern with no implementation at all, so an app cannot yet be framed in Prism. Everything inside a screen — every surface, every piece of text, every button and card — is the real thing.",
                    role: .bodySm,
                    tone: .secondary
                )
            }

            DSBlock("What it reads", note: "Three generated files, and nothing else. The app holds no list of tokens or components of its own.") {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSFactRow("tokens", "web/packages/tokens/src/generated/manifest.json — every token, with the Swift member each one binds")
                    DSFactRow("components", "spec/components, spec/patterns — every spec, its support block and its examples")
                    DSFactRow("implemented", "DSComponentsManifest, DSChartsManifest — the version each Apple platform implements")
                    DSFactRow("renderers", "one per implemented component, generated from the manifests: a component that lands without one does not compile")
                }
            }

            DSBlock("What it cannot show", note: nil) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSText(
                        verbatim: "Primitive (`ref`) tokens have no public Swift API. They are CSS variables on the web, so the web showcase can print a value for them; here they are listed with their type and description and nothing else.",
                        role: .bodySm,
                        tone: .secondary
                    )
                    DSText(
                        verbatim: "The Icons screen is the registry, each entry drawn by Icon at Icon's own sizes and weights; the registry's six-rung ladder and four boxes reach further than Icon's props do, so its detail sheet draws those from the registry's binding and labels them as registry data. Icon's examples are on Components.",
                        role: .bodySm,
                        tone: .secondary
                    )
                    DSText(
                        verbatim: "watchOS is out of scope for this app — the package supports it and the watch density is switchable here, but the app builds for iOS and macOS.",
                        role: .bodySm,
                        tone: .secondary
                    )
                }
            }

            DSBlock("Where the canon is", note: "Nothing here is a second source of truth: the specs are the contract (ADR-0006) and the gallery is the pixel canon (ADR-0005).") {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    if let url = DSShowcaseCatalog.link("spec") {
                        Link("spec/ — the contract", destination: url)
                    }
                    if let url = DSShowcaseCatalog.galleryLink {
                        Link("gallery/README.md — the paired snapshots, and how to open them", destination: url)
                    }
                    if let url = DSShowcaseCatalog.link("tools/parity/report.md") {
                        Link("tools/parity/report.md — spec version vs implemented", destination: url)
                    }
                    if let url = DSShowcaseCatalog.link("docs/showcase.md") {
                        Link("docs/showcase.md — what these two apps are", destination: url)
                    }
                }
                .font(.footnote)
            }

            DSBlock("Build", note: nil) {
                VStack(alignment: .leading, spacing: tokens.space.step2) {
                    DSFactRow("version", DSTokenCatalog.version)
                    DSFactRow("platform", DSApplePlatform.current.label)
                    DSFactRow("renderers", DSShowcaseRenderers.names.joined(separator: ", "))
                }
            }
        }
    }
}
#endif
