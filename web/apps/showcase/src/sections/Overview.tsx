/**
 * Overview: what Prism has today, counted from the same artefacts every other screen reads — the
 * token manifest, the specs, the web implementation manifest and the icon registry. No number here is
 * written down; each is a `length` or a `filter` over data.
 */
import type { ReactNode } from "react";
import { version as tokensVersion } from "@iiiivaska/prism-tokens";
import { iconRegistry, iconRegistryVersion, iconSource, useTokenContext } from "@iiiivaska/prism-react";
import { components, implemented, patterns } from "virtual:prism/catalog";
import { platformDefaults } from "virtual:prism/tokens";
import { platformKey } from "../platform.ts";
import { foundationPages, tokenCount, tokensByTier } from "../tokens.ts";
import { Facts, Panel, Screen, Tag } from "../ui.tsx";

export function Overview(props: { readonly brandId: string }): ReactNode {
  const context = useTokenContext();
  const platform = platformKey(context);

  const specified = components.filter((spec) => {
    const support = spec.platforms[platform];
    return support === "full" || support === "adapted";
  });
  const built = Object.keys(implemented);
  const lagging = built.filter((name) => {
    const spec = components.find((candidate) => candidate.name === name);
    const version = implemented[name]?.[platform];
    return spec !== undefined && version !== undefined && version < spec.specVersion;
  });

  return (
    <Screen
      title="Prism"
      lead={
        <>
          Every token and every implemented component of the brand this document loaded, live, with every axis switched through the published
          runtime. This screen is counted from the artefacts, not written down.
        </>
      }
    >
      <Panel title="This document">
        <Facts
          rows={[
            ["brand", <code key="b">{props.brandId}</code>],
            ["system version", <code key="v">{tokensVersion}</code>],
            ["icon registry", <code key="i">{`${iconRegistryVersion} · ${iconSource.package} ${iconSource.version}`}</code>],
            [
              "platform key",
              <>
                <code>{platform}</code> — derived from <code>modality: {context.modality}</code>, as <code>web/apps/vrt/matrix.ts</code> defines
                the two web keys
              </>,
            ],
            [
              "effective context",
              <code key="c">
                {Object.entries(context)
                  .map(([axis, value]) => `${axis}: ${value}`)
                  .join("  ")}
              </code>,
            ],
            [
              "web starts at",
              <code key="p">
                {Object.entries(platformDefaults["web"] ?? {})
                  .map(([axis, value]) => `${axis}: ${value}`)
                  .join("  ")}
              </code>,
            ],
          ]}
        />
      </Panel>

      <Panel title="Tokens" note={`${tokenCount} tokens across ${foundationPages.length} screens; a screen is a tier plus a first path segment, read off the manifest.`}>
        <div className="ds-sc-counts">
          {Object.entries(tokensByTier).map(([tier, count]) => (
            <div key={tier} className="ds-sc-count">
              <span className="ds-sc-count-value">{count}</span>
              <span className="ds-sc-count-label">{tier}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Components"
        note={
          <>
            {built.length} implemented on this stack, {specified.length} specified as <code>full</code> or <code>adapted</code> for{" "}
            <code>{platform}</code>, {components.length} component specs and {patterns.length} patterns in all. Every spec has a page, including
            the ones nothing implements.
          </>
        }
      >
        <div className="ds-sc-counts">
          <div className="ds-sc-count">
            <span className="ds-sc-count-value">{built.length}</span>
            <span className="ds-sc-count-label">implemented</span>
          </div>
          <div className="ds-sc-count">
            <span className="ds-sc-count-value">{specified.length - built.length}</span>
            <span className="ds-sc-count-label">specified, not built</span>
          </div>
          <div className="ds-sc-count">
            <span className="ds-sc-count-value">{components.length - specified.length}</span>
            <span className="ds-sc-count-label">not on this platform</span>
          </div>
          <div className="ds-sc-count">
            <span className="ds-sc-count-value">{patterns.length}</span>
            <span className="ds-sc-count-label">patterns, contract only</span>
          </div>
        </div>
        <p className="ds-sc-note">
          {lagging.length === 0 ? (
            <Tag tone="ok">nothing is behind its spec on this platform</Tag>
          ) : (
            <Tag tone="warn">
              {lagging.join(", ")} {lagging.length === 1 ? "implements" : "implement"} an older spec version
            </Tag>
          )}
        </p>
      </Panel>

      <Panel
        title="Icons"
        note={
          <>
            {Object.keys(iconRegistry).length} registry entries, which the Icons screen draws with <code>Icon</code>; its spec examples are on
            Components.
          </>
        }
      >
        <p className="ds-sc-note">
          <Tag tone="ok">drawn by Icon</Tag>
        </p>
      </Panel>
    </Screen>
  );
}
