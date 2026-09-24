/// <reference types="node" />
/**
 * The export rules of ADR-0019 and the package layout of roadmap P3-4:
 *
 * - rule 11: no export carries a `DS` or `ds` prefix, and every key of `implemented` is a named export;
 * - rule 8: every public component that renders a DOM element accepts `ScopeAttributes` and forwards them
 *   to its root element — a generic test over the exports, so a new component is covered without edits;
 * - rule 13 of ADR-0020 is `lint:literals` kind `brand`; this suite only checks that the package names
 *   no brand in its bundle;
 * - ADR-0036 §8: `Surface` and `Backdrop` are the only public publishers of a surface context, so the
 *   context object, its root value, the resolvers and the chip shape are not exported;
 * - the export map, resolved by a scratch consumer over the built package: `.`, `./styles.css`,
 *   `./spec/*` (C-14's second half) and `./package.json`.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { createElement, isValidElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { packageRoot } from "../scripts/build-styles.ts";
import { EXCLUDED } from "../scripts/copy-spec.ts";
import * as prism from "../src/index.ts";
import { implemented } from "../src/manifest.ts";

const exportNames = Object.keys(prism);

/**
 * Components of this package that render no DOM element of their own, whatever props they are given.
 *
 * Rule 8 cannot be checked against a name in here, so a name only belongs in it when the component renders no
 * element *by design*: the context providers, which return their children. `Theme` provides the token context, and
 * `Backdrop` the page over media (ADR-0036 §8), which is rule 8's existing exception for a provider. A component
 * that draws nothing only because this suite gave it nothing belongs in `MINIMUM_PROPS` instead: putting it here
 * would stop checking it, silently, for as long as the entry lives.
 */
const RENDERS_NO_ELEMENT = new Set(["Theme", "Backdrop"]);

/**
 * What stays inside the package (ADR-0022 rule 1, ADR-0036 §8.4 and rule 8): the context object and its root value,
 * through which anything could publish a material it does not paint, and the Surface module's resolvers and chip
 * shape. The two public publishers are `Surface` and `Backdrop`; `useSurfaceContext` reads.
 *
 * The chip's names are here before the chip is (roadmap P4-5), as `MINIMUM_PROPS` runs ahead of its components: a
 * name the package does not define yet is trivially not exported, and is checked from the day it lands.
 */
const INTERNAL = [
  "SurfaceContext",
  "rootSurfaceContext",
  "resolveSurface",
  "resolveSurfaceChip",
  "useSurfaceChip",
  "SurfaceChipScope",
  "SurfaceChipEdge",
  "SurfaceChipEnclosureContext",
] as const;

/**
 * The fewest props a component needs before it renders anything at all — the rest of this suite gives every
 * component two scope attributes and the string `content` as children, and nothing else.
 *
 * Most components draw their root element from that alone, which is why this map is short — Avatar with no
 * props at all draws its circle and the object.user glyph, so it has no entry. Some cannot: Badge
 * renders nothing without a `count` (`variant: count` is its default and 0 hides the badge), and Icon,
 * IconButton and Chip have props their specs mark `required: true`. Without an entry such a component renders
 * no element, the assertion below fails, and the tempting repair is to drop the name into
 * `RENDERS_NO_ELEMENT` — which passes, and quietly stops checking ADR-0019 rule 8 for a component that does
 * render an element. So: an entry here, not a name there.
 *
 * Every value is the spec's own prop, written the way `spec/components/<Name>.yaml` writes it, and an entry may
 * be in place before the component is: a name that this package does not export yet is simply not reached, and
 * applies itself on the day the export lands. The icon ids are registry ids (`iconRegistry`, ADR-0013).
 */
const MINIMUM_PROPS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  // Badge.yaml `count`: "required when `variant: count`", which is the default, "and 0 hides the badge".
  Badge: { count: 3 },
  // Icon.yaml `name`, required: a registry id.
  Icon: { name: "nav.back" },
  // IconButton.yaml `glyph`, `label` and `onPress`, all required; the label is never inferred from the glyph.
  IconButton: { glyph: "nav.back", label: "Back", onPress: () => {} },
  // Chip.yaml `label`, required.
  Chip: { label: "Route L24" },
};

/** Where this package reads the specs from: the repository's own `spec/components`. */
const SPEC_COMPONENTS = join(packageRoot, "..", "..", "..", "spec", "components");

