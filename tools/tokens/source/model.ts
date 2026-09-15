// Source model (ARCHITECTURE §5.1): parses the resolver and every document it references once, with
// line and column for every node, validates the resolver structure, names, token and group shapes
// and `$extensions["app.prism"]`, records each token's own `$type`, its nearest group `$type` in the
// same document and its effective `$deprecated`, and deep-freezes the documents. Structural problems
// are diagnostics; only an unreadable or unparsable resolver makes the model unavailable.
import { posix } from 'node:path';
import type { Node } from 'jsonc-parser';
import { PATHS, webDefaultContexts } from '../config.ts';
import { error, type Diagnostic } from '../ir/diagnostics.ts';
import { TOKEN_TYPES, type TokenType } from '../ir/types.ts';
import { loadBrands } from './brands.ts';
import { deepFreeze, escapePointer, isPlainObject, parseJson, properties, valueOf, type JsonDoc } from './json.ts';
import { normalizeRepoPath, SourceReadError, type SourceReader } from './reader.ts';
import { validateAppPrism } from './schemas.ts';
import type {
  ContextName, ModifierInfo, ModifierName, OrderItem, SourceDoc, SourceGroup, SourceLayer, SourceModel, SourceToken,
} from './types.ts';

export interface LoadResult {
  readonly model: SourceModel | null;
  readonly diagnostics: readonly Diagnostic[];
}

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CONTEXT_RE = /^[a-z][a-z0-9-]*$/;
const GROUP_PROPS = new Set(['$type', '$description', '$extensions', '$deprecated']);
const TOKEN_PROPS = new Set(['$value', '$type', '$description', '$extensions', '$deprecated']);
const URL_RE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;
const TYPES = new Set<string>(TOKEN_TYPES);

function isTokenType(value: unknown): value is TokenType {
  return typeof value === 'string' && TYPES.has(value);
}

export function layerName(layer: SourceLayer): string {
  return layer.kind === 'set' ? `set ${layer.name}` : `${layer.name}=${layer.context}`;
}

/** Loads the resolver at `resolverFile` (repository-relative) and every document it references. */
export function loadModel(reader: SourceReader, resolverFile: string = PATHS.resolver): LoadResult {
  const diagnostics: Diagnostic[] = [];
  const resolverPath = normalizeRepoPath(resolverFile);
  if (resolverPath === null) {
    diagnostics.push(error('source/outside-root', `resolver path leaves the repository root: ${resolverFile}`));
    return { model: null, diagnostics };
  }
  let text: string;
  try {
    text = reader.readText(resolverPath);
  } catch (e) {
    diagnostics.push(error('source/missing-file', e instanceof SourceReadError ? e.message : `cannot read ${resolverPath}`, { file: resolverPath }));
    return { model: null, diagnostics };
  }
  const json = parseJson(resolverPath, text, diagnostics);
  if (json === null) return { model: null, diagnostics };
  if (json.root.type !== 'object') {
    diagnostics.push(error('resolver/structure', 'the resolver must be a JSON object', { file: resolverPath, line: 1 }));
    return { model: null, diagnostics };
  }
  const builder = new ModelBuilder(reader, resolverPath, json, diagnostics);
  const model = builder.build();
  return { model, diagnostics };
}

interface SourceItem { readonly node: Node; readonly pointer: string }

class ModelBuilder {
  private readonly reader: SourceReader;
  private readonly file: string;
  private readonly json: JsonDoc;
  private readonly diagnostics: Diagnostic[];
  private readonly dir: string;
  private readonly docs = new Map<string, SourceDoc>();
  private readonly failedDocs = new Set<string>();
  private readonly setNodes = new Map<string, Node>();
  private readonly setDocs = new Map<string, readonly SourceDoc[]>();
  private readonly setReferenced = new Set<string>();

  constructor(reader: SourceReader, file: string, json: JsonDoc, diagnostics: Diagnostic[]) {
    this.reader = reader;
    this.file = file;
    this.json = json;
    this.diagnostics = diagnostics;
    this.dir = posix.dirname(file) === '.' ? '' : posix.dirname(file);
  }

