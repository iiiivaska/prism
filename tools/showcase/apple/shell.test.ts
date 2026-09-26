// The Apple showcase's sidebar selects, and a section it selects opens at its root.
//
// The owner's report of 2026-09-26: in the macOS app CI built, the whole sidebar ignored clicks. SwiftUI tags each
// row of a `List(data, selection:)` with the element's `Identifiable.id`, and a row can be selected only when that
// tag has the selection's type. `DSShowcaseSection.id` is its `String` raw value and the selection is a
// `DSShowcaseSection?`, so no row ever matched: not on the Mac, and not in the iPad's or the iPhone's sidebar either.
// A second fault hid behind the first. The pages a launch argument pushes stayed on the stack when the section
// changed, so a sidebar that did select would still have shown the pushed page.
//
// No test here can click a SwiftUI list; the `showcase-apps` job of .github/workflows/ci.yml does, on a Mac, and fails
// when the page does not follow. This file guards the two lines where the mistakes were made, under `pnpm -r test`.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../tokens/ir/bundle.ts";

const SHELL = "swift/Showcase/Sources/DSShowcase/App/DSShowcaseShell.swift";
const source = readFileSync(join(REPO_ROOT, SHELL), "utf8");

describe("the Apple showcase sidebar", () => {
  it("is a list over the sections whose rows are tagged with the section itself", () => {
    const call = /List\(DSShowcaseSection\.allCases,([^)]*)\)/u.exec(source);
    expect(call, `${SHELL} has no List over DSShowcaseSection.allCases`).not.toBeNull();
    const args = call?.[1] ?? "";
    expect(args, "the list binds the section selection").toContain("selection: $section");
    expect(args, "rows tagged with the String id cannot equal a DSShowcaseSection? selection: pass `id: \\.self`").toContain("id: \\.self");
  });

  it("still identifies a section by a String, which is why the list needs `id: \\.self`", () => {
    // If `id` ever becomes the section itself, `id: \.self` is redundant but harmless; this names the reason for it.
    expect(source).toMatch(/public var id: String \{ rawValue \}/u);
    expect(source).toMatch(/@State private var section: DSShowcaseSection\?/u);
  });

  it("opens a newly selected section at its root, not under the pages of the last one", () => {
    expect(source).toMatch(/\.onChange\(of: section\) \{ path = NavigationPath\(\) \}/u);
  });
});
