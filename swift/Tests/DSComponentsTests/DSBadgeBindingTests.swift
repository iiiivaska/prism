import CoreGraphics
import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// What every Badge example is named, byte for byte, on both stacks: the contribution of `DSBadgeAppearance`, read in
/// `en_US` under `DSStrings.english`, and what the badge draws.
///
/// The same table is asserted three times: here, off the pure functions; off the simulator's accessibility tree
/// (`DSBadgeAccessibilityTreeTests`, DSSnapshotTests); and off Chromium's tree for every Badge story
/// (`web/apps/gallery/test/accessibility.browser.test.tsx`). Every example stands alone with a `label`, so every one is
/// exposed; the web reports it as an `image` and Apple adds no trait, which is the role difference Badge.yaml
/// `notes.platform` records, and the name does not differ.
nonisolated struct DSBadgeNameCase: Sendable {
    let id: String
    /// What the badge draws: its digits, or nil for a dot.
    let drawn: String?
    /// Its accessible name.
    let name: String

    static let all: [DSBadgeNameCase] = [
        DSBadgeNameCase(id: "count-neutral", drawn: "3", name: "3 unread alerts"),
        DSBadgeNameCase(id: "count-critical", drawn: "12", name: "12 open incidents"),
        DSBadgeNameCase(id: "count-accent", drawn: "7", name: "7 items needing attention"),
        // Draws the overflow mark and speaks the true count (behavior 4, ADR-0032 rule 9).
        DSBadgeNameCase(id: "count-overflow", drawn: "99+", name: "128 open incidents"),
        DSBadgeNameCase(id: "outline-neutral", drawn: "4", name: "4 queued runs"),
        DSBadgeNameCase(id: "outline-critical", drawn: "2", name: "2 open incidents"),
        DSBadgeNameCase(id: "dot-critical", drawn: nil, name: "unread"),
        DSBadgeNameCase(id: "dot-accent", drawn: nil, name: "new"),
        DSBadgeNameCase(id: "on-vivid", drawn: "3", name: "3 unread alerts"),
        DSBadgeNameCase(id: "on-glass-over-map", drawn: "2", name: "2 open incidents"),
    ]
}

/// `spec/components/Badge.yaml` specVersion 1: the binding matrix keyed by emphasis, tone and variant, the digits'
/// role and figures, the motion cells, the text rules of behaviors 3 to 10 — what a badge draws, what it contributes and
/// when it is exposed — the examples as the spec writes them, and the name of each one.
///
/// **Every cell is read out of the spec** (`DSSpec`, `Generated/DSTokenKeyPaths.swift`), and each test says the
/// sentence `web/packages/react/test/badge.test.tsx` says about `Badge.css`: the appearance function's answer for a set
/// of keys is the token the spec's cell names. No key path is written on the expected side, and
/// `everyCellOfTheMatrixIsAsked` holds the loops to the whole matrix, so a cell the spec adds is a failure here until a
/// test asks it.
///
/// The text rules are held to one table of vectors, `vectors`, and `web/packages/react/test/badge.test.tsx` asserts
/// the same rows byte for byte against the web's own `badge/text.ts`: its `vectors` table, and its blank-label and
/// hidden-count tests for the rows made from `DSIconBindingTests.blankLabels` and the counts that render nothing. What
/// the simulator publishes to VoiceOver is measured by `DSBadgeAccessibilityTreeTests`, and what the badge draws by the
/// snapshot matrix, both in DSSnapshotTests.
@Suite("Badge bindings (Badge.yaml v1)")
struct DSBadgeBindingTests {
    let spec: DSSpec

    init() throws {
        spec = try DSSpec.component("Badge")
    }

    static func tokens(density: DSDensity = .regular, modality: DSModality = .touch) -> DSTokenSet {
        DSTokenSet(DSTokenContext(brand: .default, density: density, modality: modality))
    }

    /// The locale the snapshots render in and the name table is read in (`DSSnapshotRendering.locale`).
    static let english = Locale(identifier: "en_US")

    // MARK: - The document

