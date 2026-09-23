// The rules only macOS can check (roadmap P2-2; critic C-21, C-23, C-24).
//
//   sf/unknown              the name is not in this system's SF Symbols catalog: a typo, or a symbol
//                           newer than the release that ships with the floor OS (SF Symbols 8)
//   sf/newer-than-floor     the name exists but its year maps above the floor (2025.1 is OS 26.1)
//   sf/unverifiable         a symbol declared with minOS above the floor that this catalog cannot see;
//                           its fallback carries the render until the floor moves (ADR-0013, C-21)
//   sf/min-os-*             the minOS / fallback pair itself
//   sf/fill-missing         an entry that has a filled drawing (no `fill: false`) whose symbol has no `.fill` variant
//                           available at the floor, so Apple would draw the outline where the web draws a fill (ADR-0035)
//   sf/fill-declined        a warning: an entry marked `fill: false` whose symbol does have a `.fill` variant
//   sf/smoke                NSImage(systemSymbolName:) returns nil for a name the catalog knows
//   rtl/double-mirror       rtlMirror.apple on a symbol the system already mirrors (a direction-relative name, or one
//                           of the few it localizes for right to left by itself)
//   rtl/missing-mirror      the web flips the glyph and Apple neither flips nor auto-mirrors it
//   size/measured           the registry's SF point size does not fill its px box
//   enum/stale              DSIconName.swift does not cover exactly the ids of the registry
import AppKit
import Foundation

enum Checks {
    /// SF Symbol name parts that make a symbol direction-relative, so the system resolves it per layout
    /// direction; an extra flip would undo it (critic C-24).
    static let directionalParts: Set<String> = ["backward", "forward", "leading", "trailing"]

    static func isDirectional(_ name: String) -> Bool {
        name.split(separator: ".").contains { directionalParts.contains(String($0)) }
    }

    /// Symbols whose names are not direction-relative but which SF Symbols draws mirrored in a right-to-left layout
    /// anyway, because the catalog ships a right-to-left drawing for them: the day grid of `calendar` runs from the
    /// right, and `chart.xyaxis.line` puts its axes on the right. Measured on the iOS 26.5 simulator by `DSIconBoxTests`
    /// in the Prism package, and listed with a right-to-left rendition in CoreGlyphs' `Assets.car`, which only Xcode's
    /// `assetutil` reads; the same two names are `SYSTEM_LOCALIZED_SYMBOLS` in tools/icons/checks.ts.
    static let systemLocalized: Set<String> = ["calendar", "chart.xyaxis.line"]

    /// Whether the system mirrors a symbol in a right-to-left layout on its own: a direction-relative name, or one of
    /// `systemLocalized`.
    ///
    /// A left/right-named symbol is **not**, even when CoreGlyphs' `legacy_flippable.plist` lists it: whatever that
    /// list once described, it is not what an app built with the current SDK draws. Measured with SwiftUI's
    /// `Image(systemName:)` under `.layoutDirection(.rightToLeft)` on the iOS 26.5 simulator CI tests on and on macOS,
    /// and with UIKit under `.forceRightToLeft`, `arrow.up.right` and `arrow.right` draw exactly their left-to-right
    /// pixels, while `arrow.up.forward` and `chevron.backward` draw the mirrored ones. Trusting the list let `nav.open`
    /// ship unmirrored on Apple while the web flipped it — the case `rtl/missing-mirror` exists to fail — so the
    /// catalog no longer reads it (`Fixtures/missing-mirror-legacy-flippable.json`).
    ///
    /// A few symbols carry a right-to-left drawing of their own that no name and no plist announces; those the
    /// registry binds are `systemLocalized`. `DSIconBoxTests` in the Prism package measures what every registry glyph
    /// draws under RTL on the simulator, so a symbol this rule misses fails there.
    static func autoMirrors(_ name: String) -> Bool {
        isDirectional(name) || systemLocalized.contains(name)
    }

