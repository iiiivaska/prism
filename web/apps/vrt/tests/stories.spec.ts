/// <reference types="node" />
/**
 * One screenshot per story tagged `vrt` × scheme × density, in each viewport project, and one more per forced state the
 * story is photographed in (matrix.ts `variantsFor`). Stories come from storybook-static/index.json, so a new spec
 * example is covered as soon as the gallery generates it.
 *
 * A baseline is `baselines/<os>/<Component>/<example-id>.<platform>.<scheme>.<density>[.<variant>].png`, the one gallery
 * name both stacks write (spec/SCHEMA.md, "Examples and snapshots"): the story's title is the spec name and its name the
 * example id (web/apps/gallery/scripts/stories.ts), `<platform>` is the project's spec platform key — `web-desktop` or
 * `web-touch` — and `<variant>` the forced state, absent in the standard state, so `tools/gallery` finds the Apple render
 * of the same cell by name alone. `<os>` is the folder the renders of one operating system live in (`linux` is CI's
 * committed set), not part of the name.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { densities, globalsFor, maxDiffPixelRatio, schemes, variantsFor, viewports } from "../matrix.ts";
import { storybookStatic } from "../serve.ts";

interface IndexEntry {
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly type: "story" | "docs";
  readonly tags?: readonly string[];
}

const index = JSON.parse(readFileSync(join(storybookStatic, "index.json"), "utf8")) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((entry) => entry.type === "story" && (entry.tags ?? []).includes("vrt"));

/** What draws glass on a stage: a Surface that renders a glass material, or a part the Surface module draws as the glass chip. */
const glass = '.ds-surface[data-ds-material="glass"], .ds-surface[data-ds-material="glassLight"], [data-ds-surface-chip="glass"]';
/** What glass that fell back leaves: a Surface that marks its fallback, or a glass chip that renders its fallback. */
const fallback = '.ds-surface[data-ds-fallback], [data-ds-surface-chip="fallback"]';

test("storybook-static has stories tagged vrt", () => {
  expect(stories.length).toBeGreaterThan(0);
});

for (const story of stories) {
  const family = story.id.split("--")[0] ?? story.id;
  const tags = story.tags ?? [];
  const rendersGlass = tags.includes("glass");
  const onlyScheme = schemes.find((scheme) => tags.includes(`schemes-${scheme}`));
  for (const scheme of onlyScheme === undefined ? schemes : [onlyScheme]) {
    for (const density of densities) {
      for (const variant of variantsFor(tags)) {
        const suffix = variant === null ? "" : `.${variant}`;
        test(`${story.title}/${story.name} ${scheme} ${density}${variant === null ? "" : ` ${variant}`}`, async ({ page }, testInfo) => {
          const modality = viewports.find((viewport) => viewport.name === testInfo.project.name)?.modality ?? "pointer";
          await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=${globalsFor(scheme, density, modality, variant)}`);
          const stage = page.locator(".ds-gallery-stage").first();
          await expect(stage).toBeVisible();
          const root = page.locator("html");
          await expect(root).toHaveAttribute("data-ds-color-scheme", scheme);
          await expect(root).toHaveAttribute("data-ds-density", density);
          await expect(root).toHaveAttribute("data-ds-modality", modality);
          await expect(root).toHaveAttribute("data-ds-contrast", "standard");
          await expect(root).toHaveAttribute("data-ds-transparency", variant === "reduce-transparency" ? "reduce" : "standard");
          // The forced state reaches the render, and the `glass` tag says what the stage draws: in the standard state a
          // story renders glass exactly when it is tagged, and under Reduce Transparency every glass it renders has
          // fallen back, so the picture recorded under that name is the fallback and never the glass.
          if (variant === "reduce-transparency") {
            await expect(stage.locator(glass)).toHaveCount(0);
            await expect(stage.locator(fallback).first()).toBeAttached();
          } else if (rendersGlass) {
            await expect(stage.locator(glass).first()).toBeAttached();
          } else {
            await expect(stage.locator(glass)).toHaveCount(0);
          }
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          // An example with an image — Avatar's `portrait` fixture, an SVG `data:` URL — is photographed once every image
          // on the stage has decoded and two frames have passed, in which the component marks it loaded and its fade
          // (fast-forwarded by `animations: "disabled"`) ends: never the frame before the picture arrives.
          await stage.locator("img").evaluateAll(async (images) => {
            await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          });
          // `testInfo.project.name` is the viewport's spec platform key (matrix.ts), which is the name's `<platform>`.
          await expect(stage).toHaveScreenshot([story.title, `${story.name}.${testInfo.project.name}.${scheme}.${density}${suffix}.png`], {
            maxDiffPixelRatio: maxDiffPixelRatio[family] ?? 0,
          });
        });
      }
    }
  }
}
