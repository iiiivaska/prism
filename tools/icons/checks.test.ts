// Every rule of tools/icons over the fixtures beside this file: one broken registry per rule, plus the
// real one. The roadmap P2-2 acceptance "CI catches a misspelled Phosphor name" is the
// `misspelled-phosphor.json` case; its SF Symbols half is the fixture round of tools/icons-apple.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { checkAgainstCatalog, checkRegistryRules, checkSfNamesAbsent, checkTables, checkTokens, isDirectionalSymbol, isSystemMirrored, requiredCuts } from "./checks.ts";
import { OWNED_ROOTS, PATHS } from "./config.ts";
import { loadCatalog } from "./phosphor.ts";
import { loadRegistry, validateSchema, type Issue, type Registry } from "./registry.ts";
import { REPO_ROOT } from "./validate.ts";
import { OWNED_ROOTS as TOKEN_ROOTS } from "../tokens/config.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");
const catalog = loadCatalog();

function fixture(name: string): { registry: Registry | null; issues: readonly Issue[] } {
  const document: unknown = JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));
  return validateSchema(document, join(REPO_ROOT, PATHS.schema));
}

/** Every rule the fixture is expected to trip, as `code` values. */
function rules(name: string): readonly Issue[] {
  const { registry, issues } = fixture(name);
  if (registry === null) return issues;
  return [...checkTables(registry), ...checkAgainstCatalog(registry, catalog), ...checkRegistryRules(registry)];
}

function codes(issues: readonly Issue[], severity: Issue["severity"] = "error"): readonly string[] {
  return issues.filter((issue) => issue.severity === severity).map((issue) => issue.code);
}

describe("fixtures", () => {
  test("the valid fixture trips nothing", () => {
    expect(rules("valid.json")).toEqual([]);
  });

  test.each([
    ["misspelled-phosphor.json", "phosphor/unknown"],
    ["version-drift.json", "phosphor/version"],
    ["directional-double-mirror.json", "rtl/double-mirror"],
    ["missing-mirror.json", "rtl/missing-mirror"],
    ["custom-mirror-mismatch.json", "rtl/custom-mismatch"],
    ["duplicate-custom.json", "custom/duplicate"],
    ["label-mismatch.json", "label/mismatch"],
    ["weight-ladder.json", "weight/ladder"],
    ["bold-text-step.json", "weight/bold-text"],
    ["filled-default-without-fill.json", "style/default-without-fill"],
    ["missing-tags.json", "schema"],
    ["both-apple-bindings.json", "schema"],
  ])("%s trips %s", (name, code) => {
    expect(codes(rules(name))).toContain(code);
  });

  test("a Phosphor alias warns and names the canonical icon", () => {
    const issues = rules("alias-phosphor.json");
    expect(codes(issues)).toEqual([]);
    expect(codes(issues, "warning")).toEqual(["phosphor/alias"]);
    expect(issues[0]?.message).toContain("asclepius");
  });

  test("the misspelling is reported with the near names of the catalog", () => {
    const issue = rules("misspelled-phosphor.json").find((i) => i.code === "phosphor/unknown");
    expect(issue?.message).toContain("caret-left");
  });
});

describe("the committed registry", () => {
  const { registry, issues } = loadRegistry(REPO_ROOT);

  test("validates against its schema", () => {
    expect(issues).toEqual([]);
    expect(registry).not.toBeNull();
  });

  test("passes every rule", () => {
    if (registry === null) throw new Error("the registry did not load");
    expect([...checkTables(registry), ...checkAgainstCatalog(registry, catalog), ...checkRegistryRules(registry)].filter((i) => i.severity === "error")).toEqual([]);
  });

  test("agrees with the numeric icon tokens and the px icon boxes", () => {
    if (registry === null) throw new Error("the registry did not load");
    const sysBase = JSON.parse(readFileSync(join(REPO_ROOT, PATHS.sysBase), "utf8")) as Record<string, unknown>;
    const refDimensions = JSON.parse(readFileSync(join(REPO_ROOT, PATHS.refDimensions), "utf8")) as Record<string, unknown>;
    expect(checkTokens(registry, sysBase, refDimensions)).toEqual([]);
  });

  test("binds every icon to one of the two Apple mechanisms", () => {
    if (registry === null) throw new Error("the registry did not load");
    for (const [id, icon] of Object.entries(registry.icons)) {
      expect([icon.apple.symbol, icon.apple.custom].filter((value) => value !== undefined), id).toHaveLength(1);
    }
  });

  test("generates an image set for every cut a weight or a style can ask for", () => {
    if (registry === null) throw new Error("the registry did not load");
    expect(requiredCuts(registry)).toEqual(["thin", "light", "regular", "bold", "fill", "duotone"]);
  });
});

