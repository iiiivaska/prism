// The gate proves itself before it judges the registry (roadmap P2-2 acceptance: "CI catches a
// misspelled Phosphor name and an SF Symbols 8-only symbol"). Every fixture in Fixtures/ is a legal
// registry with one deliberate fault, and expectations.json names the rule each must trip. A fixture
// that stops failing fails the run, so the availability gate can never rot into a no-op.
//
// The Phosphor half of that acceptance is the Vitest suite of tools/icons; this half is the SF Symbols
// one, and it runs on every `icons-validate` invocation because the `apple` CI job calls the tool once.
import Foundation

enum SelfTest {
    struct Expectations: Decodable {
        let expected: [String: String]
    }

    static func run(catalog: SymbolCatalog) -> (issues: [Issue], checked: Int) {
        guard let directory = Bundle.module.url(forResource: "Fixtures", withExtension: nil) else {
            return ([.error("self-test/missing", "Fixtures", "the fixture bundle is not next to the executable")], 0)
        }
        let expectationsURL = directory.appending(path: "expectations.json")
        guard let data = try? Data(contentsOf: expectationsURL), let expectations = try? JSONDecoder().decode(Expectations.self, from: data) else {
            return ([.error("self-test/missing", "Fixtures/expectations.json", "cannot be read")], 0)
        }
        var issues: [Issue] = []
        for name in expectations.expected.keys.sorted() {
            let wanted = expectations.expected[name] ?? ""
            let url = directory.appending(path: name)
            let registry: Registry
            do {
                registry = try Registry.load(url)
            } catch {
                issues.append(.error("self-test/unreadable", name, "\(error)"))
                continue
            }
            // The smoke test asks the running system for an image; the fixtures only exercise the
            // catalog rules, and one fixture name is deliberately absent from every release.
            let found = Checks.symbols(registry, catalog: catalog, smokeTest: false)
            let errors = found.filter { $0.severity == .error }
            if wanted.isEmpty {
                if let first = errors.first {
                    issues.append(.error("self-test/unexpected", name, "expected no error but got \(first.code): \(first.message)"))
                }
            } else if !errors.contains(where: { $0.code == wanted }) {
                let got = errors.map(\.code).joined(separator: ", ")
                issues.append(.error("self-test/not-caught", name, "expected \(wanted), got \(got.isEmpty ? "no error" : got)"))
            }
        }
        return (issues, expectations.expected.count)
    }
}
