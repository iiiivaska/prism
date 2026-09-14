# Prism "Signature" typeface research — open-license Cyrillic sans, display numerals, mono

Research date: 2026-09-08. Researcher: parallel research agent (fonts).
Companion machine-readable data: `fonts-analysis.json` (same folder) — raw fontTools dump of every binary inspected (cmap coverage, fvar axes, GSUB/GPOS features, head.modified date, name-table license URL).

## 0. Method (so the numbers below can be trusted or reproduced)

Everything version-specific was **verified against the actual font binaries**, not from memory or marketing pages:

1. Downloaded the served builds from `github.com/google/fonts` (the exact files fonts.googleapis.com serves) plus upstream release zips (Geist v1.7.2, Inter 4.1, JetBrains Mono 2.304, Martian Mono 1.1.0, Commit Mono 1.143, IBM Plex Mono Variable 1.0.0, Involve 1.001, PT Root UI 1.002).
2. Inspected each with **fontTools 4.64.0** (Python 3.14): Russian coverage = all of U+0410–U+044F plus Ё/ё (U+0401/U+0451); Ukrainian check = Ґґ Єє Іі Її; Kazakh check = 16 extra letters; `fvar` axes and named instances; GSUB feature tags; digit advance widths before/after applying the `tnum` lookups; `head.modified` build date; name ID 14 license URL.
3. Ran a **Core Text line-layout test on macOS 26.5.1** (Swift 6.3.3) that registers each variable TTF with `CTFontManagerRegisterFontsForURL`, lays out `1111111111` / `0000000000` / `7777777777` with and without `tnum`, and checks that named instances resolve by PostScript name and that arbitrary `wght` values can be set via `kCTFontVariationAttribute`.
4. Cross-checked metadata against `METADATA.pb`, `upstream_info.md`, `OFL.txt` in google/fonts, upstream GitHub releases (via `gh`), the Fontsource API, and live `fonts.googleapis.com/css2` responses.
5. Read the license/FAQ pages (OFL FAQ, Ubuntu Font Licence, Apple SF license) and Apple developer docs (UIAppFonts, ATSApplicationFontsPath, CTFontManagerRegisterFontURLs, Font.custom(_:size:relativeTo:), legibilityWeight).

"Last update" = the newest of (upstream release date, google/fonts binary commit date). Dates are ISO.

---

## 1. Executive summary

- **Onest** is the standout for the Signature `ui` slot: OFL (no Reserved Font Name), variable **wght 100–900**, full Russian + Ukrainian + Kazakh Cyrillic (v2.000 of 2026-08-03 expanded Cyrillic from 12 to 56 languages), `tnum` verified, served by Google Fonts and Fontsource, designed by a Cyrillic-native team (Simpals, Moldova). Same family gives Thin/ExtraLight display numerals, which keeps the whole system in one family.
- **Manrope** (200–800), **Geist** (100–900, Cyrillic redesigned 2026-01), **Rubik** (300–900, softly rounded) and **Golos Text** (400–900, best small-size Cyrillic reading) complete the ui shortlist.
- **Disqualified on hard requirements** (verified in the binaries): Outfit, Urbanist, Figtree, Plus Jakarta Sans, Lexend, Sora, DM Sans, Commit Mono — **no Russian Cyrillic at all**; Wix Madefor Text/Display, Commissioner, Raleway, Comfortaa — **no working tabular figures**; Jost — Cyrillic present but only 76 codepoints (no Ukrainian Ґ/Є/І/Ї); Involve — only wght 400–700; Golos Text, Wix Madefor, PT Root UI — no weights below 300/400 (fine for ui, not for thin display numerals).
- **Commercial, not bundle-safe**: Gilroy (only Light/ExtraBold free, terms ambiguous), Stolzl (Inhouse Type, paid, no variable), TT Norms Pro (TypeType, paid App licence).
- **Mono**: JetBrains Mono (100–800, Cyrillic, OFL) first; Geist Mono (100–900, Cyrillic redesigned 2026) second; IBM Plex Mono is excellent but carries the RFN "Plex" (subsetting requires renaming) and its variable build (2026-07-30) is not yet on Google Fonts. SF Mono has Cyrillic (verified on macOS 26.5.1) but its licence forbids embedding/web use and it has no weight below Light (~295).
- **Loading**: Google Fonts CSS2 (`family=Onest:wght@100..900`) or self-host via `@fontsource-variable/onest`; on Apple, bundle the variable TTF, register it (Info.plist `UIAppFonts` on iOS/watchOS/tvOS/visionOS, `ATSApplicationFontsPath` on macOS, or `CTFontManagerRegisterFontURLs` for SPM resource bundles), then use named instances (`Onest-Thin` … `Onest-Black`) or set `wght` through `kCTFontVariationAttribute` with the numeric axis id `2003265652`.

---

## 2. Candidate matrix (verified 2026-09-08)

Legend: **Cyr RU** = full Russian alphabet incl. Ё; **UK** = Ukrainian extras; **KZ** = Kazakh extras (n/16); **cps** = codepoints in U+0400–U+052F; **tnum** = `tnum` feature present *and* Core Text/fontTools confirm equal digit widths ("default" = digits are tabular without any feature); **Width** = advance width of a 33-character Russian UI string at wght 400, in ems (lower = more compact; Onest = 18.43 baseline).

### 2a. Sans candidates

