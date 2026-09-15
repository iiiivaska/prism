// The generated counterpart of each runtime pattern (ADR-0019 rule 1); `miss:` names the rule it must not trip.
import { readContext, scope, webRuntime } from "@iiiivaska/prism-tokens";

export function Band(props: { text: string; onHover: (hover: boolean) => void }) { // miss: runtime/media-pointer
  const attribute = webRuntime.motion.attribute; // miss: runtime/attribute
  const still = window.matchMedia(webRuntime.motion.media.query).matches; // miss: runtime/media-preference
  const coarse = window.matchMedia(webRuntime.density.media.query).matches; // miss: runtime/media-pointer
  const slot = document.documentElement.dataset.dsSlot; // miss: runtime/dataset
  const context = readContext(document.documentElement); // miss: runtime/dataset
  const hover = (pointer: string) => pointer === "fine"; // miss: runtime/media-pointer
  const flags = [attribute, still, coarse, slot, context.motion, hover("fine")];
  return (
    <section {...scope({ colorScheme: "dark" })} data-ds-slot="band" title={String(flags.length)}> {/* miss: runtime/attribute */}
      <p className="ds-contrast-more:border-ds-strong">{props.text}</p> {/* miss: runtime/tailwind-variant */}
      <p className="ds-touch:h-ds-control-lg ds-reduce-motion:animate-none">{props.text}</p> {/* miss: runtime/tailwind-variant */}
      <p className="hover:underline pointer-events-none">{props.text}</p> {/* miss: runtime/tailwind-variant, runtime/media-pointer */}
      <p style={{ colorScheme: "light dark" }}>{props.text}</p> {/* miss: runtime/tailwind-variant, runtime/media-preference */}
    </section>
  );
}
