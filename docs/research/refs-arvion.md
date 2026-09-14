# Arvion UI — Shipping Operations Dashboard — forensic style analysis

**Family:** `arvion` (Dribbble 27658472, RonDesignLab). Desktop web app (Safari on a Studio-Display-style monitor) plus one iPad frame.
**Weight for Prism:** HIGH. It is the studio's newest "dark ops" dashboard and the closest thing in the reference set to a *navy* dark theme with a single saturated accent, glass over a colour-graded 3D render, and an AI composer — all things Prism needs.
**Method:** all 9 stills viewed at full 2000px; the master frame (`06`), the closer left-half frame (`05`), the right-half frame (`04`), the iPad frame (`03`), the composer close-up (`02`), the tile close-up (`01`) and the isolated card (`07`) were cropped into 40 regions and upscaled 2–8x. ~130 pixel colours were sampled with a BMP region sampler (average / most-saturated / brightest), and glyph bounding boxes were scanned to derive per-frame perspective corrections. `08.mp4` cannot be viewed; its poster still `09.png` is a *different* RonDesignLab product (a light "SugarCRM Cases Overview" dashboard) and is treated as a light-mode aside only.

**Scale assumptions used for every px value below.** Frame `06` compresses horizontally to ≈0.82 (monitor yawed), frame `05` compresses vertically to ≈0.88 (monitor pitched) — both derived from the width:cap-height ratio of the H1 "Dock Operations" set in Poppins SemiBold (true ratio ≈11.7). All sizes are then expressed relative to the H1 and converted to design px assuming **H1 = 40px on a ~1728px-wide desktop layout** (the macOS traffic lights measure ≈11px tall in `06`, i.e. the design is shown near 1:1, so 40px is the plausible H1; treat every px figure as ±10%).

---

## 1. Overview

One deep-navy canvas (not black — `#050A2A` to `#0A0E31`, with a soft radial vignette that is lighter toward the centre of the 3D ship and darker in the corners). On it sit three kinds of surface: a barely-lighter sidebar panel, indigo-grey cards/tiles at ≈+7–8% white, and — only where there is imagery — tinted glass. Exactly one *interface* accent exists: a periwinkle blue (`#4E6CCD` as a solid "attention" tile, `#5476DF` as the chart accent). Yellow, red and cyan are used only as **status semantics** (Reserved / Pending / Loaded) — as thin borders, tiny labels, isometric cube icons and a single gauge arc. The whole UI is set in **one typeface, Poppins**, spanning ExtraLight/Light numerals to a SemiBold H1. Numbers are the heroes (thin, large, with a small dimmed unit); labels are quiet; whitespace inside cards is generous while the gaps *between* tiles are tiny (4–6px), so groups read as a single slab. An AI composer at the bottom of the sidebar carries the only gradients in the UI: a dark aurora inside the card and a 3px cyan→red→orange→green strip hugging its bottom edge.

| File | What it shows |
|---|---|
| `06.png` | Master frame: the full "Dock Operations" page on a monitor (browser chrome visible) |
| `05.png` | Closer, front-on view of the sidebar + title + container grid + Loading Flow (best for measurements) |
| `04.png` | Right half: container grid, position ruler, Loading Flow, Load Balance, viewport toolbar |
| `03.png` | iPad frame: search / settings / bell cluster, viewport toolbar, container cells close-up |
| `02.png` | Cargo Optimizer blueprint, fading AI paragraph, chat composer close-up |
| `01.png` | 2x2 KPI tiles close-up (accent blue tile vs dark tiles) |
| `00.png` | Angled overview of the sidebar + grid + Loading Flow |
| `07.png` | "Loading Flow" card isolated as a **dark glass card over a light photo** (studio outro) |
| `09.png` | Video poster: unrelated light-mode dashboard (SugarCRM) — light-mode aside only |

---

## 2. Color

### 2.1 Canvas & neutral ladder (sampled)