| Family | Build inspected | Last update | wght (var) | Other axes | Cyr RU | UK | KZ | cps | tnum | x-height | Width (em) | License / RFN | Designer | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Onest** | GF v2.001 (2026-08-06) | 2026-08-06 | 100–900 | – | yes | yes | 16/16 | 162 | yes (672u) | 0.527 | 18.43 | OFL, no RFN | D. Voloshin, A. Kudryavtsev (Simpals) | **ui #1, display #1** |
| **Manrope** | GF v4.504 (build 2021-07-22) | 2021-08-26 | 200–800 | – | yes | yes | 6/16 | 104 | yes (620u) | 0.540 | 18.40 | OFL, no RFN | Mikhail Sharanda | **ui #2** (stale but stable) |
| **Geist** | GF v1.800 (2026-04-02); upstream v1.7.2 (2026-06-01) | 2026-06-01 | 100–900 | – | yes | yes | 16/16 | 134 | yes (600u) | 0.530 | 18.69 | OFL, no RFN | Vercel (A. Briganti et al.) | **ui #3** |
| **Rubik** | GF v2.300 (2023-06-13) | 2023-06-13 | 300–900 | – | yes | yes | 16/16 | 182 | yes (600u) | 0.520 | 18.61 | OFL, no RFN | Hubert & Fischer, Meir Sadan, Cyreal | **ui #4** (rounded) |
| **Golos Text** | GF v2.004 (2023-01-06) | 2023-03-03 | 400–900 | – | yes | yes | 16/16 | 172 | yes (620u) | 0.530 | 19.04 | OFL, no RFN | A. Korolkova, V. Kuzmin (ParaType) | **ui #5** (no light weights) |
| Inter | GF v4.001 (2024-05-24); upstream 4.1 (2024-11-16) | 2024-11-16 | 100–900 | opsz 14–32 | yes | yes | 16/16 | 249 | yes | 0.546 | 18.81 | OFL, no RFN | Rasmus Andersson | reserved for the **Native** web preset; display #2 via opsz 32 |
| Geologica | GF v1.010 (2023-04-13) | 2023-04-13 | 100–900 | CRSV 0–1, SHRP 0–100, slnt −12–0 | yes | yes | 16/16 | 182 | yes (648u) | 0.480 (0.495 @400) | 19.21 | OFL, no RFN | Monokrom | strong alternate (distinctive) |
| Montserrat | GF v9.000 (2024-10-17) | 2024-10-21 | 100–900 | – | yes | yes | 16/16 | 238 | yes (700u) | 0.517 | 20.41 (+11 %) | OFL, no RFN | J. Ulanovsky et al. | closest to Poppins look with Cyrillic; wide |
| Unbounded | GF v1.701 (2023-04-12) | 2023-04-12 | 200–900 | – | yes | yes | 0/16 | 98 | yes (780u) | 0.566 | 24.60 (+33 %) | OFL, no RFN | NaN / Studio Koto (Polkadot) | **display #3** (wide geometric) |
| Nunito Sans | GF v3.101 (2023-03-31) | 2023-03-31 | 200–1000 | wdth 75–125, opsz 6–12, YTLC | yes | yes | 16/16 | 236 | default (no pnum) | 0.484 | 18.29 | OFL, no RFN | V. Adams, J. Le Bailly et al. | softly rounded humanist alternate |
| Mulish | GF v3.603 (2021-09-30) | 2021-10-14 | 200–1000 | – | yes | yes | 16/16 | 236 | default (no pnum) | 0.500 | 18.98 | OFL, no RFN | V. Adams, Cyreal | minimal geometric alternate |
| Exo 2 | GF v2.010 (2024-10-04) | 2024-10-04 | 100–900 | – | yes | yes | 16/16 | 238 | yes (620u) | 0.487 | 18.23 | OFL, no RFN | Natanael Gama | techno flavour; not the target look |
| Noto Sans | GF v2.015 (2024-11-20) | 2024-11-20 | 100–900 | wdth 62.5–100 | yes | yes | 16/16 | 304 | yes + default | 0.536 | – | OFL | Google | safe fallback only |
| Open Sans | GF v3.003 (2023-11-16) | 2023-11 | 300–800 | wdth 75–100 | yes | yes | 16/16 | 275 | yes + default | 0.535 | – | OFL | Steve Matteson | generic |
| Ubuntu Sans | GF v1.006 (2024-03-21) | 2025-09-05 (metadata) | 100–800 | wdth 75–100 | yes | yes | 16/16 | 214 | yes + default | 0.518 | 18.14 | **UFL 1.0** (not OFL) | Dalton Maag / Canonical | licence is permissive but non-OFL; branded look |
| PT Root UI | upstream VF v1.002 (2019-05-07) | 2019 | 300–700 | – | yes | yes | 16/16 | 156 | yes (590u) | 0.500 | 17.73 | OFL **with RFN "PT Root UI"** | ParaType (V. Kuzmin) | good UI face, no thin, RFN, stale |
| Involve | upstream VF v1.001 (2024-01-14) | 2024-01-14 | **400–700** | – | yes | yes | – | 134 | yes + default | 0.547 | 19.76 | OFL (derived from GPL/LPPL Evolventa – see open questions) | Stefan Peev | fails weight range |
| Wix Madefor Text | GF v3.100 (2023-08-08) | 2023-08-09 | 400–800 | – | yes | yes | 0/16 | 104 | **no** (verified) | 0.492 | 18.54 | OFL, no RFN | Dalton Maag | fails tnum, no thin |
| Wix Madefor Display | GF v3.100 | 2023-08-09 | 400–800 | – | yes | yes | 0/16 | 104 | **no** | 0.492 | 18.90 | OFL | Dalton Maag | fails tnum |
| Commissioner | GF v1.001 (2023-02-01) | 2023-02-01 | 100–900 | slnt, FLAR, VOLM | yes | yes | 16/16 | 238 | **no** (verified) | 0.494 | 18.02 | OFL, no RFN | Kostas Bartsokas | fails tnum |
| Jost | GF v3.710 (2021-09-10) | 2021-09-22 | 100–900 | – | yes | **no** | 0/16 | **76** | yes (580u) | 0.460 | 16.98 | OFL | Owen Earl | Cyrillic too thin (basic Russian only); low x-height |
| Raleway | GF v4.026 (2020-07-08) | 2020-07-08 | 100–900 | – | yes | yes | 16/16 | 238 | **no**; default figures are old-style (`lnum` exists) | 0.519 | 18.39 | OFL | M. McInerney et al. | fails tnum |
| Comfortaa | GF v3.105 (2021-07-22) | 2021 | 300–700 | – | yes | yes | 16/16 | 180 | **no** | 0.547 | 21.45 | OFL | Johan Aakerlund | fails tnum; display category |
| Roboto Flex | GF v3.200 (2023-06-30) | 2023-06 | 100–1000 | opsz 8–144 + 11 parametric | yes | yes | 16/16 | 152 | default (pnum available) | 0.514 | 17.88 | OFL | Font Bureau / Google | Android-flavoured; not the look |
| Source Sans 3 | GF v3.052 (2023-09-19) | 2023-09 | 200–900 | – | yes | yes | 16/16 | 156 | default | 0.478 | – | OFL | Adobe | humanist, not geometric |
| Figtree | GF v2.002 (2025-04-09) | 2025-04 | 300–900 | – | **no** | no | 0 | 0 | yes | 0.500 | – | OFL | Erik Kennedy | **no Cyrillic** |
| Plus Jakarta Sans | GF v2.071 (2023-06-08) | 2023-06 | 200–800 | – | **no** | no | 0 | 0 | yes | 0.536 | – | OFL | Tokotype | **no Cyrillic** (METADATA lists `cyrillic-ext` but cmap has 0 codepoints in U+0400–052F) |
| Lexend | GF v1.007 (2021-07-30) | 2021 | 100–900 | – | **no** | no | 0 | 0 | no | 0.525 | – | OFL | Bonnie Shaver-Troup, Thomas Jockin | **no Cyrillic** |
| Sora | GF v2.000 (2020-06-10) | 2020 | 100–800 | – | **no** | no | 0 | 0 | yes | 0.534 | – | OFL | Jonathan Barnbrook | **no Cyrillic** |
| Outfit | GF v1.100 (2023-03-17) | 2023-03 | 100–900 | – | **no** | no | 0 | 0 | yes | 0.460 | – | OFL | Rodrigo Fuenzalida | **no Cyrillic** — confirmed |
| Urbanist | GF v1.303 (2021-10-27) | 2021 | 100–900 | – | **no** | no | 0 | 0 | no | 0.500 | – | OFL | Corey Hu | **no Cyrillic** — confirmed |
| DM Sans | GF v4.004 (2023-06-14) | 2026-05 (build config only) | 100–1000 | opsz 9–40 | **no** | no | 0 | 0 | no | 0.526 | – | OFL | Colophon | **no Cyrillic** |
| Gilroy | – | – | 10 wts + italics (commercial) | – | yes (per vendor) | ? | ? | – | ? | – | – | **Commercial** (MyFonts, $180 family); free Light + ExtraBold with ambiguous terms | Radomir Tinkov | excluded |
| Stolzl | – | – | Thin–Bold, 6 wts + italics, no variable | – | yes (per MyFonts) | ? | ? | – | ? | – | – | **Commercial** (Inhouse Type; desktop $33.78/style, App licence separate) | Mariya Lish | excluded |
| TT Norms Pro | – | – | Thin–ExtraBlack, 104 styles incl. 2 variable | – | yes (TypeType) | ? | ? | – | ? | – | – | **Commercial** (TypeType; Variable from $549; App licence required) | TypeType | excluded |

