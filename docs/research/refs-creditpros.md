# Reference analysis — CreditPros (Credit Repair & Financial Dashboard UI)

Source: Dribbble shot 27678963, "Jack R. for RonDesignLab". Desktop fintech dashboard (credit score, accounts, payments, disputes).
Files analysed: `00.jpg`–`08.jpg` (2000×1500, one 2000×1000 marketing frame), `10.png` (video still). `09.mp4` skipped (cannot be viewed).
Method: every still viewed at full size, key regions cropped and re-zoomed with `sips`, colours sampled from pixels with a small CoreGraphics script (5×5 average). Because the stills are perspective renders of a monitor, sizes below are given in design px assuming a 1440-wide desktop frame (the frontal `07.jpg` maps ≈1:1 to that frame); hex values are corrected for the mockup's darkening where noted.

Note on `10.png`: it is the poster frame of the attached video and shows a **different product** (a dark, navy/teal drone-ops console with an orange glow — "Magura"). It is not part of the CreditPros family and is excluded from the token derivation below; it is mentioned once in Overview for completeness.

---

## 1. Overview

CreditPros is the *light* sibling of the RonDesignLab language the owner already flagged (Family A light "investor CRM" on iPad; Family B dark "Traffic Management"). It is the best single reference for a **light-mode desktop dashboard**: an airy near-white canvas, white "soft-superellipse" cards, two **vivid mesh-gradient account cards** with film grain, and a **dark smoked-glass detail drawer** that slides over the dashboard. Everything is built from three shapes — pill, 32-px rounded rectangle, circle — and from three colour roles: ink, white, and one electric-lime accent (plus one alert orange and a red/amber/green semantic trio for the score).

What the page is (from `06.jpg` / `07.jpg`):

- **Top bar**: small black logo mark → 44-px round hamburger button → pill tab bar (`Dashboard` active in solid black; `Credit History · Loans · Disputing · Documents · Updates` as outline pills with 16-px leading line icons) → right side `Quick Search` pill input and a black CTA pill (`Choo…`, cut off).
- **Left rail**: six 44-px outline circle icon buttons (card, money-bag, wallet/payment, bank+shield, receipt, exchange) + chevron expander; bottom: support/headset button and a 44-px avatar with a black ring.
- **Hero**: two-tone greeting (`Hey, Stewart!` ink / `Let's analyze your stats!` 40 % ink), an outline dropdown pill (`Transunion Score ⌄`), the hero score `730` (~76 px regular), delta `+6 pts`, qualifier `Excellent`, timestamp `Updated 5 Days Ago`, and the **score band chart** (three tinted rounded bands red/amber/green, a black needle at 730).
- **Section tabs** with count badges: `Your Credits 12` (active, black underline, black badge) · `Inquiries 24` · `Public Records 13` (grey, white badges) over a hairline rail.
- **Account cards**: two vivid cards (`TD Bank USA` olive→lime; `TD Bank USA` rose→tan): icon in an open-arc ring, two-line title, solid black ↗ circle, `Paid Amount $12.340 / $56.000`, `Term 36 m. / 48 m.`, a mini timeline (dot matrix / tick ruler), `Next Payment 03.05.2024`.
- **Right column**: white stat cards (`Payments on Time 24/38` with an orange alert badge, `Credi… 23…`), a translucent list row (`Recent Changes`), and a white chart card (`Credit History`, three bureau lines, lime tooltip `730`, `16 Jun`).
- **Detail drawer** (`07.jpg`, `00.jpg`, `04.jpg`, `03.jpg`): dark glass panel `TD Bank USA` with alarm + close buttons, `Paid Amount $12,340 · Term 36 m.`, `On time 63%` sparkline, `Next Payment` progress pills (`You've Paid $12,340` / `Left To Pay $2,660`, date `03.05.2024`), a morphing segmented control (`Details · Timeline · Updates`), year sections `2023 / 2024` with `First Payment 03.02.2023`, a 6-column month-tile calendar (lime check = paid, grey × = missed), and an action bar (`Make a Payment` white primary, `Create Dispute`, `Calculate` glass secondaries).

### Per-image notes

