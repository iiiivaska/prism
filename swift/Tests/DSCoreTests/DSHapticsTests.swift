import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// `spec/haptics.yaml`: components name a haptic by registry id, DSCore owns the per-platform mapping, and an id
/// the platform does not play is a no-op.
@Suite("Haptics registry", .serialized)
struct DSHapticsTests {
    /// Every id of `spec/haptics.yaml` exists, spelled as the registry spells it.
    @Test func everyRegistryIdIsACase() {
        let registry: Set<String> = [
            "haptic.selection", "haptic.impact.light", "haptic.impact.medium", "haptic.impact.soft",
            "haptic.success", "haptic.warning", "haptic.error", "haptic.alignment", "haptic.levelChange",
            "haptic.increase", "haptic.decrease", "haptic.start", "haptic.stop", "haptic.pathComplete",
            "haptic.press.button", "haptic.press.toggle", "haptic.press.slider", "haptic.release.slider",
            "haptic.selection.on", "haptic.selection.off", "haptic.selection.limit",
        ]
        #expect(Set(DSHaptic.allCases.map(\.id)) == registry)
    }

    /// The registry's platform table. Only the rows this platform can check are asserted; the others are the
    /// other platforms' rows, which run on their own simulators.
    @Test func thePlatformTable() {
        #if os(macOS)
        #expect(DSHaptic.alignment.feedback() == .alignment)
        #expect(DSHaptic.levelChange.feedback() == .levelChange)
        #expect(DSHaptic.selectionLimit.feedback() == .alignment)
        for haptic in [DSHaptic.selection, .impactLight, .impactMedium, .impactSoft, .success, .warning, .error, .start, .stop, .increase, .decrease, .pathComplete, .pressButton] {
            #expect(haptic.feedback() == nil, "\(haptic.id) does not play on macOS")
            #expect(!haptic.isAvailable)
        }
        #elseif os(watchOS)
        #expect(DSHaptic.selection.feedback() == .selection)
        #expect(DSHaptic.increase.feedback() == .increase)
        #expect(DSHaptic.decrease.feedback() == .decrease)
        #expect(DSHaptic.start.feedback() == .start)
        #expect(DSHaptic.stop.feedback() == .stop)
        #expect(DSHaptic.pathComplete.feedback() == .success, "watchOS has no pathComplete; the registry maps it to success")
        #expect(DSHaptic.alignment.feedback() == nil)
        #expect(DSHaptic.levelChange.feedback() == nil)
        #else
        #expect(DSHaptic.selection.feedback() == .selection)
        #expect(DSHaptic.impactLight.feedback() == .impact(weight: .light))
        #expect(DSHaptic.impactSoft.feedback() == .impact(flexibility: .soft))
        #expect(DSHaptic.increase.feedback() == .selection, "iOS has no increase; the registry maps it to selection")
        #expect(DSHaptic.decrease.feedback() == .selection)
        #expect(DSHaptic.start.feedback() == .impact(weight: .medium))
        #expect(DSHaptic.stop.feedback() == .impact(weight: .medium))
        #expect(DSHaptic.alignment.feedback() == .alignment)
        #expect(DSHaptic.levelChange.feedback() == nil, "levelChange is macOS only")
        #expect(DSHaptic.pathComplete.feedback() == .pathComplete)
        #endif
    }

    @Test func aLimitHapticReportsTheEndItReached() {
        #if !os(macOS)
        #expect(DSHaptic.selectionLimit.feedback(limit: .minimum) == .selection(.minimum))
        #expect(DSHaptic.selectionLimit.feedback(limit: .maximum) == .selection(.maximum))
        #else
        #expect(DSHaptic.selectionLimit.feedback(limit: .maximum) == .alignment)
        #endif
    }

    /// The registry asks DSCore to throttle: watchOS drops plays that follow each other too closely.
    @Test func theThrottleKeepsOneHapticPerAction() {
        DSHaptics.reset()
        let available = DSHaptic.allCases.first(where: \.isAvailable)
        guard let haptic = available else {
            #expect(DSHaptic.allCases.allSatisfy { DSHaptics.play($0, now: 100) == nil }, "a platform without haptics is a no-op")
            return
        }
        #expect(DSHaptics.play(haptic, now: 100) != nil)
        #expect(DSHaptics.play(haptic, now: 100 + DSHaptics.minimumInterval / 2) == nil, "swallowed by the throttle")
        #expect(DSHaptics.play(haptic, now: 100 + DSHaptics.minimumInterval * 2) != nil)
        DSHaptics.reset()
    }

    @Test func anUnavailableHapticIsANoOpAndNeverConsumesTheThrottle() {
        DSHaptics.reset()
        for haptic in DSHaptic.allCases where !haptic.isAvailable {
            #expect(DSHaptics.play(haptic, now: 500) == nil, "\(haptic.id)")
        }
        if let haptic = DSHaptic.allCases.first(where: \.isAvailable) {
            #expect(DSHaptics.play(haptic, now: 500) != nil, "an unavailable id did not start the throttle")
        }
        DSHaptics.reset()
    }
}
