import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TreeReader } from "./brands.ts";
import { fsTreeReader, loadBrands, parseBrandFonts } from "./brands.ts";
import type { CheckName, CheckRow } from "./check.ts";
import { FONT_BUDGET_BYTES, formatCodePoints, formatFailures, formatTable, runFontsCheck, sha256 } from "./check.ts";
import { synthesizeFont } from "./fixtures/synthesize.ts";

const repo = join(import.meta.dirname, "..", "..");
const cli = join(import.meta.dirname, "check.ts");
// An empty GITHUB_STEP_SUMMARY keeps the fixture tables out of a CI job's real step summary.
const runCli = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" } });

const ONEST = "brands/prism/fonts/onest/Onest[wght].ttf";
const JETBRAINS = "brands/prism/fonts/jetbrains-mono/JetBrainsMono[wght].ttf";
const INTER = "brands/prism-native/fonts/inter/InterVariable.ttf";
const OFL = "Copyright 2026 The Synth Project Authors\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\n";

/** An in-memory repository: repository-relative path → contents. */
function memoryTree(files: Readonly<Record<string, string | Uint8Array>>): TreeReader {
  return {
    readFile(path) {
      const value = files[path];
      if (value === undefined) return null;
      return typeof value === "string" ? new TextEncoder().encode(value) : value;
    },
  };
}

function resolverFor(...brands: string[]): string {
  return JSON.stringify({ modifiers: { brand: { contexts: Object.fromEntries(brands.map((brand) => [brand, []])) } } });
}

/** One brand "acme" serving `bytes` from fonts/synth/Synth.ttf in the ui slot; `entry` overrides fields of the entry. */
function acme(bytes: Uint8Array, entry: Record<string, unknown> = {}, extra: Record<string, string | Uint8Array> = {}): TreeReader {
  const font = { family: "Synth", file: "fonts/synth/Synth.ttf", version: "1.000", sha256: sha256(bytes), platforms: ["web"], ...entry };
  return memoryTree({
    "tokens/prism.resolver.json": resolverFor("acme"),
    "brands/acme/brand.json": JSON.stringify({ name: "acme", fonts: { ui: font } }),
    "brands/acme/fonts/synth/Synth.ttf": bytes,
    "brands/acme/fonts/synth/OFL.txt": OFL,
    ...extra,
  });
}

const statuses = (rows: readonly CheckRow[], file: string): Partial<Record<CheckName, string>> =>
  Object.fromEntries(rows.filter((row) => row.file === file).map((row) => [row.check, row.status]));
const detail = (rows: readonly CheckRow[], check: CheckName): string => rows.find((row) => row.check === check)?.detail ?? "";

