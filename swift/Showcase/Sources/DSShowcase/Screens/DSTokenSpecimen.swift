#if os(iOS) || os(macOS)
import SwiftUI
import DSCore
import DSComponents
import DSTokens

/// One token, shown as itself: a specimen drawn from the value the running scene resolves, the path, the value as
/// text, the Swift member it comes from and the CSS variable the web reads, and whatever the manifest says about it.
struct DSTokenRow: View {
    let entry: DSTokenCatalogEntry
    private var ds = DSThemeValues()
    /// What the OS will resolve this scene's asset colours with — **not** `ds.context`. The app can set the scheme
    /// (`\.colorScheme` is an environment value SwiftUI honours all the way into the asset catalogue) and cannot
    /// set the contrast: `\.colorSchemeContrast` is read-only, and `dsAccessibilityPolicy(increasedContrast:)`
    /// moves Prism's own `DSTokenContext.contrast` without moving the OS's. Printing the value from `ds.context`
    /// was therefore printing the entry the *policy* names while the swatch beside it painted the entry the OS
    /// picked, which for the colorsets that carry a distinct high-contrast entry is two readings of one token.
    @Environment(\.colorScheme) private var osColorScheme
    @Environment(\.colorSchemeContrast) private var osContrast

    init(_ entry: DSTokenCatalogEntry) { self.entry = entry }

    private var resolved: DSResolvedAppearance {
        DSResolvedAppearance(colorScheme: osColorScheme, contrast: osContrast)
    }

