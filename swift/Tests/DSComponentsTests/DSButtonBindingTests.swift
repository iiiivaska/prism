import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSIcons
import DSTokens
@testable import DSComponents

/// `spec/components/Button.yaml` specVersion 3: the binding matrix keyed by variant and published material, the sizes
/// per density, the press and its Reduce Motion substitute, the hit region, the Dynamic Type rule and the watch
/// adaptations.
///
/// **The matrix is read out of the spec, not written again here** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`).
/// Every cell test says the sentence the web test says about `Button.css`
/// (`web/packages/react/test/button.test.tsx`): the appearance function's answer for a set of keys is the token the
/// spec's cell names. Both stacks are now checked against one document, so a spec change that one stack follows and
/// the other does not fails on the stack that did not follow it — which nothing did before: parity compares version
/// integers, the gallery pairs by filename, and each snapshot suite compares a stack to itself.
///
/// What stays hand-written, and why, is marked at each test: a rule the spec states as prose (the hit region, the
/// Dynamic Type clamp, the watch adaptations), a value the spec deliberately does not bind (the outline width), and
/// the one documented deviation from a cell (the primary spinner on vivid).
@Suite("Button bindings (Button.yaml v3)")
struct DSButtonBindingTests {
    let spec: DSSpec
    /// Ghost and danger bind no spinner cell of their own, so their spinner is Spinner.yaml's arc.
    let spinner: DSSpec

