# Credit Karma (concept) — forensic style analysis, mobile + desktop (RonDesignLab, Jack R.)

Sources:
- Mobile: `refs/creditkarma-mobile/` — Dribbble 27696584 "Credit Karma – Credit Monitoring Mobile App" (00–06.jpg, 07.mp4 skipped, 08.png)
- Desktop: `refs/creditkarma-desktop/` — Dribbble 27597487 "Credit Karma – Credit Monitoring Desktop" (00–07.jpg, 08.mp4 skipped, 09.png)
- Owner's hand-picked screenshots: `refs/USER_PASTED_SCREENSHOTS.md` (Family A light iPad CRM, Family B dark Vexto ops)

Method: every jpg/png viewed at full 2000 px; pixel colours sampled with Pillow from the two full-screen frames (desktop 06.jpg, mobile 05.jpg) and from the macro shots (mobile 00–03, desktop 01–04) where colour fields are large; 2× crops of the header, hero, factor grid, score-history band, offers band and the full phone screen were re-inspected. Contrast ratios computed from the sampled hexes. Note that both shots are photographic mockups (screen tint, grain, perspective), so light values read ~5–8 % darker than the source file; tokens below are corrected toward what the Figma file almost certainly holds.

Scale assumptions:
- Desktop: the monitor screen occupies 1470 px of the 2000 px frame with a 16:9 aspect. Measurements are given at that scale and read as CSS px for a **1440-wide viewport** (×0.98). If the source is 1920 wide, multiply by 1.33.
- Mobile: the iPhone screen spans 525 px for a 393 pt device → **1.336 px per pt**. Sizes below are in pt.

---

## Overview

**What it is.** One product, two form factors: a personal credit-monitoring dashboard ("Health Karma") for Equifax/TransUnion scores. The IA is a hero score with a gauge, two money summary cards (Net Worth, Total Dept [sic]), six credit-factor cards (Credit Card Use, Payment History, Derogatory Marks, Credit Age, Total Accounts, Hard Inquiries), a Score History step chart, and a Credit Offers carousel.

**The look in one sentence.** A near-monochrome light dashboard (grey page, white cards, black circles, hairline chips) lit by a single warm amber "light source" gradient, sitting on top of a near-black instrument band; the only chromatic UI colour is a signal orange for alerts and chart peaks, and vivid colour is quarantined inside photo-blur "glass" cards.

**Mood:** mixed — light-airy top (dashboard), dark-ops bottom (history, offers). This is the exact split the owner's two screenshot families represent (A = light iPad, B = dark Vexto), fused on one screen.

**Family:** the same RonDesignLab house style as Soma/Navexa: geometric rounded sans (Poppins), capsule chips, 40 px circle controls, white cards without shadows, black solid primary circles, hairline everything else.

### Frame inventory

| Frame | Content | What it contributes |
|---|---|---|
| mobile/00.jpg (2000×1500 macro) | "-1 pts / 832 / Excellent Checked Daily", gauge arc, top of Total Dept card | Hero numeral weight, caption greys, badge shape, ring/solid circle pair, grain on gradient |
| mobile/01.jpg (macro) | Bottom of phone: "Score History", floating dark toolbar with 4 round buttons, "1 year" chip, × ring | Dark-sheet chrome, toolbar recipe (white active circle), hairline weights on dark |
| mobile/02.jpg (macro) | "Health Karma" title, Equifax/TransUnion chips, header buttons | Title weight, chip stroke logic (active black / inactive grey), gradient blob placement |
| mobile/03.jpg (macro) | Summary cards + sheet edge with notch and drag handle | Card anatomy, numeral mix (bold 64 / light ,100 / grey $), sheet notch geometry |
| mobile/04.jpg (2000×1500) | Phone in hand, upper 2/3 of the screen | Composition: gauge bleeding off-screen, card carousel peeking |
| mobile/05.jpg (2000×1500) | **Full phone screen** (11:30 status bar) | Master reference for mobile layout and scale |
| mobile/06.jpg (2000×1000) | "Save this design" promo: the two summary cards as **true glass** over a blurred photo | Glass recipe (backdrop blur + haze), inversion rules on glass |
| mobile/08.png (1600×1200 video still) | **Off-family:** "Navexa Warehouses" light dashboard (isometric warehouse map, glass side panel, green accents) — the Dribbble still for the mp4 is a different shot | Corroborates the house style only (pill tabs, white surfaces, green/red status) |
| desktop/00.jpg (2000×1500) | Monitor, angled: full desktop layout | Whole-page composition, header, factor grid, bottom band |
| desktop/01.jpg (macro) | Score History: period chips, orange ticks, dashed lines, tooltip "816 +14% ↗ / moderate credit score" | Step-chart styling in exact detail |
| desktop/02.jpg (macro) | Hero 832 + gauge + Net Worth/Total Dept cards | Gauge anatomy (track, arc, needle, arrowhead), card anatomy |
| desktop/03.jpg (macro) | "Credit Offers · 24 offers for you", Goldman Sachs glass card, olive BofA card | Photo-blur card recipe, partial-ring icon, caption opacity |
| desktop/04.jpg (macro) | Factor grid close-up: Credit Card Use (glass), Payment History, Credit Age, Total Accounts | Mini-chart glyphs, inverted button on glass |
| desktop/05.jpg (2000×1500) | Tablet-like angled frame (finger on Hard Inquiries) | Same layout at a slightly narrower ratio; confirms hover/press target = the black circle |
| desktop/06.jpg (2000×1500) | **Full desktop screen, straight-on** (person at desk) | Master reference for desktop layout and scale |
| desktop/07.jpg (2000×1000) | Same promo strip as mobile/06 | — |
| desktop/09.png (1600×1200 video still) | **Off-family:** "Magura" dark drone/maritime mission control (dark teal glass panels, orange highlight) — mismatched still | Corroborates the dark-ops half of the house style |