| Layer | Sampled | Recipe (≈) | Notes |
|---|---|---|---|
| Page canvas, corners | `#020725` (05), `#050A2A` (06 top-right) | base navy `#060A2B` | H≈232°, S≈80%, L≈9% — a *blue* black, never neutral |
| Page canvas, centre (vignette) | `#090E31`, `#12163D` (02), `#1A1E4C` (00 near the ship) | base + radial white 3–10% | the render's own light bleeds into the canvas |
| Sidebar panel | `#0D132E` (05), `#0C112D` (06) | white 4% over canvas | rounded ≈24px slab holding logo, tiles, optimizer, composer |
| Tile / card fill | `#191C39`, `#171B36`, `#161B3C`, `#1A1D39` | white 7–8% over canvas | all cards share one fill; no borders |
| Load Balance card | `#0E122F` / `#0F1330` | white 3–4% | slightly *darker* than Loading Flow — cards may drop a step when they sit over the darker corner |
| Segmented / icon-button fill | `#151733`, `#171C37` | white 5–6% over panel | |
| Nested control on a tile (⤢ button) | `#222642`, `#272C48` | white 5–6% over tile | |
| Chip on card (13%, pager) | `#1C203B`, `#111531` | white 3–6% | |
| Lighter glass chip (24ms, L/R) | `#3C4057`, `#494E6C` | white 20–30% + 1px border white 25% | these read as "glass" even on a solid card |
| Search field | `#0D122F` | white 3% + 1px border white 8% | almost invisible until focused |
| Secondary text | est. `#9A9CB5` | white 55% | "Platform:", subtitle, legend |
| Tertiary text (axis, unit) | est. `#7F8294` | white 45% | |
| Placeholder | est. `#626578` | white 35% | |
| Dimmed AI line 3 | `#54576B` | white 25% | deliberate fade-out |
| Primary text | `#F4F5F9`–`#FFFFFF` | | numerals are pure white; titles slightly off-white |

### 2.2 The one interface accent

| Use | Sampled | Token suggestion |
|---|---|---|
| "Attention" KPI tile (solid) | `#4E6CCD` | `accent.600` — H 226°, S 56%, L 55% |
| ⤢ button on the blue tile | `#5C77D1` / `#617BD2` | white 15% over accent |
| Chart accent (bar, dots) | `#5374DC` / `#5476DF` | `accent.500` |
| Direction badge (blue circle, chevron down) | `#527AF1` | `accent.400` |
| Isolated glass card (07) blue bar | `#4F71DD` | same family |

Nothing else in the chrome is blue-saturated; the accent's job is "this is the thing to look at", not "this is interactive". Interactive-active is **solid white** (see §3).

### 2.3 Status colours (semantic only, never chrome)

| Status | Border / label (sampled) | Cube icon | Gauge | Token suggestion |
|---|---|---|---|---|
| Reserved | `#FFD529` / `#FDD12F` | `#FFCB00` | `#FFE530` (glowing) | `status.reserved` = `#FFD12F` |
| Pending | `#FF2B26` / `#FF2E2C` | `#FF3430` | — | `status.pending` = `#FF3030` |
| Loaded | `#009AC4` / `#0099C3` | `#00B2DF` | — | `status.loaded` = `#00A9D6` |
| Empty slot | white `#FFFFFF` border, "+" in a white circle | — | — | neutral |
| Alert (bell dot, error badge) | `#FF3131` / `#FF3232` | — | — | `danger` = `#FF3232` |
| Red-tinted surfaces | bell button `#271A32`, alert chip `#2C162F` | | | red 14% over canvas |

Green appears **only** inside the composer's gradient strip (`#49954A`), never as a UI colour.

### 2.4 Glass tints (container cells over the ship render)

| Cell | Sampled fill | Reading |
|---|---|---|
| Reserved | `#6B6A81`, `#676678`, `#828198` | neutral white glass ≈22% over the lavender deck, yellow border |
| Pending | `#644F71`, `#58415D` | red ≈18% + white 15% → mauve glass |
| Loaded | `#4A5F8F`, `#465E83` | cyan/blue ≈20% + white 12% → steel-blue glass |
| Empty | `#70749F`, `#686C86` | white ≈28% glass, white 1.5px border |
| Number chip inside a cell | `#85859A` | white 15% over the cell + 1px white 20% |
| Deck rails behind cells (render) | `#424777` / `#1D2252` | the render itself is graded to indigo |

### 2.5 Gradients & aurora

| Where | Recipe (sampled stops) |
|---|---|
| Composer card interior | horizontal aurora, ~30% opacity, heavily blurred: teal-navy `#212F47` (left) → plum `#2A1B32` (centre) → slate `#282430` (right), over the card fill `#141A33`. Reads as "AI is present". |
| Composer bottom strip | 3px stroke following the card's bottom radius: cyan `#3FB8E0` → red `#FF3A3A` → orange `#FF9F1C` → green `#4CC24C` (sampled dimmed: `#609EB0`, `#BA2B31`, `#B87519`, `#488645`). Four hard-ish stops, left→right. |
| Canvas vignette | radial, centre ≈ the ship, `#1A1E4C` → `#050A2A` at the corners |
| Bell button | radial red `#FF3232` at ≈25% centre → 0 at the circle edge |
| Alert triangle, gauge arc, split-bar segments | outer glow = same colour, 6–10px blur, 35–45% |

