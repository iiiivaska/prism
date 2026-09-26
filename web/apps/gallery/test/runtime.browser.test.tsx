/**
 * Browser behaviour of the web runtime and the first two components, in Vitest browser mode (Chromium).
 *
 * - ADR-0019 rule 7, the client half P3-2 could not run: in a mounted `<Theme>`, `useTokenContext()`
 *   returns what `readContext()` returns and re-renders on every `watchContext` event.
 * - ADR-0022 rule 1 and ADR-0025 rule 1 on the client: Surface falls back from glass when the OS asks for
 *   more contrast or less transparency, back again when it stops, and an explicit `<Theme>` choice wins.
 * - ADR-0036 §3 and §7 on the client: the glass chip shape resolves again whenever anything it reads
 *   changes — what its part asks for, the ground, its enclosure (ADR-0037 §1), the gate, the publication,
 *   and Prism's contrast and transparency — which only a mounted tree that re-renders can show.
 * - ADR-0023 rule 9: under a forced reduced context Surface drops blur and depth at once and crossfades
 *   its fill; Text schedules no animation at all.
 * - ADR-0021 rule 8: Text computes `font-synthesis: none`.
 * - ADR-0021 rule 5 (§5, ADR-0030 §7.1): the equal-width test with `getBoundingClientRect`.
 * - Roadmap P4-8, Chip over media: the pill's blur on the map, inside a Backdrop inside a glass Surface and when
 *   disabled (ADR-0036 rule 13, F4), flat on the scheme's glass; ADR-0037's fixture read as pixels, a chip inside a
 *   host that renders nothing drawn flat and one inside an own cell falling back (rules 1 and 2); and a Chip's Avatar
 *   resolving the same at rest and pressed on every ground under every setting (rule 4).
 *
 * The OS preferences come from a controllable `matchMedia` installed before the runtime first reads one;
 * the attribute names and queries are spelled here on purpose, to check the generated contract
 * independently (ADR-0019 rule 1).
 */
import "@iiiivaska/prism-tokens/tokens.css";
import "@iiiivaska/prism-tokens/brands/prism/fonts.css";
import "@iiiivaska/prism-tokens/motion.css";
import "@iiiivaska/prism-react/styles.css";

import { act, useContext, type CSSProperties, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import {
  Backdrop,
  Chip,
  Surface,
  Text,
  Theme,
  backdropKinds,
  mountRoot,
  readContext,
  surfaceMaterials,
  useTokenContext,
  webRuntime,
  type TextRole,
  type TokenContext,
} from "@iiiivaska/prism-react";
// The chip shape, its resolver and the two contexts it reads are internal to the package (ADR-0036 §7), so they
// are imported from the source; vitest.config.ts resolves `@iiiivaska/prism-react` to that same source, so these
// are the contexts the hook reads and the resolver it calls.
import { SurfaceChipEnclosureContext, SurfaceContext, type SurfaceContextValue } from "../../../packages/react/src/surface/context.ts";
import {
  resolveSurfaceChip,
  type SurfaceChipEnclosure,
  type SurfaceChipFill,
  type SurfaceChipGate,
  type SurfaceChipPublication,
  type SurfaceChipResolution,
} from "../../../packages/react/src/surface/resolve.ts";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip } from "../../../packages/react/src/surface/SurfaceChip.tsx";
// Avatar's `root.background` table, which ADR-0037's fixture circle follows, is internal to the package too.
import { avatarBackground } from "../../../packages/react/src/avatar/parts.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ControlledQuery extends EventTarget {
  matches = false;
  readonly media: string;
  onchange = null;

  constructor(media: string) {
    super();
    this.media = media;
  }

  set(matches: boolean): void {
    if (this.matches === matches) return;
    this.matches = matches;
    this.dispatchEvent(Object.assign(new Event("change"), { matches, media: this.media }));
  }

  addListener(listener: () => void): void {
    this.addEventListener("change", listener);
  }

  removeListener(listener: () => void): void {
    this.removeEventListener("change", listener);
  }
}

const queries = new Map<string, ControlledQuery>();
for (const axis of Object.values(webRuntime)) queries.set(axis.media.query, new ControlledQuery(axis.media.query));
const realMatchMedia = window.matchMedia.bind(window);
window.matchMedia = (media: string): MediaQueryList => {
  const controlled = queries.get(media);
  return controlled ?? realMatchMedia(media);
};

function query(axis: keyof typeof webRuntime): ControlledQuery {
  const controlled = queries.get(webRuntime[axis].media.query);
  if (controlled === undefined) throw new Error(`no controlled query for ${axis}`);
  return controlled;
}

let root: Root | null = null;
let host: HTMLElement | null = null;

async function mount(node: ReactNode): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
    await Promise.resolve();
  });
  return host;
}