  private at(node: Node | undefined): { file: string; line: number } {
    return { file: this.file, line: node === undefined ? 1 : this.json.line(node.offset) };
  }

  private report(code: string, message: string, node: Node | undefined, hint?: string): void {
    this.diagnostics.push(error(code, message, hint === undefined ? this.at(node) : { ...this.at(node), hint }));
  }

  build(): SourceModel {
    const top = new Map(properties(this.json.root).map((p) => [p.key, p]));
    const version = top.get('version');
    if (version?.value.value !== '2025.10') {
      this.report('resolver/version', `resolver version must be "2025.10"${version === undefined ? ' (missing)' : ''}`, version?.value ?? this.json.root, 'set "version": "2025.10"');
    }
    const nameProp = top.get('name');
    const name = typeof nameProp?.value.value === 'string' ? nameProp.value.value : null;
    for (const p of properties(this.json.root)) {
      if (p.key === '$extends') this.report('resolver/extends-unsupported', '$extends is not supported by Prism', p.keyNode, 'inline the extended document');
    }

    const setsNode = top.get('sets')?.value;
    if (setsNode !== undefined) {
      if (setsNode.type !== 'object') this.report('resolver/structure', '"sets" must be an object', setsNode);
      else for (const p of properties(setsNode)) this.setNodes.set(p.key, p.value);
    }

    const modifierNodes = new Map<string, Node>();
    const modifiersNode = top.get('modifiers')?.value;
    if (modifiersNode !== undefined) {
      if (modifiersNode.type !== 'object') this.report('resolver/structure', '"modifiers" must be an object', modifiersNode);
      else for (const p of properties(modifiersNode)) modifierNodes.set(p.key, p.value);
    }

    // resolutionOrder
    const order: OrderItem[] = [];
    const orderNode = top.get('resolutionOrder')?.value;
    const inOrder = new Set<string>();
    if (orderNode === undefined || orderNode.type !== 'array' || (orderNode.children ?? []).length === 0) {
      this.report('resolver/structure', '"resolutionOrder" must be a non-empty array', orderNode ?? this.json.root);
    } else {
      for (const item of orderNode.children ?? []) {
        const ref = item.type === 'object' ? properties(item).find((p) => p.key === '$ref') : undefined;
        if (ref === undefined || properties(item).length !== 1 || typeof ref.value.value !== 'string') {
          this.report('resolver/inline-order', 'resolutionOrder items must be { "$ref": "#/sets/<name>" } or { "$ref": "#/modifiers/<name>" }', item, 'move the inline set or modifier under "sets" or "modifiers" and reference it');
          continue;
        }
        const target = String(ref.value.value);
        const m = /^#\/(sets|modifiers)\/(.+)$/.exec(target);
        const kind = m?.[1];
        const itemName = m?.[2];
        if (kind === undefined || itemName === undefined) {
          this.report('resolver/structure', `resolutionOrder reference must point into #/sets or #/modifiers: ${target}`, ref.value);
          continue;
        }
        if (kind === 'sets' ? !this.setNodes.has(itemName) : !modifierNodes.has(itemName)) {
          this.report('resolver/structure', `resolutionOrder references an undefined ${kind === 'sets' ? 'set' : 'modifier'} "${itemName}"`, ref.value);
          continue;
        }
        const key = `${kind}/${itemName}`;
        if (inOrder.has(key)) {
          this.report('resolver/order', `${kind === 'sets' ? 'set' : 'modifier'} "${itemName}" appears more than once in resolutionOrder`, ref.value);
          continue;
        }
        inOrder.add(key);
        order.push(kind === 'sets' ? { kind: 'set', name: itemName } : { kind: 'modifier', name: itemName });
      }
    }

    // Sets (expanded, with set references in place).
    for (const setName of this.setNodes.keys()) this.expandSet(setName, []);

    // Modifiers.
    const webDefaults = webDefaultContexts();
    const modifiers: ModifierInfo[] = [];
    const contexts = new Map<ModifierName, Map<ContextName, readonly SourceDoc[]>>();
    for (const [modName, modNode] of modifierNodes) {
      if (!inOrder.has(`modifiers/${modName}`)) {
        this.report('resolver/order', `modifier "${modName}" does not appear in resolutionOrder`, modNode);
      }
      if (modNode.type !== 'object') {
        this.report('resolver/structure', `modifier "${modName}" must be an object`, modNode);
        continue;
      }
      const props = new Map(properties(modNode).map((p) => [p.key, p]));
      for (const p of properties(modNode)) {
        if (p.key === '$extends') this.report('resolver/extends-unsupported', `$extends is not supported by Prism (modifier "${modName}")`, p.keyNode);
      }
      const ctxNode = props.get('contexts')?.value;
      const ctxMap = new Map<ContextName, readonly SourceDoc[]>();
      const ctxNames: string[] = [];
      if (ctxNode === undefined || ctxNode.type !== 'object' || properties(ctxNode).length === 0) {
        this.report('resolver/structure', `modifier "${modName}" must declare at least one context`, ctxNode ?? modNode);
      } else {
        for (const c of properties(ctxNode)) {
          if (!CONTEXT_RE.test(c.key)) {
            this.report('resolver/context-name', `context name "${c.key}" of modifier "${modName}" must match ^[a-z][a-z0-9-]*$`, c.keyNode);
          }
          ctxNames.push(c.key);
          const layer: SourceLayer = { kind: 'modifier', name: modName, context: c.key };
          ctxMap.set(c.key, this.sources(c.value, `/modifiers/${escapePointer(modName)}/contexts/${escapePointer(c.key)}`, layer, 'modifier', []));
        }
      }
      const defNode = props.get('default')?.value;
      let def = typeof defNode?.value === 'string' ? defNode.value : null;
      if (def === null || !ctxNames.includes(def)) {
        this.report(
          'resolver/missing-default',
          def === null ? `modifier "${modName}" declares no default context` : `default "${def}" of modifier "${modName}" is not one of its contexts`,
          defNode ?? modNode,
          `add "default": "<one of ${ctxNames.join(', ')}>"`,
        );
        def = ctxNames[0] ?? '';
      }
      const expected = webDefaults.get(modName);
      if (expected !== undefined && def !== expected && ctxNames.includes(def)) {
        this.report(
          'resolver/web-default-mismatch',
          `default of modifier "${modName}" is "${def}", but the web runtime default (the first value of its WEB_RUNTIME axis) is "${expected}"`,
          defNode ?? modNode,
          `set "default": "${expected}" (ADR-0019 rule 3)`,
        );
      }
      contexts.set(modName, ctxMap);
      if (inOrder.has(`modifiers/${modName}`)) modifiers.push({ name: modName, contexts: ctxNames, default: def });
    }
    // modifiers in resolutionOrder order
    const orderedModifiers = order
      .filter((o): o is { kind: 'modifier'; name: string } => o.kind === 'modifier')
      .map((o) => modifiers.find((m) => m.name === o.name))
      .filter((m): m is ModifierInfo => m !== undefined);

    for (const setName of this.setNodes.keys()) {
      const applied = inOrder.has(`sets/${setName}`);
      const referenced = this.setReferenced.has(setName);
      if (!applied && !referenced) {
        this.report('resolver/order', `set "${setName}" is neither in resolutionOrder nor referenced by another source`, this.setNodes.get(setName));
      } else if (applied && referenced) {
        this.report('resolver/order', `set "${setName}" is in resolutionOrder and also referenced by another source, so it is applied twice`, this.setNodes.get(setName));
      }
    }

    const brandContexts = contexts.get('brand');
    const brands = loadBrands(this.reader, brandContexts ?? null, this.diagnostics);

    return {
      resolverFile: this.file,
      name,
      modifiers: orderedModifiers,
      order,
      sets: this.setDocs,
      contexts,
      docs: this.docs,
      brands,
    };
  }