### 2.6 Light-mode aside (video poster `09.png`, different product, same studio)

Page `#DAD9DD`–`#E9EBF0` cool grey; cards `#EBECF0`/`#E4E3E6` (white 40–60% over page, no borders); active tab = solid black stadium `#141414` with white text; inactive tabs = white stadiums with a hairline; round icon buttons with a hairline; pill-shaped list rows with 40px avatars; donut charts in pastel blue `#86A2DC`, yellow `#FEE96C`, red `#DB6468`, grey `#C5D0DA`; a moon/sun theme toggle bottom-left (sun = solid black circle). It is the *light twin* of the same logic: one dark "active" pill, hairline neutrals, pastel data colours.

---

## 3. Surfaces & Depth

Depth is made by **fill lightness, not shadow**. No card in the dark frames casts a visible drop shadow; no card has a border. The ladder is canvas → panel (+4%) → card (+7–8%) → nested control (+5–6% over card) → glass chip (+20–30% + hairline). Active = invert to solid white.

| Surface | Radius (design px) | Border | Shadow | Blur | Notes |
|---|---|---|---|---|---|
| Sidebar panel | ≈24 | none | none | none | one slab from the logo row to the composer |
| KPI tile (dark) | ≈16–18 | none | none | none | tiles butt against each other with 4–6px gaps |
| KPI tile (accent blue, solid) | ≈16–18 | none | none | none | the *only* saturated surface; ⤢ button becomes white 15% on it |
| Cards (Optimizer, Loading Flow, Load Balance) | ≈20–24 | none | none | none | fill `#161B3C` |
| Composer card | ≈24 | none | none | aurora is blurred ≈40px | bottom edge carries the 3px gradient strip *inside* the radius |
| ⤢ expand button | stadium 56×36 | none | none | none | white 5% on dark tile, white 15% on blue tile, white 8% on cards |
| Segmented icon buttons | stadium ≈56×38 | none | none | none | inactive white 5%; active **solid white** with black glyph |
| Viewport toolbar buttons (over render) | stadium ≈64×40 | none | none | ≈20px backdrop | glass white ≈25% over the render (`#7B8098`, `#292D46` on the iPad); active solid white |
| Search field | stadium ≈260×44 | 1px white 8% | none | none | fill white 3% |
| Icon circles (settings, bell) | circle 44 | none | none | none | white 6%; bell has a red radial glow |
| Alert chip | stadium ≈180×44 | none | none | none | red 14% tint; paired with a separate chevron stadium 56×44 |
| View toggle chips (Side/Top view) | ≈14 | none | none | none | selected `#41456C` (white 20%), unselected `#1E2246` (white 8%) |
| Container cell (glass) | ≈10; the two outermost cells get a ≈40px radius on the hull-side corner | 1.5px status colour ≈90% | none | ≈12px backdrop | tinted white glass 15–28% (see §2.4) |
| Number chip in cell | stadium ≈64×22 | 1px white 20% | none | none | white 15% |
| "24ms" latency chip | stadium ≈64×32 | 1px white 25% | none | none | white ≈25% — a glass pill on a solid card |
| L / R / 13% chips | stadium 40×28 / 64×30 | none | none | none | white 12–20% |
| Direction badges | circle 22 | none | none | none | solid white (↑) / solid accent `#527AF1` (↓) |
| Send button | stadium 64×44 | none | none | none | solid white, black glyph |
| + and mic buttons | circle 44 | none | none | none | white 8% over the aurora |
| Position-ruler thumb | stadium 52×36 | none | none | none | white 30% `#5C5F7C` with a ship glyph |
| Pager "<< 1 >>" | stadium ≈84×36 | none | none | none | white 4% |
| Isolated card over a light photo (07) | ≈28 | 1px inner white 12% | soft, wide (≈40px, 25%) | backdrop ≈30px | dark glass: `#20222E` at ≈78% → sampled `#4F5163`/`#434153`; text stays white; blue accent unchanged |

Glass rules the studio follows here, made explicit: (1) glass only sits on the render or the photo, never on the canvas; (2) glass is *tinted white* (never tinted black) on the dark render, and tinted *dark* on the light photo; (3) glass always has a hairline (1px, 12–25% white) — solid cards never do; (4) the status colour is carried by the **border**, not the fill, so cells stay legible.

---

## 4. Typography

### 4.1 Family (single-family system)

