import SwiftUI
import DSCore
import DSTokens

/// Text: the typography primitive (`spec/components/Text.yaml`, specVersion 2).
///
/// A role selects size, weight, line height, tracking and figures from the type tokens; a tone, read against the
/// material and backdrop kind the enclosing `DSSurfaceView` publishes, selects the foreground. Metric roles take a
/// dimmed trailing group and a hung unit.
///
///     DSText("86", role: .metricXl, trailing: ".4", unit: "%")
///     DSText("Last 24 hours", role: .caption, tone: .secondary)
///
/// Everything typographic goes through DSCore's one text route, `dsText(_:figures:)` (ADR-0021 §9): the size scaled by
/// `@ScaledMetric` along the role's Dynamic Type style, the weight Bold Text and Increase Contrast choose (applied
/// once), the brand's face, figures, tracking, the CSS line height and the first-baseline correction. Text never
/// reads the color scheme or an accessibility setting itself (ADR-0022 §3.1, ADR-0023 §8.5).
///
/// - Tones follow `dsSurfaceContext`: on vivid, light glass and inverse every tone is the material's single
///   foreground; on accent the quieter tones take `color.text.on-accent-secondary`; on the scheme's glass the quieter
///   tones also follow the backdrop kind. `dimmed` and the trailing group need a metric role at 24 px or more and
///   otherwise render `secondary`.
/// - Figures follow the role (`data` is tabular, every other role proportional) unless `numeric` overrides them; a
///   value that changes while visible sets `.tabular` (ADR-0021 §5).
/// - `metric-xl` clamps at the accessibility3 Dynamic Type size.
/// - An id — the `data` role cut with `truncation: .ellipsis` — keeps the copy affordance: the value stays selectable,
///   so the platform's copy action reaches what the ellipsis cut. watchOS offers no selection and keeps the ellipsis
///   alone (`DSTextCopyAffordance`).
/// - A value that counts up rolls its digits over `motion.duration.slow`; a value that only replaces another does not
///   animate, and under Reduce Motion nothing rolls (`DSTextAppearance.countsUp`). Only text given as a string counts
///   up; a localized key is a label, not a value.
public struct DSText: View {
    private let content: DSTextContent
    private let role: DSTextRole
    private let tone: DSTextTone?
    private let trailing: String?
    private let unit: String?
    private let numeric: DSTextNumeric
    private let truncation: DSTextTruncation
    private let maxLines: Int?

    private var ds = DSThemeValues()

    /// Text from a localized string key, looked up like SwiftUI's `Text(_:tableName:bundle:comment:)`.
    ///
    /// - Parameters:
    ///   - role: the type role; `body-md` by default. On watchOS display roles render as `title-sm` and title roles
    ///     as `headline`.
    ///   - tone: the tone, resolved against the enclosing Surface; `primary` by default, nil to inherit the
    ///     foreground of the enclosing view.
    ///   - trailing: a trailing group in the dimmed tone at the same size, such as the decimal of a hero (metric roles
    ///     only).
    ///   - unit: a unit hung beside the value in `type.metric.unit`, baseline-aligned (metric roles only).
    ///   - numeric: figures; `auto` takes the role's.
    ///   - truncation: how text that exceeds `maxLines` ends: `ellipsis` for identifiers, `fade` for prose; `none`
    ///     never cuts, whatever `maxLines` says.
    ///   - maxLines: the most lines a truncated text shows; nil takes 1 for `ellipsis` and 3 for `fade`.
    public init(
        _ key: LocalizedStringKey,
        tableName: String? = nil,
        bundle: Bundle? = nil,
        role: DSTextRole = .bodyMd,
        tone: DSTextTone? = .primary,
        trailing: String? = nil,
        unit: String? = nil,
        numeric: DSTextNumeric = .auto,
        truncation: DSTextTruncation = .none,
        maxLines: Int? = nil
    ) {
        self.init(
            content: .localized(key, tableName: tableName, bundle: bundle),
            role: role, tone: tone, trailing: trailing, unit: unit,
            numeric: numeric, truncation: truncation, maxLines: maxLines
        )
    }

