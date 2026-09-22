/// <reference types="node" />
/**
 * The runtime-contract spec (roadmap P3-4, ADR-0019 rule 5's check, ADR-0025): the web runtime
 * evaluated by a browser engine rather than by a simulator or a fake DOM, in Chromium, WebKit and
 * Firefox, with the touch path in a Chromium `hasTouch`/`isMobile` context.
 *
 * Two pages, both served by `serve.ts`:
 *
 * - `/runtime-contract/`, the fixture of `fixture/build.ts`: a consumer page over `@iiiivaska/prism-tokens`
 *   as `npm pack` publishes it, unpacked into `node_modules/` — not the workspace symlink. It carries
 *   P3-2's behavioural half: one document switches scheme, density and motion with no rebuild, computes
 *   a nested dark scope inside a light root, and loads the prism-native Inter from the package with the
 *   network disabled.
 * - the gallery's `Runtime/Contract` probe story, which carries ADR-0019 rule 7's client half: P3-2 could
 *   check `<Theme>` only on the server, because a client render needs a DOM runner it does not have.
 *
 * ADR-0019 rule 1 exempts this spec from the `runtime` lint kind: the attribute names below are spelled
 * by hand on purpose, so they check the generated table instead of repeating it. The two durations in
 * "switches … with no rebuild" are the ones roadmap P3-4 names, for the same reason.
 *
 * Rules 8, 9 and 11 are checked where their evidence is — over the exports and the compiled stylesheets
 * of `@iiiivaska/prism-react` (`test/exports.test.tsx`, `test/stylesheet.test.ts`) — and their rendered
 * result is what every screenshot in `stories.spec.ts` compares.
 */
import { expect, test, type Page } from "@playwright/test";
import { runtimeProjects } from "../matrix.ts";
import { fixturePath } from "../fixture/build.ts";

/** ADR-0019 §1's attribute names, spelled here so the fixture's generated table is checked, not echoed. */
const ATTRIBUTE = {
  colorScheme: "data-ds-color-scheme",
  contrast: "data-ds-contrast",
  transparency: "data-ds-transparency",
  density: "data-ds-density",
  modality: "data-ds-modality",
  motion: "data-ds-motion",
} as const;

/** Values that must behave exactly like no attribute at all (ADR-0019 §1 item 2). */
const INVALID = ["", "auto", "system", "Compact", "0"] as const;

/** The probe story of `web/apps/gallery/src/probes/RuntimeContract.stories.tsx`, every axis on `auto`. */
const PROBE_STORY = `/iframe.html?id=runtime-contract--token-context&viewMode=story&globals=${[
  "colorScheme",
  "contrast",
  "transparency",
  "density",
  "modality",
  "motion",
]
  .map((axis) => `${axis}:auto`)
  .join(";")}`;

type Context = Record<string, string>;

interface FixtureApi {
  read: (selector?: string) => Context;
  mount: (context: Context) => void;
  unmountAll: () => void;
  events: readonly Context[];
}

interface ProbeApi {
  readContext: () => Context;
  mountRoot: (context: Context) => () => void;
}

declare global {
  var prism: FixtureApi | undefined;
  var prismProbe: ProbeApi | undefined;
}

/** What this project's device reports, and therefore what the two root fallbacks must resolve to. */
function expectations(name: string): (typeof runtimeProjects)[number] {
  const project = runtimeProjects.find((candidate) => candidate.name === name);
  if (project === undefined) throw new Error(`${name} is not a runtime project of matrix.ts`);
  return project;
}

async function openFixture(page: Page): Promise<void> {
  await page.goto(fixturePath);
  await page.waitForFunction(() => globalThis.prism !== undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/** Sets or, for `null`, removes attributes on `<html>` — the app's own job in ADR-0019 §4 item 1. */
async function setRoot(page: Page, attributes: Readonly<Record<string, string | null>>): Promise<void> {
  await page.evaluate((entries) => {
    for (const [name, value] of entries) {
      if (value === null) document.documentElement.removeAttribute(name);
      else document.documentElement.setAttribute(name, value);
    }
  }, Object.entries(attributes));
}

const context = async (page: Page, selector?: string): Promise<Context> =>
  page.evaluate((target) => (globalThis.prism as FixtureApi).read(target), selector);

/** A painted length, so a token switch is observed where it lands and not only in a custom property. */
const width = async (page: Page, selector: string): Promise<number> =>
  page.locator(selector).evaluate((element) => element.getBoundingClientRect().width);

const background = async (page: Page, selector: string): Promise<string> =>
  page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);

const custom = async (page: Page, selector: string, property: string): Promise<string> =>
  page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name).trim(), property);

