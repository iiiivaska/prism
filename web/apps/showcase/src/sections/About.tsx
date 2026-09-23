/**
 * About: what this app is, what it reads, and what it is not.
 *
 * The chrome disclaimer is the point of the screen. `Sidebar`, `TabBar` and `AdaptiveShell` are
 * specified and unimplemented, so the frame around these screens is plain CSS over `--ds-*` and not a
 * second canon of components. The specs stay the contract (ADR-0006) and the gallery stays the pixel
 * canon (ADR-0005); this app reads both and renders neither a spec nor a baseline of its own.
 */
import type { ReactNode } from "react";
import { version as tokensVersion } from "@iiiivaska/prism-tokens";
import { components, manifests, patterns, specSource } from "virtual:prism/catalog";
import { tokenCount, tokensByType } from "../tokens.ts";
import { Facts, Panel, Screen } from "../ui.tsx";

export function About(): ReactNode {
  return (
    <Screen title="About" lead="Design documentation you can press. It renders no second canon: it reads the same artefacts the checks read.">
      <Panel title="The chrome is not Prism">
        <p className="ds-sc-note">
          The rail, the header and the axis bar are plain HTML and CSS over the <code>--ds-*</code> variables. <code>Sidebar</code>,{" "}
          <code>TabBar</code> and <code>AdaptiveShell</code> are specified and unimplemented, so nothing here could be built from real
          components yet. Everything inside a panel is Prism, or a specimen of a Prism token.
        </p>
      </Panel>

      <Panel title="What it reads">
        <Facts
          rows={[
            [
              "tokens",
              <>
                <code>@iiiivaska/prism-tokens/manifest.json</code> — {tokenCount} entries. The screen is the tier plus the first path segment;
                the specimen is picked by the DTCG type.
              </>,
            ],
            [
              "values",
              <>
                <code>resolveTokens(readContext(element))</code> from the brand table this document loaded, and the computed custom property on
                the element itself. Colours are compared as sRGB bytes, never as strings.
              </>,
            ],
            [
              "components",
              <>
                every spec under <code>spec/components/</code> ({components.length}) and <code>spec/patterns/</code> ({patterns.length}), plus{" "}
                <code>implemented</code> of every web manifest —{" "}
                {manifests.map((file, index) => (
                  <span key={file}>
                    {index === 0 ? "" : ", "}
                    <code>{file}</code>
                  </span>
                ))}{" "}
                — the list <code>tools/parity/config.ts</code> gives the parity report. The Apple versions are in the Swift manifests, which
                this app does not read.
              </>,
            ],
            [
              "examples",
              <>
                the <code>examples[]</code> of each spec, staged as <code>spec/SCHEMA.md</code> describes — the same reading the gallery and
                the SwiftUI snapshot harness make.
              </>,
            ],
            [
              "icons",
              <>
                the generated registry, each entry drawn by <code>Icon</code>, and its Phosphor binding for the ladder of cuts and boxes no Icon
                prop reaches.
              </>,
            ],
            ["specimens", <code key="t">{Object.keys(tokensByType).sort().join(", ")}</code>],
            ["system version", <code key="v">{tokensVersion}</code>],
          ]}
        />
      </Panel>

      <Panel title="What stays elsewhere">
        <p className="ds-sc-note">
          The spec is the contract (ADR-0006) and the gallery is the pixel canon (ADR-0005). This app records no screenshot of its own: a second
          baseline set would be a second canon to keep green.
        </p>
        <p className="ds-sc-links">
          <a href={`${specSource.blob}/spec`}>spec/</a>
          <a href={`${specSource.blob}/tools/parity/report.md`}>parity report</a>
          <a href={`${specSource.blob}/gallery/README.md`}>gallery — how to open the pairs</a>
          <a href={`${specSource.blob}/docs/showcase.md`}>docs/showcase.md</a>
          <a href={specSource.repository}>repository</a>
        </p>
      </Panel>

      <Panel title="The axes">
        <p className="ds-sc-note">
          Every control has an <strong>auto</strong> position that passes nothing, so the axis follows the OS and the device through the
          stylesheet&apos;s own media queries — which is what an app that passes nothing gets (ADR-0019 §4 item 1). The bar prints what the
          runtime resolved beside each control, so a control that does nothing is visible rather than assumed.
        </p>
        <p className="ds-sc-note">
          Resolving is not painting, so the bar does not take the runtime&apos;s word for it either — and painting happens two ways. A brand
          stylesheet can move tokens under an axis, or a component can read the axis from <code>useTokenContext()</code> and render differently
          under it, which is how Reduce Transparency reaches the web (ADR-0022 §1.2). The probe measures both. It writes each axis onto{" "}
          <code>&lt;html&gt;</code> in turn and counts the <code>--ds-*</code> properties that move; where none move, it stages every spec example
          of every implemented component into an off-screen root, renders it once per value of that axis, and compares the markup. An axis that
          moves no token but changes what those examples render is labelled <em>no token moves</em> and the examples that changed are counted;
          only an axis neither half answers is called inert. It is a measurement of this document, not a claim about pixels: how large the
          difference looks is what the gallery and the VRT suite answer.
        </p>
        <p className="ds-sc-note">
          Only <code>colorScheme</code> and <code>density</code> nest, so only those two can be shown side by side in one document (ADR-0019 §1
          item 4). Brand is a build-time axis: one brand per document (ADR-0020 §6), so the brand control reloads.
        </p>
      </Panel>
    </Screen>
  );
}
