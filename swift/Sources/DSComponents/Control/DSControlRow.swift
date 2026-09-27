import SwiftUI
import DSCore
import DSTokens

/// The control row (roadmap P4-12): the row Toggle, Checkbox and Radio share — its label, its control, the hit region
/// around them, the hover and pressed overlay over them and the focus ring outside them. Internal to this target; the
/// web's twin is `web/packages/react/src/control-row/` (`ControlRow.css`).
///
/// Each component binds the row's cells from its own spec, `tokens.root` and `tokens.label`, which the three specs write
/// alike, and hands them to the row as key paths (`DSControlRowCells`), so one row draws three specs' rows and each
/// spec's binding test reads its own cells.
///
/// **The layout** (Toggle.yaml behavior 9, as Checkbox and Radio write theirs): the row takes the width it is given.
/// The label wraps inside what the control and `root.gap` leave it, and the control, whose own box never grows, sits at
/// the row's trailing edge (Toggle) or leading edge (Checkbox, Radio). The control is centred on the label's first line:
/// the taller of the two sits at the row's top and the other is pushed down by half the difference, so when the label
/// wraps the control stays level with its first line. A line is the label role's size × its line height, the line box
/// Prism's text route draws (ADR-0021 §8), scaled with Dynamic Type as the label is. A row with no drawn label is its
/// control alone, and its outline is the control's.
///
/// **The states**, on the row as a whole: one overlay, `root.hover.overlay` under pointer while hovered and
/// `root.pressed.overlay` while pressed, which replaces the hover rather than stacking on it, filling the row's own box
/// at the row's radius and never the hit region, in the wash of the material the enclosing Surface publishes
/// (`DSControlRowWash`, ADR-0042 §2); the focus ring outside the row, following the same outline (`DSFocusRing`, the
/// one ring every Prism control draws, where ADR-0042 §1 picks the ring for the ground); the hit region, the larger of
/// the row and `size.hit` on each axis (`DSHitRegion`); and `root.disabled.opacity` over the whole row, as one layer.
nonisolated struct DSControlRowCells: Hashable {
    /// `tokens.root.gap`: between the label and the control.
    let gap: KeyPath<DSTokenSet, CGFloat>
    /// `tokens.root.radius`: the row's outline, which the overlay and the focus ring follow.
    let radius: KeyPath<DSTokenSet, CGFloat>
    /// `tokens.root.hover.overlay`, by material.
    let hover: DSControlRowWash
    /// `tokens.root.pressed.overlay`, by material.
    let pressed: DSControlRowWash
    /// `tokens.root.disabled.opacity`.
    let disabledOpacity: KeyPath<DSTokenSet, Double>
    /// `tokens.label.typography`, as the Text role the label renders.
    let labelRole: DSTextRole
}

/// A wash the row lays over itself, keyed by the material the enclosing Surface publishes, as the three specs key it
/// (spec/SCHEMA.md, "The interaction layers"; ADR-0042 §2): the row draws no fill of its own, so on inverse and on
/// accent it takes the material's own wash, where the neutral wash is the inverse fill's own colour and does not show
/// on the dark lit tile, and its `default` everywhere else. A cell applies when the material is published, not because
/// the row asked for it: under the glass fallback the Surface publishes `raised` and the row takes `default`, and a
/// selected glass Surface falls back to inverse, where it takes inverse's.
nonisolated struct DSControlRowWash: Hashable {
    /// The `default` cell.
    let base: KeyPath<DSTokenSet, Color>
    /// The `inverse` cell.
    let inverse: KeyPath<DSTokenSet, Color>
    /// The `accent` cell.
    let accent: KeyPath<DSTokenSet, Color>

    /// The wash on `material`.
    func on(_ material: DSSurfaceMaterial) -> KeyPath<DSTokenSet, Color> {
        switch material {
        case .inverse: inverse
        case .accent: accent
        case .page, .solid, .raised, .nested, .vivid, .glass, .glassLight: base
        }
    }
}

/// Where the control sits in the row: after the label (Toggle) or before it (Checkbox, Radio).
nonisolated enum DSControlRowPlacement: Hashable, Sendable {
    case leading, trailing
}

