/**
 * Foundations: every token of this brand, as itself.
 *
 * The screens, the groups and the specimen renderers all come from the token manifest — the section is
 * the tier plus the first path segment, the specimen is picked by DTCG `type` — so a new token group
 * is a screen the next build (docs/showcase.md §1).
 *
 * Each row shows the path, the specimen, the CSS variable, the Swift member the Apple app uses for the
 * same token, the description the manifest carries, and the value **twice**: what the brand's
 * JavaScript table resolves for this element's context, and what the document painted. They are
 * compared by type, not as strings (src/tokens.ts).
 *
 * The compare control puts two values of one *nestable* axis side by side in real nested scopes. Only
 * `colorScheme` and `density` nest (ADR-0019 §1 item 4), and the control offers exactly the axes whose
 * runtime row says `nestable`, so it can never promise a comparison the stylesheet cannot make.
 */
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Surface,
  backdropKinds,
  readContext,
  scope,
  surfaceElevations,
  surfaceMaterials,
  useBrandTokens,
  useTokenContext,
  vividSlots,
  webRuntime,
  type SurfaceMaterial,
  type TokenContext,
} from "@iiiivaska/prism-react";
import type { TokenManifestEntry } from "../../plugins/catalog.ts";
import { Specimen } from "../specimens.tsx";
import { agrees, expectedCss, foundationPages, paintedVar } from "../tokens.ts";
import { Panel, Screen, Tag } from "../ui.tsx";

/** The axes a scope can carry; `scope()` accepts these and ignores the rest. */
const nestableAxes = (Object.keys(webRuntime) as (keyof TokenContext)[]).filter((axis) => webRuntime[axis].nestable);

interface Readings {
  readonly painted: Readonly<Record<string, string>>;
  readonly context: TokenContext;
}

/** Everything one column of rows reads from the document, taken from that column's own element. */
function useReadings(ref: { current: HTMLDivElement | null }, tokens: readonly TokenManifestEntry[], root: TokenContext): Readings | null {
  const [readings, setReadings] = useState<Readings | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const painted: Record<string, string> = {};
    for (const token of tokens) {
      if (token.css !== null) painted[token.css] = paintedVar(element, token.css);
      for (const name of token.cssVars) painted[name] = paintedVar(element, name);
    }
    setReadings({ painted, context: readContext(element) });
    // `root` is the effective context of <html>; a nested scope's own context changes with it.
  }, [ref, tokens, root]);

  return readings;
}

function Value(props: { readonly label: string; readonly children: ReactNode }): ReactNode {
  return (
    <span className="ds-sc-value">
      <span className="ds-sc-value-label">{props.label}</span>
      <span className="ds-sc-mono ds-sc-value-text">{props.children}</span>
    </span>
  );
}

/** How the JavaScript value reads, per type, without inventing a CSS spelling for it. */
function describeJs(type: string, value: unknown): string {
  if (value === undefined) return "–";
  const css = expectedCss(type, value);
  if (css !== null) return css;
  if (type === "typography" && typeof value === "object" && value !== null) {
    const role = value as { fontFamily?: string; fontSize?: number; fontWeight?: number; lineHeight?: number; letterSpacing?: number; numeric?: string };
    return `${String(role.fontSize)}px / ${String(role.lineHeight)} · ${String(role.fontWeight)} · ${String(role.letterSpacing)} · ${String(role.numeric)} · ${String(role.fontFamily)}`;
  }
  if (type === "strokeStyle" && typeof value === "object" && value !== null) {
    const stroke = value as { dashArray?: readonly number[]; lineCap?: string | null; keyword?: string | null };
    return `${(stroke.dashArray ?? []).join(" ")} · ${stroke.lineCap ?? "–"}${stroke.keyword === null || stroke.keyword === undefined ? "" : ` · ${stroke.keyword}`}`;
  }
  if (type === "shadow" && Array.isArray(value)) {
    return value.map((layer: { x: number; y: number; blur: number; spread: number; color: string }) => `${layer.x} ${layer.y} ${layer.blur} ${layer.spread} ${layer.color}`).join(", ");
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value) ?? "–";
}

/** The CSS variable prefix a token's sub-properties hang off: `type.body.md` → `--ds-type-body-md`. */
function varBase(path: string): string {
  return `--ds-${path.replaceAll(".", "-")}`;
}

/**
 * What the document painted for a token with no base declaration. `typography` and `strokeStyle`
 * publish sub-properties only — `css` is null and the six (or two) names are in `cssVars` — so the
 * painted reading is assembled from those, in the order `describeJs` writes the table's value.
 */
