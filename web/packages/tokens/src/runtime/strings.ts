/**
 * The component-owned strings of ADR-0032: every word a Prism component speaks or draws that its caller
 * did not pass, as one flat table an app replaces once, at the root.
 *
 * The keys and their English defaults are `spec/strings.yaml`, which is the contract (ADR-0032 rule 4):
 * a key is `<Component>.<name>` and a value is a template whose `{placeholders}` the component fills from
 * its own props. `web/packages/react/test/strings.test.ts` reads that file and holds this table to it, key
 * for key, in order, default for default; `DSStrings` is the Apple twin, held to the same file by
 * `DSStringsTests`. An app hands its own table to `<Theme strings>` (`./react`), shallow-merged over these
 * defaults, and a component reads the result with `useStrings()`. The components fill a template with
 * `fillTemplate`, which is internal to `@iiiivaska/prism-react` (web/packages/react/src/strings.ts), as
 * Apple's `DSStrings.fill(_:_:)` is `package` API: an app does not depend on Prism's fill.
 *
 * Every key is read by the component it names: `Button.loading` by Button from Button.yaml specVersion
 * 5, and `Chip.remove` by Chip from Chip.yaml specVersion 1.
 *
 * Framework-free, like the rest of the root export: the React half is `<Theme strings>` and
 * `useStrings()` in `../react/index.ts`.
 */

/**
 * Prism's English defaults, in the order of `spec/strings.yaml`. Frozen, so they are a value as Apple's
 * `DSStrings.english` is: `as const` only stops a typed caller, and no caller can change the English every
 * `<Theme>` merges over.
 */
export const defaultStrings = Object.freeze({
  "Badge.count": "{count} {label}",
  "Badge.overflow": "{max}+",
  "Button.loading": "{label}, loading",
  "Chip.remove": "Remove {label}",
} as const);

/** A key of the table: `<Component>.<name>` (ADR-0032 decision 3). */
export type StringKey = keyof typeof defaultStrings;

/** A whole table: one template per key. An app passes a `Partial` of it to `<Theme strings>`. */
export type StringsTable = { readonly [K in StringKey]: string };
