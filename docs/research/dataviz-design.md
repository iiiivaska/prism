# Prism data-viz design rules — research report

Date verified: 2026-09-08. Scope: dashboard-style products (hero number + unit, sparkline with dashed target, area chart with highlighted range band, ring/arc gauges, small multiples, delta badges, timeline scrubber, bar-with-deviation tables). Platforms: SwiftUI (Swift Charts, OS 26 minimum) and React + TypeScript + Tailwind v4 (visx / d3-shape).

Method: (1) read the bundled `dataviz` skill (Anthropic, Claude Code 2.1.260) and ran its palette validator on candidate palettes; (2) fetched official docs (Apple HIG, Swift Charts, SwiftUI, W3C WCAG 2.2, MDN, Tailwind, npm registry, GitHub) and primary design sources (Tufte, Few, Datawrapper, FT, NN/g, Carbon, Observable/d3, Okabe-Ito, viridis). Pages that could not be fetched (JS-rendered or 403/429) are marked as such with reduced confidence.

Confidence key: **high** = read from the official/primary page on 2026-09-08; **medium** = official page unreachable, fact from search snippet or secondary mirror; **low** = inference or secondary source only.

---

## 0. Executive summary

1. The dashboard vocabulary in the references is fully coverable by a small, rule-driven kit: hero figure, stat tile, delta badge, sparkline, line/area with reference line + band, bar chart, ring gauge (closed / open-270°) plus a bullet bar, small multiples, timeline scrubber, and table cell renderers (bar / delta / sparkline / heat). Everything else (donut, heatmap, scatter, 3D) is Tier 2 or excluded.
2. Color is computable. The bundled `dataviz` skill's six-check validator (OKLab ΔE under Machado-2009 CVD simulation + WCAG contrast) is the right CI gate for Prism's series palette. Running it shows that the famous palettes (Okabe-Ito, Tableau 10, Observable 10) fail as-is on lightness band / chroma / contrast for a design-system use, so Prism needs its own stepped light and dark series sets. A validated candidate is proposed in §4 (orange-first order: worst adjacent CVD ΔE 9.2 light / 9.4 dark, normal-vision ΔE 19.6 / 19.3, all eight inside the band in both modes).
3. Reference-line and band semantics are conventions, not tokens alone: **solid = actual, dashed = target/threshold/projection**, hatched or tinted band = projection/unusual period/normal range (Datawrapper, FT). Gridlines are never dashed, so dashes stay reserved for meaning.
4. Numbers: proportional figures for the hero figure, tabular figures for anything that aligns or ticks (axis, table, live counters); compact notation with ≤3 significant digits, locale-aware (`Intl.NumberFormat` compact / Swift `.notation(.compactName)`), sign shown except for zero (`signDisplay: "exceptZero"` / `.sign(strategy: .always(includingZero: false))`).
5. Accessibility floor: marks ≥3:1 against the surface (WCAG 1.4.11) or a visible-label/table relief; axis text ≥4.5:1 (it is text); large numerals ≥3:1 at ≥18pt/24px (WCAG large text; Prism's stricter ≥24pt rule is compatible); hit targets ≥24×24 CSS px (WCAG 2.5.8) on pointer and 44×44 pt on touch (Apple HIG); Audio Graphs come for free with Swift Charts and must be described (title + summary); VoiceOver gets mark descriptions, not axis labels.
6. Platform APIs verified for OS 26: `RuleMark` + `.lineStyle(StrokeStyle(dash:))` for targets, `AreaMark(x:yStart:yEnd:)` for bands, `chartXSelection(value:)` (iOS 17+) for the scrubber, `chartScrollableAxes` (iOS 17+), `SectorMark` (iOS 17+), `Gauge` + `GaugeStyle.accessoryCircular*` (iOS 16+), `Chart3D` (26 only, excluded from Prism v1). Web: visx 4.0.0 (2026-06-11, React 18/19, MIT), d3-shape 3.2.0 (ISC).

---

## 1. The bundled `dataviz` skill — what applies to Prism

Location read: `/private/tmp/claude-501/bundled-skills/2.1.260/b5d6a8d99f4834eca4db05901d6d62af/dataviz/` (SKILL.md, references/*.md, scripts/validate_palette.js). It is design-system-agnostic by construction: a system supplies parameters (ramps, categorical order, sequential hue, diverging pair, status palette, texture, surfaces, filter controls) and the method stays fixed. Parts that matter for Prism:

**Procedure (order is the point):** form → color job → validate → mark specs → hover layer → accessibility pass → render and look. Color last.

**Form heuristic (`choosing-a-form.md`):** a single current value is a *stat tile*, not a chart; a handful of headline numbers is a *KPI row*; the one number a dashboard leads with is a *hero figure* (≥48px, same sans as everything else, exactly one per view); a single ratio against a limit is a *meter* whose unfilled track is a lighter step of the same ramp; >~7 meaningful classes is a table. Series-count ladder: 1–3 color alone; 4 needs direct labels and all-pairs forms (scatter/bubble/choropleth/small multiples) cap at 3; 5–6 legend or small multiples; 7–8 token ceiling, then fold to "Other".

**Color formula (`color-formula.md`):** four jobs — categorical (8 hues, fixed order, never cycled), ordinal (one hue, monotone steps), sequential (one hue light→dark), diverging (two hues + neutral gray midpoint), status (reserved, icon + label). Six checks: fixed hue anchors; OKLCH L band 0.43–0.77 light / 0.48–0.67 dark; OKLCH C ≥ 0.10; CVD separation ΔE ≥ 8 target (≥6 floor only with secondary encoding) computed in OKLab ×100 under Machado-Oliveira-Fernandes 2009 at severity 1.0; normal-vision floor ΔE ≥ 15 (hard gate); contrast vs surface ≥ 3:1 or relief (labels/table). "Color follows the entity, never its rank" (no recolor on filter). Status never themed.

**Marks (`marks-and-anatomy.md`):** bars ≤24px thick with 4px rounded data-end and square baseline; lines 2px round join/cap; markers ≥8px with a 2px surface ring; area fill ≈10% opacity; grid/axes 1px solid hairline one step off the surface, never dashed; a 2px surface gap between touching fills (no strokes around marks); legend always for ≥2 series, none for one; selective direct labels (endpoint/extreme), never a number on every point; labels never wear the series color; proportional figures on big numbers, `tabular-nums` only in columns; stat-tile contract = label · value (auto-compact 1,284 / 12.9K / $4.2M) · delta (signed, vs a named period, color = direction × whether up is good) · trend (12-point sparkline in the de-emphasis hue, current period in accent).

**Interaction (`interaction.md`):** crosshair snaps to nearest X; one tooltip lists every series; values lead, labels follow; line keys not boxes in tooltips; hit target ≥24px or nearest-point/Voronoi; tooltips never gate; filters in one row above the charts, date range first, presets before custom; refetch holds the previous render at reduced opacity (no skeleton).

**Anti-patterns:** dual axes; recolor-on-filter; hue generation past 8; rainbow sequential; hue at the diverging midpoint; status color as a series; 8 hues when the story is one number; one-bar bar chart or 2-slice pie; dashed gridlines; a number on every point; strokes around marks; clipped in-bar labels; container heights that exclude the x-axis band; serif/display hero figure; `tabular-nums` on a hero; texture on by default; tooltip-only values; pinpoint hover targets; per-chart filters; skeleton flash.

**Reference palette (`palette.md`):** 8 slots stepped separately for light and dark (blue, orange, aqua, yellow, magenta, green, violet, red), blue sequential ramp 100–700, blue↔red diverging with gray midpoint, fixed status (good #0ca30c, warning #fab219, serious #ec835a, critical #d03b3b), chrome roles (surface, primary/secondary/muted ink, gridline, baseline, border). All hex values are documented and the validator numbers are recorded; the skill explicitly invites swapping the values for a brand's own and re-running.

Everything above is consistent with the primary sources below; where the skill gives a number no external source gives (e.g., 24px bar cap, 10% area alpha, 12-point sparkline), I mark it "skill" in the rulebook.

---

## 2. Facts table

| # | Fact | Source | Confidence |
|---|---|---|---|
| F1 | Apple HIG Charts: "Choose a mark type based on the information you want to communicate"; combine points with lines to draw attention to individual values. | https://developer.apple.com/design/human-interface-guidelines/charts | high |
| F2 | HIG Charts: use a fixed axis range when min/max are meaningful (battery 0–100%), dynamic when values vary widely; bar charts work well with a zero lower bound, but a zero baseline can obscure differences (heart rate). | same | high |
| F3 | HIG Charts: prefer familiar tick sequences (0, 5, 10…); too many gridlines overwhelm, too few make estimating hard; if people can inspect values interactively use fewer gridlines and lighter label colors. | same | high |
| F4 | HIG Charts: keep Y-axis labels short in compact width; consider putting the Y axis on the trailing side and labeling vertical gridlines on their trailing side to keep a clean leading edge; align the chart's leading edge with other views. | same | high |
| F5 | HIG Charts: never rely on color alone (Health uses two point shapes for blood pressure); "add visual separation between contiguous areas of color" (separators between stacked marks). | same | high |
| F6 | HIG Charts: don't require interaction to reveal critical information; Stocks lets people drag a vertical indicator through a line graph; when marks are too small, expand the hit target to the entire plot area and let people scrub. | same | high |
| F7 | HIG Charts: Swift Charts gives a default Audio Graphs implementation and one accessibility element per mark or group; supply a title and summary; avoid subjective words; use "June 6" not "6/6"; hide visible axis/tick labels from assistive tech. | same | high |
| F8 | HIG Charts (watchOS): avoid complex chart interactions; prefer glanceable info; move detail to the iPhone app. | same | high |
| F9 | HIG Gauges: a gauge maps a value in a range onto a circular or linear path; "standard" shows an indicator, "capacity" fills to the value; accessory variants resemble watchOS complications; label the current value and both endpoints; consider a gradient fill that communicates purpose (red-hot to blue-cold). | https://developer.apple.com/design/human-interface-guidelines/gauges | high |
| F10 | HIG Complications: closed ring = percentage of a whole (battery); open ring = arbitrary min/max (speed); segmented = app-defined range with rapid changes; use line widths ≥2 pt on watch; the system may apply a single tint in tinted mode, so never color-only. | https://developer.apple.com/design/human-interface-guidelines/complications | high |
| F11 | HIG Typography (iOS Large default): Large Title 34/41, Title1 28/34, Title2 22/28, Title3 20/25, Headline 17 semibold, Body 17, Callout 16, Subhead 15, Footnote 13, Caption1 12, Caption2 11. Minimum text: iOS 11 pt, macOS 10 pt, watchOS 12 pt, visionOS 12 pt. Avoid Ultralight/Thin/Light weights, especially small. | https://developer.apple.com/design/human-interface-guidelines/typography | high |
| F12 | HIG Accessibility: contrast 4.5:1 up to 17 pt, 3:1 at 18 pt or bold; default control size 44×44 pt on iOS/watchOS (minimum 28×28), macOS 28 default / 20 minimum; Reduce Motion → replace movement with fades, tighten springs, avoid animating blur; "convey information with more than color alone"; allow customizing chart colors. | https://developer.apple.com/design/human-interface-guidelines/accessibility | high |
| F13 | Swift Charts framework: iOS 16 / macOS 13 / watchOS 9 / visionOS 1; marks AreaMark, LineMark, PointMark, RectangleMark, RuleMark, BarMark, SectorMark; vectorized AreaPlot/LinePlot/PointPlot/RectanglePlot/RulePlot/BarPlot/SectorPlot; Chart3D + SurfacePlot; AxisMarks / AxisTick / AxisGridLine / AxisValueLabel; NumberBins/DateBins; ChartProxy; ChartScrollTargetBehavior. | https://developer.apple.com/documentation/charts | high |
| F14 | Swift Charts updates: June 2025 adds Chart3D, SurfacePlot, 3D PointMark/RectangleMark/RuleMark; June 2024 adds vectorized LinePlot/AreaPlot/BarPlot and function plotting. | https://developer.apple.com/documentation/updates/swiftcharts | high |
| F15 | Chart3D is iOS/iPadOS/macOS/visionOS/Mac Catalyst 26.0+; supports PointMark, RuleMark, RectangleMark, SurfacePlot; `chart3DPose`, `chart3DCameraProjection(.perspective)`. | https://developer.apple.com/documentation/charts/chart3d | high |
| F16 | SectorMark: iOS 17 / macOS 14 / watchOS 10 / visionOS 1; `init(angle:innerRadius:outerRadius:angularInset:)`; doc guidance: no more than 5–7 sectors, positive values only, order by decreasing size and group the rest as "Other", prefer horizontal bars for many categories; example uses `innerRadius: .ratio(0.618)`, `outerRadius: .inset(10)`, `angularInset: 1`, `.cornerRadius(4)`. | https://developer.apple.com/documentation/charts/sectormark | high |
| F17 | AreaMark has `init(x:yStart:yEnd:)` and `init(xStart:xEnd:y:)` (range/band areas) plus stacking `.standard/.normalized/.center`. | https://developer.apple.com/documentation/charts/areamark | high |
| F18 | RuleMark: `init(xStart:xEnd:y:)`, `init(x:yStart:yEnd:)` (nil bounds omit a side); documented use "annotate with reference lines" (e.g., break-even threshold). | https://developer.apple.com/documentation/charts/rulemark | high |
| F19 | `lineStyle(_ style: StrokeStyle)` on ChartContent (iOS 16+) sets line marks' stroke and overrides default width and cap — dash arrays go here. | https://developer.apple.com/documentation/charts/chartcontent/linestyle(_:) | high |
| F20 | `cornerRadius(_:style: .continuous)` on ChartContent (iOS 16+) rounds bar/rectangle/sector marks. | https://developer.apple.com/documentation/charts/chartcontent/cornerradius(_:style:) | high |
| F21 | InterpolationMethod: linear, monotone, catmullRom(alpha:), cardinal(tension:), stepStart/stepCenter/stepEnd (iOS 16+). | https://developer.apple.com/documentation/charts/interpolationmethod | high |
| F22 | AxisMarkValues: `.automatic`, `.automatic(desiredCount:roundLowerBound:roundUpperBound:)`, `.stride(by:count:…calendar:)` (iOS 16+). | https://developer.apple.com/documentation/charts/axismarkvalues | high |
| F23 | AnnotationOverflowResolution (iOS 17+): per-axis strategies, `.automatic` default. | https://developer.apple.com/documentation/charts/annotationoverflowresolution | high |
| F24 | `chartXSelection(value:)` (iOS 17 / macOS 14 / watchOS 10) binds the selected X value; siblings `chartXSelection(range:)`, `chartYSelection`, `chartAngleSelection(value:)`. | https://developer.apple.com/documentation/swiftui/view/chartxselection(value:) | high |
| F25 | `chartScrollableAxes(_:)` (iOS 17+) with `chartXVisibleDomain` for the visible window. | https://developer.apple.com/documentation/swiftui/view/chartscrollableaxes(_:) | high |
| F26 | `accessibilityChartDescriptor(_:)` (iOS 15+) attaches an `AXChartDescriptor` (Audio Graphs) to any chart-like view. | https://developer.apple.com/documentation/swiftui/view/accessibilitychartdescriptor(_:) | high |
| F27 | SwiftUI `Gauge` (iOS 16 / macOS 13 / watchOS 7): initializers with label, currentValueLabel, minimumValueLabel, maximumValueLabel, markedValueLabels; `GaugeStyle` members automatic, circular, accessoryCircular (open ring + marker), accessoryCircularCapacity (closed ring, partially filled), linear, linearCapacity, accessoryLinear, accessoryLinearCapacity; `CircularGaugeStyle(tint: gradient)`. | https://developer.apple.com/documentation/swiftui/gauge ; https://developer.apple.com/documentation/swiftui/gaugestyle | high |
| F28 | `Font.monospacedDigit()` (iOS 13+): fixed-width digits, other glyphs proportional; no-op if the font lacks the feature. | https://developer.apple.com/documentation/swiftui/font/monospaceddigit() | high |
| F29 | `ContentTransition.numericText(countsDown:)` (iOS 16+) and `numericText(value:)` animate numeric text changes. | https://developer.apple.com/documentation/swiftui/contenttransition/numerictext(countsdown:) | high |
| F30 | Foundation `NumberFormatStyleConfiguration.Notation`: `.automatic`, `.compactName`, `.scientific` (iOS 15+); `SignDisplayStrategy`: `.automatic`, `.never`, `.always(includingZero:)`. | https://developer.apple.com/documentation/foundation/numberformatstyleconfiguration/notation ; https://developer.apple.com/documentation/foundation/numberformatstyleconfiguration/signdisplaystrategy | high |
| F31 | `sensoryFeedback(_:trigger:)` (iOS 17 / macOS 14 / watchOS 10 / visionOS 26) with kinds selection, increase, decrease, alignment, levelChange, impact, success, warning, error, start, stop, pathComplete. | https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:) ; https://developer.apple.com/documentation/swiftui/sensoryfeedback | high |
| F32 | WCAG 2.2 SC 1.4.11: graphical objects "required to understand the content" need ≥3:1 against adjacent colors (2.999:1 fails); lines in a graph do not need to contrast with each other if they contrast with the background; charts with labels and values on the chart are exempt; small background-colored gaps between pie slices are a valid separator. | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | high |
| F33 | WCAG 2.2 SC 1.4.3: 4.5:1 normal text, 3:1 large text; large = ≥18 pt or ≥14 pt bold (≈24 px / 18.5 px); incidental/decorative text and logos exempt. | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | high |
| F34 | WCAG 2.2 SC 2.5.8: pointer targets ≥24×24 CSS px, or spaced so 24-px circles don't intersect; exceptions include inline targets and "essential" presentations such as dense interactive data visualizations. | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | high |
| F35 | `Intl.NumberFormat` options: `notation: "compact"` (+ `compactDisplay: "short"|"long"`), `signDisplay: "auto"|"always"|"exceptZero"|"negative"|"never"`, `maximumSignificantDigits` 1–21, `roundingMode` (halfExpand default), `roundingPriority`, `trailingZeroDisplay: "stripIfInteger"`, `useGrouping: "min2"` default under compact notation. | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat | high |
| F36 | CSS `font-variant-numeric`: `tabular-nums`→`tnum`, `proportional-nums`→`pnum`, `lining-nums`→`lnum`, `slashed-zero`→`zero`; Baseline widely available since Jan 2020. Tailwind v4 ships `tabular-nums`, `proportional-nums`, `lining-nums`, `slashed-zero`, `normal-nums` etc., composable. | https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric ; https://tailwindcss.com/docs/font-variant-numeric | high |
| F37 | NN/g (Laubheimer, 2017): preattentive attributes — length and 2D position are the accurate quantitative encodings; area and angle are preattentive but poor for quantity; color is for categories; avoid pies/donuts, treemaps, gauges ("consume a lot of precious space"), and 3D on actionable dashboards. NN/g video (2020): "use length and 2D position to communicate quantitative information quickly." | https://www.nngroup.com/articles/dashboards-preattentive/ ; https://www.nngroup.com/videos/data-visualizations-dashboards/ | high |
| F38 | FT Visual Vocabulary: nine chart families — deviation, correlation, ranking, distribution, change over time, magnitude, part-to-whole, spatial, flow; poster is FT copyright, the `ft-interactive/visual-vocabulary` D3 examples are MIT (software only, not FT content/branding). | https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ; https://github.com/ft-interactive/visual-vocabulary | high |
| F39 | Datawrapper style-guide survey: define color order for 1-, 2-, multi-color charts; colors must differ in lightness (grayscale print); higher saturation for small marks, lower for large areas; gray is "the most important color"; sequential = light→dark with a subtle hue shift; diverging = two sequentials joined at the light end; WCAG 3:1 for graphic elements constrains gradient range; default gradients average ~69 lightness points. | https://www.datawrapper.de/blog/colors-for-data-vis-style-guides | high |
| F40 | Datawrapper range highlights/reference lines: ranges are rectangles on X or Y (behind everything, light color or reduced opacity, optional diagonal hatching); lines sit on top of data and gridlines; line width 1 px default (2, 3 optional); style solid default, dotted, dashed; uses: recessions/data gaps, confidence/normal ranges, historical vs projected (hatching), thresholds/targets/benchmarks, policy events. | https://www.datawrapper.de/academy/range-highlights-and-lines | high |
| F41 | Datawrapper line charts: lines need not start at zero, but include the zero baseline when data approaches it and extend to 100% for shares; prefer direct labels, fall back to a legend on mobile; gray separates important from unimportant; add a highlight range where values switch to projections; prefer "Curved" (monotone) over natural/cardinal to avoid overshoot; symbols only when intervals are irregular. | https://www.datawrapper.de/academy/what-to-consider-when-creating-line-charts | high |
| F42 | Datawrapper small multiples: avoid independent y-axes; if required, state it in the description and make gridlines look different; repeat all lines in gray behind each panel for context; sort panels by a stated criterion; fewer data points → smaller panels are fine; reduce font size only as a last resort. | https://www.datawrapper.de/blog/what-to-consider-when-creating-small-multiple-line-charts | high |
| F43 | Datawrapper tables: "Show as bar chart" with regular or slim style (slim puts text above the bar), optional gray background for remaining cell space, separate positive/negative colors, fixed min/max (start at 0 / cap at 100); sparklines are "very small line charts drawn without axes or coordinates", optional first/last value labels, shared y-range across cells, adjustable stroke and height; mini columns must start at zero; no hover on mini charts. | https://www.datawrapper.de/academy/how-to-add-bar-charts-line-charts-to-tables | high |
| F44 | Datawrapper automatic dark mode (2022-01-26, L. C. Muth): contrast-based algorithm — a color's contrast with the background is the same in both modes; "colors that are very dark on the white background will be very bright on the black background, and vice versa"; applies to gridlines, text, highlight ranges, color keys, heatmaps, annotations; custom themes can define an explicit dark counterpart per color. | https://www.datawrapper.de/blog/dark-mode-for-embedded-visualizations | high |
| F45 | Okabe & Ito Color Universal Design palette (jfly): vermilion instead of pure red (protanopes), sky blue vs blue differ in brightness/saturation, reddish purple instead of violet; rules: alternate warm and cool, keep brightness/saturation differences, avoid low-saturation/low-brightness combinations. Hex (Wilke, *Fundamentals of Data Visualization*): #E69F00 orange, #56B4E9 sky blue, #009E73 bluish green, #F0E442 yellow, #0072B2 blue, #D55E00 vermilion, #CC79A7 reddish purple, #000000 black. Wilke: qualitative scales work best for 3–5 categories; test in a CVD simulator; small elements are harder to distinguish. | https://jfly.uni-koeln.de/color/ ; https://clauswilke.com/dataviz/color-pitfalls.html | high |
| F46 | Tableau 10 hex (via d3-scale-chromatic `schemeTableau10`): #4e79a7 #f28e2c #e15759 #76b7b2 #59a14f #edc949 #af7aa1 #ff9da7 #9c755f #bab0ab. Design rationale (Maureen Stone; blog returned HTTP 403, from search snippet): palettes vary lightness significantly among easily confused hues to accommodate the 8–10% of men with red-green CVD. | https://github.com/d3/d3-scale-chromatic/blob/main/src/categorical/Tableau10.js ; https://www.tableau.com/blog/colors-upgrade-tableau-10-56782 | high (hex) / medium (rationale) |
| F47 | Observable 10 (`schemeObservable10`): #4269d0 #efb118 #ff725c #6cc5b0 #3ca951 #ff8ab7 #a463f2 #97bbf5 #9c6b4e #9498a0; introduced in Plot 0.6.12 (2023-12-07) by Jeff Pettiross as "a drop-in replacement for tableau10 … slightly more saturated"; Plot's default categorical scheme; Plot docs: reuse past the scheme size is discouraged, fold into "other". (Observable blog on the palette returned HTTP 429 twice.) | https://github.com/d3/d3-scale-chromatic/blob/main/src/categorical/observable10.js ; https://github.com/observablehq/plot/blob/main/CHANGELOG-2023.md ; https://observablehq.com/plot/features/scales | high |
| F48 | Viridis/magma/inferno/plasma (van der Walt & Smith): designed in CAM02-UCS for perceptual uniformity, monotonic lightness, grayscale-safe, CVD-friendly (bluish→reddish→yellowish); CC0. | https://bids.github.io/colormap/ | high |
| F49 | IBM Carbon data-viz palettes: 14-color categorical palette "applied in sequence strictly as described … curated to maximize contrast between neighboring colors", with light/dark token pairs (e.g., Purple 70/50, Cyan 50/90, Teal 70/50, Magenta 70/50, Red 50/90, Green 60, Blue 80, Yellow 50, Orange 70); sequential palettes 10 steps, "in light themes the darkest color denotes the largest values; in dark themes the lightest"; diverging Red–Cyan (temperature) and Purple–Teal (performance, rates); alert palette Red 60 / Orange 40 / Yellow 30 / Green 60; gradients must never stand in for a sequential palette. | https://v10.carbondesignsystem.com/data-visualization/color-palettes/ | high |
| F50 | Carbon axes & labels: "Always start numerical axes at zero for part-to-whole and comparisons charts, such as bar and area chart"; line charts may start elsewhere to emphasize trend; axis-break width 16 px; gap segments 0.5 px; landmark time labels semibold. Page is "a work in progress"; no type sizes given. | https://v10.carbondesignsystem.com/data-visualization/axes-and-labels/ | high |
| F51 | Stephen Few, Bullet Graph Design Specification (rev. 2013-10-10): five components (label, quantitative scale, featured measure, 1–2 comparative measures, 2–5 qualitative ranges); featured bar ≈1/3 the container thickness, 100% black, no border; comparative marker = short perpendicular line, second marker 75% black; qualitative ranges as intensities of one hue — 2 ranges 35/10% black, 3 ranges 40/25/10%, 4 ranges 50/35/20/10%, 5 ranges 50/35/20/10/3%; "limited to a maximum of five and ideally to three"; tick marks light gray thin stroke; scale begins at zero (or below for negatives); designed "to replace the meters and gauges"; when the scale doesn't start at zero, encode the measure as a dot/X, not a bar; reversed fills for lower-is-better measures; optional projection segment. | https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf (text extracted locally) | high |
| F52 | Tufte, sparkline theory: "small, intense, simple, word-sized graphic with typographic resolution"; data-ink ratio ~1.0 (no frames/ticks); aspect ratio by Cleveland's banking to 45° ("lumpy, not spiky or flat") — use the maximum vertical space the word-like constraint allows, then stretch time to meet the lumpy criterion; gray normal-range bands reveal deviations; colored endpoint dot ties to the adjacent number; colored dots for highs/lows; ~500 sparklines per A3 page. | https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ | high |
| F53 | Grafana gauge: "Show thresholds" draws a threshold band outside the inner value band; "Show labels" toggles threshold/neutral labels; neutral point changes where the fill starts (useful for negative ranges); min/max may be auto; thresholds absolute or percentage; separate title/value text sizes. | https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/gauge/ | high |
| F54 | Apache ECharts gauge defaults: startAngle 225, endAngle −45 (270° sweep), clockwise, radius 75%, min 0 / max 100, splitNumber 10, axisLine width 10 px, progress width 10 px, pointer length 60% width 6 px. | https://github.com/apache/echarts-doc/blob/master/en/option/series/gauge.md | high |
| F55 | d3-shape 3.2.0, ISC, depends on d3-path ^3.1.0, ESM. Arc: angles in radians clockwise from 12 o'clock; `cornerRadius` ≤ (outer − inner)/2 and reduced further for spans < π; `padAngle` converts to a linear gap = padRadius × padAngle, default padRadius √(inner² + outer²); `centroid()` is for label placement, not the geometric center. | https://registry.npmjs.org/d3-shape/latest ; https://d3js.org/d3-shape/arc | high |
| F56 | visx: MIT; v4.0.0 released 2026-06-11 — React 18/19 peer range, d3-shape/d3-path v3, lodash and prop-types removed, Node 18 / TS 5 toolchain; @visx/xychart 4.0.0 peers `react ^18||^19`, `@react-spring/web ^9.7.5||^10`; packages include shape, scale, axis, grid, legend, tooltip, brush, zoom, xychart, sankey, responsive, curve, annotation; "largely unopinionated", no built-in animation. | https://github.com/airbnb/visx/releases ; https://registry.npmjs.org/@visx/xychart/latest ; https://github.com/airbnb/visx | high |
| F57 | Shopify Polaris Viz (React + RN; LineChart, BarChart, SparkLineChart, SparkBarChart, DonutChart, StackedAreaChart, SimpleNormalizedChart, FunnelChart, TrendIndicator) is deprecated and the repo was archived 2026-07-29; license is a Shopify-restricted MIT variant. TrendIndicator source: props direction (`upward` default), trend (`neutral` default), value, accessibilityLabel; neutral renders a dash when value is null; `TREND_FONT_WEIGHT = 650`; colors come from `theme.trendIndicator[trend]`. | https://github.com/Shopify/polaris-viz ; https://github.com/Shopify/polaris-viz/blob/main/packages/polaris-viz/src/components/TrendIndicator/TrendIndicator.tsx | high |
| F58 | Adobe react-spectrum-charts: Apache-2.0; visualizations Area, Bar, Line, Scatter, Combo, Donut, Bullet, Venn (BigNumber exists in docs but was not on the README); principles intuitive / configurable / proven, 30+ locales. Spectrum "Big number" page (JS-rendered, from search snippet): "a table with one column and one row, displaying a metric value and a metric label. It is never used in isolation and relies on other elements in a view for context." | https://github.com/adobe/react-spectrum-charts ; https://spectrum.adobe.com/page/big-number/ | high / medium |
| F59 | Material Design: the only official data-viz guidance is the legacy Material 2 page (JS-rendered, not fetchable): chart type depends on "the data you want to communicate, and what you want to convey"; reinforce color meaning with icons/other cues, never color alone. M3 / M3 Expressive (2025) has no data-viz section; Fitbit's M3 Expressive redesign shows charts animating in left-to-right and more color when a goal is hit. | https://m2.material.io/design/communication/data-visualization.html ; https://9to5google.com/2025/11/09/fitbit-material-3-expressive/ | medium / low |
| F60 | Bundled `dataviz` skill numbers (see §1): hero ≥48px; bars ≤24px, 4px data-end radius; lines 2px; markers ≥8px + 2px ring; area alpha ≈10%; 2px surface gap; grid 1px solid; hit target ≥24px; OKLCH bands; ΔE targets; 12-point sparkline. | local skill path in §1 | high (as the skill's own spec) |
| F61 | Validator runs (this report, 2026-09-08): Okabe-Ito (7, no black) passes CVD (worst adjacent 15.8) and normal-vision (16.4) but fails the light band (#F0E442 L 0.90) and four colors sit below 3:1 on light; Tableau 10 fails band (2), chroma (5 below 0.10), normal-vision floor (14.0); Observable 10 fails band (3 light / 6 dark), chroma (4), normal-vision floor (13.7). None is usable unmodified as a design-system series palette. | validator output, this session | high |
| F62 | Validator runs: candidate Prism order orange, aqua, blue, yellow, magenta, green, violet, red (skill's steps) — light on #fafaf9: all 8 in band, chroma ≥0.10, worst adjacent CVD 9.2 (deutan), normal 19.6, three slots below 3:1 (aqua 2.70, yellow 2.07, magenta 2.58 → relief); dark on #101215: all in band, CVD 9.4, normal 19.3, all 8 ≥3:1. First three slots pass all-pairs in both modes (CVD 9.2/9.4, normal 24.0/20.9). Fourth slot fails all-pairs (yellow vs orange: normal 13.7 light, CVD 4.8 dark). 370 of 5,040 orange-first orderings pass in both modes on both surfaces; this is one of the eight tied best. | validator output, this session | high |

---

## 3. Rulebook (numbered, with numbers)

Units: pt on Apple, px on web (1 pt = 1 px at 1×). "skill" = number from the bundled dataviz skill; other citations are to Facts above.

### A. Form and hierarchy

1. **One hero figure per view.** ≥48 pt/px, same UI sans as the rest (never display/serif), proportional figures. The unit sits beside it at 40–50% of the numeral size in secondary ink, baseline-aligned (Prism proposal; hero rule: skill; Spectrum: a big number "is never used in isolation" F58).
2. **A single value is a stat tile, not a chart; a ratio against a limit is a meter/gauge; >7 meaningful classes is a table** (skill; NN/g F37).
3. **Encode quantity with length and 2D position** (bars, lines, dots). Area and angle (pies, donuts, radial gauges) are reserved for glanceable part-of-limit displays and never for comparing close values (NN/g F37).
4. **Donut only as a part-to-whole glance:** ≤6 sectors (Apple allows 5–7, F16), sorted descending, tail folded to "Other", inner radius ratio 0.618, angular inset 1–2 px, corner radius 4 (F16). Prefer horizontal bars for anything analytic.
5. **Never two y-scales on one plot.** Two measures of different scale → two panels or index to 100 at t0 (skill).
6. **Small multiples share one y-scale by default.** If independent scales are unavoidable, say so in the caption and style the panel's gridlines differently; repeat the other series in de-emphasis gray behind each panel; sort panels by a stated criterion; minimum panel plot area 96×48 px (Prism proposal; Datawrapper F42, Tufte density F52).
7. **Zero baseline:** bars, columns, areas and stacked forms always start at 0 (Carbon F50, HIG F2). Lines and sparklines may use a dynamic domain, but include 0 when the data comes within 20% of it and extend to 100% for shares (Datawrapper F41; 20% is a Prism proposal). Fixed domains for meaningful ranges (0–100% battery) (F2).

### B. Axes, grid, chrome

8. **Gridlines: 3–5 horizontal, 1 px solid hairline, one step off the surface, never dashed** (skill; HIG F3). Swift: `AxisMarks(values: .automatic(desiredCount: 4))` (F22). Fewer gridlines when the chart is scrubbable (F3).
9. **Ticks use familiar sequences** (0/5/10, 0/1k/2k), thousands-grouped, ≤3 significant digits (HIG F3).
10. **Y-axis labels on the trailing side; leading edge of the plot aligns with the card's content edge** (HIG F4). Vertical gridline labels sit on their trailing side (F4).
11. **Axis/tick text: Caption 1 = 12 pt on iOS (11 pt Caption 2 for compact density), 11 pt on macOS (10 pt minimum), 12 pt minimum on watchOS; web 12 px (11 px compact)** (HIG minimums F11). Weight Regular; color = muted ink token that still clears **4.5:1** because it is text (WCAG F33, HIG F12). Hide axis text from assistive tech (F7).
12. **Chart title = Headline 17 pt semibold (iOS) / 13 pt bold (macOS) / 15 px semibold (web); subtitle/caption 13 pt Footnote / 12 px; legend 12–13; tooltip value 13 semibold with tabular figures, tooltip label 12 regular** (derived from HIG type scale F11).
13. **Gridlines and axis lines are exempt from 3:1 only when values are readable another way** (labels, tooltip, table); marks that carry meaning must be ≥3:1 against the surface, or the chart ships visible labels / a table view (WCAG F32; skill relief rule).

### C. Marks

14. **Lines 2 px, round joins/caps; sparkline 1.5 px; markers ≥8 px with a 2 px surface-colored ring; bars ≤24 px thick, 4 px continuous radius on the data end, square at the baseline; 2 px surface gap between stacked segments and touching bars; area fill = series hue at 10% alpha** (skill; Swift `.cornerRadius(4, style: .continuous)` F20; HIG "add separation" F5; WCAG gap principle F32).
15. **Interpolation: monotone by default** (`InterpolationMethod.monotone` / `d3.curveMonotoneX`), linear for sparse or step data (`stepEnd` for cumulative counters), never Catmull-Rom/cardinal on measured data (overshoot; Datawrapper F41, F21).
16. **Solid = actual; dashed = target, threshold, projection.** Reference line: 1 px, dash `[4,4]` (StrokeStyle `dash: [4, 4]`), color = secondary ink for neutral targets or the status color for a semantic threshold, label at the trailing end in 11–12 pt muted ink, drawn on top of data (Datawrapper F40; Swift RuleMark + lineStyle F18/F19). Gridlines are never dashed, so dashes stay meaningful.
17. **Range band (normal range / confidence / highlighted period):** drawn behind data; on the value axis = series hue at 12% alpha (light) / 16% (dark); on the time axis = neutral ink at 6% alpha; projected periods use a 45° hatch at 10% alpha over the band (Datawrapper F40; alpha values are Prism proposals validated only against the skill's 10% area rule). Swift: `AreaMark(x:yStart:yEnd:)` for value bands, `RectangleMark(xStart:xEnd:)` for period bands (F17).
18. **Direct labels selectively; legend for ≥2 series, none for one; labels never wear the series color; labels that don't fit move outside or to the tooltip, never clipped** (skill; Datawrapper F41).
19. **Emphasis is a first-class mode:** one series in accent, the others in de-emphasis gray (skill; Datawrapper "gray separates important from unimportant" F41).

### D. Sparklines

20. **No axes, frames, ticks or gridlines; height = the adjacent text's line-height in tables (16–20 px) and 2× that in stat tiles (32–40 px); width 4–6× height, tuned so median slopes ≈45°** (Tufte F52; ratios are Prism proposals derived from the banking rule).
21. **Endpoint dot ≥6 px in the accent (8 px in tiles), optional min/max dots, optional gray normal-range band at 8% alpha; target = 1 px dashed at 40% ink** (Tufte F52; dash rule §C16).
22. **12 points by default, minimum 2 (below that render an em dash placeholder); shared y-range across sparklines in one table column** (skill; Datawrapper F43).
23. **Baseline:** line sparklines use a dynamic domain; area and bar sparklines start at zero (Datawrapper F43).

### E. Gauges and bullets

24. **Ring gauge geometry:** closed ring for percent-of-whole (battery, goal progress); open ring with a **270° sweep (start 225°, end −45°, clockwise)** when min/max are arbitrary; segmented ring for banded scales (HIG F10; ECharts defaults F54; SwiftUI `accessoryCircular` open / `accessoryCircularCapacity` closed F27).
25. **Ring stroke = 10% of outer diameter, minimum 4 px (2 pt on watchOS), round caps; unfilled track = a lighter step of the same ramp, never gray-on-glass; value label inside the ring at ≤45% of diameter, unit at 40–50% of the value size** (stroke ratio mirrors ECharts' 10 px on a ~100 px gauge F54; watch minimum F10; track rule: skill). Threshold band, if any, is a thin (2 px) outer ring (Grafana F53).
26. **Thresholds / qualitative ranges on any gauge: ≤5, ideally 3, encoded as intensities of one hue (3 ranges ≈ 40/25/10% ink), never distinct hues** (Few F51). Status hues only for the *current* state, always with icon + label (skill).
27. **Prefer a bullet bar over a radial gauge in dense dashboards:** featured bar ≈1/3 of track height, comparative target = a short perpendicular line 2× the bar thickness, second marker at 75% ink; when the scale doesn't start at zero encode the measure as a dot, not a bar; reverse fill order for lower-is-better metrics (Few F51; NN/g "gauges consume space" F37). SwiftUI `linearCapacity` for the simple case (F27).

### F. Numbers and delta badges

28. **Compact notation with ≤3 significant digits: 1,284 / 12.9K / 4.2M; locale-aware** (`Intl.NumberFormat({notation:"compact", maximumSignificantDigits:3})` F35; Swift `.number.notation(.compactName).precision(.significantDigits(1...3))` F30). Reserve width for Cyrillic compact names ("12,9 тыс.", "4,2 млн") which are 2–3 glyphs longer than "K"/"M" (Prism note; verify per locale).
29. **Delta badge = arrow icon + explicit sign + value; sign for all non-zero values** (`signDisplay: "exceptZero"` F35 / `.sign(strategy: .always(includingZero: false))` F30); percent with 0–1 decimals; color = direction × polarity (`upIsGood`), neutral (no arrow, em dash) for 0 or null; never color alone (Polaris TrendIndicator F57; skill; HIG F5). Badge text 12–13 pt semibold (weight 600–650, Polaris uses 650), tabular figures, 20–24 px tall, 6–8 px horizontal padding, 6 px radius, 4 px gap icon→text (Prism proposal). *(ADR-0021, 2026-09-15: Prism caps standard weights at 500; badges use label roles (ADR-0021 §1).)*
30. **Figures: proportional for the static hero and stat-tile values; tabular (`tabular-nums` / `.monospacedDigit()`) for axis ticks, table columns, delta badges, and any value that updates live (counters, scrubber readouts)** so glyph widths don't jitter (skill; F28, F36). SwiftUI: `.contentTransition(.numericText(value:))` for animated updates, off under Reduce Motion (F29, F12).
31. **Large numerals contrast:** ≥3:1 allowed only at ≥18 pt regular / ≥14 pt bold per WCAG (F33, HIG F12); Prism's own threshold of ≥24 pt is stricter and compatible. Thin weights (Light/300) are permitted only at ≥48 pt and must respond to the Bold Text setting by stepping to Regular/Medium (HIG "avoid light weights" F11). *(Superseded by ADR-0021 §2–§3, 2026-09-15: Light 300 at ≥ 20 px; thin only for dark metric roles ≥ 34 px; Bold Text table.)*

### G. Color

32. **Series palette: 8 hues, fixed order, separate light and dark steps, validated in CI (OKLCH L 0.43–0.77 light / 0.48–0.67 dark, C ≥0.10, adjacent CVD ΔE ≥8, normal-vision ΔE ≥15, ≥3:1 vs surface or relief)** (skill; §4 numbers F62).
33. **Series caps:** color alone for ≤3; 4+ requires direct labels; scatter, bubble, choropleth and small-multiples panels cap at 3 series before folding to "Other"/faceting (skill; F62 all-pairs result; Wilke 3–5 F45).
34. **Sequential = one hue light→dark (blue by default); diverging = two opposing poles (blue↔red, or orange↔blue) with a neutral gray midpoint; ordinal = one-hue steps with ΔL ≥0.06 and the light end ≥2:1** (skill; Datawrapper F39; Carbon F49). In dark mode the ramp's anchor flips: the lightest step is the largest value (Carbon F49).
35. **Heatmaps/dense continuous fields may use viridis (CC0) as the "scientific" alternate ramp; never rainbow/jet** (F48; skill).
36. **Status (good/warning/serious/critical) is a fixed reserved scale, never used as a series and never themed** (skill; Carbon alert palette F49).
37. **Color follows the entity, not its rank** (no repaint on filter); colors are assigned in slot order, never cycled; a 9th series folds into "Other" (skill; Plot docs F47).
38. **Dark mode is a second stepped palette, not an inversion**; preserve each element's contrast with its surface across modes (Datawrapper F44; Carbon light/dark token pairs F49). Every series token carries both values.
39. **Glass/vivid surfaces:** validate series colors against both the lightest and darkest plausible blended surface; if either fails, the plot area gets an opaque scrim (elevation-1 surface at ≥90% alpha) behind marks; sparklines and hero numbers may sit directly on glass only in the neutral ink or the accent that clears 3:1 on both extremes (Prism proposal; WCAG F32).

### H. Interaction and accessibility

40. **Scrubber/crosshair snaps to the nearest X; the whole plot area is the hit target; one readout lists every series at that X; values lead, series names follow** (HIG F6; skill). Swift: `chartXSelection(value:)` + `RuleMark` + `annotation` (F24); web: pointer capture on the plot rect + bisector.
41. **Selection tick haptics on touch: `.sensoryFeedback(.selection, trigger:)` per snapped index** (F31); no haptics on pointer platforms.
42. **Hit targets ≥24×24 CSS px on pointer (WCAG 2.5.8 F34) and 44×44 pt on touch (HIG F12)**; dense scatter uses nearest-point/Voronoi (skill).
43. **Keyboard/Switch Control: arrow keys move the scrubber one data point, Home/End jump, PageUp/PageDown move by 10; focus shows the same readout as hover** (HIG F6 custom navigation; skill "same on focus").
44. **Tooltips never gate:** every value is reachable via labels or the table view; every chart has a table-view twin (skill; WCAG exemption logic F32).
45. **Audio Graphs on Apple: keep Swift Charts' default descriptor and supply chart title + summary; describe what marks represent, not their colors; hide axis text from VoiceOver** (HIG F7; `accessibilityChartDescriptor` for custom views F26). Web: `<figure>` with `aria-label` summary + table view.
46. **Reduce Motion: no enter/reveal animations, no numeric count-up, crossfade only; refetch holds the previous render at reduced opacity, no skeleton** (HIG F12; skill).
47. **watchOS: glanceable only — no scrubbing, ≤1 series, lines ≥2 pt, closed/open rings via SwiftUI `Gauge`, no blur** (HIG F8, F10; Prism materials rule).
48. **Filters live in one row above all charts; date range first, presets before custom; every chart re-renders against the same slice** (skill).
49. **3D charts (Chart3D) are excluded from Prism v1** — no web parity, and 3D distorts quantitative reading (NN/g F37; availability F15).

---

## 4. Series palette proposal and validator evidence

The references (RonDesignLab-style dark ops dashboards with orange accents; airy light cards) argue for an **orange-led** categorical order so slot 1 matches the default brand accent. Enumerating all 5,040 orange-first orderings of the skill's eight validated hues over both modes and two surfaces per mode (light #fcfcfb and #fafaf9; dark #1a1a19 and #101215) yields 370 passing orders; the best tie group (min adjacent CVD ΔE 9.2, normal ΔE 19.3) includes:

| Slot | Hue | Light | Dark | Light contrast on #fafaf9 | Dark contrast on #101215 |
|---|---|---|---|---|---|
| 1 | orange | `#eb6834` | `#d95926` | ≥3:1 | ≥3:1 |
| 2 | aqua | `#1baf7a` | `#199e70` | 2.70 (relief) | ≥3:1 |
| 3 | blue | `#2a78d6` | `#3987e5` | ≥3:1 | ≥3:1 |
| 4 | yellow | `#eda100` | `#c98500` | 2.07 (relief) | ≥3:1 |
| 5 | magenta | `#e87ba4` | `#d55181` | 2.58 (relief) | ≥3:1 |
| 6 | green | `#008300` | `#008300` | ≥3:1 | ≥3:1 |
| 7 | violet | `#4a3aa7` | `#9085e9` | ≥3:1 | ≥3:1 |
| 8 | red | `#e34948` | `#e66767` | ≥3:1 | ≥3:1 |

Results (F62): adjacent pairlist passes every hard gate in both modes; the first three slots pass all-pairs in both modes; the fourth slot (yellow beside orange) fails all-pairs, so scatter/bubble/maps/small-multiples cap at three series. On light, aqua/yellow/magenta sit below 3:1 → charts using them ship direct labels or the table view (relief rule); on the dark ops surface all eight clear 3:1.

Why not adopt Okabe-Ito / Tableau 10 / Observable 10 directly (F61): Okabe-Ito's yellow (#F0E442) is outside the lightness band and four colors fall below 3:1 on light; Tableau 10 has five slots below the chroma floor (they read gray on the ops dark surface) and a normal-vision collision at 14.0; Observable 10 has four low-chroma slots and a 13.7 collision. Their *hue logic* (alternate warm/cool, vary lightness) is retained; their hex values are not.

These hex values are the skill's reference steps and are a starting point; when Prism's brand ramps exist, snap each slot to the nearest in-band step of the brand ramp and re-run the enumeration (the ordering, not the hue set, is what carries CVD safety).

Sequential blue ramp (skill steps 100–700) passes the ordinal checks on light (monotone L, ΔL ≥0.06, light end 2.06:1, hue spread 3°).

---

## 5. Proposed chart component inventory for Prism (`ds` prefix)

> **ADR-0019 (2026-09-15).** React names drop the `DS` prefix (ADR-0019 §6): `HeroNumber`, `StatTile`, `Sparkline`, …; Swift keeps `DSHeroNumber`, `DSStatTile`, …. The wave-1 list and the component names stay open (critic C-12).

Every component is a versioned contract: same prop names on SwiftUI and React; states enumerated for the parity report. Common enums: `Density = compact | regular | comfortable`, `Polarity = upIsGood | downIsGood | neutral`, `RefLineStyle = target | threshold | projection`.

### Tier 0 — shared parts

| Component | Props | States | Platform mapping |
|---|---|---|---|
| `DSChartContainer` / `ds-chart` | `title`, `subtitle`, `unit`, `summary` (a11y), `tableView: auto\|hidden`, `height` (includes x-axis band), `emptyMessage`, `density` | idle, loading (previous render at 50% opacity), empty, error, reducedMotion | SwiftUI `Chart` inside a `figure`-like container; web `<figure>` + `<table>` twin |
| `DSChartAxis` | `axis: x\|y`, `position: leading\|trailing\|bottom`, `ticks: auto(count 3–5)\|stride`, `format` (number/date), `grid: bool`, `domain: auto\|zero\|fixed(lo,hi)` | — | `AxisMarks(values:)`, `chartYAxis(.trailing)`; visx `AxisRight/AxisBottom`, `GridRows` |
| `DSChartLegend` | `items`, `swatch: line\|rect\|dot`, `interactive: toggleToIsolate`, hidden automatically for 1 series | default, isolated | `chartLegend(position:)` / custom; visx `LegendOrdinal` |
| `DSChartTooltip` | `rows [{label, value, seriesId}]`, `anchor`, `valuesFirst` | hover, focus | `annotation(position:overflowResolution:)`; visx `TooltipWithBounds` |
| `DSReferenceLine` | `value`, `axis`, `style: RefLineStyle` (target/threshold dashed [4,4] 1px; projection dashed 2px), `label`, `color: role` | — | `RuleMark` + `.lineStyle(StrokeStyle(lineWidth:1, dash:[4,4]))`; visx `Line` |
| `DSRangeBand` | `from`, `to`, `axis`, `fill: series\|neutral`, `hatch: bool`, `label` | — | `AreaMark(x:yStart:yEnd:)` / `RectangleMark(xStart:xEnd:)`; visx `Bar`/`Area` with pattern |
| `DSTableView` | auto-generated from chart data (`columns`, `rows`, `format`) | — | `Table`/`List` on Apple; `<table>` on web |

### Tier 1 — the dashboard vocabulary in the references

| Component | Props | States |
|---|---|---|
| `DSHeroNumber` | *(ADR-0021, 2026-09-15: weight and size limits follow ADR-0021; live → `numeric: tabular`.)* `value: number`, `unit?`, `label`, `format: {style: decimal\|percent\|currency\|unit, compact: bool, sigDigits: 3, locale}`, `delta?: DSDeltaBadge props`, `trend?: DSSparkline props`, `size: hero(48/56)\|title(34)\|tile(28)`, `weight: light\|regular` (light only at ≥48), `live: bool` (tabular + numericText), `emphasis: primary\|secondary` | idle, updating (numeric transition), stale (reduced opacity), empty (—), boldText (weight bump) |
| `DSStatTile` | `label`, `value`, `unit`, `delta`, `sparkline`, `target?` (drawn as dashed line in the sparkline), `status?`, `density`, `layout: stacked\|inline` | idle, loading, empty, error |
| `DSDeltaBadge` | `value`, `basis: percent\|absolute\|points`, `polarity: Polarity`, `period?: string` ("vs last 7d"), `size: sm(20)\|md(24)`, `showIcon: true`, `decimals: 0–1`, `neutralBelow?: number` | positive, negative, neutral (0/null → dash, no arrow), reduced-color (icon+sign carry meaning) |
| `DSSparkline` | `points: number[]` (≥2), `kind: line\|area\|bar`, `target?: {value, style}`, `normalRange?: {lo, hi}`, `endpoint: dot\|none`, `extremes: bool`, `baseline: auto\|zero`, `color: accent\|series(n)\|muted`, `width/height` (defaults 96×24 table, 120×40 tile) | idle, insufficientData (<2 → em dash), reducedMotion |
| `DSLineChart` / `DSAreaChart` | `series [{id, name, points, kind: line\|area, emphasis?: bool}]`, `xScale: time\|linear\|band`, `yDomain`, `interpolation: monotone\|linear\|step`, `referenceLines: DSReferenceLine[]`, `bands: DSRangeBand[]`, `selection: Binding<X?>`, `annotations`, `legend: auto\|hidden`, `directLabels: endpoint\|none`, `markers: auto\|always\|never`, `scrollable: bool` (`chartScrollableAxes`), `visibleDomain` | idle, hover/selected (crosshair + readout), loading, empty, error, reducedMotion |
| `DSBarChart` | `series`, `orientation: vertical\|horizontal`, `mode: grouped\|stacked\|normalized`, `maxThickness: 24`, `cornerRadius: 4`, `gap: 2`, `valueLabels: auto\|none`, `baseline: zero` (enforced), `referenceLines`, `sort?` | idle, hover (lift), selected, loading, empty |
| `DSRingGauge` | `value`, `range: {min, max}`, `style: closed\|open270\|segmented`, `thresholds?: [{upTo, tone}]` (≤5, one-hue intensities), `track: sameRamp`, `label: {value, unit, caption}`, `size: xs(24)\|sm(40)\|md(64)\|lg(96)\|xl(160)`, `strokeRatio: 0.10`, `gradient?: bool`, `clampOverflow: bool` | idle, indeterminate, overLimit (clamped + indicator), reducedMotion (no sweep-in) |
| `DSBulletBar` | `measure`, `comparatives: [{value, weight: primary\|secondary}]` (≤2), `ranges` (2–5), `orientation`, `polarity: Polarity` (reverses fills), `scaleStart: zero\|custom` (custom → dot encoding), `projection?` | idle, hover (readout) |
| `DSSmallMultiples` | `panels [{title, series}]`, `sharedY: true`, `columns: auto\|n`, `minPanel: 96×48`, `contextLines: bool` (others in gray), `highlight?: panelId`, `sort: {by, direction}` | idle, hover-sync (crosshair mirrored across panels) |
| `DSTimelineScrubber` | `domain`, `value: Binding<X?>` or `range: Binding<[X,X]?>`, `snap: point\|unit(day/hour)`, `presets`, `haptics: selection`, `keyboard: bool`, `handleSize: 24` | idle, dragging, keyboardFocus, disabled |
| `DSTableCells` — `BarCell`, `DeltaCell`, `SparklineCell`, `HeatCell` | BarCell: `value`, `max` (shared per column), `style: regular\|slim`, `polarity`, `showValue`; DeltaCell: DSDeltaBadge; SparklineCell: DSSparkline with `sharedRange`; HeatCell: `value`, `ramp: sequential\|diverging` | idle, hover (readout) |

### Tier 2 (later)

`DSDonut` (≤6 sectors, innerRadius 0.618, angularInset 1, cornerRadius 4 — `SectorMark`), `DSHeatmap` (viridis or single-hue ramp, scale legend), `DSScatter` (≤3 series, ≥8 px dots, 24 px hit areas, Voronoi), `DSScaleLegend`, `DSChartFilters` (date range + dimension row). Excluded: dual-axis, 3D (`Chart3D`), pie for comparison, radial bar.

### Platform implementation map

| Need | SwiftUI (OS 26 min) | Web (React 19 + visx 4 / d3-shape 3) |
|---|---|---|
| Target line | `RuleMark(y:)` + `.lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))` + `.annotation(position: .trailing)` | `@visx/shape Line` with `strokeDasharray="4 4"`, `@visx/annotation` |
| Value band | `AreaMark(x:yStart:yEnd:)` `.opacity(0.12)` | `@visx/shape Area` with `y0/y1`, `fillOpacity` |
| Period band | `RectangleMark(xStart:xEnd:)` | `<rect>` / `Bar` behind the plot |
| Scrubber | `chartXSelection(value:)` + `RuleMark` + `annotation` + `.sensoryFeedback(.selection, trigger:)` | pointer events on plot rect + `d3-array bisector`; `@visx/brush` for ranges |
| Rounded bars | `BarMark` `.cornerRadius(4, style: .continuous)` | `@visx/shape BarRounded` (top only) |
| Ring gauge | `Gauge(...).gaugeStyle(.accessoryCircular / .accessoryCircularCapacity)` for system-native; custom `Circle().trim()` for 270° with thresholds | `d3.arc()` with `startAngle -3π/4 … endAngle 3π/4`, `cornerRadius ≤ (outer−inner)/2`, `padAngle` for segments |
| Donut | `SectorMark(angle:innerRadius:.ratio(0.618), angularInset:1).cornerRadius(4)` | `d3.arc().innerRadius(0.618 r).padAngle(0.02).cornerRadius(4)` |
| Monotone line | `.interpolationMethod(.monotone)` | `d3.curveMonotoneX` via `@visx/curve` |
| Scroll/visible window | `chartScrollableAxes(.horizontal)` + `chartXVisibleDomain` | `@visx/zoom` or controlled domain |
| Compact numbers | `.formatted(.number.notation(.compactName).precision(.significantDigits(1...3)))` | `new Intl.NumberFormat(locale,{notation:"compact",maximumSignificantDigits:3})` |
| Signed delta | `.percent.sign(strategy: .always(includingZero: false))` | `{style:"percent", signDisplay:"exceptZero"}` |
| Tabular figures | `.monospacedDigit()` | `tabular-nums` (Tailwind) / `font-variant-numeric: tabular-nums` |
| Animated number | `.contentTransition(.numericText(value:))` (off under Reduce Motion) | CSS transition of digits or none; respect `prefers-reduced-motion` |
| Audio graph / a11y | default Swift Charts descriptor; `accessibilityChartDescriptor` for custom | `<figure aria-label>` + table view; `role="img"` for sparklines |

---

## 6. Token needs for charts (DTCG, per brand × scheme × density; values are the proposal from §3–4)

```
chart.series.{1..8}.color            light/dark pairs from §4 (validated in CI)
chart.series.other.color              de-emphasis gray (light #898781 / dark #898781-ish, C < 0.05)
chart.emphasis.muted.color            same as series.other; used by "highlight one" mode
chart.sequential.blue.{100..700}      one-hue ramp; dark mode flips anchor
chart.sequential.alt.viridis          optional CC0 ramp for heatmaps
chart.diverging.{neg, mid, pos}       blue / neutral gray (light #f0efec, dark #383835) / red
chart.status.{good,warning,serious,critical}   fixed, not themed; icon+label required
chart.reference.line.color            neutral: text.secondary; semantic: status.*
chart.reference.line.width            1 (target/threshold), 2 (projection)
chart.reference.line.dash             [4,4]  (stored as dimension array; Figma: dash pattern)
chart.reference.label.size            11 compact / 12 regular / 13 comfortable
chart.band.value.alpha                0.12 light / 0.16 dark
chart.band.period.alpha               0.06 (neutral ink)
chart.band.hatch                      45°, 10% alpha, 1px stroke, 6px period
chart.area.fill.alpha                 0.10
chart.mark.line.width                 2      (sparkline 1.5, watch 2 minimum)
chart.mark.marker.size                8      (ring 2, surface color)
chart.mark.bar.maxThickness           24
chart.mark.bar.radius                 4      (continuous)
chart.mark.gap                        2      (surface color)
chart.grid.line.color                 light #e1e0d9 / dark #2c2c2a  (hairline, ≥1.2:1 is enough — not required content)
chart.grid.line.width                 1
chart.axis.line.color                 light #c3c2b7 / dark #383835
chart.axis.text.color                 muted ink that clears 4.5:1 (e.g. light #6b6a66 / dark #a9a8a0 — verify)
chart.axis.text.size                  11 compact / 12 regular / 13 comfortable (macOS −1)
chart.axis.tick.count                 3 compact / 4 regular / 5 comfortable
chart.title.size                      15 / 17 / 17 (weight 600)
chart.legend.text.size                12 / 12 / 13
chart.tooltip.value.size              13 (600, tabular); tooltip.label.size 12
chart.hero.size                       48 / 56 (regular / comfortable), hero.weight 300 (≥48) else 400
chart.hero.unit.scale                 0.45
chart.tile.value.size                 28 (Title 1) / 34 (Large Title)
chart.delta.size                      12 / 13 (weight 600–650, tabular)
chart.delta.height                    20 sm / 24 md ; delta.radius 6 ; delta.padding 6–8 ; delta.gap 4
chart.delta.{up,down,neutral}.{fg,bg} derived from status.good / status.critical / text.secondary at 12% bg alpha
chart.gauge.sweep                     270 (open), 360 (closed)
chart.gauge.strokeRatio               0.10 ; gauge.minStroke 4 (2 on watch)
chart.gauge.track.alpha               0.20 of the same hue (or ramp step 150)
chart.gauge.thresholdRing.width       2
chart.bullet.barRatio                 0.33 ; bullet.marker.width 2 ; bullet.ranges.ink [0.40,0.25,0.10]
chart.sparkline.{height.table 20, height.tile 40, aspect 5}
chart.hit.minTarget                   24 pointer / 44 touch
chart.motion.enter                    0 under reduceMotion; else 250 ms ease-out
chart.motion.refetchOpacity           0.5
chart.text.tabular                    font-feature "tnum" (input modality-independent)
```

Notes: the two contrast-sensitive tokens (`chart.axis.text.color`, series relief) must be re-validated whenever brand surfaces change — the validator's `--surface` flag exists for this. Dash arrays and hatch patterns need a Tokens Studio representation (Figma has dash patterns on strokes; hatch would be an image fill or a documented pattern style) — see open questions.

---

## 7. Recommendations for Prism

1. **Adopt the skill's method as Prism's chart spec engine** and re-implement the six checks (OKLab ΔE, Machado 2009 simulation, WCAG contrast) as a `prism-viz-validate` CI step run per brand × scheme against the real surface tokens. Fail the build on band/chroma/CVD/normal-vision failures; require a `relief` declaration (labels or table view) for sub-3:1 series.
2. **Ship the orange-first eight-slot order from §4** as the default brand's `chart.series.*`, with the documented all-pairs cap of three for scatter/maps/small multiples. Keep the ordering enumeration script (`research/enum_palette.mjs`) so a brand re-step is a re-run, not a redesign.
3. **Encode conventions as tokens plus enums, not free styling:** `RefLineStyle` (target/threshold/projection) and `DSRangeBand.fill` are the only ways to get dashes and bands, so dashed gridlines or arbitrary dash arrays cannot appear.
4. **Make `DSHeroNumber` + `DSDeltaBadge` + `DSSparkline` the first three components built and parity-tested**; they cover most of the reference screens and stress the number-formatting layer (Cyrillic compact names, tabular vs proportional).
5. **Gauges:** provide `DSRingGauge` (closed and 270°) for glanceable single ratios and `DSBulletBar` for anything dense or comparative; document NN/g's and Few's caveats in the component's "when not to use". On watchOS map `DSRingGauge` to SwiftUI `Gauge` styles rather than custom drawing.
6. **Typography:** hero numerals may be Light only at ≥48 pt and must respond to Bold Text; everything else Regular/Semibold. Reserve tabular figures for aligned/live values. Use the Native preset's SF/Inter tabular features; verify the Signature family has `tnum` and Cyrillic figures.
7. **Web stack:** pin `@visx/* 4.0.0` (React 18/19, MIT) and `d3-shape 3.2.0` (ISC); build `DSRingGauge`/`DSDonut` on `d3-shape arc` (respect the `cornerRadius ≤ (outer−inner)/2` limit). Do not depend on Polaris Viz (deprecated, archived 2026-07-29) or react-spectrum-charts (Vega-based) — use them only as reference.
8. **Apple stack:** OS 26 minimum means every needed API (selection, scrolling, SectorMark, annotation overflow, sensory feedback) is available; exclude `Chart3D` from v1 for parity and honesty reasons.
9. **Accessibility contract per component:** a11y summary string, table twin, VoiceOver mark descriptions vs grouped descriptions (declare which, per HIG), Reduce Motion behavior, Increase Contrast variant (bump series to the next darker/lighter step), Differentiate Without Color (turn on endpoint markers/texture).
10. **Materials:** charts never render on raw glass; the plot area gets a solid or scrim surface, sparklines/hero numbers may sit on glass only in ink/accent that passes both extremes. Add `chart.surface.plot` as an explicit token.

---

## 8. Open questions

1. **Prism surface hex values.** Every validator result depends on the actual light/dark chart surfaces; the proposal was checked on #fafaf9/#fcfcfb and #101215/#1a1a19. Re-run once `surface.*` tokens exist, including vivid (brand gradient) surfaces — which color do we validate against for gradients (darkest stop, lightest stop, both)?
2. **Brand-agnostic slot 1.** Should `chart.series.1` be bound to the brand accent by rule (then every brand must re-validate the full order) or stay a fixed hue independent of the accent? The orange-first proposal assumes the former for the default brand only. *(Answered by ADR-0020 §4, 2026-09-15: series slots are brand-overridable ref tokens; default slots equal to a ramp step alias it; every brand is validated; status stays fixed.)*
3. **Glass plot areas.** The materials rule allows glass only over imagery/maps/vivid; the dark ops references show charts over glass. Do we permit a translucent plot scrim (and at what alpha) or force solid?
4. **Cyrillic compact notation.** "12,9 тыс." / "4,2 млн" widths and the ICU rules for `ru` compact names need real-device checks on both platforms, plus a decision on whether to fall back to "K/M" in the mono slot.
5. **Bold Text × Light hero numerals.** Verify how `Font.weight(.light)` responds to the Bold Text setting for custom (Signature) fonts on OS 26; the HIG guidance to avoid Light applies to text generally.
6. **Figma representation** of dash arrays, hatch fills and the series order (Tokens Studio has no native "dash pattern" token type; likely a composite/`strokeStyle` token plus documentation).
7. **Small-multiples all-pairs cap.** The cap of three is the validator's conclusion for the skill's hues; if Prism re-steps hues, re-check whether a fourth all-pairs slot becomes legal.
8. **Sources not verified first-hand:** Material M2 data-viz page and M3 (JS-rendered; no fetch), Adobe Spectrum Big Number / Color for data visualization (JS-rendered), Observable's palette blog (HTTP 429), Tableau 10 blog (HTTP 403), Stephen Few's dashboard book. None of these gate a decision, but citations for Material/Spectrum remain medium/low confidence.
9. **Sparkline dimensions** (20/40 px heights, 5:1 aspect) are derived from Tufte's banking principle and Apple line-heights, not from a published numeric spec; validate visually against the reference shots and adjust the aspect token per density.
10. **Threshold haptics** (`.increase` / `.decrease` when a scrubbed value crosses a target) — worth it, or noise? Needs a usability check.
