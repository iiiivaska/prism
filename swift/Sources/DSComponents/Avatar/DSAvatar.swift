import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Avatar: a circular portrait of a person, a vehicle or a site (`spec/components/Avatar.yaml`, specVersion 1).
///
///     DSAvatar(name: "Anna Petrova", image: portrait)
///     DSAvatar(name: "Northgate", size: .sm)
///     DSAvatar(name: "Anna Petrova", image: portrait, hasRing: true)
///     DSAvatar(name: "Anna Petrova", isDecorative: true) // the name is written beside it
///
/// It is not a control: an avatar that opens a profile is wrapped in a Button or a ListRow, which owns the press, the
/// hit region, the focus ring and the label (behavior 10). It takes no gesture and is never focusable.
///
/// Behaviour, from the spec:
///  - The circle is the Surface module's glass chip (ADR-0036): `dsSurfaceChip` resolves Avatar's `root.background`
///    cell on the ground it sits on (`DSAvatarAppearance.background(on:)`) and draws the recipe over a map, an image,
///    vivid or the scheme's glass — its fill and edge alone on the scheme's glass — `comp.avatar.bg` on every other
///    ground but accent and inverse, where it draws nothing, and under the watch, Reduce Transparency and Increase
///    Contrast the fallback, `color.bg.surface.raised` over `color.bg.page`. Avatar reads no setting and draws no
///    fallback of its own.
///  - The parts read what the chip publishes, never the ground: the initials, the fallback glyph and the ring take
///    Avatar's own cells from the ground while glass or the own fill renders, and their `default` cells under the
///    fallback, which publishes `(raised, none)` (ADR-0036 §4). The initials are `DSText` and the glyph is `DSIcon`,
///    both with no tone, so they take the colour set around them: Icon's and Text's tone tables would give
///    `color.text.on-vivid` on vivid, where Avatar binds `color.text.on-glass-fill`.
///  - The circle is a square of `size.control.*` — the control height, so an avatar lines up with the buttons and
///    chips beside it — drawn as a circle at `radius.control`, which clips everything inside it (behaviors 4 and 5).
///    It grows with the initials along their role's Dynamic Type style up to accessibility3, where it clamps, and the
///    initials never shrink below their role (`accessibility.dynamicType`).
///  - The content falls back in one order: the image, then the initials of `name`, then `object.user` (behavior 1).
///    The initials are always drawn under the image. `image` is the portrait the app has already loaded — an asset, a
///    decoded photo, what an `AsyncImage` phase yields — and nil until it has one and after its load fails, which is
///    the same fallback; SwiftUI has no element that fetches a source and reports its failure the way the web's `img`
///    does, and a component that fetched would own a cache and a network policy (`notes.platform.ios`).
///  - A change from no image to an image fades it in over the initials over `motion.duration.base` with
///    `motion.easing.out`; under Reduce Motion the fade still runs, over the shorter duration the reduced context
///    carries, and nothing scales, moves or blurs (behavior 13, `motion`). An image present at the first render is
///    simply there.
///  - The initials are the first letters of the first and last words of `name`, upper-cased in SwiftUI's `locale`
///    environment value, so Turkish gives "İ" (behavior 2, `DSAvatarAppearance.initials(of:locale:)`). They carry the
///    role's own tracking and no more (behavior 3).
///  - `hasRing` draws a `border.strong` stroke inside the circle, flush with its edge, so the layout does not move
///    when it appears (behavior 6).
///  - Exposure (behaviors 11 and 12, `accessibility`, `notes.platform.ios`): an avatar with a non-blank `name` and
///    `isDecorative` false is one accessibility element with the image trait, named by `name` as written; every other
///    avatar is hidden, so neither the initials nor an image's own name reaches VoiceOver, and no word is invented for
///    the glyph (ADR-0032). The web exposes the same avatar as `role="img"` with the same name.
///
/// watchOS is `none` in the spec — a wrist screen names a person in Text rather than picturing them — and
/// `DSComponentsManifest` declares no watch entry.
public struct DSAvatar: View {
    private let name: String?
    private let image: Image?
    private let size: DSAvatarSize
    private let hasRing: Bool
    private let isDecorative: Bool

    private var ds = DSThemeValues()
    /// The locale the initials are upper-cased in (behavior 2).
    @Environment(\.locale) private var locale

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. There is one initializer, mirroring the spec's five props as
    // `DSBadge` mirrors Badge's: `name` is the caller's data — a person's or a site's name, never a phrase to translate
    // — so it is a `String`, from which both the initials and the accessibility label come.

    /// - Parameters:
    ///   - name: the full name. The initials and the accessibility label both come from it; give every avatar one,
    ///     even with an image. With no name, or a blank one, the circle draws `object.user` and is hidden from
    ///     assistive technology.
    ///   - image: the portrait, already loaded; nil while it loads and after it fails, which draws the initials.
    ///   - size: `md` by default; the circle is the control height of its size, which follows density.
    ///   - hasRing: false by default; true draws the ring of the one avatar that is active or selected in a group.
    ///   - isDecorative: false by default; true hides the avatar from assistive technology, for a name that is already
    ///     written beside it.
    public init(
        name: String? = nil,
        image: Image? = nil,
        size: DSAvatarSize = .md,
        hasRing: Bool = false,
        isDecorative: Bool = false
    ) {
        self.name = name
        self.image = image
        self.size = size
        self.hasRing = hasRing
        self.isDecorative = isDecorative
    }

