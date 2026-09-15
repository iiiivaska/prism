// `DSTokenTypes.swift` (ARCHITECTURE §9.7.2): the value types of DSTokens, emitted from a template with
// no token values. Every type is `Hashable & Sendable` and nonisolated (Package.swift `valueSettings`);
// DSTokens imports only SwiftUI. The case lists come from config.ts (the `DSTextStyle` cases of
// ADR-0021 §7, the system designs of ADR-0020 §5) and the IR's closed unions, so nothing is spelled
// twice. Glass recipes need no type of their own: each field is a plain member (ADR-0022 §2.4).
import { DS_TEXT_STYLES, FONT_SLOTS, SYSTEM_FONT_DESIGNS } from '../../config.ts';
import type { FormatInput, FormatOutput } from '../index.ts';
import { SWIFT_FONTS_DIR } from '../fonts.ts';
import { SWIFT_SOURCES_ROOT, swiftModel } from './model.ts';
import { ident, swiftFile, swiftHeader } from './syntax.ts';

export const TYPES_PATH = `${SWIFT_SOURCES_ROOT}/DSTokenTypes.swift`;

/** `IRStrokeStyle.keyword` (ARCHITECTURE §4.2, §7.10). */
const STROKE_KEYWORDS = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset'] as const;
const LINE_CAPS = ['round', 'butt', 'square'] as const;

function cases(names: readonly string[]): string {
  return names.map(ident).join(', ');
}

