import type { Color, LightId, Intensity } from '../../types/domain/lighting.js';
import type { Position } from '../../types/domain/devices.js';
import type { TimeRange } from '../../types/domain/beats.js';

export interface LightState {
  readonly color: Color;
  readonly intensity: Intensity;
  readonly position?: Position;
}

export interface LightCommand {
  readonly lightId: LightId;
  readonly state: LightState;
  readonly transition?: TimeRange;
}

export interface LightDevice {
  readonly id: LightId;
  readonly capabilities: LightCapabilities;
  readonly currentState: LightState;
  readonly position?: Position;
}

export interface LightCapabilities {
  readonly supportsColor: boolean;
  readonly supportsIntensity: boolean;
  readonly supportsPosition: boolean;
  readonly minIntensity: number;
  readonly maxIntensity: number;
  readonly colorGamut?: ColorGamut;
}

export interface ColorGamut {
  readonly red: { x: number; y: number };
  readonly green: { x: number; y: number };
  readonly blue: { x: number; y: number };
}

export interface ILightController {
  sendCommands(commands: LightCommand[]): Promise<void>;
  getDevices(): Promise<LightDevice[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getLightOrder(): readonly number[];
  
  // Convenience methods for common operations
  setLight(lightId: LightId, color: Color, intensity?: Intensity): Promise<void>;
  setAllLights(color: Color, intensity?: Intensity): Promise<void>;
  setLightGroup(groupId: string, color: Color, intensity?: Intensity): Promise<void>;
}

export abstract class LightController implements ILightController {
  abstract sendCommands(commands: LightCommand[]): Promise<void>;
  abstract getDevices(): Promise<LightDevice[]>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract getLightOrder(): readonly number[];
  abstract setLight(lightId: LightId, color: Color, intensity?: Intensity): Promise<void>;
  abstract setAllLights(color: Color, intensity?: Intensity): Promise<void>;
  abstract setLightGroup(groupId: string, color: Color, intensity?: Intensity): Promise<void>;
}