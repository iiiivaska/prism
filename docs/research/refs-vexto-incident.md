# Vexto Incident Response — forensic style analysis (RonDesignLab)

Sources analysed: `vexto-desktop` (shot 27619812, "Vexto - Incident Response Desktop App") and `vexto-mobile` (shot 27571204, "Vexto - Incident Response Mobile App"), plus the owner's hand-picked screenshot notes (`USER_PASTED_SCREENSHOTS.md`, Family B — the same product family). All 18 stills were viewed at 2000 px and pixel-sampled (11×11 averages for surfaces; most-saturated / brightest pixel in a crop for accents and text). Zoomed crops were cut for geometry. The two `.mp4` files were probed and contact-sheeted: **they are not Vexto** (the desktop video is a light SugarCRM case-management concept, the mobile one a "Travel planning" AI-assistant concept — Dribbble's attached studio reel). Their stills `09.png` are the same non-Vexto content. They are ignored below except as evidence of the studio's light-theme habits.

Important finding on scope: **the desktop shot re-uses the Traffic Management dashboard frames** (desktop/00–07 are the same "Traffic Management" screens documented in `refs-vexto-traffic.md`; the only incident-specific desktop elements are the `Incidents` nav tab, the Warning panel with red-tinted alert sub-cards, red numbered badges and the Offline triangle). **The genuinely new material is the mobile shot**: a rendered 3D "diorama" map, a red *incident* state applied to a vehicle card (Accident pill + red-filled damaged section on the wireframe bus), a red incident map marker with a dashed halo and a red-recoloured road, a Live Webcam card with a synthetic 3D reconstruction of the crash, a glass bottom sheet with a round-button toolbar, and a seven-button map tool cluster. This report covers both, but leans on the mobile shot and treats the desktop as the shared "dark ops" baseline.

Hex values are pixel averages from mockup renders (perspective, depth-of-field and glass blur affect them; treat as ±6 per channel). Values marked **(pure)** are the most-saturated pixel in a crop and are reliable for the accent hue.

Scale assumptions: desktop monitor (desktop/05) ≈ 1.17 frame px per CSS px (1440-wide layout); desktop macros (03, 04) ≈ 2.27 px/px (44 px round buttons ≈ 100 frame px); desktop/07 ≈ 2.5 px/px. Mobile full-phone frames ≈ 2.1 (mobile/04) and 1.68 (mobile/05) frame px per pt (393 pt iPhone); mobile macros ≈ 4.0 (03) and ≈ 5.1 (01, 02) px/pt.

---

## Overview

Vexto Incident Response is a **map-first, dark-ops** product. The whole screen *is* a map — on desktop an art-directed satellite image desaturated to charcoal with green vegetation and deep-teal water; on mobile a rendered 3D oblique "diorama" (dark forest greens, pale fields, blue-grey water, pale town, white-lit roads). The UI is a small set of surfaces floating on that world: solid near-black cards on the desktop's left rail, dark green-tinted glass panels and sheets over the map, and a *lighter* glass for the selected or foregrounded object (selected vehicle card, Live Webcam card, Passenger Load card). Everything the UI paints is achromatic white at three or four opacities; colour is reserved for meaning — **orange for deviation**, **green for online**, **red for alert / incident** — and for the map's own POI pins (blue, pink, yellow) and route overlays.

The incident language is the new contribution: red is used as a *state material*, not just a badge. A damaged bus gets a red-filled section on its wireframe; the incident location gets a red glass disc, a dashed red halo and a red-recoloured road segment; the vehicle sheet gets an outlined red "Accident" pill; the toolbar's document button gets a red radial tint and a red dot; and the webcam reconstruction paints the offending car as a glowing red wireframe over a black scene with white wireframe pedestrians. The result reads at a glance from across a dispatch room and still looks premium, because red is always translucent, always paired with a white structure, and never used for text larger than a pill label.

Typographic engine: a geometric sans (closest to **Outfit** Light/Regular — splayed M, single-storey g, straight-leg R, flat-cut t, near-circular O/C; the sibling traffic shot declares Helvetica Neue and the big page title "Traffic Management" is indeed Helvetica Neue Light) for labels, and **UltraLight/Thin numerals** at 40–66 px for heroes, with fractional or trailing digits dimmed to ~40 % white. Charts are drawn like instrument readouts: 1 px series, dashed targets, tick rulers, endpoint dots, inline value/delta labels, no fills, no legends.

Mood: **dark-ops**. Family: RonDesignLab "Vexto" (fleet / traffic / incident SaaS).

### Frame inventory