test.describe("the two root fallbacks (ADR-0019 rule 5)", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("resolve density and modality from the device when no attribute is set", async ({ page }, testInfo) => {
    const project = expectations(testInfo.project.name);

    // Each density block paints its own card padding; measure them, then take the attribute away.
    const byDensity: Record<string, number> = {};
    for (const value of ["compact", "regular", "comfortable"]) {
      await setRoot(page, { [ATTRIBUTE.density]: value });
      byDensity[value] = await width(page, "#root-density");
    }
    expect(byDensity["compact"]).toBeLessThan(byDensity["regular"] ?? 0);
    expect(byDensity["regular"]).toBeLessThanOrEqual(byDensity["comfortable"] ?? 0);

    const byModality: Record<string, number> = {};
    for (const value of ["pointer", "touch"]) {
      await setRoot(page, { [ATTRIBUTE.modality]: value });
      byModality[value] = await width(page, "#root-modality");
    }
    expect(byModality["pointer"]).toBeLessThan(byModality["touch"] ?? 0);

    await setRoot(page, { [ATTRIBUTE.density]: null, [ATTRIBUTE.modality]: null });
    expect(await width(page, "#root-density")).toBe(byDensity[project.density]);
    expect(await width(page, "#root-modality")).toBe(byModality[project.modality]);
    expect(await context(page)).toMatchObject({ density: project.density, modality: project.modality });
  });

  test("are independent: pinning one axis leaves the other on its fallback", async ({ page }, testInfo) => {
    const project = expectations(testInfo.project.name);
    const other = { compact: "regular", regular: "compact" } as const;
    const opposite = { pointer: "touch", touch: "pointer" } as const;

    await setRoot(page, { [ATTRIBUTE.density]: other[project.density], [ATTRIBUTE.modality]: null });
    expect(await context(page)).toMatchObject({ density: other[project.density], modality: project.modality });

    await setRoot(page, { [ATTRIBUTE.density]: null, [ATTRIBUTE.modality]: opposite[project.modality] });
    expect(await context(page)).toMatchObject({ density: project.density, modality: opposite[project.modality] });
  });

  test("come back for an invalid value and stay off for a valid one (ADR-0019 §1 items 2 and 3)", async ({ page }, testInfo) => {
    const project = expectations(testInfo.project.name);
    await setRoot(page, { [ATTRIBUTE.density]: null });
    const fallback = await width(page, "#root-density");

    for (const value of ["compact", "regular"] as const) {
      await setRoot(page, { [ATTRIBUTE.density]: value });
      const pinned = await width(page, "#root-density");
      expect((await context(page))["density"], value).toBe(value);
      if (value === project.density) expect(pinned).toBe(fallback);
      else expect(pinned).not.toBe(fallback);
    }

    for (const value of INVALID) {
      await setRoot(page, { [ATTRIBUTE.density]: value });
      expect(await width(page, "#root-density"), `density="${value}"`).toBe(fallback);
      expect((await context(page))["density"], `density="${value}"`).toBe(project.density);
    }
  });

  test("apply at <html> only for a root-only axis, and per element for a nestable one (§1 item 4)", async ({ page }, testInfo) => {
    const project = expectations(testInfo.project.name);
    await setRoot(page, { [ATTRIBUTE.modality]: null, [ATTRIBUTE.density]: "compact", [ATTRIBUTE.colorScheme]: "light" });
    const rootHit = await custom(page, "#root-page", "--ds-size-hit");

    // A root-only axis is ignored on any other element, in the cascade and in readContext alike.
    const opposite = { pointer: "touch", touch: "pointer" } as const;
    await page.locator("#nested-scheme").evaluate((element, [name, value]) => element.setAttribute(name ?? "", value ?? ""), [
      ATTRIBUTE.modality,
      opposite[project.modality],
    ]);
    expect(await custom(page, "#nested-scheme-page", "--ds-size-hit")).toBe(rootHit);
    expect((await context(page, "#nested-scheme"))["modality"]).toBe(project.modality);

    // A nestable axis resolves at the element: the fixture's scope() put density regular on this one.
    expect(await width(page, "#nested-density-probe")).not.toBe(await width(page, "#root-density"));
    expect((await context(page, "#nested-density-probe"))["density"]).toBe("regular");
    expect((await context(page))["density"]).toBe("compact");
  });
});

