/// <reference types="node" />
/**
 * Generates one Storybook story per spec example (roadmap P3-4): src/stories/<Component>.stories.tsx for
 * every component `@iiiivaska/prism-react` declares in its manifest, from spec/components/<Component>.yaml.
 * The story's export name is the example id in PascalCase, so its Storybook id is `<component>--<example-id>`
 * (P3-5's `<Component>/<exampleId>`); its args are the example's props; the harness renders the rest of the
 * example (surface, backdrop, grid). Every story is tagged `vrt`, an example limited to one scheme also
 * `schemes-<scheme>`, and an example that renders glass also `glass` (`rendersGlass`).
 *
 *   node scripts/stories.ts          write src/stories
 *   node scripts/stories.ts --check  exit 1 if src/stories differs from the specs (run by test/stories.test.ts)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

export const galleryRoot = resolve(import.meta.dirname, "..");
export const repositoryRoot = resolve(galleryRoot, "..", "..", "..");
export const storiesDir = join(galleryRoot, "src", "stories");
const manifestFile = join(repositoryRoot, "web", "packages", "react", "src", "manifest.ts");

/**
 * How the gallery stages each component it knows: the harness renderer, and the type of the args its
 * stories carry.
 *
 * A story's args are the example's props verbatim, so they are the spec's props — which are the
 * component's props for all but Card, whose API bundles `action`, `actionIcon` and `actionLabel` into
 * one `CardAction` (Card.yaml `action` licenses that), and Avatar, whose `image` an example writes as
 * spec/SCHEMA.md's `portrait` fixture, which the harness draws (`AvatarExampleArgs`), as it draws one inside
 * Chip's `avatar` slot (`ChipExampleArgs`). Icon's `style` is the spec's prop too: `IconProps`
 * leaves React's inline `style` out, so `style: "filled"` reaches Icon as the value it is. `StoryObj<typeof meta>` reads its args off
 * `meta.component`, so a Card story typed that way cannot even carry `action: custom`; `args` names the
 * harness type that can, and the harness assembles the bundle (`cardArgs`).
 */
interface Renderer {
  readonly render: string;
  /** The harness type of the story's args, when the spec's props are not the component's props. */
  readonly args?: string;
}

const RENDERERS: Readonly<Record<string, Renderer>> = {
  Avatar: { render: "renderAvatarExample", args: "AvatarExampleArgs" },
  Badge: { render: "renderBadgeExample" },
  Button: { render: "renderButtonExample" },
  Card: { render: "renderCardExample", args: "CardExampleArgs" },
  Chip: { render: "renderChipExample", args: "ChipExampleArgs" },
  Divider: { render: "renderDividerExample" },
  Icon: { render: "renderIconExample" },
  IconButton: { render: "renderIconButtonExample" },
  Surface: { render: "renderSurfaceExample" },
  Text: { render: "renderTextExample" },
};

export interface SpecExample {
  readonly id: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly surface?: string;
  readonly backdrop?: string;
  readonly grid?: readonly string[];
  readonly schemes?: readonly string[];
  readonly description?: string;
}

export interface SpecProp {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly values?: readonly string[];
  readonly default?: unknown;
}

export interface Spec {
  readonly name: string;
  readonly specVersion: number;
  readonly props?: readonly SpecProp[];
  /** The binding matrix of every part (spec/SCHEMA.md, "Token bindings"). */
  readonly tokens?: Readonly<Record<string, unknown>>;
  readonly examples: readonly SpecExample[];
}

/**
 * An `action` prop (Button's `onPress`, Card's `onAction`) is a handler, and spec/SCHEMA.md's example
 * grammar carries prop values only — never a callback. So the story file gives every action prop a spy
 * from `storybook/test` once, in the meta, and Storybook's actions panel shows the call.
 *
 * That is spec/SCHEMA.md's rule, not this generator's convenience: "Both galleries pass a no-op handler
 * for each prop of type `action` the spec declares, whether or not the example's `props` name it", so
 * an example renders the component's interactive form in both stacks. Card.yaml's `action: open`
 * "makes the whole card pressable" only with one, and without a handler the card is deliberately not a
 * control and draws no open glyph (behaviors 3 and 4) — a different picture, which belongs in a probe
 * (src/probes/CardAction.stories.tsx), never in an example.
 */
function actionArgs(spec: Spec): string[] {
  return (spec.props ?? []).filter((prop) => prop.type === "action").map((prop) => prop.name);
}

/** The component names `implemented` declares, read as text like `pnpm parity:report` reads it. */
export function manifestComponents(): string[] {
  const source = readFileSync(manifestFile, "utf8");
  const literal = /export const implemented[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source)?.[1] ?? "";
  return [...literal.matchAll(/^\s*"?([A-Z]\w*)"?\s*:/gm)].map((match) => match[1] ?? "").sort();
}

