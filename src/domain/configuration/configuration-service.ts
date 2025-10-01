export interface Configuration {
  readonly hue: HueConfiguration;
  readonly dmx: DMXConfiguration;
  readonly midi: MIDIConfiguration;
  readonly beat: BeatConfiguration;
  readonly effects: EffectConfiguration;
}

export interface HueConfiguration {
  readonly bridgeIp: string;
  readonly userId: string;
  readonly clientKey: string;
  readonly entertainmentGroup: string;
  readonly useStreamingApi: boolean;
  readonly maxBrightness: number;
  readonly transitionTime: number;
}

export interface DMXConfiguration {
  readonly driver: string;
  readonly device: string;
  readonly universe: number;
  readonly channels: number;
}

export interface MIDIConfiguration {
  readonly inputDevice: string;
  readonly outputDevice: string;
  readonly controllerType: string;
  readonly mappings: Record<string, string>;
}

export interface BeatConfiguration {
  readonly threshold: number;
  readonly windowSize: number;
  readonly minInterval: number;
  readonly decay: number;
}

export interface EffectConfiguration {
  readonly directory: string;
  readonly preload: boolean;
  readonly enableCache: boolean;
  readonly reloadOnChange: boolean;
}

export interface ConfigurationService {
  loadConfiguration(): Promise<Configuration>;
  getConfiguration(): Configuration;
  reloadConfiguration(): Promise<Configuration>;
  onConfigurationChange(callback: () => void): void;
}