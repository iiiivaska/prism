// `DSColor.swift` (ARCHITECTURE §9.7.3; ADR-0020 §7): `DSColorToken`, one case per colorset of
// Colors.xcassets and the same for every brand, with the literal values behind each catalog entry per
// namespace; `DSColorAppearances`; and the brand-scoped `DSColor(brand:transparency:)`, reached as
// `tokens.color`, with one member per `sys.color.*` token. The OS resolves scheme and contrast from the
// catalog; the brand picks the namespace folder and the context the reduced-transparency twin, which no
// token has after ADR-0022 (the rule stays for future deltas).
import { lowerCamel } from '../../ir/naming.ts';
import type { IRToken } from '../../ir/types.ts';
import { appleOptions, swiftLiteral } from '../../transforms/index.ts';
import type { FormatInput, FormatOutput } from '../index.ts';
import { SWIFT_SOURCES_ROOT, swiftCase, swiftModel, variantAxis, type Colorset, type SwiftMember, type SwiftModel } from './model.ts';
import { docLines, ident, swiftFile, swiftHeader, swiftString } from './syntax.ts';

export const COLORS_PATH = `${SWIFT_SOURCES_ROOT}/DSColor.swift`;

/** The Swift expression of a colorset member for `brand` and `transparency` expressions. */
export function colorsetExpr(member: SwiftMember, brand: string, transparency: string): string {
  if (member.impl.kind !== 'colorset') throw new Error(`${member.id} is not a colorset member`);
  const base = `DSColorToken.${ident(member.impl.colorset.caseName)}.color(${brand})`;
  if (member.impl.twin === null) return base;
  const reduced = swiftCase(variantAxis('reducedTransparency').key, variantAxis('reducedTransparency').on);
  return `${transparency} == .${ident(reduced)} ? DSColorToken.${ident(member.impl.twin.caseName)}.color(${brand}) : ${base}`;
}

/** `DSRGBA(…)` of a catalog entry: the Display P3 or authored sRGB components of §7.2. */
function lit(t: IRToken): string {
  return swiftLiteral(t.value, appleOptions(t));
}

function appearancesExpr(model: SwiftModel, c: Colorset, brand: string): string {
  const e = model.entries(c, brand);
  if (!e.dependsOnScheme) {
    // One universal entry: every appearance, the watch included, resolves to it.
    const v = lit(e.any);
    return `DSColorAppearances(any: ${v}, dark: ${v}, highContrast: ${v}, darkHighContrast: ${v}, watch: ${v})`;
  }
  return `DSColorAppearances(any: ${lit(e.any)}, dark: ${lit(e.dark)}, highContrast: ${lit(e.highContrast)}, darkHighContrast: ${lit(e.darkHighContrast)}, watch: ${lit(e.watch)})`;
}

function namespaceProperty(ns: string): string {
  return `${lowerCamel([ns])}Appearances`;
}

export function renderColorsText(model: SwiftModel, resolver: string): string {
  const lines: string[] = [swiftHeader(resolver), 'import SwiftUI', ''];
  lines.push(
    '/// One case per colorset of Colors.xcassets, the same for every brand (ADR-0020 §7). The catalog looks a colorset',
    '/// up as `<namespace>/<name>` in the brand\'s namespace folder.',
    'public enum DSColorToken: String, CaseIterable, Hashable, Sendable {',
  );
  for (const c of model.colorsets) lines.push(`    case ${ident(c.caseName)} = ${swiftString(c.name)}`);
  lines.push(
    '',
    '    /// The catalog name in the brand\'s namespace folder: `prism/color-text-secondary`.',
    '    public func assetName(_ brand: DSBrand) -> String { brand.colorNamespace + "/" + rawValue }',
    '',
    '    /// The catalog color; the OS resolves its scheme and contrast entries (ARCHITECTURE §9.8).',
    '    public func color(_ brand: DSBrand) -> Color { Color(assetName(brand), bundle: .module) }',
    '',
    '    /// The literal values behind each catalog entry (tests, contrast math, drawing outside SwiftUI).',
    '    public func appearances(_ brand: DSBrand) -> DSColorAppearances {',
    '        switch brand {',
  );
  const namespaces = [...model.colorsetFiles.keys()];
  for (const ns of namespaces) {
    const cases = model.brands.filter((b) => model.namespaces.get(b.context) === ns).map((b) => `.${ident(b.caseName)}`);
    if (cases.length > 0) lines.push(`        case ${cases.join(', ')}: ${namespaceProperty(ns)}`);
  }
  lines.push('        }', '    }');
  for (const ns of namespaces) {
    const brand = model.brands.find((b) => model.namespaces.get(b.context) === ns);
    if (brand === undefined) continue;
    lines.push('', `    private var ${namespaceProperty(ns)}: DSColorAppearances {`, '        switch self {');
    for (const c of model.colorsets) lines.push(`        case .${ident(c.caseName)}: ${appearancesExpr(model, c, brand.context)}`);
    lines.push('        }', '    }');
  }
  lines.push('}', '');

  lines.push(
    '/// The catalog entries of a colorset (ARCHITECTURE §9.8): Any, Dark, High Contrast, Dark + High Contrast and the',
    '/// `watch` idiom entry, which carries the dark value (watchOS keeps no contrast entries).',
    'public struct DSColorAppearances: Hashable, Sendable {',
    '    public let any: DSRGBA',
    '    public let dark: DSRGBA',
    '    public let highContrast: DSRGBA',
    '    public let darkHighContrast: DSRGBA',
    '    public let watch: DSRGBA',
    '',
    '    public init(any: DSRGBA, dark: DSRGBA, highContrast: DSRGBA, darkHighContrast: DSRGBA, watch: DSRGBA) {',
    '        self.any = any',
    '        self.dark = dark',
    '        self.highContrast = highContrast',
    '        self.darkHighContrast = darkHighContrast',
    '        self.watch = watch',
    '    }',
    '}',
    '',
  );

  lines.push(
    '/// The colors of one brand (ADR-0020 §7), reached as `tokens.color`: one member per `sys.color` token, each a',
    '/// catalog color in the brand\'s namespace folder; a member with a reduced-transparency colorset picks it while',
    '/// `transparency` is reduced.',
    'public struct DSColor: Hashable, Sendable {',
    '    public let brand: DSBrand',
    '    public let transparency: DSTransparency',
    '',
    '    public init(brand: DSBrand, transparency: DSTransparency) {',
    '        self.brand = brand',
    '        self.transparency = transparency',
    '    }',
  );
  for (const m of model.colorMembers) {
    lines.push('', ...docLines(m.description, m.deprecated, '    '), `    public var ${m.name}: Color { ${colorsetExpr(m, 'brand', 'transparency')} }`);
  }
  lines.push('}');
  return swiftFile(lines);
}

export function renderSwiftColors(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  return { files: [{ path: COLORS_PATH, contents: renderColorsText(model, input.model.resolverFile) }] };
}
