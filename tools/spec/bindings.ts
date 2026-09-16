// The binding-matrix grammar (critic G-06, ADR-0024 §5.2, ADR-0029 §3.3) and the walk that collects
// every token path a spec binds.
//
//   tokens:
//     <part>:
//       <property>: <binding>        # a token path, or a matrix
//       <state>:                     # a state block: the same properties, in that state
//         <property>: <binding>
//
// A matrix is a mapping whose keys all come from ONE axis, optionally beside the reserved key
// `default`:
//
//   * the values of one enum prop of this spec (`variant`, `size`, `tone`, `role`, …);
//   * the material the enclosing Surface publishes (ADR-0022 §3.1, ADR-0030 §3.4);
//   * the backdrop kind it publishes with it (ADR-0029 §1.4).
//
// A cell that is absent is not inherited from a sibling: the value falls back to `default` when the
// matrix has one, and otherwise the property is simply not set — which is how the ghost button has no
// rest fill (ADR-0029 §3.3). States are keys of the part, never of a matrix, and the state names are
// exactly the spec's `states`, so `focus-visible` is the focus state and `focus` is not a state at all.
import { BACKDROPS, DEFAULT_KEY, MATERIALS } from './config.ts';
import type { JsonPath } from './load.ts';

export const PROPERTY_NAME = /^[a-z][A-Za-z0-9]*$/;

export interface Axis {
  /** How a diagnostic names the axis: `prop variant`, `material`, `backdrop`. */
  readonly name: string;
  readonly values: ReadonlySet<string>;
}

export interface BindingHit {
  /** The token path exactly as the spec writes it. */
  readonly path: string;
  readonly at: JsonPath;
  /** 'tokens' or 'motion': ADR-0023 rule 9 narrows what the motion block may bind. */
  readonly block: 'tokens' | 'motion';
}

export interface GrammarProblem {
  readonly at: JsonPath;
  readonly message: string;
  readonly hint: string;
}

export interface WalkResult {
  readonly bindings: readonly BindingHit[];
  readonly problems: readonly GrammarProblem[];
  /** The parts `tokens` binds, in document order (checked against `anatomy`). */
  readonly parts: readonly { readonly name: string; readonly at: JsonPath }[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Every axis a matrix of this spec may be keyed by. */
export function axesOf(spec: Record<string, unknown>): Axis[] {
  const axes: Axis[] = [];
  const props = spec['props'];
  if (Array.isArray(props)) {
    for (const prop of props) {
      if (!isRecord(prop)) continue;
      const name = prop['name'];
      const values = prop['values'];
      if (typeof name !== 'string' || !Array.isArray(values)) continue;
      const strings = values.filter((v): v is string => typeof v === 'string');
      if (strings.length > 0) axes.push({ name: `prop ${name}`, values: new Set(strings) });
    }
  }
  axes.push({ name: 'material', values: new Set(MATERIALS) });
  axes.push({ name: 'backdrop', values: new Set(BACKDROPS) });
  return axes;
}

/** The spec's states, `default` excluded: the keys that open a state block inside a part. */
export function statesOf(spec: Record<string, unknown>): Set<string> {
  const states = spec['states'];
  if (!Array.isArray(states)) return new Set();
  return new Set(states.filter((s): s is string => typeof s === 'string' && s !== DEFAULT_KEY));
}

/** Walks `tokens` and `motion`, checking the grammar and collecting every bound path. */
export function walkBindings(spec: Record<string, unknown>): WalkResult {
  const axes = axesOf(spec);
  const states = statesOf(spec);
  const bindings: BindingHit[] = [];
  const problems: GrammarProblem[] = [];
  const parts: { name: string; at: JsonPath }[] = [];

  const binding = (value: unknown, at: JsonPath, block: 'tokens' | 'motion'): void => {
    if (typeof value === 'string') {
      bindings.push({ path: value, at, block });
      return;
    }
    if (!isRecord(value)) {
      problems.push({ at, message: 'a binding is a token path or a matrix of them', hint: 'write a token path such as color.text.primary, or a mapping keyed by one axis' });
      return;
    }
    const keys = Object.keys(value).filter((k) => k !== DEFAULT_KEY);
    if (keys.length > 0) {
      const unknown = keys.filter((k) => !axes.some((a) => a.values.has(k)));
      if (unknown.length > 0) {
        problems.push({
          at: [...at, unknown[0] ?? ''],
          message: `"${unknown.join('", "')}" ${unknown.length === 1 ? 'is not a matrix key' : 'are not matrix keys'}: a key is a value of an enum prop, a published material, a published backdrop, or "${DEFAULT_KEY}"`,
          hint: `key the matrix by one axis (${axes.map((a) => a.name).join(', ')}) or by "${DEFAULT_KEY}"`,
        });
      } else {
        const shared = axes.filter((a) => keys.every((k) => a.values.has(k)));
        if (shared.length === 0) {
          const per = keys.map((k) => `${k} (${axes.filter((a) => a.values.has(k)).map((a) => a.name).join('/')})`);
          problems.push({
            at,
            message: `the matrix keys come from more than one axis: ${per.join(', ')}`,
            hint: 'split the matrix into one level per axis, outermost axis first',
          });
        }
      }
    }
    for (const [key, child] of Object.entries(value)) binding(child, [...at, key], block);
  };

  const tokens = spec['tokens'];
  if (isRecord(tokens)) {
    for (const [part, body] of Object.entries(tokens)) {
      parts.push({ name: part, at: ['tokens', part] });
      if (!isRecord(body)) {
        problems.push({ at: ['tokens', part], message: 'a part holds properties and state blocks', hint: 'write <property>: <binding> under the part' });
        continue;
      }
      for (const [key, value] of Object.entries(body)) {
        const at: JsonPath = ['tokens', part, key];
        if (states.has(key)) {
          if (!isRecord(value)) {
            problems.push({ at, message: `"${key}" is a state of this spec, so it holds properties`, hint: `write ${key}: { <property>: <binding> }` });
            continue;
          }
          for (const [prop, cell] of Object.entries(value)) {
            const cellAt: JsonPath = [...at, prop];
            if (states.has(prop)) {
              problems.push({ at: cellAt, message: `"${prop}" is a state and a state block holds no states`, hint: 'name a property here' });
              continue;
            }
            if (!PROPERTY_NAME.test(prop)) {
              problems.push({ at: cellAt, message: `"${prop}" is not a property name`, hint: 'property names are camelCase' });
              continue;
            }
            binding(cell, cellAt, 'tokens');
          }
          continue;
        }
        if (!PROPERTY_NAME.test(key)) {
          problems.push({
            at,
            message: `"${key}" is neither a property name nor a state of this spec (${[...states].join(', ') || 'none'})`,
            hint: 'add the state to `states`, or rename the key to a camelCase property',
          });
          continue;
        }
        binding(value, at, 'tokens');
      }
    }
  }

  const motion = spec['motion'];
  if (isRecord(motion)) {
    for (const [key, value] of Object.entries(motion)) {
      if (key === 'reduceMotion') continue;
      if (typeof value !== 'string') {
        problems.push({ at: ['motion', key], message: 'a motion binding is one token path', hint: 'bind motion.spring.*, motion.duration.*, motion.easing.* or comp.<component>.motion.*' });
        continue;
      }
      bindings.push({ path: value, at: ['motion', key], block: 'motion' });
    }
  }

  return { bindings, problems, parts };
}
