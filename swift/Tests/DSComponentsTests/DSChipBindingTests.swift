import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// What every Chip example is named and exposes, byte for byte, on both stacks, read in `en_US` under
/// `DSStrings.english`.
///
/// The same table is asserted three times: here, off the pure functions; off the simulator's accessibility tree
/// (`DSChipAccessibilityTreeTests`, DSSnapshotTests); and off Chromium's tree for every Chip story
/// (`web/apps/gallery/test/accessibility.browser.test.tsx`), with the web's own copy of the rows in
/// `web/packages/react/test/chip.test.tsx`. Every example is one control named by its label — a filter where it sets
/// `isSelected`, carrying that state (the selected trait here, `aria-pressed` on the web), a button otherwise — and a
/// removable one is a second button named by `strings.Chip.remove`. The glyphs, the check and the Avatar are no element.
nonisolated struct DSChipNameCase: Sendable {
    let id: String
    /// The chip's accessible name: its `label`, as written.
    let name: String
    /// The filter's state, or nil for a button chip.
    let isSelected: Bool?
    /// The remove control's name, or nil for a chip that is not removable.
    let remove: String?
    let isDisabled: Bool
    /// Whether the pill renders the glass chip where the example stages it, at standard settings.
    let rendersGlass: Bool

    init(_ id: String, _ name: String, selected: Bool? = nil, remove: String? = nil, disabled: Bool = false, glass: Bool = false) {
        self.id = id
        self.name = name
        self.isSelected = selected
        self.remove = remove
        self.isDisabled = disabled
        self.rendersGlass = glass
    }

    static let all: [DSChipNameCase] = [
        DSChipNameCase("default-sm", "Last 24 hours"),
        DSChipNameCase("selected", "Last 24 hours", selected: true),
        DSChipNameCase("with-leading-icon", "Routes"),
        DSChipNameCase("removable", "North yard", remove: "Remove North yard"),
        DSChipNameCase("identifier-copy", "B-4417"),
        DSChipNameCase("md-size", "Depots"),
        DSChipNameCase("disabled", "Last 24 hours", disabled: true),
        DSChipNameCase("md-with-avatar", "Anna Petrova"),
        DSChipNameCase("on-map", "Depots", glass: true),
        DSChipNameCase("selected-on-map", "Depots", selected: true, glass: true),
        DSChipNameCase("on-vivid", "Yield", glass: true),
        DSChipNameCase("on-glass-over-image", "In service", glass: true),
        // "Последние 24 часа": 17 scalars, 30 bytes of UTF-8, in NFC.
        DSChipNameCase("russian-label", "Последние 24 часа", selected: true),
    ]

    /// The UTF-8 byte count of each name, in table order.
    static let nameBytes = [13, 13, 6, 10, 6, 6, 13, 12, 6, 6, 5, 10, 30]
}

