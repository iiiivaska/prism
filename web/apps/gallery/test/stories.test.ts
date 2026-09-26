/// <reference types="node" />
/**
 * The stories cannot drift from the specs (roadmap P3-4): src/stories is exactly what scripts/stories.ts
 * generates from spec/components, every example has the gallery's sample copy, and every story id is
 * `<component>--<example-id>`, the name P3-5's snapshot pairing uses. The stories tagged `glass`, which the
 * visual regression suite also photographs under Reduce Transparency, are the examples the Apple matrix
 * photographs under it (roadmap P4-D9).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { storyNameFromExport, toId } from "storybook/internal/csf";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { componentsWithSampleCopy, exampleContent } from "../src/harness/content.ts";
import { exportName, loadSpec, manifestComponents, rendersGlass, repositoryRoot, storyDrift } from "../scripts/stories.ts";

/** The committed SwiftUI baselines, `<Component>/<example-id>.ios.<scheme>.<density>[.<variant>].png`. */
const appleBaselines = join(repositoryRoot, "swift", "Tests", "DSSnapshotTests", "__Snapshots__");

const components = manifestComponents();
const examples = components.flatMap((component) => {
  const spec = parse(readFileSync(join(repositoryRoot, "spec", "components", `${component}.yaml`), "utf8")) as { examples: { id: string }[] };
  return spec.examples.map((example) => ({ component, id: example.id }));
});

describe("the gallery stories", () => {
  it("cover the components the react manifest declares", () => {
    expect(components).toEqual(["Avatar", "Badge", "Button", "Card", "Chip", "Divider", "Icon", "IconButton", "Surface", "Text"]);
  });

  it("are what scripts/stories.ts generates from the specs", () => {
    expect(storyDrift()).toEqual([]);
  });

  it.each(examples)("$component/$id has the id <component>--<example-id>, and sample copy where the harness needs it", ({ component, id }) => {
    expect(exampleContent[`${component}/${id}`] !== undefined).toBe(componentsWithSampleCopy.includes(component));
    expect(toId(component, storyNameFromExport(exportName(id)))).toBe(`${component.toLowerCase()}--${id}`);
  });

  it("keep no sample copy for an example that no longer exists", () => {
    const keys = new Set(examples.map(({ component, id }) => `${component}/${id}`));
    expect(Object.keys(exampleContent).filter((key) => !keys.has(key))).toEqual([]);
  });

  it("tag `glass` exactly the examples the Apple matrix photographs under Reduce Transparency", () => {
    // Apple's set is `hasGlass`, read off its committed baselines. A component Apple has not recorded yet has no set to
    // agree with; once both stacks have recorded it, `tools/gallery` holds the two sets to each other as pairs.
    const recorded = components.filter((component) => existsSync(join(appleBaselines, component)));
    const apple = recorded.flatMap((component) =>
      readdirSync(join(appleBaselines, component))
        .filter((file) => file.endsWith(".reduce-transparency.png"))
        .map((file) => `${component}/${file.split(".")[0] ?? ""}`),
    );
    const tagged = recorded.flatMap((component) => {
      const spec = loadSpec(component);
      return spec.examples.filter((example) => rendersGlass(spec, example)).map((example) => `${component}/${example.id}`);
    });
    expect(tagged.length).toBeGreaterThan(0);
    expect([...new Set(apple)].sort()).toEqual(tagged.sort());
  });
});