describe("token cross-checks", () => {
  const { registry } = loadRegistry(REPO_ROOT);

  test("a numeric icon-weight token outside the ladder fails", () => {
    if (registry === null) throw new Error("the registry did not load");
    const sysBase = { sys: { icon: { weight: { $value: 450 } } } };
    const refDimensions = { ref: { size: { icon: { xs: { $value: { value: 12, unit: "px" } }, sm: { $value: { value: 16, unit: "px" } }, md: { $value: { value: 20, unit: "px" } }, lg: { $value: { value: 24, unit: "px" } } } } } };
    expect(codes(checkTokens(registry, sysBase, refDimensions))).toEqual(["tokens/icon-weight"]);
  });

  test("a px box that no longer matches its token fails", () => {
    if (registry === null) throw new Error("the registry did not load");
    const sysBase = { sys: { icon: { weight: { $value: 400 } } } };
    const refDimensions = { ref: { size: { icon: { xs: { $value: { value: 13, unit: "px" } }, sm: { $value: { value: 16, unit: "px" } }, md: { $value: { value: 20, unit: "px" } }, lg: { $value: { value: 24, unit: "px" } } } } } };
    expect(codes(checkTokens(registry, sysBase, refDimensions))).toEqual(["tokens/icon-size"]);
  });
});

describe("ADR-0013 rule 5", () => {
  const { registry } = loadRegistry(REPO_ROOT);

  test("a dotted SF Symbol name in a web file fails", () => {
    if (registry === null) throw new Error("the registry did not load");
    const issues = checkSfNamesAbsent(registry, [{ path: "web/packages/react/src/Icon.tsx", text: 'const back = "chevron.backward";' }]);
    expect(codes(issues)).toEqual(["sf/name-in-web"]);
  });

  test("a Phosphor name in a web file is fine", () => {
    if (registry === null) throw new Error("the registry did not load");
    expect(checkSfNamesAbsent(registry, [{ path: "web/packages/react/src/Icon.tsx", text: 'const back = "caret-left";' }])).toEqual([]);
  });
});

describe("mirroring", () => {
  test.each([
    ["chevron.backward", true],
    ["chevron.forward", true],
    ["sidebar.leading", true],
    ["square.and.arrow.up", false],
    ["circle", false],
  ])("%s is directional: %s", (name, expected) => {
    expect(isDirectionalSymbol(name)).toBe(expected);
  });

  test.each([
    ["chevron.backward", true],
    ["arrow.up.forward", true],
    ["calendar", true],
    ["chart.xyaxis.line", true],
    ["arrow.up.right", false],
    ["calendar.circle", false],
    ["circle", false],
  ])("%s is mirrored by the system: %s", (name, expected) => {
    expect(isSystemMirrored(name)).toBe(expected);
  });

  /** valid.json with its first icon rebound to `symbol` and mirrored as `rtlMirror` says. */
  function rebound(symbol: string, rtlMirror: { web: boolean; apple: boolean }): Registry {
    const { registry } = fixture("valid.json");
    if (registry === null) throw new Error("valid.json did not load");
    const [id, icon] = Object.entries(registry.icons)[0] ?? [];
    if (id === undefined || icon === undefined) throw new Error("valid.json has no icon");
    return { ...registry, icons: { [id]: { ...icon, rtlMirror, apple: { symbol } } } };
  }

  function rtlCodes(registry: Registry): readonly string[] {
    return codes(checkRegistryRules(registry)).filter((code) => code.startsWith("rtl/"));
  }

  test("a glyph the web flips may bind a symbol the system localizes for right to left, with rtlMirror.apple false", () => {
    expect(rtlCodes(rebound("calendar", { web: true, apple: false }))).toEqual([]);
    expect(rtlCodes(rebound("chart.xyaxis.line", { web: true, apple: false }))).toEqual([]);
  });

  test("setting rtlMirror.apple on a symbol the system localizes flips it twice", () => {
    expect(rtlCodes(rebound("calendar", { web: true, apple: true }))).toEqual(["rtl/double-mirror"]);
  });

  test("a left/right name is not mirrored by the system, so the web flipping it alone fails", () => {
    expect(rtlCodes(rebound("arrow.up.right", { web: true, apple: false }))).toEqual(["rtl/missing-mirror"]);
  });
});

describe("owned roots", () => {
  test("do not overlap the token writer's roots", () => {
    for (const root of OWNED_ROOTS) {
      for (const other of TOKEN_ROOTS) {
        expect(root === other || root.startsWith(`${other}/`) || other.startsWith(`${root}/`), `${root} vs ${other}`).toBe(false);
      }
    }
  });
});