    /// The spec this file is the Apple half of, the axes its matrices are keyed by, and the defaults `DSBadge.init`
    /// takes.
    ///
    /// The axis checks keep the loops below honest: a loop over an axis a matrix is not keyed by would read `default`
    /// at every step and pass while checking one cell many times.
    @Test func theSpecIsTheOneThisTargetImplements() throws {
        #expect(try spec.specVersion == 1)
        #expect(try spec.propValues("variant") == DSBadgeVariant.allCases.map(\.rawValue))
        #expect(try spec.propValues("tone") == DSBadgeTone.allCases.map(\.rawValue))
        #expect(try spec.propValues("emphasis") == DSBadgeEmphasis.allCases.map(\.rawValue))

        #expect(try propDefault("variant") == DSBadgeVariant.count.rawValue)
        #expect(try propDefault("tone") == DSBadgeTone.neutral.rawValue)
        #expect(try propDefault("emphasis") == DSBadgeEmphasis.filled.rawValue)
        #expect(try propDefault("max") == "99")
        #expect(try propDefault("count") == nil)
        #expect(try propDefault("label") == nil)

        let tones = DSBadgeTone.allCases.map(\.rawValue)
        let variants = DSBadgeVariant.allCases.map(\.rawValue)
        #expect(try spec.keys(at: "root.background") == [DSBadgeEmphasis.filled.rawValue])
        #expect(try spec.keys(at: "root.background.filled") == tones)
        #expect(try spec.keys(at: "root.border") == [DSBadgeEmphasis.outline.rawValue])
        #expect(try spec.keys(at: "root.border.outline") == tones)
        #expect(try spec.keys(at: "root.borderWidth") == [DSBadgeEmphasis.outline.rawValue])
        #expect(try spec.keys(at: "root.height") == variants)
        #expect(try spec.keys(at: "root.minWidth") == variants)
        #expect(try spec.keys(at: "root.paddingX") == [DSBadgeVariant.count.rawValue])
        #expect(try spec.keys(at: "label.color") == DSBadgeEmphasis.allCases.map(\.rawValue))
        for emphasis in DSBadgeEmphasis.allCases {
            #expect(try spec.keys(at: "label.color.\(emphasis.rawValue)") == tones, "\(emphasis)")
        }

        // `states: [default]`: never interactive (behavior 1), so there is no state block to bind.
        let states = try #require(spec.document["states"]?.listValue)
        #expect(states.compactMap(\.stringValue) == ["default"])
        // watchOS is `none`, so the manifest carries no watch key (`DSComponentsContractTests` holds the rest).
        #expect(try spec.platforms["watchos"] == "none")
        #expect(DSComponentsManifest.implemented["Badge"]?["watchos"] == nil)
    }

    /// Every cell of `tokens` is one the tests below ask: the matrix, walked out of the spec, is exactly the cells the
    /// loops over the three enums reach. A cell the spec adds, or one it moves, fails here until a test binds it.
    @Test func everyCellOfTheMatrixIsAsked() throws {
        var asked: Set<String> = ["root.borderWidth.outline", "root.radius", "root.paddingX.count", "label.typography"]
        for tone in DSBadgeTone.allCases {
            asked.insert("root.background.filled.\(tone.rawValue)")
            asked.insert("root.border.outline.\(tone.rawValue)")
            for emphasis in DSBadgeEmphasis.allCases {
                asked.insert("label.color.\(emphasis.rawValue).\(tone.rawValue)")
            }
        }
        for variant in DSBadgeVariant.allCases {
            asked.insert("root.height.\(variant.rawValue)")
            asked.insert("root.minWidth.\(variant.rawValue)")
        }
        let written = try spec.allBindings().map(\.path)
        #expect(Set(written) == asked, "unasked: \(Set(written).subtracting(asked).sorted()); asked and absent: \(asked.subtracting(written).sorted())")
        #expect(written.count == asked.count, "a cell is written twice")
    }

    // MARK: - tokens.root