    /// Every symbol binding of the registry against the catalog, plus the mirroring table.
    static func symbols(_ registry: Registry, catalog: SymbolCatalog, smokeTest: Bool) -> [Issue] {
        var issues: [Issue] = []
        let floor = SymbolCatalog.release(registry.sources.sfSymbols.osFloor)
        let maxYear = SymbolCatalog.year(registry.sources.sfSymbols.maxYear)
        for id in registry.sortedIds {
            guard let icon = registry.icons[id] else { continue }
            let apple = icon.apple
            if apple.custom != nil {
                if apple.minOS != nil || apple.fallback != nil {
                    issues.append(.error("sf/min-os-on-custom", id, "a Phosphor-derived image set has no OS floor; drop minOS and fallback"))
                }
                continue
            }
            guard let symbol = apple.symbol else {
                issues.append(.error("apple/no-binding", id, "neither `symbol` nor `custom` is set"))
                continue
            }
            let minOS = apple.minOS.map { SymbolCatalog.release($0) }
            issues.append(contentsOf: availability(symbol, id: id, field: "symbol", registry: registry, catalog: catalog, floor: floor, maxYear: maxYear, minOS: minOS))
            if let fallback = apple.fallback {
                if fallback == symbol {
                    issues.append(.error("sf/fallback-equals-symbol", id, "the fallback repeats \(symbol)"))
                } else {
                    // A fallback renders below minOS, so it must itself be available at the floor.
                    issues.append(contentsOf: availability(fallback, id: id, field: "fallback", registry: registry, catalog: catalog, floor: floor, maxYear: maxYear, minOS: nil))
                }
            }
            issues.append(contentsOf: fill(icon, id: id, symbols: [symbol] + (apple.fallback.map { [$0] } ?? []), registry: registry, catalog: catalog, floor: floor, maxYear: maxYear))
            if smokeTest, catalog.isKnown(symbol), minOS == nil, NSImage(systemSymbolName: symbol, accessibilityDescription: nil) == nil {
                issues.append(.error("sf/smoke", id, "NSImage(systemSymbolName: \"\(symbol)\") is nil although the catalog lists the name"))
            }
            let mirror = icon.rtlMirror ?? Registry.RTLMirror(web: false, apple: false)
            let auto = autoMirrors(symbol)
            if mirror.apple, auto {
                issues.append(.error("rtl/double-mirror", id, "the system already mirrors \(symbol) in a right-to-left layout; rtlMirror.apple must be false or the glyph flips twice"))
            }
            if mirror.web, !mirror.apple, !auto {
                issues.append(.error("rtl/missing-mirror", id, "the web flips this glyph but \(symbol) neither declares rtlMirror.apple nor is mirrored by the system (a backward/forward/leading/trailing name is, and the few symbols in Checks.systemLocalized); a directional icon flips on both stacks: bind the direction-relative symbol, or set rtlMirror.apple"))
            }
        }
        return issues
    }

    /// ADR-0035: `style: filled` draws the symbol's fill variant on Apple and Phosphor's fill cut on the web, so an entry
    /// that has a filled drawing needs the variant at the floor — without it SwiftUI draws the plain symbol while the web
    /// draws a fill, which for a stroke glyph is another picture (a tick in a solid square is a checked Checkbox). Such an
    /// entry is marked `fill: false` instead, and both stacks draw its outline. The fallback of a `minOS` symbol renders
    /// below `minOS`, so it is held to the same rule.
    private static func fill(
        _ icon: Registry.Icon,
        id: String,
        symbols: [String],
        registry: Registry,
        catalog: SymbolCatalog,
        floor: Double,
        maxYear: Double
    ) -> [Issue] {
        guard let variant = registry.styles["filled"]?.sf.variant, variant != "none" else { return [] }
        var issues: [Issue] = []
        for symbol in symbols where catalog.isKnown(symbol) {
            let filled = "\(symbol).\(variant)"
            let available = isAvailable(filled, catalog: catalog, floor: floor, maxYear: maxYear)
            if icon.fill == false {
                if available {
                    issues.append(
                        .warning(
                            "sf/fill-declined",
                            id,
                            "the entry is marked `fill: false`, but \(filled) exists at the floor; drop `fill: false` unless that variant draws another metaphor than Phosphor's fill cut (ADR-0035)"
                        )
                    )
                }
            } else if !available {
                let reason = catalog.isKnown(filled) ? "is not available at the floor \(registry.sources.sfSymbols.osFloor)" : "does not exist"
                let hint = icon.defaultStyle == "filled" ? "bind a symbol that has a fill variant, or change the default style" : "mark the entry `fill: false`, so both stacks draw its outline for `filled`"
                issues.append(.error("sf/fill-missing", id, "\(filled) \(reason), so Apple would draw the outline where the web draws Phosphor's fill cut; \(hint) (ADR-0035)"))
            }
        }
        return issues
    }

    /// Whether a symbol name is in the catalog at the floor on every platform Prism declares, and no newer than `maxYear`.
    private static func isAvailable(_ symbol: String, catalog: SymbolCatalog, floor: Double, maxYear: Double) -> Bool {
        guard let found = catalog.releases(of: symbol), SymbolCatalog.year(found.year) <= maxYear else { return false }
        return SymbolCatalog.floorPlatforms.allSatisfy { platform in found.releases[platform].map { $0 <= floor } ?? false }
    }

