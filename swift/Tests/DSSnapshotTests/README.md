# DSSnapshotTests

The SwiftUI half of roadmap P3-3's acceptance: a snapshot of every spec example of Surface, Text, Button, Card,
Divider, Icon, Badge and IconButton across the accessibility matrix, the equal-width figures of ADR-0021 §5 as assertions, and **every check that reads a
component's pixels back** — because this is the target that runs where a Prism view really rasterizes.

| File | What it holds |
|------|---------------|
| `DSSnapshotMatrix.swift` | The matrix, the file names it produces, and the check that no baseline is stale. Runs on the host too. |
| `DSExampleSnapshotTests.swift` | The renders, the comparison, the forced conditions and the check that they reach a render. iOS only (`#if os(iOS)`). |
| `DSRenderCapability.swift` | The probe every pixel read asks first: can this process rasterize a Prism view at all? All platforms. |
| `DSSurfaceRenderTests.swift` | What a Surface draws: the glass fallback, selection, and the whole bloom. iOS only. |
| `DSSurfaceChipRenderTests.swift` | What the Surface module's glass chip draws (ADR-0036 §6, rules 4 and 7): over ADR-0036 F2's stripe fixture its in-bounds mirror reads the reflection model within a stated tolerance that tells it apart from the clamp and transparency models, with Surface's bleed reading the clamp model as the control; before the blur, the crop is mirrored about every edge and corner until the band is covered, pixel for pixel; and its fallback paints `color.bg.surface.raised` over `color.bg.page` in both schemes. No component draws a chip yet, so it adds no baseline. iOS only. |
| `DSButtonRenderTests.swift` | What a Button draws: the ghost pill's missing rest fill, the disabled dim. iOS only. |
| `DSButtonReduceMotionTests.swift` | That the Reduce Motion press substitute is visible (ADR-0023 §8.4). iOS only. |
| `DSCardSimulatorPixelTests.swift` | What a Card draws for the Card.yaml v5 readings, read back as pixels: the open glyph of a card with no handler, that glyph centred in the `action.size` box at the padding corner (behavior 14), the tint over the page, the custom disc's fill per published material. iOS only. |
| `DSTextFiguresRenderTests.swift` | That `numeric: tabular` renders at the role's own weight (ADR-0021 §5). iOS only. |
| `DSDividerAccessibilityTreeTests.swift` | What a Divider publishes to VoiceOver, read off UIKit's accessibility tree rather than a render: no element for any example or either value of `isDecorative` (Divider.yaml `notes.platform.ios`), with controls that an unnamed element is found. It turns on the accessibility runtime's automation mode for each walk and restores it; a runtime without that switch skips the suite with the reason instead of failing it. iOS only. |
| `DSIconAccessibilityTreeTests.swift` | What an Icon publishes to VoiceOver, read off the same tree with Divider's walk: `named-standalone` is one image named "Locked for editing", byte for byte the web's, and every other example, a glyph with no `label` and a labelled one marked decorative are no element, so an SF Symbol's own name never leaks. It also holds Button's and Card's trees, whose glyphs `DSIcon` now draws, to one element per control. Skipped with the reason where the runtime has no automation switch. iOS only. |
| `DSBadgeAccessibilityTreeTests.swift` | What a Badge publishes to VoiceOver, read off the same tree with Divider's walk: every example is one element with no trait Badge adds, named byte for byte as the web names it (`128 open incidents` for the badge that draws `99+`), and a badge with no label, a blank label, a hidden count or a host that reads it is no element; a badge speaks the app's `strings.Badge.count` template, not a constant. Skipped with the reason where the runtime has no automation switch. iOS only. |
| `DSIconButtonAccessibilityTreeTests.swift` | What an IconButton publishes to VoiceOver, read off the same tree with Divider's walk: every example is one button named by its `label` byte for byte as the web names it (the Cyrillic `label-ru` included), with no hint — no tooltip substitute reads the name twice — the selected trait exactly on `selected-in-group`, not-enabled exactly on `disabled`, and for `with-badge` the badge's contribution, `3 unread`, as its value, in the app's `strings.Badge.count` template and the environment's locale; the glyph and the badge are never elements. Skipped with the reason where the runtime has no automation switch. iOS only. |
| `DSIconButtonRenderTests.swift` | Where an IconButton draws its badge: `space.1` above the circle and past its trailing edge (its leading edge under right to left), a `size.icon.md` square, and the circle's own box unchanged by it, in compact and regular. iOS only. |
| `DSIconButtonReduceMotionTests.swift` | That an IconButton's press is visible under Reduce Motion for every variant and a selected circle, with the primary and selected overlay's known gap held as a known issue; and that the primary and danger pressed overlay shows on every press, not only under Reduce Motion. iOS only. |
| `DSIconBoxTests.swift` | What an Icon draws: every registry glyph, in every box, at `control` and at `display` in the `lg` box, standard and under Bold Text, draws no ink outside its box (Icon.yaml anatomy); `display` below `lg` draws the `control` cut's pixels (behavior 3); Bold Text and `filled` change the drawing. iOS only. |
| `DSTextEqualWidthTests.swift` | ADR-0021 §5 as widths, not images. Runs on the host and on the simulator. |
| `__Snapshots__/` | The baselines, and `provenance.json`, which says what recorded them. |