/** Lets a MutationObserver or a media change reach React. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(async () => {
  await act(async () => {
    root?.unmount();
    await Promise.resolve();
  });
  host?.remove();
  root = null;
  host = null;
  for (const controlled of queries.values()) controlled.set(false);
  for (const axis of Object.values(webRuntime)) document.documentElement.removeAttribute(axis.attribute);
});

describe("useTokenContext in a mounted <Theme> (ADR-0019 rule 7)", () => {
  it("returns what readContext returns and re-renders on every watchContext event", async () => {
    const seen: TokenContext[] = [];
    function Probe(): ReactNode {
      const context = useTokenContext();
      seen.push(context);
      return <output>{JSON.stringify(context)}</output>;
    }
    const element = await mount(
      <Theme>
        <Probe />
      </Theme>,
    );
    const shown = (): TokenContext => JSON.parse(element.querySelector("output")?.textContent ?? "{}") as TokenContext;
    expect(shown()).toEqual(readContext());

    const renders = seen.length;
    await act(async () => {
      query("contrast").set(true);
      await Promise.resolve();
    });
    expect(shown().contrast).toBe("more");
    expect(shown()).toEqual(readContext());

    const cleanup = mountRoot({ colorScheme: "dark", density: "regular" });
    await settle();
    expect(shown()).toMatchObject({ colorScheme: "dark", density: "regular", contrast: "more" });
    expect(shown()).toEqual(readContext());

    await act(async () => {
      query("motion").set(true);
      await Promise.resolve();
    });
    expect(shown().motion).toBe("reduce");
    expect(shown()).toEqual(readContext());
    expect(seen.length).toBeGreaterThanOrEqual(renders + 3);

    cleanup();
    await settle();
    expect(shown()).toEqual(readContext());
  });
});

describe("Surface's glass fallback on the client (ADR-0022 rule 1, ADR-0025 rule 1)", () => {
  const material = (element: HTMLElement): string | undefined => element.querySelector<HTMLElement>("[data-ds-slot='surface']")?.dataset["dsMaterial"];

  it("follows Increase Contrast and Reduce Transparency from the OS, both ways", async () => {
    const element = await mount(
      <Theme>
        <Surface material="glass" backdrop="map" />
      </Theme>,
    );
    expect(material(element)).toBe("glass");
    const surface = element.querySelector<HTMLElement>("[data-ds-slot='surface']");
    expect(surface === null ? "" : getComputedStyle(surface).backdropFilter).toMatch(/blur/);

    await act(async () => {
      query("contrast").set(true);
      await Promise.resolve();
    });
    expect(material(element)).toBe("raised");
    expect(element.querySelector("[data-ds-slot='surface-edge']")).toBeNull();

    await act(async () => {
      query("contrast").set(false);
      query("transparency").set(true);
      await Promise.resolve();
    });
    expect(material(element)).toBe("raised");

    await act(async () => {
      query("transparency").set(false);
      await Promise.resolve();
    });
    expect(material(element)).toBe("glass");
  });

  it("drops the blur and the shadow at once under Reduce Motion and crossfades the fill (ADR-0023 §8.4)", async () => {
    const element = await mount(
      <Theme>
        <Surface material="glass" backdrop="map" elevation="overlay" />
      </Theme>,
    );
    const surface = element.querySelector<HTMLElement>("[data-ds-slot='surface']");
    if (surface === null) throw new Error("no surface");
    const durations = (): Record<string, string> => {
      const style = getComputedStyle(surface);
      const properties = style.transitionProperty.split(",").map((value) => value.trim());
      const times = style.transitionDuration.split(",").map((value) => value.trim());
      return Object.fromEntries(properties.map((property, index) => [property, times[index] ?? ""]));
    };
    const standard = durations();
    expect(standard["backdrop-filter"]).not.toBe("0s");
    expect(standard["box-shadow"]).toBe(standard["backdrop-filter"]);
    expect(standard["--ds--surface-fill"]).toBe(standard["backdrop-filter"]);

    // motion.css switches under the attribute (or the real media query), so the flag comes from <html>.
    const restore = mountRoot({ motion: "reduce" });
    await settle();
    const reduced = durations();
    expect(reduced["backdrop-filter"]).toBe("0s");
    expect(reduced["box-shadow"]).toBe("0s");
    expect(reduced["--ds--surface-fill"]).not.toBe("0s");
    expect(reduced["color"]).toBe(reduced["--ds--surface-fill"]);

    await act(async () => {
      query("contrast").set(true);
      await Promise.resolve();
    });
    expect(material(element)).toBe("raised");
    expect(getComputedStyle(surface).backdropFilter).toBe("none");
    restore();
    await settle();
  });

  it("lets an explicit <Theme> choice win over the OS, and renders a selected glass surface inverse", async () => {
    query("contrast").set(true);
    const element = await mount(
      <Theme contrast="standard">
        <Surface material="glass" backdrop="image" />
      </Theme>,
    );
    expect(material(element)).toBe("glass");
    await act(async () => {
      root?.render(
        <Theme contrast="more">
          <Surface material="glass" backdrop="image" selected />
        </Theme>,
      );
      await Promise.resolve();
    });
    await settle();
    expect(material(element)).toBe("inverse");
  });
});

describe("the glass chip shape on the client (ADR-0036 §3, §7)", () => {
  /** What the chip shape reads besides Prism's contrast and transparency, which come from the OS here. */
  interface ChipInputs {
    readonly fill: SurfaceChipFill;
    readonly ground: SurfaceContextValue;
    readonly enclosure: SurfaceChipEnclosure;
    readonly gate: SurfaceChipGate;
    readonly publishes: SurfaceChipPublication;
  }

  /** One render of the probe: what `useSurfaceChip` handed back, and what the resolver answers for that render's inputs. */
  interface ChipRender {
    readonly resolution: SurfaceChipResolution;
    readonly expected: SurfaceChipResolution;
  }

  it("resolves again whenever an input it reads changes, one input at a time (useSurfaceChip's memo)", async () => {
    const renders: ChipRender[] = [];
    function ChipProbe(props: { readonly fill: SurfaceChipFill; readonly gate: SurfaceChipGate; readonly publishes: SurfaceChipPublication }): ReactNode {
      const { fill, gate, publishes } = props;
      const ground = useContext(SurfaceContext);
      const enclosure = useContext(SurfaceChipEnclosureContext);
      const { contrast, transparency } = useTokenContext();
      const chip = useSurfaceChip(() => fill, { gate, publishes });
      renders.push({ resolution: chip.resolution, expected: resolveSurfaceChip(fill, ground, { enclosure, gate, publishes }, { contrast, transparency }) });
      return <span {...chip.rootProps} />;
    }
    const tree = (inputs: ChipInputs): ReactNode => (
      <Theme>
        <SurfaceContext.Provider value={inputs.ground}>
          <SurfaceChipEnclosureContext.Provider value={inputs.enclosure}>
            <ChipProbe fill={inputs.fill} gate={inputs.gate} publishes={inputs.publishes} />
          </SurfaceChipEnclosureContext.Provider>
        </SurfaceContext.Provider>
      </Theme>
    );
    const last = (): ChipRender => {
      const render = renders.at(-1);
      if (render === undefined) throw new Error("the probe never rendered");
      return render;
    };

    // A glass chip on the page over a map: it renders the recipe and blurs.
    let inputs: ChipInputs = { fill: "glass", ground: { material: "page", backdrop: "map", depth: 0 }, enclosure: "none", gate: "content", publishes: "ground" };
    await mount(tree(inputs));
    expect(last().resolution).toEqual(last().expected);
    expect(last().resolution.blursBackdrop).toBe(true);

    const rerender = async (change: Partial<ChipInputs>): Promise<void> => {
      inputs = { ...inputs, ...change };
      await act(async () => {
        root?.render(tree(inputs));
        await Promise.resolve();
      });
    };
    const setting = async (axis: "contrast" | "transparency", on: boolean): Promise<void> => {
      await act(async () => {
        query(axis).set(on);
        await Promise.resolve();
      });
    };
    // Each step changes one input and moves the resolution, so a memo that did not list that input would hand the
    // previous resolution back, and the step fails.
    const steps: readonly (readonly [string, () => Promise<void>])[] = [
      ["the ground: the page over no media, where glass falls back", () => rerender({ ground: { material: "page", backdrop: "none", depth: 0 } })],
      ["the gate: chrome, which needs no media", () => rerender({ gate: "chrome" })],
      ["the enclosure translucent, inside a chip that renders glass or nothing, which drops the blur", () => rerender({ enclosure: "translucent" })],
      ["the enclosure opaque, inside a chip that renders its own cell or its fallback, which the chip hands on", () => rerender({ enclosure: "opaque" })],
      ["the publication: raised", () => rerender({ publishes: "raised" })],
      ["what the part asks for: its own cell", () => rerender({ fill: "own" })],
      ["what the part asks for: glass again", () => rerender({ fill: "glass" })],
      ["Increase Contrast on", () => setting("contrast", true)],
      ["Increase Contrast off", () => setting("contrast", false)],
      ["Reduce Transparency on", () => setting("transparency", true)],
    ];
    for (const [name, step] of steps) {
      const before = last().expected;
      await step();
      expect(last().expected, `${name} moves the resolution`).not.toEqual(before);
      expect(last().resolution, name).toEqual(last().expected);
    }
  });
});

