/**
 * The gallery's document: one brand per document (ADR-0020 §6), so the reference brand's stylesheet,
 * fonts and table load here once, and every story renders inside `<Theme>` with that table.
 *
 * The toolbar globals are `<Theme>`'s props (ADR-0019 §4). `auto` leaves an axis to the OS and the device,
 * as an app that passes nothing does; the visual regression suite sets `colorScheme` and `density`
 * through the URL (`&globals=colorScheme:dark;density:regular`), and the Vitest addon runs the stories
 * with the initial globals below.
 */
import "@iiiivaska/prism-tokens/tokens.css";
import "@iiiivaska/prism-tokens/brands/prism/fonts.css";
import "@iiiivaska/prism-tokens/motion.css";
import "@iiiivaska/prism-react/styles.css";
import "../src/harness/harness.css";

import * as tokens from "@iiiivaska/prism-tokens/tokens";
import { Theme } from "@iiiivaska/prism-react";
import type { Decorator, Preview } from "@storybook/react-vite";

type Axis = "colorScheme" | "contrast" | "transparency" | "density" | "modality" | "motion";

const AXES: Readonly<Record<Axis, { readonly title: string; readonly values: readonly string[] }>> = {
  colorScheme: { title: "Scheme", values: ["light", "dark"] },
  density: { title: "Density", values: ["compact", "regular", "comfortable", "watch"] },
  contrast: { title: "Contrast", values: ["standard", "more"] },
  transparency: { title: "Transparency", values: ["standard", "reduce"] },
  motion: { title: "Motion", values: ["standard", "reduce"] },
  modality: { title: "Modality", values: ["pointer", "touch"] },
};

const withTheme: Decorator = (Story, context) => {
  const props: Record<string, string> = {};
  for (const axis of Object.keys(AXES) as Axis[]) {
    const value: unknown = context.globals[axis];
    if (typeof value === "string" && value !== "auto") props[axis] = value;
  }
  return (
    <Theme {...props} tokens={tokens}>
      <Story />
    </Theme>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: Object.fromEntries(
    (Object.entries(AXES) as [Axis, (typeof AXES)[Axis]][]).map(([axis, { title, values }]) => [
      axis,
      {
        description: `<Theme ${axis}>`,
        toolbar: { title, dynamicTitle: true, items: ["auto", ...values].map((value) => ({ value, title: value })) },
      },
    ]),
  ),
  // Stories run with an explicit light, compact root so the a11y tests do not depend on the machine.
  initialGlobals: { colorScheme: "light", density: "compact", contrast: "auto", transparency: "auto", motion: "auto", modality: "auto" },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    controls: { expanded: true },
  },
};

export default preview;
