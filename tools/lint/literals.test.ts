import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { formatFinding, RULE_IDS, scanSource, scanTree } from "./literals.ts";

const fixtures = join(import.meta.dirname, "fixtures");
const cli = join(import.meta.dirname, "literals.ts");

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

/**
 * `expect: <rule>[, <rule>]` and `miss: <rule>[, <rule>]` annotations of a fixture tree, as
 * `path:line rule` strings. Annotations sit in comments, which the scanner ignores.
 */
function annotations(root: string, tag: "expect" | "miss"): string[] {
  const out: string[] = [];
  for (const file of files(root)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        const m = new RegExp(`\\b${tag}:\\s*([a-z]+/[a-z-]+(?:\\s*,\\s*[a-z]+/[a-z-]+)*)`).exec(line);
        for (const rule of m?.[1]?.split(/\s*,\s*/) ?? []) out.push(`${relative(root, file)}:${i + 1} ${rule}`);
      });
  }
  return out.sort();
}

describe("scanTree", () => {
  it("passes a clean tree: comments, token accessors and generated output are allowed", () => {
    const result = scanTree(join(fixtures, "clean"));
    expect(result.findings).toEqual([]);
    expect(result.filesScanned).toBe(3);
  });

  it("reports every literal in a tampered tree and skips generated output", () => {
    const found = scanTree(join(fixtures, "tampered")).findings.map(
      ({ file, line, kind, text }) => `${file}:${line} ${kind} ${text}`,
    );
    expect(found).toEqual([
      "swift/Sources/DSCore/Theme.swift:4 color Color(red:",
      'swift/Sources/DSCore/Theme.swift:5 color #0A84FF',
      'swift/Sources/DSCore/Theme.swift:6 font .custom("',
      "swift/Sources/DSCore/Theme.swift:6 font Onest",
      'swift/Sources/DSCore/Theme.swift:7 font .custom("',
      "swift/Sources/DSCore/Theme.swift:7 font JetBrains Mono",
      "swift/Sources/DSCore/Theme.swift:8 color #colorLiteral(",
      "swift/Sources/DSCore/Theme.swift:9 dimension 11pt",
      "web/packages/react/src/Button.tsx:3 dimension 8px",
      "web/packages/react/src/Button.tsx:3 dimension 12px",
      "web/packages/react/src/Button.tsx:4 color #fff",
      'web/packages/react/src/Button.tsx:5 font fontFamily: "',
      "web/packages/react/src/Button.tsx:5 font Inter",
      "web/packages/react/src/Button.tsx:5 font system-ui",
      "web/packages/react/src/Button.tsx:6 dimension 1px",
      "web/packages/react/src/Button.tsx:6 dimension 2px",
      "web/packages/react/src/Button.tsx:6 color rgba(0",
      "web/packages/react/src/button.css:2 dimension 4px",
      "web/packages/react/src/button.css:2 dimension 8px",
      "web/packages/react/src/button.css:3 color oklch(0",
      "web/packages/react/src/button.css:4 color #0a84ffcc",
      "web/packages/react/src/button.css:5 font font-family: Menlo, monospace",
      "web/packages/react/src/button.css:5 font Menlo",
      "web/packages/react/src/button.css:6 dimension 0.5pt",
    ]);
  });

  it("refuses a root whose layout matches no scan directory", () => {
    expect(() => scanTree(join(fixtures, "does-not-exist"))).toThrow(/swift\/Sources matches no directory/);
  });
});