describe("the repository (acceptance: Onest, JetBrains Mono and Inter pass)", () => {
  const result = runFontsCheck(fsTreeReader(repo));
  const allPass = { files: "pass", sha256: "pass", version: "pass", cyrillic: "pass", "tabular-digits": "pass", postscript: "pass" };

  it("passes every check", () => {
    expect(formatFailures(result.rows)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("checks each served file once, in brand and slot order, with one row per check", () => {
    expect(result.rows.map((row) => `${row.file} ${row.check}`).filter((line) => line.endsWith(" files"))).toEqual([
      `${ONEST} files`,
      `${JETBRAINS} files`,
      `${INTER} files`,
    ]);
    expect(statuses(result.rows, ONEST)).toEqual(allPass);
    expect(statuses(result.rows, JETBRAINS)).toEqual(allPass);
    // Inter is served on the web only, so it has no PostScript names to check (ADR-0020 §5).
    expect(statuses(result.rows, INTER)).toEqual({ ...allPass, postscript: "skip" });
    expect(result.rows.find((row) => row.file === ONEST)?.servedBy).toBe("prism (ui, display)");
  });

  it("finds tabular digits through tnum (Onest, Inter) and without features (JetBrains Mono)", () => {
    const tabular = (file: string) => result.rows.find((row) => row.file === file && row.check === "tabular-digits")?.detail;
    expect(tabular(ONEST)).toBe("0–9 all 672 units after tnum (without features 665 363 566 599 633 616 623 505 622 620)");
    expect(tabular(JETBRAINS)).toBe("0–9 all 600 units without features");
    expect(tabular(INTER)).toMatch(/^0–9 all 1328 units after tnum/);
  });

  it("maps JetBrains Mono's default instance to name ID 6", () => {
    expect(result.rows.find((row) => row.file === JETBRAINS && row.check === "postscript")?.detail).toBe(
      "100 200 300 400 500 700 800 name fvar instances; the default instance takes name ID 6",
    );
  });

  it("counts Onest and JetBrains Mono against the 2 MiB DSTokens budget, and not the web-only Inter", () => {
    const budget = result.rows.find((row) => row.check === "budget");
    expect(budget).toMatchObject({ file: "DSTokens", servedBy: "prism", status: "pass" });
    expect(budget?.detail).toBe("380,264 bytes of 2,097,152 bytes (2 files after SHA-256 deduplication)");
    expect(FONT_BUDGET_BYTES).toBe(2_097_152);
  });

  it("reads the brand.json entries of both brand contexts", () => {
    const { brands, problems } = loadBrands(fsTreeReader(repo));
    expect(problems).toEqual([]);
    expect(brands.map((brand) => [brand.name, Object.keys(brand.fonts)])).toEqual([
      ["prism", ["ui", "display", "mono"]],
      ["prism-native", ["ui", "display"]],
    ]);
    const prism = brands[0]?.fonts;
    expect(prism?.mono).toMatchObject({ file: "fonts/jetbrains-mono/JetBrainsMono[wght].ttf", version: "2.211", platforms: ["apple", "web"] });
    expect(prism?.mono?.postscript).not.toHaveProperty("600");
    expect(brands[1]?.fonts.ui).toMatchObject({ family: "Inter", file: "fonts/inter/InterVariable.ttf", platforms: ["web"], postscript: {} });
  });
});

describe("synthesized fonts (acceptance: Latin-only and proportional-digit fonts fail)", () => {
  const FILE = "brands/acme/fonts/synth/Synth.ttf";

  it("fails a Latin-only font on Cyrillic, and only on Cyrillic", () => {
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: false })));
    expect(result.ok).toBe(false);
    expect(statuses(result.rows, FILE)).toEqual({ files: "pass", sha256: "pass", version: "pass", cyrillic: "fail", "tabular-digits": "pass", postscript: "skip" });
    expect(formatFailures(result.rows)).toEqual([`${FILE}: cyrillic: cmap lacks 66 of 66 required code points: U+0401, U+0410–U+044F, U+0451`]);
  });

  it("fails a font that has А–я but not Ё and ё, and passes one that has all 66", () => {
    const partial = runFontsCheck(acme(synthesizeFont({ extraCodePoints: Array.from({ length: 64 }, (_, i) => 0x410 + i) })));
    expect(detail(partial.rows, "cyrillic")).toBe("cmap lacks 2 of 66 required code points: U+0401, U+0451");
    const full = runFontsCheck(acme(synthesizeFont({ cyrillic: true })));
    expect(formatFailures(full.rows)).toEqual([]);
  });

  it("fails a font with proportional digits and no tnum on tabular digits, and only there", () => {
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: true, digitAdvances: [560, 400, 540, 550, 580, 545, 555, 500, 560, 555] })));
    expect(result.ok).toBe(false);
    expect(statuses(result.rows, FILE)).toEqual({ files: "pass", sha256: "pass", version: "pass", cyrillic: "pass", "tabular-digits": "fail", postscript: "skip" });
    expect(formatFailures(result.rows)).toEqual([
      `${FILE}: tabular-digits: proportional digits (0–9 advances 560 400 540 550 580 545 555 500 560 555) and no GSUB tnum single substitution`,
    ]);
  });

  it("passes proportional digits that a tnum single substitution makes equal", () => {
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: true, digitAdvances: [560, 400, 540, 550, 580, 545, 555, 500, 560, 555], tnumAdvance: 580 })));
    expect(formatFailures(result.rows)).toEqual([]);
    expect(detail(result.rows, "tabular-digits")).toBe("0–9 all 580 units after tnum (without features 560 400 540 550 580 545 555 500 560 555)");
  });

  it("fails digits that stay unequal after tnum", () => {
    // Only digit 1 is substituted (to 580); the others keep their proportional advances.
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: true, digitAdvances: [560, 400, 540, 550, 580, 545, 555, 500, 560, 555], tnumAdvance: 580, tnumDigits: [1] })));
    expect(detail(result.rows, "tabular-digits")).toBe(
      "unequal advances without features (560 400 540 550 580 545 555 500 560 555) and after tnum (560 580 540 550 580 545 555 500 560 555)",
    );
  });

  it("fails a font that lacks a digit", () => {
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: true, omitDigits: [7] })));
    expect(detail(result.rows, "tabular-digits")).toBe("cmap lacks U+0037");
  });
});

