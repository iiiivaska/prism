/**
 * The one template fill every Prism component makes (ADR-0032 decision 5): a component reads the app's
 * table with `useStrings()` and fills a template from its own props here.
 *
 * Internal to this package: ./index.ts does not export it, so no app can come to depend on it or on its
 * no-escape rules, just as Apple's twin, `DSStrings.fill(_:_:)`, is `package` API in DSCore. What is public
 * on both stacks is the table, the root that sets it and the reader: `defaultStrings`, `<Theme strings>`
 * and `useStrings()` here, and `DSStrings`, `DSTheme(strings:)` and `\.dsStrings` on Apple. An app that
 * fills templates of its own does it with its own formatter.
 *
 * test/strings.test.ts asserts it against one table of vectors, and `DSStringsTests` asserts `fill(_:_:)`
 * against the same table, row for row.
 */

/** A placeholder name: a letter, then letters and digits (`{count}`, `{max}`). */
const PLACEHOLDER = /^[A-Za-z][A-Za-z0-9]*$/;

/**
 * Fills a template's `{placeholders}` from `values`, in one pass from left to right over the template's
 * code units (the twin of `DSStrings.fill(_:_:)`, which walks Unicode scalars; the two agree on every
 * template, because the only characters the pass looks at are ASCII).
 *
 * At a `{`, it finds the next `}`. When the text between them is a placeholder name and an own key of
 * `values`, it writes that value verbatim and continues after the `}`; otherwise it writes the `{` as it
 * is and continues with the next character. A value is never scanned again, so a `label` of `"{count}"`
 * stays `"{count}"`, and there is no escape syntax. A placeholder `values` does not name stays in the
 * output as written: a component fills a template only when every placeholder it declares has a value
 * (ADR-0032 rule 10), so a leftover `{name}` is a table that names a placeholder its key does not declare.
 */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  let out = "";
  let index = 0;
  while (index < template.length) {
    const open = template.indexOf("{", index);
    if (open === -1) {
      out += template.slice(index);
      break;
    }
    out += template.slice(index, open);
    const close = template.indexOf("}", open + 1);
    const name = close === -1 ? "" : template.slice(open + 1, close);
    const value = PLACEHOLDER.test(name) && Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) {
      out += "{";
      index = open + 1;
    } else {
      out += value;
      index = close + 1;
    }
  }
  return out;
}
