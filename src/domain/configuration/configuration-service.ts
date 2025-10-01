// Import and re-export consolidated configuration interfaces from config.ts
import type { 
  HueConfiguration,
  DMXConfiguration,
  MIDIConfiguration,
  EffectsConfiguration
} from './config.js';

// Re-export for convenience
export type { 
  HueConfiguration,
  DMXConfiguration,
  MIDIConfiguration,
  EffectsConfiguration as EffectConfiguration
} from './config.js';

// Simple Configuration interface that matches FileConfigurationService usage
export interface Configuration {
  readonly hue: HueConfiguration;
  readonly dmx: DMXConfiguration;
  readonly midi: MIDIConfiguration;
  readonly beat: BeatConfiguration;
  readonly effects: EffectsConfiguration;
}

// Add specific interfaces needed by FileConfigurationService
export interface BeatConfiguration {
  readonly threshold: number;
  readonly windowSize: number;
  readonly minInterval: number;
  readonly decay: number;
}

export interface ConfigurationService {
  loadConfiguration(): Promise<Configuration>;
  getConfiguration(): Configuration;
  reloadConfiguration(): Promise<Configuration>;
  onConfigurationChange(callback: () => void): void;
}