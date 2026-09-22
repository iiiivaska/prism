/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";
import { runtimeProjects, viewports } from "./matrix.ts";

/**
 * Two suites over the pages `serve.ts` hosts (roadmap P3-4, ADR-0003 web stack), split by project:
 *
 * - `tests/stories.spec.ts`: visual regression over the static Storybook, one Chromium project per
 *   viewport, because a baseline is only comparable with a render of the same image. A project is named
 *   for the spec platform key it stands for — `web-desktop`, `web-touch` — which is the `<platform>`
 *   segment of every baseline it records and the name the P3-5 gallery pairs by (matrix.ts);
 * - `tests/runtime-contract.spec.ts`: the web runtime contract, in Chromium, WebKit and Firefox, with
 *   no screenshot (ADR-0019 rule 5, ADR-0025). Its `--update-snapshots` runs are harmless: it records
 *   nothing.
 *
 * Baselines are renders of the CI container image `mcr.microsoft.com/playwright:v1.63.0-noble`
 * (keep equal to `@playwright/test` in the catalog) and live in `baselines/linux/`, committed. Rendering
 * differs by OS and GPU, so any other platform compares against its own `baselines/local-<platform>/`,
 * which .gitignore keeps out of the repository: on a Mac, `pnpm vrt:update` records a local set to
 * develop against, and only CI records the Linux set (`.github/workflows/ci.yml`,
 * job `web-vrt`, which uploads it as the `vrt-baselines` artifact when the folder is empty or when asked).
 *
 *   pnpm vrt          compare                        (pnpm --filter @iiiivaska/prism-vrt test)
 *   pnpm vrt:update   record, --update-snapshots=all (pnpm --filter @iiiivaska/prism-vrt run test:update)
 *
 * The recording script is `test:update`, not `update`: `pnpm update` is pnpm's own dependency update.
 *
 * After a change that deliberately moves what a story draws, the local set goes stale where the pixels
 * moved, and `pnpm -r test` then fails on those screenshots until they are recorded again. Refresh the
 * ones that moved rather than the whole set — `--update-snapshots=changed` rewrites only the baselines
 * that differ, and `--grep` keeps the run to the stories that changed, so an unrelated drift elsewhere
 * is not silently blessed:
 *
 *   pnpm --filter @iiiivaska/prism-vrt exec playwright test --grep "Card/glass-vehicle" --update-snapshots=changed
 *
 * The story title is `<Component>/<example-id>`, the same pair the baseline's path carries, and both
 * viewport projects run unless `--project` narrows it further. Only `baselines/local-<platform>/` is
 * touched on a Mac; `baselines/linux/` is CI's and no local run can reach it.
 */
const platformFolder = process.platform === "linux" ? "linux" : `local-${process.platform}`;
const port = 6007;

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  snapshotPathTemplate: `baselines/${platformFolder}/{arg}{ext}`,
  fullyParallel: true,
  forbidOnly: process.env["CI"] !== undefined,
  retries: 0,
  reporter: process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", scale: "css" },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    colorScheme: "light",
    reducedMotion: "no-preference",
    contrast: "no-preference",
    forcedColors: "none",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    // The screenshots: one Chromium project per viewport, because a baseline is a render of the CI image.
    ...viewports.map((viewport) => ({
      name: viewport.name,
      testMatch: /stories\.spec\.ts$/u,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
      },
    })),
    // The runtime contract: no screenshot, but every engine, because the cascade is what is under test
    // (ADR-0019 rule 5, ARCHITECTURE V9 "the selector forms in WebKit and Firefox").
    ...runtimeProjects.map((project) => ({
      name: project.name,
      testMatch: /runtime-contract\.spec\.ts$/u,
      use: { ...devices[project.device], hasTouch: project.hasTouch, isMobile: project.isMobile },
    })),
  ],
  webServer: {
    command: `node serve.ts ${port}`,
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: process.env["CI"] === undefined,
    timeout: 30_000,
  },
});
