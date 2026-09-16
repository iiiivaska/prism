/**
 * ADR-0019 §1's table, spelled out by hand. The runtime derives everything from
 * `src/generated/runtime.ts`; this copy checks that generated table independently, which is why
 * ADR-0019 rule 1 exempts tests from the `runtime` lint kind.
 */
export const CONTRACT = {
  colorScheme: {
    attribute: "data-ds-color-scheme",
    values: ["light", "dark"],
    nestable: true,
    media: { value: "dark", query: "(prefers-color-scheme: dark)" },
  },
  contrast: {
    attribute: "data-ds-contrast",
    values: ["standard", "more"],
    nestable: false,
    media: { value: "more", query: "(prefers-contrast: more)" },
  },
  transparency: {
    attribute: "data-ds-transparency",
    values: ["standard", "reduce"],
    nestable: false,
    media: { value: "reduce", query: "(prefers-reduced-transparency: reduce)" },
  },
  density: {
    // `watch` joined the densities with ADR-0029; the web fallback stays `regular`.
    attribute: "data-ds-density",
    values: ["compact", "regular", "comfortable", "watch"],
    nestable: true,
    media: { value: "regular", query: "(any-pointer: coarse)" },
  },
  modality: {
    attribute: "data-ds-modality",
    values: ["pointer", "touch"],
    nestable: false,
    media: { value: "touch", query: "not all and (hover: hover) and (pointer: fine)" },
  },
  motion: {
    attribute: "data-ds-motion",
    values: ["standard", "reduce"],
    nestable: false,
    media: { value: "reduce", query: "(prefers-reduced-motion: reduce)" },
  },
} as const;

export type ContractAxis = keyof typeof CONTRACT;

export const AXES = Object.keys(CONTRACT) as ContractAxis[];

/** The resolver default: no attribute set and no fallback query matching (ADR-0019 §1 item 5). */
export const DEFAULT_CONTEXT = {
  colorScheme: "light",
  contrast: "standard",
  transparency: "standard",
  density: "compact",
  modality: "pointer",
  motion: "standard",
} as const;

/** Values that must behave exactly like no attribute at all (ADR-0019 §1 item 2). */
export const INVALID_VALUES = ["", "auto", "system", "Dark", "lightt", "0"] as const;
