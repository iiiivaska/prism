# Fact-check results

Each research report was handed to an independent skeptic agent instructed to refute its claims against official documentation, registries and license texts on 2026-09-08. Refutations were folded into the ADRs; nothing changed a decision.

| Report | Claims confirmed | Refuted / corrected | What changed |
|--------|------------------|---------------------|--------------|
| arch-web | 36 | 9 | Base UI 1.0 shipped 2025-12-11 (InfoQ coverage was Feb 2026); its date-fns peers are optional, so the "date components coming" inference is speculation. React Aria localizes 30+ languages in 36 locales, **including ru-RU and uk-UA**. Same-document View Transitions are Baseline 2025 "newly available" (still outside Tailwind's browser floor). Storybook 10.3.0 shipped 2026-03-18 (blog 2026-04-06). visx: 116 open issues + ~33 PRs. Ladle had dependency upgrades in June 2026. `require(esm)` unflagged in Node 22.12.0 and 20.19.0. Attribution nit on the Tailwind `@source` discussion. |
| icons-tooling | 30 | 2 | `@visx/chart`, `theme`, `a11y`, `kernel`, `registry` exist only on master after the 4.0.0 tag; treat as unpublished. Heroicons 2.2.0 ships 8 deprecated alias files in three folders; a validator must exclude them. Everything about Phosphor, SF Symbols, licenses and curve parity stands. |
| arch-tokens | 43 | 4 | Polaris base theme has 226 color tokens (not 227). Color.js `toGamut()` "css" method accepts a clipped color when ΔEOK < 0.02 (the CSS Color 4 JND), not ΔE2000 < 2. Two citation swaps (Tokens Studio export docs; Material `md.comp.*` should cite material-web). |
| arch-apple | 35 | 2 | Xcode 27 beta 6 requires macOS 26.4+; no Apple-silicon-only requirement is documented; "Preview grids" should read as the documented grouped preview variants. The SF Symbols license clause quoted is a 2023 community reproduction with Apple staff acknowledgement; the current installer text was not re-read (conclusion unchanged). |
| fonts | — | pending | Fact-check agent did not run (session limit). Facts came from font binaries inspected locally; treat as verified by method. |
| licensing-kits | — | pending | Same. |
| dataviz-design | — | pending | Same; validator numbers are reproducible from the bundled skill. |
| motion-haptics | 46 | 8 | Checked 2026-09-14 (details below). Four substantive corrections, all fixed in the report; the formula, the settle definition and the Motion caveat also in `tokens/README.md`:<br>• For negative bounce, damping is `4π/(duration·(1+bounce))`; the WWDC23 slide's formula is wrong.<br>• Prism's settle values stand, but Apple's `Spring.settlingDuration` returns values 12–226 ms longer, so both stacks must sample the curve.<br>• Apple's `interactiveSpring` has base bounce 0.15, so `interactive (0.15, 0)` is a Prism choice rather than Apple's default.<br>• Motion's `spring().toString()` needs `keyframes` and uses its own 50 ms-grid duration, so its string cannot be paired with the settle time.<br>Four nits. No decision changed. |

Pending checks and the completeness critic are re-run in the next research pass; open questions from every report are collected in `docs/roadmap.md` under "Verify before implementing".

## motion-haptics details

The report was checked on 2026-09-14, focusing on the claims the token pipeline depends on: §2, §4.1, §4.2, §4.4, §6 and §7.1. Sections not re-checked: §3, the §4.1 generator list, §4.3 theme defaults, §5.1–5.2, and §7.2–7.5.

Sources used:

- **Xcode 26.6 iOS SDK interface files.** `SwiftUICore.swiftinterface`, `SwiftUI.swiftinterface` and `UIKit.swiftinterface`. They include the inlinable spring conversion code.
- **SwiftUI runtime probes.** Run on macOS 26.6.2 and the iOS 26.5 simulator, which gave identical numbers.
- **Apple documentation data.** The `developer.apple.com/tutorials/data/documentation/...` JSON files behind the doc pages.
- **motion 13.2.0 and 13.3.0.** Installed from npm, then read and probed.
- **Browser data.** `@mdn/browser-compat-data` 8.1.1 and `web-features` 3.38.0.

### Refuted or corrected

1. **Negative-bounce damping (§2 conversion block, §8 #7). Refuted.**
   - The report gave `damping = 4π / (duration + 4π·bounce)` for bounce < 0, taken from the WWDC23 10158 slide. For duration 0.5 and bounce −0.2 this gives negative damping (−6.24).
   - The SDK's inlinable `springDampingFraction(bounce:)` returns `1/(bounce + 1)` for −1 < bounce < 0 (∞ at ≤ −1). The correct formula is therefore `damping = 4π/(duration·(1 + bounce))`, with stiffness still `(2π/duration)²`.
   - `Spring(duration: 0.5, bounce: -0.2).value(target:time:)` matches that closed form exactly. Its `stiffness` getter reports 335.57 instead of 157.91, and `velocity(target:time:)` is wrong for overdamped springs.
   - Fixed in report §2/§8 and `tokens/README.md`.
   - Sources: SDK path `iPhoneOS.sdk/System/Library/Frameworks/SwiftUICore.framework/Modules/SwiftUICore.swiftmodule/arm64e-apple-ios.swiftinterface`; https://developer.apple.com/documentation/swiftui/spring/init(duration:bounce:) ; https://developer.apple.com/videos/play/wwdc2023/10158/
2. **Settle equals Apple's `settlingDuration` to within ±10 ms (§0 #3, §5.3, §5.4, §10 Q2). Refuted.**
   - The report's settle values are right as a sampled ε = 0.001 displacement settle: interactive 220.4, sheet 404.5, snappy 487.6, smooth 587.8, bouncy 818.7 ms, measured on Apple's own `Spring.value`.
   - The `Spring.settlingDuration` getter returns 300.0 / 584.0 / 635.4 / 600.0 / 1044.7 ms, although its docs cite target 1, velocity 0 and ε 0.001.
   - `init(settlingDuration:dampingRatio:epsilon:)` is not its inverse.
   - A parity test that read the getter would fail. Settle is now defined by sampling on both stacks.
   - Fixed in report §0/§2/§5.3/§5.4/§10 and `tokens/README.md`.
   - Source: https://developer.apple.com/documentation/swiftui/spring/settlingduration (docs), plus the runtime probe.
3. **`interactive (0.15, 0)` is "Apple interactiveSpring defaults" (§5.3; the §2 row omitted the base bounce). Refuted.**
   - `interactiveSpring(duration:extraBounce:blendDuration:)` expands to `spring(duration: duration, bounce: 0.15 + extraBounce, blendDuration: blendDuration)`. Apple's default is therefore `(0.15, 0.15)`, blend 0.25, with a settle of 209 ms.
   - The duration and blend defaults the report gave are correct.
   - Report §2/§5.3/§8 now call bounce 0 a Prism choice.
   - Sources: SDK path above; https://developer.apple.com/documentation/swiftui/animation/interactivespring(duration:extrabounce:blendduration:)
4. **Motion `spring(options).toString()` as the source of Prism's CSS (§4.2, §8 #23). Corrected.** This matters for roadmap P1-4.
   - The object form throws `TypeError` without `keyframes`. The docs say the generator "must be provided with two keyframes".
   - `toString()` ends at Motion's own rest point: a 50 ms grid, `restDelta` 0.005 and `restSpeed` 0.01 for unit keyframes, one stop per 30 ms. That gives interactive 300, snappy 550, smooth 650, sheet 500 and bouncy 700 ms. Bouncy is cut before it settles.
   - Use `generateLinearEasing(fn, settleMs, resolutionMs)` (exported from `motion`) over a physics generator instead, or emit Motion's own duration together with its string.
   - Also: time-defined springs (`duration`/`visualDuration` + `bounce`) force `velocity` to 0 in 13.x, so only physics springs hand off release velocity.
   - Sources: https://motion.dev/docs/spring ; https://unpkg.com/motion-dom@13.3.0/dist/es/animation/generators/spring.mjs ; https://unpkg.com/motion-dom@13.2.0/dist/es/animation/generators/utils/calc-duration.mjs ; https://unpkg.com/motion-dom@13.3.0/dist/es/animation/waapi/utils/linear.mjs
5. **Nit: `linear()` "Baseline widely available since December 2023" (§4.1).**
   - It became newly available on 2023-12-11 and widely available on 2026-06-11. MDN's banner merges the two dates.
   - The browser versions in the report (Chrome/Edge 113, Firefox 112, Safari/iOS 17.2) are correct. Samsung Internet is 23.0.
   - Sources: https://web-platform-dx.github.io/web-features-explorer/features/linear-easing/ ; https://github.com/mdn/browser-compat-data/blob/main/css/types/easing-function.json
6. **Nit: "percentages must ascend; at least two stops" (§4.1).**
   - This follows MDN, but the Editor's Draft is looser. It clamps an out-of-order input position to the largest preceding one instead of rejecting it, and the grammar accepts a single stop.
   - No effect on a generator, which emits ascending uniform stops.
   - Sources: https://drafts.csswg.org/css-easing-2/#linear-easing-function ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear
7. **Nit: Motion `findSpring` "12 iterations" (§4.2).**
   - `rootIterations = 12`, but the loop starts at 1, so it runs 11 Newton steps.
   - Source: https://unpkg.com/motion-dom@13.3.0/dist/es/animation/generators/spring.mjs
8. **Nit: "`.selection` (= `.selection(.default)` in 26)" (§7.1).**
   - The doc text says "Equivalent to `selection(_:)` with `SelectionFeedback/default`". However, `SelectionFeedback` has no public `default` member (it only has `maximum`, `minimum`, `on` and `off`), and `.selection(.default)` fails to compile with the Xcode 26.6 SDK. Write `.selection`.
   - `spec/haptics.yaml` is unaffected.
   - Sources: https://developer.apple.com/documentation/swiftui/sensoryfeedback/selection ; https://developer.apple.com/documentation/swiftui/sensoryfeedback/selectionfeedback

### Confirmed, with facts added

- **Motion versions.** motion 13.2.0 (published 2026-09-02) was the latest release on 2026-09-08. motion 13.3.0 shipped on 2026-09-14 and leaves the spring math unchanged.
- **Motion's `visualDuration` mapping.** Motion's `visualDuration = duration/1.2` path reproduces Apple's curve to 2e-16 for bounce in [0, 0.95].
- **`prefers-contrast`.** Not stated in the report, but `tokens/README.md` emits it. Supported in Chrome/Edge 96, Firefox 101 and Safari 14.1 (iOS 14.5); Baseline widely available since 2024-11-30.
- **`prefers-reduced-transparency`.** Chrome/Edge 118, Firefox 113 behind a flag, not in Safari. BCD marks it experimental and it is not Baseline.
- **`prefers-reduced-motion`.** Chrome 74, Firefox 63, Safari 10.1.
- **`SensoryFeedback`.** All per-symbol "Only plays feedback on …" notes and the iOS 26 `press`/`release`/`selection(_:)` availability match Apple's pages. The type and its modifiers are available on visionOS 26.0.

### Follow-ups outside the files this check may edit

- `tokens/ref/motion.tokens.json` (the `interactive` `$description`) and `tools/tokens/seed-ref-tokens.py:160` still say "Apple interactiveSpring defaults". The owner also has to decide on `interactive`: keep bounce 0, or match Apple's 0.15.
- `tokens/sys/motion/reduced.tokens.json` sets `$value.duration` to the spring duration: 250 / 250 / 300 ms. The derived settles are 367 / 367 / 441 ms, and the file has no `settle` field. The "regenerate and diff" check will flag it.
- `docs/research/arch-web.md`, ADR-0003 and `docs/roadmap.md` P1-4 plan the Motion `(visualDuration, bounce)` / `spring()` path. They need the caveats from item 4.
- Resolved 2026-09-15 by ADR-0023. `interactive` keeps bounce 0 as a Prism choice. The reduced springs' fallbacks are 367 / 367 / 440 ms (441 above is the rounded crossing; the settle rule floors it), and a reduced `smooth` (0.30, 0) joins them. The Motion `spring()` / `visualDuration` plans in arch-web, ADR-0003 and roadmap P1-4 are replaced by ADR-0023 §5 and §6.