| File | What it shows | Forensic takeaways |
|---|---|---|
| `00.jpg` | Angled monitor, upper-right quadrant with the drawer open | Nav pills 40 px tall with 16-px icons; `Quick Search` input pill ~48 px; black CTA pill; drawer header = 44-px arc-ring icon + 22-px title + outline alarm circle + solid black × circle; `$` dimmed and small beside `12,340`; progress pill with ring-dot; month tiles with lime check circles; drawer has a visible 1-px light edge on its top-left. |
| `01.jpg` | Macro of the score band chart + section tabs | Bands are ~12 % tints with a 1-px slightly-saturated **bottom baseline**; faded dots (~40 % alpha) scattered inside; two solid dots on the baseline at the right end; a **ring-dot** (solid dot + 1.5-px ring) as the pointer; the needle is a 1-px ink line topped by a ~10-px ink triangle sitting in a soft white halo pill; labels 12 px grey except the current `730` in ink. Count badge `12` is solid ink with white 11-px text; `24` is white with a hairline. `Excellent / Updated 5 Days Ago` 13 px at ~55 % ink; `+6` in ink, `pts` grey. |
| `02.jpg` | Macro of the `Payments on Time` white card | Card radius ≈ 32 px, pure white, no border, an almost invisible ambient shadow; 44-px hairline icon circle (calendar, 1.5-px stroke) with an **orange rounded-triangle alert badge** (`!`) overlapping its top-right; 44-px filled `#EFEFEF` circle with a thin ↗ arrow; title 18 px regular; hero `24` ~44 px regular with `/38` at ~22 px in `#C8C8C8`; a 2×5 **dot matrix** (hollow grey rings + three filled ink dots). The rose card edge shows visible **film grain** on the gradient. |
| `03.jpg` | Macro of the drawer's month grid | Tiles ≈ 58×78 px, radius 14 px, fill white ~15 %, 1-px white ~22 % stroke; label 13 px white top-left; 24–26-px status circle bottom-right: **lime `#DEFD33` with ink check** (paid), **grey `rgba(255,255,255,.18)` with white ×** (missed); `Sep` (missed) tile is *darker* (`#5B562E` sampled — black ~30 % overlay) with a brighter stroke → selected/negative state. Year label `2024` 16 px white regular. `Make a Payment` is a solid white pill with ink text + card icon. Grain texture clearly visible across the rose region. |
| `04.jpg` | Tablet-angle close-up of the drawer header | The drawer is a **dark smoked glass**: black tint over an olive→rose backdrop, strong blur, 1-px light edge highlight; the outline alarm button and solid black close button are 40–44 px; the `On time` sparkline is a 1.5-px lime curve with a lime ring endpoint over two ghost curves (white ~20 %); `63` 20 px white with `%` small and ~50 % white; progress pill = lime-tinted fill (`#7A6424` sampled → lime at ~30 % over dark glass) with a lime ▼ marker and a 1-px lime vertical hairline; `Left To Pay` pill is rose-tinted (`#CEADA4`). |
| `05.jpg` | Macro of the two vivid account cards | Rose card: mesh gradient `#B3706A` → `#9C7561` → `#C9927A` with a light bloom at top-right; **tick-ruler timeline** (1-px white 30 % ticks, one 2-px lime tick for the next payment); `$` at ~55 % size and 70 % white; `56.000` ~34 px white regular; `Term` label ~13 px white 60 %, `48 m.` 14 px white. Green card: **dot-matrix timeline** (3 rows, white 35 % dots → lime dots for the highlighted segment). Open-arc ring around the icon (≈300°, gap bottom-left, 1.5-px white). Solid black 44-px ↗ circles. Noticeable grain on both. |
| `06.jpg` | Full dashboard on an angled monitor | Confirms layout: rail 44-px circles at x≈44; content column starts ≈ 96 px; greeting 32 px; hero 76 px; bands 40 px tall; tabs 18 px; vivid cards ≈ 250×240 with radius 32 and only ~12 px gap between them; right column white cards ≈ 250×240; canvas cool grey `#E4E7EE` at top-left warming to `#ECE6DE` at right with blurred peach/rose blooms behind the cards. |
| `07.jpg` | Full dashboard, frontal, drawer open (**primary reference**) | Drawer ≈ 460×840, radius ≈ 30, sits over the right column without a scrim; `Credit History` chart: 4 dashed gridlines (700–730), 1.5-px ink line for Transunion, lighter grey lines for Equifax/Experian, 5-px ink dots, **56-px lime circle tooltip** `730` with 14-px ink text, 1-px dashed drop line to an 8-px ink ▲ marker and `16 Jun` label; drawer action bar: white primary pill + two glass pills with hairlines. |
| `08.jpg` | Marketing frame over a blurred flower photo | Light **glass pill** (`Recent Changes`): white ~14 % + blur + 1-px white 28 % edge, 44-px outline icon circle, **lime 44-px count circle `2`** and a solid black ↗ circle. Chart card legend: 6-px dots + 13-px labels (`Transunion` ink, `Equifax` `#CCCCCC`, `Experian` lighter). Axis labels `#B7B7B9`-ish 12–13 px. |
| `10.png` | Video poster frame | Unrelated dark ops console (navy `#1A2229`, teal glass tiles, orange glow); excluded. |

---

## 2. Color

Sampled values, corrected for the mockup's ambient darkening (+4–8 % L where the sample was clearly through the render's shading).

