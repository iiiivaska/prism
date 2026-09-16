// Token paths in spec prose (ADR-0024 §5.2): the string values of `behavior`, `accessibility`,
// `usage` and `notes` are read word by word with trailing punctuation stripped, and every word that
// is a token path or glob under §13.2's grammar must resolve. The grammar is the one
// tools/tokens/docs.test.ts applies to the living documents, restricted to what prose can contain:
// a path starts with `ref.`, `sys.` or `comp.`, or with a `sys` category, and a segment may use
// `a|b` alternation, `N…M` ranges, `*` and `**`. Strings with a slash, alias braces or a file
// extension other than `.md` are not candidates, so a spec can still name a file or show what is
// invalid.

/** The four prose fields (ADR-0024 §5.2). */
export const PROSE_FIELDS: readonly string[] = ['behavior', 'accessibility', 'usage', 'notes'];

const FILE_EXTENSIONS = new Set([
  'css', 'ts', 'tsx', 'js', 'mjs', 'cjs', 'json', 'swift', 'yaml', 'yml', 'html', 'txt', 'sh', 'png', 'svg',
  'ttf', 'otf', 'woff2', 'xcassets', 'colorset', 'plist',
]);

const SEGMENT = /^([a-z0-9]+(-[a-z0-9]+)*|\$root|\*|\*\*|(0|[1-9][0-9]*)…(0|[1-9][0-9]*)|[a-z0-9-]+(\|[a-z0-9-]+)+)$/;

/** Punctuation prose puts around a path; backticks and quotes are stripped from both ends. */
const LEADING = /^[`'"“”«([{,;:]+/;
const TRAILING = /[`'"“”»)\]},;:!?]+$/;

/** One prose word without the punctuation around it; '' when nothing is left. */
export function bareWord(word: string): string {
  let w = word.replace(LEADING, '').replace(TRAILING, '');
  // A sentence-ending period is punctuation; a path never ends in one.
  while (w.endsWith('.')) w = w.slice(0, -1);
  return w;
}

/** Whether a word is a token path or glob of §13.2's grammar, given the `sys` categories. */
export function isTokenPath(text: string, categories: ReadonlySet<string>): boolean {
  if (text === '' || /\s/.test(text) || text.includes('/') || /^\{.*\}$/.test(text)) return false;
  const segments = text.split('.');
  if (segments.length < 2) return false;
  const last = segments[segments.length - 1] ?? '';
  if (FILE_EXTENSIONS.has(last)) return false;
  const first = segments[0] ?? '';
  if (!(first === 'ref' || first === 'sys' || first === 'comp' || categories.has(first))) return false;
  if (first === 'comp' && segments.length < 3) return false;
  return segments.every((s) => SEGMENT.test(s));
}

/** Expands `a|b` alternations and `N…M` ranges into plain paths or globs. */
export function expandPath(text: string): string[] {
  let out: string[][] = [[]];
  for (const seg of text.split('.')) {
    let options: string[];
    const range = /^(\d+)…(\d+)$/.exec(seg);
    if (range !== null) {
      options = [];
      for (let n = Number(range[1]); n <= Number(range[2]); n++) options.push(String(n));
    } else if (seg.includes('|')) options = seg.split('|');
    else options = [seg];
    out = out.flatMap((prefix) => options.map((o) => [...prefix, o]));
  }
  return out.map((parts) => parts.join('.'));
}

export interface ProseHit {
  /** The path as prose wrote it, punctuation removed. */
  readonly text: string;
  /** JSON path of the string inside the spec, for the line number. */
  readonly at: readonly (string | number)[];
}

/** Every token path or glob in the prose fields of `spec`, in document order. */
export function proseTokenPaths(spec: Record<string, unknown>, categories: ReadonlySet<string>): ProseHit[] {
  const out: ProseHit[] = [];
  const walk = (value: unknown, at: readonly (string | number)[]): void => {
    if (typeof value === 'string') {
      const seen = new Set<string>();
      for (const word of value.split(/\s+/)) {
        const text = bareWord(word);
        if (seen.has(text) || !isTokenPath(text, categories)) continue;
        seen.add(text);
        out.push({ text, at });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, [...at, i]));
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) walk(v, [...at, k]);
    }
  };
  for (const field of PROSE_FIELDS) {
    if (field in spec) walk(spec[field], [field]);
  }
  return out;
}
