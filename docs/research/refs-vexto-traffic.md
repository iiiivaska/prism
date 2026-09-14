# Vexto — Traffic Management Platform (desktop + mobile) — forensic style analysis

**Family:** `vexto-traffic` (Dribbble 27220417 desktop, 27289370 mobile; Jack R. for RonDesignLab)
**Weight:** HIGHEST — this is the source of the owner's hand-pasted "Traffic Management" screenshots (Family B in `USER_PASTED_SCREENSHOTS.md`).
**Method:** every `.png` viewed at 2000px (16 unique frames; `desktop/05` = `desktop/00`, `mobile/02` = `mobile/00`, the two video stills are shared between folders, `desktop/09` is a blank grey video placeholder, `desktop/11` is the studio outro). The full dashboard (`desktop/06`) was cropped into six regions and upscaled 2–2.5x; ~80 pixel colours were sampled with a CoreGraphics sampler (7x7 average). The project's own style sheet (`desktop/07`) gives four hard values that anchor everything below.

Scale assumptions used for px estimates: the desktop frame shows a ~1670px-wide screen in perspective, assumed to be a 1728–1920px design, so 1 frame px ≈ 1.05–1.15 design px at the left edge (more toward the right). The mobile frames show a 393pt-wide phone at ≈1.96 frame px/pt (`mobile/05`) and ≈1.45 frame px/pt (`mobile/06`).

---

## 1. Overview

A dark, monochrome operations console floating over one enormous photographic backdrop: a desaturated satellite map (greys, dark water, vegetation kept green). Every panel is a rounded dark slab; the only colours are the map, one orange accent for "needs attention", and green/red/blue/pink used strictly as status dots, badges and map pins. Numbers are the heroes — huge Helvetica Neue UltraLight numerals with dimmed trailing digits and tiny grey units — while labels sit in a warm, rounded geometric sans. Glass is used only where there is something to refract (map, photo, an orange light beam). The mobile app is the same system compressed: pill controls over the map, one glass KPI card, a solid dark bottom sheet for alerts.

Screens in the set:

| File | What it shows |
|---|---|
| `desktop/06` | Full Live Map dashboard on a monitor (the master frame) |
| `desktop/00` | Zoom: map with glass "Passenger Load" card, vehicle puck, radar ring, dashed routes, pins |
| `desktop/01` | Zoom: "Live Passenger Volume" step chart with orange anomalies |
| `desktop/02` | Isolated "Bus 6023" glass card over an orange light beam on black (marketing frame) |
| `desktop/03` | Zoom: "Schedule Offset" table cells, orange clock icons, tick rulers |
| `desktop/04` | Zoom: "Operational Efficiency" line chart (bands, dashed target, dots) |
| `desktop/07` | Style sheet: **Helvetica Neue**, `#F39444`, `#F8F8F8`, `#040505`, `#FF0000` |
| `mobile/00, 01, 03, 04` | Zooms of the phone: glass card, pills, Warning sheet |
| `mobile/05, 06` | Full phone screens in hand (Live Map with Warning sheet) |

---

## 2. Color

### 2.1 Declared palette (from the style sheet, `desktop/07`)
| Role | Hex | Sampled |
|---|---|---|
| Accent orange | `#F39444` | `#F29444` sheet, `#F29545` clock icon in `desktop/03` |
| Off-white (text/primary) | `#F8F8F8` | `#F7F7F7` |
| Near-black (canvas) | `#040505` | `#040505` |
| Alert red | `#FF0000` | `#FF0000` sheet, `#DA0A0A` triangle, `#FE3232` badge (AA-blended) |