### 2b. Mono candidates

| Family | Build inspected | Last update | wght | Other axes | Cyr RU | UK | cps | Advance (u/1000) | License / RFN | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **JetBrains Mono** | GF v2.211 (2020-11-18) / upstream 2.304 (2023-01-14) | 2023-01-14 | 100–800 | – | yes | yes | 98 (GF) / 122 (2.304) | 600 | OFL, no RFN | **mono #1** (bundle upstream 2.304) |
| **Geist Mono** | GF v1.701 (2026-05-20) / upstream 1.700 | 2026-06-01 | 100–900 | – | yes | yes | 134 | 600 | OFL, no RFN | **mono #2** |
| IBM Plex Mono | GF v2.3 statics (2022-11-09); upstream `@ibm/plex-mono@2.5.0` (2026-06-11), `@ibm/plex-mono-variable@1.0.0` (2026-07-30) | 2026-07-30 | 100–700 (variable upstream only) | – | yes | yes | 168 (GF) / 194 (var) | 600 | OFL **with RFN "Plex"** | strong alternate; RFN complicates subsetting |
| Martian Mono | GF v1.000 (2023-01) / upstream v1.1.0 (2025-02-10) | 2025-02-10 | 100–800 | wdth 75–112.5 | yes | yes | 84 (GF) / 188 (1.1.0) | 750 (very wide) | OFL, no RFN | data-viz/label niche; space-hungry |
| Fira Code | GF v5.002 (2021-09-01) | 2021 | 300–700 | – | yes | yes | 288 | 1200/2000 | OFL | no thin weights |
| Source Code Pro | GF v1.026 (2025-04-10) | 2025-04 | 200–900 | – | yes | yes | 150 | – | OFL | fine, less character |
| Roboto Mono | GF v3.001 (2025-03-31) | 2025-03 | 100–700 | – | yes | yes | 275 | – | OFL | generic |
| Ubuntu Sans Mono | GF v1.006 | 2024-03 | 400–700 | – | yes | yes | 214 | – | UFL 1.0 | no light weights |
| Commit Mono | v1.143 (2023-12-28) | 2023-12-28 | 400 & 700 statics | – | **no** | no | **0** | 600 | OFL | **no Cyrillic** — excluded |
| SF Mono (system, macOS 26.5.1 `SFNSMono.ttf`) | 21.0d1e1 | – | **294.67–900** (Light…Heavy, 6 instances) | YAXS | yes | yes | 232 | – | Apple licence: **no embedding, no web** | system-only via `.monospaced` / `ui-monospace` |

### 2c. Apple system fonts (for the Native preset, verified locally on macOS 26.5.1)

| Font | File | Cyrillic | tnum | Axes |
|---|---|---|---|---|
| SF Pro (system) | `/System/Library/Fonts/SFNS.ttf` v21.4d2e1 | yes, 234 cps | yes | wght 1–1000, opsz 17–96, wdth 30–150, GRAD |
| SF Compact (watchOS) | `SFCompact.ttf` v21.4d1e1 | yes, 232 cps | yes | wght, opsz 19–20, GRAD |
| SF Rounded | `SFNSRounded.ttf` | yes, 232 cps | yes | wght, GRAD |
| SF Mono | `SFNSMono.ttf` v21.0d1e1 | yes, 232 cps | n/a (monospaced) | wght ≈295–900 |

---

## 3. Ranked shortlists

### 3a. `ui` slot — top 5

1. **Onest** (OFL, no RFN; wght 100–900; tnum; full RU/UK/KZ; v2.001 2026-08-06).
   Why: the only candidate that combines a modern geometric-grotesque look with native-quality Cyrillic, Thin-to-Black in one variable file, real tabular figures, Google Fonts + Fontsource distribution, and a 2026 release. Width and x-height (18.43 em / 0.527) sit in the same band as Manrope and Inter, so density tokens transfer. Also covers `display` from the same family. Caveat: v2 is one month old — pin the version and run the CI contrast/snapshot suite on it.
2. **Manrope** (OFL, no RFN; 200–800; tnum; RU/UK, partial KZ; last binary 2021).
   Why: the geometric "Dribbble-card" look closest to the RonDesignLab references; compact (18.40 em); large x-height 0.54 helps small UI sizes. Risks: no Thin (200 min), only 104 Cyrillic codepoints (no Kazakh set), no upstream activity since 2021 (the original `sharanda/manrope` repo is gone; Google Fonts tracks `aaronbell/manrope`).
3. **Geist** (OFL, no RFN; 100–900; tnum; RU/UK/KZ; Cyrillic redesigned in 1.7.0, 2026-01-29).
   Why: extremely active, Swiss-geometric, complete weight range, pairs 1:1 with Geist Mono. Risks: strong Vercel association; Cyrillic is young (redesigned this year); upstream versioning is messy (tags `1.8.0` 2026-03-03 < `v1.7.2` 2026-06-01; google/fonts ships "1.800").
4. **Rubik** (OFL, no RFN; 300–900; tnum; RU/UK/KZ; 2023).
   Why: rounded-corner geometric — best match for "softly rounded"; robust Cyrillic (182 cps). Risks: no weight below 300, so thin display numerals must come from another slot.
5. **Golos Text** (OFL, no RFN; 400–900; tnum; RU/UK/KZ; ParaType 2023).
   Why: the best pure Cyrillic reading face in the set (Cyrillic-first design), tabular figures verified. Risks: no light/thin weights at all; slightly wider (19.04 em); humanist-grotesque rather than geometric.