### Canvas & neutrals
| Role | Hex (est.) | Notes |
|---|---|---|
| Page canvas, cool corner | `#E8EBEF` | sampled `#E2E7EB` / `#E4E7EE` top-left & centre; slight blue cast |
| Page canvas, warm side | `#EFEAE3` | sampled `#ECE6DE` mid-right — the canvas is a very soft cool→warm mesh, not a flat fill |
| Canvas blooms (behind vivid cards) | peach `#F2D9CB`, rose `#EED6D4`, sage `#DDE4D3` | ≥150-px blur, ~30 % opacity, echoing the card hues (`00.jpg`, `07.jpg`) |
| Card white | `#FFFFFF` | pure white; no tint |
| Ink (text, solid pills, needle) | `#0C0C0C`–`#111111` | score digit sampled `#0C0C0C` |
| Secondary text | `#8E9196` | greeting line 2, tab labels, `Excellent`, section tab labels (`#9D9FA2` sampled) |
| Tertiary / dimmed tokens | `#C4C6C9` | `/38`, `pts`, `%`, axis labels (`#C8C8C8`, `#B7B7B9` sampled) |
| Hairline | `rgba(12,12,12,0.12)` ≈ `#E1E2E4` on white | outline pills, icon circles, tab rail |
| Filled control grey | `#EFEFEF` | arrow circle on white cards (`#ECECEC` sampled) |
| Translucent light row | `rgba(255,255,255,0.55)` | `Recent Changes` row on the canvas (`#F4F1EF` visual) |

### Accents
| Role | Hex (est.) | Where |
|---|---|---|
| **Electric lime (brand highlight)** | `#DDFB3A` (sampled `#DEFD33`; darker through glass `#B5C82B`) | paid check circles, chart tooltip bubble, `2` count badge, sparkline stroke, progress fill tint, next-payment tick/dots |
| **Alert orange** | `#F75A1C` (sampled `#FB5101`, `#E74C03`) | `!` triangle badge on `Payments on Time` |
| Score semantic red | `#F9621C` | band 1 markers (`300`) |
| Score semantic amber | `#FDAD03` | band 2 markers (`630–690`) |
| Score semantic green | `#3DD42C` | band 3 markers (`730`) |
| Band tints (on canvas) | red `#F3DEDA`, amber `#F3E8DA`, green `#DCE9DD` | ≈ 12 % of the hue over the canvas; each band's 1-px baseline ≈ 35 % of the hue |

### Vivid surfaces (mesh gradients)
| Surface | Stops (sampled → est.) | Angle / shape |
|---|---|---|
| Green account card | `#4F5A38` (top-left, sampled `#626A4C`) → `#A4BB50` (centre) → `#C4DD6A` (bottom-right bloom) | ~135°, plus a radial bright bloom in the bottom-right quadrant; lime dots sit on the bloom |
| Rose account card | `#B3706A` (top-left, sampled `#A46D6A`) → `#9C7561` (centre) → `#C9927A` (bottom-right) with a peach highlight `#D9A98F` at top-right | ~135°, two-hue mesh (rose + tan) with a soft light bloom top-right |
| Detail drawer backdrop | olive `#5C5A45` (top, sampled `#686759`) → moss `#869E47` at top-right → umber `#97725A` (middle) → rose-tan `#B7876F` (bottom) | vertical mesh; behaves like a blurred photo behind dark glass |
| Marketing glass pill backdrop | photo (orange lily / green leaves) | — |

### Colour logic
- **Ink + white + one lime** carry the interface. Lime is *never* used as text on white; it appears as filled shapes with ink text on top (17:1) or as thin strokes in charts.
- Warm/cool balance: the canvas is cool at the top-left and warms toward the vivid cards; the cards' colours bleed into the canvas as blooms, so nothing looks pasted on.
- Semantics are reserved: red/amber/green appear only inside the score band chart; orange only on the alert badge; lime means "good / current / paid / highlighted".
- Vivid cards use *desaturated, earthy* gradients (olive, rose, umber) rather than saturated brand gradients — this is what keeps white text and lime accents readable and the composition calm.

---

## 3. Surfaces & Depth

