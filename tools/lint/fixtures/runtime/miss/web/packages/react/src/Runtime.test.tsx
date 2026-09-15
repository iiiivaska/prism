// Test files spell the contract on purpose, so the runtime kind skips `*.test.*` (ADR-0019 rule 1).
export const cases = [
  { attribute: "data-ds-motion", query: "(prefers-reduced-motion: reduce)" }, // miss: runtime/attribute, runtime/media-preference
  { query: "(any-pointer: coarse)", className: "dark:bg-ds-page" }, // miss: runtime/media-pointer, runtime/tailwind-variant
  { css: ".ds-x { @variant motion-safe { opacity: 1; } }" }, // miss: runtime/variant-rule
];
export const density = document.documentElement.dataset.dsDensity; // miss: runtime/dataset