function paintedSubProperties(entry: TokenManifestEntry, readings: Readings | null): string | null {
  if (readings === null) return null;
  const base = varBase(entry.path);
  const at = (suffix: string): string => readings.painted[`${base}-${suffix}`] ?? "";
  if (entry.type === "typography") {
    return `${at("font-size")} / ${at("line-height")} · ${at("font-weight")} · ${at("letter-spacing")} · ${at("font-variant-numeric")} · ${at("font-family")}`;
  }
  if (entry.type === "strokeStyle") return `${at("dasharray")} · ${at("linecap")}`;
  return null;
}

/** A specimen that wants the whole row: type at its real size, and a gradient's band. */
const WIDE = new Set(["typography", "fontFamily", "gradient"]);

/** The specimens that replay on press. */
const PLAYABLE = new Set(["duration", "cubicBezier", "transition"]);

function Row(props: {
  readonly entry: TokenManifestEntry;
  readonly readings: Readings | null;
  readonly resolved: Readonly<Record<string, unknown>> | null;
}): ReactNode {
  const { entry, readings, resolved } = props;
  const painted = entry.css === null ? paintedSubProperties(entry, readings) : (readings?.painted[entry.css] ?? null);
  const jsValue = entry.ts === null ? undefined : resolved?.[entry.ts];
  const expected = entry.ts === null || entry.css === null ? null : expectedCss(entry.type, jsValue);
  const verdict = painted === null || painted === "" || expected === null ? null : agrees(entry.type, painted, expected);
  // A token with a JavaScript value but no single CSS spelling — a shadow's layers, a type role's six
  // properties — is shown from both sides and compared from neither, rather than judged wrongly.
  const shownOnly = verdict === null && entry.ts !== null && jsValue !== undefined;
  const cssLabel = entry.css ?? (entry.cssVars.length === 0 ? "–" : `${varBase(entry.path)}-*`);

  return (
    <div className="ds-sc-row" data-layout={WIDE.has(entry.type) ? "stacked" : undefined}>
      <div className="ds-sc-row-specimen">
        <Specimen entry={entry} painted={painted} />
      </div>
      <div className="ds-sc-row-body">
        <div className="ds-sc-row-head">
          <code className="ds-sc-path">{entry.path}</code>
          <span className="ds-sc-row-type ds-sc-mono">{entry.type}</span>
          {entry.dependsOn.length === 0 ? null : <span className="ds-sc-row-axes ds-sc-mono">varies with {entry.dependsOn.join(", ")}</span>}
          {entry.deprecated === null ? null : <Tag tone="warn">deprecated{entry.deprecated.replacedBy === undefined ? "" : ` → ${entry.deprecated.replacedBy}`}</Tag>}
        </div>
        {entry.description === null ? null : <p className="ds-sc-row-description">{entry.description}</p>}
        <div className="ds-sc-row-values">
          <Value label="css">{cssLabel}</Value>
          <Value label="swift">{entry.swift ?? "primitive tier — no public API"}</Value>
          <Value label="painted">{painted === null || painted === "" ? "–" : painted}</Value>
          <Value label="table">{entry.ts === null ? "no JavaScript API (ref tier)" : describeJs(entry.type, jsValue)}</Value>
          {verdict !== null ? (
            <Tag tone={verdict === "match" ? "ok" : verdict === "differs" ? "warn" : "info"}>
              {verdict === "match" ? "table = painted" : verdict === "differs" ? "table ≠ painted" : "not comparable"}
            </Tag>
          ) : shownOnly ? (
            <Tag tone="info">shown, not compared</Tag>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Column(props: { readonly tokens: readonly TokenManifestEntry[]; readonly scopeAttributes?: ReturnType<typeof scope>; readonly caption?: string }): ReactNode {
  const root = useTokenContext();
  const brand = useBrandTokens();
  const ref = useRef<HTMLDivElement | null>(null);
  const readings = useReadings(ref, props.tokens, root);
  const resolved = useMemo(
    () => (readings === null ? null : (brand.resolveTokens(readings.context) as Readonly<Record<string, unknown>>)),
    [brand, readings],
  );

  return (
    <div className="ds-sc-column" ref={ref} {...props.scopeAttributes}>
      {props.caption === undefined ? null : (
        <p className="ds-sc-column-caption ds-sc-mono">
          {props.caption}
          {readings === null ? "" : ` → ${readings.context.colorScheme} / ${readings.context.density}`}
        </p>
      )}
      {props.tokens.map((entry) => (
        <Row key={entry.path} entry={entry} readings={readings} resolved={resolved} />
      ))}
    </div>
  );
}

/**
 * The material, elevation and gradient screens also show the thing the tokens are *for*: Surface is
 * what publishes a material (ADR-0022 rule 1), so a material is honestly shown through it, over the
 * same synthetic map and image the example harness uses. The lists come from the package's exports.
 */
function InUse(props: { readonly page: string }): ReactNode {
  if (props.page === "material") {
    return (
      <Panel title="Through Surface" note="Only Surface resolves and publishes a material (ADR-0022 rule 1), so the materials are shown through it — over the synthetic map and image of the example harness.">
        <div className="ds-sc-tiles">
          {surfaceMaterials.map((material: SurfaceMaterial) => (
            <div key={material} className="ds-sc-tile">
              <div className="ds-sc-backdrop" data-ds-sc-backdrop="map">
                <span data-ds-sc-layer="blocks" aria-hidden="true" />
                <span data-ds-sc-layer="park" aria-hidden="true" />
                <span data-ds-sc-layer="water" aria-hidden="true" />
                <span data-ds-sc-layer="roads" aria-hidden="true" />
                <div className="ds-sc-frame" data-ds-sc-shape="card">
                  <Surface material={material} backdrop="map" />
                </div>
              </div>
              <code className="ds-sc-path">{material}</code>
            </div>
          ))}
        </div>
        <p className="ds-sc-note">Backdrops: {backdropKinds.join(", ")}.</p>
      </Panel>
    );
  }
  if (props.page === "elevation") {
    return (
      <Panel title="Through Surface" note="Elevation is a shadow a surface carries; these are the levels Surface accepts.">
        <div className="ds-sc-tiles">
          {surfaceElevations.map((elevation) => (
            <div key={elevation} className="ds-sc-tile">
              <div className="ds-sc-frame" data-ds-sc-shape="card">
                <Surface material="raised" elevation={elevation} />
              </div>
              <code className="ds-sc-path">elevation {elevation}</code>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  if (props.page === "gradient") {
    return (
      <Panel title="Through Surface" note="A vivid surface paints one gradient slot; the slot pair alternates on the diagonals of a 2×2 (ADR-0029 §2.5).">
        <div className="ds-sc-tiles">
          {vividSlots.map((slot) => (
            <div key={slot} className="ds-sc-tile">
              <div className="ds-sc-frame" data-ds-sc-shape="card">
                <Surface material="vivid" vivid={slot} />
              </div>
              <code className="ds-sc-path">vivid {slot}</code>
            </div>
          ))}
        </div>
      </Panel>
    );
  }
  return null;
}

export function Foundations(props: { readonly item: string | null }): ReactNode {
  const page = foundationPages.find((candidate) => candidate.id === props.item) ?? foundationPages[0];
  const [compare, setCompare] = useState<keyof TokenContext | null>(null);

  if (page === undefined) return <Screen title="Foundations">The token manifest is empty.</Screen>;

  const compareValues = compare === null ? [] : (webRuntime[compare].values as readonly string[]);
  // Said only where it is true: a screen with a duration, an easing or a spring on it.
  const replayable = page.groups.some((group) => group.tokens.some((token) => PLAYABLE.has(token.type)));

  return (
    <Screen
      title={page.title}
      lead={
        <>
          {page.count} token{page.count === 1 ? "" : "s"} in the <code>{page.tier}</code> tier.{" "}
          {page.groups.some((group) => group.tokens.some((token) => token.ts !== null)) ? (
            <>
              Values are read twice: from the brand&apos;s JavaScript table for this element&apos;s context, and from what the document painted.
            </>
          ) : (
            <>
              The primitive tier has no JavaScript API and no Swift API — it is CSS variables — so a value here is read once, from what the
              document painted.
            </>
          )}
          {replayable ? " Press a specimen to play it." : ""}
        </>
      }
    >
      <div className="ds-sc-compare-control">
        <span className="ds-sc-axis-name">compare</span>
        <div className="ds-sc-segments">
          <button type="button" data-selected={compare === null ? "" : undefined} onClick={() => { setCompare(null); }}>
            off
          </button>
          {nestableAxes.map((axis) => (
            <button key={axis} type="button" data-selected={compare === axis ? "" : undefined} onClick={() => { setCompare(axis); }}>
              {axis}
            </button>
          ))}
        </div>
        <span className="ds-sc-axis-resolved ds-sc-mono">
          only {nestableAxes.join(" and ")} nest (ADR-0019 §1 item 4); the other axes are read from &lt;html&gt; only
        </span>
      </div>

      <InUse page={page.id} />

      {page.groups.map((group) => (
        <Panel key={group.id} title={group.title}>
          {compare === null ? (
            <Column tokens={group.tokens} />
          ) : (
            <div className="ds-sc-compare">
              {compareValues.map((value) => (
                <Column
                  key={value}
                  tokens={group.tokens}
                  caption={`${compare}: ${value}`}
                  scopeAttributes={scope({ [compare]: value })}
                />
              ))}
            </div>
          )}
        </Panel>
      ))}
    </Screen>
  );
}