### 2.2 Observed neutrals (desktop `06`, sampled)
| Role | Hex (sampled) | Notes |
|---|---|---|
| Page canvas (behind left column, nav gap) | `#0C0D0E` – `#111313` | near-black with a faint cool/green cast from the map bleed |
| Tile / pill fill (24 Bus, Online) | `#1A1B1B` – `#1D1E1E` | ≈ white 6–7% over canvas |
| Card fill (Operational Efficiency) | `#1C1E1F` | ≈ white 7% |
| Vehicle card fill (Bus 4120, unselected) | `#212223` | ≈ white 9% |
| Bottom card "Schedule Offset" | `#202225` | slight blue cast (over dark water) |
| Bottom card "Live Passenger Volume" | `#292B2C` | translucent over map; reads ≈ white 12% |
| Right "Warning" panel | `#2A2D28` | translucent over map; green cast |
| Active nav pill "Live Map" | `#212222` | solid, ≈ white 9% |
| Chart band (highlight window) | `#262728` on `#17191A` | ≈ +6% white |
| Chart secondary line | ≈ `#6E7070` | ≈ white 40% |
| Dashed grid | ≈ `#3A3C3D` | ≈ white 15–18% |
| Dimmed hero digits (".3", ",580") | `#3E4241` sampled, est. `#5A5D5C` solid | ≈ white 30–35% |
| Secondary text (timestamps, axis) | est. `#8A8C8B` | ≈ white 50–55% |
| Inactive nav text | est. `#9A9A9A` | ≈ white 60% |
| Map zoom buttons | `#4B4B4B` | ≈ white 25% glass puck |
| Search field (glass over map) | `#353F2C` | green-tinted glass |

### 2.3 Alert tints
| Surface | Hex (sampled) | Recipe |
|---|---|---|
| Desktop red-tint sub-card (Capacity issue) | `#413736` / `#433536` | ≈ `#FF0000` at 10–12% over `#2A2D28` |
| Mobile red-tint card | `#251C20` – `#272024` | ≈ red 8% over `#171F22` |
| Mobile bottom sheet | `#151C21` – `#171F22` | dark with blue-teal cast |

### 2.4 Status & map colours (sampled)
| Use | Hex | Notes |
|---|---|---|
| Online check (filled circle) | `#509B4B` → est. `#3FA34D` | only as a 16px dot / pill text |
| Offline alert triangle | `#DA0A0A` → `#FF0000` | filled |
| Badge (bell, alert rows) | `#FE3232` / `#FF4747` → `#FF0000` at 18px | white numeral |
| "Online" pill text/border (Bus 4120) | est. `#7ED37E` | outlined variant |
| Map pin blue | `#0B5C93` | deep azure, ~24px circle, dark glyph |
| Map pin pink | `#AE6677` | dusty rose |
| Map pin olive/chartreuse | `#8D9425` | airport pin |
| Map pin grey | `#AFAFAF` | default stop |
| Map water | `#14191D` – `#27383D` | desaturated navy |
| Map vegetation | `#435835` | the only saturated area in the UI |
| Map terrain | `#565758` | fully desaturated |
| Route solid white | `#F8F8F8` at 100%, 3px | |
| Route dashed white | white ~85%, 3px, dash ≈10/8 | |
| Route highlight | `#F39444` 3px + soft glow | |
| Secondary roads | est. `#B8C23A` 2px | yellow-green |
| Radar ring | white ~50%, 2px, dash ≈6/6, r≈60px | around the vehicle puck |

### 2.5 Glass samples
| Glass | Top | Bottom | Notes |
|---|---|---|---|
| "Passenger Load" over map (`desktop/00`) | `#525553` | `#1D262B` | vertical luminance falloff top→bottom |
| "Passenger Load" (`desktop/06`) | `#373D36` mid | | green-grey |
| "Bus 6023" selected, over driver photo (`06`) | `#71766F` | `#20201F` | photo fades to solid card bottom |
| "Bus 6023" over orange beam (`desktop/02`) | `#7D4D2A` | `#0A0706` | plate chip `#83664C`, Online pill `#82674F` |
| Mobile pill "Bus 6023" | `#202D1E` – `#373C38` | | dark green glass |
| Mobile "Map 2" pill | `#2F402B` – `#30432D` | | |
| Mobile glass card | `#2E332E` – `#373F33` | | |
| Mobile round buttons (back/bell) | `#5E5E5F` / `#49494A` | | white ~20% glass pucks |

**Color logic in one sentence:** everything is a luminance step of white over near-black; the map supplies all the colour; orange is the only chromatic UI colour and it means "look here"; green/red/blue/pink are confined to dots, badges and pins.

---

## 3. Surfaces & Depth