export function exportName(exampleId: string): string {
  return exampleId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function loadSpec(component: string): Spec {
  return parse(readFileSync(join(repositoryRoot, "spec", "components", `${component}.yaml`), "utf8")) as Spec;
}

function exampleFields(example: SpecExample): Record<string, unknown> {
  const fields: Record<string, unknown> = { id: example.id };
  for (const key of ["surface", "backdrop", "grid", "schemes", "description"] as const) {
    if (example[key] !== undefined) fields[key] = example[key];
  }
  return fields;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The two glass materials (spec/SCHEMA.md): the scheme's glass and light glass. */
const GLASS_MATERIALS: readonly string[] = ["glass", "glassLight"];

/** The keys of a binding matrix's two ground axes: the published material, and the backdrop kind beside it (spec/SCHEMA.md). */
const MATERIALS: readonly string[] = ["page", "solid", "raised", "nested", "inverse", "vivid", "glass", "glassLight", "accent"];
const BACKDROPS: readonly string[] = ["none", "image", "map", "vivid"];

/** The recipe a part binds as its `background` where the Surface module draws that part as the glass chip (ADR-0036 §2). */
const GLASS_CHIP = "material.glass.chip";

/** What a component is staged on: the material the Surface around it publishes, and that Surface's backdrop kind. */
interface Ground {
  readonly material: string;
  readonly backdrop: string;
}

/**
 * The ground the harness stages an example's component on (src/harness/examples.tsx): the page, over the synthetic map or
 * image that `surface` names and `GalleryGround` declares, or a Surface of the material `surface` names, over the example's
 * `backdrop`.
 */
function groundOf(example: SpecExample): Ground {
  const surface = example.surface ?? "page";
  if (surface === "map" || surface === "image") return { material: "page", backdrop: surface };
  return { material: surface, backdrop: surface === "page" ? "none" : (example.backdrop ?? "none") };
}

/**
 * The key an example reaches at one level of a binding matrix (spec/SCHEMA.md, "The binding-matrix grammar"): the
 * published material or the backdrop kind of its ground, or the value it gives the enum prop whose values key the level,
 * else that prop's default. Undefined where no axis keys the level.
 */
function axisKey(keys: readonly string[], ground: Ground, spec: Spec, example: SpecExample): string | undefined {
  if (keys.length === 0) return undefined;
  if (keys.every((key) => MATERIALS.includes(key))) return ground.material;
  if (keys.every((key) => BACKDROPS.includes(key))) return ground.backdrop;
  const prop = spec.props?.find((candidate) => candidate.type === "enum" && keys.every((key) => candidate.values?.includes(key) === true));
  const value = prop === undefined ? undefined : (example.props?.[prop.name] ?? prop.default);
  return typeof value === "string" ? value : undefined;
}

/** The cell of a binding matrix an example reaches on its ground, one level at a time, taking `default` where its key has no cell. */
function cellOn(binding: unknown, ground: Ground, spec: Spec, example: SpecExample): unknown {
  if (!isRecord(binding)) return binding;
  const key = axisKey(Object.keys(binding).filter((name) => name !== "default"), ground, spec, example);
  return cellOn(key !== undefined && key in binding ? binding[key] : binding["default"], ground, spec, example);
}

/**
 * Whether an example renders glass, and so is also photographed under forced Reduce Transparency, under which the glass
 * falls back (roadmap P4-D9; ADR-0022 §1.2, ADR-0036 §9.1). It is ADR-0036's `hasGlass`, "renders a glass recipe", which
 * the Apple matrix reads off each example (`DSExample.hasGlass`, swift/Tests/DSSnapshotTests/DSSnapshotMatrix.swift),
 * read here from the spec:
 *
 * - the example sits inside a glass Surface: its `surface` is `glass` or `glassLight`;
 * - it draws glass itself: its own material, which spec:validate reads from `material` or else `variant`, is one of
 *   those two (Surface's and Card's glass examples); or
 * - some part's `background` binds the glass chip, `material.glass.chip`, on the ground the example is staged on (Avatar
 *   and Chip over the map, and Chip on vivid).
 *
 * The gallery pairs by name, so the two stacks photograph the same set: test/stories.test.ts holds this one to the Apple
 * matrix's, and once both have recorded the variant an example in one set alone is a missing pair to `tools/gallery`.
 */
export function rendersGlass(spec: Spec, example: SpecExample): boolean {
  if (example.surface !== undefined && GLASS_MATERIALS.includes(example.surface)) return true;
  const props = example.props ?? {};
  const own = typeof props["material"] === "string" ? props["material"] : props["variant"];
  if (typeof own === "string" && GLASS_MATERIALS.includes(own)) return true;
  const ground = groundOf(example);
  return Object.values(spec.tokens ?? {}).some((part) => isRecord(part) && cellOn(part["background"], ground, spec, example) === GLASS_CHIP);
}

/**
 * The story's own tags, which the visual regression suite reads from index.json (web/apps/vrt/matrix.ts):
 * `schemes-<scheme>` for an example that renders in one scheme only (`schemes: [light]`, spec/SCHEMA.md), and `glass`
 * for one that renders glass (`rendersGlass`), which is also photographed under forced Reduce Transparency.
 */
function storyTags(spec: Spec, example: SpecExample): string[] {
  const schemes = example.schemes ?? [];
  const tags = [...(schemes.length === 1 ? schemes.map((scheme) => `schemes-${scheme}`) : []), ...(rendersGlass(spec, example) ? ["glass"] : [])];
  return tags.length === 0 ? [] : [`  tags: ${JSON.stringify(tags)},`];
}

export function renderStories(component: string): string {
  const spec = loadSpec(component);
  const entry = RENDERERS[component];
  if (entry === undefined) {
    throw new Error(`The gallery has no renderer for ${component}: add one to src/harness/examples.tsx and RENDERERS in scripts/stories.ts`);
  }
  const renderer = entry.render;
  const imported = [renderer, ...(entry.args === undefined ? [] : [`type ${entry.args}`]), "type ExampleFields"];
  const actions = actionArgs(spec);
  const lines = [
    `// Generated by scripts/stories.ts from spec/components/${component}.yaml (specVersion ${spec.specVersion}). Do not edit;`,
    "// run `pnpm --filter @iiiivaska/prism-gallery stories` after the spec changes.",
    'import type { Meta, StoryObj } from "@storybook/react-vite";',
    ...(actions.length > 0 ? ['import { fn } from "storybook/test";'] : []),
    `import { ${component} } from "@iiiivaska/prism-react";`,
    `import { ${imported.join(", ")} } from "../harness/examples.tsx";`,
    "",
    "const meta = {",
    `  title: "${component}",`,
    `  component: ${component},`,
    '  tags: ["vrt"],',
    ...(actions.length > 0 ? [`  args: { ${actions.map((name) => `${name}: fn()`).join(", ")} },`] : []),
    `  parameters: { prism: { component: "${component}", specVersion: ${spec.specVersion} } },`,
    `} satisfies Meta<typeof ${component}>;`,
    "",
    "export default meta;",
    "",
    `type Story = StoryObj<${entry.args ?? "typeof meta"}>;`,
    "",
    'function example(fields: ExampleFields): Pick<Story, "parameters" | "render"> {',
    `  return { parameters: { prism: { example: fields } }, render: (args) => ${renderer}(args, fields) };`,
    "}",
  ];
  for (const example of spec.examples) {
    lines.push(
      "",
      `/** ${component}.yaml example \`${example.id}\`${example.description === undefined ? "" : `: ${example.description.replaceAll("*/", "* /")}`} */`,
      `export const ${exportName(example.id)}: Story = {`,
      `  name: ${JSON.stringify(example.id)},`,
      ...storyTags(spec, example),
      `  args: ${JSON.stringify(example.props ?? {})},`,
      `  ...example(${JSON.stringify(exampleFields(example))}),`,
      "};",
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Every story file the specs produce, by file name. */
export function expectedStories(): Map<string, string> {
  return new Map(manifestComponents().map((component) => [`${component}.stories.tsx`, renderStories(component)]));
}

/** Differences between src/stories and the specs; empty when they agree. */
export function storyDrift(): string[] {
  const expected = expectedStories();
  const problems: string[] = [];
  const present = existsSync(storiesDir) ? readdirSync(storiesDir).filter((file) => file.endsWith(".stories.tsx")) : [];
  for (const file of present) if (!expected.has(file)) problems.push(`${file} has no component in the manifest`);
  for (const [file, content] of expected) {
    const path = join(storiesDir, file);
    if (!existsSync(path)) problems.push(`${file} is missing`);
    else if (readFileSync(path, "utf8") !== content) problems.push(`${file} differs from spec/components/${file.replace(".stories.tsx", ".yaml")}`);
  }
  return problems;
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const problems = storyDrift();
    for (const problem of problems) console.error(`stories: ${problem}`);
    if (problems.length > 0) {
      console.error("stories: run `pnpm --filter @iiiivaska/prism-gallery stories` and commit src/stories.");
      process.exitCode = 1;
    } else {
      console.log("stories: src/stories matches the specs");
    }
  } else {
    const expected = expectedStories();
    mkdirSync(storiesDir, { recursive: true });
    for (const file of readdirSync(storiesDir)) if (file.endsWith(".stories.tsx") && !expected.has(file)) rmSync(join(storiesDir, file));
    for (const [file, content] of expected) writeFileSync(join(storiesDir, file), content);
    console.log(`stories: wrote ${expected.size} story files`);
  }
}
