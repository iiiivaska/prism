import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// The reader the binding tests stand on: the YAML subset, the binding-matrix walk, the key-path table and the
/// assertion itself.
///
/// A helper that cannot fail is worth nothing, and a reader that returns nothing for everything would make every
/// binding test pass while checking nothing. So this suite checks the reader against a document written here — not
/// against whichever spec happens to be in the repository — and `theAssertionFailsWhenTheImplementationDisagrees`
/// holds the failing half: each `withKnownIssue` there accepts only the disagreement it expects, word for word, so it
/// fails the day `binds` stops reporting one, and the day it reports something else instead.
@Suite("The spec reader (spec/SCHEMA.md)")
struct DSSpecReaderTests {
    /// One document with every form the corpus writes: block mappings and sequences, a folded scalar, flow
    /// mappings and sequences, a quoted key, a quoted scalar with a colon in it, a state block, and a key with
    /// nothing under it.
    static let sample = """
        name: Sample
        specVersion: 3
        summary: >-
          A tappable action with one label
          and an optional icon.
        platforms:
          ios: full
          watchos: none
        props:
          - name: variant
            type: enum
            values: [primary, secondary, ghost]
            default: primary
          - name: onPress
            type: action
            required: true
        tokens:
          root:
            background:
              primary:
                default: comp.button.primary.bg.rest
                vivid: color.bg.fill.inverse-media
              secondary: comp.button.secondary.bg.rest
            height: { sm: comp.button.height.sm, md: comp.button.height.md }
            gap: space.3
            pressed:
              background:
                primary: comp.button.primary.bg.pressed
            focus-visible:
              ring: color.border.focus
          overlay:
            gradient:
              "1": gradient.vivid.1
          label:
            typography:
              sm: type.label.sm
              md: type.label.md
        motion:
          press: comp.button.motion.press
          reduceMotion: crossfade
        behavior:
          - "`isLoading` keeps the width: the label becomes \\"<label>, loading\\"."
        examples:
          - id: a
            props: { variant: primary, action: custom, actionIcon: action.pause }
            schemes: [light]
          - id: b
            props:
              variant: ghost
        notes:
        """

    static func spec() throws -> DSSpec { try DSSpec.parsing("Sample", sample) }

    // MARK: - The YAML subset

    @Test func theDocumentIsReadTheWayItIsWritten() throws {
        let spec = try Self.spec()
        #expect(try spec.specVersion == 3)
        #expect(try spec.platforms == ["ios": "full", "watchos": "none"])
        #expect(spec.document["summary"]?.stringValue == "A tappable action with one label and an optional icon.")
        #expect(try spec.propValues("variant") == ["primary", "secondary", "ghost"])
        #expect(try spec.actionProps == ["onPress"])
        #expect(spec.document["notes"] == .null)
        // A sequence item that is a quoted scalar keeps its colon and its escaped quotes.
        #expect(spec.document["behavior"]?.listValue?.first?.stringValue == #"`isLoading` keeps the width: the label becomes "<label>, loading"."#)
    }

    @Test func theExampleBlockIsReadAsTheHarnessNeedsIt() throws {
        let spec = try Self.spec()
        #expect(try spec.exampleIDs == ["a", "b"])
        // An example that declares no schemes renders in both.
        #expect(try spec.exampleSchemes == ["a": ["light"], "b": ["light", "dark"]])
        // `actionIcon` is not `action`, and an example that declares none takes the prop's default.
        #expect(try spec.exampleActions == ["a": "custom"])
    }

    @Test func everySpecInTheRepositoryParses() throws {
        let directories = ["spec/components", "spec/patterns"]
        var read = 0
        for directory in directories {
            let url = DSSpec.repository.appendingPathComponent(directory)
            let names = try FileManager.default.contentsOfDirectory(atPath: url.path)
                .filter { $0.hasSuffix(".yaml") }
                .map { String($0.dropLast(5)) }
                .sorted()
            #expect(!names.isEmpty, "\(directory)")
            for name in names {
                let spec = directory.hasSuffix("patterns") ? try DSSpec.pattern(name) : try DSSpec.component(name)
                #expect(try spec.specVersion > 0, "\(spec.file)")
                read += 1
            }
        }
        #expect(read >= 57, "the reader read \(read) specs")
    }

