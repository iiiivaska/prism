// swift-tools-version: 6.2
// The macOS half of the icon gate (roadmap P2-2, ADR-0013 decision 5): every `apple.symbol` of
// spec/icons/registry.json checked against the SF Symbols availability catalog of the running system
// at Prism's deployment floor, with an NSImage smoke test, the right-to-left mirroring table and the
// measured point size of every icon box.
//
// A separate package, not a target of the root Prism package: it is a build tool that links AppKit and
// reads /System, never something a consumer ships. The `apple` job runs it as
// `swift run --package-path tools/icons-apple icons-validate spec/icons/registry.json`.
import PackageDescription

let package = Package(
    name: "icons-apple",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "icons-validate", targets: ["icons-validate"])
    ],
    targets: [
        // The target root is the package root so that Fixtures/ — the broken registries the tool rejects
        // itself with before it validates the real one — stays next to the sources rather than inside them.
        .executableTarget(
            name: "icons-validate",
            path: ".",
            exclude: ["README.md"],
            sources: ["Sources/icons-validate"],
            resources: [.copy("Fixtures")],
            swiftSettings: [.swiftLanguageMode(.v6)]
        )
    ]
)
