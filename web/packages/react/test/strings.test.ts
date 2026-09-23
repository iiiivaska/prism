/// <reference types="node" />
/**
 * The component-owned strings of ADR-0032 on the web: the table `@iiiivaska/prism-tokens` ships, re-exported
 * here, against `spec/strings.yaml`, and the one template fill every component uses.
 *
 * - Parity (rule 4): the web table has every key of the YAML, in its order, with its English default, and
 *   no other key; each default names exactly the placeholders its entry declares. `DSStringsTests` holds
 *   Apple's `DSStrings` to the same file, so the two tables cannot drift from each other either.
 * - `fillTemplate` (./src/strings.ts, internal to this package): one table of vectors, the same rows in the
 *   same order as `DSStringsTests.fillVectors`, which `DSStrings.fill(_:_:)` passes byte for byte on Apple.
 *
 * It lives in this package because the tokens package has no YAML reader; the `<Theme strings>` merge is
 * tested beside `<Theme>` in web/packages/tokens/test/react.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import * as tokensRoot from "@iiiivaska/prism-tokens";
import * as tokensReact from "@iiiivaska/prism-tokens/react";
import * as prism from "../src/index.ts";
import { defaultStrings, type StringKey } from "../src/index.ts";
import { fillTemplate } from "../src/strings.ts";
import { repositoryRoot } from "./spec.ts";

interface StringsFile {
  readonly version: number;
  readonly strings: Readonly<Record<string, { readonly default: string; readonly placeholders: readonly string[] }>>;
}

const file = parse(readFileSync(join(repositoryRoot, "spec", "strings.yaml"), "utf8")) as StringsFile;

describe("the web strings table is spec/strings.yaml (ADR-0032 rule 4)", () => {
  it("has the YAML's keys, in its order, and no other", () => {
    expect(file.version).toBe(1);
    expect(Object.keys(defaultStrings)).toEqual(Object.keys(file.strings));
  });

  it.each(Object.entries(file.strings))("%s defaults to the YAML's English default", (key, entry) => {
    expect(defaultStrings[key as StringKey]).toBe(entry.default);
  });

  it.each(Object.entries(file.strings))("%s names exactly the placeholders its entry declares", (_key, entry) => {
    const named = [...entry.default.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)].map((match) => match[1]);
    expect([...new Set(named)].sort()).toEqual([...entry.placeholders].sort());
  });
});

/**
 * The fill vectors: the same twenty rows, in the same order, as `DSStringsTests.fillVectors` on Apple, so
 * both suites say what the other one asserts. A placeholder with a value is replaced, and one with none
 * stays as written; a `{` that does not open a placeholder name (a letter, then letters and digits) is
 * written as it is and the pass continues after it; a value goes in verbatim, outside ASCII too, and is
 * never scanned again; only a value the caller passed fills a placeholder, never a name every object
 * inherits; and a template outside ASCII, a character beyond the BMP included, fills the same on a stack
 * that walks UTF-16 code units and on one that walks Unicode scalars.
 */
const fillVectors: readonly (readonly [template: string, values: Readonly<Record<string, string>>, expected: string])[] = [
  ["{count} {label}", { count: "3", label: "a" }, "3 a"],
  ["{max}+", { max: "99" }, "99+"],
  ["{max}+", {}, "{max}+"],
  ["{{count}}", { count: "3" }, "{3}"],
  ["{ count}", { count: "3" }, "{ count}"],
  ["a}{b", { b: "x" }, "a}{b"],
  ["{count", { count: "3" }, "{count"],
  ["{m1}", { m1: "ok" }, "ok"],
  ["{1m}", { "1m": "no" }, "{1m}"],
  ["{1a} {a1}", { "1a": "no", a1: "yes" }, "{1a} yes"],
  ["{}", { "": "no" }, "{}"],
  ["{count} {label}", { count: "3", label: "{count}" }, "3 {count}"],
  ["{label}: {count}", { count: "1,234", label: "queued runs" }, "queued runs: 1,234"],
  ["{count} {label}", { count: "1\u{202F}234", label: "непрочитанных уведомления" }, "1\u{202F}234 непрочитанных уведомления"],
  ["Удалить {label}", { label: "фильтр" }, "Удалить фильтр"],
  ["\u{10437} {count}", { count: "3" }, "\u{10437} 3"],
  ["{toString}", {}, "{toString}"],
  ["{constructor}", { count: "3" }, "{constructor}"],
  ["", { count: "3" }, ""],
  ["loading", { label: "x" }, "loading"],
];

describe("fillTemplate (ADR-0032 decision 3)", () => {
  it("has the twenty rows DSStringsTests.fillVectors has", () => {
    expect(fillVectors).toHaveLength(20);
  });

  it("is exported by no entry point, as DSStrings.fill is package API (ADR-0032 decision 5)", () => {
    for (const [entry, exports] of Object.entries({ "@iiiivaska/prism-react": prism, "@iiiivaska/prism-tokens": tokensRoot, "@iiiivaska/prism-tokens/react": tokensReact })) {
      expect(Object.keys(exports), entry).not.toContain("fillTemplate");
      expect(Object.keys(exports), entry).toContain("defaultStrings");
    }
  });

  it.each(fillVectors)("fills %j with %j as %j", (template, values, expected) => {
    // String equality is code unit for code unit, so for these well-formed strings it is byte for byte.
    expect(fillTemplate(template, values)).toBe(expected);
  });
});
