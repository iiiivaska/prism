/**
 * One specimen per DTCG `type` (docs/showcase.md §1). The renderer is picked by the token's `type`,
 * never by its name, so a new token group gets a screen for free and only a new *type* would need
 * code here.
 *
 * Every specimen paints the token through its own CSS variable — `background: var(--ds-color-accent)`
 * — rather than through a value copied into JavaScript, so what you see is what the document
 * resolved. The motion specimens replay on press.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import type { TokenManifestEntry } from "../plugins/catalog.ts";

/** The reference duration the easing specimens run at, itself a token. */
const EASING_DEMO_DURATION = "var(--ds-motion-duration-slower)";

function cssValue(entry: TokenManifestEntry): string {
  return entry.css === null ? "" : `var(${entry.css})`;
}

/** The six sub-properties a `typography` token publishes, by the suffix of its variable. */
function typographyStyle(entry: TokenManifestEntry): CSSProperties {
  const base = `--ds-${entry.path.replaceAll(".", "-")}`;
  return {
    fontFamily: `var(${base}-font-family)`,
    fontSize: `var(${base}-font-size)`,
    fontWeight: `var(${base}-font-weight)`,
    lineHeight: `var(${base}-line-height)`,
    letterSpacing: `var(${base}-letter-spacing)`,
    fontVariantNumeric: `var(${base}-font-variant-numeric)`,
  };
}

/**
 * A motion specimen is at rest until it is pressed, and replays on every press. Playing on mount
 * would leave every dot frozen wherever its own duration happened to end, which reads as a layout
 * accident rather than as a value.
 */
function Replay(props: { readonly children: (run: number) => ReactNode }): ReactNode {
  const [run, setRun] = useState(0);
  return (
    <button
      type="button"
      className="ds-sc-replay"
      title="Play"
      onClick={() => {
        setRun((n) => n + 1);
      }}
      aria-label="Play this value"
    >
      {props.children(run)}
    </button>
  );
}

/** A dot that travels the track once, so a duration, an easing and a spring are all watchable. */
function Track(props: { readonly run: number; readonly animation: string }): ReactNode {
  return (
    <span className="ds-sc-track">
      <span key={props.run} className="ds-sc-dot" style={{ animation: props.run === 0 ? undefined : props.animation }} />
    </span>
  );
}

export function Specimen(props: { readonly entry: TokenManifestEntry; readonly painted: string | null }): ReactNode {
  const { entry, painted } = props;
  const value = cssValue(entry);

  switch (entry.type) {
    case "color":
      return (
        <span className="ds-sc-swatch" title={entry.path}>
          <span className="ds-sc-swatch-fill" style={{ background: value }} />
        </span>
      );

    case "gradient":
      return (
        <span className="ds-sc-swatch ds-sc-swatch-wide" title={entry.path}>
          <span className="ds-sc-swatch-fill" style={{ backgroundImage: value }} />
        </span>
      );

    case "dimension":
      return (
        <span className="ds-sc-rule" title={entry.path}>
          <span className="ds-sc-rule-fill" style={{ inlineSize: value }} />
        </span>
      );

    case "shadow":
      return (
        <span className="ds-sc-shadow-stage">
          <span className="ds-sc-shadow-box" style={{ boxShadow: value }} />
        </span>
      );

    case "typography":
      return (
        <span className="ds-sc-type-sample" style={typographyStyle(entry)}>
          Prism 1234
        </span>
      );

    case "fontFamily":
      return (
        <span className="ds-sc-type-sample" style={{ fontFamily: value }}>
          Prism 1234
        </span>
      );

    case "duration":
      return <Replay>{(run) => <Track run={run} animation={`ds-sc-travel ${value} linear both`} />}</Replay>;

    case "cubicBezier":
      return <Replay>{(run) => <Track run={run} animation={`ds-sc-travel ${EASING_DEMO_DURATION} ${value} both`} />}</Replay>;

    case "transition":
      // A spring is published as `<duration> <easing>`, which is the middle of the `animation` shorthand.
      return <Replay>{(run) => <Track run={run} animation={`ds-sc-travel ${value} both`} />}</Replay>;

    case "strokeStyle": {
      const base = `--ds-${entry.path.replaceAll(".", "-")}`;
      // Presentation *attributes* are not CSS and would not substitute a `var()`; the properties do.
      return (
        <svg className="ds-sc-stroke" viewBox="0 0 120 12" role="presentation">
          <line
            x1="2"
            y1="6"
            x2="118"
            y2="6"
            style={{ stroke: "currentColor", strokeWidth: 2, strokeDasharray: `var(${base}-dasharray)`, strokeLinecap: `var(${base}-linecap)` as CSSProperties["strokeLinecap"] }}
          />
        </svg>
      );
    }

    // A number is its own specimen: the number the document holds, which is what a chart or a spring reads.
    case "number":
      return <span className="ds-sc-number ds-sc-mono">{painted === null || painted === "" ? "–" : painted}</span>;

    default:
      return <span className="ds-sc-number ds-sc-mono">{entry.type}</span>;
  }
}
