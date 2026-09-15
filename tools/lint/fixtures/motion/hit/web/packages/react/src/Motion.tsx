// One line per motion pattern (ADR-0023 §12); `expect:` names the rule the line must trip.
import { generateLinearEasing } from "motion"; // expect: motion/generate-linear-easing
import { MotionConfig, useReducedMotion } from "motion/react"; // expect: motion/ts-use-reduced-motion

const stiff = { stiffness: 300 }; // expect: motion/ts-physics
const soft = { damping: 30 }; // expect: motion/ts-physics
const heavy = { mass: 1 }; // expect: motion/ts-physics
const timed = { visualDuration: 0.3 }; // expect: motion/visual-duration
const springy = { bounce: 0.2 }; // expect: motion/ts-bounce

export function Toggle(props: { on: boolean }) {
  const reduce = useReducedMotion(); // expect: motion/ts-use-reduced-motion
  const curve = generateLinearEasing((t: number) => t, 300); // expect: motion/generate-linear-easing
  return (
    <MotionConfig reducedMotion="user"> {/* expect: motion/ts-reduced-motion-prop */}
      <div className="transition-opacity duration-150" /> {/* expect: motion/tailwind-timing */}
      <div className="ease-in-out" /> {/* expect: motion/tailwind-timing */}
      <div style={{ transition: "opacity 150ms" }} /> {/* expect: motion/css-time */}
      <div style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }} /> {/* expect: motion/css-easing */}
      <div style={{ animationTimingFunction: "linear" }} /> {/* expect: motion/css-easing-keyword */}
      <output>{String(props.on && reduce)}</output>
    </MotionConfig>
  );
}
