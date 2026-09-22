/// <reference types="node" />
/**
 * One screenshot per story tagged `vrt` × scheme × density, in each viewport project. Stories come from
 * storybook-static/index.json, so a new spec example is covered as soon as the gallery generates it.
 *
 * A baseline is `baselines/<os>/<Component>/<example-id>.<platform>.<scheme>.<density>.png`, the one gallery name
 * both stacks write (spec/SCHEMA.md, "Examples and snapshots"): the story's title is the spec name and its name the
 * example id (web/apps/gallery/scripts/stories.ts), and `<platform>` is the project's spec platform key —
 * `web-desktop` or `web-touch` — so `tools/gallery` finds the Apple render of the same cell by name alone. `<os>` is
 * the folder the renders of one operating system live in (`linux` is CI's committed set), not part of the name.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { densities, globalsFor, maxDiffPixelRatio, schemes, viewports } from "../matrix.ts";
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

test("storybook-static has stories tagged vrt", () => {
  expect(stories.length).toBeGreaterThan(0);
});

for (const story of stories) {
  const family = story.id.split("--")[0] ?? story.id;
  const onlyScheme = schemes.find((scheme) => (story.tags ?? []).includes(`schemes-${scheme}`));
  for (const scheme of onlyScheme === undefined ? schemes : [onlyScheme]) {
    for (const density of densities) {
      test(`${story.title}/${story.name} ${scheme} ${density}`, async ({ page }, testInfo) => {
        const modality = viewports.find((viewport) => viewport.name === testInfo.project.name)?.modality ?? "pointer";
        await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=${globalsFor(scheme, density, modality)}`);
        const stage = page.locator(".ds-gallery-stage").first();
        await expect(stage).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-ds-color-scheme", scheme);
        await expect(page.locator("html")).toHaveAttribute("data-ds-density", density);
        await expect(page.locator("html")).toHaveAttribute("data-ds-modality", modality);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        // `testInfo.project.name` is the viewport's spec platform key (matrix.ts), which is the name's `<platform>`.
        await expect(stage).toHaveScreenshot([story.title, `${story.name}.${testInfo.project.name}.${scheme}.${density}.png`], {
          maxDiffPixelRatio: maxDiffPixelRatio[family] ?? 0,
        });
      });
    }
  }
}
