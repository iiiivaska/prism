/**
 * Card's action affordances, staged by hand because no spec example can stage them (roadmap P3-4):
 *
 * - Card.yaml has no `custom` example, so the solid circular disc of behavior 5 — with the registry
 *   glyph `actionIcon` and the explicit name `actionLabel` the spec requires of one — renders in no
 *   generated story, and neither do the disc's own cells of behavior 6. Here it does, with a glyph that
 *   is not `nav.open` and a name that is not the card's title: a pause is not an open, and the title
 *   names the content, not the operation.
 * - Every generated story passes a no-op handler for each `action` prop the spec declares
 *   (spec/SCHEMA.md "Every example gets its handlers"), so the handler-less form belongs here instead:
 *   a card with nothing to press is a group with no open glyph at all (behavior 4), and a custom disc
 *   with nothing to press is a labelled disc, not a button. The Apple gallery mirrors this probe rather
 *   than adding an example, so the two stacks never disagree about an example by accident.
 *
 * Each story is also one axe run with `a11y.test = "error"` (.storybook/preview.tsx), so a circle that
 * loses its name fails here. Whether the name is the right one — the operation, not the card's title —
 * no machine can say; that part is a picture for a human, and `web/packages/react/test/card.test.tsx`
 * pins the markup. Like `RuntimeContract.stories.tsx`, this file lives outside `src/stories`, which the
 * generator owns, and carries no `vrt` tag, so it is never screenshotted.
 */
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Card, type CardProps } from "@iiiivaska/prism-react";

const hero = { value: "86", trailing: ".4", unit: "%" } as const;

function Frame(props: { readonly children: ReactNode }): ReactNode {
  return (
    <div className="ds-gallery-frame" data-ds-gallery-shape="card">
      {props.children}
    </div>
  );
}

function Pair(props: { readonly left: CardProps; readonly right: CardProps }): ReactNode {
  return (
    <div className="ds-gallery-stage">
      <Frame>
        <Card {...props.left} />
      </Frame>
      <Frame>
        <Card {...props.right} />
      </Frame>
    </div>
  );
}

const meta = {
  title: "Card/Action",
  component: Pair,
  parameters: { prism: { probe: "Card.yaml behaviors 4, 5 and 6, accessibility.role and accessibility.keyboard" } },
} satisfies Meta<typeof Pair>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The `custom` action: its own glyph, its own name, and only that circle is pressable. */
export const CustomAction: Story = {
  name: "custom-action",
  args: {
    left: {
      title: "Line 4",
      caption: "Running",
      hero,
      action: { kind: "custom", icon: "action.pause", label: "Pause line 4" },
      onAction: fn(),
    },
    right: {
      title: "Batch 91",
      caption: "Queued",
      hero,
      action: { kind: "custom", icon: "action.delete", label: "Discard batch 91" },
      onAction: fn(),
    },
  },
};

/** The same two cards with no handler: a labelled disc, and a group with no open glyph at all. */
export const WithoutHandler: Story = {
  name: "without-handler",
  args: {
    left: { title: "Line 4", caption: "Running", hero, action: { kind: "custom", icon: "action.pause", label: "Pause line 4" } },
    right: { title: "Batch 91", caption: "Queued", hero },
  },
};

/** `action: open` with a handler: the whole card is the button, named by title, caption and hero. */
export const OpenCard: Story = {
  name: "open-card",
  args: {
    left: { title: "Line output", caption: "Last 24 hours", hero, onAction: fn() },
    right: { title: "Unit 4417", caption: "21.11.2026, 14:05:22", action: "none" },
  },
};
