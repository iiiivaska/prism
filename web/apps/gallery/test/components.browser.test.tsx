/**
 * Browser behaviour of Button, Card and Divider, in Vitest browser mode (Chromium): what the Node suites
 * can only read from the stylesheets, computed on real elements.
 *
 * - Button.yaml behaviors 2, 3, 5 and 6: the hit region per modality with an unchanged visual box, the
 *   width kept while loading, labels on one line, hover only under pointer, the press scale.
 * - Card.yaml behaviors 2, 4, 7, 9, 11, 13, 14, 15, 16 and 17 and the action affordance: the glyph hidden
 *   until hover under pointer and always shown under touch on a pressable card, drawn at all on no other,
 *   the hover overlay on a pressable card and on no other, the pressed overlay and the 0.97 scale, the
 *   radius cell per density, the selected lift and outline, the custom action's disc, which looks the same
 *   whether it is a button or, with no handler, a labelled span, the header block each affordance leaves
 *   (and the one vivid leaves for none), the two-line title with its one-line caption, the separator that
 *   joins the vivid unit to the caption in the text and in the name, and the row gap of a content-sized
 *   card — the one layout a snapshot pair cannot see, because at the gallery's frame both stacks
 *   bottom-align.
 * - ADR-0023 rule 9 under a forced reduced context: no press scale on either component, Button's danger
 *   substitute fill, Card's selection crossfading over motion.duration.base.
 * - ADR-0021 rule 8: Button computes `font-synthesis: none`.
 * - Divider.yaml behaviors 1 to 5: one line of border.hairline that runs the length of its container,
 *   an `inset: content` that is card padding inside the root rather than a margin outside it, per
 *   density, and the colour of the material it sits on.
 *
 * Modality and motion are `<Theme>` props, so the root attributes switch the stylesheets exactly as an
 * app's choice would (ADR-0019 §4).
 */
import "@iiiivaska/prism-tokens/tokens.css";
import "@iiiivaska/prism-tokens/brands/prism/fonts.css";
import "@iiiivaska/prism-tokens/motion.css";
import "@iiiivaska/prism-react/styles.css";

import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Button, Card, Divider, Surface, Theme, cardUnitSeparator, type CardProps, type Density, type Modality, type Motion } from "@iiiivaska/prism-react";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

interface Axes {
  readonly modality?: Modality;
  readonly motion?: Motion;
  readonly density?: Density;
}

async function mount(node: ReactNode, axes: Axes = {}): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <Theme tokens={tokens} colorScheme="light" density={axes.density ?? "compact"} modality={axes.modality ?? "pointer"} motion={axes.motion ?? "standard"}>
        {node}
      </Theme>,
    );
    await Promise.resolve();
  });
  await document.fonts.ready;
  return host;
}

async function unmount(): Promise<void> {
  await act(async () => {
    root?.unmount();
    await Promise.resolve();
  });
  host?.remove();
  root = null;
  host = null;
}

afterEach(unmount);

const TRANSPARENT = /^(?:rgba\(0, 0, 0, 0\)|transparent|color\(srgb 0 0 0 \/ 0\)|oklab\(0 0 0 \/ 0\))$/;