    var body: some View {
        let tokens = ds.tokens
        VStack(alignment: .leading, spacing: tokens.space.step2) {
            HStack(alignment: .top, spacing: tokens.space.step3) {
                DSTokenSpecimen(entry: entry)
                VStack(alignment: .leading, spacing: tokens.space.step1) {
                    DSText(verbatim: entry.path, role: .labelMd, tone: .primary)
                    DSText(verbatim: DSTokenValueText.text(entry.value, tokens: tokens, brand: ds.brand, resolved: resolved), role: .data, tone: .secondary)
                }
                Spacer(minLength: 0)
            }
            if let note = contrastNote {
                DSText(verbatim: note, role: .micro, tone: .tertiary)
            }
            if let deprecated = entry.deprecated {
                DSText(verbatim: "deprecated — \(deprecated)", role: .micro, tone: .critical)
            }
            if let summary = entry.summary {
                DSText(verbatim: summary, role: .caption, tone: .secondary)
            }
            HStack(spacing: tokens.space.step3) {
                if let member = entry.swiftMember {
                    DSText(verbatim: member, role: .micro, tone: .tertiary)
                } else {
                    DSText(verbatim: "no public Swift API — primitive tier", role: .micro, tone: .tertiary)
                }
                if let css = entry.cssVariable {
                    DSText(verbatim: css, role: .micro, tone: .tertiary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// A colorset that holds a different colour for Increase Contrast says so, with the value, and says who can
    /// show it — because the axis sheet's own switch cannot (`DSAxisProbe`). Printed only while the OS is *not*
    /// already resolving the high-contrast entry, where the swatch above is already that colour.
    private var contrastNote: String? {
        guard case .color(_, let token?, _) = entry.value, osContrast == .standard else { return nil }
        let standard = DSTokenValueText.appearance(token, brand: ds.brand, resolved: resolved)
        let increased = DSTokenValueText.appearance(token, brand: ds.brand, resolved: resolved.increased)
        guard standard != increased else { return nil }
        return "Increase Contrast: \(DSTokenValueText.hex(increased)) — the OS resolves this colorset, so the axis sheet's switch cannot repaint it"
    }
}

/// The two things the OS resolves an asset colour with, read straight off the environment the swatch is painted
/// in, so the swatch and the printed value are one reading (ARCHITECTURE §9.8).
struct DSResolvedAppearance: Hashable {
    let colorScheme: ColorScheme
    let contrast: ColorSchemeContrast

    /// The same scene under Increase Contrast, for the row that says what the OS switch would show.
    var increased: DSResolvedAppearance {
        DSResolvedAppearance(colorScheme: colorScheme, contrast: .increased)
    }
}

/// The specimen a token's DTCG type asks for. A new token group gets a section for free; only a new *type* needs
/// a case here.
struct DSTokenSpecimen: View {
    let entry: DSTokenCatalogEntry
    private var ds = DSThemeValues()

    init(entry: DSTokenCatalogEntry) { self.entry = entry }

    var body: some View {
        let tokens = ds.tokens
        switch entry.value {
        case .color(let keyPath, _, _):
            RoundedRectangle(cornerRadius: tokens.radius.inner, style: .continuous)
                .fill(tokens[keyPath: keyPath])
                .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight)
                .overlay(
                    RoundedRectangle(cornerRadius: tokens.radius.inner, style: .continuous)
                        .strokeBorder(tokens.color.borderHairline, lineWidth: tokens.border.hairline)
                )
                .background(
                    // A checker under the swatch, so a translucent token reads as translucent and a token that
                    // resolves to nothing reads as empty rather than as white.
                    DSAlphaChecker(cornerRadius: tokens.radius.inner)
                )
        case .dimension(let keyPath):
            DSMeasuredRule(width: tokens[keyPath: keyPath])
        case .number(let keyPath):
            DSRatioBar(value: tokens[keyPath: keyPath])
        case .flag(let keyPath):
            DSText(verbatim: tokens[keyPath: keyPath] ? "on" : "off", role: .labelSm, tone: tokens[keyPath: keyPath] ? .accent : .tertiary)
                .frame(width: DSSpecimenSize.swatch, alignment: .leading)
        case .duration(let keyPath):
            DSMotionSpecimen(animation: tokens.motion.easingOut.animation(duration: tokens[keyPath: keyPath]))
        case .easing(let keyPath):
            DSMotionSpecimen(animation: tokens[keyPath: keyPath].animation(duration: tokens.motion.durationSlow), curve: tokens[keyPath: keyPath])
        case .spring(let keyPath):
            DSMotionSpecimen(animation: tokens[keyPath: keyPath].animation)
        case .typography(let keyPath):
            DSTypeSpecimen(role: keyPath)
        case .shadow(let keyPath):
            DSShadowSpecimen(token: tokens[keyPath: keyPath])
        case .gradient(let keyPath):
            DSGradientSpecimen(token: tokens[keyPath: keyPath])
        case .stroke(let keyPath):
            DSStrokeSpecimen(style: tokens[keyPath: keyPath])
        case .fontFace(let slot):
            DSFontSpecimen(slot: slot)
        case .unavailable:
            DSText(verbatim: "—", role: .labelSm, tone: .tertiary)
                .frame(width: DSSpecimenSize.swatch, alignment: .leading)
        }
    }
}

enum DSSpecimenSize {
    /// The specimen column, the same width as a fact row's key, so every row lines up.
    static let swatch: CGFloat = 120
    static let swatchHeight: CGFloat = 40
    /// The longest rule the column can draw; a dimension past it is marked as cut, never silently squared off.
    static let ruleMax: CGFloat = 120
}

/// A checkerboard: what a translucent fill sits on, so alpha is visible and an unresolved color reads as empty.
struct DSAlphaChecker: View {
    let cornerRadius: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(.white)
            .overlay(
                Canvas { context, size in
                    let step: CGFloat = 6
                    var y: CGFloat = 0
                    var row = 0
                    while y < size.height {
                        var x: CGFloat = row.isMultiple(of: 2) ? 0 : step
                        while x < size.width {
                            context.fill(Path(CGRect(x: x, y: y, width: step, height: step)), with: .color(.gray.opacity(0.35)))
                            x += 2 * step
                        }
                        y += step
                        row += 1
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

/// A dimension, measured: a rule as long as the token is wide (capped), with the value beside it.
struct DSMeasuredRule: View {
    let width: CGFloat
    private var ds = DSThemeValues()

    init(width: CGFloat) { self.width = width }

    var body: some View {
        let tokens = ds.tokens
        let isCut = width > DSSpecimenSize.ruleMax
        ZStack(alignment: .leading) {
            Rectangle()
                .fill(tokens.color.borderHairline)
                .frame(width: DSSpecimenSize.swatch, height: tokens.border.hairline)
            HStack(spacing: tokens.space.step1) {
                Rectangle()
                    .fill(tokens.color.accent)
                    .frame(
                        width: max(tokens.border.hairline, min(width, DSSpecimenSize.ruleMax)),
                        height: DSSpecimenSize.swatchHeight / 4
                    )
                if isCut {
                    DSText(verbatim: "›", role: .micro, tone: .tertiary)
                }
            }
        }
        .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight, alignment: .leading)
    }
}

/// A plain number: a bar for a 0–1 ratio, the number alone otherwise.
struct DSRatioBar: View {
    let value: Double
    private var ds = DSThemeValues()

    init(value: Double) { self.value = value }

    var body: some View {
        let tokens = ds.tokens
        Group {
            if value >= 0, value <= 1 {
                ZStack(alignment: .leading) {
                    Capsule().fill(tokens.color.bgFillNeutralSubtle)
                    Capsule().fill(tokens.color.accent).frame(width: DSSpecimenSize.swatch * value)
                }
                .frame(width: DSSpecimenSize.swatch, height: tokens.space.step2)
            } else {
                DSText(verbatim: DSTokenValueText.number(value), role: .labelSm, tone: .secondary)
            }
        }
        .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight, alignment: .leading)
    }
}

/// Motion the owner can trigger and watch: a dot that travels its token's animation on every tap, and the curve
/// drawn beside it where the token is a curve.
struct DSMotionSpecimen: View {
    let animation: Animation
    var curve: DSCubicBezier?
    @State private var moved = false
    private var ds = DSThemeValues()

    init(animation: Animation, curve: DSCubicBezier? = nil) {
        self.animation = animation
        self.curve = curve
    }

    var body: some View {
        let tokens = ds.tokens
        Button {
            withAnimation(animation) { moved.toggle() }
        } label: {
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(tokens.color.bgFillNeutralSubtle)
                    .frame(width: DSSpecimenSize.swatch, height: tokens.space.step2)
                if let curve {
                    DSCurvePath(curve: curve)
                        .stroke(tokens.color.chartGrid, lineWidth: tokens.chart.lineWidth)
                        .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight)
                }
                Circle()
                    .fill(tokens.color.accent)
                    .frame(width: tokens.space.step3, height: tokens.space.step3)
                    .offset(x: moved ? DSSpecimenSize.swatch - tokens.space.step3 : 0)
            }
            .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play this motion token")
    }
}

/// The easing curve itself, drawn in its own unit square.
nonisolated struct DSCurvePath: Shape {
    let curve: DSCubicBezier

    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY),
            control1: CGPoint(x: rect.minX + rect.width * curve.x1, y: rect.maxY - rect.height * curve.y1),
            control2: CGPoint(x: rect.minX + rect.width * curve.x2, y: rect.maxY - rect.height * curve.y2)
        )
        return path
    }
}

/// A type role at its real size, in the brand's own face.
struct DSTypeSpecimen: View {
    let role: KeyPath<DSTokenSet.Typography, DSTypeRole>
    private var ds = DSThemeValues()

    init(role: KeyPath<DSTokenSet.Typography, DSTypeRole>) { self.role = role }

    var body: some View {
        Text(verbatim: "Ag 86.4")
            .dsText(role)
            .foregroundStyle(ds.tokens.color.textPrimary)
            .frame(width: DSSpecimenSize.swatch * 2, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// A shadow on a real surface, drawn by Surface itself: the elevation level the token is.
struct DSShadowSpecimen: View {
    let token: DSShadowToken
    private var ds = DSThemeValues()

    init(token: DSShadowToken) { self.token = token }

    var body: some View {
        let tokens = ds.tokens
        let level = DSSurfaceElevation.allCases.first { $0.shadow(tokens.elevation) == token }
        DSSurfaceView(material: .solid, radius: .tile, elevation: level ?? .flat, padding: .none) {
            Color.clear.frame(width: DSSpecimenSize.swatch - tokens.space.step4, height: DSSpecimenSize.swatchHeight - tokens.space.step4)
        }
        .padding(tokens.space.step2)
    }
}

/// A vivid gradient, drawn on the CSS gradient line by DSCore.
struct DSGradientSpecimen: View {
    let token: DSGradientToken
    private var ds = DSThemeValues()

    init(token: DSGradientToken) { self.token = token }

    var body: some View {
        RoundedRectangle(cornerRadius: ds.tokens.radius.inner, style: .continuous)
            .fill(DSGradient.fill(token, size: CGSize(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight)))
            .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight)
    }
}

/// A stroke style, drawn with its own dash pattern.
struct DSStrokeSpecimen: View {
    let style: DSStrokeStyle
    private var ds = DSThemeValues()

    init(style: DSStrokeStyle) { self.style = style }

    var body: some View {
        let tokens = ds.tokens
        Path { path in
            path.move(to: CGPoint(x: 0, y: DSSpecimenSize.swatchHeight / 2))
            path.addLine(to: CGPoint(x: DSSpecimenSize.swatch, y: DSSpecimenSize.swatchHeight / 2))
        }
        .stroke(
            tokens.color.chartGrid,
            style: StrokeStyle(lineWidth: tokens.chart.lineWidth, lineCap: style.lineCap == .round ? .round : .butt, dash: style.dash)
        )
        .frame(width: DSSpecimenSize.swatch, height: DSSpecimenSize.swatchHeight)
    }
}

/// A font slot, in the face the brand binds to it.
struct DSFontSpecimen: View {
    let slot: DSFontSlot
    private var ds = DSThemeValues()

    init(slot: DSFontSlot) { self.slot = slot }

    var body: some View {
        let role: KeyPath<DSTokenSet.Typography, DSTypeRole> = switch slot {
        case .display: \.displayMd
        case .mono: \.data
        case .ui: \.bodyMd
        }
        Text(verbatim: "Ag 0123")
            .dsText(role)
            .foregroundStyle(ds.tokens.color.textPrimary)
            .frame(width: DSSpecimenSize.swatch * 2, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// A token's value, as text. Colors print the literal the colorset holds for the scheme and contrast **the OS
/// resolved**, which is the entry the swatch beside it is painted from, so a swatch that renders clear is visible
/// as a mismatch rather than as a blank — and the two can never disagree.
enum DSTokenValueText {
    static func text(_ value: DSTokenValue, tokens: DSTokenSet, brand: DSBrand, resolved: DSResolvedAppearance) -> String {
        switch value {
        case .dimension(let keyPath): "\(number(Double(tokens[keyPath: keyPath]))) pt"
        case .number(let keyPath): number(tokens[keyPath: keyPath])
        case .duration(let keyPath): "\(number(tokens[keyPath: keyPath] * 1000)) ms"
        case .flag(let keyPath): tokens[keyPath: keyPath] ? "true" : "false"
        case .color(_, let token, let alias): color(token, alias: alias, brand: brand, resolved: resolved)
        case .typography(let keyPath): typography(tokens.typography[keyPath: keyPath])
        case .shadow(let keyPath): shadow(tokens[keyPath: keyPath])
        case .gradient(let keyPath): gradient(tokens[keyPath: keyPath])
        case .spring(let keyPath): spring(tokens[keyPath: keyPath])
        case .easing(let keyPath): easing(tokens[keyPath: keyPath])
        case .stroke(let keyPath): stroke(tokens[keyPath: keyPath])
        case .fontFace(let slot): face(slot, brand: brand)
        case .unavailable: "primitive tier — no public API on Apple"
        }
    }

    static func number(_ value: Double) -> String {
        if value == value.rounded() { return String(Int(value)) }
        return String(format: "%g", value)
    }

    /// A colour row's value: the colorset's own literal, and for a `comp` token — which has no colorset of its
    /// own, because it is a whole-value alias of a system token — the aliased colorset's literal and the name of
    /// the token it aliases. `tools/showcase/apple` resolves the alias at generation time from the reference the
    /// token source writes (`"$value": "{sys.color.border.strong}"`), so the row names a token the reader can go
    /// and look at instead of the words "aliased colorset".
    static func color(_ token: DSColorToken?, alias: String?, brand: DSBrand, resolved: DSResolvedAppearance) -> String {
        guard let token else { return alias.map { "aliases \($0)" } ?? "no colorset" }
        let value = hex(appearance(token, brand: brand, resolved: resolved))
        return alias.map { "\(value) · aliases \($0)" } ?? value
    }

    /// The catalog entry the OS resolves for this scheme and contrast (ARCHITECTURE §9.8).
    static func appearance(_ token: DSColorToken, brand: DSBrand, resolved: DSResolvedAppearance) -> DSRGBA {
        let appearances = token.appearances(brand)
        switch (resolved.colorScheme, resolved.contrast) {
        case (.light, .standard): return appearances.any
        case (.light, .increased): return appearances.highContrast
        case (.dark, .standard): return appearances.dark
        case (.dark, .increased): return appearances.darkHighContrast
        default: return appearances.any
        }
    }

    static func hex(_ rgba: DSRGBA) -> String {
        let channel = { (v: Double) in Int((min(max(v, 0), 1) * 255).rounded()) }
        let base = String(format: "#%02X%02X%02X", channel(rgba.red), channel(rgba.green), channel(rgba.blue))
        let space = rgba.space == .displayP3 ? "P3" : "sRGB"
        return rgba.alpha < 1 ? "\(base) \(number(rgba.alpha * 100))% \(space)" : "\(base) \(space)"
    }

    static func typography(_ role: DSTypeRole) -> String {
        "\(number(Double(role.size)))/\(role.weight) · lh \(number(role.lineHeight)) · \(role.slot.rawValue) · \(role.numeric.rawValue) · \(role.textStyle.rawValue)"
    }

    static func shadow(_ token: DSShadowToken) -> String {
        guard !token.layers.isEmpty else { return "no layers" }
        return token.layers
            .map { "\(number(Double($0.x))) \(number(Double($0.y))) \(number(Double($0.blur))) \(hex($0.color))" }
            .joined(separator: " · ")
    }

    static func gradient(_ token: DSGradientToken) -> String {
        "\(token.stops.count) stops · \(number(token.angle))° · grain \(number(token.grain)) · bloom \(number(token.bloomAlpha))"
    }

    static func spring(_ token: DSSpringToken) -> String {
        "duration \(number(token.duration))s · bounce \(number(token.bounce)) · settle \(number(token.settle))s"
    }

    static func easing(_ curve: DSCubicBezier) -> String {
        "cubic-bezier(\(number(curve.x1)), \(number(curve.y1)), \(number(curve.x2)), \(number(curve.y2)))"
    }

    static func stroke(_ style: DSStrokeStyle) -> String {
        if let keyword = style.keyword { return keyword.rawValue }
        let dash = style.dash.map { number(Double($0)) }.joined(separator: " ")
        return style.lineCap == nil ? "dash \(dash)" : "dash \(dash) · \(style.lineCap?.rawValue ?? "")"
    }

    static func face(_ slot: DSFontSlot, brand: DSBrand) -> String {
        guard let face = brand.faces[slot] else { return "no face" }
        let families = face.families.joined(separator: ", ")
        return face.system == nil ? "\(families) (bundled)" : "\(families) (system \(face.system?.rawValue ?? ""))"
    }
}
#endif
