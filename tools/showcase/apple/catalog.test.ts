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
import { appleImplemented, GENERATED_ROOT, renderCatalogs, TESTS_GENERATED_ROOT } from "./catalog.ts";

const reader = fsReader(REPO_ROOT);

describe("the Apple showcase catalogues", () => {
  const { files, problems } = renderCatalogs(reader);

  it("renders without a problem", () => {
    expect(problems).toEqual([]);
  });

  it("writes exactly the four files the two targets expect", () => {
    // Three for the showcase app, and one for `DSComponentsTests`: a generator that starts writing somewhere
    // else is a generator that can drop a file into the tree nobody reads, so the list is exact and not a
    // `toContain`.
    expect(files.map((f) => f.path)).toEqual([
      `${GENERATED_ROOT}/DSShowcaseBindings.swift`,
      `${GENERATED_ROOT}/DSShowcaseCatalog.swift`,
      `${GENERATED_ROOT}/DSTokenCatalog.swift`,
      `${TESTS_GENERATED_ROOT}/DSTokenKeyPaths.swift`,
    ]);
  });

  for (const file of files) {
    it(`${file.path} is current`, () => {
      const path = join(REPO_ROOT, file.path);
      expect(existsSync(path), `${file.path} is missing: run \`pnpm showcase:apple --generate\``).toBe(true);
      expect(readFileSync(path, "utf8"), `${file.path} is stale: run \`pnpm showcase:apple --generate\``).toBe(file.contents);
    });
  }

  it("gives the binding tests every `sys` and `comp` token, which is what a spec may bind", () => {
    // The table is what turns a cell of `spec/components/<Name>.yaml` into the key path the Apple implementation
    // must return (`swift/Tests/DSComponentsTests/DSSpecBindings.swift`). A token missing from it is a cell the
    // binding test cannot check, and it would go missing quietly, so the list is compared with the manifest.
    const manifest = JSON.parse(reader.readText("web/packages/tokens/src/generated/manifest.json")) as {
      tokens: { readonly path: string; readonly tier: string; readonly swift: string | null }[];
    };
    const table = files.find((f) => f.path.endsWith("DSTokenKeyPaths.swift"))?.contents ?? "";
    const listed = [...table.matchAll(/^ {8}"([^"]+)": \\\./gm)].map((m) => m[1] ?? "").sort();
    // `ref` primitives have no Swift API, and the three font faces are not a key path into the token set.
    const bindable = manifest.tokens
      .filter((t) => t.tier !== "ref" && t.swift !== null && !t.swift.startsWith("DSBrand.faces"))
      .map((t) => t.path)
      .sort();
    expect(bindable.length).toBeGreaterThan(300);
    expect(listed).toEqual(bindable);
    // A `comp` token, a `sys` colour (which hangs off `DSColor` in the manifest and off the token set here), and a
    // type role, rooted where `DSTextRole.keyPath` is rooted so the two compare directly.
    expect(table).toContain('"comp.button.primary.bg.rest": \\.components.button.primaryBgRest,');
    expect(table).toContain('"color.bg.fill.inverse-media": \\.color.bgFillInverseMedia,');
    expect(table).toContain("static let typography: [String: KeyPath<DSTokenSet.Typography, DSTypeRole>]");
    expect(table).toContain('"type.label.md": \\.labelMd,');
  });

  it("reports a token whose Swift member moved instead of leaving it out of the table", () => {
    // The failure mode this closes: a renamed member drops its token from the table, and the binding test that
    // reads the cell then says "the catalogue binds no such token" about a token that has one. The generator
    // refuses to write anything instead (`generate.ts` exits 1 on any problem).
    const path = "swift/Sources/DSTokens/Generated/DSTokenSet+Space.swift";
    const doctored = reader.readText(path).replace("public let step3: CGFloat", "public let step3Renamed: CGFloat");
    const { problems } = renderCatalogs(overlayReader(reader, memoryReader({ [path]: doctored })));
    expect(problems).toContain("space.3: no Swift member type for DSTokenSet.space.step3 — the key-path table is stale");
  });

  it("reports a notes.platform key that is not a platform instead of dropping its note", () => {
    // A misspelt key used to be filtered out here, so its note left the app without a word while the spec still
    // validated; the schema now refuses it too (spec/component.schema.json). The generator refuses to write.
    const path = "spec/components/Divider.yaml";
    const text = reader.readText(path);
    expect(text).toContain("\n    watchos: ");
    const doctored = text.replace("\n    watchos: ", "\n    watchoss: ");
    const { problems } = renderCatalogs(overlayReader(reader, memoryReader({ [path]: doctored })));
    expect(problems).toContain(
      "spec/components/Divider.yaml: notes.platform.watchoss is not a spec platform key (ios, ipados, macos, watchos, web-touch, web-desktop)",
    );
  });

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
    // The manifest with one more component in it: the file the build would write then names
    // `DSSkeletonRenderer`, and `DSShowcase` does not compile until somebody writes it.
    //
    // **The name this fakes has to be one nobody is about to implement.** The fake was `Badge` until Phase 4
    // wave 1 put Badge in the next four components to land: the day it lands, the fake stops being a fake —
    // `DSBadgeRenderer` exists, every assertion here passes for the wrong reason, and the gate this test is the
    // only test of goes unguarded. `Skeleton` is in the unobserved tail of the primitive list
    // (docs/roadmap.md P2-5), with nothing queued behind it. When that stops being true, move the fake to
    // another such name; do not delete the test, and do not reach for whatever is being implemented that week.
    const manifest = reader.readText("swift/Sources/DSComponents/Manifest.swift");
    const faked = manifest.replace(
      '"Surface": ["ios": 3',
      '"Skeleton": ["ios": 1, "ipados": 1, "macos": 1],\n        "Surface": ["ios": 3',
    );
    expect(faked).not.toBe(manifest);
    const landed = renderCatalogs(
      overlayReader(reader, memoryReader({ "swift/Sources/DSComponents/Manifest.swift": faked })),
    );
    const bindings = landed.files.find((f) => f.path.endsWith("DSShowcaseBindings.swift"))?.contents ?? "";
    expect(bindings).toContain('"Skeleton": DSSkeletonRenderer()');
    const catalog = landed.files.find((f) => f.path.endsWith("DSShowcaseCatalog.swift"))?.contents ?? "";
    expect(catalog).toContain('implemented: [("ios", 1), ("ipados", 1), ("macos", 1)]');
  });

  it("fakes a component this build does not implement, so the gate above is testing something", () => {
    // The guard on the paragraph above: the moment `Skeleton` acquires a real `DSSkeletonRenderer`, this fails
    // and says to move the fake, rather than letting the staleness gate quietly test nothing.
    const implemented = [...appleImplemented(reader, []).keys()];
    expect(implemented, "Skeleton is implemented now; pick another unimplemented component to fake").not.toContain("Skeleton");
    const renderers = reader.readText("swift/Showcase/Sources/DSShowcase/Examples/DSComponentRenderers.swift");
    expect(renderers).not.toContain("DSSkeletonRenderer");
  });
});