describe("Surface in the browser (Surface.yaml behavior)", () => {
  const slot = (element: HTMLElement, name: string): HTMLElement => {
    const found = element.querySelector<HTMLElement>(`[data-ds-slot='${name}']`);
    if (found === null) throw new Error(`no ${name}`);
    return found;
  };

  it("keeps a nested radius within its parent's radius minus its padding, at every depth", async () => {
    const element = await mount(
      <Theme density="compact">
        <Surface radius="cardLarge" data-probe="outer">
          <Surface material="nested" radius="cardLarge" data-probe="middle">
            <Surface material="raised" radius="cardLarge" padding="none" data-probe="inner" />
          </Surface>
        </Surface>
      </Theme>,
    );
    const px = (probe: string): number => {
      const node = element.querySelector<HTMLElement>(`[data-probe='${probe}']`);
      return node === null ? Number.NaN : Number.parseFloat(getComputedStyle(node).borderTopLeftRadius);
    };
    const padding = Number.parseFloat(getComputedStyle(slot(element, "surface")).paddingTop);
    expect(padding).toBeGreaterThan(0);
    expect(px("middle")).toBeCloseTo(px("outer") - padding, 3);
    expect(px("inner")).toBeCloseTo(Math.max(0, px("middle") - padding), 3);
  });

  it("paints the page under raised, with its top edge, and publishes nothing it does not render", async () => {
    const element = await mount(
      <Theme>
        <Surface material="raised" />
      </Theme>,
    );
    const style = getComputedStyle(slot(element, "surface"));
    expect(style.boxShadow).toMatch(/inset/);
    expect(style.backgroundImage).toMatch(/gradient/);
    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.fontSynthesis).toBe("none");
  });

  it("draws the vivid bloom, fill, grain and edge, and drops the bloom under Reduce Transparency", async () => {
    const element = await mount(
      <Theme>
        <Surface material="vivid" vivid="2" />
      </Theme>,
    );
    expect(getComputedStyle(slot(element, "surface-fill")).backgroundImage).toMatch(/linear-gradient/);
    expect(getComputedStyle(slot(element, "surface-grain")).backgroundImage).toMatch(/^url\("data:image\/png;base64,/);
    expect(getComputedStyle(slot(element, "surface-grain")).mixBlendMode).toBe("overlay");
    expect(getComputedStyle(slot(element, "surface-bloom")).filter).toMatch(/blur/);
    expect(getComputedStyle(slot(element, "surface-edge")).backgroundImage).toMatch(/linear-gradient/);

    await act(async () => {
      query("transparency").set(true);
      await Promise.resolve();
    });
    expect(element.querySelector("[data-ds-slot='surface-bloom']")).toBeNull();
    expect(element.querySelector("[data-ds-slot='surface-fill']")).not.toBeNull();
  });
});

describe("Text in the browser", () => {
  beforeAll(async () => {
    await document.fonts.ready;
  });

  it("computes font-synthesis: none (ADR-0021 rule 8)", async () => {
    const element = await mount(
      <Theme>
        <Text role="body-md">
          Upright <em>emphasis</em>
        </Text>
      </Theme>,
    );
    const text = element.querySelector<HTMLElement>(".ds-text");
    const emphasis = element.querySelector("em");
    expect(text).not.toBeNull();
    expect(emphasis).not.toBeNull();
    if (text === null || emphasis === null) return;
    expect(getComputedStyle(text).fontSynthesis).toBe("none");
    expect(getComputedStyle(emphasis).fontSynthesis).toBe("none");
  });

  it("schedules no animation in either motion context (Text.yaml reduceMotion: instant, ADR-0023 rule 9)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const element = await mount(
        <Theme motion={motion}>
          <Text role="metric-xl" trailing=".4" unit="%">
            86
          </Text>
        </Theme>,
      );
      for (const node of element.querySelectorAll<HTMLElement>("[data-ds-slot^='text']")) {
        const style = getComputedStyle(node);
        expect(style.animationName, motion).toBe("none");
        expect(style.transitionDuration.split(",").every((duration) => duration.trim() === "0s"), motion).toBe(true);
      }
      await act(async () => {
        root?.unmount();
        await Promise.resolve();
      });
      root = null;
      host?.remove();
      host = null;
    }
  });

  const widths = async (role: TextRole, numeric: "auto" | "tabular", scheme: "light" | "dark"): Promise<{ ones: number; zeros: number; family: string; tabular: boolean }> => {
    const element = await mount(
      <Theme colorScheme={scheme}>
        <div>
          <Text role={role} numeric={numeric} data-probe="ones">
            1111
          </Text>
          <br />
          <Text role={role} numeric={numeric} data-probe="zeros">
            0000
          </Text>
        </div>
      </Theme>,
    );
    const ones = element.querySelector<HTMLElement>("[data-probe='ones']");
    const zeros = element.querySelector<HTMLElement>("[data-probe='zeros']");
    if (ones === null || zeros === null) throw new Error("probes missing");
    const style = getComputedStyle(ones);
    await document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, "0123456789");
    const family = style.fontFamily.split(",")[0]?.replaceAll('"', "").trim() ?? "";
    const result = {
      ones: ones.getBoundingClientRect().width,
      zeros: zeros.getBoundingClientRect().width,
      family,
      tabular: style.fontVariantNumeric.includes("tabular-nums"),
    };
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
    root = null;
    host?.remove();
    host = null;
    return result;
  };

  /**
   * The roles that carry digits at a size where a figure-width difference is measurable. Which of them
   * is tabular is not spelled here: `numeric: auto` follows the role's own `fontVariantNumeric` token
   * (ADR-0021 §5), so the test reads that token off the rendered element and asserts the width it
   * implies. A change to a role's figures in `tokens/ref/typography.tokens.json` therefore moves both
   * sides of this test at once, and never leaves it asserting yesterday's table.
   */
  const NUMERIC_ROLES: readonly TextRole[] = ["data", "metric-md", "metric-lg", "metric-xl"];

  for (const scheme of ["light", "dark"] as const) {
    it.each(NUMERIC_ROLES.map((role) => [role] as const))(`%s renders the figures its type token asks for, ${scheme} (ADR-0021 rule 5)`, async (role) => {
      const { ones, zeros, family, tabular } = await widths(role, "auto", scheme);
      expect(document.fonts.check(`16px "${family}"`)).toBe(true);
      // The negative case of ADR-0021 §5: a proportional role renders "1111" narrower than "0000".
      if (tabular) expect(Math.abs(ones - zeros)).toBeLessThanOrEqual(0.5);
      else expect(zeros - ones).toBeGreaterThan(0.5);
    });

    it.each(NUMERIC_ROLES.map((role) => [role] as const))(`%s renders "1111" and "0000" at one width under numeric tabular, ${scheme} (ADR-0021 §5)`, async (role) => {
      const { ones, zeros, family, tabular } = await widths(role, "tabular", scheme);
      expect(document.fonts.check(`16px "${family}"`)).toBe(true);
      expect(tabular).toBe(true);
      expect(Math.abs(ones - zeros)).toBeLessThanOrEqual(0.5);
    });
  }
});

