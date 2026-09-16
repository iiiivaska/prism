// The brand-invariant counterpart of each brand pattern (ADR-0020 rule 13, §6); `miss:` names the
// rule it must not trip. Components read brand values from the table the app handed to Prism.
import { brandTokens, scope } from "@iiiivaska/prism-tokens"; // miss: brand/token-module
import { useBrandTokens } from "@iiiivaska/prism-tokens/react"; // miss: brand/token-module
import "@iiiivaska/prism-tokens/motion.css"; // miss: brand/stylesheet
import "@iiiivaska/prism-tokens/tailwind.css"; // miss: brand/stylesheet
import "./surface.css"; // miss: brand/stylesheet
import "./surface-tokens.css"; // miss: brand/stylesheet
import { spring } from "./motion.ts"; // miss: brand/token-module

export function Surface(props: { children?: unknown }) {
  const table = useBrandTokens(); // miss: brand/token-module
  const outside = brandTokens(); // miss: brand/token-module
  return [scope({ colorScheme: "dark" }), table, outside, spring, props.children];
}