  private expandSet(setName: string, stack: readonly string[]): readonly SourceDoc[] {
    const done = this.setDocs.get(setName);
    if (done !== undefined) return done;
    const node = this.setNodes.get(setName);
    if (node === undefined) return [];
    if (node.type !== 'object') {
      this.report('resolver/structure', `set "${setName}" must be an object`, node);
      this.setDocs.set(setName, []);
      return [];
    }
    for (const p of properties(node)) {
      if (p.key === '$extends') this.report('resolver/extends-unsupported', `$extends is not supported by Prism (set "${setName}")`, p.keyNode);
    }
    const sourcesNode = properties(node).find((p) => p.key === 'sources')?.value;
    const docs = this.sources(sourcesNode, `/sets/${escapePointer(setName)}/sources`, { kind: 'set', name: setName }, 'set', [...stack, setName]);
    this.setDocs.set(setName, docs);
    return docs;
  }

  private sources(node: Node | undefined, pointer: string, layer: SourceLayer, owner: 'set' | 'modifier', stack: readonly string[]): readonly SourceDoc[] {
    const out: SourceDoc[] = [];
    if (node === undefined || node.type !== 'array') {
      this.report('resolver/structure', `sources of ${layerName(layer)} must be an array`, node);
      return out;
    }
    const items: SourceItem[] = (node.children ?? []).map((n, i) => ({ node: n, pointer: `${pointer}/${i}` }));
    items.forEach((item, i) => {
      if (item.node.type !== 'object') {
        this.report('resolver/structure', `source ${i} of ${layerName(layer)} must be an object`, item.node);
        return;
      }
      const refProp = properties(item.node).find((p) => p.key === '$ref');
      const sibling = refProp === undefined ? undefined : properties(item.node).find((p) => p.key !== '$ref');
      if (sibling !== undefined) {
        // DTCG Resolver §4.2.2 makes them overrides of the referenced document; ignoring them would
        // resolve a valid resolver differently from other engines without a word. The code stops the
        // build before Style Dictionary (ir/bundle.ts STRUCTURAL); the referenced document still loads,
        // so the other checks do not report its tokens as missing.
        this.report(
          'resolver/unsupported-source',
          '"$ref" with sibling keys (overrides, DTCG Resolver §4.2.2) is not supported; move the tokens into the referenced file or into an inline source after it',
          sibling.keyNode,
        );
      }
      if (refProp === undefined) {
        const inlineName = `inline:${layer.kind === 'set' ? layer.name : `${layer.name}.${layer.context}`}#${i}`;
        const doc = this.walkDocument(inlineName, this.file, this.json, item.node);
        if (doc !== null) {
          this.docs.set(inlineName, doc);
          out.push(doc);
        }
        return;
      }
      const ref: unknown = refProp.value.value;
      if (typeof ref !== 'string') {
        this.report('resolver/structure', '"$ref" must be a string', refProp.value);
        return;
      }
      if (ref.startsWith('#/sets/')) {
        const target = ref.slice('#/sets/'.length);
        if (!this.setNodes.has(target)) {
          this.report('resolver/structure', `reference to an undefined set "${target}"`, refProp.value);
          return;
        }
        if (stack.includes(target)) {
          this.report('resolver/set-cycle', `set reference cycle: ${[...stack, target].join(' → ')}`, refProp.value);
          return;
        }
        this.setReferenced.add(target);
        out.push(...this.expandSet(target, stack));
        return;
      }
      if (ref.startsWith('#/modifiers/')) {
        this.report(
          'resolver/modifier-reference',
          `${owner === 'modifier' ? 'a modifier' : 'a set'} must not reference a modifier (${ref}; DTCG Resolver §4.1.5.1)`,
          refProp.value,
        );
        return;
      }
      if (URL_RE.test(ref) || ref.includes('#')) {
        this.report('resolver/unsupported-source', `unsupported source ${ref}: only relative file paths, #/sets/<name> and inline tokens are supported`, refProp.value, 'copy the tokens into a repository file and reference it by relative path');
        return;
      }
      const path = normalizeRepoPath(this.dir === '' ? ref : `${this.dir}/${ref}`);
      if (path === null) {
        this.report('source/outside-root', `source ${ref} leaves the repository root`, refProp.value);
        return;
      }
      if (path === PATHS.export || path.startsWith(`${PATHS.export}/`)) {
        this.report('source/export-path', `source ${path} points into ${PATHS.export}/, which holds generated flavors, not token source (ADR-0024 §11.2)`, refProp.value, 'reference the *.tokens.json source file instead');
        return;
      }
      const doc = this.loadDoc(path, refProp.value);
      if (doc !== null) out.push(doc);
    });
    return out;
  }