/**
 * Chip over media in Chromium (roadmap P4-8): what only a painted page can show.
 *
 * - ADR-0036 rule 13 and F4: the pill carries the backdrop filter, the press scale and the disabled opacity on one
 *   element, so a Chip on the map blurs it, one inside a `<Backdrop>` inside a glass Surface blurs its own backdrop,
 *   one on the scheme's glass draws the recipe flat, and a disabled one still blurs: its pixels are the enabled chip's
 *   at `opacity.disabled` over the map.
 * - ADR-0037 rules 1 and 2, on the ADR's own fixture: a 140 × 40 host with 4 px of padding, a 32 × 32 circle inside it
 *   whose background follows Avatar's `root.background` table, and 2 px red and blue stripes under both, declared as a
 *   map. Inside a host that renders nothing the circle computes `backdrop-filter: none` and its centre pixel is the red
 *   stripe under the recipe's fill; inside a host that renders its own cell, `color.bg.surface.nested`, it falls back,
 *   and the 8 × 8 mean at its centre is `color.bg.surface.raised` over `color.bg.page`. In both schemes. The SwiftUI
 *   twin is swift/Tests/DSSnapshotTests/DSSurfaceChipRenderTests.swift.
 * - ADR-0037 rule 4 with a real host: a Chip's Avatar resolves the same at rest and pressed, on every ground and under
 *   every setting, never blurs, and renders glass exactly where the Chip does. The press is forced as the component
 *   tests force it, with Space held on the focused chip.
 *
 * Pixels are read from a screenshot of the element Chromium painted (`page.screenshot`), decoded on a canvas.
 */
