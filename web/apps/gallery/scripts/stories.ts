/// <reference types="node" />
/**
 * Generates one Storybook story per spec example (roadmap P3-4): src/stories/<Component>.stories.tsx for
 * every component `@iiiivaska/prism-react` declares in its manifest, from spec/components/<Component>.yaml.
 * The story's export name is the example id in PascalCase, so its Storybook id is `<component>--<example-id>`
 * (P3-5's `<Component>/<exampleId>`); its args are the example's props; the harness renders the rest of the
 * example (surface, backdrop, grid). Every story is tagged `vrt`, and an example limited to one scheme also
 * `schemes-<scheme>`.
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
 * spec/SCHEMA.md's `portrait` fixture, which the harness draws (`AvatarExampleArgs`). Icon's `style` is the spec's prop too: `IconProps`
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
  Divider: { render: "renderDividerExample" },
  Icon: { render: "renderIconExample" },
  IconButton: { render: "renderIconButtonExample" },
  Surface: { render: "renderSurfaceExample" },
  Text: { render: "renderTextExample" },
};

interface SpecExample {
  readonly id: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly surface?: string;
  readonly backdrop?: string;
  readonly grid?: readonly string[];
  readonly schemes?: readonly string[];
  readonly description?: string;
}

interface Spec {
  readonly name: string;
  readonly specVersion: number;
  readonly props?: readonly { readonly name: string; readonly type: string; readonly required?: boolean }[];
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

function loadSpec(component: string): Spec {
  return parse(readFileSync(join(repositoryRoot, "spec", "components", `${component}.yaml`), "utf8")) as Spec;
}

function exampleFields(example: SpecExample): Record<string, unknown> {
  const fields: Record<string, unknown> = { id: example.id };
  for (const key of ["surface", "backdrop", "grid", "schemes", "description"] as const) {
    if (example[key] !== undefined) fields[key] = example[key];
  }
  return fields;
}

/**
 * An example that renders in one scheme only (`schemes: [light]`, spec/SCHEMA.md) carries the tag
 * `schemes-<scheme>`, which the visual regression suite reads from index.json.
 */
function schemeTags(example: SpecExample): string[] {
  const schemes = example.schemes ?? [];
  return schemes.length === 1 ? [`  tags: ${JSON.stringify(schemes.map((scheme) => `schemes-${scheme}`))},`] : [];
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
      ...schemeTags(example),
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