| # | Surface | Radius | Border | Shadow / blur | Opacity / texture | Used for |
|---|---|---|---|---|---|---|
| S1 | Canvas | — | — | — | soft cool→warm mesh + ≥150-px blurred colour blooms at ~30 % | page background |
| S2 | White card | 32 px (reads slightly superelliptical) | none | ambient only: ≈ `0 24px 60px rgba(20,20,20,0.05)` — barely visible | opaque | stat cards, chart card |
| S3 | Vivid account card | 32 px | none | same ambient shadow; the canvas bloom behind does the "glow" | opaque mesh gradient + **monochrome film grain ≈ 5 %** | account cards |
| S4 | Dark smoked glass drawer | 30 px | 1-px inside highlight `rgba(255,255,255,0.22)`, strongest at top-left | backdrop-blur ≈ 40 px; drop shadow ≈ `0 30px 80px rgba(0,0,0,0.25)` | black tint ≈ 35 % over a vivid backdrop; grain ≈ 4 % | account detail overlay |
| S5 | Glass tile (inside drawer) | 14 px | 1-px `rgba(255,255,255,0.22)` | inherits panel blur | fill `rgba(255,255,255,0.15)`; selected/negative: `rgba(0,0,0,0.30)` fill + brighter stroke | month tiles |
| S6 | Tinted glass pill (inside drawer) | 12–14 px | none | — | lime `rgba(221,251,58,0.28)` (paid) / rose `rgba(255,190,180,0.35)` (remaining) | progress pills |
| S7 | Light glass pill (over photo / canvas) | full | 1-px `rgba(255,255,255,0.28)` | backdrop-blur ≈ 30 px | `rgba(255,255,255,0.14)` on photo; `rgba(255,255,255,0.55)` on the canvas | `Recent Changes` row |
| S8 | Outline control | full / circle | 1-px `rgba(12,12,12,0.12)` (ink 1-px for the dropdown) | none | transparent or white 40 % | nav pills, icon circles, dropdown, search |
| S9 | Solid ink control | full / circle | none | none | `#0F0F0F` | active nav pill, ↗ buttons on vivid cards, close ×, count badge |
| S10 | Filled grey control | circle | none | none | `#EFEFEF` | ↗ button on white cards |
| S11 | White primary button (on glass) | full | none | none | `#FFFFFF`, ink text | `Make a Payment` |
| S12 | Glass secondary button (on glass) | full | 1-px `rgba(255,255,255,0.28)` | — | `rgba(255,255,255,0.14)` | `Create Dispute`, `Calculate` |

Depth model: **no elevation ladder** — every card sits at the same, almost shadowless level; depth is expressed by *material* (white → vivid → dark glass) and by the drawer floating over content with a blur and a long soft shadow. The only "glow" is colour bloom in the canvas, never a coloured drop shadow.

Glass recipe (dark, as measured on `04.jpg` / `07.jpg`): backdrop = blurred vivid image; overlay `rgba(10,12,8,0.35)`; blur 40 px; inside stroke 1 px white 22 % (fade to 8 % toward bottom-right); grain 4 %; content white / white 64 % / lime.

---

## 4. Typography

**Family guess**: a wide-set **neo-grotesque** — letterforms match *Helvetica Neue / Neue Haas Grotesk / SF Pro Display* (double-storey `a`, straight-tailed `y`, horizontal `e`/`S` terminals, `t` with a slightly angled top-left cut, flagged `1` without a foot, closed `4`, round-topped `3`, single-storey `g`). It is **not** Poppins/Outfit/Urbanist (too geometric; `a` and `y` shapes differ) and not Manrope (rounder, flat-topped `t`). Closest free stand-ins: **Inter Display** (best), then Helvetica-class system fonts (SF Pro on Apple). Weight is almost entirely **Regular (400–450)**, with Medium only on pill labels; there is **no thin display weight** in this light family (unlike the dark Family B).

Observed sizes (design px @ 1440-wide frame):

| Element | Size | Weight | Colour |
|---|---|---|---|
| Hero score `730` | 76 | Regular | ink |
| Drawer hero `12,340` | 42–44 | Regular | white; `$` 20 px at white 70 % |
| Card hero `24`, `23` | 44 | Regular | ink; `/38` 22 px `#C4C6C9` |
| Vivid-card amount `$12.340` | 32–34 | Regular | white; `$` 16–18 px white 70 % |
| Greeting line 1 / 2 | 32 / 32 | Regular | ink / `#8E9196` |
| Drawer title `TD Bank USA` | 22 | Regular | white |
| Section tabs | 18 | Regular | ink (active) / secondary |
| Card titles | 18 | Regular | ink / white |
| Segmented control labels | 16 | Regular | white (active 100 %, inactive 70 %) |
| Year labels `2023` | 16 | Regular | white |
| Drawer labels `Paid Amount`, `Next Payment` | 15 / 13 | Regular | white 80 % / 64 % |
| Nav pill labels, buttons, dropdown | 14 | Medium | ink / white |
| Delta `+6 pts`, values `36 m.`, dates | 14 | Regular | ink / white |
| Captions `Excellent`, `Updated 5 Days Ago`, card labels `Paid Amount`, legend | 13 | Regular | `#8E9196` / white 60 % |
| Axis labels, band labels, month labels, `Term` | 12–13 | Regular | `#B7B7B9` / white 60–100 % |
| Badge numerals | 11 | Medium | white on ink / ink on white / ink on lime |

Numerals: lining, appear **tabular** (aligned digit widths in `12,340`, `03.05.2024`), never thin. The signature is **dimmed secondary tokens** rather than dimmed decimals: currency `$`, denominators `/38`, units `pts`, `%`, `m.` are set at ~50 % size and ~45–60 % ink/white. Thousands separators are inconsistent across surfaces (`12.340` on the card vs `12,340` in the drawer) — a slip to avoid.