    /// Every cell of every spec names a token the Apple catalogue binds. This is the check that says whether Apple
    /// *can* implement a spec's matrix at all, and it runs over the specs that are not implemented yet, which is
    /// where the answer is worth knowing (Phase 4 wave 1: Divider, Icon, Badge, IconButton).
    @Test func everyCellOfEverySpecNamesATokenTheCatalogueBinds() throws {
        let url = DSSpec.repository.appendingPathComponent("spec/components")
        let names = try FileManager.default.contentsOfDirectory(atPath: url.path)
            .filter { $0.hasSuffix(".yaml") }
            .map { String($0.dropLast(5)) }
            .sorted()
        var cells = 0
        for name in names {
            let spec = try DSSpec.component(name)
            for binding in try spec.allBindings() {
                #expect(DSTokenKeyPaths.kind(of: binding.token) != nil, "\(spec.file) tokens.\(binding.path) binds \(binding.token)")
                cells += 1
            }
        }
        #expect(cells > 1000, "the reader found \(cells) cells")
    }

    // MARK: - The binding-matrix grammar

    @Test func aCellFallsBackToDefaultAtEachLevel() throws {
        let spec = try Self.spec()
        // The keyed cell, and the `default` under the same key.
        #expect(try spec.cell("root.background", DSButtonVariant.primary, DSSurfaceMaterial.vivid) == "color.bg.fill.inverse-media")
        #expect(try spec.cell("root.background", DSButtonVariant.primary, DSSurfaceMaterial.glass) == "comp.button.primary.bg.rest")
        // A cell that is one level shallower than the keys answers at that level and ignores the rest.
        #expect(try spec.cell("root.background", DSButtonVariant.secondary, DSSurfaceMaterial.vivid) == "comp.button.secondary.bg.rest")
        // No cell and no `default`: the property is not set (ADR-0029 §3.3, the ghost pill's rest fill).
        #expect(try spec.cell("root.background", DSButtonVariant.ghost, DSSurfaceMaterial.solid) == nil)
        // A property that is one token path answers whatever the keys are.
        #expect(try spec.cell("root.gap") == "space.3")
        // A state block is read as a part of the path, and a flow mapping is a matrix like any other.
        #expect(try spec.cell("root.pressed.background", DSButtonVariant.primary) == "comp.button.primary.bg.pressed")
        #expect(try spec.cell("root.focus-visible.ring") == "color.border.focus")
        #expect(try spec.cell("root.height", DSButtonSize.md) == "comp.button.height.md")
        #expect(try spec.cell("overlay.gradient", "1") == "gradient.vivid.1")
        // The `motion` block, which is not under `tokens`.
        #expect(try spec.cell("motion.press") == "comp.button.motion.press")
    }

    @Test func theKeysOfAMatrixAreTheAxisTheSpecWrote() throws {
        let spec = try Self.spec()
        #expect(try spec.keys(at: "root.background") == ["primary", "secondary"])
        #expect(try spec.keys(at: "root.background.primary") == ["default", "vivid"])
        #expect(try spec.keys(at: "root.height") == ["sm", "md"])
    }

    @Test func everyCellOfTheBlockIsListed() throws {
        let spec = try Self.spec()
        let bindings = try spec.allBindings()
        #expect(bindings.contains { $0.path == "root.background.primary.vivid" && $0.token == "color.bg.fill.inverse-media" })
        #expect(bindings.contains { $0.path == "root.pressed.background.primary" })
        #expect(bindings.contains { $0.path == "label.typography.md" && $0.token == "type.label.md" })
        #expect(bindings.count == 11, "\(bindings.map(\.path))")
    }

    // MARK: - What it refuses to answer