describe("file, hash and version checks", () => {
  const bytes = synthesizeFont({ cyrillic: true });
  const FILE = "brands/acme/fonts/synth/Synth.ttf";

  it("fails a SHA-256 mismatch and names both hashes and the brand.json field", () => {
    const wrong = "a".repeat(64);
    const result = runFontsCheck(acme(bytes, { sha256: wrong }));
    expect(formatFailures(result.rows)).toEqual([
      `${FILE}: sha256: the file hashes to ${sha256(bytes)}, but brands/acme/brand.json /fonts/ui/sha256 says ${wrong}`,
    ]);
  });

  it("fails a version that is not name ID 5 without \"Version \"", () => {
    const result = runFontsCheck(acme(synthesizeFont({ cyrillic: true, version: "Version 4.001;git-9221beed3" }), { version: "4.1" }));
    expect(detail(result.rows, "version")).toBe(
      'name ID 5 is "Version 4.001;git-9221beed3", but brands/acme/brand.json /fonts/ui/version "4.1" needs "Version 4.1"',
    );
  });

  it("fails a missing OFL.txt and an OFL.txt that is not the license", () => {
    const missing = memoryTree({
      "tokens/prism.resolver.json": resolverFor("acme"),
      "brands/acme/brand.json": JSON.stringify({ fonts: { ui: { family: "Synth", file: "fonts/synth/Synth.ttf", version: "1.000", sha256: sha256(bytes), platforms: ["web"] } } }),
      [FILE]: bytes,
    });
    expect(formatFailures(runFontsCheck(missing).rows)).toEqual([`${FILE}: files: no brands/acme/fonts/synth/OFL.txt beside the font`]);
    const placeholder = runFontsCheck(acme(bytes, {}, { "brands/acme/fonts/synth/OFL.txt": "TODO" }));
    expect(formatFailures(placeholder.rows)).toEqual([`${FILE}: files: brands/acme/fonts/synth/OFL.txt is not the SIL Open Font License text`]);
  });

  it("fails a missing font file and skips the checks that need it", () => {
    const tree = memoryTree({
      "tokens/prism.resolver.json": resolverFor("acme"),
      "brands/acme/brand.json": JSON.stringify({ fonts: { ui: { family: "Synth", file: "fonts/synth/Synth.ttf", version: "1.000", sha256: "b".repeat(64), platforms: ["web"] } } }),
      "brands/acme/fonts/synth/OFL.txt": OFL,
    });
    const result = runFontsCheck(tree);
    expect(statuses(result.rows, FILE)).toEqual({ files: "fail", sha256: "skip", version: "skip", cyrillic: "skip", "tabular-digits": "skip", postscript: "skip" });
    expect(detail(result.rows, "files")).toBe("the font file does not exist (brands/acme/brand.json /fonts/ui/file)");
    expect(result.ok).toBe(false);
  });

  it("fails bytes that do not parse as a font", () => {
    const junk = new TextEncoder().encode("definitely not an sfnt");
    const result = runFontsCheck(acme(junk));
    expect(statuses(result.rows, FILE)).toMatchObject({ files: "pass", sha256: "pass", version: "fail", cyrillic: "fail" });
    expect(detail(result.rows, "version")).toMatch(/^cannot parse the font: /);
  });
});

