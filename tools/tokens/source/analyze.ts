// Source checks (ARCHITECTURE §5.6): everything that can be decided on the layer model without
// resolving a permutation. Each check has a fixtures/broken/<code>/ case.
import {
  BASE_SCHEMES, BLUR_PREFIX, BRAND_MODIFIER, BRAND_OVERRIDABLE, BRAND_RAMPS, COLOR_SCHEME_MODIFIER, CSS_GENERIC_FAMILIES,
  EASING_REF_PREFIX, EDGE_PREFIX, EDGE_TARGET, EXTENSION_NAMESPACE, FOLDED_KEYS, FONT_SLOTS, GLASS_PREFIX, GLASS_ROLE_RECIPES,
  GLASS_SCRIM, MATERIAL_PREFIX, METRIC_ROLE_PREFIX, OWNERSHIP, PATHS, PLATFORM_MODIFIER, REF_SET, SCHEME_VARIANT_SUFFIXES,
  SEMANTIC_SLOTS, SLOT_PREFIX, SMOKE_MAX_CHROMA, SMOKE_PREFIX, STANDARD_WEIGHTS, SYS_ALIAS_PREFIXES, SYS_ALIAS_TYPES,
  SYS_COLOR_ALIAS_TARGETS, SYSTEM_FONT_DESIGNS, TIERS, TYPE_ROLE_PREFIX, TYPE_SCALE, TYPE_SCALE_ID, TYPOGRAPHY_ROLE_KEYS, WEIGHT_FLOOR,
} from '../config.ts';
import { irColor, isColorSpace } from '../ir/color.ts';
import { error, type Diagnostic, type DiagnosticDetails } from '../ir/diagnostics.ts';
import { matches, matchesAny } from '../ir/glob.ts';
import { findIds } from '../ir/lookup.ts';
import { aliasTarget } from '../ir/naming.ts';
import { compareIds } from '../ir/order.ts';
import type { TokenType } from '../ir/types.ts';
import { isPlainObject } from './json.ts';
import { layerName } from './model.ts';
import type { BrandMeta, ContextName, SourceDoc, SourceLayer, SourceModel, SourceToken } from './types.ts';

interface Decl {
  readonly id: string;
  readonly doc: SourceDoc;
  readonly token: SourceToken;
  readonly layer: SourceLayer;
}

const WEIGHT_KEYWORDS: Readonly<Record<string, number>> = {
  thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400,
  medium: 500, 'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900,
  'extra-black': 950, 'ultra-black': 950,
};

function weightOf(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Object.hasOwn(WEIGHT_KEYWORDS, v) ? (WEIGHT_KEYWORDS[v] ?? null) : null;
  return null;
}

function ext(token: SourceToken): Record<string, unknown> {
  const e = token.node['$extensions'];
  const ns = isPlainObject(e) ? e[EXTENSION_NAMESPACE] : undefined;
  return isPlainObject(ns) ? ns : {};
}

function at(d: Decl, extra: DiagnosticDetails = {}): DiagnosticDetails {
  return { tokenId: d.id, file: d.token.loc.file, line: d.token.loc.line, ...extra };
}

function lineAt(d: Decl, pointer: string): number {
  return d.token.lines.get(pointer) ?? d.token.loc.line;
}

function isWhiteOrBlack(v: unknown): boolean {
  if (!isPlainObject(v) || v['colorSpace'] !== 'srgb' || !Array.isArray(v['components'])) return false;
  const c = v['components'];
  return c.length === 3 && (c.every((x) => x === 1) || c.every((x) => x === 0));
}

/** The object at `path` inside a document tree, or undefined. */
function nodeAt(root: Readonly<Record<string, unknown>>, path: readonly string[]): Readonly<Record<string, unknown>> | undefined {
  let cur: unknown = root;
  for (const key of path) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[key];
  }
  return isPlainObject(cur) ? cur : undefined;
}

function dimensionPx(v: unknown): number | null {
  if (!isPlainObject(v) || typeof v['value'] !== 'number') return null;
  if (v['unit'] === 'px') return v['value'];
  if (v['unit'] === 'rem') return v['value'] * 16;
  return null;
}

