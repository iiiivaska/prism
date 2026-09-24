/**
 * The glass chip shape of the Surface module (ADR-0036 §2 to §7), internal to the package.
 *
 * - ADR-0036 rule 3: the whole resolution table — what the component asks for × the ground's material ×
 *   its backdrop kind × gate × publication × enclosed × contrast × transparency, 3,456 rows, over grounds
 *   whose depth varies down the table — against an independent statement of §3. It is DSCore's
 *   `DSSurfaceChipResolutionTests` without the watch, which the web never runs on.
 * - The chip and Surface fall back together, for every contrast, transparency and kind, on every ground:
 *   one function evaluates the triggers for both (`glassFallsBack`).
 * - A server-rendered probe host, a component that draws its root through the chip shape as Avatar and
 *   Chip will, through `<Theme contrast transparency>`: its root's attributes, its edge part, the context
 *   a child reads with `depth` passed through, and the enclosing-chip flag set inside and cleared by
 *   `Backdrop` (ADR-0036 rule 5). The Apple twin is `DSSurfaceChipTests`' environment probes.
 */
import { useContext, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Theme, type TokenContext } from "@iiiivaska/prism-tokens/react";
import { Backdrop, Surface, useSurfaceContext, type BackdropProps } from "../src/index.ts";
import { InsideGlassChipContext, SurfaceContext, type SurfaceContextValue } from "../src/surface/context.ts";
import {
  backdropKinds,
  resolveSurface,
  resolveSurfaceChip,
  surfaceChipFills,
  surfaceMaterials,
  type BackdropKind,
  type SurfaceChipContext,
  type SurfaceChipFill,
  type SurfaceChipGate,
  type SurfaceChipPublication,
  type SurfaceChipRendering,
  type SurfaceElevation,
  type SurfaceMaterial,
} from "../src/surface/resolve.ts";
import { SurfaceChipEdge, SurfaceChipScope, useSurfaceChip, type SurfaceChipBackground } from "../src/surface/SurfaceChip.tsx";

const gates: readonly SurfaceChipGate[] = ["content", "chrome"];
const publications: readonly SurfaceChipPublication[] = ["ground", "raised"];
const contrasts: readonly TokenContext["contrast"][] = ["standard", "more"];
const transparencies: readonly TokenContext["transparency"][] = ["standard", "reduce"];

interface Row {
  readonly requested: SurfaceChipFill;
  readonly material: SurfaceMaterial;
  readonly backdrop: BackdropKind;
  readonly gate: SurfaceChipGate;
  readonly publishes: SurfaceChipPublication;
  readonly enclosed: boolean;
  readonly contrast: TokenContext["contrast"];
  readonly transparency: TokenContext["transparency"];
  /**
   * The ground's depth: 0, 1 and 2 in turn down the table, not an axis. A chip adds none, so
   * `published.depth` must stay this whichever context the chip publishes; a resolver that wrote a depth
   * of its own, a constant one included, fails every row whose ground has another.
   */
  readonly depth: number;
}

const combinations: readonly Omit<Row, "depth">[] = surfaceChipFills.flatMap((requested) =>
  surfaceMaterials.flatMap((material) =>
    backdropKinds.flatMap((backdrop) =>
      gates.flatMap((gate) =>
        publications.flatMap((publishes) =>
          [false, true].flatMap((enclosed) =>
            contrasts.flatMap((contrast) =>
              transparencies.map((transparency) => ({ requested, material, backdrop, gate, publishes, enclosed, contrast, transparency })),
            ),
          ),
        ),
      ),
    ),
  ),
);

const rows: readonly Row[] = combinations.map((combination, index) => ({ ...combination, depth: index % 3 }));

/** ADR-0036 §3 step 1, written out: the page and the two glasses sit on their backdrop, vivid is media, the rest is paint. */
function expectedMedia(material: SurfaceMaterial, backdrop: BackdropKind): BackdropKind {
  if (material === "page" || material === "glass" || material === "glassLight") return backdrop;
  return material === "vivid" ? "vivid" : "none";
}

interface Expected {
  readonly rendered: SurfaceChipRendering;
  readonly isGlassFallback: boolean;
  readonly hasInvalidBackdrop: boolean;
  readonly blursBackdrop: boolean;
  readonly published: SurfaceContextValue;
  /** What the chip tells its content: a glass chip encloses you (§3 step 8). */
  readonly contentEnclosed: boolean;
}

