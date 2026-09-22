import CoreGraphics
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// `spec/components/Text.yaml` specVersion 2: roles, figures, the trailing and unit colour tables, the dimmed rule,
/// the watch collapse, the Dynamic Type clamp and the count-up rule. The root tone table is DSCore's
/// (`DSTextToneTests`); Text resolves the trailing group and the unit through the same table, so they are written out
/// here from the spec.
@Suite("Text bindings (Text.yaml v2)")
struct DSTextBindingTests {
    static let contexts: [DSTokenContext] = DSColorScheme.allCases.flatMap { scheme in
        DSContrast.allCases.map { DSTokenContext(brand: .default, colorScheme: scheme, contrast: $0, density: .regular, modality: .touch) }
    }

    // MARK: - Roles

    /// `tokens.root.typography`: every role binds the `type.<role>` of the same name.
    @Test func everyRoleBindsItsTypeToken() {
        let names: [DSTextRole: String] = [
            .displayXl: "display-xl", .displayLg: "display-lg", .displayMd: "display-md", .titleLg: "title-lg",
            .titleMd: "title-md", .titleSm: "title-sm", .headline: "headline", .bodyLg: "body-lg", .bodyMd: "body-md",
            .bodySm: "body-sm", .labelLg: "label-lg", .labelMd: "label-md", .labelSm: "label-sm", .caption: "caption",
            .micro: "micro", .eyebrow: "eyebrow", .metricXl: "metric-xl", .metricLg: "metric-lg", .metricMd: "metric-md",
            .data: "data",
        ]
        #expect(DSTextRole.allCases.count == 20)
        for role in DSTextRole.allCases {
            #expect(role.rawValue == names[role], "\(role)")
        }
        for context in Self.contexts {
            let type = DSTokenSet(context).typography
            let byName: [DSTextRole: DSTypeRole] = [
                .displayXl: type.displayXl, .displayLg: type.displayLg, .displayMd: type.displayMd, .titleLg: type.titleLg,
                .titleMd: type.titleMd, .titleSm: type.titleSm, .headline: type.headline, .bodyLg: type.bodyLg,
                .bodyMd: type.bodyMd, .bodySm: type.bodySm, .labelLg: type.labelLg, .labelMd: type.labelMd,
                .labelSm: type.labelSm, .caption: type.caption, .micro: type.micro, .eyebrow: type.eyebrow,
                .metricXl: type.metricXl, .metricLg: type.metricLg, .metricMd: type.metricMd, .data: type.data,
            ]
            for role in DSTextRole.allCases {
                #expect(type[keyPath: role.keyPath] == byName[role], "\(role) in \(context)")
            }
        }
    }

    @Test func metricAndHeadingRoles() {
        #expect(DSTextRole.allCases.filter(\.isMetric) == [.metricXl, .metricLg, .metricMd])
        #expect(DSTextRole.allCases.filter(\.isHeading) == [.displayXl, .displayLg, .displayMd, .titleLg, .titleMd, .titleSm])
    }

    /// `notes.platform.watchos`: display roles collapse to title-sm and title roles to headline; nothing else changes.
    @Test func watchCollapsesDisplayAndTitleRoles() {
        for role in DSTextRole.allCases {
            #expect(role.rendered(isWatch: false) == role)
            let expected: DSTextRole
            switch role {
            case .displayXl, .displayLg, .displayMd: expected = .titleSm
            case .titleLg, .titleMd, .titleSm: expected = .headline
            default: expected = role
            }
            #expect(role.rendered(isWatch: true) == expected, "\(role)")
        }
    }

    /// `accessibility.dynamicType`: metric-xl clamps at accessibility3; every other role scales all the way.
    @Test func onlyTheHeroClamps() {
        for role in DSTextRole.allCases {
            let upper = role == .metricXl ? DynamicTypeSize.accessibility3 : .accessibility5
            #expect(role.dynamicTypeSizes.upperBound == upper, "\(role)")
            #expect(role.dynamicTypeSizes.lowerBound == .xSmall, "\(role)")
        }
    }

    // MARK: - Figures (ADR-0021 §5, ADR-0030 §7.1)

