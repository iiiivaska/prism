# ADR-0034: A badge slot holds a Badge, not a view, and its host speaks the badge

- Status: accepted
- Date: 2026-09-23
- Decision record entry: docs/decisions.md #34

## Context

`IconButton.yaml` (roadmap P4-4) declares `badge` as a prop of `type: slot`, and its anatomy has a `badge` part with `slot: true`, described as "a Badge anchored outside the top-trailing corner; Badge owns its own look". Behavior 16 then asks three things of the button, and the spec's other clauses add two more:

- the button reads the badge's count as part of its own accessibility value, "in the words Badge.yaml gives it": the `strings.Badge.count` sentence when the badge carries a `label`, and the locale-formatted count alone when it does not (ADR-0032 decision 3 and rule 10);
- the badge is never an element of its own inside the button, even with a `label` (`Badge.yaml` behavior 10, the host clause), because the count would otherwise be said twice;
- the badge is never focusable, never changes the hit region and never moves the glyph;
- the button places it, at its own `tokens.badge.offset`, because Badge applies no offset (`spec/SCHEMA.md`: a component sets no space outside its root);
- the name is the same on both stacks. `DSIconButtonNameCase.all` on Apple and the table in `web/apps/gallery/test/accessibility.browser.test.tsx` hold `with-badge` to the label "Open notifications" with the value "3 unread" on Apple, and to the name "Open notifications, 3 unread" on the web, where a button has no value.

In the schema's words, a slot is content the caller supplies (`spec/component.schema.json`: `slot` is "true when the part accepts arbitrary child content"). Read literally, that makes the badge an opaque view, `some View` or `ReactNode`, whose words the button cannot see. The examples already treat this slot as a Badge and nothing else. `spec/SCHEMA.md` ("Slot content in examples") fills a slot whose anatomy names one component with that component's props, so `with-badge` writes `badge: { variant: count, tone: neutral, count: 3, label: "unread" }`. TabBar's destinations are data, `{ value, glyph, label, badge? }`, and its `with-badge` example writes `badge: { count: 3 }`.

P4-4 settled the question in its ticket, the same way on both stacks, and until now it was recorded only in the roadmap's P4-4 prose:

| | Apple | web |
|---|---|---|
| the slot's type | `badge: DSBadge?`, Badge's public view value | `badge?: IconButtonBadge`, which is `Pick<BadgeProps, "variant" \| "tone" \| "emphasis" \| "count" \| "max" \| "label">` |
| drawn by | `DSIconButtonBadgeSlot`, with `EnvironmentValues.dsBadgeIsHosted` set to true | IconButton itself, as `<Badge>` inside `<BadgeHostContext.Provider value={true}>` |
| the words | `DSBadge.contribution(locale:strings:)` | `badgeContribution(variant, count, label, locale, strings)` |
| spoken as | `.accessibilityValue(…, isEnabled: value != nil)` | the accessible name, `label`, then `iconButtonValueSeparator` (`", "`), then the contribution |

Many specs will copy this pattern. Thirteen specs that no stack implements yet name an IconButton in their own anatomy or slots: Alert, Banner, EmptyState, ListRow, Pagination, Popover, Sheet, Sidebar, Stepper, TabBar, Toast, Toolbar and TopBar (roadmap P4-4). TabBar forwards a `badge` to each destination's IconButton, and on iOS it adapts to the system tab bar, which takes a count and not a view. Other composites have badge slots of their own: StatCard's `badge`, anchored outside the corner of its icon ring; PillTabs' count trailing a tab's label, "read as part of the tab's accessibility value"; Sidebar's Badge trailing an item's label; and ListRow's leading and trailing Badge, "folded into the row's own label".

## Decision

1. **A slot whose anatomy names Badge as its one component is typed as a Badge on both stacks, never as arbitrary content.** On Apple its type is `DSBadge?`: the public view value, whose props the host reads inside `DSComponents`. On the web it is a props object named `<Host>Badge`, `Pick<BadgeProps, …>` of Badge's six props (`IconButtonBadge` today), which the host renders as `<Badge>` itself. The slot takes nothing else: no view, no string, no number.
2. **The host draws the badge, and draws it hidden.** The host sets Badge's host flag around the badge: `EnvironmentValues.dsBadgeIsHosted` on Apple, `BadgeHostContext` on the web. The badge is then no element of its own, even when it carries a `label` (`Badge.yaml` behavior 10). The host also places the badge: at its own `tokens.badge.offset` when the badge sits on a corner, and in its own flow when it trails a label.
3. **The host speaks the badge once, in Badge's words, in the render that draws it.** The host reads the contribution through Badge's own function, `DSBadge.contribution(locale:strings:)` or `badgeContribution(…)`, with its own locale and strings table, which are the badge's too because the badge renders inside it. The host composes no word, digit or `+` of its own. The channel is the host spec's to state. IconButton uses the accessibility value on Apple, and on the web the accessible name after `", "`, because a web button has no value. A host that folds the count into its label, as ListRow's trailing mark is folded, says so in its spec.
4. **A badge with nothing to say contributes nothing.** That covers a hidden badge (a count of 0, a count badge with no count, a count that is not a whole number of at least 1) and a dot with no `label`, which is drawn but has no words. The host then carries no value. On Apple the value modifier stays in place with `isEnabled: false`, so the button keeps its identity, and its focus, when a badge appears or goes.
5. **The host flag and the contribution function stay internal to each package.** The public API is the slot's type. An app that wants a count on a control uses the Prism component that hosts one. It does not assemble a Badge and a label of its own.

