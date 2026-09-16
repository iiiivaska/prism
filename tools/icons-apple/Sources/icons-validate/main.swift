// icons-validate (roadmap P2-2): the macOS half of the icon gate.
//
//   swift run --package-path tools/icons-apple icons-validate spec/icons/registry.json
//
//   --catalog <dir>     read the SF Symbols catalog from another CoreGlyphs Resources folder
//   --repo-root <dir>   the tree that holds the generated DSIconName.swift (default: found upwards)
//   --no-self-test      skip the fixture round that proves the availability rules still bite
//   --json              print the issues as JSON
//
// Exit codes: 0 clean, 1 an issue, 2 usage or layout error.
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("icons-validate: \(message)\n".utf8))
    exit(2)
}

var registryPath: String?
var catalogPath = SymbolCatalog.defaultBundlePath
var repoRoot: String?
var selfTest = true
var asJSON = false

var arguments = Array(CommandLine.arguments.dropFirst())
var index = 0
while index < arguments.count {
    let argument = arguments[index]
    switch argument {
    case "--no-self-test": selfTest = false
    case "--json": asJSON = true
    case "--catalog", "--repo-root":
        index += 1
        guard index < arguments.count else { fail("\(argument) needs a path") }
        if argument == "--catalog" { catalogPath = arguments[index] } else { repoRoot = arguments[index] }
    default:
        if argument.hasPrefix("--") { fail("unknown argument \(argument)") }
        guard registryPath == nil else { fail("one registry path at a time") }
        registryPath = argument
    }
    index += 1
}

guard let registryPath else { fail("usage: icons-validate [--catalog <dir>] [--repo-root <dir>] [--no-self-test] [--json] <registry.json>") }
let registryURL = URL(filePath: registryPath).absoluteURL

let registry: Registry
do {
    registry = try Registry.load(registryURL)
} catch {
    fail("cannot read \(registryURL.path()): \(error)")
}

let catalog: SymbolCatalog
do {
    catalog = try SymbolCatalog(bundlePath: catalogPath)
} catch {
    fail("cannot read the SF Symbols catalog at \(catalogPath): \(error)")
}

/// The repository root: the nearest ancestor of the registry that holds Package.swift.
func findRepoRoot(from url: URL) -> URL? {
    var directory = url.deletingLastPathComponent()
    while directory.path() != "/" {
        if FileManager.default.fileExists(atPath: directory.appending(path: "Package.swift").path()) { return directory }
        directory = directory.deletingLastPathComponent()
    }
    return nil
}

var issues: [Issue] = []
var fixtures = 0
if selfTest {
    let result = SelfTest.run(catalog: catalog)
    issues.append(contentsOf: result.issues)
    fixtures = result.checked
}
issues.append(contentsOf: Checks.symbols(registry, catalog: catalog, smokeTest: true))
issues.append(contentsOf: Checks.sizes(registry))
if let root = repoRoot.map({ URL(filePath: $0) }) ?? findRepoRoot(from: registryURL) {
    issues.append(contentsOf: Checks.generatedEnum(registry, at: root.appending(path: "swift/Sources/DSIcons/Generated/DSIconName.swift")))
}

let errors = issues.filter { $0.severity == .error }
let warnings = issues.count - errors.count

if asJSON {
    let payload = issues.map { ["code": $0.code, "severity": $0.severity.rawValue, "where": $0.where_, "message": $0.message] }
    let data = try JSONSerialization.data(withJSONObject: ["ok": errors.isEmpty, "issues": payload], options: [.prettyPrinted, .sortedKeys])
    print(String(decoding: data, as: UTF8.self))
} else {
    for issue in issues { print(issue.line) }
    if errors.isEmpty {
        let symbols = registry.icons.values.filter { $0.apple.symbol != nil }.count
        let custom = registry.icons.count - symbols
        print(
            "icons-validate: \(symbols) SF Symbols available at \(registry.sources.sfSymbols.osFloor) and \(custom) Phosphor image sets, "
                + "\(registry.sizes.count) measured icon boxes, \(fixtures) fixtures\(warnings > 0 ? ", \(warnings) warnings" : "") "
                + "(SF Symbols \(registry.sources.sfSymbols.release), catalog year \(catalog.newestYear))"
        )
    } else {
        let errorLabel = errors.count == 1 ? "1 error" : "\(errors.count) errors"
        let warningLabel = warnings == 1 ? " and 1 warning" : warnings > 1 ? " and \(warnings) warnings" : ""
        FileHandle.standardError.write(Data("icons-validate: \(errorLabel)\(warningLabel)\n".utf8))
    }
}
exit(errors.isEmpty ? 0 : 1)
