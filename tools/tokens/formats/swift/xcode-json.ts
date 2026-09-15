// Xcode-style JSON (ARCHITECTURE §9.8): the layout Xcode itself writes into asset catalogs, so opening
// the catalog in Xcode does not rewrite it: 2-space indent, `"key" : value`, keys sorted by code unit,
// every object and array expanded onto its own lines, a final newline (the layout of the colorsets
// Xcode 26.6 and 27.0 ship, e.g. SystemColors-ios.xcassets/labelColor.colorset). The catalog never
// holds an empty object or array.

export type XcodeJson = string | number | boolean | null | readonly XcodeJson[] | { readonly [key: string]: XcodeJson };

function scalar(v: string | number | boolean | null): string {
  if (typeof v === 'number' && !Number.isFinite(v)) throw new RangeError(`cannot serialize ${v}`);
  return JSON.stringify(v);
}

function render(value: XcodeJson, indent: string): string {
  if (value === null || typeof value !== 'object') return scalar(value);
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    const items = value as readonly XcodeJson[];
    if (items.length === 0) return '[]';
    return `[\n${items.map((v) => `${inner}${render(v, inner)}`).join(',\n')}\n${indent}]`;
  }
  const record = value as { readonly [key: string]: XcodeJson };
  const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (keys.length === 0) return '{}';
  return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)} : ${render(record[k] ?? null, inner)}`).join(',\n')}\n${indent}}`;
}

/** The file text: the value in Xcode's layout plus a final newline. */
export function xcodeJson(value: XcodeJson): string {
  return `${render(value, '')}\n`;
}
