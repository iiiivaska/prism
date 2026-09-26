import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What every Toggle example is named and exposes, byte for byte, on both stacks, read in `en_US`.
///
/// The same table is asserted three times: here, off the pure functions; off the simulator's accessibility tree
/// (`DSToggleAccessibilityTreeTests`, DSSnapshotTests); and off Chromium's tree for every Toggle story
/// (`web/apps/gallery/test/accessibility.browser.test.tsx`), with the web's own copy of the rows in
/// `web/packages/react/test/toggle.test.tsx`. Every example is one switch named by its `label`, drawn or hidden
/// (ADR-0041), carrying its value; the track and the knob are no element.
nonisolated struct DSToggleNameCase: Sendable {
    let id: String
    /// The switch's accessible name: its `label`, as written.
    let name: String
    let isOn: Bool
    let isDisabled: Bool
    /// Whether the row draws the label: false for `bare`, whose label is its name and nothing else.
    let isLabelDrawn: Bool

    init(_ id: String, _ name: String, on: Bool, disabled: Bool = false, drawn: Bool = true) {
        self.id = id
        self.name = name
        self.isOn = on
        self.isDisabled = disabled
        self.isLabelDrawn = drawn
    }

    static let all: [DSToggleNameCase] = [
        DSToggleNameCase("off", "Night shading", on: false),
        DSToggleNameCase("on", "Night shading", on: true),
        DSToggleNameCase("on-disabled", "Night shading", on: true, disabled: true),
        DSToggleNameCase("bare", "Night shading", on: false, drawn: false),
        DSToggleNameCase("on-vivid", "Live readings", on: true),
        DSToggleNameCase("off-on-vivid", "Live readings", on: false),
        DSToggleNameCase("on-glass-over-map", "Follow the vehicle", on: true),
        // "Показывать ночное затенение маршрута следования": 47 scalars, 90 bytes of UTF-8, in NFC.
        DSToggleNameCase("label-ru", "Показывать ночное затенение маршрута следования", on: false),
    ]

    /// The UTF-8 byte count of each name, in table order.
    static let nameBytes = [13, 13, 13, 13, 13, 13, 18, 90]
}