## Alternatives considered

- **An opaque view slot: `some View` or `ReactNode`, what `slot` means elsewhere.** It lost for three reasons.
  - *The host cannot read the words in the render that draws them.* On Apple a child passes a value up only through a preference key. The parent reads it after the child's layout and has to keep it in state, so the button's value would arrive an update late. On the web a child cannot pass its parent a string during render at all, and a server render runs no effects, so the server's HTML would carry the bare label, and hydration would change the name.
  - *The host cannot hide or tame what it cannot identify.* A `Text("3")` passed into the slot would be a second element saying the count, and a focusable view would be a focus stop inside a button. Behavior 16 and `Badge.yaml` behavior 10 forbid both.
  - *Data-driven hosts could not be written.* TabBar's destinations are data, and its iOS rendering hands each count to the system tab bar's own badge, which takes a number. A typed value can be read for its count; a view cannot.
- **A count prop on IconButton (`badgeCount`, then `badgeLabel`, `badgeTone`, …).** It lost because it re-declares Badge's API on every host. IconButton would carry it, then each TabBar destination, StatCard, PillTabs, Sidebar and ListRow: six props per host, kept in step with `Badge.yaml` by hand. The first prop Badge gains becomes one more prop on every host. It also moves Badge's look and Badge's words into the host. "Badge owns its own look" is IconButton's own anatomy line, and ADR-0032 gives `strings.Badge.count` one owner. A typed slot carries the same data and leaves it with that one owner.
- **A typed slot on one stack and a view on the other.** It lost because the two stacks would name the same example differently. The web would read the count from a context after render, and its server-rendered name would lack the count that Apple's value carries. Both stacks hold the same name table, so the tables would diverge.

## Consequences

- **Accessibility.** The count is said once, by the control it marks, in the app's `strings.Badge.count` template and the environment's locale. VoiceOver reads the label "Open notifications", then the value "3 unread". The web's name is "Open notifications, 3 unread". A badge with no `label` contributes its count alone ("Alerts, 3"). Above `max` the badge draws `99+` and speaks the true count. On Apple a changed count changes the value and leaves the name alone; on the web it changes the name. Neither stack announces a changed count on its own, and this decision adds no announcement. A count that must be announced when it changes is a live region's job, and the host's spec states it.
- **What a caller cannot do.** A caller cannot put a custom mark in the corner, such as an image, a spinner or a coloured dot of its own. That limit is deliberate. A new mark is a Badge variant, which is a change to `Badge.yaml`, and never a trick with the slot.
- **The spec vocabulary is unchanged.** `type: slot` and `slot: true` still mean content the caller supplies. What narrows a badge slot is its anatomy naming exactly one component, which `spec/SCHEMA.md`'s slot-content forms already read that way. `spec:validate` does not check a slot's type, so this ADR and each host's name and binding tests are the check. `component.schema.json`'s phrase "arbitrary child content" is looser than this rule, and it is left as it is until the schema can name the one component a part holds.
- **Every host carries the cost.** A host has to be a Prism component in the same package as Badge, because the flag and the function are internal. Each host gets the host flag, the contribution read, one name-table row per stack for its badge example, and an example with the slot filled, so that both snapshot suites prove the placement.

## Rules that follow

1. A slot whose anatomy names Badge is typed as Badge. On Apple its type is `DSBadge?`. On the web it is `<Host>Badge = Pick<BadgeProps, "variant" | "tone" | "emphasis" | "count" | "max" | "label">`, exported beside the host's props. It is never `some View`, `AnyView`, `ReactNode`, a string or a number.
2. The host renders the badge itself, inside the host flag: `.environment(\.dsBadgeIsHosted, true)` on Apple, `<BadgeHostContext.Provider value={true}>` on the web. It places the badge by its own `tokens.badge.offset`, or in its own flow, as its spec says.
3. The host reads the words only through `DSBadge.contribution(locale:strings:)` or `badgeContribution(…)`, in the same render, and never formats a count or fills `strings.Badge.count` itself.
4. The host's spec names the channel for the contribution: the accessibility value, or folded into the label. On the web, where the host's role has no value (a button, a tab), the contribution follows the name after `", "`.
5. **A composite that hosts IconButton** passes a count to it only through IconButton's `badge` prop, and forwards that value unchanged, as TabBar forwards each destination's `badge`. It must not draw a Badge beside or over the IconButton. It must not put the count into the IconButton's `label`, or into its own name. It must not set the host flag around the IconButton. And it must not read the badge's contribution into an accessibility element of its own, because the IconButton already speaks it, and a second reading says the count twice.
6. A composite that adapts to a system control with a badge of its own, such as the iOS TabBar on the system tab bar, hands the count from the typed value to that control's badge API and draws no Badge. The system speaks the count.
7. Every host has a spec example with its badge slot filled, a name-table row for that example on each stack, and binding tests that read its `badge.offset`, or its flow, off the spec.
8. The host flag and the contribution function stay internal. Neither becomes public API to let an app build a host of its own.