---

## Color

### Sampled values (mockup) → corrected tokens

| Role | Sampled | Where | Corrected token (proposed) |
|---|---|---|---|
| Page ground, light | `#DFE1E0` / `#E0E0E0` / `#DDE0E2` | desktop 06 page, mobile 00/02 page | **`#E6E7E8`** (neutral, faintly cool) |
| Card, light | `#FFFFFF` / `#FDFDFD` | all white cards | **`#FFFFFF`** |
| Instrument band / sheet, dark | `#0E0E0E` (desktop 01/03, mobile 01) | bottom band, bottom sheet | **`#0E0E0E`** |
| Raised surface on dark (tooltip) | `#202020` | chart tooltip | **`#1F1F1F`** |
| Floating toolbar pill on dark | `#222222`–`#282828` | mobile toolbar container | **`#262626`** |
| Ink (text, solid circles, active chip stroke) | `#000000`–`#0C0C0C` | hero numerals, title, buttons | **`#0C0C0C`** |
| Secondary text on light | `#848577`–`#999B9A` | "Excellent / Checked Daily", "pts", "TransUnion" | **`#8E8E8E`** (as designed; see a11y) |
| Tertiary / unit grey on light | `#B7BABA`, `$` sign `#9A9A9A` | "$", "Years", "%" | **`#B0B0B0`** |
| Hairline on light | `#C7C7C7` (icon ring), `#BDBDBD` (inactive chip) | rings, inactive chips | **`#C8C8C8`** (≈ ink 20 %) |
| Hairline on dark | `#4C4C4C`–`#5C5C5C` | rings, inactive chips, close × ring | **white 28 %** (`#4A4A4A`) |
| Chart step segments on dark | `#A1A1A1` (visually `#C8C8C8`) | Score History levels | **white 60–70 %** |
| Dashed guides on dark | `#5A5A5A` | vertical dashed drops | **white 33 %** |
| Axis labels on dark | `#6A6A6A` | 850 / 800 / 750 | **white 42 %** |
| Signal orange | `#F3521B` (chart ticks), `#DE4A19` / `#BE4115` (badge, shaded) | alert badge, chart peak ticks | **`#F0501E`** |
| Warm gradient — core | `#D3862E`, `#D78D2C`, `#B66330` | blob centre | stop 0: **`#C86A2C`** |
| Warm gradient — amber | `#E1AF36`, `#E0B846`, `#C18A3F` | mid ring | stop 1: **`#E2A634`** |
| Warm gradient — gold/straw | `#E1D69E`, `#DDC87B`, `#E1DD83` | outer ring | stop 2: **`#E6CF6A`** |
| Warm gradient — fade | `#E0DFC1`, `#F4E8D2` → page | edge | stop 3: **`#EAE4C4`** → page ground |
| Photo-blur card: "Credit Card Use" | `#655748` brown → `#96AAC0` steel blue | factor card 1 | image fill, not a token |
| Photo-blur card: Goldman Sachs | `#4A6665` / `#587163` blue-grey-green | offer 1 | image fill |
| Photo-blur card: Bank of America | `#262D03` → `#7D903D` olive-lime | offer 2 | image fill |
| Photo-blur card: JPMorgan Chase | `#835E53` mauve-brown | offer 3 | image fill |
| Promo glass card body | `#9B9A8C` / `#8F8D77` over `#CA9D70` photo | mobile 06 / desktop 07 | backdrop glass, see recipe |

### Colour logic

1. **Two grounds, one ink.** Light ground `#E6E7E8` with white cards; dark ground `#0E0E0E` with `#1F1F1F` raised surfaces. Text is pure black on light, pure white on dark. There are no tinted greys, no blue-ish "slate" — the greys are dead neutral so that the amber blob and the orange badge read as colour.
2. **One light source.** The only large colour area is the warm radial blob (orange → amber → straw), placed top-centre-right behind the hero on both platforms. It is decorative: no control or text depends on it, and black text sits on it at ≥ 6.7:1.
3. **One signal colour.** Orange `#F0501E` appears exactly three times: the "!" badge on Total Dept, the peak ticks in Score History, and (implied) the "+14 % ↗" delta. No green/red anywhere in these frames — status is carried by the numbers and by ring/dot glyphs, not by hue.
4. **Vivid colour is quarantined in image-fill cards.** One factor card of six ("Credit Card Use") and all three offer cards are blurred photographs under white text. They act as *accent surfaces* — promotional, "look here" — and are the only places where the UI gets saturated colour.
5. **On glass/photo surfaces the circle polarity inverts**: black solid button → white solid button with black arrow; hairline ring stays hairline but white 40 %.
6. **Numerals borrow value, not hue, for hierarchy**: bold black integer part, light black minor part, grey currency/unit. No colour-coded numbers.

---

## Surfaces & Depth

