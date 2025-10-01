import { injectable, inject } from 'inversify';
import type { ILightController } from '../domain/lighting/light-controller.js';
import type { DMXController } from '../domain/dmx/dmx-controller.js';
import type { IMIDIController } from '../domain/midi/midi-controller.js';
import type { BeatDetectionService } from '../domain/beat/beat-detection-service.js';
import type { EffectEngine } from '../domain/effects/effect-engine.js';
import type { EffectRepository } from '../domain/effects/effect-repository.js';
import type { ConfigurationService } from '../domain/configuration/configuration-service.js';
import type { ShowService } from '../domain/shows/show-service.js';
import { TYPES } from '../types/infrastructure/di-container.js';

export interface OrchestrationService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  
  // Manual control methods
  triggerEffect(effectName: string, intensity?: number): Promise<void>;
  setMasterBrightness(brightness: number): Promise<void>;
  blackout(): Promise<void>;
  
  // Show control
  loadShow(showName: string): Promise<void>;
  startShow(): Promise<void>;
  stopShow(): Promise<void>;
  
  // Status methods
  getStatus(): Promise<OrchestrationStatus>;
}

export interface OrchestrationStatus {
  readonly running: boolean;
  readonly connections: {
    readonly lights: boolean;
    readonly dmx: boolean;
    readonly midi: boolean;
  };
  readonly currentBPM: number | null;
  readonly currentShow: string | null;
  readonly activeEffects: string[];
  readonly masterBrightness: number;
}

@injectable()
export class BeatToLightOrchestrationService implements OrchestrationService {
  private isActive = false;
  private masterBrightness = 1.0;
  private currentShow: string | null = null;
  private activeEffects: Set<string> = new Set();

  constructor(
    @inject(TYPES.LightController) private lightController: ILightController,
    @inject(TYPES.DMXController) private dmxController: DMXController,
    @inject(TYPES.MIDIController) private midiController: IMIDIController,
    @inject(TYPES.BeatDetectionService) private beatDetectionService: BeatDetectionService,
    @inject(TYPES.EffectEngine) private effectEngine: EffectEngine,
    @inject(TYPES.EffectRepository) private effectRepository: EffectRepository,
    @inject(TYPES.ConfigurationService) private configurationService: ConfigurationService,
    @inject(TYPES.ShowService) private showService: ShowService
  ) {}

