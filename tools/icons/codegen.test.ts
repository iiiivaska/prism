// The generated artifacts: determinism, the shape each consumer depends on, and the licence rule that
// keeps SF Symbol names out of everything the web ships (ADR-0013 rule 5).
import { describe, expect, test } from "vitest";
import { renderAll, renderSwiftEnum, renderTokensStudio, renderWebRegistry, renderXcassets, reactComponent, swiftCase } from "./codegen.ts";
import { loadCatalog } from "./phosphor.ts";
import { hasFill, loadRegistry } from "./registry.ts";
import { REPO_ROOT } from "./validate.ts";

const catalog = loadCatalog();
const { registry } = loadRegistry(REPO_ROOT);
if (registry === null) throw new Error("spec/icons/registry.json did not load");

describe("determinism", () => {
  test("two renders produce the same bytes", () => {
    const first = renderAll(registry, catalog).files;
    const second = renderAll(registry, catalog).files;
    expect(second).toEqual(first);
  });

  test("files come back sorted by path, with no duplicates", () => {
    const paths = renderAll(registry, catalog).files.map((file) => file.path);
    expect([...paths].sort()).toEqual(paths);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("iconRegistry (web)", () => {
  const web = renderWebRegistry(registry, catalog);

  test("goes to the React package, next to the Icon that reads it", () => {
    expect(web.path).toBe("web/packages/react/src/generated/icons.ts");
  });

  test("carries every id, its Phosphor name and its React component", () => {
    for (const [id, icon] of Object.entries(registry.icons)) {
      expect(web.contents).toContain(`${JSON.stringify(id)}: { phosphor: ${JSON.stringify(icon.web.phosphor)}`);
    }
    expect(web.contents).toContain('component: "CaretLeftIcon"');
  });

  test("carries no Apple binding at all", () => {
    // Single-word SF names (`circle`, `bell`, `clock`) are ordinary words and appear as tags; the
    // dotted ones are unmistakably SF Symbols, and the `apple` field itself is never emitted.
    for (const icon of Object.values(registry.icons)) {
      if (icon.apple.symbol?.includes(".") === true) expect(web.contents).not.toContain(icon.apple.symbol);
      if (icon.apple.custom !== undefined) expect(web.contents).not.toContain(icon.apple.custom);
    }
    expect(web.contents).not.toContain("apple");
  });

  test("says which entries have no filled drawing, so Icon draws their outline for `filled` (ADR-0035)", () => {
    for (const [id, icon] of Object.entries(registry.icons)) {
      expect(web.contents, id).toMatch(new RegExp(`${JSON.stringify(id).replaceAll(".", "\\.")}: \\{[^\\n]*, fill: ${hasFill(icon)}, since:`));
    }
    expect(web.contents).toContain('"status.check": { phosphor: "check"');
    expect(web.contents).toMatch(/"status\.check": \{[^\n]*, fill: false,/);
    expect(web.contents).toMatch(/"status\.warning": \{[^\n]*, fill: true,/);
  });

  test("exports the map under the name ADR-0019 §6 fixed", () => {
    expect(web.contents).toContain("export const iconRegistry:");
    expect(web.contents).not.toContain("dsIcons");
  });
});

describe("DSIconName (Swift)", () => {
  const swift = renderSwiftEnum(registry);

  test("goes to the DSIcons target", () => {
    expect(swift.path).toBe("swift/Sources/DSIcons/Generated/DSIconName.swift");
  });

  test("has one case per id and both Apple bindings", () => {
    for (const [id, icon] of Object.entries(registry.icons)) {
      expect(swift.contents).toContain(`case ${swiftCase(id)} = ${JSON.stringify(id)}`);
      if (icon.apple.symbol !== undefined) expect(swift.contents).toContain(`case .${swiftCase(id)}: ${JSON.stringify(icon.apple.symbol)}`);
      if (icon.apple.custom !== undefined) expect(swift.contents).toContain(`case .${swiftCase(id)}: ${JSON.stringify(icon.apple.custom)}`);
    }
  });

  test("lists exactly the entries with no filled drawing in `hasFill` (ADR-0035)", () => {
    const unfilled = Object.entries(registry.icons)
      .filter(([, icon]) => !hasFill(icon))
      .map(([id]) => id)
      .sort()
      .map((id) => `.${swiftCase(id)}`);
    expect(unfilled).toContain(".statusCheck");
    expect(swift.contents).toContain(`    public var hasFill: Bool {\n        switch self {\n        case ${unfilled.join(", ")}: false\n        default: true\n`);
  });

  test("resolves a numeric weight token to a weight name (critic C-23)", () => {
    expect(swift.contents).toContain("public init?(number: Int)");
    expect(swift.contents).toContain("case 400: self = .regular");
  });

  test("carries the measured point size of every icon box", () => {
    for (const size of Object.values(registry.sizes)) expect(swift.contents).toContain(`: ${size.sf.pointSize}`);
  });
});

describe("Icons.xcassets (critic G-09)", () => {
  const { files } = renderXcassets(registry, catalog);
  const custom = Object.values(registry.icons).filter((icon) => icon.apple.custom !== undefined);

  test("one image set per Phosphor-derived icon and cut, plus the catalog root and the licence", () => {
    const imagesets = new Set(files.filter((file) => file.path.includes(".imageset/")).map((file) => file.path.split("/").slice(0, -1).join("/")));
    expect(imagesets.size).toBe(custom.length * 6);
    expect(files.map((file) => file.path)).toContain("swift/Sources/DSIcons/Resources/Icons.xcassets/Contents.json");
    expect(files.map((file) => file.path)).toContain("swift/Sources/DSIcons/Resources/Phosphor-LICENSE.txt");
  });

  test("every image set preserves its vector representation and tints as a template", () => {
    for (const file of files.filter((f) => f.path.endsWith(".imageset/Contents.json"))) {
      const contents = JSON.parse(file.contents) as { properties: Record<string, unknown>; images: { filename: string }[] };
      expect(contents.properties["preserves-vector-representation"]).toBe(true);
      expect(contents.properties["template-rendering-intent"]).toBe("template");
      expect(contents.images).toHaveLength(1);
    }
  });

  test("the SVG bytes are the Phosphor sources", () => {
    const svg = files.find((file) => file.path.endsWith("ds.trend-up.regular.imageset/trend-up.svg"));
    expect(svg?.contents).toContain('viewBox="0 0 256 256"');
  });

  test("the licence copy names the version the bytes came from", () => {
    const licence = files.find((file) => file.path.endsWith("Phosphor-LICENSE.txt"));
    expect(licence?.contents).toContain(registry.sources.phosphor.version);
    expect(licence?.contents).toContain("MIT License");
  });
});

describe("Tokens Studio", () => {
  const files = renderTokensStudio(registry);

  test("is one set of `other` tokens holding Phosphor names", () => {
    const set = files.find((file) => file.path.endsWith("icons.json"));
    const parsed = JSON.parse(set?.contents ?? "{}") as { icon: { nav: { back: { $type: string; $value: string } } } };
    expect(parsed.icon.nav.back.$type).toBe("other");
    expect(parsed.icon.nav.back.$value).toBe("caret-left");
  });

  test("never leaks an SF Symbol name into the design-tool export", () => {
    for (const file of files) {
      for (const icon of Object.values(registry.icons)) {
        if (icon.apple.symbol !== undefined && icon.apple.symbol.includes(".")) expect(file.contents).not.toContain(icon.apple.symbol);
      }
    }
  });
});

describe("name mapping", () => {
  test.each([
    ["nav.back", "navBack"],
    ["action.zoom-in", "actionZoomIn"],
    ["status.trend-up", "statusTrendUp"],
  ])("%s becomes %s in Swift", (id, expected) => {
    expect(swiftCase(id)).toBe(expected);
  });

  test("the React component of a Phosphor name is its pascal name plus Icon", () => {
    expect(reactComponent("CaretLeft")).toBe("CaretLeftIcon");
  });
});