/** ADR-0036 §3, stated independently of resolve.ts. */
function expected(row: Row): Expected {
  const asksForGlass = row.requested === "glass";
  const hasInvalidBackdrop = asksForGlass && row.gate === "content" && expectedMedia(row.material, row.backdrop) === "none";
  const isGlassFallback = asksForGlass && (row.contrast === "more" || row.transparency === "reduce" || hasInvalidBackdrop);
  const rendered: SurfaceChipRendering = asksForGlass ? (isGlassFallback ? "fallback" : "glass") : row.requested;
  const onGlass = row.material === "glass" || row.material === "glassLight";
  return {
    rendered,
    isGlassFallback,
    hasInvalidBackdrop,
    blursBackdrop: rendered === "glass" && !onGlass && !row.enclosed,
    published:
      isGlassFallback || row.publishes === "raised"
        ? { material: "raised", backdrop: "none", depth: row.depth }
        : { material: row.material, backdrop: row.backdrop, depth: row.depth },
    contentEnclosed: rendered === "glass" || row.enclosed,
  };
}

function ground(row: Pick<Row, "material" | "backdrop" | "depth">): SurfaceContextValue {
  return { material: row.material, backdrop: row.backdrop, depth: row.depth };
}

describe("the chip's resolution table (ADR-0036 rule 3)", () => {
  it("reads and publishes the surface context, field for field", () => {
    // resolve.ts spells the context out rather than import it from context.ts; the two must stay one type.
    expectTypeOf<SurfaceChipContext>().toEqualTypeOf<SurfaceContextValue>();
  });

  it("has 3,456 rows: DSCore's 6,912 without the watch", () => {
    expect(rows.length).toBe(3456);
    expect(new Set(combinations.map((combination) => JSON.stringify(combination))).size).toBe(3456);
    // At every depth, some rows publish (raised, none) and some the ground.
    for (const depth of [0, 1, 2]) {
      const publishesRaised = rows.filter((row) => row.depth === depth).map((row) => expected(row).isGlassFallback || row.publishes === "raised");
      expect(publishesRaised, `depth ${String(depth)}`).toContain(true);
      expect(publishesRaised, `depth ${String(depth)}`).toContain(false);
    }
  });

  it.each(rows)(
    "$requested on $material over $backdrop, gate $gate, publishes $publishes, enclosed $enclosed, contrast $contrast, transparency $transparency",
    (row) => {
      const resolution = resolveSurfaceChip(row.requested, ground(row), { insideGlassChip: row.enclosed, gate: row.gate, publishes: row.publishes }, row);
      const want = expected(row);
      expect(resolution.ground).toEqual(ground(row));
      expect(resolution.requested).toBe(row.requested);
      expect(resolution.rendered).toBe(want.rendered);
      expect(resolution.glass).toBe(want.rendered === "glass" ? "chip" : null);
      expect(resolution.blursBackdrop).toBe(want.blursBackdrop);
      expect(resolution.isGlassFallback).toBe(want.isGlassFallback);
      expect(resolution.hasInvalidBackdrop).toBe(want.hasInvalidBackdrop);
      expect(resolution.paintsPage).toBe(want.isGlassFallback);
      expect(resolution.published).toEqual(want.published);
    },
  );
});

