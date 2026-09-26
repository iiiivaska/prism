# The gallery

The living visual canon (ADR-0005 decision 1): **every spec example, both stacks side by side, per scheme and
density**. Visual sign-off happens here and on the direction board, because no Figma library exists to hold it, so
this page has to be good enough to judge beauty and honest enough to judge drift.

Open `index.html` from a checkout, or download the `gallery` artifact of any green CI run and open the `index.html`
inside it. Both carry the images.

```sh
pnpm gallery:build     # collect both stacks' snapshots into gallery/ and write the index
```

| Path | Committed | What it is |
|------|-----------|------------|
| `index.html` | yes | the page: every example, one row per scheme × density × forced state, one figure per platform |
| `index.json` | yes | the same pairing as data — the manifest a tool reads (every cell, every platform, every image's name and pixel size) |
| `snapshots/` | no (gitignored) | the collected copies, `<Component>/<name>.png`, both stacks in one directory; `pnpm gallery:build` fills it in a second |

Nothing here is a render of its own. The images are copies of the baselines each harness already compares against, so
a gallery entry and a failing snapshot test are always the same picture:

| Platform key | Recorded by | Lives in |
|--------------|-------------|----------|
| `ios` | `swift/Tests/DSSnapshotTests` on the pinned iPhone 17 / iOS 26.5 simulator (CI job `apple`) | `swift/Tests/DSSnapshotTests/__Snapshots__/` |
| `web-desktop`, `web-touch` | `web/apps/vrt` in the pinned Playwright image (CI job `web-vrt`) | `web/apps/vrt/baselines/linux/` |

## One name, both stacks

A pair is found by name alone (`spec/SCHEMA.md`, "Examples and snapshots"):

```
<Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png
```

`<platform>` is a **spec platform key** — the target that rasterized the image (`ios`, `ipados`, `macos`, `watchos`,
`web-desktop`, `web-touch`) — and never a stack name. Two things follow: a column of this page is a column of the
[parity report](../tools/parity/report.md), which is why each report row links here and each section here links back;
and a second Apple target (a macOS render beside the iOS one) lands beside its pair with no rename. `<variant>` is a
forced accessibility state — `increased-contrast`, `reduce-transparency`, `bold-text` — and is absent in the standard
state.

`gallery:build` parses every file under both roots with that rule and **fails** on one that does not follow it, so a
harness cannot drift out of the pairing quietly.

## How to read the page

- **The framing differs between the stacks, and the page says so instead of hiding it.** An Apple snapshot is tight to
  the component; a web screenshot is of the story's stage, which includes the ground the example sits on. Every image
  is therefore shown at its own size — one image pixel per CSS pixel — with that size and a framing tag (`tight crop`,
  `with stage`) under it. A picture that is wider is wider; it has not been scaled to match. *Fit to column* scales
  them down for scanning, and the captions keep stating the true size.
- **A cell with no image says which kind of nothing it is.** `missing` (red) is a real gap: that platform records this
  component and this state, but not this cell. `not recorded here` means the platform has no snapshot of the component
  at all — the parity report says how far its implementation is. `not in this matrix` means the platform's matrix has
  no image with that forced state anywhere, so there is nothing to compare. The web records one forced state,
  `reduce-transparency`, for the examples that render glass, as Apple does; it records neither `increased-contrast`
  nor `bold-text`, and counting those as gaps would invent two for every such Apple image.
- **Every component spec has an anchor**, including the ones no stack has recorded yet, so a link from the parity
  report always lands somewhere. Pattern specs have no pairs yet: their example screens are Phase 4.
- The toolbar filters by scheme and density, hides the forced states, and shows only the cells with a missing pair.

## Staleness

`index.html` and `index.json` are generated files that are committed, like `tools/parity/report.md` and the token
output, and two checks keep them honest:

- CI (`contracts` job, step **Gallery pairs**) runs `pnpm gallery:build` and fails when `git status -- gallery` is not
  empty, naming the command to run.
- `tools/gallery/gallery.test.ts` asserts the same thing in the `web` job, along with the pairing rules themselves and
  that both harnesses still write the settled name.

So: add or rename an example, record a snapshot, or change what a render's geometry is, then run `pnpm gallery:build`
and commit the two index files with it.

## Not to be confused with

`web/apps/gallery` is the Storybook that *renders* the web side (one story per spec example, which `web/apps/vrt`
screenshots). This folder is where those screenshots meet the SwiftUI ones.