| Surface | Radius | Border | Shadow | Blur / opacity | Where |
|---|---|---|---|---|---|
| **Canvas** | — | — | — | map photo bleeds full-canvas; left ~35% fades to `#0C0D0E` via a long horizontal gradient | behind everything |
| **Solid card** (Operational Efficiency, vehicle cards, Schedule Offset) | 22–24px desktop, 20pt mobile | none visible (≤1px at ~5% white at most) | none | opaque `#1C1E1F`–`#212223` | left column, bottom-left |
| **Translucent panel** (Warning, Live Passenger Volume, search) | 24px | none | none | map blurred ~30px + black tint ~55–65% → reads `#2A2D28` | right rail, bottom-right |
| **Nested alert card** | 16–20px | none | none | red tint 8–12% over parent | inside Warning |
| **Tile / stat pill** (24 Bus, Online 12) | 20px / pill | faint 1px top edge highlight ~6% white | none | `#1A1B1B` | left column top |
| **Nav pill (active)** | pill | none | none | `#212222` solid | top nav |
| **Nav pill (inactive)** | — | none | none | transparent, text only | top nav |
| **Outline pill** ("Online") | pill | 1px white ~35% (green variant: green ~45%) | none | transparent | vehicle cards |
| **Plate chip** ("L 45623") | pill | none | none | white ~15% fill; letter in a 24px darker circle | over bus drawing |
| **Icon button (desktop map + / target / −)** | circle 44px | 1px white ~8% | none | white ~20% glass | map bottom-left |
| **Icon button (mobile back / bell)** | circle 44pt | none | soft 0/8/24 black 30% | white ~20% over blurred map | phone header |
| **Glass KPI card** ("Passenger Load") | 24px desktop / 20pt mobile | 1px edge, white ~15% at top-left fading to 0 + faint chromatic (rainbow) fringe ~1–2px on the mobile version | 0/24/48 black ~35% | backdrop blur ~40px; tint black 35–45% with a slight green/grey milk (white 6–8%); vertical falloff lighter at top | floating over map |
| **Glass vehicle card, selected** ("Bus 6023") | 24px | 1px white ~12% | none | photo header (driver) behind blur ~20px, fading via gradient into the solid card bottom | left column |
| **Glass over vivid** (`desktop/02`) | 28px | 1px white ~15% | 0/30/60 black 50% | blur ~40, tint black 40%, the orange beam refracts through; a subtle halftone dot texture is visible in the beam | marketing frame |
| **Bottom sheet (mobile)** | 28pt top corners | none | none | opaque `#151C21` with top-edge gradient into map | phone lower half |
| **Mini-map inside cards** | 12px | none | none | dark map tiles `#1E1F1F`, streets ~15% white; a soft ~10% white rounded highlight polygon | vehicle cards |

Depth model: **no drop shadows on solid cards**; hierarchy comes purely from luminance steps (canvas → +6% → +9% → +12%). Shadows appear only under things that float over imagery (glass cards, round buttons). Nesting adds tint rather than borders (alert = red 10% wash).

Specular / glass edge recipe (from `desktop/00`, `desktop/02`, `mobile/00`): 1px inner edge, white 15–20% at top-left corner → 0 by the middle of each side; a second, softer top highlight (white 8% → 0 over the top ~40% of the card); the mobile card additionally shows a thin prismatic edge (cyan/magenta 1px) — pure decoration.

---

## 4. Typography

### 4.1 Families (two-font system, confirmed)
1. **Display / numerals: Helvetica Neue** (declared on the style sheet). Weights seen: UltraLight (25) for hero numerals and the marketing specimen, Thin/Light (35–45) for the page title "Traffic Management" and tile counters. Identifiers: double-storey `a` in "Management", flat-based `2`, flagged `1` without foot, horizontal terminals on `c/e/s`, the `%` with a thin diagonal.
2. **Labels / UI: a geometric rounded sans, Outfit-like** (single-storey `a` and `g` in "Warning", "Capacity", "Management" rows, "Operational"; circular `o`; straight-tailed `y`; short `t` crossbar). Closest matches: **Outfit**, then Urbanist. Not Poppins (double-storey `a`), not Manrope (double-storey `a`), not Inter/SF. Weight 400 everywhere; 500 only for the active nav tab and card titles on mobile.

Both faces at the same white; the pairing is cold Swiss grotesk (numbers) against warm rounded geometry (words).