describe("the chip and Surface fall back together (ADR-0036 §3 step 3)", () => {
  const settings = contrasts.flatMap((contrast) => transparencies.map((transparency) => ({ contrast, transparency })));

  it.each(settings.flatMap((setting) => backdropKinds.map((kind) => ({ ...setting, kind }))))(
    "on the page over $kind, contrast $contrast, transparency $transparency: as a glass Surface over it",
    ({ kind, contrast, transparency }) => {
      const chip = resolveSurfaceChip("glass", { material: "page", backdrop: kind, depth: 0 }, { insideGlassChip: false, gate: "content", publishes: "ground" }, { contrast, transparency });
      for (const material of ["glass", "glassLight"] as const) {
        const surface = resolveSurface({ material, backdrop: kind, selected: false }, { contrast, transparency });
        expect(chip.isGlassFallback, material).toBe(surface.isGlassFallback);
        expect(chip.hasInvalidBackdrop, material).toBe(surface.hasInvalidBackdrop);
      }
    },
  );

  it.each(settings.flatMap((setting) => surfaceMaterials.flatMap((material) => backdropKinds.map((kind) => ({ ...setting, material, kind })))))(
    "on $material over $kind, contrast $contrast, transparency $transparency: as a glass Surface over the chip's media, and under chrome over any media",
    ({ material, kind, contrast, transparency }) => {
      const context = { contrast, transparency };
      const on = { material, backdrop: kind, depth: 0 };
      const content = resolveSurfaceChip("glass", on, { insideGlassChip: false, gate: "content", publishes: "ground" }, context);
      const overMedia = resolveSurface({ material: "glass", backdrop: expectedMedia(material, kind), selected: false }, context);
      expect(content.isGlassFallback).toBe(overMedia.isGlassFallback);
      const chrome = resolveSurfaceChip("glass", on, { insideGlassChip: false, gate: "chrome", publishes: "ground" }, context);
      expect(chrome.isGlassFallback).toBe(resolveSurface({ material: "glass", backdrop: "map", selected: false }, context).isGlassFallback);
      expect(chrome.hasInvalidBackdrop).toBe(false);
    },
  );
});

/**
 * A host that draws its root through the chip shape, as Avatar and Chip will: the root props on its own
 * element, the edge first among its children, the rest inside the scope.
 */
function ProbeHost(props: {
  readonly background: SurfaceChipBackground;
  readonly gate?: SurfaceChipGate;
  readonly publishes?: SurfaceChipPublication;
  readonly elevation?: SurfaceElevation;
  readonly children?: ReactNode;
}): ReactNode {
  const { background, gate, publishes, elevation, children } = props;
  const chip = useSurfaceChip(background, { gate, publishes, elevation });
  expect(chip.published).toBe(chip.resolution.published);
  return (
    <span {...chip.rootProps} data-probe-host="">
      <SurfaceChipEdge chip={chip} />
      <SurfaceChipScope chip={chip}>{children}</SurfaceChipScope>
    </span>
  );
}

/** What a child of the host reads: the published context and whether a glass chip encloses it. */
function Probe(): ReactNode {
  const { material, backdrop, depth } = useSurfaceContext();
  const enclosed = useContext(InsideGlassChipContext);
  return <i id="probe">{`${material} ${backdrop} ${depth} ${enclosed ? "enclosed" : "open"}`}</i>;
}

function probe(html: string): string | undefined {
  return /<i id="probe">([^<]*)<\/i>/.exec(html)?.[1];
}

/** The attributes of the probe host's root, the first element of the markup. */
function host(html: string): Record<string, string> {
  const tag = /<span([^>]*data-probe-host[^>]*)>/.exec(html)?.[1] ?? "";
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1] ?? "", match[2] ?? ""]));
}

/** Every `data-ds-slot` part in the markup, in document order. */
function parts(html: string): string[] {
  return [...html.matchAll(/data-ds-slot="([\w-]+)"/g)].map((match) => match[1] ?? "");
}

const always = (fill: SurfaceChipFill): SurfaceChipBackground => () => fill;