    init() throws {
        spec = try DSSpec.component("Button")
        spinner = try DSSpec.component("Spinner")
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
    /// (ADR-0022 §3.1), so every material is asked, including the ones with no cell of their own.
    static let materials = DSSurfaceMaterial.allCases

    // MARK: - The document

    /// The spec this file is the Apple half of, and the axes its matrices are keyed by.
    ///
    /// The axis check is what keeps the loops below honest: a loop over an axis the matrix is not keyed by would
    /// read `default` at every step and pass while checking one cell nine times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 3)
        #expect(try spec.propValues("variant") == DSButtonVariant.allCases.map(\.rawValue))
        #expect(try spec.propValues("size") == DSButtonSize.allCases.map(\.rawValue))
        let variants = Set(try spec.propValues("variant"))
        for property in ["root.background", "root.foreground", "root.border", "root.pressed.background", "spinner.color"] {
            let keys = Set(try spec.keys(at: property)).subtracting(["default"])
            #expect(!keys.isEmpty && keys.isSubset(of: variants), "\(property) is keyed by \(keys.sorted())")
        }
        let materials = Set(Self.materials.map(\.rawValue))
        for property in ["root.background.primary", "root.foreground.ghost", "root.border.ghost"] {
            let keys = Set(try spec.keys(at: property)).subtracting(["default"])
            #expect(!keys.isEmpty && keys.isSubset(of: materials), "\(property) is keyed by \(keys.sorted())")
        }
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: every variant on every published material, out of the spec's own matrix — the
    /// primary pill's white on vivid (ADR-0030 §3.1) and the ghost's absent cell (ADR-0029 §3.3, rule 9) included.
    @Test func backgroundCells() throws {
        for material in Self.materials {
            for variant in DSButtonVariant.allCases {
                try spec.binds(DSButtonAppearance.background(variant, on: material), at: "root.background", variant, material)
            }
        }
    }

    /// `tokens.root.foreground`, which is also the colour of the label and the icons.
    @Test func foregroundCells() throws {
        for material in Self.materials {
            for variant in DSButtonVariant.allCases {
                try spec.binds(DSButtonAppearance.foreground(variant, on: material), at: "root.foreground", variant, material)
            }
        }
    }

    /// `tokens.root.border`, and the width the spec does not bind.
    @Test func borderCells() throws {
        for material in Self.materials {
            for variant in DSButtonVariant.allCases {
                try spec.binds(DSButtonAppearance.border(variant, on: material), at: "root.border", variant, material)
            }
        }
        // Button.yaml binds no border width; the signed-off direction board draws every pill outline at
        // `border.hairline` (docs/direction-board, `.btn-secondary`, `.btn-ghost`, `.btn-danger`). The absence is
        // asserted, so the day the spec binds one this test says to read the cell instead of this line.
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.borderWidth") }
        let border = Self.tokens().border
        #expect(DSButtonAppearance.borderWidth(border) == border.hairline)
    }

    /// `tokens.root.pressed.background` and `tokens.root.hover.overlay`, and the danger pill's Reduce Motion
    /// substitute, which `accessibility.reduceMotion` names in prose.
    @Test func pressedAndHoverCells() throws {
        for material in Self.materials {
            for variant in DSButtonVariant.allCases {
                // The pressed matrix carries no material level; primary on vivid is the one documented deviation
                // (`DSButtonAppearance.pressedBackground`): read literally the pressed cell would be the ink solid
                // under an ink label, so the vivid pill keeps its own rest fill.
                if variant == .primary && material == .vivid {
                    #expect(DSButtonAppearance.pressedBackground(.primary, on: .vivid) == DSButtonAppearance.background(.primary, on: .vivid))
                    continue
                }
                try spec.binds(DSButtonAppearance.pressedBackground(variant, on: material), at: "root.pressed.background", variant, material)
            }
        }
        try spec.binds(DSButtonAppearance.hoverOverlay, at: "root.hover.overlay")
        // `accessibility.reduceMotion`: danger takes `color.bg.fill.neutral.subtle`, the rest take their pressed
        // fill, which they already show while pressed.
        #expect(DSButtonAppearance.reducedMotionPressOverlay(.danger) == \.color.bgFillNeutralSubtle)
        for variant in [DSButtonVariant.primary, .secondary, .ghost] {
            #expect(DSButtonAppearance.reducedMotionPressOverlay(variant) == nil, "\(variant)")
        }
    }

    /// A tinted danger pill paints `color.bg.page` under its tint over media (ADR-0030 §6.2), and nowhere else.
    ///
    /// Button.yaml v3 binds no `underlay`, so this is the one appearance function with no cell behind it: the rule
    /// comes from the ADR and the materials are the ones IconButton.yaml keys its own `underlay` by. The missing
    /// property is asserted, so a v4 that adds the cell fails here rather than leaving two rules in two places.
    @Test func dangerPaintsThePageOverMedia() throws {
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.underlay") }
        for material in Self.materials {
            let media = [DSSurfaceMaterial.vivid, .glass, .glassLight].contains(material)
            #expect((DSButtonAppearance.underlay(.danger, on: material) == \.color.bgPage) == media, "\(material)")
            for variant in [DSButtonVariant.primary, .secondary, .ghost] {
                #expect(DSButtonAppearance.underlay(variant, on: material) == nil, "\(variant) \(material)")
            }
        }
    }

    /// `tokens.spinner.color` for primary and secondary; ghost and danger bind no cell, so their spinner is
    /// `Spinner.yaml` `tokens.arc.color` for the published material — read out of that spec here, which is what the
    /// hand-written table of nine materials in this file used to be.
    @Test func spinnerCells() throws {
        for material in Self.materials {
            // On vivid the primary cell is `comp.button.primary.text`, the ink of the pill the spinner is not on;
            // Spinner.yaml says a Button binds its own foreground, which there is `color.text.on-inverse-media`.
            if material == .vivid {
                #expect(DSButtonAppearance.spinner(.primary, on: .vivid) == DSButtonAppearance.foreground(.primary, on: .vivid))
            } else {
                try spec.binds(DSButtonAppearance.spinner(.primary, on: material), at: "spinner.color", DSButtonVariant.primary)
            }
            try spec.binds(DSButtonAppearance.spinner(.secondary, on: material), at: "spinner.color", DSButtonVariant.secondary)
            for variant in [DSButtonVariant.ghost, .danger] {
                #expect(try spec.cell("spinner.color", variant) == nil, "\(variant)")
                try spinner.binds(DSButtonAppearance.spinner(variant, on: material), at: "arc.color", material)
                try spinner.binds(DSButtonAppearance.spinnerArc(on: material), at: "arc.color", material)
            }
        }
    }

    /// `tokens.root.radius`, `.gap`, `.height` and `.paddingX`, resolved against the token set the density builds.
    ///
    /// These four are values, not key paths — the appearance functions return the `CGFloat` a layout uses — so
    /// `binds(value:…)` resolves the cell through the token set each density builds and compares the numbers. That
    /// catches a swapped size and a literal, which is what the hand-written version caught, the sizes come from the
    /// spec, and a failure names the cell it read (`Button.yaml tokens.root.height [sm]`) and the density it was
    /// resolved for, as every key-path cell above does.
    @Test func sizeCells() throws {
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            let button = tokens.components.button
            for size in DSButtonSize.allCases {
                try spec.binds(value: DSButtonAppearance.height(size, button), at: "root.height", size, in: tokens)
                try spec.binds(value: DSButtonAppearance.paddingX(size, button), at: "root.paddingX", size, in: tokens)
            }
            try spec.binds(value: button.gap, at: "root.gap", in: tokens)
            try spec.binds(value: button.radius, at: "root.radius", in: tokens)
            // What those `comp` tokens alias: heights follow density (`size.control.*`, ADR-0024 §7.1), padding and
            // gap the space scale, the radius the pill.
            #expect(DSButtonAppearance.height(.sm, button) == tokens.size.controlSm, "\(density)")
            #expect(DSButtonAppearance.height(.md, button) == tokens.size.controlMd, "\(density)")
            #expect(DSButtonAppearance.height(.lg, button) == tokens.size.controlLg, "\(density)")
            #expect(DSButtonAppearance.paddingX(.sm, button) == tokens.space.step4, "\(density)")
            #expect(DSButtonAppearance.paddingX(.md, button) == tokens.space.step5, "\(density)")
            #expect(DSButtonAppearance.paddingX(.lg, button) == tokens.space.step6, "\(density)")
            #expect(button.gap == tokens.space.step3, "\(density)")
            #expect(button.radius == tokens.radius.control, "\(density)")
        }
        #expect(DSButtonAppearance.height(.md, Self.tokens(density: .compact).components.button) == 32)
        #expect(DSButtonAppearance.height(.lg, Self.tokens(density: .watch).components.button) == 44)
    }

