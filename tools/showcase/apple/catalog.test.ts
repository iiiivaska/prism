// The generated Apple catalogues are what this run renders (docs/showcase.md §5).
//
// This is the whole CI cost of the showcase: it runs under `pnpm -r test` on ubuntu, with no Xcode and no
// simulator, exactly as `tools/parity/report.test.ts` does for the parity report. A spec, an example, a token or
// a manifest that moves without a regenerate fails here, naming the file to regenerate.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../tokens/ir/bundle.ts";
import { fsReader, memoryReader, overlayReader } from "../../tokens/source/reader.ts";
import { appleImplemented, GENERATED_ROOT, renderCatalogs } from "./catalog.ts";

const reader = fsReader(REPO_ROOT);

describe("the Apple showcase catalogues", () => {
  const { files, problems } = renderCatalogs(reader);

  it("renders without a problem", () => {
    expect(problems).toEqual([]);
  });

  it("writes exactly the three files the target expects", () => {
    expect(files.map((f) => f.path)).toEqual([
      `${GENERATED_ROOT}/DSShowcaseBindings.swift`,
      `${GENERATED_ROOT}/DSShowcaseCatalog.swift`,
      `${GENERATED_ROOT}/DSTokenCatalog.swift`,
    ]);
  });

  for (const file of files) {
    it(`${file.path} is current`, () => {
      const path = join(REPO_ROOT, file.path);
      expect(existsSync(path), `${file.path} is missing: run \`pnpm showcase:apple --generate\``).toBe(true);
      expect(readFileSync(path, "utf8"), `${file.path} is stale: run \`pnpm showcase:apple --generate\``).toBe(file.contents);
    });
  }

  it("carries every spec, implemented or not, so the app can never silently omit one", () => {
    const catalog = files.find((f) => f.path.endsWith("DSShowcaseCatalog.swift"))?.contents ?? "";
    const specs = [
      ...reader.list("spec/components").filter((e) => e.name.endsWith(".yaml")),
      ...reader.list("spec/patterns").filter((e) => e.name.endsWith(".yaml")),
    ].map((e) => e.name.replace(/\.yaml$/, ""));
    expect(specs.length).toBeGreaterThan(0);
    for (const name of specs) expect(catalog, `${name} is not in the catalogue`).toContain(`name: "${name}"`);
  });

  it("gives every colour row a colorset to print, including the comp tier's aliases", () => {
    // A `comp` colour is a whole-value alias of a system token and carries no `asset` of its own, so 86 of the
    // 188 colour rows used to print the words "aliased colorset" beside a swatch that was right. The generator
    // resolves the alias from the tier's own documents; a colour it cannot resolve is a problem, not a blank.
    const tokens = files.find((f) => f.path.endsWith("DSTokenCatalog.swift"))?.contents ?? "";
    const rows = [...tokens.matchAll(/value: \.color\((?<body>[^\n]*?)\)\),?$/gm)].map((m) => m.groups?.["body"] ?? "");
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.filter((row) => row.includes(", nil, "))).toEqual([]);
    expect(tokens).toContain('.color(\\.components.button.ghostBorder, DSColorToken(rawValue: "color-border-strong"), "color.border.strong")');
    // A `sys` colour is the colorset itself, so it names no alias.
    expect(tokens).toContain('.color(\\.color.borderStrong, DSColorToken(rawValue: "color-border-strong"), nil)');
  });

  it("binds a renderer to exactly the components the Apple manifests implement", () => {
    const bindings = files.find((f) => f.path.endsWith("DSShowcaseBindings.swift"))?.contents ?? "";
    const problems: string[] = [];
    const implemented = [...appleImplemented(reader, problems).keys()].sort();
    expect(problems).toEqual([]);
    const bound = [...bindings.matchAll(/"([A-Za-z]+)": DS([A-Za-z]+)Renderer\(\)/g)].map((m) => m[1] ?? "").sort();
    expect(bound).toEqual(implemented);
  });

  it("carries every `type: action` prop of the spec, so a handler is staged and not invented", () => {
    // A closure is never example data, and what it changes is visible: a Card with `action: open` and no
    // `onAction` is not pressable and draws no open glyph (Card.yaml behavior 4), so an example staged
    // without one diverges from the gallery baseline. The web harness injects a no-op for each of these;
    // Apple reads them back through `DSSpecExample.handler(_:)`.
    const catalog = renderCatalogs(reader).files.find((f) => f.path.endsWith("DSShowcaseCatalog.swift"))?.contents ?? "";
    const card = catalog.slice(catalog.indexOf("static let specCard:"));
    const cardExamples = card.slice(0, card.indexOf("static let spec", 1));
    const staged = [...cardExamples.matchAll(/actions: \[([^\]]*)\]/g)].map((m) => m[1] ?? "");
    expect(staged.length).toBeGreaterThan(0);
    expect(new Set(staged)).toEqual(new Set(['"onAction"']));
    expect(catalog).toContain('actions: ["onPress"]');
  });

  it("names a renderer that does not exist yet when a component lands, which is what stops the app going stale", () => {
    // The manifest with one more component in it: the file the build would write then names `DSBadgeRenderer`,
    // and `DSShowcase` does not compile until somebody writes it.
    const manifest = reader.readText("swift/Sources/DSComponents/Manifest.swift");
    const faked = manifest.replace(
      '"Button": ["ios": 3',
      '"Badge": ["ios": 1, "ipados": 1, "macos": 1],\n        "Button": ["ios": 3',
    );
    expect(faked).not.toBe(manifest);
    const landed = renderCatalogs(
      overlayReader(reader, memoryReader({ "swift/Sources/DSComponents/Manifest.swift": faked })),
    );
    const bindings = landed.files.find((f) => f.path.endsWith("DSShowcaseBindings.swift"))?.contents ?? "";
    expect(bindings).toContain('"Badge": DSBadgeRenderer()');
    const catalog = landed.files.find((f) => f.path.endsWith("DSShowcaseCatalog.swift"))?.contents ?? "";
    expect(catalog).toContain('implemented: [("ios", 1), ("ipados", 1), ("macos", 1)]');
  });
});
