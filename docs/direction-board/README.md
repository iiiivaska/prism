# Prism Direction Board

The direction board for gate P3-0 (ADR-0017, roadmap P3-0): Prism's reference brand applied to three screens of one invented product, built only from the generated web tokens, in both color schemes. The owner signs it off before any component is implemented twice. Every change the owner asks for goes back through P1-1 and P1-2 as a token change.

The owner reviewed the first board on 2026-09-15 and approved decisions D1–D4 as recommended (ADR-0029). The technical findings went in by their proposals unless the evidence said otherwise (ADR-0030). P1-9 built both into the tokens. This is the board re-rendered from those tokens on 2026-09-16, and it is what the owner signs now to close gate P3-0.

Open `index.html` in a browser. The page follows the viewer's theme: a script mirrors `<html data-theme>` to `data-ds-color-scheme`, and without it Prism's `prefers-color-scheme` fallback applies. Every screen and every scheme-pinned panel keeps its own explicit `data-ds-color-scheme` and `data-ds-density`. The folder is self-contained and makes no network requests.

## What the board shows

The concept is Verst, an invented cycling companion for an invented city on the River Wend, where the city is the instrument panel. One orange means "look here", and on every screen it marks the same object: the climb ahead, or the climb ridden 2.1 km/h slower than last week.

1. **Foundations.**
   - The type specimen of all 22 roles plus `font.mono`, in three columns (live spec, Latin, Cyrillic), with values read back from the rendered tokens. `axis` is new in P1-9.
   - `metric.xl` pinned at 300 in light and 200 in dark, with Cyrillic lines.
   - The ADR-0021 §5 figure-width tests: heroes and `metric.md` readouts proportional, data, axes and live values tabular.
   - The neutral and accent ramps with OKLCH L and the role bound to each step, and `chart.series` 1–6 as strokes on each scheme's own plot, with the status tones.
   - The vivid set as two one-temperature 2×2s per scheme (slots 1 + 2 and 3 + 4), then the bloom at its tokens on a V2 reference card, with ember-night outside the slots.
   - Solid, vivid, the scheme's glass, glassLight and the glass fallback in both schemes.
   - Elevation 0–3 and the drawer in both schemes.