### 4.2 Sizes (design px, desktop unless noted)
| Element | Face / weight | Size | Colour |
|---|---|---|---|
| Page title "Traffic Management" | HN Light | 56–64 | white |
| Hero KPI "78.3", "142,580", "± 2.5" | HN UltraLight | 44–48 | leading digits white; trailing ".3" / ",580" / "min" at ~35% white |
| Hero unit "%", "today", "Average Variance" | Outfit 400 | 12 | white 55–60% (unit) / white 80% (caption) |
| Tile counters "12", "4" | HN Thin | 40 | white |
| Glass KPI "87" (mobile) | HN UltraLight | 46pt | white; "%" 12pt grey |
| Card titles "Operational Efficiency", "Schedule Offset", "Live Passenger Volume", "Warning" | Outfit 400 | 16–18 | white |
| Vehicle card title "Bus 6023" | Outfit 400 | 18 | white |
| Timestamp "08.03.2026, 02:37:53 AM" | Outfit 400 | 12–13 | white ~50% |
| Nav tabs | Outfit 400/500 | 14–15 | active white, inactive ~60% |
| Tiles "24 Bus" (number + word, 2-space gap) | Outfit 400 | 14–15 | white |
| Table header "Route number", "L1…L24" | Outfit 400 | 11–12 | white ~45% |
| Table cells "-2min" / "+1min" | Outfit 400 | 13 | white / orange |
| Chart axis (06:00…21:00, 25%…100%, 50k…60k) | Outfit 400 | 11–12 | white ~50% |
| Chart value labels "55k" | Outfit 400 | 13 | white (orange when flagged) |
| Chart deltas "−8%" | Outfit 400 | 12 | white ~60% / orange |
| Alert row title "~180 passengers left behind" | Outfit 400 | 15 | white |
| Alert meta "4m ago" | Outfit 400 | 11 | white ~45% |
| Section sub-label "(2 lines)", "(Route 14)" | Outfit 400 | 16 | white ~50% inline after the title |
| Mobile title | HN Light | 20pt | white, centred |
| Mobile pill text "Bus 6023" | Outfit 400 | 16pt | white |
| Mobile sheet header "Warning" | Outfit 400 | 17pt | white |
| Mobile list item "Central Station" / "115 passengers waiting" | Outfit 400 | 15pt / 12pt | white / white 50% |

### 4.3 Numerals
- **Thin display numerals** with very open counters; letter-spacing slightly negative (≈ −1%) at 44–64px.
- **Dimmed decimals / thousands**: the least significant group is rendered at ~35% white ("78.**3**", "142,**580**"), the unit ("min") likewise dimmed at the same size in "± 2.5 min".
- **Units** are a separate 12px label, baseline-aligned, 6–8px gap.
- Figures appear **tabular** in the table and axes (columns align), proportional in the hero numerals.
- Signs are explicit: "+1min", "−2min", "± 2.5", "−0%".

### 4.4 Casing & tracking
Sentence case everywhere ("Operational Efficiency", "Live Passenger Volume"), no all-caps labels, no letterspaced eyebrows. Tracking is default for labels; large HN numerals are tightened slightly.

---

## 5. Layout & Spacing

**Desktop (`06`), estimated on a 1920×1080 design:**
- Outer margin ≈ 24px; top nav row height ≈ 48px (pill height 44–48px), logo 32px at far left, tabs spaced ≈ 32px apart, search field (pill, ≈ 260px) + four 44px round icon buttons + 44px avatar at the right.
- Three-region composition: **left rail ≈ 25%** (≈ 480px), **map centre ≈ 59%** (nothing but the map, the title, two filter pills, one floating glass card and three zoom buttons), **right rail ≈ 16%** (≈ 300px). A **bottom band ≈ 22%** of height holds two wide chart cards spanning centre + right.
- Left rail grid: 4 tiles in one row (gap 12px, height ≈ 48px), 2 stat cards (2-col, gap 12, height ≈ 110px), 1 chart card (height ≈ 280px), then vehicle cards in a 2-col grid (gap 12–16px, ≈ 230px × 300px).
- Card padding ≈ 20–24px; title → hero number ≈ 12px; hero → chart ≈ 16px; the ↗ affordance sits 20px from the top-right corner, 16px glyph.
- Table rows ≈ 40px; tick rulers ≈ 24px wide with 5–6 ticks at 4px pitch.
- Timeline scrubber inside cards: 24px tall, full card width minus padding.

**Mobile (`05`, `06`), 393pt:**
- Status bar + 44pt round back/bell buttons at 16pt inset; centred 20pt title.
- Pill row (two pills, 48pt tall, gap 8pt) 16pt below the header, overlapping the map.
- Glass KPI card ≈ 200×150pt, offset left, ~62% down the map.
- Bottom sheet from ≈ 68% of height; 20pt side padding; section rows 44pt; nested alert card padding 16pt, radius 20pt; 12pt gaps.
- Left rule on list items: 2px × 36pt, white ~60%, 12pt from text.

