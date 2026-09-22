/**
 * The client half of ADR-0019 rule 7, as a page the visual regression suite can drive in every engine
 * (roadmap P3-4): P3-2 could check `<Theme>` only on the server, because a client render needs a DOM
 * runner it does not have.
 *
 * The story renders nothing to screenshot. It is a probe: inside the preview's `<Theme>` it prints what
 * `useTokenContext()` returns and how many times it has rendered, and publishes `readContext` on the
 * page so `web/apps/vrt/tests/runtime-contract.spec.ts` can ask the runtime the same question from the
 * outside and compare the two. Drive it with every axis on `auto`, so `<Theme>` writes no attribute and
 * both sources of a `watchContext` event are reachable: a media change (Playwright's `emulateMedia`)
 * and a `data-ds-*` mutation of `<html>` (`mountRoot`).
 *
 * It is not tagged `vrt`, so `stories.spec.ts` never screenshots it, and it lives outside `src/stories`,
 * which `scripts/stories.ts` generates from the specs.
 */
import { useEffect, useRef, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { mountRoot, readContext, scope, useTokenContext } from "@iiiivaska/prism-react";

/** What the spec calls through the page. `prism` is the page's namespace, not a Prism DOM name. */
interface ProbeApi {
  readonly readContext: typeof readContext;
  readonly mountRoot: typeof mountRoot;
  readonly scope: typeof scope;
}

function Probe(): ReactNode {
  const context = useTokenContext();
  const renders = useRef(0);
  renders.current += 1;

  useEffect(() => {
    (globalThis as { prismProbe?: ProbeApi }).prismProbe = { readContext, mountRoot, scope };
    return () => {
      delete (globalThis as { prismProbe?: ProbeApi }).prismProbe;
    };
  }, []);

  return (
    <main className="ds-gallery-stage">
      <pre id="probe-context" data-ds-probe-renders={String(renders.current)}>
        {JSON.stringify(context)}
      </pre>
    </main>
  );
}

const meta = {
  title: "Runtime/Contract",
  component: Probe,
  parameters: { prism: { probe: "ADR-0019 rule 7" } },
} satisfies Meta<typeof Probe>;

export default meta;

export const TokenContext: StoryObj<typeof meta> = { name: "token-context" };