Casing & tracking: sentence case everywhere (no uppercase labels); tracking is neutral to slightly tight (≈ −1 %) on the hero numerals; the greeting uses **tone** (ink vs 40 % ink) not weight to create hierarchy.

---

## 5. Layout & Spacing

- **Frame**: 16:10 desktop (≈ 1440×900 design frame shown on a large monitor). Outer page padding ≈ 32 px; the left rail occupies a 64–72-px gutter; content starts ≈ 96 px from the left edge.
- **Grid**: a loose 12-column feel — hero column ≈ 540 px, right column ≈ 250 px cards × 2 (`Payments on Time`, `Credi…`) then full-width rows; the drawer (≈ 460 px) overlaps the right column instead of pushing it.
- **Rhythm**: 8-px base. Card padding 22–24 px; gap between vivid cards **12 px** (deliberately tight — they read as a pair), between right-column cards 12–16 px, between sections 32–40 px; nav pill gap 8–10 px; band gap 16 px; month-tile gap 8 px.
- **Card anatomy** (all cards, white and vivid): header row = 44-px icon circle + title (18 px, up to two lines) + 44-px action circle at the far right; hero pinned **bottom-left**; meta (`Term`, date) pinned **bottom-right**; mini-visualisation sits between hero and footer. Minimum card ≈ 240×230.
- **Control heights**: nav pills 40 px; inputs/dropdowns 44–48 px; icon buttons 44 px; drawer action buttons 44 px; status circles 24–26 px; count badges 20 px.
- **Alignment**: labels left-aligned; right-hand metadata right-aligned on the same baseline as the hero (`$12.340` ↔ `36 m.`); the score's delta/qualifier stack is top-aligned to the score's cap height.
- **Drawer**: 460 px wide, full content height with 24-px inner padding, radius 30; opens over the right column with ~16-px inset from the page edge; action bar pinned at the bottom.

---

## 6. Components

| Component | Variants / states observed | Anatomy & specs |
|---|---|---|
| Pill tab (top nav) | active (solid ink, white label + icon); inactive (white 40 % fill + hairline, ink label) | 40 px tall, 14-px medium label, 16-px 1.5-px-stroke icon, padding 16–20 px, radius full, gap 8–10 px |
| Round icon button | outline (hairline, ink icon); filled grey (`#EFEFEF`, ink icon); solid ink (white icon); outline-on-glass (white 28 % ring, white icon); solid ink on glass (`×`) | 44 px circle; icon 18–20 px; the outline variant is the default everywhere (rail, card headers, drawer header) |
| Left icon rail | outline circles stacked; chevron expander; support button; avatar | 44-px circles, 12-px vertical gap; avatar 44 px with a 2-px ink ring |
| Search input | placeholder state | pill 48 px, white 60 % + hairline, 18-px magnifier icon, 14-px placeholder `#9A9CA0` |
| Dropdown pill | default | 44 px, transparent, **1-px ink border**, 14-px label + 12-px chevron |
| Primary CTA pill | on canvas (solid ink) / on glass (solid white) | 44–48 px, 14-px medium label, optional leading icon |
| Secondary button on glass | default | 44 px pill, white 14 % fill, 1-px white 28 % stroke, white label + icon |
| Greeting headline | two-tone | 32 px regular; line 2 at 40 % ink |
| Hero stat block | score + delta + qualifier + timestamp | 76-px number; 14-px `+6` ink / `pts` grey; 13-px qualifier and timestamp in secondary |
| Section tabs | active (ink label, 2-px ink underline, ink badge); inactive (secondary label, white badge) | 18 px labels; underline spans label width; 1-px hairline rail under all tabs |
| Count badge | ink / white-outline / lime | 20 px circle, 11-px medium numeral |
| Alert badge | orange rounded triangle with `!` | ≈ 20 px, overlaps the icon circle top-right by ~6 px |
| Stat card (white) | with alert; with dot-matrix; with pager dots | 250×240, radius 32, header row + 18-px title + 44-px hero with dimmed denominator |
| Vivid account card | olive/lime; rose/tan | 250×240, radius 32, mesh gradient + grain, open-arc ring icon (1.5-px white, ~300°), solid ink ↗, white text with 60 % labels, mini timeline |
| List row card | on canvas (light translucent); on photo (light glass) | full width, 64–80 px tall, radius 28–full, icon circle + 18-px title + trailing lime count + ink ↗ |
| Chart card | `Credit History` | radius 32, header row, chart area ~ 200 px tall, legend row |
| Detail drawer | account detail | 460×840, dark glass (S4), header / hero / sparkline stat / progress pills / segmented control / year sections / month grid / action bar |
| Segmented control (drawer) | `Details · Timeline · Updates`; active label 100 % white, inactive 70 % | the content container's top edge **rises into a tab bump** under the active label (folder-tab morph) |
| Progress pill (split) | paid (lime tint) + remaining (rose tint) | 44 px tall, radius 12–14; ring-dot at the start; value right-aligned inside; ▼ marker + 1-px hairline at the current point; date label above |
| Month status tile | paid (lime check); missed (grey ×); future (empty); selected/negative (dark fill + stroke) | 58×78, radius 14, glass fill 15 %, 13-px label top-left, 24–26-px status circle bottom-right |
| Legend | dot + label | 6-px dot, 13-px label, 24-px gap |
| Tooltip bubble | chart hover | 56-px lime circle, 14-px ink value, dashed drop line, ▲ marker, date label |
| Logo mark | — | ~24-px black abstract glyph, top-left |

