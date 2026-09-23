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
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Badge, Icon, IconButton, Theme } from "@iiiivaska/prism-react";
// The host flag is internal to the package (IconButton sets it, roadmap P4-4), so it is imported from the
// source; vitest.config.ts resolves `@iiiivaska/prism-react` to that same source, so this is the one context
// the Badge above reads.
import { BadgeHostContext } from "../../../packages/react/src/badge/host.ts";
import * as badgeStories from "../src/stories/Badge.stories.tsx";
import * as buttonStories from "../src/stories/Button.stories.tsx";
import * as cardStories from "../src/stories/Card.stories.tsx";
import * as dividerStories from "../src/stories/Divider.stories.tsx";
import * as iconStories from "../src/stories/Icon.stories.tsx";
import * as iconButtonStories from "../src/stories/IconButton.stories.tsx";
import {
  accessibleNodes,
  examplesInTheTree,
  examplesTextInTheTree,
  nodesInTheTree,
  textInTheTree,
  textRuns,
  type AccessibleNode,
  type TextRun,
} from "./accessibility.tsx";

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

  // The unfiltered half: a text run is found with the node that holds it, loose text is held by nothing,
  // and text under aria-hidden is not in the tree at all.
  it("reads every text run with the node that holds it, and none that is hidden", async () => {
    expect(await textRuns(staged(`<span role="img" aria-label="Rule"><span><span>3</span></span></span>`))).toEqual([{ text: "3", in: { role: "image", name: "Rule" } }]);
    expect(await textRuns(staged(`<div><span>Above</span></div>`))).toEqual([{ text: "Above", in: null }]);
    expect(await textRuns(staged(`<span role="img" aria-label="Rule" aria-hidden="true"><span>3</span></span>`))).toEqual([]);
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

/**
 * Badge.yaml `accessibility` and behavior 10 (ADR-0032): a badge that stands alone with a non-blank `label`
 * is one image named by the string it contributes, the `strings.Badge.count` sentence with the true count
 * (`128 open incidents` while it draws `99+`) or a dot's `label` alone; every other badge is hidden. Every
 * example stands alone with a label, so each is one node, and its name is byte for byte the string
 * swift/Tests/DSSnapshotTests/DSBadgeAccessibilityTreeTests.swift reads off the simulator for the same id.
 * The role is the stacks' one difference (`notes.platform`): Chromium's `image` here, an element with no
 * trait on Apple.
 *
 * The digits are not a node the name reading can see either way, because it leaves out every text run.
 * Chromium's own tree does keep them: the drawn digits are one `StaticText` held by the image and by
 * nothing else, so no digit is loose text beside the badge, and a hidden badge leaves no text at all. An
 * image's children are presentational, so at the platform level the image is a leaf and a screen reader
 * hears its name alone; that last step is Chromium's platform mapping, which the protocol read here does
 * not expose, so it is stated and not asserted.
 */
describe("Badge (Badge.yaml accessibility)", () => {
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    "count-neutral": [{ role: "image", name: "3 unread alerts" }],
    "count-critical": [{ role: "image", name: "12 open incidents" }],
    "count-accent": [{ role: "image", name: "7 items needing attention" }],
    "count-overflow": [{ role: "image", name: "128 open incidents" }],
    "outline-neutral": [{ role: "image", name: "4 queued runs" }],
    "outline-critical": [{ role: "image", name: "2 open incidents" }],
    "dot-critical": [{ role: "image", name: "unread" }],
    "dot-accent": [{ role: "image", name: "new" }],
    "on-vivid": [{ role: "image", name: "3 unread alerts" }],
    "on-glass-over-map": [{ role: "image", name: "2 open incidents" }],
  };

  it("names each example by its contribution, as the Apple suite does", async () => {
    expect(await examplesInTheTree(badgeStories)).toEqual(expected);
  });

  it("holds the drawn digits as the image's own text, never as text beside it, and a dot holds none", async () => {
    const digits = (text: string, name: string): TextRun[] => [{ text, in: { role: "image", name } }];
    expect(await examplesTextInTheTree(badgeStories)).toEqual({
      "count-neutral": digits("3", "3 unread alerts"),
      "count-critical": digits("12", "12 open incidents"),
      "count-accent": digits("7", "7 items needing attention"),
      // The run is what the badge draws; the name is what it says.
      "count-overflow": digits("99+", "128 open incidents"),
      "outline-neutral": digits("4", "4 queued runs"),
      "outline-critical": digits("2", "2 open incidents"),
      "dot-critical": [],
      "dot-accent": [],
      "on-vivid": digits("3", "3 unread alerts"),
      "on-glass-over-map": digits("2", "2 open incidents"),
    });
  });

  // The hidden cases no example stages, which DSBadgeAccessibilityTreeTests holds Apple's tree to as well:
  // a count with no label, a blank label (DSIconBindingTests.blankLabels, Icon's rule), a dot with no label,
  // counts that render nothing, and a labelled badge inside a host that reads it. None is in the tree at all:
  // no node, and no text run of its digits either.
  it("leaves out every badge that has no label, renders nothing or is read by its host", async () => {
    const read = (node: ReactNode): Promise<AccessibleNode[]> => nodesInTheTree(<Theme tokens={tokens}>{node}</Theme>);
    const text = (node: ReactNode): Promise<TextRun[]> => textInTheTree(<Theme tokens={tokens}>{node}</Theme>);
    expect(await read(<Badge count={3} />)).toEqual([]);
    expect(await text(<Badge count={3} />)).toEqual([]);
    for (const blank of ["", "  ", "\t\n", "\u00a0", "\u3000", "\ufeff"]) {
      expect(await read(<Badge count={3} label={blank} />), JSON.stringify(blank)).toEqual([]);
      expect(await text(<Badge count={3} label={blank} />), JSON.stringify(blank)).toEqual([]);
    }
    expect(await read(<Badge variant="dot" />)).toEqual([]);
    for (const count of [0, -1, undefined]) {
      expect(await read(<Badge count={count} label="unread alerts" />), String(count)).toEqual([]);
    }
    const hosted = (
      <BadgeHostContext.Provider value={true}>
        <Badge count={3} label="unread alerts" />
      </BadgeHostContext.Provider>
    );
    expect(await read(hosted)).toEqual([]);
    expect(await text(hosted)).toEqual([]);
    // And the control: the same badge out of the host is the one image, holding its digits.
    expect(await read(<Badge count={3} label="unread alerts" />)).toEqual([{ role: "image", name: "3 unread alerts" }]);
    expect(await text(<Badge count={3} label="unread alerts" />)).toEqual([{ text: "3", in: { role: "image", name: "3 unread alerts" } }]);
  });
});

/**
 * IconButton.yaml `accessibility` and behaviors 4, 5 and 16 (ADR-0032): every example is exactly one button, and
 * its name is `label` byte for byte, never the glyph's id: the glyph is Icon with no `label`, so it adds no node,
 * and no example writes a hint of any kind (no title, no description). `with-badge` also carries the badge's
 * contribution, the `strings.Badge.count` sentence, after `", "`: a button has no accessibility value on the web,
 * so the value follows the label in the name. Apple reads the same example as the label `Open notifications` and
 * the value `3 unread`, and every name here is, byte for byte, the label
 * swift/Tests/DSSnapshotTests/DSIconButtonAccessibilityTreeTests.swift reads off the simulator for the same id,
 * plus that value where there is one. `label-ru` is Cyrillic and survives as written.
 */
describe("IconButton (IconButton.yaml accessibility)", () => {
  const expected: Readonly<Record<string, readonly AccessibleNode[]>> = {
    "secondary-md": [{ role: "button", name: "Open settings" }],
    "primary-md": [{ role: "button", name: "Add a site" }],
    "ghost-md": [{ role: "button", name: "Filter results" }],
    "plain-sm": [{ role: "button", name: "Open details" }],
    "danger-md": [{ role: "button", name: "Delete route" }],
    "selected-in-group": [{ role: "button", name: "Map view" }],
    "lg-touch": [{ role: "button", name: "Start the run" }],
    disabled: [{ role: "button", name: "Refresh readings" }],
    "on-vivid": [{ role: "button", name: "Open the yield card" }],
    "on-glass-over-map": [{ role: "button", name: "Center on the vehicle" }],
    // "Обновить показания линии", written as its code points so the bytes compared are unambiguous: 24 of them,
    // all in U+041E to U+044F but the spaces, 46 bytes of UTF-8.
    "label-ru": [{ role: "button", name: "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u0438\u044f \u043b\u0438\u043d\u0438\u0438" }],
    "with-badge": [{ role: "button", name: "Open notifications, 3 unread" }],
  };

  it("names each example by its label, and with-badge by its label and the badge's count, as the Apple suite does", async () => {
    expect(await examplesInTheTree(iconButtonStories)).toEqual(expected);
  });

  // The badge is hidden by the host flag, and its digits with it: no example leaves a text run in the tree, so the
  // count is heard once, in the button's name, and never again as text beside the button.
  it("leaves no text in the tree: the glyph and the badge's digits are hidden", async () => {
    const found = await examplesTextInTheTree(iconButtonStories);
    expect(Object.keys(found).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, runs] of Object.entries(found)) expect(runs, id).toEqual([]);
  });

  // The cases no example stages: a badge that says nothing adds nothing to the name, and one that renders nothing
  // is not in the tree at all.
  it("adds nothing to the name for a badge that says nothing or draws nothing", async () => {
    const read = (node: ReactNode): Promise<AccessibleNode[]> => nodesInTheTree(<Theme tokens={tokens}>{node}</Theme>);
    const named = (badge: Parameters<typeof IconButton>[0]["badge"]): ReactNode => <IconButton glyph="object.notification" label="Open notifications" badge={badge} onPress={() => undefined} />;
    expect(await read(named({ count: 3 }))).toEqual([{ role: "button", name: "Open notifications, 3" }]);
    expect(await read(named({ variant: "dot", label: "new" }))).toEqual([{ role: "button", name: "Open notifications, new" }]);
    expect(await read(named({ variant: "dot" }))).toEqual([{ role: "button", name: "Open notifications" }]);
    expect(await read(named({ count: 0, label: "unread" }))).toEqual([{ role: "button", name: "Open notifications" }]);
    expect(await read(named({ count: 128, max: 99, label: "unread" }))).toEqual([{ role: "button", name: "Open notifications, 128 unread" }]);
  });
});