    @Test func aPartOrPropertyThatIsNotInTheSpecIsAnError() throws {
        let spec = try Self.spec()
        // The hazard this closes: `cell` returning nil for a misspelt property would pass against an
        // implementation that also returns nothing, and the test would check nothing at all.
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.backround", DSButtonVariant.primary) }
        #expect(throws: DSSpecMismatch.self) { try spec.cell("roof.background", DSButtonVariant.primary) }
        #expect(throws: DSSpecMismatch.self) { try spec.keys(at: "root.gap") }
        // Keys one axis short stop on a matrix; that is a mistake in the test, not a cell that is not set.
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.background") }
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.background", DSButtonVariant.primary) }
        #expect(try spec.cell("root.background", DSButtonVariant.primary, DSSurfaceMaterial.solid) == "comp.button.primary.bg.rest")
    }

    @Test func aCellOfAnotherKindIsAnError() throws {
        let spec = try Self.spec()
        // `root.gap` is `space.3`, a dimension: asking for it as a colour is a mistake in the test, not a nil cell.
        #expect(throws: DSSpecMismatch.self) { try spec.color("root.gap") }
        #expect(try spec.dimension("root.gap") == \DSTokenSet.space.step3)
    }

    @Test func aCellNamingSomethingThatIsNoTokenIsAnError() throws {
        // `reduceMotion: crossfade` is a policy, not a token path; a test that asked for it as one is wrong.
        let spec = try Self.spec()
        #expect(throws: DSSpecMismatch.self) { try spec.spring("motion.reduceMotion") }
        #expect(try spec.spring("motion.press") == \DSTokenSet.components.button.motionPress)
    }

    @Test func aCommentIsNotPartOfAValue() throws {
        // `spec/` carries no comment today; the reader reads one the way YAML does rather than into a token path.
        let document = try DSSpecYAML.parse("""
            tokens:
              root:
                gap: space.3 # the minimum between the rows
                radius: "comp.card.radius"  # quoted, and a comment after it
            """)
        #expect(document.at("tokens.root.gap")?.stringValue == "space.3")
        #expect(document.at("tokens.root.radius")?.stringValue == "comp.card.radius")
    }

    @Test func aDocumentTheSubsetDoesNotCoverIsALineNumber() {
        // A tab, and a mapping key that is not a `key:` line: both name their line rather than becoming a value.
        #expect(throws: DSSpecSyntax.self) { try DSSpecYAML.parse("root:\n\tgap: space.3\n") }
        #expect(throws: DSSpecSyntax.self) { try DSSpecYAML.parse("root:\n  gap\n") }
        #expect(throws: DSSpecSyntax.self) { try DSSpecYAML.parse("root:\n  gap: space.3\n  gap: space.4\n") }
    }

    // MARK: - The key-path table

    @Test func theGeneratedTableIsTheTokenPipelinesOwnAnswer() {
        #expect(DSTokenKeyPaths.color["comp.button.primary.bg.rest"] == \DSTokenSet.components.button.primaryBgRest)
        #expect(DSTokenKeyPaths.color["color.bg.fill.inverse-media"] == \DSTokenSet.color.bgFillInverseMedia)
        #expect(DSTokenKeyPaths.dimension["size.icon.md"] == \DSTokenSet.size.iconMd)
        #expect(DSTokenKeyPaths.number["opacity.disabled"] == \DSTokenSet.opacity.disabled)
        #expect(DSTokenKeyPaths.typography["type.label.md"] == \DSTokenSet.Typography.labelMd)
        #expect(DSTokenKeyPaths.typography["type.label.md"] == DSTextRole.labelMd.keyPath)
        #expect(DSTokenKeyPaths.spring["motion.spring.snappy"] == \DSTokenSet.motion.springSnappy)
        // `ref` primitives have no Swift API and are not in the table; a spec never binds one.
        #expect(DSTokenKeyPaths.kind(of: "ref.color.neutral.950") == nil)
        #expect(DSTokenKeyPaths.kind(of: "space.3") == "a dimension")
        #expect(DSTokenKeyPaths.color.count > 150)
    }

    // MARK: - The assertion

    /// The token set the value cases below resolve their cells in.
    static let tokens = DSTokenSet(
        DSTokenContext(brand: .default, colorScheme: .light, density: .compact, modality: .touch, motion: .standard)
    )

