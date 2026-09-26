// What the gallery is made of (ADR-0005 decision 1, ADR-0006 rule 4, roadmap P3-5, critic C-25).
//
// The gallery is the living visual canon: every spec example, both stacks side by side, per scheme and
// density. It renders nothing itself — each harness already writes a comparable image where it compares
// it, and this tool pairs those images **by name**. So the one thing that has to be decided here is the
// name, and it is written once in spec/SCHEMA.md ("Examples and snapshots"):
//
//     <Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png
//
// `<platform>` is a spec platform key — the target that rasterized the image — never a stack name: a
// column of the gallery is then a column of the parity report, and a second Apple target (a macOS
// render beside the iOS one) lands beside its pair with no rename. That is C-25's objection to `apple`,
// which claimed four platforms for one iPhone render.
import { PLATFORMS, type Platform } from '../parity/config.ts';

export type { Platform } from '../parity/config.ts';

/** `light | dark`, the schemes of `spec/component.schema.json`; an example may declare one of them. */
export const SCHEMES = ['light', 'dark'] as const;
export type Scheme = (typeof SCHEMES)[number];

/** The two densities both matrices record (ADR-0010), touch default first. */
export const DENSITIES = ['regular', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * The forced accessibility states a snapshot name may carry as its last segment; absent is the standard
 * state. The Apple matrix records all three (swift/Tests/DSSnapshotTests/README.md). The web matrix
 * (web/apps/vrt/matrix.ts) records two: `reduce-transparency`, for the examples that render glass, as Apple
 * does (roadmap P4-D9), and `increased-contrast`, for every example but on `web-desktop` at `regular`
 * density only (roadmap P4-D14). It records no `bold-text`. A cell that matrix does not record — any
 * `bold-text` cell, an `increased-contrast` one on `web-touch` or at `compact` — is one the index says in
 * words rather than counting as a missing pair (collect.ts, `out-of-matrix`).
 */
export const VARIANTS = ['increased-contrast', 'reduce-transparency', 'bold-text'] as const;
export type Variant = (typeof VARIANTS)[number];

/**
 * Where a platform's matrix records a forced state at fewer than both densities, the densities it does record it at.
 * The web photographs `increased-contrast` on `web-desktop` at `regular` density alone (web/apps/vrt/matrix.ts,
 * `increasedContrastAt`), so that platform's `compact` cells of it are outside its matrix, not gaps.
 *
 * Whether a platform records a forced state at all is read from its images, as it always was. What cannot be read
 * from them is which densities it leaves out on purpose: a set with none of one density's images looks the same as a
 * harness that lost them. So only this table narrows a platform's matrix, and a platform and state it does not name
 * record at every density, where an image that is not there is a gap.
 */
export const VARIANT_DENSITIES: Readonly<Partial<Record<Variant, Readonly<Partial<Record<Platform, readonly Density[]>>>>>> = {
  'increased-contrast': { 'web-desktop': ['regular'] },
};

/** Column order: the Apple targets, then the web ones. Its set is PLATFORMS' (config.test.ts). */
export const PLATFORM_ORDER: readonly Platform[] = ['ios', 'ipados', 'macos', 'watchos', 'web-desktop', 'web-touch'];

export interface SnapshotSource {
  readonly platforms: readonly Platform[];
  /** Repository-relative POSIX root holding `<Component>/<name>.png`. */
  readonly root: string;
  /** The harness that writes it, for the page and for a diagnostic's hint. */
  readonly harness: string;
  /** How the image is framed — the honest half of a side-by-side comparison (P3-5). */
  readonly framing: string;
  /** Two words of the same fact, under every image of this source. */
  readonly frameTag: string;
  /** Where the page says this set comes from, beyond the framing. */
  readonly note: string;
}

/**
 * Where each stack keeps the images the gallery pairs. Neither is copied by its harness for the gallery:
 * the baselines a harness compares against *are* the canon, so a gallery entry and a failing snapshot
 * test are always the same image.
 *
 * The web set is the committed Linux one — the renders of the pinned Playwright image that CI compares
 * against (`web/apps/vrt/playwright.config.ts`). A `baselines/local-<platform>/` set is one developer's
 * machine and is gitignored, so it is never the canon.
 */
export const SOURCES: readonly SnapshotSource[] = [
  {
    platforms: ['ios', 'ipados', 'macos', 'watchos'],
    root: 'swift/Tests/DSSnapshotTests/__Snapshots__',
    harness: 'swift/Tests/DSSnapshotTests (DSExampleSnapshotTests)',
    framing: 'tight to the component: the view is proposed the phone’s 402 pt width and keeps its own height, so there is no page around it',
    frameTag: 'tight crop',
    note: 'one image point per pixel (scale 1), Dynamic Type Large, en_US/UTC',
  },
  {
    platforms: ['web-desktop', 'web-touch'],
    root: 'web/apps/vrt/baselines/linux',
    harness: 'web/apps/vrt (tests/stories.spec.ts)',
    framing: 'the story’s stage: `.ds-gallery-stage` includes the ground the example is staged on (a page, a map, an image), so the image is wider and taller than the component',
    frameTag: 'with stage',
    note: 'deviceScaleFactor 1, en-US/UTC; `web-desktop` is a 1280×800 window, `web-touch` a 390×844 phone',
  },
];

/** The Apple stamp beside the baselines: what toolchain and device recorded them. */
export const APPLE_PROVENANCE = 'swift/Tests/DSSnapshotTests/__Snapshots__/provenance.json';

/** The workflow the web image tag is read from, so the page never states a version the CI does not run. */
export const WORKFLOW = '.github/workflows/ci.yml';

/** Everything the gallery writes, relative to the repository root. */
export const GALLERY_DIR = 'gallery';
export const INDEX_HTML = `${GALLERY_DIR}/index.html`;
export const INDEX_JSON = `${GALLERY_DIR}/index.json`;
/** The collected copies: one directory, both stacks, gitignored (gallery/README.md). */
export const SNAPSHOTS_DIR = `${GALLERY_DIR}/snapshots`;

/** The report a gallery column links to, and the anchor a spec row links back through. */
export const PARITY_REPORT = 'tools/parity/report.md';

/** The name rule, for a message and for the page's header. */
export const NAME_TEMPLATE = '<Component>/<exampleId>.<platform>.<scheme>.<density>[.<variant>].png';

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function isScheme(value: string): value is Scheme {
  return (SCHEMES as readonly string[]).includes(value);
}

export function isDensity(value: string): value is Density {
  return (DENSITIES as readonly string[]).includes(value);
}

export function isVariant(value: string): value is Variant {
  return (VARIANTS as readonly string[]).includes(value);
}
