/**
 * The visual regression matrix (ADR-0003 web stack, roadmap P3-4): every story tagged `vrt` in
 * storybook-static, in each color scheme × density, in each viewport project of playwright.config.ts.
 *
 * Scheme and density reach the story as `<Theme>` props through Storybook globals; modality is pinned
 * per viewport project, and contrast, transparency and motion to their standard values, so a baseline
 * never depends on the machine's settings. A story restricted to one scheme carries the tag `schemes-light` or `schemes-dark`
 * (written by the gallery's story generator from the example's `schemes`).
 */
export const schemes = ["light", "dark"] as const;
export type Scheme = (typeof schemes)[number];

/** The desktop default and the touch default (ADR-0019 §2). */
export const densities = ["compact", "regular"] as const;
export type Density = (typeof densities)[number];

export type Modality = "pointer" | "touch";

export interface Viewport {
  readonly name: string;
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
  { name: "desktop", width: 1280, height: 800, isMobile: false, modality: "pointer" },
  { name: "mobile", width: 390, height: 844, isMobile: true, modality: "touch" },
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

export function globalsFor(scheme: Scheme, density: Density, modality: Modality): string {
  return [`colorScheme:${scheme}`, `density:${density}`, `modality:${modality}`, "contrast:standard", "transparency:standard", "motion:standard"].join(";");
}
