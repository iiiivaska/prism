import Foundation
import Testing
import DSTokens

/// The fonts DSTokens bundles (ADR-0021 §11, ADR-0020 §7): every bundled face of every brand names a file that the
/// resource bundle carries (`.copy("Resources/Fonts")`), with its OFL.txt beside it and a PostScript name per
/// named instance; a system face names no file. Instance selection follows ADR-0021 §9.
@Suite("Font resources")
struct FontResourceTests {
    @Test func everyBundledFaceIsInTheBundle() throws {
        for brand in DSBrand.allCases {
            for (slot, face) in brand.faces {
                if face.system != nil {
                    #expect(face.file == nil && face.postScriptNames.isEmpty, "\(brand) \(slot): a system face bundles nothing")
                    continue
                }
                let url = try #require(face.fileURL, "\(brand) \(slot) names no file")
                let data = try Data(contentsOf: url)
                #expect(!data.isEmpty, "\(url.lastPathComponent) is empty")
                let license = url.deletingLastPathComponent().appendingPathComponent("OFL.txt")
                #expect(FileManager.default.fileExists(atPath: license.path), "\(url.lastPathComponent) has no OFL.txt beside it")
                #expect(!face.postScriptNames.isEmpty, "\(brand) \(slot) has no PostScript names")
            }
        }
    }

    @Test func weightsMapToTheExactOrNearestHeavierInstance() {
        let face = DSFontFace(
            families: ["Face"], file: "face/Face.ttf",
            postScriptNames: [300: "Face-Light", 400: "Face-Regular", 700: "Face-Bold"],
            opticalSize: nil, system: nil
        )
        #expect(face.postScriptName(for: 400) == "Face-Regular")
        #expect(face.postScriptName(for: 500) == "Face-Bold")
        #expect(face.postScriptName(for: 100) == "Face-Light")
        #expect(face.postScriptName(for: 900) == "Face-Bold")
        let system = DSFontFace(families: ["system"], file: nil, postScriptNames: [:], opticalSize: nil, system: .default)
        #expect(system.postScriptName(for: 400) == nil)
        #expect(system.fileURL == nil)
    }
}