/** Every reference inside a value (whole or sub-value), with its pointer below `/$value`. */
function references(value: unknown, pointer = '/$value'): { pointer: string; target: string }[] {
  const out: { pointer: string; target: string }[] = [];
  const walk = (v: unknown, p: string): void => {
    const t = aliasTarget(v);
    if (t !== null) out.push({ pointer: p, target: t });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}/${i}`));
    else if (isPlainObject(v)) for (const [k, x] of Object.entries(v)) walk(x, `${p}/${k}`);
  };
  walk(value, pointer);
  return out;
}

class Analyzer {
  private readonly model: SourceModel;
  private readonly out: Diagnostic[] = [];
  /** Declarations of every layer in resolutionOrder order; a context's docs in order. */
  private readonly decls: Decl[] = [];
  private readonly byId = new Map<string, Decl[]>();
  private readonly refSetIds: Set<string>;
  private readonly typeMemo = new Map<string, TokenType | null>();

  constructor(model: SourceModel) {
    this.model = model;
    const seen = new Set<string>();
    const add = (layer: SourceLayer, docs: readonly SourceDoc[]): void => {
      for (const doc of docs) {
        for (const token of doc.tokens.values()) {
          const d: Decl = { id: token.id, doc, token, layer };
          this.decls.push(d);
          const key = `${doc.file}\u0000${token.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            const list = this.byId.get(token.id) ?? [];
            list.push(d);
            this.byId.set(token.id, list);
          }
        }
      }
    };
    for (const item of model.order) {
      if (item.kind === 'set') add({ kind: 'set', name: item.name }, model.sets.get(item.name) ?? []);
      else for (const [ctx, docs] of model.contexts.get(item.name) ?? []) add({ kind: 'modifier', name: item.name, context: ctx }, docs);
    }
    this.refSetIds = new Set((model.sets.get(REF_SET) ?? []).flatMap((doc) => [...doc.tokens.keys()]));
  }

  private push(code: string, message: string, details: DiagnosticDetails): void {
    this.out.push(error(code, message, details));
  }

  /** Unique declarations (one per document and id). */
  private uniqueDecls(): Decl[] {
    return [...this.byId.values()].flat();
  }

  /** The type a declaration resolves to, from any declaration of the chain (source-level approximation). */
  private typeOfDecl(d: Decl): TokenType | null {
    if (d.token.ownType !== null) return d.token.ownType;
    const target = aliasTarget(d.token.node['$value']);
    if (target === null) return d.token.groupType;
    return this.typeOfId(target, new Set([d.id]));
  }

  /**
   * The type of `id` from its latest declaration that decides one: a later layer replaces a token
   * wholesale, so a retyped id has its later type (the last context of a modifier stands for them all).
   */
  private typeOfId(id: string, seen: Set<string> = new Set()): TokenType | null {
    const hit = this.typeMemo.get(id);
    if (hit !== undefined) return hit;
    if (seen.has(id)) return null;
    seen.add(id);
    let t: TokenType | null = null;
    for (const d of [...(this.byId.get(id) ?? [])].reverse()) {
      if (d.token.ownType !== null) { t = d.token.ownType; break; }
      const target = aliasTarget(d.token.node['$value']);
      if (target === null) { if (d.token.groupType !== null) { t = d.token.groupType; break; } }
      else {
        const tt = this.typeOfId(target, seen);
        if (tt !== null) { t = tt; break; }
      }
    }
    this.typeMemo.set(id, t);
    return t;
  }

  private contextDocs(modifier: string): ReadonlyMap<ContextName, readonly SourceDoc[]> {
    return this.model.contexts.get(modifier) ?? new Map();
  }

  private modifierDecls(modifier: string): Map<ContextName, Map<string, Decl>> {
    const out = new Map<ContextName, Map<string, Decl>>();
    for (const [ctx, docs] of this.contextDocs(modifier)) {
      const ids = new Map<string, Decl>();
      for (const doc of docs) for (const token of doc.tokens.values()) ids.set(token.id, { id: token.id, doc, token, layer: { kind: 'modifier', name: modifier, context: ctx } });
      out.set(ctx, ids);
    }
    return out;
  }

  run(): Diagnostic[] {
    this.tiers();
    this.orthogonality();
    this.brandChecks();
    this.slots();
    this.sysLiterals();
    this.extensions();
    this.typography();
    this.materials();
    this.roleRecipes();
    this.smokeChroma();
    this.edgeNeutral();
    this.groupTypes();
    this.groupDeprecation();
    this.flags();
    this.tierAliasDirection();
    this.deadWrites();
    this.pairsWith();
    this.rootDefaultCollision();
    return this.out;
  }

  private tiers(): void {
    for (const [id, list] of this.byId) {
      const first = id.split('.')[0] ?? '';
      if (!(TIERS as readonly string[]).includes(first)) {
        const d = list[0];
        if (d !== undefined) this.push('source/tier', `${id} is outside the ref, sys and comp tiers`, at(d, { hint: 'every token id starts with ref., sys. or comp.' }));
      }
    }
  }

  // Write-set disjointness, ownership, context completeness (ADR-0024 §9).
  private orthogonality(): void {
    const writes = new Map<string, Map<string, Decl>>();   // modifier → id → first decl
    for (const m of this.model.modifiers) {
      const w = new Map<string, Decl>();
      for (const ids of this.modifierDecls(m.name).values()) for (const [id, d] of ids) if (!w.has(id)) w.set(id, d);
      writes.set(m.name, w);
    }
    const mods = this.model.modifiers.map((m) => m.name);
    for (let i = 0; i < mods.length; i++) {
      for (let j = i + 1; j < mods.length; j++) {
        const a = writes.get(mods[i] ?? '') ?? new Map<string, Decl>();
        const b = writes.get(mods[j] ?? '') ?? new Map<string, Decl>();
        for (const [id, db] of b) {
          const da = a.get(id);
          if (da === undefined) continue;
          this.push('orthogonality/overlap', `${id} is written by two modifiers: ${mods[i]} (${da.doc.file}) and ${mods[j]} (${db.doc.file}); modifiers own disjoint token ids (ADR-0024 §9)`, at(db, { hint: `remove it from ${mods[j]} or ${mods[i]}; see config.OWNERSHIP` }));
        }
      }
    }
    for (const m of mods) {
      const row = Object.hasOwn(OWNERSHIP, m) ? OWNERSHIP[m] : undefined;   // a modifier named "constructor" has no row
      const w = writes.get(m) ?? new Map<string, Decl>();
      for (const [id, d] of [...w].sort((x, y) => compareIds(x[0], y[0]))) {
        if (m === BRAND_MODIFIER) {
          if (!id.startsWith('ref.')) {
            this.push('brand/not-overridable', `brand context ${d.layer.kind === 'modifier' ? d.layer.context : ''} writes ${id}; a brand writes allowlisted ref.* ids only (ADR-0020 §1)`, at(d, { hint: 'change the ref.* id the semantic token aliases (for example a ref.color.slot.* token) instead' }));
          } else if (!this.refSetIds.has(id)) {
            this.push('brand/unknown-path', `brand context ${d.layer.kind === 'modifier' ? d.layer.context : ''} declares ${id}, which the ${REF_SET} set does not declare; a brand never adds a path (ADR-0020 §1)`, at(d, { hint: 'override an existing ref.* id from BRAND_OVERRIDABLE' }));
          } else if (!matchesAny(BRAND_OVERRIDABLE, id)) {
            this.push('brand/not-overridable', `${id} is system-owned; brands override only the ids of config.BRAND_OVERRIDABLE (ADR-0020 §1)`, at(d, { hint: 'remove the override; adding an id to BRAND_OVERRIDABLE needs an ADR' }));
          }
          continue;
        }
        if (row === undefined) {
          this.push('orthogonality/ownership', `modifier "${m}" has no row in config.OWNERSHIP, so it may write nothing (${id})`, at(d));
          continue;
        }
        if (!matchesAny(row.include, id) || matchesAny(row.exclude, id)) {
          this.push('orthogonality/ownership', `${m} writes ${id}, which its ownership globs do not cover (${row.include.join(', ')}${row.exclude.length > 0 ? ` except ${row.exclude.join(', ')}` : ''}; ADR-0024 §9)`, at(d, { hint: `move ${id} to the modifier that owns it` }));
        }
      }
      if (m === BRAND_MODIFIER) continue;   // brand contexts are sparse overrides (ADR-0020 rule 8)
      const perCtx = this.modifierDecls(m);
      const union = new Map<string, Decl>();
      for (const ids of perCtx.values()) for (const [id, d] of ids) if (!union.has(id)) union.set(id, d);
      for (const [ctx, ids] of perCtx) {
        const docs = this.contextDocs(m).get(ctx) ?? [];
        const lastFile = docs.length > 0 ? docs[docs.length - 1]?.file : undefined;
        const file = lastFile === undefined || lastFile.startsWith('inline:') ? this.model.resolverFile : lastFile;
        for (const [id, d] of [...union].sort((x, y) => compareIds(x[0], y[0]))) {
          if (ids.has(id)) continue;
          this.push('completeness/missing', `context ${m}=${ctx} does not declare ${id} (declared by ${layerName(d.layer)} in ${d.doc.file}); every context of a modifier declares the same ids`, {
            tokenId: id,
            file,
            hint: `declare ${id} in a source of ${m}=${ctx}, or layer the context over its base file`,
          });
        }
      }
    }
  }

  private brandContexts(): { name: string; docs: readonly SourceDoc[]; meta: BrandMeta | undefined }[] {
    return [...this.contextDocs(BRAND_MODIFIER)].map(([name, docs]) => ({ name, docs, meta: this.model.brands.get(name) }));
  }

  /** The last declaration of `id` in the ref set followed by `extra` docs (a brand's view of ref). */
  private effective(id: string, extra: readonly SourceDoc[]): Decl | undefined {
    let found: Decl | undefined;
    const layers: { layer: SourceLayer; docs: readonly SourceDoc[] }[] = [{ layer: { kind: 'set', name: REF_SET }, docs: this.model.sets.get(REF_SET) ?? [] }, { layer: { kind: 'set', name: 'brand' }, docs: extra }];
    for (const { layer, docs } of layers) {
      for (const doc of docs) {
        const token = doc.tokens.get(id);
        if (token !== undefined) found = { id, doc, token, layer };
      }
    }
    return found;
  }

  private effectiveValue(id: string, extra: readonly SourceDoc[], seen: Set<string> = new Set()): unknown {
    const d = this.effective(id, extra);
    if (d === undefined || seen.has(id)) return undefined;
    seen.add(id);
    const v = d.token.node['$value'];
    const t = aliasTarget(v);
    return t === null ? v : this.effectiveValue(t, extra, seen);
  }

  private brandChecks(): void {
    const brands = this.brandContexts();
    const views = brands.length > 0 ? brands : [{ name: '', docs: [] as readonly SourceDoc[], meta: undefined }];
    for (const b of brands) {
      const own = new Map<string, Decl>();
      for (const doc of b.docs) for (const token of doc.tokens.values()) own.set(`${doc.file}\u0000${token.id}`, { id: token.id, doc, token, layer: { kind: 'modifier', name: BRAND_MODIFIER, context: b.name } });
      for (const d of own.values()) {
        const v = d.token.node['$value'];
        const target = aliasTarget(v);
        const type = this.typeOfDecl(d);
        if (type === 'color' && target === null && isPlainObject(v) && v['alpha'] !== undefined && v['alpha'] !== 1) {
          this.push('brand/value', `${d.id} in brand "${b.name}" is translucent (alpha ${JSON.stringify(v['alpha'])}); a brand's literal colors are opaque (ADR-0020 rule 3)`, at(d, { hint: 'set alpha to 1; tints come from sys aliases with app.prism.alpha' }));
        }
        if (BRAND_RAMPS.some((r) => matches(`${r}.*`, d.id)) && target !== null) {
          this.push('brand/value', `${d.id} in brand "${b.name}" is an alias; ramp steps are opaque color literals (ADR-0020 §1)`, at(d));
        }
        if (matches('ref.color.series.*.*', d.id) && target !== null && !BRAND_RAMPS.some((r) => matches(`${r}.*`, target))) {
          this.push('brand/value', `${d.id} in brand "${b.name}" aliases {${target}}; a series alias targets a step of the brand's neutral or accent ramp (ADR-0020 §4)`, at(d, { hint: 'alias a ref.color.neutral.* or ref.color.accent.* step, or write an opaque literal' }));
        }
        if (d.id === TYPE_SCALE_ID && target === null && !(typeof v === 'number' && v > 0)) {
          this.push('brand/value', `${TYPE_SCALE_ID} in brand "${b.name}" is ${JSON.stringify(v)}; it must be a positive number (ADR-0020 §1)`, at(d));
        }
        if (matches('ref.gradient.vivid.*', d.id)) {
          const base = this.effective(d.id, []);
          const want = base === undefined ? undefined : ext(base.token)['scheme'];
          const have = ext(d.token)['scheme'];
          if (base !== undefined && base.doc !== d.doc && want !== have) {
            this.push('brand/value', `${d.id} in brand "${b.name}" has app.prism.scheme ${JSON.stringify(have)}; an overridden gradient keeps its scheme ${JSON.stringify(want)} (ADR-0020 rule 3)`, at(d, { hint: `restate "scheme": ${JSON.stringify(want)} with the other extensions` }));
          }
        }
      }
    }
    // Radius order (brand/radius-order) and type-scale range (type/scale-range) per brand view.
    for (const b of views) {
      let prev: { step: number; px: number } | null = null;
      for (let step = 1; step <= 10; step++) {
        const px = dimensionPx(this.effectiveValue(`ref.radius.${step}`, b.docs));
        if (px === null) continue;
        if (prev !== null && px < prev.px) {
          const d = this.effective(`ref.radius.${step}`, b.docs);
          if (d !== undefined) {
            this.push('brand/radius-order', `ref.radius.${step} (${px} px) is smaller than ref.radius.${prev.step} (${prev.px} px)${b.name === '' ? '' : ` in brand "${b.name}"`}; radius steps never decrease (ADR-0020 §1)`, at(d));
          }
        }
        prev = { step, px };
      }
    }
    // Font stacks (ADR-0020 §5).
    for (const b of brands) {
      if (b.meta === undefined) continue;
      const fonts = Object.values(b.meta.fonts);
      const webFamilies = new Set(fonts.filter((f) => f.platforms.includes('web')).map((f) => f.family));
      const appleFamilies = new Set(fonts.filter((f) => f.platforms.includes('apple')).map((f) => f.family));
      const faces = new Map<string, string | null>();
      for (const slot of FONT_SLOTS) {
        const webId = `ref.font.${slot}`;
        const webDecl = this.effective(webId, b.docs);
        const web = this.effectiveValue(webId, b.docs);
        const stack = typeof web === 'string' ? [web] : Array.isArray(web) ? web.filter((x): x is string => typeof x === 'string') : [];
        if (webDecl !== undefined) {
          for (const family of stack) {
            if (!CSS_GENERIC_FAMILIES.includes(family) && !webFamilies.has(family)) {
              this.push('font/web-stack', `${webId} of brand "${b.name}" lists "${family}", which is neither a family its brand.json serves on the web nor a CSS generic keyword (ADR-0020 §5)`, at(webDecl, { hint: `remove "${family}" or add its file to brands/${b.name}/brand.json with "web" in platforms` }));
            }
          }
        }
        const appleId = `ref.font.apple.${slot}`;
        const appleDecl = this.effective(appleId, b.docs);
        const apple = this.effectiveValue(appleId, b.docs);
        const appleList = typeof apple === 'string' ? [apple] : Array.isArray(apple) ? apple : null;
        if (appleDecl === undefined || appleList === null) {
          const near = webDecl === undefined ? { file: this.model.resolverFile } : { file: webDecl.token.loc.file, line: webDecl.token.loc.line };
          this.push('font/apple-face', `brand "${b.name}" has no ${appleId}; each slot has one Apple face (ADR-0020 §5)`, { ...near, tokenId: appleId, hint: `declare ${appleId} as ["<bundled family>"] or ["system-ui"]` });
          faces.set(slot, null);
          continue;
        }
        const face: unknown = appleList[0];
        if (appleList.length !== 1 || typeof face !== 'string') {
          this.push('font/apple-face', `${appleId} of brand "${b.name}" has ${appleList.length} entries; an Apple face is exactly one family or system keyword (ADR-0020 §5)`, at(appleDecl));
          faces.set(slot, null);
          continue;
        }
        if (!Object.hasOwn(SYSTEM_FONT_DESIGNS, face) && !appleFamilies.has(face)) {
          this.push('font/apple-face', `${appleId} of brand "${b.name}" is "${face}", which is neither a family its brand.json bundles on Apple nor a system keyword (${Object.keys(SYSTEM_FONT_DESIGNS).join(', ')})`, at(appleDecl, { hint: `use a system keyword or add "apple" to the platforms of ${face} in brands/${b.name}/brand.json` }));
        }
        faces.set(slot, face);
      }
      // preset (font/preset)
      const firstWeb = (slot: string): string | undefined => {
        const v = this.effectiveValue(`ref.font.${slot}`, b.docs);
        return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined;
      };
      const presetFile = { file: `${PATHS.brands}/${b.name}/brand.json`, line: 1 };
      if (b.meta.preset === 'native') {
        for (const [slot, face] of faces) {
          if (face !== null && !Object.hasOwn(SYSTEM_FONT_DESIGNS, face)) {
            this.push('font/preset', `brand "${b.name}" is native, but its ${slot} Apple face is "${face}"; every native Apple face is a system keyword (ADR-0020 §5)`, presetFile);
          }
        }
        if (appleFamilies.size > 0) this.push('font/preset', `brand "${b.name}" is native, but brand.json bundles ${[...appleFamilies].join(', ')} on Apple`, presetFile);
        for (const slot of ['ui', 'display']) {
          const first = firstWeb(slot);
          if (first === undefined || !webFamilies.has(first)) {
            this.push('font/preset', `brand "${b.name}" is native, but the ${slot} web stack starts with ${JSON.stringify(first)}, not a family it serves (ADR-0020 §5)`, presetFile);
          }
        }
      } else {
        for (const slot of ['ui', 'display']) {
          const face = faces.get(slot);
          const first = firstWeb(slot);
          const entry = Object.values(b.meta.fonts).find((f) => f.family === face);
          const both = entry !== undefined && entry.platforms.includes('apple') && entry.platforms.includes('web');
          if (face === undefined || face === null || Object.hasOwn(SYSTEM_FONT_DESIGNS, face) || face !== first || !both) {
            this.push('font/preset', `brand "${b.name}" is signature, so its ${slot} Apple face (${JSON.stringify(face ?? null)}) must be a bundled family equal to the first family of the ${slot} web stack (${JSON.stringify(first ?? null)}) and served on both platforms from one file (ADR-0020 §5)`, presetFile);
          }
        }
      }
    }
  }

  // Semantic slots (ADR-0020 §2).
  private slots(): void {
    const schemes = this.contextDocs(COLOR_SCHEME_MODIFIER);
    const baseSchemes = BASE_SCHEMES.filter((s) => schemes.has(s));
    if (baseSchemes.length === 0) return;
    const views: { name: string; docs: readonly SourceDoc[] }[] = [{ name: '', docs: [] }, ...this.brandContexts()];
    for (const view of views) {
      for (const scheme of baseSchemes) {
        for (const row of SEMANTIC_SLOTS) {
          const id = `${SLOT_PREFIX}.${scheme}.${row.slot}`;
          const d = this.effective(id, view.docs);
          if (d === undefined) {
            if (view.name === '') this.push('slot/target', `${id} is not declared; each semantic slot is a ref token that ${row.sys} aliases (ADR-0020 §2)`, { tokenId: id, file: this.model.resolverFile, hint: `declare ${id} = {${row.group}.<step>} in the ${REF_SET} set` });
            continue;
          }
          if (view.name !== '' && d.layer.name !== 'brand') continue;   // only the brand's own override
          const target = aliasTarget(d.token.node['$value']);
          const alpha = ext(d.token)['alpha'];
          if (target === null || alpha !== undefined || !matches(`${row.group}.*`, target)) {
            this.push('slot/target', `${id}${view.name === '' ? '' : ` in brand "${view.name}"`} must be a whole-value alias, without alpha, of a step of ${row.group} (ADR-0020 §2)`, at(d, { hint: `write {${row.group}.<step>}` }));
          }
        }
      }
    }
    // Unknown slots.
    for (const [id, list] of this.byId) {
      if (!id.startsWith(`${SLOT_PREFIX}.`)) continue;
      const known = baseSchemes.some((s) => SEMANTIC_SLOTS.some((r) => id === `${SLOT_PREFIX}.${s}.${r.slot}`));
      const d = list[0];
      if (!known && d !== undefined) this.push('slot/target', `${id} is not a semantic slot of config.SEMANTIC_SLOTS (adding a slot needs an ADR, ADR-0020 rule 15)`, at(d));
    }
    // Mapping: exactly the encoded sys id aliases the slot, in the scheme's base file.
    const allowed = new Set<string>();
    for (const scheme of baseSchemes) {
      const baseDocs = schemes.get(scheme) ?? [];
      for (const row of SEMANTIC_SLOTS) {
        const slotId = `${SLOT_PREFIX}.${scheme}.${row.slot}`;
        const doc = [...baseDocs].reverse().find((x) => x.tokens.has(row.sys));
        const token = doc?.tokens.get(row.sys);
        if (doc === undefined || token === undefined) {
          this.push('slot/mapping', `${row.sys} is not declared in the ${scheme} base scheme file; it aliases {${slotId}} there (ADR-0020 §2)`, { tokenId: row.sys, file: baseDocs[0]?.file ?? this.model.resolverFile, hint: `declare ${row.sys} = {${slotId}}` });
          continue;
        }
        allowed.add(`${doc.file}\u0000${row.sys}\u0000${slotId}`);
        if (aliasTarget(token.node['$value']) !== slotId) {
          this.push('slot/mapping', `${row.sys} in the ${scheme} base scheme file must be the whole-value alias {${slotId}} (ADR-0020 §2)`, { tokenId: row.sys, file: token.loc.file, line: token.loc.line, hint: `write {${slotId}}` });
        }
      }
    }
    for (const d of this.uniqueDecls()) {
      if (d.id.startsWith(`${SLOT_PREFIX}.`)) continue;
      for (const r of references(d.token.node['$value'])) {
        if (!r.target.startsWith(`${SLOT_PREFIX}.`)) continue;
        if (allowed.has(`${d.doc.file}\u0000${d.id}\u0000${r.target}`)) continue;
        this.push('slot/mapping', `${d.id} references {${r.target}}; only the sys id a slot encodes aliases it, in that scheme's base file (ADR-0020 §2)`, at(d, { line: lineAt(d, r.pointer) }));
      }
    }
  }

  // sys literals (ADR-0020 §3, rule 5). The rule covers every declaration in tokens/sys/ and every
  // sys id wherever it is declared (a comp or ref file, an inline resolver source), so a hue can come
  // only from ref.
  private sysLiterals(): void {
    const colorTarget = (target: string): boolean => matchesAny(SYS_COLOR_ALIAS_TARGETS, target);
    for (const d of this.uniqueDecls()) {
      if (!d.id.startsWith('sys.') && !d.doc.file.startsWith(`${PATHS.sys}/`)) continue;
      const v = d.token.node['$value'];
      const target = aliasTarget(v);
      const type = this.typeOfDecl(d);
      if (target !== null) {
        if (type === 'fontFamily' && !matches('ref.font.**', target) && !matches('sys.font.**', target)) {
          this.push('sys/literal', `${d.id} aliases {${target}}; a sys fontFamily aliases a ref.font.* or sys.font.* token (ADR-0020 §3)`, at(d));
        }
        if (type === 'color' && !colorTarget(target)) {
          this.push('sys/literal', `${d.id} aliases {${target}}; a sys color is a whole-value alias of a ref.color.* or sys.color.* token, or of a sys.material.glass.* color for a role recipe (ADR-0020 §3, ADR-0029 §1.2)`, at(d, { hint: 'alias the ref.color.* step or the sys.color.* role that holds the color' }));
        }
        continue;
      }
      if (type === 'color' && !isWhiteOrBlack(v)) {
        this.push('sys/literal', `${d.id} is a color literal; a sys color is an alias, an alias with app.prism.alpha, or pure white or black (ADR-0020 §3)`, at(d, { hint: 'alias the ref.color.* step it copies, with "$extensions": { "app.prism": { "alpha": <a> } } for a tint' }));
      }
      if (type === 'fontFamily') this.push('sys/literal', `${d.id} is a font-family literal; it must alias a ref.font.* or sys.font.* token (ADR-0020 §3)`, at(d));
      if (type !== null && SYS_ALIAS_TYPES.includes(type)) this.push('sys/literal', `${d.id} is a ${type} literal; every sys ${type} token is a whole-value alias (ADR-0020 §3)`, at(d, { hint: 'alias a ref token' }));
      if (SYS_ALIAS_PREFIXES.some((p) => matches(`${p}.**`, d.id))) this.push('sys/literal', `${d.id} is a literal; every ${SYS_ALIAS_PREFIXES.join(', ')} token is a whole-value alias (ADR-0020 §3)`, at(d, { hint: 'alias a ref.radius.* step' }));
      // composite sub-values
      const colorSub = (value: unknown, pointer: string): void => {
        const sub = aliasTarget(value);
        if (sub !== null) {
          if (!colorTarget(sub)) {
            this.push('sys/literal', `${d.id} aliases {${sub}} at ${pointer.replace('/$value/', '')}; a sys color sub-value aliases a ref.color.*, sys.color.* or sys.material.glass.* token (ADR-0020 §3, ADR-0029 §1.2)`, at(d, { line: lineAt(d, pointer) }));
          }
          return;
        }
        if (isWhiteOrBlack(value)) return;
        this.push('sys/literal', `${d.id} has a color literal at ${pointer.replace('/$value/', '')}; a sys color sub-value is an alias or pure white or black (ADR-0020 §3)`, at(d, { line: lineAt(d, pointer) }));
      };
      if (type === 'shadow') {
        const layers = Array.isArray(v) ? v : [v];
        layers.forEach((l, i) => { if (isPlainObject(l)) colorSub(l['color'], Array.isArray(v) ? `/$value/${i}/color` : '/$value/color'); });
      } else if (type === 'border' && isPlainObject(v)) colorSub(v['color'], '/$value/color');
      else if (type === 'typography' && isPlainObject(v)) {
        const ff = aliasTarget(v['fontFamily']);
        if (ff === null || (!matches('ref.font.**', ff) && !matches('sys.font.**', ff))) {
          this.push('sys/literal', `${d.id} has a fontFamily that does not alias a ref.font.* or sys.font.* token (ADR-0020 §3)`, at(d, { line: lineAt(d, '/$value/fontFamily') }));
        }
      }
    }
  }

  // Folded keys on aliases, alpha placement, spring declarations (§5.4, ADR-0023 §1).
  private extensions(): void {
    for (const d of this.uniqueDecls()) {
      const e = ext(d.token);
      const v = d.token.node['$value'];
      const target = aliasTarget(v);
      if (target !== null) {
        for (const key of Object.keys(e)) {
          if (FOLDED_KEYS.includes(key)) {
            this.push('extension/alias-override', `${d.id} is an alias of {${target}} and declares app.prism.${key}; aliases inherit folded keys and never declare them (ADR-0024 §4.1)`, at(d, { hint: `remove "${key}"; a different value needs a new literal token` }));
          }
        }
      }
      if (e['alpha'] !== undefined) {
        // ADR-0020 §3: only on a color token in tokens/sys/ that is a sys token ("not on ref or comp tokens").
        const problems: string[] = [];
        if (!d.doc.file.startsWith(`${PATHS.sys}/`)) problems.push('it is outside tokens/sys/');
        if (!d.id.startsWith('sys.')) problems.push(`it is a ${d.id.split('.')[0] ?? ''} token, not a sys token`);
        if (target === null) problems.push('it is a literal');
        if (this.typeOfDecl(d) !== 'color') problems.push('it is not a color token');
        if (problems.length > 0) {
          this.push('color/alpha-target', `${d.id} declares app.prism.alpha, but ${problems.join(' and ')}; alpha sits only on a sys color alias of an opaque color (ADR-0020 §3)`, at(d));
        }
      }
      if (e['spring'] !== undefined && target === null) {
        const type = d.token.ownType ?? d.token.groupType;
        const easing = isPlainObject(v) ? aliasTarget(v['timingFunction']) : null;
        if (type !== 'transition' || !isPlainObject(v)) {
          this.push('spring/fallback', `${d.id} declares app.prism.spring but is a ${type ?? 'untyped'} token; a spring lives on a transition token with a literal $value (ADR-0023 §1)`, at(d));
        } else if (easing === null || !matches(`${EASING_REF_PREFIX}.*`, easing)) {
          this.push('spring/fallback', `${d.id} declares a spring whose fallback timingFunction is ${JSON.stringify(v['timingFunction'])}; it must alias a ${EASING_REF_PREFIX}.* token (ADR-0023 §1)`, at(d, { line: lineAt(d, '/$value/timingFunction'), hint: `write "timingFunction": "{${EASING_REF_PREFIX}.out}"` }));
        }
      }
    }
  }

  // Typography roles (ADR-0021 §1, §4, §6).
  private typography(): void {
    for (const d of this.uniqueDecls()) {
      const v = d.token.node['$value'];
      const target = aliasTarget(v);
      if (target !== null) continue;
      const type = this.typeOfDecl(d);
      const e = ext(d.token);
      const isRole = type === 'typography' && matches(`${TYPE_ROLE_PREFIX}.**`, d.id);
      if (isRole && isPlainObject(v)) {
        const w = weightOf(v['fontWeight']);
        if (w === null || !STANDARD_WEIGHTS.includes(w)) {
          this.push('type/weight-ladder', `${d.id} has standard weight ${JSON.stringify(v['fontWeight'])}; role weights are ${STANDARD_WEIGHTS.join(', ')} (ADR-0021 §1)`, at(d, { line: lineAt(d, '/$value/fontWeight') }));
        }
        if (e['darkWeight'] !== undefined && !matches(`${METRIC_ROLE_PREFIX}.*`, d.id)) {
          this.push('type/weight-ladder', `${d.id} declares darkWeight; only ${METRIC_ROLE_PREFIX}.* roles go thin in the dark scheme (ADR-0021 §2)`, at(d));
        }
        const missing = ['slot', 'numeric', 'textStyle'].filter((k) => e[k] === undefined);
        if (missing.length > 0) {
          this.push('type/role-metadata', `${d.id} lacks app.prism.${missing.join(', app.prism.')}; every role declares slot, numeric and textStyle (ADR-0021 §4)`, at(d, { hint: 'add the keys from the ADR-0021 §7 table' }));
        }
      } else {
        const roleKeys = Object.keys(e).filter((k) => TYPOGRAPHY_ROLE_KEYS.includes(k));
        if (roleKeys.length > 0) {
          this.push('type/role-metadata', `${d.id} declares app.prism.${roleKeys.join(', app.prism.')}; only ${TYPE_ROLE_PREFIX}.* typography roles declare them (ADR-0021 rule 1)`, at(d));
        }
        if (!matches(`${TYPE_ROLE_PREFIX}.**`, d.id)) {
          const w = type === 'typography' && isPlainObject(v) ? weightOf(v['fontWeight']) : type === 'fontWeight' ? weightOf(v) : null;
          if (w !== null && w < WEIGHT_FLOOR) {
            this.push('type/weight-outside-role', `${d.id} has weight ${w}; outside ${TYPE_ROLE_PREFIX}.* no typography value or fontWeight token is lighter than ${WEIGHT_FLOOR} (ADR-0021 §4)`, at(d));
          }
        }
      }
      if (d.id === TYPE_SCALE_ID && (typeof v !== 'number' || v < (TYPE_SCALE[0]) || v > TYPE_SCALE[1])) {
        this.push('type/scale-range', `${TYPE_SCALE_ID} is ${JSON.stringify(v)} in ${d.doc.file}; it lies in [${TYPE_SCALE[0]}, ${TYPE_SCALE[1]}] (ADR-0021 §6)`, at(d));
      }
    }
  }

  // Material writes and recipe shape (ADR-0022 §1.4, §2.1).
  private materials(): void {
    const schemes = this.contextDocs(COLOR_SCHEME_MODIFIER);
    for (const [ctx, docs] of schemes) {
      const suffix = Object.keys(SCHEME_VARIANT_SUFFIXES).find((s) => ctx.endsWith(s));
      if (suffix === undefined) continue;
      const baseDocs = new Set((schemes.get(ctx.slice(0, -suffix.length)) ?? []).map((d) => d.file));
      for (const doc of docs) {
        if (baseDocs.has(doc.file)) continue;
        for (const token of doc.tokens.values()) {
          if (matches(`${MATERIAL_PREFIX}.**`, token.id)) {
            this.push('material/variant-write', `${token.id} is written by ${doc.file}, a delta of ${COLOR_SCHEME_MODIFIER}=${ctx}; only the base scheme files declare ${MATERIAL_PREFIX}.* (ADR-0022 §1.4)`, { tokenId: token.id, file: token.loc.file, line: token.loc.line, hint: 'remove it: Surface resolves the glass fallback at runtime' });
          }
        }
      }
    }
    for (const docs of this.contextDocs(PLATFORM_MODIFIER).values()) {
      for (const doc of docs) {
        for (const token of doc.tokens.values()) {
          if (matches(`${MATERIAL_PREFIX}.**`, token.id)) {
            this.push('material/variant-write', `${token.id} is written by the platform source ${doc.file}; no platform source declares ${MATERIAL_PREFIX}.* (ADR-0022 §1.4)`, { tokenId: token.id, file: token.loc.file, line: token.loc.line });
          }
        }
      }
    }
    // recipe shape, per base scheme context
    const FIELDS: Readonly<Record<string, TokenType>> = { $root: 'color', blur: 'dimension', saturate: 'number', 'edge.start': 'number', 'edge.end': 'number', grain: 'number', bloom: 'number' };
    const reported = new Set<string>();
    for (const scheme of BASE_SCHEMES) {
      const docs = schemes.get(scheme);
      if (docs === undefined) continue;
      const recipes = new Map<string, Map<string, Decl>>();
      for (const doc of docs) {
        for (const token of doc.tokens.values()) {
          if (!token.id.startsWith(`${GLASS_PREFIX}.`) || token.id === GLASS_SCRIM) continue;
          const d: Decl = { id: token.id, doc, token, layer: { kind: 'modifier', name: COLOR_SCHEME_MODIFIER, context: scheme } };
          const parts = token.id.split('.');
          const last2 = parts.slice(-2).join('.');
          const field = last2 === 'edge.start' || last2 === 'edge.end' ? last2 : (parts[parts.length - 1] ?? '');
          if (!Object.hasOwn(FIELDS, field)) {
            this.push('material/recipe-shape', `${token.id} is not a recipe field; a glass recipe holds exactly $root, blur, saturate, edge.start, edge.end, grain and bloom (ADR-0022 §2.1)`, at(d));
            continue;
          }
          const prefix = parts.slice(0, parts.length - field.split('.').length).join('.');
          const rec = recipes.get(prefix) ?? new Map<string, Decl>();
          rec.set(field, d);
          recipes.set(prefix, rec);
        }
      }
      for (const [prefix, rec] of recipes) {
        // A role recipe's fields alias an appearance recipe's fields (ADR-0029 §1.2); material/role-recipe
        // checks their targets, and the appearance recipe's own checks cover the values.
        const role = GLASS_ROLE_RECIPES.some((r) => prefix === `${GLASS_PREFIX}.${r}`);
        const missing = Object.keys(FIELDS).filter((f) => !rec.has(f));
        const first = [...rec.values()][0];
        if (missing.length > 0 && first !== undefined) {
          const key = `${scheme}|${prefix}|missing`;
          if (!reported.has(key)) {
            reported.add(key);
            this.push('material/recipe-shape', `recipe ${prefix} in the ${scheme} scheme lacks ${missing.join(', ')}; every recipe declares all seven fields in both base schemes (ADR-0022 §2.1)`, { ...at(first), tokenId: `${prefix}.$root` });
          }
        }
        for (const [field, d] of rec) {
          const want = FIELDS[field];
          const v = d.token.node['$value'];
          // A role recipe's $root takes its type from its alias: DTCG's reference pattern rejects
          // `{….$root}` in a typed color token, as it does for the comp tokens that alias a $root.
          if (role && field === '$root' && d.token.ownType === null && this.typeOfDecl(d) === want) continue;
          if (d.token.ownType !== want) {
            this.push('material/recipe-shape', `${d.id} must carry its own "$type": "${want}" (ADR-0022 §2.1)`, at(d));
            continue;
          }
          if (role) continue;
          if (field === 'blur') {
            const t = aliasTarget(v);
            if (t === null || !matches(`${BLUR_PREFIX}.*`, t)) this.push('material/recipe-shape', `${d.id} must be a whole-value alias of a ${BLUR_PREFIX}.* token (ADR-0022 §2.1)`, at(d));
          } else if (field !== '$root') {
            const ok = typeof v === 'number' && v >= 0 && (field === 'saturate' || v <= 1);
            if (!ok) this.push('material/recipe-shape', `${d.id} is ${JSON.stringify(v)}; ${field === 'saturate' ? 'saturate is a number ≥ 0' : `${field} is a number in [0, 1]`} (ADR-0022 §2.1)`, at(d));
          }
        }
      }
    }
  }

  // The scheme's glass (ADR-0029 §1.2, rule 1): in each base scheme file, every field of a role recipe
  // sys.material.glass.<role> is a whole-value alias, without alpha, of the same field of the appearance
  // recipe sys.material.glass.<scheme>.<role>. A blur that aliases an appearance blur counts as an alias
  // of ref.blur.* (material/recipe-shape checks the appearance recipe's own blur).
  private roleRecipes(): void {
    const schemes = this.contextDocs(COLOR_SCHEME_MODIFIER);
    for (const scheme of BASE_SCHEMES) {
      const docs = schemes.get(scheme);
      if (docs === undefined) continue;
      for (const doc of docs) {
        for (const token of doc.tokens.values()) {
          const role = GLASS_ROLE_RECIPES.find((r) => token.id.startsWith(`${GLASS_PREFIX}.${r}.`));
          if (role === undefined) continue;
          const field = token.id.slice(`${GLASS_PREFIX}.${role}.`.length);
          const want = `${GLASS_PREFIX}.${scheme}.${role}.${field}`;
          const d: Decl = { id: token.id, doc, token, layer: { kind: 'modifier', name: COLOR_SCHEME_MODIFIER, context: scheme } };
          const target = aliasTarget(token.node['$value']);
          const alpha = ext(token)['alpha'];
          if (target !== want || alpha !== undefined) {
            this.push('material/role-recipe', `${token.id} in the ${scheme} scheme file is ${target === null ? 'a literal' : `{${target}}`}${alpha === undefined ? '' : ` with app.prism.alpha ${JSON.stringify(alpha)}`}; each field of the role recipe ${GLASS_PREFIX}.${role} is a whole-value alias, without alpha, of the same field of ${GLASS_PREFIX}.${scheme}.${role} (ADR-0029 §1.2)`, at(d, { hint: `write {${want}}` }));
          }
        }
      }
    }
  }

  // Neutral smoke (ADR-0029 §1.1, rule 3): every ref.color.smoke.* declaration has OKLCH chroma of at
  // most SMOKE_MAX_CHROMA, so smoked glass takes no hue of its own.
  private smokeChroma(): void {
    for (const d of this.uniqueDecls()) {
      if (!d.id.startsWith(`${SMOKE_PREFIX}.`)) continue;
      const v = this.effectiveColorValue(d);
      if (v === null) continue;
      const chroma = irColor(v.space, v.components, 1).oklch[1];
      if (chroma > SMOKE_MAX_CHROMA + 1e-9) {
        this.push('color/smoke-chroma', `${d.id} has OKLCH chroma ${Number(chroma.toFixed(4))}; smoke is neutral, chroma ${SMOKE_MAX_CHROMA} or less (ADR-0029 §1.1)`, at(d, { hint: `move it to the neutral ramp's hue with chroma <= ${SMOKE_MAX_CHROMA}` }));
      }
    }
  }

  /** The literal color a declaration resolves to through ref/sys aliases in its own view, or null. */
  private effectiveColorValue(d: Decl): { space: Parameters<typeof irColor>[0]; components: [number, number, number] } | null {
    let v: unknown = d.token.node['$value'];
    const seen = new Set<string>([d.id]);
    for (let target = aliasTarget(v); target !== null; target = aliasTarget(v)) {
      if (seen.has(target)) return null;
      seen.add(target);
      const next = this.byId.get(target)?.[0];
      if (next === undefined) return null;
      v = next.token.node['$value'];
    }
    if (!isPlainObject(v) || !isColorSpace(v['colorSpace']) || !Array.isArray(v['components'])) return null;
    const c = v['components'].map((x) => (typeof x === 'number' ? x : NaN));
    if (c.length !== 3 || c.some((x) => Number.isNaN(x))) return null;
    return { space: v['colorSpace'], components: [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0] };
  }

  // Edge colors (ADR-0030 §4.1, rule 4): every sys.color.edge.* declaration is a whole-value alias of the
  // brand's white, with or without app.prism.alpha, so no hue reaches an edge.
  private edgeNeutral(): void {
    for (const d of this.uniqueDecls()) {
      if (!matches(`${EDGE_PREFIX}.**`, d.id)) continue;
      const target = aliasTarget(d.token.node['$value']);
      if (target !== EDGE_TARGET) {
        this.push('color/edge-neutral', `${d.id} is ${target === null ? 'a literal' : `{${target}}`}; every ${EDGE_PREFIX}.* token aliases {${EDGE_TARGET}}, with or without app.prism.alpha (ADR-0030 §4.1)`, at(d, { hint: `write {${EDGE_TARGET}}` }));
      }
    }
  }

  // Group types (ADR-0024 §3).
  private groupTypes(): void {
    const byPath = new Map<string, Map<TokenType, SourceDoc[]>>();
    for (const doc of this.model.docs.values()) {
      for (const [path, type] of doc.groupTypes) {
        const m = byPath.get(path) ?? new Map<TokenType, SourceDoc[]>();
        const list = m.get(type) ?? [];
        list.push(doc);
        m.set(type, list);
        byPath.set(path, m);
      }
    }
    for (const [path, types] of byPath) {
      if (types.size < 2) continue;
      const entries = [...types];
      const second = entries[1];
      const doc = second?.[1][0];
      const loc = doc?.groups.get(path)?.loc;
      this.push('source/group-type-conflict', `group ${path} is typed ${entries.map(([t, ds]) => `${t} (${ds.map((x) => x.file).join(', ')})`).join(' and ')}; one group path carries one $type`, {
        ...(loc === undefined ? {} : { file: loc.file, line: loc.line }),
        hint: 'type the tokens instead of the group',
      });
    }
    for (const d of this.uniqueDecls()) {
      if (d.token.ownType !== null) continue;
      const t = this.typeOfDecl(d);
      if (t === null) continue;
      const parts = d.id.split('.');
      for (let i = 1; i < parts.length; i++) {
        const path = parts.slice(0, i).join('.');
        const types = byPath.get(path);
        if (types === undefined) continue;
        const other = [...types.keys()].find((x) => x !== t);
        if (other !== undefined) {
          const docs = types.get(other) ?? [];
          this.push('type/group-type-mismatch', `${d.id} is a ${t} token without its own $type, but group ${path} is typed ${other} in ${docs.map((x) => x.file).join(', ')}; engines that type the merged tree would disagree (ADR-0024 §3)`, at(d, { hint: `add "$type": "${t}" to the token` }));
          break;
        }
      }
    }
  }

  // Group $deprecated, the counterpart of type/group-type-mismatch. The model reads a group's
  // $deprecated per document (§4.1), but after the DTCG merge the nearest group on a token's path that
  // carries $deprecated in any document deprecates every token under it, so engines that read the
  // merged tree would disagree with Prism. A token without its own $deprecated must therefore agree
  // with every $deprecated declared on that nearest group path in any loaded document.
  private groupDeprecation(): void {
    const declared = new Map<string, { value: string | true | null; doc: SourceDoc }[]>();
    for (const doc of this.model.docs.values()) {
      for (const [path, group] of doc.groups) {
        const node = nodeAt(doc.root, group.path);
        if (node === undefined || !Object.hasOwn(node, '$deprecated')) continue;
        const v = node['$deprecated'];
        if (typeof v !== 'string' && typeof v !== 'boolean') continue;   // source/structure reports it
        const list = declared.get(path) ?? [];
        list.push({ value: v === false ? null : v, doc });
        declared.set(path, list);
      }
    }
    if (declared.size === 0) return;
    const state = (v: string | true | null): string => (v === null ? 'not deprecated' : v === true ? 'deprecated' : `deprecated (${JSON.stringify(v)})`);
    for (const d of this.uniqueDecls()) {
      if (Object.hasOwn(d.token.node, '$deprecated')) continue;
      const parts = d.id.split('.');
      for (let i = parts.length - 1; i >= 0; i--) {
        const path = parts.slice(0, i).join('.');
        const list = declared.get(path);
        if (list === undefined) continue;
        const other = list.find((x) => x.value !== d.token.deprecated);
        if (other !== undefined) {
          this.push('source/group-deprecated-mismatch', `${d.id} has no $deprecated of its own and is ${state(d.token.deprecated)} in ${d.doc.file}, but group ${path || '(root)'} is ${state(other.value)} in ${other.doc.file}; engines that read the merged tree would disagree`, at(d, {
            hint: `add "$deprecated" to the token, or give group ${path || '(root)'} the same $deprecated in ${d.doc.file}`,
          }));
        }
        break;   // the nearest group that declares $deprecated decides
      }
    }
  }

  // Flags (ADR-0024 §4.2).
  private flags(): void {
    for (const d of this.uniqueDecls()) {
      if (ext(d.token)['flag'] !== true) continue;
      const v = d.token.node['$value'];
      if (aliasTarget(v) !== null) continue;
      if (v !== 0 && v !== 1) this.push('type/flag-value', `${d.id} is a flag with value ${JSON.stringify(v)}; a flag is 0 or 1 (ADR-0024 §4.2)`, at(d));
    }
  }

  // Tier alias direction (ADR-0024 §5.1).
  private tierAliasDirection(): void {
    for (const d of this.uniqueDecls()) {
      const tier = d.id.split('.')[0];
      const v = d.token.node['$value'];
      const whole = aliasTarget(v);
      const refs = references(v);
      if (tier === 'comp') {
        if (whole === null) {
          this.push('tier/alias-direction', `${d.id} is ${refs.length > 0 ? 'a composite with sub-references' : 'a literal'}; every comp token is a whole-value alias of one sys token (ADR-0024 §5.1)`, at(d, { hint: 'alias the sys role the component binds' }));
        } else if (!whole.startsWith('sys.')) {
          this.push('tier/alias-direction', `${d.id} aliases {${whole}}; comp tokens alias sys tokens only (ADR-0024 §5.1)`, at(d));
        }
        continue;
      }
      for (const r of refs) {
        const t = r.target.split('.')[0];
        const ok = tier === 'ref' ? t === 'ref' : tier === 'sys' ? t === 'ref' || t === 'sys' : true;
        if (!ok) {
          this.push('tier/alias-direction', `${d.id} references {${r.target}}; ${tier} tokens alias ${tier === 'ref' ? 'ref only' : 'ref or sys only'} (ADR-0024 §5.1)`, at(d, { line: lineAt(d, r.pointer) }));
        }
      }
    }
  }

  // Dead writes (§5.6): a declaration a later layer overwrites in every permutation.
  private deadWrites(): void {
    type Layer = { item: SourceModel['order'][number]; contexts: Map<string, readonly SourceDoc[]> };
    const layers: Layer[] = this.model.order.map((item) =>
      item.kind === 'set'
        ? { item, contexts: new Map([['', this.model.sets.get(item.name) ?? []]]) }
        : { item, contexts: new Map(this.contextDocs(item.name)) },
    );
    const declares = (docs: readonly SourceDoc[], id: string, except: SourceDoc): SourceDoc | undefined =>
      [...docs].reverse().find((doc) => doc !== except && doc.tokens.has(id));
    const reported = new Set<string>();
    layers.forEach((layer, i) => {
      for (const [ctx, docs] of layer.contexts) {
        for (const doc of docs) {
          for (const token of doc.tokens.values()) {
            const key = `${doc.file}\u0000${token.id}`;
            if (reported.has(key)) continue;
            for (let j = i + 1; j < layers.length; j++) {
              const later = layers[j];
              if (later === undefined) continue;
              const hits = [...later.contexts.values()].map((ds) => declares(ds, token.id, doc));
              if (hits.length > 0 && hits.every((h) => h !== undefined)) {
                const by = hits[0];
                reported.add(key);
                const layerLabel = layer.item.kind === 'set' ? `set ${layer.item.name}` : `${layer.item.name}=${ctx}`;
                const laterLabel = later.item.kind === 'set' ? `set ${later.item.name}` : `every context of ${later.item.name}`;
                this.push('source/dead-write', `${token.id} declared by ${doc.file} (${layerLabel}) is overwritten in every permutation by ${by?.file ?? '?'} (${laterLabel})`, {
                  tokenId: token.id, file: token.loc.file, line: token.loc.line,
                  hint: 'delete the earlier declaration, or move the id to the layer that owns it',
                });
                break;
              }
            }
          }
        }
      }
    });
  }

  // a11y.pairsWith names resolve (§5.6).
  private pairsWith(): void {
    const ids = new Set(this.byId.keys());
    for (const d of this.uniqueDecls()) {
      const a11y = ext(d.token)['a11y'];
      const pairs = isPlainObject(a11y) && Array.isArray(a11y['pairsWith']) ? a11y['pairsWith'] : [];
      for (const name of pairs) {
        if (typeof name !== 'string' || findIds(ids, name).length === 0) {
          this.push('a11y/pairs-with', `${d.id} pairs with ${JSON.stringify(name)}, which names no token`, at(d, { hint: 'use a public path such as "color.bg.surface"' }));
        }
      }
    }
  }

  // naming/root-default-collision (ADR-0024 §1.4).
  private rootDefaultCollision(): void {
    for (const [id, list] of this.byId) {
      if (!id.endsWith('.$root')) continue;
      const sibling = `${id.slice(0, -'.$root'.length)}.default`;
      const other = this.byId.get(sibling)?.[0];
      if (other !== undefined && list[0] !== undefined) {
        this.push('naming/root-default-collision', `${sibling} sits next to ${id}; the flavors write $root as "default", so the two would collide (ADR-0024 §1.4)`, at(other, { hint: 'rename the sibling' }));
      }
    }
  }
}

/** Runs every source check of §5.6 on the model. */
export function analyzeSource(model: SourceModel): Diagnostic[] {
  return new Analyzer(model).run();
}
