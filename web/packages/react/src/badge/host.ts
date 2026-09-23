/**
 * The host flag of Badge.yaml behavior 10: a badge inside a host that reads it is never an element of
 * its own, even when it carries a `label`, because the host speaks the badge's contribution as part of its
 * own accessibility value and a second element would say the count twice.
 *
 * Internal, never exported from the package: a host part (IconButton's `badge` slot, roadmap P4-4)
 * provides `true` around the Badge it places, and how it carries the contribution (`badgeContribution`,
 * ./text.ts) into its own name is that host's decision. The Apple twin is `EnvironmentValues.dsBadgeIsHosted`.
 */
import { createContext } from "react";

/** True inside a host that reads its badge; false everywhere else, which is every badge today. */
export const BadgeHostContext = createContext(false);
