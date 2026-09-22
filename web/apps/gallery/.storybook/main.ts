/// <reference types="node" />
import type { StorybookConfig } from "@storybook/react-vite";

/**
 * The gallery (roadmap P3-4, ADR-0003 web stack): Storybook 10 on react-vite, one story per spec example
 * (src/stories, generated from spec/components by scripts/stories.ts), the a11y addon failing on any
 * violation, and the Vitest addon running every story as a browser-mode test (vitest.config.ts).
 *
 * `src/probes` holds the hand-written pages the visual regression suite drives instead of screenshots —
 * today the client half of ADR-0019 rule 7. They are kept apart from `src/stories`, which the generator
 * owns and `test/stories.test.ts` holds to the specs.
 *
 * The stories import the built packages (`@iiiivaska/prism-react` → dist/), so the gallery renders what
 * ships: build the workspace before `storybook dev` or `storybook build`. `vitest` is the exception —
 * it resolves the package to its source instead (vitest.config.ts `prismReactSource`), because a suite
 * over the last build cannot say anything about the code under review.
 */
const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../src/stories/*.stories.tsx", "../src/probes/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