describe("PostScript instance names (ADR-0021 §11 check 6, T3)", () => {
  const jetbrains = readFileSync(join(repo, JETBRAINS));
  const FILE = "brands/acme/fonts/synth/Synth.ttf";
  const entry = (postscript: Record<string, string>) => ({ version: "2.211", platforms: ["apple", "web"], postscript });

  it("fails a weight without an fvar instance (JetBrains Mono has no 600)", () => {
    const result = runFontsCheck(acme(jetbrains, entry({ "400": "JetBrainsMono-Regular", "600": "JetBrainsMono-SemiBold" })));
    expect(formatFailures(result.rows)).toEqual([
      `${FILE}: postscript: 600 "JetBrainsMono-SemiBold": no fvar instance at wght 600 (instances at 100 200 300 400 500 700 800)`,
    ]);
  });

  it("fails the fvar name of the default instance, which Core Text exposes as name ID 6", () => {
    const result = runFontsCheck(acme(jetbrains, entry({ "400": "JetBrainsMonoRoman-Regular", "700": "JetBrainsMono-Bold" })));
    expect(detail(result.rows, "postscript")).toBe(
      '400 "JetBrainsMonoRoman-Regular": Core Text exposes "JetBrainsMono-Regular" (name ID 6: the default instance); 700 "JetBrainsMono-Bold": Core Text exposes "JetBrainsMonoRoman-Bold"',
    );
  });

  it("treats a static font as one default instance at its OS/2 weight", () => {
    const bytes = synthesizeFont({ cyrillic: true, weightClass: 500 });
    const ok = runFontsCheck(acme(bytes, { platforms: ["apple"], postscript: { "500": "SynthRegular" } }));
    expect(formatFailures(ok.rows)).toEqual([]);
    expect(detail(ok.rows, "postscript")).toBe("500 name the font");
    const wrong = runFontsCheck(acme(bytes, { platforms: ["apple"], postscript: { "400": "SynthRegular" } }));
    expect(detail(wrong.rows, "postscript")).toBe('400 "SynthRegular": no font at wght 400 (instances at 500)');
  });
});

describe("the 2 MiB DSTokens budget (ADR-0020 rule 14)", () => {
  const onest = readFileSync(join(repo, ONEST));
  const jetbrains = readFileSync(join(repo, JETBRAINS));
  const entry = (file: string, bytes: Uint8Array, platforms: string[]) => ({
    family: "F",
    file,
    version: file.includes("onest") ? "2.001" : "2.211",
    sha256: sha256(bytes),
    platforms,
    postscript: file.includes("onest") ? { "400": "Onest-Regular" } : { "400": "JetBrainsMono-Regular" },
  });
  // Two brands bundle the same Onest bytes on Apple; the second also serves JetBrains Mono on the web only.
  const tree = memoryTree({
    "tokens/prism.resolver.json": resolverFor("one", "two"),
    "brands/one/brand.json": JSON.stringify({ fonts: { ui: entry("fonts/onest/Onest.ttf", onest, ["apple", "web"]) } }),
    "brands/one/fonts/onest/Onest.ttf": onest,
    "brands/one/fonts/onest/OFL.txt": OFL,
    "brands/two/brand.json": JSON.stringify({
      fonts: { ui: entry("fonts/onest/Onest.ttf", onest, ["apple"]), mono: entry("fonts/mono/Mono.ttf", jetbrains, ["web"]) },
    }),
    "brands/two/fonts/onest/Onest.ttf": onest,
    "brands/two/fonts/onest/OFL.txt": OFL,
    "brands/two/fonts/mono/Mono.ttf": jetbrains,
    "brands/two/fonts/mono/OFL.txt": OFL,
  });

  it("deduplicates by SHA-256 and counts only files bundled on Apple", () => {
    const result = runFontsCheck(tree);
    expect(formatFailures(result.rows)).toEqual([]);
    expect(result.rows.find((row) => row.check === "budget")).toMatchObject({
      servedBy: "one, two",
      detail: "193,056 bytes of 2,097,152 bytes (1 file after SHA-256 deduplication)",
    });
  });

  it("fails when the bundled files exceed the budget", () => {
    const result = runFontsCheck(tree, { budgetBytes: 100_000 });
    expect(formatFailures(result.rows)).toEqual([
      "DSTokens: budget: 193,056 bytes exceed the 100,000 bytes budget (1 file after SHA-256 deduplication); ADR-0020 rule 14: move brands to route 2, or raise the budget by ADR",
    ]);
  });
});

