import Testing
@testable import DSCore

@Suite struct DSCorePlaceholder {
    @Test func linksTokens() { #expect(DSCoreInfo.version == "0.1.0") }
}
