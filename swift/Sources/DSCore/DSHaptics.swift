import Foundation
import SwiftUI
import DSTokens

/// Which end of a range a limit haptic reports (`haptic.selection.limit`).
nonisolated public enum DSHapticLimit: String, CaseIterable, Hashable, Sendable {
    case minimum, maximum
}

/// The semantic haptics registry of `spec/haptics.yaml`. Components name a haptic by id; DSCore owns the mapping,
/// and an id that the platform does not play is a no-op (`nil` feedback), never a substitute of its own choosing.
///
/// The registry's own per-platform table is reproduced here: success, warning, error, selection and impact play
/// on iOS and watchOS; alignment on iOS and macOS; levelChange on macOS; start and stop on watchOS, where iOS
/// uses a medium impact; increase and decrease on watchOS, where iOS uses selection; pathComplete on iOS, where
/// watchOS uses success. The OS 26 control feedbacks (press, release, selection on/off/limit) are treated as iOS
/// and watchOS, as the registry says, until Apple documents their playback.
nonisolated public enum DSHaptic: String, CaseIterable, Hashable, Sendable {
    case selection = "haptic.selection"
    case impactLight = "haptic.impact.light"
    case impactMedium = "haptic.impact.medium"
    case impactSoft = "haptic.impact.soft"
    case success = "haptic.success"
    case warning = "haptic.warning"
    case error = "haptic.error"
    case alignment = "haptic.alignment"
    case levelChange = "haptic.levelChange"
    case increase = "haptic.increase"
    case decrease = "haptic.decrease"
    case start = "haptic.start"
    case stop = "haptic.stop"
    case pathComplete = "haptic.pathComplete"
    case pressButton = "haptic.press.button"
    case pressToggle = "haptic.press.toggle"
    case pressSlider = "haptic.press.slider"
    case releaseSlider = "haptic.release.slider"
    case selectionOn = "haptic.selection.on"
    case selectionOff = "haptic.selection.off"
    case selectionLimit = "haptic.selection.limit"

    /// The registry id, which is also the raw value.
    public var id: String { rawValue }

    /// The platform's feedback for this id, or nil where the registry says `none`.
    public func feedback(limit: DSHapticLimit = .minimum) -> SensoryFeedback? {
        #if os(watchOS)
        switch self {
        case .selection: .selection
        case .impactLight: .impact(weight: .light)
        case .impactMedium: .impact(weight: .medium)
        case .impactSoft: .impact(flexibility: .soft)
        case .success: .success
        case .warning: .warning
        case .error: .error
        case .alignment: nil
        case .levelChange: nil
        case .increase: .increase
        case .decrease: .decrease
        case .start: .start
        case .stop: .stop
        case .pathComplete: .success
        case .pressButton: .press(.button)
        case .pressToggle: .press(.toggle)
        case .pressSlider: .press(.slider)
        case .releaseSlider: .release(.slider)
        case .selectionOn: .selection(.on)
        case .selectionOff: .selection(.off)
        case .selectionLimit: .selection(limit == .maximum ? .maximum : .minimum)
        }
        #elseif os(macOS)
        switch self {
        case .alignment: .alignment
        case .levelChange: .levelChange
        case .selectionLimit: .alignment
        default: nil
        }
        #else
        switch self {
        case .selection: .selection
        case .impactLight: .impact(weight: .light)
        case .impactMedium: .impact(weight: .medium)
        case .impactSoft: .impact(flexibility: .soft)
        case .success: .success
        case .warning: .warning
        case .error: .error
        case .alignment: .alignment
        case .levelChange: nil
        case .increase: .selection
        case .decrease: .selection
        case .start: .impact(weight: .medium)
        case .stop: .impact(weight: .medium)
        case .pathComplete: .pathComplete
        case .pressButton: .press(.button)
        case .pressToggle: .press(.toggle)
        case .pressSlider: .press(.slider)
        case .releaseSlider: .release(.slider)
        case .selectionOn: .selection(.on)
        case .selectionOff: .selection(.off)
        case .selectionLimit: .selection(limit == .maximum ? .maximum : .minimum)
        }
        #endif
    }

    /// Whether this platform plays the haptic at all.
    public var isAvailable: Bool { feedback() != nil }
}

/// Plays registry haptics, with the throttle the registry asks DSCore to own.
///
/// Haptics are not motion: Apple does not suppress them under Reduce Motion, and neither does Prism
/// (`spec/haptics.yaml`, `reduceMotion: keep`).
@MainActor
public enum DSHaptics {
    /// watchOS enforces a minimum interval between plays and drops anything faster (`spec/haptics.yaml`, rules).
    /// It is a platform constraint, not a motion token.
    public static let minimumInterval: TimeInterval = 0.1

    private static var lastPlay: TimeInterval = -.greatestFiniteMagnitude

    /// The feedback to play now, or nil when the platform has none for this id or the throttle swallows it.
    /// Calling it records the play, so it is the single entry point.
    public static func play(_ haptic: DSHaptic, limit: DSHapticLimit = .minimum, now: TimeInterval = ProcessInfo.processInfo.systemUptime) -> SensoryFeedback? {
        guard let feedback = haptic.feedback(limit: limit) else { return nil }
        guard now - lastPlay >= minimumInterval else { return nil }
        lastPlay = now
        return feedback
    }

    /// Forgets the last play; previews and tests use it.
    public static func reset() { lastPlay = -.greatestFiniteMagnitude }
}

extension View {
    /// Plays a registry haptic when `trigger` changes. At most one haptic per user action, and never on a
    /// programmatic state change: the trigger is the user's action (`spec/haptics.yaml`, rules).
    public func dsHaptic<T: Equatable>(_ haptic: DSHaptic, limit: DSHapticLimit = .minimum, trigger: T) -> some View {
        sensoryFeedback(trigger: trigger) { DSHaptics.play(haptic, limit: limit) }
    }
}
