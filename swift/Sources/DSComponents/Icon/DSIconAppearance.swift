import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Every value `spec/components/Icon.yaml` (specVersion 1) binds, as pure functions of the props, the material the
/// enclosing Surface publishes and the token set, so the binding matrix runs on the host. `DSIcon` only draws what
/// these return.
///
/// A cell keyed by a material applies when the enclosing Surface publishes that material, not because the glyph asked
/// for it (spec/SCHEMA.md, ADR-0022 §3.1): under the glass fallback the Surface publishes `raised`, and the tone takes
/// the `raised` cell with it.
nonisolated enum DSIconAppearance {
    // MARK: - tokens.root.size

    /// `tokens.root.size`: the square box, `size.icon.sm`, `.md` or `.lg`. It resolves to the same value in every
    /// density (behavior 10), and it does not scale with Dynamic Type: a glyph inside a control keeps its box and grows
    /// only when the control does (`accessibility.dynamicType`).
    static func box(_ size: DSGlyphSize, _ tokens: DSTokenSet.Size) -> CGFloat {
        switch size {
        case .sm: tokens.iconSm
        case .md: tokens.iconMd
        case .lg: tokens.iconLg
        }
    }

    /// The registry's box of the same name, which carries the SF point size calibrated to fill it and the scale that
    /// calibration was measured at (spec/icons/README.md, "Size mapping table").
    static func registrySize(_ size: DSGlyphSize) -> DSIconSize {
        switch size {
        case .sm: .sm
        case .md: .md
        case .lg: .lg
        }
    }

    /// The SF point size a symbol is drawn at in the box, before `DSSymbol` fits it to the calibration frame.
    static func pointSize(_ size: DSGlyphSize) -> CGFloat {
        registrySize(size).pointSize
    }

    // MARK: - tokens.root.weight

    /// Behavior 3: `display` is allowed only at `lg`. Asked for at `sm` or `md` it resolves to `control` and renders
    /// the regular cut — a thin 16 px glyph is below the stroke the boundary tier needs, so the size wins over the
    /// weight, and the call does not fail. The web's twin is `effectiveGlyphWeight` (`web/packages/react/src/icon/
    /// weight.ts`); the name is not `weight(_:size:)` because `lint:literals` reads `.weight(` outside DSCore as a font
    /// weight modifier (`typography/swift-font-modifier`).
    static func effectiveWeight(_ requested: DSGlyphWeight, size: DSGlyphSize) -> DSGlyphWeight {
        size == .lg ? requested : .control
    }

    /// `tokens.root.weight`: `icon.weight` for `control`, `icon.weight-display` for `display`.
    static func weightToken(_ weight: DSGlyphWeight) -> KeyPath<DSTokenSet, Double> {
        switch weight {
        case .control: \.icon.weight
        case .display: \.icon.weightDisplay
        }
    }

    /// The registry rung the weight token names: 400 is `regular`, 200 is `thin`. A token no rung carries renders the
    /// regular cut rather than nothing.
    static func rung(_ weight: DSGlyphWeight, _ tokens: DSTokenSet) -> DSIconWeight {
        DSIconWeight(number: Int(tokens[keyPath: weightToken(weight)])) ?? .regular
    }

    // MARK: - tokens.root.color

    /// `tokens.root.color`: the tone's token on the published material and, on the scheme's glass, the backdrop kind
    /// (behaviors 7 and 8); nil for `inherit`, which sets no colour, so the glyph takes the foreground of what it sits
    /// in — the label of a Button, the title of a row (behavior 9). The table is `DSGlyphTone.color(on:)` in DSCore,
    /// which Card reads for the parts it leaves to Icon.
    static func color(_ tone: DSGlyphTone?, on surface: DSSurfaceContext) -> DSColorPath? {
        tone.map { $0.color(on: surface) }
    }

    // MARK: - motion

    /// `motion.symbolChange`: `motion.duration.quick`, the time one glyph takes to replace another when a rendered
    /// Icon's `name` changes. `symbolChangeDuration(_:)` reads it through `DSMotion`; the key path is what the binding
    /// test holds against the spec's cell.
    static var symbolChange: KeyPath<DSTokenSet, Double> { \.motion.durationQuick }

    /// `motion.reduceMotion`: `instant`. The replacement is a decorative symbol effect, so under Reduce Motion it does
    /// not run and the new glyph takes its place at `motion.duration.instant` (`accessibility.reduceMotion`,
    /// ADR-0023 §8.4).
    static let reduceMotion: DSReduceMotionBehavior = .instant

    /// Whether a changed `name` runs the symbol's replace effect: always, except under Reduce Motion, where no Draw On,
    /// Draw Off or Magic Replace runs (`accessibility.reduceMotion`).
    static func runsSymbolEffect(_ motion: DSMotion) -> Bool {
        motion.runsDecorativeAnimations(reduceMotion)
    }

    /// How long a changed `name` takes to replace the glyph: `motion.duration.quick`, or `motion.duration.instant`
    /// under Reduce Motion.
    static func symbolChangeDuration(_ motion: DSMotion) -> TimeInterval {
        motion.decorativeDuration(motion.tokens.durationQuick, behavior: reduceMotion)
    }

    /// The animation a changed `name` replaces the glyph with: `symbolChangeDuration` on `motion.easing.out`, the
    /// easing of a state change on the non-spring path (ADR-0023 §9). nil under Reduce Motion, so the glyph is replaced
    /// at once even inside a caller's own animation.
    static func symbolChangeAnimation(_ motion: DSMotion) -> Animation? {
        guard runsSymbolEffect(motion) else { return nil }
        return motion.animation(motion.tokens.easingOut, duration: symbolChangeDuration(motion))
    }

    // MARK: - Accessibility

    /// Behavior 14: a glyph is exposed only when it has a `label` and `isDecorative` is false, and then as an image
    /// named by that label. With no label it has nothing to announce and is hidden whatever `isDecorative` says; the
    /// registry entry's own label field is never a name (ADR-0032 rules 1 and 6).
    static func isExposed(hasLabel: Bool, isDecorative: Bool) -> Bool {
        hasLabel && !isDecorative
    }

    /// Whether a `label` names anything: not when there is none, and not when the string it resolves to is empty or
    /// nothing but whitespace — the empty key, a key the app's strings table translates to spaces, an interpolation of
    /// an empty string. Any of those would make an image with no name, so it hides the glyph instead, which is the
    /// web's rule: `isIconExposed` hides a label whose `trim()` is empty. What is checked is the resolved string, not
    /// the key, because the caller's words reach VoiceOver only after SwiftUI looks the key up (ADR-0032 rule 1).
    ///
    /// - Parameters:
    ///   - locale: the locale of the environment the glyph renders in, the one `Text(label)` is resolved in
    ///     (ADR-0032 rule 4: the platform's own locale context).
    ///   - bundle: where the key is looked up; nil is the app's main bundle, where `DSIcon`'s `Text(label)` looks.
    static func hasLabel(_ label: LocalizedStringKey?, locale: Locale, bundle: Bundle? = nil) -> Bool {
        guard let label else { return false }
        return !isBlank(resolved(label, locale: locale, bundle: bundle))
    }

    /// The string a `label` resolves to where the glyph renders: SwiftUI's own lookup of the key, in `bundle` and
    /// `locale`, with its interpolations filled in — the name `DSIconAccessibility` hands VoiceOver, read back as a
    /// string. A `LocalizedStringKey` has no public accessor, so it is resolved the way `Text` resolves it, through
    /// `Text._resolveText(in:)`: underscored, but a public symbol SwiftUI has shipped since iOS 14 and kept ABI-stable
    /// when it moved to SwiftUICore, where reading the key's private fields by reflection would break on any rename.
    static func resolved(_ label: LocalizedStringKey, locale: Locale, bundle: Bundle? = nil) -> String {
        var environment = EnvironmentValues()
        environment.locale = locale
        return Text(label, bundle: bundle)._resolveText(in: environment)
    }

    /// What a blank label is made of: exactly the characters ECMAScript's `String.prototype.trim` removes, so a label is
    /// blank on Apple exactly when `label.trim() === ""` on the web — the space separators (U+0020, U+00A0, U+1680,
    /// U+2000 to U+200A, U+202F, U+205F, U+3000), tab, line feed, vertical tab, form feed, carriage return, U+2028,
    /// U+2029 and U+FEFF. It is spelled out because Foundation's sets are not that set: `.whitespaces` also holds U+200B,
    /// a zero-width format character the web keeps, and `.whitespacesAndNewlines` adds U+0085 and lacks U+FEFF.
    static let blankCharacters: CharacterSet = {
        var set = CharacterSet(charactersIn: "\u{09}\u{0A}\u{0B}\u{0C}\u{0D}\u{20}\u{A0}\u{1680}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}")
        set.insert(charactersIn: "\u{2000}"..."\u{200A}")
        return set
    }()

    /// Whether a resolved label is empty or made only of `blankCharacters`.
    static func isBlank(_ string: String) -> Bool {
        string.unicodeScalars.allSatisfy { blankCharacters.contains($0) }
    }
}
