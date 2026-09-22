/**
 * Components: one page per spec, implemented or not (docs/showcase.md §2, §4).
 *
 * Four states, all read from the catalogue and none of them configured:
 *
 *  | implemented at `specVersion`            | the examples                                            |
 *  | implemented behind the spec             | the examples, plus "implements v3 of spec v5"           |
 *  | `full`/`adapted` with no manifest entry | "Specified, not implemented here yet", and what it will be |
 *  | `none`                                  | "Not on this platform, by design", with the spec's reason  |
 *
 * The platform key is derived from the running document's modality (src/platform.ts), so switching the
 * modality control moves every row — which is the honest thing, because that is what the manifests
 * key on.
 *
 * An example is staged by the harness entry the catalogue imported. Its props reach the component
 * untouched, plus one no-op handler per `action` prop the spec declares: spec/SCHEMA.md asks both
 * galleries for that, so an example renders the component's interactive form (a Card with no handler
 * is deliberately not a control, which is a different picture and belongs in a probe).
 */
import type { ReactNode } from "react";
import { useTokenContext } from "@iiiivaska/prism-react";
import { components, implemented, manifests, renderers, specSource } from "virtual:prism/catalog";
import type { CatalogExample, CatalogSpec } from "../../plugins/catalog.ts";
import { platformKey, type WebPlatformKey } from "../platform.ts";
import { href } from "../route.ts";
import { Facts, Panel, Screen, Tag } from "../ui.tsx";

export type ComponentState = "implemented" | "behind" | "pending" | "absent";

export function stateOf(spec: CatalogSpec, platform: WebPlatformKey): ComponentState {
  const version = implemented[spec.name]?.[platform];
  if (version !== undefined) return version >= spec.specVersion ? "implemented" : "behind";
  const support = spec.platforms[platform];
  return support === "full" || support === "adapted" ? "pending" : "absent";
}

const STATE_TAG: Readonly<Record<ComponentState, { readonly tone: "ok" | "warn" | "off" | "info"; readonly label: string }>> = {
  implemented: { tone: "ok", label: "implemented" },
  behind: { tone: "warn", label: "behind the spec" },
  pending: { tone: "info", label: "specified, not built here" },
  absent: { tone: "off", label: "not on this platform" },
};

/**
 * A spec writes `notes.platform.<key>` with the support level as its first word — "`none`. ADR-0010
 * makes Sidebar a Tier 2 component…", "adapted. Only in regular width…" — because the note is read in
 * the spec file next to the `platforms` block. Here the sentence above the note has just said the
 * level, so the first word would land as a stray fragment. Strip it and print the reason.
 */
const LEVEL_PREFIX = /^`?(?:full|adapted|none)`?\.\s*/i;

export function noteText(note: string): string {
  return note.replace(LEVEL_PREFIX, "");
}

function noop(): void {
  /* spec/SCHEMA.md: both galleries pass a no-op handler for every `action` prop. */
}

/**
 * The example's props, plus the handler every `action` prop of the spec needs to render its live form.
 * The axis probe stages the same examples off-screen (src/axis-probe.ts), and has to stage them the
 * way this screen does or it would be measuring a different component.
 */
export function argsFor(spec: CatalogSpec, example: CatalogExample): Record<string, unknown> {
  const args: Record<string, unknown> = { ...example.props };
  for (const prop of spec.props) if (prop.type === "action") args[prop.name] = noop;
  return args;
}

/**
 * Where a component page sends a reader.
 *
 * The gallery link is **not** `gallery/index.html`: GitHub serves an HTML file under `/blob/` as its own
 * source, so that link opened a page of markup rather than the paired screens, and the `#<Name>` anchor
 * the page really carries could not fire inside it. Publishing those screens is gated on a
 * reference-distance review that has not happened, so there is no rendered copy to point at either.
 * `gallery/README.md` is a page GitHub does render, and it is the page that says what the gallery is and
 * how to open it. The anchor still means something where the page is real — a checkout, or the `gallery`
 * artifact of a green CI run — so it is printed as the path it is, beside the link.
 */
