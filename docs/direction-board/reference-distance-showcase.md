# Reference-distance review — the showcase apps

- Subject: `swift/Showcase` (iPhone, iPad, Mac from one target) and `web/apps/showcase`, at `showcase-and-license` (PR #11)
- Rule: [ADR-0015](../adr/0015-references-inspiration-only.md) decision 3 — a reference-distance review before every release, and no Prism screen recognizably the same composition as a reference shot
- Reviewed: **2026-09-22**, against `docs/research/references.json`, the analyses in `docs/research/refs-*.md` and [`visual-dna.md`](../research/visual-dna.md)
- Built and run for this review: the web app (`pnpm showcase`) and the Apple app on the iPhone 17 simulator (iOS 26.5) and on the Mac (`pnpm showcase:apple`, `--platform macos`)
- Companions: the three direction-board screens, reviewed 2026-09-16 — [README.md § Reference-distance review](README.md#reference-distance-review); the gallery, reviewed 2026-09-22 — [reference-distance-gallery.md](reference-distance-gallery.md)
- **Re-reviewed, the Icons screens only: 2026-09-23** — [§11](#11-re-review-of-the-icons-screens--2026-09-23). P4-2 fired §10 condition 2 by implementing `Icon`, and P4-D4 then reconciled the two screens. §11 carries their verdict, a correction to this review (SD-6) and the Icons clearance's own expiry conditions. Sections 1–10 stand as written on 2026-09-22, apart from pointers to §11.

This is the **showcase half** of the precondition that [`docs/legal-checkpoint.md`](../legal-checkpoint.md) §5.2, outstanding item 1 (finding **F-7**) names as the one thing still blocking the `LEGAL_CHECKPOINT` repository variable, and therefore the first release. The gallery half closed on the same day and recorded in its §7 that the showcase half stayed open; this document is what closes it. Critic **C-16** flagged the ordering.

It follows the format the owner already signed off on for the board: per screen, **what it is**, the **nearest reference**, the **families mixed**, and **what differs**. It is not a rubber stamp — §8 records five findings, one of which names the screen that sits closest to a well-known product and says what would have to change if the owner ever wanted more room, and two of which are not distance matters at all: a defect in the web app's own chrome, and a hole in the copy guard this document cites.

**No reference image was fetched, screenshotted or stored.** ADR-0015 rule 1 forbids reference imagery in this tree and `pnpm lint:reference-copy` enforces the copy half of it — it passes over this file, and over **the part of the tree the guard scans**, with this file in it (585 files, 143 denylist entries, exit 0, re-run 2026-09-22 after the target was added). That was not the whole tree when this review was written: `SCAN_TARGETS` covered `web/apps/*` but named no `swift/Showcase`, so the web showcase was gated and the Apple one was not, and its 24 files were scanned by hand for this review — **0 findings**. **SD-5** recorded the gap and it was closed the same day: the target is in `SCAN_TARGETS`, the guard now reports **585 files** with the same 0 findings, and CI makes the answer again on every push rather than taking this document's word for it. That count is the tracked tree exactly — the generated `PrismShowcase.xcodeproj` beside the sources is skipped by name — so a fresh CI checkout prints the same number as a machine that has built the app. Reference shots are named here by the id of `references.json` and a neutral nickname, never by a client's brand name (ADR-0015 rule 2), exactly as the board's own review does.

---

## 1. What is public, exactly

Neither app is a published artefact. What a stranger can reach is the **source**, in a public repository, and whatever they build from it themselves.

| Path | Tracked | What a reader gets |
|---|---|---|
| `web/apps/showcase/src/`, `plugins/`, `index.html` | yes (29 files) | the code of the web app |
| `web/apps/showcase/dist/` | **no** — `web/apps/showcase/.gitignore:2` | the built app exists only on the machine that ran `pnpm showcase:build` |
| `swift/Showcase/Sources/`, `App/`, `README.md` | yes (22 files) | the code of the Apple app, including its three generated catalogues |
| `swift/Showcase/PrismShowcase.xcodeproj` | no — generated per run and gitignored | — |
| Any screenshot of either app | **none exists** | `docs/showcase.md` §5: *"No screenshot of these apps is ever recorded"* — the gallery and the VRT suite own pixels, and a second baseline set would be a second canon |

Three consequences worth stating before the screens:

- **There is no picture of these apps in the public tree**, and CI never builds the app bundle or boots a browser for them, so none is produced as an artefact either. `git ls-files` finds zero PNGs under either path. What is reviewed below is what the apps *render when run*, which this review ran.
- **Neither app is published.** `@iiiivaska/prism-showcase` is `private: true`, and `tools/release/targets.ts` defines a published package as one that is *"not `private`, and not ignored by Changesets"*, so neither `release:pack` nor `pnpm -r publish` reaches it. The Apple app is an `.xcodeproj` generated on demand, not a SwiftPM product a consumer resolves.
- **They are nevertheless in scope.** ADR-0015 rule 3 says *"no Prism gallery screen"*, and `docs/legal-checkpoint.md` §5.2 item 1 widens that to *"every screen that will be public at the release"*. Source in a public repository that anyone can run in two commands is public enough for that sentence to bite, and these are — as the task that commissioned this review puts it — the most-seen screens of the system, because they are what anyone opens first.

---

## 2. A genre with no reference behind it

All eleven shots in `references.json` are **product** UIs:

| Nickname used here | Shots | What it is |
|---|---|---|
| traffic console | 27220417 (desktop), 27289370 (mobile) | an operations console over a map |
| incident console | 27619812 (desktop), 27571204 (mobile) | an incident-response console |
| shipping console | 27658472 | a logistics dashboard with a leading rail |
| health tracker | 27706847 | a consumer monitoring app with a datasheet ornament |
| bottle tracker | 27699907, 27619760 | a consumer device app of vivid capsule tiles |
| finance monitor | 27696584 (mobile), 27597487 (desktop) | a consumer credit app |
| finance dashboard | 27678963 | a light financial dashboard with a smoked drawer |
| Family A | none (shot not located) | a light investor CRM on iPad, known only through the analyses |

**Not one of them is a design-system showcase, a documentation site, a token catalogue, a component gallery or an icon browser.** The research never looked at that genre, because Prism's brief was a product look, not a tool look.

That changes the shape of this review. For a board screen, "the nearest reference" had one answer and it was one of the eleven. For a showcase screen it has two, and both are given below:

1. **The nearest of the eleven**, which for most of these screens is a single *move* — a rail, a tile, a spec row — rather than a composition. This is the answer ADR-0015 rule 3 actually asks for, and it rests on the written analyses in this repository.
2. **The nearest well-known product a reader would hold the screen up against**, which the commissioning task asked for by name. For most screens that is a showcase of the genre. For one it is not: §5.5 shows nine translucent material tiles, and what a 2026 reader compares those to is **Apple's system materials**, not a documentation site — so that section answers the product question as well as the layout one. Either way this axis rests on knowledge of those products, not on any file in this tree, and §7 says plainly that it is therefore the weaker of the two answers.

The genre examples named below are: the **Storybook** docs shell and its global toolbar (the tool this repository already uses for the gallery, P3-4); the documentation shells of **Material 3**, **Polaris**, **Carbon**, **Primer** and **Adobe Spectrum**; the generated documentation of **zeroheight**, **Supernova** and **Backlight**; Apple's **SF Symbols** app; the **Phosphor** icon site (whose glyphs Prism actually bundles, MIT, through `licenses/inventory.json`); and Apple's **HIG** materials page. Several of these are the same sources ADR-0015 decision 4 already admits as *structural checklists* — so naming them here is the practice the ADR describes, not a new exposure.

---

## 3. Method, and what it cannot settle

**What was done.** Both apps were built from this branch and every screen was opened and looked at:

- **Web**: `pnpm showcase` (Vite, port 5273). Overview; all 20 Foundations token-group screens; Icons; the Components index and a component page with its examples staged; Patterns; About. In **light and dark**, at **1440 and 1280 CSS px** (the rail layout) and at **375 px** (the disclosure layout), with the axis bar open and closed and with the `compare` control off, on `colorScheme` and on `density`.
- **Apple**: `pnpm showcase:apple` on the iPhone 17 simulator (iOS 26.5, UDID `2028EA05-…`), and `--platform macos` on the Mac. Pages were opened directly with the launch arguments `swift/Showcase/README.md` documents (`-DSShowcaseSection`, `-DSShowcaseTokenGroup`, `-DSShowcaseComponent`, `-DSShowcaseExample`, `-DSShowcaseColorScheme`, `-DSShowcaseAxes`), which is exactly what those arguments exist for. Overview, the Foundations index, `sys.color`, `sys.material`, `sys.type`, Icons, Components, the Card page, the `Card/glass-vehicle` example page, Patterns, About and the axis sheet, in light and dark; on the Mac the split view with its sidebar. The simulator was shut down afterwards and nothing in the working tree changed.

**What it cannot settle.**

- **The genre comparison is recollection.** There is no screenshot of Storybook or of the SF Symbols app in this tree, and under ADR-0015 rule 1 there will not be one. The §4 and §5 "nearest showcase" judgements are therefore weaker evidence than the "nearest shot" ones, which quote written analyses. They are given because leaving them out would make this review useless, not because they are as solid.
- **Family A cannot be re-checked.** Its shot was never located; it survives only in the analyses' comparisons. Where it is the nearest family, that is flagged.
- **This is not a legal opinion.** `docs/legal-checkpoint.md` §4.2 records that *"recognizably the same composition" is the agents' own standard, not a legal one*, and §4.5 records that the EU unregistered-design question sharpened when Prism went proprietary. Nothing here changes either.

---

## 4. The app chrome

The chrome is the split view, the sidebar, the header, the axis controls and the token-group layout. `docs/showcase.md` §2 is explicit that it is **not Prism**: `Sidebar`, `TabBar` and `AdaptiveShell` are specified and unimplemented, so the frame is plain CSS over `--ds-*` variables on the web and plain SwiftUI on Apple, and each app's About screen says so in those words. That is a defence and it is worth saying why: *plain platform furniture is nobody's expression.* A `NavigationSplitView` with a `List` of `Label`s is the shape Apple's own documentation gives; a left nav over a reading column is the shape every documentation generator emits. Neither can be the composition of a product screenshot, because neither is a composition anyone designed for this app.

### 4.1 The web shell — header, rail, column

- **What it is.** A sticky header carrying a `Sections` toggle, the wordmark *Prism showcase*, a mono brand badge (`prism`), and under them the axis bar. Above a 900 px **container** width (a container query on the app itself, not the viewport and not a user agent) a persistent 17rem rail lists the six sections, and under the active section its items with a trailing count read off the manifest (`color 94`, `material 52`, … `ref 175`). The content column is capped at 72rem. Below 900 px the rail and the axis bar both become disclosures and the header collapses to three controls. The header measures its own height and publishes it, because six axes wrap differently at every width.
- **Nearest reference (of the eleven).** None is a documentation tool, so only single moves are near. The closest are the **shipping console 27658472**'s leading rail — a rounded slab from the brand row down — and the **traffic console 27220417**'s top row, with a logo at the leading end and controls grouped at the trailing end.
- **Nearest showcase of the genre.** The documentation shell: a left nav over a single reading column, as Material 3, Polaris, Carbon, Primer and Spectrum all use and as zeroheight, Supernova and Backlight generate. The single closest is the **Storybook** docs layout — explorer on the left, a toolbar above the content.
- **Families mixed.** The rail (shipping console 27658472), a top row whose controls group at the trailing end (traffic console 27220417), and the documentation shell of the genre. Prism's own contribution is that the rail's second level is *counted*, not authored.
- **What differs.** The rail carries no logo cluster, no search, no tree disclosure, no version picker, no "edit this page", no locale, no theme menu; the shipping console's rail carries KPI tiles, an optimizer card and a composer, and this one carries six words and a list of token groups. There are no pill tabs, no search pill with a shortcut, no bell, no avatar — the whole tools cluster that the board's own review had to break up for the report screen was never here to break up. The one visible number in the rail is a token count.
- **Verdict.** Plain furniture over tokens. Not recognizably any product, reference or showcase.

### 4.2 The Apple shell — split view, sidebar, toolbar, sheet

- **What it is.** `NavigationSplitView`: a sidebar `List` of six `Label`s carrying stock system symbols — a four-square grid, a paint palette, a square on a circle, a cube, three stacked rectangles and an info mark — and a `NavigationStack` detail. (The symbols are named in `DSShowcaseShell.swift` and deliberately not repeated here: one of them is in Prism's own icon registry, and `icons:validate` holds ADR-0013 rule 5 — an SF Symbol name belongs in Apple sources, not in a document — which it enforced against the first draft of this line.). The split view collapses itself on a compact width, so iPhone, iPad and Mac are one view: on the phone the sidebar is behind the back chevron and every screen is a push. Every screen — including a pushed token group, component page or example page — is a `DSScreen`: the page ground, the page margin, an inline navigation title, a circular toolbar button that opens the axis sheet, and the **resolved-context strip** at the top. On the Mac the axis sheet is also **View ▸ Axes (⌘⇧A)**.
- **Nearest reference.** None. No shot in `references.json` is an Apple app, and none shows a native split view, a navigation stack or a sheet.
- **Nearest showcase of the genre.** Apple's own **SF Symbols** app — a sidebar of categories beside a grid — and the "catalog app" shape that platform design systems ship as a sample.
- **Families mixed.** None, and that is the point: this is Apple's furniture used the way Apple documents it, with Prism inside the content area only.
- **What differs.** The sidebar is six fixed sections, not a browsable library: no search field, no inspector pane, no favourites, no export, no custom collections. What is *not* furniture is the resolved-context strip that opens every screen — *"prism · dark · regular · touch · contrast standard · transparency standard · motion standard / iOS · Dynamic Type large · Bold Text off"* — so a screenshot of any screen always says which axes produced it. No showcase of the genre prints that, and no reference shot has an axis to print.
- **Verdict.** Platform furniture, declared as such on About. Not recognizably anything.

### 4.3 The axis controls

- **What it is.** Web: seven labelled rows — color scheme, contrast, transparency, density, modality, motion, brand — each a segmented pill group with an **`auto`** position that passes nothing, a resolved line under it (`auto → dark`, `auto → standard (root only)`), and where the probe found nothing responding, a badge in its own tone: `no token moves; 12 of 28 examples still change`. Apple: the same axes as `Picker`s in a sheet, grouped by *how* each one applies — *Brand — DSTheme(brand:), root-only*, *Scoped axes — they nest, exactly as they do on the web*, *Root axis — applied above DSTheme*, *Accessibility* — with what `DSAxisProbe` measured printed under each accessibility control.
- **Nearest reference.** None. No product shot has an accessibility axis to switch, and a segmented control with one active solid is visual-dna principle 9, which Prism already owns as a rule.
- **Nearest showcase of the genre.** **Storybook's global toolbar** — the strip above the canvas where a scheme, a viewport and a background switch live — is the one a reader would name, and it is the more pointed comparison because this repository's gallery *is* Storybook (P3-4). Second nearest: the Material Theme Builder's controls, and Spectrum's light/dark plus platform switches.
- **Families mixed.** The pill grammar and the single inverse solid per group are Prism's own (visual-dna principles 2 and 9); the idea of a global axis strip above the content is the genre's.
- **What differs**, and this is the substantive part of the whole shell. Three things no toolbar in the genre does: the **`auto` position that passes nothing**, so the axis stays the OS's and the bar says so; the **resolved line** that prints what the runtime resolved rather than what was asked for; and the **probe verdict** that labels a control which does nothing, measured rather than assumed. Against that, the controls a reader would expect and does not find: there is no viewport or device control, no zoom, no locale, no background picker, no grid or measure overlay, no canvas/docs tab pair, no "open in new tab", no story tree. The bar is a context editor, not a canvas toolbar.
- **Verdict.** Not a copy. The nearest thing in the genre is a toolbar Prism deliberately does not build, and **SD-2** records what would make the difference disappear.

### 4.4 The token-group layout

- **What it is.** One screen per group. A `display.md` title (`color`, `material`, …), a lead sentence with the count and the tier, on the web a `compare` control (`off` / `colorScheme` / `density`) with a caption saying that only those two axes nest, then one panel per second path segment (`color.accent`, `color.bg`, …) holding the rows. On Apple the same group is a screen pushed from the Foundations index, with a prose panel first (*"Who resolves these colours"*, *"Materials, as Surface publishes them"*) and then the rows.
- **Nearest reference.** None; the board's own Foundations section is Prism's, not a shot's.
- **Nearest showcase.** The tokens page of a generated documentation site (Spectrum, Carbon, Supernova), which is also a heading, a description and a table of rows.
- **What differs.** The `compare` control, which renders the **same rows twice in two real nested scopes** side by side and names the scopes above each column (`colorScheme: light → light / regular`), rather than showing two authored tables. And the prose panel: an Apple colour screen opens by explaining *who resolves these colours* and that 17 of the 94 colorsets hold a different colour under Increase Contrast — a paragraph about the mechanism, which a token table never carries.
- **Verdict.** Not a copy.

---

## 5. The specimen presentation

### 5.1 The token row — the shape almost every screen is made of

- **What it is.** A specimen in a narrow leading column (8rem on the web, a wide rounded chip on Apple), then: the path in mono, the DTCG type, a `varies with colorScheme` note where it does, the **description the manifest carries** as a sentence, the two platform bindings (`CSS --ds-color-accent`, `SWIFT DSColor.accent`), and the value **twice** — `PAINTED oklch(0.7517 0.1475 57.6)` and `TABLE oklch(0.7517 0.1475 57.6)` — with a `table = painted` tag. Rows are separated by hairlines; a specimen that needs the width takes the whole row and the text sits under it.
- **Nearest reference (of the eleven).** The **health tracker 27706847**'s spec row: an icon, a label at low ink, a dotted leader across the middle, and a value right-aligned to the card padding, about 44 pt tall. That is the only row grammar in the reference set that pairs a label with a value across a gap.
- **Nearest showcase.** A generated token table — name, value, description, swatch — as Spectrum, Carbon, Polaris, Supernova and zeroheight all emit.
- **Families mixed.** The label/value row (health tracker 27706847), hairline row separators (visual-dna principle 1), and the token table of the genre.
- **What differs.** No dotted leader, no leading icon, no right-aligned value, no fixed row height — the board took the health tracker's leaders and put them on the report hero, and the showcase did not take them at all. What the row carries instead is the thing no table in the genre carries: **two readings and a verdict**. The value is resolved from the brand's JavaScript table and read back off `getComputedStyle`, compared as sRGB bytes on a 1×1 canvas rather than as strings, and the row prints the verdict — `table = painted`, `table ≠ painted` or `not comparable`. Every row seen in this review read `table = painted` or, for the 22 type roles and 3 stroke styles that publish sub-properties and no single declaration, `shown, not compared`; `docs/showcase.md` §1 gives the arithmetic (364 of the 389 `sys` and `comp` tokens comparable, all 364 agreeing). A `ref` row on Apple says *primitive tier — no public API*. Both platform bindings sit in one row, so a reader sees the CSS variable and the Swift member of one token together.
- **Verdict.** Not a copy, and the part that carries the most of the screen is the part with no counterpart anywhere.

### 5.2 Colour — a list, not a palette wall

- **What it is.** 94 `sys.color` rows in panels by family, each a 3rem swatch over a checkerboard (so alpha reads as alpha) beside the row described in §5.1. `ref` adds 175 more, including the neutral ramp and the series slots, as the same rows.
- **Nearest showcase.** The genre's colour pages: Material 3's colour-roles page, which is a **grid of filled blocks with the role name written inside the block**; Tailwind's palette page, rows of eleven chips per hue; the swatch-and-hex tables of Polaris and Carbon.
- **What differs.** There is **no palette wall**. Prism's colour screen is a vertical list in which each colour gets one small square and several lines of prose — *"marks: dots, chart 'now', peak ticks, delta glyph fill; 2.3:1 on white, so a mark always sits with its value, sign or label"*. The ramp exists (`ref.color.neutral.600` … `1000`) but only as consecutive rows, never as a strip, so the poster that a colour page in this genre is built to be is exactly what this screen refuses to be. No hex is written into the app: what is printed is what was resolved.
- **Verdict.** Not a copy. This is the screen where the "list of rows" discipline pays for itself.

### 5.3 Type specimens

- **What it is.** Each of the 22 roles at its real size, with the role name above and the metrics under it. Web: the sample string is `Prism 1234`; Apple: `Ag 86.4`, under the heading *"The type scale, at its real sizes"*, scaled by the Dynamic Type size the axis sheet is set to.
- **Nearest reference.** None as a composition. The three-column specimen on the direction board (live spec / Latin / Cyrillic) is Prism's own and is **not** reproduced here — the two artefacts show the same roles differently on purpose.
- **Nearest showcase.** Every type page in the genre, and the `Ag` specimen is the typographic convention itself. Role name plus sample plus metrics is what Material, Carbon, Polaris and Spectrum all do.
- **What differs.** No waterfall, no character set, no paragraph sample, no pangram, no glyph table. The metrics are printed twice (table and painted) like any other token, and the role's tracking, numeric feature and font stack are printed as resolved. Note for a later reader: the two stacks use **different sample strings** (`Prism 1234` and `Ag 86.4`) and the Cyrillic coverage that decided the family is shown on the board, not here. Neither is a defect; it is recorded so the difference is not read as drift.
- **Verdict.** Not a copy; the specimen is the convention, at 22 roles.

### 5.4 Spacing rules, radii, sizes, elevation, motion, chart

- **What it is.** A spacing token is a short **rule** the length of its value; a radius, a size and a stroke likewise; an elevation is a small tile carrying the shadow; a motion token is a track with a dot that **replays on press**; chart tokens are hairlines and dots at their real widths. All inside the §5.1 row.
- **Nearest reference.** The **health tracker 27706847**'s datasheet ornament — tick rulers and dotted leaders — is the nearest move, and the board took the ruler for the ride card and the report chart. The showcase takes the *measure* and not the ornament: a bar of the token's length, with no ticks and no dots.
- **Nearest showcase.** Material's spacing page (a scale strip), its elevation page (a row of cards at each level), and the motion pages of Material and the HIG (a replayable demo).
- **What differs.** The elevation specimen is one small tile, not a stack of cards climbing a z-scale; the spacing specimen is a bar, not a labelled gap between two boxes with dimension arrows; the motion specimen is one dot on a track, not a demo scene with a card flying in. In each case the genre's specimen is a *picture of the idea* and Prism's is a *measurement of the value*.
- **Verdict.** Not a copy.

### 5.5 Materials and gradients, through Surface

- **What it is.** The materials screen opens with a panel headed *"Through Surface"* (web) or *"Materials, as Surface publishes them"* (Apple), because only `Surface` resolves and publishes a material (ADR-0022 rule 1). Web: a row of labelled tiles — `page`, `solid`, `raised`, `nested`, then the vivid, accent, inverse and glass tiles over the synthetic map and image of the example harness. Apple: the same set, 2-up on the phone and six across on the Mac, then the glass tiles over the same synthetic ground. The gradient screen shows the four vivid slots as bands in a row, each with its slot id and the one-temperature rule beside it.
- **Nearest reference (of the eleven).** This is the one place in the whole showcase where the reference set genuinely has something near. Two moves: the **shipping console 27658472**'s 2×2 slab of tiles at 4–6 px gaps with one "lit", and the **bottle tracker 27699907**'s 2×2 of vivid gradient capsule tiles. **Family A** contributes the 2×2 as a 2×2 and cannot be re-checked.
- **Nearest showcase.** Apple's **HIG materials page**, which is a row of material samples over a photograph, and Material 3's surfaces page.
- **Nearest well-known product — the comparison this screen invites and the rest of this document ducked.** The HIG materials page is named above as a *layout*, which leaves the obvious question unasked: is Prism's glass itself near **Apple's system materials**? It is the question a 2026 reader asks first, because a blurred, saturated, specular-edged translucent pane over a moving ground is Apple's signature move, and this screen puts the `glass` and `glassLight` tiles over the synthetic ground in a row of nine material samples. Answered: Prism's glass is in that family and is not Apple's expression of it, and the difference the screen itself shows is that **Prism publishes the numbers where Apple ships names**. Every tile on this screen sits above its own seven-token recipe, printed twice and verified `table = painted`: the scheme's glass resolves to white **30 %** / blur **24 px** / saturate **1.10** / inner edge **55 % → 0 %** / grain **0** / bloom **0** in light, and smoke #111316 at **60 %** / blur **32 px** / saturate **1.20** / edge **15 % → 0 %** / grain **0** / bloom **0** in dark; `glassLight` in dark is white **26 %** / blur **40 px** / saturate **1.0** / edge **15 % → 0 %** / bloom **35 %**. Apple's materials publish no blur radius, no saturation factor and no edge alpha at all — thin-to-thick names and the vibrancy levels the HIG documents are the whole public surface — where Prism prints six `text.on-glass-fill*` tones, five `ref.blur.*` steps and one declared fallback (opaque `raised`, `inverse` when selected) with four stated triggers. The two are the same *genre* of recipe and the opposite *kind* of artefact: a system material you request by name, against a token set you can read, diff and re-check. `reference-distance-gallery.md` §3.3 carries the same answer for the gallery's glass images. As §7 says of every genre judgement here, this one rests on knowledge of Apple's materials and on nothing in this tree, because ADR-0015 rule 1 means nothing about them may be stored here.
- **Families mixed.** The tile grid (shipping console 27658472, bottle tracker 27699907, Family A), glass over a ground (traffic console 27220417 / incident console 27571204, as principles), and the material-sample row of the genre.
- **What differs.** The tiles are labelled with the material's **name** and sit at `card-gap`, so they read as separated samples and never as a slab; the reference slab's whole effect depends on 4–6 px gaps, which is precisely what is not used. They carry no numerals, no delta pills, no sparklines, no dot-matrix digits, no inner dotted seam, and they are rectangles at `radius.card`, not capsules at 48 % of their height. Nothing is "lit" relative to anything: every tile is a sample, none is an attention state. The glass tiles sit over the harness's **synthetic** ground — four flat token colours arranged as streets, and the same colours blurred into a soft field for "image" — which exists because ADR-0015 rule 1 forbids imagery, and which the gallery review §3.4 already cleared as *"not a map… four flat token colours"*. One legibility note, and it belongs to the **Apple** app only: on the iPhone at regular density the second glass tile's caption truncates to `glass…`, confirmed on the iPhone 17 simulator on the `sys.material` screen. The web tiles do not truncate at any width this review opened (1440, 1280, 375 px).
- **Verdict.** Not a copy. The nearest move needs a slab and a lit tile to read, and this screen is built so that neither can happen.

### 5.6 The icon grid

*Superseded for both stacks by [§11](#11-re-review-of-the-icons-screens--2026-09-23) (2026-09-23). Kept as written. One statement below was wrong on the day it was written: the Apple screen did have a per-icon page (SD-6).*

- **What it is.** 51 registry entries. Above them, on the web, four segmented controls — weight (thin 200 … heavy 800), style (each entry's default / outline / filled / duotone), box (xs 12 px … lg 24 px) and direction (ltr / rtl); on Apple, two `Picker`s (weight, and size as `lg · 24 pt`). Then a grid of tiles, each a glyph over its id: on the web a card per entry carrying the id, the token path, the category and the tags; on Apple a `LazyVGrid` at an adaptive 104 pt minimum with the id under the glyph. Above the grid, a weight ladder of one glyph at every weight and box. The whole screen is labelled **preview**, with a sentence saying that `Icon` is implemented on neither stack and that these are registry rows with a picture beside them, not a component.
- **Nearest reference (of the eleven).** None. No shot shows an icon library.
- **Nearest showcase of the genre — and this is the closest match in either app.** Apple's **SF Symbols** app and the **Phosphor** icon site: a weight control above a grid of glyph tiles with the name under each. Material Icons and the Font Awesome gallery are the same shape. A reader who knows any of those will recognise this layout immediately.
- **Families mixed.** None from the reference set. The convention is the genre's; what is layered on it is Prism's registry schema.
- **What differs.** It is a **registry table with a picture**, not an icon browser. There is no search field, no filter by category, no copy-to-clipboard, no copy-as-SVG or as-code, no download, no favourites, no category sidebar, no per-icon detail page — the affordances that make an icon site an icon site are all absent. What is present instead is the data: the registry id (`action.add`), the token path (`icon.action.add`), the category, the tags, and the binding the glyph was drawn from. And the honesty label, which no icon site carries because no icon site has to.
- **Verdict.** **Not a copy, and the closest call in either app.** See **SD-1**, which records why the layout is not the exposure, where the real exposure is (the glyphs, which are third-party and already in the ledger), and what would push this screen *towards* a product rather than away from one.

### 5.7 The example stages

- **What it is.** On the web a component page stacks its examples, each on a stage carrying the page ground and a collapsed `props` disclosure; on Apple an example is its own pushed screen with the stage and *"Props, as the spec writes them"* under it. The stage is fit-content, capped at two card columns, with a card-shaped example in a `size.card-min` square, and it scrolls sideways when the page is narrower than the example.
- **Nearest reference, families mixed, what differs.** **These are the same 28 examples the gallery ships as 488 PNGs** — Button 7, Card 7, Surface 8, Text 6, on both stacks, staged by harnesses written to stage them identically. [reference-distance-gallery.md](reference-distance-gallery.md) §3.1–§3.11 reviews every one of them, screen by screen, and its verdicts apply here unchanged: not a copy, with the metric cards borderline on anatomy (its **RD-2**). The showcase adds no example of its own, invents no composition, and places at most one example per stage; the vivid 2×2 appears as a 2×2 because the spec example is a 2×2, and the diagonal one-pair rule is ADR-0029 §2.5's.
- **What the showcase adds that the gallery does not have.** The example is **live** — pressable, with real fonts, real motion and a no-op handler per `action` prop the spec declares — and its props are printed beside it as the spec writes them.
- **Verdict.** Not a copy, by reference to the gallery review. Nothing about staging the same examples live rather than as PNGs changes their distance.

### 5.8 The counts on Overview

- **What it is.** Web: a `This document` facts panel (brand, system version, icon registry, platform key, effective context), then `Tokens` with three bare numerals — **175 / 264 / 125** with `ref` / `sys` / `comp` under them — then `Components` with four numerals and a tag, then `Icons`. Apple: the same facts as a key/value list with **no numerals at all** (*"tokens — 564 — 264 system, 125 component, 175 primitive"*), then *"Live, not a picture"*, which stages the first spec example of each of the four implemented components in a row.
- **Nearest reference (of the eleven).** The KPI row: the **finance dashboard 27678963**'s cards and the **shipping console 27658472**'s 2×2 of tiles, one lit. The instrument numeral itself is visual-dna principle 4.
- **Nearest showcase.** The "system at a glance" panel of a generated documentation home page.
- **What differs.** No tiles, no cards, no vivid, no glass, no deltas, no sparklines, no accent, no lit anything. The numerals sit directly on the page under a heading, with a lowercase caption under each, in **two** plain panels: three under `Tokens` (175 ref / 264 sys / 125 comp) and four under `Components` (4 implemented / 53 specified, not built / 0 not on this platform / 3 patterns, contract only). The reference KPI row's whole effect is the *tile* — the fill, the gap, the delta pill, the one lit member — and none of it is here. On Apple the numbers are not even numerals; they are a sentence in a list.
- **Verdict.** Not a copy. A row of numbers under a heading is not a dashboard.

---

## 6. Is any screen close enough to one product that a reasonable person would call it a copy?

| # | Screen | Copy? | Why |
|---|---|---|---|
| 1 | Web shell — header, rail, column (§4.1) | **No** | A left nav over a reading column, with counts read off the manifest. No logo cluster, no search, no tabs, no avatar, no version picker. The reference rails carry KPI tiles and a composer; this one carries six words. |
| 2 | Apple shell — split view, sidebar, toolbar (§4.2) | **No** | `NavigationSplitView` with six `Label`s. Apple's furniture used as Apple documents it, declared as such on About. No reference shot is an Apple app. |
| 3 | The axis controls (§4.3) | **No** | Nearest is a canvas toolbar Prism does not build. The `auto` position, the resolved line and the probe verdict have no counterpart in the genre; the viewport, zoom, locale, background and canvas/docs controls that define that toolbar are all absent. See **SD-2**. |
| 4 | The token-group layout (§4.4) | **No** | Title, lead, panels of rows. The `compare` control renders two *real nested scopes* side by side, which no token page does. |
| 5 | The token row (§5.1) | **No** | The nearest row grammar in the reference set needs a dotted leader, a leading icon and a right-aligned value; none is used. Two readings and an agreement verdict have no counterpart anywhere. |
| 6 | Colour (§5.2) | **No** | A vertical list with one small swatch and a paragraph per colour. The genre's colour page is a palette wall; this screen is built not to be one. |
| 7 | Type specimens (§5.3) | **No** | Role name, sample at real size, metrics. That is the typographic convention, at 22 roles, with no waterfall and no character set. |
| 8 | Spacing, radius, size, elevation, motion, chart (§5.4) | **No** | A measurement of the value rather than a picture of the idea. No elevation card stack, no dimension arrows, no motion demo scene. |
| 9 | Materials and gradients (§5.5) | **No** | Labelled samples at `card-gap`, never a slab; rectangles, not capsules; nothing lit; the ground is four flat token colours. The nearest reference move needs a slab and a lit tile to read. |
| 10 | **Icons (§5.6)** | **No — and the closest call in either app** | A weight control above a grid of glyph tiles with the name under each is the icon-library genre's own layout, and a reader will recognise it. What it is not is an icon browser: no search, no filter, no copy, no download, no detail page. What it is instead is the registry as data — id, token path, category, tags, binding — labelled a preview. See **SD-1**. |
| 11 | The example stages (§5.7) | **No** | The same 28 examples the gallery ships, live. Cleared screen by screen in [reference-distance-gallery.md](reference-distance-gallery.md) §3; its **RD-2** (the metric cards, borderline on anatomy) carries over unchanged. |
| 12 | Overview (§5.8) | **No** | Seven numerals under headings in two plain panels — three under `Tokens`, four under `Components`. No tile, no card, no delta, no accent — the reference KPI row is entirely tile. |
| 13 | Components, Patterns, About (§9) | **No** | Lists of names with a state word, and prose. Nothing composed. |

**No screen in either app is recognizably the same composition as any of the eleven reference shots**, and no screen in either app is close enough to a well-known design-system showcase that a reasonable person would call it a copy of one. Row 10 is the one worth a second look, and **SD-1** gives it one.

---

## 7. What the answer rests on, and where it is weakest

- **The strongest reason is, again, the least flattering one.** Most of these screens are lists of rows. A list of rows is nobody's expression, and most of the 20 Foundations screens are that one row repeated — only `material` and `gradient` open with a panel of anything else. The showcase is far from everything because it composes almost nothing.
- **The weakest evidence is the genre comparison.** The "nearest shot" judgements quote written analyses in this repository. The "nearest showcase" judgements — Storybook's toolbar, the SF Symbols grid, Material's colour-roles page — rest on knowledge of those products and on nothing in this tree, and under ADR-0015 rule 1 they never will rest on anything more. A later reviewer who disagrees with one of them has no file here to check it against. That is a deliberate cost of the firewall, and it is stated rather than hidden. The first draft also applied this axis **only to page layouts**, which left the one obvious product comparison — Prism's glass against Apple's system materials — unasked on a screen made of nine glass tiles. §5.5 now asks it, and `reference-distance-gallery.md` §3.3 asks it of the gallery's glass images. Both answers are half-checkable: the Prism numbers are tokens a reader can print, and the Apple side is recollection.
- **The chrome's safety is temporary by design.** What makes §4 easy is that the chrome is not Prism. `docs/showcase.md` §2 says *"Phase 5 rebuilds the chrome from real components."* On the day `Sidebar`, `TabBar` and `AdaptiveShell` land and the showcase is framed in Prism, the chrome stops being platform furniture and becomes a Prism composition — which is exactly the artefact ADR-0015 rule 3 is written about. **SD-3.**
- **The one screen that is a composition is the one with a genre.** The Icons screen is the exception to "a list of rows", and it is the only screen where the layout is recognisable before the content is read. It is also the only screen whose content is somebody else's intellectual property — the Phosphor glyphs — which is a licence question, already answered, and not a composition question. **SD-1** keeps the two apart.
- **The examples are borrowed from a review that already ran.** §5.7 leans entirely on the gallery review. If **RD-2** is ever acted on, the showcase inherits the change with no edit, because both read the same spec examples.

---

## 8. Findings

Five. None blocks this review; **SD-3** shapes what the clearance means, and **SD-4** and **SD-5** are not distance matters at all — SD-4 is a chrome defect, SD-5 a gap in the gate this document cites.

### SD-1 — Icons is the genre's own layout, and the thing to watch is drift towards a product, not the layout itself

*Re-read on 2026-09-23 in [§11.4](#114-sd-1-revisited). The margin holds, and it now holds on both stacks. On this date it held on the web only, because the Apple screen had a per-icon sheet (SD-6).*

**What.** A weight control above a grid of glyph tiles with the name under each is the shape of the SF Symbols app, the Phosphor site, Material Icons and the Font Awesome gallery. Prism's Icons screen has that shape on both stacks. It is the only screen in either app that a reader recognises before reading it.

**Why it is not a copy.** Three reasons, in decreasing strength. First, it is the genre's *only* sensible layout: a set of glyphs at one cut, browsable, is a grid, and copyright does not reach a method of arrangement (ADR-0015's Context: 17 U.S.C. §102(b), *Cofemel*, *BSA*). Second, the screen is a registry table with a picture, not a browser — the affordances that constitute an icon site (search, filter, copy, download, detail page) are all absent, and what is there instead is Prism's registry schema: id, token path, category, tags, the binding the glyph came from, and a `preview` label saying `Icon` is implemented on neither stack. Third, the glyphs themselves are not near anything — they *are* Phosphor's, drawn from `@phosphor-icons/core` 2.1.1 under MIT, entered in `licenses/inventory.json` and covered in `docs/legal-checkpoint.md` §2.3. That is a licence position, and it is satisfied; it is not a reference-distance question and this review does not re-open it.

**What to watch.** The changes that would move this screen *towards* an icon site are all small and all tempting: a search field, a copy-the-name button, a copy-as-SVG button, a category rail, a per-icon page. Each on its own is a convenience; together they are the product. If `Icon` is ever implemented and this screen moves into Components (which the code already anticipates — the preview label *"stops being written the moment `Icon` enters a manifest"*), re-read this finding first.

**Action.** None required. Recorded as a do-not-drift note, and §10 makes an icon-browser affordance an expiry condition.

### SD-2 — The web axis bar is the one piece of chrome that could drift into a recognisable tool

**What.** A strip of labelled global switches above a content column is Storybook's global toolbar, and this repository's gallery *is* Storybook. Today the two are easy to tell apart: Prism's bar has an `auto` position that passes nothing, a resolved line, and a measured verdict on controls that do nothing — and it has **no** viewport control, no zoom, no locale, no background picker, no measure or grid overlay, and no canvas/docs tab pair.

**Why it matters.** Those absences are what the distance is made of, and two of them are things a showcase is often asked for. A viewport/device control is the obvious next feature request for a responsive design system; a canvas/docs tab pair is the obvious next idea for a page that has both a specimen and prose. Adding both would leave a strip of global switches with a viewport picker over a canvas with two tabs, which is Storybook's toolbar described.

**Action.** None required today. If a viewport control is ever added, keep the resolved line and the probe verdicts — they are the part of the bar that is Prism's own — and prefer the container-query framing the shell already uses over a device-name picker.

### SD-3 — This clearance covers plain platform furniture, and Phase 5 is scheduled to remove it

**What.** §4's verdicts rest on a stated fact: the chrome is *not* Prism. `docs/showcase.md` §2 and both About screens say so, because `Sidebar` and `TabBar` are specified and unimplemented and `AdaptiveShell` is a pattern with no implementation. §2 also says *"Phase 5 rebuilds the chrome from real components."*

**Why it matters.** A frame built from `Sidebar`, `TabBar` and `AdaptiveShell` is a Prism **composition** on the most-seen screens of the system, and `AdaptiveShell`'s own summary describes a shell that *"puts a Sidebar beside the content or a row of PillTabs in the TopBar from tablet width, and adds a CommandPalette and a trailing detail region at desktop width"* — which is an inventory the reference consoles also have. The gallery review's **RD-1** makes the same point about pattern example screens: the compositions are the part that has not been built yet, and they are the part rule 3 is about. This review is satisfied for the showcase **as it stands today** and stops being satisfied on that event.

**Action.** §10 states the expiry. The Phase 5 chrome ticket should carry a checkbox for re-running this review before any release that ships it.

### SD-4 — Not a distance matter: in dark, the web app's sticky header is translucent and content scrolls through it — **closed 2026-09-23** by P4-D4 ([§11.6](#116-findings-of-this-re-review))

**What.** `.ds-sc-header` sets `background-color: var(--ds-color-bg-surface)` and nothing paints under it. In light that token resolves to `oklch(1 0 0)` and the header is opaque. In **dark** it resolves to `rgb(255 255 255 / 0.06)`, so the header is a 6 % white film over the page, and the token rows scrolling beneath it are legible through the axis bar on every screen of the app. Measured in the running app on 2026-09-22 at 1280 and at 375 CSS px.

**Why it is recorded here.** It is not a reference-distance problem and it breaks no spec — the header is the showcase's own chrome, not a `Surface`. But it is the same defect as direction-board finding **F9**, whose resolution is a rule: *"Surface always paints `bg.page` under solid, raised and nested"* (ADR-0030 §5.1). The chrome does not go through `Surface`, so nothing enforced it here. A review that looked at every screen in both schemes and said nothing about the one thing wrong with all of them would be worth less.

**Action.** A one-line fix in `web/apps/showcase/src/app.css`: paint `--ds-color-bg-page` under the header (or give `.ds-sc-header` a page-coloured backdrop layer), exactly as ADR-0030 §5.1 has surfaces do. Not taken here — this ticket owns this document — and it is an app-chrome fix that touches no token, no spec and no baseline.

### SD-5 — Not a distance matter: `lint:reference-copy` did not scan `swift/Showcase`, so half of this review's subject had no gate — **closed 2026-09-22**

**What it was.** `SCAN_TARGETS` in `tools/lint/reference-copy.ts` listed `spec`, `tokens`, `brands`, `agent`, `web/packages/*/src`, `web/apps/*`, `swift/Sources`, `swift/Tests`, `gallery`, `docs/research/fonts` and `docs/direction-board` — and **not** `swift/Showcase`. The web showcase was covered through `web/apps/*`; the Apple showcase — 22 tracked files, 24 on disk, including the three generated catalogues that carry every spec string into the app — was scanned by nothing in CI, and the guard's summary line counted **564 files** without them.

**Why it matters.** Not because rule 1 is breached — it is not. For this review the app was scanned by hand, through the module's own `parseDenylist` and `scanSource`, against the same 143-entry denylist: 24 files, **0 findings**. It matters because the introduction of this document offered the guard as the corroborating gate for the apps it clears, and a gate that does not cover the subject is not corroboration. And it matters going forward: a reference string added to `DSIconsScreen.swift` or to a regenerated `DSShowcaseCatalog.swift` tomorrow would pass CI. A hand scan clears a moment; a target clears a branch.

**Action — taken the same day, by the orchestrator rather than a later ticket.** `{ dir: "swift/Showcase", required: false }` is now in `SCAN_TARGETS`, with the reason in a comment beside it, and `tools/lint/reference-copy.test.ts` covers the new target from both sides: a clean Apple catalogue in the clean fixture tree, and a tampered one whose two hits the guard is asserted to report. The guard reports **585 files** (143 denylist entries, exit 0) and **0 findings** — the same answer the hand scan gave, now given by CI on every push.

**Why 585 and not 588.** Adding the target exposed a second, smaller version of the same defect. The walker descended into whatever generated output happened to sit inside a target, so the number it printed depended on what the machine had built: `PrismShowcase.xcodeproj/`, written by `pnpm showcase:apple`, is gitignored and would have been counted on a developer's machine and absent from the fresh checkout CI scans — 588 here, 585 there, for a number three documents were about to quote. `web/apps/vrt/.fixture/`, rebuilt by the VRT server, was one more. Both are now skipped by the walker, like `dist/` and `storybook-static/` before them, and both are packed copies of sources the guard already scans (`swift/Showcase/Sources/`, `web/apps/vrt/fixture/`), so nothing lost a gate. **585 is the tracked tree exactly**, and it is the number CI prints. The move from 564 is therefore the 22 tracked Apple showcase files less the one generated file the guard should never have counted.

It was done here rather than deferred because the gap is one line and the finding's own argument is that a hand scan clears a moment while a target clears a branch. The file count is updated in this introduction, in `reference-distance-gallery.md` §2, in the roadmap rows that quote it and in `docs/legal-checkpoint.md` §5.2.

---

## 9. Coverage

Every screen in both apps. A "screen" is one page shape; where a shape is instanced from data, the instance count is given and the instances are the same shape with different rows.

### Web — `web/apps/showcase`

| Screen | Instances | What it is | Section | Verdict |
|---|---|---|---|---|
| Shell — header, axis bar, rail, content column | 1 (every screen) | the frame, plain CSS over `--ds-*` | §4.1, §4.3 | not a copy |
| Overview | 1 | `This document` facts panel, then `Tokens` (3 numerals), `Components` (4 numerals and a tag) and `Icons` (a count in prose, and a `preview only` tag) | §5.8 | not a copy |
| Foundations — token group | **20** — `color` 94, `material` 52, `type` 22, `space` 20, `motion` 17, `radius` 11, `size` 10, `chart` 9, `gradient` 5, `elevation` 4, `z` 4, `border` 3, `font` 3, `stroke` 3, `icon` 2, `interaction` 2, `opacity` 2, `shadow` 1, `comp` 125, `ref` 175 (564 total) | title, lead, `compare` control, panels of rows | §4.4, §5.1–§5.5 | not a copy |
| Icons | 1 | four cut controls, the weight ladder, 51 registry cards | §5.6 | not a copy; closest call — **SD-1** |
| Components — index | 1 | 57 specs grouped by state, each with its summary | §6 row 13 | not a copy |
| Components — component page | **57** | header, facts, per-platform support, links, and the examples staged (28 across the 4 implemented) | §5.7 | not a copy — see gallery **RD-2** |
| Patterns | 1 index + **3** items | the three contracts, named as having no implementation | §6 row 13 | not a copy |
| About | 1 | what the chrome is, what it reads, what stays elsewhere, the axes | §6 row 13 | not a copy |
| Axis bar expanded (below 900 px) / rail disclosure | states of the shell | the same controls, stacked | §4.1, §4.3 | not a copy |
| `compare` on `colorScheme` / on `density` | a state of a Foundations screen | the same rows in two real nested scopes, side by side | §4.4 | not a copy |

### Apple — `swift/Showcase` (iOS, iPadOS, macOS from one target)

| Screen | Instances | What it is | Section | Verdict |
|---|---|---|---|---|
| Shell — `NavigationSplitView`, sidebar, `DSScreen` toolbar, resolved-context strip | 1 (every screen) | plain SwiftUI; on the Mac also View ▸ Axes (⌘⇧A) | §4.2 | not a copy |
| Sidebar — the six sections | 1 | a `List` of `Label`s with SF Symbols; behind the back chevron on the phone | §4.2 | not a copy |
| Overview | 1 | resolved context, *The system* facts, *Live, not a picture* (4 staged examples), *What this app is* | §5.8 | not a copy |
| Foundations — index | 1 | the 20 groups with counts, by tier (no web equivalent: the rail is the web's index) | §4.4 | not a copy |
| Foundations — token group | **20** (the same 20 as the web) | a prose panel, then the rows | §4.4, §5.1–§5.5 | not a copy |
| Icons | 1 | weight and size `Picker`s, `LazyVGrid` of the 51 entries | §5.6 | not a copy; closest call — **SD-1** |
| Components — index | 1 | 57 specs by layer, each with its state | §6 row 13 | not a copy |
| Components — component page | **57** | summary, facts, Support by platform, then the examples as links | §5.7 | not a copy — see gallery **RD-2** |
| Example page | **28** (the 4 implemented components' spec examples) | the staged example, then *Props, as the spec writes them* | §5.7 | not a copy — see gallery **RD-2** |
| Patterns | 1 index + **3** items | *Contracts with no implementation* | §6 row 13 | not a copy |
| About | 1 | *What the chrome is*, *What it reads* | §6 row 13 | not a copy |
| Axis sheet | 1 | the axes as `Picker`s, grouped by how each applies, with what the probe measured | §4.3 | not a copy |

### Out of scope, with the reason

| Not reviewed | Why |
|---|---|
| The 28 spec examples the component pages stage | Reviewed screen by screen in [reference-distance-gallery.md](reference-distance-gallery.md) §3, where they are the 488 gallery images. Staging them live rather than as PNGs does not change their distance; **RD-2** carries over. |
| The three direction-board screens | Reviewed 2026-09-16 in [README.md § Reference-distance review](README.md#reference-distance-review), signed off with gate P3-0. |
| `gallery/index.html` and its 488 PNGs | The gallery review's subject, 2026-09-22. |
| `web/apps/showcase/dist/` and `PrismShowcase.xcodeproj` | Gitignored build outputs; never in the tree, never an artefact. |
| `watchOS` | Out of scope for the app (`docs/showcase.md` "What this needs that does not exist yet", item 4): the package supports it and the `watch` density is switchable inside the iOS and macOS app, but a watch run is not part of this. The board's watch screen was reviewed on 2026-09-16. |
| The Phosphor glyphs themselves | Third-party assets under MIT, in `licenses/inventory.json` and `docs/legal-checkpoint.md` §2.3. A licence question, answered there; not a composition question. **SD-1** keeps the two apart. |

---

## 10. What this clearance does and does not cover

**It covers** both showcase apps as built and run from `showcase-and-license` on 2026-09-22 — the web shell and its 7 screen shapes over 20 token groups, 57 component pages and 3 patterns; the Apple shell and its 11 screen shapes over the same data plus 28 example pages — and it finds no screen in either that a reasonable person would call a copy of any of the eleven reference shots, or of any well-known showcase of the genre.

**Together with** the gallery review of the same date and the board's review of 2026-09-16, ADR-0015 rule 3 is now satisfied for **every screen that would be public at a release made from this branch**. That is the outstanding item 1 of `docs/legal-checkpoint.md` §5.2, and it is the last of the preconditions it lists that was still open. Whether to set `LEGAL_CHECKPOINT` remains the owner's, and §5.2's item 2 — the residual §4 questions accepted with no counsel — is unchanged by this document.

**It expires on any of these:**

1. **Phase 5 rebuilds the chrome from real components** (`docs/showcase.md` §2; `Sidebar`, `TabBar`, `AdaptiveShell`). The chrome then stops being platform furniture and becomes a Prism composition. **SD-3.**
2. **The Icons screen gains a browser affordance** — search, filter by category, copy-to-clipboard, copy-as-SVG, download, or a per-icon detail page — or `Icon` is implemented and the screen moves into Components. **SD-1.** — **Fired** when P4-2 implemented `Icon` (62a30cf). The Icons screens were re-reviewed on 2026-09-23 in [§11](#11-re-review-of-the-icons-screens--2026-09-23), and their clearance now expires on the conditions in §11.8, not on this one.
3. **The web axis bar gains a viewport/device control or a canvas/docs tab pair.** **SD-2.**
4. **A new staged example composes more than one component** — the first chart example from the data-viz wave, or a pattern example screen. This is the gallery review's **RD-1** condition, and it reaches the showcase too, because the showcase stages whatever the specs carry with no edit of its own.

A new token group, a newly implemented component, a new single-component example or a new brand does **not** expire it: each of those is the same screen shape with different rows, which is the whole design of both apps.

**It is not a legal opinion.** `docs/legal-checkpoint.md` §0 and §4.2 say what that would take and why nobody here can give it. This document says what the screens are and how far they sit from what the research recorded and from what the genre already looks like; it does not say what the owner is permitted to ship.

---

## 11. Re-review of the Icons screens — 2026-09-23

- **Subject.** The Icons screen of `web/apps/showcase` (`src/sections/Icons.tsx`) and of `swift/Showcase` (`Screens/DSIconsScreen.swift`, on the iPhone and the Mac). Reviewed on `main` at `d084a0e` plus the P4-D4 change set, nine files that were still uncommitted in the working tree when this was written. `docs/showcase.md` §2, "The Icons screen", is the design of that change set.
- **Why.** §10 condition 2 fired when P4-2 implemented `Icon` (62a30cf) and both grids began to be drawn by it. From then on, the 2026-09-22 verdict no longer covered these two screens, and `docs/legal-checkpoint.md` §5.2 recorded that the rule 3 review had to be re-run for them before any release that ships them. P4-D4 reconciled the two screens first, so this review reads the final screens once.
- **Format.** The same as §§4–6. Each screen gets what it is, the nearest reference answered twice (§2), the families mixed and what differs, and then the same release question.
- **Rule 1.** No reference image was fetched, screenshotted or stored. The screenshots of Prism's own screens taken for this review stayed in the session scratchpad, outside the repository, and none is committed (`docs/showcase.md` §5).

### 11.1 Method

Both apps were built from the working tree and run. Every value of each of the four controls was opened, and all four set together, in light and dark, at phone and desktop widths:

- **iPhone.** Built with `pnpm showcase:apple --no-launch --work <scratch>` and installed on the iPhone 17 simulator (iOS 26.5). The simulator was already booted and was left as found. Twelve states per scheme were opened with the launch keys P4-D4 added: the top of the screen, the registry, the ladder, `size` sm and md, `weight` display at lg and at sm, `style` outline, filled and duotone, `direction` rtl, and all four set at once (md, display, filled, rtl). That is 24 screenshots. One tile was tapped, and nothing opened.
- **Mac.** Built with `--platform macos`. The same 24 states were opened in the default 1280 × 880 pt window and captured by window id, so no other window could enter a frame. Every launch also passed `-DSShowcaseSection icons`. This Mac's `com.example.prism.showcase` defaults domain holds a persistent `DSShowcaseSection = foundations`, written by an earlier session. The app reads the section key from user defaults before it looks at the section a state key implies, so the persistent value wins. The first pass therefore opened Foundations on 22 of its 24 launches, the two that named the section being the exceptions. That is this machine's state, not the app's: a launch with no stale default opens Icons, as the iPhone did.
- **Web.** Built with Vite into the scratchpad and served with `vite preview`, which is the build a consumer ships. It was driven in Playwright Chromium at **1440** and **375** CSS px, in light and dark, with the colour-scheme axis on `auto` and the scheme emulated. Each width and scheme was opened in ten states: default, sm, md, display, display at sm, outline, filled, duotone, rtl, and all four at once. Each state was opened in a fresh document. That gave 84 screenshots, plus a DOM count per state of cells, tags, links, buttons, inputs and pointer cursors. The rtl reading was also taken from a fresh `vite` dev server (SD-7).
- `Package.resolved` was byte-identical after both Apple builds. In the working tree, this review changed this document, two roadmap rows and one paragraph of `docs/legal-checkpoint.md`, and nothing else.

**What the counts say**, the same on every state, width and scheme:

- 51 cells.
- **0** links, and **0** buttons or focusable elements, inside a cell. **0** cells with a pointer cursor. **0** text inputs on the page.
- 27 `fill: false → outline` tags under `filled`, and none in any other state.
- Under rtl, `dir="rtl"` is on the grid alone.

The web rail's Icons entry has no sub-items, and the route ignores anything after `#/icons`, so no URL names an entry. On Apple, no tile is a `Button` or carries a gesture, a tap does nothing, and no launch key names an entry.

### 11.2 The web Icons screen

- **What it is.** From the top:
  - A title and a one-line lead: the entry count and the vendor package.
  - A panel tagged `Icon`. It says that every glyph below is `Icon` with `tone: primary`, at the axes set here; that the spec examples are on Components; that the ladder is registry data; and that *"nothing here acts on one icon: a cell is the registry's row with a picture"*.
  - *Icon's axes*: four segmented rows. `size` offers sm · 16px, md · 20px and lg · 24px. `weight` offers control · icon.weight and display · icon.weight-display. `style` offers entry default, outline, filled and duotone. `direction` offers ltr and rtl. Under them is one note per axis, with counts taken from the registry: 27 of 51 entries are `fill: false`, 6 are marked `rtlMirror`, and the flip count is measured.
  - *The registry*: 51 cards. At 1440 px they are five across, each 208 × 200 px, with a 12 px gap, an 8 px radius, a 6 % ink tint and no border. At 375 px there is one per row. Each card has a 24 px glyph centred at the top. Under it, left-aligned, are the id in bold mono, the token path, the categories, the tags, and one mono line with the default style, the Phosphor binding and the `fill: false` and `mirrors in rtl` marks.
  - *Registry data: the ladder*: `action.add` at six rungs, four boxes and three styles, tagged `registry`.
- **Nearest reference (of the eleven).** Still no icon library. The nearest single move is the factor grid of the finance monitor desktop 27597487: six white cards at a 12 px gutter, each opened by an icon row with a title under it.
  - What the two share: equal cards on a 12 px gutter, with an icon above a word.
  - Where the cards differ: the factor card is a metric card. Its middle is empty by design. It has a 40 px ring icon at the leading edge, a solid arrow button at the trailing edge, a numeral at the bottom left and a mini-chart at the bottom right, at a 28 px radius. The registry card has a 24 px glyph centred at the top. It has no numeral, no chart and no arrow, and no empty middle, because it is full of text. Its radius is 8 px, on a tint.
  - A grid of equal cards is an arrangement, not an expression.
- **Nearest icon browser of the genre (from recollection).** The **Phosphor** site, which publishes the glyph set this screen draws. Its page has a search field, a weight menu that treats fill and duotone as weights, a size slider and a colour picker, above a grid of named glyph tiles. Clicking a tile opens a panel for copying the name, the SVG or a code snippet, or for downloading the glyph. Material Symbols and Lucide's customiser are the same shape. Material Symbols has a filter rail (fill, weight, grade and optical size), a search, a grid, and a side panel with code and downloads.
- **Families mixed.** The genre's grid and its customiser row (weight, style, size); the finance monitor 27597487's card grid, as a single move; and Prism's registry schema and measured notes. No reference family is mixed in.
- **What differs.**
  - Everything the genre does *to one glyph* is absent. There is no search, no filter or category rail, no selection, no copy, no download, no detail panel and no URL per glyph.
  - The customiser's ranges are `Icon`'s props, not the vendor's. There are two weights, named by their tokens, where Phosphor offers six. There are three boxes, named by their sizes, where Phosphor offers a slider. There is no colour control.
  - Two controls have no counterpart in the genre as this reviewer recalls it. *Entry default* passes each registry entry's own `defaultStyle`. The direction switch changes the grid, and the screen measures and prints what it did.
  - The notes say what a control fails to do as plainly as what it does. The 27 entries that do not change under `filled` are tagged. Duotone is each stack's own drawing and has not been audited. The flip count under rtl is measured, and tagged `warn` when it falls short (SD-7).
  - A card leads with Prism's id. The vendor's name comes last, on the fifth line, after the token path, the categories and the tags.
  - At 375 px the grid is a single column of these cards: a list of registry rows with a glyph at the top of each. That is further from the genre than the desktop layout.
- **What changed since 2026-09-22.** Only ranges and labels.
  - On 2026-09-22 the screen already had four controls: weight (six rungs), style (including each entry's default), box (four sizes) and direction. Its cards already carried the id, the token path, the category, the tags, the default style and the Phosphor name (§5.6).
  - Since then, `Icon` draws the grid. The ranges shrank to `Icon`'s props, and the six rungs and four boxes moved into the labelled ladder. The `preview` tag gave way to the `Icon` tag and the "nothing here acts on one icon" sentence. The `fill: false` tag and the notes were added.
- **Verdict.** **Not a copy.** As on 2026-09-22, the screen has the genre's layout and none of the genre's per-glyph affordances.

### 11.3 The Apple Icons screen — iPhone and Mac

- **What it is.** One `DSScreen` on both devices:
  - The resolved-context strip.
  - A block headed *"51 registry entries, each drawn by Icon"*, whose note is the web panel's text, nearly word for word.
  - *Icon's axes*: four segmented `Picker`s under their names, with the three axis notes under them. Size offers sm · 16 pt, md · 20 pt and lg · 24 pt. Weight offers control and display. Style offers entry default, outline, filled and duotone. Direction offers ltr and rtl.
  - *The registry*: two tiles across on the iPhone, seven across in the Mac window beside the sidebar. A tile is a rounded rectangle at `radius.tile` (16 pt) on `bg.surface`, with a hairline border. It has a 48 pt glyph row with `DSIcon` centred in it. Under that, left-aligned and kept left to right under rtl, are the id, the label key, the tags, and one line with the default style, the binding and the marks. The binding is an SF Symbol name, or an image set for the two trend entries that Phosphor draws. The Apple app is an Apple user interface, which is where ADR-0013 rule 5 lets such a name appear.
  - The ladder: `action.add` at six rungs, four boxes and three styles. Each is labelled with what the binding draws: *plain symbol*, *fill variant*, *hierarchical*, or *…: no filled drawing*.
- **Nearest reference (of the eleven).** None as a composition. There are two single moves:
  - **On the Mac**, the factor grid of the finance monitor 27597487, as for the web, with the same differences.
  - **On the iPhone**, the two-column tiles of the bottle tracker 27699907. Among them is the one tile in the reference set that is a glyph on a tile: its clear-glass add tile, a `+` alone in a capsule. The registry's first entry is also `action.add`, a `+` at the top of a tile, so the resemblance needs ruling out. The reference tile is glass. It is a capsule whose corner radius is about 48 % of its height. It is a control, and one of four tiles that fill a viewport, beside vivid gradient tiles with dot-matrix numerals, delta pills and sparklines. The registry tile is an opaque rectangle at 16 pt. It is inert, one of 51 in a scrolling list, with a small glyph over four lines of text. A `+` is nobody's expression.
- **Nearest icon browser of the genre (from recollection).** Apple's **SF Symbols** app. The Mac view is now the closest single view in either app: a sidebar, a title bar, and a grid of Apple's own symbols with their names printed on the tiles, under a weight control and a style control. The app itself has a sidebar of symbol categories and collections, and a toolbar with a search field, a weight menu and a rendering-mode control. Its grid shows symbols in square wells with one name under each, and an inspector shows the selected symbol. A symbol can be selected, copied and exported.
- **Families mixed.** The genre's grid and customiser; Apple's split view (§4.2); and Prism's registry schema. No reference family is mixed in.
- **What differs.**
  - The sidebar is the app's six sections, the same on every screen. It is not a list of categories or collections, and it filters nothing.
  - There is no search field, no selection, no inspector, no copy and no export.
  - The controls sit in the page, each under its name with a note, not in a toolbar.
  - A tile is not a well with one name under the glyph. It leads with Prism's id and carries three more lines, with the vendor's name on the last.
  - There are 51 entries in registry order, not thousands grouped by category.
  - The screen opens with the resolved-context strip, as every Apple screen does (§4.2).
- **What changed since 2026-09-22.** This is the one screen that moved both ways.
  - Towards the genre: the Apple screen gained `style` and `direction` pickers, so both stacks now carry the genre's customiser trio of size, weight and style. And each tile now prints its binding, which on this stack is Apple's own name for the symbol.
  - Away from the genre: the per-icon detail sheet is gone (SD-6). No tile is a button, no launch key names an entry, and the facts the sheet held are now on every tile. The weight and size pickers shrank from the registry's six rungs and four boxes to `Icon`'s two weights and three sizes, and the rest moved into the labelled ladder.
- **Verdict.** **Not a copy**, on the iPhone or on the Mac. The Mac view is the closest either app comes to a well-known product: it has the genre's silhouette and none of that product's parts.

### 11.4 SD-1, revisited

SD-1 cleared Icons as "a registry table with a picture": no search, filter, copy, download or detail page. It recorded the layout as the genre's own, and it made an icon-browser affordance an expiry condition. Four things have changed since.

1. **`Icon` draws the glyphs.** The screens are now compositions of a Prism component, which is what rule 3 is about. The glyphs are the same vendor drawings as before: SF Symbols through `DSIcon` on Apple, Phosphor through `Icon` on the web, now at `Icon`'s boxes and weights. On its own, this moves no distance, because the layout and the glyphs are what they were. It does retire one of SD-1's reasons, the `preview` label. On both stacks, the lead's *"nothing here acts on one icon"* now says what the screen is instead.
2. **The controls.** The web's four controls were cleared on 2026-09-22 and have only narrowed since. The Apple screen gained `style` and `direction`.
   - `style` is one of the genre's customiser controls. Phosphor's weight menu includes fill and duotone, and the SF Symbols app has rendering modes and fill variants. On Apple this is a real step towards the genre's toolbar.
   - `direction` has no counterpart in the genre, as recalled.
   - P4-D4 argued that each is one of `Icon`'s own axes, sets the whole grid at once, and neither finds, selects nor exports an entry. That argument is right, and it is the line SD-1 already drew: SD-1 listed what acts on *one* glyph, not what re-renders all of them.
3. **The Apple detail sheet.** It was there on 2026-09-22, so SD-1's premise was wrong for Apple on that day (SD-6). It is gone. The margin SD-1 describes now exists on both stacks for the first time.
4. **The tiles.** The Apple tile went from a glyph over its id to a glyph over the registry row. That row includes the vendor's name for the glyph, which is the one line of the tile that is the genre's own caption. The web card already carried it. Neither tile leads with it.

**Does the margin hold? Yes, and on firmer ground than on 2026-09-22.** Every affordance SD-1 names is absent from both stacks: search, filter, copy, copy-as-SVG, download and a per-icon page. That was not true of Apple on 2026-09-22, and §11.1's counts and the tap on the iPhone show it for every state rather than asserting it. The control row is where the margin is thinner: it is now the genre's customiser on both stacks. So the distance no longer rests on the controls at all. It rests only on the fact that nothing acts on one entry. That margin is narrower, but nothing sits inside it, so no restoration is needed. §11.8 lists what would narrow it further.

### 11.5 Is either screen close enough to one product that a reasonable person would call it a copy?

| # | Screen | Copy? | Why | What would have to change |
|---|---|---|---|---|
| 14 | Web Icons, 1440 and 375 px (§11.2) | **No** | The genre's layout, cleared on 2026-09-22, now with narrower controls. No per-glyph affordance. Cards lead with Prism's id and carry the registry row. At 375 px the grid is a single column of registry rows. | Nothing, before a release. |
| 15 | Apple Icons, iPhone (§11.3) | **No** | Registry tiles two across in a split view. No reference tile is near: the one glyph-on-a-tile in the set is a glass capsule control. The per-icon sheet is gone. | Nothing, before a release. |
| 16 | Apple Icons, Mac (§11.3) | **No — and the closest single view in either app** | It has the SF Symbols app's silhouette: a sidebar, a grid of Apple's symbols with their names, and weight and style controls. It has none of that app's parts: no category sidebar, search, selection, inspector, copy or export. Its tiles are text-heavy and led by Prism's id. | Nothing, before a release. If the owner ever wants more room, the cheap change is to draw the registry block as the table SD-1 already calls it: one row per entry, with the glyph, id, label key, tags, default style, binding and marks as columns. That removes the genre's layout, not just its affordances, and moves no token, spec or baseline. |

Rows 14–16 continue §6's numbering. §6 row 10 is superseded by them.

### 11.6 Findings of this re-review

#### SD-6 — Correction: on 2026-09-22 the Apple Icons screen had a per-icon page, and this review said it had none

**What.** At 0ee722a, `DSIconsScreen` made every tile a `Button`. The button opened `DSIconDetail` in a sheet for that one entry, showing the registry's six-rung ladder, its four boxes and its facts. `swift/Showcase/README.md` also documented a `-DSShowcaseIcon` launch key that opened the sheet. Yet §5.6 and SD-1 described the screen as having "no per-icon detail page", and §6 row 10 as having "no detail page". The method in §3 opened Icons with the section key only. It never tapped a tile and never used that key.

**Why it matters.** On the day of the clearance, SD-1's margin was one affordance short on Apple, so the Apple half of the 2026-09-22 Icons verdict rested on a false premise. That changes nothing that has shipped: P4-D4 removed the sheet and the key, and no release has been made (`docs/legal-checkpoint.md` §3.2).

**Action.** Taken by P4-D4. This re-review tapped a tile on the iPhone, and read both stacks' sources for any gesture, button, link, route or launch key that names an entry (§11.1). The lesson for the next reviewer: open every launch key a screen documents, and touch what looks touchable.

#### SD-7 — Not a distance matter: what the web's direction note measures depends on how the app is served

**What.** Under rtl, measured the same way on 2026-09-23, the note reads **0 of 6** flipped in the Vite build and **6 of 6** under a fresh `vite` dev server.

**Why.** `Glyph.css` writes `:dir(rtl)`. The dev server passes that selector through, and Chromium matches it. A build that targets Prism's Chrome 111 floor lowers it to `:lang()` selectors, which a `dir` attribute on its own never matches (`docs/showcase.md` §2, "The Icons screen"). So a reader running `pnpm showcase` sees an `ok` tag, a reader of the built app sees a `warn` tag, and both tags are true.

**Whose.** The defect belongs to `@iiiivaska/prism-react`: Icon.yaml behavior 11 fails on the web for a consumer that targets the floor and sets only `dir`. `Text.css` uses the same selector for its fade.

**Distance.** None. Mirrored or not, the grid is the same grid.

#### SD-4 — closed by P4-D4

`.ds-sc-header` now paints `--ds-color-bg-page` under a `--ds-color-bg-surface` layer (`web/apps/showcase/src/app.css`), as ADR-0030 §5.1 has a surface do. Read off the running build in dark, the header is `background-color: oklch(0.164 0.0065 271)` under a `rgba(255, 255, 255, 0.06)` gradient. At 1440 and 375 px, on every state opened, the grid scrolls under an opaque header.

#### SD-8 — Outside this re-review, and flagged: §10 condition 4 may have fired with P4-4

**What.** Condition 4 expires this document's clearance when a staged example composes more than one component. `IconButton.yaml`'s `with-badge` example is a secondary icon button with the notification glyph and a count Badge of 3 at its top-trailing corner. It composes `IconButton`, `Icon` and `Badge`, and both apps stage it with no edit of their own, because they stage every example of an implemented component.

**Why it matters.** A notification glyph in a round button with a count is also part of the header tools cluster that §4.1 recorded as absent from the chrome ("no bell").

**Scope.** This re-review covers the Icons screens only. It did not open the IconButton page, so it gives no verdict on it. Until someone does, this document's clearance does not cover that page. The same reviewer should also read the gallery review's condition for an example that composes more than one part (`reference-distance-gallery.md` §8).

### 11.7 Coverage

| Screen | Where | States opened | Section | Verdict |
|---|---|---|---|---|
| Icons, web | a Vite build (the `pnpm showcase:build` build, written to the scratchpad) served by `vite preview`, in Chromium | 10 states × 1440 / 375 px × light / dark; the rtl reading also under `vite` dev | §11.2 | not a copy |
| Icons, Apple, iPhone | iPhone 17, iOS 26.5 | 12 states × light / dark; one tile tapped | §11.3 | not a copy |
| Icons, Apple, Mac | `--platform macos`, 1280 × 880 pt window | 12 states × light / dark | §11.3 | not a copy; the closest single view in either app |

Out of scope, with the reason:

- **The `Icon` component page on Components**, which stages Icon's eleven spec examples. A newly implemented component does not expire this document (§10, last paragraph), and those are single-component examples.
- **Every other screen of both apps.** They are covered by §§4–9 on the conditions in §10, which this section does not re-read. See SD-8 for one condition that may have fired.
- **The glyphs themselves.** As in §9, they are a licence question and not a composition question.

### 11.8 What the Icons clearance covers, and when it expires

**It covers** the Icons screen of both apps as built on 2026-09-23 from `main` at `d084a0e` plus the P4-D4 change set: the web at 1440 and 375 px, Apple on the iPhone 17 (iOS 26.5) and on the Mac, in light and dark, in every state of the four controls. It finds neither screen a copy of any of the eleven reference shots, or of a well-known icon browser of the genre.

**The rule 3 precondition is met again for the Icons screens.** A release that ships these two screens as reviewed now carries a reference-distance review of them, which closes the gap §10 condition 2 opened. This section does not re-read the rest of this document. Rule 3 asks for that before every release, and SD-8 names one of §10's conditions that may have fired.

**The Icons clearance expires on any of these.** For these two screens, they replace §10 condition 2.

1. **Either screen gains anything that acts on one entry**: a search field, a filter or category rail, selection, copying a name, glyph, SVG or code, a download or export, favourites, or a per-entry page, sheet, popover or inspector. A URL, route or launch argument that names an entry counts too. This is SD-1's list, plus the routes by which SD-6 slipped through.
2. **The ladder follows a chosen entry** instead of the registry's first entry, or any tile becomes interactive. A ladder that follows a selection is the sheet back, as an inspector.
3. **Either screen gains a control**, or the two screens stop having the same controls. This includes a fifth of `Icon`'s own axes, such as `tone`: a colour control is the last of the genre's customiser controls these screens lack.
4. **A tile loses its registry row, or leads with the vendor's name for its glyph.** A glyph over one vendor name is the genre's tile.
5. **§10 condition 1**: the chrome is rebuilt from `Sidebar`, `TabBar` and `AdaptiveShell`. On the Mac, that puts a Prism sidebar beside this grid.

**It does not expire** when a registry entry is added, removed or re-bound, when a note is reworded, when SD-7 is fixed and the note reads 6 of 6 in a build, or when a brand, scheme or density is added.

**It is not a legal opinion**, for the reasons §10 gives.
