/**
 * Icons: the registry, drawn by `Icon`.
 *
 * `Icon` (spec/components/Icon.yaml) is a component of `@iiiivaska/prism-react`, so its spec examples, with
 * their materials and their one accessible name, are on the Components screen, staged as the gallery stages
 * them. This screen is the registry itself: every entry drawn by the real `Icon`, with a control for each of
 * Icon's own axes — its three boxes, its two weights, its three styles or the entry's `defaultStyle` passed
 * as the prop — and a right-to-left direction, under which Icon's own stylesheet mirrors the glyphs the
 * registry marks `rtlMirror`. Each glyph is `tone: primary` and carries no `label`, so it is hidden from
 * assistive technology; the id, the documentation label and the tags beside it are the registry's rows.
 *
 * The ladder panel is registry data that no Icon prop reaches: the six rungs of `iconWeights`, the four
 * boxes of `iconSizes` (xs is no Icon size) and the style cuts, drawn at build time from the registry's
 * Phosphor binding (`virtual:prism/glyphs`, plugins/glyphs.ts) and labelled as the registry's, not as the
 * component. A registry change moves both panels with no edit here.
 *
 * Landing `Icon` expired this screen's reference-distance clearance: P5-3 cleared it as a registry
 * preview that no component drew (docs/direction-board/reference-distance-showcase.md §10, condition 2,
 * finding SD-1), and the ADR-0015 rule 3 review has to be re-run for it before a release ships it. SD-1's
 * do-not-drift note still holds: no search, filter, copy, download or new per-icon affordance.
 */
import { useState, type ReactNode } from "react";
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
 * The Phosphor cut an entry, a registry weight and a style select: the style wins when it names one (ADR-0013
 * decision 4), except `filled` on an entry with no filled drawing, which is the weight's cut (ADR-0035).
 */
function styleCut(name: IconName, style: IconStyle): string | null {
  return style === "filled" && !iconRegistry[name].fill ? null : iconStyles[style];
}

function cutFor(name: IconName, weight: IconWeight, style: IconStyle): string {
  return styleCut(name, style) ?? iconWeights[weight].phosphor;
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
          weight and style chosen here. Its spec examples, on their materials and with the one name a glyph can carry, are on the Components
          screen. The ladder below is the registry&apos;s own data, which no Icon prop reaches.
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
                each entry&apos;s default
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
          <code>display</code> draws only at <code>lg</code>; at <code>sm</code> and <code>md</code> Icon renders the control cut (Icon.yaml behavior
          3). A filled or duotone glyph has one cut on the web, so the weight changes nothing there (behavior 6), except on an entry the registry marks{" "}
          <code>fill: false</code>, whose <code>filled</code> is its outline on both stacks (ADR-0035). The spec&apos;s style default is{" "}
          <code>outline</code>; &ldquo;each entry&apos;s default&rdquo; passes the registry&apos;s <code>defaultStyle</code> as the prop.
        </p>
      </Panel>

      <Panel title="The registry">
        <div className="ds-sc-icon-grid" dir={direction}>
          {entries.map(([name, entry]) => (
            <div key={name} className="ds-sc-icon-cell">
              <div className="ds-sc-icon-box">
                <Icon name={name} size={size} weight={weight} style={style === "default" ? entry.defaultStyle : style} tone="primary" />
              </div>
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
                {entry.defaultStyle} · {entry.phosphor}
                {entry.rtlMirror ? " · mirrors in rtl" : ""}
              </span>
            </div>
          ))}
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
