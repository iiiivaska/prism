/**
 * Browser behaviour of Button and Card, in Vitest browser mode (Chromium): what the Node suites can
 * only read from the stylesheets, computed on real elements.
 *
 * - Button.yaml behaviors 2, 3, 5 and 6: the hit region per modality with an unchanged visual box, the
 *   width kept while loading, labels on one line, hover only under pointer, the press scale.
 * - Card.yaml behaviors 2, 4, 8 and 10 and the action affordance: the glyph hidden until hover under
 *   pointer and always shown under touch, the hover overlay on a pressable card and on no other (the
 *   one place both stacks read behavior 8 more narrowly than it is written), the pressed overlay and
 *   scale, the radius cell per density, the selected lift and outline.
 * - ADR-0023 rule 9 under a forced reduced context: no press scale on either component, Button's danger
 *   substitute fill, Card's selection crossfading over motion.duration.base.
 * - ADR-0021 rule 8: Button computes `font-synthesis: none`.
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
import { Button, Card, Theme, type Density, type Modality, type Motion } from "@iiiivaska/prism-react";

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
  const metric = { title: "Line output", caption: "Last 24 hours", hero: { value: "86", trailing: ".4", unit: "%" } } as const;
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

  it("is one button: pressing fires onAction, with the overlay and the scale outside Reduce Motion", async () => {
    for (const motion of ["standard", "reduce"] as const) {
      const onAction = vi.fn();
      const element = await mount(<Card {...metric} onAction={onAction} />, { motion });
      const card = find(element, ".ds-card");
      expect(card.getAttribute("role")).toBe("button");
      const release = await pressWithKeyboard(card);
      expect(card.hasAttribute("data-pressed"), motion).toBe(true);
      await settles(() => getComputedStyle(find(card, "[data-ds-slot='card-overlay']")).backgroundColor, /^(?!rgba\(0, 0, 0, 0\)$)/);
      if (motion === "standard") await settles(() => getComputedStyle(card).scale, "0.98");
      else expect(getComputedStyle(card).scale).toBe("1");
      await release();
      expect(onAction, motion).toHaveBeenCalledTimes(1);
      await unmount();
    }
  });

  it("gives a card with nothing to press no hover overlay (behavior 8 against both stacks)", async () => {
    // A deliberate pin, not a mirror of the code. Card.yaml behavior 8 and notes.platform.macos state the
    // hover overlay with no pressability condition, but both implementations gate it on one: the Apple
    // side through the shared rule of `DSControlAppearance.showsHover` ("hover exists only under pointer
    // modality, and only on a control that takes input"), this one through `pressable && isHovered`. A
    // card whose `action` is `custom` (only its button is pressable) or `none` (a group) would otherwise
    // light up whole for a press it does not have. Two implementations against one spec sentence is a
    // spec wording fix; this test says which behaviour ships until that lands, so the next reader finds a
    // decision rather than an omission.
    for (const action of ["custom", "none"] as const) {
      const element = await mount(<Card {...metric} action={action} />, { modality: "pointer" });
      const card = find(element, ".ds-card");
      expect(card.getAttribute("role"), action).toBe("group");
      const overlay = (): string => getComputedStyle(find(card, "[data-ds-slot='card-overlay']")).backgroundColor;
      await act(async () => {
        await userEvent.hover(card);
      });
      await sleep(400);
      expect(card.hasAttribute("data-hovered"), action).toBe(false);
      expect(card.hasAttribute("data-pressed"), action).toBe(false);
      expect(overlay(), action).toMatch(TRANSPARENT);
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

  it("takes comp.card.radius.compact at compact density and comp.card.radius.regular at regular (behavior 10)", async () => {
    for (const density of ["compact", "regular"] as const) {
      const element = await mount(<Card title="Queued" />, { density });
      const card = find(element, ".ds-card");
      const expected = tokenPx(card, density === "compact" ? "--ds-card-radius-compact" : "--ds-card-radius-regular");
      expect(Number.parseFloat(getComputedStyle(card).borderTopLeftRadius), density).toBeCloseTo(expected, 3);
      expect(Number.parseFloat(getComputedStyle(card).paddingTop), density).toBeCloseTo(tokenPx(card, "--ds-card-padding"), 3);
      await unmount();
    }
  });

  it("lifts and outlines a selected card, crossfading both under Reduce Motion (behavior 4)", async () => {
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