Every glyph in the UI matches **Poppins**: double-storey `a`, single-storey `g`, circular `O`/`o`, `M` with vertical sides and a vertex on the baseline, flag-only `1` with no foot, flat-cut `t`, short-armed `r`, round dots. It is not Outfit/Urbanist (single-storey `a`), not Manrope (narrower `O`, different `k`), not Inter/SF/Helvetica (the `6`/`9` terminals are cut straight, not curled; the `3` is fully round). Unlike Vexto (Helvetica Neue UltraLight numerals + Poppins labels), Arvion uses Poppins for the numerals too — ExtraLight/Light. The "Arvion" wordmark is custom: a swash `A` (rope-loop stroke) plus Poppins-Medium-like lowercase.

### 4.2 Scale (design px at H1 = 40; measured ratios in brackets)

| Role | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Page H1 "Dock Operations" | 40 [anchor] | 600 | `#F0F1F5` | normal tracking, leading ≈1.1 |
| Page subtitle "Last update 1 min ago" | 14 [0.35] | 400 | white 55% | 6px below the H1 |
| Card title ("Loading Flow") | 18 [0.45] | 400 | white 100% | Regular, not Medium — titles are quiet |
| Card subtitle ("Last update 1 min ago") | 13 | 300 | white 50% | |
| KPI tile ID "CNT-D07" | 15 [0.37] | 400 | white 92% | preceded by a 2×14px status bar |
| Tile meta label "Platform:" | 13 | 300 | white 55% | |
| Tile meta value "Critical" | 13 | 400 | white 95% | label and value differ by weight *and* alpha |
| Tile hero "21.3 t" | 30 [0.75] | 300 | white | unit `t` same size and weight, separated by a space |
| Loading Flow hero "161.35" | 32 [0.8] | 300 | white | |
| Loading Flow unit "t/h" | 18 | 300 | white 45% | baseline-aligned, 8px gap |
| Gauge "54" | 32 | 300 | white | |
| Gauge "%" | 16 | 300 | white 55% | half size, dimmed, baseline-aligned |
| Chips (24ms, 13%, L, R) | 13 | 500 | white | Medium is reserved for chips and cell labels |
| Container cell status ("Reserved") | 10 | 500 | status colour | |
| Container cell ID ("CNT-C05") | 12–13 | 500 | white | |
| Cell number chip "N°870…" | 10 | 400 | white 85% | truncated with an ellipsis + copy glyph |
| Axis labels "30m … 5m" | 12–13 | 400 | white 45% | |
| Legend labels | 13 | 400 | white 90% | |
| AI paragraph | 14 | 400 | white 100% → 60% → 25% by line | leading ≈1.55 |
| Chat input text | 15 | 400 | white | leading 1.5; caret 1px white |
| Search placeholder | 14 | 300 | white 35% | |
| Alert chip text | 14 | 400 | white | |
| View-toggle captions | 14 | 400 | active white / inactive white 45% | |
| Wordmark | ≈24 | custom | white | |

Observed sizes (px): 10, 12, 13, 14, 15, 16, 18, 24, 30, 32, 40.

### 4.3 Numerals

Thin (Poppins Light/ExtraLight), pure white, **no dimmed decimals** (unlike Vexto: "161.35" is one colour). The dimming is moved to the **unit** (`t/h`, `%`), which is smaller (55–60% of the numeral) and at 45–55% alpha. Decimal separators are full stops; the tile unit `t` is set at full numeral size, which reads as part of the number. Figures are proportional (the `1` is narrow), which will jitter in a live counter — Prism should use tabular figures for anything that updates.

### 4.4 Casing & tracking

Sentence case everywhere (no all-caps labels, no letter-spaced eyebrows). Tracking is Poppins default; the H1 is not tightened. Truncation uses an ellipsis on IDs (`N°870…`) and an **opacity fade** on paragraphs.

---

## 5. Layout & Spacing

* **Frame:** ~1728px design inside browser chrome. Outer page margin ≈24px. Sidebar panel ≈340px wide (≈20% of the width); main column takes the rest with a ≈24px gutter.
* **Sidebar stack (top→bottom):** logo row (56px: wordmark left, 3 segmented icon buttons right) → 2×2 KPI tiles → Cargo Optimizer card → Composer. Vertical gaps between blocks ≈12px; the tiles inside the grid are only **4–6px** apart (sampled gap = canvas colour), so the four tiles read as one 2×2 slab with the accent tile "lit".
* **KPI tile:** ≈205×150 (aspect ≈1.35:1), padding ≈18–20px, hero number bottom-left, ⤢ button bottom-right, ID top-left with a 2px status bar. Meta rows at ≈22px leading.
* **Main column:** H1 block (H1 + subtitle, ≈48px tall) → view toggles (two 120×48 image chips + captions, 12px gap) → 3D viewport (≈62% of the main column height) → position ruler (full width, ≈40px) → bottom row of two cards (Loading Flow ≈ 62% / Load Balance ≈ 38%, 16px gap). Top-right cluster: search 260×44, settings 44, bell 44 with 8px gaps; alert chip + chevron under it, right-aligned.
* **Cards:** padding ≈24px; title row with the ⤢ stadium hugging the top-right corner (12px inset); hero row 20px below the title; chart 24px below the hero row; axis labels 12px below the plot.
* **Container grid:** two rows × 10 cells inside the ship's hold, cells ≈88×132 with ≈10px gaps that follow the render's steel rails; empty slots keep the same size with a centred "+" so the grid never collapses.
* **Rhythm:** 4px base. Observed steps 4, 6, 8, 12, 16, 20, 24. Radii 10 / 16 / 20 / 24 + stadium. Control heights 36 / 44.
* **Alignment:** the ⤢ buttons on all cards align to the same top-right inset; the heroes on the two bottom cards share a baseline row; the ruler's thumb aligns with the ship thumbnail's stern.

