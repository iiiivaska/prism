# Reference analysis: Soma — Glucose Monitoring Mobile App (RonDesignLab)

Source: Dribbble shot 27706847, "Soma - Glucose Monitoring Mobile App", Jack R. for RonDesignLab.
Directory: `/private/tmp/claude-501/-Users-iiiivaska------------DesignSystem/227d77e4-5a98-4f87-b183-5ca17e04077d/scratchpad/research/refs/soma-mobile`
Zoomed crops used for this analysis: `/private/tmp/claude-501/-Users-iiiivaska------------DesignSystem/227d77e4-5a98-4f87-b183-5ca17e04077d/scratchpad/research/out/_soma_crops/`

Method. Every still was viewed at full size (2000 px wide), then key regions were cropped and enlarged 2–4x, and colors were measured from lossless BMP conversions (median for surfaces, darkest/lightest cluster for glyphs, most-saturated cluster for accents). All hex values below are **measured** unless marked "est.". The mockups are photographic (angled phone, shallow depth of field), so point sizes are converted with a measured scale of ~1.8–1.9 mockup px per device pt (screen width ≈ 710–740 px in frames 00/05 = 393 pt) and corrected for tilt; treat sizes as ±2 pt.

Frame inventory:

| Frame | Content | Notes |
|---|---|---|
| 00 / 06 | "CGM Device" screen, lower two thirds: pale-yellow sensor card with three hero metrics, three dotted-leader spec rows, bottom dock (help / dark scan pill / filters) | 00 and 06 are byte-identical |
| 01 | Macro of the sensor card: "Expiration 11 / 14 d", "Accuracy 98 %", spec rows, dock | Best view of letterforms and the dotted leaders |
| 02 | Macro of the sensor line drawing: concentric rings, gradient dot matrix, center chip glyph, refractive "Diam 35 mm" chip | Best view of the "lens" chip and the dot-grid canvas |
| 03 | Top of the screen: iOS status bar, round back button, centered title "CGM Device", round sliders button, callout chips, dot-grid page | Header anatomy |
| 04 | Alternate illustration state: exploded side view + front ring; chips anchored with small refractive ring markers; status dot **green** | Motion hint (state morph) |
| 05 | Two-hand shot, full screen, finger on the drawing; status dot **yellow** | Most frontal shot; used for scale |
| 07 | Promo frame "Save this design": dark glass GLUCOSE widget over a blurred photo on an olive ground | Only chart in the set; glass recipe |
| 08.mp4 | skipped (video) | |
| 09 (video still) | **Different product**: "Navexa Warehouses" light web dashboard (isometric warehouse map, KPI row with sparklines, glass sidebar, chart cards) | Same studio DNA; used as secondary evidence only |

Relation to the owner's pasted screenshots (`USER_PASTED_SCREENSHOTS.md`): Soma is the mobile expression of Family A (light, near-white grey ground, geometric rounded sans, thin hero numerals with tiny grey units, pill chips, 44 pt round icon buttons, one accent used sparingly). The promo widget in frame 07 is the bridge to Family B (dark glass over imagery, hairline white chart, single warm accent for "now").

---

## 1. Overview

Soma is a **light, airy, "soft-technical"** mobile UI. The screen reads like an instrument datasheet turned into a consumer product: a technical line drawing of the CGM sensor sits on a fine dot-grid page, annotated with floating spec chips; below it one **tinted sheet card** (pale yellow with a radial light) holds the numbers.

Five moves define the look:

1. **One tinted content surface** on a neutral #F4F4F4 page. Everything else is grey or ink. The tint is the brand accent (highlighter yellow, hue ≈ 60°) diluted to ~10%.
2. **No borders anywhere.** Chips, buttons and the card are separated from the page by ≤ 2 luminance steps plus soft shadows and inner highlights. The only hard edge on the screen is the dark primary pill.
3. **Hero-numeral typography.** Light-weight geometric numerals (~40 pt) with tiny grey units hung on the baseline ("11 / 14 d", "98 %", "43 times"), labels in grey above, values in near-black. Hierarchy comes from size and ink level, not color.
4. **Puffy round controls.** 44 pt circular icon buttons that look pressed out of the page (white at ~70% with a top inner highlight and a soft outer shadow), and a single dark, warm-black pill as the primary action.
5. **Datasheet cues used decoratively.** Dotted leaders between label and value, a dot-grid canvas, 0.75 pt line drawings, spec chips with a leading bullet, "Mass 4.2 g / Prot IP68 / Lev 3.2" data — all of it technical, none of it cold.

The one dark artefact (frame 07) shows the same system on smoky glass: white hairline chart, dashed grid, one yellow "now" marker.

---

## 2. Color

### 2.1 Page and neutrals (light)

| Role | Measured | Notes |
|---|---|---|
| Page ground | **#F4F4F4** (range #F2–#F5) | Neutral, very slightly warm after JPEG; treat as pure neutral |
| Dot-grid dots | **#ECECEC** | 1.07:1 against the page; ~4% ink |
| Callout chip surface | **#F5F5F5** median, **#FFFFFF** at the top highlight | Reads as white at 60–70% over the page + inner top highlight; 1.01:1 vs page — separation is entirely shadow/highlight |
| Round icon button surface | **#F4F4F4** median, **#FEFEFD** highlight; on the card **#F6F5EF** / **#FFFFFB** | Same recipe as chips, larger; soft shadow below-right (est. rgba(0,0,0,0.06–0.08), blur ~16) |
| Dynamic Island / status pill shadow | #E8E8E8 | |
| Dark primary pill | **#201C1B** | Warm near-black (not #000) |
| Sensor drawing lines | **#262424** at 0.75–1 pt | |
| Dot-matrix dots (dark end) | **#737172** fading to #ECECEC | Gradient of ink 55% → 4% |

