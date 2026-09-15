// Generated output is excluded: the generated runtime.ts is where the names live (ADR-0019 §3).
export const webRuntime = {
  motion: { attribute: "data-ds-motion", media: { value: "reduce", query: "(prefers-reduced-motion: reduce)" } }, // miss: runtime/attribute, runtime/media-preference
  density: { attribute: "data-ds-density", media: { value: "regular", query: "(any-pointer: coarse)" } }, // miss: runtime/media-pointer
} as const;
