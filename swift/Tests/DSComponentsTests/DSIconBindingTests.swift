import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// `spec/components/Icon.yaml` specVersion 1: the colour matrix keyed by the published material, the backdrop kind on
/// the scheme's glass and the tone; the box per size in every density; the two weights and behavior 3's rule between
/// them; the motion cells; the frame fit that keeps every registry symbol inside its box; the examples as the spec
/// writes them; and the accessibility of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/icon.test.tsx` says about `Icon.css` and `weight.ts`: the appearance function's
/// answer for a set of keys is the token the spec's cell names. No key path is written on the expected side.
///
/// What the simulator actually publishes to VoiceOver for each example is measured by `DSIconAccessibilityTreeTests`,
/// and what the glyphs draw — no ink outside the box, `display` below `lg` drawing `control` — by `DSIconBoxTests`,
/// both in DSSnapshotTests.
@Suite("Icon bindings (Icon.yaml v1)")
struct DSIconBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Icon")
    }

    static func tokens(
        scheme: DSColorScheme = .light,
        density: DSDensity = .regular,
        transparency: DSTransparency = .standard,
        contrast: DSContrast = .standard
    ) -> DSTokenSet {
        DSTokenSet(DSTokenContext(
            brand: .default, colorScheme: scheme, contrast: contrast, transparency: transparency,
            density: density, modality: .touch
        ))
    }

    /// Every material a Surface can publish. A cell keyed by one applies when the enclosing Surface publishes it
    /// (ADR-0022 §3.1), so every material is asked.
    static let materials = DSSurfaceMaterial.allCases

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSIcon.init`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default`
    /// at every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 1)
        #expect(try spec.propValues("size") == DSGlyphSize.allCases.map(\.rawValue))
        #expect(try spec.propValues("weight") == DSGlyphWeight.allCases.map(\.rawValue))
        #expect(try spec.propValues("style") == DSIconStyle.allCases.map(\.rawValue))
        // `inherit` is the absence of a tone on Apple (nil), as it is for Text; the spec writes it last.
        #expect(try spec.propValues("tone") == DSGlyphTone.allCases.map(\.rawValue) + ["inherit"])

        #expect(try propDefault("size") == DSGlyphSize.md.rawValue)
        #expect(try propDefault("weight") == DSGlyphWeight.control.rawValue)
        // The prop's default, not the registry entry's `defaultStyle`: no stack reads that one.
        #expect(try propDefault("style") == DSIconStyle.outline.rawValue)
        #expect(try propDefault("tone") == DSGlyphTone.primary.rawValue)
        // `isDecorative` defaults false here and true on Divider — the one thing the three components that carry it
        // differ about under one name and one polarity (spec/SCHEMA.md).
        #expect(try propDefault("isDecorative") == "false")

        #expect(try spec.keys(at: "root.size") == DSGlyphSize.allCases.map(\.rawValue))
        #expect(try spec.keys(at: "root.weight") == DSGlyphWeight.allCases.map(\.rawValue))
        let colorKeys = Set(try spec.keys(at: "root.color")).subtracting(["default"])
        #expect(colorKeys.isSubset(of: Self.materials.map(\.rawValue)), "root.color is keyed by \(colorKeys.sorted())")
        #expect(try spec.keys(at: "root.color.glass") == ["map", "image", "vivid"])
        // No `inherit` key: inherit is not a cell of the matrix, it sets no colour at all.
        #expect(try spec.keys(at: "root.color.default") == DSGlyphTone.allCases.map(\.rawValue))
        for material in colorKeys where material != DSSurfaceMaterial.glass.rawValue {
            #expect(try spec.keys(at: "root.color.\(material)") == DSGlyphTone.allCases.map(\.rawValue), "\(material)")
        }
        for backdrop in try spec.keys(at: "root.color.glass") {
            #expect(try spec.keys(at: "root.color.glass.\(backdrop)") == DSGlyphTone.allCases.map(\.rawValue), "glass \(backdrop)")
        }
    }

    // MARK: - tokens.root.color

    /// `tokens.root.color`: every tone on every published material and, on the scheme's glass, over every backdrop
    /// kind the matrix names — the icon ramp on the solid family, each material's own foreground elsewhere, and
    /// `secondary` quieter on accent and glass (behaviors 7 and 8).
    @Test func colorCells() throws {
        for material in Self.materials where material != .glass {
            for tone in DSGlyphTone.allCases {
                try spec.binds(
                    DSIconAppearance.color(tone, on: DSSurfaceContext(material: material)), at: "root.color", material, tone
                )
            }
        }
        let written = try spec.keys(at: "root.color.glass")
        let backdrops = written.compactMap(DSBackdropKind.init(rawValue:))
        #expect(backdrops.map(\.rawValue) == written, "root.color.glass is keyed by \(written)")
        for backdrop in backdrops {
            for tone in DSGlyphTone.allCases {
                try spec.binds(
                    DSIconAppearance.color(tone, on: DSSurfaceContext(material: .glass, backdrop: backdrop)),
                    at: "root.color", DSSurfaceMaterial.glass, backdrop, tone
                )
            }
        }
    }

    /// Glass over no backdrop is not a cell of the matrix, because it is never published: the Surface falls back to
    /// `raised` (ADR-0022 §1.2 trigger 4). `DSGlyphTone` still answers for it, with the media row, as `DSTextTone` does.
    @Test func glassOverNoBackdropIsNeverPublished() throws {
        let published = DSSurface.resolve(material: .glass, backdrop: .none, tokens: Self.tokens()).published
        #expect(published.material != .glass)
        #expect(!(try spec.keys(at: "root.color.glass")).contains(DSBackdropKind.none.rawValue))
        #expect(DSGlyphTone.secondary.color(on: DSSurfaceContext(material: .glass, backdrop: .none)) == \.color.textOnGlassFillMediaSecondary)
    }

    /// Behavior 9: `inherit` sets no colour, on every material and over every backdrop, so the glyph takes the
    /// foreground of what it sits in.
    @Test func inheritSetsNoColour() {
        for material in Self.materials {
            for backdrop in DSBackdropKind.allCases {
                #expect(DSIconAppearance.color(nil, on: DSSurfaceContext(material: material, backdrop: backdrop)) == nil, "\(material) \(backdrop)")
            }
        }
    }

    /// `accessibility.reduceTransparency`: under the glass fallback the Surface publishes `raised`, so every tone takes
    /// the `raised` cell — with no transparency read of its own, which `lint:literals` would report.
    @Test func theGlassFallbackTakesTheRaisedCell() throws {
        for (name, tokens) in [
            ("Reduce Transparency", Self.tokens(transparency: .reduced)),
            ("Increase Contrast", Self.tokens(scheme: .dark, contrast: .increased)),
        ] {
            for material in [DSSurfaceMaterial.glass, .glassLight] {
                for backdrop in [DSBackdropKind.map, .image] {
                    let published = DSSurface.resolve(material: material, backdrop: backdrop, tokens: tokens).published
                    #expect(published.material == .raised, "\(name) \(material)")
                    for tone in DSGlyphTone.allCases {
                        try spec.binds(DSIconAppearance.color(tone, on: published), at: "root.color", published.material, tone)
                    }
                }
            }
        }
    }

    // MARK: - tokens.root.size

    /// `tokens.root.size` in every density Icon lists, and behavior 10: the box is the same in all of them.
    @Test func sizeCellsAreTheSameInEveryDensity() throws {
        #expect(DSDensity.allCases.map(\.rawValue) == ["compact", "regular", "comfortable", "watch"])
        let density = try #require(spec.document["density"]?.listValue, "Icon.yaml has no density list")
        #expect(density.compactMap(\.stringValue) == DSDensity.allCases.map(\.rawValue))
        for size in DSGlyphSize.allCases {
            var boxes: Set<CGFloat> = []
            for density in DSDensity.allCases {
                let tokens = Self.tokens(density: density)
                let box = DSIconAppearance.box(size, tokens.size)
                try spec.binds(value: box, at: "root.size", size, in: tokens)
                boxes.insert(box)
            }
            #expect(boxes.count == 1, "\(size): the box changes with density: \(boxes.sorted())")
        }
    }

    /// The box and the registry's calibration agree: each box is the registry's box of the same name, whose point
    /// size `DSSymbolImage` starts from (spec/icons/README.md, "Size mapping table").
    @Test func theBoxIsTheRegistrysBox() {
        let tokens = Self.tokens()
        for size in DSGlyphSize.allCases {
            let registry = DSIconAppearance.registrySize(size)
            #expect(registry.rawValue == size.rawValue)
            #expect(DSIconAppearance.box(size, tokens.size) == registry.box, "\(size)")
            #expect(DSIconAppearance.pointSize(size) == registry.pointSize, "\(size)")
        }
        // The numbers DSCore's own suite writes out, because DSCore cannot import the registry (DSSymbolTests).
        #expect(DSGlyphSize.allCases.map(DSIconAppearance.pointSize) == [14, 18, 21])
    }

    // MARK: - tokens.root.weight

    /// `tokens.root.weight`: `control` binds `icon.weight` and `display` binds `icon.weight-display`, and the rungs the
    /// two tokens name are the registry's regular and thin.
    @Test func weightCells() throws {
        for weight in DSGlyphWeight.allCases {
            try spec.binds(DSIconAppearance.weightToken(weight), at: "root.weight", weight)
        }
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            #expect(DSIconAppearance.rung(.control, tokens) == .regular, "\(density)")
            #expect(DSIconAppearance.rung(.display, tokens) == .thin, "\(density)")
        }
        // Behavior 4's ladder, as the route receives it: the rung and the one Bold Text steps it to.
        #expect(DSIconWeight.regular.boldText == .medium)
        #expect(DSIconWeight.thin.boldText == .light)
    }

    /// Behavior 3: `display` is allowed only at `lg`; asked for at `sm` or `md` it resolves to `control`, and
    /// `control` is `control` at every size.
    @Test func displayResolvesToControlBelowLarge() {
        for size in DSGlyphSize.allCases {
            #expect(DSIconAppearance.effectiveWeight(.control, size: size) == .control, "\(size)")
        }
        #expect(DSIconAppearance.effectiveWeight(.display, size: .lg) == .display)
        #expect(DSIconAppearance.effectiveWeight(.display, size: .md) == .control)
        #expect(DSIconAppearance.effectiveWeight(.display, size: .sm) == .control)
    }

    // MARK: - motion

    /// `motion.symbolChange` and `motion.reduceMotion`: a changed `name` replaces the glyph with the symbol effect over
    /// `motion.duration.quick`, and under Reduce Motion — `instant` — no symbol effect runs and the glyph is replaced
    /// at `motion.duration.instant`, with no animation at all (`accessibility.reduceMotion`). The web's twin is the
    /// `motion` block of `icon.test.tsx`, which reads the same two cells out of Glyph.css.
    @Test func motionCells() throws {
        try spec.binds(DSIconAppearance.symbolChange, at: "motion.symbolChange")
        #expect(try spec.cell("motion.reduceMotion") == DSIconAppearance.reduceMotion.rawValue)
        #expect(try spec.number("motion.symbolChange") != nil)

        let standard = DSMotion(DSTokenSet(DSTokenContext(motion: .standard)).motion)
        #expect(DSIconAppearance.runsSymbolEffect(standard))
        #expect(DSIconAppearance.symbolChangeDuration(standard) == DSTokenSet(DSTokenContext(motion: .standard))[keyPath: DSIconAppearance.symbolChange])
        #expect(DSIconAppearance.symbolChangeDuration(standard) > 0)
        #expect(DSIconAppearance.symbolChangeAnimation(standard) != nil)

        let reducedTokens = DSTokenSet(DSTokenContext(motion: .reduced))
        let reduced = DSMotion(reducedTokens.motion)
        #expect(!DSIconAppearance.runsSymbolEffect(reduced))
        #expect(DSIconAppearance.symbolChangeDuration(reduced) == reducedTokens.motion.durationInstant)
        #expect(DSIconAppearance.symbolChangeAnimation(reduced) == nil)
    }

    // MARK: - The frame fit

    /// Icon.yaml's anatomy, "never drawn outside it", as frames: at the point size `DSSymbol.fittedPointSize` gives it,
    /// every registry symbol's layout frame is no larger than `DSSymbol.calibration`'s — the symbol the registry's
    /// point sizes are calibrated to fill each box with — at every size, at the regular and the thin rung, and at the
    /// rung Bold Text steps each to.
    ///
    /// AppKit reports a symbol's frame in whole points, rounded up, so a fitted frame may land one point over the
    /// reference by rounding alone. The ink that frame holds is what the anatomy is about, and `DSIconBoxTests`
    /// measures it on the simulator: no registry glyph draws a pixel outside its box.
    @Test func everyRegistrySymbolIsFittedToTheCalibrationFrame() throws {
        let quantum: CGFloat = 1
        let rungs: [DSIconWeight] = [.regular, .medium, .thin, .light]
        var fitted = 0
        for name in DSIconName.allCases {
            guard let symbol = name.symbol else { continue }
            for size in DSGlyphSize.allCases {
                let registry = DSIconAppearance.registrySize(size)
                for rung in rungs where size == .lg || rung == .regular || rung == .medium {
                    let pointSize = registry.pointSize
                    let frame = try #require(
                        DSSymbol.frame(systemName: symbol, pointSize: pointSize, weight: rung.number, scale: registry.scale),
                        "\(name.rawValue): this platform has no \(symbol)"
                    )
                    let reference = try #require(
                        DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: pointSize, weight: rung.number, scale: registry.scale)
                    )
                    let fit = DSSymbol.fittedPointSize(pointSize, frame: frame, reference: reference)
                    #expect(fit <= pointSize, "\(name.rawValue) \(size) \(rung): enlarged to \(fit)")
                    if fit < pointSize { fitted += 1 }
                    let drawn = try #require(DSSymbol.frame(systemName: symbol, pointSize: fit, weight: rung.number, scale: registry.scale))
                    #expect(
                        max(drawn.width, drawn.height) <= max(reference.width, reference.height) + quantum,
                        "\(name.rawValue) (\(symbol)) \(size) \(rung): drawn \(drawn) at \(fit) pt, reference \(reference)"
                    )
                }
            }
        }
        // The fit is not vacuous: the wide symbols of the registry do shrink.
        #expect(fitted > 0)
        let gps = try #require(DSIconName.objectGps.symbol)
        let gpsFrame = try #require(DSSymbol.frame(systemName: gps, pointSize: 14, weight: 400, scale: .medium))
        let circle = try #require(DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: 14, weight: 400, scale: .medium))
        #expect(DSSymbol.fittedPointSize(14, frame: gpsFrame, reference: circle) < 14, "object.gps is no wider than the calibration symbol")
        // The calibration family keeps the registry's point size.
        for name in [DSIconName.statusOnline, .objectClock, .statusInfo] {
            let symbol = try #require(name.symbol)
            let frame = try #require(DSSymbol.frame(systemName: symbol, pointSize: 18, weight: 400, scale: .medium))
            let reference = try #require(DSSymbol.frame(systemName: DSSymbol.calibration, pointSize: 18, weight: 400, scale: .medium))
            #expect(DSSymbol.fittedPointSize(18, frame: frame, reference: reference) == 18, "\(name.rawValue)")
        }
    }

    // MARK: - The examples

    /// Every row of `DSIconExamples` is the example the spec writes under that id: the props, with the spec's defaults
    /// where the entry writes none, and the Surface and backdrop it declares.
    ///
    /// The snapshot harness never reads the spec, so this is what keeps a hand-written row from staging an example on
    /// another surface, or rendering other props, than the web story generated from the same entry.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSIconExamples.rows.map(\.id))
        for (entry, row) in zip(entries, DSIconExamples.rows) {
            #expect(row.name.rawValue == (try prop("name", of: entry)), "\(row.id)")
            #expect(row.size.rawValue == (try prop("size", of: entry)), "\(row.id)")
            #expect(row.weight.rawValue == (try prop("weight", of: entry)), "\(row.id)")
            #expect(row.style.rawValue == (try prop("style", of: entry)), "\(row.id)")
            #expect((row.tone?.rawValue ?? "inherit") == (try prop("tone", of: entry)), "\(row.id)")
            #expect(row.label == (try prop("label", of: entry)), "\(row.id)")
            #expect(String(row.isDecorative) == (try prop("isDecorative", of: entry)), "\(row.id)")
            let surface = entry.value["surface"]?.stringValue
            #expect(row.surface?.rawValue == (surface == "page" ? nil : surface), "\(row.id): staged on \(String(describing: row.surface)), spec \(surface ?? "page")")
            #expect(row.backdrop.rawValue == (entry.value["backdrop"]?.stringValue ?? DSBackdropKind.none.rawValue), "\(row.id)")
            #expect(row.example.hasGlass == (row.surface?.isGlass ?? false), "\(row.id)")
        }
        #expect(DSIconExamples.all.filter(\.hasGlass).map(\.name) == ["on-glass-over-map", "on-glass-light-over-image"])
        // Two examples draw a glyph whose registry entry defaults to `filled`; the spec's `outline` wins on both.
        let registryFilled = DSIconExamples.rows.filter { $0.name.defaultStyle == .filled && $0.style == .outline }.map(\.id)
        #expect(registryFilled == ["inherit-in-row", "on-glass-light-over-image"])
    }

    // MARK: - Accessibility

    /// Behaviors 13 and 14 and `accessibility`, per example: exactly `named-standalone` is exposed, as an image named
    /// by its `label`, byte for byte; every other example is hidden. The web asserts the same table off Chromium's tree
    /// (`web/apps/gallery/test/accessibility.browser.test.tsx`) and the simulator's own tree is read by
    /// `DSIconAccessibilityTreeTests`.
    @Test @MainActor func onlyTheNamedExampleIsExposed() throws {
        var exposed: [String: String] = [:]
        for row in DSIconExamples.rows
        where DSIconAppearance.isExposed(hasLabel: DSIconAppearance.hasLabel(row.label.map { LocalizedStringKey($0) }, locale: Self.english), isDecorative: row.isDecorative) {
            exposed[row.id] = row.label
        }
        #expect(exposed == ["named-standalone": "Locked for editing"])
        let name = try #require(exposed["named-standalone"])
        #expect(Array(name.utf8).count == 18 && name.allSatisfy(\.isASCII) && name == name.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    /// The rule itself: a label and `isDecorative: false` expose the glyph; no label hides it whatever `isDecorative`
    /// says, and `isDecorative: true` hides it even with a label.
    @Test func aGlyphIsExposedOnlyWithALabelAndNotDecorative() {
        #expect(DSIconAppearance.isExposed(hasLabel: true, isDecorative: false))
        #expect(!DSIconAppearance.isExposed(hasLabel: true, isDecorative: true))
        #expect(!DSIconAppearance.isExposed(hasLabel: false, isDecorative: false))
        #expect(!DSIconAppearance.isExposed(hasLabel: false, isDecorative: true))
    }

    static let english = Locale(identifier: "en")

    /// The blank labels both stacks hide, one string per kind of whitespace: nothing, spaces, a tab and a line feed,
    /// a no-break space, an ideographic space and U+FEFF. `web/packages/react/test/icon.test.tsx` holds the same list
    /// against `isIconExposed`, whose `trim()` is the set `DSIconAppearance.blankCharacters` spells out.
    static let blankLabels = ["", "  ", "\t\n", "\u{00A0}", "\u{3000}", "\u{FEFF}"]

    /// No label, and a label that resolves to nothing but whitespace, name nothing, so neither makes an image with an
    /// empty name; the web's `isIconExposed` hides the same labels. A phrase names the glyph, spaces around it and all.
    @Test func noLabelAndABlankLabelNameNothing() {
        #expect(!DSIconAppearance.hasLabel(nil, locale: Self.english))
        for blank in Self.blankLabels {
            #expect(!DSIconAppearance.hasLabel(LocalizedStringKey(blank), locale: Self.english), "\(blank.debugDescription)")
        }
        #expect(DSIconAppearance.hasLabel("Locked for editing", locale: Self.english))
        #expect(DSIconAppearance.hasLabel(" Locked ", locale: Self.english))
    }

    /// The check reads the string the key resolves to, not the key: an interpolation whose key is `%@` resolves to
    /// its value, so an empty or blank value hides the glyph and a phrase names it.
    @Test func anInterpolationIsCheckedForWhatItResolvesTo() {
        let empty = ""
        let spaces = "   "
        let phrase = "Locked for editing"
        #expect(DSIconAppearance.resolved("\(spaces)", locale: Self.english) == spaces)
        #expect(!DSIconAppearance.hasLabel("\(empty)", locale: Self.english))
        #expect(!DSIconAppearance.hasLabel("\(spaces)", locale: Self.english))
        #expect(DSIconAppearance.hasLabel("\(phrase)", locale: Self.english))
    }

    /// A key the app's strings table translates to spaces hides the glyph in that locale and names it in a locale
    /// whose table gives a phrase: the resolution runs in the bundle and the locale the glyph renders in. The table is
    /// a throwaway bundle in the temporary directory, standing in for the app's main bundle; its `ru` value is an
    /// English phrase because only the difference between the two tables matters here.
    @Test func aKeyTranslatedToSpacesNamesNothing() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("DSIconBlankLabel-\(UUID().uuidString).bundle")
        defer { try? FileManager.default.removeItem(at: root) }
        for (language, value) in [("en", "   "), ("ru", "Locked for editing")] {
            let folder = root.appendingPathComponent("\(language).lproj", isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            try "\"icon-lock-status\" = \"\(value)\";\n".write(to: folder.appendingPathComponent("Localizable.strings"), atomically: true, encoding: .utf8)
        }
        let bundle = try #require(Bundle(url: root))
        #expect(DSIconAppearance.resolved("icon-lock-status", locale: Self.english, bundle: bundle) == "   ")
        #expect(!DSIconAppearance.hasLabel("icon-lock-status", locale: Self.english, bundle: bundle))
        #expect(DSIconAppearance.resolved("icon-lock-status", locale: Locale(identifier: "ru"), bundle: bundle) == "Locked for editing")
        #expect(DSIconAppearance.hasLabel("icon-lock-status", locale: Locale(identifier: "ru"), bundle: bundle))
    }

    /// `blankCharacters` is ECMAScript's `trim()` set and none of Foundation's: `.whitespaces` holds U+200B and
    /// `.whitespacesAndNewlines` U+0085, both of which the web keeps, and neither holds U+FEFF, which the web removes.
    @Test func aBlankLabelIsBlankByTheWebsRule() {
        for scalar in ["\u{09}", "\u{0A}", "\u{0B}", "\u{0C}", "\u{0D}", "\u{20}", "\u{A0}", "\u{1680}", "\u{2000}", "\u{200A}", "\u{2028}", "\u{2029}", "\u{202F}", "\u{205F}", "\u{3000}", "\u{FEFF}"] {
            #expect(DSIconAppearance.isBlank(scalar), "\(scalar.debugDescription)")
        }
        for scalar in ["\u{85}", "\u{200B}", "a", "."] {
            #expect(!DSIconAppearance.isBlank(scalar), "\(scalar.debugDescription)")
        }
    }

    /// ADR-0032: Icon owns no string. The spec declares no `strings.Icon.*` key, and the registry's `icon.<id>` label
    /// field — documentation and search metadata — is never any example's name.
    @Test func iconOwnsNoString() throws {
        #expect(!spec.text.contains("strings.Icon"))
        let names = Set(DSIconExamples.rows.compactMap(\.label))
        for name in DSIconName.allCases {
            #expect(!names.contains(name.label), "\(name.rawValue)")
        }
    }

    // MARK: - Helpers

    /// The spec's `examples`, each with its id.
    private func examples() throws -> [(id: String, value: DSSpecValue)] {
        let list = try #require(spec.document["examples"]?.listValue, "Icon.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        let props = try #require(spec.document["props"]?.listValue)
        let entry = try #require(props.first { $0["name"]?.stringValue == name }, "Icon.yaml has no prop \(name)")
        return entry["default"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
