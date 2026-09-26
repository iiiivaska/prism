import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// What every IconButton example is named, byte for byte, on both stacks, read in `en_US` under `DSStrings.english`.
///
/// Apple publishes `label` as the button's accessibility label and the badge's contribution, when there is one, as its
/// accessibility value. A button has no value on the web, so the web's computed name is the label followed by `", "`
/// and the value (`iconButtonValueSeparator`, IconButton.yaml `notes.platform.web-desktop`): the two stacks agree when
/// the web's name is Apple's label, then `", "`, then Apple's value.
///
/// The same table is asserted three times: here, off the pure functions; off the simulator's accessibility tree
/// (`DSIconButtonAccessibilityTreeTests`, DSSnapshotTests); and off Chromium's tree for every IconButton story
/// (`web/apps/gallery/test/accessibility.browser.test.tsx`). Every example is one element with the button role; the
/// selected one also carries the selected trait (`aria-current="true"` on the web) and the disabled one is not enabled.
nonisolated struct DSIconButtonNameCase: Sendable {
    let id: String
    /// The accessibility label: the example's `label`, never decorated.
    let label: String
    /// The accessibility value: the badge's contribution, or nil when the example has no badge.
    let value: String?
    let isSelected: Bool
    let isDisabled: Bool

    init(_ id: String, _ label: String, value: String? = nil, isSelected: Bool = false, isDisabled: Bool = false) {
        self.id = id
        self.label = label
        self.value = value
        self.isSelected = isSelected
        self.isDisabled = isDisabled
    }

    /// The web's computed name for the same example.
    var webName: String { value.map { "\(label), \($0)" } ?? label }

    static let all: [DSIconButtonNameCase] = [
        DSIconButtonNameCase("secondary-md", "Open settings"),
        DSIconButtonNameCase("primary-md", "Add a site"),
        DSIconButtonNameCase("ghost-md", "Filter results"),
        DSIconButtonNameCase("plain-sm", "Open details"),
        DSIconButtonNameCase("danger-md", "Delete route"),
        DSIconButtonNameCase("selected-in-group", "Map view", isSelected: true),
        DSIconButtonNameCase("lg-touch", "Start the run"),
        DSIconButtonNameCase("disabled", "Refresh readings", isDisabled: true),
        DSIconButtonNameCase("on-vivid", "Open the yield card"),
        DSIconButtonNameCase("on-glass-over-map", "Center on the vehicle"),
        DSIconButtonNameCase("label-ru", "Обновить показания линии"),
        DSIconButtonNameCase("with-badge", "Open notifications", value: "3 unread"),
    ]

    /// The UTF-8 byte count of each label, in table order: the Cyrillic name is 24 code points and 46 bytes.
    static let labelBytes = [13, 10, 14, 12, 12, 8, 13, 16, 19, 21, 46, 18]
}

