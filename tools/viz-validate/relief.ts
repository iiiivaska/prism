// The relief declaration (README.md, "Relief"): which series slots, in which base schemes and brands, ship a
// relief channel, so that check 6 accepts them below 3:1 against the plot and check 4 accepts an adjacent pair
// in the 6–8 CVD band. It is read from `viz-relief.json` next to the resolver (`--relief` moves it); a tree
// without the file declares no relief, which only makes the checks stricter.
//
//   {
//     "$comment": "optional",
//     "declarations": [
//       { "relief": "direct-labels" | "table-twin", "slots": [2, 4], "schemes": ["light"], "brands": ["prism"], "note": "optional" }
//     ]
//   }
//
// `slots` is required; `schemes` (base schemes, their increased-contrast and reduced-transparency contexts
// included) and `brands` default to every scheme and every brand.
export const RELIEFS = ['direct-labels', 'table-twin'] as const;
export type Relief = (typeof RELIEFS)[number];

export type Scheme = 'light' | 'dark';
const SCHEMES: readonly Scheme[] = ['light', 'dark'];

export interface Declaration {
  readonly index: number;
  readonly relief: Relief;
  readonly slots: readonly number[];
  /** null: every base scheme. */
  readonly schemes: readonly Scheme[] | null;
  /** null: every brand. */
  readonly brands: readonly string[] | null;
  readonly note: string | null;
}

export interface ReliefFile {
  readonly declarations: readonly Declaration[];
}

const TOP_KEYS = ['$comment', 'declarations'];
const ENTRY_KEYS = ['relief', 'slots', 'schemes', 'brands', 'note'];

function isRelief(value: unknown): value is Relief {
  return typeof value === 'string' && (RELIEFS as readonly string[]).includes(value);
}

function distinct(list: readonly unknown[]): boolean {
  return new Set(list).size === list.length;
}

/** Parses and validates the file's structure; names (slots, brands) are checked against the palettes later. */
export function parseReliefFile(text: string): { readonly file: ReliefFile | null; readonly problems: readonly string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { file: null, problems: [`not JSON: ${e instanceof Error ? e.message : String(e)}`] };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { file: null, problems: ['must be an object with "declarations"'] };
  const top = raw as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of Object.keys(top)) if (!TOP_KEYS.includes(key)) problems.push(`"${key}" is not a key of a relief file; known: ${TOP_KEYS.join(', ')}`);
  if (top['$comment'] !== undefined && typeof top['$comment'] !== 'string') problems.push('"$comment" must be a string');
  const entries = top['declarations'];
  if (!Array.isArray(entries)) return { file: null, problems: [...problems, '"declarations" must be a list'] };

  const declarations: Declaration[] = [];
  entries.forEach((entry: unknown, index) => {
    const where = `declarations[${index}]`;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      problems.push(`${where} must be an object`);
      return;
    }
    const e = entry as Record<string, unknown>;
    const before = problems.length;
    for (const key of Object.keys(e)) if (!ENTRY_KEYS.includes(key)) problems.push(`${where}: "${key}" is not a key of a declaration; known: ${ENTRY_KEYS.join(', ')}`);
    const relief = e['relief'];
    if (!isRelief(relief)) problems.push(`${where}: "relief" must be ${RELIEFS.map((r) => `"${r}"`).join(' or ')}, not ${JSON.stringify(relief)}`);
    const slots = e['slots'];
    const slotsOk = Array.isArray(slots) && slots.length > 0 && slots.every((s) => Number.isInteger(s) && (s as number) >= 1) && distinct(slots);
    if (!slotsOk) problems.push(`${where}: "slots" must be a non-empty list of distinct slot numbers (1, 2, …)`);
    let schemes: Scheme[] | null = null;
    if (e['schemes'] !== undefined) {
      const list = e['schemes'];
      if (Array.isArray(list) && list.length > 0 && list.every((s) => (SCHEMES as readonly unknown[]).includes(s)) && distinct(list)) schemes = list as Scheme[];
      else problems.push(`${where}: "schemes" must be a non-empty list of distinct base schemes (${SCHEMES.join(', ')})`);
    }
    let brands: string[] | null = null;
    if (e['brands'] !== undefined) {
      const list = e['brands'];
      if (Array.isArray(list) && list.length > 0 && list.every((b) => typeof b === 'string' && b !== '') && distinct(list)) brands = list as string[];
      else problems.push(`${where}: "brands" must be a non-empty list of distinct brand names`);
    }
    let note: string | null = null;
    if (e['note'] !== undefined) {
      if (typeof e['note'] === 'string') note = e['note'];
      else problems.push(`${where}: "note" must be a string`);
    }
    if (problems.length === before && isRelief(relief) && slotsOk) declarations.push({ index, relief, slots: slots as number[], schemes, brands, note });
  });
  if (problems.length > 0) return { file: null, problems };
  return { file: { declarations }, problems };
}

/** The reliefs declared for one slot in one brand and base scheme, in declaration order, without repeats. */
export function reliefsFor(file: ReliefFile, brand: string, scheme: Scheme, slot: number): readonly Relief[] {
  const out: Relief[] = [];
  for (const d of file.declarations) {
    if (!d.slots.includes(slot)) continue;
    if (d.schemes !== null && !d.schemes.includes(scheme)) continue;
    if (d.brands !== null && !d.brands.includes(brand)) continue;
    if (!out.includes(d.relief)) out.push(d.relief);
  }
  return out;
}
