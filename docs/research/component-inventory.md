# Component inventory

Dated 2026-09-08. Reconstructed 2026-09-14 from `docs/research/refs-*.md` after the original file was lost. The counts below were redone from the per-family analyses and may differ from the lost version.

Scope: every component observed in the 11 reference shots listed in `docs/research/references.json`, mapped onto the five layers of ADR-0012 (0 Foundations, 1 Primitives, 2 Composites, 3 Data-viz, 4 Patterns). `docs/roadmap.md` Phase 4 orders each layer by this file (most-used first). Everything here is written in Prism's own words (ADR-0015): no UI copy from the shots, no imagery.

## Shot key

| Code | Shot | Family | Mood | Platform | Analysis |
|---|---|---|---|---|---|
| SO | 27706847 | soma | light-airy | phone | `refs-soma.md` |
| HA | 27699907 | hydroflask (set A) | light-airy | phone | `refs-hydroflask.md` |
| HB | 27619760 | hydroflask (set B) | light-airy | phone | `refs-hydroflask.md` |
| KM | 27696584 | creditkarma | mixed | phone | `refs-creditkarma.md` |
| KD | 27597487 | creditkarma | mixed | desktop | `refs-creditkarma.md` |
| CP | 27678963 | creditpros | mixed | desktop | `refs-creditpros.md` |
| AR | 27658472 | arvion | dark-ops | desktop, plus one tablet frame | `refs-arvion.md` |
| ID | 27619812 | vexto-incident | dark-ops | desktop (re-posts the TD frames) | `refs-vexto-incident.md` |
| IM | 27571204 | vexto-incident | dark-ops | phone | `refs-vexto-incident.md` |
| TD | 27220417 | vexto-traffic | dark-ops | desktop (highest weight) | `refs-vexto-traffic.md` |
| TM | 27289370 | vexto-traffic | dark-ops | phone | `refs-vexto-traffic.md` |

## Method

**Counting.** The unit is the shot. A component scores 1 for a shot when at least one product frame in that shot shows it. Product frames include the product's own promo slates (for example, one card isolated over a photo). They exclude video poster stills that show a different product. Four other studio products appear that way across the set (a warehouse dashboard, a case-management CRM, a drone-ops console, a travel assistant); they are ignored except where a note says they are the only evidence. A component inside another component counts for both, so the round buttons in a top bar count for IconButton too. The count says how many products run into the same design problem. It is not a measure of how often a component repeats on one screen.

Three pairs share material. The two hydroflask shots show one product. The two creditkarma shots show one product at phone and desktop size. ID re-posts the TD dashboard frames. Its analysis singles out the incidents tab, the alert rail, the numbered badges and the offline status as the incident-related parts, but TD shows all of them too, so ID adds no desktop component that TD lacks. A component seen only on that dashboard therefore scores 2/11 from one screen design, and the notes flag these rows.

**Platforms.** phone = the iPhone frames. tablet = the single iPad frame in AR. desktop = monitor frames. The shots do not say whether a desktop product is web or native, so desktop stands for ADR-0010 Tier 2 (macOS, web-desktop) and phone for Tier 1 touch.

**Merging synonyms.** Each analysis names things its own way (plate chip, identifier chip and number chip; round glass button, circle control and puffy button; dock, tool strip and toolbar pill). Every row gets one canonical name, taken in this order of precedence: `docs/roadmap.md` Phase 4, then `docs/research/dataviz-design.md` §5, then `spec/components/*.yaml`, then ADR-0012. Aliases appear in the Notes column where they matter. Rows fold together things that differ only in material, size or content: a hairline ring, a puffy disc, a glass puck and a solid inverse circle are all IconButton. The close calls were decided like this:

- **StatCard or StatTile.** StatCard has card chrome around one metric: a title or ID row, an icon ring, or the open/expand action. StatTile is the bare metric unit (label, value, unit, and optionally a delta, sparkline or status), sized for a tile grid.
- **Chip, Select or SegmentedControl.** A pill whose trailing chevron opens a choice is a Select trigger. A trackless group of mutually exclusive chips is a SegmentedControl. Every other pill-shaped label, filter or identifier is a Chip.
- **StatusPill.** Covers every mark that pairs a status colour with a word: outlined pill, bare dot, edge bar, connectivity icon.
- **Toolbar or TabBar.** Any floating group of action buttons is a Toolbar (dock, tool strip, zoom cluster, vertical tool stack, action bar). Groups that navigate are TabBar or PillTabs.
- **Sheet.** Bottom sheet, docked band and side drawer are one component; creditkarma shows that its band and its sheet carry the same content.
- **LineChart or TimelineScrubber.** LineChart includes step interpolation, and a marker the user drags inside a plot is the chart's selected state. TimelineScrubber is a separate ruler control.
- **Pagination** includes the date-range pager. **ProgressBar** includes two-segment split bars.
- **Candidates.** Components with no Prism name are listed in the layer they would belong to and marked `candidate`. The order check leaves them out.

