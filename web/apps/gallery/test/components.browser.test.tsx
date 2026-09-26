/**
 * Browser behaviour of Button, Card, Divider, Icon, Badge and IconButton, in Vitest browser mode (Chromium): what
 * the Node suites can only read from the stylesheets, computed on real elements.
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
 *   and in a container that sizes to its content the length of the longest other child and nothing more,
 *   an `inset: content` that is card padding inside the root rather than a margin outside it, per
 *   density, and the colour of the material it sits on.
 * - Icon.yaml behaviors 3, 7 to 12, the anatomy and `motion`: the square box of `size.icon.*`, the same in
 *   every density, with the glyph filling it and never drawn outside it; the tone on the material it sits
 *   on and `inherit` taking the color around it; the mirror under `dir="rtl"`; no event handler run and no
 *   focus taken, even past the type; a changed `name` fading its new glyph in over motion.duration.quick,
 *   and at once under Reduce Motion; Button's and Card's glyphs are the same box.
 * - Badge.yaml behaviors 1, 2, 8, 11 and 15 and `motion`: the count pill at least `size.icon.md` on both axes,
 *   growing past it only in width, the dot a `space.3` square, the same in every density; the fills, the
 *   stroke inside the outline pill and none on a filled one; tabular digits; never a tap target; a changed
 *   count fading its new digits in over motion.duration.quick, at once under Reduce Motion, and not at all on
 *   the first drawing or on a badge that reappears.
 * - IconButton.yaml behaviors 2, 3, 5 to 7, 12, 13, 15 and 16: a circle of `root.size` that is the same under
 *   either modality and a hit region of at least `size.hit` around it; `plain` draws nothing but the glyph; the
 *   selected circle is primary's; hover under pointer only; the 0.97 press with its pressed overlay on every
 *   press, Reduce Motion included; the focus ring outside the circle; disabled; the badge `badge.offset` outside
 *   the top-trailing corner, in either writing direction, moving neither the circle nor the glyph; and no hint
 *   attribute on any root.
 * - Avatar.yaml behaviors 1, 4 to 6, 8 and 13 and `accessibility.reduceTransparency`: a circle of
 *   `size.control.*` per size and density that clips what it holds, and that neither the ring nor the image moves;
 *   the image fading in over the initials once it has decoded, and a source that fails to load leaving the
 *   initials; the glass chip over the map computing its blur, flat on the scheme's glass, and falling back to
 *   `color.bg.surface.raised` over `color.bg.page` under Reduce Transparency, with the initials back in
 *   `color.text.secondary`.
 * - Chip.yaml behaviors 1 to 3, the remove control, `motion.press` and `accessibility.keyboard`: one row of the
 *   control height per size and density, with a hit region of at least `size.hit` for a control and none for a
 *   label; the role from the props alone, a filter's press asking through `onPress` while `aria-pressed` follows
 *   `isSelected`; the remove control firing `onRemove` and never `onPress`, and Delete and Backspace doing the same;
 *   the 0.97 press and the pressed fill on the pill over the map, which keeps its glass and its blur (ADR-0037 §5),
 *   and no scale under Reduce Motion; the glass chip over the map, flat on the scheme's glass, its own fill on the
 *   page, and the fallback under Reduce Transparency and Increase Contrast with every part its default cell and no
 *   check; the focus rings; and disabled.
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
import {
  Avatar,
  Backdrop,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  IconButton,
  Surface,
  Theme,
  cardUnitSeparator,
  chipSizes,
  glyphSizes,
  iconButtonSizes,
  iconButtonVariants,
  avatarSizes,
  type CardProps,
  type Contrast,
  type Density,
  type Modality,
  type Motion,
  type Transparency,
} from "@iiiivaska/prism-react";
import { portraitSource } from "../src/harness/portrait.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

interface Axes {
  readonly modality?: Modality;
  readonly motion?: Motion;
  readonly density?: Density;
  readonly contrast?: Contrast;
  readonly transparency?: Transparency;
}

async function mount(node: ReactNode, axes: Axes = {}): Promise<HTMLElement> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <Theme
        tokens={tokens}
        colorScheme="light"
        density={axes.density ?? "compact"}
        modality={axes.modality ?? "pointer"}
        motion={axes.motion ?? "standard"}
        contrast={axes.contrast}
        transparency={axes.transparency}
      >
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

  /**
   * Behavior 2's parent that sizes to its content: a shrink-to-fit column (an inline block, an inline flex
   * column) for a horizontal rule, a flex row with no height of its own for a vertical one. The Divider is as
   * long as the longest of the parent's other children and adds nothing to the parent but its two insets.
   * swift/Tests/DSComponentsTests/DSDividerLengthTests.swift measures the same cases in SwiftUI, where the
   * content-sized parent is a stack under `fixedSize` (Divider.yaml `notes.platform.ios`).
   */
  describe("in a parent that sizes to its content (behavior 2)", () => {
    const parents = {
      "inline block": { display: "inline-block" },
      "inline flex column": { display: "inline-flex", flexDirection: "column" },
      "flex row": { display: "flex", alignItems: "flex-start" },
    } as const;
    const cases = [
      ["horizontal", "inline block"],
      ["horizontal", "inline flex column"],
      ["vertical", "flex row"],
    ] as const;

    async function laidOut(orientation: "horizontal" | "vertical", parent: keyof typeof parents, inset: "none" | "content", sibling: number): Promise<{ divider: number; parent: number; insets: number }> {
      const other = orientation === "horizontal" ? { inlineSize: `${sibling}px`, blockSize: "8px" } : { inlineSize: "8px", blockSize: `${sibling}px` };
      const element = await mount(
        <div data-probe="parent" style={parents[parent]}>
          <div style={other} />
          <Divider orientation={orientation} inset={inset} />
        </div>,
      );
      const length = (box: HTMLElement): number => (orientation === "horizontal" ? box.getBoundingClientRect().width : box.getBoundingClientRect().height);
      const divider = find(element, ".ds-divider");
      return { divider: length(divider), parent: length(find(element, '[data-probe="parent"]')), insets: inset === "content" ? 2 * tokenPx(element, "--ds-space-card-padding") : 0 };
    }

    it.each(cases.flatMap(([orientation, parent]) => (["none", "content"] as const).map((inset) => [orientation, parent, inset] as const)))(
      "%s rule, %s parent, inset %s: as long as the longest other child",
      async (orientation, parent, inset) => {
        const measured = await laidOut(orientation, parent, inset, 120);
        expect(measured.divider).toBe(120);
        expect(measured.parent).toBe(120);
      },
    );

    it.each(cases.flatMap(([orientation, parent]) => (["none", "content"] as const).map((inset) => [orientation, parent, inset] as const)))(
      "%s rule, %s parent, inset %s: adds nothing to the parent but its insets",
      async (orientation, parent, inset) => {
        const measured = await laidOut(orientation, parent, inset, 1);
        expect(measured.parent).toBe(Math.max(1, measured.insets));
        expect(measured.divider).toBe(Math.max(1, measured.insets));
      },
    );
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

describe("Icon", () => {
  const boxes = { sm: "--ds-size-icon-sm", md: "--ds-size-icon-md", lg: "--ds-size-icon-lg" } as const;

  it("is a square box of size.icon.*, the same in every density, and the glyph fills it (behavior 10, anatomy)", async () => {
    const measured: Record<string, number> = {};
    for (const density of ["compact", "regular", "comfortable"] as const) {
      const element = await mount(
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {glyphSizes.map((size) => (
            <Icon key={size} name="object.gps" size={size} data-probe={size} />
          ))}
        </div>,
        { density },
      );
      for (const size of glyphSizes) {
        const box = find(element, `[data-probe="${size}"]`);
        const rect = box.getBoundingClientRect();
        const px = tokenPx(box, boxes[size]);
        expect(rect.width, `${density} ${size}`).toBeCloseTo(px, 3);
        expect(rect.height, `${density} ${size}`).toBeCloseTo(px, 3);
        const svg = find(box, "svg").getBoundingClientRect();
        expect([svg.x, svg.y, svg.width, svg.height], `${density} ${size}`).toEqual([rect.x, rect.y, rect.width, rect.height]);
        measured[`${density} ${size}`] = rect.width;
      }
      await unmount();
    }
    for (const size of glyphSizes) {
      expect(measured[`regular ${size}`], size).toBe(measured[`compact ${size}`]);
      expect(measured[`comfortable ${size}`], size).toBe(measured[`compact ${size}`]);
    }
    expect([measured["compact sm"], measured["compact md"], measured["compact lg"]]).toEqual([16, 20, 24]);
  });

  it("paints its tone on the material it sits on, and inherit takes the color around it (behaviors 7 to 9)", async () => {
    const element = await mount(
      <>
        <Icon name="object.gps" tone="secondary" data-probe="page" />
        <Surface material="vivid" data-probe-surface="vivid">
          <Icon name="object.gps" tone="warning" data-probe="vivid" />
        </Surface>
        <Surface material="glass" backdrop="map" data-probe-surface="glass">
          <Icon name="object.gps" tone="secondary" data-probe="glass" />
        </Surface>
        <div style={{ color: "var(--ds-color-text-primary)" }}>
          <Icon name="status.online" tone="inherit" data-probe="inherit" />
        </div>
      </>,
    );
    const expected = { page: "--ds-color-icon-secondary", vivid: "--ds-color-text-on-vivid", glass: "--ds-color-text-on-glass-fill-secondary", inherit: "--ds-color-text-primary" } as const;
    for (const [probe, variable] of Object.entries(expected)) {
      const box = find(element, `[data-probe="${probe}"]`);
      const color = getComputedStyle(box).color;
      expect(color, probe).toBe(tokenColor(box, variable));
      // The glyph fills with the box's color.
      expect(getComputedStyle(find(box, "path")).fill, probe).toBe(color);
    }
    expect(tokenColor(element, "--ds-color-icon-secondary")).not.toBe(tokenColor(element, "--ds-color-text-primary"));
  });

  it("mirrors a glyph the registry marks rtlMirror under dir=rtl, and no other (behavior 11)", async () => {
    const element = await mount(
      <div dir="rtl">
        <Icon name="nav.open" data-probe="mirrored" />
        <Icon name="action.settings" data-probe="plain" />
      </div>,
    );
    expect(getComputedStyle(find(find(element, '[data-probe="mirrored"]'), "svg")).scale).toBe("-1 1");
    expect(getComputedStyle(find(find(element, '[data-probe="plain"]'), "svg")).scale).toBe("none");
  });

  it("fades in the glyph of a changed name over motion.duration.quick, and replaces it at once under Reduce Motion (motion)", async () => {
    const seconds = (variable: string): string =>
      getComputedStyle(document.documentElement).getPropertyValue(variable).trim().replace(/^(\d+)ms$/, (_all, ms: string) => `${Number(ms) / 1000}s`);
    for (const motion of ["standard", "reduce"] as const) {
      const element = await mount(<Icon name="nav.open" data-probe="swap" />, { motion });
      const first = find(find(element, '[data-probe="swap"]'), "svg");
      // The first drawing is no replacement, so it does not fade.
      expect(first.hasAttribute("data-ds-replaced"), motion).toBe(false);
      expect(getComputedStyle(first).animationName, motion).toBe("none");
      await act(async () => {
        root?.render(
          <Theme tokens={tokens} colorScheme="light" density="compact" modality="pointer" motion={motion}>
            <Icon name="nav.back" data-probe="swap" />
          </Theme>,
        );
        await Promise.resolve();
      });
      const box = find(element, '[data-probe="swap"]');
      expect(box.getAttribute("data-ds-icon"), motion).toBe("nav.back");
      const replaced = find(box, "svg");
      expect(replaced, motion).not.toBe(first);
      expect(replaced.hasAttribute("data-ds-replaced"), motion).toBe(true);
      const style = getComputedStyle(replaced);
      expect(style.animationName, motion).toBe("ds-glyph-replace");
      expect(style.animationDuration, motion).toBe(motion === "reduce" ? seconds("--ds-motion-duration-instant") : seconds("--ds-motion-duration-quick"));
      expect(style.animationDuration, motion).toBe(motion === "reduce" ? "0s" : "0.1s");
      await unmount();
    }
  });

  it("runs no event handler a caller casts past the type, and takes no focus: a glyph carries no gesture (behavior 12)", async () => {
    // IconProps has no `on*` key, so this is an untyped caller. The control beside it — a plain span in the
    // same tree with the same handlers — runs them, so the silence of the box is the component's.
    const Loose = Icon as unknown as (props: Record<string, unknown>) => ReactNode;
    const glyph = vi.fn();
    const control = vi.fn();
    const handlers = (handler: () => void): Record<string, () => void> => ({
      onClick: handler,
      onClickCapture: handler,
      onPointerDown: handler,
      onMouseDown: handler,
      onKeyDown: handler,
      onFocus: handler,
    });
    const element = await mount(
      <>
        <Loose name="object.lock" label="Locked for editing" data-probe="glyph" {...handlers(glyph)} />
        <span data-probe="control" tabIndex={0} {...handlers(control)}>
          Control
        </span>
      </>,
    );
    for (const [probe, handler] of [
      ["glyph", glyph],
      ["control", control],
    ] as const) {
      const box = find(element, `[data-probe="${probe}"]`);
      await userEvent.click(box);
      await act(async () => {
        box.focus();
        box.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
      if (probe === "glyph") {
        expect(handler).not.toHaveBeenCalled();
        expect(box.tabIndex).toBe(-1);
        expect(document.activeElement).not.toBe(box);
      } else {
        expect(handler.mock.calls.length).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("is the box Button and Card draw their glyphs with, at their own sizes", async () => {
    const element = await mount(
      <>
        <Button variant="secondary" label="Details" trailingIcon="nav.open" onPress={() => undefined} />
        <Card title="Sensor" caption="Active" icon="object.gps" onAction={() => undefined} />
      </>,
      { modality: "touch" },
    );
    const parts = { "button-trailing-icon": "--ds-size-icon-md", "card-icon": "--ds-size-icon-md", "card-action-glyph": "--ds-size-icon-sm" } as const;
    for (const [slot, variable] of Object.entries(parts)) {
      const box = find(element, `.ds-icon[data-ds-slot="${slot}"]`);
      const rect = box.getBoundingClientRect();
      expect(rect.width, slot).toBeCloseTo(tokenPx(box, variable), 3);
      expect(rect.height, slot).toBeCloseTo(tokenPx(box, variable), 3);
      expect(find(box, "svg").getBoundingClientRect().width, slot).toBeCloseTo(rect.width, 3);
    }
    // The ring's glyph is Icon's primary tone, as Apple draws it; the button's takes the label's color.
    const ring = find(element, '.ds-icon[data-ds-slot="card-icon"]');
    expect(getComputedStyle(ring).color).toBe(tokenColor(ring, "--ds-color-icon-primary"));
    const trailing = find(element, '.ds-icon[data-ds-slot="button-trailing-icon"]');
    expect(getComputedStyle(trailing).color).toBe(getComputedStyle(find(element, ".ds-button")).color);
  });
});

describe("Badge", () => {
  const seconds = (variable: string): string =>
    getComputedStyle(document.documentElement).getPropertyValue(variable).trim().replace(/^(\d+)ms$/, (_all, ms: string) => `${Number(ms) / 1000}s`);

  it("is a count pill at least size.icon.md on both axes and a space.3 dot, the same in every density (behavior 2)", async () => {
    const measured: Record<string, readonly number[]> = {};
    for (const density of ["compact", "regular", "comfortable"] as const) {
      const element = await mount(
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <Badge count={3} label="unread alerts" data-probe="one" />
          <Badge count={12} tone="critical" label="open incidents" data-probe="two" />
          <Badge count={128} max={99} tone="critical" label="open incidents" data-probe="overflow" />
          <Badge count={4} emphasis="outline" label="queued runs" data-probe="outline" />
          <Badge variant="dot" tone="critical" label="unread" data-probe="dot" />
        </div>,
        { density },
      );
      const floor = tokenPx(element, "--ds-size-icon-md");
      const dot = tokenPx(element, "--ds-space-3");
      expect([floor, dot]).toEqual([20, 8]);
      for (const probe of ["one", "two", "overflow", "outline", "dot"]) {
        const rect = find(element, `[data-probe="${probe}"]`).getBoundingClientRect();
        measured[`${density} ${probe}`] = [rect.width, rect.height];
      }
      // One digit is the size.icon.md circle, in either emphasis. More digits share its height and its capsule
      // and widen it to hug them with space.1 on either side, never cutting one: `12` and `99+`.
      expect(measured[`${density} one`], density).toEqual([floor, floor]);
      expect(measured[`${density} outline`], density).toEqual([floor, floor]);
      for (const probe of ["two", "overflow"]) {
        const [width = 0, height] = measured[`${density} ${probe}`] ?? [];
        const pill = find(element, `[data-probe="${probe}"]`);
        const digits = find(pill, ".ds-text").getBoundingClientRect();
        expect(height, `${density} ${probe}`).toBe(floor);
        expect(width, `${density} ${probe}`).toBeGreaterThanOrEqual(floor);
        expect(Number.parseFloat(getComputedStyle(pill).paddingInlineStart), `${density} ${probe}`).toBe(tokenPx(pill, "--ds-space-1"));
        expect(width, `${density} ${probe}`).toBeCloseTo(Math.max(floor, digits.width + 2 * tokenPx(pill, "--ds-space-1")), 3);
        expect(getComputedStyle(pill).borderTopLeftRadius, `${density} ${probe}`).toBe(`${tokenPx(pill, "--ds-radius-control")}px`);
      }
      expect(measured[`${density} overflow`]?.[0] ?? 0, density).toBeGreaterThan(measured[`${density} two`]?.[0] ?? 0);
      expect(measured[`${density} dot`], density).toEqual([dot, dot]);
      await unmount();
    }
    for (const probe of ["one", "two", "overflow", "outline", "dot"]) {
      expect(measured[`regular ${probe}`], probe).toEqual(measured[`compact ${probe}`]);
      expect(measured[`comfortable ${probe}`], probe).toEqual(measured[`compact ${probe}`]);
    }
  });

  it("keeps the pill's height when it sits in a line of taller text", async () => {
    const element = await mount(
      <p style={{ margin: 0, fontSize: "32px", lineHeight: "48px" }}>
        Queued <Badge count={4} label="queued runs" data-probe="inline" />
      </p>,
    );
    const badge = find(element, '[data-probe="inline"]');
    expect(badge.getBoundingClientRect().height).toBe(tokenPx(badge, "--ds-size-icon-md"));
  });

  it("fills a filled badge with no stroke, and strokes an outline one inside the pill with no fill (behavior 11)", async () => {
    const element = await mount(
      <>
        <Badge count={3} tone="neutral" label="unread alerts" data-probe="filled-neutral" />
        <Badge count={3} tone="accent" label="unread alerts" data-probe="filled-accent" />
        <Badge count={3} tone="critical" label="unread alerts" data-probe="filled-critical" />
        <Badge count={3} tone="neutral" emphasis="outline" label="unread alerts" data-probe="outline-neutral" />
        <Badge count={3} tone="accent" emphasis="outline" label="unread alerts" data-probe="outline-accent" />
        <Badge count={3} tone="critical" emphasis="outline" label="unread alerts" data-probe="outline-critical" />
      </>,
    );
    const filled = { neutral: ["--ds-badge-neutral-bg", "--ds-badge-neutral-text"], accent: ["--ds-badge-accent-bg", "--ds-badge-accent-text"], critical: ["--ds-badge-critical-bg", "--ds-badge-critical-text"] } as const;
    for (const [tone, [fill, text]] of Object.entries(filled)) {
      const badge = find(element, `[data-probe="filled-${tone}"]`);
      const style = getComputedStyle(badge);
      expect(style.backgroundColor, tone).toBe(tokenColor(badge, fill));
      expect(style.color, tone).toBe(tokenColor(badge, text));
      // A zero-width inset shadow: a filled badge has no stroke at all.
      expect(style.boxShadow, tone).toMatch(/ 0px 0px 0px 0px inset$/u);
      expect(getComputedStyle(find(badge, ".ds-text")).color, tone).toBe(style.color);
    }
    const outline = { neutral: ["--ds-color-border-strong", "--ds-color-text-secondary"], accent: ["--ds-color-accent", "--ds-color-text-accent"], critical: ["--ds-color-text-critical", "--ds-color-text-critical"] } as const;
    for (const [tone, [stroke, text]] of Object.entries(outline)) {
      const badge = find(element, `[data-probe="outline-${tone}"]`);
      const style = getComputedStyle(badge);
      expect(style.backgroundColor, tone).toMatch(TRANSPARENT);
      expect(style.color, tone).toBe(tokenColor(badge, text));
      expect(style.boxShadow, tone).toBe(`${tokenColor(badge, stroke)} 0px 0px 0px ${tokenPx(badge, "--ds-border-hairline")}px inset`);
      expect(style.borderTopWidth, tone).toBe("0px");
    }
  });

  it("draws tabular digits in type.micro, so a count going from 8 to 9 keeps its digit column (behavior 8)", async () => {
    const element = await mount(
      <>
        <Badge count={18} label="queued runs" data-probe="eighteen" />
        <Badge count={11} label="queued runs" data-probe="eleven" />
      </>,
    );
    const eighteen = find(find(element, '[data-probe="eighteen"]'), ".ds-text");
    const eleven = find(find(element, '[data-probe="eleven"]'), ".ds-text");
    expect(getComputedStyle(eighteen).fontVariantNumeric).toBe("tabular-nums");
    expect(getComputedStyle(eighteen).fontSize).toBe(`${tokenPx(eighteen, "--ds-type-micro-font-size")}px`);
    expect(eighteen.getBoundingClientRect().width).toBeCloseTo(eleven.getBoundingClientRect().width, 3);
  });

  it("is never a tap target: presses reach what it marks, and it takes no focus (behavior 1)", async () => {
    const press = vi.fn();
    const element = await mount(
      <div data-probe="host" style={{ position: "relative", display: "inline-block", padding: "16px" }} onClick={press}>
        <Badge count={3} label="unread alerts" data-probe="badge" />
      </div>,
    );
    const badge = find(element, '[data-probe="badge"]');
    expect(getComputedStyle(badge).pointerEvents).toBe("none");
    const rect = badge.getBoundingClientRect();
    expect(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)).toBe(find(element, '[data-probe="host"]'));
    await userEvent.click(badge, { force: true });
    expect(press).toHaveBeenCalledTimes(1);
    badge.focus();
    expect(document.activeElement).not.toBe(badge);
  });

  it("fades new digits in over motion.duration.quick, and replaces them at once under Reduce Motion (motion)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const theme = (count: number): ReactNode => (
        <Theme tokens={tokens} colorScheme="light" density="compact" modality="pointer" motion={motion}>
          <Badge count={count} label="unread alerts" data-probe="swap" />
        </Theme>
      );
      const element = await mount(<Badge count={8} label="unread alerts" data-probe="swap" />, { motion });
      const first = find(element, '[data-probe="swap"] [data-ds-slot="badge-label"]');
      expect(first.hasAttribute("data-ds-replaced"), motion).toBe(false);
      expect(getComputedStyle(first).animationName, motion).toBe("none");
      await act(async () => {
        root?.render(theme(9));
        await Promise.resolve();
      });
      const replaced = find(element, '[data-probe="swap"] [data-ds-slot="badge-label"]');
      expect(replaced, motion).not.toBe(first);
      expect(replaced.textContent, motion).toBe("9");
      expect(replaced.hasAttribute("data-ds-replaced"), motion).toBe(true);
      const style = getComputedStyle(replaced);
      expect(style.animationName, motion).toBe("ds-badge-replace");
      expect(style.animationDuration, motion).toBe(motion === "reduce" ? seconds("--ds-motion-duration-instant") : seconds("--ds-motion-duration-quick"));
      expect(style.animationDuration, motion).toBe(motion === "reduce" ? "0s" : "0.1s");
      // The name follows the count at once: it is never animated.
      expect(find(element, '[data-probe="swap"]').getAttribute("aria-label"), motion).toBe("9 unread alerts");
      await unmount();
    }
  });

  it("does not fade a badge that reappears after rendering nothing: it arrives, and a badge never animates its arrival (behavior 15)", async () => {
    const element = await mount(<Badge count={0} label="unread alerts" data-probe="back" />);
    expect(element.querySelector('[data-probe="back"]')).toBeNull();
    await act(async () => {
      root?.render(
        <Theme tokens={tokens} colorScheme="light" density="compact" modality="pointer" motion="standard">
          <Badge count={3} label="unread alerts" data-probe="back" />
        </Theme>,
      );
      await Promise.resolve();
    });
    const label = find(element, '[data-probe="back"] [data-ds-slot="badge-label"]');
    expect(label.hasAttribute("data-ds-replaced")).toBe(false);
    expect(getComputedStyle(label).animationName).toBe("none");
  });
});

describe("IconButton", () => {
  const noop = (): void => undefined;
  const sizeToken = { sm: "--ds-icon-button-size-sm", md: "--ds-icon-button-size-md", lg: "--ds-icon-button-size-lg" } as const;
  const glyphToken = { sm: "--ds-size-icon-sm", md: "--ds-size-icon-md", lg: "--ds-size-icon-lg" } as const;

  it("is a circle of root.size, the same under either modality, with a hit region of at least size.hit around it (behaviors 2 and 7)", async () => {
    for (const density of ["compact", "regular", "comfortable"] as const) {
      for (const size of iconButtonSizes) {
        const measured: Partial<Record<Modality, { side: number; hitTop: number; hit: number }>> = {};
        for (const modality of ["pointer", "touch"] as const) {
          const element = await mount(<IconButton size={size} variant="plain" glyph="nav.open" label="Open details" onPress={noop} />, { modality, density });
          const button = find(element, ".ds-icon-button");
          const rect = button.getBoundingClientRect();
          const side = tokenPx(button, sizeToken[size]);
          expect([rect.width, rect.height], `${density} ${size} ${modality}`).toEqual([side, side]);
          // radius.control on a square: a circle, whose radius is at least half the side.
          expect(Number.parseFloat(getComputedStyle(button).borderTopLeftRadius), `${density} ${size}`).toBeGreaterThanOrEqual(side / 2);
          // The glyph is the icon box, the same in every density, centred in the circle.
          const glyph = find(button, '[data-ds-slot="icon-button-glyph"]').getBoundingClientRect();
          const box = tokenPx(button, glyphToken[size]);
          expect([glyph.width, glyph.height], `${density} ${size}`).toEqual([box, box]);
          expect(glyph.left - rect.left, `${density} ${size}`).toBeCloseTo((side - box) / 2, 3);
          expect(glyph.top - rect.top, `${density} ${size}`).toBeCloseTo((side - box) / 2, 3);
          const before = getComputedStyle(button, "::before");
          measured[modality] = { side, hitTop: Number.parseFloat(before.top), hit: tokenPx(button, "--ds-size-hit") };
          await unmount();
        }
        const { pointer, touch } = measured;
        expect(touch?.side, `${density} ${size}`).toBe(pointer?.side);
        for (const each of [pointer, touch]) {
          expect(each?.hitTop, `${density} ${size}`).toBeCloseTo(Math.min(0, ((each?.side ?? 0) - (each?.hit ?? 0)) / 2), 3);
        }
      }
    }
  });

  it("takes a press anywhere in the hit region, which reaches past a small circle under touch (behaviors 2 and 3)", async () => {
    const onPress = vi.fn();
    const element = await mount(
      <div style={{ padding: "24px" }}>
        <IconButton size="sm" variant="plain" glyph="nav.open" label="Open details" onPress={onPress} />
      </div>,
      { modality: "touch", density: "compact" },
    );
    const button = find(element, ".ds-icon-button");
    const rect = button.getBoundingClientRect();
    const hit = tokenPx(button, "--ds-size-hit");
    expect(hit).toBeGreaterThan(rect.width);
    // Just outside the circle, inside size.hit: the button's own region.
    const x = rect.left - (hit - rect.width) / 2 + 1;
    const y = rect.top + rect.height / 2;
    expect(document.elementFromPoint(x, y)).toBe(button);
    // `plain` paints nothing at rest: no fill, no ring.
    const style = getComputedStyle(button);
    expect(style.getPropertyValue("--ds--icon-button-fill").trim()).toMatch(TRANSPARENT);
    expect(style.boxShadow).toMatch(/ 0px 0px 0px 0px inset$/u);
    await act(async () => {
      await userEvent.click(button, { position: { x: x - rect.left, y: rect.height / 2 } });
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders a selected circle as primary renders it, whatever its variant, and announces it with aria-current (behavior 6)", async () => {
    const element = await mount(
      <div>
        <IconButton variant="primary" glyph="object.map" label="Map view" data-probe="primary" onPress={noop} />
        {iconButtonVariants.map((variant) => (
          <IconButton key={variant} variant={variant} glyph="object.map" label="Map view" isSelected data-probe={`selected-${variant}`} onPress={noop} />
        ))}
        <IconButton variant="ghost" glyph="object.map-pin" label="Pin view" data-probe="unselected" onPress={noop} />
      </div>,
    );
    const primary = getComputedStyle(find(element, '[data-probe="primary"]'));
    for (const variant of iconButtonVariants) {
      const probe = find(element, `[data-probe="selected-${variant}"]`);
      const style = getComputedStyle(probe);
      await settles(() => getComputedStyle(probe).getPropertyValue("--ds--icon-button-fill").trim(), primary.getPropertyValue("--ds--icon-button-fill").trim());
      await settles(() => getComputedStyle(probe).color, primary.color);
      expect(style.boxShadow, variant).toBe(primary.boxShadow);
      expect(style.backgroundColor, variant).toMatch(TRANSPARENT);
      expect(probe.getAttribute("aria-current"), variant).toBe("true");
      expect(probe.getAttribute("data-ds-variant"), variant).toBe(variant);
      expect(probe.hasAttribute("aria-pressed"), variant).toBe(false);
    }
    expect(find(element, '[data-probe="unselected"]').hasAttribute("aria-current")).toBe(false);
    expect(find(element, '[data-probe="primary"]').hasAttribute("aria-current")).toBe(false);
  });

  it("adds the hover overlay under pointer only (behavior 12)", async () => {
    for (const modality of ["pointer", "touch"] as const) {
      const element = await mount(<IconButton variant="plain" glyph="nav.open" label="Open details" onPress={noop} />, { modality });
      const button = find(element, ".ds-icon-button");
      await act(async () => {
        await userEvent.hover(button);
      });
      await vi.waitFor(() => {
        expect(button.hasAttribute("data-hovered")).toBe(true);
      });
      const overlay = (): string => getComputedStyle(button).getPropertyValue("--ds--icon-button-hover").trim();
      if (modality === "pointer") {
        await settles(overlay, tokenColor(button, "--ds-color-bg-fill-neutral-subtle"));
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

  it("scales to 0.97 while pressed, not under Reduce Motion, and shows the pressed overlay on every press in both (behavior 13)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      for (const variant of ["danger", "primary"] as const) {
        const onPress = vi.fn();
        const element = await mount(<IconButton variant={variant} glyph="action.delete" label="Delete route" onPress={onPress} />, { motion });
        const button = find(element, ".ds-icon-button");
        const release = await pressWithKeyboard(button);
        expect(button.hasAttribute("data-pressed"), `${motion} ${variant}`).toBe(true);
        const style = getComputedStyle(button);
        await settles(() => style.getPropertyValue("--ds--icon-button-press").trim(), tokenColor(button, "--ds-color-bg-fill-neutral-subtle"));
        if (motion === "standard") await settles(() => style.scale, "0.97");
        else expect(style.scale, variant).toBe("1");
        await release();
        expect(onPress, `${motion} ${variant}`).toHaveBeenCalledTimes(1);
        await settles(() => style.getPropertyValue("--ds--icon-button-press").trim(), TRANSPARENT);
        await unmount();
      }
    }
  });

  it("takes the variant's pressed fill while pressed (behavior 13, accessibility.reduceMotion)", async () => {
    const cells = { secondary: "--ds-icon-button-secondary-bg-pressed", ghost: "--ds-icon-button-ghost-bg-pressed", plain: "--ds-icon-button-ghost-bg-pressed" } as const;
    for (const [variant, cell] of Object.entries(cells) as [keyof typeof cells, string][]) {
      const element = await mount(<IconButton variant={variant} glyph="action.filter" label="Filter results" onPress={noop} />, { motion: "reduce" });
      const button = find(element, ".ds-icon-button");
      const release = await pressWithKeyboard(button);
      await settles(() => getComputedStyle(button).getPropertyValue("--ds--icon-button-fill").trim(), tokenColor(button, cell));
      expect(getComputedStyle(button).scale, variant).toBe("1");
      await release();
      await unmount();
    }
  });

  it("draws the focus ring outside the circle, and the badge stays outside the ring's shape (accessibility.keyboard)", async () => {
    const element = await mount(<IconButton glyph="object.notification" label="Open notifications" badge={{ count: 3, label: "unread" }} onPress={noop} />);
    const button = find(element, ".ds-icon-button");
    await act(async () => {
      await userEvent.tab();
    });
    expect(document.activeElement).toBe(button);
    await vi.waitFor(() => {
      expect(button.hasAttribute("data-focus-visible")).toBe(true);
    });
    const style = getComputedStyle(button);
    expect(style.outlineStyle).toBe("solid");
    expect(Number.parseFloat(style.outlineWidth)).toBe(tokenPx(button, "--ds-border-focus"));
    expect(style.outlineColor).toBe(tokenColor(button, "--ds-color-border-focus"));
    expect(Number.parseFloat(style.outlineOffset)).toBe(0);
    // The badge takes no focus of its own.
    expect(button.querySelectorAll("[tabindex]").length).toBe(0);
  });

  it("dims the whole control, badge included, and leaves the focus order when disabled (behavior 15)", async () => {
    const onPress = vi.fn();
    const element = await mount(<IconButton glyph="action.refresh" label="Refresh readings" badge={{ count: 3, label: "unread" }} isDisabled onPress={onPress} />);
    const button = find(element, ".ds-icon-button");
    const probe = document.createElement("div");
    probe.style.opacity = "var(--ds-opacity-disabled)";
    element.append(probe);
    const disabled = getComputedStyle(probe).opacity;
    probe.remove();
    expect(Number(disabled)).toBeLessThan(1);
    expect(getComputedStyle(button).opacity).toBe(disabled);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      await userEvent.click(button, { force: true });
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("anchors the badge badge.offset outside the top-trailing corner, in either writing direction, moving nothing (behavior 16)", async () => {
    for (const dir of ["ltr", "rtl"] as const) {
      const element = await mount(
        <div dir={dir} style={{ display: "flex", gap: "48px", padding: "24px" }}>
          <IconButton glyph="object.notification" label="Open notifications" data-probe="bare" onPress={noop} />
          <IconButton glyph="object.notification" label="Open notifications" badge={{ variant: "count", tone: "neutral", count: 3, label: "unread" }} data-probe="badged" onPress={noop} />
          <IconButton glyph="object.notification" label="Open notifications" badge={{ count: 128, label: "unread" }} data-probe="wide" onPress={noop} />
        </div>,
      );
      const bare = find(element, '[data-probe="bare"]');
      const offset = tokenPx(bare, "--ds-space-1");
      expect(offset).toBe(4);
      for (const probe of ["badged", "wide"]) {
        const button = find(element, `[data-probe="${probe}"]`);
        const circle = button.getBoundingClientRect();
        const badge = find(button, ".ds-badge").getBoundingClientRect();
        // The circle and the glyph are where the bare button has them: the badge is out of flow.
        expect([circle.width, circle.height], `${dir} ${probe}`).toEqual([bare.getBoundingClientRect().width, bare.getBoundingClientRect().height]);
        const glyph = find(button, '[data-ds-slot="icon-button-glyph"]').getBoundingClientRect();
        const bareGlyph = find(bare, '[data-ds-slot="icon-button-glyph"]').getBoundingClientRect();
        expect([glyph.left - circle.left, glyph.top - circle.top], `${dir} ${probe}`).toEqual([bareGlyph.left - bare.getBoundingClientRect().left, bareGlyph.top - bare.getBoundingClientRect().top]);
        expect(badge.top, `${dir} ${probe}`).toBeCloseTo(circle.top - offset, 3);
        if (dir === "ltr") expect(badge.right, probe).toBeCloseTo(circle.right + offset, 3);
        else expect(badge.left, probe).toBeCloseTo(circle.left - offset, 3);
        // It overlaps the circle, and takes no pointer of its own.
        expect(badge.bottom, `${dir} ${probe}`).toBeGreaterThan(circle.top);
        expect(getComputedStyle(find(button, '[data-ds-slot="icon-button-badge"]')).pointerEvents).toBe("none");
      }
      await unmount();
    }
  });

  it("writes no hint on any root: no title, no description, no pressed state (behavior 5)", async () => {
    const element = await mount(
      <div>
        {iconButtonVariants.map((variant) => (
          <IconButton key={variant} variant={variant} glyph="action.settings" label="Open settings" onPress={noop} />
        ))}
        <IconButton glyph="object.map" label="Map view" isSelected onPress={noop} />
        <IconButton glyph="object.notification" label="Open notifications" badge={{ count: 3, label: "unread" }} onPress={noop} />
      </div>,
    );
    const roots = [...element.querySelectorAll<HTMLElement>(".ds-icon-button")];
    expect(roots.length).toBe(iconButtonVariants.length + 2);
    for (const button of roots) {
      for (const name of ["title", "aria-describedby", "aria-description", "aria-pressed", "aria-labelledby"]) {
        expect(button.hasAttribute(name), name).toBe(false);
      }
      expect(button.querySelector("[title]")).toBeNull();
    }
  });
});

describe("Avatar", () => {
  const sizeToken = { sm: "--ds-size-control-sm", md: "--ds-size-control-md", lg: "--ds-size-control-lg" } as const;
  /** spec/SCHEMA.md's `portrait` fixture, as the gallery draws it: an SVG the browser decodes. */
  const portrait = portraitSource(tokens, { colorScheme: "light", contrast: "standard", transparency: "standard", density: "compact", modality: "pointer", motion: "standard" });
  /** A source that names no picture a browser can decode. */
  const broken = "data:image/png;base64,AAAA";

  it("is a circle of size.control.* per size and density, whatever it holds, and neither the ring nor the image moves it (behaviors 4 to 6)", async () => {
    for (const density of ["compact", "regular", "comfortable"] as const) {
      const element = await mount(
        <div style={{ display: "flex", gap: "8px" }}>
          {avatarSizes.map((size) => (
            <Avatar key={size} size={size} name="Anna Petrova" data-probe={`initials-${size}`} />
          ))}
          {avatarSizes.map((size) => (
            <Avatar key={size} size={size} name="Anna Petrova" image={portrait} hasRing data-probe={`ringed-${size}`} />
          ))}
          {avatarSizes.map((size) => (
            <Avatar key={size} size={size} data-probe={`glyph-${size}`} />
          ))}
        </div>,
        { density },
      );
      for (const size of avatarSizes) {
        const side = tokenPx(element, sizeToken[size]);
        for (const probe of [`initials-${size}`, `ringed-${size}`, `glyph-${size}`]) {
          const avatar = find(element, `[data-probe="${probe}"]`);
          const rect = avatar.getBoundingClientRect();
          expect([rect.width, rect.height], `${density} ${probe}`).toEqual([side, side]);
          // radius.control on a square: a circle, which clips everything inside it.
          expect(Number.parseFloat(getComputedStyle(avatar).borderTopLeftRadius), `${density} ${probe}`).toBeGreaterThanOrEqual(side / 2);
          expect(getComputedStyle(avatar).overflow, `${density} ${probe}`).toBe("hidden");
        }
        // The ring and the image cover the circle exactly, and the ring is an inset stroke of border.strong.
        const ringed = find(element, `[data-probe="ringed-${size}"]`);
        const box = ringed.getBoundingClientRect();
        for (const part of ["avatar-ring", "avatar-image"]) {
          const rect = find(ringed, `[data-ds-slot="${part}"]`).getBoundingClientRect();
          expect([rect.left, rect.top, rect.width, rect.height], `${density} ${size} ${part}`).toEqual([box.left, box.top, box.width, box.height]);
        }
        const strong = tokenPx(ringed, "--ds-border-strong");
        expect(getComputedStyle(find(ringed, '[data-ds-slot="avatar-ring"]')).boxShadow, `${density} ${size}`).toMatch(new RegExp(` 0px 0px 0px ${String(strong)}px inset$`, "u"));
        // The initials and the glyph are centred.
        for (const [probe, part] of [
          [`initials-${size}`, "avatar-initials"],
          [`glyph-${size}`, "avatar-fallback-icon"],
        ] as const) {
          const avatar = find(element, `[data-probe="${probe}"]`).getBoundingClientRect();
          const inner = find(element, `[data-probe="${probe}"] [data-ds-slot="${part}"]`).getBoundingClientRect();
          expect(inner.left - avatar.left, `${density} ${probe}`).toBeCloseTo(avatar.right - inner.right, 0);
          expect(inner.top - avatar.top, `${density} ${probe}`).toBeCloseTo(avatar.bottom - inner.bottom, 0);
        }
      }
      await unmount();
    }
  });

  it("fades the image in over the initials once it has decoded, covering the circle (behaviors 1 and 13)", async () => {
    const element = await mount(<Avatar name="Anna Petrova" image={portrait} />);
    const image = find(element, '[data-ds-slot="avatar-image"]') as HTMLImageElement;
    await vi.waitFor(
      () => {
        expect(image.hasAttribute("data-ds-loaded")).toBe(true);
      },
      { timeout: 2000, interval: 20 },
    );
    expect(image.naturalWidth).toBeGreaterThan(0);
    await settles(() => getComputedStyle(image).opacity, "1");
    expect(getComputedStyle(image).transitionProperty).toBe("opacity");
    expect(getComputedStyle(image).objectFit).toBe("cover");
    // The initials stay under the picture, so it never replaces them with a flash.
    expect(find(element, '[data-ds-slot="avatar-initials"]').textContent).toBe("AP");
  });

  it("drops a source that fails to load, leaving the initials, or the glyph when there is no name (behavior 1)", async () => {
    const element = await mount(
      <div>
        <Avatar name="Anna Petrova" image={broken} data-probe="named" />
        <Avatar image={broken} data-probe="nameless" />
      </div>,
    );
    await vi.waitFor(
      () => {
        expect(element.querySelector('[data-ds-slot="avatar-image"]')).toBeNull();
      },
      { timeout: 2000, interval: 20 },
    );
    expect(find(element, '[data-probe="named"] [data-ds-slot="avatar-initials"]').textContent).toBe("AP");
    expect(find(element, '[data-probe="nameless"] [data-ds-icon="object.user"]').getAttribute("aria-hidden")).toBe("true");
  });

  it("is the glass chip over the map, with its blur, flat on the scheme's glass, and its own fill on the page (behavior 8, ADR-0036)", async () => {
    const element = await mount(
      <div>
        <Backdrop kind="map">
          <Avatar name="Anna Petrova" data-probe="map" />
        </Backdrop>
        <Surface material="glass" backdrop="map">
          <Avatar name="Anna Petrova" data-probe="glass" />
        </Surface>
        <Avatar name="Anna Petrova" data-probe="page" />
      </div>,
    );
    const map = find(element, '[data-probe="map"]');
    expect(map.getAttribute("data-ds-surface-chip")).toBe("glass");
    const blur = tokenPx(map, "--ds-material-glass-chip-blur");
    expect(getComputedStyle(map).backdropFilter).toBe(`blur(${String(blur)}px) saturate(1)`);
    expect(map.querySelector('[data-ds-slot="surface-chip-edge"]')).not.toBeNull();
    await settles(() => getComputedStyle(find(map, '[data-ds-slot="avatar-initials"]')).color, tokenColor(map, "--ds-color-text-on-glass-fill"));
    const glass = find(element, '[data-probe="glass"]');
    expect(glass.hasAttribute("data-ds-surface-chip-flat")).toBe(true);
    expect(getComputedStyle(glass).backdropFilter).toBe("none");
    const page = find(element, '[data-probe="page"]');
    expect(page.getAttribute("data-ds-surface-chip")).toBe("own");
    expect(getComputedStyle(page).backdropFilter).toBe("none");
    await settles(() => getComputedStyle(page).getPropertyValue("--ds--surface-chip-fill").trim(), tokenColor(page, "--ds-avatar-bg"));
    await settles(() => getComputedStyle(find(page, '[data-ds-slot="avatar-initials"]')).color, tokenColor(page, "--ds-color-text-secondary"));
  });

  it.each([
    ["Reduce Transparency", { transparency: "reduce" }],
    ["Increase Contrast", { contrast: "more" }],
  ] as const)("falls back over the map under %s: raised over the page, no blur and no edge, and every part its default cell", async (_setting, axes) => {
    const element = await mount(
      <Backdrop kind="map">
        <Avatar name="Anna Petrova" hasRing data-probe="initials" />
        <Avatar data-probe="glyph" />
      </Backdrop>,
      axes,
    );
    const avatar = find(element, '[data-probe="initials"]');
    expect(avatar.getAttribute("data-ds-surface-chip")).toBe("fallback");
    expect([avatar.getAttribute("data-ds-surface"), avatar.getAttribute("data-ds-backdrop")]).toEqual(["raised", "none"]);
    expect(getComputedStyle(avatar).backdropFilter).toBe("none");
    expect(avatar.querySelector('[data-ds-slot="surface-chip-edge"]')).toBeNull();
    await settles(() => getComputedStyle(avatar).backgroundColor, tokenColor(avatar, "--ds-color-bg-page"));
    await settles(() => getComputedStyle(avatar).getPropertyValue("--ds--surface-chip-fill").trim(), tokenColor(avatar, "--ds-color-bg-surface-raised"));
    await settles(() => getComputedStyle(find(avatar, '[data-ds-slot="avatar-initials"]')).color, tokenColor(avatar, "--ds-color-text-secondary"));
    expect(getComputedStyle(find(avatar, '[data-ds-slot="avatar-ring"]')).boxShadow.startsWith(tokenColor(avatar, "--ds-avatar-ring"))).toBe(true);
    const glyph = find(element, '[data-probe="glyph"]');
    await settles(() => getComputedStyle(find(glyph, '[data-ds-slot="avatar-fallback-icon"]')).color, tokenColor(glyph, "--ds-color-icon-secondary"));
  });
});

describe("Chip", () => {
  const noop = (): void => undefined;
  const heightToken = { sm: "--ds-size-control-sm", md: "--ds-size-control-md" } as const;

  it("is one row of the control height per size and density, with a hit region of at least size.hit for a control and none for a label (behaviors 2 and 3)", async () => {
    for (const density of ["compact", "regular", "comfortable"] as const) {
      const element = await mount(
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          {chipSizes.map((size) => (
            <Chip key={`button-${size}`} size={size} label="Last 24 hours" isRemovable onPress={noop} onRemove={noop} data-probe={`button-${size}`} />
          ))}
          {chipSizes.map((size) => (
            <Chip key={`label-${size}`} size={size} label="B-4417" data-probe={`label-${size}`} />
          ))}
        </div>,
        { density, modality: "touch" },
      );
      for (const size of chipSizes) {
        const height = tokenPx(element, heightToken[size]);
        const hit = tokenPx(element, "--ds-size-hit");
        for (const probe of [`button-${size}`, `label-${size}`]) {
          const chip = find(element, `[data-probe="${probe}"]`);
          const rect = chip.getBoundingClientRect();
          expect(rect.height, `${density} ${probe}`).toBe(height);
          // One line: the label never wraps, and the pill is as wide as what it holds.
          const label = find(chip, '[data-ds-slot="chip-label"]');
          expect(label.getBoundingClientRect().height, `${density} ${probe}`).toBeLessThan(height);
          expect(getComputedStyle(label).whiteSpace, `${density} ${probe}`).toBe("nowrap");
          const before = getComputedStyle(find(chip, '[data-ds-slot="chip-body"]'), "::before");
          if (probe.startsWith("button")) {
            expect(Number.parseFloat(before.top), `${density} ${probe}`).toBeCloseTo(Math.min(0, (height - hit) / 2), 3);
          } else {
            expect(before.content, `${density} ${probe}: a static label keeps no hit region`).toBe("none");
          }
        }
        // The remove control is the glyph's box, and its region reaches size.hit around it.
        const remove = find(find(element, `[data-probe="button-${size}"]`), '[data-ds-slot="chip-remove"]');
        const box = tokenPx(remove, "--ds-size-icon-sm");
        expect(remove.getBoundingClientRect().width, `${density} ${size}`).toBe(box);
        expect(Number.parseFloat(getComputedStyle(remove, "::before").left), `${density} ${size}`).toBeCloseTo(Math.min(0, (box - hit) / 2), 3);
      }
      await unmount();
    }
  });

  it("decides its role from the props alone: a filter asks through onPress while aria-pressed follows isSelected, a button presses, a label does neither (behavior 1)", async () => {
    const onPress = vi.fn();
    let element = await mount(<Chip label="Last 24 hours" isSelected={false} onPress={onPress} />);
    let body = find(element, '[data-ds-slot="chip-body"]');
    expect(body.tagName).toBe("BUTTON");
    expect(body.getAttribute("aria-pressed")).toBe("false");
    await act(async () => {
      await userEvent.click(body);
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    // The press asks and the app decides: the chip is not on until the app sets isSelected.
    expect(body.getAttribute("aria-pressed")).toBe("false");
    expect(find(element, '[data-ds-slot="chip"]').hasAttribute("data-ds-selected")).toBe(false);
    await unmount();

    element = await mount(<Chip label="Last 24 hours" isSelected onPress={onPress} />);
    body = find(element, '[data-ds-slot="chip-body"]');
    expect(body.getAttribute("aria-pressed")).toBe("true");
    await unmount();

    element = await mount(<Chip label="B-4417" trailingIcon="action.copy" onPress={onPress} />);
    body = find(element, '[data-ds-slot="chip-body"]');
    expect(body.tagName).toBe("BUTTON");
    expect(body.hasAttribute("aria-pressed")).toBe(false);
    await act(async () => {
      await userEvent.click(body);
    });
    expect(onPress).toHaveBeenCalledTimes(2);
    await unmount();

    element = await mount(<Chip label="North yard" leadingIcon="object.map-pin" />);
    body = find(element, '[data-ds-slot="chip-body"]');
    expect(body.tagName).toBe("SPAN");
    expect(body.hasAttribute("role")).toBe(false);
    expect(element.querySelectorAll("button, [tabindex]").length).toBe(0);
  });

  it("removes through its own control, which never fires onPress, and through Delete and Backspace on the chip, which leave Space to press it", async () => {
    const onPress = vi.fn();
    const onRemove = vi.fn();
    const element = await mount(<Chip label="North yard" isRemovable onPress={onPress} onRemove={onRemove} />);
    const remove = find(element, '[data-ds-slot="chip-remove"]');
    expect(remove.getAttribute("aria-label")).toBe("Remove North yard");
    await act(async () => {
      await userEvent.click(remove);
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    const body = find(element, '[data-ds-slot="chip-body"]');
    for (const key of ["Delete", "Backspace"]) {
      await act(async () => {
        body.focus();
        body.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
    }
    expect(onRemove).toHaveBeenCalledTimes(3);
    expect(onPress).not.toHaveBeenCalled();
    const release = await pressWithKeyboard(body);
    await release();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(3);
  });

  it("scales the pill to 0.97 while pressed and lays the pressed fill over its glass, which keeps its blur; nothing scales under Reduce Motion (motion.press, ADR-0037 §5)", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const onPress = vi.fn();
      const element = await mount(
        <Backdrop kind="map">
          <Chip label="Depots" leadingIcon="object.map-pin" onPress={onPress} />
        </Backdrop>,
        { motion },
      );
      const chip = find(element, '[data-ds-slot="chip"]');
      const body = find(chip, '[data-ds-slot="chip-body"]');
      const blur = `blur(${String(tokenPx(chip, "--ds-material-glass-chip-blur"))}px) saturate(1)`;
      expect(getComputedStyle(chip).backdropFilter, motion).toBe(blur);
      const release = await pressWithKeyboard(body);
      expect(chip.hasAttribute("data-pressed"), motion).toBe(true);
      await settles(() => getComputedStyle(body).getPropertyValue("--ds--chip-press").trim(), tokenColor(body, "--ds-chip-bg-pressed"));
      if (motion === "standard") await settles(() => getComputedStyle(chip).scale, "0.97");
      else expect(getComputedStyle(chip).scale, motion).toBe("1");
      // The press is a layer over the glass: the chip shape is handed the same cell, and blurs the map as before.
      expect(chip.getAttribute("data-ds-surface-chip"), motion).toBe("glass");
      expect(getComputedStyle(chip).backdropFilter, motion).toBe(blur);
      await release();
      expect(onPress, motion).toHaveBeenCalledTimes(1);
      await settles(() => getComputedStyle(body).getPropertyValue("--ds--chip-press").trim(), TRANSPARENT);
      await unmount();
    }
  });

  it("is the glass chip over the map, with its blur, flat on the scheme's glass, and its own fill on the page (ADR-0036)", async () => {
    const element = await mount(
      <div>
        <Backdrop kind="map">
          <Chip label="Depots" leadingIcon="object.map-pin" onPress={noop} data-probe="map" />
        </Backdrop>
        <Surface material="glass" backdrop="map">
          <Chip label="In service" onPress={noop} data-probe="glass" />
        </Surface>
        <Chip label="Last 24 hours" onPress={noop} data-probe="page" />
      </div>,
    );
    const map = find(element, '[data-probe="map"]');
    expect(map.getAttribute("data-ds-surface-chip")).toBe("glass");
    const blur = tokenPx(map, "--ds-material-glass-chip-blur");
    expect(getComputedStyle(map).backdropFilter).toBe(`blur(${String(blur)}px) saturate(1)`);
    expect(map.querySelector('[data-ds-slot="surface-chip-edge"]')).not.toBeNull();
    await settles(() => getComputedStyle(find(map, '[data-ds-slot="chip-label"]')).color, tokenColor(map, "--ds-color-text-on-glass-fill"));
    await settles(() => getComputedStyle(find(map, '[data-ds-slot="chip-leading-icon"]')).color, tokenColor(map, "--ds-color-text-on-glass-fill"));
    const glass = find(element, '[data-probe="glass"]');
    expect(glass.hasAttribute("data-ds-surface-chip-flat")).toBe(true);
    expect(getComputedStyle(glass).backdropFilter).toBe("none");
    const page = find(element, '[data-probe="page"]');
    expect(page.getAttribute("data-ds-surface-chip")).toBe("own");
    expect(getComputedStyle(page).backdropFilter).toBe("none");
    await settles(() => getComputedStyle(page).getPropertyValue("--ds--surface-chip-fill").trim(), tokenColor(page, "--ds-chip-bg-rest"));
    await settles(() => getComputedStyle(find(page, '[data-ds-slot="chip-label"]')).color, tokenColor(page, "--ds-color-text-secondary"));
    // The stroke: the chip's own hairline on the page, the glass fill's over the map.
    const hairline = tokenPx(page, "--ds-border-hairline");
    await settles(() => getComputedStyle(find(page, '[data-ds-slot="chip-body"]')).boxShadow, `${tokenColor(page, "--ds-chip-border-rest")} 0px 0px 0px ${String(hairline)}px inset`);
    await settles(() => getComputedStyle(find(map, '[data-ds-slot="chip-body"]')).boxShadow, `${tokenColor(map, "--ds-color-border-on-glass-fill")} 0px 0px 0px ${String(hairline)}px inset`);
  });

  it.each([
    ["Reduce Transparency", { transparency: "reduce" }],
    ["Increase Contrast", { contrast: "more" }],
  ] as const)("falls back over the map under %s: raised over the page, no blur and no edge, every part its default cell and no check", async (_setting, axes) => {
    const element = await mount(
      <Backdrop kind="map">
        <Chip label="Depots" isSelected onPress={noop} data-probe="selected" />
      </Backdrop>,
      axes,
    );
    const chip = find(element, '[data-probe="selected"]');
    expect(chip.getAttribute("data-ds-surface-chip")).toBe("fallback");
    expect([chip.getAttribute("data-ds-surface"), chip.getAttribute("data-ds-backdrop")]).toEqual(["raised", "none"]);
    expect(getComputedStyle(chip).backdropFilter).toBe("none");
    expect(chip.querySelector('[data-ds-slot="surface-chip-edge"]')).toBeNull();
    expect(chip.querySelector('[data-ds-slot="chip-check"]')).toBeNull();
    await settles(() => getComputedStyle(chip).backgroundColor, tokenColor(chip, "--ds-color-bg-page"));
    await settles(() => getComputedStyle(chip).getPropertyValue("--ds--surface-chip-fill").trim(), tokenColor(chip, "--ds-color-bg-surface-raised"));
    await settles(() => getComputedStyle(find(chip, '[data-ds-slot="chip-label"]')).color, tokenColor(chip, "--ds-color-text-primary"));
    const strong = tokenPx(chip, "--ds-border-strong");
    await settles(() => getComputedStyle(find(chip, '[data-ds-slot="chip-body"]')).boxShadow, `${tokenColor(chip, "--ds-chip-border-selected")} 0px 0px 0px ${String(strong)}px inset`);
  });

  it("draws the focus ring outside the pill, and outside the remove control's glyph when that control has focus (accessibility.keyboard)", async () => {
    const element = await mount(<Chip label="North yard" isRemovable onPress={noop} onRemove={noop} />);
    const body = find(element, '[data-ds-slot="chip-body"]');
    const remove = find(element, '[data-ds-slot="chip-remove"]');
    for (const [target, name] of [
      [body, "the chip"],
      [remove, "the remove control"],
    ] as const) {
      await act(async () => {
        await userEvent.tab();
      });
      expect(document.activeElement, name).toBe(target);
      await vi.waitFor(() => {
        expect(target.hasAttribute("data-focus-visible"), name).toBe(true);
      });
      const style = getComputedStyle(target);
      expect(style.outlineStyle, name).toBe("solid");
      expect(Number.parseFloat(style.outlineWidth), name).toBe(tokenPx(target, "--ds-border-focus"));
      expect(style.outlineColor, name).toBe(tokenColor(target, "--ds-color-border-focus"));
    }
    // The remove control's ring is round, drawn around the glyph's box.
    expect(Number.parseFloat(getComputedStyle(remove).borderTopLeftRadius)).toBeGreaterThanOrEqual(remove.getBoundingClientRect().width / 2);
  });

  it("dims the whole pill and leaves the focus order when disabled, its remove control with it", async () => {
    const onPress = vi.fn();
    const onRemove = vi.fn();
    const element = await mount(<Chip label="Last 24 hours" isRemovable isDisabled onPress={onPress} onRemove={onRemove} />);
    const chip = find(element, '[data-ds-slot="chip"]');
    const probe = document.createElement("div");
    probe.style.opacity = "var(--ds-opacity-disabled)";
    element.append(probe);
    const disabled = getComputedStyle(probe).opacity;
    probe.remove();
    expect(Number(disabled)).toBeLessThan(1);
    expect(getComputedStyle(chip).opacity).toBe(disabled);
    const body = find(chip, '[data-ds-slot="chip-body"]') as HTMLButtonElement;
    const remove = find(chip, '[data-ds-slot="chip-remove"]') as HTMLButtonElement;
    expect([body.disabled, remove.disabled]).toEqual([true, true]);
    await act(async () => {
      await userEvent.click(body, { force: true });
      await userEvent.click(remove, { force: true });
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
