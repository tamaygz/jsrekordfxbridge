import type { Effect } from './effect.js';

export interface EffectEngineService {
  loadEffects(): Promise<void>;
  getEffect(name: string): Promise<Effect | null>;
  getAvailableEffects(): Promise<string[]>;
  reloadEffects(): Promise<void>;
  executeEffect(effect: Effect, intensity?: number): Promise<void>;
}

export interface EffectExecutionContext {
  readonly timestamp: number;
  readonly intensity: number;
  readonly bpm?: number;
  readonly beatPosition?: {
    readonly bar: number;
    readonly beat: number;
    readonly sixteenth: number;
  };
}