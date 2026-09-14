import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatFinding, scanSource, scanTree } from "./literals.ts";

const fixtures = join(import.meta.dirname, "fixtures");
const cli = join(import.meta.dirname, "literals.ts");

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
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
  ])("ignores %j", (source, extension) => {
    expect(scanSource(source, extension)).toEqual([]);
  });

  it("keeps line and column positions when comments are blanked", () => {
    const [finding] = scanSource("/* a\n   b */ x = 1\nconst c = '#123456';", ".ts", "f.ts");
    expect(finding).toEqual({ file: "f.ts", line: 3, column: 12, kind: "color", text: "#123456" });
    expect(finding && formatFinding(finding)).toBe('f.ts:3:12: color literal "#123456"');
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
    expect(lines[0]).toBe('swift/Sources/DSCore/Theme.swift:4:36: color literal "Color(red:"');
    expect(lines.every((line) => /^[\w/.]+:\d+:\d+: (color|dimension|font) literal /.test(line))).toBe(true);
    expect(run.stderr).toContain("24 literal values in 3 files");
  });

  it("exits 2 when the root does not have the expected layout", () => {
    const run = runCli("--root", join(fixtures, "does-not-exist"));
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("matches no directory");
  });
});
