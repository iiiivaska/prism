// What Swift type each generated token member has.
//
// `manifest.json` says where a token lives on the Swift side (`swift: "DSTokenSet.border.focus"`),
// but not what type it is, and `DSTokenSet` has no reflection: its members are typed struct fields.
// The Apple token catalogue needs the type to pick a `KeyPath<DSTokenSet, …>` case, so this module
// reads it back out of the generated sources — the same files the member path names.
//
// Only what the catalogue needs is parsed: `public struct X` / `public enum X` nesting, and
// `public let|var name: Type` inside it. Anything else in the file is skipped, and a member the
// parser cannot find is reported rather than guessed.
import { posix } from 'node:path';
import type { SourceReader } from '../../tokens/source/reader.ts';

/** The directory whose generated Swift sources declare the token members. */
export const TOKENS_GENERATED_DIR = 'swift/Sources/DSTokens/Generated';

export interface TypeTable {
  /** Simple struct name → member name → declared type. */
  readonly structs: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

const STRUCT = /^\s*(?:public\s+|package\s+)?(?:struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
const MEMBER = /^\s*public\s+(?:let|var)\s+([A-Za-z_][A-Za-z0-9_`]*)\s*:\s*([A-Za-z_][A-Za-z0-9_.<>[\], ?]*?)\s*(?:\{|=|$)/;

/** Every `public let|var` of every struct declared in the generated token sources, by struct name. */
export function readTypeTable(reader: SourceReader, dir: string = TOKENS_GENERATED_DIR): TypeTable {
  const structs = new Map<string, Map<string, string>>();
  for (const entry of reader.list(dir)) {
    if (entry.dir || !entry.name.endsWith('.swift')) continue;
    parseFile(reader.readText(posix.join(dir, entry.name)), structs);
  }
  return { structs };
}

/** Brace-tracked scan: a member belongs to the innermost type declaration open around it. */
function parseFile(text: string, structs: Map<string, Map<string, string>>): void {
  const stack: { name: string; depth: number }[] = [];
  let depth = 0;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\/\/.*$/, '');
    const declaration = STRUCT.exec(line);
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    if (declaration !== null && opens > 0) {
      const name = declaration[1] ?? '';
      stack.push({ name, depth });
      if (!structs.has(name)) structs.set(name, new Map());
    } else {
      const member = MEMBER.exec(line);
      const top = stack[stack.length - 1];
      if (member !== null && top !== undefined) {
        const name = (member[1] ?? '').replace(/`/g, '');
        structs.get(top.name)?.set(name, (member[2] ?? '').trim());
      }
    }
    depth += opens - closes;
    while (stack.length > 0 && (stack[stack.length - 1]?.depth ?? 0) >= depth) stack.pop();
  }
}

export interface MemberLookup {
  /** The declared Swift type, e.g. `CGFloat`, `Color`, `DSTypeRole`. */
  readonly type: string;
  /** The member chain under the root struct: `['components', 'badge', 'accentBg']`. */
  readonly chain: readonly string[];
}

/**
 * The type of a member path such as `DSTokenSet.components.badge.accentBg`, walking the struct table
 * from `root`. Returns null when any step is missing, which is a stale catalogue, not a guess.
 */
export function memberType(table: TypeTable, root: string, chain: readonly string[]): MemberLookup | null {
  let current = root;
  let type = root;
  for (const step of chain) {
    const members = table.structs.get(current);
    const found = members?.get(step);
    if (found === undefined) return null;
    type = found;
    current = found;
  }
  return { type, chain };
}
