/**
 * Icons: the registry as data, with a preview.
 *
 * `Icon` (spec/components/Icon.yaml) is implemented on neither stack, and the glyph that Button and
 * Card draw is internal and decorative, so this screen cannot render a Prism component and does not
 * pretend to. What it renders is drawn from the registry's own binding — `iconRegistry[id].phosphor`,
 * the Phosphor name ADR-0013 decision 2 gives it — and is labelled as a preview. The label stops
 * being true the moment `Icon` enters a manifest, and then the Components screen owns it.
 *
 * The weight ladder, the styles and the four boxes are the registry's own tables (`iconWeights`,
 * `iconStyles`, `iconSizes`), so a registry change moves this screen with no edit here.
 */
import { useState, type ReactNode } from "react";
import { iconRegistry, iconSizes, iconSource, iconStyles, iconWeights, type IconName, type IconSize, type IconStyle, type IconWeight } from "@iiiivaska/prism-react";
import { glyphs } from "virtual:prism/glyphs";
import { components } from "virtual:prism/catalog";
import { Panel, Screen, Tag } from "../ui.tsx";

const weightNames = Object.keys(iconWeights) as IconWeight[];
const styleNames = Object.keys(iconStyles) as IconStyle[];
const sizeNames = Object.keys(iconSizes) as IconSize[];

/** The Phosphor cut a weight and a style select: the style wins when it names one (ADR-0013 decision 4). */
function cutFor(weight: IconWeight, style: IconStyle): string {
  return iconStyles[style] ?? iconWeights[weight].phosphor;
}

function Glyph(props: { readonly name: string; readonly cut: string; readonly px: number; readonly mirror?: boolean }): ReactNode {
  const markup = glyphs[props.name]?.[props.cut];
  if (markup === undefined) return <span className="ds-sc-glyph-missing">?</span>;
  return (
    <svg
      viewBox="0 0 256 256"
      width={props.px}
      height={props.px}
      role="presentation"
      className="ds-sc-glyph"
      style={{ fill: "currentColor", transform: props.mirror === true ? "scaleX(-1)" : undefined }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export function Icons(): ReactNode {
  const [weight, setWeight] = useState<IconWeight>("regular");
  const [style, setStyle] = useState<IconStyle | "default">("default");
  const [size, setSize] = useState<IconSize>("lg");
  const [mirror, setMirror] = useState(false);

  const spec = components.find((candidate) => candidate.name === "Icon");
  const entries = Object.entries(iconRegistry) as [IconName, (typeof iconRegistry)[IconName]][];
  const ladderIcon = entries[0]?.[0];

  return (
    <Screen
      title="Icons"
      lead={
        <>
          {entries.length} registry entries ({iconSource.package} {iconSource.version}). Each glyph below is drawn from the registry&apos;s own
          Phosphor binding, not by a Prism component.
        </>
      }
    >
      <Panel>
        <p className="ds-sc-note">
          <Tag tone="info">preview</Tag>{" "}
          <code>Icon</code>
          {spec === undefined ? "" : ` (spec/components/Icon.yaml, specVersion ${spec.specVersion})`} is implemented on neither stack — it is in
          no implementation manifest — and the glyph that Button and Card draw is internal and always decorative. So these are the registry rows
          with a picture beside them, not a component.
        </p>
      </Panel>

      <Panel title="Cut">
        <div className="ds-sc-controls">
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">weight</span>
            <div className="ds-sc-segments">
              {weightNames.map((name) => (
                <button key={name} type="button" data-selected={weight === name ? "" : undefined} onClick={() => { setWeight(name); }}>
                  {name} · {iconWeights[name].number}
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
            <span className="ds-sc-axis-name">box</span>
            <div className="ds-sc-segments">
              {sizeNames.map((name) => (
                <button key={name} type="button" data-selected={size === name ? "" : undefined} onClick={() => { setSize(name); }}>
                  {name} · {iconSizes[name]}px
                </button>
              ))}
            </div>
          </div>
          <div className="ds-sc-axis">
            <span className="ds-sc-axis-name">direction</span>
            <div className="ds-sc-segments">
              <button type="button" data-selected={mirror ? undefined : ""} onClick={() => { setMirror(false); }}>
                ltr
              </button>
              <button type="button" data-selected={mirror ? "" : undefined} onClick={() => { setMirror(true); }}>
                rtl
              </button>
            </div>
          </div>
        </div>
      </Panel>

      {ladderIcon === undefined ? null : (
        <Panel title="The weight ladder" note={`Every weight of ${ladderIcon}, and every box, at the registry's own numbers.`}>
          <div className="ds-sc-ladder">
            {weightNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <Glyph name={ladderIcon} cut={cutFor(name, "outline")} px={32} />
                <code className="ds-sc-path">
                  {name} · {iconWeights[name].number} · {iconWeights[name].phosphor}
                </code>
              </div>
            ))}
          </div>
          <div className="ds-sc-ladder">
            {sizeNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <Glyph name={ladderIcon} cut={cutFor(weight, "outline")} px={iconSizes[name]} />
                <code className="ds-sc-path">
                  {name} · {iconSizes[name]}px
                </code>
              </div>
            ))}
          </div>
          <div className="ds-sc-ladder">
            {styleNames.map((name) => (
              <div key={name} className="ds-sc-ladder-cell">
                <Glyph name={ladderIcon} cut={cutFor(weight, name)} px={32} />
                <code className="ds-sc-path">
                  {name} · {iconStyles[name] ?? "the weight's cut"}
                </code>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="The registry">
        <div className="ds-sc-icon-grid">
          {entries.map(([name, entry]) => (
            <div key={name} className="ds-sc-icon-cell">
              <div className="ds-sc-icon-box">
                <Glyph
                  name={name}
                  cut={cutFor(weight, style === "default" ? entry.defaultStyle : style)}
                  px={iconSizes[size]}
                  mirror={mirror && entry.rtlMirror}
                />
              </div>
              <code className="ds-sc-path">{name}</code>
              <span className="ds-sc-icon-meta ds-sc-mono">{entry.label}</span>
              <span className="ds-sc-icon-meta">{entry.categories.join(" · ")}</span>
              <span className="ds-sc-icon-meta ds-sc-dim">{entry.tags.join(", ")}</span>
              <span className="ds-sc-icon-meta ds-sc-mono ds-sc-dim">
                {entry.defaultStyle} · {entry.phosphor}
                {entry.rtlMirror ? " · mirrors in rtl" : ""}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </Screen>
  );
}