## Why the pixel suites live here

Every Prism colour is a catalog entry — `DSColorToken.color(_:)` is `Color("<brand>/<token>", bundle: .module)`,
resolved out of the generated `Colors.xcassets`. `xcodebuild` compiles that catalog with actool, so a simulator run
resolves every name. **`swift test` under SwiftPM's legacy build system copies the catalog uncompiled**, without an
`Assets.car`, and every one of those names then resolves to nothing and paints clear. `ColorCatalogTests` skips
DSTokensTests for exactly this reason, in exactly those words.

Layout, body evaluation and the image's size survive that intact: a `GeometryReader` probe still reports the right
width, an environment probe still sees the right context, and `ImageRenderer.cgImage` still returns a correctly sized
image. Only the pixels are missing. That is what makes it dangerous — **two blank renders compare equal**, so a test
that asserts two things look alike passes on two empty images, and only a test that asserts two things *differ* fails.
Before P3-5 these suites lived in DSComponentsTests and ran under `swift test`: on a Mac whose Xcode compiles the
catalog they passed, and on CI half of them failed for the environment while the other half passed on nothing.

So they moved to the target that runs on the pinned simulator, behind `#if os(iOS)`, and each pixel test calls
`DSRenderCapability.requireRasterizing()` before it reads anything. The probe renders two known token colours and
reads them back: a process that can rasterize returns both **opaque** and returns them **different from each other**;
a process whose catalog is missing returns transparent black for both. A blank raster therefore fails loudly, naming
what the probe saw, instead of being scored as a passing comparison.

What stayed in DSComponentsTests is everything that needs no rasterizer and is faster without one: the bindings (which
token cell a variant takes), the geometry maths, the contracts against the specs, and the two suites that drive an
`ImageRenderer` only to read an environment value back out of it (`descendantsReadThePublishedMaterial`,
`DSCardPublishedContextHostTests`) — they read no pixels, so a blank raster cannot fool them. Card therefore has two
render-driven suites, and each name says where it runs and what it reads: `DSCardSimulatorPixelTests` here reads
pixels on the simulator, and `DSCardPublishedContextHostTests` in DSComponentsTests reads the `DSSurfaceContext` a
card publishes, on the host. (Both were called `DSCardRenderTests` until the P3-4 review round, one in each target,
and this page described the two of them under that one name, with the table's line and this paragraph's line
contradicting each other.)

`DSTextEqualWidthTests.boldTextReachesTheTextRoute` is the one pixel read that could not move: on macOS, which has no
Dynamic Type, its ink measurement is the only evidence that a forced condition reaches the text route at all. It runs
in both places and carries the probe as a condition trait, so a host that cannot rasterize **skips** it with a message
naming the reason and the simulator command, rather than failing for the environment or measuring 0 on both sides.