---

## 7. Charts

| Chart | Where | Exact styling |
|---|---|---|
| **Score band chart** (segmented range gauge) | Hero | Three rounded bands 40 px tall, radius 14, widths proportional to range (130–135 px each), gap 16 px; fills = 12 % tint of red/amber/green; each band has a **1-px baseline** at ~35 % hue; 4–5 faded history dots (5 px, 40 % hue) scattered inside; 2 solid 6-px dots on the baseline at the right end of each band; a **ring-dot** (6-px dot + 1.5-px ring, 14 px overall) as the bureau pointer; current value = 1-px ink needle + 10-px ink ▼ with a soft white halo; axis labels 12 px `#B7B7B9` (`300 · 630 · 690`) with the current `730` in ink |
| **Multi-line history chart** | `Credit History` card | 4 horizontal gridlines, 1 px dashed `rgba(12,12,12,0.10)` at 700/710/720/730; y-labels 12–13 px `#B7B7B9` left; primary series (Transunion) 1.5-px ink smooth (monotone) curve with 5-px ink dots at data points; comparison series (Equifax, Experian) 1-px at ~30 % and ~15 % ink, no dots; hover = 56-px lime circle with 14-px ink label on the point, 1-px dashed ink drop line to an 8-px ink ▲ at the baseline, date label 13 px secondary; legend below |
| **Sparkline + stat** (`On time 63%`) | Drawer | 1.5-px lime curve with a 10-px lime ring endpoint over two ghost curves (1 px white 20 %); the stat `63` 20 px white with `%` 12 px white 50 %, label `On time` 13 px white 70 % |
| **Split progress pill** | Drawer `Next Payment` | Track = two adjacent pills (paid lime 28 % / remaining rose 35 %), 44 px tall, radius 12–14; ring-dots at both starts; values 13 px right-aligned inside; ▼ lime marker + 1-px lime hairline at the boundary; date 14 px above right |
| **Dot-matrix timeline** | Green account card | 3 rows × ~24 columns of 3-px dots, white 35 %; a highlighted block of lime dots for the upcoming payments; no labels (decorative-data) |
| **Tick-ruler timeline** | Rose account card | ~26 vertical 1-px ticks, 12 px tall, white 30 %; one 2-px lime tick at the next payment; date aligned to the right below |
| **Month-grid calendar** | Drawer | 6-column grid of status tiles (see Components); year headers 16 px; `First Payment` caption right-aligned |
| **Dot-grid indicator** | `Payments on Time` card | 2 rows × 5 hollow 8-px rings (hairline grey) with 3 filled ink dots; doubles as pager/payment marker |

Common chart rules: ink for the primary series, greys for comparisons, lime only for the *current/highlighted* point; dashed grid at ≤10 % ink; axis type 12–13 px; no filled areas, no drop shadows, no gradients under lines; markers are circles/rings, the pointer is a small triangle.

---

## 8. Iconography

- **Style**: outlined, 1.5-px stroke, rounded caps/joins, mildly playful silhouettes (money bag, calendar, receipt, bank with a shield check, card with a clock). No fills except tiny detail dots.
- **Size**: 16 px inside nav pills, 18–20 px inside 44-px circles.
- **Containers**: every icon lives in a **44-px hairline circle** (ink hairline on light, white 28 % on dark/vivid); on vivid cards the circle becomes an **open-arc ring** (~300°, gap bottom-left) — a subtle "in-progress" motif.
- **Arrows**: the ↗ diagonal arrow is the universal "open" affordance — thin (1.5 px), in a filled grey circle on white cards and a solid ink circle on vivid cards / glass.
- **Status glyphs**: ink check on lime, white × on grey, `!` on an orange rounded triangle.
- Marketing frame uses a bookmark glyph in a large translucent circle.

---

## 9. What makes it beautiful

