/// <reference types="node" />
/**
 * One screenshot per story tagged `vrt` × scheme × density, in each viewport project, and one more per forced state the
 * viewport photographs the story in at that density (matrix.ts `variantsFor`). A forced state that some viewport does
 * not photograph is a test in its project too, skipped there. Stories come from storybook-static/index.json, so a new
 * spec example is covered as soon as the gallery generates it.
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
import { expect, test, type Locator } from "@playwright/test";
import { densities, globalsFor, maxDiffPixelRatio, schemes, variantsFor, viewports, type Scheme, type Viewport } from "../matrix.ts";
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

/**
 * Whether the stage computes the Increase Contrast layer of its scheme. The layer is the brand stylesheet's rule for
 * `:root[data-ds-contrast="more"][data-ds-color-scheme="<scheme>"]` (tools/tokens/ARCHITECTURE.md, "colorScheme
 * variants"), the one `<Theme contrast="more">` selects, read here off the page's own CSSOM, so the check names no token
 * and no value. Each custom property it declares is resolved on a probe as the stage would resolve it, and compared with
 * what the stage computes. The build writes only declarations that differ from the scheme's standard ones, so a layer
 * that did not reach the stage leaves a standard value there, and a difference. The `@media (prefers-contrast: more)`
 * copies are left out: they answer a root with no contrast attribute, which this one is not.
 */
async function contrastLayer(stage: Locator, scheme: Scheme): Promise<{ readonly declared: number; readonly differing: readonly string[] }> {
  return stage.evaluate((element, flag) => {
    const declared = new Map<string, string>();
    const walk = (rules: CSSRuleList): void => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) continue;
        if (rule instanceof CSSStyleRule && rule.selectorText.includes(flag)) {
          for (const name of rule.style) if (name.startsWith("--")) declared.set(name, rule.style.getPropertyValue(name).trim());
        }
        if ("cssRules" in rule) walk(rule.cssRules as CSSRuleList);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
    // The probe hangs off the body, outside the stage, and inherits what the stage inherits: the root's context. It is
    // removed before anything is painted.
    const probe = document.createElement("div");
    document.body.append(probe);
    const differing: string[] = [];
    for (const [name, value] of declared) {
      probe.style.setProperty(name, value);
      const expected = getComputedStyle(probe).getPropertyValue(name);
      const actual = getComputedStyle(element).getPropertyValue(name);
      if (actual !== expected) differing.push(`${name}: the stage computes ${JSON.stringify(actual)}, the layer ${JSON.stringify(expected)}`);
    }
    probe.remove();
    return { declared: declared.size, differing };
  }, `[data-ds-contrast="more"][data-ds-color-scheme="${scheme}"]`);
}

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
      const variants = new Set(viewports.flatMap((viewport) => variantsFor(tags, viewport.name, density)));
      for (const variant of variants) {
        const suffix = variant === null ? "" : `.${variant}`;
        test(`${story.title}/${story.name} ${scheme} ${density}${variant === null ? "" : ` ${variant}`}`, async ({ page }, testInfo) => {
          // The project name is the viewport's platform key (playwright.config.ts), and the matrix says per viewport what it photographs.
          const platform = testInfo.project.name as Viewport["name"];
          test.skip(!variantsFor(tags, platform, density).includes(variant), `${platform} does not photograph ${String(variant)} at ${density} density (matrix.ts variantsFor)`);
          const modality = viewports.find((viewport) => viewport.name === platform)?.modality ?? "pointer";
          await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=${globalsFor(scheme, density, modality, variant)}`);
          const stage = page.locator(".ds-gallery-stage").first();
          await expect(stage).toBeVisible();
          const root = page.locator("html");
          await expect(root).toHaveAttribute("data-ds-color-scheme", scheme);
          await expect(root).toHaveAttribute("data-ds-density", density);
          await expect(root).toHaveAttribute("data-ds-modality", modality);
          await expect(root).toHaveAttribute("data-ds-contrast", variant === "increased-contrast" ? "more" : "standard");
          await expect(root).toHaveAttribute("data-ds-transparency", variant === "reduce-transparency" ? "reduce" : "standard");
          // The forced state reaches the render, and the `glass` tag says what the stage draws: in the standard state a
          // story renders glass exactly when it is tagged. Both forced states are triggers of the one glass fallback
          // (ADR-0022 §1.2), so under either every glass the story renders has fallen back, and the picture recorded
          // under that name is the fallback and never the glass.
          if (variant === null) {
            if (rendersGlass) await expect(stage.locator(glass).first()).toBeAttached();
            else await expect(stage.locator(glass)).toHaveCount(0);
          } else {
            await expect(stage.locator(glass)).toHaveCount(0);
            if (rendersGlass) await expect(stage.locator(fallback).first()).toBeAttached();
          }
          // Under Increase Contrast the stage computes its scheme's Increase Contrast layer, every value of it: the root
          // attribute alone would pass with a stylesheet that never matched it.
          if (variant === "increased-contrast") {
            const layer = await contrastLayer(stage, scheme);
            expect(layer.declared, "declarations in the Increase Contrast layer").toBeGreaterThan(0);
            expect(layer.differing).toEqual([]);
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