/** A `Hashable & Sendable` struct with public stored properties and a public memberwise initializer. */
function valueStruct(doc: readonly string[], name: string, fields: readonly (readonly [string, string, string?])[], extra: readonly string[] = [], labelled = true): string[] {
  const out = [...doc.map((d) => `/// ${d}`), `public struct ${name}: Hashable, Sendable {`];
  for (const [f, type, comment] of fields) out.push(`    public let ${f}: ${type}${comment === undefined ? '' : ` // ${comment}`}`);
  out.push('');
  const params = fields.map(([f, type]) => (labelled ? `${f}: ${type}` : `_ ${f}: ${type}`)).join(', ');
  out.push(`    public init(${params}) {`);
  for (const [f] of fields) out.push(`        self.${f} = ${f}`);
  out.push('    }');
  if (extra.length > 0) out.push('', ...extra);
  out.push('}', '');
  return out;
}

export function renderTypesText(resolver: string): string {
  const lines: string[] = [swiftHeader(resolver), 'import SwiftUI', ''];

  lines.push(
    '/// The color space of a literal color (ARCHITECTURE §7.2): authored sRGB overlays stay sRGB, every other color is Display P3.',
    'public enum DSColorSpace: String, CaseIterable, Hashable, Sendable {',
    '    case sRGB, displayP3',
    '}',
    '',
  );
  lines.push(...valueStruct(
    ['A literal color: the value behind a catalog entry, a shadow layer or a gradient stop.'],
    'DSRGBA',
    [['space', 'DSColorSpace'], ['red', 'Double'], ['green', 'Double'], ['blue', 'Double'], ['alpha', 'Double']],
    [
      '    public var color: Color {',
      '        Color(space == .sRGB ? .sRGB : .displayP3, red: red, green: green, blue: blue, opacity: alpha)',
      '    }',
    ],
    false,
  ));
  lines.push(...valueStruct(
    [
      "Apple's two-parameter spring (ADR-0023 §1–§3) with the physics triplet the web runtime configures Motion with.",
      '`settle` is the ε = 0.001 displacement settle in seconds, never SwiftUI\'s own settling estimate (ADR-0023 §3).',
    ],
    'DSSpringToken',
    [
      ['duration', 'Double'], ['bounce', 'Double'], ['blendDuration', 'Double'], ['settle', 'Double'],
      ['mass', 'Double'], ['stiffness', 'Double'], ['damping', 'Double'],
    ],
    [
      '    public var spring: Spring { Spring(duration: duration, bounce: bounce) }',
      '',
      '    public var animation: Animation { .spring(spring, blendDuration: blendDuration) }',
    ],
  ));
  lines.push(...valueStruct(
    ['A cubic Bézier easing (ARCHITECTURE §7.5).'],
    'DSCubicBezier',
    [['x1', 'Double'], ['y1', 'Double'], ['x2', 'Double'], ['y2', 'Double']],
    ['    public func animation(duration: TimeInterval) -> Animation { .timingCurve(x1, y1, x2, y2, duration: duration) }'],
  ));
  lines.push(...valueStruct(
    ['A transition without a spring in every context (seconds); a spring token is a `DSSpringToken` (ARCHITECTURE §7.6).'],
    'DSTransitionToken',
    [['duration', 'TimeInterval'], ['delay', 'TimeInterval'], ['curve', 'DSCubicBezier'], ['spring', 'DSSpringToken?']],
  ));
  lines.push(...valueStruct(
    ['One shadow layer with CSS blur semantics; DSCore converts the blur to a SwiftUI radius (ARCHITECTURE §7.8).'],
    'DSShadowLayer',
    [['color', 'DSRGBA'], ['x', 'CGFloat'], ['y', 'CGFloat'], ['blur', 'CGFloat'], ['spread', 'CGFloat'], ['inset', 'Bool']],
  ));
  lines.push(...valueStruct(['A shadow: its layers, back to front.'], 'DSShadowToken', [['layers', '[DSShadowLayer]']]));
  lines.push(...valueStruct(['A gradient stop; `location` runs from 0 to 1.'], 'DSGradientStop', [['color', 'DSRGBA'], ['location', 'Double']]));
  lines.push(...valueStruct(
    [
      'A vivid gradient (ARCHITECTURE §7.9, ADR-0022 §4): `angle` in degrees with CSS semantics, which DSCore turns into',
      'start and end points for the surface size; grain and bloom belong to the gradient (ADR-0024 §6).',
      'Interpolation: OKLab on both stacks (P1-5\'s parity decision, ARCHITECTURE §7.9, §16.3). The web writes `in oklab`;',
      'DSCore (P3-1) draws the stops with `Gradient.ColorSpace.perceptual` once that space is verified to be OKLab',
      '(ARCHITECTURE §16.1 V14), else with stops resampled in OKLab. SwiftUI\'s default, `.device`, would not match the web.',
    ],
    'DSGradientToken',
    [
      ['stops', '[DSGradientStop]'], ['angle', 'Double'], ['grain', 'Double'], ['scheme', 'DSColorScheme?'],
      ['bloomAlpha', 'Double'], ['bloomBlur', 'CGFloat'],
    ],
  ));

  lines.push(
    '/// The font slots a type role names (ADR-0020 §5).',
    `public enum DSFontSlot: String, CaseIterable, Hashable, Sendable {`,
    `    case ${cases(FONT_SLOTS)}`,
    '}',
    '',
    '/// Figures (ADR-0021 §5): proportional renders the family default, tabular `.monospacedDigit()`.',
    'public enum DSNumericSpacing: String, CaseIterable, Hashable, Sendable {',
    '    case proportional, tabular',
    '}',
    '',
    '/// The Dynamic Type curve of a role (ADR-0021 §7). It mirrors `Font.TextStyle`, so `Sendable` does not depend on the SDK.',
    'public enum DSTextStyle: String, CaseIterable, Hashable, Sendable {',
    `    case ${cases(DS_TEXT_STYLES)}`,
    '',
    '    /// The SwiftUI text style for `@ScaledMetric(relativeTo:)`, which scales the role size (ADR-0021 §9).',
    '    public var fontTextStyle: Font.TextStyle {',
    '        switch self {',
    ...DS_TEXT_STYLES.map((s) => `        case .${ident(s)}: .${ident(s)}`),
    '        }',
    '    }',
    '}',
    '',
  );
  lines.push(...valueStruct(
    [
      'A type role (ADR-0021 §4, §6, §9): the size in points at the Large Dynamic Type size, the weight resolved for the',
      'context (dark weight, Increase Contrast floor), the Bold Text weight, the line height as a multiple of the size and the',
      'tracking as a fraction of it. The family comes from `DSBrand.faces` by slot. DSCore scales `size` with',
      '`@ScaledMetric(relativeTo: textStyle.fontTextStyle)`.',
    ],
    'DSTypeRole',
    [
      ['slot', 'DSFontSlot'], ['size', 'CGFloat'], ['weight', 'Int'], ['boldWeight', 'Int'], ['lineHeight', 'Double'],
      ['trackingEm', 'Double'], ['numeric', 'DSNumericSpacing'], ['textStyle', 'DSTextStyle'],
    ],
  ));

  lines.push(
    '/// The line cap of a dashed stroke (ARCHITECTURE §7.10).',
    'public enum DSLineCap: String, CaseIterable, Hashable, Sendable {',
    `    case ${cases(LINE_CAPS)}`,
    '}',
    '',
    '/// The CSS keyword of a keyword stroke style (ARCHITECTURE §7.10).',
    'public enum DSStrokeKeyword: String, CaseIterable, Hashable, Sendable {',
    `    case ${cases(STROKE_KEYWORDS)}`,
    '}',
    '',
    '/// A stroke style: a keyword, or a dash pattern in points with an optional line cap (ARCHITECTURE §7.10).',
    'public struct DSStrokeStyle: Hashable, Sendable {',
    '    public let keyword: DSStrokeKeyword?',
    '    public let dash: [CGFloat]',
    '    public let lineCap: DSLineCap?',
    '',
    '    public init(dash: [CGFloat], lineCap: DSLineCap?) {',
    '        keyword = nil',
    '        self.dash = dash',
    '        self.lineCap = lineCap',
    '    }',
    '',
    '    public init(keyword: DSStrokeKeyword) {',
    '        self.keyword = keyword',
    '        dash = []',
    '        lineCap = nil',
    '    }',
    '}',
    '',
  );
  lines.push(...valueStruct(['A border: color, width in points and stroke style.'], 'DSBorderToken', [['color', 'DSRGBA'], ['width', 'CGFloat'], ['style', 'DSStrokeStyle']]));

  const designs = [...new Set(Object.values(SYSTEM_FONT_DESIGNS))];
  lines.push(
    '/// The `preset` label of brand.json (ADR-0020 §5); nothing switches on it.',
    'public enum DSFontPreset: String, CaseIterable, Hashable, Sendable {',
    '    case signature, native',
    '}',
    '',
    `/// A system face (ADR-0020 §5): ${Object.entries(SYSTEM_FONT_DESIGNS).map(([k, v]) => `${k} → ${v}`).join(', ')}.`,
    'public enum DSSystemFontDesign: String, CaseIterable, Hashable, Sendable {',
    `    case ${cases(designs)}`,
    '',
    '    public var fontDesign: Font.Design {',
    '        switch self {',
    ...designs.map((d) => `        case .${ident(d)}: .${ident(d)}`),
    '        }',
    '    }',
    '}',
    '',
  );
  lines.push(...valueStruct(
    [
      'The face of a font slot on Apple (ADR-0020 §5, ADR-0021 §9): a family bundled in DSTokens (`file` relative to',
      `\`Resources/${SWIFT_FONTS_DIR}\`, with the PostScript name Core Text exposes for each named instance) or a system design.`,
    ],
    'DSFontFace',
    [
      ['families', '[String]'], ['file', 'String?'], ['postScriptNames', '[Int: String]'], ['opticalSize', 'Double?'],
      ['system', 'DSSystemFontDesign?'],
    ],
    [
      '    /// The named instance for `weight`: the exact one, else the nearest heavier one, else the heaviest (ADR-0021 §9).',
      '    /// Nil for a system face.',
      '    public func postScriptName(for weight: Int) -> String? {',
      '        if let exact = postScriptNames[weight] { return exact }',
      '        let weights = postScriptNames.keys.sorted()',
      '        guard let chosen = weights.first(where: { $0 > weight }) ?? weights.last else { return nil }',
      '        return postScriptNames[chosen]',
      '    }',
      '',
      '    /// The bundled font file; nil for a system face. DSCore registers it (ADR-0021 §9).',
      '    public var fileURL: URL? {',
      '        guard let file else { return nil }',
      `        return DSTokensBundle.bundle.resourceURL?.appendingPathComponent(${JSON.stringify(SWIFT_FONTS_DIR)}, isDirectory: true).appendingPathComponent(file, isDirectory: false)`,
      '    }',
    ],
  ));
  lines.push(
    '/// DSTokens\' resource bundle (the color catalog and the fonts), for DSCore and the catalog tests (ARCHITECTURE §9.7.2).',
    'package enum DSTokensBundle {',
    '    package static var bundle: Bundle { .module }',
    '}',
  );
  return swiftFile(lines);
}

export function renderSwiftTypes(input: FormatInput): FormatOutput {
  if (swiftModel(input.bundle) === null) return { files: [] };
  return { files: [{ path: TYPES_PATH, contents: renderTypesText(input.model.resolverFile) }] };
}
