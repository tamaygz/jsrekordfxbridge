// Import and re-export consolidated configuration interfaces from config.ts
import type { 
  HueConfiguration,
  DMXConfiguration,
  MIDIConfiguration,
  EffectsConfiguration,
  BeatConfiguration
} from './config.js';

// Re-export for convenience
export type { 
  HueConfiguration,
  DMXConfiguration,
  MIDIConfiguration,
  EffectsConfiguration as EffectConfiguration,
  BeatConfiguration
} from './config.js';

// Simple Configuration interface that matches FileConfigurationService usage
export interface Configuration {
  readonly hue: HueConfiguration;
  readonly dmx: DMXConfiguration;
  readonly midi: MIDIConfiguration;
  readonly beat: BeatConfiguration;
  readonly effects: EffectsConfiguration;
}

export interface ConfigurationService {
  loadConfiguration(): Promise<Configuration>;
  getConfiguration(): Configuration;
  reloadConfiguration(): Promise<Configuration>;
  onConfigurationChange(callback: () => void): void;
}