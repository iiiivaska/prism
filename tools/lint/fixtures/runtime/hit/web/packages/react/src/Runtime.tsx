// One line per runtime pattern (ADR-0019 rule 1, ADR-0023 §12); `expect:` names the rule the line must trip.
const scoped = { "data-ds-density": "regular" }; // expect: runtime/attribute

export function Band(props: { text: string }) {
  document.documentElement.setAttribute("data-ds-contrast", "more"); // expect: runtime/attribute
  document.documentElement.removeAttribute("data-ds-transparency"); // expect: runtime/attribute
  const modality = document.documentElement.getAttribute("data-ds-modality"); // expect: runtime/attribute
  const motion = document.querySelector("[data-ds-motion]"); // expect: runtime/attribute
  document.documentElement.dataset.dsMotion = "reduce"; // expect: runtime/dataset
  const density = document.documentElement.dataset["dsDensity"]; // expect: runtime/dataset
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches; // expect: runtime/media-preference
  const more = window.matchMedia("(prefers-contrast: more)").matches; // expect: runtime/media-preference
  const clear = window.matchMedia("(prefers-reduced-transparency: reduce)").matches; // expect: runtime/media-preference
  const still = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches; // expect: runtime/media-preference
  const coarse = window.matchMedia("(pointer: coarse)").matches; // expect: runtime/media-pointer
  const anyFine = window.matchMedia("(any-pointer: fine)").matches; // expect: runtime/media-pointer
  const hovers = window.matchMedia("(hover: hover)").matches; // expect: runtime/media-pointer
  const anyHover = window.matchMedia("(any-hover)").matches; // expect: runtime/media-pointer
  const flags = [scoped, modality, motion, density, dark, more, clear, still, coarse, anyFine, hovers, anyHover];
  return (
    <section data-ds-color-scheme="dark" title={String(flags.length)}> {/* expect: runtime/attribute */}
      <p className="dark:text-ds-primary">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="md:contrast-more:border-ds-strong">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="contrast-less:opacity-80">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="motion-safe:animate-spin">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="motion-reduce:animate-none">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="pointer-coarse:h-ds-control-lg">{props.text}</p> {/* expect: runtime/tailwind-variant */}
      <p className="any-pointer-fine:underline">{props.text}</p> {/* expect: runtime/tailwind-variant */}
    </section>
  );
}
