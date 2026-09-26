/**
 * The visual regression matrix (ADR-0003 web stack, roadmap P3-4): every story tagged `vrt` in
 * storybook-static, in each color scheme × density, in each viewport project of playwright.config.ts,
 * plus forced Reduce Transparency for every story that renders glass (roadmap P4-D9).
 *
 * Scheme and density reach the story as `<Theme>` props through Storybook globals; modality is pinned
 * per viewport project, and contrast, transparency and motion to their standard values, so a baseline
 * never depends on the machine's settings. A forced state (`variantsFor`) changes one of those pins, through
 * `<Theme>` as well, never through a media query. The gallery's story generator writes the tags this reads from
 * the spec: `schemes-light` or `schemes-dark` on a story restricted to one scheme, from the example's `schemes`,
 * and `glass` on one that renders glass (web/apps/gallery/scripts/stories.ts, `rendersGlass`).
 */
export const schemes = ["light", "dark"] as const;
export type Scheme = (typeof schemes)[number];

/** The desktop default and the touch default (ADR-0019 §2). */
export const densities = ["compact", "regular"] as const;
export type Density = (typeof densities)[number];

export type Modality = "pointer" | "touch";

export interface Viewport {
  /**
   * The **spec platform key** this viewport stands for (`spec/SCHEMA.md`, "Platforms and modes"), which is also the
   * Playwright project name and the `<platform>` segment of every baseline this project records (P3-5). One
   * vocabulary: the gallery pairs by file name, and the parity report's column for this key links to that pair.
   */
  readonly name: "web-desktop" | "web-touch";
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  /** The modality the project pins through `<Theme modality>`. */
  readonly modality: Modality;
}

/**
 * A desktop window and a phone. Each pins its modality instead of leaving it to the emulated device:
 * Chromium drops touch emulation while it captures an element wider than the phone's viewport (a 2×2
 * grid), and a baseline must not flip between the touch and pointer looks with the size of its stage.
 */
export const viewports: readonly Viewport[] = [
  { name: "web-desktop", width: 1280, height: 800, isMobile: false, modality: "pointer" },
  { name: "web-touch", width: 390, height: 844, isMobile: true, modality: "touch" },
];

/**
 * The runtime-contract matrix (ADR-0019 rule 5's check, roadmap P3-4): "the attribute forms in Chromium,
 * WebKit and Firefox and the touch path in a Chromium `hasTouch`/`isMobile` context".
 *
 * `density` and `modality` are what the two root fallbacks must resolve to in that context with no
 * attribute set: density follows `(any-pointer: coarse)`, modality `not all and (hover: hover) and
 * (pointer: fine)`. Measured 2026-09-22 with Playwright 1.63: the three desktop presets report a fine,
 * hovering pointer and no coarse input, and Chromium's touch emulation turns the primary pointer coarse
 * along with the any-pointer query, so these four contexts give both pairings and no third one.
 *
 * That the two fallbacks are *independent* is therefore shown by attribute, not by emulation: the spec
 * pins one axis in the touch context and leaves the other to its fallback, in both directions.
 */
export interface RuntimeProject {
  readonly name: string;
  /** Playwright device preset, which also picks the engine through its `defaultBrowserType`. */
  readonly device: "Desktop Chrome" | "Desktop Safari" | "Desktop Firefox";
  readonly hasTouch: boolean;
  readonly isMobile: boolean;
  readonly density: Density;
  readonly modality: Modality;
}

export const runtimeProjects: readonly RuntimeProject[] = [
  { name: "runtime-chromium", device: "Desktop Chrome", hasTouch: false, isMobile: false, density: "compact", modality: "pointer" },
  { name: "runtime-webkit", device: "Desktop Safari", hasTouch: false, isMobile: false, density: "compact", modality: "pointer" },
  { name: "runtime-firefox", device: "Desktop Firefox", hasTouch: false, isMobile: false, density: "compact", modality: "pointer" },
  { name: "runtime-chromium-touch", device: "Desktop Chrome", hasTouch: true, isMobile: true, density: "regular", modality: "touch" },
];

/**
 * Per story family (the story id's component prefix), the share of pixels a screenshot may differ by.
 * Empty until the first Linux baselines show where `backdrop-filter` under software rendering is not
 * byte-stable (roadmap, "Screenshot determinism for glass").
 */
export const maxDiffPixelRatio: Readonly<Record<string, number>> = {};

/**
 * A forced accessibility state, the last segment of a baseline's name (spec/SCHEMA.md, "Examples and snapshots"),
 * which the gallery pairs with the Apple image of the same name. The web records one of Apple's three.
 */
export type Variant = "reduce-transparency";

/**
 * The states a story is photographed in: the standard one (null), and forced Reduce Transparency when it renders
 * glass, which is where the Apple matrix forces it too (`DSSnapshotMatrix.variants(of:)`, `hasGlass`). Under it glass
 * falls back to `raised` over the page (ADR-0022 §1.2, ADR-0036 §9.1): the only picture of that fallback the web takes.
 * Increase Contrast, which Apple records for every example, and Bold Text are not recorded here.
 */
export function variantsFor(tags: readonly string[]): readonly (Variant | null)[] {
  return tags.includes("glass") ? [null, "reduce-transparency"] : [null];
}

export function globalsFor(scheme: Scheme, density: Density, modality: Modality, variant: Variant | null = null): string {
  const transparency = variant === "reduce-transparency" ? "reduce" : "standard";
  return [`colorScheme:${scheme}`, `density:${density}`, `modality:${modality}`, "contrast:standard", `transparency:${transparency}`, "motion:standard"].join(";");
}
