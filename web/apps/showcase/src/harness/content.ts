/**
 * Sample copy for the spec examples that carry no strings.
 *
 * The Surface and Text specs describe surfaces and type roles, not words, so their examples give no
 * strings and a harness has to invent them (ADR-0015: never copy from a reference). Button and Card
 * examples carry their own strings in their props and have no entry here.
 *
 * These are the gallery's strings, because the showcase must stage an example exactly as
 * `web/apps/gallery/src/harness/content.ts` stages it — the same example must not read differently in
 * the two places. docs/showcase.md's `web/packages/examples` is what turns this copy into one file;
 * until that package exists, the duplication is deliberate and the strings are kept identical.
 */

/** The role of a Surface's main string; a `TextRole` of `@iiiivaska/prism-react`. */
export interface ExampleContent {
  readonly primary: string;
  readonly secondary?: string;
  readonly role?: string;
}

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

/**
 * The copy for one example. A missing entry is a real gap — a new example of a stringless component —
 * so it throws rather than rendering an empty surface that looks like a styling bug.
 */
export function contentFor(component: string, exampleId: string): ExampleContent {
  const content = exampleContent[`${component}/${exampleId}`];
  if (content === undefined) {
    throw new Error(`No showcase copy for ${component}/${exampleId}: add it to src/harness/content.ts`);
  }
  return content;
}
