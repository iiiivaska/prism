/**
 * The role and the accessible name the browser computes, read from Chromium's own accessibility tree —
 * not from the markup.
 *
 * A server render or a DOM query shows the attributes a component writes; what a screen reader is handed
 * is what the browser makes of them: which element is in the tree at all, the role it resolves to, and
 * the name the accessible-name computation produces from `aria-label`, `aria-labelledby`, the contents and
 * everything else. That is the half the Apple suites already read off the simulator
 * (swift/Tests/DSSnapshotTests/DSDividerAccessibilityTreeTests.swift walks what UIKit publishes), and the
 * half that has to be byte-identical across the stacks for every spec example. So this asks Blink for it,
 * through the DevTools protocol session Vitest opens on the Playwright Chromium the gallery tests run in
 * (`cdp()` from `vitest/browser`): `Accessibility.queryAXTree` over the element's subtree, in an isolated
 * world of the test's own frame.
 *
 * What comes back is the list of nodes that carry a role or a name, in tree order:
 *
 * - a node Chromium ignores is left out, and so is everything `aria-hidden`, `display: none` or
 *   presentational, which Chromium does not put in the tree at all;
 * - a `generic` node (a `div`, a `span`) is left out while it has no name, because it is layout, not
 *   something a screen reader stops on; a named one is kept, so a name on the wrong element shows;
 * - text runs (`StaticText`, `InlineTextBox`, `LineBreak`) are left out: their words reach assistive
 *   technology as the name of the node around them, or as reading content, which is not a name.
 *
 * Roles are Chromium's spelling of them (`image` for `role="img"`, `separator`, `button`). Names are the
 * strings Chromium computed, compared byte for byte with the ones the Apple suites read for the same ids.
 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { cdp } from "vitest/browser";
import { composeStories, type composeStory } from "@storybook/react-vite";
import preview from "../.storybook/preview.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** One node a screen reader is handed: Chromium's computed role, and its computed accessible name. */
export interface AccessibleNode {
  readonly role: string;
  readonly name: string;
}

/** The roles that carry nothing of their own: layout boxes and text runs. */
const UNROLED: ReadonlySet<string> = new Set(["generic", "none", "StaticText", "InlineTextBox", "LineBreak"]);

/** The attribute that tells the isolated world which element to hand to the protocol. */
const TARGET = "data-ds-a11y-target";

let world: Promise<number> | null = null;

/**
 * An isolated world in this test's own frame. Vitest runs a test file in an iframe of the page the session
 * is attached to, so the frame is the one whose URL is this document's; an isolated world shares its DOM
 * and nothing else, so the lookup below cannot touch the page's scripts.
 */
function isolatedWorld(): Promise<number> {
  world ??= (async () => {
    const session = cdp();
    const { frameTree } = await session.send("Page.getFrameTree");
    const frames = [frameTree];
    for (let index = 0; index < frames.length; index += 1) frames.push(...(frames[index]?.childFrames ?? []));
    const frame = frames.find((candidate) => candidate.frame.url === location.href)?.frame;
    if (frame === undefined) {
      throw new Error(`No frame of this page is the test's own document (${location.href}): ${frames.map((candidate) => candidate.frame.url).join(", ")}`);
    }
    const { executionContextId } = await session.send("Page.createIsolatedWorld", { frameId: frame.id, worldName: "prism-a11y" });
    return executionContextId;
  })();
  return world;
}

/** The nodes of `element`'s subtree, `element` included, that carry a role or a name, in tree order. */
export async function accessibleNodes(element: Element): Promise<AccessibleNode[]> {
  const session = cdp();
  const contextId = await isolatedWorld();
  const token = crypto.randomUUID();
  element.setAttribute(TARGET, token);
  try {
    const { result } = await session.send("Runtime.evaluate", { expression: `document.querySelector('[${TARGET}="${token}"]')`, contextId });
    if (result.objectId === undefined) throw new Error("The isolated world did not find the element it was handed.");
    const { nodes } = await session.send("Accessibility.queryAXTree", { objectId: result.objectId });
    await session.send("Runtime.releaseObject", { objectId: result.objectId });
    return nodes.flatMap((node) => {
      if (node.ignored) return [];
      const role = typeof node.role?.value === "string" ? node.role.value : "";
      const name = typeof node.name?.value === "string" ? node.name.value : "";
      if (UNROLED.has(role) && !(role === "generic" && name !== "")) return [];
      return [{ role, name }];
    });
  } finally {
    element.removeAttribute(TARGET);
  }
}

/** A generated stories module (src/stories/<Component>.stories.tsx), one story per spec example. */
export type StoriesModule = Parameters<typeof composeStories>[0];

/** One of its stories composed with the gallery's preview: a React component that renders the example. */
type ComposedStory = ReturnType<typeof composeStory>;

/** `composeStories` types its result after the module it is handed, and a composed story is a function. */
function isComposedStory(value: unknown): value is ComposedStory {
  return typeof value === "function";
}

/** The spec example a generated story stages: `parameters.prism.example.id` (scripts/stories.ts). */
function exampleId(parameters: unknown): string {
  const id = (parameters as { readonly prism?: { readonly example?: { readonly id?: unknown } } } | undefined)?.prism?.example?.id;
  if (typeof id !== "string") throw new Error("A story without `parameters.prism.example.id` is not one scripts/stories.ts generated.");
  return id;
}

/**
 * Every example of a component as the gallery renders it — its generated story, composed with the gallery's
 * own preview, so the `<Theme>` decorator, the harness stage and the no-op handler the generator adds for
 * each action prop are all there — mounted one at a time, with the nodes above read off each.
 *
 * Keyed by the spec example's id, the id the Apple suites print for the same example. (A module namespace
 * lists its exports alphabetically, so the keys are not in the spec's order.)
 */
export async function examplesInTheTree(stories: StoriesModule): Promise<Record<string, AccessibleNode[]>> {
  const read: Record<string, AccessibleNode[]> = {};
  for (const Story of Object.values(composeStories(stories, preview)).filter(isComposedStory)) {
    read[exampleId(Story.parameters)] = await nodesInTheTree(<Story />);
  }
  return read;
}

/**
 * The nodes above for one React node, mounted on its own and unmounted after the reading: what a case
 * no spec example stages — a blank `label`, say — is handed to a screen reader as. The caller brings
 * whatever `<Theme>` the node needs.
 */
export async function nodesInTheTree(node: ReactNode): Promise<AccessibleNode[]> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(node);
      await Promise.resolve();
    });
    return await accessibleNodes(host);
  } finally {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    host.remove();
  }
}