    /// `tokens.root.background`: the tone's opaque solid for `filled`, and no fill at all for `outline`, which has no
    /// cell (behavior 11).
    @Test func backgroundCells() throws {
        for emphasis in DSBadgeEmphasis.allCases {
            for tone in DSBadgeTone.allCases {
                try spec.binds(DSBadgeAppearance.background(emphasis, tone), at: "root.background", emphasis, tone)
            }
        }
        #expect(DSBadgeAppearance.background(.outline, .critical) == nil)
    }

    /// `tokens.root.border`: the outline badge's stroke per tone, and no border for `filled`.
    @Test func borderCells() throws {
        for emphasis in DSBadgeEmphasis.allCases {
            for tone in DSBadgeTone.allCases {
                try spec.binds(DSBadgeAppearance.border(emphasis, tone), at: "root.border", emphasis, tone)
            }
        }
        #expect(DSBadgeAppearance.border(.filled, .neutral) == nil)
    }

    /// `tokens.root.borderWidth`: `border.hairline` for `outline` only, so a filled badge carries no border width with no
    /// border colour — the binding oddity the Spec step settled rather than mirrored.
    @Test func borderWidthCells() throws {
        for emphasis in DSBadgeEmphasis.allCases {
            try spec.binds(DSBadgeAppearance.borderWidth(emphasis), at: "root.borderWidth", emphasis)
        }
        #expect(DSBadgeAppearance.borderWidth(.filled) == nil)
        // Wherever a stroke is drawn it has a width, and wherever there is a width there is a stroke.
        for emphasis in DSBadgeEmphasis.allCases {
            for tone in DSBadgeTone.allCases {
                #expect((DSBadgeAppearance.border(emphasis, tone) == nil) == (DSBadgeAppearance.borderWidth(emphasis) == nil), "\(emphasis) \(tone)")
            }
        }
    }

    /// `tokens.root.radius`: `radius.control`, the pill, more than half of every badge's height in every density, so the
    /// shape clamps to a circle or a capsule.
    @Test func radiusCell() throws {
        try spec.binds(DSBadgeAppearance.radius, at: "root.radius")
        for density in DSDensity.allCases {
            let tokens = Self.tokens(density: density)
            for variant in DSBadgeVariant.allCases {
                #expect(tokens[keyPath: DSBadgeAppearance.radius] * 2 >= tokens[keyPath: DSBadgeAppearance.height(variant)], "\(density) \(variant)")
            }
        }
    }

    /// `tokens.root.height` and `tokens.root.minWidth`: the count pill's `size.icon.md` floors, the dot's `space.3`
    /// square (behavior 2).
    @Test func heightAndMinWidthCells() throws {
        for variant in DSBadgeVariant.allCases {
            try spec.binds(DSBadgeAppearance.height(variant), at: "root.height", variant)
            try spec.binds(DSBadgeAppearance.minWidth(variant), at: "root.minWidth", variant)
        }
        // The dot is a square, and the count pill's two floors are one length, so a one-digit badge is a circle that
        // more digits widen into a capsule (measured on the web by components.browser.test.tsx, behavior 2).
        #expect(DSBadgeAppearance.height(.dot) == DSBadgeAppearance.minWidth(.dot))
        #expect(DSBadgeAppearance.height(.count) == DSBadgeAppearance.minWidth(.count))
    }

    /// `tokens.root.paddingX`: `space.1` either side of the digits; the dot has no digits and no padding.
    @Test func paddingXCells() throws {
        for variant in DSBadgeVariant.allCases {
            try spec.binds(DSBadgeAppearance.paddingX(variant), at: "root.paddingX", variant)
        }
        #expect(DSBadgeAppearance.paddingX(.dot) == nil)
    }