The examples themselves are `DSExamples` in `DSComponents` (`Sources/DSComponents/Examples`), the same values the
`#Preview` blocks show, so a preview and its baseline cannot drift apart.

## The matrix

Every example renders in the schemes its spec declares (both unless it declares `schemes`) × `regular` and `compact`
density × the standard state and Increase Contrast, plus:

- forced **Reduce Transparency** for every example that renders glass, and
- forced **Bold Text** for every Text and Icon example — the components whose spec states a Bold Text rendering rule
  (`DSSnapshotMatrix.boldTextComponents`).

| Component | Examples | Baselines |
|-----------|---------:|----------:|
| Surface | 8 (3 glass) | 8×8 + 3×4 = **76** |
| Text | 6 (1 glass) | 6×8 + 1×4 + 6×4 = **76** |
| Button | 7 | 7×8 = **56** |
| Card | 7 (2 glass, 1 light-only) | 6×8 + 1×4 + 2×4 = **60** |
| Divider | 6 (1 glass) | 6×8 + 1×4 = **52** |
| Icon | 11 (2 glass) | 11×8 + 11×4 + 2×4 = **140** |
| Badge | 10 (1 glass) | 10×8 + 1×4 = **84** |
| IconButton | 12 (1 glass) | 12×8 + 1×4 = **100** |
| | **67** | **644** |

`DSSnapshotMatrixTests.theMatrixHasTheExpectedSizeAndUniqueNames` holds that 644, so adding an example is a deliberate
change to this file and not a silent one. `theMatrixCoversEveryComponentTheManifestImplementsOnIOS` holds the
hand-written `DSSnapshotMatrix.components` to the components `DSComponentsManifest` implements on iOS, so a component
cannot land in the manifest without being snapshotted. Both tests run in the host `swift test`, which CI runs before
the simulator step. If either one fails, the snapshot step and the hand-back after it are skipped. So move the count
and the list in the commit that adds the component.

Every accessibility state is forced through DSCore's `dsAccessibilityPolicy` override **and** through SwiftUI's own
environment values, so a run reads nothing from the simulator's Settings and one machine's Settings cannot change
another's baselines. `DSSnapshotConditions` is the one place both channels are written.

Writing SwiftUI's own values needs three underscored environment keys — `_colorSchemeContrast`,
`_accessibilityReduceTransparency` and `_accessibilityReduceMotion` — because the public keys are get-only. They are
SPI: they work on Xcode 27 and on the iOS 26.5 runtime, and a toolchain may rename one or change what it means. That
is exactly the axis the baselines are pinned on, so `theForcedConditionsReachTheRender` renders a probe under
`DSSnapshotConditions` and reads the **public** values back out of it, for all sixteen scheme × density ×
accessibility combinations, together with the `DSTokenContext` DSCore derives at the same point. A toolchain that
drops one of the keys fails there — before an image is written — instead of quietly recording the standard-state
images under accessibility names.

## Naming

```
__Snapshots__/<Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png
```

One rule, both stacks (`spec/SCHEMA.md`, "Examples and snapshots"; P3-5, critic C-25). `<platform>` is the **spec
platform key of the target that rasterized the image**: these baselines are iPhone 17 renders, so every one of them is
`ios`, and the web records the same examples as `web-desktop` and `web-touch`. `<scheme>` is `light` or `dark`,
`<density>` `regular` or `compact`, and `<variant>` — `increased-contrast`, `reduce-transparency` or `bold-text` — is
absent in the standard state.

So a pair is found by name alone: `Button/primary-md.ios.light.regular.png` beside
`Button/primary-md.web-desktop.light.regular.png`. `tools/gallery` collects both sets by that name and builds
`gallery/index.html`; nothing here writes a second copy of an image for the gallery, and the platform key is the one
the parity report's column carries, so a gallery column links to its cell.

A future macOS or watchOS snapshot set is `macos` or `watchos` beside these, and needs no rename: that is why the
segment is a platform key and not the stack name `apple`, which claimed four platforms for one iPhone render.

## Rendering

