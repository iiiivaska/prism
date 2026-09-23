import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Divider.yaml` specVersion 2: the colour matrix keyed by the published material, the thickness and
/// the inset per density, the examples as the spec writes them, and the accessibility of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/divider.test.tsx` says about `Divider.css`: the appearance function's answer for a
/// set of keys is the token the spec's cell names. No key path is written on the expected side.
///
/// The accessibility outcome on Apple is not asserted here but measured: `DSDividerAccessibilityTreeTests` in
/// DSSnapshotTests reads the tree the simulator publishes for every example. This suite holds the value the view applies
/// to the spec — `isDecorative: false` is a separator on the web and nothing on Apple, which has no separator trait.
@Suite("Divider bindings (Divider.yaml v2)")
struct DSDividerBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Divider")
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
    /// (ADR-0022 §3.1), so every material is asked, including the two the matrix leaves unset.
    static let materials = DSSurfaceMaterial.allCases

    // MARK: - The document

    /// The spec this file is the Apple half of, and the axes its matrices are keyed by.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default`
    /// at every step and pass while checking one cell nine times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 2)
        #expect(try spec.propValues("orientation") == DSDividerOrientation.allCases.map(\.rawValue))
        #expect(try spec.propValues("inset") == DSDividerInset.allCases.map(\.rawValue))
        #expect(try propDefault("orientation") == DSDividerOrientation.horizontal.rawValue)
        #expect(try propDefault("inset") == DSDividerInset.none.rawValue)
        // `isDecorative` defaults true here and false on Icon and Avatar — the one thing the three differ about under
        // one name and one polarity (spec/SCHEMA.md) — and `DSDivider.init` defaults it the same way.
        #expect(try propDefault("isDecorative") == "true")

        let colorKeys = try spec.keys(at: "root.color")
        #expect(Set(colorKeys).isSubset(of: Self.materials.map(\.rawValue)), "root.color is keyed by \(colorKeys)")
        let insetKeys = try spec.keys(at: "root.inset")
        #expect(Set(insetKeys).isSubset(of: DSDividerInset.allCases.map(\.rawValue)), "root.inset is keyed by \(insetKeys)")
    }

    /// Behavior 7 is written into the grammar, not beside it: the colour matrix has no `default`, so on `inverse` and
    /// `accent` — the materials it does not name — the colour is not set, and the line paints nothing. With a
    /// `default` the grammar would draw the hairline there and the prose would say it is not drawn, which is the
    /// disagreement roadmap P4-1 asked to be resolved in the spec rather than in one implementation.
    @Test func theColourMatrixHasNoDefault() throws {
        #expect(!(try spec.keys(at: "root.color")).contains("default"), "Divider.yaml root.color has a `default` again")
        for material in [DSSurfaceMaterial.inverse, .accent] {
            #expect(try spec.cell("root.color", material) == nil, "\(material)")
            #expect(DSDividerAppearance.color(on: material) == nil, "\(material)")
        }
    }

    // MARK: - tokens.root

    /// `tokens.root.color`: the line on every published material, out of the spec's own matrix — the solid family's
    /// hairline, vivid's `on-media`, glass's `on-glass-fill`, and nothing on `inverse` and `accent`.
    @Test func colorCells() throws {
        for material in Self.materials {
            try spec.binds(DSDividerAppearance.color(on: material), at: "root.color", material)
        }
    }

    /// `tokens.root.thickness` and `tokens.root.inset`, resolved against the token set each density builds.
    ///
    /// These are values, not key paths — the appearance functions return the `CGFloat` the layout reads — so
    /// `binds(value:…)` resolves the cell through each density's token set and compares the numbers.
    @Test func thicknessAndInsetCells() throws {
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            try spec.binds(value: DSDividerAppearance.thickness(tokens.border), at: "root.thickness", in: tokens)
            try spec.binds(
                value: DSDividerAppearance.inset(.content, tokens.space), at: "root.inset", DSDividerInset.content,
                in: tokens
            )
            // `none` has no cell: the line runs the full bleed of its container (behavior 3).
            #expect(try spec.cell("root.inset", DSDividerInset.none) == nil)
            #expect(DSDividerAppearance.inset(.none, tokens.space) == 0, "\(density)")
        }
        // The inset follows density, which is what makes it a density token and not a constant: an inset rule moves
        // with the card padding (roadmap P4-D2).
        let compact = DSDividerAppearance.inset(.content, Self.tokens(density: .compact).space)
        let regular = DSDividerAppearance.inset(.content, Self.tokens(density: .regular).space)
        #expect(compact != regular)
    }

    // MARK: - Behavior

    /// Behavior 9 and `accessibility.reduceTransparency`: under the glass fallback the Surface publishes `raised`, so
    /// the Divider takes the `raised` cell — with no transparency read of its own, which `lint:literals` would report.
    @Test func theGlassFallbackTakesTheRaisedCell() throws {
        for (name, tokens) in [
            ("Reduce Transparency", Self.tokens(transparency: .reduced)),
            ("Increase Contrast", Self.tokens(scheme: .dark, contrast: .increased)),
        ] {
            for material in [DSSurfaceMaterial.glass, .glassLight] {
                let published = DSSurface.resolve(material: material, backdrop: .map, tokens: tokens).published
                #expect(published.material == .raised, "\(name) \(material)")
                try spec.binds(DSDividerAppearance.color(on: published.material), at: "root.color", published.material)
                #expect(DSDividerAppearance.color(on: published.material) == DSDividerAppearance.color(on: .raised))
            }
        }
    }

    // MARK: - The examples

    /// Every row of `DSDividerExamples` is the example the spec writes under that id: the props, with the spec's
    /// defaults where the entry writes none, and the Surface and backdrop it declares.
    ///
    /// The snapshot harness never reads the spec, so this is what keeps a hand-written row from staging an example on
    /// another surface, or rendering other props, than the web story generated from the same entry.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSDividerExamples.rows.map(\.id))
        for (entry, row) in zip(entries, DSDividerExamples.rows) {
            #expect(row.orientation.rawValue == (try prop("orientation", of: entry)), "\(row.id)")
            #expect(row.inset.rawValue == (try prop("inset", of: entry)), "\(row.id)")
            #expect(String(row.isDecorative) == (try prop("isDecorative", of: entry)), "\(row.id)")
            let surface = entry.value["surface"]?.stringValue
            #expect(row.surface?.rawValue == (surface == "page" ? nil : surface), "\(row.id): staged on \(String(describing: row.surface)), spec \(surface ?? "page")")
            #expect(row.backdrop.rawValue == (entry.value["backdrop"]?.stringValue ?? DSBackdropKind.none.rawValue), "\(row.id)")
            #expect(row.example.hasGlass == (row.surface?.isGlass ?? false), "\(row.id)")
        }
        #expect(DSDividerExamples.all.filter(\.hasGlass).map(\.name) == ["on-glass-over-map"])
    }

    // MARK: - Accessibility

    /// `accessibility` and `notes.platform.ios`: on Apple the line is hidden whatever `isDecorative` says, for every
    /// spec example and for both values.
    ///
    /// Divider owns no string (ADR-0032): `label: none`, and no `strings.Divider.*` key, so there is nothing to name
    /// the line with on either stack. A decorative Divider is hidden on both — `aria-hidden` on the web,
    /// `accessibilityHidden` here, route 2.1 of ADR-0032. `semantic` is the one sanctioned difference: the web exposes
    /// it as `role="separator"` with the empty name, and Apple has no separator trait and may not invent a word, so it
    /// is no element here either.
    ///
    /// This is the value the view applies; what the simulator actually publishes for each example is measured by
    /// `DSDividerAccessibilityTreeTests` in DSSnapshotTests, which reads the accessibility tree VoiceOver walks. An
    /// unhidden shape there is an element with no label and no traits, which is what this answer prevents.
    @Test func theLineIsHiddenOnAppleWhateverIsDecorativeSays() throws {
        // The examples use both values (`semantic` is the one that sets false), and the loop below asks both.
        #expect(Set(try examples().compactMap { try prop("isDecorative", of: $0) }) == ["true", "false"])
        for isDecorative in [true, false] {
            #expect(DSDividerAppearance.hidesFromAssistiveTechnology(isDecorative: isDecorative), "isDecorative: \(isDecorative)")
        }
        // The spec says so in the note this answer implements, and gives no string to name the line with.
        let note = try #require(spec.document.at("notes.platform.ios")?.stringValue, "Divider.yaml has no notes.platform.ios")
        #expect(note.contains("never an accessibility element"), "Divider.yaml notes.platform.ios: \(note)")
        #expect(!spec.text.contains("strings.Divider"))
        #expect(try #require(spec.document.at("accessibility.label")?.stringValue).hasPrefix("none"))
    }

    // MARK: - Helpers

    /// The spec's `examples`, each with its id.
    private func examples() throws -> [(id: String, value: DSSpecValue)] {
        let list = try #require(spec.document["examples"]?.listValue, "Divider.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        let props = try #require(spec.document["props"]?.listValue)
        let entry = try #require(props.first { $0["name"]?.stringValue == name }, "Divider.yaml has no prop \(name)")
        return entry["default"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