/// The row's content: the label, drawn, and the control, laid out as the row lays them out.
struct DSControlRowContent<Control: View>: View {
    /// The label the row draws, or nil for a row of the control alone (`labelVisibility: hidden`).
    let label: DSTextContent?
    let cells: DSControlRowCells
    let placement: DSControlRowPlacement
    /// The control's own height, which is centred on the label's first line.
    let controlHeight: CGFloat
    let control: Control

    private var ds = DSThemeValues()

    // Written out: a private stored property makes the synthesized memberwise initializer private.
    init(label: DSTextContent?, cells: DSControlRowCells, placement: DSControlRowPlacement, controlHeight: CGFloat, @ViewBuilder control: () -> Control) {
        self.label = label
        self.cells = cells
        self.placement = placement
        self.controlHeight = controlHeight
        self.control = control()
    }

    var body: some View {
        if let label {
            let tokens = ds.tokens
            let role = tokens.typography[keyPath: cells.labelRole.keyPath]
            DSControlRowLine(
                label: label,
                role: cells.labelRole,
                size: role.size,
                lineHeight: role.lineHeight,
                textStyle: role.textStyle.fontTextStyle,
                gap: tokens[keyPath: cells.gap],
                placement: placement,
                controlHeight: controlHeight,
                control: control
            )
        } else {
            control
        }
    }
}

/// A labelled row: the label and the control in one line box, the control centred on the label's first line.
private struct DSControlRowLine<Control: View>: View {
    let label: DSTextContent
    let role: DSTextRole
    let lineHeight: Double
    let gap: CGFloat
    let placement: DSControlRowPlacement
    let controlHeight: CGFloat
    let control: Control

    /// The label role's size, scaled along its Dynamic Type style exactly as Prism's text route scales the label's own
    /// (ADR-0021 §9 item 1), so the first line measured here is the first line drawn.
    @ScaledMetric private var size: CGFloat

    init(
        label: DSTextContent,
        role: DSTextRole,
        size: CGFloat,
        lineHeight: Double,
        textStyle: Font.TextStyle,
        gap: CGFloat,
        placement: DSControlRowPlacement,
        controlHeight: CGFloat,
        control: Control
    ) {
        self.label = label
        self.role = role
        self.lineHeight = lineHeight
        self.gap = gap
        self.placement = placement
        self.controlHeight = controlHeight
        self.control = control
        _size = ScaledMetric(wrappedValue: size, relativeTo: textStyle)
    }

    var body: some View {
        let line = DSControlRowGeometry.lineHeight(size: size, lineHeight: lineHeight)
        let text = DSText(content: label, role: role, tone: .primary, trailing: nil, unit: nil, numeric: .auto, truncation: .none, maxLines: nil)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, DSControlRowGeometry.labelInset(line: line, control: controlHeight))
            .frame(maxWidth: .infinity, alignment: .leading)
        let placed = control.padding(.top, DSControlRowGeometry.controlInset(line: line, control: controlHeight))
        HStack(alignment: .top, spacing: gap) {
            switch placement {
            case .trailing:
                text
                placed
            case .leading:
                placed
                text
            }
        }
    }
}

/// The row's geometry as pure functions, so the host tests read it (`DSToggleBindingTests`). The web's twin is the
/// pair of `max()` expressions in `ControlRow.css`.
nonisolated enum DSControlRowGeometry {
    /// The label's line box: its size × its line height, CSS's `1lh` (ADR-0021 §8).
    static func lineHeight(size: CGFloat, lineHeight: Double) -> CGFloat {
        size * CGFloat(lineHeight)
    }

    /// How far the label sits below the row's top: half the control's height less a line, when the control is taller.
    static func labelInset(line: CGFloat, control: CGFloat) -> CGFloat {
        max(0, (control - line) / 2)
    }

    /// How far the control sits below the row's top: half a line less the control's height, when a line is taller.
    static func controlInset(line: CGFloat, control: CGFloat) -> CGFloat {
        max(0, (line - control) / 2)
    }
}

/// The row as a control: a button style that draws the row's states around the content its button holds.
struct DSControlRowStyle: ButtonStyle {
    let cells: DSControlRowCells
    /// The row's outline: `root.radius` for a labelled row, the control's own radius for a row of the control alone.
    let radius: KeyPath<DSTokenSet, CGFloat>
    /// While true, a press shows no overlay: a Toggle's drag has taken the press over.
    let isPressSuspended: Bool
    /// Called when a press begins, from a touch, a click or the keyboard.
    let onPressBegan: () -> Void

