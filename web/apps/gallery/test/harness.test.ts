/// <reference types="node" />
/**
 * The harness hands each component the props its own API takes (roadmap P3-4).
 *
 * Card is the one component whose API is not the spec's props: Card.yaml writes `action`, `actionIcon`
 * and `actionLabel` as three, and React carries them as the one `CardAction` the spec licenses a stack
 * to bundle them into, so `renderCardExample` assembles that value rather than spreading the three
 * (`cardArgs`). Spread untouched they reach `Card` as the bare string `"custom"`, which is not a value
 * of the prop: the card draws no disc at all while its root still says `data-ds-action="custom"`, and
 * the two leftover props land on the DOM node. No Card example sets `action` today, so no story and no
 * baseline would show it; this suite is what notices, and it pins the same reading the showcase makes of
 * the same props (`cardArgs`, web/apps/showcase/src/harness/renderers.tsx).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme } from "@iiiivaska/prism-tokens/react";
import { renderCardExample } from "../src/harness/examples.tsx";

/** An example's props as a story hands them over: the spec's own props, plus the handler every story adds. */
function stage(props: Readonly<Record<string, unknown>>): string {
  return renderToStaticMarkup(createElement(Theme, { tokens }, renderCardExample({ onAction: () => {}, ...props }, { id: "probe" })));
}

const custom = { variant: "solid", title: "Line 4", caption: "Running", action: "custom", actionIcon: "action.pause", actionLabel: "Pause line 4" };

describe("the Card harness", () => {
  it("assembles `action`, `actionIcon` and `actionLabel` into the disc the spec describes", () => {
    const markup = stage(custom);
    expect(markup).toContain('data-ds-action="custom"');
    expect(markup).toContain('data-ds-slot="card-action-button"');
    expect(markup).toContain('aria-label="Pause line 4"');
  });

  it("leaves `actionIcon` and `actionLabel` off the DOM node", () => {
    const markup = stage(custom);
    expect(markup).not.toContain("actionIcon");
    expect(markup).not.toContain("actionLabel");
  });

  it("passes `none` and the default `open` through as they are", () => {
    expect(stage({ variant: "solid", title: "Queued", action: "none" })).toContain('data-ds-action="none"');
    expect(stage({ variant: "solid", title: "Queued" })).toContain('data-ds-action="open"');
  });

  it.each([
    ["no glyph", { ...custom, actionIcon: undefined }],
    ["a glyph that is not in the registry", { ...custom, actionIcon: "action.brew" }],
    ["no label", { ...custom, actionLabel: undefined }],
    ["a blank label", { ...custom, actionLabel: "  " }],
    ["an action this build does not know", { ...custom, action: "expand" }],
  ])("refuses to stage a custom action with %s", (_case, props) => {
    expect(() => stage(props)).toThrow(/cannot be staged/u);
  });
});
