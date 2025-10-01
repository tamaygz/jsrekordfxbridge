// Core domain entities and types

export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface LightId {
  readonly value: string | number;
}

export interface DeviceId {
  readonly value: string;
}

export interface EffectId {
  readonly value: string;
}

export interface BeatPosition {
  readonly beat: number;
  readonly measure: number;
  readonly isDownbeat: boolean;
}

export interface TimeRange {
  readonly startMs: number;
  readonly durationMs: number;
}

export interface Intensity {
  readonly value: number; // 0-1
}

export interface BPM {
  readonly value: number; // beats per minute
}

// Domain events
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