describe.each([
  ["motion", "ADR-0023 §12", 12],
  ["typography", "ADR-0021 §12", 8],
  ["runtime", "ADR-0019 rule 1", 6],
  ["brand", "ADR-0020 rule 13", 5],
  ["material", "ADR-0036 §10", 9],
] as const)("kind %s (%s)", (kind, reference, patterns) => {
  const hit = join(fixtures, kind, "hit");
  const miss = join(fixtures, kind, "miss");
  const ids = RULE_IDS.filter((id) => id.startsWith(`${kind}/`));

  it("has a hit and a miss fixture line for every pattern", () => {
    expect(ids.length).toBeGreaterThanOrEqual(patterns);
    const hits = new Set(annotations(hit, "expect").map((a) => a.split(" ")[1]));
    const misses = new Set(annotations(miss, "miss").map((a) => a.split(" ")[1]));
    expect(ids.filter((id) => !hits.has(id))).toEqual([]);
    expect(ids.filter((id) => !misses.has(id))).toEqual([]);
    expect([...hits, ...misses].filter((id) => !RULE_IDS.includes(id ?? ""))).toEqual([]);
  });

  it("every pattern hits exactly the lines its fixture marks, and nothing else", () => {
    const found = scanTree(hit).findings.map((f) => `${f.file}:${f.line} ${f.rule}`).sort();
    expect(found).toEqual(annotations(hit, "expect"));
    expect(scanTree(hit).findings.every((f) => f.kind === kind)).toBe(true);
  });

  it("no pattern hits its counter-fixture", () => {
    expect(scanTree(miss).findings).toEqual([]);
  });

  it(`lint:literals fails on the ${kind}-literal fixture and passes on its counter-fixture`, () => {
    const failing = runCli("--root", hit);
    expect(failing.status).toBe(1);
    expect(failing.stdout).toMatch(new RegExp(`: ${kind} literal `));
    expect(failing.stderr).toContain(reference);
    const passing = runCli("--root", miss);
    expect(passing.status).toBe(0);
    expect(passing.stdout).toContain("no literal values in");
  });
});