/// `spec/components/Toggle.yaml` specVersion 1: the track's and the knob's cells on every material the enclosing
/// Surface can publish, off and on, and what a forced setting makes it publish; the row's cells and its washes, keyed
/// by material (ADR-0042 §2); the geometry per density and modality; the row's layout; the motion and the haptics; the
/// drag of behaviors 2 and 3 and its mirroring under right to left; the name (ADR-0041); the examples as the spec writes
/// them, and the name of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/toggle.test.tsx` says about `Toggle.css` and `ControlRow.css`: the appearance
/// function's answer for a set of keys is the token the spec's cell names. `everyCellOfTheMatrixIsAsked` holds the loops
/// to the whole matrix, so a cell the spec adds, or a material key no loop reaches, fails here until a test asks it.
///
/// What the simulator publishes to VoiceOver is measured by `DSToggleAccessibilityTreeTests`, and what every example
/// draws by the snapshot matrix, both in DSSnapshotTests.
@Suite("Toggle bindings (Toggle.yaml v1)")
struct DSToggleBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Toggle")
    }

    static func tokens(
        scheme: DSColorScheme = .light,
        contrast: DSContrast = .standard,
        transparency: DSTransparency = .standard,
        density: DSDensity = .regular,
        modality: DSModality = .touch,
        motion: DSMotionMode = .standard
    ) -> DSTokenSet {
        DSTokenSet(
            DSTokenContext(
                brand: .default, colorScheme: scheme, contrast: contrast, transparency: transparency, density: density,
                modality: modality, motion: motion
            )
        )
    }

    /// The densities the spec lists (`density`), never `.watch`: watchOS is `none`.
    static let densities: [DSDensity] = [.compact, .regular, .comfortable]

    /// The locale the snapshots render in and the name table is read in (`DSSnapshotRendering.locale`).
    static let english = Locale(identifier: "en_US")

    /// The paths keyed by the material the enclosing Surface publishes.
    static let materialPaths = [
        "root.hover.overlay", "root.pressed.overlay", "track.background", "track.border", "track.selected.background",
        "knob.background", "knob.selected.background",
    ]

    /// The paths that are one token, with no axis.
    static let scalarPaths = [
        "root.gap", "root.radius", "root.disabled.opacity", "root.focus-visible.ring", "root.focus-visible.ringWidth",
        "track.borderWidth", "track.radius", "track.height", "track.padding", "knob.radius", "label.typography",
    ]

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSToggle.init`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default` at
    /// every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 1)
        #expect(try spec.propValues("labelVisibility") == DSLabelVisibility.allCases.map(\.rawValue))
        let props = try #require(spec.document["props"]?.listValue)
        #expect(props.compactMap { $0["name"]?.stringValue } == ["isOn", "label", "labelVisibility", "isDisabled", "onChange"])
        #expect(try propDefault("isOn") == "false")
        // `label` has no default: unset, the switch takes the name its host hands over (ADR-0041).
        #expect(try propDefault("label") == nil)
        #expect(try propDefault("labelVisibility") == DSLabelVisibility.visible.rawValue)
        #expect(try propDefault("isDisabled") == "false")
        #expect(try spec.actionProps == ["onChange"])

        let tokens = try #require(spec.document["tokens"]?.mapValue)
        #expect(tokens.keys == ["root", "track", "knob", "label"])
        #expect(try spec.keys(at: "root") == ["gap", "radius", "hover", "pressed", "disabled", "focus-visible"])
        #expect(try spec.keys(at: "track") == ["background", "border", "borderWidth", "radius", "height", "padding", "selected"])
        #expect(try spec.keys(at: "track.selected") == ["background"])
        #expect(try spec.keys(at: "knob") == ["background", "radius", "selected"])
        #expect(try spec.keys(at: "knob.selected") == ["background"])
        #expect(try spec.keys(at: "label") == ["typography"])

        let materials = Set(DSSurfaceMaterial.allCases.map(\.rawValue) + ["default"])
        for path in Self.materialPaths {
            for key in try spec.keys(at: path) {
                #expect(materials.contains(key), "\(path) is keyed by \(key)")
            }
        }
        // The row's washes are keyed where the row draws no fill of its own, on inverse and accent (ADR-0042 §2).
        for path in ["root.hover.overlay", "root.pressed.overlay"] {
            #expect(try spec.keys(at: path) == ["default", DSSurfaceMaterial.inverse.rawValue, DSSurfaceMaterial.accent.rawValue], "\(path)")
        }
        // The ring is keyed by no spec: every spec binds color.border.focus, and the one drawing picks the ring for the
        // ground (ADR-0042 §1).
        for path in Self.scalarPaths {
            #expect(try spec.binding(path).stringValue != nil, "\(path) is not one token")
        }

        let states = try #require(spec.document["states"]?.listValue).compactMap(\.stringValue)
        #expect(states == ["default", "hover", "pressed", "selected", "focus-visible", "disabled"])
        let density = try #require(spec.document["density"]?.listValue).compactMap(\.stringValue)
        #expect(density == Self.densities.map(\.rawValue))
        #expect(spec.document["accessibility"]?["role"]?.stringValue == "switch")
        #expect(spec.document["accessibility"]?["traits"]?.listValue?.compactMap(\.stringValue) == ["toggle"])
        // watchOS is `none`, so the manifest carries no watch key (`DSComponentsContractTests` holds the rest).
        #expect(try spec.platforms["watchos"] == "none")
        #expect(DSComponentsManifest.implemented["Toggle"]?["watchos"] == nil)
    }

    /// Every cell of `tokens` is one the tests below reach: the matrix, walked out of the spec, is exactly the cells the
    /// loops over the materials arrive at, falling back to `default` as the grammar does. A cell the spec adds, or a key
    /// no loop reaches, fails here until a test binds it.
    @Test func everyCellOfTheMatrixIsAsked() throws {
        var asked: Set<String> = []
        func reach(_ path: String, _ keys: [any DSSpecKey]) throws {
            if let reached = try reached(path, keys) { asked.insert(reached) }
        }
        for material in DSSurfaceMaterial.allCases {
            for path in Self.materialPaths {
                try reach(path, [material])
            }
        }
        for path in Self.scalarPaths {
            try reach(path, [])
        }
        let written = try spec.allBindings().map(\.path)
        #expect(Set(written) == asked, "unasked: \(Set(written).subtracting(asked).sorted()); asked and absent: \(asked.subtracting(written).sorted())")
        #expect(written.count == Set(written).count, "a cell is written twice")
        #expect(written.count == 41)
    }

    // MARK: - The track and the knob

    /// `tokens.track.background` and `tokens.track.selected.background` on every material: the neutral wash on the solid
    /// ladder while off and no fill anywhere else, since the cell has no `default`; the inverse solid while on, the white
    /// solid on vivid, and the material's foreground on inverse and accent, knocked out. `tokens.track.border` is the
    /// off track's outline and none is drawn while on.
    @Test func trackCells() throws {
        for material in DSSurfaceMaterial.allCases {
            try spec.binds(DSToggleAppearance.trackBackground(on: material, isOn: false), at: "track.background", material)
            try spec.binds(DSToggleAppearance.trackBackground(on: material, isOn: true), at: "track.selected.background", material)
            try spec.binds(DSToggleAppearance.trackBorder(on: material), at: "track.border", material)
            #expect(DSToggleAppearance.drawnBorder(on: material, isOn: false) == DSToggleAppearance.trackBorder(on: material), "\(material)")
            #expect(DSToggleAppearance.drawnBorder(on: material, isOn: true) == nil, "\(material): the on track draws an outline")
        }
        #expect(try !spec.keys(at: "track.background").contains("default"))
    }

    /// `tokens.track.borderWidth` is the hairline, as every outline of a control that acts is (ADR-0033), and it has no
    /// material level: the ring on vivid and glass is as wide as on the page.
    @Test func theOutlineIsAHairline() throws {
        try spec.binds(DSToggleAppearance.trackBorderWidth, at: "track.borderWidth")
        #expect(try spec.cell("track.borderWidth") == "border.hairline")
        let behavior = try #require(spec.document["behavior"]?.listValue).compactMap(\.stringValue)
        #expect(behavior.contains { $0.hasPrefix("The outline is a hairline, as every outline of a control that acts is (ADR-0033)") })
    }

    /// `tokens.knob.background` and `tokens.knob.selected.background` on every material: the quiet knob and the
    /// opposite-coloured one by default, the material's own foreground off the solid ladder while off, the ink knob on
    /// the white solid, and the material's own fill on the knocked-out solid.
    @Test func knobCells() throws {
        for material in DSSurfaceMaterial.allCases {
            try spec.binds(DSToggleAppearance.knob(on: material, isOn: false), at: "knob.background", material)
            try spec.binds(DSToggleAppearance.knob(on: material, isOn: true), at: "knob.selected.background", material)
        }
    }

    /// Under a forced Reduce Transparency or Increase Contrast a glass Surface falls back and publishes `raised` over the
    /// backdrop it declared, and the switch takes what `raised` binds, the solid ladder's off track included; a selected
    /// glass Surface falls back to inverse, where the switch knocks out and the row takes inverse's wash
    /// (`accessibility.reduceTransparency`). A cell applies when its material is published (ADR-0022 §3.1).
    @Test func underAForcedSettingTheSwitchTakesThePublishedCells() throws {
        for tokens in [Self.tokens(transparency: .reduced), Self.tokens(contrast: .increased)] {
            for material in [DSSurfaceMaterial.glass, .glassLight] {
                for backdrop in [DSBackdropKind.map, .image, .vivid] {
                    let comment = "\(material) over \(backdrop) under \(tokens.context)"
                    let fallback = DSSurface.resolve(material: material, backdrop: backdrop, tokens: tokens, isWatch: false)
                    let published = fallback.published.material
                    #expect(published == .raised, "\(comment)")
                    for isOn in [false, true] {
                        let track = isOn ? "track.selected.background" : "track.background"
                        let knob = isOn ? "knob.selected.background" : "knob.background"
                        try spec.binds(DSToggleAppearance.trackBackground(on: published, isOn: isOn), at: track, DSSurfaceMaterial.raised)
                        try spec.binds(DSToggleAppearance.knob(on: published, isOn: isOn), at: knob, DSSurfaceMaterial.raised)
                    }
                    try spec.binds(DSToggleAppearance.trackBorder(on: published), at: "track.border", DSSurfaceMaterial.raised)
                    try spec.binds(DSToggleAppearance.hoverOverlay(on: published), at: "root.hover.overlay", DSSurfaceMaterial.raised)

                    let selected = DSSurface.resolve(material: material, backdrop: backdrop, selected: true, tokens: tokens, isWatch: false)
                    let knockedOut = selected.published.material
                    #expect(knockedOut == .inverse, "\(comment), selected")
                    try spec.binds(DSToggleAppearance.trackBackground(on: knockedOut, isOn: true), at: "track.selected.background", DSSurfaceMaterial.inverse)
                    try spec.binds(DSToggleAppearance.knob(on: knockedOut, isOn: true), at: "knob.selected.background", DSSurfaceMaterial.inverse)
                    try spec.binds(DSToggleAppearance.hoverOverlay(on: knockedOut), at: "root.hover.overlay", DSSurfaceMaterial.inverse)
                    try spec.binds(DSToggleAppearance.pressedOverlay(on: knockedOut), at: "root.pressed.overlay", DSSurfaceMaterial.inverse)
                }
            }
        }
    }

    // MARK: - Geometry (behavior 4)

    /// `tokens.track.height`, `tokens.track.padding`, `tokens.track.radius` and `tokens.knob.radius`: a pill of
    /// `comp.toggle.height`, 28, 32 and 44 pt by density and the same under touch and pointer, twice as wide as it is
    /// tall; the knob a circle inset by `comp.toggle.inset` on every side, which travels `comp.toggle.height` from the
    /// leading end to the trailing end; `radius.control` at least half the height, so the ends are round.
    @Test func theTrackFollowsDensityAndNothingElse() throws {
        let heights: [DSDensity: CGFloat] = [.compact: 28, .regular: 32, .comfortable: 44]
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                let geometry = DSToggleAppearance.geometry(tokens)
                let comment = "\(density) \(modality)"
                try spec.binds(value: geometry.height, at: "track.height", in: tokens)
                try spec.binds(value: geometry.inset, at: "track.padding", in: tokens)
                #expect(geometry.height == heights[density], "\(comment)")
                #expect(geometry.width == geometry.height * 2, "\(comment)")
                #expect(geometry.knob == geometry.height - geometry.inset * 2, "\(comment)")
                #expect(geometry.travel == geometry.height, "\(comment): the knob travels \(geometry.travel)")
                #expect(geometry.knobOffset(progress: 0) == geometry.inset, "\(comment)")
                #expect(geometry.knobOffset(progress: 1) + geometry.knob + geometry.inset == geometry.width, "\(comment)")
                #expect(tokens[keyPath: DSToggleAppearance.trackRadius] >= geometry.height / 2, "\(comment): the ends are not round")
            }
        }
        let regular = DSToggleAppearance.geometry(Self.tokens())
        #expect([regular.width, regular.height, regular.knob, regular.travel] == [64, 32, 24, 32])
        try spec.binds(DSToggleAppearance.height, at: "track.height")
        try spec.binds(DSToggleAppearance.inset, at: "track.padding")
        try spec.binds(DSToggleAppearance.trackRadius, at: "track.radius")
        try spec.binds(DSToggleAppearance.knobRadius, at: "knob.radius")
    }

    /// The hit region is the larger of the row and `size.hit` on each axis: a row of the track alone at 28 or 32 pt
    /// reaches 44 under touch, and under pointer the track is already as tall as the 28 pt target. The track's own box
    /// never grows with modality (ADR-0024 §7.3).
    @Test func hitRegionReachesSizeHit() {
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                let geometry = DSToggleAppearance.geometry(tokens)
                let outset = DSControlAppearance.hitOutset(visual: CGSize(width: geometry.width, height: geometry.height), hit: tokens.size.hit)
                #expect(geometry.height + 2 * outset.height == max(geometry.height, tokens.size.hit), "\(density) \(modality)")
                #expect(geometry.width + 2 * outset.width == max(geometry.width, tokens.size.hit), "\(density) \(modality)")
                #expect(geometry == DSToggleAppearance.geometry(Self.tokens(density: density, modality: .touch)), "\(density) \(modality)")
            }
        }
        #expect(Self.tokens(modality: .touch).size.hit == 44)
        #expect(Self.tokens(modality: .pointer).size.hit == 28)
    }

    // MARK: - The row (tokens.root, tokens.label)

    /// `tokens.root` and `tokens.label`: the row's gap, outline, disabled opacity and label role, the one ring every spec
    /// binds, and the washes on every material, the neutral wash by default and the material's own on inverse and
    /// accent, where the row draws no fill of its own (ADR-0042 §2).
    @Test func rowCells() throws {
        let row = DSToggleAppearance.row
        try spec.binds(row.gap, at: "root.gap")
        try spec.binds(row.radius, at: "root.radius")
        try spec.binds(row.disabledOpacity, at: "root.disabled.opacity")
        try spec.binds(row.labelRole.keyPath, at: "label.typography")
        try spec.binds(DSToggleAppearance.focusRing, at: "root.focus-visible.ring")
        try spec.binds(DSToggleAppearance.focusRingWidth, at: "root.focus-visible.ringWidth")
        for material in DSSurfaceMaterial.allCases {
            try spec.binds(DSToggleAppearance.hoverOverlay(on: material), at: "root.hover.overlay", material)
            try spec.binds(DSToggleAppearance.pressedOverlay(on: material), at: "root.pressed.overlay", material)
            #expect(row.hover.on(material) == DSToggleAppearance.hoverOverlay(on: material), "\(material)")
            #expect(row.pressed.on(material) == DSToggleAppearance.pressedOverlay(on: material), "\(material)")
        }
        #expect(try spec.cell("root.hover.overlay", DSSurfaceMaterial.inverse) == "color.bg.fill.on-inverse-subtle")
        #expect(try spec.cell("root.pressed.overlay", DSSurfaceMaterial.accent) == "color.bg.fill.on-accent-subtle")
    }

    /// Behavior, "Hover ... Pressed lays the same wash over the row ... and replaces the hover overlay rather than
    /// stacking with it": one wash at a time, the pressed one over the hover, and nothing at rest, on every material.
    @Test func theRowLaysOneWashAtATime() {
        let cells = DSToggleAppearance.row
        for material in DSSurfaceMaterial.allCases {
            #expect(DSControlRowStates.overlay(isPressed: false, isHovered: false, cells: cells, on: material) == nil, "\(material)")
            #expect(DSControlRowStates.overlay(isPressed: false, isHovered: true, cells: cells, on: material) == DSToggleAppearance.hoverOverlay(on: material), "\(material)")
            #expect(DSControlRowStates.overlay(isPressed: true, isHovered: false, cells: cells, on: material) == DSToggleAppearance.pressedOverlay(on: material), "\(material)")
            #expect(DSControlRowStates.overlay(isPressed: true, isHovered: true, cells: cells, on: material) == DSToggleAppearance.pressedOverlay(on: material), "\(material)")
        }
    }

    /// Behavior, "The row's outline is `root.radius` ... A Toggle with no visible label is a row of the track alone, so
    /// there the overlay and the ring follow the track at radius.control".
    @Test func theOutlineOfARowOfTheTrackAloneIsTheTracks() throws {
        try spec.binds(DSToggleAppearance.outline(isLabelDrawn: true), at: "root.radius")
        try spec.binds(DSToggleAppearance.outline(isLabelDrawn: false), at: "track.radius")
    }

    /// Hover exists only under pointer modality, and only on a switch that takes input (behavior).
    @Test func hoverIsPointerOnly() {
        let pointer = Self.tokens(modality: .pointer).interaction
        let touch = Self.tokens(modality: .touch).interaction
        #expect(DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: touch, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: false))
    }

    /// Behavior 9's geometry, which `ControlRow.css` writes as two `max()` expressions: the taller of the label's first
    /// line and the control sits at the row's top and the other is pushed down by half the difference, so the track
    /// stays level with the first line whether the line is shorter than the track, as `type.body.md`'s 22.5 pt line is
    /// beside a 32 pt track, or taller, as it is at the largest Dynamic Type sizes.
    @Test func theTrackIsCentredOnTheLabelsFirstLine() throws {
        let role = Self.tokens().typography.bodyMd
        let line = DSControlRowGeometry.lineHeight(size: role.size, lineHeight: role.lineHeight)
        #expect(line == 22.5)
        #expect(DSControlRowGeometry.labelInset(line: line, control: 32) == 4.75)
        #expect(DSControlRowGeometry.controlInset(line: line, control: 32) == 0)
        #expect(DSControlRowGeometry.labelInset(line: 50, control: 32) == 0)
        #expect(DSControlRowGeometry.controlInset(line: 50, control: 32) == 9)
        #expect(DSToggleAppearance.row.labelRole == .bodyMd)
        try spec.binds(DSToggleAppearance.row.labelRole.keyPath, at: "label.typography")
    }

    /// Behavior 9 and `accessibility.dynamicType`, as layout: the row takes the width it is given, a one-line label
    /// leaves it the track's height in every density — `type.body.md`'s line is shorter than every track — and a label
    /// that wraps grows it; a row of the track alone is the track's own box, twice as wide as it is tall. Measured as
    /// the size of an `ImageRenderer` render, which the host lays out correctly though it paints no token colour
    /// (`DSRenderCapability`): this reads layout, never a pixel.
    @Test func theRowIsTheTrackTallUntilItsLabelWraps() throws {
        func size(_ view: some View, _ density: DSDensity) throws -> CGSize {
            let renderer = ImageRenderer(content: DSTheme { view.dynamicTypeSize(.large).dsDensity(density) })
            renderer.scale = 1
            let image = try #require(renderer.cgImage)
            return CGSize(width: image.width, height: image.height)
        }
        for density in Self.densities {
            let geometry = DSToggleAppearance.geometry(Self.tokens(density: density))
            for isOn in [false, true] {
                let comment = "\(density), \(isOn ? "on" : "off")"
                let bare = try size(DSToggle(verbatim: "Night shading", isOn: .constant(isOn), labelVisibility: .hidden), density)
                #expect(bare == CGSize(width: geometry.width, height: geometry.height), "\(comment): the track alone is \(bare)")
                let row = try size(DSToggle(verbatim: "Night shading", isOn: .constant(isOn)).frame(width: 400), density)
                #expect(row == CGSize(width: 400, height: geometry.height), "\(comment): the row is \(row)")
            }
            let long = try size(
                DSToggle(verbatim: "Показывать ночное затенение маршрута следования", isOn: .constant(false)).frame(width: 400),
                density
            )
            #expect(long.height > geometry.height, "\(density): the long label did not wrap, the row is \(long)")
        }
    }

    // MARK: - motion and haptics

    /// `motion.flip` is the snappy spring, which the knob keeps under Reduce Motion — in-place movement, with no bounce
    /// there (ADR-0023 §8.4 item 3) — and `motion.trackFill` is `motion.duration.quick` on `motion.easing.out`, which
    /// Reduce Motion turns into the crossfade over `motion.duration.base` (`motion.reduceMotion: crossfade`).
    @Test func motionCells() throws {
        try spec.binds(DSToggleAppearance.flipSpring, at: "motion.flip")
        try spec.binds(DSToggleAppearance.trackFill, at: "motion.trackFill")
        #expect(try spec.cell("motion.reduceMotion") == DSToggleAppearance.reduceMotion.rawValue)

        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        #expect(DSToggleAppearance.flipAnimation(standard) == Self.tokens()[keyPath: DSToggleAppearance.flipSpring].animation)
        #expect(DSToggleAppearance.flipAnimation(reduced) == Self.tokens(motion: .reduced)[keyPath: DSToggleAppearance.flipSpring].animation)
        let quick = standard.tokens.easingOut.animation(duration: Self.tokens()[keyPath: DSToggleAppearance.trackFill])
        #expect(DSToggleAppearance.fillAnimation(standard) == quick)
        let fade = reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        #expect(DSToggleAppearance.fillAnimation(reduced) == fade)
    }

    /// `haptics`: one flip, one haptic — `haptic.selection.on` for a flip to on and `haptic.selection.off` for a flip to
    /// off — and no press haptic (spec/haptics.yaml rules 2 and 5).
    @Test func oneHapticPerFlip() throws {
        let haptics = try #require(spec.document["haptics"]?.mapValue)
        #expect(haptics.keys == ["on", "off"])
        #expect(haptics["on"]?.stringValue == DSToggleAppearance.flipHaptic(isOn: true).rawValue)
        #expect(haptics["off"]?.stringValue == DSToggleAppearance.flipHaptic(isOn: false).rawValue)
        #expect(DSToggleAppearance.flipHaptic(isOn: true) == .selectionOn)
        #expect(DSToggleAppearance.flipHaptic(isOn: false) == .selectionOff)
    }

    // MARK: - The drag (behaviors 2 and 3)

    /// Behavior 2: a press on the track is a drag once it has moved the distance the spec writes, 10 pt.
    @Test func aPressBecomesADragAtTheSpecsDistance() throws {
        let behavior = try #require(spec.document["behavior"]?.listValue).compactMap(\.stringValue)
        let sentence = try #require(behavior.first { $0.hasPrefix("A press on the track becomes a drag once it has moved") })
        let match = try #require(sentence.firstMatch(of: /moved (\d+) pt from where it began/))
        #expect(Double(match.1) == Double(DSToggleAppearance.dragThreshold))
    }

    /// While a drag holds the knob it stays between the two ends, measured from the end it started at, as a share of the
    /// knob's travel.
    @Test func theDragHoldsTheKnobBetweenTheEnds() {
        #expect(DSToggleAppearance.dragProgress(isOn: false, translation: 16, travel: 32) == 0.5)
        #expect(DSToggleAppearance.dragProgress(isOn: false, translation: -40, travel: 32) == 0)
        #expect(DSToggleAppearance.dragProgress(isOn: false, translation: 400, travel: 32) == 1)
        #expect(DSToggleAppearance.dragProgress(isOn: true, translation: -8, travel: 32) == 0.75)
        #expect(DSToggleAppearance.dragProgress(isOn: true, translation: 40, travel: 32) == 1)
        #expect(DSToggleAppearance.dragProgress(isOn: true, translation: 12, travel: 0) == 1)
    }

    /// Behavior 2: a release commits the half of the track the knob's centre is nearest, once, and nothing when the value
    /// does not change — a drag that ends where it began, or that crosses the middle and comes back — and a knob left
    /// exactly on the middle keeps the value. The web runs the same replays (`toggle.test.tsx`).
    @Test func aDragCommitsOnlyAChangeAndOnce() {
        #expect(Self.replay(false, [12, 20, 6, 0]) == nil)
        #expect(Self.replay(true, [-12, -20, -6, 0]) == nil)
        #expect(Self.replay(false, [10, 24, 30, 12, 4]) == nil)
        #expect(Self.replay(true, [-10, -24, -30, -12, -4]) == nil)
        #expect(Self.replay(false, [10, 20]) == true)
        #expect(Self.replay(true, [-10, -20]) == false)
        #expect(Self.replay(false, [10, 16]) == nil)
        #expect(Self.replay(true, [-10, -16]) == nil)
        #expect(Self.replay(false, [80]) == true)
        #expect(Self.replay(false, [-30]) == nil)
    }

    /// Behavior 3: off rests the knob at the track's leading end and on at its trailing end, and under right to left the
    /// switch mirrors with the row, so a drag toward the left, the trailing end there, turns it on.
    @Test func theSwitchMirrorsUnderRightToLeft() throws {
        #expect(DSToggleAppearance.restProgress(isOn: false) == 0)
        #expect(DSToggleAppearance.restProgress(isOn: true) == 1)
        #expect(DSToggleAppearance.inlineTranslation(-20, layoutDirection: .rightToLeft) == 20)
        #expect(DSToggleAppearance.inlineTranslation(-20, layoutDirection: .leftToRight) == -20)
        let leftward = DSToggleAppearance.inlineTranslation(-20, layoutDirection: .rightToLeft)
        let progress = DSToggleAppearance.dragProgress(isOn: false, translation: leftward, travel: 32)
        #expect(DSToggleAppearance.dragCommit(isOn: false, progress: progress) == true)
        let rightward = DSToggleAppearance.inlineTranslation(20, layoutDirection: .rightToLeft)
        #expect(DSToggleAppearance.dragProgress(isOn: false, translation: rightward, travel: 32) == 0)
        let behavior = try #require(spec.document["behavior"]?.listValue).compactMap(\.stringValue)
        #expect(behavior.contains { $0.hasPrefix("Which end is on: off rests the knob at the track's leading end, on at its trailing end") })
    }

    /// A drag replayed as the pointer's inline travel at each move, and what its release commits.
    static func replay(_ isOn: Bool, _ path: [CGFloat], travel: CGFloat = 32) -> Bool? {
        var progress = DSToggleAppearance.restProgress(isOn: isOn)
        for translation in path {
            progress = DSToggleAppearance.dragProgress(isOn: isOn, translation: translation, travel: travel)
        }
        return DSToggleAppearance.dragCommit(isOn: isOn, progress: progress)
    }

    // MARK: - The name (ADR-0041)

    /// The switch is named by its own `label`, with its own `labelVisibility`, when it is given one — inside a host too;
    /// otherwise by the pair its host hands over, whole; and with neither it has no name, which its body reports in
    /// development. A name of nothing but white space is no name. The web's `controlName` answers the same table
    /// (`toggle.test.tsx`), and `DSToggleAccessibilityTreeTests` reads both routes off the simulator.
    @Test func theNameIsTheLabelOrTheHostsPair() {
        let english = Self.english
        let hosted = DSControlName(label: .verbatim("Route layer"), labelVisibility: .hidden)

        let own = DSControlNaming.name(label: .verbatim("Night shading"), labelVisibility: .hidden, hosted: nil)
        #expect(own?.label.resolved(locale: english) == "Night shading")
        #expect(own?.isDrawn == false)
        #expect(DSControlNaming.isNamed(own, locale: english))

        let kept = DSControlNaming.name(label: .verbatim("Night shading"), labelVisibility: .visible, hosted: hosted)
        #expect(kept?.label.resolved(locale: english) == "Night shading")
        #expect(kept?.isDrawn == true)

        // A switch given no label has no visibility of its own to split the host's pair with.
        let taken = DSControlNaming.name(label: nil, labelVisibility: .visible, hosted: hosted)
        #expect(taken?.label.resolved(locale: english) == "Route layer")
        #expect(taken?.labelVisibility == .hidden)

        #expect(DSControlNaming.name(label: nil, labelVisibility: .visible, hosted: nil) == nil)
        #expect(!DSControlNaming.isNamed(nil, locale: english))
        let blank = DSControlName(label: .verbatim(" \n"), labelVisibility: .hidden)
        #expect(!DSControlNaming.isNamed(blank, locale: english))
        #expect(DSControlNaming.unnamed("Toggle").hasPrefix("Toggle: the control has no name."))
    }

    /// ADR-0032: every word Toggle speaks is its `label`, and the switch's own words are the platform's; the spec names no
    /// string of its own.
    @Test func toggleOwnsNoString() {
        #expect(spec.text.matches(of: /strings\.([A-Za-z]+)\.([A-Za-z]+)/).isEmpty)
        #expect(!DSStrings.keys.contains { $0.hasPrefix("Toggle.") })
    }

    // MARK: - The examples

    /// Every row of `DSToggleExamples` is the example the spec writes under that id: the props, with the spec's defaults
    /// where the entry writes none, and where it is staged, on the page or inside a Surface over a backdrop. `hasGlass`,
    /// which the snapshots take under forced Reduce Transparency, is held to the spec: an example renders glass when its
    /// Surface is glass.
    @Test func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSToggleExamples.rows.map(\.id))
        #expect(DSToggleExamples.rows.count == 8)
        for (entry, row) in zip(entries, DSToggleExamples.rows) {
            let props = entry.value["props"]
            #expect(row.label == props?["label"]?.stringValue, "\(row.id)")
            #expect(String(row.isOn) == (try prop("isOn", of: entry)), "\(row.id)")
            #expect(row.labelVisibility.rawValue == (try prop("labelVisibility", of: entry)), "\(row.id)")
            #expect(String(row.isDisabled) == (try prop("isDisabled", of: entry)), "\(row.id)")

            let surface = entry.value["surface"]?.stringValue
            let backdrop = entry.value["backdrop"]?.stringValue ?? DSBackdropKind.none.rawValue
            #expect(row.surface?.rawValue == surface, "\(row.id): staged on \(String(describing: row.surface)), spec \(surface ?? "page")")
            #expect(row.backdrop.rawValue == backdrop, "\(row.id): over \(row.backdrop), spec \(backdrop)")
            let isGlass = surface.flatMap(DSSurfaceMaterial.init(rawValue:))?.isGlass ?? false
            #expect(row.example.hasGlass == isGlass, "\(row.id)")
        }
        #expect(DSToggleExamples.all.filter(\.hasGlass).map(\.name) == ["on-glass-over-map"])
    }

    // MARK: - Accessibility

    /// `DSToggleNameCase.all`, the table both stacks assert: every example is named by its `label` byte for byte, drawn
    /// exactly where the table says, and carries its value and its enabled state. `label-ru` is the Cyrillic name, 47
    /// scalars and 90 UTF-8 bytes, in NFC.
    @Test func everyExampleIsNamedAsTheTableSays() throws {
        #expect(DSToggleNameCase.all.map(\.id) == DSToggleExamples.rows.map(\.id))
        for (row, want) in zip(DSToggleExamples.rows, DSToggleNameCase.all) {
            let name = DSControlNaming.name(label: .verbatim(row.label), labelVisibility: row.labelVisibility, hosted: nil)
            let resolved = name?.label.resolved(locale: Self.english)
            #expect(resolved.map { Array($0.utf8) } == Array(want.name.utf8), "\(row.id): named \(resolved.debugDescription)")
            #expect(name?.isDrawn == want.isLabelDrawn, "\(row.id)")
            #expect(DSControlNaming.isNamed(name, locale: Self.english), "\(row.id)")
            #expect(row.isOn == want.isOn, "\(row.id)")
            #expect(row.isDisabled == want.isDisabled, "\(row.id)")
            #expect(want.name == want.name.trimmingCharacters(in: .whitespacesAndNewlines), "\(row.id)")
        }
        #expect(DSToggleNameCase.all.map { Array($0.name.utf8).count } == DSToggleNameCase.nameBytes)
        let russian = try #require(DSToggleNameCase.all.first { $0.id == "label-ru" }?.name)
        #expect(russian.unicodeScalars.count == 47)
        #expect(russian == russian.precomposedStringWithCanonicalMapping)
    }

    // MARK: - Helpers

    /// The dotted path of the cell a key sequence reaches, falling back to `default` at each level as `DSSpec.cell`
    /// does, or nil where the property is not set for those keys.
    private func reached(_ path: String, _ keys: [any DSSpecKey]) throws -> String? {
        var current: DSSpecValue? = try spec.binding(path)
        var at = path
        for key in keys {
            guard case .map(let mapping) = current else { break }
            if let value = mapping[key.specKey] {
                current = value
                at += ".\(key.specKey)"
            } else if let value = mapping["default"] {
                current = value
                at += ".default"
            } else {
                return nil
            }
        }
        guard case .scalar = current else { return nil }
        return at
    }

    /// The spec's `examples`, each with its id.
    private func examples() throws -> [(id: String, value: DSSpecValue)] {
        let list = try #require(spec.document["examples"]?.listValue, "Toggle.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's entry in `props`.
    private func propEntry(_ name: String) throws -> DSSpecValue {
        let props = try #require(spec.document["props"]?.listValue)
        return try #require(props.first { $0["name"]?.stringValue == name }, "Toggle.yaml has no prop \(name)")
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        try propEntry(name)["default"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
