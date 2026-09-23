/**
 * Backdrop (ADR-0036 §8): an app declares the page over media it paints itself.
 *
 * - It publishes `(page, kind, parent.depth)`, at the root and inside a Surface, and the nearest publisher wins:
 *   a Backdrop inside a Surface overrides the Surface's context, and a Surface inside a Backdrop publishes its own.
 * - It renders no element and passes `depth` through, so `Surface > Backdrop > Surface` keeps the inner Surface's
 *   `data-ds-depth="odd"` and `data-ds-nested`, as `Surface > Surface` does.
 * - No implemented reader tells the page over media from the plain page (ADR-0036, "What the repository does"):
 *   Text, Icon, Divider, Badge, Button and IconButton render the same markup inside `<Backdrop kind="map">` as on
 *   the plain page, apart from the `data-ds-backdrop` Icon writes onto its own box. This is why P4-6 moves no
 *   baseline.
 * - `none` is not a kind: a reset inside a vivid or glass Surface would hand its children the wrong family.
 */
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import * as tokens from "@iiiivaska/prism-tokens/tokens";
import {
  Backdrop,
  Badge,
  Button,
  Divider,
  Icon,
  IconButton,
  Surface,
  Text,
  Theme,
  badgeEmphases,
  badgeTones,
  buttonVariants,
  dividerOrientations,
  glyphTones,
  iconButtonVariants,
  textRoles,
  textTones,
  useSurfaceContext,
  type BackdropProps,
} from "../src/index.ts";

const kinds = ["image", "map", "vivid"] as const satisfies readonly BackdropProps["kind"][];

function Probe(): ReactNode {
  const { material, backdrop, depth } = useSurfaceContext();
  return <i id="published">{`${material} ${backdrop} ${depth}`}</i>;
}

function published(html: string): string | undefined {
  return /<i id="published">([^<]*)<\/i>/.exec(html)?.[1];
}

function render(node: ReactNode): string {
  return renderToStaticMarkup(<Theme tokens={tokens}>{node}</Theme>);
}

/** The attributes of every `.ds-surface` element, in document order. */
function surfaces(html: string): Record<string, string>[] {
  return [...html.matchAll(/<div([^>]*class="ds-surface"[^>]*)>/g)].map((match) =>
    Object.fromEntries([...(match[1] ?? "").matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [attribute[1] ?? "", attribute[2] ?? ""])),
  );
}

describe("what Backdrop publishes (ADR-0036 §8)", () => {
  it("has exactly three kinds, and none is not one of them", () => {
    expectTypeOf<BackdropProps["kind"]>().toEqualTypeOf<"image" | "map" | "vivid">();
    // @ts-expect-error `none` is not a Backdrop kind: a reset would hand a Surface's children the wrong family.
    const reset = <Backdrop kind="none" />;
    expect(isValidElement(reset)).toBe(true);
  });

  it.each(kinds)("publishes (page, %s) at the root, with the root's depth", (kind) => {
    expect(published(render(<Backdrop kind={kind}><Probe /></Backdrop>))).toBe(`page ${kind} 0`);
  });

  it.each(kinds)("publishes (page, %s) inside a Surface, with the Surface's depth: the nearest publisher wins", (kind) => {
    const html = render(
      <Surface material="glass" backdrop="map">
        <Surface material="solid">
          <Backdrop kind={kind}>
            <Probe />
          </Backdrop>
        </Surface>
      </Surface>,
    );
    expect(published(html)).toBe(`page ${kind} 2`);
  });

  it.each(["none", "photo", "", undefined])(
    "ignores a kind that is not media (%j) when an untyped caller passes one: the parent's context passes through",
    (kind) => {
      // The type forbids it; this is the JavaScript caller, or a cast. A reset to (page, none) inside a vivid or glass
      // Surface would hand its children the wrong family (ADR-0036 §8.2), so the parent's context is kept instead.
      const untyped = { kind } as unknown as BackdropProps;
      const html = render(
        <Surface material="glass" backdrop="map">
          <Backdrop {...untyped}>
            <Probe />
          </Backdrop>
        </Surface>,
      );
      expect(published(html)).toBe("glass map 1");
      expect(published(render(<Backdrop {...untyped}><Probe /></Backdrop>))).toBe("page none 0");
    },
  );

  it("gives way to the nearest Backdrop inside it", () => {
    const html = render(
      <Backdrop kind="image">
        <Backdrop kind="map">
          <Probe />
        </Backdrop>
      </Backdrop>,
    );
    expect(published(html)).toBe("page map 0");
  });

  it.each(kinds)("lets a Surface inside a %s Backdrop publish its own context", (kind) => {
    const html = render(
      <Backdrop kind={kind}>
        <Surface material="glass" backdrop="map">
          <Probe />
        </Surface>
      </Backdrop>,
    );
    expect(published(html)).toBe("glass map 1");
  });

  it("renders no element: its children are its whole markup", () => {
    for (const kind of kinds) {
      expect(renderToStaticMarkup(<Backdrop kind={kind}><b>content</b></Backdrop>)).toBe("<b>content</b>");
    }
    expect(renderToStaticMarkup(<Backdrop kind="map" />)).toBe("");
  });

  it("passes depth through: Surface > Backdrop > Surface keeps the nested Surface's parity", () => {
    const direct = surfaces(
      render(
        <Surface material="solid">
          <Surface material="raised">content</Surface>
        </Surface>,
      ),
    );
    const through = surfaces(
      render(
        <Surface material="solid">
          <Backdrop kind="map">
            <Surface material="raised">content</Surface>
          </Backdrop>
        </Surface>,
      ),
    );
    expect(through).toEqual(direct);
    expect(through[0]?.["data-ds-depth"]).toBe("even");
    expect(through[0]?.["data-ds-nested"]).toBeUndefined();
    expect(through[1]?.["data-ds-depth"]).toBe("odd");
    expect(through[1]?.["data-ds-nested"]).toBe("");
  });
});