    /// Badge binds no density-dependent token, so every dimension resolves to the same value in every density the spec
    /// lists, and the badge itself draws the same in each.
    ///
    /// What that makes of the snapshots, on both stacks: the eight page examples' `compact` images equal their `regular`
    /// twins byte for byte, because their stage pads by `space.page-margin`, 24 in both densities. `on-vivid` and
    /// `on-glass-over-map` do not: the Surface that stages them pads by `space.card-padding`, which follows density (16
    /// in `compact`, 24 in `regular`), so the image around the unchanged badge differs.
    @Test func everyDimensionIsTheSameInEveryDensity() throws {
        let density = try #require(spec.document["density"]?.listValue).compactMap(\.stringValue)
        let densities = density.compactMap(DSDensity.init(rawValue:))
        #expect(densities.map(\.rawValue) == density)
        for variant in DSBadgeVariant.allCases {
            var seen: Set<[CGFloat]> = []
            for density in densities {
                let tokens = Self.tokens(density: density)
                let height = tokens[keyPath: DSBadgeAppearance.height(variant)]
                let minWidth = tokens[keyPath: DSBadgeAppearance.minWidth(variant)]
                try spec.binds(value: height, at: "root.height", variant, in: tokens)
                try spec.binds(value: minWidth, at: "root.minWidth", variant, in: tokens)
                var row = [height, minWidth, tokens[keyPath: DSBadgeAppearance.radius]]
                if let padding = DSBadgeAppearance.paddingX(variant) {
                    try spec.binds(value: tokens[keyPath: padding], at: "root.paddingX", variant, in: tokens)
                    row.append(tokens[keyPath: padding])
                }
                if let width = DSBadgeAppearance.borderWidth(.outline) { row.append(tokens[keyPath: width]) }
                seen.insert(row)
            }
            #expect(seen.count == 1, "\(variant): a dimension changes with density: \(seen)")
        }
    }

    /// Behavior 13 and the Spec step: Badge binds no offset. The corner offset is the host's — IconButton's
    /// `tokens.badge.offset`, the form StatCard already uses — which IconButton binds and tests (P4-4).
    @Test func theOffsetBelongsToTheHost() throws {
        #expect(throws: DSSpecMismatch.self) { try spec.cell("root.offset") }
        #expect(try DSSpec.component("IconButton").cell("badge.offset") == "space.1")
    }

    // MARK: - tokens.label

    /// `tokens.label.typography` and behavior 8: `type.micro`, with tabular figures through the override, because the
    /// role's own figures are proportional (ADR-0021 §5).
    @Test func labelTypographyCell() throws {
        try spec.binds(DSBadgeAppearance.labelRole.keyPath, at: "label.typography")
        #expect(DSBadgeAppearance.figures == .tabular)
        let micro = Self.tokens().typography[keyPath: DSBadgeAppearance.labelRole.keyPath]
        #expect(micro.numeric == .proportional, "type.micro's own figures; the override is what makes the digits tabular")
        #expect(DSBadgeAppearance.figures.figures(for: micro) == .tabular)
        // The only role allowed below 12 px (behavior 3).
        #expect(micro.size < 12)
    }

    /// `tokens.label.color`: the tone's own ink on its solid for `filled`, the text ramp for `outline`.
    @Test func labelColorCells() throws {
        for emphasis in DSBadgeEmphasis.allCases {
            for tone in DSBadgeTone.allCases {
                try spec.binds(DSBadgeAppearance.labelColor(emphasis, tone), at: "label.color", emphasis, tone)
            }
        }
    }

    // MARK: - motion

    /// `motion.count` and `motion.reduceMotion`: a changed count is replaced over `motion.duration.quick`, and under
    /// Reduce Motion — `instant` — at `motion.duration.instant`, with no animation at all. The web's twin reads the same
    /// two cells out of `Badge.css`.
    @Test func motionCells() throws {
        try spec.binds(DSBadgeAppearance.countChange, at: "motion.count")
        #expect(try spec.cell("motion.reduceMotion") == DSBadgeAppearance.reduceMotion.rawValue)

        let standardTokens = DSTokenSet(DSTokenContext(motion: .standard))
        let standard = DSMotion(standardTokens.motion)
        #expect(DSBadgeAppearance.runsCountChange(standard))
        #expect(DSBadgeAppearance.countChangeDuration(standard) == standardTokens[keyPath: DSBadgeAppearance.countChange])
        #expect(DSBadgeAppearance.countChangeDuration(standard) > 0)
        #expect(DSBadgeAppearance.countChangeAnimation(standard) != nil)

        let reducedTokens = DSTokenSet(DSTokenContext(motion: .reduced))
        let reduced = DSMotion(reducedTokens.motion)
        #expect(!DSBadgeAppearance.runsCountChange(reduced))
        #expect(DSBadgeAppearance.countChangeDuration(reduced) == reducedTokens.motion.durationInstant)
        #expect(DSBadgeAppearance.countChangeAnimation(reduced) == nil)
    }

