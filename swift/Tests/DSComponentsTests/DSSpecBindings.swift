import Foundation
import SwiftUI
import Testing
import DSCore
import DSTokens
@testable import DSComponents

/// A key of a binding matrix, as the spec spells it. Every axis of the grammar is an enum whose raw value is the
/// spec's own spelling — `DSSurfaceMaterial.glassLight` is `glassLight`, `DSButtonVariant.ghost` is `ghost` — so an
/// assertion names the axis value it means and never a string beside it.
protocol DSSpecKey: Sendable {
    nonisolated var specKey: String { get }
}

extension DSSpecKey where Self: RawRepresentable, Self.RawValue == String {
    nonisolated var specKey: String { rawValue }
}

extension String: DSSpecKey {
    nonisolated var specKey: String { self }
}

extension DSSurfaceMaterial: DSSpecKey {}
extension DSBackdropKind: DSSpecKey {}
extension DSButtonVariant: DSSpecKey {}
extension DSButtonSize: DSSpecKey {}
extension DSTextRole: DSSpecKey {}
extension DSDividerOrientation: DSSpecKey {}
extension DSDividerInset: DSSpecKey {}

/// Something the spec says that the reader cannot turn into a binding: a part or property that is not there, a cell
/// that names a token the Apple catalogue does not bind, a block of the wrong shape.
nonisolated struct DSSpecMismatch: Error, CustomStringConvertible {
    let description: String
}

