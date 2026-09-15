// Nested flavor groups (ARCHITECTURE §8), shared by the Tokens Studio and Figma-native flavors: a
// token sits at its flavor path (`flavorPath`: public-path segments, `sys.` dropped, `$root` →
// `default`), one JSON group per segment. Placing never overwrites anything: a path that is taken,
// or one that runs through a token, is a naming collision the caller reports as a build error
// (`naming/flavor-collision`; the source check `naming/root-default-collision` catches the common
// case, a `default` sibling next to a `$root`, before any format runs).

export type JsonObject = { [key: string]: unknown };

function isObject(v: unknown): v is JsonObject {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** A token node: an object with `$value`. */
export function isTokenNode(v: unknown): v is JsonObject {
  return isObject(v) && Object.hasOwn(v, '$value');
}

/**
 * Places `leaf` at `path` inside `root`, creating groups on the way. Returns null, or the dotted path
 * that is already taken (a token, or a group where the leaf should go).
 */
export function placeNode(root: JsonObject, path: readonly string[], leaf: JsonObject): string | null {
  if (path.length === 0) return '';
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i] ?? '';
    const next = Object.hasOwn(node, key) ? node[key] : undefined;
    if (next === undefined) {
      const group: JsonObject = {};
      node[key] = group;
      node = group;
    } else if (isObject(next) && !isTokenNode(next)) {
      node = next;
    } else {
      return path.slice(0, i + 1).join('.');
    }
  }
  const last = path[path.length - 1] ?? '';
  if (Object.hasOwn(node, last)) return path.join('.');
  node[last] = leaf;
  return null;
}

/** Every token node of a tree with its dotted path, depth first in key order. */
export function tokenNodes(root: JsonObject, prefix: readonly string[] = []): { readonly path: string; readonly node: JsonObject }[] {
  const out: { path: string; node: JsonObject }[] = [];
  for (const [key, v] of Object.entries(root)) {
    if (key.startsWith('$')) continue;
    if (isTokenNode(v)) out.push({ path: [...prefix, key].join('.'), node: v });
    else if (isObject(v)) out.push(...tokenNodes(v, [...prefix, key]));
  }
  return out;
}

/** JSON text of a generated file (ARCHITECTURE §12 rule 5). */
export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
