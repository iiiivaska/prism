// The shape of one parity run: the cells of ADR-0006 rule 3, the rows they belong to and the state
// of each manifest behind them. `report.ts` builds it, `render.ts` prints it, and `--json` writes it.
import type { Diagnostic } from '../tokens/api.ts';
import type { ManifestFile, ManifestKind, Platform, Support } from './config.ts';
import type { SpecRow } from './specs.ts';

export interface Cell {
  readonly platform: Platform;
  /** What the spec declares for this platform (ADR-0010). */
  readonly support: Support;
  /** The spec version this platform implements; 0 when no manifest entry claims it. */
  readonly implemented: number;
  /** The implementation is behind the spec on a `full` or `adapted` platform (ADR-0006 rule 3). */
  readonly lag: boolean;
  /** The manifest this cell is read from; null for a pattern, which has none (ADR-0012 rule 3). */
  readonly manifest: ManifestFile | null;
}

/**
 * `pending`: no stack has implemented this spec anywhere, so it is backlog, not drift.
 * `parity`: every `full` and `adapted` cell is at the spec version.
 * `lag`: at least one of them is behind.
 * `contract`: a pattern, which has no implementation manifest entry (ADR-0012 rule 3).
 */
export type RowState = 'pending' | 'parity' | 'lag' | 'contract';

export interface Row {
  readonly spec: SpecRow;
  /** The manifest kind the spec's layer routes to; null for a pattern. */
  readonly kind: ManifestKind | null;
  /** One cell per platform, in PLATFORMS order. */
  readonly cells: readonly Cell[];
  readonly state: RowState;
}

export interface Lag {
  readonly row: Row;
  readonly cell: Cell;
}

export interface ManifestReport {
  readonly file: ManifestFile;
  readonly present: boolean;
  /** Components the manifest declares, whether or not a spec claims them. */
  readonly entries: number;
}

export interface ParityResult {
  /** Every spec file read, in the order read. */
  readonly files: readonly string[];
  readonly rows: readonly Row[];
  readonly manifests: readonly ManifestReport[];
  /** Every lagging cell, in row and platform order. */
  readonly lags: readonly Lag[];
  /** Everything that is wrong regardless of lag: an unreadable manifest, an orphan entry, a bad header. */
  readonly diagnostics: readonly Diagnostic[];
}