describe("Chip over media in Chromium (roadmap P4-8: ADR-0036 rule 13, ADR-0037 rules 1, 2 and 4)", () => {
  const noop = (): void => undefined;

  // The test frame is scaled down to fit the browser window when it is taller than the window, and a screenshot
  // of a scaled frame blends the 2 px stripes. So these tests run in a frame short enough to be drawn at 1:1, and
  // every reading checks that it was (`Pixels.scale`).
  let frame: { readonly width: number; readonly height: number } | null = null;
  beforeAll(async () => {
    frame = { width: window.innerWidth, height: window.innerHeight };
    await page.viewport(frame.width, 480);
  });
  afterAll(async () => {
    if (frame !== null) await page.viewport(frame.width, frame.height);
  });

  /** The pixels Chromium painted in an element's box, addressed in CSS pixels from its top-leading corner. */
  interface Pixels {
    readonly scale: number;
    at(x: number, y: number): readonly [number, number, number];
    mean(x: number, y: number, size: number): readonly [number, number, number];
  }

  async function pixelsOf(element: HTMLElement): Promise<Pixels> {
    const base64 = await page.screenshot({ element, save: false });
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("no 2d context");
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = canvas.width / element.getBoundingClientRect().width;
    const at = (x: number, y: number): readonly [number, number, number] => {
      const offset = (Math.floor(y * scale) * canvas.width + Math.floor(x * scale)) * 4;
      return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
    };
    const mean = (x: number, y: number, size: number): readonly [number, number, number] => {
      const sums = [0, 0, 0];
      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column < size; column += 1) {
          const pixel = at(x + column, y + row);
          for (let channel = 0; channel < 3; channel += 1) sums[channel] = (sums[channel] ?? 0) + (pixel[channel] ?? 0);
        }
      }
      return [Math.round((sums[0] ?? 0) / (size * size)), Math.round((sums[1] ?? 0) / (size * size)), Math.round((sums[2] ?? 0) / (size * size))];
    };
    return { scale, at, mean };
  }

  /** The largest difference over red, green and blue, in code values. */
  const distance = (a: readonly number[], b: readonly number[]): number => Math.max(...[0, 1, 2].map((channel) => Math.abs((a[channel] ?? 0) - (b[channel] ?? 0))));

  function find(element: HTMLElement, selector: string): HTMLElement {
    const found = element.querySelector<HTMLElement>(selector);
    if (found === null) throw new Error(`no ${selector}`);
    return found;
  }

  async function unmountNow(): Promise<void> {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });
    root = null;
    host?.remove();
    host = null;
  }

  /** A custom property's value in px, resolved on an element through a probe declaration. */
  function tokenPx(element: HTMLElement, variable: string): number {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.inlineSize = `var(${variable})`;
    element.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }

  /** Space held on a focused control, which React Aria reads as a press, and the release. */
  async function hold(element: HTMLElement): Promise<() => Promise<void>> {
    await act(async () => {
      element.focus();
      element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    return async () => {
      await act(async () => {
        element.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
    };
  }

  // ---- ADR-0036 rule 13 and F4 ----

  it("blurs the map on the map and inside a Backdrop inside a glass Surface, and draws the recipe flat on the scheme's glass", async () => {
    const element = await mount(
      <Theme>
        <Backdrop kind="map">
          <Chip label="Depots" onPress={noop} data-probe="map" />
        </Backdrop>
        <Surface material="glass" backdrop="map">
          <Chip label="In service" onPress={noop} data-probe="glass" />
          <Backdrop kind="image">
            <Chip label="Depots" onPress={noop} data-probe="backdrop-in-glass" />
          </Backdrop>
        </Surface>
      </Theme>,
    );
    const blur = `blur(${String(tokenPx(element, "--ds-material-glass-chip-blur"))}px) saturate(1)`;
    expect(getComputedStyle(find(element, "[data-probe='map']")).backdropFilter).toBe(blur);
    expect(getComputedStyle(find(element, "[data-probe='backdrop-in-glass']")).backdropFilter).toBe(blur);
    const glass = find(element, "[data-probe='glass']");
    expect(glass.getAttribute("data-ds-surface-chip")).toBe("glass");
    expect(glass.hasAttribute("data-ds-surface-chip-flat")).toBe(true);
    expect(getComputedStyle(glass).backdropFilter).toBe("none");
  });

  it("keeps its blur when disabled: its pixels are the enabled chip's, dimmed to opacity.disabled, and not a bare fill's (ADR-0036 F4)", async () => {
    const stripes = "repeating-linear-gradient(90deg, rgb(255, 0, 0) 0px 2px, rgb(0, 0, 255) 2px 4px)";
    // A long label, so the middle of the pill lies more than three standard deviations of the blur from either end,
    // where no edge mode reaches. The two chips and the reference sit one above the other, on the same stripes; the
    // reference is what a disabled chip whose blur was cut would show, the recipe's fill alone at opacity.disabled.
    const label = "Depots and yards on the northern line";
    const element = await mount(
      <Theme>
        <div data-probe="stage" style={{ position: "relative", width: "400px", height: "200px", background: stripes }}>
          <Backdrop kind="map">
            <span style={{ position: "absolute", left: "20px", top: "20px" }}>
              <Chip label={label} onPress={noop} data-probe="enabled" />
            </span>
            <span style={{ position: "absolute", left: "20px", top: "80px" }}>
              <Chip label={label} isDisabled onPress={noop} data-probe="disabled" />
            </span>
          </Backdrop>
          <div style={{ position: "absolute", left: "20px", top: "140px", width: "300px", height: "32px", background: "var(--ds-material-glass-chip)", opacity: "var(--ds-opacity-disabled)" }} />
        </div>
      </Theme>,
    );
    const stage = find(element, "[data-probe='stage']");
    const enabled = find(element, "[data-probe='enabled']");
    const disabled = find(element, "[data-probe='disabled']");
    expect(getComputedStyle(disabled).backdropFilter).toBe(getComputedStyle(enabled).backdropFilter);
    const alpha = Number(getComputedStyle(disabled).opacity);
    expect(alpha).toBeLessThan(1);
    const pixels = await pixelsOf(stage);
    expect(pixels.scale).toBe(1);
    const rect = enabled.getBoundingClientRect();
    expect(rect.width / 2).toBeGreaterThan(3 * tokenPx(stage, "--ds-material-glass-chip-blur"));
    // The middle of the pill, 4 px below its top: above the label, below the stroke and the edge. The map is read
    // below everything, in the same column.
    const x = 20 + Math.round(rect.width / 2);
    const e = pixels.at(x, 20 + 4);
    const d = pixels.at(x, 80 + 4);
    const cut = pixels.at(x, 140 + 4);
    const b = pixels.at(x, 190);
    // The enabled chip, dimmed over the map. Chromium blends the dimmed chip with the backdrop it read for the filter
    // rather than with the page, and that read mixes a little of the neighbouring stripe in (up to 9 code values here,
    // Chromium 153), so the bound is 12 and not 2.
    const dimmed = [0, 1, 2].map((channel) => alpha * (e[channel] ?? 0) + (1 - alpha) * (b[channel] ?? 0));
    expect(distance(d, dimmed), `disabled ${String(d)}, the enabled chip ${String(e)} at ${String(alpha)} over the map ${String(b)}`).toBeLessThanOrEqual(12);
    // Not a bare fill: a disabled chip whose blur the opacity cut would show the reference, and that is more than
    // three times the bound away.
    expect(distance(d, cut), `disabled ${String(d)}, the fill alone ${String(cut)}`).toBeGreaterThan(36);
    // The control: the enabled chip does blur, so its pixel is not the map's sharp stripe.
    expect(distance(e, b), `enabled ${String(e)}, map ${String(b)}`).toBeGreaterThan(20);
  });

  // ---- ADR-0037 rules 1 and 2 ----

  /** ADR-0037's circle: a 32 × 32 chip whose background follows Avatar's `root.background` table, with nothing in it. */
  function Circle(): ReactNode {
    const chip = useSurfaceChip(avatarBackground);
    return (
      <span {...chip.rootProps} data-probe="circle" style={{ display: "block", width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden" }}>
        <SurfaceChipEdge chip={chip} />
      </span>
    );
  }

  /** ADR-0037's host: a 140 × 40 pill with 4 px of padding that hands the chip shape `fill`, its own cell `own`. */
  function Host(props: { readonly fill: SurfaceChipFill; readonly own?: string }): ReactNode {
    const chip = useSurfaceChip(() => props.fill);
    const style = { display: "block", boxSizing: "border-box", width: "140px", height: "40px", padding: "4px", borderRadius: "20px", "--ds--surface-chip-own": props.own } as CSSProperties;
    return (
      <span {...chip.rootProps} data-probe="host" style={style}>
        <SurfaceChipEdge chip={chip} />
        <SurfaceChipScope chip={chip}>
          <Circle />
        </SurfaceChipScope>
      </span>
    );
  }

  const STRIPES = "repeating-linear-gradient(90deg, rgb(255, 0, 0) 0px 2px, rgb(0, 0, 255) 2px 4px)";

  /** The fixture in `scheme`: the host handing `fill`, or no host at all for null, over the stripes declared as a map. */
  async function nest(scheme: "light" | "dark", fill: SurfaceChipFill | null, own?: string): Promise<{ element: HTMLElement; pixels: Pixels }> {
    const element = await mount(
      <Theme colorScheme={scheme}>
        <div data-probe="stage" style={{ width: "140px", height: "40px", background: STRIPES }}>
          <Backdrop kind="map">{fill === null ? <span style={{ display: "block", padding: "4px" }}><Circle /></span> : <Host fill={fill} own={own} />}</Backdrop>
        </div>
      </Theme>,
    );
    const pixels = await pixelsOf(find(element, "[data-probe='stage']"));
    return { element, pixels };
  }

  /** A reference painted in `scheme`: `background` under `over`, read at the centre of an 8 × 8 box. */
  async function reference(scheme: "light" | "dark", background: string, over: string): Promise<readonly [number, number, number]> {
    const element = await mount(
      <Theme colorScheme={scheme}>
        <div data-probe="reference" style={{ width: "8px", height: "8px", background }}>
          <div style={{ width: "8px", height: "8px", background: over }} />
        </div>
      </Theme>,
    );
    const pixels = await pixelsOf(find(element, "[data-probe='reference']"));
    await unmountNow();
    return pixels.at(4, 4);
  }

  it.each(["light", "dark"] as const)("draws a chip inside a host that renders nothing flat: no filter, and the sharp stripe under the fill at its centre, %s (ADR-0037 rule 1)", async (scheme) => {
    const sharp = await reference(scheme, "rgb(255, 0, 0)", "var(--ds-material-glass-chip)");
    const nested = await nest(scheme, "none");
    const circle = find(nested.element, "[data-probe='circle']");
    expect(circle.getAttribute("data-ds-surface-chip")).toBe("glass");
    expect(circle.hasAttribute("data-ds-surface-chip-flat")).toBe(true);
    expect(getComputedStyle(circle).backdropFilter).toBe("none");
    expect(nested.pixels.scale).toBe(1);
    const centre = nested.pixels.at(20, 20);
    expect(distance(centre, sharp), `${scheme}: the centre reads ${String(centre)}, the sharp stripe under the fill ${String(sharp)}`).toBeLessThanOrEqual(2);
    await unmountNow();
    // The control: alone on the map the same circle blurs the stripes, and its centre is far from the sharp stripe.
    const alone = await nest(scheme, null);
    expect(getComputedStyle(find(alone.element, "[data-probe='circle']")).backdropFilter).toMatch(/^blur\(/u);
    const blurred = alone.pixels.at(20, 20);
    expect(distance(blurred, sharp), `${scheme}: alone the centre reads ${String(blurred)}`).toBeGreaterThan(40);
  });

  it.each(["light", "dark"] as const)("falls back inside a host that renders its own cell: raised over the page in the 8 × 8 mean at its centre, %s (ADR-0037 rule 2)", async (scheme) => {
    const fallback = await reference(scheme, "var(--ds-color-bg-page)", "var(--ds-color-bg-surface-raised)");
    const nested = await nest(scheme, "own", "var(--ds-color-bg-surface-nested)");
    expect(find(nested.element, "[data-probe='host']").getAttribute("data-ds-surface-chip")).toBe("own");
    expect(find(nested.element, "[data-probe='circle']").getAttribute("data-ds-surface-chip")).toBe("fallback");
    const mean = nested.pixels.mean(16, 16, 8);
    expect(distance(mean, fallback), `${scheme}: the mean reads ${String(mean)}, raised over the page ${String(fallback)}`).toBeLessThanOrEqual(2);
    await unmountNow();
    // The control: inside a host that renders nothing the circle draws the recipe flat over the stripes instead.
    const flat = await nest(scheme, "none");
    expect(distance(flat.pixels.mean(16, 16, 8), fallback)).toBeGreaterThan(2);
  });

  // ---- ADR-0037 rule 4 ----

  const settings = [
    ["standard", {}],
    ["Reduce Transparency", { transparency: "reduce" }],
    ["Increase Contrast", { contrast: "more" }],
  ] as const;
  const grounds = surfaceMaterials.flatMap((material) => backdropKinds.map((backdrop) => [material, backdrop] as const));

  it.each(grounds)("never lets a press change what its Avatar resolves, on %s over %s, under every setting (ADR-0037 rule 4)", async (material, backdrop) => {
    const read = (element: HTMLElement, selector: string): readonly (string | null)[] => {
      const node = find(element, selector);
      return ["data-ds-surface-chip", "data-ds-surface-chip-flat", "data-ds-surface", "data-ds-backdrop"].map((name) => node.getAttribute(name));
    };
    for (const [setting, axes] of settings) {
      const chip = <Chip label="Anna Petrova" size="md" avatar={{ name: "Anna Petrova" }} onPress={noop} />;
      const staged = material === "page" ? (backdrop === "none" ? chip : <Backdrop kind={backdrop}>{chip}</Backdrop>) : <Surface material={material} backdrop={backdrop}>{chip}</Surface>;
      const element = await mount(<Theme {...axes}>{staged}</Theme>);
      const name = `${material} over ${backdrop} under ${setting}`;
      const pill = find(element, "[data-ds-slot='chip']");
      const rest = read(element, "[data-ds-slot='avatar']");
      const pillRest = read(element, "[data-ds-slot='chip']");
      const release = await hold(find(pill, "[data-ds-slot='chip-body']"));
      expect(pill.hasAttribute("data-pressed"), name).toBe(true);
      expect(read(element, "[data-ds-slot='avatar']"), `${name}: pressed`).toEqual(rest);
      expect(read(element, "[data-ds-slot='chip']"), `${name}: the pill, pressed`).toEqual(pillRest);
      expect(getComputedStyle(find(element, "[data-ds-slot='avatar']")).backdropFilter, name).toBe("none");
      expect(rest[0] === "glass", `${name}: the pill renders ${String(pillRest[0])}, the Avatar ${String(rest[0])}`).toBe(pillRest[0] === "glass");
      if (rest[0] === "glass") expect(rest[1], name).toBe("");
      await release();
      await unmountNow();
    }
  });
});