---

## 6. Components

| Component | Anatomy | Metrics (design px) | Variants / states observed |
|---|---|---|---|
| Sidebar panel | rounded slab containing brand row, tiles, optimizer, composer | 340 wide, r24, white 4% | — |
| Brand row + mode segmented control | custom wordmark; 3 stadium icon buttons (AI sparkle, layout-grid-plus, sliders) | buttons 56×38, 8px gap | active = solid white + black glyph; inactive = white 5% + white 80% glyph |
| KPI container tile | 2px status bar + ID; "Platform:"/"Status:" rows; hero weight; ⤢ button | 205×150, r16–18, pad 18–20 | **default** (white 7%), **attention** (solid accent `#4E6CCD`; all text white; label rows white 70%); status bar colours cyan/red/yellow |
| Expand (⤢) button | stadium with diagonal double-arrow | 56×36 | on dark (white 5%), on blue (white 15%), on card (white 8%) |
| Cargo Optimizer card | title; 3-item legend with isometric cube icons; blueprint illustration; AI paragraph | r20–24, pad 24 | paragraph fades line 1→3 (100/60/25%) as a "more" affordance |
| AI composer | aurora card; multi-line text with caret; + circle; mic circle; send stadium; gradient bottom strip | r24; buttons 44 circle / 64×44 stadium; strip 3px | idle (shown); presumably strip shimmers while generating |
| Page header | H1 + timestamp subtitle | 40/14 | — |
| Search field | stadium; placeholder left; magnifier right | 260×44, white 3% + 1px white 8% | placeholder only |
| Icon circle button | glyph in a circle | 44, white 6% | settings; **bell with red radial glow + 6px red dot** (unread) |
| Alert chip | filled red glowing triangle + text; separate chevron stadium | 180×44 + 56×44, red 14% tint | collapsed (shown); chevron implies expandable |
| View toggle | image chip (ship silhouette) + caption below | 120×48 chip r14, caption 14px | selected (chip white 20%, caption white) / unselected (chip white 8%, caption white 45%) |
| 3D viewport | colour-graded ship render (top view) with overlay grid | ≈62% of column height | orbit/rotate mode active in the toolbar |
| Container cell (glass) | status label; ID; number chip with copy glyph | 88×132, r10 (outer hull corner r40), 1.5px status border | Reserved (yellow), Pending (red), Loaded (cyan), Empty (white border, "+" circle) |
| Number chip | "N°870…" + copy glyph | 64×22 stadium, white 15% + 1px white 20% | truncated |
| Viewport toolbar | vertical stack of 3 glass stadium buttons (fit-to-frame, rotate-cube, focus) | 64×40, 8px gap, white 25% glass | active = solid white + black glyph |
| Position ruler / scrubber | wireframe ship thumbnail; 1px tick ruler; thumb with ship glyph; pager | full width, ticks every ≈12px, thumb 52×36 | pager "<< 1 >>" stadium |
| Loading Flow card | title + ⤢; two heroes with direction badges + unit; "24ms" chip between; split bar; tick-dot plot; axis | r20–24, pad 24 | — |
| Direction badge | circle with chevron | 22 | up = solid white / black glyph; down = solid accent / white glyph |
| Latency chip "24ms" | glass stadium | 64×32, white 25% + 1px white 25% | — |
| Load Balance card | title + subtitle + ⤢; dual arc gauge; L/R chips; 54%/42% heroes; centre chip "13%" + 2-line caption; 3D bow render | r20–24 | left arc yellow (imbalance side) glowing, right arc white |
| Legend item | isometric cube icon (18px) + label | 13px, 32px gap between items | red / yellow / cyan |
| Browser chrome (context) | Safari toolbar, url `arvion.com` | — | — |

---

## 7. Charts