function Links(props: { readonly spec: CatalogSpec }): ReactNode {
  const { spec } = props;
  return (
    <p className="ds-sc-links">
      <a href={`${specSource.blob}/${spec.file}`}>{spec.file}</a>
      <a href={`${specSource.blob}/gallery/README.md`}>gallery — how to open the pairs</a>
      <a href={`${specSource.blob}/tools/parity/report.md`}>parity report</a>
      <span className="ds-sc-mono ds-sc-dim">gallery/index.html#{spec.name} in a checkout</span>
    </p>
  );
}

/**
 * What each platform promises, and what is implemented there — in words, because two kinds of blank
 * are not the same blank. This app reads the web manifests only (the Apple versions live in the Swift
 * manifests, which the Apple showcase reads), so an Apple row has no version to show and says that,
 * rather than printing a mark the reader has to interpret as "nothing" or as "no data". A `none` row
 * has no version question at all: nothing is promised, so nothing is missing (ADR-0006 rule 3).
 */
function versionText(spec: CatalogSpec, key: string, support: string): string | null {
  if (support === "none") return null;
  const version = implemented[spec.name]?.[key];
  if (version !== undefined) return `v${version}`;
  return key === "web-touch" || key === "web-desktop" ? "not implemented" : "version not read on this stack";
}

function SupportRow(props: { readonly spec: CatalogSpec; readonly platform: WebPlatformKey }): ReactNode {
  const { spec, platform } = props;
  return (
    <>
      <div className="ds-sc-support">
        {Object.entries(spec.platforms).map(([key, support]) => {
          const version = versionText(spec, key, support);
          return (
            <span key={key} className="ds-sc-support-cell" data-current={key === platform ? "" : undefined}>
              <span className="ds-sc-support-key ds-sc-mono">{key}</span>
              <span className="ds-sc-support-value ds-sc-mono">
                {support}
                {version === null ? "" : ` · ${version}`}
              </span>
            </span>
          );
        })}
      </div>
      <p className="ds-sc-note ds-sc-dim">
        The level is the spec&apos;s. The version is read from{" "}
        {manifests.map((file, index) => (
          <span key={file}>
            {index === 0 ? "" : ", "}
            <code>{file}</code>
          </span>
        ))}{" "}
        — the only manifests this app reads. An Apple row&apos;s version lives in the Swift manifests, which the Apple showcase reads and
        prints there.
      </p>
    </>
  );
}

function Examples(props: { readonly spec: CatalogSpec }): ReactNode {
  const { spec } = props;
  const render = renderers[spec.name];
  if (render === undefined) {
    return (
      <Panel title="Examples" note="The spec names these; this platform does not stage them yet.">
        <ul className="ds-sc-example-ids">
          {spec.examples.map((example) => (
            <li key={example.id}>
              <code className="ds-sc-path">{example.id}</code>
              {example.description === undefined ? null : <span className="ds-sc-dim"> — {example.description}</span>}
            </li>
          ))}
        </ul>
      </Panel>
    );
  }
  return (
    <>
      {spec.examples.map((example) => (
        <Panel key={example.id} title={example.id} note={example.description}>
          <div className="ds-sc-example">{render(argsFor(spec, example), example)}</div>
          <details className="ds-sc-props">
            <summary>props</summary>
            <pre className="ds-sc-mono">{JSON.stringify(example.props, null, 2)}</pre>
          </details>
        </Panel>
      ))}
    </>
  );
}

