/**
 * A small CSS reader for the stylesheet tests: enough of the syntax to walk Prism's own source and
 * compiled stylesheets (rules, nested rules, at-rules with and without blocks, declarations, strings
 * and comments), and nothing more. It keeps the nesting as written, so a test can ask which at-rules
 * enclose a rule.
 */

export interface CssRule {
  readonly kind: "rule";
  readonly selector: string;
  readonly children: readonly CssNode[];
}

export interface CssAtRule {
  readonly kind: "at";
  readonly name: string;
  readonly params: string;
  /** `null` for a statement at-rule such as `@import` or `@reference`. */
  readonly children: readonly CssNode[] | null;
}

export interface CssDeclaration {
  readonly kind: "decl";
  readonly property: string;
  readonly value: string;
}

export type CssNode = CssRule | CssAtRule | CssDeclaration;

/** A rule with its fully resolved selectors and the at-rules around it, outermost first. */
export interface FlatRule {
  readonly selectors: readonly string[];
  readonly atRules: readonly CssAtRule[];
  readonly declarations: readonly CssDeclaration[];
}

function stripComments(source: string): string {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i] ?? "";
    if (quote !== null) {
      out += ch;
      if (ch === "\\") out += source[++i] ?? "";
      else if (ch === quote) quote = null;
    } else if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 1;
      out += " ";
    } else {
      if (ch === '"' || ch === "'") quote = ch;
      out += ch;
    }
  }
  return out;
}

function atRuleOf(prelude: string, children: readonly CssNode[] | null): CssAtRule {
  const match = /^@([\w-]+)\s*([\s\S]*)$/.exec(prelude);
  return { kind: "at", name: match?.[1] ?? "", params: (match?.[2] ?? "").trim(), children };
}

function declarationOf(statement: string): CssDeclaration | null {
  const colon = statement.indexOf(":");
  if (colon === -1) return null;
  return { kind: "decl", property: statement.slice(0, colon).trim(), value: statement.slice(colon + 1).trim() };
}

export function parseCss(source: string): CssNode[] {
  const text = stripComments(source);
  let i = 0;

  const parseBlock = (): CssNode[] => {
    const nodes: CssNode[] = [];
    let buffer = "";
    let depth = 0;
    const flushStatement = (): void => {
      const statement = buffer.trim();
      buffer = "";
      if (statement === "") return;
      if (statement.startsWith("@")) nodes.push(atRuleOf(statement, null));
      else {
        const declaration = declarationOf(statement);
        if (declaration !== null) nodes.push(declaration);
      }
    };
    while (i < text.length) {
      const ch = text[i] ?? "";
      if (ch === '"' || ch === "'") {
        const start = i;
        i++;
        while (i < text.length && text[i] !== ch) i += text[i] === "\\" ? 2 : 1;
        i++;
        buffer += text.slice(start, i);
        continue;
      }
      if (ch === "(" || ch === "[") depth++;
      if (ch === ")" || ch === "]") depth--;
      if (depth === 0 && ch === "{") {
        const prelude = buffer.trim();
        buffer = "";
        i++;
        const children = parseBlock();
        nodes.push(prelude.startsWith("@") ? atRuleOf(prelude, children) : { kind: "rule", selector: prelude, children });
        continue;
      }
      if (depth === 0 && ch === ";") {
        i++;
        flushStatement();
        continue;
      }
      if (depth === 0 && ch === "}") {
        i++;
        flushStatement();
        return nodes;
      }
      buffer += ch;
      i++;
    }
    flushStatement();
    return nodes;
  };

  return parseBlock();
}

/** Splits at top-level commas, outside parentheses, brackets and strings. */
export function splitTopLevel(input: string, separator = ","): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] ?? "";
    if (quote !== null) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && ch === separator) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") parts.push(current.trim());
  return parts;
}

function resolveNesting(parents: readonly string[], selector: string): string[] {
  const own = splitTopLevel(selector);
  if (parents.length === 0) return own;
  return parents.flatMap((parent) => own.map((child) => (child.includes("&") ? child.replaceAll("&", parent) : `${parent} ${child}`)));
}

/** Every rule that holds declarations, with its selectors resolved against its parents. */
export function flattenRules(nodes: readonly CssNode[]): FlatRule[] {
  const out: FlatRule[] = [];
  const walk = (list: readonly CssNode[], selectors: readonly string[], atRules: readonly CssAtRule[]): void => {
    const declarations = list.filter((node): node is CssDeclaration => node.kind === "decl");
    if (declarations.length > 0 && (selectors.length > 0 || atRules.length > 0)) out.push({ selectors, atRules, declarations });
    for (const node of list) {
      if (node.kind === "rule") walk(node.children, resolveNesting(selectors, node.selector), atRules);
      else if (node.kind === "at" && node.children !== null) walk(node.children, selectors, [...atRules, node]);
    }
  };
  walk(nodes, [], []);
  return out;
}

/** Every at-rule in the tree, nested ones included. */
export function allAtRules(nodes: readonly CssNode[]): CssAtRule[] {
  const out: CssAtRule[] = [];
  const walk = (list: readonly CssNode[]): void => {
    for (const node of list) {
      if (node.kind === "at") {
        out.push(node);
        if (node.children !== null) walk(node.children);
      } else if (node.kind === "rule") {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/** The rightmost compound selector: what follows the last combinator outside parentheses. */
export function rightmostCompound(selector: string): string {
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i] ?? "";
    if (quote !== null) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && (ch === " " || ch === ">" || ch === "+" || ch === "~" || ch === "\n" || ch === "\t")) start = i + 1;
  }
  return selector.slice(start).trim();
}