Everything that reaches a pixel is pinned here, not taken from the machine:

| Pin | Value | Why |
|-----|-------|-----|
| Device | iPhone 17, iOS 26.5 | The one destination CI and this repository record on. |
| Width | 402 pt | iPhone 17's portrait width: an example lays out inside the phone's width and no wider. |
| Height | the example's own | Snapshots are tight, so a height change is a diff and not a band of empty page. |
| Scale | 1 | What the web baselines are captured at (`deviceScaleFactor: 1`), so a P3-5 pair compares like for like. |
| Dynamic Type | Large | The reference size; the accessibility sizes are the equal-width suite's job, not another copy of the matrix. |
| Locale, time zone, calendar | `en_US`, UTC, Gregorian | No example of the snapshotted specs declares a locale. The one date on screen (Card `glass-vehicle`) is literal text from the spec, not a formatted date, so it does not move with the locale. |
| Layout direction | left-to-right | |

A render is repeated until two passes in a row are identical (up to four): a Surface sizes its backdrop copy and its
blur from geometry it measures on the first pass. Every example of this matrix settles after one.

## Tolerance

`precision: 1`, `perceptualPrecision: 0.97` — every pixel is compared, and each may differ by at most a CIE ΔE of 3.

Measured on this matrix by shifting every channel of one baseline by a fixed number of 8-bit code values:

| Ground | Absorbed | Fails from |
|--------|---------:|-----------:|
| near-black ink (Button `primary-md`) | 2/255 | 3/255 (ΔE 3.90) |
| light page (Text `title-two-tone`) | 3/255 | 4/255 (ΔE 3.90) |

A code value costs more ΔE the darker the ground: one value on near-black already measures ΔE 2.03, which is why the
tighter `0.98` this started at rejected a one-value difference on more than a third of the matrix. 0.97 absorbs one
code value everywhere and fails from about three.

Why not tighter, and why `precision` stays at 1:

- The renders are a pure function of the view and the pins above. Two runs, and two different simulator devices on the
  same runtime, produce **byte-identical** images (checked: iPhone 17 and iPhone 17 Pro, 268 for 268). The tolerance is
  not covering up flakiness here; it is head-room for a different host GPU rasterizing the same blur.
- Lowering `precision` instead would let a *share* of pixels differ by any amount, which is exactly how a moved edge or
  a dropped layer hides. Keeping it at 1 and spending the head-room per pixel means every pixel is still checked.
- What 0.97 gives up is a uniform shift of one or two code values — a token color changing in its last digit. That is
  not what pixels are good at catching anyway: token values are checked in value space, exactly, by `DSTokensTests`
  (generated token parity, the color catalog, gradient samples within 1/255) and by `tools/contrast`.