**Rhythm:** a 4px base (12 / 16 / 20 / 24 / 32 / 44 / 48). Whitespace is spent on the map, not inside cards — cards are dense but never cramped because every label has a single weight and a single grey.

---

## 6. Components

| Component | Variants / states observed | Anatomy & styling |
|---|---|---|
| **Top nav (desktop)** | active (solid pill `#212222`, white 500 text), inactive (text only, 60% white), hover not shown | 7 tabs, 14–15px, pill 44px tall, 16px horizontal padding, 32px gaps; logo (diagonal dash mark) 32px |
| **Search field** | default with kbd hint "Ctrl+Shift+F" | glass pill 44px over map, placeholder 13px white 50%, magnifier 20px 1.5px stroke |
| **Icon button, round** | glass over map (44px, white 20%), solid on canvas (`#4B4B4B` outline 8%), with badge (red 18px "2") | icons: wifi, headset, bell, +, target, −, ←; 1.5px stroke, 20px |
| **Avatar** | 44px circle photo | ring none |
| **Stat tile** (24 Bus / 100 Taxi / 12 Trains / 13 Trams) | default; presumably selectable | pill 48px, number then word with a 2-space gap, both 14–15px white; fill `#1A1B1B` with faint top edge |
| **Status stat card** (Online 12 / Offline 4) | ok (green filled check 16px), alert (red filled triangle 16px) | card 110px, icon top-left, label 15px, big HN Thin number 40px bottom-right |
| **KPI chart card** (Operational Efficiency) | with target, with highlighted windows, ↗ | title 16px → hero 44px with dimmed decimal + 12px unit → "Target:" label → chart |
| **Vehicle card** | selected (glass over photo header), default (solid `#212223`), compact (no map/scrubber, bottom row) | title 18px + ↗, timestamp 12px 50%, wireframe bus illustration (1px white 60%) with plate chip, row: status pill + GPS/LTE indicators, mini-map 12px radius, timeline scrubber with bus thumb |
| **Status pill** ("Online") | neutral outlined (1px white 35%, text white), success outlined (green text + green border) | 32px tall, 14px text, 14px side padding |
| **Signal indicators** ("(•) GPS", "wifi LTE") | neutral (white), active (orange radio icon on selected card), success (green wifi) | 16px icon + 13px label |
| **Plate chip** ("L 45623") | letter variants L / R | dark pill white 15%, 26px tall, letter in 22px darker circle, 13px number |
| **Timeline scrubber** | with thumb at current time | "06AM" / "11PM" 12px labels, 1px tick ruler (~40 ticks, white 30%; elapsed part brighter), round end dots 8px, 22px round dark thumb with white bus glyph |
| **Filter pills over map** ("Bus 6023 ▾", "Map 2") | with leading icon, with trailing chevron | glass, 44–48px, icon 20px 1.5px stroke, 14–16px text |
| **Glass KPI card** ("Passenger Load") | floating over map, anchored to the vehicle puck; mobile & desktop | title 15px, subtitle "Next: Central Station" 13px 55%, ↗ top-right, hero 46px "87" + 12px "%" |
| **Map vehicle puck** | selected (44px white 85% circle, dark navigation-arrow glyph, soft shadow, dashed radar ring) | |
| **Map stop pin** | grey default, blue, pink, olive (category colours) | 24px filled circle, 12px dark glyph (house / bus / plane / shop) |
| **Map zoom cluster** | + / target / − | three 44px round glass buttons, 8px gap, bottom-left |
| **Alert panel** ("Warning") | collapsed / expanded sections with chevrons; nested red-tinted alert cards; recommendation row | header 18px + chevron; section row: icon 18px + title 16px + count in grey; nested card red 10% tint, radius 18px; row: 18px red badge with number + 15px title + 11px "4m ago"; "Affected stations:" 13px grey → items with 2px left rule; "Recommend" row with sparkle icon |
| **Numbered badge** | red 18px, white 11px numeral | on bell, on alert rows |
| **Offset table** ("Schedule Offset") | cells: on-time/early (white), late (orange + clock icon) | header row 11–12px 45% white; row header = plate chip; per-column tick ruler (5–6 × 1px ticks white 25%) then value 13px; 1px column separators white 10% |
| **Volume chart card** | with anomaly highlights | see Charts |
| **Bottom sheet (mobile)** | partially expanded | 28pt top radius, opaque `#151C21`, drag handle not visible (may be hidden behind the map fade) |
| **Section header with inline count** | "Capacity Issues (2 lines)", "Schedule Deviations (Route 14)" | count in the same size, white 50% |
| **List item with left rule** | default | 2px rule white 60%, 15px title, 12px grey subtitle |
| **Card affordance ↗** | on every card | 16px, 1.5px stroke, white 80%, top-right |

