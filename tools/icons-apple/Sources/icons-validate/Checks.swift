// The rules only macOS can check (roadmap P2-2; critic C-21, C-23, C-24).
//
//   sf/unknown              the name is not in this system's SF Symbols catalog: a typo, or a symbol
//                           newer than the release that ships with the floor OS (SF Symbols 8)
//   sf/newer-than-floor     the name exists but its year maps above the floor (2025.1 is OS 26.1)
//   sf/unverifiable         a symbol declared with minOS above the floor that this catalog cannot see;
//                           its fallback carries the render until the floor moves (ADR-0013, C-21)
//   sf/min-os-*             the minOS / fallback pair itself
//   sf/fill-missing         a filled-by-default icon whose `.fill` variant does not exist
//   sf/smoke                NSImage(systemSymbolName:) returns nil for a name the catalog knows
//   rtl/double-mirror       rtlMirror.apple on a symbol the system already mirrors
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

    static func autoMirrors(_ name: String, catalog: SymbolCatalog) -> Bool {
        isDirectional(name) || catalog.flippable.contains(name)
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
            if icon.defaultStyle == "filled", let variant = registry.styles["filled"]?.sf.variant, variant == "fill" {
                let filled = "\(symbol).\(variant)"
                if catalog.isKnown(symbol), !catalog.isKnown(filled) {
                    issues.append(.error("sf/fill-missing", id, "defaultStyle is filled but \(filled) does not exist; bind a symbol that has a fill variant or change the default style"))
                }
            }
            if smokeTest, catalog.isKnown(symbol), minOS == nil, NSImage(systemSymbolName: symbol, accessibilityDescription: nil) == nil {
                issues.append(.error("sf/smoke", id, "NSImage(systemSymbolName: \"\(symbol)\") is nil although the catalog lists the name"))
            }
            let mirror = icon.rtlMirror ?? Registry.RTLMirror(web: false, apple: false)
            let auto = autoMirrors(symbol, catalog: catalog)
            if mirror.apple, auto {
                issues.append(.error("rtl/double-mirror", id, "\(symbol) is mirrored by the system in a right-to-left layout; rtlMirror.apple must be false or the glyph flips twice"))
            }
            if mirror.web, !mirror.apple, !auto {
                issues.append(.error("rtl/missing-mirror", id, "the web flips this glyph but \(symbol) neither declares rtlMirror.apple nor is mirrored by the system; a directional icon flips on both stacks"))
            }
        }
        return issues
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
