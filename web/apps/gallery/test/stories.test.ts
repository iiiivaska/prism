/// <reference types="node" />
/**
 * The stories cannot drift from the specs (roadmap P3-4): src/stories is exactly what scripts/stories.ts
 * generates from spec/components, every example has the gallery's sample copy, and every story id is
 * `<component>--<example-id>`, the name P3-5's snapshot pairing uses.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { storyNameFromExport, toId } from "storybook/internal/csf";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { componentsWithSampleCopy, exampleContent } from "../src/harness/content.ts";
import { exportName, manifestComponents, repositoryRoot, storyDrift } from "../scripts/stories.ts";

const components = manifestComponents();
const examples = components.flatMap((component) => {
  const spec = parse(readFileSync(join(repositoryRoot, "spec", "components", `${component}.yaml`), "utf8")) as { examples: { id: string }[] };
  return spec.examples.map((example) => ({ component, id: example.id }));
});

describe("the gallery stories", () => {
  it("cover the components the react manifest declares", () => {
    expect(components).toEqual(["Button", "Card", "Divider", "Icon", "Surface", "Text"]);
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
});