---

## 7. Charts

| Chart | Type | Exact styling |
|---|---|---|
| **Operational Efficiency** (`04`, `06`) | Time-series line, 06:00–21:00, right-side Y axis 25/50/75/100% | Card `#1C1E1F`. Primary series: white `#F8F8F8` **2px** (1.5px at 1x). Comparison series: white ~40% **1px**, jittery (minute-level samples). Highlighted windows: the primary line brightens to full white and is bookended by **10px white dots** (no stroke); an "off-target" window is drawn **orange `#F39444` 2px with orange dots**. Behind each window a **vertical band** full plot height, white ~6% (`#262728`), no border, square corners. **Target line**: dashed white ~60%, 1.5px, dash ≈ 8/6, labelled "Target:" (12px, 45% white) at the top-left of the plot and ">80%" (12px) at the right just above 100%. **Grid**: horizontal dashed white ~15%, 1px, dash ≈ 4/6, at each 25%. No axis lines, no area fill, no vertical grid. Axis text 11–12px white 50%, X labels every 3h, Y labels right-aligned outside the plot. Plot padding ≈ 8px. |
| **Live Passenger Volume** (`01`, `06`) | Step/level chart with background sample bars, right-side Y axis 50k/55k/60k | Card translucent `#292B2C`. Background: dense **outlined step/candlestick shapes** in white ~20%, 1px (the raw per-minute samples), plus a faint dashed ceiling line white 15%. Foreground: for each period a **horizontal level line 2px** (white), spanning the period, with the **value label above** ("55k", 13px white) and **delta below** ("−0%", 12px white 60%). Flagged periods: level line and both labels in **orange `#F39444`** ("57k / −8%", "52k / −12%"). Positive deltas ("+6%") stay **white** — there is no green in charts. Hero above: "142,580" 44px HN UltraLight with ",580" dimmed + "today" 12px. |
| **Schedule Offset matrix** (`03`, `06`) | Table × timeline hybrid | Columns L1…L24 with **tick rulers** (5–6 vertical 1px ticks, white 25%, 4px pitch, 24px tall) preceding each value; values 13px: negative/early **white**, positive/late **orange with a 14px orange clock icon** (1.5px stroke). 1px column separators white 10%. Row header plate chips. Hero "± 2.5 min" 44px with "min" dimmed. |
| **Mini route map** (vehicle cards) | Map thumbnail | 12px radius; dark tiles `#1E1F1F`, streets 1px white 15%, one **white route 2px** with 90° bends, **white pin** 16px (filled, dark dot), soft rounded polygon highlight white 10% (the current block). |
| **Timeline scrubber** (vehicle cards) | Playback ruler | see component; elapsed ticks white 60%, remaining 30%. |
| **Map overlays** (`00`, `06`) | Live map layer | Solid white route 3px; dashed white route 3px dash 10/8; orange highlighted segment 3px with 8px glow; yellow-green secondary roads 2px; dashed radar ring white 50% 2px r≈60px around the vehicle puck; category-coloured 24px pins; the map itself desaturated except vegetation. |

Chart grammar summary: **white = data, grey = context, orange = attention, dashed = reference, band = time window, dot = bookend.** Nothing is filled; nothing is green.

---

## 8. Iconography

- **Stroke line icons, ≈1.5px at 20–24px**, rounded caps and joins, single colour (white 80–100%). Set resembles Iconly-Light / Hugeicons stroke: bus (front view), split-map, headset, bell, wifi, magnifier, GPS "((•))" radio waves, LTE wifi arcs, clock, crosshair/target, +, −, ← back, ↗ open, chevron up/down, sparkle "recommend".
- **Filled glyphs only for status**: green circle-check, red triangle-alert, red numbered badge, map pin glyphs (house, bus, plane, shop) inside coloured discs.
- **Wireframe illustrations**: side-view bus drawn in 1px white ~60% (no fill), with wheels and window mullions; an E-Bus variant shows orange doors. The plate chip overlaps the drawing.
- **Logo**: a diagonal cluster of short dashes (motion / traffic-flow mark), 32px, white.
- Map puck glyph: a rounded navigation arrow (filled, dark on white).

