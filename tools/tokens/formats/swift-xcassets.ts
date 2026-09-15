// `prism/swift-xcassets`: `Colors.xcassets/<namespace>/**/Contents.json` (ARCHITECTURE §9.8; ADR-0020 §7).
// One colorset per `sys.color.*` token and per `sys.material.glass.*` color token, inside one namespace
// folder per brand with distinct colors (`provides-namespace`, looked up as `<namespace>/<name>`); a
// brand whose colorset files are byte-identical to an earlier brand's shares that brand's folder. A
// scheme-dependent colorset has the Any, Dark, High Contrast (`{ "appearance" : "contrast", "value" :
// "high" }`, the key of 421 of Xcode 26.6's 459 and of Xcode 27.0's 460 shipped colorsets) and Dark + High
// Contrast universal entries plus a `watch` idiom entry that carries the dark value, because actool keeps
// only the Any entry of a universal colorset for watchOS; any other colorset has one universal entry.
// The entries and the namespace assignment are computed in formats/swift/model.ts, which DSColor.swift
// and DSBrand.swift share; the JSON is Xcode's layout (formats/swift/xcode-json.ts).
import type { FormatInput, FormatOutput, OutputFile } from './index.ts';
import { swiftModel, XCASSETS_ROOT } from './swift/model.ts';
import { xcodeJson } from './swift/xcode-json.ts';

const INFO = { author: 'xcode', version: 1 } as const;

export function renderSwiftXcassets(input: FormatInput): FormatOutput {
  const model = swiftModel(input.bundle);
  if (model === null) return { files: [] };
  const files: OutputFile[] = [{ path: `${XCASSETS_ROOT}/Contents.json`, contents: xcodeJson({ info: INFO }) }];
  for (const [ns, colorsets] of model.colorsetFiles) {
    files.push({ path: `${XCASSETS_ROOT}/${ns}/Contents.json`, contents: xcodeJson({ info: INFO, properties: { 'provides-namespace': true } }) });
    for (const [name, text] of colorsets) files.push({ path: `${XCASSETS_ROOT}/${ns}/${name}.colorset/Contents.json`, contents: text });
  }
  return { files };
}
