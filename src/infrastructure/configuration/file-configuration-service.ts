import { injectable, unmanaged } from 'inversify';
import type { 
  ConfigurationService,
  Configuration,
  HueConfiguration,
  DMXConfiguration,
  MIDIConfiguration,
  BeatConfiguration,
  EffectConfiguration
} from '../../domain/configuration/configuration-service';
import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ConfigurationFile {
  hue?: {
    bridgeIp?: string;
    userId?: string;
    clientKey?: string;
    entertainmentGroup?: string;
    useStreamingApi?: boolean;
    maxBrightness?: number;
    transitionTime?: number;
  };
  dmx?: {
    driver?: string;
    device?: string;
    universe?: number;
    channels?: number;
  };
  midi?: {
    inputDevice?: string;
    outputDevice?: string;
    controllerType?: string;
    mappings?: Record<string, string>;
  };
  beat?: {
    threshold?: number;
    windowSize?: number;
    minInterval?: number;
    decay?: number;
  };
  effects?: {
    directory?: string;
    preload?: boolean;
    enableCache?: boolean;
    reloadOnChange?: boolean;
  };
}

@injectable()
export class FileConfigurationService implements ConfigurationService {
  private config: Configuration | null = null;
  private configPath: string;
  private watchers: Map<string, () => void> = new Map();

  constructor(
    @unmanaged() configPath?: string,
    @unmanaged() private environment = process.env
  ) {
    this.configPath = configPath || this.findConfigPath();
  }

  async loadConfiguration(): Promise<Configuration> {
    try {
      console.log(`⚙️  Config: Loading from ${this.configPath}...`);
      
      const configContent = await fs.readFile(this.configPath, 'utf8');
      const fileConfig = yaml.parse(configContent) as ConfigurationFile;
      
      // Merge file config with environment variables
      this.config = this.mergeWithEnvironment(fileConfig);
      
      console.log('⚙️  Config: Configuration loaded successfully');
      return this.config;
      
    } catch (error) {
      console.warn('⚙️  Config: Failed to load configuration file, using defaults and environment variables');
      console.warn(`⚙️  Config: Error was: ${error}`);
      
      // Fall back to environment-only configuration
      this.config = this.createDefaultConfiguration();
      return this.config;
    }
  }

