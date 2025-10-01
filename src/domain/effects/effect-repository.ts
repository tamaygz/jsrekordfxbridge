import type { Effect } from './effect.js';

export interface EffectRepository {
  loadEffects(): Promise<Effect[]>;
  getEffect(name: string): Promise<Effect | null>;
  saveEffect(effect: Effect): Promise<void>;
  deleteEffect(name: string): Promise<void>;
  getAvailableEffects(): Promise<string[]>;
  watchForChanges(callback: (effects: Effect[]) => void): void;
}