    /// `auto` takes the role's figures: `data` tabular, every other role proportional, the metric roles included.
    @Test func autoFiguresFollowTheRole() {
        for context in Self.contexts {
            let type = DSTokenSet(context).typography
            for role in DSTextRole.allCases {
                let resolved = type[keyPath: role.keyPath]
                let expected: DSNumericSpacing = role == .data ? .tabular : .proportional
                #expect(DSTextNumeric.auto.figures(for: resolved) == expected, "\(role)")
                #expect(DSTextNumeric.tabular.figures(for: resolved) == .tabular)
                #expect(DSTextNumeric.proportional.figures(for: resolved) == .proportional)
            }
        }
    }

    /// A `numeric` override changes the figures and nothing else.
    @Test func aFiguresOverrideKeepsTheRole() {
        for context in Self.contexts {
            let type = DSTokenSet(context).typography
            for role in DSTextRole.allCases {
                let base = type[keyPath: role.keyPath]
                for figures in DSNumericSpacing.allCases {
                    let variant = DSTypography.role(base, figures: figures)
                    #expect(variant.numeric == figures)
                    #expect(variant.slot == base.slot && variant.size == base.size && variant.weight == base.weight)
                    #expect(variant.boldWeight == base.boldWeight && variant.lineHeight == base.lineHeight)
                    #expect(variant.trackingEm == base.trackingEm && variant.textStyle == base.textStyle)
                }
            }
        }
    }