    /// `motion.count`, behavior 15 and `accessibility.reduceMotion` ("does not roll or count up"): a changed count is
    /// replaced, never rolled.
    ///
    /// **The trap.** `DSText` rolls a verbatim string that counts up over `motion.duration.slow`
    /// (`DSTextAppearance.countsUp`), and a badge going from 8 to 9 is exactly such a string. The badge never rolls because
    /// it never hands one `DSText` two strings: `DSBadgeDigits` draws its digits under `.id(drawn)`, so changed digits are
    /// a new `DSText` with no earlier string to count up from, and the only animation left is the badge's own opacity
    /// insertion over `motion.duration.quick` (`motionCells`).
    ///
    /// **What this reads.** The identity itself, out of the view value `DSBadgeDigits.body` returns: every `DSText` the
    /// digits draw must sit inside an explicit identity equal to the string it draws, so two different counts are two
    /// different views. Without the `.id` the walk finds the same `DSText` with no identity of its own, and this fails;
    /// that was measured once by deleting the modifier. The walk must find exactly one `DSText` drawing the digits, so a
    /// walk that sees nothing fails too.
    ///
    /// **Why the view value and not a frame.** The roll is `DSText`'s own transaction on its own state, which only a frame
    /// rendered mid-change shows, and `swift test` renders every token colour clear (`DSRenderCapability`), so no frame
    /// here could show one. The identity is the mechanism the spec's sentence rests on, and the host can read it.
    @Test func aChangedCountIsReplacedNeverRolled() throws {
        #expect(DSTextAppearance.countsUp(from: "8", to: "9"))
        #expect(DSTextAppearance.countsUp(from: "98", to: "99"))
        for drawn in ["8", "9", "98", "99", "99+"] {
            let found = Self.texts(in: DSBadgeDigits(drawn: drawn, color: .primary, animation: nil).body)
            #expect(found.map(\.string) == [drawn], "\(drawn): the digits draw \(found)")
            #expect(found.map(\.identity) == [AnyHashable(drawn)], "\(drawn): the digits' DSText is not identified by the digits it draws: \(found)")
        }
    }

    /// One `DSText` found in a view value: the string it draws, and the explicit identity (`.id(_:)`) nearest around it.
    struct FoundText: CustomStringConvertible {
        let string: String?
        let identity: AnyHashable?

        var description: String { "DSText(\(string.debugDescription)) id \(identity.map { "\($0)" } ?? "none")" }
    }

    /// Every `DSText` in `value`, depth first, with the identity of the nearest `IDView` around it — what `.id(_:)` wraps
    /// a view in. SwiftUI's view values are plain structs, so `Mirror` reads their stored properties; nothing is rendered.
    static func texts(in value: Any, identity: AnyHashable? = nil, depth: Int = 0) -> [FoundText] {
        guard depth < 48 else { return [] }
        let mirror = Mirror(reflecting: value)
        if let text = value as? DSText {
            let content = Mirror(reflecting: text).children.first { $0.label == "content" }?.value as? DSTextContent
            return [FoundText(string: content?.verbatim, identity: identity)]
        }
        if String(describing: type(of: value)).hasPrefix("IDView<"),
           let id = mirror.children.first(where: { $0.label == "id" })?.value as? AnyHashable,
           let content = mirror.children.first(where: { $0.label == "content" })?.value {
            return texts(in: content, identity: id, depth: depth + 1)
        }
        return mirror.children.flatMap { texts(in: $0.value, identity: identity, depth: depth + 1) }
    }