| Chart | Where | Exact styling |
|---|---|---|
| Split progress bar | Loading Flow, under the heroes | 2px track white 12% full width; left segment solid white with a white glow (6px, 40%); right segment accent `#5476DF` with a blue glow; 8px gap between segments; segment lengths ≈ share of each rate; no labels on the bar itself (the heroes above are the labels) |
| Tick-ruler dot plot ("event strip") | Loading Flow | baseline 1px white 12%; minor ticks 1px white 12% every ≈12px, ≈16px tall; major ticks every 5th, ≈2x taller and white 25%; series A = 6px solid white dots sitting *above* the baseline; series B = 6px accent-blue dots *on/below* it; x-axis labels "30m…5m" 12–13px white 45% every 5 units, right-to-left time (newest at the right); no y-axis, no gridlines, no legend (colour = the two heroes) |
| Dual arc gauge | Load Balance | two 2px arcs on a track ring white 10%, ring opened at top and bottom (≈40° gaps) so the 3D bow sits inside; left arc `#FFE530` with an 8px 40% glow, filling ≈54% of its half; right arc solid white filling ≈42%; L/R chips at the arc tops; heroes 32px Light with 16px dimmed `%`; centre chip "13%" and a two-line 13px caption |
| Blueprint schematic | Cargo Optimizer | ship side-elevation as 1px lines white 35% (technical-drawing texture); container slots outlined 1.5px in status colours at ≈70% with the same colour at ≈15% fill; no labels — the legend above carries meaning |
| Status cell grid | 3D viewport overlay | categorical "heatmap" of 20 glass cells; colour carried by the 1.5px border + 10px label; empty = white border + "+" |
| Position ruler | under the viewport | 1px ticks white 35% on a 1px baseline white 12%, thumb 52×36 white 30% with a glyph |
| Light-mode donuts / pie (aside, 09) | SugarCRM still | 14px ring stroke, pastel blue/yellow/grey on a `#E4E3E6` track, big Regular numeral inside, legend with % in bold |

Common chart rules: 1–2px strokes; glow instead of thickness for emphasis; white = primary series, accent blue = secondary, yellow = "attention" only; axis text 12–13px at 45% white; no boxes, no gridlines, no chart borders; the numbers live *outside* the plot as heroes.

---

## 8. Iconography

* **System icons:** thin outline, ≈1.5px stroke at 20–22px, round caps and joins, generous inner radius (search, gear, bell, sliders, grid-plus, mic, plus, chevrons, copy `⧉`, diagonal expand `⤢`, fit-to-frame, focus). White 85–100% on dark; **black on the white "active" pills**.
* **Filled glyphs are reserved for state:** the AI "sparkle/star" (filled black on white), the red alert triangle with "!" (filled, glowing), the up/down chevrons inside solid badges.
* **Illustrative icons:** flat-shaded isometric cubes in the three status colours (legend) — the only colourful icons; a monochrome ship silhouette (view toggles) and a ship glyph in the scrubber thumb.
* **Rotate-cube icon** in the toolbar (cube with two arc arrows) doubles as the "3D mode" indicator.
* No emoji, no duotone, no icon backgrounds except the stadium/circle buttons.

---

## 9. What makes it beautiful (concrete)

1. **A navy canvas, not a black one.** `#060A2B` at L≈9% with a radial lift toward the ship gives depth without any shadows, and every neutral inherits its hue (cards `#191C39`, glass `#6B6A81`), so nothing looks pasted on.
2. **Depth by four alpha steps, no borders.** Panel +4%, card +7–8%, nested control +5–6% over the card, glass +20–30% with a hairline. The eye reads hierarchy instantly and the frame stays calm.
3. **One accent, one job.** Periwinkle `#4E6CCD` marks *one* KPI tile as "look here" and the secondary chart series; everything interactive-active is solid white. Status colours never leak into chrome.
4. **Thin numerals, dimmed units.** 30–32px Poppins Light numbers with a 55–60%-size unit at 45–55% alpha; the numbers are the heroes and the units are whispers.
5. **Tight grid, roomy cards.** 4–6px gaps between tiles and 18–24px padding inside them: groups read as one slab while each value has air.
6. **Status lives on the edge.** Container cells carry their colour as a 1.5px border and a 10px label, on a white-tinted glass fill — 20 coloured cells stay legible instead of turning into a rainbow.
7. **The render is graded to the palette.** The steel rails of the ship are indigo (`#424777`/`#1D2252`); glass over it therefore harmonises for free.
8. **Glow instead of weight.** 2px bars and arcs with a soft same-colour glow (6–10px, ~40%) feel luminous, not heavy.
9. **The AI has its own material.** A blurred aurora inside the composer and a 3px multicolour strip along its bottom radius make "AI" recognisable without a mascot or purple gradients everywhere.
10. **Truncation by fade.** The AI paragraph dims line by line (100/60/25%) — an invitation to expand, and prettier than an ellipsis.
11. **Consistent corner-hugging ⤢ buttons** on every card at the same inset establish rhythm; adaptive 40px hull-side corners on the outer cells show attention to the environment.
12. **Micro-hierarchy with alpha + weight**, not size: "Platform:" (300, 55%) vs "B2" (400, 95%) at the same 13px.