### 2.2 The tinted card (the only colored surface)

Measured across the card: edges **#F4F3E1** (top) / **#F4F5E6** (bottom-left), mid **#F7F7D5**, brightest center **#FFFFE6**. That is a pale-yellow base with a **radial light** ~40% white at the center fading by ~55% of the width.

Recipe (est.): `background: radial-gradient(ellipse 70% 55% at 45% 38%, #FFFFE8 0%, #F7F7D6 45%, #F3F3E0 100%)`. Equivalent token math: brand-yellow #FDFE76 at ~10% over white, plus a white radial highlight. Contrast card vs page: 1.01:1 — the card is separated by hue, not luminance; there is no border and no visible drop shadow (a faint one at the top edge at most).

### 2.3 Ink ramp (text on the card / page)

| Level | Measured | Used for | Contrast on card #F5F5DC |
|---|---|---|---|
| Ink 100 | **#0A0606** / #020000 | hero numerals, row values, uppercase card title | 18.2:1 |
| Ink 90 | #25211F | page title "CGM Device" (through blur; est. #1A1A1A) | 14.5:1 |
| Ink 70 | #646263 / #67645D | chip labels ("Mass", "Prot"), "Gen 3" | 5.3–5.5:1 |
| Ink 60 | **#686756** | metric labels ("Accuracy", "Metering") | 5.2:1 |
| Ink 50 | #7C7A6B | "Active" | 3.9:1 |
| Ink 40 | **#908E81** / **#979686** | row labels ("Signal", "Expires", "Last sync"), units ("/ 14 d", "times") | 2.7–3.0:1 |
| Ink 30 | **#B0AE95** / #B0B0B0 / #ABAAAA | unit "%", chip values ("IP68", "4.2 g", "13.56MHz") | 2.0–2.2:1 |
| Leader dots | #555245 | dotted leaders | 7.1:1 |

All greys on the card are warm (G ≥ B, R ≈ G), i.e. the ink is mixed *with* the card tint, not laid over it. On the neutral page the same levels are neutral greys.

### 2.4 Accents

| Role | Measured | Notes |
|---|---|---|
| Brand / "live" yellow | **#FDFE76** (dot), #FAFA74 (chart marker), #DFE067 (delta triangle on glass) | A highlighter yellow, hue 60°, S ≈ 53%, L ≈ 73%. Used only as 6 pt dots, the chart marker and the card tint. Never as text. |
| OK green | **#45CB34** (#3DCA30 saturated core) | Status dot in frame 04, with a soft green halo |
| Warm black | #201C1B | Primary pill |
| White | #FFFFFF | Only as highlights, the scan glyph and text on glass |

No red, orange or blue appears anywhere in the Soma frames. The studio's other work (Navexa still, Vexto in the owner's screenshots) uses: green **#01A92B** / #229F3A (success, bars, lines), red **#FB382F** (error), blue **#3E8EEE** (map racks), orange ≈ #F5A14B (attention) — always as small badges, dots, pills or single chart series, never as large fills.

### 2.5 Promo frame (07) — glass over imagery

| Element | Measured |
|---|---|
| Ground (photo + olive wall) | #CBCD82 top → #BEBF7B mid → #9E9C63 bottom; dark blurred figure #2A2622 |
| Glass over the dark region | **#443E34** median (a warm dark grey) |
| Glass over the olive region | **#A49A5C** (the olive shows through, desaturated and darkened) |
| Glass inner edge, top | #B5B29B (≈ white 25% over the glass, 1 px) |
| Glass inner edge, left | #8F8A82 (≈ white 15%) |
| Hero "149" | #FFFFFF |
| Unit "mg/dl" | #9E9B95 (white ≈ 55%) |
| Delta text "6 from 1h ago" | #D1CDC8 (white ≈ 80%) |
| "Active" | #ABA7A2 (white ≈ 65%) |
| Axis labels | #857F77 (white ≈ 45%); "160" over the olive zone #C4C5A3 |
| Dashed grid | ≈ white 35%, 1 px |
| Chart lines | #FEFFFC (white ≈ 95%) and a second line at ≈ 60% |
| Marker halo | #5C584B (≈ white 12% disc) |

Reading: the glass is roughly `rgba(20,16,12,0.55)` + `backdrop-blur ≈ 40 px` + `saturate 0.8`, with a 1 px inner light edge that is brightest at the top and fades down the left side (light from top-left).

### 2.6 Navexa still (09) — secondary evidence, light web

Page **#FAF9FC** (cool white), outer frame #BFC5C9, active nav pill #F9F8FD (white) vs inactive #E8E9EE, nav text #46454A, headings #191D1F, KPI labels #84888A, light glass sidebar #F4F6F6 (white ≈ 70% + blur ≈ 30 px), success #01A92B, error #FB382F, blue #3E8EEE, ghost bars #D9DBDE (est.).

---

## 3. Surfaces & Depth