describe("a host drawn through the chip shape, rendered on the server (ADR-0036 §4, rule 5)", () => {
  const groups = surfaceChipFills.flatMap((requested) => surfaceMaterials.flatMap((material) => backdropKinds.map((backdrop) => ({ requested, material, backdrop }))));

  it.each(groups)("asks for $requested on $material over $backdrop, through <Theme contrast transparency>, in every gate, publication and enclosure", ({ requested, material, backdrop }) => {
    for (const row of rows.filter((candidate) => candidate.requested === requested && candidate.material === material && candidate.backdrop === backdrop)) {
      const label = `depth ${String(row.depth)}, gate ${row.gate}, publishes ${row.publishes}, enclosed ${String(row.enclosed)}, ${row.contrast}, ${row.transparency}`;
      const html = renderToStaticMarkup(
        <Theme contrast={row.contrast} transparency={row.transparency}>
          <SurfaceContext.Provider value={ground(row)}>
            <InsideGlassChipContext.Provider value={row.enclosed}>
              <ProbeHost background={always(row.requested)} gate={row.gate} publishes={row.publishes}>
                <Probe />
              </ProbeHost>
            </InsideGlassChipContext.Provider>
          </SurfaceContext.Provider>
        </Theme>,
      );
      const want = expected(row);
      const root = host(html);
      expect(html.startsWith("<span"), label).toBe(true);
      expect(root["class"], label).toBe("ds-surface-chip");
      expect(root["data-ds-surface-chip"], label).toBe(want.rendered);
      expect(root["data-ds-surface-chip-flat"], label).toBe(want.rendered === "glass" && !want.blursBackdrop ? "" : undefined);
      expect(root["data-ds-surface"], label).toBe(want.published.material);
      expect(root["data-ds-backdrop"], label).toBe(want.published.backdrop);
      expect(root["data-ds-elevation"], label).toBe("flat");
      // The edge is the root's first child, aria-hidden, exactly when glass renders.
      expect(parts(html), label).toEqual(want.rendered === "glass" ? ["surface-chip-edge"] : []);
      if (want.rendered === "glass") expect(html, label).toMatch(/^<span[^>]*><span data-ds-slot="surface-chip-edge" aria-hidden="true"><\/span>/);
      // The context a child reads, with the ground's depth, and whether a glass chip encloses it.
      expect(probe(html), label).toBe(`${want.published.material} ${want.published.backdrop} ${String(row.depth)} ${want.contentEnclosed ? "enclosed" : "open"}`);
    }
  });

  it("paints glass without <Theme> props and the fallback with contrast more or transparency reduce, as Surface does (ADR-0025 rule 1)", () => {
    const rendering = (node: ReactNode): string | undefined => host(renderToStaticMarkup(node))["data-ds-surface-chip"];
    const chip = <ProbeHost background={always("glass")} />;
    expect(rendering(<Backdrop kind="map">{chip}</Backdrop>)).toBe("glass");
    expect(rendering(<Theme><Backdrop kind="map">{chip}</Backdrop></Theme>)).toBe("glass");
    expect(rendering(<Theme contrast="more"><Backdrop kind="map">{chip}</Backdrop></Theme>)).toBe("fallback");
    expect(rendering(<Theme transparency="reduce"><Backdrop kind="image">{chip}</Backdrop></Theme>)).toBe("fallback");
    // No media under it: the backdrop trigger under the content gate, nothing under chrome.
    expect(rendering(chip)).toBe("fallback");
    expect(rendering(<ProbeHost background={always("glass")} gate="chrome" />)).toBe("glass");
  });

  it("passes the parent's depth through: a chip adds no depth, even inside nested Surfaces and a Backdrop", () => {
    const html = renderToStaticMarkup(
      <Surface material="solid">
        <Surface material="raised">
          <Backdrop kind="map">
            <ProbeHost background={always("glass")}>
              <Probe />
            </ProbeHost>
          </Backdrop>
        </Surface>
      </Surface>,
    );
    expect(probe(html)).toBe("page map 2 enclosed");
    const onVivid = renderToStaticMarkup(
      <Surface material="vivid">
        <ProbeHost background={always("glass")} publishes="raised">
          <Probe />
        </ProbeHost>
      </Surface>,
    );
    expect(probe(onVivid)).toBe("raised none 1 enclosed");
    // A Surface inside the chip counts the Surfaces around the chip, not the chip.
    const surfaceInside = renderToStaticMarkup(
      <Surface material="solid">
        <ProbeHost background={always("own")}>
          <Surface material="nested">
            <Probe />
          </Surface>
        </ProbeHost>
      </Surface>,
    );
    expect(probe(surfaceInside)).toBe("nested none 2 open");
    expect(surfaceInside).toContain('data-ds-depth="odd"');
  });

  it("writes the elevation the host hands it, flat by default", () => {
    for (const elevation of ["flat", "raised", "floating", "overlay"] as const) {
      expect(host(renderToStaticMarkup(<ProbeHost background={always("own")} elevation={elevation} />))["data-ds-elevation"]).toBe(elevation);
    }
    expect(host(renderToStaticMarkup(<ProbeHost background={always("own")} />))["data-ds-elevation"]).toBe("flat");
  });

  it("hands the host's background table the ground it reads", () => {
    const seen: SurfaceContextValue[] = [];
    const background: SurfaceChipBackground = (on) => {
      seen.push(on);
      return on.material === "page" && on.backdrop === "none" ? "own" : "glass";
    };
    const onThePage = renderToStaticMarkup(<ProbeHost background={background} />);
    const onTheMap = renderToStaticMarkup(
      <Surface material="solid">
        <Backdrop kind="map">
          <ProbeHost background={background} />
        </Backdrop>
      </Surface>,
    );
    expect(host(onThePage)["data-ds-surface-chip"]).toBe("own");
    expect(host(onTheMap)["data-ds-surface-chip"]).toBe("glass");
    expect(seen).toEqual([
      { material: "page", backdrop: "none", depth: 0 },
      { material: "page", backdrop: "map", depth: 1 },
    ]);
  });
});