    /// `motion.press` is `comp.button.motion.press`, which is the snappy spring in every motion mode.
    @Test func motionCells() throws {
        try spec.binds(\DSTokenSet.components.button.motionPress, at: "motion.press")
        #expect(try spec.cell("motion.reduceMotion") == "crossfade")
        for motion in DSMotionMode.allCases {
            let tokens = Self.tokens(motion: motion)
            #expect(tokens.components.button.motionPress == tokens.motion.springSnappy, "\(motion)")
        }
    }

    /// `tokens.label.typography` and `tokens.leadingIcon.size` (`size.icon.md`, the control glyph box).
    @Test func labelAndIconCells() throws {
        for size in DSButtonSize.allCases {
            try spec.binds(size.labelRole.keyPath, at: "label.typography", size)
        }
        let leading = try #require(try spec.dimension("leadingIcon.size"))
        let trailing = try #require(try spec.dimension("trailingIcon.size"))
        #expect(leading == trailing)
        let tokens = Self.tokens()
        #expect(tokens[keyPath: leading] == DSIconSize.md.box)
        #expect(tokens.size.iconMd == DSIconSize.md.box)
        #expect(DSGlyphGeometry.drawnSide(box: tokens.size.iconMd) == DSIconSize.md.pointSize)
        #expect(DSGlyphGeometry.drawnSide(box: tokens.size.iconSm) == DSIconSize.sm.pointSize)
    }

    /// `tokens.root.disabled.opacity` and `tokens.root.focus-visible.*`: the cells no appearance function returns,
    /// because `DSButton` applies them to the view itself (`.opacity(…)` and `DSFocusRing`). They are pinned as key
    /// paths so a spec that moves them fails on this side too; what the ring actually draws is the simulator's job.
    @Test func theCellsTheViewAppliesItself() throws {
        #expect(try spec.number("root.disabled.opacity") == \DSTokenSet.opacity.disabled)
        #expect(try spec.color("root.focus-visible.ring") == \DSTokenSet.color.borderFocus)
        #expect(try spec.dimension("root.focus-visible.ringWidth") == \DSTokenSet.border.focus)
    }

    // MARK: - Behavior