| Surface | Fill | Radius | Border | Shadow | Blur | Notes |
|---|---|---|---|---|---|---|
| Page (light) | `#E6E7E8` + warm radial blob + fine grain (~4 % mono noise) | — | — | — | blob is ~80–120 px gaussian-soft | Blob bbox ≈ 45 % × 60 % of the viewport, centred ~55 % x / 25 % y desktop; ~65 % x / 20 % y mobile, elongated ~-30° |
| Summary card (white) | `#FFFFFF` | **28 px** desktop / **28 pt** mobile (measured 36–40 px on the 1.336 scale) | none | **none** — elevation is white-on-grey value contrast only | — | 258×140 px desktop; 224×165 pt mobile |
| Factor card (white) | `#FFFFFF` | 28 px | none | none | — | 250×215 px, top half empty (icon row + title), number at bottom |
| Factor card (image) | blurred photo (brown→steel blue), ~50 px blur, slight dark vignette | 28 px | none | none | image blur | White text; white solid arrow button |
| Offer card (image) | blurred photo (blue-grey / olive / mauve), bottom darkened ~15 % | 28 px | none | none | image blur | White text, white 60 % captions, partial white ring icon |
| Promo glass card (mobile 06 / desktop 07) | backdrop blur of the photo behind + white haze ≈ 18 %, saturation −30 % | 28 px | 1 px top edge white ≈ 25 % (faint specular) | none | ~30 px backdrop | Body lands at `#9B9A8C` over a `#CA9D70` photo: i.e. haze lifts luminance ~12 % and greys the hue |
| Dark band / sheet | `#0E0E0E` | top corners 0 (desktop band); sheet is full-bleed | none | none | — | Top edge has a **concave notch**: the light area dips ~12 px into the dark band over ~120 px width with 20 px fillets, and a 40×3 px black drag handle sits in the notch |
| Tooltip on dark | `#1F1F1F` | 12 px | none | none | — | 160×80 px, padding 16, close × top-right |
| Floating toolbar (mobile) | `#262626` | full pill | none | none | — | 60 pt tall, overlaps the period chips beneath it |
| Circle control — ring | transparent | full | 1 px `#C8C8C8` (light) / white 28 % (dark) / white 40 % (glass) | none | — | 40 px desktop / 52 pt mobile |
| Circle control — solid | `#0C0C0C` (light/dark) / `#FFFFFF` (on glass) | full | none | none | — | 40 px / 52 pt; glyph inverse |
| Chip / pill | transparent | full | 1 px: active `#0C0C0C` (light) or `#FFFFFF` (dark); inactive `#C8C8C8` / white 28 % | none | — | 34–36 px desktop / 48–50 pt mobile |
| Nav pill (selected) | `#0C0C0C` | full | none | none | — | 98×36 px, white 13 px label |
| Alert badge | `#F0501E` | rounded triangle (Reuleaux-like, 4 px corner radius) | none | none | — | 18 px, white "!" |

**Depth model.** There is *no shadow anywhere*. Depth is produced by (1) value: white cards on a grey page, `#1F1F1F` tooltip on `#0E0E0E`; (2) overlap: the floating toolbar over the chips, the badge over the ring, the sheet over the page; (3) the notch, which physically reads as one sheet sliding over another; (4) blur, only on image surfaces. This is what makes it look printed rather than layered.

**Grain.** The warm blob and the promo photos carry visible film grain (~4–6 % luminance noise). It is part of the mockup finish but also part of the taste: it keeps the blob from looking like a CSS gradient.

---

## Typography

**Family: Poppins (high confidence)** — consistent with the sibling Soma report by the same studio. Evidence in the crops: double-storey "a" with a straight stem ("Karma", "Payment"), single-storey "g" with an open tail ("Derogatory"), "t" with a curved foot ("Total", "History"), horizontal-bar "e", perfectly circular "o/O" ("100", "0"), flagged "1" without a foot ("-1 pts", "137"), "%" built from two small circles and a diagonal ("100 %", "9 %"), "M" with vertical sides and the vertex on the baseline ("Marks", "Menzies"), straight-tailed "y" ("History", "Years"). The promo headline "Save this design" is Poppins SemiBold. Not Outfit/Urbanist (their "a" and "%" differ), not Manrope (bowls too round here), not Inter/SF (geometric "G"/"C"). The status-bar "11:30" is SF Pro (system).

**Weights used:** 300 (Light) for minor numeral groups and units; 400 (Regular) for labels, captions, chips; 500 (Medium) for titles, section headers, nav; 600–700 (SemiBold/Bold) for hero and card integers only.

### Observed sizes

Desktop (1440 CSS px):

| Element | Size / weight | Colour | Notes |
|---|---|---|---|
| Page title "Health Karma" | 48 / 500 | ink | one line; cap-height ≈ 34 px |
| Hero score "832" | **80 / 700** | ink | cap-height 57 px; tracking ≈ −2 %; line-height 1.0 |
| Delta "-1 pts" | 14 / 500 (number) + 14 / 400 grey (unit) | ink / `#8E8E8E` | sits 8 px above the hero, left-aligned |
| Status caption "Excellent / Checked Daily" | 12 / 400, two lines, lh 1.1 | `#8E8E8E` | baseline-aligned to the hero baseline, 16 px right of it |
| Bureau chips | 13 / 400 | ink (active) / `#8A8A8A` (inactive) | — |
| Nav pills | 13 / 500 | white on black / ink | — |
| Wordmark "creditkarma" | 16 / 500 | ink | — |
| User name / role | 13 / 400 + 11 / 400 | ink / `#8E8E8E` | — |
| Card label "Net / Worth" | 16 / 400, two lines, lh 1.1 | ink | bottom-left, baseline-aligned with the number |
| Card value | "$" 22 / 300 grey · "137" **34 / 700** · ",036" 24 / 300 | — | minor group ≈ 70 % of the integer size, same baseline; 4 px gap after "$" |
| Factor title | 18 / 400 | ink / white | one line, ~40 px below the icon row |
| Factor value | **40 / 500** ("100", "12", "0", "4") | ink / white | + unit 14 / 400 grey ("%", "Years") baseline-aligned with a 6 px gap |
| Section title "Score History" / "Credit Offers" | 24 / 500 | white | — |
| Inline stat "24 offers for you" | 24 / 500 + 12 / 400 white 60 % | — | number and phrase share a baseline |
| Period chips | 12 / 400 | white / white 70 % | — |
| Tooltip | "816" 24 / 500 · "+14 % ↗" 11 / 400 · "moderate credit score" 12 / 400 grey | white / `#9A9A9A` | — |
| Axis labels | 11 / 400 | white 42 % | — |
| Offer bank name | 16 / 500, two lines, lh 1.05 | white | — |
| Offer captions "Rate / Period" | 11 / 400 | white 60 % | — |
| Offer values "14 %", "18 month" | 32 / 300 + unit 12 / 400 | white | thin display numerals here (contrast with the bold hero) |

