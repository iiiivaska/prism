/**
 * The role and the accessible name of a component's spec examples, as Chromium computes them
 * (./accessibility.tsx), in Vitest browser mode.
 *
 * Accessible names are byte-identical across the stacks for every spec example. The Apple suites read
 * theirs off the tree the simulator publishes; this is the web half of the same rule, read off the tree
 * the browser builds from what a story renders, so a name that only looks right in the markup — a label
 * on an element the browser does not name from it, a hidden part that is not hidden, a role that resolves
 * to something else — fails here. Each component's table is keyed by example id and holds exactly what a
 * screen reader is handed for every example of its spec, and the Apple suite named beside it expects the
 * same names for the same ids. Divider's was the first; a component adds its table here when it lands,
 * and Button's and Card's were recorded before Icon moved every glyph onto one path, so the move could
 * not change a name.
 */
import { afterEach, describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Icon, Theme } from "@iiiivaska/prism-react";
import * as buttonStories from "../src/stories/Button.stories.tsx";
import * as cardStories from "../src/stories/Card.stories.tsx";
import * as dividerStories from "../src/stories/Divider.stories.tsx";
import * as iconStories from "../src/stories/Icon.stories.tsx";
import { accessibleNodes, examplesInTheTree, nodesInTheTree, type AccessibleNode } from "./accessibility.tsx";

describe("the reading", () => {
  let host: HTMLElement | null = null;

  afterEach(() => {
    host?.remove();
    host = null;
  });

  function staged(markup: string): HTMLElement {
    host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    return host;
  }

  // The controls, as DSDividerAccessibilityTreeTests carries its own: the reading finds a named node and an
  // unnamed one, and finds nothing where the browser leaves an element out, so an empty reading is evidence
  // and not a walk that saw nothing.
  it("finds a named node and an unnamed one, and nothing that is hidden or only layout", async () => {
    expect(await accessibleNodes(staged(`<div role="separator" aria-label="Rule"></div>`))).toEqual([{ role: "separator", name: "Rule" }]);
    expect(await accessibleNodes(staged(`<div role="separator"></div>`))).toEqual([{ role: "separator", name: "" }]);
    expect(await accessibleNodes(staged(`<div role="separator" aria-hidden="true"></div>`))).toEqual([]);
    expect(await accessibleNodes(staged(`<div><span>Above</span></div>`))).toEqual([]);
    expect(await accessibleNodes(staged(`<span role="img" aria-label="Rule"><svg aria-hidden="true"></svg></span>`))).toEqual([{ role: "image", name: "Rule" }]);
  });

  it("names a node the way the browser does, not the way the markup reads", async () => {
    // aria-labelledby wins over aria-label, and a button takes its name from its contents.
    const markup = `<span id="named-by">Below</span><button aria-labelledby="named-by" aria-label="Above"></button><button>Above</button>`;
    expect(await accessibleNodes(staged(markup))).toEqual([
      { role: "button", name: "Below" },
      { role: "button", name: "Above" },
    ]);
  });
});

/**
 * Divider.yaml `accessibility`: role none while `isDecorative` is true, separator otherwise, and
 * `label: none`. The one difference between the stacks is the role of `semantic`: the web exposes the
 * line as a separator, and SwiftUI has no separator trait, so `DSDivider` is never an accessibility
 * element (Divider.yaml `notes.platform.ios`, ADR-0032), which
 * swift/Tests/DSSnapshotTests/DSDividerAccessibilityTreeTests.swift reads off the simulator for the same
 * ids. Neither stack announces a name: the name is the empty string for every example on both.
 */
describe("Divider (Divider.yaml accessibility)", () => {
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    horizontal: [],
    "horizontal-inset": [],
    vertical: [],
    semantic: [{ role: "separator", name: "" }],
    "on-vivid": [],
    "on-glass-over-map": [],
  };

  it("exposes semantic as a separator with the empty name, and no other example at all", async () => {
    expect(await examplesInTheTree(dividerStories)).toEqual(expected);
  });
});

/**
 * Button.yaml `accessibility`: one button named by its `label`, and "<label>, loading" while it loads
 * (behavior 3). Its icons are drawn by Icon with no `label`, so they are hidden and add no node: the tree of
 * `secondary-md` and `ghost-sm` is the one button and nothing else. The Apple twin is
 * swift/Tests/DSSnapshotTests/DSIconAccessibilityTreeTests.swift, which reads `Details` and `Filter` for the
 * same two ids; `DSButtonAppearance.loadingWord` writes the same ", loading".
 */