    /// The hit region is the larger of the visual size and `size.hit` on each axis, and never shrinks the pill
    /// (behavior 2, prose).
    @Test func hitRegionReachesSizeHit() {
        let touch = Self.tokens(modality: .touch).size.hit
        let pointer = Self.tokens(modality: .pointer).size.hit
        #expect(touch == 44 && pointer == 28)
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 96, height: 32), hit: touch) == CGSize(width: 0, height: 6))
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 96, height: 32), hit: pointer) == .zero)
        #expect(DSControlAppearance.hitOutset(visual: CGSize(width: 20, height: 16), hit: touch) == CGSize(width: 12, height: 14))
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density, modality: .touch)
            for size in DSButtonSize.allCases {
                let height = DSButtonAppearance.height(size, tokens.components.button)
                let outset = DSControlAppearance.hitOutset(visual: CGSize(width: height, height: height), hit: tokens.size.hit)
                #expect(height + 2 * outset.height == max(height, tokens.size.hit), "\(density) \(size)")
            }
        }
    }

    /// The press scales to 0.97 on the press spring; under Reduce Motion nothing scales and the substitute fill
    /// shows over `motion.duration.base` with `motion.easing.out` (behavior 6 and `accessibility.reduceMotion`).
    @Test @MainActor func pressMotion() throws {
        let standard = DSMotion(Self.tokens().motion)
        let reduced = DSMotion(Self.tokens(motion: .reduced).motion)
        #expect(DSControlAppearance.pressedScale == 0.97)
        #expect(abs(DSControlAppearance.scale(isPressed: true, motion: standard) - 0.97) < 0.000_1)
        #expect(DSControlAppearance.scale(isPressed: false, motion: standard) == 1)
        #expect(DSControlAppearance.scale(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: standard) == 0)
        #expect(DSControlAppearance.substituteOpacity(isPressed: true, motion: reduced) == 1)
        #expect(DSControlAppearance.substituteOpacity(isPressed: false, motion: reduced) == 0)
        let spring = Self.tokens()[keyPath: try #require(try spec.spring("motion.press"))]
        #expect(DSControlAppearance.pressAnimation(spring, motion: standard) == spring.animation)
        #expect(
            DSControlAppearance.pressAnimation(spring, motion: reduced)
                == reduced.tokens.easingOut.animation(duration: reduced.tokens.durationBase)
        )
        #expect(DSControlAppearance.hoverAnimation(standard) == standard.tokens.easingHover.animation(duration: standard.tokens.durationQuick))
    }

    /// Hover exists only under pointer modality, and only on a control that takes input (behavior 6).
    @Test func hoverIsPointerOnly() {
        let pointer = Self.tokens(modality: .pointer).interaction
        let touch = Self.tokens(modality: .touch).interaction
        #expect(DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: touch, isInteractive: true))
        #expect(!DSControlAppearance.showsHover(isHovered: true, interaction: pointer, isInteractive: false))
        #expect(!DSControlAppearance.showsHover(isHovered: false, interaction: pointer, isInteractive: true))
    }

    /// Labels never wrap up to accessibility3, where the height clamps; past it they wrap to two lines
    /// (`accessibility.dynamicType`, prose).
    @Test func labelsWrapOnlyPastTheClamp() {
        #expect(DSButtonAppearance.largestTypeSize == .accessibility3)
        for size in DynamicTypeSize.allCases {
            #expect(DSButtonAppearance.labelLines(at: size) == (size > .accessibility3 ? 2 : 1), "\(size)")
        }
    }

    /// `notes.platform.watchos`: sizes collapse to lg, ghost renders as secondary, no trailing icon.
    @Test func watchAdaptations() {
        for size in DSButtonSize.allCases {
            #expect(size.rendered(isWatch: false) == size)
            #expect(size.rendered(isWatch: true) == .lg)
        }
        for variant in DSButtonVariant.allCases {
            #expect(variant.rendered(isWatch: false) == variant)
            #expect(variant.rendered(isWatch: true) == (variant == .ghost ? .secondary : variant))
        }
        #expect(DSButtonAppearance.trailingIcon(DSIconName.navOpen, isWatch: false) == .navOpen)
        #expect(DSButtonAppearance.trailingIcon(DSIconName.navOpen, isWatch: true) == nil)
    }

    /// The spinner's geometry: the 270° open sweep and one turn.
    @Test func spinnerGeometry() {
        #expect(DSSpinnerGeometry.sweep == 0.75)
        #expect(DSSpinnerGeometry.turn.degrees == 360)
    }
}

// The pixel half of this file — `DSButtonRenderTests`, what a Button actually draws — is
// `swift/Tests/DSSnapshotTests/DSButtonRenderTests.swift`, which runs on the simulator: `swift test` copies
// Colors.xcassets uncompiled, so on the host a pill and the page behind it both render transparent and
// "the ghost pill matches the page" passes on two empty images (`DSRenderCapability`).