Mobile (393 pt):

| Element | Size / weight | Notes |
|---|---|---|
| Title "Health / Karma" | **38 / 600**, two lines, lh 1.05 | breaks to two lines on purpose (not overflow) |
| Hero "832" | **72 / 700** | cap-height ≈ 52 pt; slightly smaller than desktop but larger relative to viewport (18 % of width vs 6 %) |
| "-1 pts" | 14 | — |
| "Excellent / Checked Daily" | 12 / 400 grey, two lines | — |
| Chips | 14 / 400 | 50 pt tall chip |
| Card label | 15 / 400, two lines | — |
| Card value | "$" 20 / 300 grey · "64" **30 / 700** · ",100" 22 / 300 | — |
| Sheet title "Score History" | 22 / 500 white | — |
| Period chips | 13 / 400 | mostly hidden behind the toolbar |

**Numerals style.** Proportional (not tabular) Poppins figures. The signature move is the *mixed-weight number*: integer/significant group in 700, the thousands/decimal group in 300 at ~70 % size, and the currency sign in 300 grey at ~65 % size — all on one baseline. Units ("%", "Years", "month", "pts") are always small (≈ 35 % of the number), grey, baseline-aligned with a 4–6 px gap. Percent signs are dropped to ~40 % size. Deltas carry a thin "↗" glyph rather than a coloured chip. Hero numbers are heavy (700) — unlike the Vexto/Soma thin numerals — because here the score is the product; the *thin* numerals are reserved for the offer cards (32/300).

**Casing & tracking.** Title Case everywhere ("Payment History", "Checked Daily"); no all-caps labels; no letterspaced eyebrows. Display tracking is tight (−1 to −2 % on the 72–80 hero), body tracking default. Two-line labels are set with lh 1.05–1.1 so that they read as one lock-up beside the number.

---

## Layout & Spacing

### Desktop (1440 CSS px, 16:9)

- **Margins** 36 px left/right, 36 px top. Header row 36 px tall at y = 36.
- **Two columns above the fold.** Left column 508 px (35 %): title, chips, hero + gauge, two summary cards side by side. Right column 760 px (53 %): 3 × 2 factor grid. The gutter between columns is unusually wide, **~104 px (7 %)** — that is where the amber blob shows through and where the gauge lives. Nothing is centred; the header nav pills are centred on the viewport, not the content.
- **Factor grid:** 3 columns × 2 rows, cards 250 × 215 px, **gutter 12 px** both axes.
- **Summary cards:** 258 × 140 px, gap 8–12 px, sitting on the left column baseline that aligns with the bottom of the factor grid (y ≈ 795).
- **Card interior:** padding 24 px; icon row at top (ring left, solid arrow right, both 40 px); title 40 px below the icon row on factor cards; number at bottom-left; mini-chart bottom-right, its baseline aligned to the number's baseline; the middle of the card is empty by design.
- **Dark band** starts at y ≈ 838 (≈ 76 % of the screen height) and runs to the bottom; it keeps the same two columns: Score History under the left column (508 px), Credit Offers under the right (760 px), same 104 px gutter.
- **Section header row** in the band: title left, inline stat 100 px right of it, ring arrow button flush right (Credit Offers) or period chips flush right (Score History). 48 px from the band's top edge.
- **Offer carousel:** 3 visible cards 250 px wide, 12 px gap, overflowing the bottom of the viewport (content continues under the fold; the page scrolls).
- **8-pt base** throughout: 12 / 16 / 24 / 36 / 48 / 104 recur.

### Mobile (393 pt, iPhone with Dynamic Island)

- **Margins** 16 pt. Title starts 44 pt below the status bar.
- **Header:** two-line title left; right-aligned pair of 50–52 pt circles (hairline "≡" ring, black "building" logo) at the title's first line.
- **Bureau chips** 50 pt tall, 8 pt gap, 24 pt below the title.
- **Hero block** 110 pt below the chips: "-1 pts", "832", two-line caption; the **gauge bleeds off the right edge** (only ~60 % of the arc is on screen).
- **Summary cards:** horizontal carousel, card 224 × 165 pt, gap 12 pt, second card peeks ~40 pt; it is *not* clipped to the margin — the first card starts at the 16 pt margin, the row scrolls edge to edge.
- **Bottom sheet** (dark) starts at ~72 % of the screen height with the notch + handle centred; inside: "Score History" 40 pt down with a 48 pt × ring flush right; then the period chips row, then the chart (below the visible area in the frames).
- **Floating toolbar:** a 60 pt tall `#262626` pill, 4 buttons of 44–48 pt, left-of-centre, layered *over* the period chips (chips peek out on both sides: "3 mon…" and "…year"). Bottom offset ≈ 24 pt above the home indicator.
- **8-pt base:** 8 / 12 / 16 / 24 / 40 / 44 recur.

### How the system adapts between mobile and desktop