describe("the enclosing-chip flag (ADR-0036 §3 step 8, §5)", () => {
  it("is set inside a glass chip, and a glass chip inside draws no backdrop filter", () => {
    const html = renderToStaticMarkup(
      <Backdrop kind="map">
        <ProbeHost background={always("glass")}>
          <ProbeHost background={always("glass")}>
            <Probe />
          </ProbeHost>
        </ProbeHost>
      </Backdrop>,
    );
    const hosts = [...html.matchAll(/<span([^>]*data-probe-host[^>]*)>/g)].map((match) => match[1] ?? "");
    expect(hosts).toHaveLength(2);
    expect(hosts[0]).toContain('data-ds-surface-chip="glass"');
    expect(hosts[0]).not.toContain("data-ds-surface-chip-flat");
    expect(hosts[1]).toContain('data-ds-surface-chip="glass"');
    expect(hosts[1]).toContain('data-ds-surface-chip-flat=""');
    expect(probe(html)).toBe("page map 0 enclosed");
  });

  it("passes through a chip that renders its own cell, and through a Surface, which neither reads nor writes it", () => {
    const throughOwn = renderToStaticMarkup(
      <Backdrop kind="image">
        <ProbeHost background={always("glass")}>
          <ProbeHost background={always("own")}>
            <Probe />
          </ProbeHost>
        </ProbeHost>
      </Backdrop>,
    );
    expect(probe(throughOwn)).toBe("page image 0 enclosed");
    const throughSurface = renderToStaticMarkup(
      <Backdrop kind="image">
        <ProbeHost background={always("glass")}>
          <Surface material="solid">
            <Probe />
          </Surface>
        </ProbeHost>
      </Backdrop>,
    );
    expect(probe(throughSurface)).toBe("solid none 1 enclosed");
  });

  it("is not set under the fallback, which renders no recipe", () => {
    const html = renderToStaticMarkup(
      <Theme transparency="reduce">
        <Backdrop kind="map">
          <ProbeHost background={always("glass")}>
            <Probe />
          </ProbeHost>
        </Backdrop>
      </Theme>,
    );
    expect(probe(html)).toBe("raised none 0 open");
  });

  it.each(["image", "map", "vivid"] as const)("is cleared by <Backdrop kind=\"%s\">, whose media a glass chip inside blurs", (kind) => {
    const html = renderToStaticMarkup(
      <Backdrop kind="map">
        <ProbeHost background={always("glass")}>
          <Backdrop kind={kind}>
            <Probe />
            <ProbeHost background={always("glass")} />
          </Backdrop>
        </ProbeHost>
      </Backdrop>,
    );
    expect(probe(html)).toBe(`page ${kind} 0 open`);
    const hosts = [...html.matchAll(/<span([^>]*data-probe-host[^>]*)>/g)].map((match) => match[1] ?? "");
    expect(hosts[1]).toContain('data-ds-surface-chip="glass"');
    expect(hosts[1]).not.toContain("data-ds-surface-chip-flat");
  });

  it("stays set through a Backdrop given a kind that is not media, which declares nothing", () => {
    const untyped = { kind: "none" } as unknown as BackdropProps;
    const html = renderToStaticMarkup(
      <Backdrop kind="map">
        <ProbeHost background={always("glass")}>
          <Backdrop {...untyped}>
            <Probe />
          </Backdrop>
        </ProbeHost>
      </Backdrop>,
    );
    expect(probe(html)).toBe("page map 0 enclosed");
  });
});