test.describe("the packed package in a browser (P3-2's behavioural half)", () => {
  test.beforeEach(async ({ page }) => {
    await openFixture(page);
  });

  test("switches scheme, density and motion on one document, with no rebuild", async ({ page }) => {
    const stylesheets = async (): Promise<number> => page.evaluate(() => document.styleSheets.length);
    const before = await stylesheets();

    await setRoot(page, { [ATTRIBUTE.colorScheme]: "light", [ATTRIBUTE.density]: "compact", [ATTRIBUTE.motion]: "standard" });
    const light = { page: await background(page, "#root-page"), density: await width(page, "#root-density") };
    expect(await custom(page, "#root-motion", "--ds-motion-spring-snappy-duration")).toBe("487ms");
    expect(await page.locator("#root-motion").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.487s");

    // Through the packed runtime itself, not only through raw attributes.
    await page.evaluate(() => {
      (globalThis.prism as FixtureApi).mount({ colorScheme: "dark", density: "regular", motion: "reduce" });
    });

    expect(await background(page, "#root-page")).not.toBe(light.page);
    expect(await width(page, "#root-density")).not.toBe(light.density);
    expect(await custom(page, "#root-motion", "--ds-motion-spring-snappy-duration")).toBe("367ms");
    expect(await page.locator("#root-motion").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.367s");
    expect(await stylesheets(), "a switch must need no new stylesheet").toBe(before);

    // mountRoot's cleanup restores what it found (ADR-0019 rule 6).
    await page.evaluate(() => {
      (globalThis.prism as FixtureApi).unmountAll();
    });
    expect(await background(page, "#root-page")).toBe(light.page);
    expect(await width(page, "#root-density")).toBe(light.density);
    expect(await custom(page, "#root-motion", "--ds-motion-spring-snappy-duration")).toBe("487ms");
  });

  test("computes a nested dark scope inside a light root", async ({ page }) => {
    await setRoot(page, { [ATTRIBUTE.colorScheme]: "dark" });
    const dark = await background(page, "#root-page");
    await setRoot(page, { [ATTRIBUTE.colorScheme]: "light" });
    const light = await background(page, "#root-page");
    expect(dark).not.toBe(light);

    expect(await background(page, "#nested-scheme-page")).toBe(dark);
    expect((await context(page, "#nested-scheme-page"))["colorScheme"]).toBe("dark");
    expect((await context(page))["colorScheme"]).toBe("light");
  });

  test("loads the prism-native Inter from the package with the network disabled", async ({ page, baseURL }) => {
    const base = new URL(fixturePath, baseURL ?? "http://127.0.0.1").toString();
    const served: string[] = [];
    const blocked: string[] = [];
    page.on("response", (response) => served.push(response.url()));
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith(base)) await route.continue();
      else {
        blocked.push(url);
        await route.abort();
      }
    });

    await page.goto(fixturePath);
    await page.waitForFunction(() => globalThis.prism !== undefined);
    const fonts = await page.evaluate(async () => {
      await document.fonts.load('400 16px "Inter"');
      await document.fonts.ready;
      return {
        faces: [...document.fonts].map((face) => ({ family: face.family.replaceAll('"', ""), status: face.status })),
        available: document.fonts.check('16px "Inter"'),
      };
    });

    expect(fonts.faces).toContainEqual({ family: "Inter", status: "loaded" });
    expect(fonts.available).toBe(true);
    expect(served.filter((url) => !url.startsWith(base)), "the page reached outside the package").toEqual([]);
    expect(served.some((url) => url.endsWith("/prism-native/fonts/inter/inter-wght.woff2"))).toBe(true);
    expect(blocked.filter((url) => url.includes("inter"))).toEqual([]);
  });
});

test.describe("<Theme> on the client (ADR-0019 rule 7)", () => {
  test("useTokenContext() returns what readContext() returns and re-renders on every watchContext event", async ({ page }) => {
    await page.goto(PROBE_STORY);
    const probe = page.locator("#probe-context");
    await expect(probe).toBeVisible();
    await page.waitForFunction(() => globalThis.prismProbe !== undefined);

    const shown = async (): Promise<Context> => JSON.parse((await probe.textContent()) ?? "{}") as Context;
    const renders = async (): Promise<number> => Number(await probe.getAttribute("data-ds-probe-renders"));
    const read = async (): Promise<Context> => page.evaluate(() => (globalThis.prismProbe as ProbeApi).readContext());
    const settled = async (axis: string, value: string): Promise<void> => {
      await expect(probe).toContainText(`"${axis}":"${value}"`);
    };

    expect(await shown()).toEqual(await read());
    let seen = await renders();

    // A media change, the source no attribute can stand in for.
    await page.emulateMedia({ colorScheme: "dark" });
    await settled("colorScheme", "dark");
    expect(await shown()).toEqual(await read());
    expect(await renders()).toBeGreaterThan(seen);
    seen = await renders();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await settled("motion", "reduce");
    expect(await shown()).toEqual(await read());
    expect(await renders()).toBeGreaterThan(seen);
    seen = await renders();

    // A data-ds-* mutation of <html>, the other source watchContext observes.
    await page.evaluate(() => {
      (globalThis.prismProbe as ProbeApi).mountRoot({ density: "regular", colorScheme: "light" });
    });
    await settled("density", "regular");
    await settled("colorScheme", "light");
    expect(await shown()).toEqual(await read());
    expect(await renders()).toBeGreaterThan(seen);

    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  });
});
