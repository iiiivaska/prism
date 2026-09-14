# ADR-0008: Three font slots, Native and Signature presets, Cyrillic mandatory

- Status: accepted
- Date: 2026-09-08
- Decision record entry: docs/decisions.md #8

## Context

The references' identity lives in typography: a geometric, softly rounded sans for labels and ultra-thin, very large numerals for hero metrics. Neither is SF Pro. SF Pro is free on Apple and gives Dynamic Type and optical sizes for nothing, but Apple's font license forbids embedding it in software or serving it on the web. The owner's apps are localized to Russian, so Cyrillic is a hard requirement.

Verified facts (2026-09-08, font binaries inspected with fontTools and Core Text on macOS 26.5.1; full tables in `docs/research/fonts-facts.md`, renders in `docs/research/fonts.md`):

- **Onest** v2.001 (Google Fonts, 2026-08-06): OFL without Reserved Font Name, variable weight 100–900, full Russian, Ukrainian and Kazakh Cyrillic (162 codepoints), working tabular figures, designed by a Cyrillic-native team. Width and x-height sit in the same band as Manrope and Inter.
- **Manrope** v4.504: OFL, 200–800, Russian + Ukrainian, tabular figures, but the upstream repository is gone and the last build is from 2021.
- **Geist** v1.8 / 1.7.2: OFL, 100–900, Cyrillic redesigned in January 2026, tabular figures; messy upstream tagging.
- **Inter** 4.x: OFL, 100–900 with an optical-size axis; the best thin numerals of the set; already the web font of the Native preset.
- **No Cyrillic at all** in the served builds of Outfit, Urbanist, Figtree, Plus Jakarta Sans, Lexend, Sora, DM Sans; **no tabular figures** in Wix Madefor, Commissioner, Raleway, Comfortaa; Jost's Cyrillic is 76 codepoints; Golos Text and Wix Madefor have no weights below 400.
- **JetBrains Mono** v2.304: OFL, 100–800, Cyrillic. IBM Plex Mono carries the Reserved Font Name "Plex", so subsetting would force a rename.
- On Apple, fonts bundled in an SPM resource bundle must be registered at launch with `CTFontManagerRegisterFontURLs`; named instances (`Onest-Thin` … `Onest-Black`) then resolve by PostScript name and `Font.custom(_:size:relativeTo:)` scales them with Dynamic Type. Bold Text does not embolden custom fonts automatically; `legibilityWeight` must be read.

## Decision

1. **Three brand-level slots**: `font.ui`, `font.display`, `font.mono`. The role scale (`type.display.*`, `type.title.*`, `type.headline`, `type.body.*`, `type.label.*`, `type.caption`, `type.metric.*`) is fixed by the system; a brand only chooses families and may apply one global scale multiplier.
2. **Preset "Native"**: SF Pro / SF Rounded / SF Mono on Apple via system APIs; Inter (with `opsz`) and `ui-monospace` on web. No bundled files.
3. **Preset "Signature"** (default for the reference brand): **Onest** for `font.ui` and `font.display`, **JetBrains Mono** for `font.mono`, bundled as variable TTFs on Apple (registered at launch from the package bundle) and self-hosted woff2 built from the same TTFs on web, so both platforms ship identical bytes. Versions and SHA-256 are recorded in the token source; the parity report diffs them.
4. **Weight is a numeric token** (100–900). Web maps it to `font-weight` on the variable font; Apple maps it to the named instance when one exists and to the `wght` axis by its numeric identifier otherwise (axis names are localized and must never be used).
5. **Tabular figures are a token** (`type.metric.*` and all data roles set numeric = tabular): web `font-variant-numeric: tabular-nums`; Apple the `tnum` feature. A snapshot test asserts `1111` and `0000` render at equal width on both stacks.
6. **Thin weights** (100–200) exist only in `type.metric.xl|lg` at ≥ 34 pt and resolve to 300 under Bold Text (`legibilityWeight == .bold`), Increase Contrast, or below 24 pt.
7. **Cyrillic is a hard requirement** for any family in any slot of any brand; CI checks the bundled font's cmap for the Russian range including Ё/ё.

## Alternatives considered

- System fonts everywhere: no geometric character, inconsistent on non-Apple web clients.
- One bundled family with no Native preset: RideVerse-style apps that want to feel Apple-native would lose SF.
- Manrope as Signature: closest to the references, but abandoned upstream since 2021 and no weight below 200.
- Geist: strong and active, but its Cyrillic is eight months old and the family is strongly associated with Vercel.

## Consequences

- One variable file per platform for ui + display keeps bundles small and Dynamic Type metrics consistent.
- Apple registration and Bold Text handling live in `DSCore`, not in components.
- Brands may switch to Manrope, Geist, Rubik, Golos Text or Geologica (all verified) by changing the font slots; anything without verified Cyrillic and tabular figures is rejected by the brand build.

## Rules that follow

1. No font family name in component code; only `font.ui|display|mono` through generated accessors.
2. Every text role declares its numeric behavior; data roles are tabular.
3. A brand build fails if a bundled font lacks Russian Cyrillic or `tnum`.
