/**
 * The handful of chrome pieces every screen shares. Plain elements over `--ds-*`: `Sidebar`, `TabBar`
 * and `AdaptiveShell` are specified and unimplemented, so nothing here pretends to be a Prism
 * component, and the About screen says as much.
 */
import type { ReactNode } from "react";

export function Screen(props: { readonly title: string; readonly lead?: ReactNode; readonly children: ReactNode }): ReactNode {
  return (
    <article className="ds-sc-screen">
      <h1 className="ds-sc-screen-title">{props.title}</h1>
      {props.lead === undefined ? null : <p className="ds-sc-lead">{props.lead}</p>}
      {props.children}
    </article>
  );
}

export function Panel(props: { readonly title?: string; readonly note?: ReactNode; readonly children: ReactNode }): ReactNode {
  return (
    <section className="ds-sc-panel">
      {props.title === undefined ? null : <h2 className="ds-sc-panel-title">{props.title}</h2>}
      {props.note === undefined ? null : <p className="ds-sc-note">{props.note}</p>}
      {props.children}
    </section>
  );
}

/** A small status word. `tone` is the showcase's own vocabulary, not a Prism token name. */
export function Tag(props: { readonly tone: "ok" | "warn" | "off" | "info"; readonly children: ReactNode }): ReactNode {
  return (
    <span className="ds-sc-tag" data-tone={props.tone}>
      {props.children}
    </span>
  );
}

/** A definition list: the shape most of these screens want. */
export function Facts(props: { readonly rows: readonly (readonly [string, ReactNode])[] }): ReactNode {
  return (
    <dl className="ds-sc-facts">
      {props.rows.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
