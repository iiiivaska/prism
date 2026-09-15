import SwiftUI
import Testing
import DSTokens

/// ADR-0023 §11 P1–P3 (ARCHITECTURE §9.7.6): every `DSSpringToken` a token set carries, for every brand and both
/// motion contexts, against SwiftUI's `Spring(duration:bounce:)`: stiffness and damping within 1e-4 (absolute),
/// mass 1, and the settle within 1 ms of the last 0.1 ms sample of `Spring.value` that lies at least 0.001 from the
/// target. The settle is the ε = 0.001 displacement settle; SwiftUI's own settling estimate is a different, longer
/// quantity and is never read. The curve checkpoints (P4) are in Generated/GeneratedTokenTests.swift.
@Suite("Spring parity")
struct SpringParityTests {
    struct Found {
        let path: String
        let token: DSSpringToken
    }

    /// Every spring of a token set, found by reflection over its category and component structs, so a new spring
    /// token is covered without an edit here.
    static func springs(in tokens: DSTokenSet) -> [Found] {
        var out: [Found] = []
        func walk(_ value: Any, _ path: String, _ depth: Int) {
            if let spring = value as? DSSpringToken {
                out.append(Found(path: path, token: spring))
                return
            }
            if let transition = value as? DSTransitionToken {
                if let spring = transition.spring { out.append(Found(path: path, token: spring)) }
                return
            }
            guard depth < 3, !(value is Color), !(value is DSColor), !(value is DSTokenContext) else { return }
            for child in Mirror(reflecting: value).children {
                guard let label = child.label else { continue }
                walk(child.value, path.isEmpty ? label : "\(path).\(label)", depth + 1)
            }
        }
        walk(tokens, "", 0)
        return out
    }

    /// Every spring of every brand in both motion contexts, one entry per distinct (duration, bounce, blend).
    static var distinctSprings: [Found] {
        var seen = Set<DSSpringToken>()
        var out: [Found] = []
        for brand in DSBrand.allCases {
            for motion in DSMotionMode.allCases {
                for found in springs(in: DSTokenSet(DSTokenContext(brand: brand, motion: motion))) where seen.insert(found.token).inserted {
                    out.append(Found(path: "\(brand.rawValue) \(motion.rawValue) \(found.path)", token: found.token))
                }
            }
        }
        return out
    }

    /// The last time t = k × 0.1 ms, t ≤ 5 s, at which `Spring.value` is at least 0.001 from the target.
    static func sampledSettle(_ spring: Spring) -> Double {
        var last = 0.0
        for k in 0...50_000 {
            let time = Double(k) * 0.0001
            let value: Double = spring.value(target: 1.0, initialVelocity: 0.0, time: time)
            if abs(1 - value) >= 0.001 { last = time }
        }
        return last
    }

    @Test func everyContextCarriesSprings() {
        for brand in DSBrand.allCases {
            for motion in DSMotionMode.allCases {
                #expect(!Self.springs(in: DSTokenSet(DSTokenContext(brand: brand, motion: motion))).isEmpty, "\(brand) \(motion)")
            }
        }
    }

    @Test func physicsMatchesSwiftUI() {
        for found in Self.distinctSprings {
            let token = found.token
            let spring = Spring(duration: token.duration, bounce: token.bounce)
            #expect(abs(token.stiffness - spring.stiffness) <= 1e-4, "\(found.path): stiffness \(token.stiffness), SwiftUI \(spring.stiffness)")
            #expect(abs(token.damping - spring.damping) <= 1e-4, "\(found.path): damping \(token.damping), SwiftUI \(spring.damping)")
            #expect(token.mass == 1, "\(found.path): mass \(token.mass)")
            #expect(spring.mass == 1, "\(found.path): SwiftUI mass \(spring.mass)")
        }
    }

    @Test func settleMatchesSampledSpringValue() {
        for found in Self.distinctSprings {
            let sampled = Self.sampledSettle(found.token.spring)
            #expect(abs(sampled - found.token.settle) < 0.001, "\(found.path): settle \(found.token.settle) s, Spring.value sampled \(sampled) s")
        }
    }
}