/// `spec/components/IconButton.yaml` specVersion 3: the binding matrix keyed by variant and published material, the
/// selected cells, the sizes per density, the badge's offset, the press and select motion, the hit region, the rules
/// the spec states as prose, the examples as the spec writes them, and the name and value of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/icon-button.test.tsx` says about `IconButton.css`: the appearance function's
/// answer for a set of keys is the token the spec's cell names. No key path is written on the expected side, and
/// `everyCellOfTheMatrixIsAsked` holds the loops to the whole matrix, so a cell the spec adds, or a material key it
/// adds that no loop reaches, fails here until a test asks it.
///
/// What the simulator publishes to VoiceOver is measured by `DSIconButtonAccessibilityTreeTests`, what a press draws
/// under Reduce Motion by `DSIconButtonReduceMotionTests`, and what every example draws by the snapshot matrix, all in
/// DSSnapshotTests.
@Suite("IconButton bindings (IconButton.yaml v3)")
struct DSIconButtonBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("IconButton")
    }

    static func tokens(
        scheme: DSColorScheme = .light,
        density: DSDensity = .regular,
        modality: DSModality = .touch,
        motion: DSMotionMode = .standard
    ) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, colorScheme: scheme, density: density, modality: modality, motion: motion))
    }

    /// Every material a Surface can publish. A cell keyed by one applies when the enclosing Surface publishes it
    /// (ADR-0022 §3.1), so every material is asked, including those where a matrix falls back to `default`.
    static let materials = DSSurfaceMaterial.allCases

    /// The densities the spec lists (`density`), never `.watch`: watchOS is `none`.
    static let densities: [DSDensity] = [.compact, .regular, .comfortable]

    /// The locale the snapshots render in and the name table is read in (`DSSnapshotRendering.locale`).
    static let english = Locale(identifier: "en_US")

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSIconButton`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default` at
    /// every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 3)
        #expect(try spec.propValues("variant") == DSIconButtonVariant.allCases.map(\.rawValue))
        #expect(try spec.propValues("size") == DSIconButtonSize.allCases.map(\.rawValue))
        #expect(try propDefault("variant") == DSIconButtonVariant.secondary.rawValue)
        #expect(try propDefault("size") == DSIconButtonSize.md.rawValue)
        #expect(try propDefault("isSelected") == "false")
        #expect(try propDefault("isDisabled") == "false")
        #expect(try propType("badge") == "slot")
        #expect(try propType("glyph") == "icon")
        #expect(try spec.actionProps == ["onPress"])

        let variants = Set(DSIconButtonVariant.allCases.map(\.rawValue))
        let materials = Set(Self.materials.map(\.rawValue))
        for property in [
            "root.background", "root.underlay", "root.border", "root.borderWidth", "root.pressed.background",
            "root.pressed.overlay", "icon.color",
        ] {
            let keys = Set(try spec.keys(at: property)).subtracting(["default"])
            #expect(!keys.isEmpty && keys.isSubset(of: variants), "\(property) is keyed by \(keys.sorted())")
        }
        for property in [
            "root.background.primary", "root.background.secondary", "root.underlay.danger", "root.border.secondary",
            "root.border.ghost", "root.pressed.background.primary", "root.pressed.background.secondary",
            "root.pressed.background.ghost", "root.pressed.background.plain", "root.selected.background",
            "icon.color.primary", "icon.color.secondary", "icon.color.ghost", "icon.color.plain", "icon.selected.color",
        ] {
            let keys = Set(try spec.keys(at: property)).subtracting(["default"])
            #expect(!keys.isEmpty && keys.isSubset(of: materials), "\(property) is keyed by \(keys.sorted())")
        }
        #expect(try spec.keys(at: "root.size") == DSIconButtonSize.allCases.map(\.rawValue))
        #expect(try spec.keys(at: "icon.size") == DSIconButtonSize.allCases.map(\.rawValue))

        let states = try #require(spec.document["states"]?.listValue).compactMap(\.stringValue)
        #expect(states == ["default", "hover", "pressed", "selected", "focus-visible", "disabled"])
        let density = try #require(spec.document["density"]?.listValue).compactMap(\.stringValue)
        #expect(density == Self.densities.map(\.rawValue))
        // watchOS is `none`, so the manifest carries no watch key (`DSComponentsContractTests` holds the rest).
        #expect(try spec.platforms["watchos"] == "none")
        #expect(DSComponentsManifest.implemented["IconButton"]?["watchos"] == nil)
    }

    /// Every cell of `tokens` is one the tests below reach: the matrix, walked out of the spec, is exactly the cells the
    /// loops over the variants, the published materials and the sizes arrive at, falling back to `default` as the
    /// grammar does. A cell the spec adds, or a key no loop reaches, fails here until a test binds it.
    @Test func everyCellOfTheMatrixIsAsked() throws {
        var asked: Set<String> = []
        func reach(_ path: String, _ keys: [any DSSpecKey]) throws {
            if let reached = try reached(path, keys) { asked.insert(reached) }
        }
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                for path in [
                    "root.background", "root.underlay", "root.border", "root.pressed.background", "icon.color",
                ] {
                    try reach(path, [variant, material])
                }
                for path in ["root.borderWidth", "root.pressed.overlay"] {
                    try reach(path, [variant])
                }
            }
            try reach("root.selected.background", [material])
            try reach("icon.selected.color", [material])
        }
        for size in DSIconButtonSize.allCases {
            try reach("root.size", [size])
            try reach("icon.size", [size])
        }
        for path in [
            "root.radius", "root.hover.overlay", "root.disabled.opacity", "root.focus-visible.ring",
            "root.focus-visible.ringWidth", "badge.offset",
        ] {
            try reach(path, [])
        }
        let written = try spec.allBindings().map(\.path)
        #expect(Set(written) == asked, "unasked: \(Set(written).subtracting(asked).sorted()); asked and absent: \(asked.subtracting(written).sorted())")
        #expect(written.count == Set(written).count, "a cell is written twice")
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: every variant on every published material — the primary circle's white on vivid
    /// (ADR-0030 §3.1), its inverse solid on both glasses (ADR-0040 §1) and its knockout on inverse and accent (§3), the
    /// secondary puck's absent cell on those two, and the ghost's and plain's absent cell (ADR-0029 §3.3) included.
    @Test func backgroundCells() throws {
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                try spec.binds(DSIconButtonAppearance.background(variant, on: material), at: "root.background", variant, material)
            }
        }
        #expect(DSIconButtonAppearance.background(.plain, on: .page) == nil)
        #expect(DSIconButtonAppearance.background(.ghost, on: .vivid) == nil)
        #expect(DSIconButtonAppearance.background(.secondary, on: .inverse) == nil)
        // On both glasses the one solid is the circle the page draws: ink on light glass, white on smoke (ADR-0040 §1).
        for material in [DSSurfaceMaterial.glass, .glassLight] {
            #expect(DSIconButtonAppearance.background(.primary, on: material) == DSIconButtonAppearance.background(.primary, on: .page), "\(material)")
            #expect(DSIconButtonAppearance.foreground(.primary, on: material) == DSIconButtonAppearance.foreground(.primary, on: .page), "\(material)")
        }
    }

    /// `tokens.root.underlay`: the page disc under the danger tint on vivid, on both glasses, on inverse and on accent,
    /// and nothing on the solid ladder (ADR-0030 rule 6, ADR-0040 §3) — the cell Button.yaml keys the same way.
    @Test func underlayCells() throws {
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                try spec.binds(DSIconButtonAppearance.underlay(variant, on: material), at: "root.underlay", variant, material)
            }
            #expect(DSIconButtonAppearance.underlay(.danger, on: material) == DSButtonAppearance.underlay(.danger, on: material), "\(material)")
        }
    }

    /// `tokens.root.border` and `tokens.root.borderWidth`: the ring's colour on every published material, and its width,
    /// which the spec keys by variant alone (ADR-0033 rule 4: `border.hairline`). The width is asked on every material
    /// too, because the view reads it wherever it strokes, and wherever a ring is drawn it has a width.
    @Test func borderCells() throws {
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                try spec.binds(DSIconButtonAppearance.border(variant, on: material), at: "root.border", variant, material)
                try spec.binds(DSIconButtonAppearance.borderWidth(variant), at: "root.borderWidth", variant, material)
                #expect(
                    (DSIconButtonAppearance.border(variant, on: material) == nil) == (DSIconButtonAppearance.borderWidth(variant) == nil),
                    "\(variant) \(material)"
                )
            }
        }
        // Every ring is the hairline Button's pills draw (ADR-0033).
        for variant in DSIconButtonVariant.allCases {
            if let width = DSIconButtonAppearance.borderWidth(variant) {
                #expect(width == DSButtonAppearance.borderWidth(.secondary), "\(variant)")
            }
        }
    }

    /// `tokens.root.radius`: `radius.control`, at least half the side of the largest circle in every density the spec
    /// lists, so the rounded square is exactly the `Circle()` the view draws.
    @Test func radiusCell() throws {
        try spec.binds(DSIconButtonAppearance.radius, at: "root.radius")
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            try spec.binds(value: tokens[keyPath: DSIconButtonAppearance.radius], at: "root.radius", in: tokens)
            for size in DSIconButtonSize.allCases {
                let side = DSIconButtonAppearance.side(size, tokens.components.iconButton)
                #expect(tokens[keyPath: DSIconButtonAppearance.radius] * 2 >= side, "\(density) \(size)")
            }
        }
    }

    /// `tokens.root.size`: the side, resolved against the token set each density builds. It follows density — md is
    /// 32 pt in compact, 40 in regular, 48 in comfortable (behavior) — and not modality.
    @Test func sizeCells() throws {
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                for size in DSIconButtonSize.allCases {
                    try spec.binds(
                        value: DSIconButtonAppearance.side(size, tokens.components.iconButton), at: "root.size", size, in: tokens
                    )
                }
            }
        }
        let md = { (density: DSDensity) in DSIconButtonAppearance.side(.md, Self.tokens(density: density).components.iconButton) }
        #expect(md(.compact) == 32)
        #expect(md(.regular) == 40)
        #expect(md(.comfortable) == 48)
        for density in Self.densities {
            for size in DSIconButtonSize.allCases {
                #expect(
                    DSIconButtonAppearance.side(size, Self.tokens(density: density, modality: .touch).components.iconButton)
                        == DSIconButtonAppearance.side(size, Self.tokens(density: density, modality: .pointer).components.iconButton),
                    "\(density) \(size): the circle grows with modality"
                )
            }
        }
    }

    /// `tokens.root.hover.overlay`, `tokens.root.pressed.background` — primary's material level included — and
    /// `tokens.root.pressed.overlay`, which danger takes and the others do not.
    @Test func hoverAndPressedCells() throws {
        try spec.binds(DSIconButtonAppearance.hoverOverlay, at: "root.hover.overlay")
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                try spec.binds(
                    DSIconButtonAppearance.pressedBackground(variant, on: material), at: "root.pressed.background", variant, material
                )
                try spec.binds(DSIconButtonAppearance.pressedOverlay(variant), at: "root.pressed.overlay", variant, material)
            }
            // ADR-0039: primary's pressed fill is a role of its own on every material, never its rest fill, and the
            // press lays no overlay over the solid.
            #expect(DSIconButtonAppearance.pressedBackground(.primary, on: material) != DSIconButtonAppearance.background(.primary, on: material), "\(material)")
        }
        #expect(DSIconButtonAppearance.pressedOverlay(.primary) == nil)
    }

    /// The fill the view draws: the pressed cell while pressed, the rest cell otherwise, and the rest cell for a pressed
    /// danger circle, which has no pressed cell and keeps its tint.
    @Test func theFillFollowsThePress() {
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                let rest = DSIconButtonAppearance.background(variant, on: material)
                let pressed = DSIconButtonAppearance.pressedBackground(variant, on: material) ?? rest
                #expect(DSIconButtonAppearance.fill(variant, isSelected: false, isPressed: false, on: material) == rest, "\(variant) \(material)")
                #expect(DSIconButtonAppearance.fill(variant, isSelected: false, isPressed: true, on: material) == pressed, "\(variant) \(material)")
            }
            #expect(DSIconButtonAppearance.fill(.danger, isSelected: false, isPressed: true, on: material) == DSIconButtonAppearance.background(.danger, on: material))
        }
    }

    /// `tokens.root.selected.background` and `tokens.icon.selected.color`, on every published material.
    @Test func selectedCells() throws {
        for material in Self.materials {
            try spec.binds(DSIconButtonAppearance.selectedBackground(on: material), at: "root.selected.background", material)
            try spec.binds(DSIconButtonAppearance.selectedForeground(on: material), at: "icon.selected.color", material)
        }
    }

    /// Behavior, "`isSelected`": a selected circle renders as `primary` in every state — its `selected` cells are
    /// primary's cell for cell, it has no ring and no underlay, and when pressed it takes primary's pressed fill —
    /// whatever its variant. If the spec ever separates the `selected` cells from primary's, this fails and
    /// `DSIconButtonAppearance`'s rule is read again.
    @Test func aSelectedCircleIsPrimaryCellForCell() throws {
        for material in Self.materials {
            #expect(try spec.cell("root.selected.background", material) == (try spec.cell("root.background", DSIconButtonVariant.primary, material)), "\(material)")
            #expect(try spec.cell("icon.selected.color", material) == (try spec.cell("icon.color", DSIconButtonVariant.primary, material)), "\(material)")
            #expect(DSIconButtonAppearance.selectedBackground(on: material) == DSIconButtonAppearance.background(.primary, on: material))
            #expect(DSIconButtonAppearance.selectedForeground(on: material) == DSIconButtonAppearance.foreground(.primary, on: material))
            for variant in DSIconButtonVariant.allCases {
                let rendered = DSIconButtonAppearance.rendered(variant, isSelected: true)
                #expect(rendered == .primary)
                #expect(DSIconButtonAppearance.rendered(variant, isSelected: false) == variant)
                // The fill is the `selected` cell at rest and primary's pressed cell while pressed, as the web's
                // `[data-ds-selected]` and `[data-ds-selected][data-pressed]` fills are (ADR-0039).
                #expect(
                    DSIconButtonAppearance.fill(variant, isSelected: true, isPressed: false, on: material)
                        == DSIconButtonAppearance.selectedBackground(on: material),
                    "\(variant) \(material) at rest"
                )
                #expect(
                    DSIconButtonAppearance.fill(variant, isSelected: true, isPressed: true, on: material)
                        == DSIconButtonAppearance.pressedBackground(.primary, on: material),
                    "\(variant) \(material) pressed"
                )
                #expect(DSIconButtonAppearance.glyph(variant, isSelected: true, on: material) == DSIconButtonAppearance.foreground(.primary, on: material))
                #expect(DSIconButtonAppearance.underlay(rendered, on: material) == nil, "\(variant) \(material): a selected circle has no underlay")
                #expect(DSIconButtonAppearance.border(rendered, on: material) == nil, "\(variant) \(material): a selected circle has no ring")
                #expect(DSIconButtonAppearance.borderWidth(rendered) == nil)
                #expect(DSIconButtonAppearance.pressedOverlay(rendered) == DSIconButtonAppearance.pressedOverlay(.primary))
            }
            // A pressed selected circle is a pressed primary circle: the same fill, and neither lays an overlay.
            #expect(
                DSIconButtonAppearance.fill(.ghost, isSelected: true, isPressed: true, on: material)
                    == DSIconButtonAppearance.fill(.primary, isSelected: false, isPressed: true, on: material),
                "\(material)"
            )
        }
    }

    /// `tokens.root.disabled.opacity` and `tokens.root.focus-visible.*`: the cells no appearance function returns,
    /// because the view applies them itself (`.opacity(…)` and `DSFocusRing`). They are pinned as key paths so a spec
    /// that moves them fails on this side too; what the ring actually draws is the simulator's job.
    @Test func theCellsTheViewAppliesItself() throws {
        #expect(try spec.number("root.disabled.opacity") == \DSTokenSet.opacity.disabled)
        #expect(try spec.color("root.focus-visible.ring") == \DSTokenSet.color.borderFocus)
        #expect(try spec.dimension("root.focus-visible.ringWidth") == \DSTokenSet.border.focus)
    }

    // MARK: - tokens.icon

    /// `tokens.icon.size`: Icon's box of the same name, which `DSIcon` resolves from `iconSize`, asked in every density:
    /// the glyph is the same box in each (Icon.yaml behavior 10).
    @Test func iconSizeCells() throws {
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            for size in DSIconButtonSize.allCases {
                let box = DSIconAppearance.box(DSIconButtonAppearance.iconSize(size), tokens.size)
                try spec.binds(value: box, at: "icon.size", size, in: tokens)
                #expect(box == DSIconAppearance.registrySize(DSIconButtonAppearance.iconSize(size)).box, "\(density) \(size)")
            }
        }
        #expect(DSIconButtonAppearance.iconSize(.md) == DSButtonAppearance.iconSize, "a control glyph is the md box")
    }

    /// `tokens.icon.color`: the glyph's colour for every variant on every published material.
    @Test func iconColorCells() throws {
        for material in Self.materials {
            for variant in DSIconButtonVariant.allCases {
                try spec.binds(DSIconButtonAppearance.foreground(variant, on: material), at: "icon.color", variant, material)
                #expect(DSIconButtonAppearance.glyph(variant, isSelected: false, on: material) == DSIconButtonAppearance.foreground(variant, on: material))
            }
        }
    }

    // MARK: - tokens.badge

    /// `tokens.badge.offset`: `space.1`, the host's (Badge.yaml behavior 13), the same in every density.
    @Test func badgeOffsetCell() throws {
        try spec.binds(DSIconButtonAppearance.badgeOffset, at: "badge.offset")
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            try spec.binds(value: tokens[keyPath: DSIconButtonAppearance.badgeOffset], at: "badge.offset", in: tokens)
        }
        #expect(throws: DSSpecMismatch.self) { try DSSpec.component("Badge").cell("root.offset") }
    }

    // MARK: - motion and haptics

    /// `motion.press` is the snappy spring, `motion.select` the smooth one, and `motion.reduceMotion` is `crossfade`:
    /// under Reduce Motion nothing scales and the fills change over `motion.duration.base` with `motion.easing.out`.
    @Test @MainActor func motionCells() throws {
        try spec.binds(DSIconButtonAppearance.pressSpring, at: "motion.press")
        try spec.binds(DSIconButtonAppearance.selectSpring, at: "motion.select")
        #expect(try spec.cell("motion.reduceMotion") == DSIconButtonAppearance.reduceMotion.rawValue)

        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        let snappy = Self.tokens()[keyPath: DSIconButtonAppearance.pressSpring]
        let smooth = Self.tokens()[keyPath: DSIconButtonAppearance.selectSpring]
        #expect(DSIconButtonAppearance.pressAnimation(standard) == snappy.animation)
        #expect(DSIconButtonAppearance.selectAnimation(standard) == smooth.animation)
        let fade = reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        #expect(DSIconButtonAppearance.pressAnimation(reduced) == fade)
        #expect(DSIconButtonAppearance.selectAnimation(reduced) == fade)
        #expect(abs(DSControlAppearance.scale(isPressed: true, motion: standard) - 0.97) < 0.000_1)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
    }

    /// `haptics`: one haptic per press, `haptic.press.button`, and no selection haptic — a group that selects plays
    /// `haptic.selection` in its place (behavior; spec/haptics.yaml: at most one haptic per user action, none on a
    /// programmatic change such as `isSelected`).
    @Test func oneHapticPerPress() throws {
        let haptics = try #require(spec.document["haptics"]?.mapValue)
        #expect(haptics.keys == ["press"])
        #expect(haptics["press"]?.stringValue == DSIconButtonAppearance.pressHaptic.rawValue)
        #expect(DSIconButtonAppearance.pressHaptic == .pressButton)
    }

    // MARK: - Behavior

    /// The hit region is the larger of the circle and `size.hit` on each axis (behavior 2): 44 pt under touch, 28 under
    /// pointer, and the circle itself never grows. `plain-sm`'s 24 pt circle under touch reaches 44.
    @Test func hitRegionReachesSizeHit() {
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                for size in DSIconButtonSize.allCases {
                    let side = DSIconButtonAppearance.side(size, tokens.components.iconButton)
                    let outset = DSControlAppearance.hitOutset(visual: CGSize(width: side, height: side), hit: tokens.size.hit)
                    #expect(side + 2 * outset.width == max(side, tokens.size.hit), "\(density) \(modality) \(size)")
                    #expect(side + 2 * outset.height == max(side, tokens.size.hit), "\(density) \(modality) \(size)")
                }
            }
        }
        #expect(Self.tokens(modality: .touch).size.hit == 44)
        #expect(Self.tokens(modality: .pointer).size.hit == 28)
    }

    /// Hover exists only under pointer modality, and only on a control that takes input (behavior).
    @Test func hoverIsPointerOnly() {
        let pointer = Self.tokens(modality: .pointer).interaction
        let touch = Self.tokens(modality: .touch).interaction
        #expect(DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: touch, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: false))
    }

    /// The circle and the glyph box do not scale with Dynamic Type (`accessibility.dynamicType`), do not grow with
    /// modality, and do not move for a badge (behavior): an example lays out to the same size at Large and at
    /// accessibility5, under touch and under pointer, and with its badge or without it.
    ///
    /// Measured as the size of an `ImageRenderer` render, which the host lays out correctly even though it paints no
    /// token colour (`DSRenderCapability`): this reads layout, never a pixel.
    @Test @MainActor func theCircleIsItsSideAndNothingElse() throws {
        func size(_ view: some View) throws -> CGSize {
            let renderer = ImageRenderer(content: DSTheme { view })
            renderer.scale = 1
            let image = try #require(renderer.cgImage)
            return CGSize(width: image.width, height: image.height)
        }
        for density in Self.densities {
            let side = DSIconButtonAppearance.side(.md, Self.tokens(density: density).components.iconButton)
            let button = DSIconButton("Open settings", glyph: .actionSettings) {}
            let large = try size(button.dynamicTypeSize(.large).dsDensity(density))
            #expect(large == CGSize(width: side, height: side), "\(density): the circle lays out at \(large)")
            #expect(try size(button.dynamicTypeSize(.accessibility5).dsDensity(density)) == large, "\(density): the circle scales with Dynamic Type")
            #expect(try size(button.dsModality(.pointer).dsDensity(density)) == large, "\(density): the circle grows with modality")
            let badged = DSIconButton("Open notifications", glyph: .objectNotification, badge: DSBadge(count: 128, label: "unread")) {}
            #expect(try size(badged.dsDensity(density)) == large, "\(density): the badge moves the circle's layout")
        }
    }

    // MARK: - The badge's value

    /// The value a badge contributes to the button is Badge's own contribution — `strings.Badge.count` filled with the
    /// true count and the badge's label, or the formatted count alone with no label — read through the host's `locale`
    /// and `strings` (behavior, ADR-0032 rules 4, 9 and 10). A badge that renders nothing contributes nothing.
    @Test func theBadgeContributesItsOwnWords() {
        let english = Self.english
        #expect(DSBadge(count: 3, label: "unread").contribution(locale: english, strings: .english) == "3 unread")
        #expect(DSBadge(count: 128, max: 99, label: "unread").contribution(locale: english, strings: .english) == "128 unread")
        #expect(DSBadge(count: 3).contribution(locale: english, strings: .english) == "3")
        #expect(DSBadge(count: 3, label: "  ").contribution(locale: english, strings: .english) == "3")
        #expect(DSBadge(count: 0, label: "unread").contribution(locale: english, strings: .english) == nil)
        #expect(DSBadge(label: "unread").contribution(locale: english, strings: .english) == nil)
        #expect(DSBadge(variant: .dot, label: "new").contribution(locale: english, strings: .english) == "new")
        #expect(DSBadge(variant: .dot).contribution(locale: english, strings: .english) == nil)
        #expect(DSBadge(count: 1234, max: 9999, label: "queued runs").contribution(locale: Locale(identifier: "de_DE"), strings: .english) == "1.234 queued runs")
        #expect(DSBadge(count: 3, label: "unread").contribution(locale: english, strings: DSStrings(badgeCount: "{label}: {count}")) == "unread: 3")
        // The same function the badge names itself with when it stands alone.
        #expect(
            DSBadge(count: 3, label: "unread").contribution(locale: english, strings: .english)
                == DSBadgeAppearance.contribution(.count, count: 3, label: "unread", locale: english, strings: .english)
        )
    }

    // MARK: - The examples

    /// Every row of `DSIconButtonExamples` is the example the spec writes under that id: the props, with the spec's
    /// defaults where the entry writes none, the badge its slot holds (Badge's defaults filled in), and the Surface and
    /// backdrop it declares.
    ///
    /// The snapshot harness never reads the spec, so this is what keeps a hand-written row from staging an example on
    /// another surface, or rendering other props, than the web story generated from the same entry.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let badgeSpec = try DSSpec.component("Badge")
        let entries = try examples()
        #expect(entries.map(\.id) == DSIconButtonExamples.rows.map(\.id))
        #expect(DSIconButtonExamples.rows.count == 12)
        for (entry, row) in zip(entries, DSIconButtonExamples.rows) {
            #expect(row.variant.rawValue == (try prop("variant", of: entry)), "\(row.id)")
            #expect(row.size.rawValue == (try prop("size", of: entry)), "\(row.id)")
            #expect(row.glyph.rawValue == (try prop("glyph", of: entry)), "\(row.id)")
            #expect(row.label == (try prop("label", of: entry)), "\(row.id)")
            #expect(String(row.isSelected) == (try prop("isSelected", of: entry)), "\(row.id)")
            #expect(String(row.isDisabled) == (try prop("isDisabled", of: entry)), "\(row.id)")
            let surface = entry.value["surface"]?.stringValue
            #expect(row.surface?.rawValue == (surface == "page" ? nil : surface), "\(row.id): staged on \(String(describing: row.surface)), spec \(surface ?? "page")")
            #expect(row.backdrop.rawValue == (entry.value["backdrop"]?.stringValue ?? DSBackdropKind.none.rawValue), "\(row.id)")
            #expect(row.example.hasGlass == (row.surface?.isGlass ?? false), "\(row.id)")

            // The slot: a Badge written in SCHEMA's mapping form, read against Badge.yaml's own defaults.
            let written = entry.value["props"]?["badge"]
            #expect((written == nil) == (row.badge == nil), "\(row.id): the badge slot")
            if let written, let badge = row.badge {
                let known: Set<String> = ["variant", "tone", "emphasis", "count", "max", "label"]
                let keys = Set(try #require(written.mapValue, "\(row.id): the badge is not a mapping").keys)
                #expect(keys.isSubset(of: known), "\(row.id): the badge writes \(keys.subtracting(known).sorted())")
                func badgeProp(_ name: String) throws -> String? {
                    try written[name]?.stringValue ?? Self.propDefault(name, in: badgeSpec)
                }
                #expect(badge.variant.rawValue == (try badgeProp("variant")), "\(row.id)")
                #expect(badge.tone.rawValue == (try badgeProp("tone")), "\(row.id)")
                #expect(badge.emphasis.rawValue == (try badgeProp("emphasis")), "\(row.id)")
                #expect(badge.count.map { String($0) } == (try badgeProp("count")), "\(row.id)")
                #expect(String(badge.max) == (try badgeProp("max")), "\(row.id)")
                #expect(badge.label == (try badgeProp("label")), "\(row.id)")
            }
        }
        #expect(DSIconButtonExamples.all.filter(\.hasGlass).map(\.name) == ["on-glass-over-map"])
        #expect(DSIconButtonExamples.rows.filter { $0.badge != nil }.map(\.id) == ["with-badge"])
    }

    // MARK: - Accessibility

    /// `DSIconButtonNameCase.all`, the table both stacks assert: every example is named by its `label`, byte for byte —
    /// never the glyph's registry id — and carries the badge's contribution as its value where it has a badge.
    /// `label-ru` is the Cyrillic name, 24 code points and 46 UTF-8 bytes, in NFC.
    @Test @MainActor func everyExampleIsNamedAsTheTableSays() throws {
        #expect(DSIconButtonNameCase.all.map(\.id) == DSIconButtonExamples.rows.map(\.id))
        for (row, want) in zip(DSIconButtonExamples.rows, DSIconButtonNameCase.all) {
            #expect(Array(row.label.utf8) == Array(want.label.utf8), "\(row.id): named \(row.label.debugDescription)")
            #expect(row.label != row.glyph.rawValue, "\(row.id): named by its glyph")
            #expect(DSIconAppearance.resolved(LocalizedStringKey(row.label), locale: Self.english) == want.label, "\(row.id): the key resolves to another name")
            let value = row.badge?.badge.contribution(locale: Self.english, strings: .english)
            #expect(value.map { Array($0.utf8) } == want.value.map { Array($0.utf8) }, "\(row.id): value \(String(describing: value))")
            #expect(row.isSelected == want.isSelected, "\(row.id)")
            #expect(row.isDisabled == want.isDisabled, "\(row.id)")
            #expect(want.label == want.label.trimmingCharacters(in: .whitespacesAndNewlines), "\(row.id)")
        }
        #expect(DSIconButtonNameCase.all.map { Array($0.label.utf8).count } == DSIconButtonNameCase.labelBytes)
        let russian = try #require(DSIconButtonNameCase.all.first { $0.id == "label-ru" }).label
        #expect(russian.unicodeScalars.count == 24)
        #expect(russian == russian.precomposedStringWithCanonicalMapping)
        #expect(russian.unicodeScalars.allSatisfy { $0 == " " || (0x0410...0x044F).contains($0.value) })
        let badged = try #require(DSIconButtonNameCase.all.first { $0.id == "with-badge" })
        #expect(badged.webName == "Open notifications, 3 unread")
        #expect(Array(badged.webName.utf8).count == 28)
    }

    /// ADR-0032: IconButton owns no string. Its name is the caller's `label`, selection and disablement are carried by
    /// the platform with no word, and the only template it speaks is Badge's `strings.Badge.count`, filled by Badge.
    @Test func iconButtonOwnsNoString() throws {
        let named = Set(spec.text.matches(of: /strings\.([A-Za-z]+)\.([A-Za-z]+)/).map { "\($0.1).\($0.2)" })
        #expect(named == ["Badge.count"])
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
        let list = try #require(spec.document["examples"]?.listValue, "IconButton.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's entry in a spec.
    private static func propEntry(_ name: String, in spec: DSSpec) throws -> DSSpecValue {
        let props = try #require(spec.document["props"]?.listValue)
        return try #require(props.first { $0["name"]?.stringValue == name }, "\(spec.file) has no prop \(name)")
    }

    /// A prop's `default` in a spec, as it writes it.
    private static func propDefault(_ name: String, in spec: DSSpec) throws -> String? {
        try propEntry(name, in: spec)["default"]?.stringValue
    }

    private func propDefault(_ name: String) throws -> String? {
        try Self.propDefault(name, in: spec)
    }

    private func propType(_ name: String) throws -> String? {
        try Self.propEntry(name, in: spec)["type"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