    /// The weight survives a `numeric` override: a metric role set to `tabular` renders at the weight the role
    /// itself renders at. ADR-0021 §5 defines the equal-width rule over exactly this combination ("a `metric.xl` set
    /// to `numeric: tabular`"), §2 gives the metric roles the thin tier, and the web renders the override at the
    /// role's own `--ds-type-metric-xl-font-weight`, so the two stacks agree only if this holds.
    ///
    /// The identity DSCore's thin floor reads is the role's key path, and the route takes the figures beside it
    /// (`dsText(_:figures:)`), so an override cannot move it. This was a known gap until 2026-09-22, when the route
    /// took the argument: the figures used to travel as a synthetic key path, which is none of DSCore's four metric
    /// names, and in the dark scheme `metric-xl` then carried 200 and rendered at 300, at 48 px.
    @Test(arguments: [DSTextRole.metricXl, .metricLg, .metricMd])
    func aFiguresOverrideKeepsTheThinWeight(_ role: DSTextRole) {
        let policy = DSAccessibilityPolicy()
        #expect(DSTextRoles.isMetric(role.keyPath), "\(role) must be one of DSCore's metric key paths")
        for context in Self.contexts {
            let type = DSTokenSet(context).typography
            let typeRole = type[keyPath: role.keyPath]
            let tabular = DSTypography.role(typeRole, figures: .tabular)
            #expect(DSTypography.role(typeRole, figures: typeRole.numeric) == typeRole, "the role's own figures change nothing")
            #expect(DSTypography.role(typeRole, figures: nil) == typeRole, "no override changes nothing")
            let weight = { (resolved: DSTypeRole) in
                policy.renderedWeight(for: resolved, atSize: typeRole.size, isMetricRole: DSTextRoles.isMetric(role.keyPath))
            }
            #expect(
                weight(tabular) == weight(typeRole),
                "\(role) in \(context) at \(typeRole.size) px: tabular renders \(weight(tabular)), the role \(weight(typeRole))"
            )
            // The thin tier itself, where the gap used to show: nothing floors the dark hero above its token weight.
            if typeRole.size >= DSAccessibilityPolicy.thinWeightMinimumSize {
                #expect(weight(tabular) == typeRole.weight, "\(role) in \(context): the thin tier is reached")
            }
        }
    }

    // MARK: - Tones

    /// `dimmed` and the trailing group need a metric role at 24 px or more; below, and on every other role, they
    /// resolve to `secondary`.
    @Test func dimmedNeedsAMetricRoleAt24() {
        for role in DSTextRole.allCases {
            #expect(DSTextAppearance.tone(.dimmed, role: role, size: 48) == (role.isMetric ? .dimmed : .secondary), "\(role)")
            let tokenSize = DSTokenSet(DSTokenContext()).typography[keyPath: role.keyPath].size
            let dimmable = role == .metricXl || role == .metricLg
            #expect(DSTextAppearance.tone(.dimmed, role: role, size: tokenSize) == (dimmable ? .dimmed : .secondary), "\(role) at its token size")
            #expect(DSTextAppearance.tone(.dimmed, role: role, size: 23.9) == .secondary, "\(role)")
            #expect(DSTextAppearance.tone(.tertiary, role: role, size: 12) == .tertiary, "\(role)")
        }
        #expect(DSTextAppearance.allowsDimmed(role: .metricLg, size: 24))
        #expect(!DSTextAppearance.allowsDimmed(role: .metricMd, size: 20))
    }

    /// `inherit` sets no foreground; any other tone resolves on the published material.
    @Test func rootTone() {
        let page = DSSurfaceContext.root
        #expect(DSTextAppearance.root(nil, role: .bodyMd, size: 15, surface: page) == nil)
        #expect(DSTextAppearance.root(.primary, role: .bodyMd, size: 15, surface: page) == .textPrimary)
        #expect(DSTextAppearance.root(.dimmed, role: .caption, size: 12, surface: page) == .textSecondary)
        #expect(DSTextAppearance.root(.dimmed, role: .metricXl, size: 48, surface: page) == .textDimmed)
        let map = DSSurfaceContext(material: .glass, backdrop: .map)
        #expect(DSTextAppearance.root(.secondary, role: .caption, size: 12, surface: map) == .textOnGlassFillSecondary)
    }

    /// `tokens.trailing.color` and `tokens.unit.color`, cell by cell, at a size where dimmed is permitted.
    @Test func trailingAndUnitCells() {
        let trailing: [DSSurfaceMaterial: DSColorToken] = [
            .page: .textDimmed, .solid: .textDimmed, .raised: .textDimmed, .nested: .textDimmed,
            .vivid: .textOnVivid, .inverse: .textOnInverse, .accent: .textOnAccentSecondary, .glassLight: .textOnGlassLight,
        ]
        let unit: [DSSurfaceMaterial: DSColorToken] = [
            .page: .textSecondary, .solid: .textSecondary, .raised: .textSecondary, .nested: .textSecondary,
            .vivid: .textOnVivid, .inverse: .textOnInverse, .accent: .textOnAccentSecondary, .glassLight: .textOnGlassLight,
        ]
        let glassTrailing: [DSBackdropKind: DSColorToken] = [
            .map: .textOnGlassFillDimmed, .image: .textOnGlassFillMediaTertiary, .vivid: .textOnGlassFillMediaTertiary,
        ]
        let glassUnit: [DSBackdropKind: DSColorToken] = [
            .map: .textOnGlassFillSecondary, .image: .textOnGlassFillMediaSecondary, .vivid: .textOnGlassFillMediaSecondary,
        ]
        for material in DSSurfaceMaterial.allCases where material != .glass {
            let surface = DSSurfaceContext(material: material)
            #expect(DSTextAppearance.trailing(role: .metricXl, size: 48, surface: surface) == trailing[material], "\(material)")
            #expect(DSTextAppearance.unit(surface: surface) == unit[material], "\(material)")
        }
        for backdrop in [DSBackdropKind.map, .image, .vivid] {
            let surface = DSSurfaceContext(material: .glass, backdrop: backdrop)
            #expect(DSTextAppearance.trailing(role: .metricLg, size: 32, surface: surface) == glassTrailing[backdrop], "\(backdrop)")
            #expect(DSTextAppearance.unit(surface: surface) == glassUnit[backdrop], "\(backdrop)")
        }
        // Below 24 px the trailing group takes the secondary tone.
        #expect(DSTextAppearance.trailing(role: .metricMd, size: 20, surface: .root) == .textSecondary)
        #expect(DSTextAppearance.trailing(role: .metricMd, size: 20, surface: DSSurfaceContext(material: .glass, backdrop: .map)) == .textOnGlassFillSecondary)
    }

    // MARK: - Count-up

    @Test func countingUp() {
        #expect(DSTextAppearance.countsUp(from: "86.4", to: "86.5"))
        #expect(DSTextAppearance.countsUp(from: "1,280", to: "1,287"))
        #expect(DSTextAppearance.countsUp(from: "09:59", to: "10:00"))
        #expect(DSTextAppearance.countsUp(from: "-12", to: "-11"))
        #expect(DSTextAppearance.countsUp(from: "\u{2212}0.4", to: "\u{2212}0.3"))
        #expect(DSTextAppearance.countsUp(from: "\u{0661}\u{0662}", to: "\u{0661}\u{0663}"), "Arabic-Indic digits are digits")
        #expect(DSTextAppearance.countsUp(from: "$2,450", to: "$2,460"))
    }

    @Test func onlyReplacing() {
        #expect(!DSTextAppearance.countsUp(from: "86.5", to: "86.4"), "a value that goes down")
        #expect(!DSTextAppearance.countsUp(from: "86.4", to: "86.4"), "no change")
        #expect(!DSTextAppearance.countsUp(from: "9.9", to: "10.0"), "a change of length")
        #expect(!DSTextAppearance.countsUp(from: "1.280", to: "1,281"), "a separator that changes")
        #expect(!DSTextAppearance.countsUp(from: "-11", to: "-12"), "a negative value that goes down")
        #expect(!DSTextAppearance.countsUp(from: "12 km", to: "13 mi"), "a unit that changes")
        #expect(!DSTextAppearance.countsUp(from: "Idle", to: "Busy"), "no digits")
        #expect(!DSTextAppearance.countsUp(from: "", to: ""))
    }

    /// Under Reduce Motion the count-up lands at `motion.duration.instant` (`reduceMotion: instant`).
    @Test func countUpDurations() {
        let standard = DSMotion(DSTokenSet(DSTokenContext(motion: .standard)).motion)
        let reduced = DSMotion(DSTokenSet(DSTokenContext(motion: .reduced)).motion)
        #expect(standard.decorativeDuration(standard.tokens.durationSlow, behavior: .instant) == standard.tokens.durationSlow)
        #expect(reduced.decorativeDuration(reduced.tokens.durationSlow, behavior: .instant) == reduced.tokens.durationInstant)
    }

    // MARK: - Fade truncation

    @Test func lineLimits() {
        #expect(DSTextAppearance.lineLimit(.none, maxLines: nil) == nil)
        #expect(DSTextAppearance.lineLimit(.none, maxLines: 2) == nil)
        #expect(DSTextAppearance.lineLimit(.ellipsis, maxLines: nil) == 1)
        #expect(DSTextAppearance.lineLimit(.ellipsis, maxLines: 2) == 2)
        #expect(DSTextAppearance.lineLimit(.fade, maxLines: nil) == 3)
        #expect(DSTextAppearance.lineLimit(.fade, maxLines: 0) == 1)
    }

    /// "ids truncate with an ellipsis and keep the copy affordance" (Text.yaml behavior): the id is the `data` role
    /// cut with an ellipsis. Prism's own components cut a Card's title and caption and a Button's label with the same
    /// ellipsis, and those are a control's label and not a value to copy, so no other role is selectable.
    @Test func onlyAnEllipsisTruncatedIdKeepsTheCopyAffordance() {
        #expect(DSTextAppearance.isCopyable(role: .data, truncation: .ellipsis))
        #expect(!DSTextAppearance.isCopyable(role: .data, truncation: .none))
        #expect(!DSTextAppearance.isCopyable(role: .data, truncation: .fade))
        for role in DSTextRole.allCases where role != .data {
            for truncation in DSTextTruncation.allCases {
                #expect(!DSTextAppearance.isCopyable(role: role, truncation: truncation), "\(role) \(truncation)")
            }
        }
    }

    @Test func fadeSteps() {
        #expect(DSTextAppearance.fadeOpacities(lines: 0, overflowing: true) == [])
        #expect(DSTextAppearance.fadeOpacities(lines: 1, overflowing: true) == [0.25])
        #expect(DSTextAppearance.fadeOpacities(lines: 2, overflowing: true) == [0.6, 0.25])
        #expect(DSTextAppearance.fadeOpacities(lines: 4, overflowing: true) == [1, 1, 0.6, 0.25])
        #expect(DSTextAppearance.fadeOpacities(lines: 3, overflowing: false) == [1, 1, 1])
        let single = DSTextAppearance.singleLineFade(overflowing: true)
        #expect(single.map(\.opacity) == [1, 0.6, 0.25])
        #expect(abs(single.map(\.fraction).reduce(0, +) - 1) < 0.0001)
        #expect(DSTextAppearance.singleLineFade(overflowing: false).map(\.opacity) == [1])
    }

    /// Display roles and `title-lg` are level-1 headings, `title-md` 2 and `title-sm` 3; nothing else is a heading.
    @Test func headingLevels() {
        for role in DSTextRole.allCases {
            let expected: AccessibilityHeadingLevel?
            switch role {
            case .displayXl, .displayLg, .displayMd, .titleLg: expected = .h1
            case .titleMd: expected = .h2
            case .titleSm: expected = .h3
            default: expected = nil
            }
            #expect(DSTextAppearance.headingLevel(role) == expected, "\(role)")
            #expect((expected != nil) == role.isHeading, "\(role)")
        }
    }
}