1. **Three shapes only** — pill, 32-px rounded rectangle, circle — repeated at every scale (nav, cards, tiles, badges), so the eye never has to re-learn a form.
2. **Radical colour restraint**: ink, white, one electric lime, one alert orange. All other colour is confined to two vivid cards and one glass drawer, which makes those surfaces feel precious rather than loud.
3. **Earthy, photographic mesh gradients with grain**: olive→lime and rose→tan with 5 % film grain read like printed material, not like a CSS gradient; the grain also hides banding.
4. **Ambient colour bleed**: the canvas carries blurred blooms of the card hues, so the vivid cards look *lit* and belong to the page instead of sitting on it.
5. **Hierarchy through tone, not weight**: one Regular-weight neo-grotesque; contrast comes from size (76 / 44 / 32 / 18 / 13) and from dimming secondary tokens (`$`, `/38`, `%`, `pts`) to 45–60 %.
6. **The "one solid among outlines" rule**: hairline circles and outline pills everywhere; exactly one solid ink element per group (active tab, ↗ button, close ×) tells you where to look.
7. **Corner-pinned card anatomy**: title top-left, action top-right, hero bottom-left, meta bottom-right — a stable composition that survives any content length.
8. **Data as texture**: dot matrices, tick rulers and faded scatter dots add richness at 30–40 % opacity while still being real data.
9. **A dark material for focus**: the detail drawer is genuinely dark glass over colour, so it separates from the light page by *material* rather than by a dimming scrim — depth without heaviness.
10. **Novel but legible score band chart**: tinted rounded bands, a hair-thin needle with a halo, ring-dot pointers — memorable, brand-defining, and readable in one second.
11. **Micro-signatures**: the open-arc icon ring, ring-dot markers, the lime tooltip bubble, the tab-bump segmented control — small motifs that recur and make the product feel authored.
12. **Very soft depth**: no visible drop shadows on cards; only the drawer casts a long, soft shadow. The page feels like paper and glass, not stacked plastic.

---

## 10. Accessibility risks

| Risk | Measured / estimated | Severity |
|---|---|---|
| Secondary text `#8E9196`–`#9D9FA2` on canvas `#E8EBEF` at 13–18 px | ≈ 2.6–2.9 : 1 (fails AA 4.5:1) | High — greeting line 2, tab labels, captions |
| Dimmed tokens `/38`, `pts`, `%`, axis labels `#B7B7B9`–`#C8C8C8` on white | ≈ 1.7–2.2 : 1 | High for axis labels (they carry meaning); acceptable only if treated as decorative with an accessible name |
| White 60 % labels on the lime bloom region (`#A4BB50`–`#C4DD6A`) | ≈ 1.4–1.9 : 1; even 100 % white ≈ 2.0 : 1 | High — `Paid Amount`, `Next Payment` on the green card |
| White text on the rose card (`#A87C6D`) | ≈ 3.3 : 1 | Medium — passes only for ≥ 24 px (the `$56.000` hero), fails for 13-px labels |
| White 13-px month labels on glass tiles (~`#B4846D`) | ≈ 3.2 : 1 | Medium |
| Outline controls with `rgba(0,0,0,0.12)` hairlines | boundary ≈ 1.3 : 1 (needs 3 : 1 for non-text UI) | Medium — text inside carries the affordance, but focus/hit boundaries are invisible |
| Missed-payment state = white × on `rgba(255,255,255,.18)` circle | ≈ 2 : 1 | Medium |
| Status conveyed by colour in the band chart | mitigated by numeric labels 300/630/690/730 | Low |
| Hover-only tooltip (`730` bubble) and ↗-only affordances | keyboard/touch equivalents unspecified | Medium |
| Decorative-data charts (dot matrix, tick ruler) have no values or labels | need `aria-label`/accessibility value | Medium |
| Morphing tab bump, drawer slide, bubble follow | must respect `prefers-reduced-motion` / `accessibilityReduceMotion` | Low |
| Grain overlay on vivid/glass surfaces | slightly reduces small-text legibility; keep ≤ 5 % and never under 12–13-px text | Low |
| Number formatting `12.340` vs `12,340` | locale ambiguity for screen readers and users | Low (data hygiene) |

---

## 11. Principles to carry into Prism