**Ordering.** Rows sort by shot count, most-used first. Ties follow ADR-0012 list order (the roadmap's layer 1 and 2 lists copy it). In data-viz, ties follow the roadmap's wave-1 order, then ADR-0012, then `dataviz-design.md` §5. A candidate comes after the named components with the same count.

**Not counted.** Motion and haptics: the shots are stills, and the attached videos either could not be viewed or showed other products. Colour and type values: they live in the refs files and in `tokens/`.

**Reconciliation.** Where the per-family extracts disagreed, the refs files decided:

- Off-family posters no longer count. As a result, light pill tabs, list rows with avatars, solid-filled status pills, donut gauges, paired bar charts, KPI bar sparklines, a theme toggle and a glass sidebar over a floor plan are absent or lower than in the extracts.
- KM does not count for LineChart: the sheet hides its chart below the visible area.
- TM does not count for Badge: the analysis does not confirm badges in the phone sheet.
- The in-chart markers in SO and HA count as LineChart selection, not as TimelineScrubber.
- The AR iPad frame is a close-up of the desktop layout. It adds "tablet" to the parts it shows and is not evidence for AdaptiveShell.

## Layer 0 — Foundations

Foundations are token families, not components (ADR-0012). The rows record which token families the references exercise. The "Spec file" column points at the token source.

| Component | Shots (n/11) | Seen on | Variants & states observed | v1? | Spec file (if exists) | Notes |
|---|---|---|---|---|---|---|
| Color roles | 11/11 (all) | phone, tablet, desktop | Neutrals as white-on-dark or ink-on-light alpha steps; one accent that means "look here" (on vivid grounds white takes that role); status hues confined to dots, badges, borders and tints; one hue-tinted dark canvas, neutral near-black or grey grounds elsewhere | yes | `tokens/ref/color.palette.tokens.json`, `tokens/sys/color/*.tokens.json` | Positive deltas stay neutral in the dark-ops and fintech families; status colour never fills a large block in product frames |
| Type roles | 11/11 (all) | phone, tablet, desktop | Quiet label face at one or two weights; large light metric numerals with a dimmed trailing group or unit; tabular figures in tables, axes and live values; sentence or title case | yes | `tokens/ref/typography.tokens.json` | The analyses name families from rounded geometric to neo-grotesque; ADR-0008 slots and the Cyrillic rule decide the faces |
| Spacing and sizing | 11/11 (all) | phone, tablet, desktop | 4-pt base; one 44 control height (48–52 for touch pills and circles, 36–40 for pointer chips); tight gaps inside a group, generous padding inside cards | yes | `tokens/ref/dimension.tokens.json`, `tokens/sys/base.tokens.json` | |
| Shape and radius | 11/11 (all) | phone, tablet, desktop | Two shapes: a pill or circle for every control, a rounded rectangle for containers; concentric nesting (inner = outer − padding); sheets follow the device corner; one large squircle hero card in one family | yes | `tokens/ref/dimension.tokens.json` (`ref.radius.*`), `tokens/sys/base.tokens.json` (`sys.radius.*`) | |
| Elevation | 11/11 (all) | phone, tablet, desktop | Depth from luminance steps and overlap; no border and no shadow on solid cards; shadows only under things floating over imagery, one long shadow under a glass drawer, and soft shadows that shape light-mode controls in one family | yes | `tokens/ref/elevation.tokens.json` | Shadow policy differs by family (soma shapes controls with shadows, hydroflask uses none); Surface.yaml keeps flat solids shadowless |
| Material: glass | 11/11 (all) | phone, tablet, desktop | Dark glass over maps and photos; light glass for the selected item; clear glass tinted only by its backdrop; chip-size glass; a refractive lens used once per screen | yes | `tokens/ref/dimension.tokens.json` (`ref.blur.*`), `tokens/ref/opacity.tokens.json` (`ref.opacity.glass`), `tokens/comp/surface.tokens.json` | Always over imagery, a map, a render or a vivid ground (ADR-0009). In KM, glass appears only in the product's own promo frame; in SO, only there and in the one lens chip |
| Status tint material | 7/11 (SO CP AR TD ID TM IM) | phone, tablet, desktop | Translucent danger wash behind alert groups (no border); incident pill with a tinted fill and a half-alpha border; tinted sub-region on line art; status-tinted glass cells; radial danger glow behind an unread bell; same-hue glow on thin marks and a same-hue halo around a status dot; about 12 % status tints behind qualitative score bands on a light ground | yes | `tokens/sys/color/*.tokens.json` (`bg.tint.*`) | Glow has no token beyond `accent.glow`. The light-ground band tints (CP) show the family has to work on light as well as dark |
| Page ground treatment | 7/11 (HB KM KD CP AR TD ID) | phone, desktop | Radial vignette toward a hero render; one warm light-source bloom anchored to the hero; cool-to-warm mesh canvas with blurred blooms; full-bleed gradient that encodes progress; imagery fading into the canvas under the main rail | partly | `tokens/ref/gradient.tokens.json` (bloom) | Surface's `bloom` part covers a vivid surface bleeding onto the page; no token exists yet for a page-level vignette, light-source bloom or mesh canvas |
| Brand mark slot | 7/11 (KM KD CP AR TD ID IM) | phone, desktop | Small mark or wordmark at the leading edge of the top bar or sidebar; in one family the mark sits inside a solid circle | yes (slot) | `brands/` | The artwork is brand content, never taken from the references; Prism owns the slot size |
| Density and modality | 6/11 (KM KD TD TM ID IM) | phone, desktop | Same product at two sizes: controls grow from pointer to touch (chips about 36 → 50, circles 40 → 52, pills 44 → 48); card padding and page margins shrink on phone | yes | `tokens/sys/density/*`, `tokens/sys/modality/*` | Only products posted at both sizes can show this |
| Film grain | 5/11 (HA HB KM KD CP) | phone, desktop | Fine monochrome noise on vivid surfaces, glass and the light-source bloom; never on white cards or under small text | yes | `tokens/ref/gradient.tokens.json` (per gradient); Surface `grain` part | |
| Material: vivid | 4/11 (HA HB KD CP) | phone, desktop | Three-stop capsule tiles that turn muddy at the bottom; full-bleed progress gradient; earthy mesh account cards; blurred-photo card fills | yes | `tokens/ref/gradient.tokens.json` (`ref.gradient.vivid.*`); Surface `vivid` | Rare by design: at most one card in six or one 2×2 group (Surface.yaml usage) |
| Display face: dot-matrix numerals | 2/11 (HA HB) | phone | Round-dot LED-style numerals from tile to hero size, with dimmed decimals and rolling motion | no | — | A brand could map its `display` slot to such a face (ADR-0008); the analysis flags poor legibility at tile size, so a plain fallback would be mandatory |
| Dot-grid stage texture | 1/11 (SO) | phone | Faint dot grid behind an illustration stage only | no | — | No token yet |
| AI material | 1/11 (AR) | desktop | Blurred aurora inside the assistant input and a thin multi-stop strip along its bottom edge; idle state only | no | — | The only gradient in its product; belongs with ChatComposer (candidate) |

## Layer 1 — Primitives

| Component | Shots (n/11) | Seen on | Variants & states observed | v1? | Spec file (if exists) | Notes |
|---|---|---|---|---|---|---|
| Text | 11/11 (all) | phone, tablet, desktop | Metric role with a dimmed trailing group and a hung unit; large page titles; two-tone title (second line lighter); one uppercase eyebrow per card (one family only); captions and meta in one secondary tone; fade truncation for generated prose; ellipsis for identifiers | yes (slice) | `spec/components/Text.yaml` | Metric roles give HeroNumber its type; `truncation: fade` and `ellipsis` both have sightings |
| Icon | 11/11 (all) | phone, tablet, desktop | 1.25–1.5 stroke line set with rounded caps; filled glyphs reserved for status (check, alert triangle, badge) and, in one phone tab bar, for navigation; illustrative icons with a small secondary symbol; isometric status cubes; a battery glyph with a fill level | yes | `spec/icons/registry.json` (registry; no component spec yet) | ADR-0013; stroke weight is `sys.icon.weight` |
| Surface | 11/11 (all) | phone, tablet, desktop | page, solid, raised and nested luminance steps, inverse, vivid, dark glass, light glass for the selected item, tinted focus sheet, danger-tinted nested surface | yes (slice) | `spec/components/Surface.yaml` | The tinted focus sheet is Card `tinted` |
| IconButton | 11/11 (all) | phone, tablet, desktop | Hairline ring; puffy soft-white disc with a pressed state; transmissive glass over a map or gradient; filled grey; solid inverse as the one solid control in a group (it turns white on vivid or glass); open-arc ring on vivid cards; stadium expand button; bare glyph (collapse, chevron); with a badge or an unread glow; 40–52 across modalities, one 84 add button | yes | — | Cards in 9/11 shots (all but SO and HB) pin the open affordance top-right; bare glyphs need 44-pt hit areas |
| Chip | 8/11 (SO HB KM KD AR TD ID TM) | phone, tablet, desktop | Count tile (number and category word); identifier with a letter disc; identifier with a copy glyph; spec chip with a leading dot and two-level text; refractive lens chip (once per screen); chip anchored to a marker on an illustration; label tag over an image; period filter chips (selected = full-strength stroke and label); metric chips on a glass-look fill; filter chip with a leading icon over a map | yes | — | Chips whose chevron opens a choice are under Select; trackless two-chip switches are under SegmentedControl |
| Badge | 7/11 (KM KD CP AR TD ID IM) | phone, tablet, desktop | Numbered danger disc offset outside an icon button's corner; numbered badge leading an alert row; rounded-triangle alert mark overlapping an icon ring; count badges on tabs (ink for the active tab, outlined for the rest); accent count disc trailing a list row; small unread dot | yes | — | The alert triangle is deliberately unlike any control's silhouette. The TM sheet probably repeats the badge rows, but its analysis does not confirm it |
| Select | 5/11 (CP TD ID TM IM) | phone, desktop | Trigger only: glass pill over a map with a leading icon and a trailing chevron (open and closed directions); outlined pill on the page with a 1-px ink border | yes | — | No shot shows an open list, so Menu has no sighting |
| SegmentedControl | 5/11 (HA KM KD CP AR) | phone, desktop | Trackless chip pair (active = ink stroke and label); three glass chips with a solid active chip and a truncated label; folder-tab bump on dark glass that morphs under the active label; icon stadiums with an inverse-solid active; image chips with captions as a view switcher | yes | — | The analyses call these chips, segmented chips, mode switcher and view toggle |
| TextField | 4/11 (CP AR TD ID) | tablet, desktop | Only as the input of SearchField; placeholder state only | yes | — | No shot has a standalone labelled field |
| Avatar | 4/11 (KD CP TD ID) | desktop | Round photo 36–44; with a 2-px ink ring in a nav rail; with a name and role lock-up | yes | — | Avatars in off-family posters are not counted |
| Button | 3/11 (SO CP AR) | phone, desktop | One dark primary pill per screen (icon-only, in a dock); solid inverse on glass; secondary glass pill with a hairline; pill with a leading icon; inverse send stadium (icon-only) | yes (slice) | `spec/components/Button.yaml` | The dashboards act through IconButtons; labelled buttons are rare |
| Divider | 3/11 (CP TD ID) | desktop | Table row hairlines and column separators; hairline rail under tabs | yes | — | The other eight shots separate content with spacing and luminance only |
| ProgressBar | 2/11 (CP AR) | desktop | Two-segment split bar (primary and accent) with glow and no labels; split progress pill (paid and remaining tints) with ring-dots and a boundary marker | yes | — | Both sightings are segmented; the split bar also reads as a part-to-whole bar |
| TextArea | 1/11 (AR) | desktop | Multi-line input with a caret inside the assistant composer; idle only | yes | — | Seen only as a part of ChatComposer |

## Layer 2 — Composites

| Component | Shots (n/11) | Seen on | Variants & states observed | v1? | Spec file (if exists) | Notes |
|---|---|---|---|---|---|---|
| Card | 10/11 (SO HA KM KD CP AR TD ID IM TM) | phone, desktop | Solid (no border, no shadow); vivid (mesh gradient with grain, blurred-photo fill); glass over imagery (a readout anchored to a map marker, a media card with an inset image); light glass for the selected item; tinted focus sheet with a collapse control; danger-tinted nested sub-card; clear-glass add tile in a tile grid; corner-pinned anatomy with the open affordance top-right | yes (slice) | `spec/components/Card.yaml` | Counted wherever any card appears, including the cards StatCard builds on |
| TopBar | 10/11 (SO HA KM KD CP AR TD ID IM TM) | phone, tablet, desktop | Desktop: brand mark, pill navigation, search, round utility buttons and avatar over a soft vignette; a utility cluster alone (search, settings, bell). Phone: round button, centred title, round button, with no background or divider; logo, selector chip and bell; a pair of circles trailing a large title | yes | — | Large page titles are counted separately as PageHeader |
| StatCard | 8/11 (SO KM KD CP AR TD ID TM) | phone, desktop | Icon ring top-left, one solid action top-right, hero bottom-left, meta or mini chart bottom-right; with an alert badge; with a dimmed denominator; with a full chart footer; with a table footer; glass readout over a map; vivid account card with a micro timeline; default and attention (solid accent) tiles in a 2×2 slab | yes | — | 5 of the 8 sightings put a chart inside. A composite may not import from data-viz (ADR-0012 rule 1), so the spec needs a chart slot and should set the hero with Text metric roles |
| PageHeader | 7/11 (HB KM KD CP AR TD ID) | phone, desktop | Large display title on one or two lines; two-tone variant; optional subtitle or timestamp; on the ops desktop, set straight onto the map instead of in a bar | candidate | — | No ADR-0012 name. Could be a TopBar `largeTitle` variant or a Text lock-up; decide in P2-5 |
| ListRow | 6/11 (SO HB CP TD ID TM) | phone, desktop | Spec row with icon, dotted leader and trailing value; alert row with a leading numbered badge, title and relative time; sub-item with a 2-px left rule; recommendation row with a sparkle icon; translucent capsule row with an icon ring, trailing count and open action; glass capsule row with media, a value column and a separate add button | yes | — | Also in the watch tier (ADR-0010) |
| Toolbar | 6/11 (SO CP AR TD ID IM) | phone, tablet, desktop | Floating dock (round button, primary pill, round button) on a translucent tray; round-button track inside a sheet with an inverse-solid active and an alert-tinted button with a dot; vertical glass tool stack over a 3D viewport; map zoom cluster; seven-button tool strip; drawer action bar (primary plus glass secondaries) | yes | — | The track in the IM sheet has one inverse-solid active button, so it may double as an icon SegmentedControl |
| SectionHeader | 6/11 (KM KD CP TD ID TM) | phone, desktop | Title with an inline count or stat in the secondary tone and a trailing control (open ring, period chips, close ring); year headings with a right-aligned caption | candidate | — | No ADR-0012 name; nearest are a ListRow group header and the Card header part |
| StatusPill | 5/11 (SO AR TD ID IM) | phone, desktop | Outlined pill (neutral, success); incident pill with a tinted fill, a half-alpha border and status text; bare dot with a halo plus a state word; 2×14 edge bar before an identifier; connectivity icon plus label (neutral, degraded, ok) | yes | — | Merged: every status mark that pairs a status colour with a word. Solid-filled status pills appear only in off-family posters |
| Sheet | 5/11 (KM KD CP TM IM) | phone, desktop | Partial bottom sheet with device-matched corners (opaque, or glass with the map showing through); draggable dark sheet with a concave notch and handle; the same content docked as a dark band on desktop; side drawer in dark glass over the page with no scrim | yes | — | Soma's tinted sheet card behaves like a persistent partial sheet but is counted under Card |
| SearchField | 4/11 (CP AR TD ID) | tablet, desktop | Glass pill over a map with a trailing magnifier and a keyboard-shortcut hint; translucent pill on the page; a field that is almost invisible until focused; placeholder only | yes | — | Desktop and tablet only |
| PillTabs | 4/11 (KD CP TD ID) | desktop | Top navigation: solid active pill (ink on light, one luminance step lighter on dark), inactive tabs text-only or hairline, optional leading icons; underline section tabs with count badges over a hairline rail | yes | — | The underline tabs (CP) are the only non-pill tabs in the set; counted here as a variant. On phone, navigation moves to TabBar |
| Alert | 3/11 (TD ID TM) | phone, desktop | Danger-tinted nested container (about a 10 % wash, no border) holding numbered-badge rows; sits in a glass rail on desktop and in the bottom sheet on phone | yes | — | An inline alert, not a dialog |
| Accordion | 3/11 (TD ID TM) | phone, desktop | Collapsible alert groups with chevrons; group header with an icon and an inline count | candidate | — | No ADR-0012 name; nearest is a ListRow with disclosure |
| TabBar | 2/11 (HB KM) | phone | Floating glass capsule with an inverse-solid active disc; floating dark pill of round buttons with an inverse-solid active; content scrolls under it | yes | — | The same "one solid, the rest hairline" rule as PillTabs, with polarity inverted |
| Pagination | 2/11 (HA AR) | phone, desktop | Range pager (chevron, period label, chevron) under a chart; double-chevron pager stadium with a page number next to a ruler | yes | — | Apart from the month grid, the range pager is the only date control in the set |
| Sidebar | 2/11 (CP AR) | desktop | Content slab (brand row, tiles, cards, assistant composer); icon rail of outline circles with an expander, a support button and an avatar | yes (desktop) | — | The ops console's rails are grid columns and count under DashboardGrid |
| Table | 2/11 (TD ID) | desktop | Matrix with identifier-chip row headers, tick-ruler cells, late values in accent with a clock glyph, hairline rows and column separators | yes (desktop) | — | Both sightings are the same dashboard (ID re-posts TD) |
| Carousel | 2/11 (KM KD) | phone, desktop | Edge-to-edge card row with a peek on phone; a row running past the fold on desktop | candidate | — | No ADR-0012 name; AdaptiveShell turns side-by-side cards into this at compact width |
| CopyableIdentifier | 2/11 (AR IM) | phone, tablet, desktop | Ellipsis-truncated identifier with a copy glyph, inside a chip or as a sheet subtitle | candidate | — | Buildable from Chip (identifier) and Text `ellipsis`; the full value belongs in the accessibility label, and copy feedback needs Toast |
| Stepper | 1/11 (HB) | phone | Large numeral between two hairline glass round buttons (minus, plus), with a unit label below | yes | — | ADR-0012 does not say whether Stepper is a numeric stepper or a step indicator; the only sighting is numeric |
| Banner | 1/11 (AR) | desktop | Collapsed alert strip: danger-tinted stadium with a glowing alert glyph and text, and a separate chevron stadium to expand | yes | — | The expanded state is not shown |
| MonthGrid | 1/11 (CP) | desktop | Six-column month tiles under year headings; a status circle marks done or missed, upcoming tiles stay empty, and a selected or negative tile darkens with a brighter stroke | candidate | — | ADR-0012 keeps a month grid in scope (only pickers beyond it are out); nearest named component is Timeline |
| ChatComposer | 1/11 (AR) | desktop | Assistant input on the AI material: multi-line text, add and microphone circles, inverse send stadium; idle only | candidate | — | Built from TextArea, IconButton and Button |

## Layer 3 — Data-viz

| Component | Shots (n/11) | Seen on | Variants & states observed | v1? | Spec file (if exists) | Notes |
|---|---|---|---|---|---|---|
| HeroNumber | 10/11 (SO HA HB KM KD CP AR TD ID TM) | phone, desktop | Light or thin numeral with the insignificant tail (decimal, thousands remainder, unit word) dimmed at the same size; separate small unit on the baseline; heavy integer with a light minor group and a dimmed currency sign (one family); regular weight with a dimmed denominator (one family); dot-matrix face; sizes from tile to an 80-px hero; explicit sign on signed values | yes (roadmap wave 1) | — | Missing from ADR-0012's layer 3 list; the roadmap takes it from `dataviz-design.md` §5 |
| DeltaBadge | 8/11 (SO HA KM KD CP AR TD ID) | phone, desktop | Signed number with a grey unit and no chip; thin arrow glyph; accent triangle with text on glass; glass capsule with an arrow (up, down, zero); icon-only direction disc (up = inverse, down = accent); value-above and delta-below labels on chart levels; negative in accent, positive stays neutral (never green) | yes (roadmap wave 1) | — | ADR-0012 and ADR-0007 call it DeltaIndicator, and ADR-0007 puts it in v1.1 |
| ChartContainer | 7/11 (SO HA KD CP AR TD ID) | phone, desktop | Titled chart card with a caption or hero above the plot; no shot shows loading, empty or error states or the table twin | yes (roadmap wave 1) | — | Counted wherever a titled chart appears; the table twin is an accessibility requirement, not a reference sighting |
| ChartAxis | 7/11 (SO HA KD CP AR TD ID) | phone, desktop | Right-side y labels outside the plot; left y labels; time labels every few hours; no axis lines; interactive category axis of hairline circles with a solid active disc; right-to-left time strip | yes (part) | — | A §5 Tier 0 part; the roadmap does not name it, but every wave-1 chart needs it |
| LineChart | 6/11 (SO HA KD CP TD ID) | phone, desktop | Hairline primary series with a fainter comparison or raw series; smooth monotone; step levels with dashed drops and accent peak ticks; solid focus range with dotted tails; several series with greyed comparisons and dots on the primary; highlighted windows with bookend dots and an off-target window in accent; selection as a now-dot in a translucent disc or a glass lens with a dotted drop line; no fills; legends are rare | yes (roadmap wave 1) | — | Step charts are `interpolation: step`. In-chart markers are the selected state, not TimelineScrubber |
| Sparkline | 3/11 (HA KD CP) | phone, desktop | Dotted arc ending in a bead; dotted arc with a drop line; flat-dash zero state; hairline peak line with dots; accent curve with a ring endpoint over ghost curves; mini bars with the recent bars in ink | yes (roadmap wave 1) | — | The other micro glyphs are under MicroGlyphs |
| StatTile | 3/11 (HA TD ID) | phone, desktop | Vivid capsule tile (label top-centre, numeral bottom-left, delta pill bottom-right, micro sparkline behind); status tile (status icon, label, large thin number) in a 1×2 row | yes (roadmap wave 1) | — | Tiles with card chrome (a title row or an action) count as StatCard. Also in the watch tier |
| ReferenceLine | 3/11 (HA TD ID) | phone, desktop | Dashed target with an inline label and a threshold label; dotted baseline and goal lines; faint dashed ceiling | yes (roadmap wave 1) | — | The dashed rows in the soma chart may mark thresholds, but they are read as grid |
| TimelineScrubber | 3/11 (AR TD ID) | desktop | Tick-ruler playback bar with brighter elapsed ticks, end dots and a round thumb carrying a glyph; position ruler over a 3D viewport with a thumb and a pager | v1.1 | — | ADR-0007 wave 2. The position ruler scrubs through space, not time |
| RangeBand | 2/11 (TD ID) | desktop | Full-height translucent bands behind highlighted time windows; accent-tinted band under a flagged bucket | yes (roadmap wave 1) | — | Same dashboard twice (ID re-posts TD) |
| ArcGauge | 2/11 (KM KD) | phone, desktop | Quarter arc: wide faint track, thin progress arc, hair needle with an arrow tip and a pivot dot, no ticks; the numeral beside it carries the value; bleeds off the screen edge on phone | v1.1 | — | ADR-0012 name; §5 folds arcs into the RingGauge styles |
| ChartLegend | 2/11 (CP AR) | desktop | Dot-and-label row with greyed comparisons; icon-and-label items for status categories | v1.1 | — | ADR-0012: Legend. Most charts in the set label their series inline instead |
| ChartTooltip | 2/11 (KD CP) | desktop | Dark pinned card with value, delta, caption and a close button; accent circle with the value, a dashed drop line and a triangle marker at the baseline | v1.1 | — | The accent bubble is hover-only in the reference; Prism needs focus and touch equivalents |
| TableCells | 2/11 (TD ID) | desktop | Signed offset cell after a tick ruler; late state in accent with a clock glyph | no | — | §5 Tier 1 (DeltaCell); not in ADR-0012. Same dashboard twice (ID re-posts TD) |
| MicroGlyphs | 2/11 (KD CP) | desktop | Dot scale, ring row, arch line with trough dashes, dot-matrix calendar, tick-ruler timeline with one accent tick, dot-matrix timeline, dot-grid indicator; one glyph type per metric | candidate | — | Could become extra Sparkline kinds; decorative data needs its value in text |
| RingGauge | 1/11 (AR) | desktop | Split ring: two arcs opened at top and bottom around an object, one side in the attention colour with a glow, chips at the arc ends | yes (roadmap wave 1) | — | Donut gauges appear only in off-family posters. Also in the watch tier |
| BulletBar | 1/11 (CP) | desktop | Three tinted qualitative bands with baselines, faded history dots, a ring-dot pointer and a hair needle topped by a triangle in a halo; current value in ink | no | — | §5 Tier 1; not in ADR-0012 |
| Heatmap | 1/11 (AR) | tablet, desktop | Categorical grid of glass cells over a render; status carried by the border and a small label; empty slot with an add glyph | no | — | §5 Tier 2 |
| DotPlot | 1/11 (AR) | desktop | Two dot series on a tick-ruler time strip, one above and one below the baseline, newest at the right | candidate | — | No §5 name; nearest is Tier 2 Scatter |

No product frame shows these layer 3 components: AreaChart (v1 wave 1), BarChart (v1.1; bars appear only as a Sparkline kind and in off-family posters), SmallMultiples, Donut (off-family posters only) and Scatter. The first three are listed under "Required by v1 but not observed" below.

## Layer 4 — Patterns

| Component | Shots (n/11) | Seen on | Variants & states observed | v1? | Spec file (if exists) | Notes |
|---|---|---|---|---|---|---|
| DashboardGrid | 7/11 (HA KM KD CP AR TD ID) | phone, desktop | Hero metric above a card grid; 2×2 tile slab with one lit tile; three-region console (dense rail, open map centre, narrow alert rail, chart band along the bottom); light dashboard over a dark instrument band on the same columns; hero column beside a narrow card column | yes | — (`spec/patterns/README.md` sketches it) | Vivid cards come in pairs or one 2×2 group; one accent per screen |
| AdaptiveShell | 6/11 (KM KD TD TM ID IM) | phone, desktop | Top pill navigation ↔ bottom floating tab bar; docked band ↔ draggable sheet; side-by-side cards ↔ carousel; desktop alert rail ↔ phone bottom sheet; secondary grid ↔ a tab | yes | — (`spec/patterns/README.md`) | Only creditkarma documents the rules; the AR iPad frame repeats the desktop layout and is not counted |
| MapHUD | 5/11 (AR TD ID TM IM) | phone, tablet, desktop | Selector pills and round buttons floating over a full-bleed map; one glass readout card anchored to a marker; zoom and tool clusters; a bottom sheet rising from the lower third; glass cells and a tool stack over a 3D render | v1.1 | — | An ADR-0012 pattern, but not one of v1's three; the map itself is out of scope. AR has no map; it counts because its glass cells and tool stack float over a full-bleed 3D render the same way |
| DetailScreen | 3/11 (SO CP IM) | phone, desktop | Illustration stage above a tinted sheet card and a dock; dark glass drawer over a dashboard; entity sheet over a map with a floating media card | yes | — (`spec/patterns/README.md`) | |
| Quick-log screen | 1/11 (HB) | phone | Hero stepper, a few glass preset rows and a floating tab bar over a full-bleed progress gradient | candidate | — | Not in ADR-0012's pattern list |

No shot shows these ADR-0012 patterns: settings list, onboarding, empty / error / loading states.

## Required by v1 but not observed

v1 means layers 0–2 complete, data-viz wave 1 and three patterns (ADR-0012), plus the desktop and watch tiers of ADR-0010. Each of these has no product-frame sighting.

| Component | Layer | Required by | Why it is required | Nearest sighting |
|---|---|---|---|---|
| Toggle | 1 | ADR-0012 | Binary settings; the settings list pattern and FormField depend on it | None; the inverse-solid active rule is the visual cue to reuse |
| Checkbox | 1 | ADR-0012 | Multi-select lists and forms | None |
| Radio | 1 | ADR-0012 | Single choice in forms where a SegmentedControl would be too wide or too long | SegmentedControl (5/11) covers short single choices |
| Slider | 1 | ADR-0012 | Continuous values; an adjustable control that is accessible on both stacks | TimelineScrubber thumbs (AR TD ID); the two can share thumb and track tokens |
| ProgressRing | 1 | ADR-0012; ADR-0010 Tier 3 | Determinate and indeterminate progress; on the watch list | Open-arc icon ring on vivid cards (KD CP), which is decorative |
| Spinner | 1 | ADR-0012 | Button.yaml already declares a `spinner` part for `isLoading` | None |
| Skeleton | 1 | ADR-0012 | Loading placeholders for Card, StatTile and ChartContainer; the loading-state pattern | None |
| Tooltip | 1 | ADR-0012; ADR-0010 Tier 2 | Hover and focus names for icon-only buttons, which every shot relies on; pointer modality only | ChartTooltip (KD CP) |
| FormField | 2 | ADR-0012 | Label, help and error around TextField, Select, Checkbox and Radio | None; TextField appears only inside SearchField |
| Timeline | 2 | ADR-0012 | Dated event history | Dated year sections with a month grid in a drawer (CP) |
| Toast | 2 | ADR-0012 | Transient confirmation, for example after copying an identifier (AR and IM show a copy glyph with no visible feedback) | None |
| Dialog | 2 | ADR-0012 | Confirmation of destructive or irreversible actions | None |
| Popover | 2 | ADR-0012 | Anchored content under a pointer and on tablet | Pinned chart readout with a close button (KD) |
| Menu | 2 | ADR-0012 | The open state of Select (the 5 sightings show closed triggers only) and overflow actions | None |
| EmptyState | 2 | ADR-0012 (the component, and the layer-4 empty / error / loading states) | Empty lists, charts and grids | Empty slot with an add glyph (AR); clear-glass add tile (HA) |
| CommandPalette | 2 (desktop) | ADR-0012 (desktop-only list); ADR-0010 Tier 2; AdaptiveShell desktop anatomy in `spec/patterns/README.md` | Keyboard-first navigation on desktop | Search field with a keyboard-shortcut hint (TD ID) |
| ContextMenu | 2 (desktop) | ADR-0012 (desktop-only list); ADR-0010 Tier 2 | Secondary actions on rows and cards under a pointer | None |
| AreaChart | 3 | ADR-0007 decision 5; ADR-0012 wave 1; roadmap Phase 4 | Cumulative and range data where the filled area carries meaning | None: every line in the references is unfilled, and most analyses state outright that the charts have no area fills, so the spec has to say when a fill is justified |

All three v1 patterns have sightings. No Tier 3 component was observed at watch size; see the watchOS section.

Two `dataviz-design.md` §5 Tier 1 components are outside v1 and also have no sighting. They are listed so the §5 inventory is complete here:

| Component | Layer | Scope | Named by | Nearest sighting |
|---|---|---|---|---|
| BarChart | 3 | v1.1 (ADR-0007 decision 5) | ADR-0012; §5 Tier 1 | Mini bars with the recent bars in ink, a Sparkline kind (KD); bar charts appear otherwise only in off-family posters |
| SmallMultiples | 3 | Not scheduled: in §5 Tier 1 but in neither the roadmap's wave 1 nor ADR-0012 | §5 Tier 1 | None. The six factor cards (KD) are the closest repeated-panel layout, but each card uses its own glyph type instead of one shared scale |

The §5 Tier 2 components (Donut, Heatmap, Scatter, ScaleLegend, ChartFilters) are later work; only Heatmap has a sighting (AR).

## Observed but out of scope

| Observed | Shots (n/11) | Seen on | Why out of scope | What Prism supplies instead |
|---|---|---|---|---|
| Brand artwork and studio promo slates: logos, wordmarks, promo type | logos 7/11; promo frames in most shots | phone, desktop | Brand content and studio marketing | The brand mark slot (Foundations); artwork lives in `brands/` and is never taken from the references (ADR-0015) |
| Product illustration and line art: technical drawings, wireframe vehicles with a tinted damaged or serviced region, 3D vessel renders, a blueprint with status-outlined slots | 6/11 (SO HB AR TD ID IM) | phone, desktop | App artwork, not a component | Line and state tokens (hairline alpha for drawing lines, status tints for a sub-region, never the whole drawing); an illustration slot in Card and DetailScreen |
| System chrome: iOS status bar, browser toolbar | status bar 6/11 (SO HA HB KM IM TM); browser 1/11 (AR) | phone, desktop | Owned by the OS or the browser | Nothing. Apple system chrome uses native Liquid Glass (ADR-0009), and TopBar leaves room for it |
| Map rendering: basemap, routes, geofence rings, category pins, live puck, incident marker with halo, recoloured road | 4/11 (TD ID TM IM) | phone, desktop | ADR-0012 leaves maps to apps; ADR-0007 limits Prism to map style tokens | Map style tokens: route (solid, planned dashed, highlighted, incident, dark casing), geofence ring, pin disc and glyph sizes with category colours, live puck, incident marker and halo, basemap desaturation guidance. `tokens/` has none yet. Also Surface `backdrop: map`, which makes glass over a map legal, and the MapHUD pattern (v1.1) for the floating controls |
| Mini route map inside cards and sheets | 3/11 (TD ID IM) | phone, desktop | A map at thumbnail size | The same map tokens at thumbnail scale; the Card media slot with the concentric inner radius, and the same inset inside a Sheet (IM) |
| Video and live camera feed, including a synthetic wireframe reconstruction | 1/11 (IM) | phone | ADR-0012 excludes the video player | Card (glass) with an inset media slot. "Draw missing footage in the UI's own line language" stays a principle for app illustration |
| 3D render viewport | 1/11 (AR) | tablet, desktop | Rendered content belongs to the app | Surface `backdrop: image` for the glass cells and tool stack placed over it; the principle "grade imagery toward the canvas hue before putting glass on it" |
| Complex date pickers | 0/11 | — | ADR-0012 excludes pickers beyond a month grid | Nothing extra: the only date controls in the set are a range pager (Pagination, HA) and a month status grid (MonthGrid candidate, CP), both in scope |
| Rich-text editor | 0/11 | — | ADR-0012 | The closest sighting is generated prose shown as plain Text with `truncation: fade` (AR) |

## watchOS Tier 3 subset

None of the 11 shots shows a watch, so every row here is extrapolated from phone and desktop sightings. ADR-0010 fixes the list. ADR-0009 removes blur and glass on the watch. `spec/patterns/README.md` limits a watch screen to a vertical stack of at most three glanceable tiles.

| Tier 3 entry | Shots (phone/desktop) | What carries over to the wrist | Watch rule |
|---|---|---|---|
| Tokens (Foundations) | 11/11 | Luminance ladder, one accent, status tints, the metric type role | Comfortable density by default (ADR-0010); no blur (`tokens/sys/platform/watch.tokens.json` turns it off) and glass resolves to an opaque surface (ADR-0009) |
| Text | 11/11 | Metric role with the dimmed trailing group and unit; one secondary tone | Display and title roles collapse to title-sm and headline; metric-xl renders at 40 px (Text.yaml); ultra-thin weights only for metrics ≥ 34 pt, swapped to Regular under Bold Text (ADR-0011) |
| Icon | 11/11 | 1.5-stroke line icons, filled only for status | SF Symbols for Apple system chrome (ADR-0013) |
| Surface (solid only) | 11/11 | Depth from luminance steps, which needs no blur | Only page, solid, raised, nested and inverse; vivid and glass resolve to solid (Surface.yaml) |
| Card (glanceable) | 10/11 | Corner-pinned anatomy cut down to a title and a hero | Solid only, compact size, no aside, a full-width row (Card.yaml) |
| ListRow | 6/11 | Alert row with a leading badge; left-rule sub-item | Row height from the comfortable density |
| Button | 3/11 | The one inverse primary pill per screen | Sizes collapse to lg, no trailing icon, ghost renders as secondary (Button.yaml) |
| StatTile | 3/11 | The status tile (icon, label, large number), the most glanceable form in the set | At most three tiles in a stack (`spec/patterns/README.md`) |
| RingGauge | 1/11 | A ring with one side in the attention colour | System circular Gauge styles on the watch (`dataviz-design.md` §5 platform map) |
| ProgressRing | 0/11 | Nothing observed; ring semantics shared with RingGauge | Also required by ADR-0012; the only Tier 3 entry with no sighting |

ADR-0010 excludes glass, vivid, blur, hover, tooltips and every desktop-only composite from the watch. Most-used-first inside the subset: Text, Icon, Surface, Card, ListRow, Button, StatTile, RingGauge, ProgressRing.

## Order check against docs/roadmap.md Phase 4

This section does not edit the roadmap. For each layer it lists the roadmap's order, the order the shot counts give, and what moves. Ties keep the roadmap's relative order, so every move comes from a count. The table leaves out the Phase 3 slice (Text, Surface, Button, Card) and all candidates.

### Primitives

| # | Roadmap order | Shots | By count | Shots |
|---|---|---|---|---|
| 1 | Icon | 11 | Icon | 11 |
| 2 | IconButton | 11 | IconButton | 11 |
| 3 | Toggle | 0 | Chip | 8 |
| 4 | Checkbox | 0 | Badge | 7 |
| 5 | Radio | 0 | Select | 5 |
| 6 | Slider | 0 | SegmentedControl | 5 |
| 7 | TextField | 4 | TextField | 4 |
| 8 | TextArea | 1 | Avatar | 4 |
| 9 | Select | 5 | Divider | 3 |
| 10 | SegmentedControl | 5 | ProgressBar | 2 |
| 11 | Chip | 8 | TextArea | 1 |
| 12 | Badge | 7 | Toggle | 0 |
| 13 | Avatar | 4 | Checkbox | 0 |
| 14 | Divider | 3 | Radio | 0 |
| 15 | ProgressBar | 2 | Slider | 0 |
| 16 | ProgressRing | 0 | ProgressRing | 0 |
| 17 | Spinner | 0 | Spinner | 0 |
| 18 | Skeleton | 0 | Skeleton | 0 |
| 19 | Tooltip | 0 | Tooltip | 0 |

- The roadmap puts Toggle, Checkbox, Radio and Slider at 3–6, although none of them is observed. By count they drop to 12–15, behind every observed primitive.
- Chip (8) and Badge (7) rise from 11–12 to 3–4. Select and SegmentedControl (5 each) rise from 9–10 to 5–6.
- TextArea (1) drops from 8 to 11. Avatar, Divider and ProgressBar each rise by five places.
- Icon, IconButton, TextField and the unobserved tail (ProgressRing, Spinner, Skeleton, Tooltip) keep their places.
- Counts miss two dependencies. Button.yaml already has a `spinner` part (`isLoading`), and ProgressRing is on the watch list.

### Composites

| # | Roadmap order | Shots | By count | Shots |
|---|---|---|---|---|
| 1 | ListRow | 6 | TopBar | 10 |
| 2 | StatCard | 8 | StatCard | 8 |
| 3 | StatusPill | 5 | ListRow | 6 |
| 4 | FormField | 0 | Toolbar | 6 |
| 5 | SearchField | 4 | StatusPill | 5 |
| 6 | PillTabs | 4 | Sheet | 5 |
| 7 | Stepper | 1 | SearchField | 4 |
| 8 | Timeline | 0 | PillTabs | 4 |
| 9 | Toast | 0 | Alert | 3 |
| 10 | Banner | 1 | TabBar | 2 |
| 11 | Alert | 3 | Pagination | 2 |
| 12 | Dialog | 0 | Stepper | 1 |
| 13 | Sheet | 5 | Banner | 1 |
| 14 | Popover | 0 | FormField | 0 |
| 15 | Menu | 0 | Timeline | 0 |
| 16 | TabBar | 2 | Toast | 0 |
| 17 | TopBar | 10 | Dialog | 0 |
| 18 | Toolbar | 6 | Popover | 0 |
| 19 | EmptyState | 0 | Menu | 0 |
| 20 | Pagination | 2 | EmptyState | 0 |
| desktop 1 | Sidebar | 2 | Sidebar | 2 |
| desktop 2 | Table | 2 | Table | 2 |
| desktop 3 | CommandPalette | 0 | CommandPalette | 0 |
| desktop 4 | ContextMenu | 0 | ContextMenu | 0 |

- TopBar ties with Card as the most-used composite (10/11) but is 17th in the roadmap. Toolbar (6) is 18th and Sheet (5) is 13th.
- FormField (0), Stepper (1), Timeline (0) and Toast (0) sit at 4 and 7–9, ahead of Alert, Sheet, TabBar, TopBar, Toolbar and Pagination, which all have more sightings.
- The roadmap's first three (ListRow, StatCard, StatusPill) are well supported (6, 8, 5) and stay in the top five.
- The desktop-only order already matches.
- Two candidates outrank most roadmap composites: PageHeader (7) and SectionHeader (6).

### Data-viz wave 1

| # | Roadmap order | Shots | By count | Shots |
|---|---|---|---|---|
| 1 | HeroNumber | 10 | HeroNumber | 10 |
| 2 | DeltaBadge | 8 | DeltaBadge | 8 |
| 3 | Sparkline | 3 | ChartContainer | 7 |
| 4 | StatTile | 3 | LineChart / AreaChart | 6 / 0 |
| 5 | RingGauge | 1 | Sparkline | 3 |
| 6 | LineChart / AreaChart | 6 / 0 | StatTile | 3 |
| 7 | ReferenceLine | 3 | ReferenceLine | 3 |
| 8 | RangeBand | 2 | RangeBand | 2 |
| 9 | ChartContainer | 7 | RingGauge | 1 |

- The first two agree. Sparkline's early place is the roadmap's own choice (number formatting and Cyrillic compact names), not a count.
- ChartContainer (7) moves from last to third. Every observed chart sits in a titled container, and §5 makes it a shared Tier 0 part that LineChart composes. ChartAxis (7), also a Tier 0 part, is not named in the roadmap at all.
- LineChart (6) moves ahead of Sparkline and StatTile. AreaChart has no sighting.
- RingGauge (1) drops to last. Its wave-1 place comes from the watch tier (ADR-0010), not from the references.
- Beyond wave 1, ArcGauge (2) has more sightings than RingGauge (1) but is v1.1 (ADR-0007).

### Patterns

| # | Roadmap order | Shots | By count | Shots |
|---|---|---|---|---|
| 1 | DashboardGrid | 7 | DashboardGrid | 7 |
| 2 | DetailScreen | 3 | AdaptiveShell | 6 |
| 3 | AdaptiveShell | 6 | DetailScreen | 3 |

- AdaptiveShell and DetailScreen swap places. MapHUD (5) has more sightings than DetailScreen but is not one of v1's three patterns (ADR-0012).

### Findings for P2-5 that are not order changes

- **Name drift.** The roadmap and §5 say DeltaBadge; ADR-0012 and ADR-0007 say DeltaIndicator. HeroNumber is missing from ADR-0012's layer 3 list. ADR-0012 says Legend where §5 says ChartLegend. ADR-0012 lists ArcGauge; §5 folds arcs into RingGauge styles.
- **Scope drift.** ADR-0007 puts DeltaIndicator in v1.1; the roadmap puts DeltaBadge in wave 1.
- **Layer rule.** StatCard holds a chart in 5 of its 8 sightings. ADR-0012 rule 1 forbids a composite from importing data-viz, so StatCard needs a chart slot, the way Card.yaml already makes `aside` a slot for a Sparkline.
- **Evidence weight.** Table, RangeBand and TableCells rest on one dashboard posted twice (TD and ID).
