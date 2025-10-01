import type { BeatPosition } from '../beat/beat-detection-service.js';

export interface Show {
  readonly name: string;
  readonly description?: string;
  readonly bpm?: number;
  readonly beatsPerBar?: number;
  readonly cues: ShowCue[];
}

export interface ShowCue {
  readonly position: CuePosition;
  readonly actions: CueAction[];
}

export interface CuePosition {
  readonly bar?: number;
  readonly beat?: number;
  readonly sixteenth?: number;
  readonly time?: number; // Absolute time in milliseconds
}

export interface CueAction {
  readonly type: 'effect' | 'lighting' | 'dmx' | 'audio';
  readonly target?: string;
  readonly parameters: Record<string, any>;
}

export interface ShowService {
  loadShow(showName: string): Promise<Show>;
  startShow(): Promise<void>;
  stopShow(): Promise<void>;
  pauseShow(): Promise<void>;
  resumeShow(): Promise<void>;
  isPlaying(): boolean;
  getCurrentShow(): Show | null;
  onBeat(position: BeatPosition): Promise<void>;
  onBar(position: BeatPosition): Promise<void>;
  getAvailableShows(): Promise<string[]>;
}