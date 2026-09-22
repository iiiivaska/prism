/**
 * Patterns: contracts with no implementation manifest (ADR-0012 rule 3) and, therefore, no examples
 * and no snapshots — which is also what `gallery/index.html` and the parity report say about them.
 * They get a section of their own so the app never suggests they are components that failed to load.
 */
import type { ReactNode } from "react";
import { useTokenContext } from "@iiiivaska/prism-react";
import { patterns, specSource } from "virtual:prism/catalog";
import { platformKey } from "../platform.ts";
import { href } from "../route.ts";
import { Facts, Panel, Screen, Tag } from "../ui.tsx";

export function Patterns(props: { readonly item: string | null }): ReactNode {
  const platform = platformKey(useTokenContext());
  const spec = patterns.find((candidate) => candidate.name === props.item);

  if (spec === undefined) {
    return (
      <Screen
        title="Patterns"
        lead={
          <>
            {patterns.length} pattern specs. A pattern declares platform support but has no implementation manifest entry (ADR-0012 rule 3), so
            nothing here is implemented, on either stack, and the gallery holds no pairs for them.
          </>
        }
      >
        <Panel>
          <ul className="ds-sc-component-list">
            {patterns.map((pattern) => (
              <li key={pattern.name}>
                <a href={href("patterns", pattern.name)}>
                  <span className="ds-sc-component-name">{pattern.name}</span>
                  <span className="ds-sc-mono ds-sc-dim">
                    {pattern.layer} · v{pattern.specVersion}
                  </span>
                  <span className="ds-sc-dim">{pattern.summary}</span>
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </Screen>
    );
  }

  const note = spec.platformNotes[platform];

  return (
    <Screen title={spec.name} lead={spec.summary}>
      <Panel>
        <p className="ds-sc-note">
          <Tag tone="off">contract only</Tag> A pattern has no implementation manifest entry (ADR-0012 rule 3): no code, no examples, no
          snapshots. The spec declares <code>{spec.platforms[platform] ?? "no"}</code> support for <code>{platform}</code>.
        </p>
        {note === undefined ? null : <p className="ds-sc-note ds-sc-dim">{note}</p>}
        <Facts
          rows={[
            ["layer", spec.layer],
            ["spec version", `v${spec.specVersion}`],
            ["status", spec.status],
            ["since", spec.since ?? "–"],
          ]}
        />
        <p className="ds-sc-links">
          <a href={`${specSource.blob}/${spec.file}`}>{spec.file}</a>
        </p>
      </Panel>

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
