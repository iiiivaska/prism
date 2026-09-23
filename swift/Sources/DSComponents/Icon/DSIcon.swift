import SwiftUI
import DSCore
import DSIcons
import DSTokens

/// Icon: one glyph from the icon registry, named by its semantic id (`spec/components/Icon.yaml`, specVersion 1).
///
///     DSIcon(.actionSettings)
///     DSIcon(.statusWarning, size: .sm, style: .filled, tone: .warning)
///     DSIcon(.objectLock, size: .sm, tone: .secondary, label: "Locked for editing")
///
/// The spec owns the box, the cut, the style and the tone; which vendor glyph draws it — the entry's SF Symbol, or the
/// Phosphor image set generated for an entry that binds `apple.custom` — is the registry's business (ADR-0013
/// decisions 2 and 3). A glyph is not a control: everything that acts is an IconButton or a row around one, so Icon
/// is never focusable and carries no gesture (behavior 12).
///
/// Behaviour, from the spec:
///  - The box is square, `size.icon.sm`, `.md` or `.lg`, and the same in every density: a control grows around its
///    glyph, the glyph does not grow with it, and it does not scale with Dynamic Type (behavior 10).
///  - `weight: control` draws `icon.weight`, the regular rung; `display` draws `icon.weight-display`, the thin one, and
///    only at `lg` — below it the size wins and the regular rung renders (behavior 3).
///  - Under Bold Text the rung steps one up the registry's ladder, once (behavior 4). macOS has no Bold Text setting.
///  - `style: filled` draws the symbol's fill variant and `duotone` renders hierarchically; both take the weight and
///    the Bold Text step (behaviors 5 and 6). The style defaults to `outline` whatever the registry entry's
///    `defaultStyle` says: the spec's prop is the default, and no Prism stack reads the registry's.
///  - The tone resolves against the material the enclosing `DSSurfaceView` publishes and, on the scheme's glass, the
///    backdrop kind; on vivid, inverse, accent, light glass and glass every tone takes that material's own foreground.
///    A nil tone is `inherit`: no colour is set and the glyph takes the foreground around it (behaviors 7–9).
///  - A symbol draws at the registry's calibrated point size, fitted so that it never draws outside its box
///    (`DSSymbolImage`, anatomy); an image set fills the box.
///  - A glyph the registry mirrors flips under a right-to-left layout where the system does not already
///    (behavior 11, ADR-0013 rule 4).
///  - Icon speaks no word of its own (behavior 13, ADR-0032). It is an image named by `label` when it has one and
///    `isDecorative` is false, and hidden otherwise — also with no `label`, whatever `isDecorative` says, and with one
///    that resolves to nothing but whitespace — and the SF Symbol's or asset's automatic name never reaches VoiceOver
///    (behavior 14).
///  - A changed `name` replaces the glyph with the symbol's replace effect over `motion.duration.quick`; under Reduce
///    Motion no symbol effect runs and the new glyph takes the old one's place at once (`motion`,
///    `accessibility.reduceMotion`, `DSIconAppearance.symbolChangeAnimation`). An image set has no symbol effect; the
///    same animation carries its change.
///
/// watchOS is `full`: every prop works there, the registry's Apple binding carrying the wrist as it carries the phone.
public struct DSIcon: View {
    private let name: DSIconName
    private let size: DSGlyphSize
    private let weight: DSGlyphWeight
    private let style: DSIconStyle
    private let tone: DSGlyphTone?
    private let label: LocalizedStringKey?
    private let isDecorative: Bool

    private var ds = DSThemeValues()
    /// The locale `Text(label)` is resolved in, so the blank check reads the string VoiceOver would.
    @Environment(\.locale) private var locale

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site. There is one initializer: `label` is only ever spoken, so it
    // takes a localized key, as Card's caption and custom action label do, and needs no verbatim overload.