| Aspect | Desktop | Mobile | Rule to extract |
|---|---|---|---|
| Title | one line 48/500 | two lines 38/600 | Display text may break to 2 lines; increase weight one step when smaller |
| Hero score | 80/700, gauge fully shown to its right | 72/700, gauge partially off-screen | Decorative instruments may bleed; keep the number fully visible |
| Bureau chips | 34 px tall, 13 px label | 50 pt tall, 14 pt label | Chip height scales with input mode (pointer 36 → touch 48+) |
| Circle controls | 40 px | 52 pt | Circles scale 40 → 52 for touch; icon stays 18 |
| Summary cards | 2 side by side, fixed | horizontal carousel with peek | Same card, same content, only the container changes |
| Factor grid | 3 × 2 always visible | hidden behind the toolbar's "grid" tab | Secondary content becomes a tab, not a smaller grid |
| Score History | persistent dark band, left column | draggable dark sheet with notch | The dark band *is* the sheet; on regular widths it is docked |
| Navigation | top-centre pill tabs (solid black active) | bottom floating pill with 4 round icon buttons (solid white active) | Same "one solid, rest hairline" logic, inverted polarity on dark |
| Card order | Net Worth, Total Dept | Total Dept (with alert) first | On compact, the card carrying an alert leads the carousel |
| Blob | top-centre-right, behind the gutter | top-right, behind the hero and gauge | Blob anchors to the hero, not to the viewport |
| Padding | 24 px card / 36 px page | 20 pt card / 16 pt page | Two spacing scales, both 8-based |

---

## Components