Also worth a design review: **Geologica** (100–900, tnum, SHRP/CRSV axes, 2023) if a more distinctive voice is wanted; **Montserrat v9** (Poppins-like geometric, 100–900, tnum, 2024) if width (+11 %) is acceptable; **Nunito Sans** (rounded humanist, 200–1000, tabular by default) for a softer brand.

### 3b. `display` (large thin numerals) — top 3

1. **Onest Thin/ExtraLight (wght 100–200)** — same family as ui #1, tnum verified (672 u), so 1.2M / 04:32 / 98 % align in KPI tiles. Thin strokes are clean at ≥ 48 pt.
2. **Inter at opsz 32, wght 100–200** (the "Inter Display" cut inside the variable font) — the most refined large-size numerals of the set, tnum, also available as static `InterDisplay-Thin`. Use only if the brand accepts Inter appearing in both presets.
3. **Unbounded ExtraLight (200)** — wide, on-brand for "ops dashboard" hero numbers, tnum verified (780 u), Cyrillic RU/UK. Very wide (+33 %) — reserve for 1–4 digit hero metrics.
   Runners-up: **Geist Thin (100)**, **Montserrat Thin (100)**, **Geologica Thin (100)** with `SHRP` for sharper terminals, **Manrope ExtraLight (200)**.

### 3c. `mono` — top 2

1. **JetBrains Mono** — 100–800, Cyrillic RU/UK (bundle upstream 2.304 for 122 codepoints vs 98 in the older Google Fonts build), OFL without RFN, `zero`/`ss` features, 600 u advance. The de-facto standard for code and tabular data.
2. **Geist Mono** — 100–900, Cyrillic redesigned 2026, OFL, pairs with Geist; ligatures moved to `ss11` in 1.7.0 (off by default — good for data tables).
   Alternate: **IBM Plex Mono** (variable 100–700 released 2026-07-30; RFN "Plex" means any subsetted build must be renamed). **SF Mono** for the Native preset only (system API / `ui-monospace`).

---

## 4. Loading and integration

### 4a. Web (React + Tailwind v4)