    /// - Parameters:
    ///   - name: the registry id, such as `.navBack`, `.actionFilter` or `.statusWarning`.
    ///   - size: the box; `md` by default, the box every control carries. Corner and inline glyphs take `sm`.
    ///   - weight: `control` by default; `display` draws the thin rung, and only at `lg`.
    ///   - style: `outline` by default; `filled` is reserved for status glyphs and the selected item of a tab bar.
    ///   - tone: `primary` by default, resolved against the enclosing Surface; nil to inherit the foreground around
    ///     the glyph, which is how a glyph inside a control follows its label.
    ///   - label: the phrase that names a glyph carrying meaning on its own, with no word beside it. A glyph without
    ///     one has no name and is hidden from assistive technology, and so is a glyph whose label resolves — in the
    ///     app's bundle and the environment's locale, interpolations filled in — to an empty string or to nothing but
    ///     whitespace, as the web hides a blank `label`: it is never an image with no name.
    ///   - isDecorative: true hides the glyph even when it has a `label`, because the text beside it carries the
    ///     meaning.
    public init(
        _ name: DSIconName,
        size: DSGlyphSize = .md,
        weight: DSGlyphWeight = .control,
        style: DSIconStyle = .outline,
        tone: DSGlyphTone? = .primary,
        label: LocalizedStringKey? = nil,
        isDecorative: Bool = false
    ) {
        self.name = name
        self.size = size
        self.weight = weight
        self.style = style
        self.tone = tone
        self.label = label
        self.isDecorative = isDecorative
    }

    public var body: some View {
        let tokens = ds.tokens
        let box = DSIconAppearance.box(size, tokens.size)
        let rung = DSIconAppearance.rung(DSIconAppearance.effectiveWeight(weight, size: size), tokens)
        let exposed = DSIconAppearance.isExposed(hasLabel: DSIconAppearance.hasLabel(label, locale: locale), isDecorative: isDecorative)
        let motion = ds.motion
        return glyph(box: box, rung: rung)
            .contentTransition(DSIconAppearance.runsSymbolEffect(motion) ? .symbolEffect(.replace) : .identity)
            .animation(DSIconAppearance.symbolChangeAnimation(motion), value: name)
            .flipsForRightToLeftLayoutDirection(name.mirrorsInRTL)
            .modifier(DSForeground(color: DSIconAppearance.color(tone, on: ds.surface).map { tokens[keyPath: $0] }))
            .modifier(DSIconAccessibility(label: exposed ? label : nil))
    }

    @ViewBuilder
    private func glyph(box: CGFloat, rung: DSIconWeight) -> some View {
        let registry = DSIconAppearance.registrySize(size)
        if let symbol = name.symbol {
            DSSymbolImage(
                systemName: symbol, box: box, pointSize: registry.pointSize, scale: registry.scale,
                weight: rung.number, boldWeight: rung.boldText.number
            )
            .symbolVariant(style.symbolVariant ?? .none)
            .symbolRenderingMode(style.renderingMode)
        } else if let asset = name.asset, let bundle = DSIconBundle.bundle {
            // An image set has one drawing per Phosphor cut, so the Bold Text step picks the next cut; a filled or
            // duotone set has one cut whatever the weight (behavior 6). It fills the box, as the web's svg does.
            let rendered = DSSymbol.renderedWeight(rung.number, boldWeight: rung.boldText.number, boldText: ds.policy.boldText)
            let cut = style.phosphorCut ?? (DSIconWeight(number: rendered) ?? rung).phosphorCut
            Image("\(asset).\(cut)", bundle: bundle)
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .frame(width: box, height: box)
        } else {
            // The registry names no drawing this build can find: the box stays, so the layout around it does not move.
            Color.clear.frame(width: box, height: box)
        }
    }
}

/// Icon's accessibility (behavior 14, `accessibility`): an image named by `label`, or nothing at all.
///
/// `.ignore` drops the children's own elements, so `Image(systemName:)` cannot name itself with the SF Symbol's name,
/// nor an image set with its asset name — words Prism did not get from the caller (ADR-0032 rule 1). No hint, value,
/// help tag or focus is ever set: the glyph is not a control.
private struct DSIconAccessibility: ViewModifier {
    let label: LocalizedStringKey?

    init(label: LocalizedStringKey?) {
        self.label = label
    }

    func body(content: Content) -> some View {
        if let label {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(label))
                .accessibilityAddTraits(.isImage)
        } else {
            content.accessibilityHidden(true)
        }
    }
}
