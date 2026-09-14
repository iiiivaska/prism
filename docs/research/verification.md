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
| motion-haptics | — | pending | Same; Apple facts read from the documentation data feed. |

Pending checks and the completeness critic are re-run in the next research pass; open questions from every report are collected in `docs/roadmap.md` under "Verify before implementing".
