// Device and positioning-related domain types

export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DeviceId {
  readonly value: string;
}