1. **Shape scale**: radius `full` for all controls and badges; **32 px** for cards ≥ 200 px on a side; **28–30 px** for overlays/drawers; **14 px** for nested tiles; **12 px** for in-card pills. Nested radius = outer radius − padding (32 − 24 ≈ 8–12 for inner elements).
2. **Light canvas is a mesh, not a fill**: base `#EDEFF2` (cool) → `#F1EDE8` (warm) diagonal, plus colour blooms = blurred (≥ 150 px) copies of nearby vivid surfaces at 25–35 % opacity. Never use a pure flat grey page.
3. **Neutral ramp (AA-corrected)**: ink `#0E0E10`; secondary `#5F636A` (≥ 4.6:1 on `#EDEFF2`) instead of the reference's `#8E9196`; tertiary `#8A8E94` only at ≥ 18 px or as non-essential; hairline `rgba(14,14,16,0.12)`; **component boundary** `rgba(14,14,16,0.28)` (`#B8BBC0`) where 3:1 is required; filled control `#EFEFEF`.
4. **One brand highlight**: default electric lime `#D9F53A` (brand-swappable token `accent.highlight`). Allowed uses: filled marker shapes with ink content, count badges, check states, chart *current point*, thin chart strokes on dark. Forbidden: lime text on white, lime backgrounds under white text.
5. **One alert accent** `#F75A1C` (`accent.alert`), plus a semantic trio for gauges: red `#F9621C`, amber `#FDAD03`, green `#3DD42C` with **12 % tints** for bands and **35 %** for band baselines.
6. **Vivid surface recipe**: 3-stop mesh (dark corner → mid → bright bloom at the opposite corner, ~135°), hues kept earthy/desaturated (L 45–75 %, C moderate), **4–6 % monochrome grain**, no border, no coloured shadow. Text: white 100 % for values, white 78 % for labels (≥ 13 px medium). Brand gradients map to this recipe.
7. **Glass recipes** (only over imagery/maps/vivid): *dark glass* = black 35 % + blur 40 px + 1-px inside stroke white 22 % (top-left biased) + grain 4 %; *light glass* = white 14 % + blur 30 px + stroke white 28 %; *light glass on canvas* = white 55 % + blur 20 px, no stroke. Native Liquid Glass stays for Apple system chrome only.
8. **Hero numerals**: Regular 450–500 weight (no thin weights in light mode), tabular lining figures; page hero **72–80 px**, card hero **40–44 px**, drawer hero **42 px**, inline value **32 px**; secondary tokens (`$`, `/`, `%`, units) at **50 % size** and **55 % ink** (raise from the reference's 45 % for AA on large sizes). Tracking −1 % at ≥ 32 px.
9. **Type scale**: 11 / 12 / 13 / 14 / 16 / 18 / 22 / 32 / 44 / 76 with one neo-grotesque family (Inter Display on web; SF Pro on Apple), sentence case only, no uppercase tracking labels. Two-tone headlines (ink + 45 % ink) for greetings/subtitles.
10. **Card anatomy**: padding 24 px; header row = 44-px icon circle + 18-px title (max 2 lines) + 44-px action circle; hero pinned bottom-left; meta bottom-right on the hero baseline; min size 240×230; card gap 12 px inside a pair, 16–24 px between groups, 40 px between sections.
11. **Icon buttons**: 44-px circles in three materials — outline (hairline), filled (`#EFEFEF`), solid ink — with 18–20-px, 1.5-px-stroke, round-capped icons; on vivid cards the outline becomes a **300° open arc**. The ↗ arrow is the standard "open detail" glyph.
12. **Pill navigation**: 40 px tall, 14-px medium, 16-px leading icon, 16–20 px horizontal padding, 8-px gap; active = solid ink; inactive = white 40 % + boundary hairline. Section tabs: 18 px + 2-px ink underline + 20-px count badge.
13. **Chart tokens**: primary series ink 1.5 px with 5-px dots; comparison series 30 % / 15 % ink at 1 px; gridlines 1 px dashed 10 % ink; axis text 12–13 px at **55 % ink** (not 25 %); tooltip = 48–56-px `accent.highlight` circle with 14-px ink label, 1-px dashed drop line, 8-px ▲ marker; no area fills, no shadows.
14. **Range/band gauge**: bands 40 px tall, radius 14, gap 16; 12 % tints; 1-px baseline at 35 % hue; scatter dots 5 px at 40 %; ring-dot pointer 14 px; needle 1 px ink + 10-px ▼ with an 18-px white halo; labels 12–13 px with the current value in ink.
15. **Status tiles**: 58×78, radius 14, glass 15 % fill + 22 % stroke; states — done (24-px `accent.highlight` circle + ink check), missed (24-px `rgba(0,0,0,0.30)` circle + white ×, plus tile darkened 30 % and stroke 40 %), pending (empty), selected (stroke 60 %).
16. **Split progress pill**: 44 px, radius 12; segments tinted 28 % (`highlight`) and 35 % (`alert`-tint or rose); ring-dot at each start; ▼ + 1-px hairline at the boundary; values 13 px right-aligned; date 14 px above.
17. **Motion**: drawer slide-in from the right 400 ms with backdrop blur ramping 0→40 px; card→drawer **shared-element** (icon ring, title, hero amount persist); segmented-control bump = spring (response 0.35 s, damping 0.8) sliding under the active label; tooltip bubble follows the pointer with 120-ms ease-out; check pop-in 200 ms with 1.1 overshoot; all gated by reduce-motion.
18. **Grain policy**: identical 4–6 % monochrome noise on vivid and glass surfaces only; never on white cards or the canvas; never beneath text smaller than 13 px.
19. **Badges**: 20-px circle, 11-px medium; ink (active), white + boundary hairline (inactive), `highlight` (new/positive); alert badge = 20-px rounded triangle in `accent.alert` overlapping its icon by 6 px.
20. **Contrast guardrails baked into tokens**: any text on `highlight` is ink; any 13-px label on a vivid surface is white ≥ 78 % on a region with L ≤ 60 %, otherwise the label moves off the bloom; secondary text never below 4.5:1 for < 18 px; decorative-data charts ship with an accessible value string.