    private static func availability(
        _ symbol: String,
        id: String,
        field: String,
        registry: Registry,
        catalog: SymbolCatalog,
        floor: Double,
        maxYear: Double,
        minOS: Double?
    ) -> [Issue] {
        let release = registry.sources.sfSymbols.release
        guard let found = catalog.releases(of: symbol) else {
            if let minOS, minOS > floor {
                return [
                    .warning(
                        "sf/unverifiable",
                        id,
                        "\(symbol) is not in this system's catalog (newest year \(catalog.newestYear)); it is declared minOS \(registry.icons[id]?.apple.minOS ?? "") and renders its fallback until the floor moves"
                    )
                ]
            }
            return [
                .error(
                    "sf/unknown",
                    id,
                    "\(field) \(symbol) is not an SF Symbols \(release) name on this system (newest year \(catalog.newestYear)): a misspelling, or a symbol added after the floor. A newer symbol needs minOS and a fallback (ADR-0013, critic C-21)"
                )
            ]
        }
        let names = catalog.releaseNames[found.year] ?? [:]
        let above = SymbolCatalog.floorPlatforms.compactMap { platform -> String? in
            guard let value = found.releases[platform] else { return "\(platform) unknown" }
            return value > floor ? "\(platform) \(names[platform] ?? String(value))" : nil
        }
        if above.isEmpty {
            if let minOS, minOS > floor {
                return [.error("sf/min-os-below-floor", id, "\(symbol) is available at the floor \(registry.sources.sfSymbols.osFloor) (year \(found.year)); drop minOS and fallback")]
            }
            if SymbolCatalog.year(found.year) > maxYear {
                return [.error("sf/newer-than-floor", id, "\(symbol) is year \(found.year), above the allowed \(registry.sources.sfSymbols.maxYear)")]
            }
            return []
        }
        if minOS != nil { return [] }
        return [
            .error(
                "sf/newer-than-floor",
                id,
                "\(field) \(symbol) is year \(found.year), which ships in \(above.joined(separator: ", ")) — above Prism's floor \(registry.sources.sfSymbols.osFloor). Declare minOS and a fallback, or bind an older symbol (critic C-21)"
            )
        ]
    }

    /// The measured half of critic C-23: the registry's point size fills its px box within a point.
    static func sizes(_ registry: Registry) -> [Issue] {
        var issues: [Issue] = []
        for (name, size) in registry.sizes.sorted(by: { $0.key < $1.key }) {
            guard let scale = scale(size.sf.scale) else {
                issues.append(.error("size/scale", "sizes.\(name)", "\(size.sf.scale) is not an SF Symbol scale"))
                continue
            }
            let configuration = NSImage.SymbolConfiguration(pointSize: size.sf.pointSize, weight: .regular, scale: scale)
            guard let image = NSImage(systemSymbolName: referenceSymbol, accessibilityDescription: nil)?.withSymbolConfiguration(configuration) else {
                issues.append(.error("size/measured", "sizes.\(name)", "the reference symbol \(referenceSymbol) did not render at \(size.sf.pointSize) pt"))
                continue
            }
            let delta = abs(image.size.height - size.px)
            if delta > 1 {
                issues.append(
                    .error(
                        "size/measured",
                        "sizes.\(name)",
                        "\(referenceSymbol) at \(size.sf.pointSize) pt \(size.sf.scale) renders \(image.size.height) pt high, \(delta) off the \(size.px) px box; re-measure the point size (critic C-23)"
                    )
                )
            }
        }
        return issues
    }

    /// The symbol the box measurement is taken with: a plain circle, present in every SF Symbols release.
    static let referenceSymbol = "circle"

    private static func scale(_ name: String) -> NSImage.SymbolScale? {
        switch name {
        case "small": .small
        case "medium": .medium
        case "large": .large
        default: nil
        }
    }

    /// The committed `DSIconName` covers exactly the registry's ids, so a hand edit fails the Apple job
    /// as well as `pnpm icons:validate` (ADR-0024 §11).
    static func generatedEnum(_ registry: Registry, at url: URL) -> [Issue] {
        guard let source = try? String(contentsOf: url, encoding: .utf8) else { return [] }
        // Only declarations of the form `case <name> = "<id>"`; the switch bodies below them read
        // `case .<name>: "<symbol>"` and carry no `=`.
        var cases: Set<String> = []
        for line in source.split(separator: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("case "), trimmed.hasSuffix("\""), let assign = trimmed.range(of: " = \"") else { continue }
            cases.insert(String(trimmed[assign.upperBound..<trimmed.index(before: trimmed.endIndex)]))
        }
        var issues: [Issue] = []
        let ids = Set(registry.icons.keys)
        for missing in ids.subtracting(cases).sorted() {
            issues.append(.error("enum/stale", missing, "DSIconName has no case for this id; run `pnpm icons:build`"))
        }
        for extra in cases.subtracting(ids).sorted() {
            issues.append(.error("enum/stale", extra, "DSIconName has a case no registry id matches; run `pnpm icons:build`"))
        }
        return issues
    }
}
