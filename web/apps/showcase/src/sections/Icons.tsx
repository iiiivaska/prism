/**
 * Icons: the registry, drawn by `Icon`.
 *
 * `Icon` (spec/components/Icon.yaml) is a component of `@iiiivaska/prism-react`, so its spec examples, with
 * their materials and their one accessible name, are on the Components screen, staged as the gallery stages
 * them. This screen is the registry itself, and it is the same screen as the Apple app's `DSIconsScreen`
 * (P4-D4; docs/showcase.md, "The Icons screen"):
 *
 * - Four controls, each one of Icon's own axes, for the whole grid at once: its three boxes, its two weights,
 *   its three styles or the entry's `defaultStyle` passed as the prop ("entry default"), and a right-to-left
 *   direction set on the grid alone, under which Icon's own stylesheet mirrors the glyphs the registry marks
 *   `rtlMirror` for the web.
 * - The registry: every entry drawn by the real `Icon`, `tone: primary` and no `label`, so hidden from
 *   assistive technology, and beside it the registry's row, left to right in either direction: id, label
 *   key, categories, tags, default style, binding, and the `fill: false` and mirroring marks. An entry marked
 *   `fill: false` asked for `filled` draws its outline on both stacks (ADR-0035), and its cell says so, so
 *   the style control never looks broken.
 * - The ladder: registry data that no Icon prop reaches — the six rungs of `iconWeights`, the four boxes of
 *   `iconSizes` (xs is no Icon size) and the style cuts — drawn at build time from the registry's Phosphor
 *   binding (`virtual:prism/glyphs`, plugins/glyphs.ts) for the registry's first entry, and labelled as the
 *   registry's, not as the component. A registry change moves both panels with no edit here.
 *
 * Nothing here acts on one icon: a cell is not a link and there is no per-icon page. Finding SD-1 of
 * docs/direction-board/reference-distance-showcase.md names search, filter, copy, copy-as-SVG, download and
 * a per-icon page as what makes an icon browser, and the screen has none of them; the Apple screen's detail
 * sheet was such a page and went in P4-D4. Landing `Icon` expired this screen's reference-distance clearance
 * (§10, condition 2), and the ADR-0015 rule 3 review has to be re-run for it before a release ships it.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Icon,
  glyphSizes,
  glyphWeights,
  iconRegistry,
  iconSizes,
  iconSource,
  iconStyles,
  iconWeights,
  type GlyphSize,
  type GlyphWeight,
  type IconName,
  type IconSize,
  type IconStyle,
  type IconWeight,
} from "@iiiivaska/prism-react";
import { glyphs } from "virtual:prism/glyphs";
import { components } from "virtual:prism/catalog";
import { Panel, Screen, Tag } from "../ui.tsx";

const weightNames = Object.keys(iconWeights) as IconWeight[];
const styleNames = Object.keys(iconStyles) as IconStyle[];
const sizeNames = Object.keys(iconSizes) as IconSize[];

/** The token each of Icon's weights binds (Icon.yaml `tokens.root.weight`). */
const weightTokens: Readonly<Record<GlyphWeight, string>> = { control: "icon.weight", display: "icon.weight-display" };

/**
 * ADR-0035, as Icon's own `drawnStyle` (web/packages/react/src/icon/weight.ts, not exported) applies it:
 * `filled` on an entry with no filled drawing is its outline. The cell reads it to say so; the ladder reads
 * it so that the registry's drawing of a style is the one Icon would draw.
 */
function drawnStyle(name: IconName, style: IconStyle): IconStyle {
  return style === "filled" && !iconRegistry[name].fill ? "outline" : style;
}

/**
 * The Phosphor cut an entry, a registry weight and a style select: the style wins when it names one (ADR-0013
 * decision 4), except `filled` on an entry with no filled drawing, which is the weight's cut (ADR-0035).
 */
function styleCut(name: IconName, style: IconStyle): string | null {
  return iconStyles[drawnStyle(name, style)];
}

function cutFor(name: IconName, weight: IconWeight, style: IconStyle): string {
  return styleCut(name, style) ?? iconWeights[weight].phosphor;
}

/**
 * Whether an element is drawn mirrored left to right: the `scale` Icon's stylesheet writes for a mirrored
 * glyph, or a transform that does the same. Read off the painted element rather than taken from the
 * registry, because the registry says what should flip and only the document says what did.
 */