describe("scanSource", () => {
  it.each([
    ["color: #abc;", ".css", "color"],
    ['const accent = "#A1B2C3D4";', ".ts", "color"],
    ["color: rgb(255 0 0);", ".css", "color"],
    ["fill: hsl(210 50% 40%);", ".css", "color"],
    ["color: color(display-p3 1 0 0);", ".css", "color"],
    ["let c = Color(.sRGB, red: 1, green: 0, blue: 0)", ".swift", "color"],
    ["let c = UIColor(white: 0.5, alpha: 1)", ".swift", "color"],
    ["margin: -4px;", ".css", "dimension"],
    ["width: .5px;", ".css", "dimension"],
    ['const size = "13pt";', ".ts", "dimension"],
    ['font-family: "Helvetica Neue", sans-serif;', ".css", "font"],
    ['let f = NSFont(name: "Menlo", size: 12)', ".swift", "font"],
    ["style.fontFamily = 'Geist';", ".ts", "font"],
    ["transition: transform 0.2s;", ".css", "motion"],
    ["transition-delay: .05s;", ".css", "motion"],
    ["animation: spin 1s linear infinite;", ".css", "motion"],
    ["const css = `transition: opacity 120ms`;", ".ts", "motion"],
    ['const easing = "cubic-bezier(.2, 0, 0, 1)";', ".ts", "motion"],
    ["withAnimation() { x = 1 }", ".swift", "motion"],
    ["view.animation(.linear, value: x)", ".swift", "motion"],
    ["let s = Spring(duration: 0.3, bounce: 0)", ".swift", "motion"],
    ["const c = { 'stiffness': 400 };", ".ts", "motion"],
    ["<Spring damping={20} />", ".tsx", "motion"],
    ["font-weight: bold;", ".css", "typography"],
    ["font-synthesis: small-caps;", ".css", "typography"],
    [":root { color: red; font-size: 20px }", ".css", "typography"],
    ['const c = cn("text-sm", "font-bold");', ".ts", "typography"],
    ["Text(t).bold()", ".swift", "typography"],
    ['<div data-ds-density="regular" />', ".tsx", "runtime"],
    ["[data-ds-contrast='more'] a { opacity: 1 }", ".css", "runtime"],
    ["el.dataset.dsColorScheme = 'dark';", ".ts", "runtime"],
    ["@media (prefers-color-scheme: dark) { a { opacity: 1 } }", ".css", "runtime"],
    ['const q = matchMedia("(any-hover: hover)");', ".ts", "runtime"],
    ["@media (pointer:coarse) { a { opacity: 1 } }", ".css", "runtime"],
    ['const c = cn("lg:dark:bg-ds-page");', ".ts", "runtime"],
    ["a { @variant any-pointer-coarse { opacity: 1 } }", ".css", "runtime"],
    ["if context.transparency != .reduced { return }", ".swift", "material"],
    ["guard case .standard = tokens.context.transparency else { return }", ".swift", "material"],
    ["let mirror = pixels.content.saturation(recipe.saturate)", ".swift", "material"],
  ])("flags %j", (source, extension, kind) => {
    expect(scanSource(source, extension).map((finding) => finding.kind)).toContain(kind);
  });

  it.each([
    ["#if os(iOS)\n#endif", ".swift"],
    ["#Preview { Text(verbatim: value) }", ".swift"],
    ["let ok = #expect(true)", ".swift"],
    ["// issue #1590 moved 12px to a token", ".ts"],
    ["/// Hit target is 44pt on touch", ".swift"],
    ["/* #fff and Inter */ a { color: var(--ds-color-text-primary); }", ".css"],
    ["/* outer /* nested #fff */ still 12px */ let x = 1", ".swift"],
    ["padding: var(--ds-space-3);", ".css"],
    ["background: rgb(from var(--ds-color-bg-fill-accent) r g b / 50%);", ".css"],
    ['const url = "https://example.com/docs#section";', ".ts"],
    ["const opt = 1, h1px = 2, mask = 0x1f;", ".ts"],
    ["text-justify: inter-word;", ".css"],
    ["const Interaction = true;", ".ts"],
    ["background-image: url(//cdn.example.com/noise.png);", ".css"],
    ['{ "color": "#fff" }', ".json"],
    // motion: outside declarations, calls and names that only look alike
    ["const linear = (t: number) => t; export const half = linear(0.5);", ".ts"],
    ["const mass = spring.mass; if (mass === 1) run();", ".ts"],
    ["// transition: opacity 150ms", ".ts"],
    ["gap: 1s;", ".css"],
    ["let d = DSSpringToken(duration: 0.35, bounce: 0.15, blendDuration: 0, settle: 0.487, mass: 1, stiffness: 1, damping: 1)", ".swift"],
    ["withAnimation(tokens.motion.springSnappy.animation) { x = 1 }", ".swift"],
    // runtime: generated names and variants, part attributes, the :hover pseudo-class, code that only looks alike
    ['const q = matchMedia(webRuntime.motion.media.query);', ".ts"],
    ['<div data-ds-slot="button" className="ds-touch:h-ds-control-lg" />', ".tsx"],
    ["a:hover, a:is(:hover) { pointer-events: none; }", ".css"],
    ["const pick = (hover: boolean) => hover;", ".ts"],
    ['const scheme = "light dark";', ".ts"],
    ["a { @variant ds-contrast-more { opacity: 1 } }", ".css"],
    // typography
    ["body { font-size: var(--ds-type-body-md-font-size); }", ".css"],
    [".html-root { font-size: var(--x); }", ".css"],
    ["font-weight: var(--ds-type-body-md-font-weight);", ".css"],
    ["const boldness = item.fontWeight;", ".ts"],
    // material: a forced context, an assignment, another enum's case, another axis and a longer name
    // compare no transparency, and the public dsBackdrop hands pixels down without naming them
    ["let forced = DSTokenContext(colorScheme: .light, transparency: .reduced)", ".swift"],
    ["self.transparency = transparency", ".swift"],
    ["if axis == .transparency { return }", ".swift"],
    ["let hairline = context.contrast == .increased", ".swift"],
    ["let high = 1 == style.transparencyLevel", ".swift"],
    ["chip.dsBackdrop(.map) { DSExampleMap() }", ".swift"],
  ])("ignores %j", (source, extension) => {
    expect(scanSource(source, extension)).toEqual([]);
  });

  it("scopes rules by directory: DSCore builds fonts and reads Reduce Motion; swift/Tests is checked for settlingDuration only", () => {
    const font = "let f = UIFont(descriptor: d, size: 0)";
    expect(scanSource(font, ".swift", "swift/Sources/DSCore/Text.swift")).toEqual([]);
    expect(scanSource(font, ".swift", "swift/Sources/DSComponents/Text.swift").map((f) => f.rule)).toEqual(["typography/swift-platform-font"]);
    const reduce = "@Environment(\\.accessibilityReduceMotion) var reduce";
    expect(scanSource(reduce, ".swift", "swift/Sources/DSCore/Policy.swift")).toEqual([]);
    expect(scanSource(reduce, ".swift", "swift/Sources/DSCharts/Line.swift").map((f) => f.rule)).toEqual(["motion/reduce-motion-setting"]);
    const test = "#expect(Spring(duration: 0.35, bounce: 0.15).settlingDuration > 0); let c = Color(red: 1, green: 0, blue: 0)";
    expect(scanSource(test, ".swift", "swift/Tests/DSTokensTests/A.swift", "tests").map((f) => f.rule)).toEqual(["motion/settling-duration"]);
  });

  it("checks the brand kind in the two consumer packages only (ADR-0020 rule 13)", () => {
    const table = 'import * as tokens from "@iiiivaska/prism-tokens/brands/prism-native/tokens";';
    const css = 'import "@iiiivaska/prism-tokens/brands/prism/tokens.css";';
    for (const file of ["web/packages/react/src/Surface.tsx", "web/packages/charts/src/LineChart.tsx"]) {
      expect(scanSource(table, ".tsx", file).map((f) => f.rule), file).toEqual(["brand/token-module"]);
      expect(scanSource(css, ".tsx", file).map((f) => f.rule), file).toEqual(["brand/stylesheet"]);
    }
    // The app and the tokens package itself import a brand's table and CSS; the rule is about the
    // two component packages, which read brand values through brandTokens() (ADR-0020 §6).
    for (const file of ["web/packages/tokens/src/index.ts", "web/packages/react/dist/index.js"]) {
      expect(scanSource(table, ".ts", file), file).toEqual([]);
      expect(scanSource(css, ".ts", file), file).toEqual([]);
    }
  });

  it("leaves the brand-invariant subpaths and a component's own stylesheet alone", () => {
    for (const source of [
      'import { brandTokens, scope } from "@iiiivaska/prism-tokens";',
      'import { useBrandTokens } from "@iiiivaska/prism-tokens/react";',
      'import "@iiiivaska/prism-tokens/motion.css";',
      'import "@iiiivaska/prism-tokens/tailwind.css";',
      'import "./surface.css";',
      'import "./surface-tokens.css";',
      'import { table } from "./tokens.ts";',
    ]) {
      expect(scanSource(source, ".ts", "web/packages/react/src/Surface.tsx"), source).toEqual([]);
    }
  });

  it("keeps glass inside the Surface module: DSCore and its Surface directory on Apple, src/surface/ on the web (ADR-0036 §10)", () => {
    const rules = (source: string, extension: string, file: string, scope?: "tests"): string[] => scanSource(source, extension, file, scope).map((f) => f.rule);
    const pixels = "let recipe = DSGlassAppearance.chip.recipe(tokens.material)";
    const compare = "let reduced = tokens.context.transparency == .reduced";
    expect(rules(pixels, ".swift", "swift/Sources/DSCore/DSSurface.swift")).toEqual([]);
    expect(rules(pixels, ".swift", "swift/Sources/DSComponents/Surface/DSSurfaceChip.swift")).toEqual([]);
    for (const file of ["swift/Sources/DSComponents/Chip/DSChip.swift", "swift/Sources/DSComponents/SurfaceKit/Kit.swift", "swift/Sources/DSCharts/Chart.swift"]) {
      expect(rules(pixels, ".swift", file), file).toEqual(["material/swift-backdrop-pixels"]);
    }
    // The fallback is DSCore's alone: the Surface directory draws glass but compares nothing.
    expect(rules(compare, ".swift", "swift/Sources/DSCore/DSSurface.swift")).toEqual([]);
    expect(rules(compare, ".swift", "swift/Sources/DSComponents/Surface/DSSurfaceChip.swift")).toEqual(["material/swift-transparency-read"]);
    // The suites build recipes and compare the context on purpose; no material rule reads swift/Tests.
    expect(rules(`${pixels}\n${compare}`, ".swift", "swift/Tests/DSCoreTests/DSSurfaceChipResolutionTests.swift", "tests")).toEqual([]);

    const css = "a { backdrop-filter: blur(var(--ds-material-glass-chip-blur)); }";
    const script = 'const reduced = useTokenContext().transparency === "reduce";';
    expect(rules(css, ".css", "web/packages/react/src/surface/Surface.css")).toEqual([]);
    expect(rules(script, ".ts", "web/packages/react/src/surface/resolve.ts")).toEqual([]);
    // Every package, and a directory whose name only starts like the module's.
    for (const dir of ["web/packages/react/src/chip", "web/packages/react/src/surfaces", "web/packages/charts/src", "web/packages/tokens/src/runtime"]) {
      expect(rules(css, ".css", `${dir}/x.css`), dir).toEqual(["material/web-backdrop-filter", "material/web-glass-recipe"]);
      expect(rules(script, ".ts", `${dir}/x.ts`), dir).toEqual(["material/web-transparency-read"]);
    }
  });

  it("reports a comparison with transparency and the glass names on the web, not a read, the runtime's names or the scrim", () => {
    const file = "web/packages/react/src/chip/Chip.tsx";
    const rules = (source: string): string[] => scanSource(source, ".tsx", file).map((f) => f.rule);
    for (const source of [
      'const reduced = "reduce" !== context.transparency;',
      "switch (context.transparency) {",
      'const opaque = <span className="ds-reduce-transparency:ds-chip-opaque" />;',
    ]) {
      expect(rules(source), source).toEqual(["material/web-transparency-read"]);
    }
    for (const source of ['el.style.webkitBackdropFilter = "none";', 'const style = { WebkitBackdropFilter: "none" };', 'el.style.setProperty("-webkit-backdrop-filter", "none");']) {
      expect(rules(source), source).toEqual(["material/web-backdrop-filter"]);
    }
    expect(rules("const name = `--ds-material-glass-${recipe}`;")).toEqual(["material/web-glass-recipe"]);
    expect(rules('const tint = "var(--ds-material-glass-scrim-strong)";')).toEqual(["material/web-glass-recipe"]);
    for (const source of [
      "const { contrast, transparency } = useTokenContext();",
      'const key = [contrast, transparency].join(" ");',
      'if (axis === "transparency") return;',
      'type Axes = Pick<TokenContext, "contrast" | "transparency">;',
      "const pick = (transparency: string) => transparency;",
      "const high = 1 === settings.transparencyLevel;",
      'const scrim = "linear-gradient(transparent, var(--ds-material-glass-scrim))";',
      'const own = { "--ds--surface-chip-own": "var(--ds-color-bg-surface-raised)", "--ds--chip-backdrop-filter": "none" };',
    ]) {
      expect(rules(source), source).toEqual([]);
    }
    // The runtime kind owns the attribute, the dataset key and the media feature, and material does not
    // report them again.
    expect(rules('const reduced = attributes["data-ds-transparency"] === "reduce";')).toEqual(["runtime/attribute"]);
    expect(rules('const reduced = element.dataset.dsTransparency === "reduce";')).toEqual(["runtime/dataset"]);
    expect(rules('const query = matchMedia("(prefers-reduced-transparency: reduce)");')).toEqual(["runtime/media-preference"]);
  });

  it("reports runtime-owned names once, under the runtime kind and never under motion (ADR-0023 §12)", () => {
    for (const [source, extension] of [
      ["@media (prefers-reduced-motion: reduce) { a { opacity: 1 } }", ".css"],
      ['const attrs = { "data-ds-motion": "reduce" };', ".ts"],
      ['const c = "motion-safe:animate-none";', ".ts"],
      ["a { @variant motion-reduce { opacity: 1 } }", ".css"],
    ] as const) {
      expect(scanSource(source, extension).map((f) => f.kind), source).toEqual(["runtime"]);
    }
  });

  it("skips test files for the runtime kind only, and never checks Swift for it", () => {
    const source = 'const a = "data-ds-motion", q = "(pointer: coarse)", c = "#fff";';
    expect(scanSource(source, ".ts", "web/packages/tokens/src/runtime/read.ts").map((f) => f.rule)).toEqual(["runtime/attribute", "runtime/media-pointer", "color/hex"]);
    expect(scanSource(source, ".ts", "web/packages/tokens/src/runtime/read.test.ts").map((f) => f.rule)).toEqual(["color/hex"]);
    expect(scanSource('let a = "data-ds-motion"', ".swift", "swift/Sources/DSCore/Runtime.swift")).toEqual([]);
  });

  it("reports a string-borne CSS literal in script files only inside a string", () => {
    expect(scanSource("const timing = linear(0.3);", ".ts")).toEqual([]);
    expect(scanSource('const timing = "linear(0, 1)";', ".ts").map((f) => f.text)).toEqual(["linear(0, 1)"]);
    expect(scanSource('<p className="italic" />', ".tsx").map((f) => [f.rule, f.column])).toEqual([["typography/italic", 15]]);
    expect(scanSource("const italic = true;", ".ts")).toEqual([]);
  });

  it("keeps line and column positions when comments are blanked", () => {
    const [finding] = scanSource("/* a\n   b */ x = 1\nconst c = '#123456';", ".ts", "f.ts");
    expect(finding).toEqual({ file: "f.ts", line: 3, column: 12, kind: "color", rule: "color/hex", text: "#123456" });
    expect(finding && formatFinding(finding)).toBe('f.ts:3:12: color literal "#123456" (color/hex)');
  });

  it("reports the literal itself, not the declaration around it", () => {
    const [time] = scanSource("  transition: opacity var(--ds-motion-easing-out) 150ms;", ".css");
    expect(time).toMatchObject({ rule: "motion/css-time", column: 51, text: "150ms" });
    const [root] = scanSource("html {\n  color: black;\n  font-size: 20pt;\n}", ".css").filter((f) => f.kind === "typography");
    expect(root).toMatchObject({ line: 3, column: 3, text: "font-size: 20pt" });
  });
});

describe("CLI", () => {
  it("exits 0 on a clean tree", () => {
    const run = runCli("--root", join(fixtures, "clean"));
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("no literal values in 3 files");
  });

  it("exits 1 on a tampered tree and prints path:line:column for each hit", () => {
    const run = runCli("--root", join(fixtures, "tampered"));
    expect(run.status).toBe(1);
    const lines = run.stdout.trim().split("\n");
    expect(lines).toHaveLength(24);
    expect(lines[0]).toBe('swift/Sources/DSCore/Theme.swift:4:36: color literal "Color(red:" (color/native)');
    expect(lines.every((line) => /^[\w/.]+:\d+:\d+: (color|dimension|font) literal .* \([a-z]+\/[a-z-]+\)$/.test(line))).toBe(true);
    expect(run.stderr).toContain("24 literal values in 3 files");
  });

  it("exits 2 when the root does not have the expected layout", () => {
    const run = runCli("--root", join(fixtures, "does-not-exist"));
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("matches no directory");
  });
});