Depth model: **four levels, no borders**.

| Level | Surface | Radius | Border | Shadow / highlight | Blur | Opacity |
|---|---|---|---|---|---|---|
| 0 | Page #F4F4F4 with dot grid (1.5 pt dots, ~14 pt pitch, #ECECEC) | — | — | — | — | — |
| 1 | **Tinted sheet card** (pale yellow, radial light) | ~28 pt top corners; bottom bleeds under the dock / off-screen | none | none visible (est. 0 1 0 rgba(255,255,255,0.6) inner top at most) | none | opaque |
| 2 | **Spec chips** (pill) | full (12 pt on 24 pt height) | none | outer 0 2 6 rgba(0,0,0,0.05) (est.); inner top highlight white 80% 1 px | none, except the "lens" variant | white ≈ 65% over page |
| 2 | **Round icon buttons** (44 pt) | full | none | outer 0 6 16 rgba(0,0,0,0.07) (est.), tighter at the top; inner top highlight white 90%; faint darker rim bottom-right (#E8E8E8) | none | white ≈ 70–80% |
| 2 | **Dock tray** (capsule behind help / scan / filters) | full (~32 pt on ~64 pt height) | none | very soft; reads as a lighter band | none | white ≈ 35–40% over the card |
| 3 | **Dark primary pill** | full (28 pt on 56 pt height) | none | none (its darkness is the depth) | — | opaque #201C1B |
| 3 | **Refractive "lens" chip** (frame 02/04 "Diam 35 mm", ring markers) | full | none | same as chips + a specular sweep and chromatic-aberration smears (blue/orange fringes) where the chip crosses the drawing's dots | small (≈ 2–4 px) refraction of what is behind | white ≈ 55% |
| 3 | **Dark glass widget** (frame 07) | ~28 pt | 1 px inner light edge (white 25% top → 15% side → 0 bottom) | none | ≈ 40 px backdrop blur | black ≈ 55% |
| 2 | Navexa light glass sidebar (09) | 20 px | none | 0 8 24 rgba(0,0,0,0.06) | ≈ 30 px | white ≈ 70% |
| 1 | Navexa cards (09) | 16–20 px | none | 0 4 16 rgba(0,0,0,0.05) | none | white ≈ 85–95% (slightly translucent over the map) |

Observations:

- **The "puffy" control recipe** (chips and round buttons) is the signature: the surface is *lighter* than the page by only ~1%, so the shape is defined by a soft shadow underneath and a 1 px white highlight along the top edge. It reads as a physical button pressed out of soft-touch plastic, matching the sensor's disc form.
- **Materials are chosen by role**: solid tint for content that must be read (the card), translucent white for controls that float over content, dark opaque for the one primary action, dark glass only when the surface sits over imagery (the promo photo). This maps exactly onto the Prism decision (solid / vivid / glass; glass only over imagery, maps or vivid).
- The **radial light** on the card is the only "lighting" effect on content; it is subtle (center +4% luminance) and off-center (45% / 38%), which is what makes the card feel lit rather than gradient-filled.
- Everything is warm: the near-black is #201C1B, the greys on the card carry the yellow, the glass is brown-grey. No pure #000 and no large pure #FFF fills.

---

## 4. Typography

### 4.1 Family

One family throughout. Letterform evidence from the macro crops (`c00_hero.png`, `c00_rows.png`, `c03_header.png`, `c02_chip.png`):

- single-storey **a** ("Accuracy", "Mass", "days ago", "Diam"), single-storey **g** ("Metering", "ago"), near-circular bowls in **C/G/O/9/8/%**, flat-topped narrow **t** ("Metering", "times", "Strong"), straight-tailed **y** ("days", "sync"), the **1** has a flag and no foot ("11", "11 days ago", "13.56MHz"), the **M** in "SOMA" has vertical stems, the **R** has a straight diagonal leg, low stroke contrast, generous x-height.

This matches **Outfit** most closely (Light 300 for the numerals, Regular 400 for text, Medium 500 for the page title). **Urbanist** is the runner-up (same skeleton, slightly narrower). **Poppins** is close in skeleton but its counters are wider and more mechanical and the default text weight heavier; **Inter, SF Pro and Helvetica Neue are ruled out** by the single-storey a and the circular bowls. The promo headline "Save this design" (frame 07) is the same family at Bold/ExtraBold. The Navexa still (09) uses the same family for headings and Inter-like text for table cells.

### 4.2 Scale (device pt, converted; ±2 pt)

| Role | Size | Weight | Color | Case / tracking |
|---|---|---|---|---|
| Hero metric numerals ("11", "98", "43") | **40** (36–44) | Light 300 | ink 100 | lining, proportional, tight |
| Metric unit ("/ 14 d", "%", "times") | 11–12 | Regular | ink 30–40 | hung at the numeral baseline, 2–3 pt gap |
| Metric label ("Expiration", "Accuracy") | 13 | Regular | ink 60 | sentence case |
| Card title ("SOMA 3 SENSOR") | 14–15 | Regular/Medium | ink 100 | **uppercase, +2–3% tracking** |
| Card sub-line ("· Gen 3", "Active") | 13 | Regular | ink 60 / 50 | |
| Spec row label ("Signal", "Expires", "Last sync") | 15 | Regular | ink 40 | |
| Spec row value ("Strong", "Jun 8, 09:14", "11 days ago") | 15 | Regular | ink 100 | right-aligned |
| Callout chip label ("Mass", "Prot", "NFC Sync") | 12 | Regular | ink 70 | |
| Callout chip value ("4.2 g", "IP68", "13.56MHz") | 12 | Regular | ink 30 | |
| Battery "81%" | 12 | Regular | ink 100 | |
| Page title ("CGM Device") | 17 | Medium | ink 90 | centered |
| Status bar time | 15–16 | Semibold (system) | #131313 | |
| Glass widget label ("GLUCOSE") | 13 | Regular | white | uppercase, +3% |
| Glass widget hero ("149") | 40–44 | Light | white | |
| Glass widget unit ("mg/dl") | 13 | Regular | white 55% | hung |
| Glass widget delta ("6 from 1h ago") | 12 | Regular | white 80% | |
| Chart callouts (">20", ">10") | 11 | Regular | white 90% | |
| Chart axis | 10 | Regular | white 45% | |
| Promo headline | ~190 | Bold | white | |

### 4.3 Numerals

- **Thin display numerals**: Light weight at 40 pt, the thickest strokes on the screen are the "SOMA 3 SENSOR" caps, not the numbers. The numerals get their weight from size, not stroke.
- **Hung units**: units are ~28% of the numeral size, in ink 30–40%, baseline-aligned with a 2–3 pt gap ("98" + "%", "43" + "times"). The fraction "11 / 14 d" uses a spaced slash.
- **No dimmed decimals in Soma** (all integers) — but the studio pattern exists elsewhere (Vexto "78.3%", Navexa "125.32"): the integer part in ink 100, decimals or the trailing group in ink 40.
- **Proportional, not tabular**: "11" is visibly narrower than "98". For Prism, use tabular figures in tables and timers only; hero metrics can be proportional.
- Times ("09:14") are set with a colon, no leading zero suppression.

### 4.4 Hierarchy mechanics

Only three weights (300/400/500) and one family; the hierarchy is built from **size contrast (40 vs 11 pt ≈ 3.6×)** and **ink level (100 / 60 / 40 / 30)**. Color is never used for text emphasis. Uppercase is used exactly once per card (the title), which is why it reads as a label rather than shouting.

---

## 5. Layout & Spacing

Measured/estimated on a 393 pt canvas:

- **Screen margins**: 20 pt. Round header buttons sit at x = 20 and right = 20, title centered between them.
- **Header**: status bar → nav row (44 pt buttons, 17 pt title) → the hero illustration area. No divider.
- **Illustration stage**: dot-grid canvas; sensor drawing ≈ 190 pt diameter centered horizontally, ~25% down the screen. Chips are placed at the four corners of the stage (Mass top-left, NFC top-right, Prot bottom-left, Lev bottom-right) with the "Diam" chip overlapping the drawing; two bare glyphs (Bluetooth left, bolt right) float at the drawing's mid-height; "81% + battery" centered under the drawing. In the alternate state (04) the chips move to sit on the geometry they describe, each with a small ring marker at the anchor point.
- **Sheet card**: inset ~8 pt from the screen edges (a floating sheet, not full-bleed), top radius ~28 pt, starts at ~55% of the screen height and runs off the bottom. **Padding 24 pt**. Header block (title row + sub-line) then ~36–40 pt to the metrics.
- **Metric row**: three columns on a 3-col grid, but the **baselines are staggered** — Expiration at the top-left, Accuracy centered and ~1 line lower, Metering at the right and ~2 lines lower. It is a deliberate diagonal cascade (the eye reads 11 → 98 → 43 as a descending line). Column gap ~24 pt.
- **Spec rows**: 3 rows, ~44 pt each; icon 18 pt + 8 pt gap + label; dotted leader fills the middle (1.5 pt dots at ~6 pt pitch); value right-aligned to the card padding.
- **Dock**: sits over the bottom of the card: 44 pt round button left (help), 88 × 56 pt dark pill centered (scan), 44 pt round button right (filters), on a ~64 pt translucent tray with 12 pt inset; bottom safe-area respected.
- **Chips**: 24 pt tall, padding 8 / 12 pt, 5 pt leading dot with 6 pt gap, label–value gap 4 pt. Widths 62–110 pt.
- **Status dot**: 6 pt dot inside a 12–14 pt soft halo, 6 pt gap to the state word.
- **Rhythm**: everything snaps to a 4 pt grid, with 8 / 12 / 16 / 24 / 40 as the working steps. Whitespace is generous: ~45% of the card is empty.
- **Glass widget (07)**: ~320 × 280 pt, radius 28, padding 20; header row, 16 pt gap, hero block, 40 pt gap, chart ~110 pt tall with the axis inside the padding.
- **Navexa (09)**: 12-col web layout, 24 px page gutter, 16 px card gap, pill tab bar centered, KPI row with 40 px gaps, sidebar 340 px wide over the map.

---

## 6. Components

| Component | Anatomy | Variants / states observed | Styling details |
|---|---|---|---|
| **Round icon button** | 44 pt circle, 20 pt mono-line glyph | back (←), filters/sliders (three vertical lines with knobs), help (?) on the card, bookmark (promo, on light glass) | surface white ≈ 75% over page, 1 px inner top highlight white 90%, outer shadow ≈ 0 6 16 rgba(0,0,0,0.07); glyph ink 70–90 (#54504F back arrow, #35322F help); the sliders glyph in frame 03 is lighter (#AFADAE → looks disabled/secondary) |
| **Primary action pill (dark)** | 88 × 56 pt capsule, white 22 pt glyph | scan/NFC (dot with two arcs) | #201C1B, no shadow, no border; the heaviest element on screen; centered in the dock |
| **Dock tray** | capsule ≈ 64 pt tall holding the three controls | — | white ≈ 35–40% over the card, no border; reads as a soft lighter band |
| **Tinted sheet card** | top-rounded sheet, radial light, header + metrics + spec rows | collapsed (implied by the ⤡ icon), expanded | pale yellow (#F5F5DC base, #FFFFE6 center), radius 28, no border/shadow, padding 24 |
| **Card header** | uppercase title, status dot + state word, sub-line with "·" bullet, collapse glyph top-right | status yellow (00/05) / green (04) — both labelled "Active" | title 14–15 pt uppercase ink 100; "Gen 3" ink 60 with a 3 pt bullet; collapse icon bare (no container), 16 pt |
| **Hero metric** | label above (13 pt ink 60), numeral 40 pt Light, unit hung (11–12 pt ink 30–40) | fraction ("11 / 14 d"), percent ("98 %"), word unit ("43 times") | staggered baselines across the three columns |
| **Spec row with dotted leader** | 18 pt icon, label (15 pt ink 40), dotted leader, value (15 pt ink 100, right-aligned) | Signal / Expires / Last sync | leader dots 1.5 pt at ~6 pt pitch, #555245; row ≈ 44 pt |
| **Status dot** | 6 pt dot + 12–14 pt halo of the same hue at ~35% | yellow #FDFE76 (live / brand), green #45CB34 (ok) | no ring; text label always beside it |
| **Callout spec chip** | 24 pt pill, 5 pt leading dot, label ink 70 + value ink 30, 12 pt | static (Mass, NFC, Prot, Lev); **lens** (Diam — refractive, specular sweep, chromatic fringes); **anchored** (frame 04 — chip attached to a small refractive ring marker on the drawing; "NFC Sync" chip shows a triple-arc refraction where it overlaps the ring) | white ≈ 65%, inner top highlight, outer shadow ≈ 0 2 6 rgba(0,0,0,0.05); no border |
| **Ring marker / anchor** | ~10 pt ring with a glass-like refraction, sitting on a line of the drawing | at Mass, Prot, Diam anchors (04) | a tiny "lens" that magnifies/refracts the line beneath |
| **Technical illustration** | sensor: two concentric outer rings (0.75–1 pt #262424), an inner ring, a dot matrix that fades from ink 55% (top-left) to ink 4% (bottom-right), a center chip glyph (circle with a labyrinth pattern) | front view (00/03/05); **exploded state** (04): side-view section + front ring with anchors | drawn, not rendered; sits on the dot grid |
| **Dot-grid canvas** | 1.5 pt dots, ~14 pt pitch, #ECECEC on #F4F4F4 | page background of the illustration stage only | decorative, 1.07:1 |
| **Bare glyph markers** | 16 pt mono-line Bluetooth and bolt icons floating beside the drawing | — | ink 90; no container |
| **Battery indicator** | "81%" 12 pt + outline battery glyph with a filled level | — | centered under the drawing |
| **Nav bar** | 44 pt round button left, centered 17 pt Medium title, 44 pt round button right | — | no background, no divider; buttons cast the only shadows in the header |
| **iOS status bar** | time 11:30, cellular/Wi-Fi/battery | — | #131313 glyphs; Dynamic Island |
| **Glass widget (07)** | dark glass card: uppercase label + status dot + "Active", collapse glyph, hero 149 + mg/dl, delta row, braid chart | — | black ≈ 55% + blur 40 + 1 px inner light edge; radius 28; padding 20 |
| **Delta / trend indicator** | 8 pt filled triangle (accent) + 12 pt text | up (yellow) | on glass: triangle #DFE067, text white 80% |
| **Collapse / expand glyph** | two diagonal arrows pointing inward, 16 pt | — | bare, ink 100 / white |
| *Navexa (09)* pill tab bar | 6 pills, 36 px, radius 10 | active = white with shadow, inactive = grey #E8E9EE | text #46454A 13 px |
| *Navexa* KPI with sparkline | 28 px numeral + 12 px square delta badge (green ↗ / red ↘) + label + 24-bar hairline sparkline | positive / negative | last 3 bars in the semantic color, the rest #D9DBDE |
| *Navexa* status pill | 22 px, radius 6, white 12 px text | Done (green #01A92B), Error (red #FB382F) | solid fills — the only saturated blocks |
| *Navexa* glass sidebar | 340 px, white ≈ 70% + blur 30, radius 20 | expandable rows with chevron, inner filter pills with colored dots | |
| *Navexa* map controls | 3 square tiles 32 px, radius 8, white | +, −, fit | |
| *Navexa* chart card | title, two 32 px square icon buttons (filters, ↗), hero numeral with delta badge, hung unit, inline progress with ▼ marker, chart | — | white card, radius 16, no border |

---

## 7. Charts

| Chart | Where | Styling details |
|---|---|---|
| **Glucose braid / wave chart** | glass widget (07) | Two smooth sine-like lines forming a braided band across 06:00–21:00; primary line white ≈ 95% at ~1–1.5 pt, secondary line white ≈ 60% at ~1 pt; **no area fill**; four dashed horizontal grid lines at 160 / 140 / 100 / 80 (1 px, dash ≈ 6 / gap 4, white ≈ 35%); no axis lines; right-side y labels 10 pt white 45% (#857F77), bottom time labels 10 pt at 3 h steps; threshold callouts ">20" above a peak and ">10" below a trough, 11 pt white 90%, each with a 4 pt white dot on the curve; **current-value marker**: 6 pt yellow (#FAFA74) dot inside a ~20 pt disc of white ≈ 12%, plus a vertical **dotted** yellow drop line (2 pt dots, 6 pt pitch) to the axis ending in a 4 pt yellow dot; the marker is the only saturated element |
| **Hero + delta block** (belongs to the chart) | glass widget | "149" 40 pt Light white, "mg/dl" hung 13 pt white 55%, delta row "▲ 6 from 1h ago" 12 pt white 80% with an 8 pt accent triangle |
| *Navexa* **KPI sparkline bars** | 09, header KPI row | ~24 bars, 2 px wide, 2 px gap, ~32 px tall, grey #D9DBDE with the last 3–4 bars in green (#229F3A) or red (#FB382F); no axis, no labels |
| *Navexa* **paired bar chart** ("Warehouse") | 09, bottom-left card | for each x: a grey "ghost" hairline bar (previous period, 2 px, #E4E5E8) and a green 2 px bar; y labels 3k–6k 10 px grey #B5B8BB at left; no gridlines; bars are hairlines, not blocks |
| *Navexa* **smooth line chart** ("Daily picked") | 09, bottom-right card | 2 px green (#229F3A) monotone-smooth line with a 6 px green dot at the peak; a faint grey ghost line behind (previous period); y labels 60k–140k 10 px grey; no gridlines; no fill |
| *Navexa* **inline progress** ("Battery life 72%", "Warehouse 84%", "Processed 62") | 09 | 2 px track #E4E5E8, green fill, small ▼ marker above the fill head; a red segment at the start of the "Warehouse" bar (two-color split) |

Chart principles visible across the set: hairline marks (1–2 px), no area fills, dashed or absent grids, tiny grey axis text, a single accent for "now" or for the current series, ghost lines/bars for comparison periods, and callouts written as plain text with a dot on the curve.

---

## 8. Iconography

- **Style**: mono-line, geometric, rounded caps and joins, 1.5 pt stroke (renders ~1.25–1.5 pt at 20 pt; 1.25 pt at 16 pt). No fills except the battery level, the delta triangle and the status dots.
- **Sizes**: 20 pt inside 44 pt round buttons; 16–18 pt inline (Wi-Fi arcs for Signal, stopwatch for Expires, two curved arrows for Last sync); 16 pt bare glyph markers (Bluetooth, bolt); 16 pt collapse arrows; 22 pt scan glyph (a dot with two concentric arcs on each side) in the dark pill.
- **Semantics**: icons describe *the data* (Wi-Fi = signal, stopwatch = expiry, cycle arrows = sync) and *the action* (arcs = scan, sliders = filters, "?" = help). The sensor drawing itself is treated like a large icon: same 0.75–1 pt line language.
- **Color**: ink 70–90 on light; white on the dark pill and glass; never colored.
- **Navexa**: same family at 1.5 px; small filled square badges (12 px, radius 3) carry the deltas in green/red; the bell shows a 6 px red notification dot.
- Closest open libraries: Lucide / Phosphor Light at 1.5 stroke; SF Symbols "light" weight is an acceptable Apple-native substitute for chrome.

---

## 9. Motion hints (from stills)

1. **Illustration state morph** (00/03/05 → 04): the front view rotates/explodes into a side-section + front ring; chips travel from the stage corners to their anchor points and gain ring markers. Implies a 350–450 ms spring morph with chips following on a slight delay (staggered 40 ms).
2. **Lens/refraction on chips**: the "Diam" chip refracts the dots behind it and shows chromatic fringes — a press/hover "specular sweep" (≈ 300 ms) or a continuous subtle parallax when the phone tilts.
3. **Status dot halo**: the soft halo suggests a slow pulse (≈ 2 s ease-in-out) for the "live" state.
4. **Collapse glyph** on the card and the widget: the card collapses to its header (height animation with the metrics fading out first).
5. **Scan pill**: the concentric-arc glyph is a natural ripple animation on tap.
6. **Chart marker**: the yellow dot + dotted drop line is a "now" indicator that would move along the braid in real time.
7. Photography with shallow depth of field and hands implies the intended feel: calm, physical, slow easing — no snappy material-style motion.

---

## 10. What makes it beautiful (concrete)

1. **A single tinted surface on a grey page.** Every other element is neutral, so the pale-yellow card is the unmistakable focal point without needing weight or a border. Contrast card-vs-page is 1.01:1 by luminance — the separation is pure hue.
2. **The card is lit, not filled.** A radial highlight (+4% L, off-center at 45% / 38%) turns a flat tint into paper under a lamp. It is so subtle it is felt rather than seen.
3. **Zero borders.** Chips, buttons and the card are defined by 1 px white top highlights and soft shadows; the page stays airy because nothing is outlined.
4. **Hero numerals with hung units.** 40 pt Light "98" beside an 11 pt ink-30 "%": the number is a statement, the unit a whisper. The ratio (~3.6×) is what creates the hierarchy, not weight or color.
5. **Staggered metric baselines.** The three metrics descend diagonally (11 → 98 → 43). It breaks the grid deliberately while staying on a 3-column structure, giving the card rhythm and a reading order.
6. **Datasheet cues as ornament.** Dotted leaders, a dot-grid canvas, 0.75 pt line drawings, "IP68 / 13.56 MHz / 4.2 g" spec chips — technical credibility rendered warmly.
7. **Puffy round controls that rhyme with the product.** The 44 pt soft-white buttons look pressed out of soft-touch plastic and echo the sensor's disc; the UI feels like the device.
8. **One heavy element.** The dark #201C1B scan pill is the only high-contrast block, so it anchors the composition and reads as *the* action.
9. **Two-level text inside 24 pt chips.** "Mass" in ink 70 and "4.2 g" in ink 30 — hierarchy at the smallest scale.
10. **A jewel moment used once.** The refractive lens chip appears on one chip (and the anchor rings in the alternate state). Restraint keeps it special.
11. **Warm neutrals throughout.** #201C1B black, greys mixed with the card tint, brown-grey glass — nothing is pure #000 or #FFF, so everything feels material.
12. **One family, three weights, four ink levels.** The whole hierarchy is size + grey level; color never has to do typographic work, which is why the single yellow dot is so visible.
13. **Glass done right (07).** Dark smoky glass with a hairline light edge, hairline white chart, dashed grid, and a single yellow "now" marker: minimal marks, maximal focus.
14. **Generous emptiness.** Roughly 45% of the card and 60% of the stage are empty; the screen never feels busy despite 20+ data points.

---

## 11. Accessibility risks

Measured against WCAG 2.x (AA text = 4.5:1; large text ≥ 24 pt regular / 18.5 pt bold = 3:1; non-text UI = 3:1):

| Item | Measured | Verdict |
|---|---|---|
| Units "/ 14 d", "times" — ink 40 (#979686) at 11–12 pt on the card | **2.7:1** | Fails AA (and even 3:1) |
| Unit "%" — ink 30 (#B0AE95) on the brightest area | **2.2:1** | Fails |
| Chip values "IP68", "4.2 g", "13.56MHz" — #B0B0B0 / #ABAAAA at 12 pt | **2.0–2.1:1** | Fails |
| Spec row labels "Signal / Expires / Last sync" — #908E81 at 15 pt | **3.0:1** | Fails AA (needs 4.5) |
| "Active" — #7C7A6B at 13 pt | **3.9:1** | Fails AA |
| Metric labels — #686756 at 13 pt | 5.2:1 | Passes |
| Hero numerals, row values, titles | 14–19:1 | Pass |
| Yellow status dot #FDFE76 on the yellow card | **1.03:1** | Invisible to low-vision users; only the halo hints at it |
| Green status dot #45CB34 on the card | 1.9:1 | Fails non-text 3:1 |
| Chip / button surfaces vs page | 1.01:1 | Boundaries are shadow-only; acceptable for decorative chips, risky for interactive ones |
| Sliders glyph in frame 03 (#AFADAE) | 2.0:1 | If this is the enabled state it fails; if disabled, it needs a non-color cue |
| Glass widget: "mg/dl" white 55% | 3.8:1 | Fails AA at 13 pt |
| Glass widget: axis labels white 45% | 2.7:1 | Fails |
| Glass widget: "160" over the olive zone | **1.6:1** | Glass over variable imagery breaks contrast unpredictably |
| Navexa: green text #01A92B on white; white on green pills | 3.0:1 / 3.1:1 | Fails AA for 12–13 px text |
| Touch targets: chips 24 pt tall, bare collapse glyph ~16 pt, bare Bluetooth/bolt glyphs | < 44 pt | Fine only if non-interactive; otherwise expand hit areas |
| Icon-only primary action (scan pill), icon-only round buttons | — | Need accessibility labels |
| Yellow used both as the brand "live" color and (conventionally) as a warning color; yellow and green dots both labelled "Active" | — | Semantics must be carried by text (they are) and dot colors must be distinct in luminance |
| Dynamic Type: 10–12 pt text in many places; staggered metric layout | — | Must reflow to a stacked layout at accessibility sizes |
| Refraction / parallax / pulse effects | — | Gate behind Reduce Motion; the lens effect also reduces legibility of the chip text at small sizes |
| Light-only design | — | The tinted-card and puffy-control recipes need an explicit dark equivalent (the glass widget hints at one) |

Fixes that keep the look: raise "dimmed" text to ink 55–58% (≥ #707070 on #F5F5DC gives 4.5:1); reserve ink 40 (3:1) for numerals ≥ 24 pt only; add a 1 px ink-20% ring or a darker core to status dots; put a 20–30% black scrim behind text zones on glass; make chips ≥ 32 pt with 44 pt hit areas when interactive.

---

## 12. Principles to carry into Prism (with numbers)

1. **Light canvas = #F4F4F4; content separated by hue/shadow, not lines.** Cards get no border by default; borders are for inputs and tables only. Card-vs-page luminance difference ≤ 2%; depth via 0 6 16 rgba(0,0,0,0.06) shadows and 1 px inset white highlights.
2. **One tinted "focus" surface per screen.** Tint = brand accent at 8–12% over white with a radial light: `radial-gradient(ellipse 70% 55% at 45% 38%, rgba(255,255,255,0.45) 0%, transparent 65%)` over the tint. Sheet cards: radius 28 pt, inset 8 pt from the screen edges, padding 24 pt. Small cards: radius 20 pt, padding 16–20 pt.
3. **Hero-metric anatomy**: label 13 pt / 400 / ink 60 above; numeral 40 pt / 300 / ink 100 (44 pt on tablets/web, 32 pt in compact cards); unit 12 pt / 400 / ink 58 hung at the baseline with a 3 pt gap; 4 pt between label and numeral. Dimmed decimals (ink 40, 3:1) only when the numeral is ≥ 24 pt.
4. **Ink ramp (light)**: 100 = #0B0908 (warm near-black), 90 = #1F1D1B, 70 = #4A4844, 60 = #66645E, 58 = #74726B (the AA floor on tinted cards), 40 = #8C8A83 (decorative / ≥ 24 pt only), 30 = #A9A7A0 (non-text hairlines only). Never pure #000.
5. **Accent discipline**: one brand accent (default: highlighter yellow #FDFE76 family, or the brand's equivalent) used as 6 pt dots, chart "now" markers, delta triangles and the card tint — never as text, never as large fills. Semantic colors: green #2DB24A-ish (ok), orange #F5A14B (attention), red #FB382F (error), each ≥ 3:1 against its surface in the dot/badge form (add a 1 px ink-20% ring on light).
6. **Round icon buttons**: 44 pt (48 on web), full radius, surface white 75% over page, inset 0 1 0 rgba(255,255,255,0.9), shadow 0 6 16 rgba(0,0,0,0.07), glyph 20 pt at 1.5 pt stroke in ink 80. Pressed: shadow → 0 2 6, surface → white 60%, scale 0.97.
7. **Primary pill**: height 56 pt, min width 88 pt, full radius, fill ink 100 warm (#201C1B), white glyph/label 15 pt / 500. Exactly one per screen; it may live in a translucent dock tray (white 35–40%, radius full, height 64 pt, inset 12 pt).
8. **Chips**: display chips 24 pt (padding 6 / 12, 5 pt leading dot, label ink 70 + value ink 58 at 12 pt); interactive chips 32 pt with a 44 pt hit area; full radius; surface white 65% + inner highlight + 0 2 6 rgba(0,0,0,0.05). The "lens" variant (refraction + specular sweep) is a decorative flourish for one hero element per screen, off under Reduce Motion / Reduce Transparency.
9. **Spec rows with dotted leaders**: row 44 pt, icon 18 pt + 8 pt gap, label 15 pt ink 58, leader dots 1.5 pt at 6 pt pitch in ink 40 (decorative), value 15 pt ink 100 right-aligned.
10. **Dot-grid canvas**: 1.5 pt dots at 14 pt pitch at ink 4% (#ECECEC on #F4F4F4), only behind illustration/hero stages, never behind text blocks.
11. **Glass, only over imagery / maps / vivid**: dark glass = rgba(20,16,12,0.55) + blur 40 + saturate 0.8 + 1 px inner edge white 22% (top) fading to 0 at the bottom; light glass = white 70% + blur 30 + 1 px inner edge white 90%. Text on dark glass: white 100 / 80 / 65 (65 = the AA floor at ≥ 13 pt); add a rgba(0,0,0,0.25) scrim under text zones when the backdrop is unpredictable. Radius 28 pt, padding 20 pt.
12. **Charts**: 1–1.5 pt lines (2 px web), no area fill by default, grid = dashed 1 px at ink 12% (light) / white 30% (dark), axis labels 10–11 pt at ≥ 4.5:1 (ink 58 / white 65), ghost series for comparison at 35% of the series color, one "now" marker = 6 pt accent dot inside a 20 pt 12% disc + dotted drop line, callouts as 11 pt text with 4 pt dots. Sparklines: 2 px bars, 2 px gap, the last n bars in the semantic color.
13. **Iconography**: mono-line 1.5 pt, rounded joins, 20 pt in controls, 16–18 pt inline; ink 80 on light, white on dark; colored only inside semantic badges (12 pt squares, radius 3). Interactive glyphs always sit in a ≥ 44 pt container.
14. **Type system**: one geometric sans with a single-storey a (Outfit as the default brand face, Urbanist fallback; SF Pro / Inter only for system chrome and dense tables). Weights 300 (display numerals), 400 (text), 500 (titles). Scale: 40 / 28 / 20 / 17 / 15 / 13 / 12 / 11. Uppercase only for card eyebrows at 14 pt with +3% tracking.
15. **Spacing**: 4 pt base; 20 pt screen margins; 24 pt card padding; 12–16 pt gaps; 40 pt section gaps inside cards. Staggered baselines are allowed in a 3-metric row at regular sizes and must collapse to a stacked list at accessibility text sizes.
16. **Motion**: springs (response 0.35–0.45 s, damping 0.8) for state morphs and chip relocation with 40 ms stagger; 2 s ease-in-out halo pulse for live dots; 300 ms specular sweep on press; all gated by Reduce Motion, and all blur/refraction gated by Reduce Transparency.
17. **Warmth**: the neutral ramp is warm-tinted toward the brand accent on tinted surfaces (greys mixed with the tint, never laid over it); near-blacks are warm (#201C1B); pure white appears only as highlights and glyphs on dark.