| Component | Variants / states observed | Spec (desktop px / mobile pt) | Frames |
|---|---|---|---|
| **Circle control – solid** | Primary "open" (↗ arrow) on white cards; inverted (white fill, black arrow) on image/glass cards; logo circle in header (black, white building glyph); mobile header logo | 40 / 52; glyph 16–18 px, 1.25 px stroke | d02, d04, d06, m00, m03 |
| **Circle control – ring** | Icon holder on cards (hairline `#C8C8C8`, black 1.25 px line icon); header actions (menu, three utility icons); close × on dark (white 28 % ring, thin ×); ring on glass (white 40 %); offer-card **partial ring** (≈ 300° arc, 1.5 px white, gap at ~2 o'clock — reads as eligibility/progress) | 40 / 52 (48 for ×); 1 px stroke | d06 header, m01, m05, d03 |
| **Alert badge** | Orange rounded-triangle with white "!"; overlaps the icon ring at its top-right (offset −4, −4) | 18 px; `#F0501E` | m00, d02 |
| **Chip / segmented pill (bureau)** | Active: 1 px ink stroke + ink text; Inactive: 1 px `#C8C8C8` stroke + `#8A8A8A` text. Only two items; behaves as a segmented control without a track | 34–36 px h, 16 px h-padding / 50 pt h, 24 pt h-padding; 8 px gap | m02, d06 |
| **Nav pill tabs (desktop)** | Selected: solid `#0C0C0C`, white label; unselected: hairline ring, ink label | 36 h; selected 98 w; 8 gap; centred on viewport | d06 header |
| **Period chips (dark)** | Selected: 1 px white stroke + white text; unselected: white 28 % stroke + white 70 % text | 30–34 h; 8 gap | d01 |
| **Floating toolbar (mobile)** | Dark pill container; 4 round buttons: selected = solid white with black filled icon; others = white 28 % ring with white filled icon (building, people, sliders) | 60 pt h container, 44–48 pt buttons, 8 pt gap, 8 pt inset | m01, m05 |
| **Summary card** | Default; with alert badge; glass variant (promo) | 258×140 / 224×165; r 28; p 24 / 20; icon ring TL, solid button TR, two-line label BL, mixed-weight value BR | d02, m03, m06 |
| **Factor card** | White; image/glass ("Credit Card Use"); each with a distinct mini-chart glyph | 250×215; r 28; p 24; title 18/400; value 40/500 + unit | d04, d06 |
| **Offer card** | Image-fill (three photo moods); partial-ring icon + 2-line bank name; "Rate / Period" caption pair with 32/300 values | 250 w; r 28; p 24; captions white 60 % | d03, d06 |
| **Gauge (hero instrument)** | Track + progress arc + needle; see Charts | arc radius ≈ 120 px / 110 pt | d02, m00 |
| **Section header** | Title 24/500 + inline stat (24/500 + 12/400 muted) + trailing ring arrow button or chips | 48 px from band top | d03, d06 |
| **Tooltip (chart)** | `#1F1F1F`, r 12, p 16, close × 14 px top-right; value 24/500, delta 11 with ↗, caption 12 grey | 160×80 | d01 |
| **Bottom sheet / dark band with notch** | Docked band (desktop), draggable sheet (mobile); concave notch with 40×3 handle | notch ≈ 120 w × 12 deep, 20 fillets | m03, d03 |
| **Avatar + identity** | 36 px round photo, name 13/400, role 11/400 grey, right of the utility icons | — | d06 header |
| **Wordmark lock-up** | Ring menu button 36 + solid logo circle 36 + "creditkarma" 16/500 | 8 px gaps | d06 header |
| **Card carousel (mobile)** | Edge-to-edge horizontal scroll, 12 pt gap, peek ≈ 40 pt | — | m04, m05 |
| **Drag handle** | 40×3 black line inside the notch (on the light side) | — | m03, d03 |
| **Status bar** | System iOS (SF Pro), black on the light gradient | — | m05 |

---

## Charts

All charts are **monochrome**: black on white, white on dark, with orange used only as a marker. There are no axes on the card mini-charts, no gridlines anywhere, no fills/areas, no legends.

| Chart | Where | Styling (exact) |
|---|---|---|
| **Score gauge** (semicircular, top-right quadrant only) | Hero, both platforms | Track: ~14 px wide arc at ink 8 % (looks like a soft grey ribbon, slightly blurred edge, on desktop it fades out toward the left end); progress: 3 px ink arc from the 12 o'clock point clockwise ≈ 40°, round caps; a 1 px hairline continues the arc below the progress; needle: 1 px ink line from the arc centre to the arc, with a 6 px filled triangular arrowhead at the outer tip and a 3 px dot at the pivot; no tick marks, no numbers on the arc — the value is the 80 px numeral beside it. Mobile crops ~40 % of the arc off the right edge. |
| **Score History step chart** | Dark band (desktop, left column) / bottom sheet (mobile) | Horizontal **level segments**: 3 px, white 60–70 %, round caps, lengths = duration; **vertical drops**: 1 px dashed (4/4) white 33 % from each level up to a **peak tick**: 24×4 px rounded bar in orange `#F0501E` marking the event/peak; y-axis labels 850 / 800 / 750 at 11 px white 42 % on the far left, no axis line; no x labels visible in the frames; tooltip `#1F1F1F` r 12 anchored above the selected segment with a close ×. Reads as "steps between reports" rather than a continuous line — honest for monthly scores. |
| **Dot-scale (utilization)** | Credit Card Use card (image fill) | A 1 px white line with 5 dots: 6 / 16 / 6 / 6 / 22 px; the 16 px dot is lavender-white ≈ 60 %, the 22 px end dot solid white — a position-on-a-scale glyph for 9 %. |
| **Mini bars** | Payment History | 6 bars, 3 px wide, 6–28 px tall, round tops; recent/high bars ink, older bars grey 40 %; a 1 px baseline grey 25 % spanning ~80 px. |
| **Ring row** | Derogatory Marks | 5 hollow circles 18 px, 1 px stroke grey 40 %, the last one 1.5 px ink — "0 marks, current period highlighted". |
| **Smooth line with peak dots** | Credit Age | 1 px ink sinusoid ~110 px wide, 2 filled 6 px dots on peaks. |
| **Arch/square-wave line** | Total Accounts | 1 px ink "coil" of 5 arches; under each trough a 3 px heavy ink dash — reads as open accounts over time. |
| **Dot matrix** | Hard Inquiries | 2 rows × 7 columns of 5 px dots, mixed hollow (grey 40 % ring) and filled (ink) — a calendar heat of inquiries. |
| **KPI mini-bars (off-family, Navexa still)** | mobile/08.png | green 2 px bars, red for negative; delta chips ▲/▼; for house-style corroboration only. |

Chart rules that fall out of this: (1) mini-charts are 32–40 px tall, right-aligned, baseline-locked to the number; (2) one glyph type per metric so the six cards are distinguishable at a glance without colour; (3) on dark, the "ink" becomes white 60–70 % and the single highlight is orange; (4) markers are short rounded bars, not circles, when they mark a moment on a time axis; (5) no gradients, no area fills, no drop shadows on lines.

---

## Iconography

- **Content icons** (inside hairline rings): thin outlined line icons, ~18 px on a 40 px ring (mobile ~20 pt on 52 pt), **1.25–1.5 px stroke**, rounded joins, slightly illustrative "sticker" detail: calendar with a "$" coin, credit card with a "↓" coin, wallet, hand with coins, clock with "$", banknote, house with "%", hand receiving a bill. Monochrome ink on light; white on glass. They are richer than a stock icon set (each has a second tiny symbol) — closer to a custom 24-grid line set than to Lucide/Phosphor Thin, but Phosphor Light / Lucide at 1.25 px are the nearest open substitutes.
- **Navigation icons** (mobile toolbar, header logo): **filled** glyphs — 4-square grid, building, two-person silhouette, sliders — 18 pt, solid white (or black on the white active circle). The filled/outlined split maps to navigation/content.
- **Arrows:** the "↗" open arrow is a thin 1.25 px two-stroke chevron-and-shaft, ~14 px, centred in the 40 px circle; the delta "↗" in the tooltip is the same glyph at 10 px. Close "×" is 14 px 1 px.
- **Badge:** the orange alert is a soft rounded triangle, not a circle — deliberately a different silhouette from every other control.
- **Menu:** a 3-line "≡" with a shorter middle line, 1.25 px.

---

## What makes it beautiful

1. **One light source instead of a palette.** The whole colour budget is spent on a single warm amber blob (`#C86A2C → #E2A634 → #E6CF6A → page`) behind the hero. Everything else is black, white and neutral grey, so the blob reads as *light*, not as decoration, and the black hero numeral sitting half on it looks lit.
2. **6.7× type scale contrast, on one baseline.** 80 px / 700 hero beside 12 px / 400 grey captions whose baseline is locked to the hero's baseline. The scale is extreme but the alignment is strict, which is why it reads as calm rather than loud.
3. **Mixed-weight numerals.** "$ 137,036" set as grey-light `$` · bold `137` · light `,036` on one baseline. The eye lands on the three significant digits; the rest is present but quiet. Same trick at 40 px ("100 %") and 30 pt on mobile.
4. **A strict circle grammar.** Every control is a 40 px (52 pt) circle: hairline ring = passive/secondary, solid black = the one action, and on a vivid surface the polarity flips to solid white. Because there is only one solid circle per card, the eye always knows where to tap.
5. **Cards with an empty middle.** Factor cards are 250 × 215 px with the top row (icon + button), a title, and then *nothing* until the number at the bottom. The whitespace is the luxury; it is also why six cards in a grid don't feel dense.
6. **No shadows, ever.** Elevation is done with value (white on `#E6E7E8`, `#1F1F1F` on `#0E0E0E`), overlap (toolbar over chips, badge over ring) and the physical notch on the sheet. The result looks printed, not stacked.
7. **Six monochrome chart glyphs.** Each factor gets its own tiny abstract visual (dot-scale, bars, rings, sinusoid, arches, dot matrix) in 1 px black. They are legible as *kinds* of data at a glance, and they cost zero colour.
8. **Light dashboard over a dark instrument band, on the same grid.** The top 76 % is airy and light; the bottom is `#0E0E0E` with the chart and offers. The two halves share exact column edges (508 / 104 / 760), so the split feels like a single object with two materials — this is the owner's Family A and Family B on one screen.
9. **Vivid surfaces as accents, one in six.** Only "Credit Card Use" and the three offer cards get photo-blur fills. Because they are rare, they carry attention like a highlighter; and because their text stays white and their button inverts, they still obey the system.
10. **Signal orange in micro-doses.** An 18 px badge, three 24 × 4 px ticks, one "+14 %". Nothing else is orange, so the badge is unmissable.
11. **The notch.** The dark band's top edge dips around a 40 × 3 px handle. It is the only ornamental shape on the page, it explains the interaction (drag), and it repeats identically on desktop as a docked band — a detail that reads as craft.
12. **Compositional crop.** The gauge bleeds off the right edge on mobile; the offers overflow the fold on desktop. Cropping large decorative elements makes the layout feel bigger than the viewport.
13. **Film grain on the gradient.** A few percent of noise stops the blob from looking like a Figma radial and gives the light theme the same tactility as the dark photo cards.
14. **Capsules everywhere, but tall.** 50 pt chips on mobile, 36 px on desktop, always hairline; the generous height is what makes the hairline read as elegant rather than fragile.

---

## Accessibility risks

Ratios computed from the sampled/corrected hexes.

1. **Muted grey captions on the light page fail AA.** "Excellent / Checked Daily", "pts", "TransUnion" at `#8E8E8E`–`#999B9A` on `#E6E7E8` ≈ **2.2–2.6:1** at 12–14 px. Fix: `#606060` on the page (≈ 5.0:1) / `#707070` on white cards (4.95:1). Keep the *look* by lightening the weight (300) rather than the colour where ≥ 24 px (3:1 allowed by the Prism rule).
2. **Tertiary greys (`#B0B0B0`–`#B7BABA`) for "$", "Years", "%"** are ≈ 1.5–1.9:1. Acceptable only when they are attached to a passing number (the unit is not the information); still lift them to ≥ 3:1 (`#8C8C8C`) for units that change meaning ("%", "month").
3. **Hairline rings `#C8C8C8` on white are 1.7:1** — below the 3:1 non-text minimum. The icon inside is black (passes), but the *button boundary* is invisible to low-vision users. Fix: ring at `#8C8C8C` (3.4:1) or treat the ring as decorative and give the icon a 44 pt hit area.
4. **Inactive chip stroke `#BDBDBD` on `#E6E7E8` is 1.5:1**; selection is conveyed only by stroke darkness (black vs light grey). Add a fill (ink 6 %) or a bolder label to the selected chip.
5. **Orange on white is 3.6:1** — passes for graphics/large text, fails for 11–14 px text. The badge's white "!" on orange is also 3.6:1 (icon only, acceptable). If orange ever carries small text, darken to `#D9400F` (4.5:1).
6. **Dark band small text:** axis labels white 42 % (`#6A6A6A`) = 3.6:1 at 11 px — fail; dashed guides 2.8:1 — fine as decoration. Fix: labels at white 70 % (9.7:1).
7. **White text on photo-blur cards is unbounded.** Goldman (5.3:1) and JPMorgan (5.7:1) pass, but Bank of America's olive-lime highlight is 3.5:1 for the 16 px name and the 60 % captions drop to **2.3:1**; the steel-blue region of "Credit Card Use" gives 2.4:1 for white. Fix: a bottom-up scrim (black 0 → 35 %) behind text, or clamp image luminance to ≤ 45 % where text sits, and captions at ≥ 80 % white.
8. **Promo glass body `#9B9A8C` with white text = 2.8:1.** Glass over light photo regions needs the same scrim rule; this is exactly why Prism restricts glass to imagery/vivid surfaces and specifies a haze token.
9. **Thin 300-weight numerals at 22–24 px** (",036") have adequate colour contrast but low stroke contrast; keep ≥ 22 px and never use 300 below 20 px.
10. **Hidden chips under the floating toolbar (mobile).** The period chips are partially covered; VoiceOver users hear them, sighted users can't read them. Either collapse the toolbar to the active icon at rest or move the chips above the toolbar.
11. **Sparkline glyphs have no accessible name.** They are decorative; ensure the card exposes "Payment History, 100 %" and marks the glyph `accessibilityHidden` / `aria-hidden`.
12. **Gauge bleeds off-screen on mobile** — fine for sighted users because the number is beside it, but the gauge must not be the only place the range (300–850) is communicated.
13. **Touch targets** are fine (44–52 pt); desktop 36 px chips are below the 44 px AAA target but meet AA (24 px).
14. **Colour-only status is avoided** (the badge has a glyph; charts are monochrome) — good; keep it that way when adding green/red.

---

## Principles to carry into Prism

1. **Two neutral grounds, one ink.** `surface.page = #E6E7E8` (light) / `#0E0E0E` (dark); `surface.card = #FFFFFF` / `#1F1F1F`; `ink = #0C0C0C` / `#FFFFFF`. Greys are dead-neutral (no blue cast) so that brand colour reads as colour. No shadows on content surfaces; elevation = value contrast + overlap.
2. **Radius scale anchored at 28.** `radius.card = 28` (px and pt), `radius.sheet = 28`, `radius.tooltip = 12`, `radius.pill = 999`, `radius.badge = 4`. Circles are always full.
3. **The "one light source" rule.** At most one brand gradient blob per screen: radial, 4 stops (`#C86A2C 0 % → #E2A634 30 % → #E6CF6A 60 % → page 100 %` for the default warm brand), ~45 × 60 % of the viewport, anchored to the hero (top-right on compact, behind the column gutter on regular), 100 px blur, 4 % grain. It may sit behind black text (≥ 6.7:1) but never behind hairlines or grey captions.
4. **Signal colour in micro-doses.** One accent (`signal = #F0501E`, darken to `#D9400F` when it carries text) used only for alert badges, chart peak markers and deltas. Green/red only for status dots. Charts are otherwise monochrome.
5. **Vivid/glass is an accent surface, max 1 in 6.** Vivid = photo-blur or brand gradient fill, blur 40–60 px, bottom scrim black 0 → 35 % under text. Glass = backdrop blur 30 px + white haze 18 % + 1 px top specular white 25 %, only over imagery/maps/vivid. Text white ≥ 80 %; the solid circle inverts to white; rings go to white 40 %.
6. **Circle control grammar.** Size 40 px (pointer) / 52 pt (touch), icon 18, stroke 1.25. Variants: `ring` (1 px ink 20 %, or `#8C8C8C` in the a11y tier), `solid` (ink fill, inverse glyph), `inverted` (white on vivid). Exactly one `solid` per card.
7. **Chips are tall hairline capsules.** Height 36 (pointer) / 48–50 (touch), 16–24 px h-padding, 8 px gap, 1 px stroke; selected = ink stroke + ink label (+ ink 6 % fill in the a11y tier); primary nav selected = solid ink fill. Never a filled track behind a segmented group.
8. **Type scale (Poppins-class geometric; Outfit acceptable as open substitute; SF Pro for system chrome).** hero 80/700 (regular) · 72/700 (compact), tracking −2 %, lh 1.0; display 48/500 · 38/600; section 24/500 · 22/500; card-title 18/400; label 16/400 (two-line lh 1.1); body 14/400; caption 12/400; micro 11/400. Muted text `#606060` on page, `#707070` on white, white 70 % on dark.
9. **Numeral treatment token set.** `number.major` 700 at 1×; `number.minor` 300 at 0.7×; `number.currency` 300 grey at 0.65×; `number.unit` 400 grey at 0.35×; all baseline-aligned, 4–6 px gaps; proportional figures for display, tabular for tables. Deltas use a thin "↗/↘" glyph, not a coloured chip.
10. **Card anatomy.** Padding 24 (regular) / 20 (compact); top row = ring icon left + solid action right; title 40 px below; value bottom-left; mini-chart bottom-right, 32–40 px tall, baseline-locked to the value. Summary cards 258 × 140 / 224 × 165; factor cards 250 × 215; grid gutter 12.
11. **Micro-chart glyph library (monochrome).** `dotScale`, `miniBars` (3 px, round tops, baseline 25 %), `ringRow` (18 px rings), `peakLine` (1 px + 6 px dots), `archLine` (1 px + 3 px heavy troughs), `dotMatrix` (5 px, 2 × 7). Ink on light, white 60–70 % on dark, orange for the single highlight. No axes, fills, or gradients.
12. **Step chart spec (history on dark).** Level segments 3 px white 65 %, round caps; drops 1 px dashed 4/4 white 33 %; peak marker 24 × 4 px orange; axis labels 11 px white 70 % (a11y tier), no axis lines; tooltip `#1F1F1F` r 12 p 16 with 24/500 value, 11 delta, 12 caption, close ×.
13. **Gauge spec.** Quarter-to-half arc, radius 110–120; track 14 px ink 8 %; progress 3 px ink, round caps; needle 1 px with 6 px triangular tip and 3 px pivot dot; no ticks; the numeral carries the value. Allowed to bleed off the edge on compact.
14. **Docked band ↔ sheet.** A screen may host a dark band below a light dashboard at ~75 % height; it shares the page's column grid; its top edge carries a concave notch (120 × 12, 20 px fillets) with a 40 × 3 handle. On compact widths the same band is a draggable sheet.
15. **Compact adaptation rules.** Titles may break to 2 lines (+1 weight step); side-by-side summary cards become an edge-to-edge carousel (gap 12, peek 40); a visible grid becomes a tab behind a floating toolbar; chips 36 → 48; circles 40 → 52; nav moves from top-centre pills to a bottom floating dark pill (60 pt, 44–48 pt buttons, selected = solid white); the card carrying an alert leads the carousel.
16. **Layout constants (regular).** Page margin 36; header 36 tall; two columns 35 % / 53 % with a 7 % gutter (the gutter is where the blob and instruments live); nothing centred except primary nav. **Compact:** margin 16, card padding 20, 8-pt rhythm.
17. **Iconography.** Outlined 1.25–1.5 px line icons with one secondary micro-symbol for content; filled glyphs for navigation; thin ↗ for "open"; the alert badge is a rounded triangle so it never looks like a control.
18. **Accessibility tier baked in.** Ship the tokens above with an `a11y` variant (muted `#606060`/`#707070`, rings `#8C8C8C`, selected-chip fill, scrims on vivid, 70 % white on dark) so the "beautiful" defaults degrade to WCAG AA without redesign; large decorative numerals may sit at 3:1 when ≥ 24 pt.
