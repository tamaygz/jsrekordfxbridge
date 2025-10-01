export interface BeatPosition {
  readonly bar: number;
  readonly beat: number;
  readonly sixteenth: number;
  readonly timestamp: number;
}

export interface BeatDetectionService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getCurrentPosition(): BeatPosition | null;
  onBeat(callback: (position: BeatPosition) => void): void;
  onBar(callback: (position: BeatPosition) => void): void;
  setBPM(bpm: number): void;
  getCurrentBPM(): number | null;
}