---

## 9. What makes it beautiful (concrete)

1. **One photographic backdrop, monochrome UI.** The desaturated satellite map (only vegetation keeps its green) is the sole source of colour; every panel is a luminance step of white over `#0C0D0E`. The eye never fights the UI for the map.
2. **Luminance-only hierarchy.** Canvas → +6% → +9% → +12% white, no borders, no shadows on solid cards. Nesting is a tint (alert = red 10% wash), never an outline.
3. **Instrument numerals.** Helvetica Neue UltraLight at 44–64px with the least-significant digits dimmed to ~35% and a 12px unit beside them; "142,**580** today", "78.**3** %", "± 2.5 **min**". It reads like a gauge, not a spreadsheet.
4. **Two-font tension.** Cold Swiss grotesk for numbers, warm rounded geometric (Outfit-like) for words, both at weight 400 or lighter. Contrast comes from family, not weight.
5. **One accent with one meaning.** `#F39444` appears only where attention is needed (late minutes, negative deltas, an off-target chart window, the active GPS). Positive deltas stay white, so orange never competes with a green.
6. **Glass only where it refracts something.** Over the map, over a driver photo, over an orange light beam — never on the flat canvas. Top-left specular edge, vertical luminance falloff, soft shadow, optional prismatic fringe.
7. **Charts drawn as hairlines.** 2px white series, 1px 40% comparison, dashed 60% target, 6% bands for time windows, 10px white dots as bookends; no fills, no axis lines, Y axis on the right where the eye lands.
8. **Pill grammar.** Every control is a pill or a circle at 44–48px (tabs, tiles, filters, zoom, back, bell, status). Cards are 24px-radius rounded rectangles. Two shapes, total consistency.
9. **Technical-drawing motifs.** Wireframe bus, tick rulers in the table, a ruler-style timeline scrubber, dashed geofence ring, dashed routes — the ops-room feeling is built from hairlines and dashes.
10. **Micro-typography discipline.** Units 12px, meta 11px, secondary at one grey (~50%), sentence case everywhere, the same ↗ 16px affordance in the same corner of every card.
11. **Dense but calm.** Cards are packed (a KPI, a chart, a table in 280px) yet feel spacious because there is exactly one label weight, one grey, and 12–16px gutters.
12. **Depth of field in the stills** (blurred foreground/background in `00`, `01`, `03`, `04`, mobile `00`, `03`) signals that the product is meant to move — zoom, parallax, focus pulls — and hints that the map is 3D-tilted.

---

## 10. Accessibility risks

1. **Dimmed hero digits** (~35% white on `#1C1E1F`) ≈ 2.3:1. They are 44px, so the 3:1 large-text bar applies — and they carry real precision. Raise to ≥45% white (≈3.1:1) or ≥50% for safety.
2. **Chart axis and table headers at 11–12px, 45–50% white** — `#8A8C8B` on `#17191A` is ≈4.9:1 (passes), but anything under 45% (e.g. "Route number" at ~40%) drops to ≈3.6:1 and fails AA for small text.
3. **Text on glass over bright imagery.** The selected Bus 6023 header sits on `#71766F`; white 4.2:1 (borderline), the 50% grey timestamp fails. A minimum dark tint floor (≥45% black) is needed under any glass that carries body text.
4. **Red `#FF0000` badge with white 11px numeral** ≈ 4.0:1 → fails AA for small text. Use `#E5252A`/`#D70015` or a 12–13px bold numeral.
5. **UltraLight numerals below ~32px** will hairline-break on 1x displays; keep UltraLight ≥ 32px, use Thin/Light below.
6. **Orange on light surfaces** would be ≈2.2:1 on `#F8F8F8` — the accent only works on dark. A light theme needs a darker orange (`#C9651A`-ish) or non-text use only.
7. **Colour-plus-icon is mostly respected** (clock on late cells, triangle on Offline, check on Online) — keep it; the orange chart window and orange level lines have no icon and rely on colour alone.
8. **Small interactive glyphs** (16px chevrons, 16px ↗) need 44px hit areas; the mobile chevrons sit at the card edge.
9. **Category pins** (pink `#AE6677` with a dark 12px glyph ≈ 4:1) are borderline; add labels on focus/hover.
10. **Dashed hairlines at 15–25%** are decorative-only; fine, but the tick rulers in the table encode nothing accessible — ensure the value text carries the meaning.
11. **Motion**: radar pulse, marching-ant dashes and depth-of-field parallax must respect Reduce Motion.