describe("brand.json font entries", () => {
  const problems = (fonts: unknown): string[] =>
    parseBrandFonts("brands/acme/brand.json", JSON.stringify({ name: "acme", fonts })).problems.map((p) => `${p.pointer}: ${p.message}`);
  const good = {
    family: "Onest",
    file: "fonts/onest/Onest[wght].ttf",
    version: "2.001",
    sha256: "966c5c29b4755da84b6854d5c21dd4eaa2420225d0e9874de602de176d4a9f31",
    platforms: ["apple", "web"],
    postscript: { "400": "Onest-Regular" },
  };

  it("accepts a complete entry and a brand without fonts", () => {
    expect(problems({ ui: good })).toEqual([]);
    expect(parseBrandFonts("brands/acme/brand.json", JSON.stringify({ name: "acme" }))).toEqual({ fonts: {}, problems: [] });
  });

  it("reports each problem with its JSON pointer", () => {
    expect(problems({ body: good })).toEqual(["/fonts/body: unknown font slot; expected ui, display, mono"]);
    expect(problems({ ui: { ...good, sha256: undefined, colour: "red" } })).toEqual([
      "/fonts/ui/colour: unknown key; a font entry has family, file, version, sha256, platforms, postscript",
      "/fonts/ui/sha256: required",
    ]);
    expect(problems({ ui: { ...good, sha256: "966C5C29" } })).toEqual(["/fonts/ui/sha256: must be 64 lowercase hex digits"]);
    expect(problems({ ui: { ...good, version: "Version 2.001" } })).toEqual(['/fonts/ui/version: name ID 5 without "Version ": write "2.001"']);
    expect(problems({ ui: { ...good, file: "fonts/Onest[wght].ttf" } })).toEqual([
      '/fonts/ui/file: "fonts/Onest[wght].ttf" must be fonts/<family-dir>/<file> inside the brand folder (ADR-0021 §11)',
    ]);
    expect(problems({ ui: { ...good, file: "fonts/../../prism/Onest.ttf" } })).toHaveLength(1);
    expect(problems({ ui: { ...good, platforms: ["android"] } })).toEqual(["/fonts/ui/platforms: a non-empty list of distinct values from apple, web"]);
    expect(problems({ ui: { ...good, platforms: [] } })).toHaveLength(1);
    expect(problems({ ui: { ...good, postscript: undefined } })).toEqual([
      "/fonts/ui/postscript: required, with at least one weight, when the file is bundled on Apple (ADR-0021 §11)",
    ]);
    expect(problems({ ui: { ...good, postscript: { "450": "Onest-Regular", "700": "Onest Bold" } } })).toEqual([
      "/fonts/ui/postscript/450: weight must be 100, 200, … or 900 (ADR-0021 §1)",
      "/fonts/ui/postscript/700: must be a PostScript name: 1–63 printable ASCII characters without spaces or [](){}<>/%",
    ]);
    expect(problems({ ui: { ...good, platforms: ["web"], postscript: undefined } })).toEqual([]);
    expect(problems("Onest")).toEqual(["/fonts: must be an object of font slots"]);
    expect(parseBrandFonts("brands/acme/brand.json", "{ nope").problems[0]?.message).toMatch(/^invalid JSON/);
  });

  it("fails slots that name one file with different metadata, and a brand context without brand.json", () => {
    const bytes = synthesizeFont({ cyrillic: true });
    const entry = { family: "Synth", file: "fonts/synth/Synth.ttf", version: "1.000", sha256: sha256(bytes), platforms: ["web"] };
    const tree = memoryTree({
      "tokens/prism.resolver.json": resolverFor("acme", "ghost"),
      "brands/acme/brand.json": JSON.stringify({ fonts: { ui: entry, display: { ...entry, version: "1.001" } } }),
      "brands/acme/fonts/synth/Synth.ttf": bytes,
      "brands/acme/fonts/synth/OFL.txt": OFL,
    });
    expect(formatFailures(runFontsCheck(tree).rows)).toEqual([
      'brands/acme/brand.json: brand.json: /fonts/display/version: "1.001" differs from /fonts/ui/version "1.000", which names the same file',
      'brands/ghost/brand.json: brand.json: /: missing: the brand context "ghost" needs brands/ghost/brand.json (ADR-0020 rule 2)',
    ]);
  });
});