function isFlipped(element: Element): boolean {
  const style = getComputedStyle(element);
  if (style.scale.trim().startsWith("-")) return true;
  return style.transform !== "none" && new DOMMatrixReadOnly(style.transform).a < 0;
}

/** One cut of the registry's binding, as data: the ladder, not the component. */
function RegistryCut(props: { readonly name: string; readonly cut: string; readonly px: number }): ReactNode {
  const markup = glyphs[props.name]?.[props.cut];
  if (markup === undefined) return <span className="ds-sc-glyph-missing">?</span>;
  return (
    <svg
      viewBox="0 0 256 256"
      width={props.px}
      height={props.px}
      role="presentation"
      className="ds-sc-glyph"
      style={{ fill: "currentColor" }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export function Icons(): ReactNode {
  const [weight, setWeight] = useState<GlyphWeight>("control");
  const [style, setStyle] = useState<IconStyle | "default">("default");
  const [size, setSize] = useState<GlyphSize>("lg");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");

  const spec = components.find((candidate) => candidate.name === "Icon");
  const entries = Object.entries(iconRegistry) as [IconName, (typeof iconRegistry)[IconName]][];
  const ladderIcon = entries[0]?.[0];
  const unfilled = entries.filter(([, entry]) => !entry.fill).length;
  const mirrored = entries.filter(([, entry]) => entry.rtlMirror).length;

  // Under rtl, count the glyphs of the entries the registry marks `rtlMirror` that the document actually
  // draws flipped, the way src/axis-probe.ts measures an axis instead of trusting the runtime.
  const grid = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState<number | null>(null);
  useEffect(() => {
    const cells = grid.current?.querySelectorAll(".ds-sc-icon-cell[data-sc-mirrors] svg") ?? [];
    setFlipped(direction === "rtl" ? [...cells].filter(isFlipped).length : null);
  }, [direction, size, weight, style]);

  return (
    <Screen
      title="Icons"
      lead={
        <>
          {entries.length} registry entries ({iconSource.package} {iconSource.version}), each drawn by <code>Icon</code>.
        </>
      }
    >
      <Panel>
        <p className="ds-sc-note">
          <Tag tone="ok">Icon</Tag> Every glyph in the registry panel is <code>Icon</code>
          {spec === undefined ? "" : ` (spec/components/Icon.yaml, specVersion ${spec.specVersion})`} with <code>tone: primary</code>, at the box,
          weight, style and direction chosen here. Its spec examples, on their materials and with the one name a glyph can carry, are on the
          Components screen. The ladder at the end is the registry&apos;s own data, which no Icon prop reaches. Nothing here acts on one icon: a
          cell is the registry&apos;s row with a picture.
        </p>
      </Panel>

      <Panel title="Icon's axes">
        <div className="ds-sc-controls">
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">size</span>
            <div className="ds-sc-segments">
              {glyphSizes.map((name) => (
                <button key={name} type="button" data-selected={size === name ? "" : undefined} onClick={() => { setSize(name); }}>
                  {name} · {iconSizes[name]}px
                </button>
              ))}
            </div>
          </div>
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">weight</span>
            <div className="ds-sc-segments">
              {glyphWeights.map((name) => (
                <button key={name} type="button" data-selected={weight === name ? "" : undefined} onClick={() => { setWeight(name); }}>
                  {name} · {weightTokens[name]}
                </button>
              ))}
            </div>
          </div>
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">style</span>
            <div className="ds-sc-segments">
              <button type="button" data-selected={style === "default" ? "" : undefined} onClick={() => { setStyle("default"); }}>
                entry default
              </button>
              {styleNames.map((name) => (
                <button key={name} type="button" data-selected={style === name ? "" : undefined} onClick={() => { setStyle(name); }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">direction</span>
            <div className="ds-sc-segments">
              {(["ltr", "rtl"] as const).map((name) => (
                <button key={name} type="button" data-selected={direction === name ? "" : undefined} onClick={() => { setDirection(name); }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="ds-sc-note">
          <strong>weight</strong> — <code>display</code> draws only at <code>lg</code>; at <code>sm</code> and <code>md</code> Icon renders the
          control cut (Icon.yaml behavior 3). A filled or duotone glyph has one cut on the web, so the weight changes nothing there (behavior 6).
        </p>
        <p className="ds-sc-note">
          <strong>style</strong> — the spec&apos;s default is <code>outline</code>; entry default passes each entry&apos;s registry{" "}
          <code>defaultStyle</code> as the prop. {unfilled} of {entries.length} entries are marked <code>fill: false</code>: they have no filled
          drawing, so <code>filled</code> draws their outline on both stacks (ADR-0035), and their cells say so. <code>duotone</code> is each
          stack&apos;s own drawing — Phosphor&apos;s duotone cut here, hierarchical rendering on Apple — and ADR-0035 left that pair unaudited.
        </p>
        <p className="ds-sc-note">
          <strong>direction</strong> — <code>rtl</code> sets <code>dir</code> on the grid alone. Icon&apos;s stylesheet is meant to flip the {mirrored}{" "}
          {mirrored === 1 ? "entry" : "entries"} the registry marks <code>rtlMirror</code> for the web (Icon.yaml behavior 11). The ids and facts
          stay left to right.{" "}
          {flipped === null ? (
            "Pick rtl to measure it."
          ) : flipped === mirrored ? (
            <>
              <Tag tone="ok">measured</Tag> {flipped} of {mirrored} drawn flipped in this document.
            </>
          ) : (
            <>
              <Tag tone="warn">measured</Tag> {flipped} of {mirrored} drawn flipped in this document, where behavior 11 asks for all of them — a
              defect of the web stylesheet, not of this control (docs/showcase.md, &ldquo;The Icons screen&rdquo;, says why).
            </>
          )}
        </p>
      </Panel>

      <Panel title="The registry">
        <div ref={grid} className="ds-sc-icon-grid" dir={direction}>
          {entries.map(([name, entry]) => {
            const requested = style === "default" ? entry.defaultStyle : style;
            return (
              <div key={name} className="ds-sc-icon-cell" data-sc-mirrors={entry.rtlMirror ? "" : undefined}>
                <div className="ds-sc-icon-box">
                  <Icon name={name} size={size} weight={weight} style={requested} tone="primary" />
                </div>
                {drawnStyle(name, requested) === requested ? null : (
                  <span className="ds-sc-icon-meta" dir="ltr">
                    <Tag tone="info">fill: false → outline</Tag>
                  </span>
                )}
                <code className="ds-sc-path" dir="ltr">
                  {name}
                </code>
                <span className="ds-sc-icon-meta ds-sc-mono" dir="ltr">
                  {entry.label}
                </span>
                <span className="ds-sc-icon-meta" dir="ltr">
                  {entry.categories.join(" · ")}
                </span>
                <span className="ds-sc-icon-meta ds-sc-dim" dir="ltr">
                  {entry.tags.join(", ")}
                </span>
                <span className="ds-sc-icon-meta ds-sc-mono ds-sc-dim" dir="ltr">
                  default {entry.defaultStyle} · {entry.phosphor}
                  {entry.fill ? "" : " · fill: false"}
                  {entry.rtlMirror ? " · mirrors in rtl" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {ladderIcon === undefined ? null : (
        <Panel
          title="Registry data: the ladder"
          note={`Every rung, box and style cut the registry defines for ${ladderIcon}, drawn from its Phosphor binding. Icon reaches two rungs, three boxes and the three styles through its props; the rest is here as the registry's data, not as the component.`}
        >
          <p className="ds-sc-note">
            <Tag tone="info">registry</Tag> These are the registry&apos;s own tables (<code>iconWeights</code>, <code>iconSizes</code>,{" "}
            <code>iconStyles</code>), not <code>Icon</code>.
          </p>
          <p className="ds-sc-ladder-name">weights</p>
          <div className="ds-sc-ladder">
            {weightNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <RegistryCut name={ladderIcon} cut={cutFor(ladderIcon, name, "outline")} px={32} />
                <code className="ds-sc-path">
                  {name} · {iconWeights[name].number} · {iconWeights[name].phosphor}
                </code>
              </div>
            ))}
          </div>
          <p className="ds-sc-ladder-name">boxes</p>
          <div className="ds-sc-ladder">
            {sizeNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <RegistryCut name={ladderIcon} cut={cutFor(ladderIcon, "regular", "outline")} px={iconSizes[name]} />
                <code className="ds-sc-path">
                  {name} · {iconSizes[name]}px
                </code>
              </div>
            ))}
          </div>
          <p className="ds-sc-ladder-name">styles</p>
          <div className="ds-sc-ladder">
            {styleNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <RegistryCut name={ladderIcon} cut={cutFor(ladderIcon, "regular", name)} px={32} />
                <code className="ds-sc-path">
                  {name} · {styleCut(ladderIcon, name) ?? (iconStyles[name] === null ? "the weight's cut" : "the weight's cut: no filled drawing")}
                </code>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Screen>
  );
}
