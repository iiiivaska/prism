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
 *
 * The OS preferences come from a controllable `matchMedia` installed before the runtime first reads one;
 * the attribute names and queries are spelled here on purpose, to check the generated contract
 * independently (ADR-0019 rule 1).
 */
import "@iiiivaska/prism-tokens/tokens.css";
import "@iiiivaska/prism-tokens/brands/prism/fonts.css";
import "@iiiivaska/prism-tokens/motion.css";
import "@iiiivaska/prism-react/styles.css";

import { act, useContext, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Surface, Text, Theme, mountRoot, readContext, useTokenContext, webRuntime, type TextRole, type TokenContext } from "@iiiivaska/prism-react";
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
import { useSurfaceChip } from "../../../packages/react/src/surface/SurfaceChip.tsx";

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