function Detail(props: { readonly spec: CatalogSpec; readonly platform: WebPlatformKey }): ReactNode {
  const { spec, platform } = props;
  const state = stateOf(spec, platform);
  const version = implemented[spec.name]?.[platform];
  const tag = STATE_TAG[state];
  const note = spec.platformNotes[platform];

  return (
    <Screen title={spec.name} lead={spec.summary}>
      <Panel>
        <p className="ds-sc-note">
          <Tag tone={tag.tone}>{tag.label}</Tag>{" "}
          {state === "behind" ? `implements v${String(version)} of spec v${spec.specVersion} on ${platform}.` : null}
          {state === "pending" ? `The spec declares ${String(spec.platforms[platform])} support for ${platform}; nothing implements it yet.` : null}
          {state === "absent" ? `The spec declares ${String(spec.platforms[platform] ?? "no")} support for ${platform}, by design.` : null}
          {state === "implemented" ? `at spec v${spec.specVersion} on ${platform}.` : null}
        </p>
        {note === undefined ? null : <p className="ds-sc-note ds-sc-dim">{noteText(note)}</p>}
        <Facts
          rows={[
            ["layer", spec.layer],
            ["spec version", `v${spec.specVersion}`],
            ["status", spec.status],
            ["since", spec.since ?? "–"],
          ]}
        />
        <SupportRow spec={spec} platform={platform} />
        <Links spec={spec} />
      </Panel>

      <Examples spec={spec} />

      {spec.props.length === 0 ? null : (
        <Panel title="Props" note="From the spec, which is the contract (ADR-0006 rule 1).">
          <table className="ds-sc-table">
            <thead>
              <tr>
                <th>name</th>
                <th>type</th>
                <th>values</th>
                <th>default</th>
              </tr>
            </thead>
            <tbody>
              {spec.props.map((prop) => (
                <tr key={prop.name}>
                  <td className="ds-sc-mono">
                    {prop.name}
                    {prop.required === true ? " *" : ""}
                  </td>
                  <td className="ds-sc-mono">{prop.type}</td>
                  <td className="ds-sc-mono ds-sc-dim">{prop.values?.join(" | ") ?? "–"}</td>
                  <td className="ds-sc-mono ds-sc-dim">{prop.default === undefined ? "–" : typeof prop.default === "string" ? prop.default : JSON.stringify(prop.default)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {spec.states.length === 0 ? null : (
        <Panel title="States">
          <p className="ds-sc-mono">{spec.states.join(" · ")}</p>
        </Panel>
      )}

      {spec.behavior.length === 0 ? null : (
        <Panel title="Behaviour">
          <ol className="ds-sc-behaviour">
            {spec.behavior.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ol>
        </Panel>
      )}
    </Screen>
  );
}

function List(props: { readonly platform: WebPlatformKey }): ReactNode {
  const { platform } = props;
  const order: ComponentState[] = ["implemented", "behind", "pending", "absent"];
  const byState = new Map<ComponentState, CatalogSpec[]>(order.map((state) => [state, []]));
  for (const spec of components) byState.get(stateOf(spec, platform))?.push(spec);

  return (
    <Screen
      title="Components"
      lead={
        <>
          Every spec under <code>spec/components/</code>, grouped by what is true of <code>{platform}</code> — the platform key this document
          derives from its modality. Nothing is silently left out.
        </>
      }
    >
      {order.map((state) => {
        const specs = byState.get(state) ?? [];
        if (specs.length === 0) return null;
        return (
          <Panel key={state} title={`${STATE_TAG[state].label} (${specs.length})`}>
            <ul className="ds-sc-component-list">
              {specs.map((spec) => (
                <li key={spec.name}>
                  <a href={href("components", spec.name)}>
                    <span className="ds-sc-component-name">{spec.name}</span>
                    <span className="ds-sc-mono ds-sc-dim">
                      {spec.layer} · v{spec.specVersion} · {spec.examples.length} example{spec.examples.length === 1 ? "" : "s"}
                    </span>
                    <span className="ds-sc-dim">{spec.summary}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        );
      })}
    </Screen>
  );
}

export function Components(props: { readonly item: string | null }): ReactNode {
  const context = useTokenContext();
  const platform = platformKey(context);
  const spec = components.find((candidate) => candidate.name === props.item);
  return spec === undefined ? <List platform={platform} /> : <Detail spec={spec} platform={platform} />;
}