    // MARK: - The examples

    /// Every row of `DSBadgeExamples` is the example the spec writes under that id: the props, with the spec's defaults
    /// where the entry writes none, and the Surface and backdrop it declares. Over media only the filled emphasis is
    /// staged (behavior 12).
    ///
    /// The snapshot harness never reads the spec, so this is what keeps a hand-written row from staging an example on
    /// another surface, or rendering other props, than the web story generated from the same entry.
    @Test @MainActor func everyExampleIsTheOneTheSpecWrites() throws {
        let entries = try examples()
        #expect(entries.map(\.id) == DSBadgeExamples.rows.map(\.id))
        for (entry, row) in zip(entries, DSBadgeExamples.rows) {
            #expect(row.variant.rawValue == (try prop("variant", of: entry)), "\(row.id)")
            #expect(row.tone.rawValue == (try prop("tone", of: entry)), "\(row.id)")
            #expect(row.emphasis.rawValue == (try prop("emphasis", of: entry)), "\(row.id)")
            #expect(row.count.map { String($0) } == (try prop("count", of: entry)), "\(row.id)")
            #expect(String(row.max) == (try prop("max", of: entry)), "\(row.id)")
            #expect(row.label == (try prop("label", of: entry)), "\(row.id)")
            let surface = entry.value["surface"]?.stringValue
            #expect(row.surface?.rawValue == (surface == "page" ? nil : surface), "\(row.id): staged on \(String(describing: row.surface)), spec \(surface ?? "page")")
            #expect(row.backdrop.rawValue == (entry.value["backdrop"]?.stringValue ?? DSBackdropKind.none.rawValue), "\(row.id)")
            #expect(row.example.hasGlass == (row.surface?.isGlass ?? false), "\(row.id)")
            if row.surface != nil {
                #expect(row.emphasis == .filled, "\(row.id): an outline badge is never placed over media (behavior 12)")
            }
        }
        #expect(DSBadgeExamples.all.filter(\.hasGlass).map(\.name) == ["on-glass-over-map"])
    }

    // MARK: - Accessibility

    /// `DSBadgeNameCase.all`, the name table both stacks assert: every example is exposed, named by what it
    /// contributes, and draws the digits the table says. Every name is ASCII with no leading or trailing whitespace, and
    /// a count's name has exactly one U+0020 between the number and the label, the English template's.
    @Test @MainActor func everyExampleIsNamedAsTheTableSays() throws {
        #expect(DSBadgeNameCase.all.map(\.id) == DSBadgeExamples.rows.map(\.id))
        for (row, want) in zip(DSBadgeExamples.rows, DSBadgeNameCase.all) {
            let hasLabel = DSIconAppearance.hasLabel(row.label.map { LocalizedStringKey($0) }, locale: Self.english)
            #expect(DSBadgeAppearance.isExposed(hasLabel: hasLabel, isHosted: false), "\(row.id) is not exposed")
            let name = DSBadgeAppearance.contribution(row.variant, count: row.count, label: row.label, locale: Self.english, strings: .english)
            #expect(name == want.name, "\(row.id): \(String(describing: name))")
            #expect(name.map { Array($0.utf8) } == Array(want.name.utf8), "\(row.id): not byte for byte")
            #expect(want.name.allSatisfy(\.isASCII) && want.name == want.name.trimmingCharacters(in: .whitespacesAndNewlines), "\(row.id)")
            let drawn = row.variant == .dot ? nil : row.count.map { DSBadgeAppearance.drawn(count: $0, max: row.max, locale: Self.english, strings: .english) }
            #expect(drawn == want.drawn, "\(row.id): draws \(String(describing: drawn))")
            if row.variant == .count, let label = row.label, let count = row.count {
                #expect(want.name == "\(count) \(label)", "\(row.id): the English template is one space between the true count and the label")
            }
        }
        #expect(DSBadgeNameCase.all.map { Array($0.name.utf8).count } == [15, 17, 25, 18, 13, 16, 6, 3, 15, 16])
    }