A failing comparison writes the reference, the failure and the difference image to `DS_SNAPSHOT_ARTIFACTS` (default:
the simulator's temporary directory) and names the path in the failure message.

## Provenance

A SwiftUI render is reproducible inside one toolchain and one simulator runtime, not across them. `__Snapshots__` is
therefore stamped with what recorded it:

```json
{ "device": "iPhone 17", "os": "26.5", "xcode": "26H…", "sdk": "iphonesimulator26.…",
  "scale": "1.0", "width": "402.0", "locale": "en_US", "timeZone": "GMT" }
```

`xcode` and `sdk` come from the test bundle's `Info.plist` (`DTXcodeBuild`, `DTSDKName`), which xcodebuild fills in. A
run whose stamp differs from the recorded one fails **once**, naming the fields that differ, instead of reporting a
pixel diff per image for a reason that is not the code.

**Record the baselines with the Xcode `XCODE_VERSION` pins in `.github/workflows/ci.yml` (26.6).** Since 2026-09-15 the
owner's Mac has only Xcode 27.0 while CI pins 26.6 (docs/roadmap.md, "Xcode 27 lane"), so a set recorded locally today
is not the set CI can compare against: locally recorded baselines stamp `iphonesimulator27.0`. Until that lane lands,
the committed set is the one CI records — and that holds for every baseline, not only for the first set. While
`__Snapshots__` holds no PNG the `snapshots` gate in `ci.yml` is closed and the apple job records the whole set; once a
set is committed the gate is open and the job compares, and an example whose baseline is **missing** — a new
component's, a new example's, a new variant's — is recorded by the `!exists` branch of `verify` and fails on its own.
Either way the job stages exactly the files that were in no commit, uploads them as `snapshot-baselines-apple` and
fails, so that someone reviews the images and commits them; the run after that compares. A baseline that *exists* and
differs is never written over by a comparing run, so it can never reach that artifact: it fails as a regression, and the
reference, failure and difference images of every failed comparison come back as `snapshot-diffs-apple`. Deleting the
baseline does not get a changed render into that artifact either. `.github/scripts/baseline-handback.sh` looks every
recorded path up in the commit the change is measured against, and it refuses the hand-back when a path is there. That
commit bounds what it sees: a baseline deleted by an earlier push, and a baseline renamed with its example, still reach
the artifact labelled as new, with the run red and the deletion in review, and the script's header ("Two known
limits") gives the two `git log` commands that catch both before a hand-back is committed. To keep a set of your own in
the meantime, use `DS_SNAPSHOT_DIR` (below); it carries its own stamp and does not touch `__Snapshots__`.

## Changing a committed baseline on purpose

A change that moves what a component draws — a new glyph path, a token that moves a pixel — fails its comparison on
both stacks, and that is the mechanism working: a comparing run never writes over a committed baseline, and the
hand-back refuses a baseline that was written over, or deleted and recorded again. Each stack therefore has one
sanctioned re-record, a `workflow_dispatch` input of `ci` named for the artifact it hands back, and it is the only way a
committed baseline changes. Neither is reachable from a push or a pull request: the inputs exist only on a dispatch,
and both default to off.

| Stack | Dispatch `ci` with | Artifact | Unpack it over |
|-------|--------------------|----------|----------------|
| Apple (SwiftUI) | `update-snapshot-baselines-apple` | `snapshot-baselines-apple` | `swift/Tests/DSSnapshotTests/__Snapshots__/` |
| Web (Playwright) | `update-vrt-baselines` | `vrt-baselines` | `web/apps/vrt/baselines/linux/` |

The loop is the same on both:

1. Push the change. Its run compares and goes red on exactly the images that moved; `snapshot-diffs-apple` and
   `vrt-diffs` hold the reference, the failure and the difference of each. Look at them there first: this is the moment
   anyone reviews those pixels with a reason to.
2. Dispatch `ci` on the same ref with the stack's input, from the Actions tab or with
   `gh workflow run ci.yml --ref <branch> -f update-snapshot-baselines-apple=true` (or `-f update-vrt-baselines=true`;
   both at once is fine). The job records its whole folder over the committed set — the apple job with `XCODE_VERSION`
   on the pinned simulator, `web-vrt` in the pinned Playwright image — skips the hand-back, uploads the folder whole,
   and fails by design, naming the artifact.
3. Unpack the artifact over the folder; `git status` then lists the baselines whose bytes changed. Review each against
   the committed image (`git diff`, or the diffs of step 1) and commit only what the change meant to move. A `??` in
   that list is a path in no commit, which the re-record hands back unchecked: look it up with the two `git log`
   commands in `.github/scripts/baseline-handback.sh` ("Two known limits") before committing it, as for any hand-back.
4. Commit them with `pnpm gallery:build` and `pnpm parity:report` re-run, as every commit that touches baselines must
   (a stale gallery index or parity report turns `contracts` red, which skips both snapshot jobs), and push. The next
   run compares against them.

Never record into `__Snapshots__` locally: the owner's Xcode is 27 and CI's is 26.6, so a local set does not compare
on CI (see above), and the web's Linux set cannot be written off Linux at all (`web/apps/vrt/playwright.config.ts`).
Before this route existed, the Apple half was done by committing each comparison's `failure.png` from
`snapshot-diffs-apple` over its baseline; the bytes are the same, but that is one image at a time, renamed by hand, and
nothing in CI names it, so the re-record replaces it.

## Running

Every variable is read from the test process, so through `xcodebuild` each one is set in the **environment** with a
`TEST_RUNNER_` prefix, which xcodebuild strips (passing `DS_…=1` on the command line sets a build setting, which the
tests never see).

| Variable | Effect |
|----------|--------|
| `DS_SNAPSHOT_RECORD=1` | Rewrite every baseline and pass. Without it the run compares; a missing baseline is recorded *and* fails, so a new example is reviewed before it becomes a baseline. CI sets it while `__Snapshots__` holds no baseline and for the requested re-record (`update-snapshot-baselines-apple`, above); locally, set it only together with `DS_SNAPSHOT_DIR`. |
| `DS_SNAPSHOT_DIR` | Read and write the baselines somewhere other than `__Snapshots__`. |
| `DS_SNAPSHOT_ARTIFACTS` | Where a failing comparison leaves its reference, failure and difference images. CI points it at a directory on the runner and uploads that as `snapshot-diffs-apple`; the default is the simulator's temporary directory, which a runner discards with itself. |

Compare against the committed baselines:

```sh
xcodebuild test -scheme Prism-Package -only-testing:DSSnapshotTests \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
```

Record a set of your own and then compare against it (what to do on a machine whose Xcode is not the pinned one):

```sh
export TEST_RUNNER_DS_SNAPSHOT_DIR=/tmp/prism-baselines
TEST_RUNNER_DS_SNAPSHOT_RECORD=1 xcodebuild test -scheme Prism-Package -only-testing:DSSnapshotTests \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
xcodebuild test -scheme Prism-Package -only-testing:DSSnapshotTests \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
```

In this repository, build with `-derivedDataPath` outside the working tree: the folder is iCloud-synced and an in-tree
codesign fails on the provenance attribute (`tools/tokens/ARCHITECTURE.md` F44).

`swift test` on the macOS host runs what does not need a simulator: the matrix, its names, the stale-baseline check and
the equal-width suite. The pixel suites are compiled out there (`#if os(iOS)`), and the one pixel read that stays,
`boldTextReachesTheTextRoute`, skips when the probe says the process cannot rasterize. To see that skip on a Mac whose
Xcode *does* compile the catalog, hide the compiled catalog from the built bundle and run without rebuilding:

```sh
b=.build/out/Products/Debug/DSSnapshotTests.xctest/Contents/Resources/Prism_DSTokens.bundle/Contents/Resources/Assets.car
mv "$b" "$b.disabled" && swift test --skip-build; mv "$b.disabled" "$b"
```

## The equal-width tests (ADR-0021 §5)

`DSTextEqualWidthTests` measures what SwiftUI lays the text out at — the advance width, read by a geometry probe inside
an `ImageRenderer` pass — rather than comparing images, so the rule is checked as a number and reported as one.

"1111" and "0000" must lay out within **0.5 pt** (ADR-0021 rule 5) in every tabular role — `data`, `axis` through
DSCore's text route, and `metric-xl`, `metric-lg`, `metric-md` set to `numeric: tabular` — at **Large**, at
**accessibility3** and under **Bold Text**, for both brands. The suite also holds the negative cases (the default
proportional metrics lay "1111" out narrower, so a role that quietly stopped being tabular fails) and the check that
the conditions really reach the text route, since the three would otherwise be three copies of the same render. That
check is two tests, because its two halves need different things:

| Test | Reads | Runs |
|------|-------|------|
| `theConditionsReachTheTextRoute` | the advance width at accessibility3 against Large | everywhere; macOS has no Dynamic Type, so there it asserts the two are equal and only the simulator exercises the widening |
| `boldTextReachesTheTextRoute` | the **ink** of Bold Text against Large, since Onest's tabular figures keep their advance across weights and a width cannot show this one | everywhere the process can rasterize; elsewhere it skips (see "Why the pixel suites live here") |

What `numeric: tabular` does to the *weight* — ADR-0021 §5's other half — is `DSTextFiguresRenderTests`, which is ink
rather than width and therefore a simulator suite.
