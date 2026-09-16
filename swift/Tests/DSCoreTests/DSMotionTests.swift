import SwiftUI
import Testing
import DSTokens
@testable import DSCore

/// ADR-0023 §8.4 (the substitutions), §8.2 (the reduced values) and §3 (the springs). The cross-stack spring
/// contract itself (P1–P4, tolerance 1e-4) runs in `DSTokensTests/SpringParityTests`; this suite checks that
/// DSCore hands SwiftUI the generated numbers and nothing of its own.
@Suite("Motion (ADR-0023)")
struct DSMotionTests {
    private func motion(_ mode: DSMotionMode) -> DSMotion {
        DSMotion(DSTokenSet(DSTokenContext(motion: mode)).motion)
    }

    /// ADR-0023 §8.5: the context carries Reduce Motion; `DSAccessibilityPolicy` is what put it there.
    @Test func theReducedContextComesFromThePolicy() {
        let policy = DSAccessibilityPolicy(reduceMotion: true)
        let context = DSContextResolver.context(
            brand: .prism, colorScheme: .light, policy: policy,
            density: .compact, modality: .pointer, fixesColorSchemeToDark: false
        )
        #expect(context.motion == .reduced)
        #expect(DSMotion(DSTokenSet(context).motion).isReduced)

        let standard = DSContextResolver.context(
            brand: .prism, colorScheme: .light, policy: DSAccessibilityPolicy(),
            density: .compact, modality: .pointer, fixesColorSchemeToDark: false
        )
        #expect(standard.motion == .standard)
        #expect(!DSMotion(DSTokenSet(standard).motion).isReduced)
    }

    /// ADR-0023 §10: the flag is the switch, and the only one.
    @Test func crossfadeIsThePresentationFlag() {
        #expect(motion(.standard).crossfade == 0)
        #expect(motion(.reduced).crossfade == 1)
        #expect(!motion(.standard).isReduced)
        #expect(motion(.reduced).isReduced)
    }

    /// ADR-0023 §8.2, the reduced column. The values come from the tokens; DSCore never writes one.
    @Test func theReducedValues() {
        let standard = motion(.standard).tokens
        let reduced = motion(.reduced).tokens

        #expect(standard.springSnappy.duration == 0.35 && standard.springSnappy.bounce == 0.15)
        #expect(reduced.springSnappy.duration == 0.25 && reduced.springSnappy.bounce == 0)
        #expect(reduced.springSnappy.settle == 0.367)
        #expect(reduced.springSheet.duration == 0.25 && reduced.springSheet.bounce == 0)
        #expect(reduced.springSheet.settle == 0.367)
        #expect(reduced.springSmooth.duration == 0.3 && reduced.springSmooth.bounce == 0)
        #expect(reduced.springSmooth.settle == 0.44)
        #expect(reduced.springBouncy.duration == 0.3 && reduced.springBouncy.bounce == 0)
        #expect(reduced.springBouncy.settle == 0.44)

        // §7: gesture tracking is identical under Reduce Motion.
        #expect(reduced.springInteractive == standard.springInteractive)
        #expect(reduced.springInteractive.bounce == 0)

        // §8.2 durations.
        #expect(standard.durationBase == 0.25 && reduced.durationBase == 0.15)
        #expect(standard.durationFast == 0.15 && reduced.durationFast == 0.1)
        #expect(standard.durationSlow == 0.35 && reduced.durationSlow == 0.15)
        #expect(standard.durationSlower == 0.5 && reduced.durationSlower == 0.15)
        #expect(standard.durationInstant == 0 && reduced.durationInstant == 0)
        #expect(standard.durationQuick == reduced.durationQuick)

        // §8.3: every reduced spring has no bounce and settles no later than its default.
        for (name, pair) in [
            ("snappy", (standard.springSnappy, reduced.springSnappy)),
            ("smooth", (standard.springSmooth, reduced.springSmooth)),
            ("sheet", (standard.springSheet, reduced.springSheet)),
            ("bouncy", (standard.springBouncy, reduced.springBouncy)),
            ("interactive", (standard.springInteractive, reduced.springInteractive)),
        ] {
            #expect(pair.1.bounce == 0, "\(name) has no bounce under Reduce Motion")
            #expect(pair.1.duration <= min(pair.0.duration, 0.3), "\(name) duration")
            #expect(pair.1.settle <= pair.0.settle, "\(name) settle")
        }
    }

