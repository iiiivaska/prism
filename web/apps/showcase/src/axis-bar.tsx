/**
 * The axis bar (docs/showcase.md §3). Every axis is switched through the published runtime — the
 * values become `<Theme>` props — and never through a literal: the axes, their values and their order
 * all come from `webRuntime`, the table `tools/tokens` generates from `WEB_RUNTIME` (ADR-0019 rule 1).
 *
 * Every control has an **auto** position that passes nothing. The axis then follows the OS and the
 * device through the stylesheet's own media queries, exactly as an app that passes nothing does
 * (ADR-0019 §4 item 1) — which is why the bar also prints what the runtime *resolved*, read back with
 * `useTokenContext()`, so "auto → dark" is visible.
 *
 * Resolving is not painting, though, and the design promises more than that: *a control that does
 * nothing is visible rather than assumed*. So the bar does not take the runtime's word for it either.
 * `probeAxes()` measures each axis against the document once, after mount, and the badge beside a
 * control says what was measured and no more.
 *
 * The measurement has two halves, because an axis reaches pixels two ways (src/axis-probe.ts): the
 * brand stylesheet moves tokens under it, or a component reads it from `useTokenContext()` and
 * renders differently. An axis that moves tokens gets no badge. An axis that moves none but changes
 * what the staged examples render is counted rather than called dead — *no token moves; 12 of 28
 * examples still change* — which is Reduce Transparency on this stack today, where `Surface`
 * swaps glass for the opaque fallback of ADR-0022 §1.2 and no stylesheet carries a
 * `data-ds-transparency` declaration at all. Only an axis neither half answers is called inert. Every
 * number and every name in the badge is one the probe measured on this document; the only sentence
 * written here is the shape of the phrase.
 *
 * Brand is the exception, and says so: one brand per document (ADR-0020 §6), so the brand control is a
 * link that reloads with `?brand=…` and `main.tsx` picks that brand's stylesheet, fonts and table
 * before mounting.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useTokenContext, webRuntime, type TokenContext } from "@iiiivaska/prism-react";
import { probeAxes, type AxisProbe, type AxisResponse } from "./axis-probe.ts";
import { brandIds, brandLink, currentBrandId } from "./brand.ts";

/** `colorScheme` → `color scheme`. The axis names are the runtime's; only their spelling is softened. */
function label(axis: string): string {
  return axis.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

/** "Surface and Card" — the measured names as a sentence reads them. */
function sentenceList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1] ?? ""}`;
}

/**
 * What the probe found, as the badge says it. Null is the common case: the axis moves tokens, or the
 * probe has not run yet, and the control needs no note at all.
 */
function measurement(axis: keyof TokenContext, response: AxisResponse | undefined): { readonly tone: string; readonly text: string; readonly title: string } | null {
  if (response === undefined || response.tokens > 0) return null;
  const attribute = webRuntime[axis].attribute;
  const nothingInCss = `No declaration in this document's stylesheets changes with ${attribute}.`;
  if (response.examples > 0) {
    return {
      tone: "ds-sc-axis-partial",
      text: `no token moves; ${response.examples} of ${response.staged} examples still change`,
      title: `${nothingInCss} Staged and rendered under each value of the axis, ${response.examples} of the ${response.staged} spec examples this build draws come out with different markup — examples of ${sentenceList(response.components)}. On this stack the axis reaches the page through the components, which read it from the runtime, and not through the tokens.`,
    };
  }
  if (response.staged === 0) {
    return { tone: "ds-sc-axis-partial", text: "no token moves", title: `${nothingInCss} No example could be staged to measure the rest, so this says nothing about the components.` };
  }
  return {
    tone: "ds-sc-axis-inert",
    text: "nothing responds on this stack",
    title: `${nothingInCss} None of the ${response.staged} staged spec examples renders differently under it either.`,
  };
}

export const axisNames = Object.keys(webRuntime) as (keyof TokenContext)[];

export interface AxisBarProps {
  readonly chosen: Partial<TokenContext>;
  readonly onChange: (next: Partial<TokenContext>) => void;
}

function AxisControl(props: {
  readonly axis: keyof TokenContext;
  readonly chosen: string | undefined;
  readonly resolved: string;
  /** What this document was measured to do with the axis; undefined until the probe has run. */
  readonly responds: AxisResponse | undefined;
  readonly onPick: (value: string | undefined) => void;
}): ReactNode {
  const { axis, chosen, resolved, responds, onPick } = props;
  const values = webRuntime[axis].values as readonly string[];
  const measured = measurement(axis, responds);
  const group = useId();
  return (
    <div className="ds-sc-axis" role="group" aria-labelledby={group}>
      <span className="ds-sc-axis-name" id={group}>
        {label(axis)}
      </span>
      <div className="ds-sc-segments">
        <button
          type="button"
          data-selected={chosen === undefined ? "" : undefined}
          onClick={() => {
            onPick(undefined);
          }}
        >
          auto
        </button>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            data-selected={chosen === value ? "" : undefined}
            onClick={() => {
              onPick(value);
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <span className="ds-sc-axis-resolved ds-sc-mono">
        {chosen === undefined ? "auto → " : ""}
        {resolved}
        {webRuntime[axis].nestable ? "" : " (root only)"}
        {measured === null ? null : " "}
        {measured === null ? null : (
          <span className={measured.tone} title={measured.title}>
            {measured.text}
          </span>
        )}
      </span>
    </div>
  );
}

export function AxisBar(props: AxisBarProps): ReactNode {
  const { chosen, onChange } = props;
  const resolved = useTokenContext();
  const [open, setOpen] = useState(false);
  const [probe, setProbe] = useState<AxisProbe | null>(null);
  const brand = currentBrandId();

  // After the first paint, and once, in a task of its own: the probe writes on <html>, renders the
  // example set off-screen and restores everything inside that one task, so nothing paints mid-probe,
  // the document ends exactly as it started, and the app's own first paint never waits for it.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProbe(probeAxes(document));
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="ds-sc-axis-region">
      <button
        type="button"
        className="ds-sc-axis-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        Axes
      </button>
      <div className="ds-sc-axisbar" data-open={open ? "true" : "false"}>
        {axisNames.map((axis) => (
          <AxisControl
            key={axis}
            axis={axis}
            chosen={chosen[axis]}
            resolved={resolved[axis]}
            responds={probe?.[axis]}
            onPick={(value) => {
              const next: Record<string, string> = { ...(chosen as Record<string, string>) };
              if (value === undefined) delete next[axis];
              else next[axis] = value;
              onChange(next);
            }}
          />
        ))}
        <div className="ds-sc-axis" role="group" aria-label="brand">
          <span className="ds-sc-axis-name">brand</span>
          <div className="ds-sc-segments">
            {brandIds.map((id) => (
              <a key={id} href={brandLink(id)} data-selected={id === brand ? "" : undefined}>
                {id}
              </a>
            ))}
          </div>
          <span className="ds-sc-axis-resolved ds-sc-mono">reloads the document (ADR-0020 §6)</span>
        </div>
      </div>
    </div>
  );
}
