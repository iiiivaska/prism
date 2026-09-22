/**
 * The gallery's sample copy for each spec example, keyed `<Component>/<exampleId>`. The specs give no
 * strings for Surface and Text examples, so the gallery supplies invented ones (ADR-0015: never copy
 * from a reference); `test/stories.test.ts` checks that every example of those components has an entry
 * and that no entry is left over. Button and Card examples carry their own strings in their props, so
 * they have none. Text examples on a vivid surface keep text below 24 px in
 * the header block (ADR-0022 §4.2): the harness places it at the top-leading corner.
 */
import type { TextRole } from "@iiiivaska/prism-react";

export interface ExampleContent {
  /** The main string: a Surface's headline, a Text's children. */
  readonly primary: string;
  /** A Surface's caption, or the second line of a two-tone Text (tone secondary). */
  readonly secondary?: string;
  /** The role of a Surface's main string; default `headline`. */
  readonly role?: TextRole;
}

/** The components whose examples take their strings from this file. */
export const componentsWithSampleCopy: readonly string[] = ["Surface", "Text"];

export const exampleContent: Readonly<Record<string, ExampleContent>> = {
  "Surface/solid-card": { primary: "Solid", secondary: "The content surface" },
  "Surface/vivid-default": { primary: "Vivid", secondary: "The default gradient" },
  "Surface/vivid-pair": { primary: "Vivid", secondary: "One slot pair" },
  "Surface/glass-over-map": { primary: "Glass", secondary: "Over the map" },
  "Surface/glass-light-over-image": { primary: "Light glass", secondary: "Over an image" },
  "Surface/glass-selected": { primary: "Glass", secondary: "Selected" },
  "Surface/inverse-pill": { primary: "Selected", role: "label-md" },
  "Surface/accent-tile": { primary: "Accent", secondary: "The lit tile" },
  "Text/hero-metric": { primary: "86" },
  "Text/title-two-tone": { primary: "Weekly summary", secondary: "Three rides ahead of plan" },
  "Text/caption": { primary: "Updated two minutes ago" },
  "Text/on-vivid": { primary: "Evening loop" },
  "Text/on-glass-over-map": { primary: "Two stops ahead" },
  "Text/data-tabular": { primary: "04:12:58" },
};

export function contentFor(component: string, exampleId: string): ExampleContent {
  const content = exampleContent[`${component}/${exampleId}`];
  if (content === undefined) throw new Error(`No gallery content for ${component}/${exampleId}: add it to src/harness/content.ts`);
  return content;
}
