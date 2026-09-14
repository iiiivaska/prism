import Testing
@testable import DSTokens

@Suite struct DSTokensPlaceholder {
    @Test func versionMatchesFile() {
        #expect(DSTokensInfo.version == "0.1.0")
    }
}