Google Fonts CSS2 (allowed host `fonts.googleapis.com`, files from `fonts.gstatic.com`). Axis lists must be alphabetical and ranges use `..`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap">
```

Verified live 2026-09-08: the response for `Onest:wght@100..900` contains 7 `@font-face` blocks (incl. `cyrillic` and `cyrillic-ext` unicode-range blocks, plus math/symbols from v2), woff2, `font-weight: 100 900`. Same shape for Manrope (200 800), Geist (100 900), Golos Text (400 900), Unbounded (200 900), Montserrat, JetBrains Mono (100 800), Geist Mono, Geologica.

Self-hosting (recommended for the Signature preset, so Apple and web ship the same bytes): Fontsource variable packages, e.g. `@fontsource-variable/onest` → `import '@fontsource-variable/onest/wght.css'` → `font-family: 'Onest Variable'`. Fontsource API confirms subsets `cyrillic`, `cyrillic-ext` for onest v11 (2026-08-25), manrope v20, geist v5, golos-text v7, unbounded v12, jetbrains-mono v24, geist-mono v6, ibm-plex-mono v20 (static only), martian-mono v6.

Tailwind v4 theme tokens (Style Dictionary output target):

```css
@theme {
  --font-ui: "Onest Variable", "Onest", system-ui, sans-serif;
  --font-display: "Onest Variable", "Onest", system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace;
  --font-display--font-feature-settings: "tnum";
  --font-display--font-variation-settings: "wght" 200;
}
```

`tabular-nums` (→ `font-variant-numeric: tabular-nums`) and `slashed-zero` are stock Tailwind v4 utilities; prefer `font-variant-numeric` over `font-feature-settings` for tnum so it composes.

Native preset on web: `Inter` (Google Fonts `Inter:opsz,wght@14..32,100..900`) and `ui-monospace` (resolves to SF Mono on Apple browsers; falls back elsewhere).

### 4b. Apple (SwiftUI, iOS/iPadOS/macOS/watchOS 26)

Files: ship the **variable TTF** (`Onest[wght].ttf`, `JetBrainsMono[wght].ttf`) — one file per family, no italics needed for Onest (none exist). Sources: google/fonts raw URLs or upstream release zips; keep the OFL.txt next to them (OFL §2 requires the licence to accompany the font).

Registration (three routes, all verified against Apple docs):
- App target: Info.plist `UIAppFonts` ("Fonts provided by application") — iOS 3.2+, tvOS 9+, watchOS 2+, visionOS 1+. File names **with** extension.
- macOS app target: `ATSApplicationFontsPath` = folder path relative to `Resources/`.
- **SPM package (Prism's case)**: fonts live in the package resource bundle (`Bundle.module`), which Info.plist keys cannot see — register at launch with `CTFontManagerRegisterFontURLs(_:_:_:_:)` (iOS 13+, macOS 10.15+, watchOS 6+, tvOS 13+, visionOS 1+; async, handler may be called several times) or the older synchronous `CTFontManagerRegisterFontsForURL` (iOS 4.1+, watchOS 2+). Use `.process` scope.

Named instances (verified on macOS 26.5.1 with Core Text): after registering `Onest[wght].ttf`, `CTFontManagerCreateFontDescriptorsFromURL` exposes 9 descriptors `Onest-Thin`, `Onest-ExtraLight`, `Onest-Light`, `Onest-Regular`, `Onest-Medium`, `Onest-SemiBold`, `Onest-Bold`, `Onest-ExtraBold`, `Onest-Black` (Manrope: 7, `Manrope-ExtraLight` … `Manrope-ExtraBold`; Geist: 9). `CTFontCreateWithName("Onest-Thin")` returns wght 100; the bare family name `Manrope` resolves to `Manrope-Regular`. So `Font.custom("Onest-Regular", size: 17, relativeTo: .body)` works and scales with Dynamic Type (iOS 14+/watchOS 7+); `Font.custom(_:fixedSize:)` for non-scaling.

Arbitrary weight (for a numeric `wght` token): `CTFontDescriptorCreateWithAttributes([kCTFontNameAttribute: "Manrope-Regular", kCTFontVariationAttribute: [2003265652: 250]])` yielded PostScript `Manrope-ExtraLight_wghtFA0000` with variation `{2003265652: 250}` — works. **Key axes by the numeric identifier, never by name**: Core Text returned the localized axis name "Вес" on a Russian-locale system.

Tabular figures: `kCTFontFeatureSettingsAttribute: [[kCTFontOpenTypeFeatureTag: "tnum", kCTFontOpenTypeFeatureValue: 1]]` produced equal advances (Onest 672 u, Golos 620, Manrope 620, Geist 600, Inter 644.5, Unbounded 780, Geologica 648, Rubik 618.7, Jost 580, PT Root UI 590, Exo 2 620, Montserrat 700); Wix Madefor, Commissioner, Raleway stayed proportional. SwiftUI `Font.monospacedDigit()` should map to the same feature on custom fonts — add a snapshot test rather than assuming.

Accessibility toggles: **Bold Text** does not auto-embolden custom fonts — read `@Environment(\.legibilityWeight)` (iOS 13+/watchOS 6+) and bump the `wght` token by one step. **Dynamic Type** works through `relativeTo:`. Thin weights (100–200) should be raised to ≥ 300 when `legibilityWeight == .bold` or Increase Contrast is on (design rule, not enforced by the OS).

### 4c. Figma readiness

All shortlisted families are on Google Fonts, so Figma can use them without local installs (Figma bundles Google Fonts). Variable axes are exposed in Figma's Type settings for Google Fonts variable families. The Tokens Studio export should carry `fontFamily: "Onest"` (Figma family name) alongside the PostScript names used on Apple.

---

## 5. Facts table

| # | Claim | Source | Confidence |
|---|---|---|---|
| 1 | Google Fonts serves Onest v2.001 (`Onest[wght].ttf`, wght 100–900, subsets cyrillic, cyrillic-ext, latin, latin-ext, math, symbols, vietnamese), commit 2026-08-06 "Onest: Version 2.001 added". | https://github.com/google/fonts/tree/main/ofl/onest ; https://github.com/google/fonts/pull/10765 | high |
| 2 | Onest 2.000 (2026-08-03) expanded Cyrillic coverage from 12 to 56 languages (Udmurt, Mari, Sakha, Chechen, Kabardian, Ossetic…), glyphs 534→876, added vulgar fractions/numerators/denominators; 2.001 (2026-08-06) is a Vietnamese stacked-accent fix. | https://github.com/simpals/onest/releases ; PR body at https://github.com/google/fonts/pull/10765 | high |
| 3 | Onest binary: full Russian + Ukrainian + Kazakh Cyrillic (162 codepoints), `tnum` produces 672-unit digits, x-height 0.527, OFL (no RFN — copyright line "The Onest Project Authors"), designers Dmitri Voloshin & Andrey Kudryavtsev. | fontTools inspection of `ofl/onest/Onest[wght].ttf`; https://raw.githubusercontent.com/google/fonts/main/ofl/onest/OFL.txt ; https://raw.githubusercontent.com/google/fonts/main/ofl/onest/METADATA.pb | high |
| 4 | Manrope: wght 200–800, Cyrillic basic + Ukrainian (104 codepoints, 6/16 Kazakh letters), `tnum` present (620 u), OFL no RFN, Google Fonts binary v4.504 built 2021-07-22, last google/fonts binary change 2021-08-26; upstream tracked at aaronbell/manrope (last commit 2021-07-22); `sharanda/manrope` no longer resolves. | fontTools inspection; https://github.com/google/fonts/tree/main/ofl/manrope ; https://github.com/aaronbell/manrope | high |
| 5 | Manrope README: "Variable font + 7 legacy weights … Tabular Figures … Supports most of Latin & Cyrillic languages … 'thin' weight has been renamed to 'ExtraLight'". | https://github.com/aaronbell/manrope (README) | high |
| 6 | Geist: Cyrillic support first shipped in 1.1.0 (2023-11-29; issue #36 closed 2024-02-01); 1.4.0 (2024-09-25) "Added missing stylistic set for Cyrillic glyphs"; 1.7.0 (2026-01-29) "introduces a redesigned Cyrillic script for all Geist and Geist Mono styles" and moved coding ligatures to `ss11`; later tags 1.8.0 (2026-03-03), v1.7.1 (2026-05-20), v1.7.2 (2026-06-01). | https://github.com/vercel/geist-font/issues/36 ; https://github.com/vercel/geist-font/releases/tag/1.7.0 ; https://github.com/vercel/geist-font/releases | high |
| 7 | Geist binaries (google/fonts "Version 1.800", upstream v1.7.2 zip also "Version 1.800"): wght 100–900, 134 Cyrillic codepoints incl. Ukrainian/Kazakh, `tnum` 600 u, OFL no RFN; Geist Mono 100–900, monospaced 600 u, no `tnum` feature (not needed). | fontTools inspection; https://github.com/google/fonts/tree/main/ofl/geist ; https://github.com/google/fonts/tree/main/ofl/geistmono | high |
| 8 | Golos Text: wght 400–900 only (Regular→Black), Cyrillic 172 cps, `tnum` verified tabular via Core Text (620 u), designers Alexandra Korolkova & Vitaly Kuzmin (ParaType), OFL no RFN, Google Fonts v2.004 (2023-01), upstream last commit 2023-03-03. | https://github.com/googlefonts/golos-text ; fontTools + Core Text tests | high |
| 9 | Golos UI (ParaType) is a narrower, uniwidth sibling intended for interfaces; Golos was released by ParaType in 2019. | https://pimpmytype.com/font/golos/ ; https://www.paratype.com/fonts/pt/golos-ui | medium |
| 10 | Rubik v2.300 (2023-06-13): wght 300–900, Cyrillic 182 cps (RU/UK/KZ), `tnum` 600 u, OFL no RFN. | fontTools inspection; https://github.com/google/fonts/tree/main/ofl/rubik | high |
| 11 | Wix Madefor Text/Display v3.100 (2023-08-08): wght 400–800, Cyrillic uprights only (104 cps, no Kazakh), Bulgarian alternates, **no `tnum`/`pnum` feature and digits stay proportional under Core Text** (479/640/584 u for 1/0/7). | fontTools + Core Text tests; https://github.com/wix/wixmadefor (README: "Weight axis … 400 (Regular) to 800 (ExtraBold)") | high |
| 12 | Commissioner v1.001 (2023-02-01): wght 100–900 + slnt/FLAR/VOLM, extensive Cyrillic (238 cps), but **no tabular figures** (no `tnum`; Core Text advances 427.7/652.6/528 u). | fontTools + Core Text; https://github.com/kosbarts/Commissioner | high |
| 13 | Unbounded v1.701 (2023-04-12): wght 200–900, Latin + Cyrillic (98 cps; no Kazakh), `tnum` 780 u, OFL, by NaN / Studio Koto / Parity / Web3 Foundation for Polkadot; very wide (24.60 em vs 18.43 for Onest on the same Russian string). | https://github.com/googlefonts/unbounded (README) ; fontTools | high |
| 14 | Montserrat v9.000 (google/fonts 2024-10-21): wght 100–900, Cyrillic 238 cps, `tnum` 700 u, OFL; upstream JulietaUla/Montserrat (GitHub releases stop at v7.222, 2021 — v9 came via a branch build). | fontTools; https://github.com/google/fonts/tree/main/ofl/montserrat ; https://github.com/JulietaUla/Montserrat | high |
| 15 | Jost v3.710 (2021): wght 100–900, `tnum`, but Cyrillic limited to 76 codepoints — basic Russian only, no Ukrainian Ґ/Є/І/Ї; x-height 0.46. | fontTools inspection of `ofl/jost/Jost[wght].ttf` | high |
| 16 | Raleway v4.026 (2020): Cyrillic 238 cps but **no `tnum`**, default figures are old-style (`lnum`, `onum` exist). | fontTools + Core Text | high |
| 17 | Figtree, Plus Jakarta Sans, Lexend, Sora, Outfit, Urbanist, DM Sans: **0 codepoints in U+0400–U+052F** in the served Google Fonts binaries (Plus Jakarta's METADATA lists `cyrillic-ext` but the cmap has none). | fontTools inspection of the google/fonts binaries; METADATA.pb subsets for figtree/lexend/sora/outfit/urbanist/dmsans list only latin, latin-ext (+vietnamese) | high |
| 18 | Nunito Sans v3.101 (2023-03-31): wght 200–1000, wdth 75–125, opsz 6–12, YTLC; Cyrillic 236 cps; digits tabular by default (600 u) with no `tnum`/`pnum` features. Nunito (200–1000) and Mulish (200–1000) behave the same. | fontTools + Core Text | high |
| 19 | Geologica v1.010 (2023-04-13): wght 100–900, CRSV 0–1, SHRP 0–100, slnt −12–0; Cyrillic 182 cps; `tnum` 648 u; OFL; Monokrom (Sindre Bremnes, Frode Helland). README: "grounded in the humanist genre, but leans assertively into geometric, constructed letterforms". | https://github.com/googlefonts/geologica ; fontTools | high |
| 20 | Inter: google/fonts serves 4.001 (opsz 14–32, wght 100–900, built 2024-05-24); upstream 4.1 (2024-11-16) includes "Overhaul of many Cyrillic glyphs" and Cyrillic fixes; both have `tnum`; OFL no RFN; Inter Display = opsz 32 cut / static `InterDisplay-*`. | https://github.com/rsms/inter/releases/tag/v4.1 ; fontTools on `Inter[opsz,wght].ttf` and `InterVariable.ttf` | high |
| 21 | JetBrains Mono: OFL-1.1, free for commercial use; upstream v2.304 (2023-01-14) has wght 100–800 and 122 Cyrillic codepoints; google/fonts still ships v2.211 (2020-11-18, 98 cps). | https://github.com/JetBrains/JetBrainsMono (README "License") ; https://github.com/JetBrains/JetBrainsMono/releases ; fontTools | high |
| 22 | IBM Plex Mono: OFL **with Reserved Font Name "Plex"**; google/fonts has static v2.3 (2022-11-09, Thin–Bold); upstream released `@ibm/plex-mono@2.5.0` (2026-06-11) and `@ibm/plex-mono-variable@1.0.0` (2026-07-30) with wght 100–700 and 194 Cyrillic codepoints. | https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/OFL.txt ; https://github.com/IBM/plex/releases ; fontTools on `IBM Plex Mono Var-Roman.ttf` | high |
| 23 | Martian Mono v1.1.0 (2025-02-10): wght 100–800, wdth 75–112.5, Cyrillic 188 cps, OFL, 750/1000 advance width. | https://github.com/evilmartians/mono/releases ; fontTools | high |
| 24 | Commit Mono v1.143 (2023-12-28): OFL font files, only 400/700 statics, **no Cyrillic** (0 codepoints); earlier v1.135 added Greek. | https://github.com/eigilnikolajsen/commit-mono/releases ; fontTools | high |
| 25 | Involve (Stefan Peev): OFL 1.1 ("Copyright 2022 Involve Project Authors", no RFN); release `Involve_v.1.001` (2024-01-14); shipped VF has wght 400–700 (Regular/Medium/SemiBold/Bold + obliques) although the README describes "Version 2.011 … 9 weights … Thin and Black"; based on Evolventa (GPLv2 + LPPL), a Cyrillic extension of URW Gothic L. | https://github.com/StefanPeev/Involve ; fontTools on `fonts/Involve-VF.ttf` ; https://github.com/StefanPeev/Involve/releases | high (facts) / medium (licence chain) |
| 26 | URW++ base35 v2.0 fonts (incl. URW Gothic) are triple-licensed AGPLv3 (font exception) / LPPL 1.3c / OFL 1.1 without RFN since 2017. | https://github.com/twardoch/urw-core35-fonts (LICENSE.OFL) ; https://answers.launchpad.net/debian/sid/+source/fonts-urw-base35/+copyright | medium |
| 27 | PT Root UI: OFL 1.1 with Reserved Font Name "PT Root UI" (ParaType, 2018); VF v1.002 (2019-05-07) wght 300–700; Cyrillic 156 cps; `tnum` 590 u. | https://github.com/mikejlee/PT-Root-UI (OFL.txt) ; https://www.fontsquirrel.com/license/pt-root-ui ; fontTools | high |
| 28 | Ubuntu Sans / Ubuntu Sans Mono v1.006 are under the Ubuntu Font Licence 1.0 (not OFL): fonts "can be bundled, embedded, and redistributed provided the terms of this licence are met"; modified versions must add naming elements or be renamed; derivatives stay under UFL. | https://canonical.com/legal/font-licence ; google/fonts `ufl/ubuntusans/METADATA.pb` (license: "UFL") | high |
| 29 | Gilroy (Radomir Tinkov): 20 styles Thin–Heavy, commercial ($25/style, $180 family on MyFonts); Light and ExtraBold are distributed free — aggregator sites disagree on whether commercial use is allowed (fontsarena: "free for personal and commercial use"; befonts/localfonts: personal use only); free weights are stated to include Cyrillic. | https://www.myfonts.com/collections/gilroy-font-radomir-tinkov ; https://fontsarena.com/gilroy-by-radomir-tinkov/ ; https://befonts.com/gilroy-font-family.html | medium (terms ambiguous) |
| 30 | Stolzl (Mariya Lish / Inhouse Type): 6 weights Thin–Bold + italics, no variable, commercial (desktop $33.78/style, $153.79 family; App licence separate); marketed with Cyrillic. | https://www.myfonts.com/collections/stolzl-font-inhouse-type/ | high |
| 31 | TT Norms Pro (TypeType): 104 styles (102 static + 2 variable) Thin–ExtraBlack; Variable from $549, full collection $659; separate App licence covers mobile apps; free trial only. | https://typetype.org/fonts/tt-norms-pro/ ; https://www.myfonts.com/collections/tt-norms-font-typetype/ | high |
| 32 | Apple SF fonts licence: "You may not embed the Apple Font in any software programs or other products"; use limited to registered Apple developers designing for Apple OSes; not for non-Apple OSes or the web. | https://developer.apple.com/fonts/ | high |
| 33 | SF Mono on macOS 26.5.1 (`/System/Library/Fonts/SFNSMono.ttf` v21.0d1e1) contains 232 Cyrillic codepoints (full RU/UK/KZ) and a wght axis 294.67–900 with instances Light/Regular/Medium/Semibold/Bold/Heavy — no Thin/ExtraLight. SF Pro (`SFNS.ttf` v21.4d2e1) has 234 Cyrillic cps, `tnum`, wght 1–1000, opsz 17–96. | Local fontTools inspection (macOS 26.5.1, 2026-09-08); corroborated by https://eclecticlight.co/2024/08/02/system-fonts-the-delights-of-san-francisco/ ("SF Mono … supports Latin, Greek, and Cyrillic") | high |
| 34 | Safari 13.1 added CSS generic families `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`; `ui-monospace` is the only CSS route to SF Mono and Apple does not license SF Mono for self-hosting. | https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/ ; https://developer.mozilla.org/en-US/docs/Web/CSS/font-family ; https://diversekit.com/blog/ui-monospace-explained | medium (mapping to SF Mono is from secondary sources) |
| 35 | SwiftUI `Font.Design.monospaced` is available iOS 13+/macOS 10.15+/watchOS 7+; Apple's doc does not name the typeface (SF Mono is community knowledge). | https://developer.apple.com/documentation/swiftui/font/design/monospaced ; https://useyourloaf.com/blog/monospace-digits/ | high (availability) / medium (SF Mono mapping) |
| 36 | Google Fonts CSS2 API: `family=Name:wght@200..900` for ranges, `ital,wght@1,200..900` for italics, axes listed alphabetically, values sorted numerically, `display=swap`, `text=` subsetting. | https://developers.google.com/fonts/docs/css2 | high |
| 37 | Live `fonts.googleapis.com/css2?family=Onest:wght@100..900` returns 7 woff2 `@font-face` blocks incl. `cyrillic` and `cyrillic-ext` unicode-ranges with `font-weight: 100 900`; equivalent responses verified for Manrope, Geist, Golos Text, Unbounded, Montserrat, JetBrains Mono, Geist Mono, Geologica. | curl with a Safari UA, 2026-09-08 | high |
| 38 | Fontsource: `@fontsource-variable/onest` → `import '@fontsource-variable/onest/wght.css'`, CSS family `'Onest Variable'`, weights 100–900, updated 2026-08-25; Fontsource API lists subsets cyrillic + cyrillic-ext for onest, manrope, geist, golos-text, unbounded, inter, geologica, montserrat, rubik, nunito-sans, jetbrains-mono, geist-mono, ibm-plex-mono (static only), martian-mono. | https://fontsource.org/fonts/onest/install ; https://api.fontsource.org/v1/fonts/onest (and siblings) | high |
| 39 | Tailwind v4: `@theme { --font-display: "Oswald", sans-serif; --font-display--font-feature-settings: "cv02", …; --font-display--font-variation-settings: "opsz" 32; }`; utilities `tabular-nums`, `lining-nums`, `slashed-zero`, `proportional-nums`. | https://tailwindcss.com/docs/font-family ; https://tailwindcss.com/docs/font-variant-numeric | high |
| 40 | `UIAppFonts` ("Fonts provided by application") — iOS 3.2+, tvOS 9+, watchOS 2+, visionOS 1+; array of font file names with extension; fonts must be target members. `ATSApplicationFontsPath` — macOS, path relative to the bundle's Resources folder. | https://developer.apple.com/documentation/bundleresources/information-property-list/uiappfonts ; https://developer.apple.com/documentation/uikit/adding-a-custom-font-to-your-app ; https://developer.apple.com/documentation/bundleresources/information-property-list/atsapplicationfontspath | high |
| 41 | `CTFontManagerRegisterFontURLs(_:_:_:_:)` — iOS 13+, macOS 10.15+, watchOS 6+, tvOS 13+, visionOS 1+; asynchronous with a handler that may be called multiple times; `CTFontManagerRegisterFontsForURL` — iOS 4.1+, macOS 10.6+, watchOS 2+, not deprecated. | https://developer.apple.com/documentation/coretext/ctfontmanagerregisterfonturls(_:_:_:_:) ; https://developer.apple.com/documentation/coretext/ctfontmanagerregisterfontsforurl(_:_:_:) | high |
| 42 | After `CTFontManagerRegisterFontsForURL` on macOS 26.5.1, a variable TTF exposes its named instances as separate PostScript names (`Onest-Thin`…`Onest-Black`; `Manrope-ExtraLight`…`Manrope-ExtraBold`); `kCTFontVariationAttribute` with numeric axis id 2003265652 sets arbitrary `wght` (250 → `Manrope-ExtraLight_wghtFA0000`); axis names are localized ("Вес"). | Core Text test script run locally 2026-09-08 (`ctcheck.swift`); numeric-id rationale corroborated by https://github.com/dufflink/vfont | high (macOS) / medium (assumed identical on iOS/watchOS 26) |
| 43 | Setting `kCTFontFeatureSettingsAttribute` `tnum` on the registered fonts yields equal digit advances for Onest, Golos Text, Exo 2, Manrope, Geist, Montserrat, Unbounded, Inter, Geologica, Rubik, Jost, PT Root UI; Nunito Sans and Mulish are tabular without it; Wix Madefor Text, Commissioner, Raleway remain proportional. | Core Text test script run locally 2026-09-08 (`ctcheck2.swift`) | high |
| 44 | `Font.custom(_:size:relativeTo:)` scales a custom font with Dynamic Type (iOS 14+, macOS 11+, watchOS 7+); `custom(_:fixedSize:)` does not scale. `legibilityWeight` environment value reflects the Bold Text setting (iOS 13+, watchOS 6+). | https://developer.apple.com/documentation/swiftui/font/custom(_:size:relativeto:) ; https://developer.apple.com/documentation/swiftui/environmentvalues/legibilityweight | high |
| 45 | OFL FAQ: bundling with software is allowed (1.4); web embedding via @font-face is fine (2.1); removing glyphs/subsetting for webfonts "is considered modification" (2.6); WOFF conversion without data change keeps the name (2.2.1); with a Reserved Font Name you must rename a Modified Version (3.1); OFL fonts may not be sold on their own (1.5/1.6). | https://openfontlicense.org/ofl-faq/ | high |
| 46 | Reserved Font Names among candidates: **IBM Plex Mono ("Plex")** and **PT Root UI ("PT Root UI")** declare RFNs; Onest, Manrope, Inter, Geist, Golos Text, Rubik, Nunito Sans, Wix Madefor, Commissioner, Unbounded, Montserrat, Jost, JetBrains Mono, Geologica, Mulish, Exo 2, Martian Mono, Nunito, Inter Tight, Involve do not. | `OFL.txt` copyright lines in google/fonts for each family; Involve `fonts/OFL.txt` | high |
| 47 | Text-width comparison at wght 400 (33-char Russian UI string, ems): Jost 16.98, PT Root UI 17.73, Roboto Flex 17.88, Commissioner 18.02, Ubuntu Sans 18.14, Exo 2 18.23, Nunito Sans 18.29, Raleway 18.39, Manrope 18.40, Onest 18.43, Wix Text 18.54, Rubik 18.61, Geist 18.69, Inter 18.81, Mulish 18.98, Golos 19.04, Geologica 19.21, Involve 19.76, Montserrat 20.41, Comfortaa 21.45, Unbounded 24.60. Cyrillic runs 8–12 % wider than Latin in every family. | fontTools `varLib.instancer` at wght 400, 2026-09-08 (`widths.py`) | high |

---

## 6. Recommendations for Prism

1. **Signature preset = Onest (ui + display) + JetBrains Mono (mono).** Pin `Onest[wght].ttf` v2.001 and `JetBrainsMono[wght].ttf` v2.304 (upstream) as bundled resources in the Swift package and as `@fontsource-variable/*` (or self-built woff2 from the same TTF) on web. Record the exact version and SHA in the token source so the CI parity report can diff font versions across platforms.
2. **Keep Inter for the Native web preset only** (Inter 4.x via Google Fonts `Inter:opsz,wght@14..32,100..900`; opsz 32 for display). Do not reuse it in Signature — the two presets should read differently.
3. **Encode weights as numeric `wght` tokens (100–900) and map them per platform**: web → `font-variation-settings`/`font-weight`; Apple → named-instance PostScript names when the value hits an instance (`Onest-Light` = 300) and `kCTFontVariationAttribute` `2003265652` for anything else. Never reference axes by name (localized).
4. **Tabular figures as a token, not a per-view hack**: `typography.numeric = tabular` → web `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`), Apple `kCTFontFeatureSettingsAttribute tnum` (or `.monospacedDigit()`); enforce in the data-viz module and in every KPI/stat component; add a snapshot test asserting `1111` and `0000` render the same width in both implementations.
5. **Display numerals**: Onest wght 100–200 at ≥ 48 pt in comfortable/regular density; raise to 300 when `legibilityWeight == .bold`, Increase Contrast, or size < 24 pt (the 3:1 decorative-numeral exception only applies ≥ 24 pt). Offer Unbounded 200 as an optional "hero" alternate slot rather than a default (its +33 % width breaks layouts silently).
6. **Bold Text / Dynamic Type handling**: use `Font.custom(_:size:relativeTo:)` for every text style; read `legibilityWeight` and step every `wght` token +100 (cap 900) when bold; test with Kazakh/Ukrainian strings, not just Russian, because Manrope/Unbounded/Wix drop the Kazakh set.
7. **Licensing hygiene**: ship `OFL.txt` alongside each font in the package and npm bundle; avoid RFN fonts (IBM Plex, PT Root UI) in the default preset so subsetting for web never triggers a rename; if the design team insists on Plex Mono, ship the unsubsetted upstream woff2/TTF or rename the subset (OFL FAQ 2.6/3.1).
8. **Fallback stacks** (tokens): web ui `"Onest Variable", Onest, Inter, system-ui, sans-serif`; mono `"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`; Apple: if registration fails, fall back to `Font.system(design: .default/.monospaced)` and log — never crash on `UIFont(name:)` being nil.
9. **Second-tier options to keep in the spec's "alternates" table**: Manrope (if a more Dribbble-geometric feel wins the design review; accept 2021 staleness and 200 floor), Geist + Geist Mono (if a single-vendor pairing is preferred), Rubik (if rounded warmth is wanted), Golos Text (for a reading-heavy product), Geologica (distinctive, with SHRP as an optional brand knob).
10. **Do not adopt** Wix Madefor, Commissioner, Raleway, Comfortaa (no tabular figures), Jost (thin Cyrillic), Involve (400–700 only, unclear GPL→OFL chain), Commit Mono (no Cyrillic), Gilroy/Stolzl/TT Norms (commercial), Outfit/Urbanist/Figtree/Plus Jakarta/Lexend/Sora/DM Sans (no Cyrillic).
11. **Watch list for the next version bump**: Geist upstream tagging (1.8.0 vs v1.7.2), Inter 4.1 landing in google/fonts, IBM Plex Mono Variable landing in google/fonts, Onest 2.x follow-ups (the google/fonts PR notes the upstream `afrc` feature source bug is patched downstream), JetBrains Mono refresh in google/fonts (still 2.211).

---

## 7. Open questions

1. **Onest v2 maturity** — released 2026-08-03/06; no downstream bug reports yet. Run Prism's contrast/snapshot CI and a Russian/Ukrainian/Kazakh proof sheet before freezing v1.0 of the tokens. Are the new vulgar fractions/superiors needed (they add math/symbols subsets on web)?
2. **iOS/watchOS parity of the Core Text behaviour** — named-instance lookup and `kCTFontVariationAttribute` were verified on macOS 26.5.1 only; a 2020 Apple forum thread reported iOS 14 breakage of the variation-attribute path with no resolution. Needs a device/simulator test on iOS 26 and watchOS 26 (the vfont/swift-variablefonts packages indicate it works with numeric ids, but verify).
3. **SwiftUI `.monospacedDigit()` on custom fonts** — expected to map to `tnum`; not verified here (Core Text path verified). Add to the parity test matrix.
4. **Geist versioning** — google/fonts ships "Version 1.800" while the newest upstream tag is v1.7.2 (2026-06-01) and a `1.8.0` tag exists from 2026-03-03. Which one is canonical for pinning?
5. **Manrope maintenance** — the original repo is gone; is a 2021 build acceptable for a system planned to live for years, or should Manrope be listed only as an alternate?
6. **Involve licence chain** — Evolventa is GPLv2/LPPL; Involve relicensed under OFL. Since URW's 2017 base35 v2.0 release is OFL, a clean-room OFL derivation is plausible, but nobody has documented it. Not worth resolving unless Involve gains thin weights.
7. **Gilroy free weights** — vendor terms for the free Light/ExtraBold are not published on an authoritative page; irrelevant unless someone wants the Gilroy look (Onest/Manrope are the open substitutes).
8. **Kazakh/Ukrainian scope** — the brief says "full Cyrillic (Russian)". If Kazakh or Serbian/Bulgarian local forms matter later, Manrope (6/16 Kazakh), Unbounded (0/16), Wix (0/16) fall short, while Onest, Geist, Golos, Rubik, Montserrat, Inter, Geologica, Nunito Sans, Commissioner cover it; Wix Madefor and Involve also carry Bulgarian `locl` alternates.
9. **Google Fonts vs self-host on web** — Google Fonts gives per-script subsetting for free but serves whichever build google/fonts has (Inter 4.001, JetBrains Mono 2.211 today); self-hosting guarantees byte-identical fonts with the Apple bundle. Decide per preset (Native = Google Fonts is fine; Signature = self-host).
10. **Figma variable-axis exposure** — assumed available for Google Fonts variable families; confirm in Figma when the Figma track starts.