---

## 10. Accessibility risks

| Risk | Measured | Verdict |
|---|---|---|
| Cyan status label `#009AC4` on Loaded glass `#4A5F8F` | **1.9:1** at 10px | fails hard; the border + white ID rescue meaning, but the label itself is decorative |
| Red status label `#FF2B26` on Pending glass `#644F71` | **1.9:1** | same |
| Yellow status label on Reserved glass | 3.7:1 at 10px | fails AA (needs 4.5 at that size) |
| AI paragraph line 3 `#54576B` on `#191D3B` | 2.3:1 | acceptable only as a decorative fade; the full text must be reachable |
| Dimmed unit "t/h" / axis labels (white 40–45%) | 3.7–4.4:1 at 12–18px | borderline; lift to white 55% (5.9:1) for anything functional |
| Search placeholder white 35% | 3.2:1 | placeholder is non-functional, but the field itself is near-invisible (white 3% + 8% hairline) |
| Labels on the accent tile at white 70% | 3.2:1 | fails AA; make tile labels white 85%+ on the accent |
| White glyph on toolbar glass `#7B8098` | 3.9:1 | OK for icons (3:1) but not for text |
| Unit text on the light-background glass card (07) `#747B8E` on `#434153` | 2.3:1 | glass over a bright photo drops contrast unpredictably |
| Colour-only status coding (yellow/red/cyan) | — | borders + labels help, but red/yellow/cyan are not CVD-safe; needs glyphs or patterns |
| 10px status labels, 10px chip text | — | below any reasonable minimum; Prism floor should be 11–12px |
| Proportional figures on live numbers | — | jitter; use tabular |
| Hairline ticks at white 12% | — | invisible on many displays; fine as decoration, not as a scale |
| Glass over a busy render | — | must re-check contrast against the *darkest and lightest* possible backdrop |

Positive: white text on the accent tile is 4.8:1 (AA), white on all glass cells is 4.5–6.3:1, white on the `#191C39` cards is 15:1, black on white pills is 17:1, the yellow gauge arc is 14:1.

---

## 11. Principles to carry into Prism (with numbers)

