import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatFinding,
  isExempt,
  markdownText,
  markupText,
  parseDenylist,
  scanSource,
  scanTree,
  unescapedText,
} from "./reference-copy.ts";

// The fixtures use an invented denylist (fixtures/reference-copy/denylist.txt), so no real reference
// copy is ever committed as test data (ADR-0015 rule 3). The shipped list is exercised in memory below.
const fixtures = join(import.meta.dirname, "fixtures", "reference-copy");
const fixtureDenylist = join(fixtures, "denylist.txt");
const entries = parseDenylist(readFileSync(fixtureDenylist, "utf8"));
const shipped = parseDenylist(readFileSync(join(import.meta.dirname, "reference-copy.denylist.txt"), "utf8"));
const cli = join(import.meta.dirname, "reference-copy.ts");

function runCli(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

function matched(source: string, file = "sample.yaml"): string[] {
  return scanSource(source, file, entries).map(({ line, entry }) => `${line} ${entry}`);
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** What Python's `json.dumps` and PyYAML write by default: every non-ASCII character as `\uXXXX`. */
const escapeNonAscii = (text: string): string =>
  text.replace(/[^\x20-\x7e]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);

describe("scanTree", () => {
  it("passes a clean tree: near misses, binary files, build output and the analyses are ignored", () => {
    const result = scanTree(join(fixtures, "clean"), entries);
    expect(result.findings).toEqual([]);
    expect(result.filesScanned).toBe(10);
  });

  it("reports every hit in a tampered tree, including the optional web/apps and gallery targets", () => {
    expect(scanTree(join(fixtures, "tampered"), entries).findings.map(formatFinding)).toEqual([
      'agent/SKILL.md:4: reference UI copy "Keeper\'s Log"',
      'agent/SKILL.md:5: reference UI copy "Zephyr Freight Hub"',
      'docs/research/fonts/fonts-analysis.json:1: reference UI copy "Поиск заказчиков"',
      'docs/research/fonts/harness-g1-dark.html:2: reference UI copy "± 9.9 kg"',
      'docs/research/fonts/harness-g1-dark.html:3: reference UI copy "Поиск заказчиков"',
      'docs/research/fonts/harness-g1-dark.html:5: reference UI copy "Zephyr Freight Hub"',
      'gallery/README.md:1: reference UI copy "Orbitak"',
      'spec/components/Card.yaml:3: reference UI copy "Zephyr Freight Hub"',
      'swift/Sources/DSComponents/Card.swift:4: reference UI copy "Q-7781"',
      'swift/Tests/DSComponentsTests/CardTests.swift:4: reference UI copy "Q-7781"',
      'tokens/ref/typography.tokens.json:6: reference UI copy "Orbitak"',
      'web/apps/gallery/.storybook/preview.tsx:1: reference UI copy "Orbitak"',
      'web/apps/gallery/src/Card.stories.tsx:1: reference UI copy "Zephyr Freight Hub"',
      'web/packages/react/src/Card.tsx:2: reference UI copy "$4,321"',
    ]);
  });

  it("refuses a root whose layout lacks a required target", () => {
    expect(() => scanTree(join(fixtures, "does-not-exist"), entries)).toThrow(/spec matches no directory/);
  });
});

describe("parseDenylist", () => {
  it("skips comments and blank lines and records each entry's line", () => {
    const parsed = parseDenylist("# header\n\nOrbitak\n  Zephyr Freight Hub  \n");
    expect(parsed.map(({ line, text }) => `${line} ${text}`)).toEqual(["3 Orbitak", "4 Zephyr Freight Hub"]);
  });

  it.each<[string, RegExp]>([
    ["Q-7\n", /line 1: "Q-7" is shorter than four characters/],
    ["Orbitak\n# again\norbitak\n", /line 3: "orbitak" repeats line 1/],
    ["Keeper's Log\nKEEPER’S  LOG\n", /line 2: .* repeats line 1/],
    ["# only comments\n\n", /no entries/],
  ])("rejects %j", (source, error) => {
    expect(() => parseDenylist(source)).toThrow(error);
  });
});

describe("scanSource", () => {
  it.each<[string, string]>([
    ["title: ZEPHYR freight hub", "1 Zephyr Freight Hub"],
    ["label: zephyrfreighthub", "1 Zephyr Freight Hub"],
    ["hero: ±9.9kg", "1 ± 9.9 kg"],
    ['caption: "Keeper’s log"', "1 Keeper's Log"],
    ["title: ПОИСК ЗАКАЗЧИКОВ", "1 Поиск заказчиков"],
    ['Text("Unit Q-7781")', "1 Q-7781"],
    ['hero: { value: "$4,321" }', "1 $4,321"],
    ["name: Card\nsummary: >-\n  the Zephyr Freight\n  Hub index\n", "3 Zephyr Freight Hub"],
    [String.raw`title: "\u005aephyr Freight Hub"`, "1 Zephyr Freight Hub"],
    [`title: "${escapeNonAscii("Поиск заказчиков")}"`, "1 Поиск заказчиков"],
    [String.raw`hero: "\u00b1 9.9\u00a0kg"`, "1 ± 9.9 kg"],
    [String.raw`caption: 'Keeper\'s Log'`, "1 Keeper's Log"],
    [String.raw`Text("Orbit\u{61}k")`, "1 Orbitak"],
    [String.raw`caption: "Zephyr\nFreight Hub"`, "1 Zephyr Freight Hub"],
  ])("flags %j", (source, hit) => {
    expect(matched(source)).toEqual([hit]);
  });

  it.each([
    "Orbitakia",
    "NeoOrbitak",
    "Q-77810",
    "Q-7781x",
    "$14,321",
    "$4,3210",
    "± 9.95 kg",
    "Zephyr Freight Hubs",
    "Keepers Log",
    "Поиск заказчика",
    String.raw`title: "\\u0051-7781"`,
    "title: The **Zephyr** Freight Hub board",
  ])("ignores %j", (source) => {
    expect(matched(source)).toEqual([]);
  });

  it("reads Markdown without emphasis and code delimiters, and its inline HTML as visible text", () => {
    expect(matched("The **Zephyr** Freight _Hub_ board", "notes.md")).toEqual(["1 Zephyr Freight Hub"]);
    expect(matched("Unit `Q-`7781 and ~~Orbit~~ak", "notes.md")).toEqual(["1 Orbitak", "1 Q-7781"]);
    expect(matched("Zephyr <b>Freight</b>\n  Hub", "notes.mdx")).toEqual(["1 Zephyr Freight Hub"]);
  });

  it("reads HTML and SVG as visible text: tags and entities do not hide a string, and lines stay put", () => {
    const html = '<div>\n<span class="hero">±</span>&nbsp;9.9<span\n  class="unit">kg</span></div>';
    expect(matched(html, "page.html")).toEqual(["2 ± 9.9 kg"]);
    expect(matched('<p>$4,<span class="dim">321</span><span class="unit">/batch</span></p>', "page.html")).toEqual([
      "1 $4,321",
    ]);
    expect(matched("<svg><text>Q-<tspan>7781</tspan></text></svg>", "mark.svg")).toEqual(["1 Q-7781"]);
  });

  it("scans attribute values in markup and leaves tags alone in other files", () => {
    expect(matched('<img alt="Zephyr Freight Hub">', "page.html")).toEqual(["1 Zephyr Freight Hub"]);
    expect(matched('<span class="hero">±</span>&nbsp;9.9<span class="unit">kg</span>', "notes.yaml")).toEqual([]);
  });
});

describe("markupText", () => {
  it("replaces each tag with one marker, keeps line breaks and decodes entities", () => {
    expect(markupText("a<b\n>c&amp;d&#x41;&#66;&bogus;&#x110000;")).toBe("a\uE000\nc&dAB&bogus;&#x110000;");
    expect(markupText("<!-- x\ny -->z").split("\n")).toHaveLength(2);
  });
});

describe("markdownText", () => {
  it("also turns each run of emphasis or code delimiters into one marker", () => {
    const m = String.fromCodePoint(0xe000);
    expect(markdownText("**a** _b_ `c` ~~d~~ <i>e</i> &amp;")).toBe(`${m}a${m} ${m}b${m} ${m}c${m} ${m}d${m} ${m}e${m} &`);
  });
});

describe("unescapedText", () => {
  it("decodes string escapes, keeps line breaks where they are and leaves an escaped backslash alone", () => {
    expect(unescapedText(String.raw`\u0041\u{42}\U00000043\x44 \'\"\\u0045 a\nb\tc`)).toBe(String.raw`ABCD '"\u0045 a b c`);
    expect(unescapedText(["a\\", "b\\u000a"].join("\n"))).toBe("a\nb ");
    expect(unescapedText(String.raw`\u{110000}`)).toBe(String.raw`\u{110000}`);
  });
});

describe("isExempt", () => {
  it.each<[string, boolean]>([
    ["docs/research/refs-example.md", true],
    ["docs/research/visual-dna.md", true],
    ["docs/research/critic.md", true],
    ["tools/lint/reference-copy.denylist.txt", true],
    ["docs/research/fonts/harness-g1-dark.html", false],
    ["docs/research/refs/notes.md", false],
    ["spec/components/Card.yaml", false],
  ])("%s → %s", (path, exempt) => {
    expect(isExempt(path)).toBe(exempt);
  });
});

describe("the shipped denylist", () => {
  it("leaves generic words out", () => {
    const texts = new Set(shipped.map(({ text }) => text.toLowerCase()));
    for (const generic of ["today", "settings", "search", "online", "warning", "target:"]) {
      expect(texts.has(generic), generic).toBe(false);
    }
  });

  it("catches every entry in YAML, JSON, escaped JSON, HTML and Markdown shapes", () => {
    for (const { text } of shipped) {
      const words = text.split(/\s+/);
      const html = `<p>${words.map((word) => `<span>${escapeHtml(word)}</span>`).join("&nbsp;")}</p>`;
      const shapes: [string, string][] = [
        [`title: "${text}"`, "sample.yaml"],
        [JSON.stringify({ $description: text }), "sample.json"],
        [escapeNonAscii(JSON.stringify({ $description: text })), "escaped.json"],
        [html, "sample.html"],
        [`- ${words.map((word) => `**${word}**`).join(" ")}`, "sample.md"],
      ];
      for (const [source, file] of shapes) {
        expect(scanSource(source, file, shipped).map(({ entry }) => entry), `${file}: ${text}`).toContain(text);
      }
    }
  });

  it("does not flag the invented copy that replaced the reference copy", () => {
    const invented = [
      'title: "Unit 4417", caption: "21.11.2026, 14:05:22"',
      'title: "Line output", caption: "Last 24 hours", hero: 86.4 %, label: "86.4 percent"',
      'title: "Average yield", hero: { value: "$2,450", unit: "/batch" }',
      'title: "Queued", hero: { value: "37" }',
      "'7m ago', 'Rolling average'; inline metric '41 %'",
      "264,917 units · ± 3.8 mm · Goal: 90% · Rolling Average · Unit 4417 · GPS · 5G · In service",
      "Line Output · Retention Phase · Weekly Throughput Cycle · Search suppliers",
      "Выпуск линии · Фаза удержания · Цикл недельного потока · Поиск поставщиков",
      "5 units queued behind the current batch on line two. В очереди 5 единиц за текущей партией линии.",
    ];
    expect(scanSource(invented.join("\n"), "samples.yaml", shipped)).toEqual([]);
  });
});

describe("CLI", () => {
  it("exits 0 on a clean tree", () => {
    const run = runCli("--root", join(fixtures, "clean"), "--denylist", fixtureDenylist);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("no reference UI copy in 10 files (7 denylist entries)");
  });

  it("uses the shipped denylist by default", () => {
    const run = runCli("--root", join(fixtures, "clean"));
    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`no reference UI copy in 10 files (${shipped.length} denylist entries)`);
  });

  it("exits 1 on a tampered tree and prints path:line for each hit", () => {
    const run = runCli("--root", join(fixtures, "tampered"), "--denylist", fixtureDenylist);
    expect(run.status).toBe(1);
    const lines = run.stdout.trim().split("\n");
    expect(lines).toHaveLength(14);
    expect(lines[0]).toBe('agent/SKILL.md:4: reference UI copy "Keeper\'s Log"');
    expect(lines.every((line) => /^[\w/.-]+:\d+: reference UI copy ".+"$/.test(line))).toBe(true);
    expect(run.stderr).toContain("14 hits in 11 files");
  });

  it.each<[string[], string]>([
    [["--root", join(fixtures, "does-not-exist"), "--denylist", fixtureDenylist], "matches no directory"],
    [["--root", join(fixtures, "clean"), "--denylist", join(fixtures, "missing.txt")], "ENOENT"],
    [["--denylist"], "--denylist needs a path"],
    [["--verbose"], 'unknown argument "--verbose"'],
  ])("exits 2 on %j", (args, message) => {
    const run = runCli(...args);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain(message);
  });
});