    /// Text shown as given, without localization.
    public init(
        verbatim content: String,
        role: DSTextRole = .bodyMd,
        tone: DSTextTone? = .primary,
        trailing: String? = nil,
        unit: String? = nil,
        numeric: DSTextNumeric = .auto,
        truncation: DSTextTruncation = .none,
        maxLines: Int? = nil
    ) {
        self.init(
            content: .verbatim(content),
            role: role, tone: tone, trailing: trailing, unit: unit,
            numeric: numeric, truncation: truncation, maxLines: maxLines
        )
    }

    /// Text shown as given, without localization: a value the app already formatted.
    @_disfavoredOverload
    public init<S: StringProtocol>(
        _ content: S,
        role: DSTextRole = .bodyMd,
        tone: DSTextTone? = .primary,
        trailing: String? = nil,
        unit: String? = nil,
        numeric: DSTextNumeric = .auto,
        truncation: DSTextTruncation = .none,
        maxLines: Int? = nil
    ) {
        self.init(
            content: .verbatim(String(content)),
            role: role, tone: tone, trailing: trailing, unit: unit,
            numeric: numeric, truncation: truncation, maxLines: maxLines
        )
    }

    /// Text from content a component already holds: a Button's label, a Card's title and caption line.
    init(
        content: DSTextContent,
        role: DSTextRole,
        tone: DSTextTone?,
        trailing: String?,
        unit: String?,
        numeric: DSTextNumeric,
        truncation: DSTextTruncation,
        maxLines: Int?
    ) {
        self.content = content
        self.role = role
        self.tone = tone
        self.trailing = trailing
        self.unit = unit
        self.numeric = numeric
        self.truncation = truncation
        self.maxLines = maxLines
    }

    public var body: some View {
        let rendered = role.rendered()
        let tokens = ds.tokens
        let typeRole = tokens.typography[keyPath: rendered.keyPath]
        let figures = numeric.figures(for: typeRole)
        return DSTextBody(
            content: content,
            requested: role,
            role: rendered,
            typeRole: typeRole,
            figures: figures,
            tone: tone,
            trailing: rendered.isMetric ? trailing : nil,
            unit: rendered.isMetric ? unit : nil,
            truncation: truncation,
            maxLines: maxLines,
            surface: ds.surface,
            brand: ds.brand,
            tokens: tokens,
            motion: ds.motion
        )
        .dynamicTypeSize(rendered.dynamicTypeSizes)
    }
}

/// What a `DSText` shows.
enum DSTextContent {
    case localized(LocalizedStringKey, tableName: String?, bundle: Bundle?)
    case verbatim(String)
    /// Runs a component joined itself, such as a Card's caption and the unit that joins it on vivid.
    case joined(Text)

    var text: Text {
        switch self {
        case let .localized(key, tableName, bundle): Text(key, tableName: tableName, bundle: bundle)
        case let .verbatim(string): Text(verbatim: string)
        case let .joined(text): text
        }
    }

    /// The string a count-up compares; a localized key has none, so it never counts up.
    var verbatim: String? {
        if case let .verbatim(string) = self { return string }
        return nil
    }

    /// The string this content reads as in `locale`: a verbatim string as given, and a localized key or joined runs as
    /// SwiftUI resolves them, with the content's own table and bundle — the lookup `DSIconAppearance.resolved` makes for
    /// a glyph's label, through `Text._resolveText(in:)`. A component that places its label in a template of the app's
    /// strings table reads it through this (Button's loading name, ADR-0032).
    func resolved(locale: Locale) -> String {
        if case let .verbatim(string) = self { return string }
        var environment = EnvironmentValues()
        environment.locale = locale
        return text._resolveText(in: environment)
    }
}

/// The role resolved: the scaled line pitch the truncation clamp needs, the tones, and the layout.
private struct DSTextBody: View {
    @ScaledMetric private var size: CGFloat
    @State private var shown: String?
    @State private var textExtent: CGSize = .zero
    @State private var boxExtent: CGSize = .zero

    let content: DSTextContent
    /// The role as asked for, which carries the heading semantics on every platform.
    let requested: DSTextRole
    /// The role that renders here.
    let role: DSTextRole
    let typeRole: DSTypeRole
    /// The figures the route renders, which `auto` takes from the role and an override replaces (ADR-0021 §5).
    let figures: DSNumericSpacing
    let tone: DSTextTone?
    let trailing: String?
    let unit: String?
    let truncation: DSTextTruncation
    let maxLines: Int?
    let surface: DSSurfaceContext
    let brand: DSBrand
    let tokens: DSTokenSet
    let motion: DSMotion

