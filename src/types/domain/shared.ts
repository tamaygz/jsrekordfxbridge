// Shared domain types that are used across multiple contexts

// Re-export commonly used types for convenience
export type { Color, LightId, Intensity } from './lighting.js';
export type { BeatPosition, BPM, TimeRange } from './beats.js';
export type { EffectId } from './effects.js';
export type { DeviceId, Position } from './devices.js';
export type { 
  DomainEvent, 
  BeatEvent, 
  EffectTriggeredEvent, 
  DeviceStateChangedEvent 
} from './events.js';