describe("names (ADR-0019 rule 11)", () => {
  it("carry no DS or ds prefix", () => {
    expect(exportNames.filter((name) => /^(DS|ds)[A-Z]/.test(name))).toEqual([]);
  });

  it("include every component the manifest declares", () => {
    expect(Object.keys(implemented).length).toBeGreaterThan(0);
    for (const component of Object.keys(implemented)) {
      expect(exportNames, component).toContain(component);
      expect(typeof (prism as Record<string, unknown>)[component], component).toBe("function");
    }
  });

  it("declare every web platform at a spec version, never a platform the spec rules out", () => {
    for (const [component, platforms] of Object.entries(implemented)) {
      const specText = readFileSync(join(SPEC_COMPONENTS, `${component}.yaml`), "utf8");
      const specVersion = Number(/^specVersion: (\d+)$/m.exec(specText)?.[1]);
      for (const platform of ["web-touch", "web-desktop"] as const) {
        const support = new RegExp(`^  ${platform}: (\\w+)$`, "m").exec(specText)?.[1];
        if (support === "none") expect(platforms[platform], `${component} ${platform}`).toBeUndefined();
        else expect(platforms[platform], `${component} ${platform}`).toBe(specVersion);
      }
    }
  });
});

describe("the surface context (ADR-0022 rule 1, ADR-0036 §8)", () => {
  it("has two public publishers, Surface and Backdrop, and one reader", () => {
    expect(typeof prism.Surface).toBe("function");
    expect(typeof prism.Backdrop).toBe("function");
    expect(typeof prism.useSurfaceContext).toBe("function");
  });

  it.each(INTERNAL.map((name) => [name] as const))("keeps %s inside the package", (name) => {
    expect(exportNames).not.toContain(name);
  });
});

describe("ScopeAttributes (ADR-0019 rule 8)", () => {
  const components = exportNames.filter((name) => /^[A-Z]/.test(name) && typeof (prism as Record<string, unknown>)[name] === "function" && !RENDERS_NO_ELEMENT.has(name));

  it("covers every exported component", () => {
    expect(components).toEqual(expect.arrayContaining(Object.keys(implemented)));
  });

  it("gives the two escape hatches one job each", () => {
    // A component is checked here unless it is in `RENDERS_NO_ELEMENT`, and a component that needs props to draw
    // anything is in `MINIMUM_PROPS`. A name in both would be a component excused from the check *and* carrying
    // the props for it, which is how the excuse survives long after the reason for it is gone.
    for (const name of Object.keys(MINIMUM_PROPS)) {
      expect(RENDERS_NO_ELEMENT.has(name), `${name} is in MINIMUM_PROPS and in RENDERS_NO_ELEMENT`).toBe(false);
      // Entries may run ahead of the implementation, but only for a component the repository has a spec for:
      // this is what catches a misspelt name, which would otherwise be a silently unused entry.
      expect(existsSync(join(SPEC_COMPONENTS, `${name}.yaml`)), `MINIMUM_PROPS names ${name}, which is no spec`).toBe(true);
      const exported = (prism as Record<string, unknown>)[name];
      if (exported !== undefined) expect(typeof exported, name).toBe("function");
    }
  });

  it.each(components.map((name) => [name] as const))("%s forwards data-ds-color-scheme and data-ds-density to its root element", (name) => {
    const Component = (prism as unknown as Record<string, ComponentType<Record<string, unknown>>>)[name];
    expect(Component).toBeDefined();
    const props = { ...(MINIMUM_PROPS[name] ?? {}), "data-ds-color-scheme": "dark", "data-ds-density": "regular" };
    const element = createElement(Component as ComponentType<Record<string, unknown>>, props, "content");
    expect(isValidElement(element)).toBe(true);
    // Inside <Theme tokens>, which renders no element: glyphs take their cut from the brand table.
    const html = renderToStaticMarkup(createElement(prism.Theme, { tokens }, element));
    const root = /^<[a-z0-9]+([^>]*)>/.exec(html)?.[1];
    expect(
      root,
      `${name} rendered no element from ${JSON.stringify(props)}. If it draws nothing until it is given a prop — Badge needs a count, Icon a name — add that prop to MINIMUM_PROPS in this file. Add the name to RENDERS_NO_ELEMENT only if it renders no element by design, whatever it is given: that list is not checked against rule 8 at all.`,
    ).toBeDefined();
    expect(root).toContain('data-ds-color-scheme="dark"');
    expect(root).toContain('data-ds-density="regular"');
  });
});