/// `spec/components/<Name>.yaml`, read the way the web tests read it (`web/packages/react/test/spec.ts`):
/// `loadSpec`, `cell(binding, …keys)` and a token path resolved to what the implementation must return.
///
/// **The sentence this exists for.** A binding test asks one question per cell — does the appearance function
/// return the token the spec's matrix names? — and the matrix is written down once, in the spec:
///
/// ```swift
/// try spec.binds(DSButtonAppearance.background(variant, on: material), at: "root.background", variant, material)
/// ```
///
/// The web says the same sentence about its stylesheet, so the two stacks are now checked against one document
/// instead of against two hand-written copies of it. What made that possible was already in the repository and
/// unconnected: `tools/showcase/apple/catalog.ts` resolves every token path to its `KeyPath<DSTokenSet, …>` for the
/// showcase app, and this target already read YAML. The generated half is `Generated/DSTokenKeyPaths.swift`.
///
/// **Reading a cell** follows the binding-matrix grammar of `spec/SCHEMA.md`: one axis per level, outermost first,
/// `default` as the fallback at each level, and a value with no cell and no `default` is not set — which is how the
/// ghost pill has no fill at rest and why `binds` compares against `nil` there rather than skipping the case.
///
/// **What it refuses to do quietly.** A part or property that is not in the spec throws, so a typo cannot make a
/// test pass by comparing nothing with nothing; a cell whose token the Apple catalogue does not bind throws and says
/// so; a key path the implementation returns that is no token at all is named in the failure.
nonisolated struct DSSpec {
    /// The checkout this test file sits in.
    static let repository = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // DSComponentsTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // swift
        .deletingLastPathComponent()

    /// The spec's `name`, which is the file's name.
    let name: String
    /// The repository-relative path, which is how a failure names the document.
    let file: String
    /// The file as written, for the few checks that are about the prose rather than a binding.
    let text: String
    let document: DSSpecValue

    static func component(_ name: String) throws -> DSSpec {
        try DSSpec(name, directory: "spec/components")
    }

    static func pattern(_ name: String) throws -> DSSpec {
        try DSSpec(name, directory: "spec/patterns")
    }

    /// A spec read from text rather than from the checkout: the seam the reader's own tests use, so what they
    /// check is the reader and not one of the files it happens to read today.
    static func parsing(_ name: String, _ text: String) throws -> DSSpec {
        try DSSpec(name: name, file: "\(name).yaml", text: text)
    }

    private init(_ name: String, directory: String) throws {
        let file = "\(directory)/\(name).yaml"
        try self.init(
            name: name,
            file: file,
            text: try String(contentsOf: Self.repository.appendingPathComponent(file), encoding: .utf8)
        )
    }

    private init(name: String, file: String, text: String) throws {
        self.name = name
        self.file = file
        self.text = text
        do {
            document = try DSSpecYAML.parse(text)
        } catch let syntax as DSSpecSyntax {
            throw DSSpecMismatch(description: "\(file): \(syntax)")
        }
    }

    // MARK: - The document

    var specVersion: Int {
        get throws {
            guard let raw = document["specVersion"]?.stringValue, let version = Int(raw) else {
                throw DSSpecMismatch(description: "\(file): has no `specVersion`")
            }
            return version
        }
    }

    /// The `platforms` block: platform key → support level.
    var platforms: [String: String] {
        get throws {
            guard let mapping = document["platforms"]?.mapValue else {
                throw DSSpecMismatch(description: "\(file): has no `platforms` block")
            }
            return mapping.pairs.reduce(into: [:]) { out, pair in out[pair.key] = pair.value.stringValue }
        }
    }

    /// The values of an enum prop, in the order the spec writes them.
    func propValues(_ prop: String) throws -> [String] {
        guard let entry = try props().first(where: { $0["name"]?.stringValue == prop }) else {
            throw DSSpecMismatch(description: "\(file): has no prop named \(prop)")
        }
        guard let values = entry["values"]?.listValue else {
            throw DSSpecMismatch(description: "\(file): the prop \(prop) declares no `values`")
        }
        return values.compactMap(\.stringValue)
    }

    /// The names of the `props` entries of type `action`, in order: the handlers `spec/SCHEMA.md` gives every
    /// example.
    var actionProps: [String] {
        get throws {
            try props().filter { $0["type"]?.stringValue == "action" }.compactMap { $0["name"]?.stringValue }
        }
    }

    private func props() throws -> [DSSpecValue] {
        guard let list = document["props"]?.listValue else {
            throw DSSpecMismatch(description: "\(file): has no `props` block")
        }
        return list
    }

    private func examples() throws -> [DSSpecValue] {
        guard let list = document["examples"]?.listValue else {
            throw DSSpecMismatch(description: "\(file): has no `examples` block")
        }
        return list
    }

    /// The `examples` block's ids, in order.
    var exampleIDs: [String] {
        get throws { try examples().compactMap { $0["id"]?.stringValue } }
    }

    /// The `schemes` an example declares, by id; an example that declares none renders in both.
    var exampleSchemes: [String: [String]] {
        get throws {
            try examples().reduce(into: [:]) { out, example in
                guard let id = example["id"]?.stringValue else { return }
                out[id] = example["schemes"]?.listValue?.compactMap(\.stringValue) ?? ["light", "dark"]
            }
        }
    }

    /// The `action` an example's `props` declare, by id; an example that declares none takes the prop's default.
    var exampleActions: [String: String] {
        get throws {
            try examples().reduce(into: [:]) { out, example in
                guard let id = example["id"]?.stringValue else { return }
                if let action = example["props"]?["action"]?.stringValue { out[id] = action }
            }
        }
    }

    // MARK: - Bindings

    /// The block a path is read from: `motion.press` is the `motion` block, everything else is a part of `tokens`.
    private func documentPath(_ path: String) -> String {
        path == "motion" || path.hasPrefix("motion.") ? path : "tokens.\(path)"
    }

    /// The binding at `tokens.<part>.<property>`, a state block's property included (`root.pressed.background`).
    /// A path the spec does not carry is an error, not an empty cell: the test would otherwise compare nothing
    /// with nothing and pass.
    func binding(_ path: String) throws -> DSSpecValue {
        guard let value = document.at(documentPath(path)) else {
            throw DSSpecMismatch(description: "\(file): has no \(documentPath(path))")
        }
        return value
    }

    /// The cell a key sequence reaches, falling back to `default` at each level; nil when the property is not set
    /// for those keys (`spec/SCHEMA.md`, "The binding-matrix grammar").
    func cell(_ path: String, _ keys: any DSSpecKey...) throws -> String? {
        try cell(path, keys: keys)
    }

    /// The walk itself. A key that reaches a scalar early answers with it, as the web's `cell` does: a property
    /// bound one level shallower than the keys — `secondary: comp.button.secondary.bg.rest` under a matrix whose
    /// other variants carry a material level — is that variant's answer on every material.
    func cell(_ path: String, keys: [any DSSpecKey]) throws -> String? {
        var current: DSSpecValue? = try binding(path)
        for key in keys {
            switch current {
            case .scalar, .none: return current?.stringValue
            case .map(let mapping): current = mapping[key.specKey] ?? mapping["default"]
            case .list, .null: return nil
            }
        }
        // Keys that stop on a matrix are keys one axis short, which would otherwise read as "not set" and pass
        // against an implementation that also returns nothing.
        if case .map(let mapping) = current {
            throw DSSpecMismatch(
                description: "\(cellName(path, keys)) is a matrix keyed by \(mapping.keys), not a cell: the keys are an axis short"
            )
        }
        return current?.stringValue
    }

    /// The keys a matrix is written with, in document order: what a test loops over, so a loop over the wrong axis
    /// is a visible disagreement rather than a silent fallback to `default`.
    func keys(at path: String) throws -> [String] {
        guard let mapping = try binding(path).mapValue else {
            throw DSSpecMismatch(description: "\(file): \(documentPath(path)) is one token path, not a matrix")
        }
        return mapping.keys
    }

    /// Every cell of `tokens`, as the dotted key sequence that reaches it and the token path it names.
    func allBindings() throws -> [(path: String, token: String)] {
        var out: [(path: String, token: String)] = []
        func walk(_ value: DSSpecValue, _ path: String) {
            switch value {
            case .scalar(let token): out.append((path, token))
            case .map(let mapping): for pair in mapping.pairs { walk(pair.value, path.isEmpty ? pair.key : "\(path).\(pair.key)") }
            case .list, .null: break
            }
        }
        guard let tokens = document["tokens"] else {
            throw DSSpecMismatch(description: "\(file): has no `tokens` block")
        }
        walk(tokens, "")
        return out
    }

    // MARK: - Cells as key paths

    private func resolve<Root, Value>(
        _ path: String,
        _ keys: [any DSSpecKey],
        _ table: [String: KeyPath<Root, Value>],
        _ kind: String
    ) throws -> KeyPath<Root, Value>? {
        guard let token = try cell(path, keys: keys) else { return nil }
        guard let keyPath = table[token] else {
            let bound = DSTokenKeyPaths.kind(of: token)
            let what = bound.map { "the Apple token catalogue binds it as \($0), not \(kind)" }
                ?? "the Apple token catalogue binds no such token — is it a `ref` primitive, or is the table stale? (`pnpm showcase:apple:generate`)"
            throw DSSpecMismatch(description: "\(cellName(path, keys)) binds \(token), and \(what)")
        }
        return keyPath
    }

    func color(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, Color>? {
        try resolve(path, keys, DSTokenKeyPaths.color, "a colour")
    }

    func dimension(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, CGFloat>? {
        try resolve(path, keys, DSTokenKeyPaths.dimension, "a dimension")
    }

    func number(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, Double>? {
        try resolve(path, keys, DSTokenKeyPaths.number, "a number")
    }

    func typography(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet.Typography, DSTypeRole>? {
        try resolve(path, keys, DSTokenKeyPaths.typography, "a type role")
    }

    func shadow(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, DSShadowToken>? {
        try resolve(path, keys, DSTokenKeyPaths.shadow, "a shadow")
    }

    func gradient(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, DSGradientToken>? {
        try resolve(path, keys, DSTokenKeyPaths.gradient, "a gradient")
    }

    func spring(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, DSSpringToken>? {
        try resolve(path, keys, DSTokenKeyPaths.spring, "a spring")
    }

    func easing(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, DSCubicBezier>? {
        try resolve(path, keys, DSTokenKeyPaths.easing, "an easing curve")
    }

    func stroke(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, DSStrokeStyle>? {
        try resolve(path, keys, DSTokenKeyPaths.stroke, "a stroke style")
    }

    func flag(_ path: String, _ keys: any DSSpecKey...) throws -> KeyPath<DSTokenSet, Bool>? {
        try resolve(path, keys, DSTokenKeyPaths.flag, "a flag")
    }

    // MARK: - The assertion

    /// The appearance function's answer for a set of keys is the token the spec's cell names.
    func binds(
        _ implementation: KeyPath<DSTokenSet, Color>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.color, "a colour", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, CGFloat>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.dimension, "a dimension", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, Double>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.number, "a number", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet.Typography, DSTypeRole>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.typography, "a type role", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, DSShadowToken>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.shadow, "a shadow", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, DSGradientToken>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.gradient, "a gradient", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, DSSpringToken>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.spring, "a spring", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, DSCubicBezier>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.easing, "an easing curve", sourceLocation)
    }

    func binds(
        _ implementation: KeyPath<DSTokenSet, DSStrokeStyle>?,
        at path: String,
        _ keys: any DSSpecKey...,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        try check(implementation, path, keys, DSTokenKeyPaths.stroke, "a stroke style", sourceLocation)
    }

    /// The same sentence for an appearance function that answers with a value rather than a key path: the `CGFloat`
    /// a layout reads (`DSButtonAppearance.height`, a `comp` token read off `DSTokenSet.components`). The cell is
    /// resolved to its key path and read out of `tokens`, the token set the caller built, and the two numbers are
    /// compared. A failure names the cell the way a key-path failure does, and the context the numbers were resolved
    /// in, because a value is only right for one density and one modality:
    /// `spec/components/Button.yaml tokens.root.height [sm], resolved for brand prism, density compact, modality
    /// touch: the spec binds comp.button.height.sm, which is 28.0 there, the implementation returns 32.0`.
    ///
    /// A cell that is not set throws rather than comparing: a value has no "nothing" to agree with.
    func binds(
        value implementation: CGFloat,
        at path: String,
        _ keys: any DSSpecKey...,
        in tokens: DSTokenSet,
        sourceLocation: SourceLocation = #_sourceLocation
    ) throws {
        guard let keyPath = try resolve(path, keys, DSTokenKeyPaths.dimension, "a dimension"),
              let token = try cell(path, keys: keys) else {
            throw DSSpecMismatch(
                description: "\(cellName(path, keys)) is not set, so there is no value to compare \(implementation) with"
            )
        }
        let expected = tokens[keyPath: keyPath]
        #expect(
            implementation == expected,
            Comment(rawValue: """
                \(cellName(path, keys)), resolved for \(Self.describe(tokens.context)): \
                the spec binds \(token), which is \(expected) there, the implementation returns \(implementation)
                """),
            sourceLocation: sourceLocation
        )
    }

    /// The axes a dimension can vary by, as a failure prints them.
    private static func describe(_ context: DSTokenContext) -> String {
        "brand \(context.brand), density \(context.density), modality \(context.modality)"
    }

    private func check<Root, Value>(
        _ implementation: KeyPath<Root, Value>?,
        _ path: String,
        _ keys: [any DSSpecKey],
        _ table: [String: KeyPath<Root, Value>],
        _ kind: String,
        _ sourceLocation: SourceLocation
    ) throws {
        let expected = try resolve(path, keys, table, kind)
        let token = try cell(path, keys: keys)
        #expect(
            implementation == expected,
            Comment(rawValue: """
                \(cellName(path, keys)): the spec binds \(token ?? "nothing"), \
                the implementation binds \(Self.name(of: implementation, in: table))
                """),
            sourceLocation: sourceLocation
        )
    }

    /// How a failure names the cell: `Button.yaml tokens.root.background [primary, vivid]`.
    private func cellName(_ path: String, _ keys: [any DSSpecKey]) -> String {
        let list = keys.isEmpty ? "" : " [\(keys.map(\.specKey).joined(separator: ", "))]"
        return "\(file) \(documentPath(path))\(list)"
    }

    /// The token a key path reads, for the failure message; the reverse of the generated table, walked only when
    /// something has already gone wrong.
    private static func name<Root, Value>(of keyPath: KeyPath<Root, Value>?, in table: [String: KeyPath<Root, Value>]) -> String {
        guard let keyPath else { return "nothing" }
        if let hit = table.first(where: { $0.value == keyPath })?.key { return hit }
        return "\(keyPath), which is no token of the catalogue"
    }
}
