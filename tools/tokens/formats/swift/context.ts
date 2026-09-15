// `DSTokenContext.swift` (ARCHITECTURE §9.7.1; ADR-0019 §1–§2, ADR-0020 §7): the context enums and
// `DSTokenContext` with `brand` first, `default` (the resolver default) and `platformDefault` (where
// DSCore starts on each OS). Everything comes from WEB_RUNTIME and PLATFORM_DEFAULTS in config.ts, the
// one hand-written copy of the contract (ADR-0019 rule 1). The mapping from a Swift context to resolver
// inputs is `SwiftModel.tokenIn` (model.ts): `(s, standard, standard)` → s, a variant → its
// `s-increased-contrast` or `s-reduced-transparency` context, both → s ⊕ ΔIC(s) ⊕ ΔRT(s).
import { PLATFORM_DEFAULTS, type PlatformDefault } from '../../config.ts';
import type { FormatInput, FormatOutput } from '../index.ts';
import { DEFAULT_CONTEXT, SWIFT_AXES, SWIFT_SOURCES_ROOT, swiftCase, swiftModel, type SwiftModel } from './model.ts';
import { ident, swiftFile, swiftHeader } from './syntax.ts';

export const CONTEXT_PATH = `${SWIFT_SOURCES_ROOT}/DSTokenContext.swift`;

/** `#if` branches of `platformDefault` (ADR-0019 §2): watchOS, macOS, then iOS and iPadOS. */
export const PLATFORM_BRANCHES: readonly { readonly condition: string; readonly platform: string }[] = [
  { condition: '#if os(watchOS)', platform: 'watchos' },
  { condition: '#elseif os(macOS)', platform: 'macos' },
  { condition: '#else', platform: 'ios' },
];

/** `DSTokenContext(colorScheme: .dark, density: .comfortable, modality: .touch)` for a PLATFORM_DEFAULTS row. */
export function platformDefaultExpr(d: PlatformDefault): string {
  const args: string[] = [];
  for (const a of SWIFT_AXES) {
    const v = (d as unknown as Readonly<Record<string, string | undefined>>)[a.key];
    if (v !== undefined) args.push(`${a.key}: .${ident(swiftCase(a.key, v))}`);
  }
  return `DSTokenContext(${args.join(', ')})`;
}

export function renderContextText(model: SwiftModel, resolver: string): string {
  const lines: string[] = [swiftHeader(`${resolver} and tools/tokens/config.ts (WEB_RUNTIME, PLATFORM_DEFAULTS)`), ''];
  for (const a of SWIFT_AXES) {
    const values = a.cases.map((c, i) => `\`${c.swift}\`${c.web === c.swift ? '' : ` (web \`${c.web}\`)`}${i === 0 ? ' (default)' : ''}`).join(', ');
    lines.push(
      `/// \`${a.key}\`, web attribute \`${a.runtime.attribute}\`: ${values} (ADR-0019 §1).`,
      `public enum ${a.type}: String, CaseIterable, Hashable, Sendable {`,
      `    case ${a.cases.map((c) => ident(c.swift)).join(', ')}`,
      '}',
      '',
    );
  }
  lines.push(
    '/// The context a token set resolves in (ARCHITECTURE §9.7.1): the brand, set once per scene by `DSTheme(brand:)`',
    '/// (ADR-0020 §7), and the runtime axes of ADR-0019 §1. DSCore starts from `platformDefault` and overlays the',
    '/// environment and `DSAccessibilityPolicy` (ADR-0019 §5).',
    'public struct DSTokenContext: Hashable, Sendable {',
    '    public var brand: DSBrand',
  );
  for (const a of SWIFT_AXES) lines.push(`    public var ${ident(a.key)}: ${a.type}`);
  const params = ['brand: DSBrand = .default', ...SWIFT_AXES.map((a) => `${ident(a.key)}: ${a.type} = .${ident(swiftCase(a.key, DEFAULT_CONTEXT[a.key] ?? ''))}`)];
  lines.push('', '    public init(');
  params.forEach((p, i) => lines.push(`        ${p}${i === params.length - 1 ? '' : ','}`));
  lines.push('    ) {', '        self.brand = brand');
  for (const a of SWIFT_AXES) lines.push(`        self.${a.key} = ${ident(a.key)}`);
  lines.push(
    '    }',
    '',
    '    /// The resolver default (the web root with nothing set): tests and the table evaluator. Not a device default.',
    '    public static let `default` = DSTokenContext()',
    '',
    '    /// Where DSCore starts on this OS (ADR-0019 §2); iPadOS switches to pointer while a pointing device is connected.',
  );
  for (const b of PLATFORM_BRANCHES) {
    const d = PLATFORM_DEFAULTS[b.platform];
    lines.push(`    ${b.condition}`);
    if (d !== undefined) lines.push(`    public static let platformDefault = ${platformDefaultExpr(d)}`);
    else lines.push('    public static let platformDefault = DSTokenContext()');
  }
  lines.push('    #endif', '}');
  return swiftFile(lines);
}

export function renderSwiftContext(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  return { files: [{ path: CONTEXT_PATH, contents: renderContextText(model, input.model.resolverFile) }] };
}