/**
 * One element per cell the component keys on the ground: every tone, role, variant, orientation and emphasis the
 * package exports, each staged as a spec example stages it on the page.
 */
const onThePage: readonly (readonly [string, ReactElement])[] = [
  ...textRoles.flatMap((role) => textTones.map((tone) => [`Text ${role} ${tone}`, <Text role={role} tone={tone}>1,234</Text>] as const)),
  ...glyphTones.map((tone) => [`Icon ${tone}`, <Icon name="nav.back" tone={tone} />] as const),
  ...glyphTones.map((tone) => [`Icon ${tone}, named`, <Icon name="object.lock" tone={tone} label="Locked for editing" isDecorative={false} />] as const),
  ...dividerOrientations.map((orientation) => [`Divider ${orientation}`, <Divider orientation={orientation} />] as const),
  ...badgeTones.flatMap((tone) => badgeEmphases.map((emphasis) => [`Badge ${tone} ${emphasis}`, <Badge count={12} tone={tone} emphasis={emphasis} />] as const)),
  ...buttonVariants.map((variant) => [`Button ${variant}`, <Button variant={variant} label="Send invoice" leadingIcon="action.add" trailingIcon="nav.forward" onPress={() => {}} />] as const),
  ...iconButtonVariants.map((variant) => [`IconButton ${variant}`, <IconButton variant={variant} glyph="nav.back" label="Back" onPress={() => {}} />] as const),
  ["IconButton selected", <IconButton variant="ghost" glyph="nav.back" label="Back" isSelected onPress={() => {}} />],
];

/** Every start tag that carries `data-ds-backdrop`, in document order. */
function backdropTags(html: string): string[] {
  return [...html.matchAll(/<[a-z]+[^>]*\bdata-ds-backdrop="[^"]*"[^>]*>/g)].map((match) => match[0]);
}

describe("the page over media reads as the page (ADR-0036: P4-6 moves no baseline)", () => {
  it.each(kinds)("reaches the parts that write the ground: Icon, Button's glyph and IconButton's glyph write %s", (kind) => {
    for (const element of [<Icon name="nav.back" />, <Button label="Send invoice" leadingIcon="action.add" onPress={() => {}} />, <IconButton glyph="nav.back" label="Back" onPress={() => {}} />]) {
      const tags = backdropTags(render(<Backdrop kind={kind}>{element}</Backdrop>));
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(tag, tag).toContain(`data-ds-surface="page" data-ds-backdrop="${kind}"`);
    }
  });

  it.each(onThePage.flatMap(([name, element]) => kinds.map((kind) => [name, kind, element] as const)))("%s renders the same markup inside <Backdrop kind=\"%s\">", (_name, kind, element) => {
    const plain = render(createElement("main", null, element));
    const declared = render(createElement("main", null, <Backdrop kind={kind}>{element}</Backdrop>));
    // Only Icon's own box writes the backdrop, and it writes the kind it read; every other attribute is the same.
    for (const tag of backdropTags(declared)) {
      expect(tag, tag).toMatch(/\bclass="ds-icon(?: [^"]*)?"/);
      expect(tag, tag).toContain(`data-ds-backdrop="${kind}"`);
    }
    expect(backdropTags(declared).length).toBe(backdropTags(plain).length);
    expect(declared.replaceAll(`data-ds-backdrop="${kind}"`, 'data-ds-backdrop="none"')).toBe(plain);
  });
});