    /// One row of `vectors`, which `web/packages/react/test/badge.test.tsx` also asserts, byte for byte against
    /// `badge/text.ts`.
    struct Vector: CustomStringConvertible {
        let variant: DSBadgeVariant
        let count: Int?
        var max = 99
        let label: String?
        var locale = DSBadgeBindingTests.english
        var strings = DSStrings.english
        var isHosted = false
        /// nil: the badge draws no digits (a dot) or renders nothing.
        let drawn: String?
        let contribution: String?
        let exposed: Bool
        /// False for the rows that render nothing at all.
        var rendered = true

        var description: String {
            "\(variant) count \(String(describing: count)) max \(max) label \(String(describing: label?.debugDescription)) \(locale.identifier)\(isHosted ? " hosted" : "")"
        }
    }

    static let vectors: [Vector] = {
        var rows: [Vector] = [
            Vector(variant: .count, count: 3, label: "unread alerts", drawn: "3", contribution: "3 unread alerts", exposed: true),
            Vector(variant: .count, count: 128, label: "open incidents", drawn: "99+", contribution: "128 open incidents", exposed: true),
            Vector(variant: .count, count: 99, label: "x", drawn: "99", contribution: "99 x", exposed: true),
            Vector(variant: .count, count: 3, label: nil, drawn: "3", contribution: "3", exposed: false),
        ]
        for blank in DSIconBindingTests.blankLabels {
            rows.append(Vector(variant: .count, count: 3, label: blank, drawn: "3", contribution: "3", exposed: false))
        }
        for count in [0, -2, nil] as [Int?] {
            rows.append(Vector(variant: .count, count: count, label: "unread alerts", drawn: nil, contribution: nil, exposed: false, rendered: false))
        }
        rows += [
            Vector(variant: .count, count: 1234, max: 9999, label: "queued runs", drawn: "1,234", contribution: "1,234 queued runs", exposed: true),
            Vector(variant: .count, count: 1234, max: 9999, label: "queued runs", locale: Locale(identifier: "de_DE"), drawn: "1.234", contribution: "1.234 queued runs", exposed: true),
            Vector(variant: .count, count: 12345, max: 9999, label: "queued runs", drawn: "9,999+", contribution: "12,345 queued runs", exposed: true),
            Vector(variant: .count, count: 3, label: "unread alerts", strings: DSStrings(badgeCount: "{label}: {count}"), drawn: "3", contribution: "unread alerts: 3", exposed: true),
            Vector(variant: .count, count: 128, label: "x", strings: DSStrings(badgeOverflow: ">{max}"), drawn: ">99", contribution: "128 x", exposed: true),
            Vector(variant: .count, count: 3, label: "{count}", drawn: "3", contribution: "3 {count}", exposed: true),
            Vector(variant: .dot, count: nil, label: "unread", drawn: nil, contribution: "unread", exposed: true),
            Vector(variant: .dot, count: 5, label: "new", drawn: nil, contribution: "new", exposed: true),
            Vector(variant: .dot, count: nil, label: nil, drawn: nil, contribution: nil, exposed: false),
            Vector(variant: .count, count: 3, label: "unread alerts", isHosted: true, drawn: "3", contribution: "3 unread alerts", exposed: false),
        ]
        return rows
    }()

