// Domain event types
import type { BeatPosition, BPM } from './beats.js';
import type { EffectId } from './effects.js';
import type { DeviceId } from './devices.js';

export interface DomainEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly aggregateId: string;
}

export interface BeatEvent extends DomainEvent {
  readonly type: 'beat';
  readonly beatPosition: BeatPosition;
  readonly bpm: BPM;
}

export interface EffectTriggeredEvent extends DomainEvent {
  readonly type: 'effect.triggered';
  readonly effectId: EffectId;
  readonly parameters: Record<string, unknown>;
}

export interface DeviceStateChangedEvent extends DomainEvent {
  readonly type: 'device.state.changed';
  readonly deviceId: DeviceId;
  readonly newState: unknown;
}