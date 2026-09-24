import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// What every Avatar example is named and draws, byte for byte, on both stacks.
///
/// The same table is asserted three times: here, off the pure functions; off the simulator's accessibility tree
/// (`DSAvatarAccessibilityTreeTests`, DSSnapshotTests); and off Chromium's tree for every Avatar story
/// (`web/apps/gallery/test/accessibility.browser.test.tsx`), with the web's own copy of the rows in
/// `web/packages/react/test/avatar.test.tsx`. An exposed example is one image named by its `name` — the image trait
/// here, `role="img"` on the web — and a hidden one is no element at all.
nonisolated struct DSAvatarNameCase: Sendable {
    let id: String
    /// The accessible name, or nil for an avatar that is hidden.
    let name: String?
    /// The initials the circle draws, under the image when there is one; nil draws `object.user`.
    let initials: String?
    /// Whether the example hands the circle the `portrait` fixture.
    let hasImage: Bool
    /// Whether the circle renders the glass chip where the example stages it, at standard settings.
    let rendersGlass: Bool

    init(_ id: String, name: String?, initials: String?, image: Bool = false, glass: Bool = false) {
        self.id = id
        self.name = name
        self.initials = initials
        self.hasImage = image
        self.rendersGlass = glass
    }

    static let all: [DSAvatarNameCase] = [
        DSAvatarNameCase("image-md", name: "Anna Petrova", initials: "AP", image: true),
        DSAvatarNameCase("initials-md", name: "Anna Petrova", initials: "AP"),
        DSAvatarNameCase("initials-one-word", name: "Northgate", initials: "N"),
        DSAvatarNameCase("fallback-icon", name: nil, initials: nil),
        DSAvatarNameCase("ringed", name: "Anna Petrova", initials: "AP", image: true),
        DSAvatarNameCase("size-sm", name: "Anna Petrova", initials: "AP"),
        DSAvatarNameCase("size-lg", name: "Anna Petrova", initials: "AP", image: true),
        DSAvatarNameCase("decorative", name: nil, initials: "AP", image: true),
        DSAvatarNameCase("ringed-over-map", name: "Anna Petrova", initials: "AP", image: true, glass: true),
        DSAvatarNameCase("initials-over-map", name: "Anna Petrova", initials: "AP", glass: true),
        DSAvatarNameCase("on-glass-over-image", name: "Anna Petrova", initials: "AP", glass: true),
        // "Анна Петрова": 12 scalars, 23 bytes of UTF-8, in NFC.
        DSAvatarNameCase("russian-initials", name: "Анна Петрова", initials: "АП"),
    ]
}

/// One row of behavior 2's initials: the name, the locale the transform runs in (as the web's BCP 47 tag), and the
/// initials, or nil for `object.user`. `web/packages/react/test/avatar.test.tsx` asserts the same rows, byte for byte,
/// against `avatarInitials`.
nonisolated struct DSAvatarInitialsCase: Sendable, CustomStringConvertible {
    let name: String?
    let locale: String
    let initials: String?

    init(_ name: String?, _ locale: String, _ initials: String?) {
        self.name = name
        self.locale = locale
        self.initials = initials
    }

    /// The same locale as Foundation spells it.
    var foundationLocale: Locale { Locale(identifier: locale.replacingOccurrences(of: "-", with: "_")) }

    var description: String { "\(name.debugDescription) in \(locale)" }

    static let all: [DSAvatarInitialsCase] = [
        DSAvatarInitialsCase("Anna Petrova", "en-US", "AP"),
        DSAvatarInitialsCase("Northgate", "en-US", "N"),
        DSAvatarInitialsCase("Анна Петрова", "en-US", "АП"),
        DSAvatarInitialsCase("  anna   petrova  ", "en-US", "AP"),
        DSAvatarInitialsCase("anna maria petrova", "en-US", "AP"),
        DSAvatarInitialsCase("Jean-Luc Picard", "en-US", "JP"),
        DSAvatarInitialsCase("(Anna) Petrova", "en-US", "AP"),
        DSAvatarInitialsCase("Unit 4417", "en-US", "U"),
        DSAvatarInitialsCase("4417", "en-US", nil),
        DSAvatarInitialsCase("", "en-US", nil),
        DSAvatarInitialsCase("   ", "en-US", nil),
        DSAvatarInitialsCase("\u{00A0}\t\n\u{3000}", "en-US", nil),
        DSAvatarInitialsCase(nil, "en-US", nil),
        DSAvatarInitialsCase("ilker işık", "tr-TR", "\u{0130}\u{0130}"),
        DSAvatarInitialsCase("ilker işık", "en-US", "II"),
        // Precomposed and decomposed É: each keeps its own scalars, because nothing is normalized.
        DSAvatarInitialsCase("\u{00C9}mile Zola", "fr-FR", "\u{00C9}Z"),
        DSAvatarInitialsCase("E\u{0301}mile Zola", "fr-FR", "E\u{0301}Z"),
        DSAvatarInitialsCase("李 小龍", "zh-CN", "李小"),
    ]
}