describe("Button (Button.yaml accessibility)", () => {
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    "primary-md": [{ role: "button", name: "Continue" }],
    "secondary-md": [{ role: "button", name: "Details" }],
    "ghost-sm": [{ role: "button", name: "Filter" }],
    "danger-md": [{ role: "button", name: "Delete route" }],
    loading: [{ role: "button", name: "Saving, loading" }],
    disabled: [{ role: "button", name: "Continue" }],
    "on-vivid": [{ role: "button", name: "Open" }],
  };

  it("names each example by its label, and no glyph adds a node", async () => {
    expect(await examplesInTheTree(buttonStories)).toEqual(expected);
  });
});

/**
 * Card.yaml `accessibility.label`: every example is pressable (the gallery passes the no-op `onAction`
 * spec/SCHEMA.md asks for), so each card is one button named by its title, its caption line and its hero,
 * joined by `cardNameSeparator`. The strings are `DSCardNameCase.all` in
 * swift/Tests/DSComponentsTests/DSCardBindingTests.swift, id for id. The open glyph and the icon ring are
 * drawn by Icon with no `label`, so they are hidden and add no node, `image` least of all.
 */
describe("Card (Card.yaml accessibility)", () => {
  const averageYield = { role: "button", name: "Average yield" } as const;
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    "solid-metric": [{ role: "button", name: "Line output, Last 24 hours, 86.4 %" }],
    "vivid-default-kpi": [{ role: "button", name: "Average yield, Dollars per batch, $2,450" }],
    "vivid-pair": [averageYield, averageYield, averageYield, averageYield],
    "glass-vehicle": [{ role: "button", name: "Unit 4417, 21.11.2026, 14:05:22" }],
    "glass-selected": [{ role: "button", name: "Unit 4417" }],
    "tinted-focus": [{ role: "button", name: "Sensor, Active" }],
    compact: [{ role: "button", name: "Queued, 37" }],
  };

  it("names each example as the Apple suite does, and no glyph adds a node", async () => {
    expect(await examplesInTheTree(cardStories)).toEqual(expected);
  });
});

/**
 * Icon.yaml `accessibility` and behaviors 13 and 14 (ADR-0032): a glyph is an image only when it has a
 * `label` and `isDecorative` is false, named by that label and nothing else; every other glyph is hidden,
 * whatever `isDecorative` says, and the registry entry's own `label` field is never a name. So
 * `named-standalone` is the one example in the tree, `Locked for editing`, byte for byte the string
 * swift/Tests/DSSnapshotTests/DSIconAccessibilityTreeTests.swift reads off the simulator for the same id,
 * and every other example adds no node on either stack.
 */
describe("Icon (Icon.yaml accessibility)", () => {
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    "control-md": [],
    "corner-sm": [],
    "display-lg": [],
    "status-filled": [],
    "accent-mark": [],
    "inherit-in-row": [],
    decorative: [],
    "named-standalone": [{ role: "image", name: "Locked for editing" }],
    "on-vivid": [],
    "on-glass-over-map": [],
    "on-glass-light-over-image": [],
  };

  it("exposes named-standalone as an image named by its label, and no other example at all", async () => {
    expect(await examplesInTheTree(iconStories)).toEqual(expected);
  });

  // The rule no example stages: a label that is nothing but whitespace names nothing, so the glyph is not in
  // the tree at all rather than an image with an empty name. DSIconAccessibilityTreeTests holds Apple's
  // tree to the same, and DSIconBindingTests.blankLabels is this list.
  it("leaves out a glyph whose label is blank, and names one whose label is a phrase", async () => {
    const read = (label: string): Promise<AccessibleNode[]> =>
      nodesInTheTree(
        <Theme tokens={tokens}>
          <Icon name="object.lock" label={label} />
        </Theme>,
      );
    for (const blank of ["", "  ", "\t\n", "\u00a0", "\u3000", "\ufeff"]) {
      expect(await read(blank), JSON.stringify(blank)).toEqual([]);
    }
    expect(await read("Locked for editing")).toEqual([{ role: "image", name: "Locked for editing" }]);
  });
});
