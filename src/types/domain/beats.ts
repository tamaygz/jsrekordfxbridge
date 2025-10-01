// Beat and timing-related domain types

export interface BeatPosition {
  readonly beat: number;
  readonly measure: number;
  readonly isDownbeat: boolean;
}

export interface TimeRange {
  readonly startMs: number;
  readonly durationMs: number;
}

export interface BPM {
  readonly value: number; // beats per minute
}