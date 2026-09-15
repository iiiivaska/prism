// `DSTokenSet.swift` and `DSTokenSet+<Category>.swift` (ARCHITECTURE §9.7.4; ADR-0020 §7): every
// non-color token value for one `DSTokenContext`, from per-axis `switch` tables. A member with no
// runtime dependency is a constant; a member with one axis switches on it; a colorScheme member switches
// on `colorScheme` plus `contrast` / `transparency` where a variant delta touches it. A member whose
// value differs across repo brands switches on `c.brand` first; shapes are the union over brands. A
// member that differs between `apple` and `watch` sits in `#if os(watchOS)`. Catalog colors (the glass
// fills and the scrim) come from `DSColorToken` in the brand's namespace; a `comp` member is initialized
// from its target's accessor for the same context. The format also runs the table evaluator (§9.12).
import type { FormatInput, FormatOutput, OutputFile } from '../index.ts';
import { colorsetExpr } from './colors.ts';
import {
  brandDependent, caseTable, platformDependent, SWIFT_SOURCES_ROOT, swiftCase, swiftModel, verifySwiftTables,
  type SwiftBrand, type SwiftGroup, type SwiftMember, type SwiftModel,
} from './model.ts';
import { bareIdent, docLines, ident, swiftFile, swiftHeader } from './syntax.ts';

export const TOKEN_SET_PATH = `${SWIFT_SOURCES_ROOT}/DSTokenSet.swift`;

export function groupPath(type: string): string {
  return `${SWIFT_SOURCES_ROOT}/DSTokenSet+${type}.swift`;
}

/** The assignments of table members for one brand and platform: constants, then one switch per field set. */
function axisGroups(model: SwiftModel, members: readonly SwiftMember[], brand: SwiftBrand, platform: string | null, indent: string): string[] {
  const out: string[] = [];
  const byFields = new Map<string, SwiftMember[]>();
  for (const m of members) {
    if (m.impl.kind !== 'table') continue;
    if (m.impl.fields.length === 0) {
      out.push(`${indent}self.${bareIdent(m.name)} = ${caseTable(model, m, brand.context, platform)[0]?.literal ?? ''}`);
      continue;
    }
    const key = m.impl.fields.join(',');
    byFields.set(key, [...(byFields.get(key) ?? []), m]);
  }
  for (const [key, group] of byFields) {
    const fields = key.split(',');
    const subject = fields.length === 1 ? `c.${fields[0] ?? ''}` : `(${fields.map((f) => `c.${f}`).join(', ')})`;
    out.push(`${indent}switch ${subject} {`);
    const tables = group.map((m) => caseTable(model, m, brand.context, platform));
    const rows = tables[0] ?? [];
    rows.forEach((row, i) => {
      const labels = row.values.map((v, k) => `.${ident(swiftCase(fields[k] ?? '', v))}`);
      out.push(`${indent}case ${labels.length === 1 ? labels[0] ?? '' : `(${labels.join(', ')})`}:`);
      group.forEach((m, j) => out.push(`${indent}    self.${bareIdent(m.name)} = ${tables[j]?.[i]?.literal ?? ''}`));
    });
    out.push(`${indent}}`);
  }
  return out;
}

/** Table assignments, with a `switch c.brand` for the members whose values differ across brands. */
function brandSplit(model: SwiftModel, members: readonly SwiftMember[], platform: string | null, indent: string): string[] {
  const invariant = members.filter((m) => !brandDependent(model, m));
  const dependent = members.filter((m) => brandDependent(model, m));
  const out = axisGroups(model, invariant, model.defaultBrand, platform, indent);
  if (dependent.length > 0) {
    out.push(`${indent}switch c.brand {`);
    for (const b of model.brands) out.push(`${indent}case .${ident(b.caseName)}:`, ...axisGroups(model, dependent, b, platform, `${indent}    `));
    out.push(`${indent}}`);
  }
  return out;
}

/** The body of an `init(_ c: DSTokenContext, …)` that assigns every member. */
function initBody(model: SwiftModel, members: readonly SwiftMember[], indent: string): string[] {
  const out: string[] = [];
  for (const m of members) {
    if (m.impl.kind === 'colorset') out.push(`${indent}self.${bareIdent(m.name)} = ${colorsetExpr(m, 'c.brand', 'c.transparency')}`);
    else if (m.impl.kind === 'alias') out.push(`${indent}self.${bareIdent(m.name)} = ${m.impl.target.accessor}`);
  }
  const tables = members.filter((m) => m.impl.kind === 'table');
  const invariant = tables.filter((m) => !platformDependent(model, m));
  const perPlatform = tables.filter((m) => platformDependent(model, m));
  out.push(...brandSplit(model, invariant, model.primary, indent));
  if (perPlatform.length > 0) {
    out.push('#if os(watchOS)', ...brandSplit(model, perPlatform, model.watch, indent), '#else', ...brandSplit(model, perPlatform, model.primary, indent), '#endif');
  }
  return out;
}

