// One screen with one of every kind in the Phase 3 slice — Surface, Text, Button, Card — written the
// way `agent/SKILL.md` tells an app to write it:
//
//   * no raw value anywhere: spacing comes from `tokens.space`, colour from `tokens.color`, type from
//     a `DSTextRole`, and nothing here names a hex, a point size or a font;
//   * density and modality are inherited, never branched on;
//   * the version the package carries is read from `DSTokensInfo`, so the build also proves that the
//     stamped constant reached the consumer (critic C-15).
import DSComponents
import DSCore
import DSTokens
import SwiftUI

struct FixtureScreen: View {
    /// The one way an app reaches tokens: the environment's resolved set (SKILL rule 1).
    private var ds = DSThemeValues()

    @State private var refreshes = 0

    var body: some View {
        let tokens = ds.tokens
        ScrollView {
            VStack(alignment: .leading, spacing: tokens.space.step4) {
                DSText("Prism consumer fixture", role: .titleLg)
                DSText("DSTokensInfo.version \(DSTokensInfo.version)", role: .caption, tone: .secondary)

                DSCard(
                    "Line output",
                    caption: "Last 24 hours",
                    variant: .solid,
                    hero: DSCardHero("86", trailing: ".4", unit: "%"),
                    onAction: { refreshes += 1 }
                )

                // One vivid card on the screen, so it keeps `gradient.vivid.default` and names no slot
                // (SKILL, "Vivid 2×2": slots come in one-temperature pairs and a lone card takes none).
                DSCard(
                    "Average yield",
                    caption: "Dollars per batch",
                    variant: .vivid,
                    hero: DSCardHero("$2,450"),
                    onAction: { refreshes += 1 }
                )

                DSSurfaceView(material: .raised, radius: .card) {
                    VStack(alignment: .leading, spacing: tokens.space.step3) {
                        DSText("Refreshed \(refreshes) times", role: .bodyMd, numeric: .tabular)
                        DSButton("Continue", variant: .primary, size: .md) { refreshes += 1 }
                        DSButton("Details", variant: .secondary, size: .md) { refreshes += 1 }
                    }
                }
            }
            .padding(tokens.space.pageMargin)
        }
        .background(tokens.color.bgPage)
    }
}
