import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0021 rule 7 (the weight chosen for every role), ADR-0021 §2 and §3, and the ADR-0011 tiers. The policy is
/// also the one place a preview or a snapshot forces a preference (ADR-0019 §5).
@Suite("Accessibility policy (ADR-0011, ADR-0021 §3)")
struct DSAccessibilityPolicyTests {
    // MARK: - The axes the policy feeds into the context

    @Test func flagsBecomeContextAxes() {
        let off = DSAccessibilityPolicy()
        #expect(off.contrast == .standard)
        #expect(off.transparency == .standard)
        #expect(off.motion == .standard)
        #expect(!off.isAccessibilitySize)

        let on = DSAccessibilityPolicy(
            boldText: true, increasedContrast: true, reduceTransparency: true, reduceMotion: true,
            dynamicTypeSize: .accessibility3
        )
        #expect(on.contrast == .increased)
        #expect(on.transparency == .reduced)
        #expect(on.motion == .reduced)
        #expect(on.isAccessibilitySize)
    }

    /// ADR-0019 §5: the policy defaults to the SwiftUI environment and a forced field wins.
    @Test func overridesWinOverTheEnvironment() {
        let fromEnvironment = DSAccessibilityOverrides.none.policy(
            legibilityWeight: .bold,
            colorSchemeContrast: .increased,
            reduceTransparency: true,
            reduceMotion: true,
            dynamicTypeSize: .xSmall
        )
        #expect(fromEnvironment == DSAccessibilityPolicy(
            boldText: true, increasedContrast: true, reduceTransparency: true, reduceMotion: true, dynamicTypeSize: .xSmall
        ))

        let forced = DSAccessibilityOverrides(boldText: false, reduceMotion: false).policy(
            legibilityWeight: .bold,
            colorSchemeContrast: .increased,
            reduceTransparency: true,
            reduceMotion: true,
            dynamicTypeSize: .large
        )
        #expect(!forced.boldText)
        #expect(!forced.reduceMotion)
        #expect(forced.increasedContrast, "a field that is not forced still follows the environment")
        #expect(forced.reduceTransparency)
    }

    @Test func overridesMergeSoTheyNest() {
        let outer = DSAccessibilityOverrides(increasedContrast: true, dynamicTypeSize: .accessibility1)
        let inner = DSAccessibilityOverrides(boldText: true, dynamicTypeSize: .accessibility3)
        let merged = outer.merging(inner)
        #expect(merged.boldText == true)
        #expect(merged.increasedContrast == true)
        #expect(merged.dynamicTypeSize == .accessibility3)
        #expect(merged.reduceMotion == nil)
    }

    @Test func legibilityWeightDrivesBoldText() {
        #expect(!DSAccessibilityOverrides.none.policy(
            legibilityWeight: nil, colorSchemeContrast: .standard,
            reduceTransparency: false, reduceMotion: false, dynamicTypeSize: .large
        ).boldText, "macOS and the web have no Bold Text setting")
        #expect(!DSAccessibilityOverrides.none.policy(
            legibilityWeight: .regular, colorSchemeContrast: .standard,
            reduceTransparency: false, reduceMotion: false, dynamicTypeSize: .large
        ).boldText)
    }

    // MARK: - ADR-0021 §3, the weight table

    @Test func theWeightTable() {
        // s | Increase Contrast | Bold Text
        let table: [(Int, Int, Int)] = [
            (100, 400, 400),
            (200, 400, 400),
            (300, 400, 400),
            (400, 400, 600),
            (500, 500, 700),
            (600, 600, 800),
            (700, 700, 900),
            (800, 800, 900),
            (900, 900, 900),
        ]
        for (standard, increased, bold) in table {
            #expect(DSAccessibilityPolicy.increasedContrastWeight(standard) == increased, "Increase Contrast from \(standard)")
            #expect(DSAccessibilityPolicy.boldTextWeight(standard) == bold, "Bold Text from \(standard)")
        }
    }

    /// ADR-0021 §3: Bold Text is computed from `s`, never from the Increase Contrast result, and it wins when
    /// both are on because its result is never lighter.
    @Test func boldTextWinsAndIsComputedFromTheStandardWeight() {
        for standard in [100, 200, 300, 400, 500] {
            let contrastResult = DSAccessibilityPolicy.increasedContrastWeight(standard)
            let boldResult = DSAccessibilityPolicy.boldTextWeight(standard)
            #expect(boldResult >= contrastResult, "Bold Text is never lighter than the Increase Contrast result")
            #expect(boldResult == DSAccessibilityPolicy.boldTextWeight(standard), "never from the floored weight")
            if standard <= 300 { #expect(boldResult == 400) }
        }
    }

    /// The generated roles carry the same rule: `weight` already floors under Increase Contrast, and `boldWeight`
    /// is the §3 step from the standard (or dark) weight, in every scheme.
    @Test func theGeneratedRolesFollowTheTable() throws {
        for scheme in DSColorScheme.allCases {
            let standard = roles(DSTokenContext(colorScheme: scheme, contrast: .standard))
            let increased = roles(DSTokenContext(colorScheme: scheme, contrast: .increased))
            #expect(!standard.isEmpty)
            for (name, role) in standard {
                let contrastRole = try #require(increased[name])
                #expect(
                    contrastRole.weight == DSAccessibilityPolicy.increasedContrastWeight(role.weight),
                    "\(scheme) \(name): Increase Contrast floors the weight"
                )
                #expect(
                    role.boldWeight == DSAccessibilityPolicy.boldTextWeight(role.weight),
                    "\(scheme) \(name): boldWeight"
                )
                #expect(
                    contrastRole.boldWeight == role.boldWeight,
                    "\(scheme) \(name): Bold Text is computed from the standard weight, not the floored one"
                )
            }
        }
    }

    @Test func thePolicyPicksTheBoldWeight() {
        let role = DSTokenSet(DSTokenContext()).typography.bodyMd
        #expect(DSAccessibilityPolicy(boldText: false).weight(for: role) == role.weight)
        #expect(DSAccessibilityPolicy(boldText: true).weight(for: role) == role.boldWeight)
    }

    // MARK: - ADR-0021 §2, the thin and light floors

    @Test func theWeightFloors() {
        #expect(DSAccessibilityPolicy.thinWeightMinimumSize == 34)
        #expect(DSAccessibilityPolicy.lightWeightMinimumSize == 20)
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 48, isMetricRole: true) == 100, "thin is allowed")
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 34, isMetricRole: true) == 100)
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 33.9, isMetricRole: true) == 300, "below 34 px, light is the floor")
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 48, isMetricRole: false) == 300, "thin needs a metric role")
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 20, isMetricRole: false) == 300)
        #expect(DSAccessibilityPolicy.weightFloor(atSize: 19.9, isMetricRole: false) == 400, "below 20 px, regular is the floor")
    }

    @Test func aThinRoleRenderedTooSmallIsFloored() {
        let dark = DSTokenSet(DSTokenContext(colorScheme: .dark)).typography.metricXl
        #expect(dark.weight < 300, "metric.xl is thin in dark (ADR-0021 §2)")
        let policy = DSAccessibilityPolicy()
        #expect(policy.renderedWeight(for: dark, atSize: 48, isMetricRole: true) == dark.weight)
        #expect(policy.renderedWeight(for: dark, atSize: 18, isMetricRole: true) == 400)
        #expect(
            DSAccessibilityPolicy(increasedContrast: true).renderedWeight(for: dark, atSize: 48, isMetricRole: true) == dark.weight,
            "Increase Contrast is already resolved in the token layer, so the policy does not floor a second time"
        )
    }

    /// The token layer, not DSCore, resolves Increase Contrast: the increased-contrast context carries 400.
    @Test func increaseContrastNeedsNoRuntimeCode() {
        let darkThin = DSTokenSet(DSTokenContext(colorScheme: .dark, contrast: .standard)).typography.metricXl
        let darkThinIC = DSTokenSet(DSTokenContext(colorScheme: .dark, contrast: .increased)).typography.metricXl
        #expect(darkThin.weight == 200)
        #expect(darkThinIC.weight == 400)
    }

    // MARK: - ADR-0011 tiers

    @Test func contrastTiers() {
        #expect(DSTextContrastTier.functional.minimumRatio == 4.5)
        #expect(DSTextContrastTier.large.minimumRatio == 3)
        #expect(DSAccessibilityPolicy.tier(forSize: 24, weight: 400) == .large)
        #expect(DSAccessibilityPolicy.tier(forSize: 23.9, weight: 400) == .functional)
        #expect(DSAccessibilityPolicy.tier(forSize: 19, weight: 700) == .large, "≥ 19 px bold")
        #expect(DSAccessibilityPolicy.tier(forSize: 19, weight: 600) == .functional)
        #expect(DSAccessibilityPolicy.tier(forSize: 18.9, weight: 700) == .functional)
        #expect(DSAccessibilityPolicy.tier(forSize: 12, weight: 400) == .functional, "tertiary below 24 px is functional")
    }

    /// ADR-0011: "tertiary" changes the token, not the threshold; the dimmed tone exists only at 24 px or more.
    @Test func theDimmedToneFallsBackToSecondaryBelowTheLargeThreshold() {
        #expect(DSAccessibilityPolicy.allowsDimmedTone(atSize: 24))
        #expect(!DSAccessibilityPolicy.allowsDimmedTone(atSize: 23.9))
        #expect(DSAccessibilityPolicy.tone(.dimmed, atSize: 23.9) == .secondary)
        #expect(DSAccessibilityPolicy.tone(.dimmed, atSize: 24) == .dimmed)
        for tone in DSTextTone.allCases where tone != .dimmed {
            #expect(DSAccessibilityPolicy.tone(tone, atSize: 11) == tone, "\(tone) is unchanged")
        }
    }

    /// Every `DSTypeRole` of a context, by member name.
    private func roles(_ context: DSTokenContext) -> [String: DSTypeRole] {
        var out: [String: DSTypeRole] = [:]
        for child in Mirror(reflecting: DSTokenSet(context).typography).children {
            if let label = child.label, let role = child.value as? DSTypeRole { out[label] = role }
        }
        return out
    }
}
