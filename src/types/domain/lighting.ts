// Lighting-related domain types

export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface LightId {
  readonly value: string | number;
}

export interface Intensity {
  readonly value: number; // 0-1
}