---

## 11. Principles to carry into Prism (with numbers)

1. **Dark canvas tokens:** `bg.canvas #0C0D0E`; `surface.1 = white 6%` (≈`#1C1E1F`); `surface.2 = white 9%` (≈`#212223`); `surface.3 = white 12%` (≈`#292B2C`); `surface.tint.danger = red 10%` over the parent. No drop shadows on solid surfaces; shadows (0/24/48 black 35%) only under glass or floating pucks.
2. **Radius scale:** 12 (nested media/mini-map), 20 (mobile cards), 24 (desktop cards), 28 (sheets), pill = 999 for every control. Two shapes only: pill and rounded rectangle.
3. **Hero numeral style:** display face Thin/UltraLight (Helvetica Neue UltraLight ≈ SF Pro Display Ultralight on Apple; Inter Thin / "Helvetica Neue" stack on web) at 44 / 56 / 64; trailing group at **45% white** (not 35%) to hold 3:1; unit label 12px at 60% white with a 6px gap; tabular figures in tables/axes, proportional in heroes; explicit +/−/± signs.
4. **Label face:** geometric rounded sans with single-storey a/g (Outfit, fallback Urbanist) at 11 / 12 / 14 / 16 / 18, weight 400; 500 only for the active state. Sentence case; no all-caps eyebrows.
5. **Accent policy:** one accent (default brand orange `#F39444`) meaning "attention"; semantic green `#3FA34D` and red `#FF0000`/`#E5252A` only in 16–18px dots, badges, and 10% tinted surfaces; **positive deltas stay neutral**, never green.
6. **Glass recipe (only over imagery / vivid):** backdrop blur 40px; tint black 40% (green-cast over maps); milk white 6%; 1px edge white 15% top-left → 0; specular white 8% → 0 over top 40%; shadow 0/24/48 black 35%; optional prismatic 1px fringe token off by default. Floor: never body text on glass with a tint under 45% black.
7. **Chart tokens:** `series.primary` white 2px; `series.secondary` white 40% 1px; `grid` dashed white 15% 1px 4/6; `reference` dashed white 60% 1.5px 8/6 with an inline label; `band` white 6%; `point` 10px white, no stroke; `highlight` accent 2px + accent points; axis text 12px white 55%; Y axis on the right, X labels every major interval; no axis lines, no area fills.
8. **Layout ratios:** rails 25% / centre / 16%; bottom band 22% of height; outer margin 24; gutters 12–16; card padding 20–24; title→hero 12; hero→chart 16; imagery bleeds full-canvas with a horizontal fade to canvas behind the primary rail.
9. **Control sizes:** pills 44 (desktop) / 48 (mobile); round icon buttons 44; stat tiles 48; table rows 40; scrubber 24; badge 18 with 11–12px bold numeral; chevron/↗ glyphs 16 inside 44 hit areas.
10. **Status pill:** outlined 1px white 35%, 32px tall, 14px text, 14px padding; success variant = green text + green 45% border; never filled.
11. **Line-art assets:** 1px white 60%, no fills, technical side-view; overlays (plate chip) = white 15% pill with a 22px letter circle.
12. **Map layer tokens:** basemap desaturated (keep vegetation), route solid white 3px, route planned dashed 3px 10/8, route alert accent 3px + 8px glow, secondary road 2px yellow-green, geofence dashed ring white 50% 2px, puck 44px white 85% with dark glyph, pins 24px category discs with 12px glyphs.
13. **Iconography:** 1.5px stroke, 20/24px grid, rounded caps/joins, white 80%; filled only for status (check, alert, badge).
14. **Motion (from stills):** dash-offset march for planned routes (≈40px/s), radar ring pulse 2s ease-out scale 1→1.4 fading 50→0%, card "open" via ↗ = scale 0.98→1 + blur 8→0 in 200ms, accordion 250ms spring (0.8 damping), scrubber thumb spring-driven drag, map fly-to with depth-of-field 600ms; all disabled under Reduce Motion.
15. **Contrast floors baked into tokens:** body ≥14px → white ≥62% on `surface.1` (≥4.5:1); captions 11–12px → white ≥60%; decorative ≥24px → white ≥45% (≥3:1); accent text only on dark surfaces; red badges use `#E5252A` under white text.
