import SwiftUI
import DSCore

/// Whether a control that draws its label draws it (ADR-0041 decision 2): `labelVisibility`, declared in every spec
/// exactly as FormField declares it, and the one type every Prism control that declares it shares. The raw value is
/// the spec's spelling. The web's twin is `LabelVisibility` (`web/packages/react/src/name/name.ts`).
///
/// `hidden` draws no label and keeps `label` as the accessible name, the way SwiftUI's own `labelsHidden()` keeps a
/// hidden label as the name. `visible` is a request: a control whose spec draws no label on some ground still draws
/// none there, and its `label` still names it.
nonisolated public enum DSLabelVisibility: String, CaseIterable, Hashable, Sendable {
    case visible, hidden
}

/// The pair a control is named by (ADR-0041): the words — the control's own `label`, or the words its host draws —
/// and whether the control draws them.
///
/// It is created and read on the main actor, inside view bodies, as `DSBackdropSource` is; `Text`, which a label's
/// content can hold, is not `Sendable`, and an environment key's default value has to be, hence the unchecked
/// conformance.
nonisolated struct DSControlName: @unchecked Sendable {
    let label: DSTextContent
    let labelVisibility: DSLabelVisibility

    init(label: DSTextContent, labelVisibility: DSLabelVisibility) {
        self.label = label
        self.labelVisibility = labelVisibility
    }

    /// Whether the control draws the words.
    var isDrawn: Bool { labelVisibility == .visible }
}

/// ADR-0041's routes to a control's name, as pure functions, so the rules run on the host and the controls only apply
/// what these return. The web's twins are `controlName`, `isNamed` and `checkControlName`.
enum DSControlNaming {
    /// The pair a control is named by (decisions 4 and 5): its own `label`, with its own `labelVisibility`, when it was
    /// given one; otherwise the pair its host publishes, whole — a control that was given no label has no
    /// `labelVisibility` of its own to split the host's pair with — and otherwise nil, a control with no name.
    static func name(label: DSTextContent?, labelVisibility: DSLabelVisibility, hosted: DSControlName?) -> DSControlName? {
        if let label { return DSControlName(label: label, labelVisibility: labelVisibility) }
        return hosted
    }

    /// Whether a pair names anything (decision 7): there is one, and its words, resolved where the control renders, are
    /// not all white space.
    static func isNamed(_ name: DSControlName?, locale: Locale) -> Bool {
        guard let name else { return false }
        return !name.label.resolved(locale: locale).allSatisfy(\.isWhitespace)
    }

    /// What a control reports in development when it has no name (decision 7), as `DSTheme` reports a nested brand: the
    /// message the `assert` carries.
    static func unnamed(_ component: String) -> String {
        "\(component): the control has no name. Pass `label`, with `labelVisibility: .hidden` where it is not drawn, or place it in a host that hands its name over (\(component).yaml `label`, ADR-0041)."
    }
}

private struct DSControlNameKey: EnvironmentKey {
    static let defaultValue: DSControlName? = nil
}

extension EnvironmentValues {
    /// The host's route (ADR-0041 decision 5): the pair a host that draws a control's name publishes to the slot that
    /// holds the control — ListRow to its trailing control, FormField to its `control` — and to nothing else. nil
    /// outside such a host, which is everywhere until ListRow (P4-31) and FormField (P4-34) land. A control given no
    /// `label` of its own takes the pair; one given a `label` keeps its own.
    ///
    /// Internal: ADR-0041 keeps the context inside Prism until P4-34 decides whether an app's own control may read it
    /// (decision 10, proposed). The web's twin is `NameContext`.
    var dsControlName: DSControlName? {
        get { self[DSControlNameKey.self] }
        set { self[DSControlNameKey.self] = newValue }
    }
}

extension View {
    /// A host hands the name it draws to the control in this slot (ADR-0041 decision 5): the words, as the host draws
    /// them, and whether the control draws them too.
    func dsControlName(_ name: DSControlName?) -> some View {
        environment(\.dsControlName, name)
    }
}