| File | Content | What it contributes |
|---|---|---|
| desktop/00 | Macro: "Passenger Load 87 %" dark-green glass card tilted over the map | Glass over map recipe (#3A4532 centre, #444B3C top-left), route language (solid white active route, dashed white alternates, dashed geofence circle, orange/yellow highway), POI pins (blue port #0368AE, pink city #B06677, white station), live-bus glass marker (#ECEDEC disc, dark arrow glyph) |
| desktop/01 | Macro: Live Passenger Volume step chart | Plateau steps with value above / delta below; **orange #FF983C (pure)** used only for the negative bucket, with an orange band (#353230) under it; raw spiky series at ~25 % white behind; dashed grid; hero "142,**580**" with "580" dimmed to #666769 |
| desktop/02 | Macro: selected Bus 6023 card over a black background | The light glass recipe (top #8C938D bloom → #060606 at the bottom, so the tint is ~white 30 % + blur, transmissive), plate chip (#989C99 fill, #6C7170 letter circle), outlined "Online" pill, GPS/LTE icon+label pairs, mini route map with white pin |
| desktop/03 | Macro: Warning panel, search pill, round icon buttons | Dark glass panel (#242722), red-tinted sub-card (#312523, i.e. red ≈ 10 % over the panel), pure-red badge (#FF0004), text opacities (title #FFFFFF, caption #978F8D, tertiary #848683), 2 px left rules on station rows, "Recommend" sparkle row, expand chevrons |
| desktop/04 | Macro: vehicle card grid, map +/⊕/− controls, Schedule Offset hero | Card geometry (≈242 × 326 px, radius 20 px, padding 16 px), timeline scrubber (tick ruler, dim endpoint dots, round bus thumb), green "Online" pill text **#61C958 (pure)**, orange E-Bus door highlight, orange clock icon **#FC9747 (pure)**, hero "± 2.5 **min**" with unit dimmed |
| desktop/05 | Full dashboard on a monitor | Whole layout: logo, pill nav, left rail (tiles, status tiles, Operational Efficiency chart, 2×2 vehicle cards), full-bleed map with title, chips, search, round buttons, Warning rail, Schedule Offset + Live Passenger Volume band |
| desktop/06 | Marketing slate: Live Passenger Volume card on blurred green | Studio brand green ground #385449, dark glass card #162A1A (≈ black 45 % + blur), orange delta #E88F3D, studio display font (heavy geometric) — not product UI |
| desktop/07 | Macro: top-left of the dashboard | Nav pill (active = lighter solid #242525 with hairline), tiles (#1E1E1E on #0D0D0D ground), status tiles with green check **#68D45A (pure)** and red triangle **#FF0500 (pure)**, hero "78.**3** %" (white #FFFFFF, ".3" #6B6B6B), Operational Efficiency chart at full resolution, "Bus 6023 ⌃" glass chip |
| desktop/09 | Video still (SugarCRM light concept) | Not Vexto — shows the studio's light-theme habits: #F1F2F4 ground, white pill tabs, solid black active pill, round 44 px icon buttons |
| mobile/00 | Macro: bottom half of the phone — Bus 4120 sheet with Accident state, webcam thumbnail above | Sheet glass (#374434 → #212A25), Accident pill, red-filled bus section, toolbar with solid white active button and red-tinted alert button |
| mobile/01 | Macro: top of the map — "Bus ⌄" chip, bell with badge, tool cluster | Transmissive glass: the same round buttons read #69737B over water and #5F6E5B / #4B5D48 over forest; pink bus pin #B86378; red badge #FD2626; incident road #E8554E |
| mobile/02 | Macro: Live Webcam card tilted over the map | Light glass with a refracted chromatic edge; title #FFFFFF, address #B0B3AC; the reconstruction: black ground, white wireframe crossing/pedestrians, grey photoreal bus, **red wireframe car #FF342B–#FF6977** |
| mobile/03 | Macro: Bus 4120 sheet at the phone's bottom corner | Sheet corner follows the device; "Accident" pill: border/text **#FE483D (pure)**, fill ≈ red 12 %; damaged section fill **#C93A36** at ~50 %; toolbar track #232626; active button white; red dot #FF493E under the document button; copy icon next to the truncated hash |
| mobile/04 | Phone in hand, full screen | Whole mobile layout: status bar, logo, chips row, seven-button tool cluster, incident marker (dashed halo + red glass disc), Live Webcam card at ~57 % width, top of the bottom sheet |
| mobile/05 | Phone in hand, full screen (closer) | Same layout, cleaner: sheet (#374434 top), toolbar, mini map grid showing through the sheet's lower zone, "…s Location" label cut at the bottom |
| mobile/06 | Two hands, finger on the webcam card | Touch context: card ≈ 57 % width, 44 pt round controls, thumb reach of the toolbar |
| mobile/07 | Marketing slate: Live Webcam card on blurred green | Same brand green #385449, glass card #2A3C2E |
| mobile/09 | Video still ("Travel planning" AI concept) | Not Vexto |

---

## Color

### Grounds and surfaces (dark theme)

| Role | Sampled | Notes |
|---|---|---|
| Page ground (desktop) | #0D0D0D – #101012 – #161616 | Neutral near-black; the left rail sits on this solid ground |
| Map land (satellite, desktop) | #1B1E1F – #434649 | Charcoal; lighter where terrain is snow/rock |
| Map water (desktop) | #181D22 – #203036 | Deep desaturated teal — the one large "colour" |
| Map vegetation (desktop) | #192127 – #3D3030 (shadowed) | Greens kept, everything else pulled to grey |
| Map (mobile 3D render) | forest #1B2922, fields #5A7948, canopy #4E6040, water #212835 – #222B36 | Saturated but dark; a vignette darkens the top ~15 % behind the status bar |
| Solid card (surface-1) | #1A1A1A – #1B1C1E | ≈ white 6–7 % over ground |
| Tile / pill (surface-2) | #1E1E1E – #202020 with a 1 px lighter hairline | ≈ white 8 % + hairline white 8 % |
| Active nav pill | #242525 + hairline | Lighter by one step; text 100 % |
| Bottom-band cards over map | #1B1B1B (Schedule Offset), #292929 (Live Passenger Volume) | The right one is glass picking up the map |
| Dark glass panel over map (Warning) | #242722 – #2E302B | ≈ rgba(16,20,16,0.6) + blur; takes on the map's green |
| Red-tinted alert sub-card | #312523 (desktop/03), #382F2C (desktop/05) | ≈ red 10–12 % over the panel; no border |
| Dark-green glass card (Passenger Load) | #3A4532 centre, #444B3C top-left, #242C31 in the full frame | Same recipe over a greener/brighter patch of map |
| Light glass (selected Bus 6023 card) | top-left #8A8F88 – #9EA29A → centre #393C3B → bottom #1C1D1D | ≈ white 28–32 % + blur 40, with a radial bloom at top-left |
| Light glass (Live Webcam card, mobile) | #45515E over water/town, #4E5B5F, #727B6F over grass | Same recipe; tint follows backdrop |
| Sheet glass (mobile Bus 4120) | #374434 top → #212A25 / #262F28 lower | ≈ rgba(18,26,20,0.6) + blur 40; the mini-map grid shows through the bottom zone |
| Chip glass ("Bus ⌄", bell) | #545E59 / #3D443E (mobile/04), #424941 – #979D9B (mobile/01 macro, lit) | ≈ white 14–20 % over blurred map |
| Round map buttons (mobile) | over water #818990 / #69737B; over forest #72816F / #5F6E5B / #4B5D48 | Transmissive — proof the fill is a white-alpha tint, not a painted grey |
| Round map buttons (desktop +/⊕/−) | #6E6E6E (on grey ground in macro), #1A1E16 (over map) | |
| Search pill (desktop) | #3F4936 – #414B39 | Green-tinted glass |
| Toolbar track (mobile) | #232626 – #3B3B39 | ≈ black 30 % over the sheet |
| Toolbar neutral button | slightly lighter than track (≈ white 6 %) | |
| Toolbar active button | #FFFFFF (renders #D6D6D6 in shade) | Solid white, black glyph |
| Toolbar alert-state button | #534341 – #584A45 | Red radial tint ≈ rgba(255,60,60,0.25) |
| Plate chip on light glass | #989C99 fill, #6C7170 letter circle | ≈ white 45 % / white 25 % |
| Plate chip on solid card | #797979 fill | ≈ white 40 % |
| Mini route map fill | #282A2A with grid lines ≈ white 12 % | |
| Studio marketing ground | #385449 (blurred green photo) | Brand green, not product UI |

### Semantic and accent colours

| Role | Sampled | Suggested token |
|---|---|---|
| Accent orange (deviation, negative delta, late, highlighted segment, clock icon, E-Bus door) | **#FF983C (pure)** chart line, **#FC9747 (pure)** icon, #E88F3D text on green | **#F5973F** (sibling declares #F39444) |
| Success green (Online pill text, check icon, LTE icon) | **#61C958 (pure)**, **#68D45A (pure)** | **#62CC5A** |
| Danger red — badges and status icons | **#FF0004 (pure)**, **#FF0500 (pure)** | **#FF1A1A** (pure red family) |
| Incident red — text, pill border, marker, dot (mobile) | **#FE483D / #FF4544 / #FF3D4A (pure)**, dot #FF493E | **#FF4642** — a warmer coral red used for anything that must be *read* on dark glass |
| Incident fill — damaged bus section | **#C93A36** at ≈ 50 % (reads #2A0F0C – #32100D over the sheet) | rgba(201,58,54,0.5) |
| Incident road recolour (mobile map) | **#E8554E (pure)**, highlights #FA6B67 | #E8554E, 3 pt |
| Incident marker disc | #CF4F4D – #D7504D, glyph #FF4348 | rgba(255,70,64,0.45) + blur, glyph #FF4642 |
| Webcam red car (glow wireframe) | #FF342B core → #FF6977 bloom | |
| Map pin blue (port) | **#0368AE (pure)** | #1E7BC2 |
| Map pin pink (city / bus stop) | #B06677 – #C26881 (desktop), #B86378 (mobile) | #C46A82 |
| Map pin yellow (airport) | #A1AC1F | #C9C23A |
| Map pin neutral (station) | light grey disc #D8D8D8-ish with #2A2A2A glyph | |
| Live vehicle marker | #ECEDEC glass disc with dark arrow glyph | |
| Route active | white 100 % solid, 3 px | |
| Route alternative | white dashed, 2 px, ~6/6 | |
| Geofence | white dashed 1 px circle | |
| Highway | orange→yellow #766426-ish (desaturated on the satellite), 1.5–2 px | |

### Text opacities (white over dark surfaces)
- Primary (titles, values, labels): **#FFFFFF** (100 %)
- Secondary (captions under titles, units next to heroes, address lines): **#9F9A97 – #B0B3AC** (≈ 62–68 %)
- Tertiary (axis labels, "(2 lines)", "4m ago", hash ids): **#848484 – #858F87 – #978F8D** (≈ 50–55 %)
- Dimmed decorative digits (".3", "580", "min"): **#6B6B6B – #666769** (≈ 40 %)
- "today" unit next to the hero: #E3E3E3 (≈ 90 %, but 11 px)

---

## Surfaces & Depth

No drop shadows anywhere in the product UI. Depth is built from (1) a luminance ladder of solid surfaces, (2) hairlines, and (3) — only over imagery — blur and tint. Four materials:

1. **Solid card** — #1A1A1A on #0D0D0D ground; 1 px hairline at white 8 % (visible on tiles and the nav pill, barely on large cards); radius **20 px** (desktop cards), **14 px** (nested sub-cards), **pill** for tiles, chips and buttons; padding 16 px; no shadow.
2. **Dark glass** (over map) — tint ≈ rgba(16,20,16,0.55–0.65) + backdrop blur 30–40 px + saturate ~120 %; 1 px inner top highlight at white ~8 %; radius 20 px desktop, 24–28 pt mobile; when the sheet meets the screen edge its corner follows the device corner (≈ 44 pt on the iPhone in mobile/03). It picks up the map's green (#242722 – #374434), which is what makes it feel "in the world".
3. **Light glass** (selection / foreground object) — tint ≈ rgba(255,255,255,0.24–0.32) + blur 40 px; a **radial bloom at top-left** (white ~35 % → 0 across ~60 % of the card: #9EA29A → #1C1D1D on Bus 6023) that reads as a light source; a 1 px specular top edge at white ~35 %; in the marketing macros a 2–3 px refracted "lens" rim with slight chromatic fringing (mobile/02). Text stays white 100 % on it — which is the main accessibility trap (see below).
4. **Chip glass** (controls) — rgba(255,255,255,0.14–0.20) + blur 20 px, 44 px/pt round or pill; icon and text white 100 %; the fill visibly changes with the backdrop (grey-blue over water, green over forest).

State materials layered on top of these:
- **Alert sub-card**: red 10–12 % flat tint over dark glass, radius 14 px, no border (#312523).
- **Accident pill**: 1 px border rgba(255,70,66,0.5) + fill rgba(255,70,66,0.12) + text #FF4642; pill radius; 92 × 27 pt.
- **Damaged section**: rgba(201,58,54,0.5) fill clipped to the wireframe's section, with the wireframe strokes inside recoloured red.
- **Alert toolbar button**: radial red tint rgba(255,60,60,0.25) inside the round button + a 4 pt red dot centred beneath the track.
- **Incident marker**: 32 pt disc rgba(255,70,64,0.45) + blur 8, darker 1 pt rim, red rounded-triangle glyph with a dark "!"; a **dashed halo** ~80 pt, 1 pt, #FF4642 at ~70 %, dash ≈ 4/4; the road segment through it recoloured #E8554E.
- **Live marker**: 32 px disc of light glass (#ECEDEC at ~85 %) with a dark navigation-arrow glyph; sits inside a dashed white geofence circle.

Hairlines and separators: table rows at white 8 %; tick rulers at white 25–45 %; station-list left rules 2 px at white 25 %; grid lines in charts dashed at white 12 %; mini-map street grid at white 12 % on #282A2A.

---

## Typography

**Family guess.** Labels/UI: a geometric sans closest to **Outfit** (Light 300 for captions and numerals inside cards, Regular 400 for titles and labels). Evidence: splayed M in "Marsfield", single-storey g in "Warning"/"passengers", straight-leg R in "Recommend", flat-cut t in "left", near-circular C/O in "Capacity", '1' with a flag and no base in "4120". Second candidate: Urbanist (also splayed M, similar g); Poppins is too wide/round in the bowls; Inter/SF/Manrope are ruled out by the splayed M and the round C. Hero numerals and the desktop page title: **Helvetica Neue UltraLight / Thin** (the sibling style-guide frame declares Helvetica Neue; "Traffic Management" shows Helvetica's ff and a-spur; the thin "142,580", "± 2.5", "87 %", "78.3", "12", "4" match Helvetica Neue 25 UltraLight — flat-based 2, round 0, slashed %). The studio's outro slate ("Save this design") uses a heavy geometric (Outfit Black-like) — not product UI. Status bar "9:41" is SF Pro (system).

**Observed sizes** (frame px converted to CSS px on desktop / pt on mobile):

| Element | Size | Weight | Colour |
|---|---|---|---|
| Desktop page title "Traffic Management" over the map | 64–66 px | UltraLight | white 100 % |
| Desktop hero numerals (78.3 %, ± 2.5 min, 142,580, 87 %) | 44–48 px | UltraLight/Thin | white 100 %; fractional/trailing part 40 % |
| Status tile numbers (12, 4) | 40 px | Thin | white 100 % |
| Hero unit ("%", "today", "min" when not part of the numeral) | 12–14 px | Light | 60–90 % |
| Card titles ("Operational Efficiency", "Bus 6023", "Schedule Offset", "Warning") | 16–18 px | Regular | 100 % |
| Warning group headers ("Capacity Issues (2 lines)") | 15–16 px | Regular; count in parentheses at 50 % | |
| Row titles ("~180 passengers left behind") | 15 px | Regular | 100 % |
| Nav tabs | 15 px | Regular | inactive 75 %, active 100 % |
| Tile labels ("24 Bus") | 14 px | Light number + Regular label | 100 % |
| Table cells ("-2min", "+1min") | 13 px | Regular | white / orange |
| Captions ("Target:", "Average Variance", "4m ago", "Affected stations:") | 11–12 px | Light | 50–65 % |
| Axis labels (06:00, 25 %, 45k) | 11 px | Light | 50 % |
| Timeline labels (06AM / 11PM) | 12 px | Regular | 70 % |
| Mobile sheet title ("Bus 4120") | 20 pt | Regular | 100 % |
| Mobile card title ("Live Webcam") | 17 pt | Regular | 100 % |
| Mobile secondary (hash id, address) | 14 pt | Light | 55–65 % |
| Mobile chip label ("Bus") | 16 pt | Regular | 100 % |
| Mobile pill text ("Accident") | 14 pt | Regular | #FF4642 |
| Mobile connectivity labels (GPS, LTE) | 15 pt | Regular | 100 % |
| Badge digit | 11 px/pt | Medium | white on red |

**Numerals.** Hero numbers are proportional UltraLight; the *insignificant* part is dimmed rather than shrunk: "78.**3**", "142,**580**", "± 2.5 **min**". Units are set small (12 px) at 60 % and baseline-aligned. Tables and axes use what look like tabular figures (the "-2min / +1min" columns align). Signs are always explicit (+6 %, −8 %, ± 2.5). Dates use a monospaced-feeling rhythm "08.03.2026, 02:37:53 AM" at 12–13 px Light, 60 %.

**Casing and tracking.** Sentence case everywhere ("Live Webcam", "Schedule Deviations (Route 14)"); no all-caps labels; tracking normal (slightly loose on the UltraLight heroes, which is intrinsic to the weight). Truncation with an ellipsis ("A564tf52dae53…", "233 Marsfield Ave, Kln…", "University Campu") paired with a copy icon for ids.

---

## Layout & Spacing

**Desktop (1440 layout, desktop/05).** 24 px page margin. Top bar: logo (24 px, four diagonal dot-bars) + pill nav ("Live Map" active) at y ≈ 24, tabs spaced ~32 px, active pill 40 px tall with 20 px horizontal padding. Left rail ≈ 415 px wide, stacked with 12 px gaps: a 4-up row of pill tiles (106 × 38 px, 8 px gaps), a 2-up row of status tiles (≈ 200 × 86 px), the Operational Efficiency card (≈ 415 × 240 px), then a 2 × 2 grid of vehicle cards (≈ 200 × 300 px each in the dashboard; 242 × 326 px in the macro). Map fills the remaining ~1000 px, full-bleed to the top edge behind the nav (nav sits on a soft dark vignette). Over the map: page title at top-left of the map area (x ≈ 24 px into the map, y ≈ 120), two glass chips beneath it ("Bus 6023 ⌃", "Map 2"), search pill (≈ 210 × 44) + three 44 px round buttons + avatar at top-right with 8 px gaps, Warning rail (≈ 280 px wide) at the right with 16 px margin, +/⊕/− round buttons (44 px, 8 px gaps) at the map's bottom-left, and a bottom band of two chart cards (Schedule Offset ≈ 560 × 220; Live Passenger Volume ≈ 520 × 220) with 12 px gap. Card padding 16–20 px; internal vertical rhythm 12 px; title→hero gap 8 px; hero→chart gap 12 px.

**Mobile (393 pt).** 16 pt side margins. Status bar standard. Row 1 at y ≈ 52 pt: logo (left, ≈ 40 pt), "Bus ⌄" chip (102 × 44 pt, centred-right), bell button (44 pt round, badge offset 4 pt outside the top-right). Row 2 at y ≈ 110 pt: seven 44 pt round tool buttons in a line with 6–8 pt gaps, left-aligned from the 16 pt margin (they nearly touch — reads as one instrument strip). The map occupies everything. The **Live Webcam card** floats at ≈ 224 × 164 pt (57 % width), left-aligned at the 16 pt margin, roughly 40 % up from the bottom; padding 16 pt; image inset 12 pt, radius 14 pt, ~200 × 100 pt. The **Bus 4120 sheet** rises from the bottom, full-width with corners matching the device (≈ 44 pt), taking ≈ 38 % of the screen; padding 20 pt; title block, then the wireframe (≈ 190 × 70 pt) left and the Accident pill + GPS/LTE right, then the toolbar pill (≈ 244 × 52 pt, 4 pt inner padding, 44 pt buttons, 4 pt gaps) centred with ~12 pt to the home indicator; the sheet's lower zone shows a mini-map grid through the glass with a "…s Location" label.

**Spacing scale in evidence:** 4 / 8 / 12 / 16 / 20 / 24 (badge offset 4, button gaps 8, card gaps 12, padding 16, sheet padding 20, page margin 24).

---

## Components

| Component | Variants / states observed | Styling details |
|---|---|---|
| Pill nav tab (desktop) | active (solid #242525 + hairline, text 100 %), inactive (text 75 %, no fill) | 40 px tall, 20 px padding, pill radius; tabs: Live Map, Fleet, Routes, Analytics, Maintenance, Incidents, Crew |
| Logo mark | — | four diagonal bars made of dots/dashes, white; 24 px desktop, ≈ 40 pt mobile |
| Count tile ("24 Bus") | default | pill, 106 × 38 px, #1E1E1E + hairline, number Light + label Regular 14 px |
| Status tile ("Online 12" / "Offline 4") | success (green check circle #68D45A), danger (red triangle #FF0500) | 200 × 86 px, radius 20, icon 20 px top-left, label 15 px, number 40 px Thin right-aligned |
| Stat card with chart | default, with ↗ expand arrow | radius 20, padding 16, title 16–18, hero 44–48 UltraLight with dimmed fraction, "Target:" caption, chart footer |
| Vehicle card | default (solid #202020), **selected** (light glass with top-left bloom), variants: Bus / E-Bus (orange door highlight), plate prefix L / R | 242 × 326 px, radius 20, padding 16; title 18 + timestamp 12 at 60 %; ↗ 16 px top-right; wireframe bus ≈ 200 × 70 px 1 px white 80 %; plate chip; status pill; GPS/LTE icon pairs; mini map 110 px; timeline scrubber |
| Plate chip | on light glass (#989C99 / circle #6C7170), on solid (#797979) | 73 × 26 px pill; letter in a 26 px circle at lower alpha, digits 13 px |
| Status pill | outlined "Online" (1 px white 40 % border, text white) on light glass; green-text "Online" (#61C958, 1 px green 40 % border) on solid; **"Accident"** (1 px #FF4642 50 %, fill 12 %, text #FF4642) on the mobile sheet | 53 × 27 px desktop, 92 × 27 pt mobile; text 13–14 |
| Connectivity indicator | GPS (concentric-arc "((•))" glyph), LTE (wifi arcs); orange GPS glyph on Bus 4120 = degraded | 1.5 px stroke, 14–16 px icon + 13–15 label, 8 px gap |
| Timeline scrubber | default | 06AM / 11PM labels 12 px; tick ruler ~60 × 1 px ticks at white 45 % with taller centre ticks; endpoint dots 6 px inside 12 px dim discs; round thumb 28 px (white 40 % fill, glow) with 14 px bus glyph |
| Mini route map | default | #282A2A fill, street grid white 12 %, white 2 px polyline, white teardrop pin 14 px |
| Glass chip / dropdown ("Bus 6023 ⌃", "Map 2", "Bus ⌄") | with leading icon, with trailing chevron | 44 px/pt tall pill, 16 px padding, icon 18 px 1.5 stroke, label 15–16, chevron 16 at 80 % |
| Search field (desktop) | placeholder "Search Ctrl+Shift+F" | 210 × 44 glass pill, placeholder 50 %, trailing magnifier 18 px |
| Round icon button | glass over map (wifi, headset, bell, +, ⊕, −, route, clock, shield-plus, globe, target), **with badge** (bell "2") | 44 px/pt, icon 20 px at 1.5 px stroke, 8 px gaps desktop / 6–8 pt mobile |
| Notification badge | count "2" | 18 px red #FF0004 disc, white 11 px digit, offset 4 px outside the button's top-right |
| Avatar | — | 44 px round photo, no ring |
| Warning panel (desktop) | collapsed/expanded groups (chevrons ⌃ ⌄), group header with icon + "(n lines)" count, alert row (red badge + title + time), nested station list (2 px left rule), "Recommend" row (sparkle icon) | 280 px wide, dark glass, radius 20, padding 16; sub-card red 10 % radius 14 padding 12; badge 18 px |
| Route offset table (desktop) | cells: on-time (white), late (orange text + 14 px orange clock icon) | headers 12 px 50 %; plate-chip row headers; tick rulers between cells; hairline rows |
| Bottom sheet (mobile) | glass, with toolbar | full-width, device-matched corners, padding 20, title 20 + hash 14 with copy icon 16, ↗ 16 top-right |
| Copy-id affordance | — | truncated hash at 55 % + two-square copy icon 1.5 stroke |
| Wireframe vehicle illustration | normal; orange-door (maintenance); **red-section (damage)** | 1 px white 80 % line art; state = 45–55 % tinted fill on a sub-section with recoloured strokes |
| Toolbar pill (mobile) | active (solid white + black grid glyph), neutral (white 6 %), **alert** (red radial tint + red 4 pt dot beneath) | 244 × 52 pt track at black 30 %, 44 pt buttons, 4 pt gaps; icons: grid, split-square, document, pie, headset |
| Live Webcam card (mobile) | default with ↗ | light glass 224 × 164 pt, radius 20, padding 16; title 17, address 14 at 60 %; inset media 200 × 100 radius 14 |
| Webcam reconstruction (media) | — | black ground; white 1 px wireframe crossings and pedestrians; photoreal grey bus; glowing red wireframe car |
| Map POI pin | blue port, pink city/bus, yellow airport, white station | 26 px round solid disc, 14 px dark glyph, no stroke |
| Live vehicle marker | default | 32 px light-glass disc, dark arrow glyph, inside a dashed white geofence |
| Incident marker | default | 32 pt red glass disc + red triangle glyph, 80 pt dashed red halo, red road segment |
| Route overlay | active (solid white 3 px), alternative (dashed white 2 px), highway (orange→yellow), incident (#E8554E 3 pt) | |
| Map zoom cluster | +, ⊕ (locate), − | three 44 px glass rounds, 8 px gaps |
| Expand arrow (↗) | on every card | 16 px, 1.5 stroke, white 100 %, top-right at the padding corner |
| Chevron | expand/collapse ⌃ ⌄ | 16 px at 60 % |
| Studio "Save" button (slate) | — | 88 px glass round with bookmark glyph — not product |

---

## Charts

| Chart | Where | Styling details |
|---|---|---|
| Operational Efficiency line (desktop/07) | left rail card | Hero "78.**3** %" 44 px (".3" #6B6B6B, "%" 14 px). "Target:" caption 12 px at 65 %. Plot ≈ 380 × 110 px. Series: 1 px white 100 % for the *smoothed* line; a 1 px raw noisy series at ≈ 30 % behind it; highlighted windows drawn as 2 px white with **6 px endpoint dots** and a translucent vertical **column band** (#2A2A2A ≈ white 6 %) under each; a dip highlighted in **orange #FF983C** 2 px with 2 orange 6 px dots. Dashed target line (white 30 %, 4/4). Dashed grid rows at white 12 %. Threshold label ">80 %" 11 px at 60 % above the target. Right-aligned y axis 25/50/75/100 % 11 px #848484; x axis 06:00…21:00 11 px. No area fill, no legend, no axis lines. |
| Live Passenger Volume step chart (desktop/01, /05, /06) | bottom band card | Hero "142,**580** today" 46 px ("580" #666769, "today" 11 px). Plateau segments 2 px white; each labelled with value above (13 px white: 55k, 57k, 56k…) and delta below (11 px: "-0 %", "+6 %"); **negative buckets** drawn in orange #FF983C with an orange tinted band (#353230) beneath and orange delta text ("-8 %", "-12 %"). Raw spiky 1 px series at ≈ 25 % behind. Dashed grid rows; dashed target across the top. Right axis 45k–60k, x axis 06:00–21:00, 11 px at 50 %. |
| Schedule Offset table-timeline (desktop/04, /05) | bottom band card | Hero "± 2.5 **min**" 46 px UltraLight ("min" #6B6B6B) + "Average Variance" 12 px at 60 %. Column headers L1, L12, L14, L15, L24 12 px at 50 %; row headers are plate chips. Cells 13 px: on-time "-2min" white; late "+1min / +1.5min / +2min" **orange** with a 14 px orange clock icon (1.5 px stroke) to the left. Between cells a **tick ruler** (5 × 1 px ticks at white 25 %). Rows separated by hairlines at 8 %. |
| Vehicle timeline scrubber (desktop/04) | vehicle card footer | See component: 1 px tick ruler at 45 %, labels 06AM/11PM, dim endpoint discs, 28 px round thumb with bus glyph — reads as a playback/replay control. |
| Passenger Load glass card (desktop/00) | floating over map | "Passenger Load" 16 px, "Next: Central Station" 12 px at 60 %, hero "87 %" 40 px UltraLight; the card is the readout for the live marker next to it. |
| Mini route map (desktop/02, /04) | vehicle card | Dark #282A2A with street grid at white 12 %; 2 px white polyline; 14 px white teardrop pin at the origin. |
| Map overlays (all map frames) | main map | Active route solid white 3 px; alternatives dashed white 2 px (6/6); geofence dashed 1 px circle ≈ 80 px; highway orange→yellow 1.5–2 px; on mobile the **incident route in #E8554E 3 pt** and a dashed red halo. |

Common chart grammar: 1 px hairline series, 2 px for the highlighted state, 6 px endpoint dots, dashed targets, translucent column bands to frame a window, inline annotation instead of legends, right-aligned y axis, 11 px axis text at 50 %, orange as the only chromatic series colour, no fills or gradients under lines.

---

## Iconography

Stroke icons, **1.5 px** at 16–20 px, rounded caps and joins, white 100 % on dark surfaces (60 % for chevrons). Glyph set observed: magnifier, wifi, headset, bell, bus (front view, rounded rect with two windows), map/"Map 2" (folded map), navigation arrow (live marker), teardrop pin, plus/minus, target/locate, route/branch (Y with dashed leg), clock/timer (open arc with a hand), shield-plus / location-add, globe, grid (2×2 dots — the *only* filled glyph, used on the active white button), split-square/layout, document with folded corner, pie chart, copy (two overlapping rounded squares), sparkle (Recommend), ↗ expand arrow, chevrons. Map POI glyphs are small solid dark shapes on 26 px solid coloured discs (anchor, buildings, plane, station). Status glyphs are filled: green check-in-circle, red triangle-with-!, red rounded-triangle on the incident marker. Illustration language is line art: 1 px white wireframe vehicles (side view, with wheels, doors, roof units) and, in the webcam media, wireframe pedestrians and crossings; a photoreal bus and a glowing red wireframe car sit in the same scene. Closest open sets: Lucide/Phosphor Light at 1.5 px, or SF Symbols in the ultralight/thin rendering weights.

---

## What makes it beautiful

1. **The world is the ground.** A full-bleed, art-directed map (satellite pulled to charcoal + green + teal on desktop; a dark 3D diorama on mobile) carries all the colour; the UI itself is achromatic white on near-black. Because nothing in the chrome competes with the map, even small cards feel expensive.
2. **A three-step surface ladder replaces shadows.** Ground #0D0D0D → card #1A1A1A → tile #202020, plus an 8 % hairline; over the map, dark glass (#242722–#374434) and, for the one selected object, light glass with a top-left bloom (#9EA29A → #1C1D1D). Depth is unmistakable and there is not a single drop shadow.
3. **Glass that is actually transmissive.** The same round button reads #69737B over water and #4B5D48 over forest; the Warning rail goes green; the sheet lets the street grid through at its bottom. The eye reads "material", not "grey rectangle".
4. **UltraLight hero numerals with dimmed insignificant digits.** "78.**3**", "142,**580**", "± 2.5 **min**" at 44–48 px, the dim part at 40 %: the number is enormous yet quiet, and the eye lands on the digits that matter.
5. **Colour equals meaning, with one accent.** Orange #FF983C is the *only* chromatic series colour and appears only for deviation (late, negative delta, degraded GPS, a door under maintenance). Green appears only on "Online". Red appears only on alerts and incidents. Blue/pink/yellow live exclusively on map pins. Any colour on screen is therefore information.
6. **Instrument-grade charts.** 1 px lines, dashed targets, 6 px endpoint dots, tick rulers, translucent column bands, values annotated inline — no legends, no gradient fills. They look like cockpit readouts and stay legible at thumbnail size.
7. **Red used as a material, not a paint bucket.** The damaged bus section is a 50 % red fill inside a white wireframe; the incident marker is a red *glass* disc with a dashed halo; the Accident pill is an outline with a 12 % fill; the alert row is a 10 % red tint on the panel. Red never covers text and never becomes a flat block, so urgency stays elegant.
8. **Line-art illustrations that carry state.** The 1 px wireframe bus is a diagram, so highlighting a section (orange door, red segment) is literal and instant.
9. **A card grammar you can predict.** Every card: title 16–18 + caption 12 at 60 %, ↗ at the top-right padding corner, hero at 44–48, footer chart or media, 16 px padding, 12 px rhythm, radius 20 with nested radius 14. Uniformity across desktop and mobile makes the family feel designed once.
10. **Micro-typographic captions.** "(2 lines)", "4m ago", "Next: Central Station", "today", "Average Variance" — tiny 11–12 px Light grey qualifiers next to strong values give the numbers context without competing.
11. **44 px everywhere.** Chips, round buttons, toolbar buttons, avatar, search height — one control height across platforms; the mobile tool cluster reads as one instrument strip because the gaps are only 6–8 pt.
12. **The webcam reconstruction.** A black scene, white wireframe people, a grey photoreal bus and a glowing red wireframe car: the incident is understood at 200 × 100 pt without a single word.
13. **Balanced asymmetry.** Dense left rail, open map centre, a narrow alert rail on the right, a chart band along the bottom — the gaze path is diagonal and calm, with the page title set into the map instead of a header bar.
14. **Restraint in weight.** Nothing is bolder than Regular except the badge digit; hierarchy comes from size and alpha, which keeps the whole screen airy despite being dark and dense.

---

## Accessibility risks

1. **Dimmed digits and units.** ".3", "580", "min" at ≈ #6B6B6B–#666769 on #1A1A1A ≈ 2.9–3.0:1 — acceptable only because they are ≥ 24 pt decorative numerals (owner's 3:1 rule); the "min" unit at the same size passes barely; never reuse this alpha at caption size.
2. **White text on light glass.** The selected Bus 6023 card's top-left bloom (#8A8F88–#9EA29A) puts the title, date and "Online" pill at ≈ 2.2–2.8:1. The Live Webcam card over grass (#727B6F) puts the address (#B0B3AC) at ≈ 1.9:1. Light glass needs a darker tint band behind text, a bloom that avoids the text region, or a rule that light glass is only used over *dark* imagery.
3. **Incident red text.** #FF4642 on the sheet glass (#374434) ≈ 3.9:1 — fails AA for the 14 pt "Accident" label; on the darker lower sheet (#212A25) ≈ 5.0:1 passes. Pin the pill to a darker local surface or lift the red to ≈ #FF6B66 for text.
4. **Badge digit.** White 11 px on pure red #FF0004 ≈ 4.0:1 — fails AA for small text; use a slightly darker red (#E5161B ≈ 4.8:1) or a 12 px Medium digit.
5. **Tertiary captions.** #848484 on #1A1A1A ≈ 5.0:1 passes; #858F87 on the sheet glass (#374434) ≈ 3.5:1 fails — caption alpha must be re-tuned per surface, not fixed.
6. **Orange on light surfaces.** #FF983C is ≈ 8:1 on #1A1A1A but ≈ 2.1:1 on the bloom of the selected card — orange must never sit on light glass.
7. **Colour-only encoding.** Orange = late/negative is always paired with a sign (+/−) and a clock icon — good; the red bus section is paired with the "Accident" pill — good; the orange GPS glyph on Bus 4120 has no text equivalent — add "GPS weak".
8. **Hairlines at 8 % and grid at 12 %** are invisible to low-vision users; rely on spacing, not separators, for structure.
9. **Blur and transparency.** Six glass materials on one screen; with Reduce Transparency the tints must fall back to solid #1A1A1A at ≈ 92 % with the same text alphas.
10. **Motion implied by dashed halos and pulsing dots** must respect Reduce Motion (static halo, no pulse).
11. **Truncated identifiers** ("A564tf52dae53…") need the full value in the accessibility label; the copy button helps.
12. **Touch targets** are fine (44 pt); the 4 pt red dot under the toolbar and the 6 pt endpoint dots are indicators, not targets — good.
13. **White route lines on bright map areas** (snow/rock in the satellite, pale town in the 3D render) lose contrast; routes need a 1 px dark casing.

---

## Principles to carry into Prism

1. **Ground ladder (dark):** page **#0D0D0D**; surface-1 **#1A1A1A** (white 6 %); surface-2 **#202020** (white 8 %); hairline **white 8 %**; separators **white 8 %**; no shadows in dark mode — depth = luminance steps + hairlines.
2. **Radius ladder:** card **20**, nested sub-card **14**, media inset **14**, chips/tiles/buttons **pill**, sheets meet the screen with the **device corner** (concentric: inner radius = outer − padding).
3. **Glass only over imagery, maps or vivid surfaces** (already decided). Dark glass = **rgba(16,20,16,0.60) + blur 32 + saturate 1.2 + 1 px inner top highlight white 8 %**. Light glass (selection/foreground) = **rgba(255,255,255,0.26) + blur 40 + top-left radial bloom white 0.35→0 over 60 % + 1 px top specular white 35 %**, with the bloom clipped away from the text block. Chip glass = **rgba(255,255,255,0.16) + blur 20**. Reduce Transparency fallback: solid surface-1 at 92 %.
4. **Type roles:** labels in a geometric sans (Outfit-like on web; SF Pro on Apple) at **12 / 14 / 16 / 18 Regular**, captions **11–12 Light at 62 %**; hero numerals **44–48 UltraLight** (SF Pro Display Ultralight / Helvetica Neue 25 / Inter Tight 200 on web), page-title **64 UltraLight**; nothing heavier than Regular except badge digits (Medium).
5. **Text alpha steps:** **100 / 62 / 50 / 40** — and 40 only for decorative digits ≥ 24 pt; re-tune 62 and 50 on glass so they stay ≥ 4.5:1 against the *lightest* possible backdrop.
6. **Dimmed-digit rule:** insignificant part of a hero (fraction, thousands remainder, unit) at **40 % alpha, same size**; units that are words at **12 px, 62 %, baseline-aligned, 6 px gap**.
7. **Colour = meaning, one accent:** accent **#F5973F** (deviation / attention only); success **#62CC5A**; danger badges **#FF1A1A**; incident text/strokes **#FF4642**; incident fills **rgba(201,58,54,0.5)**; map POI blue **#1E7BC2**, pink **#C46A82**, yellow **#C9C23A**. No chromatic colour on light glass.
8. **Chart grammar:** series **1 px**, highlight **2 px**, endpoint dots **6 px**, dashed target **4/4 at white 30 %**, grid rows dashed **white 12 %**, window bands **white 6 %**, axis text **11 px at 50 %** right-aligned y, **no legends** — annotate inline (value above 13 px, delta below 11 px, orange when negative), no fills or gradients under lines.
9. **Numerals:** tabular figures in tables/axes/timestamps; proportional in heroes; signs explicit (+/−/±); timestamps `dd.mm.yyyy, hh:mm:ss AM` at 12 px 62 %.
10. **Control size:** **44** px/pt for every round button, chip, search field and toolbar button; icon **20 px at 1.5 px stroke**; gaps **8** (desktop) / **6–8** (mobile strip); badge **18 px** offset **4 px** outside the corner, digit 11–12 Medium.
11. **Card anatomy:** padding **16**, title **16–18** + caption **12 at 62 %**, **↗ 16 px** at the padding corner, hero at **44–48** with **8 px** below the title, chart/media footer with **12 px** rhythm; media inset **12** with radius **14**.
12. **State materials for line-art:** wireframes **1 px white 80 %**; state = **45–55 % tinted fill** on a sub-region with recoloured strokes (orange = maintenance, red = damage, green = ok); never recolour the whole illustration.
13. **Map overlay tokens:** active route **white 3 px** with 1 px dark casing; alternative **white dashed 2 px, 6/6**; geofence **dashed 1 px circle 80 px**; incident route **#E8554E 3 px**; POI pin **26 px solid disc + 14 px dark glyph**; live marker **32 px light-glass disc**; incident marker **32 px red-glass disc + 80 px dashed halo 1 px at 70 %**.
14. **Alert row anatomy:** red badge **18** + title **15** + time **12 at 50 %**; nested list with **2 px left rule at white 25 %**; group header with icon + "(n items)" at 50 %; expand chevrons **16 px at 60 %**; alert container = **red 10 % tint, radius 14, no border**.
15. **Mobile sheet:** full-width glass, device-matched corners, padding **20**, title **20** + secondary **14 at 62 %** with copy affordance, toolbar pill **52 tall, black 30 %**, **44** buttons, **4** gaps, active button **solid white + black glyph**, alert button **red radial 25 % + 4 pt dot**.
16. **Spacing scale:** **4 / 8 / 12 / 16 / 20 / 24**; page margin **24** desktop / **16** mobile; grid gap **12**; left rail **≈ 415** at 1440.
17. **Motion (from stills):** nav pill slides between tabs (**250 ms**, ease-out); tool cluster pops in with **30 ms** stagger; cards expand via ↗ into a full view with matched geometry (**350 ms**); incident halo dash rotates slowly (**8 s linear**) and the alert dot pulses (**1.2 s**); timeline thumb scrubs with the mini-map route; all reduced to opacity-only under Reduce Motion.
18. **Illustrative media rule:** where a photo/webcam feed cannot be shown, render a synthetic scene in the same language — **black ground, white 1 px wireframes, photoreal subject, glowing accent for the anomaly** — so imagery matches the UI instead of fighting it.
