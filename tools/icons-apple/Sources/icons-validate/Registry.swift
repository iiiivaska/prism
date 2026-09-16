// The parts of spec/icons/registry.json this tool reads. The full shape is checked by Ajv in
// tools/icons (`pnpm icons:validate`), which runs first in CI, so a decoding failure here means the
// file was hand-edited past that gate.
import Foundation

struct Registry: Decodable, Sendable {
    struct Sources: Decodable, Sendable {
        struct Phosphor: Decodable, Sendable {
            let package: String
            let version: String
        }

        struct SFSymbols: Decodable, Sendable {
            let release: Int
            /// The newest `name_availability.plist` year key allowed: 2025 maps to OS 26.0.
            let maxYear: String
            /// The deployment floor of Package.swift, as a release number such as `26.0`.
            let osFloor: String

            enum CodingKeys: String, CodingKey {
                case release, maxYear, osFloor
            }
        }

        let phosphor: Phosphor
        let sfSymbols: SFSymbols
    }

    struct Weight: Decodable, Sendable {
        let number: Int
        let phosphor: String
        let sf: String
        let boldText: String
    }

    struct Style: Decodable, Sendable {
        struct SF: Decodable, Sendable {
            let variant: String?
            let renderingMode: String?
        }

        let phosphor: String
        let sf: SF
    }

    struct Size: Decodable, Sendable {
        struct SF: Decodable, Sendable {
            let pointSize: Double
            let scale: String
        }

        let token: String
        let px: Double
        let sf: SF
    }

    struct RTLMirror: Decodable, Sendable {
        let web: Bool
        let apple: Bool
    }

    struct Apple: Decodable, Sendable {
        let symbol: String?
        let custom: String?
        let minOS: String?
        let fallback: String?
    }

    struct Icon: Decodable, Sendable {
        let label: String
        let categories: [String]
        let tags: [String]
        let rtlMirror: RTLMirror?
        let defaultStyle: String?
        let since: String
        let apple: Apple
    }

    let version: String
    let sources: Sources
    let weights: [String: Weight]
    let styles: [String: Style]
    let sizes: [String: Size]
    let icons: [String: Icon]

    static func load(_ url: URL) throws -> Registry {
        try JSONDecoder().decode(Registry.self, from: Data(contentsOf: url))
    }

    /// Icon ids in the order the checks report them.
    var sortedIds: [String] { icons.keys.sorted() }
}

/// One finding. `code` is stable and asserted by the self-test.
struct Issue: Sendable, Equatable {
    enum Severity: String, Sendable {
        case error
        case warning
    }

    let code: String
    let severity: Severity
    let where_: String
    let message: String

    static func error(_ code: String, _ where_: String, _ message: String) -> Issue {
        Issue(code: code, severity: .error, where_: where_, message: message)
    }

    static func warning(_ code: String, _ where_: String, _ message: String) -> Issue {
        Issue(code: code, severity: .warning, where_: where_, message: message)
    }

    var line: String {
        "\(severity == .error ? "error" : "warn ") \(code)\(where_.isEmpty ? "" : " \(where_)"): \(message)"
    }
}
