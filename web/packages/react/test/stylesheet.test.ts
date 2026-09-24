/// <reference types="node" />
/**
 * The stylesheet test of roadmap P3-4: ADR-0019 rule 9 as ADR-0025 §3 amends it, over the package's
 * source stylesheets and over the compiled styles.css, plus the stylesheet half of rule 10, the web
 * half of ADR-0022 rule 2 as ADR-0036 §10 amends it, and the one way a stylesheet reads the direction
 * (P5-3 finding SD-7). Every check also fails on a fixture, so a check that silently stopped matching
 * would show here.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { buildStyles, compileStyles, packageRoot } from "../scripts/build-styles.ts";
import { flattenRules, parseCss } from "./css.ts";
import { backdropFilterProblems, compiledProblems, compoundIsScoped, directionProblems, directionReaders, glassRecipeProblems, nearestRtlSelector, sourceProblems } from "./stylesheet.rules.ts";

const srcRoot = join(packageRoot, "src");
const fixtures = join(packageRoot, "test", "fixtures", "stylesheets");

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

const sources = cssFiles(srcRoot);
let compiled = "";

beforeAll(async () => {
  compiled = await buildStyles();
});

describe("the source stylesheets (ADR-0019 rule 9, ADR-0025 rule 2)", () => {
  it("exist: the entry and one stylesheet per component", () => {
    expect(sources.map((file) => relative(srcRoot, file))).toEqual(["badge/Badge.css", "button/Button.css", "card/Card.css", "divider/Divider.css", "icon-button/IconButton.css", "icon/Glyph.css", "icon/Icon.css", "styles.css", "surface/Surface.css", "text/Text.css"]);
  });

  it.each(sources.map((file) => [relative(srcRoot, file), file] as const))("%s uses only ds-pointer and ds-touch, hover under ds-pointer, no sizes under a variant", (_name, file) => {
    expect(sourceProblems(readFileSync(file, "utf8"))).toEqual([]);
  });

  it.each(sources.map((file) => [relative(srcRoot, file), file] as const))("%s reads the direction only from the nearest dir attribute, never with :dir() (SD-7)", (_name, file) => {
    expect(directionProblems(readFileSync(file, "utf8"))).toEqual([]);
  });

  it.each(sources.map((file) => [relative(srcRoot, file), file] as const))("%s declares backdrop-filter only as surface/Surface.css, on its four glass selectors (ADR-0036 §10)", (name, file) => {
    expect(backdropFilterProblems(readFileSync(file, "utf8"), name)).toEqual([]);
  });

  it.each(sources.map((file) => [relative(srcRoot, file), file] as const))("%s names a glass recipe variable only under surface/ (ADR-0036 §10)", (name, file) => {
    expect(glassRecipeProblems(readFileSync(file, "utf8"), name)).toEqual([]);
  });

  it("sets font-synthesis: none on Text, Surface (and so Card) and Button (ADR-0021 §10)", () => {
    for (const [file, selector] of [
      ["text/Text.css", ".ds-text"],
      ["surface/Surface.css", ".ds-surface"],
      ["button/Button.css", ".ds-button"],
    ] as const) {
      const rule = flattenRules(parseCss(readFileSync(join(srcRoot, file), "utf8"))).find((candidate) => candidate.selectors.includes(selector));
      expect(rule?.declarations.find((declaration) => declaration.property === "font-synthesis")?.value, file).toBe("none");
    }
  });
});

describe("the compiled styles.css (ADR-0019 rules 9 and 10)", () => {
  it("keeps no @variant, @apply or @utility, scopes every selector and names only ds things", () => {
    expect(compiledProblems(compiled)).toEqual([]);
  });

  it("imports every component stylesheet, Card after the Surface it refines", () => {
    const imports = [...readFileSync(join(srcRoot, "styles.css"), "utf8").matchAll(/^@import "\.\/([^"]+)";$/gm)].map((match) => match[1]);
    expect(imports).toEqual(["surface/Surface.css", "text/Text.css", "icon/Glyph.css", "icon/Icon.css", "button/Button.css", "card/Card.css", "divider/Divider.css", "badge/Badge.css", "icon-button/IconButton.css"]);
  });

  it("reads the direction for Text's fade and Icon's mirror, both from the nearest dir attribute and neither with :dir() (SD-7)", () => {
    expect(directionProblems(compiled)).toEqual([]);
    expect(directionReaders(compiled)).toEqual(['.ds-text[data-ds-truncation="fade"][data-ds-single-line][data-ds-overflowing]', ".ds-glyph[data-ds-mirror]"]);
  });

  it("is plain CSS in @layer ds.components with no Tailwind banner or utility", () => {
    expect(compiled).not.toMatch(/tailwindcss v\d/);
    expect(compiled).toMatch(/@layer ds\.components \{/);
    expect(compiled).not.toMatch(/@layer (?:base|components|utilities|properties|theme)\b/);
  });
});

describe("each check fails on its fixture", () => {
  const source = (name: string): string => readFileSync(join(fixtures, name), "utf8");
  const compile = (name: string): Promise<string> => compileStyles(source(name), srcRoot);

  it("hover outside ds-pointer", () => {
    expect(sourceProblems(source("hover-outside-pointer.css")).map((problem) => problem.check)).toEqual(["hover"]);
  });

  it("a size under ds-touch", () => {
    expect(sourceProblems(source("size-in-touch.css")).map((problem) => problem.check)).toEqual(["size-in-variant"]);
  });

  it("a consumer-only variant", () => {
    expect(sourceProblems(source("consumer-variant.css")).map((problem) => problem.check)).toEqual(["consumer-variant", "variant"]);
  });

  it("a preference media query", () => {
    expect(sourceProblems(source("media-query.css")).map((problem) => problem.check)).toEqual(["media"]);
  });

  it("an unscoped selector after compiling", async () => {
    expect(compiledProblems(await compile("unscoped-selector.css")).map((problem) => problem.check)).toEqual(["unscoped-selector", "unscoped-selector", "global-name"]);
  });

  it("names outside ds", () => {
    const checks = compiledProblems(source("foreign-names.css")).map((problem) => problem.check);
    expect(checks).toEqual(["layer-name", "global-name", "global-name", "global-name"]);
  });

  it("backdrop-filter declared outside surface/Surface.css, or there on a fifth selector or none (ADR-0036 §10)", () => {
    const css = source("backdrop-filter.css");
    // Outside the one stylesheet every declaration fails and nothing else does: the module's other files, a
    // Surface.css in another directory, the path in another directory or in another case.
    for (const file of ["chip/Chip.css", "surface/SurfaceChip.css", "chip/Surface.css", "chip/surface/Surface.css", "surface/surface.css"]) {
      expect(backdropFilterProblems(css, file).map((problem) => problem.check), file).toEqual(["backdrop-filter", "backdrop-filter", "backdrop-filter", "backdrop-filter"]);
    }
    // In it, the allowed selectors pass; the one other selector in a list and the declaration with none fail. The
    // other selector is written over two lines, and named as the compiled stylesheet spells it, on one.
    const inSurface = backdropFilterProblems(css, "surface/Surface.css");
    expect(inSurface.map((problem) => problem.check)).toEqual(["backdrop-filter-selector", "backdrop-filter-selector"]);
    expect(inSurface[0]?.detail).toMatch(/^\.ds-fixture\[data-ds-material="glass"\] > \[data-ds-slot="fixture-part"\]: -webkit-backdrop-filter on none of the four glass selectors/);
    expect(inSurface[1]?.detail).toMatch(/^\(no selector\): backdrop-filter on none of the four glass selectors/);
    // A path with the platform's own separators is the same stylesheet.
    expect(backdropFilterProblems(css, "surface\\Surface.css")).toEqual(inSurface);
  });

  it("a glass recipe variable named outside surface/, and never the scrim (ADR-0036 §10)", () => {
    const css = source("glass-recipe-variable.css");
    // One problem per declaration, naming each variable in it once. A name longer than the scrim's fails, joined to
    // it by a dash or by a letter.
    const names = ["--ds-material-glass-chip", "--ds-material-glass-chip-blur", "--ds-material-glass-chip, --ds-material-glass-fill", "--ds-material-glass-scrim-strong", "--ds-material-glass-scrimmy"];
    // Outside the module, a directory whose name only starts like it, one that holds a surface/ of its own and a
    // Surface.css in another directory included.
    for (const file of ["chip/Chip.css", "surfaces/Surfaces.css", "chip/surface/Chip.css", "chip/Surface.css"]) {
      const problems = glassRecipeProblems(css, file);
      expect(problems.map((problem) => problem.check), file).toEqual(names.map(() => "glass-recipe-variable"));
      expect(problems.map((problem) => /names (.*) outside/.exec(problem.detail)?.[1]), file).toEqual(names);
    }
    for (const file of ["surface/Surface.css", "surface\\Surface.css"]) {
      expect(glassRecipeProblems(css, file), file).toEqual([]);
    }
  });

  it(":dir(), a bare rtl ancestor, a short nearest-dir chain and a bare rtl ancestor in front of the whole chain, before compiling and after (SD-7)", async () => {
    const expected = ["dir-pseudo", "dir-attribute", "dir-attribute", "dir-attribute"];
    expect(directionProblems(source("direction.css")).map((problem) => problem.check)).toEqual(expected);
    // The package's own compile keeps :dir() (Tailwind leaves it to the consumer's build), so the check holds after it too.
    expect(directionProblems(await compile("direction.css")).map((problem) => problem.check)).toEqual(expected);
  });

  it("and passes the nearest-dir selector itself, over several lines as a stylesheet writes it", () => {
    const multiline = nearestRtlSelector().replaceAll(":not(", ":not(\n      ").replaceAll(", ", ",\n  ");
    expect(directionProblems(`@layer ds.components {\n  .ds-fixture${multiline} {\n    scale: -1 1;\n  }\n}\n`)).toEqual([]);
    expect(directionReaders(`.ds-fixture${multiline} { scale: -1 1; }`)).toEqual([".ds-fixture"]);
  });

  it("and passes a stylesheet that follows the rules, whose variants expand into the generated forms", async () => {
    const css = source("pointer-hover.css");
    expect(sourceProblems(css)).toEqual([]);
    const out = await compileStyles(`@reference "@iiiivaska/prism-tokens/tailwind.css";\n${css}`, srcRoot);
    expect(compiledProblems(out)).toEqual([]);
    expect(out).toContain(':root[data-ds-modality="pointer"]');
    expect(out).toContain("@media (hover: hover) and (pointer: fine)");
    expect(out).toContain("@media not all and (hover: hover) and (pointer: fine)");
    expect(out).not.toContain("@variant");
  });
});

describe("compoundIsScoped", () => {
  it.each([
    [".ds-text", true],
    ['[data-ds-slot="text-unit"]', true],
    [':is(.ds-text, [data-ds-slot="text-unit"])[data-ds-foreground="primary"]', true],
    ['.ds-probe:where(:root[data-ds-modality="pointer"] *)[data-hovered]', true],
    ['[data-hovered]:where(.ds-text)', false],
    [':is(.ds-text, span)', false],
    ["span", false],
    [".card", false],
  ])("%s → %s", (compound, expected) => {
    expect(compoundIsScoped(compound)).toBe(expected);
  });
});

describe("nearestRtlSelector", () => {
  it("is the chain Glyph.css writes: at or under an rtl, then one :not(:where(…)) per change of direction", () => {
    const rtl = '[dir="rtl" i]';
    const ltr = '[dir="ltr" i]';
    expect(nearestRtlSelector(2)).toBe(`:is(${rtl}, ${rtl} *):not(:where(${rtl} ${ltr}, ${rtl} ${ltr} *))`);
    expect(nearestRtlSelector()).toBe(
      `:is(${rtl}, ${rtl} *):not(:where(${rtl} ${ltr}, ${rtl} ${ltr} *):not(:where(${rtl} ${ltr} ${rtl}, ${rtl} ${ltr} ${rtl} *):not(:where(${rtl} ${ltr} ${rtl} ${ltr}, ${rtl} ${ltr} ${rtl} ${ltr} *))))`,
    );
  });
});
