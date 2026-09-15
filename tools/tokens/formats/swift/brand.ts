// `DSBrand.swift` (ARCHITECTURE §9.7.5; ADR-0020 §5, §7): one case per `brand` context of the resolver,
// the default brand, each brand's font preset label, its colorset namespace folder and the face of each
// font slot. Faces come from each brand's `sys.font.*` at `platform=apple` (never the default, web
// permutation) together with its brand.json; a system keyword becomes a `DSSystemFontDesign`
// (ADR-0020 §5). DSCore, DSComponents and DSCharts never switch over `DSBrand` (ADR-0020 rule 13).
import { SYSTEM_FONT_DESIGNS } from '../../config.ts';
import { DECIMALS, fmt } from '../../transforms/format-number.ts';
import type { FormatInput, FormatOutput } from '../index.ts';
import { SWIFT_SOURCES_ROOT, swiftModel, type SwiftFace, type SwiftModel } from './model.ts';
import { ident, swiftFile, swiftHeader, swiftString } from './syntax.ts';

export const BRAND_PATH = `${SWIFT_SOURCES_ROOT}/DSBrand.swift`;

export function faceExpr(f: SwiftFace): string {
  const families = `[${f.families.map(swiftString).join(', ')}]`;
  const file = f.file === null ? 'nil' : swiftString(f.file);
  const names = f.postScriptNames.length === 0 ? '[:]' : `[${f.postScriptNames.map(([w, n]) => `${w}: ${swiftString(n)}`).join(', ')}]`;
  const opsz = f.opticalSize === null ? 'nil' : fmt(f.opticalSize, DECIMALS.other);
  const system = f.system === null ? 'nil' : `.${ident(f.system)}`;
  return `DSFontFace(families: ${families}, file: ${file}, postScriptNames: ${names}, opticalSize: ${opsz}, system: ${system})`;
}

function facesDict(faces: readonly SwiftFace[], indent: string): string[] {
  if (faces.length === 0) return [`${indent}[:]`];
  return [`${indent}[`, ...faces.map((f) => `${indent}    .${ident(f.slot)}: ${faceExpr(f)},`), `${indent}]`];
}

/** The preset label: brand.json's, else native when every face is a system face (fixtures without brand.json). */
function presetOf(model: SwiftModel, brand: string): string {
  const meta = model.brands.find((b) => b.context === brand)?.meta ?? null;
  if (meta !== null) return meta.preset;
  const faces = model.faces(brand, model.primary);
  return faces.length > 0 && faces.every((f) => f.system !== null) ? 'native' : 'signature';
}

export function renderBrandText(model: SwiftModel, resolver: string): string {
  const lines: string[] = [swiftHeader(`${resolver} and brands/*/brand.json`), ''];
  lines.push(
    '/// The repo brands (ADR-0020 §7): one case per `brand` context of the resolver, every one shipped in DSTokens.',
    '/// `DSTheme(brand:)` sets `DSTokenContext.brand` once per scene; components read brand values through `DSTokenSet`.',
    'public enum DSBrand: String, CaseIterable, Hashable, Sendable {',
  );
  for (const b of model.brands) {
    if (b.meta !== null) lines.push(`    /// ${b.meta.displayName}`);
    lines.push(`    case ${ident(b.caseName)} = ${swiftString(b.context)}`);
  }
  lines.push(
    '',
    '    /// The resolver\'s default brand.',
    `    public static let \`default\`: DSBrand = .${ident(model.defaultBrand.caseName)}`,
    '',
    '    /// The `preset` label of brand.json (ADR-0020 §5).',
    '    public var preset: DSFontPreset {',
    '        switch self {',
    ...model.brands.map((b) => `        case .${ident(b.caseName)}: .${presetOf(model, b.context)}`),
    '        }',
    '    }',
    '',
    '    /// The colorset namespace folder in Colors.xcassets (ADR-0020 §7): a brand whose colorsets are byte-identical to',
    '    /// an earlier brand\'s shares its folder.',
    '    public var colorNamespace: String {',
    '        switch self {',
  );
  const byNamespace = new Map<string, string[]>();
  for (const b of model.brands) {
    const ns = model.namespaces.get(b.context) ?? b.context;
    byNamespace.set(ns, [...(byNamespace.get(ns) ?? []), b.caseName]);
  }
  for (const [ns, cases] of byNamespace) lines.push(`        case ${cases.map((c) => `.${ident(c)}`).join(', ')}: ${swiftString(ns)}`);
  lines.push('        }', '    }', '');

  lines.push(
    `    /// The face of each font slot (ADR-0020 §5, ADR-0021 §9): a family bundled in DSTokens, or a system design`,
    `    /// (${Object.entries(SYSTEM_FONT_DESIGNS).map(([k, v]) => `${k} → .${v}`).join(', ')}).`,
    '    public var faces: [DSFontSlot: DSFontFace] {',
  );
  const facesSwitch = (platform: string | null, indent: string): string[] => {
    const out = [`${indent}switch self {`];
    for (const b of model.brands) {
      out.push(`${indent}case .${ident(b.caseName)}:`);
      const dict = facesDict(model.faces(b.context, platform), `${indent}    `);
      out.push(`${indent}    return ${(dict[0] ?? '').trimStart()}`, ...dict.slice(1));
    }
    out.push(`${indent}}`);
    return out;
  };
  const sameOnWatch = model.brands.every((b) => JSON.stringify(model.faces(b.context, model.primary)) === JSON.stringify(model.faces(b.context, model.watch)));
  if (sameOnWatch) lines.push(...facesSwitch(model.primary, '        '));
  else lines.push('        #if os(watchOS)', ...facesSwitch(model.watch, '        '), '        #else', ...facesSwitch(model.primary, '        '), '        #endif');
  lines.push('    }', '}');
  return swiftFile(lines);
}

export function renderSwiftBrand(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  return { files: [{ path: BRAND_PATH, contents: renderBrandText(model, input.model.resolverFile) }] };
}