describe("output", () => {
  it("prints a Markdown table with escaped cells", () => {
    const table = formatTable([{ file: "a|b.ttf", servedBy: "acme (ui)", check: "files", status: "fail", detail: "x | y" }]);
    expect(table.split("\n")).toEqual([
      "| File | Served by | Check | Result | Detail |",
      "|---|---|---|---|---|",
      "| `a\\|b.ttf` | acme (ui) | files | **FAIL** | x \\| y |",
    ]);
  });

  it("collapses consecutive code points into ranges", () => {
    expect(formatCodePoints([0x451, 0x410, 0x411, 0x412, 0x401, 0x44f])).toBe("U+0401, U+0410–U+0412, U+044F, U+0451");
  });
});

describe("CLI", () => {
  it("exits 0 on the repository and prints one row per file and check", () => {
    const run = runCli();
    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`| \`${INTER}\` | prism-native (ui, display) | version | pass | name ID 5 "Version 4.001;git-9221beed3" |`);
    expect(run.stdout).toContain("fonts:check: 3 font files pass every check");
    expect(run.stdout.split("\n").filter((line) => line.startsWith("| `"))).toHaveLength(21);
  });

  it("exits 1 and names the path and reason on a broken tree", () => {
    const run = runCli("--root", join(import.meta.dirname, "fixtures", "broken"));
    expect(run.status).toBe(1);
    expect(run.stderr).toContain(
      "brands/acme/fonts/acme-sans/AcmeSans[wght].ttf: files: the font file does not exist (brands/acme/brand.json /fonts/ui/file); no brands/acme/fonts/acme-sans/OFL.txt beside the font",
    );
  });

  it("prints only JSON rows on stdout with --json", () => {
    const run = runCli("--json");
    expect(run.status).toBe(0);
    const rows = JSON.parse(run.stdout) as CheckRow[];
    expect(rows).toHaveLength(21);
    expect(rows.filter((row) => row.check === "budget")).toHaveLength(1);
    expect(run.stderr).toContain("fonts:check: 3 font files pass every check");
  });

  it("exits 2 on a usage or layout error", () => {
    expect(runCli("--frobnicate").status).toBe(2);
    expect(runCli("--root").status).toBe(2);
    const noResolver = runCli("--root", join(import.meta.dirname, "fixtures"));
    expect(noResolver.status).toBe(2);
    expect(noResolver.stderr).toContain("tokens/prism.resolver.json: not found");
  });
});
