# ADR-0041: A control is named by its `label`, drawn or hidden; `labelVisibility` hides it, and a host that draws the words hands them over through a name context

- Status: accepted (decision 10 is proposed: see "Owner questions")
- Date: 2026-09-26
- Decision record entry: docs/decisions.md #41

## Context

The wave-2 planning pass (roadmap P4-9) found ten specs that promise a name for a control that draws no label, and none that says where the name comes from:

- **An optional `label` with no route.** It is optional in Toggle, Checkbox, Radio, Slider and TextArea, which each promise an explicit accessibility name when it is absent ("when it is absent the control carries an explicit accessibility name", in Toggle's words). No prop carries that name. TextField's `label` is "required unless the caller supplies an accessibility label", and no prop carries that either.
- **Examples that name nothing.** TextField and Select draw no label over media. Their `chip-over-map` examples pass no `label`, and neither does Select's `on-vivid`.
- **A group with no name prop.** SegmentedControl's group name is "given by the caller", and no prop takes it. It names an icon-only segment "from the registry id's meaning", which ADR-0032 decision 8 forbids.
- **A condition the component cannot see.** ProgressBar and ProgressRing require `label` only when "nothing beside them names the work", which neither of them can see.

So eight examples render a control with no name: the `bare` examples of Toggle, Checkbox, Radio and ProgressBar, TextField's `chip-over-map`, Select's `chip-over-map` and `on-vivid`, and SegmentedControl's `icon-only`.

The four specs that host such a control say how they name it only in words:

- FormField at `layout: inline` hands the name "through the wiring".
- ListRow's trailing control "takes the row's title".
- Checkbox's `bare` takes its name "from the row or the table header that hosts it", and Table says nothing about how.
- SearchField requires `label`, and draws none over media.

What the repository and the platforms already have:

- **The implemented components name a control by `label` and refuse a second name.**
  - IconButton's `label` is required and never drawn. Apple reads it into `accessibilityLabel` in the three forms Button's label takes: a `LocalizedStringKey` that the app's own catalog resolves, a verbatim string, or a `StringProtocol` used as given (`DSIconButton.swift`).
  - The web writes the same `label` as `aria-label`. It leaves `aria-label` and `aria-labelledby` out of the props and overrides them at runtime, so that "nothing a caller casts past the type relabels the button". In development it reports a blank `label` with `console.error` (`checkProps`, `IconButton.tsx`).
  - Chip withholds the same two attributes, because "the label is the only name a chip has" (`Chip.tsx`). Its remove control is a sub-control Chip draws itself, and it is named by `strings.Chip.remove` filled with the chip's `label` (ADR-0032).
- **One spec already names the axis.** FormField declares `labelVisibility: visible | hidden` with the default `visible`: "hidden keeps the label for assistive technology only, for a control whose place already names it". SCHEMA's "one meaning, one name" asks every other spec with that meaning to take the same name.
- **Groups are named the same way.** Table, Toolbar and ContextMenu name their group with a required `label` they never draw. ProgressRing's `label` is never drawn either, because its anatomy has no label part.
- **SwiftUI keeps a hidden label as the name.**
  - `labelsHidden()` (iOS 13, macOS 10.15, watchOS 6) and `labelsVisibility(_:)` (iOS 18, macOS 15, watchOS 11, all below Prism's 26 floor) hide a control's label.
  - Apple's documentation of both says: "Always provide a label for controls, even when you hide the label, because SwiftUI uses labels for other purposes, including accessibility."
  - `labelsVisibility` takes SwiftUI's `Visibility`, whose cases are `automatic`, `visible` and `hidden`.
- **React Aria reports a control with no name.** Outside production, `useLabel` warns "If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute for accessibility" (react-aria 3.52.1, `dist/private/label/useLabel.mjs`).
- **The standards and the audit tools require the name.**
  - WAI-ARIA 1.2 requires an accessible name for `switch`, `checkbox`, `radio`, `radiogroup`, `slider`, `textbox`, `combobox` and `progressbar`. MDN's progressbar page says: "An accessible name is required."
  - axe-core 4.13.0, which is in the workspace's installed dependencies, rates a nameless one a serious failure: `aria-toggle-field-name` for a checkbox, radio or switch and `aria-input-field-name` for a slider, textbox or combobox (both WCAG 4.1.2), and `aria-progressbar-name`.
  - Where the words are drawn, WCAG 2.5.3 (Label in Name) asks that the name contain them.
- **A host cannot rewrite a control it is handed.**
  - FormField's control and ListRow's trailing control are views the caller built. SwiftUI cannot change the props of a view it is handed. On the web, only `cloneElement` can, and nothing in Prism uses it.
  - Both platforms pass values down a tree instead: SwiftUI's environment, and React context.
  - React Aria's own components merge a context's props under the component's own, so the component's own props win (`useContextProps`, which calls `mergeProps(contextProps, props)`, react-aria-components 1.21.1).
  - Roadmap P4-34 asks for "a field context that every control reads", and names the name route as the one this ticket settles.
- **SwiftUI has a pairing modifier, but it does not name.** `accessibilityLabeledPair(role:id:in:)` pairs a label element with its content (iOS 14, macOS 11, watchOS 7). Apple documents it as improving how VoiceOver navigates the two, not as setting the content's label. Both ends of the pair need an id and a namespace that they share.

## Decision

1. **A control's name is its `label` prop, the same string whether it is drawn or not.**
   - The name is never a second prop, such as `accessibilityLabel` or `ariaLabel`.
   - It is never an icon registry id (ADR-0032 decision 8), and never a placeholder, a value, a unit, a glyph or the platform's default string for a role ("Switch").
   - A group names itself the same way: SegmentedControl's `label` names its radiogroup, as Table's and Toolbar's name theirs.
   - An item of a `data` prop names itself the same way: each SegmentedControl segment carries its own `label`.

2. **`labelVisibility` decides whether a component that draws its label draws it.**
   - It is declared exactly as FormField declares it: `type: enum`, `values: [visible, hidden]`, `default: visible`. It sits beside the `label` it governs, on a component or on an item.
   - `hidden` draws no label and keeps `label` as the accessible name.
   - `visible` is a request. A component whose spec draws no label on some ground still draws none there, and `label` still names it: TextField and Select over media, and ProgressBar on vivid.
   - A segment with `labelVisibility: hidden` is the icon-only segment.
   - Each stack has one type for it, which every control shares: `DSLabelVisibility` (`.visible`, `.hidden`) on Apple, and `LabelVisibility` (`"visible" | "hidden"`) on the web.

3. **A name that no host hands over is required.**
   - A component that never draws its name declares no `labelVisibility`: IconButton, ProgressRing, SegmentedControl's group, Table, Toolbar and ContextMenu.
   - Their `label` is required, and so is ProgressBar's, which draws its label but sits in no host that draws it. Nothing hosts these components and draws their words today, and none of them can see the text beside it.
   - A host that comes to draw one of these names, such as a FormField around a group (roadmap P4-14 and P4-34), makes that `label` optional in the same change and hands the name over by decision 5.

4. **The caller's route.** A caller who places a control with no visible label passes `label` with `labelVisibility: hidden`.
   - When other text near the control is what identifies it on screen, such as the row beside a bare ProgressBar, the hidden label repeats those words, so the name contains what is drawn (WCAG 2.5.3).
   - A composite that builds the control itself is that control's caller and takes this route. Table hands each selection Checkbox a `label` with `labelVisibility: hidden`. SearchField forwards its `label` and `labelVisibility` to the TextField it builds.

5. **The host's route: the name context.**
   - **Who publishes.** A host that holds a caller-built control and draws that control's name itself publishes the name to the slot that holds the control, and to nothing else: FormField to its `control`, and ListRow to its `trailing`.
   - **What it carries.** The name context carries the pair, `label` and `labelVisibility`.
   - **Who reads it.** A control that declares `labelVisibility` and was given no `label` takes the pair and draws or hides the label as the pair says. A control that was given a `label` keeps its own pair, and the context changes nothing about it. An IconButton in a row's trailing slot declares no `labelVisibility`, reads no context and keeps its own `label`, which names its action.
   - **What FormField publishes.** It publishes its `label`. At `layout: stacked` it publishes `visible`, and the control draws the label. At `layout: inline` it draws the label as the row's title and publishes `hidden`. Its own `labelVisibility: hidden` publishes `hidden` at either layout. At `kind: group` its label names the group element itself and is handed to no option.
   - **What ListRow publishes.** It publishes its `title` with `hidden`, to a trailing control that draws a label of its own, such as a Toggle or a Checkbox.
   - **Where it lives.** The context is an internal environment value on Apple and an internal React context on the web.
   - **The words.** The words that reach the control are the host's own, exactly as the host draws them. The web control may carry them as `aria-label`, or point at the host's drawn words with `aria-labelledby`, because the computed name is the same string either way.
   - **What extends it.** Roadmap P4-34 extends this one context to the description and to the invalid, required and disabled states, rather than adding a second context.

6. **How the name reaches assistive technology.**
   - Apple applies `accessibilityLabel` from `label`, in IconButton's three forms. A control built on a SwiftUI control may hide the label with that control's own `labelsVisibility(.hidden)`, which keeps the label as the name.
   - The web writes a hidden label as `aria-label` on the element React Aria names, as IconButton does, and a visible one as the label element React Aria wires.
   - On both stacks the control's props leave out every other name attribute, as IconButton's and Chip's do.

7. **A control rendered with no name is a defect that each stack reports in development.** A control with no name has no `label` and no pair from a host. The web reports it with `console.error`, as IconButton reports a blank `label`. Apple reports it with `assert`, as `DSTheme` does for a nested brand.

8. **Localisation.**
   - A name belongs to one instance, so it is the caller's prop and never a `strings` key: it is ADR-0032's route 2.3.
   - The `strings` table keeps only the templates Prism fills for the sub-controls it draws itself. Such a template is filled with its component's `label`, hidden or not, as `strings.Chip.remove` is.
   - A hidden label is translated the way a drawn one is. On Apple, a literal at the call site is a `LocalizedStringKey` that the app's own catalog resolves, as it is for SwiftUI's `Toggle("…")`. On the web, the label is a string the app has already translated.
   - A host hands over the words it draws, in the locale it draws them in.

9. **What `spec:validate` enforces.**
   - `prop/second-name` fails a prop that is a second name for the name or for its visibility. The names are the closed list `SECOND_NAMES` in `tools/spec/config.ts`. It holds `showsLabel` because SCHEMA's boolean rule would otherwise make that the natural name, and the axis is FormField's enum. `prop/boolean-name` leaves the names on the list, and a boolean `labelVisibility`, to the two rules here.
   - `prop/label-visibility` fails a `labelVisibility` that is not declared as FormField declares it (`LABEL_VISIBILITY`), or that has no `label` string beside it.
   - `example/name` fails an example that renders what it names with no name. An example has no host, so:
     - every example of a spec that requires `label` or declares `labelVisibility` sets a non-blank `label`;
     - every item of a `data` or `slot` value that carries a glyph (`icon` or `glyph`, at any depth) sets one too;
     - an item that sets `labelVisibility` sets a `label` beside it, with the value `visible` or `hidden`.
   - Each rule has a failing fixture. After this change the three rules find nothing outside the specs this ADR edits, so there is no allow-list.

10. **Proposed: the name context is public from P4-34 on.** FormField promises to wire "app controls" as well as Prism's. An app's own control can take FormField's name only if it can read the context: a read-only environment value on Apple and a hook on the web. This ADR keeps the context internal, and P4-34 decides when it extends the context.

## Alternatives considered

- **A second prop, `accessibilityLabel`** (TextField's "unless the caller supplies an accessibility label"). It lost for three reasons. Two props for one name need a precedence rule that each stack would write for itself. A caller who passes both can give the drawn label one name and the accessibility tree another, which WCAG 2.5.3 forbids. And the implemented IconButton and Chip already withhold `aria-label` and `aria-labelledby` for that reason. SCHEMA's "one meaning, one name" rules it out as well.
- **A boolean, `showsLabel`.** SCHEMA's boolean rule gives this name to a part that is there either way and only drawn or not. It lost to the name FormField already declares. That name also matches SwiftUI's own `labelsVisibility(_: Visibility)`. Renaming FormField's prop would have moved the one spec that was already right. The enum can also take a later value, such as a label that a Tooltip shows on hover or focus, without renaming the axis.
- **A `strings` key per control.** It lost because a name belongs to one instance. ADR-0032 keeps per-instance words as props, and keeps the table for the few templates Prism fills itself.
- **A name slot that holds a view.** It lost because a view cannot be read as a string in the render that draws it, which is ADR-0034's reason for typed slots. Apple needs a string for `accessibilityLabel`.
- **A pointer with no string**: `aria-labelledby` on the web and `accessibilityLabeledPair` on Apple, from the control to the host's drawn words. It lost as the route, and stays an option on the web. Both ends of a pointer need an id that the other end knows, so the host must hand the control something through a context either way. Apple documents the pairing as help for navigation, not as a name, while `accessibilityLabel` is the name.
- **The host's pair overriding the control's own.** It lost for three reasons.
  - Both platforms let the nearest explicit value win: React Aria's `useContextProps` merges a component's own props over its context's, and in SwiftUI a view's own argument or the nearest environment write wins.
  - An override would rename controls the host does not name, such as a trailing IconButton, or the two Sliders of an app's range control inside one FormField.
  - A caller who passes a `label` to a hosted Toggle sees the Toggle draw it beside the row's title. That duplication shows in a screenshot, where a replaced name would not show at all.
- **Inferring the name from the neighbourhood.** It lost because a component cannot see the row's text, the table's header or a Text beside the bar. That is the defect in ProgressBar and ProgressRing.

## Consequences

- **The eight examples.** They now render named controls without changing a pixel, because a hidden label draws nothing. The TextField example's old placeholder, "Search this area", was acting as a name, so it moved into `label`, and the placeholder became an example value ("Street or depot"), as SearchField's `chip-over-map` has.
- **No bump.** The ten specs and the four hosts are unimplemented, so they are edited in place with no `specVersion` bump.
- **What each wave-2 control now owes.** Every wave-2 control implements both routes. The wave acceptance asks for the name each example exposes to be checked by a test on each stack; that test now reads `label` through both routes. P4-12, the first control to land, lands `DSLabelVisibility`, `LabelVisibility` and the name context on both stacks.
- **The hosts.** ListRow (P4-31) and FormField (P4-34) publish the context. P4-34 extends it, and P4-25's typed slots decide what a slot holds, not how a name reaches it.
- **A risk no gate sees.** A hidden label appears nowhere on screen, so a translation checked by eye can miss it, and no gate can see that. Like ADR-0032's forgotten table, it is an omission in the consumer's own tree.
- **No Russian example for a hidden label.** The Russian examples keep their job, which is layout under long strings. A hidden label has no layout, so none is added for one.
- **The skill.** Rule 5 of the skill, "Every icon-only control has a label", becomes "every control has a name, drawn or hidden" in the change that lands the first control with `labelVisibility`.
- **Work this decision creates elsewhere.**
  - P4-26 extends the rule to the composites' groups and landmarks, and to Stepper, whose `label` is "required unless a FormField supplies one". Where an element's drawn name is its `title`, as in Sheet and Popover, the same rule gives it one prop, not a `title` and a `label` both.
  - P4-15 keys the names of TextField's trailing actions (P4-15 (2)), filled with its `label`.
  - P4-46 and P4-26 choose the words Table hands its Checkboxes.
  - P4-25's `example/required` covers every required prop. The required half of `example/name` then says the same thing, so P4-25 keeps one of the two.

## Rules that follow

1. A control, a group or an item that has a name takes it through `label`, whether or not it is drawn. No spec declares a second prop for the name or for its visibility (`prop/second-name`).
2. `labelVisibility` is declared as FormField declares it: an enum of `visible` and `hidden`, default `visible`. It sits beside the `label` it governs, on a component that draws its label or on an item (`prop/label-visibility`). `hidden` draws nothing and keeps the name. `visible` is a request that a ground may refuse.
3. A component that never draws its name declares no `labelVisibility`. A `label` that no host hands over is required, until a host that draws the name exists.
4. A caller names a control that draws no label with `label` and `labelVisibility: hidden`. A composite that builds a control is that control's caller.
5. A host that draws a control's name hands `label` and `labelVisibility` to the slot that holds the control, through the name context. A control with no `label` of its own takes the pair, and one with a `label` keeps its own.
6. The name that reaches assistive technology is exactly `label`, or the host's words. Each stack's tests read it through both routes.
7. A control that renders with no name is reported in development on both stacks.
8. Every example names what it renders (`example/name`). An example of a spec that requires `label` or declares `labelVisibility` sets it. An item of a `data` or `slot` value that carries a glyph sets `label`, and an item's `labelVisibility` sits beside a `label`.
9. A name is never a `strings` key. A sub-control that Prism draws itself is named by a `strings` template filled with its component's `label`, hidden or not.

## Owner questions

1. **The public name context (decision 10, proposed).** Should an app's own control read Prism's name context, so that FormField can name it as FormField's spec promises? Or should FormField stop promising to wire app controls? The proposal is a public, read-only context from P4-34 on: an environment value on Apple and a hook on the web. Nothing before P4-34 depends on the answer.
