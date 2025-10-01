import type { BeatPosition, BPM } from '../../types/domain/beats.js';
import type { DomainEvent } from '../../types/domain/events.js';
import type { Effect, EffectExecution } from '../effects/effect.js';

export interface ShowCue {
  readonly id: string;
  readonly name: string;
  readonly triggerCondition: TriggerCondition;
  readonly effects: readonly ShowEffect[];
  readonly nextCue?: string;
}

export interface ShowEffect {
  readonly effectId: string;
  readonly parameters: Record<string, unknown>;
  readonly delay?: number; // ms
}

export interface TriggerCondition {
  readonly type: 'manual' | 'beat' | 'time' | 'midi' | 'auto';
  readonly condition?: unknown; // specific condition data
}

export interface Show {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly cues: readonly ShowCue[];
  readonly metadata: ShowMetadata;
}

export interface ShowMetadata {
  readonly bpm?: BPM;
  readonly duration?: number;
  readonly created: Date;
  readonly modified: Date;
  readonly tags: readonly string[];
}

export interface ShowExecution {
  readonly showId: string;
  readonly currentCue?: string;
  readonly isRunning: boolean;
  readonly startTime: Date;
  readonly runningEffects: readonly EffectExecution[];
}

export abstract class ShowController {
  abstract loadShow(definition: unknown): Promise<Show>;
  abstract startShow(showId: string): Promise<ShowExecution>;
  abstract stopShow(showId: string): Promise<void>;
  abstract triggerCue(showId: string, cueId: string): Promise<void>;
  abstract getRunningShows(): Promise<ShowExecution[]>;
  abstract onBeat(beat: BeatPosition): Promise<void>;
}

export interface ShowRepository {
  findById(id: string): Promise<Show | null>;
  save(show: Show): Promise<void>;
  delete(id: string): Promise<void>;
  list(): Promise<Show[]>;
}

export interface ShowStartedEvent extends DomainEvent {
  readonly type: 'show.started';
  readonly showId: string;
}

export interface CueTriggeredEvent extends DomainEvent {
  readonly type: 'cue.triggered';
  readonly showId: string;
  readonly cueId: string;
}