    /// Every spring DSCore hands SwiftUI is the generated token: `Spring(duration:bounce:)` reproduces the
    /// emitted physics triplet, well inside the 1 % the parity contract allows.
    @Test func springConversionsMatchTheGeneratedValues() {
        for mode in DSMotionMode.allCases {
            let tokens = motion(mode).tokens
            for (name, token) in [
                ("interactive", tokens.springInteractive),
                ("snappy", tokens.springSnappy),
                ("smooth", tokens.springSmooth),
                ("sheet", tokens.springSheet),
                ("bouncy", tokens.springBouncy),
            ] {
                let spring = token.spring
                #expect(spring.mass == 1, "\(mode) \(name) mass")
                #expect(
                    abs(spring.stiffness - token.stiffness) <= token.stiffness * 0.01,
                    "\(mode) \(name): stiffness \(spring.stiffness) against \(token.stiffness)"
                )
                #expect(
                    abs(spring.damping - token.damping) <= token.damping * 0.01,
                    "\(mode) \(name): damping \(spring.damping) against \(token.damping)"
                )
                // SwiftUI recomputes both from the physics, so they come back within floating-point noise.
                #expect(abs(spring.duration - token.duration) < 1e-12, "\(mode) \(name): duration")
                #expect(abs(spring.bounce - token.bounce) < 1e-12, "\(mode) \(name): bounce")
            }
        }
    }

    /// ADR-0023 §8.4's timing without a context branch: magnitudes are multiplied by the flag, never branched on.
    @Test func geometryAndSubstituteFollowTheFlag() {
        let standard = motion(.standard)
        let reduced = motion(.reduced)
        #expect(standard.geometry(0.96) == 0.96, "a press scale runs in full")
        #expect(standard.substitute(0.08) == 0, "and no opacity dip replaces it")
        #expect(reduced.geometry(0.96) == 0, "the geometry takes its end value at once")
        #expect(reduced.substitute(0.08) == 0.08, "the opacity dip stands in for it")
    }

    /// ADR-0011's "150 ms crossfade": presentations animate opacity over `duration.base` with `easing.out`, which
    /// is 250 ms normally and 150 ms under Reduce Motion, in both cases without a branch in the component.
    @Test func presentationsUseDurationBaseAndEasingOut() {
        #expect(motion(.standard).tokens.durationBase == 0.25)
        #expect(motion(.reduced).tokens.durationBase == 0.15)
        for mode in DSMotionMode.allCases {
            let tokens = motion(mode).tokens
            #expect(tokens.easingOut == DSCubicBezier(x1: 0.23, y1: 1, x2: 0.32, y2: 1), "easing.out is context-independent")
            #expect(motion(mode).presentation == tokens.easingOut.animation(duration: tokens.durationBase))
        }
    }

    /// ADR-0023 §8.4: only `instant` stops decorative animations, and only under Reduce Motion.
    @Test func decorativeAnimationsStopOnlyUnderInstant() {
        for behavior in DSReduceMotionBehavior.allCases {
            #expect(motion(.standard).runsDecorativeAnimations(behavior), "nothing stops outside Reduce Motion")
        }
        let reduced = motion(.reduced)
        #expect(reduced.runsDecorativeAnimations(.none))
        #expect(reduced.runsDecorativeAnimations(.crossfade))
        #expect(!reduced.runsDecorativeAnimations(.instant))
        #expect(reduced.decorativeDuration(1.2, behavior: .instant) == reduced.tokens.durationInstant)
        #expect(reduced.decorativeDuration(1.2, behavior: .crossfade) == 1.2)
        #expect(motion(.standard).decorativeDuration(1.2, behavior: .instant) == 1.2)
    }

    /// In-place movement keeps its bound spring in both contexts (ADR-0023 §8.4 item 3).
    @Test func movementKeepsItsSpring() {
        for mode in DSMotionMode.allCases {
            let m = motion(mode)
            #expect(m.movement(m.tokens.springSmooth) == m.smooth)
            #expect(m.animation(m.tokens.springSnappy) == m.snappy)
        }
    }
}