/// `spec/components/Chip.yaml` specVersion 1: the pill as the Surface module's glass chip — `root.background` on every
/// ground, and the recipe, the fallback and the context it publishes — the stroke and the parts' cells on every context
/// the chip can publish, at rest and selected, the sizes per density, the layers, the motion, the role, the leading and
/// trailing positions, the remove control's name, the Avatar the pill encloses (ADR-0037 rule 4), the examples as the
/// spec writes them, and the name of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/chip.test.tsx` says about `Chip.css`: the appearance function's answer for a set
/// of keys is the token the spec's cell names. No key path is written on the expected side, and
/// `everyCellOfTheMatrixIsAsked` holds the loops to the whole matrix, so a cell the spec adds, or a material or backdrop
/// key no loop reaches, fails here until a test asks it.
///
/// What the chip resolves is read from the one resolver it draws with (`DSSurface.resolveChip`), so the recipe, the
/// fallback and the published context here are the drawing's own. What the simulator publishes to VoiceOver is
/// measured by `DSChipAccessibilityTreeTests`, and what every example draws by the snapshot matrix, both in
/// DSSnapshotTests.
@Suite("Chip bindings (Chip.yaml v1)")
struct DSChipBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Chip")
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

    /// Every context a Surface, a backdrop or the chip itself can publish: nine materials over four backdrop kinds. A
    /// cell keyed by one applies when it is published (ADR-0022 §3.1), so every one is asked.
    static let grounds: [DSSurfaceContext] = DSSurfaceMaterial.allCases.flatMap { material in
        DSBackdropKind.allCases.map { DSSurfaceContext(material: material, backdrop: $0) }
    }

    /// The densities the spec lists (`density`), never `.watch`: watchOS is `none`.
    static let densities: [DSDensity] = [.compact, .regular, .comfortable]

    /// The locale the snapshots render in and the name table is read in (`DSSnapshotRendering.locale`).
    static let english = Locale(identifier: "en_US")

    /// The paths keyed by the published material and then its backdrop.
    static let contextPaths = [
        "root.background", "root.blur", "root.saturate", "root.edgeStartAlpha", "root.edgeEndAlpha", "root.border",
        "root.selected.border", "label.color", "label.selected.color", "leadingIcon.color", "leadingIcon.selected.color",
        "trailingIcon.color",
    ]

    /// The paths keyed by size.
    static let sizePaths = ["root.height", "root.paddingX", "label.typography"]

    /// The paths that are one token, with no axis.
    static let scalarPaths = [
        "root.fallbackBackground", "root.fallbackUnderlay", "root.edgeColor", "root.borderWidth", "root.radius",
        "root.gap", "root.hover.overlay", "root.pressed.overlay", "root.selected.borderWidth",
        "root.focus-visible.ring", "root.focus-visible.ringWidth", "root.disabled.opacity", "leadingIcon.size",
        "trailingIcon.size",
    ]

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSChip.init`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default` at
    /// every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 1)
        #expect(try spec.propValues("size") == DSChipSize.allCases.map(\.rawValue))
        let props = try #require(spec.document["props"]?.listValue)
        #expect(props.compactMap { $0["name"]?.stringValue } == [
            "label", "size", "leadingIcon", "avatar", "trailingIcon", "isSelected", "isRemovable", "isDisabled", "onPress",
            "onRemove",
        ])
        #expect(try propDefault("size") == DSChipSize.sm.rawValue)
        // `isSelected` has no default: unset is what makes a chip a button or a static label (behavior 1).
        #expect(try propDefault("isSelected") == nil)
        #expect(try propDefault("isRemovable") == "false")
        #expect(try propDefault("isDisabled") == "false")
        #expect(try propType("avatar") == "slot")
        #expect(try spec.actionProps == ["onPress", "onRemove"])

        let tokens = try #require(spec.document["tokens"]?.mapValue)
        #expect(tokens.keys == ["root", "label", "leadingIcon", "trailingIcon"])
        #expect(try spec.keys(at: "root") == [
            "background", "blur", "saturate", "fallbackBackground", "fallbackUnderlay", "edgeColor", "edgeStartAlpha",
            "edgeEndAlpha", "border", "borderWidth", "radius", "height", "paddingX", "gap", "hover", "pressed", "selected",
            "focus-visible", "disabled",
        ])
        #expect(try spec.keys(at: "root.selected") == ["border", "borderWidth"])
        #expect(try spec.keys(at: "label") == ["typography", "color", "selected"])
        #expect(try spec.keys(at: "leadingIcon") == ["size", "color", "selected"])
        #expect(try spec.keys(at: "trailingIcon") == ["size", "color"])

        let materials = Set(DSSurfaceMaterial.allCases.map(\.rawValue) + ["default"])
        let backdrops = Set(DSBackdropKind.allCases.map(\.rawValue) + ["default"])
        for path in Self.contextPaths {
            for pair in try #require(try spec.binding(path).mapValue, "\(path) is not a matrix").pairs {
                #expect(materials.contains(pair.key), "\(path) is keyed by \(pair.key)")
                if let inner = pair.value.mapValue {
                    #expect(Set(inner.keys).isSubset(of: backdrops), "\(path).\(pair.key) is keyed by \(inner.keys)")
                }
            }
        }
        for path in Self.sizePaths {
            #expect(try spec.keys(at: path) == DSChipSize.allCases.map(\.rawValue), "\(path)")
        }
        for path in Self.scalarPaths {
            #expect(try spec.binding(path).stringValue != nil, "\(path) is not one token")
        }

        let states = try #require(spec.document["states"]?.listValue).compactMap(\.stringValue)
        #expect(states == ["default", "hover", "pressed", "selected", "focus-visible", "disabled"])
        let density = try #require(spec.document["density"]?.listValue).compactMap(\.stringValue)
        #expect(density == Self.densities.map(\.rawValue))
        // watchOS is `none`, so the manifest carries no watch key (`DSComponentsContractTests` holds the rest).
        #expect(try spec.platforms["watchos"] == "none")
        #expect(DSComponentsManifest.implemented["Chip"]?["watchos"] == nil)
    }

    /// Every cell of `tokens` is one the tests below reach: the matrix, walked out of the spec, is exactly the cells the
    /// loops over the published contexts and the sizes arrive at, falling back to `default` as the grammar does. A cell
    /// the spec adds, or a key no loop reaches, fails here until a test binds it.
    @Test func everyCellOfTheMatrixIsAsked() throws {
        var asked: Set<String> = []
        func reach(_ path: String, _ keys: [any DSSpecKey]) throws {
            if let reached = try reached(path, keys) { asked.insert(reached) }
        }
        for ground in Self.grounds {
            for path in Self.contextPaths {
                try reach(path, [ground.material, ground.backdrop])
            }
        }
        for size in DSChipSize.allCases {
            for path in Self.sizePaths {
                try reach(path, [size])
            }
        }
        for path in Self.scalarPaths {
            try reach(path, [])
        }
        let written = try spec.allBindings().map(\.path)
        #expect(Set(written) == asked, "unasked: \(Set(written).subtracting(asked).sorted()); asked and absent: \(asked.subtracting(written).sorted())")
        #expect(written.count == Set(written).count, "a cell is written twice")
    }

    // MARK: - The pill is the glass chip (ADR-0036)

    /// `tokens.root.background` on every ground is exactly what Chip hands the chip shape: `glass` where the cell binds
    /// `material.glass.chip`, the cell itself where it binds another token, and nothing where the matrix has no cell —
    /// accent and inverse, which have no `default` to fall back to (behavior, "On an accent or an inverse surface").
    @Test func backgroundCells() throws {
        for ground in Self.grounds {
            let token = try spec.cell("root.background", ground.material, ground.backdrop)
            switch DSChipAppearance.background(on: ground) {
            case .glass:
                #expect(token == "material.glass.chip", "\(ground)")
            case .own(let own):
                try spec.binds(own, at: "root.background", ground.material, ground.backdrop)
            case .none:
                #expect(token == nil, "\(ground)")
            }
        }
        #expect(try !spec.keys(at: "root.background").contains("default"))
        for material in [DSSurfaceMaterial.accent, .inverse] {
            for backdrop in DSBackdropKind.allCases {
                let cell = DSChipAppearance.background(on: DSSurfaceContext(material: material, backdrop: backdrop))
                #expect(cell == DSSurfaceChipCell.none, "\(material) \(backdrop)")
            }
        }
        #expect(DSChipAppearance.background(on: .root) == DSSurfaceChipCell.own(\.components.chip.bgRest))
    }

    /// "Over media" is one set of grounds everywhere the spec says it: the grounds where `root.background` binds
    /// `material.glass.chip` are the ones where every part keys its glass cells and the check shows (`isOverMedia`).
    /// Light glass is not one of them: the spec writes it the pill's own fill.
    @Test func overMediaIsWhereTheSpecBindsGlass() throws {
        for ground in Self.grounds {
            let bindsGlass = try spec.cell("root.background", ground.material, ground.backdrop) == "material.glass.chip"
            #expect(DSChipAppearance.isOverMedia(ground) == bindsGlass, "\(ground)")
        }
        #expect(!DSChipAppearance.isOverMedia(DSSurfaceContext(material: .glassLight, backdrop: .map)))
    }

    /// Where Chip asks for glass, the chip renders `material.glass.chip`'s recipe, and every value of it is the cell the
    /// spec binds on that ground, in both schemes: the fill, the blur and the saturation where the chip blurs the backdrop
    /// — never on the scheme's glass, where it draws the fill and the edge flat (ADR-0036 §5) — and the edge wherever
    /// glass renders. Where it asks for its own cell or none, no recipe renders and no recipe cell is bound.
    @Test func theChipDrawsTheWholeRecipeWhereTheSpecBindsIt() throws {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            for ground in Self.grounds {
                let cell = DSChipAppearance.background(on: ground)
                let resolution = DSSurface.resolveChip(cell.fill, on: ground, tokens: tokens, isWatch: false)
                let keys: [any DSSpecKey] = [ground.material, ground.backdrop]
                let blur = try spec.cell("root.blur", keys: keys)
                let saturate = try spec.cell("root.saturate", keys: keys)
                let edgeStart = try spec.cell("root.edgeStartAlpha", keys: keys)
                let edgeEnd = try spec.cell("root.edgeEndAlpha", keys: keys)
                guard cell == .glass else {
                    #expect(resolution.glass == nil, "\(scheme) \(ground)")
                    #expect([blur, saturate, edgeStart, edgeEnd].allSatisfy { $0 == nil }, "\(scheme) \(ground): a recipe cell where no glass renders")
                    continue
                }
                if resolution.rendered == .fallback {
                    // The scheme's glass on no media is the one ground where glass asked for falls back at standard
                    // settings, and no Surface publishes it: a glass Surface on nothing falls back itself, to raised.
                    #expect(ground == DSSurfaceContext(material: .glass), "\(scheme) \(ground): \(resolution.rendered)")
                    let surface = DSSurface.resolve(material: .glass, tokens: tokens, isWatch: false)
                    #expect(surface.published == DSSurfaceContext(material: .raised), "\(scheme)")
                    continue
                }
                #expect(resolution.rendered == .glass, "\(scheme) \(ground): \(resolution.rendered)")
                let recipe = try #require(resolution.glass, "\(scheme) \(ground)")
                // The fill is compared by its colorset: SwiftUI's `Color` does not compare two catalog references as
                // equal (`DSGlassRecipe.token`).
                let fill = try #require(try spec.cell("root.background", keys: keys))
                #expect(recipe.token == DSColorToken(rawValue: fill.replacingOccurrences(of: ".", with: "-")), "\(scheme) \(ground): \(fill)")
                if resolution.blursBackdrop {
                    let blurPath = try #require(try spec.dimension("root.blur", ground.material, ground.backdrop), "\(scheme) \(ground)")
                    let saturatePath = try #require(try spec.number("root.saturate", ground.material, ground.backdrop), "\(scheme) \(ground)")
                    #expect(recipe.blur == tokens[keyPath: blurPath], "\(scheme) \(ground)")
                    #expect(recipe.saturate == tokens[keyPath: saturatePath], "\(scheme) \(ground)")
                } else {
                    #expect(blur == nil && saturate == nil, "\(scheme) \(ground): the chip draws no filter here, and the spec binds one")
                    #expect(ground.material.isGlass, "\(scheme) \(ground): a chip that does not blur is on the scheme's glass")
                }
                let startPath = try #require(try spec.number("root.edgeStartAlpha", ground.material, ground.backdrop), "\(scheme) \(ground)")
                let endPath = try #require(try spec.number("root.edgeEndAlpha", ground.material, ground.backdrop), "\(scheme) \(ground)")
                #expect(recipe.edgeStart == tokens[keyPath: startPath], "\(scheme) \(ground)")
                #expect(recipe.edgeEnd == tokens[keyPath: endPath], "\(scheme) \(ground)")
                // The recipe's grain and bloom are 0, so neither is drawn (behavior, "The chip is the whole recipe").
                #expect(recipe.grain == 0 && recipe.bloom == 0, "\(scheme) \(ground)")
            }
        }
        // The edge is `color.edge.highlight`, which the chip draws the recipe's edge in (`DSSurfaceChipLayers`).
        #expect(try spec.color("root.edgeColor") == \DSTokenSet.color.edgeHighlight)
    }

    /// `root.fallbackBackground` and `root.fallbackUnderlay` are what the chip paints under its fallback,
    /// `color.bg.surface.raised` over `color.bg.page` (`DSSurfaceChipLayers`, which `DSSurfaceChipRenderTests` reads back
    /// as pixels), and the chip falls back exactly where glass was asked for and a forced Reduce Transparency or Increase
    /// Contrast is on.
    @Test func theFallbackIsRaisedOverThePage() throws {
        #expect(try spec.color("root.fallbackBackground") == \DSTokenSet.color.bgSurfaceRaised)
        #expect(try spec.color("root.fallbackUnderlay") == \DSTokenSet.color.bgPage)
        for tokens in [Self.tokens(transparency: .reduced), Self.tokens(contrast: .increased)] {
            for ground in Self.grounds {
                let cell = DSChipAppearance.background(on: ground)
                let resolution = DSSurface.resolveChip(cell.fill, on: ground, tokens: tokens, isWatch: false)
                #expect(resolution.isGlassFallback == (cell == .glass), "\(tokens.context) \(ground)")
                #expect(resolution.paintsPage == (cell == .glass), "\(tokens.context) \(ground)")
                #expect(resolution.glass == nil, "\(tokens.context) \(ground)")
            }
        }
    }

    // MARK: - tokens.root

    /// `tokens.root.border` and `tokens.root.selected.border` on every context the chip can publish: the chip's own
    /// hairline and selected strokes by default, the glass fill's stroke over a map, an image and the scheme's glass, the
    /// media stroke over vivid, and `color.text.on-inverse` on inverse, at rest and selected.
    @Test func borderCells() throws {
        for ground in Self.grounds {
            try spec.binds(DSChipAppearance.border(on: ground, isSelected: false), at: "root.border", ground.material, ground.backdrop)
            try spec.binds(DSChipAppearance.border(on: ground, isSelected: true), at: "root.selected.border", ground.material, ground.backdrop)
        }
    }

    /// `tokens.root.borderWidth`, `border.hairline`, and `tokens.root.selected.borderWidth`, `border.strong`: selection
    /// thickens the stroke on every material (behavior).
    @Test func borderWidthCells() throws {
        try spec.binds(DSChipAppearance.borderWidth(isSelected: false), at: "root.borderWidth")
        try spec.binds(DSChipAppearance.borderWidth(isSelected: true), at: "root.selected.borderWidth")
        let tokens = Self.tokens()
        #expect(tokens[keyPath: DSChipAppearance.borderWidth(isSelected: true)] > tokens[keyPath: DSChipAppearance.borderWidth(isSelected: false)])
    }

    /// `tokens.root.radius`: `radius.chip`, at least half the height of the tallest chip in every density the spec lists,
    /// so the pill's ends are round.
    @Test func radiusCell() throws {
        try spec.binds(DSChipAppearance.radius, at: "root.radius")
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            for size in DSChipSize.allCases {
                #expect(tokens[keyPath: DSChipAppearance.radius] * 2 >= tokens[keyPath: DSChipAppearance.height(size)], "\(density) \(size)")
            }
        }
    }

    /// `tokens.root.height`: the control height of each size, resolved against the token set each density builds. It
    /// follows density — sm is 28 pt in compact, 32 in regular, 44 in comfortable — and not modality.
    @Test func heightCells() throws {
        for size in DSChipSize.allCases {
            try spec.binds(DSChipAppearance.height(size), at: "root.height", size)
        }
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                for size in DSChipSize.allCases {
                    try spec.binds(value: tokens[keyPath: DSChipAppearance.height(size)], at: "root.height", size, in: tokens)
                }
            }
        }
        let sm = { (density: DSDensity) in Self.tokens(density: density)[keyPath: DSChipAppearance.height(.sm)] }
        #expect(sm(.compact) == 28)
        #expect(sm(.regular) == 32)
        #expect(sm(.comfortable) == 44)
    }

    /// `tokens.root.paddingX` per size and `tokens.root.gap`, one value in every density.
    @Test func paddingAndGapCells() throws {
        for size in DSChipSize.allCases {
            try spec.binds(DSChipAppearance.paddingX(size), at: "root.paddingX", size)
        }
        try spec.binds(DSChipAppearance.gap, at: "root.gap")
        let regular = Self.tokens(density: .regular)
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            for size in DSChipSize.allCases {
                #expect(tokens[keyPath: DSChipAppearance.paddingX(size)] == regular[keyPath: DSChipAppearance.paddingX(size)], "\(density) \(size)")
            }
            #expect(tokens[keyPath: DSChipAppearance.gap] == regular[keyPath: DSChipAppearance.gap], "\(density)")
        }
    }

    /// `tokens.root.hover.overlay` and `tokens.root.pressed.overlay`: layers over whatever the chip renders, with no
    /// material axis, so a pressed glass chip keeps its glass under the pressed fill (behavior).
    @Test func hoverAndPressedCells() throws {
        try spec.binds(DSChipAppearance.hoverOverlay, at: "root.hover.overlay")
        try spec.binds(DSChipAppearance.pressedOverlay, at: "root.pressed.overlay")
        #expect(try spec.binding("root.hover.overlay").mapValue == nil)
        #expect(try spec.binding("root.pressed.overlay").mapValue == nil)
    }

    /// `tokens.root.focus-visible` and `tokens.root.disabled`.
    @Test func focusAndDisabledCells() throws {
        try spec.binds(DSChipAppearance.focusRing, at: "root.focus-visible.ring")
        try spec.binds(DSChipAppearance.focusRingWidth, at: "root.focus-visible.ringWidth")
        try spec.binds(DSChipAppearance.disabledOpacity, at: "root.disabled.opacity")
    }

    // MARK: - The parts

    /// `tokens.label.typography`: `type.label.sm` or `.md`, by size.
    @Test func labelTypographyCells() throws {
        for size in DSChipSize.allCases {
            try spec.binds(DSChipAppearance.labelRole(size).keyPath, at: "label.typography", size)
        }
    }

    /// `tokens.label.color`, `tokens.leadingIcon.color` and `tokens.trailingIcon.color`, at rest and selected, on every
    /// context the chip can publish: the secondary and primary tones by default, the glass fill's one foreground over
    /// media, the lit tile's two tones on accent, and `color.text.on-inverse` on inverse. The trailing glyph and the
    /// remove control's glyph take one cell whatever the selection.
    @Test func partColorCells() throws {
        for ground in Self.grounds {
            let keys: [any DSSpecKey] = [ground.material, ground.backdrop]
            try spec.binds(DSChipAppearance.labelColor(on: ground, isSelected: false), at: "label.color", keys[0], keys[1])
            try spec.binds(DSChipAppearance.labelColor(on: ground, isSelected: true), at: "label.selected.color", keys[0], keys[1])
            try spec.binds(DSChipAppearance.leadingIconColor(on: ground, isSelected: false), at: "leadingIcon.color", keys[0], keys[1])
            try spec.binds(DSChipAppearance.leadingIconColor(on: ground, isSelected: true), at: "leadingIcon.selected.color", keys[0], keys[1])
            try spec.binds(DSChipAppearance.trailingIconColor(on: ground), at: "trailingIcon.color", keys[0], keys[1])
        }
    }

    /// `tokens.leadingIcon.size` and `tokens.trailingIcon.size`: Icon's `sm` box, which `DSIcon` resolves, asked in every
    /// density: the glyph is the same box in each (Icon.yaml behavior 10). The check is status.check and the remove
    /// glyph nav.close, each in the same box.
    @Test func iconSizeCells() throws {
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            let box = DSIconAppearance.box(DSChipAppearance.iconSize, tokens.size)
            try spec.binds(value: box, at: "leadingIcon.size", in: tokens)
            try spec.binds(value: box, at: "trailingIcon.size", in: tokens)
        }
        #expect(DSChipAppearance.checkIcon == .statusCheck)
        #expect(DSChipAppearance.removeIcon == .navClose)
        #expect(spec.text.contains("status.check") && spec.text.contains("nav.close"))
    }

    /// Under a forced Reduce Transparency or Increase Contrast, wherever the pill asks for glass the chip falls back and
    /// publishes `(raised, none)`, so every part takes its `default` cell and the check goes (`accessibility.
    /// reduceTransparency`, ADR-0036 §4). Inside a glass Surface the Surface falls back first and publishes `raised` over
    /// the backdrop it declared, where the pill asks for its own cell: the parts read `raised` either way. A selected
    /// glass Surface falls back to inverse, where the pill has no fill, the parts take `color.text.on-inverse` and a
    /// selected chip shows the check (behavior, "On an accent or an inverse surface").
    @Test func underAForcedSettingEveryPartIsItsDefaultCell() throws {
        let label = try #require(try spec.color("label.color", "default"))
        let selectedLabel = try #require(try spec.color("label.selected.color", "default"))
        let leading = try #require(try spec.color("leadingIcon.color", "default"))
        let selectedLeading = try #require(try spec.color("leadingIcon.selected.color", "default"))
        let trailing = try #require(try spec.color("trailingIcon.color", "default"))
        let border = try #require(try spec.color("root.border", "default"))
        let selectedBorder = try #require(try spec.color("root.selected.border", "default"))
        func expectDefaults(_ published: DSSurfaceContext, _ comment: String) {
            #expect(DSChipAppearance.labelColor(on: published, isSelected: false) == label, "\(comment)")
            #expect(DSChipAppearance.labelColor(on: published, isSelected: true) == selectedLabel, "\(comment)")
            #expect(DSChipAppearance.leadingIconColor(on: published, isSelected: false) == leading, "\(comment)")
            #expect(DSChipAppearance.leadingIconColor(on: published, isSelected: true) == selectedLeading, "\(comment)")
            #expect(DSChipAppearance.trailingIconColor(on: published) == trailing, "\(comment)")
            #expect(DSChipAppearance.border(on: published, isSelected: false) == border, "\(comment)")
            #expect(DSChipAppearance.border(on: published, isSelected: true) == selectedBorder, "\(comment)")
            #expect(!DSChipAppearance.showsCheck(on: published), "\(comment): the check shows")
        }
        for tokens in [Self.tokens(transparency: .reduced), Self.tokens(contrast: .increased)] {
            for ground in Self.grounds where DSChipAppearance.background(on: ground) == .glass {
                let resolution = DSSurface.resolveChip(.glass, on: ground, tokens: tokens, isWatch: false)
                #expect(resolution.rendered == .fallback, "\(tokens.context) \(ground)")
                #expect(resolution.published == DSSurfaceContext(material: .raised), "\(tokens.context) \(ground)")
                expectDefaults(resolution.published, "\(tokens.context) \(ground)")
            }
            for backdrop in [DSBackdropKind.map, .image, .vivid] {
                let surface = DSSurface.resolve(material: .glass, backdrop: backdrop, tokens: tokens, isWatch: false)
                #expect(surface.published == DSSurfaceContext(material: .raised, backdrop: backdrop))
                let cell = DSChipAppearance.background(on: surface.published)
                #expect(cell == DSSurfaceChipCell.own(\.components.chip.bgRest), "\(tokens.context) glass over \(backdrop)")
                let chip = DSSurface.resolveChip(cell.fill, on: surface.published, tokens: tokens, isWatch: false)
                expectDefaults(chip.published, "\(tokens.context) glass over \(backdrop)")

                let selected = DSSurface.resolve(material: .glass, backdrop: backdrop, selected: true, tokens: tokens, isWatch: false)
                #expect(DSChipAppearance.background(on: selected.published) == DSSurfaceChipCell.none)
                #expect(DSChipAppearance.labelColor(on: selected.published, isSelected: true) == \DSTokenSet.color.textOnInverse)
                #expect(DSChipAppearance.border(on: selected.published, isSelected: true) == \DSTokenSet.color.textOnInverse)
                #expect(DSChipAppearance.showsCheck(on: selected.published))
            }
        }
        // With both settings standard, the chip renders glass and publishes the ground, so the parts key on the media.
        let standard = DSSurface.resolveChip(.glass, on: DSSurfaceContext(material: .page, backdrop: .map), tokens: Self.tokens(), isWatch: false)
        #expect(standard.rendered == .glass)
        #expect(standard.published == DSSurfaceContext(material: .page, backdrop: .map))
        #expect(DSChipAppearance.labelColor(on: standard.published, isSelected: false) == \DSTokenSet.color.textOnGlassFill)
        #expect(DSChipAppearance.showsCheck(on: standard.published))
    }

    // MARK: - motion and haptics

    /// `motion.press` is the snappy spring, `motion.select` the smooth one, and `motion.reduceMotion` is `crossfade`:
    /// under Reduce Motion nothing scales, the pressed fill changes and selection crossfades over `motion.duration.base`
    /// with `motion.easing.out`.
    @Test @MainActor func motionCells() throws {
        try spec.binds(DSChipAppearance.pressSpring, at: "motion.press")
        try spec.binds(DSChipAppearance.selectSpring, at: "motion.select")
        #expect(try spec.cell("motion.reduceMotion") == DSChipAppearance.reduceMotion.rawValue)

        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        let snappy = Self.tokens()[keyPath: DSChipAppearance.pressSpring]
        let smooth = Self.tokens()[keyPath: DSChipAppearance.selectSpring]
        #expect(DSChipAppearance.pressAnimation(standard) == snappy.animation)
        #expect(DSChipAppearance.selectAnimation(standard) == smooth.animation)
        let fade = reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        #expect(DSChipAppearance.pressAnimation(reduced) == fade)
        #expect(DSChipAppearance.selectAnimation(reduced) == fade)
        #expect(abs(DSControlAppearance.scale(isPressed: true, motion: standard) - 0.97) < 0.000_1)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
    }

    /// `haptics`: one haptic per press, `haptic.impact.light` (spec/haptics.yaml: "A light touch landed (chip toggled,
    /// card lifted)"), and none on a programmatic change of `isSelected`.
    @Test func oneHapticPerPress() throws {
        let haptics = try #require(spec.document["haptics"]?.mapValue)
        #expect(haptics.keys == ["press"])
        #expect(haptics["press"]?.stringValue == DSChipAppearance.pressHaptic.rawValue)
        #expect(DSChipAppearance.pressHaptic == .impactLight)
    }

    // MARK: - Behavior

    /// Behavior 1: the role follows from the props alone. A chip that sets `isSelected`, true or false, is a filter; one
    /// that leaves it unset is a button with `onPress` or `isRemovable`, and a static label with neither. The web's
    /// `chipKind` answers the same table (`chip.test.tsx`).
    @Test func theRoleFollowsFromThePropsAlone() {
        #expect(DSChipKind.allCases.map(\.rawValue) == ["filter", "button", "label"])
        for hasPress in [false, true] {
            for isRemovable in [false, true] {
                #expect(DSChipAppearance.kind(isSelected: true, hasPress: hasPress, isRemovable: isRemovable) == .filter)
                #expect(DSChipAppearance.kind(isSelected: false, hasPress: hasPress, isRemovable: isRemovable) == .filter)
                let unset = DSChipAppearance.kind(isSelected: nil, hasPress: hasPress, isRemovable: isRemovable)
                #expect(unset == (hasPress || isRemovable ? DSChipKind.button : .label), "press \(hasPress), removable \(isRemovable)")
            }
        }
        #expect(DSChipKind.filter.isControl && DSChipKind.button.isControl && !DSChipKind.label.isControl)
    }

    /// Behavior, "Over media that ladder collapses": a selected chip draws status.check where every tone is one
    /// foreground — over media and on inverse — and nowhere else, on the context the chip publishes.
    @Test func theCheckShowsOverMediaAndOnInverseOnly() {
        for ground in Self.grounds {
            let expected = DSChipAppearance.isOverMedia(ground) || ground.material == .inverse
            #expect(DSChipAppearance.showsCheck(on: ground) == expected, "\(ground)")
        }
        #expect(!DSChipAppearance.showsCheck(on: .root))
        #expect(!DSChipAppearance.showsCheck(on: DSSurfaceContext(material: .raised)))
        #expect(!DSChipAppearance.showsCheck(on: DSSurfaceContext(material: .accent)))
    }

    /// The leading position holds one thing, in one order: status.check while a selected chip sits where it shows,
    /// replacing the Avatar or the glyph it had; otherwise the Avatar, on the md chip only; otherwise `leadingIcon`.
    @Test func theLeadingPositionHoldsOneThingInOneOrder() {
        let map = DSSurfaceContext(material: .page, backdrop: .map)
        let page = DSSurfaceContext.root
        let icon = DSIconName.objectMapPin
        for drawsAvatar in [false, true] {
            for leadingIcon in [nil, icon] {
                #expect(DSChipAppearance.leading(isSelected: true, on: map, drawsAvatar: drawsAvatar, leadingIcon: leadingIcon) == .check)
                #expect(DSChipAppearance.leading(isSelected: true, on: DSSurfaceContext(material: .inverse), drawsAvatar: drawsAvatar, leadingIcon: leadingIcon) == .check)
                let rest: DSChipLeading = drawsAvatar ? DSChipLeading.avatar : (leadingIcon.map { DSChipLeading.icon($0) } ?? DSChipLeading.none)
                #expect(DSChipAppearance.leading(isSelected: false, on: map, drawsAvatar: drawsAvatar, leadingIcon: leadingIcon) == rest)
                #expect(DSChipAppearance.leading(isSelected: true, on: page, drawsAvatar: drawsAvatar, leadingIcon: leadingIcon) == rest)
                #expect(DSChipAppearance.leading(isSelected: false, on: page, drawsAvatar: drawsAvatar, leadingIcon: leadingIcon) == rest)
            }
        }
        // Only the md chip draws its Avatar: the sm chip and the sm avatar are the same height.
        #expect(DSChipAppearance.drawsAvatar(.md, hasAvatar: true))
        #expect(!DSChipAppearance.drawsAvatar(.sm, hasAvatar: true))
        #expect(!DSChipAppearance.drawsAvatar(.md, hasAvatar: false))
    }

    /// Behavior, "An identifier chip may put an Avatar": the md chip leaves the Avatar half of `size.control.md` less
    /// `size.control.sm` above, below and before it, 2 to 4 pt by density, so the sm circle is concentric with the pill's
    /// leading end; that inset replaces `root.paddingX` only while the Avatar leads.
    @Test func theAvatarIsConcentricWithThePillsLeadingEnd() {
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            let inset = DSChipAppearance.avatarInset(tokens)
            #expect((2...4).contains(inset), "\(density): \(inset)")
            let circle = tokens[keyPath: DSAvatarAppearance.side(.sm)]
            #expect(circle + 2 * inset == tokens[keyPath: DSChipAppearance.height(.md)], "\(density)")
            #expect(DSChipAppearance.leadingPadding(.md, leading: .avatar, tokens) == inset, "\(density)")
            for leading in [DSChipLeading.check, .icon(.objectMapPin), DSChipLeading.none] {
                #expect(DSChipAppearance.leadingPadding(.md, leading: leading, tokens) == tokens[keyPath: DSChipAppearance.paddingX(.md)], "\(density) \(leading)")
            }
        }
        #expect(spec.text.contains("half of size.control.md less size.control.sm"))
    }

    /// Behavior, "`trailingIcon` is a glyph inside the chip's one control": `isRemovable` takes the trailing position, so
    /// a `trailingIcon` given with it is not drawn.
    @Test func isRemovableTakesTheTrailingPosition() {
        #expect(DSChipAppearance.showsTrailingIcon(isRemovable: false, hasTrailingIcon: true))
        #expect(!DSChipAppearance.showsTrailingIcon(isRemovable: true, hasTrailingIcon: true))
        #expect(!DSChipAppearance.showsTrailingIcon(isRemovable: false, hasTrailingIcon: false))
    }

    /// The hit region of a control is the larger of the pill and `size.hit` on each axis: the sm chip's 32 pt pill under
    /// touch reaches 44, and under pointer the pill is already taller than the 28 pt target.
    @Test func hitRegionReachesSizeHit() {
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                for size in DSChipSize.allCases {
                    let height = tokens[keyPath: DSChipAppearance.height(size)]
                    let outset = DSControlAppearance.hitOutset(visual: CGSize(width: height, height: height), hit: tokens.size.hit)
                    #expect(height + 2 * outset.height == max(height, tokens.size.hit), "\(density) \(modality) \(size)")
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

    /// The pill is one row at the control height of its size, whatever it holds: an Avatar, the remove control or a
    /// glyph never moves it, and the label never wraps. Measured as the height of an `ImageRenderer` render, which the
    /// host lays out correctly even though it paints no token colour (`DSRenderCapability`): this reads layout, never a
    /// pixel.
    @Test @MainActor func thePillIsTheControlHeightOfItsSize() throws {
        func height(_ view: some View, _ density: DSDensity) throws -> CGFloat {
            let renderer = ImageRenderer(content: DSTheme { view.dynamicTypeSize(.large).dsDensity(density) })
            renderer.scale = 1
            let image = try #require(renderer.cgImage)
            return CGFloat(image.height)
        }
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            for size in DSChipSize.allCases {
                let want = tokens[keyPath: DSChipAppearance.height(size)]
                let variants: [(String, AnyView)] = [
                    ("a filter", AnyView(DSChip(verbatim: "Last 24 hours", size: size, isSelected: true) {})),
                    ("a glyph", AnyView(DSChip(verbatim: "Depots", size: size, leadingIcon: .objectMapPin) {})),
                    ("an Avatar", AnyView(DSChip(verbatim: "Anna Petrova", size: size, avatar: DSAvatar(name: "Anna Petrova")) {})),
                    ("the remove control", AnyView(DSChip(verbatim: "North yard", size: size, isRemovable: true, onRemove: {}))),
                    ("a static label", AnyView(DSChip(verbatim: "B-4417", size: size))),
                    ("a long label", AnyView(DSChip(verbatim: "Последние 24 часа на северном участке", size: size) {})),
                ]
                for (description, view) in variants {
                    #expect(try height(view, density) == want, "\(density) \(size): \(description)")
                }
            }
        }
    }

    // MARK: - The remove control's name (ADR-0032)

    /// A removable chip's remove control is named by the `strings.Chip.remove` template filled with the chip's label:
    /// "Remove North yard" for the `removable` example under the English defaults, the name the web gives the same story
    /// (`web/packages/react/test/chip.test.tsx`). Every form of the label fills it the same way, and the label is placed
    /// as written, never read as a template. A chip that is not removable has no remove control, and no such name.
    /// `DSButtonBindingTests.aLoadingButtonIsNamedByTheTemplate` is the precedent.
    @Test @MainActor func theRemoveControlIsNamedByTheTemplate() {
        let english = Self.english
        let yard = "North yard"
        let key = DSChip("North yard", isRemovable: true, onRemove: {})
        let verbatim = DSChip(verbatim: "North yard", isRemovable: true, onRemove: {})
        let held = DSChip(yard, isRemovable: true, onRemove: {})
        let braces = DSChip(verbatim: "{label}", isRemovable: true, onRemove: {})
        let russian = DSChip(verbatim: "Последние 24 часа", isRemovable: true, onRemove: {})
        let fixed = DSChip(verbatim: "North yard") {}
        #expect(key.removeName(locale: english, strings: .english) == "Remove North yard")
        #expect(verbatim.removeName(locale: english, strings: .english) == "Remove North yard")
        #expect(held.removeName(locale: english, strings: .english) == "Remove North yard")
        #expect(braces.removeName(locale: english, strings: .english) == "Remove {label}")
        #expect(russian.removeName(locale: english, strings: .english) == "Remove Последние 24 часа")
        #expect(fixed.removeName(locale: english, strings: .english) == nil)
        // The same function names every remove control, and the English is the table's default, not Chip's.
        #expect(DSChipAppearance.removeName("North yard", strings: .english) == "Remove North yard")
        #expect(DSStrings.english.chipRemove == "Remove {label}")
        #expect(DSStrings.english.entry("Chip.remove") == "Remove {label}")
    }

    /// The words are the app's: a template it sets at the root reaches the name in its own order and its own words, and
    /// a template that drops the label is the app's words alone (ADR-0032 rules 1 and 2). That the body reads the table
    /// from the environment is measured on the simulator (`DSChipAccessibilityTreeTests`).
    @Test @MainActor func theRemoveControlSpeaksTheAppsTemplate() {
        let russian = DSStrings(chipRemove: "Удалить: {label}")
        let wordless = DSStrings(chipRemove: "Удалить")
        let chip = DSChip(verbatim: "Северный двор", isRemovable: true, onRemove: {})
        #expect(chip.removeName(locale: Self.english, strings: russian) == "Удалить: Северный двор")
        #expect(chip.removeName(locale: Self.english, strings: wordless) == "Удалить")
        #expect(DSChipAppearance.removeName("North yard", strings: russian) == "Удалить: North yard")
    }

    /// A localized label fills the template as it resolves where the chip renders: looked up in the environment's
    /// locale, in the table and the bundle the caller named, as `Text` looks it up. The table is a throwaway bundle in
    /// the temporary directory, standing in for the app's own, built the way
    /// `DSButtonBindingTests.aLocalizedLabelIsResolvedInTheEnvironmentsLocale` builds its bundle; both of its values are
    /// English because only the difference between the two languages matters here.
    @Test @MainActor func aLocalizedLabelIsResolvedInTheEnvironmentsLocale() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("DSChipRemoveName-\(UUID().uuidString).bundle")
        defer { try? FileManager.default.removeItem(at: root) }
        for (language, value) in [("en", "North yard"), ("ru", "North yard, from the ru table")] {
            let folder = root.appendingPathComponent("\(language).lproj", isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            try "\"site-north\" = \"\(value)\";\n".write(to: folder.appendingPathComponent("Sites.strings"), atomically: true, encoding: .utf8)
        }
        let bundle = try #require(Bundle(url: root))
        let chip = DSChip("site-north", tableName: "Sites", bundle: bundle, isRemovable: true, onRemove: {})
        #expect(chip.removeName(locale: Locale(identifier: "en"), strings: .english) == "Remove North yard")
        #expect(chip.removeName(locale: Locale(identifier: "ru"), strings: .english) == "Remove North yard, from the ru table")
    }

    /// ADR-0032: Chip owns exactly the one string its spec names, the remove control's, and the default its prose writes
    /// out is the table's. Every other word it speaks is its `label`.
    @Test func chipOwnsExactlyItsOneString() throws {
        let named = Set(spec.text.matches(of: /strings\.([A-Za-z]+)\.([A-Za-z]+)/).map { "\($0.1).\($0.2)" })
        #expect(named == ["Chip.remove"])
        #expect(spec.text.contains(DSStrings.english.chipRemove))
        #expect(DSStrings.keys.contains("Chip.remove"))
    }

    // MARK: - An Avatar inside the pill (ADR-0037)

    /// ADR-0037 rule 4 with the real host: what the pill hands the view in the Avatar's place — the context it
    /// publishes and the enclosure — is the same at rest and pressed, on every ground the pill can sit on and under
    /// every setting, so the Avatar resolves the same. The pressed fill is a layer over the chip's rendering, never the
    /// cell the pill hands its shape (`DSChipAppearance.background(on:)` takes the ground and nothing else).
    ///
    /// What it hands on is the pill's own resolution, and the Avatar resolved from it never blurs — a chip inside a chip
    /// samples nothing — and renders glass exactly where the pill does: flat inside a pill that renders glass, its own
    /// cell inside a pill that renders its own or falls back. The environment probe is `DSSurfaceChipTests`'s, so
    /// nothing here reads a pixel; `DSSurfaceChipRenderTests` reads the two nestings ADR-0037 draws as pixels.
    @Test @MainActor func aPressNeverChangesWhatTheAvatarInsideResolves() throws {
        let settings: [(name: String, contrast: Bool, transparency: Bool, tokens: DSTokenSet)] = [
            ("standard", false, false, Self.tokens()),
            ("Reduce Transparency", false, true, Self.tokens(transparency: .reduced)),
            ("Increase Contrast", true, false, Self.tokens(contrast: .increased)),
        ]
        for ground in Self.grounds {
            for setting in settings {
                func reading(pressed: Bool) -> DSSurfaceChipTests.Reading {
                    DSSurfaceChipTests.read(increasedContrast: setting.contrast, reduceTransparency: setting.transparency) { reader in
                        Self.staged(on: ground) {
                            DSChipPill(content: reader, isPressed: pressed, isSelected: false, isInteractive: true)
                        }
                    }
                }
                let rest = reading(pressed: false)
                let pressed = reading(pressed: true)
                let comment = "\(ground) under \(setting.name)"
                #expect(rest == pressed, "\(comment): at rest \(rest), pressed \(pressed)")

                let pill = DSSurface.resolveChip(
                    DSChipAppearance.background(on: ground).fill, on: ground, tokens: setting.tokens, isWatch: false
                )
                #expect(rest.context == pill.published, "\(comment): the pill hands on \(String(describing: rest.context))")
                #expect(rest.enclosure == pill.encloses, "\(comment): the pill hands on \(String(describing: rest.enclosure))")
                #expect(rest.enclosure != DSSurfaceChipEnclosure.none, "\(comment): the Avatar is not enclosed")

                let context = try #require(rest.context, "\(comment)")
                let enclosure = try #require(rest.enclosure, "\(comment)")
                let avatar = DSSurface.resolveChip(
                    DSAvatarAppearance.background(on: context).fill, on: context, enclosure: enclosure, tokens: setting.tokens,
                    isWatch: false
                )
                #expect(!avatar.blursBackdrop, "\(comment): the Avatar blurs")
                #expect((avatar.rendered == .glass) == (pill.rendered == .glass), "\(comment): the pill renders \(pill.rendered), the Avatar \(avatar.rendered)")
                if pill.rendered == .own || pill.rendered == .fallback {
                    #expect(avatar.rendered == .own, "\(comment): the Avatar renders \(avatar.rendered)")
                }
            }
        }
    }

    /// `content` on `ground`: its context set to the ground, over grey pixels declared as the ground's backdrop kind.
    @ViewBuilder
    static func staged(on ground: DSSurfaceContext, @ViewBuilder _ content: () -> some View) -> some View {
        if ground.backdrop == DSBackdropKind.none {
            content().dsSurfaceContext(ground)
        } else {
            content().dsSurfaceContext(ground).dsBackdrop(ground.backdrop) { Color.gray }
        }
    }

    // MARK: - The examples

    /// Every row of `DSChipExamples` is the example the spec writes under that id: the props, with the spec's defaults
    /// where the entry writes none and `isSelected` left unset where it writes none, the Avatar its slot holds — a
    /// mapping of Avatar's own props, `name` alone — and where it is staged: on a ground, or inside a Surface over a
    /// backdrop.
    ///
    /// `hasGlass` is what the snapshots take under forced Reduce Transparency, so it is held to the spec rather than to
    /// the row: an example renders glass when its Surface is glass or when the pill's `root.background` on the context it
    /// is staged in binds `material.glass.chip`.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSChipExamples.rows.map(\.id))
        #expect(DSChipExamples.rows.count == 13)
        for (entry, row) in zip(entries, DSChipExamples.rows) {
            let props = entry.value["props"]
            #expect(row.label == props?["label"]?.stringValue, "\(row.id)")
            #expect(row.size.rawValue == (try prop("size", of: entry)), "\(row.id)")
            #expect(row.leadingIcon?.rawValue == props?["leadingIcon"]?.stringValue, "\(row.id)")
            #expect(row.trailingIcon?.rawValue == props?["trailingIcon"]?.stringValue, "\(row.id)")
            #expect(row.isSelected.map { String($0) } == props?["isSelected"]?.stringValue, "\(row.id)")
            #expect(String(row.isRemovable) == (try prop("isRemovable", of: entry)), "\(row.id)")
            #expect(String(row.isDisabled) == (try prop("isDisabled", of: entry)), "\(row.id)")
            if let avatar = props?["avatar"] {
                let mapping = try #require(avatar.mapValue, "\(row.id): an avatar that is not a mapping of Avatar's props (spec/SCHEMA.md)")
                #expect(mapping.keys == ["name"], "\(row.id): the avatar writes \(mapping.keys)")
                #expect(row.avatarName == mapping["name"]?.stringValue, "\(row.id)")
            } else {
                #expect(row.avatarName == nil, "\(row.id)")
            }

            let surface = entry.value["surface"]?.stringValue
            let backdrop = entry.value["backdrop"]?.stringValue
            let staging: DSChipExampleStaging
            switch surface ?? "page" {
            case "page": staging = .ground(.page)
            case "map": staging = .ground(.map)
            case "image": staging = .ground(.image)
            case let word:
                let material = try #require(DSSurfaceMaterial(rawValue: word), "\(row.id): surface \(word)")
                let kind = try #require(DSBackdropKind(rawValue: backdrop ?? "none"), "\(row.id): backdrop \(backdrop ?? "none")")
                staging = .surface(material, backdrop: kind)
            }
            #expect(row.staging == staging, "\(row.id): staged \(row.staging), spec \(surface ?? "page") over \(backdrop ?? "none")")
            if case .ground = staging {
                #expect(backdrop == nil, "\(row.id): a backdrop with no Surface to declare it")
            }

            let context = row.context
            let isGlassSurface: Bool
            if case .surface(let material, _) = staging { isGlassSurface = material.isGlass } else { isGlassSurface = false }
            let bindsChip = try spec.cell("root.background", context.material, context.backdrop) == "material.glass.chip"
            #expect(row.example.hasGlass == (isGlassSurface || bindsChip), "\(row.id)")
        }
        #expect(DSChipExamples.all.filter(\.hasGlass).map(\.name) == ["on-map", "selected-on-map", "on-vivid", "on-glass-over-image"])
        #expect(DSChipExamples.rows.filter { $0.avatarName != nil }.map(\.id) == ["md-with-avatar"])
    }

    // MARK: - Accessibility

    /// `DSChipNameCase.all`, the table both stacks assert: every example is named by its `label` byte for byte, is a
    /// filter carrying its state exactly where it sets `isSelected`, has a remove control named by the strings table
    /// exactly where it is removable, and its pill renders the glass chip exactly where the table says. `russian-label`
    /// is the Cyrillic name, 17 scalars and 30 UTF-8 bytes, in NFC.
    @Test @MainActor func everyExampleIsNamedAsTheTableSays() throws {
        #expect(DSChipNameCase.all.map(\.id) == DSChipExamples.rows.map(\.id))
        let tokens = Self.tokens()
        for (row, want) in zip(DSChipExamples.rows, DSChipNameCase.all) {
            #expect(Array(row.label.utf8) == Array(want.name.utf8), "\(row.id): named \(row.label.debugDescription)")
            #expect(row.isSelected == want.isSelected, "\(row.id)")
            #expect(row.isDisabled == want.isDisabled, "\(row.id)")
            let kind = DSChipAppearance.kind(isSelected: row.isSelected, hasPress: true, isRemovable: row.isRemovable)
            #expect(kind == (want.isSelected == nil ? DSChipKind.button : .filter), "\(row.id): \(kind)")
            let remove = row.isRemovable ? DSChipAppearance.removeName(row.label, strings: .english) : nil
            #expect(remove.map { Array($0.utf8) } == want.remove.map { Array($0.utf8) }, "\(row.id): remove \(remove.debugDescription)")
            let chip = DSSurface.resolveChip(DSChipAppearance.background(on: row.context).fill, on: row.context, tokens: tokens, isWatch: false)
            #expect((chip.rendered == .glass) == want.rendersGlass, "\(row.id): renders \(chip.rendered)")
            if !want.rendersGlass {
                #expect(chip.rendered == .own, "\(row.id): renders \(chip.rendered)")
            }
            #expect(want.name == want.name.trimmingCharacters(in: .whitespacesAndNewlines), "\(row.id)")
        }
        #expect(DSChipNameCase.all.map { Array($0.name.utf8).count } == DSChipNameCase.nameBytes)
        let russian = try #require(DSChipNameCase.all.first { $0.id == "russian-label" }?.name)
        #expect(russian.unicodeScalars.count == 17)
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
        let list = try #require(spec.document["examples"]?.listValue, "Chip.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's entry in `props`.
    private func propEntry(_ name: String) throws -> DSSpecValue {
        let props = try #require(spec.document["props"]?.listValue)
        return try #require(props.first { $0["name"]?.stringValue == name }, "Chip.yaml has no prop \(name)")
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        try propEntry(name)["default"]?.stringValue
    }

    /// A prop's `type`, as the spec writes it.
    private func propType(_ name: String) throws -> String? {
        try propEntry(name)["type"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
