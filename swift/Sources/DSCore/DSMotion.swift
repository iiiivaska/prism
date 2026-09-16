import SwiftUI
import DSTokens

/// A spec's `motion.reduceMotion` (ADR-0023 §8.4). The three values nest: `none` ⊂ `crossfade` ⊂ `instant`.
nonisolated public enum DSReduceMotionBehavior: String, CaseIterable, Hashable, Sendable {
    /// Nothing to substitute; the component's bound tokens reduce on their own.
    case none
    /// Outside an active gesture nothing scales, rotates, blurs or changes depth, and no presentation moves.
    case crossfade
    /// Everything `crossfade` says, and decorative animations do not run.
    case instant
}

/// The motion values of the current context, with the Reduce Motion substitutions of ADR-0023 §8.4.
///
/// Every number comes from `DSTokenSet.Motion`, never from a literal: the springs are the generated
/// `DSSpringToken`s, whose physics SwiftUI reproduces exactly (`Spring(duration:bounce:)`, ADR-0023 §2), and the
/// durations and easings are the generated tokens. Reduce Motion is not a branch here either — the context
/// already carries the reduced values, and `presentationCrossfade` is the flag that switches the substitutions:
///
///  * transform, blur and depth magnitudes are multiplied by `1 − crossfade` (`geometry(_:)`);
///  * a substitute opacity or color change is multiplied by `crossfade` (`substitute(_:)`);
///  * a presentation animates opacity over `duration.base` with `easing.out` in both contexts, which is 150 ms
///    under Reduce Motion — ADR-0011's "150 ms crossfade".
///
/// Components read this, never `accessibilityReduceMotion` (ADR-0023 §8.5); `DSAccessibilityPolicy` is what put
/// the context into `.reduced`.
nonisolated public struct DSMotion: Hashable, Sendable {
    public let tokens: DSTokenSet.Motion

    public init(_ tokens: DSTokenSet.Motion) {
        self.tokens = tokens
    }

    /// ADR-0023 §10: true while §8.4's substitutions apply.
    public var isReduced: Bool { tokens.presentationCrossfade }

    /// The `motion.presentation.crossfade` flag as the number components multiply with (0 or 1).
    public var crossfade: Double { isReduced ? 1 : 0 }

    // MARK: - Springs (ADR-0023 §3, §6)

    /// Only while a finger or pointer is dragging. Identical in both contexts (ADR-0023 §7).
    public var interactive: Animation { tokens.springInteractive.animation }
    /// The default for state changes: toggles, segmented controls, selection, popovers.
    public var snappy: Animation { tokens.springSnappy.animation }
    /// Reposition, layout and morph with no overshoot.
    public var smooth: Animation { tokens.springSmooth.animation }
    /// Sheets and drawers after a flick or drag release.
    public var sheet: Animation { tokens.springSheet.animation }
    /// Delight tier only.
    public var bouncy: Animation { tokens.springBouncy.animation }

    /// The animation of any spring token, including a component's own (`comp.button.motion.press`).
    public func animation(_ token: DSSpringToken) -> Animation { token.animation }

    /// The animation of a duration and an easing token.
    public func animation(_ easing: DSCubicBezier, duration: TimeInterval) -> Animation {
        easing.animation(duration: duration)
    }

    // MARK: - ADR-0023 §8.4

    /// Presentations (a sheet, a popover, a toast, a card opening into its detail) animate opacity over
    /// `duration.base` with `easing.out`, in both contexts.
    public var presentation: Animation { tokens.easingOut.animation(duration: tokens.durationBase) }

    /// A transform, blur or depth magnitude: 0 while the substitutions apply, so the geometry takes its end value
    /// at once instead of animating.
    public func geometry(_ magnitude: Double) -> Double { magnitude * (1 - crossfade) }

    /// The substitute opacity or color change that replaces that geometry: 0 unless the substitutions apply.
    public func substitute(_ magnitude: Double) -> Double { magnitude * crossfade }

    /// In-place movement keeps its bound spring, which has no bounce and is shorter under Reduce Motion
    /// (ADR-0023 §8.4 item 3). This is the identity; it exists so that a component says which rule it follows.
    public func movement(_ token: DSSpringToken) -> Animation { animation(token) }

    /// Whether a component's decorative animations run: count-up, numeric roll, pulses, ambient loops, shimmer,
    /// specular sweep. Only `instant` stops them, and only under Reduce Motion (ADR-0023 §8.4).
    public func runsDecorativeAnimations(_ behavior: DSReduceMotionBehavior) -> Bool {
        !(isReduced && behavior == .instant)
    }

    /// The duration a decorative value changes over: its own, or `duration.instant` when it must not run.
    public func decorativeDuration(_ duration: TimeInterval, behavior: DSReduceMotionBehavior) -> TimeInterval {
        runsDecorativeAnimations(behavior) ? duration : tokens.durationInstant
    }
}