describe("the bundle (ADR-0020 rule 13)", () => {
  it("imports no brand table and no brand stylesheet", () => {
    const bundle = readFileSync(join(packageRoot, "dist", "index.js"), "utf8");
    expect(bundle).not.toMatch(/prism-tokens\/(?:tokens|brands\/)/);
    expect(bundle).not.toMatch(/(?:tokens|fonts)\.css/);
  });

  it("bundles no Phosphor glyph and never the whole icon set: one module per registry id", () => {
    const bundle = readFileSync(join(packageRoot, "dist", "index.js"), "utf8");
    const phosphor = [...bundle.matchAll(/from "(@phosphor-icons\/react[^"]*)"/g)].map((match) => match[1]);
    expect(phosphor.length).toBeGreaterThan(0);
    expect(phosphor.every((specifier) => specifier?.startsWith("@phosphor-icons/react/dist/csr/"))).toBe(true);
  });
});

describe("the export map, as a consumer resolves it", () => {
  let fixture = "";
  let consumerRequire: ReturnType<typeof createRequire>;

  beforeAll(() => {
    expect(existsSync(join(packageRoot, "dist", "index.js")), "build the package first: pnpm --filter @iiiivaska/prism-react build").toBe(true);
    fixture = mkdtempSync(join(tmpdir(), "prism-react-consumer-"));
    mkdirSync(join(fixture, "node_modules", "@iiiivaska"), { recursive: true });
    symlinkSync(packageRoot, join(fixture, "node_modules", "@iiiivaska", "prism-react"), "dir");
    writeFileSync(join(fixture, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
    writeFileSync(join(fixture, "app.js"), "");
    consumerRequire = createRequire(join(fixture, "app.js"));
  });

  afterAll(() => {
    if (fixture !== "") rmSync(fixture, { recursive: true, force: true });
  });

  it.each([
    ["@iiiivaska/prism-react", "dist/index.js"],
    ["@iiiivaska/prism-react/styles.css", "dist/styles.css"],
    ["@iiiivaska/prism-react/spec/components/Surface.yaml", "spec/components/Surface.yaml"],
    ["@iiiivaska/prism-react/spec/components/Text.yaml", "spec/components/Text.yaml"],
    ["@iiiivaska/prism-react/spec/components/Button.yaml", "spec/components/Button.yaml"],
    ["@iiiivaska/prism-react/spec/components/Card.yaml", "spec/components/Card.yaml"],
    ["@iiiivaska/prism-react/spec/SCHEMA.md", "spec/SCHEMA.md"],
    ["@iiiivaska/prism-react/package.json", "package.json"],
  ])("%s → %s", (specifier, file) => {
    const resolved = consumerRequire.resolve(specifier);
    expect(resolved.endsWith(file), resolved).toBe(true);
    expect(existsSync(resolved)).toBe(true);
  });

  it("ships no SF Symbol name: spec/icons stays out of the package (ADR-0013 rule 5)", () => {
    expect(existsSync(join(packageRoot, "spec", "components"))).toBe(true);
    expect(existsSync(join(packageRoot, "spec", "icons"))).toBe(false);
  });

  it("ships the repository's spec byte for byte, every file of it", () => {
    const repositorySpec = join(packageRoot, "..", "..", "..", "spec");
    const files = readdirSync(repositorySpec, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(repositorySpec, join(entry.parentPath, entry.name)))
      .filter((file) => !EXCLUDED.includes(file.split(sep)[0] ?? ""));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(join(packageRoot, "spec", file)).equals(readFileSync(join(repositorySpec, file))), file).toBe(true);
    }
  });

  it("carries the data-viz contracts too, because prism-charts ships no spec of its own (critic C-14)", () => {
    // One copy of `spec/` reaches a consumer, and `agent/SKILL.md` names its path. A chart spec has to
    // be in it, or an agent working on @iiiivaska/prism-charts would have nowhere to read the contract.
    for (const chart of ["LineChart", "AreaChart", "Sparkline", "ChartContainer"]) {
      expect(existsSync(join(packageRoot, "spec", "components", `${chart}.yaml`)), chart).toBe(true);
    }
  });

  it("lists dist and spec in files", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { files: string[]; style: string; sideEffects: string[] };
    expect(manifest.files).toEqual(["dist", "spec"]);
    for (const entry of manifest.files) {
      expect(existsSync(join(packageRoot, entry)), `files lists ${entry}, which the package does not have`).toBe(true);
    }
    expect(manifest.style).toBe("./dist/styles.css");
    expect(manifest.sideEffects).toEqual(["**/*.css"]);
  });
});