1. **Hue-tinted dark canvas.** Dark theme base at L 8–10% carrying the brand hue at S 60–80% (Arvion: `#060A2B`, H 232°). Neutral scales derive from it: every grey is a white-alpha over the tinted base, never a pure grey.
2. **Four-step alpha elevation, borderless.** `surface.1` = white 4%, `surface.2` = white 7–8%, `surface.3` (control on card) = +5–6% over its parent, `surface.glass` = white 20–30% + 1px white 12–25%. Solid surfaces never get borders; glass always does. Radii: 10 (cell), 16 (tile), 20–24 (card), stadium (control).
3. **Active = inverted solid.** Segmented, toolbar and primary "send" actives are solid white with black glyphs (light mode: solid black with white). The brand accent is *not* the active state.
4. **One accent, two duties.** `accent.600` as a solid "attention" surface (white text ≥4.5:1 — Arvion's `#4E6CCD` gives 4.8:1) and `accent.500` as the secondary chart series. Nothing else in the chrome is saturated.
5. **Status colours are semantic and edge-mounted.** Carry status via a 1.5px border + 11–12px Medium label + an icon; fill stays white-tinted glass (15–25%) so 20 cells never become a rainbow. Add shape/glyph redundancy for CVD.
6. **Numerals: 200–300 weight, unit at 55–60% size and 55% alpha, tabular figures.** Hero sizes 30/32/40; unit gap 6–8px, baseline-aligned. Keep the whole number one colour; dim only the unit (Arvion) or trailing digits (Vexto) — pick one per product.
7. **Single geometric family, weights do the hierarchy.** Poppins-class geometric sans (Prism may substitute a licensed equivalent) at 300 labels / 400 values & titles / 500 chips & cell labels / 600 H1 only. Card titles at 18px Regular, never bold. Sentence case; no letter-spaced caps.
8. **Tight-outside, roomy-inside spacing.** Tile gaps 4–6px inside a group, 12–16px between groups, 18–24px card padding, 24px page margins; 4px base grid; control heights 36 and 44.
9. **Charts: 2px strokes + glow, no gridlines, numbers outside the plot.** Track lines white 12%, axis text 12–13px white ≥55% (Arvion's 45% is the floor to fix), primary series white, secondary accent, "attention" yellow. Tick rulers at 12px pitch with 5-unit majors.
10. **Glass only over imagery, hue-graded imagery.** Colour-grade renders/photos toward the canvas hue before placing glass; backdrop blur 12–30px; check text against the darkest and lightest patch under the glass. On a light photo use dark glass (`#20222E` at ~78%) with a 1px inner white 12% edge.
11. **AI surfaces get a material, not a mascot.** A 30%-opacity blurred aurora (three brand-adjacent stops) inside the composer and a 3px multi-stop strip along the bottom radius; animate the strip while generating. Truncate generated text with a 3-line opacity fade (100/60/25%) plus an expand control.
12. **Corner-hugging utility buttons.** One stadium ⤢ / overflow button per card at a 12px top-right inset, 56×36, white 5–8%; identical on every card.
13. **Status glow, not badge shouting.** Alerts = red 14% surface tint + a red radial glow behind the icon + a 6px dot; text stays white. Reserve solid red for the dot and the triangle only.
14. **Minimum sizes.** Functional text ≥12px (Arvion's 10px labels are the thing to fix); secondary text ≥ white 55% on `surface.2` (5.9:1); decorative fades may go lower but must have an accessible full-text path.
15. **Light twin by inversion of the same logic.** Page cool grey L≈92%, cards white 40–60% over it, hairlines at black 8%, active pills solid black, pastel data colours (blue `#86A2DC`, yellow `#FEE96C`, red `#DB6468`) — the studio's light dashboards (09) confirm the rule set survives inversion.

---

## Appendix — key samples & measurements

* Canvas: `#020725` (05 edge), `#050A2A` (06 top-right), `#090E31` (06 mid), `#12163D` (02), `#1A1E4C` (00, next to the render). Sidebar panel `#0D132E` / `#0C112D`. Tiles `#191C39` `#171B36` `#1A1D39`; cards `#161B3C` `#171B3D` `#191D3B`; Load Balance `#0E122F`.
* Accent: tile `#4E6CCD` (05, 06, 01 agree), ⤢ on blue `#5C77D1`/`#617BD2`, chart `#5374DC`/`#5476DF`, badge `#527AF1`, 07 card bar `#4F71DD`.
* Status: yellow `#FFD529`/`#FDD12F`/`#FFCB00`/`#FFE530`; red `#FF2B26`/`#FF2E2C`/`#FF3430`/`#FF3131`; cyan `#009AC4`/`#0099C3`/`#00B2DF`.
* Glass cells: Reserved `#6B6A81`/`#676678`, Pending `#644F71`/`#58415D`, Loaded `#4A5F8F`/`#465E83`, Empty `#70749F`/`#686C86`, chip `#85859A`. Toolbar glass `#7B8098` (04) / `#292D46` (03); active `#E8E9E9`–`#FFFFFF`.
* Composer: fills `#212F47` → `#2A1B32` → `#282430`; strip (dimmed by AA) `#609EB0`, `#BA2B31`, `#B87519`, `#488645`; send `#F4F4F4`; + `#2C3B53`; mic `#383E44`.
* Red tints: bell `#271A32`, alert chip `#2C162F` (≈ red 14% over canvas).
* Isolated dark glass (07) over `#CBD9E7`: `#4F5163` top, `#434153` mid, `#575E6B` bottom, `#3E4255` over the dark part; 24ms chip `#646677`; unit `#747B8E`; axis `#606672`.
* Geometry (05, perspective-corrected): tile 274×201 frame px ≈ 205×150 design; tile gap 5–6 frame px ≈ 4px; segmented pill 71×51 ≈ 53×38; send 84×58 ≈ 64×44; H1 cap 37.5 frame px → 40px anchor (em 53); hero figure height 27 → 30–32px; card title 20 → 18px; tile ID 12.5 → 14–15px.
* Geometry (06): H1 cap 30, width 289 (→ horizontal 0.82); "161.35" figure height 24 (≈32px); "21.3" 23 (≈30px); "54" 24 (≈32px); traffic lights 11px tall (≈1:1 vertical).
* Contrast (see §10): white/`#4E6CCD` 4.83; white 55%/`#191C39` 5.88; white 45%/`#161B3C` 4.40; cyan/Loaded glass 1.93; red/Pending glass 1.94; yellow/Reserved glass 3.70; `#54576B`/`#191D3B` 2.31; `#5476DF`/`#161B3C` 4.01.
