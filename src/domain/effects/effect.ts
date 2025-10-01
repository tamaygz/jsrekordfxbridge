import type { EffectId } from '../../types/domain/effects.js';
import type { Color, Intensity } from '../../types/domain/lighting.js';
import type { TimeRange, BeatPosition } from '../../types/domain/beats.js';
import type { LightCommand } from '../lighting/light-controller.js';
import type { DMXFrame } from '../dmx/dmx-controller.js';

export interface EffectParameter {
  readonly name: string;
  readonly value: unknown;
  readonly type: 'color' | 'number' | 'boolean' | 'string' | 'duration';
}

export interface EffectStep {
  readonly action: EffectAction;
  readonly duration: TimeRange;
  readonly parameters: EffectParameter[];
  readonly target: EffectTarget;
}

export interface EffectAction {
  readonly type: 'fade' | 'pulse' | 'sweep' | 'strobe' | 'hold' | 'blackout';
  readonly intensity?: Intensity;
  readonly color?: Color;
}

export interface EffectTarget {
  readonly type: 'all' | 'zone' | 'specific' | 'pattern';
  readonly selector: string | number | string[];
}

export interface Effect {
  readonly id: EffectId;
  readonly name: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly steps: readonly EffectStep[];
  readonly parameters: readonly EffectParameter[];
  readonly metadata: EffectMetadata;
}

export interface EffectMetadata {
  readonly author?: string;
  readonly version: string;
  readonly created: Date;
  readonly modified: Date;
  readonly requirements?: string[];
}

export interface EffectExecution {
  readonly effectId: EffectId;
  readonly startTime: Date;
  readonly parameters: Record<string, unknown>;
  readonly isRunning: boolean;
  readonly currentStep: number;
}

export interface EffectCommand {
  readonly type: 'light' | 'dmx';
  readonly lightCommands?: LightCommand[];
  readonly dmxFrames?: DMXFrame[];
}

export abstract class EffectEngine {
  abstract loadEffect(definition: unknown): Promise<Effect>;
  abstract triggerEffect(effectId: EffectId, parameters?: Record<string, unknown>): Promise<EffectExecution>;
  abstract stopEffect(executionId: string): Promise<void>;
  abstract getRunningEffects(): Promise<EffectExecution[]>;
  abstract onBeat(beat: BeatPosition): Promise<void>;
}

export interface EffectRepository {
  findById(id: EffectId): Promise<Effect | null>;
  findByTag(tag: string): Promise<Effect[]>;
  save(effect: Effect): Promise<void>;
  delete(id: EffectId): Promise<void>;
  list(): Promise<Effect[]>;
}