  private loadDoc(path: string, refNode: Node): SourceDoc | null {
    const cached = this.docs.get(path);
    if (cached !== undefined) return cached;
    if (this.failedDocs.has(path)) return null;
    let text: string;
    try {
      text = this.reader.readText(path);
    } catch {
      this.report('source/missing-file', `source file ${path} does not exist`, refNode);
      this.failedDocs.add(path);
      return null;
    }
    const json = parseJson(path, text, this.diagnostics);
    if (json === null) {
      this.failedDocs.add(path);
      return null;
    }
    const doc = this.walkDocument(path, path, json, json.root);
    if (doc === null) {
      this.failedDocs.add(path);
      return null;
    }
    this.docs.set(path, doc);
    return doc;
  }

  /** Walks one token document (a file or an inline source). */
  private walkDocument(docFile: string, locFile: string, json: JsonDoc, rootNode: Node): SourceDoc | null {
    const diagnostics = this.diagnostics;
    const line = (n: Node): number => json.line(n.offset);
    const where = (n: Node): { file: string; line: number } => ({ file: locFile, line: line(n) });
    if (rootNode.type !== 'object') {
      diagnostics.push(error('source/structure', 'a token document must be a JSON object', where(rootNode)));
      return null;
    }
    const plain = valueOf(rootNode) as Record<string, unknown>;
    delete plain['$schema'];
    deepFreeze(plain);
    const tokens = new Map<string, SourceToken>();
    const groups = new Map<string, SourceGroup>();
    const groupTypes = new Map<string, TokenType>();

    const checkName = (key: string, keyNode: Node, path: readonly string[]): void => {
      if (key === '$root') return;
      if (!NAME_RE.test(key)) {
        diagnostics.push(
          error('source/name-case', `name "${key}" at ${[...path, key].join('.')} is not lowercase kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$)`, {
            ...where(keyNode),
            hint: `rename it to "${kebab(key)}" and update every reference`,
          }),
        );
      } else if (Object.hasOwn(Object.prototype, key)) {
        // Only "constructor" passes NAME_RE; Style Dictionary 5.5.3 silently drops a token or group of that name.
        diagnostics.push(
          error('source/name-case', `name "${key}" at ${[...path, key].join('.')} is reserved: it names an Object.prototype member, and Style Dictionary drops a token or group of that name`, {
            ...where(keyNode),
            hint: 'reserved: Style Dictionary drops it; rename it and update every reference',
          }),
        );
      }
    };

    const checkExtensions = (extNode: Node, extValue: unknown, ownerId: string, isToken: boolean): void => {
      if (!isPlainObject(extValue)) {
        diagnostics.push(error('source/structure', `$extensions of ${ownerId || '(root)'} must be an object`, where(extNode)));
        return;
      }
      if (!('app.prism' in extValue)) return;
      const nsNode = properties(extNode).find((p) => p.key === 'app.prism');
      if (!isToken) {
        diagnostics.push(error('extension/schema', `$extensions["app.prism"] is allowed on tokens only (group ${ownerId || '(root)'})`, { ...where(nsNode?.keyNode ?? extNode), tokenId: ownerId || undefined }));
        return;
      }
      for (const problem of validateAppPrism(extValue['app.prism'])) {
        diagnostics.push(
          error('extension/schema', `$extensions["app.prism"]${problem.pointer.replace(/\//g, '.')} ${problem.message}`, {
            ...where(nsNode?.value ?? extNode),
            tokenId: ownerId,
          }),
        );
      }
    };

    const checkJsonPointer = (node: Node, id: string): void => {
      if (node.type === 'object') {
        for (const p of properties(node)) {
          if (p.key === '$ref') {
            diagnostics.push(
              error('ref/json-pointer', `JSON Pointer "$ref" inside the value of ${id}; Prism allows only curly-brace references (ADR-0024 §1.5)`, {
                ...where(p.keyNode),
                tokenId: id,
                hint: 'write a curly-brace reference to a whole token, e.g. "{ref.color.neutral.100}"',
              }),
            );
          } else checkJsonPointer(p.value, id);
        }
      } else if (node.type === 'array') {
        for (const c of node.children ?? []) checkJsonPointer(c, id);
      }
    };

    const tokenLines = (node: Node, pointer: string, out: Map<string, number>): void => {
      if (node.type === 'object') {
        for (const p of properties(node)) {
          const ptr = `${pointer}/${escapePointer(p.key)}`;
          out.set(ptr, line(p.keyNode));
          tokenLines(p.value, ptr, out);
        }
      } else if (node.type === 'array') {
        (node.children ?? []).forEach((c, i) => {
          const ptr = `${pointer}/${i}`;
          out.set(ptr, line(c));
          tokenLines(c, ptr, out);
        });
      }
    };

    const walk = (
      node: Node,
      value: Record<string, unknown>,
      path: readonly string[],
      groupType: TokenType | null,
      deprecated: string | true | null,
      locNode: Node,
    ): void => {
      const groupId = path.join('.');
      let ownGroupType: TokenType | null = null;
      let ownDeprecated: string | true | null = deprecated;
      for (const p of properties(node)) {
        if (!p.key.startsWith('$') || p.key === '$root') continue;
        if (p.key === '$schema' && path.length === 0) continue;
        if (p.key === '$extends') {
          diagnostics.push(error('resolver/extends-unsupported', `$extends is not supported by Prism (group ${groupId || '(root)'})`, { ...where(p.keyNode), hint: 'restate the tokens instead of extending a group' }));
        } else if (p.key === '$ref') {
          diagnostics.push(error('ref/json-pointer', `JSON Pointer "$ref" in group ${groupId || '(root)'}; Prism allows only curly-brace references (ADR-0024 §1.5)`, where(p.keyNode)));
        } else if (!GROUP_PROPS.has(p.key)) {
          diagnostics.push(error('source/group-property', `unknown group property "${p.key}" in ${groupId || '(root)'}`, { ...where(p.keyNode), hint: 'group properties are $type, $description, $extensions and $deprecated' }));
        } else if (p.key === '$type') {
          if (isTokenType(p.value.value)) ownGroupType = p.value.value;
          else diagnostics.push(error('type/unknown', `unknown $type ${JSON.stringify(valueOf(p.value))} on group ${groupId || '(root)'}`, where(p.value)));
        } else if (p.key === '$description') {
          if (typeof p.value.value !== 'string' || p.value.type !== 'string') diagnostics.push(error('source/structure', `$description of ${groupId || '(root)'} must be a string`, where(p.value)));
        } else if (p.key === '$deprecated') {
          const v = valueOf(p.value);
          if (typeof v === 'string') ownDeprecated = v;
          else if (v === true) ownDeprecated = true;
          else if (v === false) ownDeprecated = null;
          else diagnostics.push(error('source/structure', `$deprecated of ${groupId || '(root)'} must be a boolean or a string`, where(p.value)));
        } else if (p.key === '$extensions') {
          checkExtensions(p.value, valueOf(p.value), groupId, false);
        }
      }
      groups.set(groupId, { path, type: ownGroupType, loc: locOf(locFile, json, locNode, path) });
      if (ownGroupType !== null) groupTypes.set(groupId, ownGroupType);
      const childType = ownGroupType ?? groupType;

      for (const p of properties(node)) {
        if (p.key.startsWith('$') && p.key !== '$root') continue;
        const childPath = [...path, p.key];
        const childId = childPath.join('.');
        checkName(p.key, p.keyNode, path);
        const childValue = value[p.key];
        if (p.value.type !== 'object' || !isPlainObject(childValue)) {
          diagnostics.push(error('source/structure', `${childId} must be a token or a group object`, where(p.keyNode)));
          continue;
        }
        const isToken = properties(p.value).some((q) => q.key === '$value');
        if (!isToken) {
          if (p.key === '$root') {
            diagnostics.push(error('source/structure', `${childId} must be a token (an object with $value)`, where(p.keyNode)));
            continue;
          }
          walk(p.value, childValue, childPath, childType, ownDeprecated, p.keyNode);
          continue;
        }
        // token
        let ownType: TokenType | null = null;
        let tokenDeprecated = ownDeprecated;
        for (const q of properties(p.value)) {
          if (!q.key.startsWith('$')) {
            diagnostics.push(error('source/structure', `token ${childId} has a child "${q.key}"; a token cannot contain tokens or groups`, where(q.keyNode)));
          } else if (!TOKEN_PROPS.has(q.key)) {
            diagnostics.push(error('source/token-property', `unknown token property "${q.key}" on ${childId}`, { ...where(q.keyNode), tokenId: childId, hint: 'token properties are $value, $type, $description, $extensions and $deprecated' }));
          } else if (q.key === '$type') {
            if (isTokenType(q.value.value)) ownType = q.value.value;
            else diagnostics.push(error('type/unknown', `unknown $type ${JSON.stringify(valueOf(q.value))} on ${childId}`, { ...where(q.value), tokenId: childId }));
          } else if (q.key === '$description') {
            if (q.value.type !== 'string') diagnostics.push(error('source/structure', `$description of ${childId} must be a string`, { ...where(q.value), tokenId: childId }));
          } else if (q.key === '$deprecated') {
            const v = valueOf(q.value);
            if (typeof v === 'string') tokenDeprecated = v;
            else if (v === true) tokenDeprecated = true;
            else if (v === false) tokenDeprecated = null;
            else diagnostics.push(error('source/structure', `$deprecated of ${childId} must be a boolean or a string`, { ...where(q.value), tokenId: childId }));
          } else if (q.key === '$extensions') {
            checkExtensions(q.value, valueOf(q.value), childId, true);
          } else if (q.key === '$value') {
            checkJsonPointer(q.value, childId);
          }
        }
        const lines = new Map<string, number>();
        tokenLines(p.value, '', lines);
        tokens.set(childId, {
          id: childId,
          path: childPath,
          node: childValue,
          ownType,
          groupType: childType,
          deprecated: tokenDeprecated,
          loc: locOf(locFile, json, p.keyNode, childPath),
          lines,
        });
      }
    };

    walk(rootNode, plain, [], null, null, rootNode);
    return { file: docFile, root: plain, tokens, groups, groupTypes };
  }
}

function locOf(file: string, json: JsonDoc, node: Node, path: readonly string[]): SourceToken['loc'] {
  return { file, pointer: path.length === 0 ? '' : `/${path.map(escapePointer).join('/')}`, line: json.line(node.offset), column: json.column(node.offset) };
}

function kebab(name: string): string {
  const k = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return k === '' ? 'name' : k;
}

/** Every document of a modifier context or set, in order, with its layer. */
export function layerDocs(model: SourceModel): { readonly layer: SourceLayer; readonly docs: readonly SourceDoc[] }[] {
  const out: { layer: SourceLayer; docs: readonly SourceDoc[] }[] = [];
  for (const item of model.order) {
    if (item.kind === 'set') out.push({ layer: { kind: 'set', name: item.name }, docs: model.sets.get(item.name) ?? [] });
    else {
      for (const [ctx, docs] of model.contexts.get(item.name) ?? []) out.push({ layer: { kind: 'modifier', name: item.name, context: ctx }, docs });
    }
  }
  return out;
}