  getConfiguration(): Configuration {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }
    return this.config;
  }

  async reloadConfiguration(): Promise<Configuration> {
    this.config = null;
    return await this.loadConfiguration();
  }

  onConfigurationChange(callback: () => void): void {
    const watcherId = Math.random().toString(36);
    this.watchers.set(watcherId, callback);
    
    // Set up file watcher (simplified for this implementation)
    // In production, you might want to use chokidar or similar
    try {
      import('fs').then(fs => {
        try {
          fs.watchFile(this.configPath, () => {
            console.log('⚙️  Config: Configuration file changed, notifying watchers...');
            this.watchers.forEach(watcher => {
              try {
                watcher();
              } catch (error) {
                console.error('⚙️  Config: Error in configuration change callback:', error);
              }
            });
          });
        } catch (error) {
          console.warn('⚙️  Config: Could not set up file watcher:', error);
        }
      });
    } catch (error) {
      console.warn('⚙️  Config: File watching not available in this environment');
    }
  }

  private findConfigPath(): string {
    const possiblePaths = [
      path.join(process.cwd(), 'config', 'default-config.yaml'),
      path.join(process.cwd(), 'config', 'config.yaml'),
      path.join(process.cwd(), 'config.yaml'),
      path.join(process.cwd(), '.config.yaml'),
    ];

    for (const configPath of possiblePaths) {
      try {
        // Synchronous check for config file existence
        require('fs').accessSync(configPath);
        return configPath;
      } catch {
        // Continue to next path
      }
    }

    // Default to the expected location
    return possiblePaths[0]!;
  }

  private mergeWithEnvironment(fileConfig: ConfigurationFile): Configuration {
    return {
      hue: this.createHueConfiguration(fileConfig.hue),
      dmx: this.createDMXConfiguration(fileConfig.dmx),
      midi: this.createMIDIConfiguration(fileConfig.midi),
      beat: this.createBeatConfiguration(fileConfig.beat),
      effects: this.createEffectConfiguration(fileConfig.effects)
    };
  }

  private createDefaultConfiguration(): Configuration {
    return {
      hue: this.createHueConfiguration(),
      dmx: this.createDMXConfiguration(),
      midi: this.createMIDIConfiguration(),
      beat: this.createBeatConfiguration(),
      effects: this.createEffectConfiguration()
    };
  }

  private createHueConfiguration(fileConfig?: ConfigurationFile['hue']): HueConfiguration {
    return {
      bridgeIp: this.environment.HUE_BRIDGE_IP || fileConfig?.bridgeIp || '',
      userId: this.environment.HUE_USER_ID || fileConfig?.userId || '',
      clientKey: this.environment.HUE_CLIENT_KEY || fileConfig?.clientKey || '',
      entertainmentGroup: this.environment.HUE_ENTERTAINMENT_GROUP || fileConfig?.entertainmentGroup || '',
      useStreamingApi: this.parseBooleanEnv('HUE_USE_STREAMING') ?? fileConfig?.useStreamingApi ?? true,
      maxBrightness: this.parseNumberEnv('HUE_MAX_BRIGHTNESS') ?? fileConfig?.maxBrightness ?? 254,
      transitionTime: this.parseNumberEnv('HUE_TRANSITION_TIME') ?? fileConfig?.transitionTime ?? 300
    };
  }

  private createDMXConfiguration(fileConfig?: ConfigurationFile['dmx']): DMXConfiguration {
    return {
      driver: this.environment.DMX_DRIVER || fileConfig?.driver || 'enttec-usb-dmx-pro',
      device: this.environment.DMX_DEVICE || fileConfig?.device || '/dev/ttyUSB0',
      universe: this.parseNumberEnv('DMX_UNIVERSE') ?? fileConfig?.universe ?? 1,
      channels: this.parseNumberEnv('DMX_CHANNELS') ?? fileConfig?.channels ?? 512
    };
  }

  private createMIDIConfiguration(fileConfig?: ConfigurationFile['midi']): MIDIConfiguration {
    return {
      inputDevice: this.environment.MIDI_INPUT_DEVICE || fileConfig?.inputDevice || 'auto',
      outputDevice: this.environment.MIDI_OUTPUT_DEVICE || fileConfig?.outputDevice || 'auto',
      controllerType: this.environment.MIDI_CONTROLLER_TYPE || fileConfig?.controllerType || 'auto',
      mappings: this.parseJsonEnv('MIDI_MAPPINGS') ?? fileConfig?.mappings ?? {}
    };
  }

  private createBeatConfiguration(fileConfig?: ConfigurationFile['beat']): BeatConfiguration {
    return {
      threshold: this.parseNumberEnv('BEAT_THRESHOLD') ?? fileConfig?.threshold ?? 0.6,
      windowSize: this.parseNumberEnv('BEAT_WINDOW_SIZE') ?? fileConfig?.windowSize ?? 1024,
      minInterval: this.parseNumberEnv('BEAT_MIN_INTERVAL') ?? fileConfig?.minInterval ?? 150,
      decay: this.parseNumberEnv('BEAT_DECAY') ?? fileConfig?.decay ?? 0.95
    };
  }

  private createEffectConfiguration(fileConfig?: ConfigurationFile['effects']): EffectConfiguration {
    return {
      directory: this.environment.EFFECTS_DIRECTORY || fileConfig?.directory || './effects',
      preload: this.parseBooleanEnv('EFFECTS_PRELOAD') ?? fileConfig?.preload ?? true,
      enableCache: this.parseBooleanEnv('EFFECTS_ENABLE_CACHE') ?? fileConfig?.enableCache ?? true,
      reloadOnChange: this.parseBooleanEnv('EFFECTS_RELOAD_ON_CHANGE') ?? fileConfig?.reloadOnChange ?? false
    };
  }

  private parseNumberEnv(key: string): number | undefined {
    const value = this.environment[key];
    if (!value) return undefined;
    
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  private parseBooleanEnv(key: string): boolean | undefined {
    const value = this.environment[key];
    if (!value) return undefined;
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  private parseJsonEnv(key: string): any | undefined {
    const value = this.environment[key];
    if (!value) return undefined;
    
    try {
      return JSON.parse(value);
    } catch {
      console.warn(`⚙️  Config: Failed to parse JSON from environment variable ${key}`);
      return undefined;
    }
  }
}