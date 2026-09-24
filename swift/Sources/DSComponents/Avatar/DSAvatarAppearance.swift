import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Every value `spec/components/Avatar.yaml` (specVersion 1) binds, as pure functions of the size and the context the
/// circle reads, and the rules of behaviors 1, 2, 11 and 12 as pure functions of `name`, `isDecorative` and the locale,
/// so the binding matrix, the initials and the name all run on the host. `DSAvatar` only draws and exposes what these
/// return.
///
/// **Two contexts.** `background(on:)` is asked on the ground the circle sits on, and the Surface module's glass chip
/// shape resolves it (`dsSurfaceChip`, ADR-0036 §2 to §7): the recipe over a map, an image, vivid or the scheme's glass,
/// `comp.avatar.bg` on every other ground but accent and inverse, and nothing on those two. Every other part — the
/// initials, the fallback glyph and the ring — is asked on the context the chip **publishes**, never on the ground:
/// while glass or the own cell renders that is the ground itself, so the parts key on the media under the glass, and
/// under the fallback it is `(raised, none)`, so every part takes its `default` cell by construction (ADR-0036 §4,
/// `accessibility.reduceTransparency`). Avatar reads no setting and draws no fallback of its own.
///
/// A cell keyed by a material applies when that material is published, and a value with no cell takes `default`; with
/// no `default` either the property is not set (spec/SCHEMA.md, "The binding-matrix grammar"), which is how the circle
/// has no fill on accent and inverse.
///
/// The web's twins are `web/packages/react/src/avatar/parts.ts` for the rules and the `--ds--avatar-*` properties of
/// `Avatar.css` for the bindings. Both stacks read the same cells out of the same spec
/// (`DSAvatarBindingTests`, `web/packages/react/test/avatar.test.tsx`) and assert the same initials vectors byte for
/// byte.
nonisolated enum DSAvatarAppearance {
    // MARK: - The ground

    /// Whether a context puts the circle over media: the page over a map, an image or vivid, a vivid Surface, or the
    /// scheme's glass — the grounds where Avatar.yaml keys its media cells, and where `root.background` binds
    /// `material.glass.chip`. Light glass is not one of them: Avatar.yaml writes it the circle's own fill, so every part
    /// takes its `default` cell there.
    static func isOverMedia(_ context: DSSurfaceContext) -> Bool {
        switch context.material {
        case .page: context.backdrop != .none
        case .vivid, .glass: true
        case .solid, .raised, .nested, .glassLight, .inverse, .accent: false
        }
    }

    // MARK: - tokens.root

    /// `tokens.root.background`, as the glass chip shape asks for it (ADR-0036 §2.2): `glass` where the cell binds
    /// `material.glass.chip`, the circle's own `comp.avatar.bg` on the page over nothing, the solid ladder and light
    /// glass, and `none` on accent and inverse, where the matrix has no cell and no `default` (behavior, "On an accent or
    /// an inverse surface"). The chip decides whether the recipe renders or falls back; Avatar only names the cell.
    static func background(on ground: DSSurfaceContext) -> DSSurfaceChipCell {
        if ground.material == .inverse || ground.material == .accent { return DSSurfaceChipCell.none }
        if isOverMedia(ground) { return .glass }
        return .own(\.components.avatar.bg)
    }

    /// `tokens.root.radius`: `radius.control`, the pill's radius. It is at least half the side of the largest circle in
    /// every density the spec lists (`DSAvatarBindingTests.radiusCell`), so on the square footprint it *is* a circle,
    /// which the view draws as `Circle()` (behavior 5).
    static var radius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    /// `tokens.root.size`: the side of the square footprint, the control height of the size — `size.control.sm`, `.md`
    /// or `.lg` — which follows density (behavior 4). The circle grows with the initials along their Dynamic Type style
    /// up to accessibility3 (`largestTypeSize`).
    static func side(_ size: DSAvatarSize) -> KeyPath<DSTokenSet, CGFloat> {
        switch size {
        case .sm: \.size.controlSm
        case .md: \.size.controlMd
        case .lg: \.size.controlLg
        }
    }

    // MARK: - tokens.image

    /// `tokens.image.radius`: `radius.control`, so the portrait is clipped to the circle itself.
    static var imageRadius: KeyPath<DSTokenSet, CGFloat> { \.radius.control }

    // MARK: - tokens.initials

    /// `tokens.initials.typography`: `type.label.sm`, `.md` or `.lg`, by size. The initials carry the role's own
    /// tracking and no more (behavior 3).
    static func initialsRole(_ size: DSAvatarSize) -> DSTextRole {
        switch size {
        case .sm: .labelSm
        case .md: .labelMd
        case .lg: .labelLg
        }
    }

    /// `tokens.initials.color` on the published context: `color.text.secondary` by default, the glass fill's own
    /// foreground over media, and the pair each opaque fill carries on accent and inverse.
    static func initialsColor(on context: DSSurfaceContext) -> DSColorPath {
        if isOverMedia(context) { return \.color.textOnGlassFill }
        switch context.material {
        case .accent: return \.color.textOnAccentSecondary
        case .inverse: return \.color.textOnInverse
        default: return \.color.textSecondary
        }
    }

    // MARK: - tokens.fallbackIcon

    /// The glyph a circle with neither an image nor initials draws: `object.user` (anatomy, behavior 1). It is never
    /// named: Avatar emits no string of its own (behavior 12, ADR-0032).
    static let fallbackIcon: DSIconName = .objectUser

    /// `tokens.fallbackIcon.size`: Icon's `sm` box on the small circle and its `md` box on the other two, which
    /// `DSIcon` resolves (`DSIconAppearance.box`). The glyph is the same box in every density and does not scale with
    /// Dynamic Type (Icon.yaml behavior 10).
    static func fallbackIconSize(_ size: DSAvatarSize) -> DSGlyphSize {
        switch size {
        case .sm: .sm
        case .md, .lg: .md
        }
    }

    /// `tokens.fallbackIcon.color` on the published context: `color.icon.secondary` by default, and the initials'
    /// colour everywhere else. The view sets it as the glyph's foreground, and `DSIcon`'s nil tone takes it: Icon's own
    /// tone table would give `color.text.on-vivid` on vivid, where Avatar binds `color.text.on-glass-fill`.
    static func fallbackIconColor(on context: DSSurfaceContext) -> DSColorPath {
        if isOverMedia(context) { return \.color.textOnGlassFill }
        switch context.material {
        case .accent: return \.color.textOnAccentSecondary
        case .inverse: return \.color.textOnInverse
        default: return \.color.iconSecondary
        }
    }

    // MARK: - tokens.ring

    /// `tokens.ring.color` on the published context: `comp.avatar.ring`, the inverse solid, by default;
    /// `color.border.on-glass-fill` over a map, an image and the scheme's glass; `color.border.on-media` over vivid
    /// (ADR-0030 §3.2); and `color.text.on-inverse` on inverse, where the default ring would be the colour of the
    /// ground it stands on.
    static func ringColor(on context: DSSurfaceContext) -> DSColorPath {
        switch context.material {
        case .page:
            switch context.backdrop {
            case .none: \.components.avatar.ring
            case .map, .image: \.color.borderOnGlassFill
            case .vivid: \.color.borderOnMedia
            }
        case .vivid: \.color.borderOnMedia
        case .glass: \.color.borderOnGlassFill
        case .inverse: \.color.textOnInverse
        case .solid, .raised, .nested, .glassLight, .accent: \.components.avatar.ring
        }
    }

    /// `tokens.ring.width`: `border.strong`, the emphasized stroke. The view draws it inside the circle
    /// (`strokeBorder`), flush with its edge, so the layout does not move when the ring appears (behavior 6).
    static var ringWidth: KeyPath<DSTokenSet, CGFloat> { \.border.strong }

    // MARK: - motion

    /// `motion.imageLoad`: `motion.duration.base`, the time an image takes to fade in over the initials (behavior 13).
    /// `imageLoadDuration(_:)` reads it through `DSMotion`; the key path is what the binding test holds against the
    /// spec's cell.
    static var imageLoad: KeyPath<DSTokenSet, Double> { \.motion.durationBase }

    /// `motion.reduceMotion`: `crossfade`. The fade is an opacity change, which Reduce Motion keeps; nothing scales,
    /// moves or blurs, and the reduced context shortens `motion.duration.base` by itself (`accessibility.reduceMotion`).
    static let reduceMotion: DSReduceMotionBehavior = .crossfade

    /// How long an image takes to fade in: `motion.duration.base` of the context, in every motion mode.
    static func imageLoadDuration(_ motion: DSMotion) -> TimeInterval {
        motion.decorativeDuration(motion.tokens.durationBase, behavior: reduceMotion)
    }

    /// The animation an image fades in on: `imageLoadDuration` on `motion.easing.out`, the easing of a state change on
    /// the non-spring path (ADR-0023 §9), as the web's transition is.
    static func imageLoadAnimation(_ motion: DSMotion) -> Animation {
        motion.animation(motion.tokens.easingOut, duration: imageLoadDuration(motion))
    }

    // MARK: - Rules

    /// The largest Dynamic Type size the initials, and the circle with them, scale to (`accessibility.dynamicType`).
    static let largestTypeSize: DynamicTypeSize = .accessibility3

    // MARK: - What an avatar shows and says (behaviors 1, 2, 11 and 12)

    /// Behavior 2: the first letter of the first word and the first letter of the last word of `name`, upper-cased
    /// with the locale-aware transform of `locale` (SwiftUI's `locale` environment value, the app's own), so Turkish
    /// gives "İ" for "i". A word is what the whitespace between words leaves: the characters ECMAScript's `trim()`
    /// removes (`DSIconAppearance.blankCharacters`), which are the web's `\s`. A word with no letter in it is not one
    /// the initials are taken from, so "Unit 4417" gives "U". A letter is a scalar of general category L with the
    /// combining marks (category M) that follow it, the web's `/\p{L}\p{M}*/u`, and nothing is normalized, so both
    /// stacks draw the same scalars. A one-word name gives one letter, and a name with no letter in it, a blank one or
    /// none gives nil: the circle then draws `object.user`. The same rule holds for Latin and Cyrillic, so
    /// "Анна Петрова" gives "АП". The web's twin is `avatarInitials` (`avatar/parts.ts`).
    static func initials(of name: String?, locale: Locale) -> String? {
        guard let name else { return nil }
        let letters = words(of: name).compactMap(firstLetter(of:))
        guard let first = letters.first else { return nil }
        let last = letters.count > 1 ? letters[letters.count - 1] : ""
        return (first + last).uppercased(with: locale)
    }

    /// The words of a name, as scalars: the runs between `DSIconAppearance.blankCharacters`, which is what `trim()`
    /// followed by a split at `\s+` leaves on the web.
    static func words(of name: String) -> [[Unicode.Scalar]] {
        var words: [[Unicode.Scalar]] = []
        var word: [Unicode.Scalar] = []
        for scalar in name.unicodeScalars {
            if DSIconAppearance.blankCharacters.contains(scalar) {
                if !word.isEmpty {
                    words.append(word)
                    word.removeAll()
                }
            } else {
                word.append(scalar)
            }
        }
        if !word.isEmpty { words.append(word) }
        return words
    }

    /// The first letter of a word, with the combining marks that follow it, or nil for a word with no letter.
    static func firstLetter(of word: [Unicode.Scalar]) -> String? {
        guard let start = word.firstIndex(where: isLetter) else { return nil }
        var letter = String.UnicodeScalarView()
        letter.append(word[start])
        for scalar in word[(start + 1)...] {
            guard isMark(scalar) else { break }
            letter.append(scalar)
        }
        return String(letter)
    }

    /// General category L: `Lu`, `Ll`, `Lt`, `Lm` and `Lo`, which is what `\p{L}` matches.
    static func isLetter(_ scalar: Unicode.Scalar) -> Bool {
        switch scalar.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter: true
        default: false
        }
    }

    /// General category M: `Mn`, `Mc` and `Me`, which is what `\p{M}` matches.
    static func isMark(_ scalar: Unicode.Scalar) -> Bool {
        switch scalar.properties.generalCategory {
        case .nonspacingMark, .spacingMark, .enclosingMark: true
        default: false
        }
    }

    /// Whether `name` names anything: a string with something left once `DSIconAppearance.blankCharacters` are taken
    /// away, Icon's blank rule. An avatar with no `name`, or a blank one, has nothing to announce (Avatar.yaml
    /// `accessibility.label`, ADR-0032 rules 1 and 5). The web's twin is `hasAvatarName`.
    static func hasName(_ name: String?) -> Bool {
        guard let name else { return false }
        return !DSIconAppearance.isBlank(name)
    }

    /// Behaviors 11 and 12: an avatar is exposed, as one image named by `name`, only when it has a name and
    /// `isDecorative` is false. With no name it is hidden whatever `isDecorative` says, and no word is invented for the
    /// `object.user` glyph. The web's twin is `isAvatarExposed`.
    static func isExposed(hasName: Bool, isDecorative: Bool) -> Bool {
        hasName && !isDecorative
    }

    /// The name an avatar is announced by — `name` as the caller wrote it, never upper-cased or trimmed — or nil when
    /// it is hidden.
    static func accessibilityName(_ name: String?, isDecorative: Bool) -> String? {
        guard let name, isExposed(hasName: hasName(name), isDecorative: isDecorative) else { return nil }
        return name
    }
}
