// Configuration domain models
export interface SystemConfiguration {
  readonly lighting: LightingConfiguration;
  readonly dmx: DMXConfiguration;
  readonly midi: MIDIConfiguration;
  readonly rekordbox?: RekordboxConfiguration;
  readonly effects: EffectsConfiguration;
  readonly shows: ShowsConfiguration;
  readonly demo: DemoConfiguration;
}

export interface LightingConfiguration {
  readonly enabled: boolean;
  readonly provider: 'hue' | 'mock';
  readonly hue?: HueConfiguration;
  readonly zones: Record<string, LightZone>;
}

export interface HueConfiguration {
  readonly bridgeId?: string;
  readonly username?: string;
  readonly entertainmentGroupId?: string;
  readonly discoveryTimeout?: number;
  // Extended properties for FileConfigurationService compatibility
  readonly bridgeIp?: string;
  readonly userId?: string;
  readonly clientKey?: string;
  readonly entertainmentGroup?: string;
  readonly useStreamingApi?: boolean;
  readonly maxBrightness?: number;
  readonly transitionTime?: number;
}

export interface LightZone {
  readonly name: string;
  readonly lightIds: readonly string[];
  readonly position?: { x: number; y: number; z: number };
}

export interface DMXConfiguration {
  readonly enabled?: boolean;
  readonly provider?: 'enttec' | 'artnet' | 'mock';
  readonly device?: string;
  readonly universe?: number;
  readonly fixtures?: Record<string, DMXFixture>;
  // Extended properties for FileConfigurationService compatibility
  readonly driver?: string;
  readonly channels?: number;
}

export interface DMXFixture {
  readonly name: string;
  readonly channels: readonly number[];
  readonly type: string;
  readonly capabilities: Record<string, number>;
}

export interface MIDIConfiguration {
  readonly enabled?: boolean;
  readonly inputDevice?: string;
  readonly outputDevice?: string;
  readonly clockSource?: 'internal' | 'midi' | 'external';
  readonly mapping?: Record<string, MIDIMapping>;
  // Extended properties for FileConfigurationService compatibility
  readonly controllerType?: string;
  readonly mappings?: Record<string, string>;
}

export interface MIDIMapping {
  readonly type: 'note' | 'cc';
  readonly channel: number;
  readonly value: number;
  readonly action: string;
}

export interface RekordboxConfiguration {
  readonly enabled?: boolean;
  readonly useMidiClock?: boolean;
  readonly virtualPort?: string;
  readonly autoDetectChannels?: boolean;
}

export interface BeatConfiguration {
  readonly threshold: number;
  readonly windowSize: number;
  readonly minInterval: number;
  readonly decay: number;
}

export interface EffectsConfiguration {
  readonly directory?: string;
  readonly autoload?: boolean;
  readonly defaultParameters?: Record<string, unknown>;
  // Extended properties for FileConfigurationService compatibility
  readonly preload?: boolean;
  readonly enableCache?: boolean;
  readonly reloadOnChange?: boolean;
}

export interface ShowsConfiguration {
  readonly directory: string;
  readonly autoload: boolean;
}

export interface DemoConfiguration {
  readonly enabled: boolean;
  readonly autoBeat: boolean;
  readonly defaultBPM: number;
  readonly mockDevices: boolean;
}

export interface ConfigurationLoader {
  load(): Promise<SystemConfiguration>;
  save(config: SystemConfiguration): Promise<void>;
  validate(config: SystemConfiguration): Promise<ValidationResult>;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}