    @Test func theAssertionPassesWhenTheImplementationAgrees() throws {
        let spec = try DSSpec.component("Button")
        try spec.binds(DSButtonAppearance.background(.primary, on: .solid), at: "root.background", DSButtonVariant.primary, DSSurfaceMaterial.solid)
        try spec.binds(DSButtonAppearance.background(.ghost, on: .solid), at: "root.background", DSButtonVariant.ghost, DSSurfaceMaterial.solid)
        let button = Self.tokens.components.button
        try spec.binds(value: DSButtonAppearance.height(.sm, button), at: "root.height", DSButtonSize.sm, in: Self.tokens)
    }

    /// The other half, and the reason the suite above is worth running: a wrong answer is reported. Each of these
    /// is a way a binding drifts — the wrong token, a fill where the spec binds none, none where it binds one, and a
    /// value that is not the one the cell resolves to — and `withKnownIssue` fails if the helper stops reporting any
    /// of them.
    ///
    /// Each known issue is matched, not merely expected. An error `binds` throws is an issue too, and a bare
    /// `withKnownIssue` takes any issue as the known one, so a `binds` that threw on every cell would pass this test
    /// having compared nothing. `disagreement(_:)` accepts only a failed expectation whose comment is the sentence
    /// `binds` writes for that case, which names the spec cell it read. An expectation that says anything else is
    /// recorded as the failure it is; an error does not match either, so `withKnownIssue` rethrows it (hence the
    /// `try`) and the test fails on it.
    @Test func theAssertionFailsWhenTheImplementationDisagrees() throws {
        let spec = try DSSpec.component("Button")
        let background = "spec/components/Button.yaml tokens.root.background"
        try withKnownIssue("a different token") {
            try spec.binds(\DSTokenSet.color.bgPage, at: "root.background", DSButtonVariant.primary, DSSurfaceMaterial.solid)
        } matching: {
            Self.disagreement($0) == "\(background) [primary, solid]: the spec binds comp.button.primary.bg.rest, the implementation binds color.bg.page"
        }
        try withKnownIssue("a fill where the spec binds none") {
            try spec.binds(\DSTokenSet.color.bgPage, at: "root.background", DSButtonVariant.ghost, DSSurfaceMaterial.solid)
        } matching: {
            Self.disagreement($0) == "\(background) [ghost, solid]: the spec binds nothing, the implementation binds color.bg.page"
        }
        try withKnownIssue("no fill where the spec binds one") {
            try spec.binds(nil as KeyPath<DSTokenSet, Color>?, at: "root.background", DSButtonVariant.primary, DSSurfaceMaterial.solid)
        } matching: {
            Self.disagreement($0) == "\(background) [primary, solid]: the spec binds comp.button.primary.bg.rest, the implementation binds nothing"
        }
        try withKnownIssue("the right token under the wrong material") {
            try spec.binds(DSButtonAppearance.background(.primary, on: .solid), at: "root.background", DSButtonVariant.primary, DSSurfaceMaterial.vivid)
        } matching: {
            Self.disagreement($0) == "\(background) [primary, vivid]: the spec binds color.bg.fill.inverse-media, the implementation binds comp.button.primary.bg.rest"
        }
        let height = Self.tokens[keyPath: try #require(try spec.dimension("root.height", DSButtonSize.sm))]
        let brand = Self.tokens.context.brand
        try withKnownIssue("a value that is not the cell's") {
            try spec.binds(value: height + 4, at: "root.height", DSButtonSize.sm, in: Self.tokens)
        } matching: {
            Self.disagreement($0) == """
                spec/components/Button.yaml tokens.root.height [sm], resolved for brand \(brand), density compact, \
                modality touch: the spec binds comp.button.height.sm, which is \(height) there, the implementation \
                returns \(height + 4)
                """
        }
    }

    /// The comment of a failed expectation, which is where `binds` writes the disagreement; nil for any other issue,
    /// a thrown error among them, so no such issue can satisfy a matcher above.
    nonisolated static func disagreement(_ issue: Issue) -> String? {
        guard case .expectationFailed = issue.kind else { return nil }
        return issue.comments.map(\.rawValue).joined(separator: "\n")
    }
}
