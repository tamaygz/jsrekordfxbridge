import { Container } from 'inversify';
import 'reflect-metadata';

// Domain interfaces
import type { ILightController } from '../../domain/lighting/light-controller.js';
import type { DMXController } from '../../domain/dmx/dmx-controller.js';
import type { IMIDIController } from '../../domain/midi/midi-controller.js';
import type { EffectRepository } from '../../domain/effects/effect-repository.js';
import type { EffectEngineService } from '../../domain/effects/effect-engine-service.js';
import type { ConfigurationService } from '../../domain/configuration/configuration-service.js';
import type { BeatDetectionService } from '../../domain/beat/beat-detection-service.js';
import type { ShowService } from '../../domain/shows/show-service.js';
import type { OrchestrationService } from '../../application/orchestration-service.js';

// Infrastructure implementations
import { MockLightController } from '../lighting/mock-light-controller.js';
import { HueLightController } from '../lighting/hue-light-controller.js';
import { RealDMXController, createRealDMXController } from '../dmx/real-dmx-controller.js';
import { MockDMXController } from '../dmx/mock-dmx-controller.js';
import { MockMIDIController } from '../midi/mock-midi-controller.js';
import { JZZMIDIController } from '../midi/jzz-midi-controller.js';
import { FileEffectRepository } from '../effects/file-effect-repository.js';
import { EffectEngineServiceImpl } from '../effects/effect-engine-service-impl.js';
import { FileConfigurationService } from '../configuration/file-configuration-service.js';
import { MIDIClockBeatDetectionService } from '../beat/midi-clock-beat-detection-service.js';
import { FileShowService } from '../shows/file-show-service.js';
import { BeatToLightOrchestrationService } from '../../application/orchestration-service.js';

import { TYPES } from '../../types/infrastructure/di-container.js';

export { TYPES };

export class DIContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.bindServices();
  }

  private bindServices(): void {
    // Determine if we should use real hardware or mocks
    const isDemoMode = this.isDemoMode();
    
    console.log(`🔧 DI: Initializing container in ${isDemoMode ? 'DEMO' : 'PRODUCTION'} mode`);
    
    // Bind lighting controller
    if (isDemoMode) {
      this.container.bind<ILightController>(TYPES.LightController).to(MockLightController).inSingletonScope();
      console.log('🎭 DI: Using mock light controller');
    } else {
      this.container.bind<ILightController>(TYPES.LightController).toDynamicValue(() => {
        return new HueLightController({
          bridgeIp: process.env.HUE_BRIDGE_IP || process.env.HUE_BRIDGE_ID || '',
          username: process.env.HUE_USER_ID || process.env.HUE_USERNAME || '',
          entertainmentGroupId: process.env.HUE_ENTERTAINMENT_GROUP || process.env.HUE_ENTERTAINMENT_ID || ''
        });
      }).inSingletonScope();
      console.log('🌉 DI: Using real Hue light controller');
    }
    
    // Bind DMX controller
    if (isDemoMode) {
      this.container.bind<DMXController>(TYPES.DMXController).to(MockDMXController).inSingletonScope();
      console.log('🎭 DI: Using mock DMX controller');
    } else {
      this.container.bind<DMXController>(TYPES.DMXController).toDynamicValue(() => {
        return createRealDMXController({
          ...(process.env.DMX_DRIVER && { driver: process.env.DMX_DRIVER }),
          ...(process.env.DMX_DEVICE && { device: process.env.DMX_DEVICE }),
          ...(process.env.DMX_UNIVERSE && { universe: parseInt(process.env.DMX_UNIVERSE, 10) })
        });
      }).inSingletonScope();
      console.log('🎛️ DI: Using real DMX controller');
    }
    
    // Bind MIDI controller
    if (isDemoMode) {
      this.container.bind<IMIDIController>(TYPES.MIDIController).to(MockMIDIController).inSingletonScope();
      console.log('🎭 DI: Using mock MIDI controller');
    } else {
      this.container.bind<IMIDIController>(TYPES.MIDIController).to(JZZMIDIController).inSingletonScope();
      console.log('🎹 DI: Using real MIDI controller');
    }
    
    // Bind repositories
    this.container.bind<EffectRepository>(TYPES.EffectRepository).to(FileEffectRepository).inSingletonScope();
    
    // Bind services
    this.container.bind<EffectEngineService>(TYPES.EffectEngineService).to(EffectEngineServiceImpl).inSingletonScope();
    this.container.bind<ConfigurationService>(TYPES.ConfigurationService).to(FileConfigurationService).inSingletonScope();
    this.container.bind<ShowService>(TYPES.ShowService).to(FileShowService).inSingletonScope();
    
    // Bind beat detection service
    this.container.bind<BeatDetectionService>(TYPES.BeatDetectionService).toDynamicValue((context) => {
      const midiController = context.container.get<IMIDIController>(TYPES.MIDIController);
      return new MIDIClockBeatDetectionService(midiController);
    }).inSingletonScope();
    
    // Bind orchestration service
    this.container.bind<OrchestrationService>(TYPES.OrchestrationService).to(BeatToLightOrchestrationService).inSingletonScope();
    
    console.log('🔧 DI: All services bound successfully');
  }

  private isDemoMode(): boolean {
    // Demo mode if explicitly set, or if required credentials are missing
    return process.env.DEMO_MODE === 'true' || 
           (
             !process.env.HUE_BRIDGE_IP && 
             !process.env.HUE_BRIDGE_ID && 
             !process.env.HUE_USER_ID && 
             !process.env.HUE_USERNAME
           );
  }

  get<T>(serviceIdentifier: string | symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  getContainer(): Container {
    return this.container;
  }

  // Factory methods for easier access
  getLightController(): ILightController {
    return this.get<ILightController>(TYPES.LightController);
  }

  getDMXController(): DMXController {
    return this.get<DMXController>(TYPES.DMXController);
  }

  getMIDIController(): IMIDIController {
    return this.get<IMIDIController>(TYPES.MIDIController);
  }

  getBeatDetectionService(): BeatDetectionService {
    return this.get<BeatDetectionService>(TYPES.BeatDetectionService);
  }

  getEffectEngineService(): EffectEngineService {
    return this.get<EffectEngineService>(TYPES.EffectEngineService);
  }

  getConfigurationService(): ConfigurationService {
    return this.get<ConfigurationService>(TYPES.ConfigurationService);
  }

  getShowService(): ShowService {
    return this.get<ShowService>(TYPES.ShowService);
  }

  getOrchestrationService(): OrchestrationService {
    return this.get<OrchestrationService>(TYPES.OrchestrationService);
  }

  getEffectRepository(): EffectRepository {
    return this.get<EffectRepository>(TYPES.EffectRepository);
  }
}