    public var body: some View {
        let tokens = ds.tokens
        let role = DSAvatarAppearance.initialsRole(size)
        let initials = DSAvatarAppearance.initials(of: name, locale: locale)
        let glyph = DSAvatarAppearance.fallbackIconSize(size)
        return DSAvatarFrame(
            side: tokens[keyPath: DSAvatarAppearance.side(size)],
            textStyle: tokens.typography[keyPath: role.keyPath].textStyle.fontTextStyle
        ) { side in
            DSAvatarFace(initials: initials, role: role, glyph: glyph, image: image, hasRing: hasRing, side: side)
                .dsSurfaceChip(DSAvatarAppearance.background(on:), in: Circle())
        }
        .dynamicTypeSize(...DSAvatarAppearance.largestTypeSize)
        .modifier(DSAvatarAccessibility(name: DSAvatarAppearance.accessibilityName(name, isDecorative: isDecorative)))
    }
}

extension DSAvatar {
    /// The Avatar a Chip draws in its leading position (Chip.yaml `avatar`): this one at size sm and decorative, because
    /// the chip's `label` names the chip and the Avatar's name would be read twice. Its `name`, `image` and `hasRing` are
    /// the caller's. Written here, beside the stored properties it reads, which are private to this file.
    var inChip: DSAvatar {
        DSAvatar(name: name, image: image, size: .sm, hasRing: hasRing, isDecorative: true)
    }
}

/// The circle's side: `size.control.*`, grown along the initials' Dynamic Type style the way their own size scales,
/// so the circle keeps its proportions up to accessibility3, where `DSAvatar` clamps both. Button's frame scales its
/// pill's height the same way.
private struct DSAvatarFrame<Content: View>: View {
    @ScaledMetric private var side: CGFloat
    private let content: (CGFloat) -> Content

    init(side: CGFloat, textStyle: Font.TextStyle, @ViewBuilder content: @escaping (CGFloat) -> Content) {
        _side = ScaledMetric(wrappedValue: side, relativeTo: textStyle)
        self.content = content
    }

    var body: some View {
        content(side)
    }
}

/// What the circle holds, bottom to top: the initials or the fallback glyph, the image, and the ring, clipped to the
/// circle. It is the view the glass chip modifies, so it reads the context the chip publishes (ADR-0036 §4), and
/// every colour here is Avatar's own cell on that context.
private struct DSAvatarFace: View {
    let initials: String?
    let role: DSTextRole
    let glyph: DSGlyphSize
    let image: Image?
    let hasRing: Bool
    let side: CGFloat

    private var ds = DSThemeValues()

    // Written out for the reason `DSAvatar.init` is.
    init(initials: String?, role: DSTextRole, glyph: DSGlyphSize, image: Image?, hasRing: Bool, side: CGFloat) {
        self.initials = initials
        self.role = role
        self.glyph = glyph
        self.image = image
        self.hasRing = hasRing
        self.side = side
    }

    var body: some View {
        let tokens = ds.tokens
        let published = ds.surface
        return ZStack {
            if let initials {
                // One line at the role's size: the initials never wrap, truncate or shrink (behavior 3,
                // `accessibility.dynamicType`).
                DSText(verbatim: initials, role: role, tone: nil)
                    .fixedSize()
                    .foregroundStyle(tokens[keyPath: DSAvatarAppearance.initialsColor(on: published)])
            } else {
                DSIcon(DSAvatarAppearance.fallbackIcon, size: glyph, tone: nil)
                    .foregroundStyle(tokens[keyPath: DSAvatarAppearance.fallbackIconColor(on: published)])
            }
            if let image {
                image
                    .resizable()
                    .scaledToFill()
                    .frame(width: side, height: side)
                    .transition(.opacity)
            }
            if hasRing {
                Circle().strokeBorder(
                    tokens[keyPath: DSAvatarAppearance.ringColor(on: published)],
                    lineWidth: tokens[keyPath: DSAvatarAppearance.ringWidth]
                )
            }
        }
        .frame(width: side, height: side)
        .clipShape(Circle())
        .animation(DSAvatarAppearance.imageLoadAnimation(ds.motion), value: image != nil)
    }
}

/// Avatar's accessibility (behaviors 11 and 12, `notes.platform.ios`): one element with the image trait, named by
/// `name`, or nothing at all.
///
/// `.ignore` drops the children's own elements, so neither the initials' text nor an asset image's automatic name is
/// read beside the name. No hint, value or focus is ever set: the avatar is not a control.
private struct DSAvatarAccessibility: ViewModifier {
    let name: String?

    init(name: String?) {
        self.name = name
    }

    func body(content: Content) -> some View {
        if let name {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(verbatim: name))
                .accessibilityAddTraits(.isImage)
        } else {
            content.accessibilityHidden(true)
        }
    }
}