    init(
        content: DSTextContent,
        requested: DSTextRole,
        role: DSTextRole,
        typeRole: DSTypeRole,
        figures: DSNumericSpacing,
        tone: DSTextTone?,
        trailing: String?,
        unit: String?,
        truncation: DSTextTruncation,
        maxLines: Int?,
        surface: DSSurfaceContext,
        brand: DSBrand,
        tokens: DSTokenSet,
        motion: DSMotion
    ) {
        // The size DSCore's text route scales to: the same role size along the same Dynamic Type style.
        _size = ScaledMetric(wrappedValue: typeRole.size, relativeTo: typeRole.textStyle.fontTextStyle)
        self.content = content
        self.requested = requested
        self.role = role
        self.typeRole = typeRole
        self.figures = figures
        self.tone = tone
        self.trailing = trailing
        self.unit = unit
        self.truncation = truncation
        self.maxLines = maxLines
        self.surface = surface
        self.brand = brand
        self.tokens = tokens
        self.motion = motion
    }

    /// The string that counts up: the value and its trailing group, as shown.
    private var current: String? {
        content.verbatim.map { $0 + (trailing ?? "") }
    }

    var body: some View {
        let countsUp = shown.flatMap { old in current.map { DSTextAppearance.countsUp(from: old, to: $0) } } ?? false
        return HStack(alignment: .firstTextBaseline, spacing: tokens.space.step2) {
            truncated(value)
                .transaction(value: current) { transaction in
                    guard current != nil else { return }
                    transaction.animation = countsUp ? countUpAnimation : nil
                }
            if let unit {
                Text(verbatim: unit)
                    .dsText(\.metricUnit)
                    .foregroundStyle(DSTextAppearance.unit(surface: surface).color(brand))
            }
        }
        .modifier(DSTextAccessibility(heading: DSTextAppearance.headingLevel(requested), label: accessibilityLabel))
        .onChange(of: current, initial: true) { _, new in shown = new }
    }

    /// The value, with its trailing group in the same run so the two keep their kerning and wrap together. Tones are
    /// read at the role's token size, the size the contrast pairs are checked at.
    private var value: some View {
        var text = content.text
        if let trailing {
            let color = DSTextAppearance.trailing(role: role, size: typeRole.size, surface: surface).color(brand)
            text = Text("\(text)\(Text(verbatim: trailing).foregroundStyle(color))")
        }
        return text
            .contentTransition(.numericText(countsDown: false))
            .dsText(role.keyPath, figures: figures)
            .modifier(DSTextForeground(color: DSTextAppearance.root(tone, role: role, size: typeRole.size, surface: surface)?.color(brand)))
    }

    /// The count-up: `motion.duration.slow` with `motion.easing.out`; under Reduce Motion the change lands at
    /// `motion.duration.instant` (Text.yaml motion, ADR-0023 §8.4 `instant`).
    private var countUpAnimation: Animation {
        motion.animation(
            motion.tokens.easingOut,
            duration: motion.decorativeDuration(motion.tokens.durationSlow, behavior: .instant)
        )
    }

    /// One line's height: the role's line height times the scaled size, as `lineHeight(.multiple(factor:))` lays it.
    private var pitch: CGFloat { size * CGFloat(typeRole.lineHeight) }

    /// The text overflows its box by more than a hairline.
    private var overflows: Bool {
        textExtent.width > boxExtent.width + tokens.border.hairline
            || textExtent.height > boxExtent.height + tokens.border.hairline
    }

