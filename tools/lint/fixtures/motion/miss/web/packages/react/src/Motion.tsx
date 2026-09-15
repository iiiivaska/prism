// The token-driven counterpart of each motion pattern (ADR-0023 §12); `miss:` names the rule it must not trip.
import { spring as physics } from "motion"; // miss: motion/generate-linear-easing
import { resolveTokens, useTokenContext } from "@iiiivaska/prism-tokens"; // miss: motion/ts-use-reduced-motion

export function Toggle(props: { on: boolean }) {
  const { motion } = useTokenContext(); // miss: motion/ts-use-reduced-motion
  const reducedMotion = motion === "reduce"; // miss: motion/ts-reduced-motion-prop
  const spring = resolveTokens(useTokenContext())["motion.spring.snappy"];
  const options = { stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass }; // miss: motion/ts-physics
  const lifts = spring.bounce > 0; // miss: motion/ts-bounce
  const visual = spring.duration; // miss: motion/visual-duration
  return (
    <div className="duration-ds-base ease-ds-out" data-reduced={reducedMotion}> {/* miss: motion/tailwind-timing */}
      <div style={{ transition: `opacity var(--ds-motion-duration-base)` }} /> {/* miss: motion/css-time */}
      <output>{String(props.on && lifts) + String(physics) + String(options.mass + visual)}</output>
    </div>
  );
}