    /// `vectors`, which `badge.test.tsx` asserts too: what each badge draws, what it contributes and whether it is
    /// exposed, byte for byte, under another locale and another strings table too. A dot still renders with no label;
    /// the rows that render nothing contribute nothing.
    @Test func theSharedVectors() throws {
        #expect(Self.vectors.count == 23)
        for vector in Self.vectors {
            #expect(DSBadgeAppearance.isVisible(vector.variant, count: vector.count) == vector.rendered, "\(vector)")
            let drawn = vector.variant == .count && vector.rendered
                ? vector.count.map { DSBadgeAppearance.drawn(count: $0, max: vector.max, locale: vector.locale, strings: vector.strings) }
                : nil
            #expect(drawn == vector.drawn, "\(vector): draws \(String(describing: drawn))")
            let contribution = DSBadgeAppearance.contribution(
                vector.variant, count: vector.count, label: vector.label, locale: vector.locale, strings: vector.strings
            )
            #expect(contribution.map { Array($0.utf8) } == vector.contribution.map { Array($0.utf8) }, "\(vector): contributes \(String(describing: contribution))")
            let hasLabel = DSIconAppearance.hasLabel(vector.label.map { LocalizedStringKey($0) }, locale: vector.locale)
            let exposed = vector.rendered && DSBadgeAppearance.isExposed(hasLabel: hasLabel, isHosted: vector.isHosted)
            #expect(exposed == vector.exposed, "\(vector): exposed \(exposed)")
            // An exposed badge always has a name.
            if exposed { #expect(contribution != nil, "\(vector)") }
        }
    }

    /// Behavior 9: a dot always renders, whatever `count` says; a count badge only for a count of at least 1.
    @Test func whatRenders() {
        for count in [nil, 0, -1, -2, Int.min] as [Int?] {
            #expect(!DSBadgeAppearance.isVisible(.count, count: count), "\(String(describing: count))")
            #expect(DSBadgeAppearance.isVisible(.dot, count: count), "dot \(String(describing: count))")
        }
        for count in [1, 2, 99, 100, Int.max] {
            #expect(DSBadgeAppearance.isVisible(.count, count: count), "\(count)")
        }
        // A count one above `max` is the first to overflow, and the comparison is the numbers', before formatting.
        #expect(DSBadgeAppearance.drawn(count: 100, max: 99, locale: Self.english, strings: .english) == "99+")
        #expect(DSBadgeAppearance.drawn(count: 1000, max: 999, locale: Self.english, strings: .english) == "999+")
        #expect(DSBadgeAppearance.drawn(count: 1000, max: 1000, locale: Self.english, strings: .english) == "1,000")
    }

    /// Behavior 10: exposed only with a label and no host; a host hides even a labelled badge. The host flag is off
    /// unless a host sets it.
    @Test func aBadgeIsExposedOnlyWithALabelAndNoHost() {
        #expect(DSBadgeAppearance.isExposed(hasLabel: true, isHosted: false))
        #expect(!DSBadgeAppearance.isExposed(hasLabel: true, isHosted: true))
        #expect(!DSBadgeAppearance.isExposed(hasLabel: false, isHosted: false))
        #expect(!DSBadgeAppearance.isExposed(hasLabel: false, isHosted: true))
        #expect(EnvironmentValues().dsBadgeIsHosted == false)
    }

    /// ADR-0032: Badge owns exactly the two strings its spec names, and the defaults its prose writes out are the
    /// table's.
    @Test func badgeOwnsExactlyItsTwoStrings() throws {
        let named = Set(spec.text.matches(of: /strings\.Badge\.([A-Za-z]+)/).map { "Badge.\($0.1)" })
        #expect(named == ["Badge.count", "Badge.overflow"])
        #expect(spec.text.contains(DSStrings.english.badgeCount))
        #expect(spec.text.contains(DSStrings.english.badgeOverflow))
    }

    // MARK: - Helpers

    /// The spec's `examples`, each with its id.
    private func examples() throws -> [(id: String, value: DSSpecValue)] {
        let list = try #require(spec.document["examples"]?.listValue, "Badge.yaml has no examples")
        return list.compactMap { entry in entry["id"]?.stringValue.map { ($0, entry) } }
    }

    /// A prop's `default`, as the spec writes it.
    private func propDefault(_ name: String) throws -> String? {
        let props = try #require(spec.document["props"]?.listValue)
        let entry = try #require(props.first { $0["name"]?.stringValue == name }, "Badge.yaml has no prop \(name)")
        return entry["default"]?.stringValue
    }

    /// The value an example gives a prop, or the prop's default where it gives none.
    private func prop(_ name: String, of entry: (id: String, value: DSSpecValue)) throws -> String? {
        try entry.value["props"]?[name]?.stringValue ?? propDefault(name)
    }
}