function memberLines(members: readonly SwiftMember[], indent: string): string[] {
  const out: string[] = [];
  for (const m of members) out.push(...docLines(m.description, m.deprecated, indent), `${indent}public let ${m.name}: ${m.swiftType}`);
  return out;
}

/** The groups a `comp` member reads (`color`, `space`, …), in `DSTokenSet` property order. */
function componentParams(model: SwiftModel, group: SwiftGroup): { readonly property: string; readonly type: string }[] {
  const used = new Set<string>();
  for (const c of group.components) for (const m of c.members) if (m.impl.kind === 'alias') used.add(m.impl.target.group);
  const out: { property: string; type: string }[] = [];
  if (used.has('color')) out.push({ property: 'color', type: 'DSColor' });
  for (const g of model.groups) if (used.has(g.property)) out.push({ property: g.property, type: g.type });
  return out;
}

export function renderGroupText(model: SwiftModel, group: SwiftGroup, resolver: string): string {
  const lines: string[] = [swiftHeader(resolver), 'import SwiftUI', '', 'extension DSTokenSet {'];
  if (group.components.length === 0) {
    lines.push(`    public struct ${group.type}: Hashable, Sendable {`, ...memberLines(group.members, '        '), '');
    lines.push('        init(_ c: DSTokenContext) {', ...initBody(model, group.members, '            '), '        }', '    }', '}');
    return swiftFile(lines);
  }
  const params = componentParams(model, group);
  const signature = ['_ c: DSTokenContext', ...params.map((p) => `${ident(p.property)}: ${p.type}`)].join(', ');
  const args = ['c', ...params.map((p) => `${bareIdent(ident(p.property))}: ${ident(p.property)}`)].join(', ');
  lines.push(
    '    /// The component tokens (ARCHITECTURE §9.7.4): each a whole-value alias of one `sys` token, initialized from that',
    '    /// token\'s member for the same context, so components get no colorsets of their own.',
    `    public struct ${group.type}: Hashable, Sendable {`,
  );
  for (const c of group.components) lines.push(`        public let ${ident(c.property)}: ${c.type}`);
  lines.push('', `        init(${signature}) {`);
  for (const c of group.components) lines.push(`            self.${bareIdent(c.property)} = ${c.type}(${args})`);
  lines.push('        }');
  for (const c of group.components) {
    lines.push('', `        public struct ${c.type}: Hashable, Sendable {`, ...memberLines(c.members, '            '), '');
    lines.push(`            init(${signature}) {`, ...initBody(model, c.members, '                '), '            }', '        }');
  }
  lines.push('    }', '}');
  return swiftFile(lines);
}

export function renderTokenSetText(model: SwiftModel, resolver: string): string {
  const lines: string[] = [swiftHeader(resolver), 'import SwiftUI', ''];
  lines.push(
    '/// Every token value for one context (ARCHITECTURE §9.7.4): the brand\'s catalog colors as `color` (ADR-0020 §7),',
    '/// everything else from per-axis switch tables. DSCore caches one per context.',
    'public struct DSTokenSet: Hashable, Sendable {',
    '    public let context: DSTokenContext',
    '    /// The colors of the context\'s brand, from its catalog namespace.',
    '    public let color: DSColor',
  );
  for (const g of model.groups) lines.push(`    public let ${ident(g.property)}: ${g.type}`);
  lines.push('', '    public init(_ context: DSTokenContext = .default) {', '        self.context = context');
  lines.push('        let color = DSColor(brand: context.brand, transparency: context.transparency)');
  const components = model.groups.find((g) => g.components.length > 0);
  for (const g of model.groups) {
    if (g === components) continue;
    lines.push(`        let ${ident(g.property)} = ${g.type}(context)`);
  }
  lines.push('        self.color = color');
  for (const g of model.groups) {
    if (g === components) continue;
    lines.push(`        self.${bareIdent(g.property)} = ${ident(g.property)}`);
  }
  if (components !== undefined) {
    const params = componentParams(model, components);
    lines.push(`        self.${bareIdent(components.property)} = ${components.type}(${['context', ...params.map((p) => `${bareIdent(ident(p.property))}: ${ident(p.property)}`)].join(', ')})`);
  }
  lines.push('    }', '}');
  return swiftFile(lines);
}

export function renderSwiftTokenSet(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  const resolver = input.model.resolverFile;
  const files: OutputFile[] = [{ path: TOKEN_SET_PATH, contents: renderTokenSetText(model, resolver) }];
  for (const g of model.groups) files.push({ path: groupPath(g.type), contents: renderGroupText(model, g, resolver) });
  return { files, diagnostics: [...model.diagnostics, ...verifySwiftTables(model)] };
}