2. **Screens.**
   - **Live ride**, phone 390 × 844 at regular density: light (en), dark (ru), and a third frame showing the light screen under Reduce Transparency. Increase Contrast uses the same glass fallback with its own tones, which a nested frame cannot show: `data-ds-contrast` is read from the root only, as modality is (F28).
   - **Ride report**, desktop 1440 × 900 at compact density: dark, then its light twin. Recomposed for D4 (see [Reference-distance review](#reference-distance-review)).
   - **Glance**, watch 198 × 242 at the `watch` density, in Russian: dark, and a light twin that only checks the tokens.
   - The reference-distance review of all three screens.
3. **Findings.** A count of outcomes, the light phone before D1 and the vivid 2×2 in the P1-8 slot order beside the P1-9 pair, then F1–F31, each with its problem, its outcome and its status (resolved, open or documented).
4. **Sign-off.** The owner's answers of 2026-09-15 and the checklist to sign now (below).

Every look on the board renders the generated tokens as they are. The two proposals of the first board, light Card glass (F1, F7) and the one-temperature 2×2 (F11), are tokens since P1-9.

### Changes in the P1-9 re-render

| Screen or section | What changed |
|-------------------|--------------|
| Live ride, light | Card glass is `material.glass.fill` (light glass) with `text.on-glass-fill`, `-secondary` and `-dimmed`, and no scrim. The map is `color.map.*`. The profile plot in the card is `chart.on-glass-fill.plot` with its line tone; the white 8 % lift is invisible on light glass, so the light phone shows the trace with no plot area (F4). Chips and round buttons are `material.glass.chip`. |
| Live ride, dark | The same bindings resolve to smoked glass, now neutral (hue 265, F3), with white 100 / 78 / 64 %. The glass edge is `color.edge.highlight`. |
| Live ride, fallback | Raised is `neutral.50` in light, painted over `bg.page` with its `color.edge.raised` top edge; the ride card keeps `card.shadow.floating`. |
| Ride report, both schemes | Recomposed for D4: a ledger beside a portrait map plate, with no app row across the top (details below). Page margin 24 (F26). The 2×2 alternates slot 1 and slot 2 on its diagonals. The glass card is the scheme's glass, and the six rides sit on its plot. The closed-bridge wash is translucent in light too (F21). |
| Glance, both schemes | The `watch` density: card padding 16 and a 44 px pause pill (F27). The hero is `ref.type.metric.xl-watch`, 40 px at 200 in dark (F25). The lit tile's caption is `text.on-accent-secondary` (F23). |
| Foundations | 22 type roles (`type.axis`); `metric.md` proportional (F24); the vivid pairs, night-lagoon and the brighter light set (D2); the bloom at 75 px from the brightest stop (F14); the ghost button outlined with no rest fill (F29); the solid on vivid as `bg.fill.inverse-media` (F6); edges from `color.edge.*` (F8); light raised at `neutral.50` (F10). |
| 03 Findings | Each finding carries its outcome and status. The evidence keeps two before/after comparisons that still teach something: the light phone before D1, and the P1-8 slot order beside the P1-9 pair. The as-built report card is gone; it taught the same lesson as the phone. |
| 04 Sign-off | The owner's answers of 2026-09-15 and the items to sign now. |

### Where the board comes from

Three candidate boards were built from the same brief, and three judges scored them. The first board started from the consensus winner ("ride"), fixed every must-fix item the judges raised, and added these elements from the other two candidates. The P1-9 column says where each element stands now.

| From | Element | Where on this board | After P1-9 |
|------|---------|---------------------|------------|
| home-energy | Vivid 2×2 as a one-temperature diagonal pair | Ride report, both schemes | The rule of ADR-0029 §2.5: slots 1 + 2 or 3 + 4 on the diagonals |
| home-energy | Three-column type specimen with the `metric.xl` 300/200 strip pinned under it | Foundations | Kept, with `axis` |
| home-energy | Continuous ramps with OKLCH L and roles; chart series as strokes on each scheme's own plot | Foundations | Kept |
| home-energy | Datasheet ornament: dotted leaders, tick rulers | Report title block (leaders), report chart (climbs on a tick ruler), phone ride card (progress ruler) | Kept; the leaders moved from the glass card to the hero readouts |
| home-energy | Translucent status layer (wash, recoloured stroke, outlined pill; the pill paints `bg.page` under its tint, F31) | Report map: the closed bridge | Kept; now a rule (ADR-0030 §6.2) |
| home-energy | The lit tile carrying the climb; card padding bound to the density token | Watch | Kept, at the `watch` density with its second tone |
| home-energy, portfolio | Explicit `data-ds-density` on every frame | All screens and pinned panels | Kept |
| portfolio | Bloom strip; full-range grain recipe | Foundations; every vivid and glass surface | The bloom row shows the tokens as they are; the grain is ADR-0030 §4.4's value noise |
| portfolio | Fallback frame of the signature screen, with selected → inverse | Third phone; materials row | Kept |
| portfolio | Dense hairline table: mono ids (plain text, not chips), sparklines, tabular columns, delta badges | Report: "Segments on this loop" | Kept, with length and grade |
| portfolio | Level chart with the value above and the delta below each level | Report: "Old Mill Rise, six rides" | Replaced for D4 by a dot strip on the glass plot, with a goal line |
| portfolio | Light glass with ink over a daylight map | Light report card | D1: the scheme's glass in light |

Reference families are named on the board by their shot ids in `docs/research/references.json`, never by name (ADR-0015; the reference-copy guard scans this folder).

## Provenance

The generated files were copied from the working tree after P1-9, at HEAD `5e206aabb2f6e7dd8d2959afd2c1ad08cd9b1124`, on 2026-09-16. `tokens.css` comes from the uncommitted P1-9 build: `pnpm tokens:check` reported "189 files, up to date" when it was copied, so the file matches the token sources in that tree. The other six files have not changed since commit `b6af61cbf6fb0bddb99d976e298b1a57a991b56f` ("P1-5 and P1-8 emission", 2026-09-15). The copies are byte-identical to their sources.

| Copy | Source | SHA-256 |
|------|--------|---------|
| `assets/tokens.css` | `web/packages/tokens/src/generated/prism/tokens.css` | `e6f63a5bac07103935dec82466851e6d283ac1b171b43d4562a9488b284bd1d9` |
| `assets/motion.css` | `web/packages/tokens/src/generated/motion.css` | `ce5a0a7081282a46603bf5de693134b2412f87667e280bcc9fd318d9c85957b9` |
| `assets/fonts/fonts.css` | `web/packages/tokens/src/generated/prism/fonts/fonts.css` | `6fa53032886efb4f8ebbf999fe7d4a645605e5ade3cc817e83fabe37d526e6b4` |
| `assets/fonts/onest/onest-wght.woff2` | `…/prism/fonts/onest/onest-wght.woff2` | `1c4fca24ecf78f9ce3922c9fa58f06e139ed08a5faa13ca5b082482317bda5f9` |
| `assets/fonts/onest/OFL.txt` | `…/prism/fonts/onest/OFL.txt` | `071195d8806e226faeee60259c28ca67b458227af5195a73f5cfcab06e3003bc` |
| `assets/fonts/jetbrains-mono/jetbrains-mono-wght.woff2` | `…/prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2` | `11038e282dd7cb983dfc4e565017f37a91041c073c8929771fb6e64d27814396` |
| `assets/fonts/jetbrains-mono/OFL.txt` | `…/prism/fonts/jetbrains-mono/OFL.txt` | `b2fe5e8987594e9ffd1d2ca52a2f5d73eb8335243893c5d6254b5ad69269591d` |

`fonts.css` keeps its relative `./onest/…` and `./jetbrains-mono/…` URLs, so the folder layout under `assets/fonts/` mirrors the generated one. Both fonts are under the SIL Open Font License, which travels with them.

To check that the copies still match the build, run this from the repository root. No output means they match:

```sh
G=web/packages/tokens/src/generated; B=docs/direction-board/assets
cmp $G/prism/tokens.css $B/tokens.css; cmp $G/motion.css $B/motion.css; cmp $G/prism/fonts/fonts.css $B/fonts/fonts.css
cmp $G/prism/fonts/onest/onest-wght.woff2 $B/fonts/onest/onest-wght.woff2
cmp $G/prism/fonts/jetbrains-mono/jetbrains-mono-wght.woff2 $B/fonts/jetbrains-mono/jetbrains-mono-wght.woff2
```

After a token change, copy the files again, update the table above and re-render. Once P1-9 is committed, the commit that carries it replaces "the working tree after P1-9" above.

### Rules the page keeps

- **Only token values.** Colors, font families, type values, radii, spacing, shadows, blur, durations and easings come only from `var(--ds-…)` properties of the copied `tokens.css` and `motion.css`, or from `color-mix()` of them. The page has no hex, rgb, hsl or oklch literals and no font-family literals.
- **No board-local colors.** Since P1-9 every color and alpha on the screens is a token:
  - the map is `color.map.*`, and every translucent ground is drawn over `color.map.land` alone, never stacked on another ground, exactly as `contrast:check` composites the seven grounds (ADR-0030 §1.1, §1.5). Each lot therefore sits on its own opaque land backing inside its block, and the river's water sits on the bed's land;
  - Card glass is `material.glass.fill` with the `text.on-glass-fill` tones, and chips and map controls are `material.glass.chip`;
  - charts on glass take `color.chart.on-glass-fill.*`, and charts on vivid take `color.chart.on-media.*`;
  - the solid on vivid is `bg.fill.inverse-media`, and open rings on vivid are `border.on-media`;
  - edges are `color.edge.highlight` at the recipe's or `material.vivid.edge.*` alphas, and raised has a `color.edge.raised` top edge;
  - blooms take the derived `-bloom-color`.

  The first board's `--map-*`, `--cg-*` and `--hud-*` recipes and its borrowed media solid are gone.
- **Where pixel literals appear.** Only in the device frames, in the board's outer grid, and inside the procedural SVG geometry (map, charts, glyphs). Chart markers, route markers and map dots are sized from `chart.marker-size`, and stroke widths are tokens or multiples of tokens. The one map mark that is not is the closed-bridge status marker, whose radii are its own geometry and are declared below.
- **Untokenized values.** What remains is geometry or a recipe that a spec or a later ticket owns. The top of the page's stylesheet declares it:
  - map strokes as multiples of tokens: the route casing at 3.5 ×, the ridden route and the climb at 2 × and the route ahead at 1.5 × `chart.line-width`, and the map-label halo at 2 × `border.strong`. The map tokens' descriptions document these widths (ADR-0030 §1.4). The route start ring at `chart.marker-size` / 2 + `chart.line-width` is the board's own;
  - the edge geometry: a 135deg gradient from `edge.start` at 0 % to `edge.end` at 75 % (Surface.yaml, P2-1);
  - the light-glass bloom shape: a 60 % × 120 % radial from the top-leading corner, clear at 70 %. Only glassLight in dark shows it; `material.glass.fill-bloom` is 0 in both schemes;
  - the vivid bloom placement: offset 10 % down and scaled to 0.92 (Surface.yaml, P2-1);
  - the grain tile: value noise from a 32-bit integer hash, one value per CSS px, stretched to the full range, 128 × 128 (ADR-0030 §4.4). P3-1 and P3-4 pin the hash and a checksum, so the board's hash is informative. The vivid card leaves the grain out of V2's header block, as §4.4 asks;
  - the critical status border at 50 % (the StatusPill spec), and the closed-bridge marker's own geometry on the report map, which is not sized from `chart.marker-size`: the wash at r 32, the dashed halo at r 42 and the crossing bar at half 22 (the StatusPill and map-overlay specs);
  - the scrim geometry of the 03 evidence phone: a bottom scrim 58 % of the screen high, solid to 52 % (Surface.yaml, P2-1). No screen the owner signs carries a scrim — D1 removed it from the map (ADR-0029 §1.7) — so only the "before" picture draws one;
  - the procedural map geometry: street grid, river and route.
- **Where the board knowingly departs from a recipe.** The 03 evidence phone reproduces the pre-D1 card, so its `material.glass.dark.fill` grain (0.04) covers the whole card, including the 12 px caption, where ADR-0030 §4.4 leaves the grain out of the content box of text below 13 px. The evidence is a picture of the old look and ignores the mask. Every screen the owner signs keeps it: Card glass draws no grain at all (`material.glass.fill-grain` is 0 in both schemes), and vivid masks its grain out of the V2 header block, where all its text below 13 px sits.
- **Text on vivid.** A vivid Card's header column ends at W − p − a − 16, so its text below 24 px stays in the ADR-0022 V2 block at every density. Units sit in the caption (V3, ADR-0030 §8). The bloom cards sit at a V2 reference geometry (240 × 240, regular). The evidence 2×2 tiles are too small for any V2 geometry, so they carry no text.
- **Frames are pictures.** Each device frame and each materials stage is a `<figure>` named by its caption, and its screen is `inert`. The mocks add no landmarks, headings or tab stops: the page has one `main`, a labelled section nav, one H1, four H2 sections and H3 sub-sections, and Tab reaches only the section links. Decorative SVG is `aria-hidden`; each evidence 2×2 in 03 is one image named by its gradients, and the foundation 2×2s keep their tile text readable. Russian labels outside the Russian frames carry `lang="ru"`.
- **Invented content.** All copy, names and numbers are invented. Maps are drawn from a seed, and nothing comes from the reference shots.

## Renders

`renders/` holds the final PNGs from `render.mjs`:

| File | Content |
|------|---------|
| `board-light.png`, `board-dark.png` | The whole board at 1600 CSS px, full page, under `prefers-color-scheme: light` and `dark`. About 8 MB each, so they are not committed (`.gitignore`); `render.mjs` writes them locally. The published copy for the owner's sign-off is https://claude.ai/artifact/HDD9juxf5tL4thrDonkZfe, republished from this re-render on 2026-09-16 (label "P1-9 sign-off round"). |
| `screen-live-ride-light.png`, `screen-live-ride-dark.png` | The live ride phone, light (en) and dark (ru) |
| `screen-live-ride-fallback-light.png` | The live ride phone under the glass fallback (light, ru) |
| `screen-ride-report-dark.png`, `screen-ride-report-light.png` | The ride report desktop, dark and light |
| `screen-glance-dark.png`, `screen-glance-light.png` | The watch, dark and light |

The screen renders are element screenshots of each device frame, taken from the light pass. Screens pin their own scheme, so they are the same in both passes.

### How to re-render

`render.mjs` opens `index.html` with Playwright Chromium at 1600 px wide and renders the full page twice, once under `prefers-color-scheme: light` and once under `dark`. Before it writes a PNG it waits for `document.fonts.ready` and for the page's build. The run exits 1, and writes no PNG for that scheme, if any of these happens:

- any `@font-face` did not load;
- any glyph rendered in a font other than Onest or JetBrains Mono. The script asks Chromium which fonts drew each element that owns text (`CSS.getPlatformFontsForNode`), because `document.fonts.check()` is true for any loaded face without a `unicode-range`, whether or not it holds the glyphs. Onest has no Greek, so a symbol such as ΔE goes in `font.mono`;
- the page requested anything but `file:` or `data:` URLs;
- the page threw or logged an error.

Playwright 1.63.0 is not a repository dependency. Install it outside the repository and point `PW_MODULE` at it:

```sh
mkdir -p /tmp/prism-pw && npm --prefix /tmp/prism-pw install playwright@1.63.0
(cd /tmp/prism-pw && npx playwright install chromium)
PW_MODULE=/tmp/prism-pw/node_modules/playwright/index.mjs node docs/direction-board/render.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` for both commands if you install the browser somewhere other than Playwright's default cache. A passing run prints both font faces as `loaded` for each scheme, and 0 text elements with a font outside Onest and JetBrains Mono.

## Reference-distance review

ADR-0015 decision 3 asks that no direction-board screen be recognizably the same composition as a reference shot. ADR-0029 rule 10 makes this review a manual gate before the owner signs. Reviewed on 2026-09-16 against `docs/research/references.json` and the analyses in `docs/research/refs-*.md`. Visual-dna §6.4 asks every desktop composition to mix moves from at least two families.

### Live ride (phone)

- **Nearest references:** traffic console 27289370 and incident console 27571204, which put a glass readout over a map with pill controls.
- **What it takes:** principles only. Glass over the world, the instrument numeral, pill grammar, one solid per group.
- **Families mixed:** traffic console 27289370 (glass readout, instrument numeral), bottle tracker 27699907 (capsule chips over imagery), health tracker 27706847 (datasheet ruler), finance monitor 27696584 (one solid among hairlines).
- **What differs:** one full-width readout at the thumb under a turn cue, where the references pair a small offset card with a solid sheet. The card holds a datasheet ruler and a profile plot. The segment row has no track. There is no bottom sheet, alert list or toolbar track.
- **Verdict:** not recognizably any reference composition. Unchanged since the first board apart from its tokens.

### Ride report (desktop): the D4 rework

- **Nearest references (of the composition as rebuilt):** finance dashboard 27678963 and finance monitor 27597487. 27678963's detail drawer runs the full content height with its action bar pinned at the bottom (its analysis, §5); the plate with the glass card pinned to its foot is that figure, turned from an overlay into a column of the page. 27597487 supplies the hero column beside a card grid. Both were already credited below for single moves (the two-tone headline, one solid beside an outlined action, the hero column); they are named here because the *shape* of the screen, not only its parts, is closest to them.
- **Before (the first board):** it rearranged most of the inventory of traffic console 27220417:
  - a tools cluster across the top: logo, pill tabs, a search pill with a keyboard shortcut, bell, settings and avatar;
  - the title in `display.xl` over a map that filled the top 40 % and faded into the page;
  - a glass card mid-map, tied to the climb by a leader;
  - a banded speed chart with an inline "Target 28" line and a trailing axis;
  - a level chart of six rides.

  Its closed-bridge pill sat under the tools, which echoed shipping console 27658472. Below the map, a 12-column grid held the chart (8 columns), a vivid 2×2 spanning two rows (4 columns), then the table and the level chart.
- **After (this board):** a detail screen, not a console. The leading eight columns are a ledger and the trailing four a plate.
  - **Top band:** none across the screen. The title block holds a back button (the outlined ghost), a breadcrumb, and the page's two actions: Export (ghost) and Share ride, the one inverse solid.
  - **Title:** a two-tone headline on the page, "Lantern Quay loop / Old Mill Rise, 2.1 km/h slower". Under it the date line with the id chip, then the one hero, `metric.xl`, with dotted leaders to its readouts.
  - **Vivid 2×2:** beside the title block in the top row. Its heroes share a baseline row with the page hero.
  - **Map:** a framed portrait plate on the trailing four columns, full height, drawn from `color.map.*`. Map controls are `material.glass.chip` in its top corner, and the closed bridge (wash, stroke and pill) sits by the river.
  - **Glass card:** pinned to the plate's foot, with no leader. It holds the delta and the six rides as a dot strip on the glass plot, with a dashed goal line in the plot's reference tone, and today's dot is the accent.
  - **Chart:** a full-width card under the top row, in two lanes: speed against last week over the loop's elevation. The flagged climb is the one band across both lanes, and the chart carries no target.
  - **Table:** the segments table, full width at the bottom, with length and grade.
- **Families mixed:**
  - finance dashboard 27678963: the two-tone headline, and one solid beside an outlined action;
  - finance monitor 27597487: a hero column beside a card grid;
  - health tracker 27706847: the dotted leaders and the dot strip on a ruler;
  - bottle tracker 27699907 and Family A: the vivid 2×2.

  Prism's own DetailScreen supplies the header and the glass card over media, and DashboardGrid the hero row of one 2×2.
- **What it keeps:** the story (one flagged climb, one orange object: the map segment, the chart band and ruler, the table badge, the strip's dot), corner-pinned cards, hairline charts and the vivid 2×2.
- **What it keeps of 27220417, as principles rather than inventory.** These are taken knowingly, and the owner should see them named before confirming item 4. ADR-0015 decision 3 forbids the same *composition*, not the same grammar, and visual-dna §3.6 and §6.4 ask for exactly this grammar; but each of these is recognizable in the reference shot, so none of them is claimed as "broken up":
  - **27220417's time-series chart grammar** (its analysis, §7): a white primary line, a grey jittery comparison line, one full-height band behind a flagged window with that window's segment in the accent and accent bookend dots, dashed horizontal grid, Y labels outside the plot on the trailing side. Of the three traits the "before" list named — a banded speed chart, an inline target, a trailing axis — only the inline target is gone;
  - **the ↗ affordance in the same corner of every card** (its §9.10 calls this signature). All seven cards on the screen carry it;
  - **a dashed ring around a map object.** 27220417 rings its moving marker with a dashed ring (its §7, map overlays); this board rings the closed bridge;
  - **a vertical stack of round glass buttons on the map**, and an accent route segment with a glowing dot;
  - **the glass KPI card's grammar:** title, grey subtitle, ↗ top-trailing, and a hero with a dimmed decimal beside a small unit (§9.3, §9.10).
- **Verdict:** its own composition. The layout is new — a ledger beside a portrait plate, with no nav, no rails, no full-bleed map and no bottom band — and no element sequence reads as 27220417's. The inventory item 6.1 named is broken up:
  - the tools cluster is gone;
  - the title is no longer over a fading map;
  - the glass card is no longer tied to its object;
  - the chart has no inline target;
  - the level chart is gone;
  - the status pill is no longer under any tools.

  What remains of that shot is the grammar listed above, not its inventory. The owner confirms the rework at sign-off (item 4 below) with that list in hand.

### Glance (watch)

- **Nearest references:** no reference shows a watch. The nearest moves are the lit tile in a slab of shipping console 27658472 and the instrument numeral.
- **What it takes:** principles only. One hero numeral, one lit tile, one solid.
- **What differs:** a generic three-part watch stack (hero, tile, pill) at the `watch` density, with no slab of tiles, no rail and no grid.
- **Verdict:** not recognizably any reference composition.

## Sign-off checklist

The owner approves or rejects each item. A rejection becomes a token change through P1-1 or P1-2 before P3-3 and P3-4 start. The board section and the decision behind each item are given in brackets.

### Answered on 2026-09-15

The owner reviewed the first board and approved D1–D4 as recommended (ADR-0029). The metric.xl thin dark weight stays, and the other findings went in by their proposals (ADR-0030). The first checklist and its answers:

| Item | Asked | Answer (2026-09-15) | Where it landed |
|------|-------|---------------------|-----------------|
| 1.1 | The vivid sets as rendered | Changed by D2 | ADR-0029 §2 |
| 1.2 | The light set's chroma [F13] | Spend the V1 cap on chroma (D2) | ADR-0029 §2.1 |
| 1.3 | Navy-cyan's horizon [F12] | Retune it (D2) | ADR-0029 §2.2 |
| 1.4 | Ember-night's place [F11] | Out of the 2×2 slots, a hero card only (D2) | ADR-0029 §2.3, §2.6 |
| 1.5 | The 2×2 rule [F11] | One temperature, the agents decide how (D2): the slots become two pairs, and a 2×2 alternates one pair on its diagonals | ADR-0029 §2.5 |
| 1.6 | The bloom [F14] | By the proposal | ADR-0030 §4.3 |
| 1.7 | The grain [F15] | By the proposal | ADR-0030 §4.4 |
| 2.1 | Card glass follows the scheme [F1, F7] | Yes (D1) | ADR-0029 §1.2–1.5 |
| 2.2 | Neutral smoke [F3] | Yes (D1) | ADR-0029 §1.1 |
| 2.3 | The light scrim [F2] | The agents decide (D1): 0.45 in both schemes, no scrim over maps | ADR-0029 §1.7 |
| 2.4 | Charts on glass [F4, F5] | By the proposals | ADR-0030 §2 |
| 2.5 | The edge [F8] | By the proposal | ADR-0030 §4.1 |
| 2.6 | The fallback | Unchanged | ADR-0022 §1 |
| 3.1 | metric.xl at 200 in dark | Kept | ADR-0029 §3.4 |
| 3.2 | Figures [F24] | By the proposal: metric.md proportional | ADR-0030 §7.1 |
| 4.1 | One orange, one object | Kept | — |
| 4.2 | Accent text | Kept | — |
| 4.3 | The lit tile [F23] | By the proposal: a second tone | ADR-0030 §3.4 |
| 4.4 | Dark tint.accent [F18] | Kept for chart windows; the dark attention card is the lit tile | ADR-0030 §3.3 |
| 5.1 | Compact desktop [F26] | Page margin 24 (D3) | ADR-0029 §3.1 |
| 5.2 | Regular phone | Kept | — |
| 5.3 | Comfortable watch [F27] | More compact, the agents choose how (D3): a `watch` density | ADR-0029 §3.2 |
| 5.4 | The ghost button [F29] | Outlined, no rest fill (D3) | ADR-0029 §3.3 |
| 6.1 | The three compositions | Rework the ride report (D4) | ADR-0029 §4; this board |
| 6.2 | Token work before P3-3 and P3-4 | By the proposals | ADR-0030 §1–§7 |

### Sign now (gate P3-0)

1. **Glass follows the scheme (D1)**
   - [ ] **Light glass with ink** and its secondary and dimmed tones over the map: the light phone, the light report and the materials row. **Neutral smoked glass** with white 100 / 78 / 64 % in dark. [02, 01]
   - [ ] **No scrim over maps.** The scrim is 0.45 in both schemes, for photographs. [ADR-0029 §1.7]
   - [ ] **Where D1 narrows.** Over imagery and vivid, light glass carries ink only, because its quieter tones hold only over Prism's map (ADR-0029 §1.4). A dark photograph in light is a dark scope.
   - [ ] **Selection on light glass.** In light, glassLight and the scheme's glass share one fill, so Card.yaml gives selection another cue (P2-1). [01, materials]
2. **Vivid brighter, one temperature (D2)**
   - [ ] **The light set** with the brighter sky, rose and olive; **navy-cyan** without its horizon; **night-lagoon**, new, in dark slot 3. [01]
   - [ ] **The four pairs and their temperatures**, as 2×2s: sky + orchid (cool), rose + olive (warm), plum-dusk + navy-cyan (cool), night-lagoon + forest-moss (cool). Three pairs are new to the owner. [01]
     - **Slot 4 is the one to decide.** Forest-moss is cool by judgment, not by measurement: ADR-0029 §2.4 records that OKLab b puts it at +0.030, on the warm side, and that no hue formula settles it. Its end stop is `oklch(0.557 0.0908 118.8)` and light slot 4's olive ends at `oklch(0.655 0.13 119.7)` — the same olive hue family — so the dark 3 + 4 2×2 visibly ends in olive, like the light 3 + 4 pair. Confirm "cool", or call it warm and the dark pairing changes. [ADR-0029 §2.4–2.5]
   - [ ] **Ember-night outside the slots**, for one warm hero card on a screen without the accent. [01, the bloom row]
   - [ ] **The bloom** at 75 px from the brightest stop, at 0.30 in light and 0.45 in dark, and the grain drawn as full-range value noise. [01]
3. **Density and components (D3)**
   - [ ] **Compact desktop** at a 24 px page margin. [02, the report]
   - [ ] **The watch density:** card padding 16 and a 44 px pause pill. [02, the glance]
   - [ ] **The ghost button,** outlined with no rest fill. [01 materials; the report's back and export buttons]
4. **The reworked ride report (D4)**
   - [ ] **The ledger and the plate** in both schemes, as its own composition. [02]
   - [ ] **The reference-distance review** of all three screens, above. [02, this README]
5. **The roles of ADR-0030 as drawn**
   - [ ] **The map palette,** charts on glass and on vivid, the solid, rings and edges on media, light raised, alpha light tints, `type.axis`, the lit tile's second tone and the watch hero size. [01, 02]
6. **Open, and not blocking P3-0**
   - The grain hash and tile checksum (P3-1, P3-4).
   - The edge, bloom and grain-mask geometry (Surface.yaml, P2-1). This now carries **the dark glassLight bloom over header text**, which `contrast:check` cannot model, because it knows no geometry: the 0.35 radial from the top-leading corner falls under the caption line of the turn cue and of the materials glassLight cell. Measured on this render at `deviceScaleFactor` 2, over fully covered glyph pixels only: the materials glassLight caption is 4.36:1 at its worst pixel, 4.82 at p5, 6.37 median, and the dark phone's turn-cue caption 4.75, 5.03 and 6.13. So the cue clears 4.5:1 and the materials cell does not, by 0.14 on a handful of pixels. `contrast:check` passes the pair because it knows no geometry: it composites the glass over the ground, never the bloom that is painted on top of the text. Surface.yaml either keeps the bloom clear of the Card header block or records the margin, and P3-5 re-measures it on the renders.
   - The thin-line check on renders and separate touch frames (P3-5).
   - Colored series on glass and vivid, and F19's hairline gauge track (data-viz wave 1).

## Token findings

These are the tokens that looked wrong or weak on the candidate boards, each confirmed by the judges. "Found by" names the candidate board and its finding number. Two findings were confirmed by one judge and rated plausible by another: F15 (the grain) and F28 (hit sizes). One judge treated F24 as a policy choice rather than a defect. F31 came from the final check of the first board.

The "Outcome" column records what P1-9 did with each proposal. The status is:

- **resolved**: a token, rule or check landed in P1-9;
- **open**: a later ticket finishes it;
- **documented**: the board records a limitation and adds no token.

Totals: 29 resolved, 1 open (F15), 1 documented (F28).

### Glass and materials

| # | Token | Scheme | Problem | Proposed change | Outcome (P1-9) | Status | Found by |
|---|-------|--------|---------|-----------------|----------------|--------|----------|
| F1 | `comp.card.glass.fill` → `material.glass.dark.fill` | light | Card glass is smoked glass in light too (`ref.color.smoke.light` at 55 %). Over a daylight map it composites to #6A6C6B–#787977. There, `text.on-glass-secondary` reaches 3.35–3.96:1 and `text.on-glass-tertiary` 2.79–3.23:1, and the card reads as a khaki slab. | Resolve Card glass per scheme: light → `material.glass.light.fill` with the light tones (F7); dark → `material.glass.dark.fill`. Keep smoked glass for photographs (`backdrop: image`). | Card glass binds the role recipe `material.glass.fill`: `light.fill` in light, `dark.fill` in dark (D1). A dark photograph in light is a dark scope instead of smoked glass per backdrop. ADR-0029 §1.2, §1.5 | resolved | ride 1, home-energy 6 |
| F2 | `material.glass.scrim` | light | Black 35 % over `neutral.100` composites to #9D9D9F (OKLCH L 0.70), where white reaches 2.70:1. Over white roads it gives 2.44:1. ADR-0022 §3.3 needs 3.0:1 (L ≤ 0.67). | Raise the light scrim to 0.45, or state the 3:1 limit on the glass composite. With F1, maps need no scrim. | Black 0.45 in both schemes (white 3.35:1 over pure white), and maps need no scrim. ADR-0029 §1.7 | resolved | ride 2 |
| F3 | `ref.color.smoke.light` (h 128.7), `ref.color.smoke.dark` (h 145.1) | both | The smoked fills have a green-yellow hue, while the neutral ramp sits at 261.6–271.4. Glass reads olive, against principle 6. | Keep L and C and move the hue to about 265, or drop C to the ramp's 0.004–0.007. | Hue 265 at C 0.007, same L (#0A0B0E, #111316); `color/smoke-chroma` checks it. ADR-0029 §1.1 | resolved | ride 3, home-energy 6 |
| F4 | `color.chart.plot` | light | The plot is `neutral.0`, about 9.1:1 against smoked glass: a white hole in the card. | Key the plot by material: on glass, white 8 % in both schemes with series in the glass foreground. Keep `neutral.0` on solid. | `color.chart.on-glass-fill.plot`, `.line`, `.reference`, `.grid`: a white 8 % plot, the line in the glass foreground. ADR-0030 §2.3. **The plot shows in dark only.** The token is white 8 % in both schemes, so over a light-glass composite near OKLCH L 0.93 it lifts about 1.02:1 and is invisible: on `screen-live-ride-light.png` and `screen-ride-report-light.png` the profile and the six-ride strip carry no plot area, while their dark twins show it as a tile. Nothing fails a pair — the plot is decorative and the series keeps its own contrast — so this is recorded, not fixed here. A light-scheme lift on light glass (an ink alpha rather than white) is a token follow-up for data-viz wave 1. | resolved, with a limitation | ride 4, home-energy 2 |
| F5 | `color.chart.*` on vivid and glass (missing) | light | Every light chart token is ink, so traces, reference lines and grids on media have no valid token. | Add `color.chart.on-media.line`, `.reference` and `.grid` (white 100 / 64 / 24 %), picked by the published material. | Added for vivid with the reference at white 100 %, told apart by the target dash: 64 % gives 2.12:1 over a stop at V1's bound. ADR-0030 §2.2 | resolved | portfolio 11, home-energy 2 |
| F6 | `color.bg.fill.inverse`, `color.text.on-inverse` | light | Principle 9 wants a white solid on glass and vivid, but `bg.fill.inverse` is ink in light. All three boards borrowed a white. | Add `color.bg.fill.inverse-media` = `neutral.0` and `color.text.on-inverse-media` = `neutral.950` in both schemes. | Added (19.30:1) for the solid on vivid; on the scheme's glass `bg.fill.inverse` is already right. ADR-0030 §3.1 | resolved | ride 5, portfolio 10, home-energy 7 |
| F7 | `color.text.on-glass-light` (ADR-0022 §3.1, glassLight row) | light | Light glass has one ink tone. The dimmed fraction is lost, placeholders read as typed text, and a whole sheet renders at 100 % ink. | In light, glassLight over image or map publishes `text.secondary` (5.24–6.31:1) and `text.dimmed` (3.15–3.80:1 at 24 px or more); vivid keeps one tone. Alternative: fill white 38 % plus `text.on-glass-light-secondary` at ink 80 %. | Six `text.on-glass-fill*` tones follow the scheme. Over the map, light glass takes `text.secondary`, `tertiary` and `dimmed`; over imagery and vivid its `-media` tones are ink. glassLight keeps one tone. ADR-0029 §1.3, §1.4. **Measured on this render** at `deviceScaleFactor` 2, over fully covered glyph pixels only: the dimmed tone holds 3.07–3.15:1 and the secondary tone 5.16–5.24:1 on all three light-glass cards (the phone's ".4", the report's ".3", the materials cell), against `contrast:check`'s 3.07 and 5.24 over the worst map ground. At 1× they are 3.19–3.33 and 5.45–5.46. The margin is thin, which is why the map must draw each translucent ground over `map.land` alone (ADR-0030 §1.1): stacking `building` on `block`, as the first re-render did, cost 0.16 and left the dimmed tone at 2.99. | resolved, narrowed | ride 14, portfolio 7 |
| F8 | `material.glass.*.edge.*` (alpha only), vivid highlight, raised highlight, bloom color | both | These values have no color token, or no token at all, so every board wrote its own. | Add an edge color (`neutral.0`), a vivid highlight alpha (about 0.30 → 0 light, 0.18 → 0 dark), `color.edge.raised` (`neutral.0` light, white 8 % dark) and a bloom color per gradient. | `color.edge.highlight`, `color.edge.raised`, `material.vivid.edge.start` and `.end`, and a derived `-bloom-color`; `color/edge-neutral` checks the edges. The geometry goes to Surface.yaml (P2-1). ADR-0030 §4.1–4.3 | resolved | ride 12, portfolio 5, home-energy 10 |
| F9 | `color.bg.surface`, `.raised`, `.nested` | dark | White-alpha overlays (6 / 9 / 12 %) turn translucent over imagery and vivid. | Surface always paints `bg.page` under solid, raised and nested, or the build emits opaque twins (#1C1C1F, #232426, #2A2B2E). | Surface paints `bg.page` under them, as the board does; the Surface tests of P3-1 and P3-4 check it. ADR-0030 §5.1 | resolved | portfolio 8 |
| F10 | `color.bg.surface.raised` | light | White 70 % composites to #FBFBFC, 1.03:1 against `bg.surface`: raised looks the same as solid. | Raised on a solid parent resolves to nested, or light raised becomes `neutral.50` with `elevation.1`. | Light raised is `neutral.50` with its `color.edge.raised` top edge and `elevation.1`. ADR-0030 §5.2 | resolved | portfolio 15 |

### Vivid

| # | Token | Scheme | Problem | Proposed change | Outcome (P1-9) | Status | Found by |
|---|-------|--------|---------|-----------------|----------------|--------|----------|
| F11 | `gradient.vivid.1`–`4` (slot order) | both | Slots 1–4 mix temperatures (§3.5, anti-pattern 13). Ember-night's end stop is ΔE(OK) 0.078 from `accent.500`, so it reads as a second, larger accent. | Make each quartet one temperature: move ember-night out of the slots and give dark slot 3 a cool gradient. Add a second cool light gradient, or let a 2×2 alternate one pair on its diagonal (light 1 + 4, dark 1 + 2). The owner decides whether sky + orchid reads as one temperature. | Every gradient declares `temperature`; slots 1 + 2 and 3 + 4 are one temperature each (`gradient/slot-temperature`), and a 2×2 alternates one pair on its diagonals. The new night-lagoon takes dark slot 3; ember-night leaves the slots. ADR-0029 §2.3–2.6 | resolved | ride 6, portfolio 2, home-energy 3 |
| F12 | `ref.gradient.vivid.navy-cyan` | dark | Between 45 % (L 0.32) and 75 % (L 0.61) lightness climbs 0.96 per unit of t, against 0.043 before it, so the tile shows a hard horizon. | Move the 75 % stop to about 88 %, or add a stop near 60 % at L ≈ 0.45. V1 and V2 still pass. | Colors kept; stops moved to 30 % and 85 %: the steepest climb is 0.52, V2 7.46. ADR-0029 §2.2 | resolved | ride 7, portfolio 3 |
| F13 | `ref.gradient.vivid.sky`, `.rose`, `.olive` | light | After P1-1 the light set is dusky. Sky has C 0.072 / 0.097 / 0.044, and rose moves only 0.05 in L over its first 65 %. | Spend the V1 cap on chroma: sky mid and end C ≈ 0.12 with its end hue toward 235; rose 0.50 0.09 22 → 0.58 0.11 32 → 0.67 0.10 52; olive end C 0.13. Re-run V1, V2 and the ink-on-light-glass pairs. | By the proposal, with sky's and olive's end L lowered by up to 0.008 and rose's start and middle by 0.01 and 0.005, for V1 and V2 margins of 0.05; every ink-on-light-glass pair passes. ADR-0029 §2.1 | resolved | portfolio 4, home-energy 4 |
| F14 | `ref.gradient.vivid.*-bloom-blur` (150px), `-bloom-alpha` (0.3) | both | CSS `blur()` takes a standard deviation, so the bloom barely shows. In dark it does not show at all. | Emit sigma = radius / 2 (75 px) or set the token to 75 px. In dark, use alpha ≈ 0.45 and take the bloom from the brightest stop. | `bloom.blur` 75, dark alpha 0.45, and the bloom color derived from the brightest stop; SwiftUI's blur scale is a P3-1 verify item. ADR-0030 §4.3 | resolved | portfolio 1 |
| F15 | `ref.gradient.vivid.*-grain`, `material.glass.dark.fill-grain` | both | Grain is only an opacity, and the noise itself is not defined, so implementations will disagree. | Pin the recipe: monochrome noise stretched to full range, overlay blend, 1 px grains at 1×, masked under text below 13 px. | Recipe written down (value noise per 1 pt cell, full range, overlay, left out under text below 13 px); the hash and tile checksum land in P3-1 and P3-4. ADR-0030 §4.4 | open | portfolio 12 |
| F16 | `type.metric.unit` on vivid (ADR-0022 §4.2) | both | On vivid, the hung unit cannot follow the hero, because text below 24 px must stay in the header. | Add a V3 check: the hero block (hero plus unit) must reach 4.5:1 at every V2 geometry. Until then, Card.yaml says the unit moves into the caption. | V3 is a rule, not a gate: the unit joins the caption (a gate would bring back F12's horizon). ADR-0030 §8 | resolved | ride 13 |

### Charts, status and accent

| # | Token | Scheme | Problem | Proposed change | Outcome (P1-9) | Status | Found by |
|---|-------|--------|---------|-----------------|----------------|--------|----------|
| F17 | `color.chart.target` = `color.chart.comparison` | light | Both are ink 45 % (3.09:1), so the comparison line reads as heavy as the target. visual-dna §3.6 says 30 %. | Light `chart.target` → ink 60 % (5.07:1). Keep `chart.comparison` at 45 %. | By the proposal; 75 % under Increase Contrast. ADR-0030 §2.4 | resolved | portfolio 6 |
| F18 | `color.bg.tint.accent` | dark | 14 % over the page composites to #2D2118, which reads as brown mud. | In dark, the one lit card uses `bg.fill.accent` with ink, and the tint is kept for chart windows. Or build the dark tint from `accent.400` at 12 %. | The first option: the tint fills chart windows and bands in dark, the attention card is the lit tile, and tinted Cards are light only. ADR-0030 §3.3 | resolved | portfolio 14 |
| F19 | `chart.gauge-stroke-ratio` (0.1) | both | A 170 px ring gets a 17 px stroke, which outweighs the hairline charts and the thin hero. This board draws no gauge; the home-energy candidate showed it. | 0.05, or a hairline track with only the value arc weighted. | 0.05; the hairline track is left to the RingGauge spec (data-viz wave 1). ADR-0030 §2.5 | resolved | home-energy 5 |
| F20 | `type.axis` (missing) | both | §8.2 sets axes at 12 px tabular, but `type.data` is 13 px and `type.caption` is proportional. | Add `type.axis` 12 / 1.2 / 400 with tabular figures, bound by ChartAxis. | Added; every axis on the board uses it. ADR-0030 §2.6 | resolved | portfolio 13, home-energy 13 |
| F21 | `color.bg.tint.critical` (and `.success`, `.warning`, `.info`) | light | Light tints are opaque steps, while dark tints are 10 % alpha. The closed-bridge wash on the light report map shows as a flat pink disc. | Author light tints as 10–12 % alpha of the dot step, and keep today's values as the expected composites on white. | The dot step at alpha 0.12, within 0.48/255 of the old composites on white; `ref.color.status.*.tint-light` deleted. ADR-0030 §6.1 | resolved | home-energy 1 |
| F22 | `color.border.strong`; rings on media (missing) | light | `border.strong` is ink 45 % (visual-dna says 30 %), and no token says "rings go to white 40 %" on media. | Add `color.border.on-media` = white 40 % in both schemes. | Added, with `color.border.on-glass-fill` for rings on the scheme's glass; both decorative. `border.strong` stays at 45 % for the ghost outline's 3:1. ADR-0030 §3.2 | resolved | home-energy 8 |
| F23 | `color.text.on-accent` | both | The lit tile has one tone, so title, caption and hero differ by size alone. | Add `color.text.on-accent-secondary` at ink ≈ 70 % (5.82:1 on `accent.300`, 4.78:1 on `accent.500`). | Added as on-accent at alpha 0.70, with an accent row in the tone table. ADR-0030 §3.4 | resolved | home-energy 9 |

### Type, density and the map

| # | Token | Scheme | Problem | Proposed change | Outcome (P1-9) | Status | Found by |
|---|-------|--------|---------|-----------------|----------------|--------|----------|
| F24 | `ref.type.metric.md` (`numeric: tabular`) | both | Static readouts look letter-spaced beside proportional heroes. | Make `metric.md` proportional by default with `numeric: tabular` on live values, or keep the role and set `numeric: proportional` on static readouts, as the report does. | The first option. ADR-0030 §7.1 | resolved | ride 10 |
| F25 | `type.metric.xl` on watchOS (40 px) | watch | No token holds the 40 px watch size, so the boards borrowed `display.md`'s size. | A watch size token (40) for `metric.xl` that keeps its dark weight 200. | `ref.type.metric.xl-watch`, which the `watch` platform context aliases as `sys.type.metric.xl`; the web board reads the ref role. ADR-0030 §7.2 | resolved | home-energy 12 |
| F26 | `space.page-margin` (compact = 16px) | compact | The desktop page margin is 16 px, where §6.4 asks for 24 (dark consoles) or 32–36 (light dashboards). | Compact `space.page-margin` → 24 (`space.7`), or add `space.page-margin.wide` → `space.9`. | Compact → 24 (D3). ADR-0029 §3.1 | resolved | ride 9 |
| F27 | `space.card-padding`, `size.control.*` (comfortable) | watch | Padding 24 and a 48 px control fill most of a 198 × 242 face. | A watch delta (card padding 16, control lg 44), or regular as the watchOS default density. | A fourth density, `watch`: regular with a 16 card padding, the watchOS default (D3); only density writes it. ADR-0029 §3.2 | resolved | home-energy 11 |
| F28 | `size.hit` (modality, root-only) | both | A board or gallery cannot show touch hit sizes beside pointer frames. | Document a gallery-only nested override, or render frames in their own documents. | No nested override; the gallery (P3-5) renders frames in separate documents, and the board keeps pointer frames. ADR-0030 §9 | documented | home-energy 15 |
| F29 | `comp.button.ghost.bg.rest` | light | The ghost pill rests on `bg.fill.neutral.subtle` and reads as filled. visual-dna §3.6 also lists "ghost fill", so the owner picks one reading. | `ghost.bg.rest` → transparent, with `bg.fill.neutral.subtle` for hover and pressed. | `bg.rest` deleted (no fill at rest), `comp.button.ghost.bg.pressed` added, the outline kept (D3). ADR-0029 §3.3 | resolved | ride 11 |
| F30 | `sys.color.map.*` (missing) | both | No token styles the map that is Prism's signature ground, so every board mixed its own palette, and ADR-0022's backdrop limits cannot be checked against a map. | Add `sys.color.map.{land, block, building, road, road-major, water, park, label, route, route-ahead, route-casing}` per scheme, with the dark set within L 0.25–0.49 and the light set at L ≥ 0.45, checked in `tools/contrast`. The final check of the first board added the pair `text.critical` on `tint.critical` over `map.road` (F31) and a stated tolerance for thin route lines under glass. | `sys.color.map.*` without `road-major` and with `road-casing`, checked by `map/backdrop-limit` (dark at L 0.35 or darker, light at 0.45 or lighter) and the label and route pairs. Stroke widths are documented; the thin-line tolerance is checked on renders in P3-5. Every translucent ground is drawn over `color.map.land` alone and never stacked on another ground, as §1.1 says and as the check composites them (F7's outcome measures what stacking cost). The label halo of §1.4 goes on the river label too. ADR-0030 §1 | resolved | ride 8, portfolio 9, home-energy 14 |
| F31 | `color.bg.tint.critical` (and `.success`, `.warning`, `.info`) under text on media | dark | Dark status tints are 10 % alpha, so a status pill over a map lets the roads through. On the report's closed-bridge pill, `text.critical` (12 px `label.sm`) on `tint.critical` measures 4.39:1 where a road runs behind the label, below 4.5:1. Over bare `bg.page` the same pair is 5.76:1. | A status pill or badge over a map or imagery paints `bg.page` under its tint, as F9 proposes for surfaces. Or raise dark `text.critical`. Add the pair to the F30 checks. | The first option, as a rule; the negative fixture `broken-tint-on-map` fails without the page (4.04:1). ADR-0030 §1.8, §6.2 | resolved | final check of the first board |