  async start(): Promise<void> {
    if (this.isActive) {
      console.log('🎵 Orchestration: Already running');
      return;
    }

    console.log('🎵 Orchestration: Starting Beat-to-Light system...');

    try {
      // Load configuration
      const config = await this.configurationService.loadConfiguration();
      console.log('🎵 Orchestration: Configuration loaded');

      // Initialize all controllers
      await this.initializeControllers();

      // Set up beat detection callbacks
      this.setupBeatCallbacks();

      // Set up MIDI callbacks for manual control
      this.setupMIDICallbacks();

      // Start beat detection
      await this.beatDetectionService.start();

      this.isActive = true;
      console.log('🎵 Orchestration: System started successfully');

    } catch (error) {
      console.error('🎵 Orchestration: Failed to start system:', error);
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('🎵 Orchestration: Stopping system...');
    await this.cleanup();
    this.isActive = false;
    console.log('🎵 Orchestration: System stopped');
  }

  isRunning(): boolean {
    return this.isActive;
  }

  async triggerEffect(effectName: string, intensity = 1.0): Promise<void> {
    if (!this.isActive) {
      console.warn('🎵 Orchestration: Cannot trigger effect - system not running');
      return;
    }

    try {
      const effect = await this.effectRepository.getEffect(effectName);
      if (!effect) {
        console.warn(`🎵 Orchestration: Effect "${effectName}" not found`);
        return;
      }

      // Apply master brightness
      const adjustedIntensity = intensity * this.masterBrightness;

      // Execute effect through the effect engine - use the new application service method
      await this.effectEngine.executeEffectWithIntensity(effect, adjustedIntensity);
      
      this.activeEffects.add(effectName);
      
      // Auto-remove from active effects after effect duration
      setTimeout(() => {
        this.activeEffects.delete(effectName);
      }, 5000); // Default effect duration

      console.log(`🎵 Orchestration: Triggered effect "${effectName}" at ${Math.round(adjustedIntensity * 100)}%`);

    } catch (error) {
      console.error(`🎵 Orchestration: Failed to trigger effect "${effectName}":`, error);
    }
  }

  async setMasterBrightness(brightness: number): Promise<void> {
    this.masterBrightness = Math.max(0, Math.min(1, brightness));
    console.log(`🎵 Orchestration: Master brightness set to ${Math.round(this.masterBrightness * 100)}%`);
  }

  async blackout(): Promise<void> {
    console.log('🎵 Orchestration: Executing blackout...');
    
    try {
      // Blackout all controllers
      await Promise.all([
        this.lightController.setAllLights({ r: 0, g: 0, b: 0 }, { value: 0 }),
        this.dmxController.blackout()
      ]);
      
      this.activeEffects.clear();
      console.log('🎵 Orchestration: Blackout complete');
      
    } catch (error) {
      console.error('🎵 Orchestration: Blackout failed:', error);
    }
  }

  async loadShow(showName: string): Promise<void> {
    try {
      await this.showService.loadShow(showName);
      this.currentShow = showName;
      console.log(`🎵 Orchestration: Show "${showName}" loaded`);
    } catch (error) {
      console.error(`🎵 Orchestration: Failed to load show "${showName}":`, error);
      throw error;
    }
  }

  async startShow(): Promise<void> {
    if (!this.currentShow) {
      console.warn('🎵 Orchestration: No show loaded');
      return;
    }

    try {
      await this.showService.startShow();
      console.log(`🎵 Orchestration: Started show "${this.currentShow}"`);
    } catch (error) {
      console.error('🎵 Orchestration: Failed to start show:', error);
    }
  }

  async stopShow(): Promise<void> {
    try {
      await this.showService.stopShow();
      console.log('🎵 Orchestration: Show stopped');
    } catch (error) {
      console.error('🎵 Orchestration: Failed to stop show:', error);
    }
  }

  async getStatus(): Promise<OrchestrationStatus> {
    return {
      running: this.isActive,
      connections: {
        lights: this.lightController.isConnected(),
        dmx: this.dmxController.isConnected(),
        midi: this.midiController.isConnected()
      },
      currentBPM: this.beatDetectionService.getCurrentBPM(),
      currentShow: this.currentShow,
      activeEffects: Array.from(this.activeEffects),
      masterBrightness: this.masterBrightness
    };
  }

  private async initializeControllers(): Promise<void> {
    console.log('🎵 Orchestration: Initializing controllers...');

    const initPromises = [
      this.initializeLightController(),
      this.initializeDMXController(),
      this.initializeMIDIController()
    ];

    // Wait for all controllers but don't fail if some are unavailable
    const results = await Promise.allSettled(initPromises);
    
    results.forEach((result, index) => {
      const controllerNames = ['Lights', 'DMX', 'MIDI'];
      if (result.status === 'rejected') {
        console.warn(`🎵 Orchestration: ${controllerNames[index]} controller failed to initialize:`, result.reason);
      }
    });
  }

  private async initializeLightController(): Promise<void> {
    try {
      await this.lightController.connect();
      console.log('🎵 Orchestration: Light controller connected');
    } catch (error) {
      console.warn('🎵 Orchestration: Light controller connection failed:', error);
    }
  }

  private async initializeDMXController(): Promise<void> {
    try {
      await this.dmxController.connect();
      console.log('🎵 Orchestration: DMX controller connected');
    } catch (error) {
      console.warn('🎵 Orchestration: DMX controller connection failed:', error);
    }
  }

  private async initializeMIDIController(): Promise<void> {
    try {
      await this.midiController.connect();
      console.log('🎵 Orchestration: MIDI controller connected');
    } catch (error) {
      console.warn('🎵 Orchestration: MIDI controller connection failed:', error);
    }
  }

  private setupBeatCallbacks(): void {
    // On every beat, check for show cues and auto-effects
    this.beatDetectionService.onBeat(async (position) => {
      try {
        // Let the show service handle beat-synced cues
        if (this.currentShow) {
          await this.showService.onBeat(position);
        }
        
        // Log beat for debugging
        if (position.beat === 1) {
          console.log(`🎵 Beat: Bar ${position.bar}`);
        }
        
      } catch (error) {
        console.error('🎵 Orchestration: Error in beat callback:', error);
      }
    });

    // On every bar, check for larger structural changes
    this.beatDetectionService.onBar(async (position) => {
      try {
        if (this.currentShow) {
          await this.showService.onBar(position);
        }
      } catch (error) {
        console.error('🎵 Orchestration: Error in bar callback:', error);
      }
    });
  }

  private setupMIDICallbacks(): void {
    this.midiController.onMessage(async (message) => {
      try {
        // Handle manual effect triggering via MIDI
        if (message.type === 'noteoff' && message.data[1] === 127) { // Max velocity
          const note = message.data[0]!;
          await this.handleMIDIEffectTrigger(note);
        }
        
        // Handle control changes (knobs, faders, etc.)
        if (message.type === 'cc') {
          const controller = message.data[0]!;
          const value = message.data[1]! / 127; // Normalize to 0-1
          await this.handleMIDIControlChange(controller, value);
        }
        
      } catch (error) {
        console.error('🎵 Orchestration: Error handling MIDI message:', error);
      }
    });
  }

  private async handleMIDIEffectTrigger(note: number): Promise<void> {
    // Map MIDI notes to effects (this could be configurable)
    const effectMap: Record<number, string> = {
      36: 'blackout',    // C1
      37: 'red_suspense', // C#1  
      38: 'strobo',      // D1
      39: 'sweep',       // D#1
    };

    const effectName = effectMap[note];
    if (effectName) {
      await this.triggerEffect(effectName);
    }
  }

  private async handleMIDIControlChange(controller: number, value: number): Promise<void> {
    switch (controller) {
      case 7: // Main volume
        await this.setMasterBrightness(value);
        break;
        
      case 1: // Modulation wheel - could control effect intensity
        // TODO: Implement effect intensity modulation
        break;
    }
  }

  private async executeEffect(effect: any, intensity: number): Promise<void> {
    // Execute effect on available hardware
    const promises: Promise<void>[] = [];

    // Execute on lights
    if (this.lightController.isConnected() && effect.lights) {
      promises.push(this.executeEffectOnLights(effect.lights, intensity));
    }

    // Execute on DMX
    if (this.dmxController.isConnected() && effect.dmx) {
      promises.push(this.executeEffectOnDMX(effect.dmx, intensity));
    }

    await Promise.allSettled(promises);
  }

  private async executeEffectOnLights(lightEffect: any, intensity: number): Promise<void> {
    // Convert effect to light commands
    const color = {
      r: Math.round((lightEffect.color?.r || 255) * intensity),
      g: Math.round((lightEffect.color?.g || 255) * intensity),
      b: Math.round((lightEffect.color?.b || 255) * intensity)
    };
    
    const lightIntensity = {
      value: Math.round((lightEffect.brightness || 254) * intensity)
    };

    await this.lightController.setAllLights(color, lightIntensity);
  }

  private async executeEffectOnDMX(dmxEffect: any, intensity: number): Promise<void> {
    // Convert effect to DMX frame
    const channels = dmxEffect.channels?.map((ch: any) => ({
      channel: ch.channel,
      value: Math.round(ch.value * intensity)
    })) || [];

    if (channels.length > 0) {
      await this.dmxController.sendFrame({
        channels,
        universe: 1
      });
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Stop all services
      await Promise.allSettled([
        this.beatDetectionService.stop(),
        this.showService.stopShow(),
        this.blackout() // Ensure lights are off
      ]);

      // Disconnect all controllers
      await Promise.allSettled([
        this.lightController.disconnect(),
        this.dmxController.disconnect(),
        this.midiController.disconnect()
      ]);

      this.activeEffects.clear();
      this.currentShow = null;

    } catch (error) {
      console.error('🎵 Orchestration: Error during cleanup:', error);
    }
  }
}