/// `spec/components/Avatar.yaml` specVersion 1: the circle as the Surface module's glass chip — `root.background` on
/// every ground, and the recipe, the fallback and the context it publishes — the parts' cells on every context the chip
/// can publish, the sizes per density, the motion, the initials and the name rules of behaviors 1, 2, 11 and 12, the
/// examples as the spec writes them, and the name of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/avatar.test.tsx` says about `Avatar.css`: the appearance function's answer for a
/// set of keys is the token the spec's cell names. No key path is written on the expected side, and
/// `everyCellOfTheMatrixIsAsked` holds the loops to the whole matrix, so a cell the spec adds, or a material or backdrop
/// key no loop reaches, fails here until a test asks it.
///
/// What the chip resolves is read from the one resolver it draws with (`DSSurface.resolveChip`), so the recipe, the
/// fallback and the published context here are the drawing's own. What the simulator publishes to VoiceOver is
/// measured by `DSAvatarAccessibilityTreeTests`, and what every example draws by the snapshot matrix, both in
/// DSSnapshotTests.
@Suite("Avatar bindings (Avatar.yaml v1)")
struct DSAvatarBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Avatar")
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
        "root.background", "root.blur", "root.saturate", "root.edgeStartAlpha", "root.edgeEndAlpha", "initials.color",
        "fallbackIcon.color", "ring.color",
    ]

    /// The paths keyed by size.
    static let sizePaths = ["root.size", "initials.typography", "fallbackIcon.size"]

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSAvatar.init`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default` at
    /// every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 1)
        #expect(try spec.propValues("size") == DSAvatarSize.allCases.map(\.rawValue))
        let props = try #require(spec.document["props"]?.listValue)
        #expect(props.compactMap { $0["name"]?.stringValue } == ["name", "image", "size", "hasRing", "isDecorative"])
        #expect(try propDefault("size") == DSAvatarSize.md.rawValue)
        #expect(try propDefault("hasRing") == "false")
        #expect(try propDefault("isDecorative") == "false")
        #expect(try propDefault("name") == nil)
        #expect(try propDefault("image") == nil)
        #expect(try spec.actionProps.isEmpty)

        let tokens = try #require(spec.document["tokens"]?.mapValue)
        #expect(tokens.keys == ["root", "image", "initials", "fallbackIcon", "ring"])
        #expect(try spec.keys(at: "root") == [
            "background", "blur", "saturate", "fallbackBackground", "fallbackUnderlay", "edgeColor", "edgeStartAlpha",
            "edgeEndAlpha", "radius", "size",
        ])
        #expect(try spec.keys(at: "image") == ["radius"])
        #expect(try spec.keys(at: "initials") == ["typography", "color"])
        #expect(try spec.keys(at: "fallbackIcon") == ["size", "color"])
        #expect(try spec.keys(at: "ring") == ["color", "width"])

        let materials = Set(DSSurfaceMaterial.allCases.map(\.rawValue) + ["default"])
        let backdrops = Set(DSBackdropKind.allCases.map(\.rawValue) + ["default"])
        for path in Self.contextPaths {
            for pair in try #require(spec.binding(path).mapValue, "\(path) is not a matrix").pairs {
                #expect(materials.contains(pair.key), "\(path) is keyed by \(pair.key)")
                if let inner = pair.value.mapValue {
                    #expect(Set(inner.keys).isSubset(of: backdrops), "\(path).\(pair.key) is keyed by \(inner.keys)")
                }
            }
        }
        for path in Self.sizePaths {
            #expect(try spec.keys(at: path) == DSAvatarSize.allCases.map(\.rawValue), "\(path)")
        }

        // `states: [default]`: an avatar is not a control (behavior 10), so there is no state block and no haptic.
        let states = try #require(spec.document["states"]?.listValue).compactMap(\.stringValue)
        #expect(states == ["default"])
        #expect(spec.document["haptics"] == nil)
        let density = try #require(spec.document["density"]?.listValue).compactMap(\.stringValue)
        #expect(density == Self.densities.map(\.rawValue))
        // watchOS is `none`, so the manifest carries no watch key (`DSComponentsContractTests` holds the rest).
        #expect(try spec.platforms["watchos"] == "none")
        #expect(DSComponentsManifest.implemented["Avatar"]?["watchos"] == nil)
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
        for size in DSAvatarSize.allCases {
            for path in Self.sizePaths {
                try reach(path, [size])
            }
        }
        for path in [
            "root.fallbackBackground", "root.fallbackUnderlay", "root.edgeColor", "root.radius", "image.radius",
            "ring.width",
        ] {
            try reach(path, [])
        }
        let written = try spec.allBindings().map(\.path)
        #expect(Set(written) == asked, "unasked: \(Set(written).subtracting(asked).sorted()); asked and absent: \(asked.subtracting(written).sorted())")
        #expect(written.count == Set(written).count, "a cell is written twice")
    }

    // MARK: - The circle is the glass chip (ADR-0036)

    /// `tokens.root.background` on every ground is exactly what Avatar hands the chip shape: `glass` where the cell binds
    /// `material.glass.chip`, the cell itself where it binds another token, and nothing where the matrix has no cell —
    /// accent and inverse, which have no `default` to fall back to (behavior, "On an accent or an inverse surface").
    @Test func backgroundCells() throws {
        for ground in Self.grounds {
            let token = try spec.cell("root.background", ground.material, ground.backdrop)
            switch DSAvatarAppearance.background(on: ground) {
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
                let cell = DSAvatarAppearance.background(on: DSSurfaceContext(material: material, backdrop: backdrop))
                #expect(cell == DSSurfaceChipCell.none, "\(material) \(backdrop)")
            }
        }
        #expect(DSAvatarAppearance.background(on: .root) == DSSurfaceChipCell.own(\.components.avatar.bg))
    }

    /// Where Avatar asks for glass, the chip renders `material.glass.chip`'s recipe, and every value of it is the cell the
    /// spec binds on that ground, in both schemes: the fill, the blur and the saturation where the chip blurs the backdrop
    /// — never on the scheme's glass, where it draws the fill and the edge flat (ADR-0036 §5) — and the edge wherever
    /// glass renders. Where it asks for its own cell or none, no recipe renders and no recipe cell is bound.
    @Test func theChipDrawsTheWholeRecipeWhereTheSpecBindsIt() throws {
        for scheme in DSColorScheme.allCases {
            let tokens = Self.tokens(scheme: scheme)
            for ground in Self.grounds {
                let cell = DSAvatarAppearance.background(on: ground)
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
                let cell = DSAvatarAppearance.background(on: ground)
                let resolution = DSSurface.resolveChip(cell.fill, on: ground, tokens: tokens, isWatch: false)
                #expect(resolution.isGlassFallback == (cell == .glass), "\(tokens.context) \(ground)")
                #expect(resolution.paintsPage == (cell == .glass), "\(tokens.context) \(ground)")
                #expect(resolution.glass == nil, "\(tokens.context) \(ground)")
            }
        }
    }

    /// `tokens.root.radius`: `radius.control`, at least half the side of the largest circle in every density the spec
    /// lists, so the rounded square is exactly the `Circle()` the view draws; `tokens.image.radius` is the same cell, so
    /// the portrait is clipped to the circle.
    @Test func radiusCells() throws {
        try spec.binds(DSAvatarAppearance.radius, at: "root.radius")
        try spec.binds(DSAvatarAppearance.imageRadius, at: "image.radius")
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            try spec.binds(value: tokens[keyPath: DSAvatarAppearance.radius], at: "root.radius", in: tokens)
            for size in DSAvatarSize.allCases {
                #expect(tokens[keyPath: DSAvatarAppearance.radius] * 2 >= tokens[keyPath: DSAvatarAppearance.side(size)], "\(density) \(size)")
            }
        }
    }

    /// `tokens.root.size`: the control height of each size, resolved against the token set each density builds. It
    /// follows density — md is 32 pt in compact, 40 in regular, 48 in comfortable — and not modality (behavior 4).
    @Test func sizeCells() throws {
        for size in DSAvatarSize.allCases {
            try spec.binds(DSAvatarAppearance.side(size), at: "root.size", size)
        }
        for density in Self.densities {
            for modality in [DSModality.touch, .pointer] {
                let tokens = Self.tokens(density: density, modality: modality)
                for size in DSAvatarSize.allCases {
                    try spec.binds(value: tokens[keyPath: DSAvatarAppearance.side(size)], at: "root.size", size, in: tokens)
                }
            }
        }
        let md = { (density: DSDensity) in Self.tokens(density: density)[keyPath: DSAvatarAppearance.side(.md)] }
        #expect(md(.compact) == 32)
        #expect(md(.regular) == 40)
        #expect(md(.comfortable) == 48)
        // The circle takes the control height, so it lines up with the IconButton of the same size (behavior 4).
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            #expect(tokens[keyPath: DSAvatarAppearance.side(.sm)] == DSIconButtonAppearance.side(.sm, tokens.components.iconButton))
            #expect(tokens[keyPath: DSAvatarAppearance.side(.md)] == DSIconButtonAppearance.side(.md, tokens.components.iconButton))
            #expect(tokens[keyPath: DSAvatarAppearance.side(.lg)] == DSIconButtonAppearance.side(.lg, tokens.components.iconButton))
        }
    }

    // MARK: - The parts

    /// `tokens.initials.typography`: `type.label.*`, by size.
    @Test func initialsTypographyCells() throws {
        for size in DSAvatarSize.allCases {
            try spec.binds(DSAvatarAppearance.initialsRole(size).keyPath, at: "initials.typography", size)
        }
    }

    /// `tokens.initials.color`, `tokens.fallbackIcon.color` and `tokens.ring.color` on every context the chip can
    /// publish: the defaults, the glass fill's foreground and its ring over media, the ring of media on vivid, and the
    /// pairs of accent and inverse, where the ring takes `color.text.on-inverse`.
    @Test func partColorCells() throws {
        for ground in Self.grounds {
            try spec.binds(DSAvatarAppearance.initialsColor(on: ground), at: "initials.color", ground.material, ground.backdrop)
            try spec.binds(DSAvatarAppearance.fallbackIconColor(on: ground), at: "fallbackIcon.color", ground.material, ground.backdrop)
            try spec.binds(DSAvatarAppearance.ringColor(on: ground), at: "ring.color", ground.material, ground.backdrop)
        }
    }

    /// `tokens.fallbackIcon.size`: Icon's box of the same name, which `DSIcon` resolves, asked in every density: the
    /// glyph is the same box in each (Icon.yaml behavior 10). The glyph is `object.user` (anatomy).
    @Test func fallbackIconSizeCells() throws {
        for density in Self.densities {
            let tokens = Self.tokens(density: density)
            for size in DSAvatarSize.allCases {
                let box = DSIconAppearance.box(DSAvatarAppearance.fallbackIconSize(size), tokens.size)
                try spec.binds(value: box, at: "fallbackIcon.size", size, in: tokens)
            }
        }
        #expect(DSAvatarAppearance.fallbackIcon == .objectUser)
        #expect(spec.text.contains("object.user"))
    }

    /// `tokens.ring.width`: `border.strong`, the emphasized stroke.
    @Test func ringWidthCell() throws {
        try spec.binds(DSAvatarAppearance.ringWidth, at: "ring.width")
    }

    /// Under a forced Reduce Transparency or Increase Contrast, wherever the circle asks for glass the chip falls back
    /// and publishes `(raised, none)`, so every part takes its `default` cell: the initials `color.text.secondary`, the
    /// glyph `color.icon.secondary` and the ring `comp.avatar.ring` (`accessibility.reduceTransparency`, ADR-0036 §4).
    /// Inside a glass Surface the Surface falls back first and publishes `raised` over the backdrop it declared, where
    /// the circle asks for its own cell: the parts read `raised` either way. A selected glass Surface falls back to
    /// inverse, where the circle has no fill and the parts take the inverse pair (behavior, "On an accent or an inverse
    /// surface").
    @Test func underAForcedSettingEveryPartIsItsDefaultCell() throws {
        let initials = try #require(spec.color("initials.color", "default"))
        let glyph = try #require(spec.color("fallbackIcon.color", "default"))
        let ring = try #require(spec.color("ring.color", "default"))
        func expectDefaults(_ published: DSSurfaceContext, _ comment: String) {
            #expect(DSAvatarAppearance.initialsColor(on: published) == initials, "\(comment)")
            #expect(DSAvatarAppearance.fallbackIconColor(on: published) == glyph, "\(comment)")
            #expect(DSAvatarAppearance.ringColor(on: published) == ring, "\(comment)")
        }
        for tokens in [Self.tokens(transparency: .reduced), Self.tokens(contrast: .increased)] {
            for ground in Self.grounds where DSAvatarAppearance.background(on: ground) == .glass {
                let resolution = DSSurface.resolveChip(.glass, on: ground, tokens: tokens, isWatch: false)
                #expect(resolution.rendered == .fallback, "\(tokens.context) \(ground)")
                #expect(resolution.published == DSSurfaceContext(material: .raised), "\(tokens.context) \(ground)")
                expectDefaults(resolution.published, "\(tokens.context) \(ground)")
            }
            for backdrop in [DSBackdropKind.map, .image, .vivid] {
                let surface = DSSurface.resolve(material: .glass, backdrop: backdrop, tokens: tokens, isWatch: false)
                #expect(surface.published == DSSurfaceContext(material: .raised, backdrop: backdrop))
                let cell = DSAvatarAppearance.background(on: surface.published)
                #expect(cell == DSSurfaceChipCell.own(\.components.avatar.bg), "\(tokens.context) glass over \(backdrop)")
                let chip = DSSurface.resolveChip(cell.fill, on: surface.published, tokens: tokens, isWatch: false)
                expectDefaults(chip.published, "\(tokens.context) glass over \(backdrop)")

                let selected = DSSurface.resolve(material: .glass, backdrop: backdrop, selected: true, tokens: tokens, isWatch: false)
                #expect(DSAvatarAppearance.background(on: selected.published) == DSSurfaceChipCell.none)
                #expect(DSAvatarAppearance.initialsColor(on: selected.published) == \DSTokenSet.color.textOnInverse)
                #expect(DSAvatarAppearance.ringColor(on: selected.published) == \DSTokenSet.color.textOnInverse)
            }
        }
        // With both settings standard, the chip renders glass and publishes the ground, so the parts key on the media.
        let standard = DSSurface.resolveChip(.glass, on: DSSurfaceContext(material: .page, backdrop: .map), tokens: Self.tokens(), isWatch: false)
        #expect(standard.rendered == .glass)
        #expect(standard.published == DSSurfaceContext(material: .page, backdrop: .map))
        #expect(DSAvatarAppearance.initialsColor(on: standard.published) == \DSTokenSet.color.textOnGlassFill)
    }

    // MARK: - Motion

    /// `motion.imageLoad` is `motion.duration.base` and `motion.reduceMotion` is `crossfade`: an image fades in over
    /// `motion.duration.base` with `motion.easing.out` in both motion modes, over the shorter duration the reduced context
    /// carries, and nothing scales, moves or blurs (`accessibility.reduceMotion`).
    @Test func motionCells() throws {
        try spec.binds(DSAvatarAppearance.imageLoad, at: "motion.imageLoad")
        #expect(try spec.cell("motion.reduceMotion") == DSAvatarAppearance.reduceMotion.rawValue)
        for mode in DSMotionMode.allCases {
            let tokens = Self.tokens(motion: mode)
            let motion = DSMotion(tokens.motion)
            #expect(DSAvatarAppearance.imageLoadDuration(motion) == tokens[keyPath: DSAvatarAppearance.imageLoad], "\(mode)")
            #expect(DSAvatarAppearance.imageLoadDuration(motion) > 0, "\(mode): the fade is not dropped")
            #expect(DSAvatarAppearance.imageLoadAnimation(motion) == tokens.motion.easingOut.animation(duration: tokens.motion.durationBase), "\(mode)")
        }
        let standard = DSMotion(Self.tokens(motion: .standard).motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        #expect(DSAvatarAppearance.imageLoadDuration(reduced) <= DSAvatarAppearance.imageLoadDuration(standard))
    }

    // MARK: - Layout

    /// The circle lays out at its side and nothing else: an image, the ring and a name that draws the glyph never move
    /// it (behavior 6), and it grows with Dynamic Type only up to accessibility3, where it clamps
    /// (`accessibility.dynamicType`). On a host with no Dynamic Type, macOS, the three sizes are equal.
    ///
    /// Measured as the size of an `ImageRenderer` render, which the host lays out correctly even though it paints no
    /// token colour (`DSRenderCapability`): this reads layout, never a pixel.
    @Test @MainActor func theCircleIsItsSideAndNothingElse() throws {
        func measure(_ view: some View) throws -> CGSize {
            let renderer = ImageRenderer(content: DSTheme { view })
            renderer.scale = 1
            let image = try #require(renderer.cgImage)
            return CGSize(width: image.width, height: image.height)
        }
        let portrait = DSExamplePortrait.drawn(backdrop: .gray, shoulders: .gray, head: .gray)
        for density in Self.densities {
            for size in DSAvatarSize.allCases {
                let side = Self.tokens(density: density)[keyPath: DSAvatarAppearance.side(size)]
                let initials = try measure(DSAvatar(name: "Anna Petrova", size: size).dynamicTypeSize(.large).dsDensity(density))
                #expect(initials == CGSize(width: side, height: side), "\(density) \(size): the circle lays out at \(initials)")
                let variants: [(String, AnyView)] = [
                    ("an image", AnyView(DSAvatar(name: "Anna Petrova", image: portrait, size: size))),
                    ("the ring", AnyView(DSAvatar(name: "Anna Petrova", size: size, hasRing: true))),
                    ("the glyph", AnyView(DSAvatar(size: size))),
                    ("a decorative image and ring", AnyView(DSAvatar(name: "Anna Petrova", image: portrait, size: size, hasRing: true, isDecorative: true))),
                ]
                for (description, view) in variants {
                    #expect(try measure(view.dynamicTypeSize(.large).dsDensity(density)) == initials, "\(density) \(size): \(description) moves the circle")
                }
                let largest = try measure(DSAvatar(name: "Anna Petrova", size: size).dynamicTypeSize(.accessibility3).dsDensity(density))
                let beyond = try measure(DSAvatar(name: "Anna Petrova", size: size).dynamicTypeSize(.accessibility5).dsDensity(density))
                #expect(beyond == largest, "\(density) \(size): the circle grows past accessibility3")
                #expect(largest.width >= initials.width && largest.width == largest.height, "\(density) \(size): \(largest)")
            }
        }
    }

    // MARK: - What an avatar shows and says

    /// Behavior 2's vectors, which `avatar.test.tsx` asserts too: the initials of each name in each locale, byte for
    /// byte, or nil for `object.user`.
    @Test(arguments: DSAvatarInitialsCase.all)
    func theSharedInitialsVectors(_ vector: DSAvatarInitialsCase) {
        let drawn = DSAvatarAppearance.initials(of: vector.name, locale: vector.foundationLocale)
        #expect(drawn.map { Array($0.utf8) } == vector.initials.map { Array($0.utf8) }, "\(vector): \(drawn.debugDescription)")
    }

    /// The name an avatar is announced by: `name` as written — never upper-cased, trimmed or normalized — for an avatar
    /// with a name that is not decorative; nothing for every other avatar, whatever `isDecorative` says, with Icon's
    /// blank rule; and a name with no letter in it still names the avatar that draws the glyph (behaviors 11 and 12).
    @Test func anAvatarIsNamedOnlyByItsName() {
        #expect(DSAvatarAppearance.accessibilityName("Anna Petrova", isDecorative: false) == "Anna Petrova")
        #expect(DSAvatarAppearance.accessibilityName("ilker işık", isDecorative: false) == "ilker işık")
        #expect(DSAvatarAppearance.accessibilityName("  Anna  ", isDecorative: false) == "  Anna  ")
        #expect(DSAvatarAppearance.accessibilityName("4417", isDecorative: false) == "4417")
        #expect(DSAvatarAppearance.initials(of: "4417", locale: Self.english) == nil)
        #expect(DSAvatarAppearance.accessibilityName("Anna Petrova", isDecorative: true) == nil)
        #expect(DSAvatarAppearance.accessibilityName(nil, isDecorative: false) == nil)
        #expect(DSAvatarAppearance.accessibilityName(nil, isDecorative: true) == nil)
        for blank in DSIconBindingTests.blankLabels {
            #expect(!DSAvatarAppearance.hasName(blank), "\(blank.debugDescription)")
            #expect(DSAvatarAppearance.accessibilityName(blank, isDecorative: false) == nil, "\(blank.debugDescription)")
            #expect(DSAvatarAppearance.initials(of: blank, locale: Self.english) == nil, "\(blank.debugDescription)")
            // Icon's blank rule, the same characters.
            #expect(DSAvatarAppearance.hasName(blank) == DSIconAppearance.hasLabel(LocalizedStringKey(blank), locale: Self.english))
        }
        #expect(DSAvatarAppearance.isExposed(hasName: true, isDecorative: false))
        #expect(!DSAvatarAppearance.isExposed(hasName: true, isDecorative: true))
        #expect(!DSAvatarAppearance.isExposed(hasName: false, isDecorative: false))
        #expect(!DSAvatarAppearance.isExposed(hasName: false, isDecorative: true))
    }

    /// ADR-0032: Avatar owns no string. Its name is the caller's `name`, and the glyph is never named (behavior 12).
    @Test func avatarOwnsNoString() throws {
        let named = Set(spec.text.matches(of: /strings\.([A-Za-z]+)\.([A-Za-z]+)/).map { "\($0.1).\($0.2)" })
        #expect(named.isEmpty)
    }

    // MARK: - The examples

    /// Every row of `DSAvatarExamples` is the example the spec writes under that id: the props, with the spec's defaults
    /// where the entry writes none, the `portrait` fixture where it writes one, and where it is staged — on a ground, or
    /// inside a Surface over a backdrop.
    ///
    /// `hasGlass` is what the snapshots take under forced Reduce Transparency, so it is held to the spec rather than to
    /// the row: an example renders glass when its Surface is glass or when the circle's `root.background` on the
    /// context it is staged in binds `material.glass.chip`.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSAvatarExamples.rows.map(\.id))
        #expect(DSAvatarExamples.rows.count == 12)
        for (entry, row) in zip(entries, DSAvatarExamples.rows) {
            let props = entry.value["props"]
            #expect(row.name == props?["name"]?.stringValue, "\(row.id)")
            #expect(row.size.rawValue == (try prop("size", of: entry)), "\(row.id)")
            #expect(String(row.hasRing) == (try prop("hasRing", of: entry)), "\(row.id)")
            #expect(String(row.isDecorative) == (try prop("isDecorative", of: entry)), "\(row.id)")
            if let image = props?["image"] {
                let fixture = try #require(image.mapValue, "\(row.id): an image that is not a fixture (spec/SCHEMA.md)")
                #expect(fixture.keys == ["fixture"] && fixture["fixture"]?.stringValue == "portrait", "\(row.id): \(fixture.keys)")
                #expect(row.hasPortrait, "\(row.id)")
            } else {
                #expect(!row.hasPortrait, "\(row.id)")
            }

            let surface = entry.value["surface"]?.stringValue
            let backdrop = entry.value["backdrop"]?.stringValue
            let staging: DSAvatarExampleStaging
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
        #expect(DSAvatarExamples.all.filter(\.hasGlass).map(\.name) == ["ringed-over-map", "initials-over-map", "on-glass-over-image"])
    }

    // MARK: - Accessibility

    /// `DSAvatarNameCase.all`, the table both stacks assert: every example with a name that is not decorative is named
    /// by it byte for byte, and the others are hidden; each draws the initials the table says, under the portrait where it
    /// has one, and its circle renders the glass chip exactly where the table says. `russian-initials` is the Cyrillic
    /// name, 12 scalars and 23 UTF-8 bytes, in NFC.
    @Test @MainActor func everyExampleIsNamedAsTheTableSays() throws {
        #expect(DSAvatarNameCase.all.map(\.id) == DSAvatarExamples.rows.map(\.id))
        let tokens = Self.tokens()
        for (row, want) in zip(DSAvatarExamples.rows, DSAvatarNameCase.all) {
            let name = DSAvatarAppearance.accessibilityName(row.name, isDecorative: row.isDecorative)
            #expect(name.map { Array($0.utf8) } == want.name.map { Array($0.utf8) }, "\(row.id): named \(name.debugDescription)")
            let initials = DSAvatarAppearance.initials(of: row.name, locale: Self.english)
            #expect(initials.map { Array($0.utf8) } == want.initials.map { Array($0.utf8) }, "\(row.id): draws \(initials.debugDescription)")
            #expect(row.hasPortrait == want.hasImage, "\(row.id)")
            let chip = DSSurface.resolveChip(DSAvatarAppearance.background(on: row.context).fill, on: row.context, tokens: tokens, isWatch: false)
            #expect((chip.rendered == .glass) == want.rendersGlass, "\(row.id): renders \(chip.rendered)")
            if !want.rendersGlass {
                #expect(chip.rendered == .own, "\(row.id): renders \(chip.rendered)")
            }
        }
        let russian = try #require(DSAvatarNameCase.all.first { $0.id == "russian-initials" }?.name)
        #expect(russian.unicodeScalars.count == 12)
        #expect(Array(russian.utf8).count == 23)
        #expect(russian == russian.precomposedStringWithCanonicalMapping)
        #expect(russian.unicodeScalars.allSatisfy { $0 == " " || (0x0410...0x044F).contains($0.value) })
        #expect(DSAvatarNameCase.all.compactMap(\.name).allSatisfy { $0 == $0.trimmingCharacters(in: .whitespacesAndNewlines) })
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
        let list = try #require(spec.document["examples"]?.listValue, "Avatar.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        let props = try #require(spec.document["props"]?.listValue)
        let entry = try #require(props.first { $0["name"]?.stringValue == name }, "Avatar.yaml has no prop \(name)")
        return entry["default"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