    @ViewBuilder
    private func truncated(_ view: some View) -> some View {
        switch DSTextAppearance.lineLimit(truncation, maxLines: maxLines) {
        case nil:
            view
        case let lines? where truncation == .ellipsis:
            view
                .lineLimit(lines)
                .truncationMode(.tail)
                .modifier(DSTextCopyAffordance(isEnabled: DSTextAppearance.isCopyable(role: role, truncation: truncation)))
        case 1?:
            // One faded line does not wrap. A line that fits renders as it is; a line that does not runs past its box,
            // and its trailing third steps down to 60 % and then 25 % of the tone.
            ViewThatFits(in: .horizontal) {
                view.fixedSize(horizontal: true, vertical: true)
                view
                    .fixedSize(horizontal: true, vertical: true)
                    // A zero minimum lets the box be narrower than the line it cuts.
                    .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
                    .mask {
                        GeometryReader { proxy in
                            HStack(spacing: 0) {
                                ForEach(Array(DSTextAppearance.singleLineFade(overflowing: true).enumerated()), id: \.offset) { _, step in
                                    Rectangle().opacity(step.opacity).frame(width: proxy.size.width * step.fraction)
                                }
                            }
                        }
                        .padding(.vertical, -pitch)
                    }
            }
        case let lines?:
            // The last two visible lines of cut prose at 60 % and 25 % of the tone.
            let limit = CGFloat(lines) * pitch
            let opacities = DSTextAppearance.fadeOpacities(lines: lines, overflowing: overflows)
            view
                .fixedSize(horizontal: false, vertical: true)
                .onGeometryChange(for: CGSize.self, of: \.size) { textExtent = $0 }
                .frame(maxHeight: limit, alignment: .top)
                // The clamp is a ceiling, not room to grow into: without this a stack would hand it spare height.
                .fixedSize(horizontal: false, vertical: true)
                .onGeometryChange(for: CGSize.self, of: \.size) { boxExtent = $0 }
                .mask(alignment: .top) {
                    VStack(spacing: 0) {
                        // Headroom: glyphs the first-baseline correction raises above the first line box stay visible.
                        Rectangle().frame(height: pitch)
                        ForEach(Array(opacities.enumerated()), id: \.offset) { _, opacity in
                            Rectangle().opacity(opacity).frame(height: pitch)
                        }
                    }
                    .offset(y: -pitch)
                }
        }
    }

    /// Metric roles expose value, trailing group and unit as one accessibility element ("86.4 %").
    private var accessibilityLabel: Text? {
        guard trailing != nil || unit != nil else { return nil }
        let joined = content.text
        let tail = Text(verbatim: trailing ?? "")
        guard let unit else { return Text("\(joined)\(tail)") }
        return Text("\(joined)\(tail) \(Text(verbatim: unit))")
    }
}

/// The copy affordance an ellipsis-truncated id keeps (Text.yaml behavior): the value stays selectable, so the
/// platform's own copy action reaches the part the ellipsis cut off.
///
/// **Known gap on watchOS.** `textSelection(_:)` is unavailable there — watchOS offers no selection UI — so a watch id
/// truncates with the ellipsis and has no copy affordance. Text.yaml states no watch exception for this line; if one
/// is wanted, it is an editorial note in `notes.platform.watchos`, not a component behaviour.
private struct DSTextCopyAffordance: ViewModifier {
    let isEnabled: Bool

    // Written out: a private stored property makes the synthesized memberwise initializer private, which Swift 6.3
    // (Xcode 26.6, the CI pin) rejects at the call site.
    init(isEnabled: Bool) {
        self.isEnabled = isEnabled
    }

    @ViewBuilder
    func body(content: Content) -> some View {
        #if os(watchOS)
        content
        #else
        if isEnabled {
            content.textSelection(.enabled)
        } else {
            content
        }
        #endif
    }
}

/// Sets the tone's foreground; `inherit` sets none.
private struct DSTextForeground: ViewModifier {
    let color: Color?

    func body(content: Content) -> some View {
        if let color {
            content.foregroundStyle(color)
        } else {
            content
        }
    }
}

/// The accessibility of Text: a heading for display and title roles, and one element for a metric with its trailing
/// group and unit.
private struct DSTextAccessibility: ViewModifier {
    let heading: AccessibilityHeadingLevel?
    let label: Text?

    func body(content: Content) -> some View {
        if let label {
            content
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(label)
                .modifier(DSTextHeading(level: heading))
        } else {
            content.modifier(DSTextHeading(level: heading))
        }
    }
}

private struct DSTextHeading: ViewModifier {
    let level: AccessibilityHeadingLevel?

    func body(content: Content) -> some View {
        if let level {
            content.accessibilityAddTraits(.isHeader).accessibilityHeading(level)
        } else {
            content
        }
    }
}