/** Colors and scales transition; wait until the computed value reaches its end. */
async function settles(read: () => string, expected: RegExp | string): Promise<void> {
  await vi.waitFor(
    () => {
      if (typeof expected === "string") expect(read()).toBe(expected);
      else expect(read()).toMatch(expected);
    },
    { timeout: 2000, interval: 20 },
  );
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function find(element: HTMLElement, selector: string): HTMLElement {
  const found = element.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}

/** A custom property's value as a color, resolved on an element through a probe declaration. */
function tokenColor(element: HTMLElement, variable: string): string {
  const probe = document.createElement("div");
  probe.style.backgroundColor = `var(${variable})`;
  element.append(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return color;
}

/** A custom property's value in px, resolved on an element through a probe declaration. */
function tokenPx(element: HTMLElement, variable: string): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.inlineSize = `var(${variable})`;
  element.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

async function pressWithKeyboard(element: HTMLElement): Promise<() => Promise<void>> {
  await act(async () => {
    element.focus();
    element.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  return async () => {
    await act(async () => {
      element.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };
}

describe("Button", () => {
  const noop = (): void => undefined;

  it("keeps its visual box and extends the hit region to size.hit per modality (behavior 2)", async () => {
    const measure = async (modality: Modality): Promise<{ height: number; hitTop: number; hit: number }> => {
      const element = await mount(<Button size="sm" label="Filter" onPress={noop} />, { modality });
      const button = find(element, ".ds-button");
      const before = getComputedStyle(button, "::before");
      const result = { height: button.getBoundingClientRect().height, hitTop: Number.parseFloat(before.top), hit: tokenPx(button, "--ds-size-hit") };
      await unmount();
      return result;
    };
    const pointer = await measure("pointer");
    const touch = await measure("touch");
    expect(touch.height).toBe(pointer.height);
    expect(touch.hit).toBeGreaterThan(pointer.hit);
    expect(pointer.hitTop).toBeCloseTo(Math.min(0, (pointer.height - pointer.hit) / 2), 3);
    expect(touch.hitTop).toBeCloseTo(Math.min(0, (touch.height - touch.hit) / 2), 3);
    expect(touch.hitTop).toBeLessThan(0);
  });

  it("keeps its width while loading (behavior 3)", async () => {
    const element = await mount(
      <div>
        <Button label="Save changes" onPress={noop} data-probe="rest" />
        <Button label="Save changes" isLoading onPress={noop} data-probe="loading" />
      </div>,
    );
    const rest = find(element, "[data-probe='rest']").getBoundingClientRect().width;
    const loading = find(element, "[data-probe='loading']");
    expect(loading.getBoundingClientRect().width).toBeCloseTo(rest, 3);
    expect(getComputedStyle(find(loading, "[data-ds-slot='button-label-text']")).visibility).toBe("hidden");
    expect(getComputedStyle(find(loading, "[data-ds-slot='button-spinner']")).visibility).toBe("visible");
    expect(loading.getAttribute("aria-label")).toBe("Save changes, loading");
  });

  it("never wraps its label; a long label truncates with an ellipsis (behavior 5)", async () => {
    const element = await mount(
      <div style={{ inlineSize: "var(--ds-size-card-min)" }}>
        <Button label="Send the weekly report to every team lead in the region" onPress={noop} />
      </div>,
    );
    const button = find(element, ".ds-button");
    const text = find(button, "[data-ds-slot='button-label-text']");
    expect(button.getBoundingClientRect().height).toBeCloseTo(tokenPx(button, "--ds-button-height-md"), 3);
    expect(button.getBoundingClientRect().width).toBeLessThanOrEqual(tokenPx(button, "--ds-size-card-min") + 0.5);
    expect(getComputedStyle(text).textOverflow).toBe("ellipsis");
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  });

  it("adds the hover overlay under pointer only (behavior 6)", async () => {
    for (const modality of ["pointer", "touch"] as const) {
      const element = await mount(<Button variant="secondary" label="Details" onPress={noop} />, { modality });
      const button = find(element, ".ds-button");
      await act(async () => {
        await userEvent.hover(button);
      });
      await vi.waitFor(() => {
        expect(button.hasAttribute("data-hovered")).toBe(true);
      });
      const overlay = (): string => getComputedStyle(button).getPropertyValue("--ds--button-hover").trim();
      if (modality === "pointer") {
        await settles(overlay, /^(?!rgba\(0, 0, 0, 0\)$)/);
      } else {
        await sleep(400);
        expect(overlay(), modality).toMatch(TRANSPARENT);
      }
      await act(async () => {
        await userEvent.unhover(button);
      });
      await unmount();
    }
  });

  it("scales to 0.97 while pressed, and not under Reduce Motion, where danger takes the neutral fill (ADR-0023 §8.4)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const onPress = vi.fn();
      const element = await mount(<Button variant="danger" label="Delete route" onPress={onPress} />, { motion });
      const button = find(element, ".ds-button");
      const release = await pressWithKeyboard(button);
      expect(button.hasAttribute("data-pressed"), motion).toBe(true);
      const style = getComputedStyle(button);
      const substitute = (): string => style.getPropertyValue("--ds--button-press").trim();
      if (motion === "standard") {
        await settles(() => style.scale, "0.97");
        await sleep(300);
        expect(substitute()).toMatch(TRANSPARENT);
      } else {
        await settles(substitute, /^(?!rgba\(0, 0, 0, 0\)$|transparent$)/);
        expect(style.scale).toBe("1");
      }
      await release();
      expect(onPress, motion).toHaveBeenCalledTimes(1);
      await unmount();
    }
  });

  it("computes font-synthesis: none (ADR-0021 rule 8)", async () => {
    const element = await mount(<Button label="Continue" onPress={noop} />);
    expect(getComputedStyle(find(element, ".ds-button")).fontSynthesis).toBe("none");
  });
});

describe("Card", () => {
  // The handler is part of the fixture: `action: open` makes the card pressable only with one
  // (Card.yaml accessibility.role, `DSCardAppearance.isPressable(_:hasAction:)`), and hover, press and
  // the open affordance all belong to the pressable card.
  const metric = { title: "Line output", caption: "Last 24 hours", hero: { value: "86", trailing: ".4", unit: "%" }, onAction: (): void => undefined } as const;
  const opacity = (element: HTMLElement): string => getComputedStyle(find(element, "[data-ds-slot='card-action']")).opacity;

  it("shows the open glyph on hover under pointer, and always under touch", async () => {
    const pointer = await mount(
      <div style={{ inlineSize: "var(--ds-size-card-min)", blockSize: "var(--ds-size-card-min)", display: "grid" }}>
        <Card {...metric} />
      </div>,
      { modality: "pointer" },
    );
    expect(opacity(pointer)).toBe("0");
    const card = find(pointer, ".ds-card");
    await act(async () => {
        await userEvent.hover(card);
      });
    await vi.waitFor(() => {
      expect(card.hasAttribute("data-hovered")).toBe(true);
    });
    expect(opacity(pointer)).toBe("1");
    await settles(() => getComputedStyle(find(pointer, "[data-ds-slot='card-overlay']")).backgroundColor, /^(?!rgba\(0, 0, 0, 0\)$)/);
    await act(async () => {
        await userEvent.unhover(card);
      });
    await unmount();

    const touch = await mount(<Card {...metric} />, { modality: "touch" });
    expect(opacity(touch)).toBe("1");
  });

  it("draws no open glyph at all on a card with no handler, under pointer and under touch (behavior 4)", async () => {
    // The glyph is the cue that the card opens, so a card with nothing to open draws no glyph and no
    // control. A zero-opacity slot would not do: under touch the same slot is fully opaque, which is
    // how this used to promise an open the card could not perform. `DSCardAppearance.showsOpenGlyph`
    // takes pressability the same way on Apple.
    for (const modality of ["pointer", "touch"] as const) {
      const element = await mount(<Card {...metric} onAction={undefined} />, { modality });
      const card = find(element, ".ds-card");
      expect(card.querySelector("[data-ds-slot='card-action']"), modality).toBeNull();
      // The header is then laid out as `action: none` lays it out: one heading, nothing beside it.
      const header = find(card, "[data-ds-slot='card-header']");
      expect(header.children, modality).toHaveLength(1);
      expect(header.children[0]?.getAttribute("data-ds-slot"), modality).toBe("card-heading");
      await unmount();
    }
    // With a handler the slot is there again, and under touch it is visible.
    const touch = await mount(<Card {...metric} />, { modality: "touch" });
    expect(opacity(touch)).toBe("1");
  });

  it("is one button: pressing fires onAction, with the overlay and the 0.97 scale outside Reduce Motion", async () => {
    // Behavior 16: the press magnitude is the one every Prism control shares, so this is the 0.97 the
    // Button case above measures and the 0.97 `DSControlAppearance.pressedScale` gives the Apple card.
    // Before specVersion 5 the web shrank a card to 0.98 and Apple to 0.97.
    for (const motion of ["standard", "reduce"] as const) {
      const onAction = vi.fn();
      const element = await mount(<Card {...metric} onAction={onAction} />, { motion });
      const card = find(element, ".ds-card");
      expect(card.getAttribute("role")).toBe("button");
      const release = await pressWithKeyboard(card);
      expect(card.hasAttribute("data-pressed"), motion).toBe(true);
      await settles(() => getComputedStyle(find(card, "[data-ds-slot='card-overlay']")).backgroundColor, /^(?!rgba\(0, 0, 0, 0\)$)/);
      if (motion === "standard") await settles(() => getComputedStyle(card).scale, "0.97");
      else expect(getComputedStyle(card).scale).toBe("1");
      await release();
      expect(onAction, motion).toHaveBeenCalledTimes(1);
      await unmount();
    }
  });

  it("gives a card with nothing to press no hover overlay (behavior 11)", async () => {
    // Card.yaml behavior 11: "a card with nothing to press takes no hover cue". A card whose `action`
    // is `custom` (only its disc is pressable) or `none` (a group) would otherwise light up whole for a
    // press it does not have; the Apple side reaches the same rule through
    // `DSControlAppearance.showsHover` ("hover exists only under pointer modality, and only on a
    // control that takes input").
    //
    // An `open` card with no `onAction` is the same case: nothing to press, so it is a group too
    // (Card.yaml accessibility.role; `DSCardAppearance.isPressable(_:hasAction:)`).
    const cases = [
      ["custom", { ...metric, action: { kind: "custom", icon: "action.pause", label: "Pause line 4" } }],
      ["none", { ...metric, action: "none" }],
      ["open without a handler", { ...metric, onAction: undefined }],
    ] as const satisfies readonly (readonly [string, CardProps])[];
    for (const [name, props] of cases) {
      const element = await mount(<Card {...props} />, { modality: "pointer" });
      const card = find(element, ".ds-card");
      expect(card.getAttribute("role"), name).toBe("group");
      const overlay = (): string => getComputedStyle(find(card, "[data-ds-slot='card-overlay']")).backgroundColor;
      await act(async () => {
        await userEvent.hover(card);
      });
      await sleep(400);
      expect(card.hasAttribute("data-hovered"), name).toBe(false);
      expect(card.hasAttribute("data-pressed"), name).toBe(false);
      expect(overlay(), name).toMatch(TRANSPARENT);
      await act(async () => {
        await userEvent.unhover(card);
      });
      await unmount();
    }

    // The pressable card is the one that lights, and only under pointer: the test above covers the rest.
    const pressable = await mount(<Card {...metric} />, { modality: "pointer" });
    const card = find(pressable, ".ds-card");
    await act(async () => {
      await userEvent.hover(card);
    });
    await vi.waitFor(() => {
      expect(card.hasAttribute("data-hovered")).toBe(true);
    });
    await settles(() => getComputedStyle(find(card, "[data-ds-slot='card-overlay']")).backgroundColor, /^(?!rgba\(0, 0, 0, 0\)$)/);
  });

  it("keys the custom disc to the published material: the media pair on vivid, the scheme's inverse everywhere else (behavior 6)", async () => {
    // Only a browser resolves these: `color.bg.fill.inverse` is ink in light and white in dark, and the
    // white media pair is white in both. The scheme's glass is light glass in light (ADR-0029 §1), so a
    // white disc would disappear on it over the bright imagery §1.6 allows — glass takes the scheme's
    // own inverse, exactly as solid does, and only vivid takes the media pair (ADR-0030 §3.1).
    const pause = { kind: "custom", icon: "action.pause", label: "Pause line 4" } as const;
    const read = async (props: CardProps): Promise<{ material: string; fill: string; glyph: string; inverse: string; media: string }> => {
      const element = await mount(<Card {...props} action={pause} onAction={(): void => undefined} />);
      const card = find(element, ".ds-card");
      const disc = find(card, ".ds-card-action-button");
      const style = getComputedStyle(disc);
      return {
        material: card.getAttribute("data-ds-material") ?? "",
        fill: style.backgroundColor,
        glyph: style.color,
        inverse: tokenColor(card, "--ds-color-bg-fill-inverse"),
        media: tokenColor(card, "--ds-color-bg-fill-inverse-media"),
      };
    };
    const solid = await read({ title: "Line 4" });
    await unmount();
    const vivid = await read({ title: "Line 4", variant: "vivid" });
    await unmount();
    const glass = await read({ title: "Line 4", variant: "glass", backdrop: "image" });
    expect(glass.material).toBe("glass");
    expect(solid.inverse).not.toBe(solid.media);
    expect(solid.fill).toBe(solid.inverse);
    expect(glass.fill).toBe(glass.inverse);
    expect(glass.fill).toBe(solid.fill);
    expect(vivid.fill).toBe(vivid.media);
    expect(vivid.fill).not.toBe(vivid.inverse);
    expect(glass.glyph).toBe(solid.glyph);
    expect(vivid.glyph).not.toBe(solid.glyph);
  });

  it("draws the custom action's disc whether or not it is a button, and names it by the operation", async () => {
    // The disc's chrome is `.ds-card-action-button` and nothing else, so the element may be a button or,
    // with no handler, a labelled span, and it looks the same either way — the one thing only a browser
    // can say. `DSCardActionCircle` makes the same swap around one `DSCardActionDisc`.
    const pause = { kind: "custom", icon: "action.pause", label: "Pause line 4" } as const;
    interface Disc {
      readonly tag: string;
      readonly name: string;
      readonly look: { readonly icon: string; readonly background: string; readonly radius: string; readonly width: number };
    }
    const read = (element: HTMLElement): Disc => {
      const disc = find(element, ".ds-card-action-button");
      const style = getComputedStyle(disc);
      return {
        tag: disc.tagName,
        name: disc.getAttribute("aria-label") ?? "",
        look: {
          icon: find(disc, "[data-ds-slot='card-action-glyph']").getAttribute("data-ds-icon") ?? "",
          background: style.backgroundColor,
          radius: style.borderTopLeftRadius,
          width: Math.round(disc.getBoundingClientRect().width),
        },
      };
    };
    const withHandler = read(await mount(<Card {...metric} action={pause} />));
    await unmount();
    const withoutHandler = read(await mount(<Card {...metric} action={pause} onAction={undefined} />));
    expect(withHandler.tag).toBe("BUTTON");
    expect(withoutHandler.tag).toBe("SPAN");
    expect(withHandler.name).toBe("Pause line 4");
    expect(withoutHandler.name).toBe("Pause line 4");
    expect(withHandler.look.icon).toBe("action.pause");
    expect(withHandler.look.width).toBeGreaterThan(0);
    expect(withoutHandler.look).toEqual(withHandler.look);
  });

  it("leaves one header block for either affordance, and on vivid for none as well (behavior 14)", async () => {
    // Measured on the elements, because this is where the two stacks had drifted: the web gave the open
    // glyph a `size.control.md` slot with a `space.5` gap and the Apple side a bare `size.icon.sm` box
    // with `space.3`, and each suite asserted its own number. Behavior 14 settles one geometry, and
    // `DSCardAppearance.headerTrailingSpace(on:actionWidth:_:)` returns exactly this on Apple.
    //
    // On vivid the block is reserved whatever the action, because it is the rectangle Surface cuts the
    // grain and the bloom out of (ADR-0022 §4.1, ADR-0030 §4.4): a caption running past it would sit on
    // grain, which is never drawn under text below 13 px.
    const measure = async (props: CardProps): Promise<{ reserve: number; block: number }> => {
      const element = await mount(
        <div style={{ inlineSize: "var(--ds-size-card-min)", display: "grid" }}>
          <Card {...props} />
        </div>,
      );
      const card = find(element, ".ds-card");
      const heading = find(card, "[data-ds-slot='card-heading']");
      const padding = tokenPx(card, "--ds-card-padding");
      const block = tokenPx(card, "--ds-size-control-md") + tokenPx(card, "--ds-space-5");
      const contentEnd = heading.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(heading).paddingInlineEnd);
      return { reserve: card.getBoundingClientRect().right - padding - contentEnd, block };
    };

    const cases = [
      ["solid, pressable", { ...metric }, true],
      ["solid, custom disc", { ...metric, action: { kind: "custom", icon: "action.pause", label: "Pause line 4" } }, true],
      ["solid, none", { ...metric, action: "none" }, false],
      ["solid, open without a handler", { ...metric, onAction: undefined }, false],
      ["vivid, pressable", { ...metric, variant: "vivid" }, true],
      ["vivid, none", { ...metric, variant: "vivid", action: "none" }, true],
      ["vivid, open without a handler", { ...metric, variant: "vivid", onAction: undefined }, true],
    ] as const satisfies readonly (readonly [string, CardProps, boolean])[];
    for (const [name, props, reserved] of cases) {
      const { reserve, block } = await measure(props);
      expect(block, name).toBeGreaterThan(0);
      expect(reserve, name).toBeCloseTo(reserved ? block : 0, 1);
      await unmount();
    }
  });

  it("clamps the title to two lines and the caption to one, with an ellipsis (behavior 15)", async () => {
    // The header block's budget, the same two numbers the Apple side clamps to
    // (`DSCardAppearance.titleLines`, `.captionLines`). Without it a long title grew the header and
    // pushed the hero out of a card whose size the grid sets.
    const element = await mount(
      <div style={{ inlineSize: "var(--ds-size-card-min)", display: "grid" }}>
        <Card
          {...metric}
          title="Line output across the northern assembly hall and the yard beyond it"
          caption="Last 24 hours of the northern assembly hall and the yard beyond it"
        />
      </div>,
    );
    const card = find(element, ".ds-card");
    for (const [part, lines] of [
      [".ds-card-title", 2],
      [".ds-card-caption", 1],
    ] as const) {
      const text = find(card, part);
      const style = getComputedStyle(text);
      expect(style.webkitLineClamp, part).toBe(String(lines));
      expect(style.overflow, part).toBe("hidden");
      const lineHeight = Number.parseFloat(style.lineHeight);
      expect(lineHeight, part).toBeGreaterThan(0);
      expect(text.getBoundingClientRect().height, part).toBeLessThanOrEqual(lines * lineHeight + 1);
      expect(text.scrollWidth, part).toBeGreaterThan(0);
    }
  });

  it("keeps root.gap between the rows of a card that shrinks to its content (behavior 17)", async () => {
    // Only a real layout shows this one: at the gallery's `size.card.min` frame the body absorbs the
    // slack and both stacks bottom-align, so a snapshot pair cannot see it. A content-sized card is
    // where the gap has to be there — Apple pads the body and the footer by `space.4` each, and before
    // specVersion 5 `.ds-card` was a plain column with no gap, so the hero touched the header.
    const gapOf = async (props: CardProps, children?: ReactNode): Promise<{ gap: number; expected: number }> => {
      const element = await mount(
        <div style={{ inlineSize: "var(--ds-size-card-min)", display: "grid", justifyItems: "start", alignItems: "start" }}>
          <Card {...props}>{children}</Card>
        </div>,
      );
      const card = find(element, ".ds-card");
      const header = find(card, "[data-ds-slot='card-header']").getBoundingClientRect();
      const next = find(card, children === undefined ? "[data-ds-slot='card-footer']" : "[data-ds-slot='card-body']").getBoundingClientRect();
      return { gap: next.top - header.bottom, expected: tokenPx(card, "--ds-space-4") };
    };

    // No body: one gap between the header and the footer, the way `Spacer(minLength: 0)` leaves one
    // above `DSCardAnatomy`'s footer — not two around a box of nothing, which is why Card renders no
    // body slot at all when it was given no children.
    const bare = await gapOf(metric);
    expect(bare.expected).toBeGreaterThan(0);
    expect(bare.gap).toBeCloseTo(bare.expected, 1);
    expect(find(host as HTMLElement, ".ds-card").querySelector("[data-ds-slot='card-body']")).toBeNull();
    await unmount();

    // With a body: the same gap above it, and the footer keeps its own below.
    const withBody = await gapOf(metric, <span>Updated two minutes ago</span>);
    expect(withBody.gap).toBeCloseTo(withBody.expected, 1);
    const card = find(host as HTMLElement, ".ds-card");
    const body = find(card, "[data-ds-slot='card-body']").getBoundingClientRect();
    const footer = find(card, "[data-ds-slot='card-footer']").getBoundingClientRect();
    expect(footer.top - body.bottom).toBeCloseTo(withBody.expected, 1);
  });

  it("joins the vivid unit to the caption with one separator, in the text and in the name (behavior 9)", async () => {
    // The separator is text inside the caption, not a margin, so the caption's own `textContent` carries
    // the break — and so does the single name a pressable card is announced by.
    // With the margin it announced "Per batchkg"; `DSCardAppearance.unitSeparator` is the same string.
    const element = await mount(
      <Card variant="vivid" title="Average yield" caption="Per batch" hero={{ value: "2,450", unit: "kg" }} onAction={(): void => undefined} />,
    );
    const card = find(element, ".ds-card");
    const caption = find(card, ".ds-card-caption");
    expect(caption.textContent).toBe(`Per batch${cardUnitSeparator}kg`);
    const named = card.getAttribute("aria-label") ?? "";
    expect(named).toContain(`Per batch${cardUnitSeparator}kg`);
    expect(named).not.toContain("Per batchkg");
  });

  it("names a pressable card by what it draws, in reading order (Card.yaml accessibility.label)", async () => {
    // The composition itself is `cardAccessibleName`, pinned over every spec example by the React suite
    // and by `accessibleName` in swift/Tests/DSComponentsTests/DSCardBindingTests.swift. What only a
    // browser can say is that the string is the name the platform computes — `aria-label` wins over the
    // element's contents — and that each part of it is the text of the element the card draws, so the
    // name cannot drift from the screen.
    const spoken = (element: Element): string => element.querySelector("[data-ds-slot='text-label']")?.textContent ?? element.textContent ?? "";
    const named = async (props: CardProps, parts: readonly string[]): Promise<void> => {
      const card = find(await mount(<Card {...props} onAction={(): void => undefined} />), ".ds-card");
      const drawn = parts.map((part) => spoken(find(card, part)));
      expect(card.getAttribute("aria-label"), String(props.title)).toBe(drawn.join(", "));
      expect(card.getAttribute("aria-labelledby")).toBeNull();
      await unmount();
    };
    // Off vivid the hero hangs its own unit and speaks it as one element ("86.4 %").
    await named(metric, [".ds-card-title", ".ds-card-caption", ".ds-card-hero"]);
    // On vivid the unit is drawn on the caption line, so that is where the name says it, once.
    await named({ variant: "vivid", title: "Average yield", caption: "Per batch", hero: { value: "2,450", unit: "kg" } }, [
      ".ds-card-title",
      ".ds-card-caption",
      ".ds-card-hero",
    ]);
    // A part the card does not draw is left out with its separator.
    await named({ title: "Queued", hero: { value: "37" } }, [".ds-card-title", ".ds-card-hero"]);
    await named({ title: "Unit 4417", caption: "21.11.2026, 14:05:22" }, [".ds-card-title", ".ds-card-caption"]);
  });

  it("takes comp.card.radius.compact at compact density and comp.card.radius.regular at regular (behavior 13)", async () => {
    for (const density of ["compact", "regular"] as const) {
      const element = await mount(<Card title="Queued" />, { density });
      const card = find(element, ".ds-card");
      const expected = tokenPx(card, density === "compact" ? "--ds-card-radius-compact" : "--ds-card-radius-regular");
      expect(Number.parseFloat(getComputedStyle(card).borderTopLeftRadius), density).toBeCloseTo(expected, 3);
      expect(Number.parseFloat(getComputedStyle(card).paddingTop), density).toBeCloseTo(tokenPx(card, "--ds-card-padding"), 3);
      await unmount();
    }
  });

  it("lifts and outlines a selected card, crossfading both under Reduce Motion (behavior 7)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const element = await mount(<Card title="Unit 4417" isSelected />, { motion });
      const card = find(element, ".ds-card");
      const style = getComputedStyle(card);
      expect(style.boxShadow, motion).not.toBe("none");
      const outline = getComputedStyle(card, "::after").boxShadow;
      expect(outline, motion).toMatch(/inset/);
      const properties = style.transitionProperty.split(",").map((value) => value.trim());
      const durations = style.transitionDuration.split(",").map((value) => value.trim());
      const shadow = durations[properties.indexOf("box-shadow")];
      expect(shadow, motion).not.toBe("0s");
      if (motion === "reduce") expect(shadow).toBe(getComputedStyle(document.documentElement).getPropertyValue("--ds-motion-duration-base").trim().replace(/^(\d+)ms$/, (_all, ms: string) => `${Number(ms) / 1000}s`));
      await unmount();
    }
  });
});

describe("Divider", () => {
  const column = { display: "flex", flexDirection: "column", inlineSize: "200px" } as const;
  const row = { display: "flex", blockSize: "200px" } as const;

  it.each(["compact", "regular"] as const)("trims a content inset inside a root that spans its container, at card padding (%s, behaviors 3 and 4)", async (density) => {
    const element = await mount(
      <>
        <div style={column}>
          <Divider inset="content" />
        </div>
        <div style={{ inlineSize: "200px" }}>
          <Divider inset="content" />
        </div>
      </>,
      { density },
    );
    const padding = tokenPx(element, "--ds-space-card-padding");
    expect(padding).toBe(density === "compact" ? 16 : 24);
    for (const divider of element.querySelectorAll<HTMLElement>(".ds-divider")) {
      const style = getComputedStyle(divider);
      expect(divider.getBoundingClientRect().width).toBe(200);
      expect(divider.getBoundingClientRect().height).toBe(tokenPx(divider, "--ds-border-hairline"));
      expect(Number.parseFloat(style.paddingInlineStart)).toBe(padding);
      expect(Number.parseFloat(style.paddingInlineEnd)).toBe(padding);
      expect(style.marginInlineStart).toBe("0px");
      expect(style.marginInlineEnd).toBe("0px");
      expect(style.backgroundClip).toBe("content-box");
    }
  });

  it.each(["compact", "regular"] as const)("runs a vertical rule the height of a row with a definite height (%s, behavior 2)", async (density) => {
    const element = await mount(
      <div style={row}>
        <Divider orientation="vertical" />
        <Divider orientation="vertical" inset="content" />
      </div>,
      { density },
    );
    const [plain, inset] = [...element.querySelectorAll<HTMLElement>(".ds-divider")];
    for (const divider of [plain, inset]) {
      expect(divider?.getBoundingClientRect().height).toBe(200);
      expect(divider?.getBoundingClientRect().width).toBe(1);
    }
    expect(Number.parseFloat(getComputedStyle(plain as HTMLElement).paddingBlockStart)).toBe(0);
    expect(Number.parseFloat(getComputedStyle(inset as HTMLElement).paddingBlockStart)).toBe(tokenPx(element, "--ds-space-card-padding"));
  });

  it("takes the colour of the material it sits on (behavior 5)", async () => {
    const element = await mount(
      <>
        <div style={column} data-probe="page">
          <Divider />
        </div>
        <Surface material="solid" padding="none" data-probe="solid">
          <div style={column}>
            <Divider />
          </div>
        </Surface>
        <Surface material="vivid" padding="none" data-probe="vivid">
          <div style={column}>
            <Divider />
          </div>
        </Surface>
        <Surface material="glass" backdrop="map" padding="none" data-probe="glass">
          <div style={column}>
            <Divider />
          </div>
        </Surface>
      </>,
    );
    const expected = { page: "--ds-color-border-hairline", solid: "--ds-color-border-hairline", vivid: "--ds-color-border-on-media", glass: "--ds-color-border-on-glass-fill" } as const;
    for (const [probe, variable] of Object.entries(expected)) {
      const divider = find(find(element, `[data-probe="${probe}"]`), ".ds-divider");
      expect(divider.getAttribute("data-ds-surface"), probe).toBe(probe);
      expect(getComputedStyle(divider).backgroundColor, probe).toBe(tokenColor(divider, variable));
    }
    expect(tokenColor(element, "--ds-color-border-on-media")).not.toBe(tokenColor(element, "--ds-color-border-hairline"));
  });
});