    init(cells: DSControlRowCells, radius: KeyPath<DSTokenSet, CGFloat>, isPressSuspended: Bool, onPressBegan: @escaping () -> Void) {
        self.cells = cells
        self.radius = radius
        self.isPressSuspended = isPressSuspended
        self.onPressBegan = onPressBegan
    }

    func makeBody(configuration: Configuration) -> some View {
        DSControlRowBody(
            content: configuration.label,
            isPressed: configuration.isPressed,
            cells: cells,
            radius: radius,
            isPressSuspended: isPressSuspended,
            onPressBegan: onPressBegan
        )
    }
}

/// Internal, not private, so a render test can draw a pressed row: `isPressed` comes from a
/// `ButtonStyle.Configuration`, which nothing outside SwiftUI can make (the `DSButtonPill` precedent).
///
/// Back to front: the overlay, the content; the focus ring outside the row.
struct DSControlRowBody<Content: View>: View {
    let content: Content
    let isPressed: Bool
    let cells: DSControlRowCells
    let radius: KeyPath<DSTokenSet, CGFloat>
    let isPressSuspended: Bool
    let onPressBegan: () -> Void

    private var ds = DSThemeValues()
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var isHovered = false

    init(
        content: Content,
        isPressed: Bool,
        cells: DSControlRowCells,
        radius: KeyPath<DSTokenSet, CGFloat>,
        isPressSuspended: Bool,
        onPressBegan: @escaping () -> Void
    ) {
        self.content = content
        self.isPressed = isPressed
        self.cells = cells
        self.radius = radius
        self.isPressSuspended = isPressSuspended
        self.onPressBegan = onPressBegan
    }

    var body: some View {
        let tokens = ds.tokens
        let motion = ds.motion
        let pressed = isPressed && isEnabled && !isPressSuspended
        let hovered = DSControlAppearance.showsHover(isHovered: isHovered, interaction: tokens.interaction, isInteractive: isEnabled)
        let overlay = DSControlRowStates.overlay(isPressed: pressed, isHovered: hovered, cells: cells, on: ds.surface.material)
        let outline = tokens[keyPath: radius]
        let shape = RoundedRectangle(cornerRadius: outline, style: .continuous)
        return content
            .background {
                // Hover takes its stack's Button timing (spec/SCHEMA.md, "Motion and haptics"), and a press Button's
                // press timing: the snappy spring, or under Reduce Motion `motion.duration.base` with `motion.easing.out`.
                shape
                    .fill(overlay.map { tokens[keyPath: $0] } ?? .clear)
                    .animation(DSControlAppearance.hoverAnimation(motion), value: hovered)
                    .animation(DSControlAppearance.pressAnimation(motion.tokens.springSnappy, motion: motion), value: pressed)
            }
            // `root.disabled.opacity` over the whole row, as one layer. Without the group SwiftUI hands the opacity to
            // every layer, so a knob dimmed over a track dimmed shows the track through it; the web's `opacity`, like
            // the spec, dims the row as one picture (CI round 25, `on-disabled`; `dsDisabledOpacity`, which Button,
            // IconButton, Chip and Card's disc dim through too). The ring is drawn only while enabled, so it sits
            // outside the group.
            .dsDisabledOpacity(tokens[keyPath: cells.disabledOpacity], isEnabled: isEnabled)
            .overlay {
                if isFocused && isEnabled {
                    DSFocusRing(cornerRadius: outline)
                }
            }
            .modifier(DSHitRegion())
            .modifier(DSHoverTracking(isHovered: $isHovered))
            .onChange(of: isPressed) { _, pressed in
                if pressed { onPressBegan() }
            }
    }
}

/// The row's one overlay, as a pure function, so the host tests read it.
nonisolated enum DSControlRowStates {
    /// The overlay the row lays over itself on `material`: the pressed wash while pressed, which replaces the hover
    /// rather than stacking on it, the hover wash while hovered under pointer, and nothing at rest.
    static func overlay(
        isPressed: Bool,
        isHovered: Bool,
        cells: DSControlRowCells,
        on material: DSSurfaceMaterial
    ) -> KeyPath<DSTokenSet, Color>? {
        if isPressed { return cells.pressed.on(material) }
        return isHovered ? cells.hover.on(material) : nil
    }
}
