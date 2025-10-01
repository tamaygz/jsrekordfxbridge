import { Container } from 'inversify';
import 'reflect-metadata';

// Domain interfaces
import type { ILightController } from '../../domain/lighting/light-controller.js';
import type { IDMXController } from '../../domain/dmx/dmx-controller.js';
import type { IMIDIController } from '../../domain/midi/midi-controller.js';
import type { EffectEngine, EffectRepository } from '../../domain/effects/effect.js';
import type { BeatDetector } from '../../domain/midi/midi-controller.js';

// Infrastructure implementations
import { MockLightController } from '../lighting/mock-light-controller.js';
import { MockDMXController } from '../dmx/mock-dmx-controller.js';
import { MockMIDIController, MockBeatDetector } from '../midi/mock-midi-controller.js';
import { FileEffectRepository } from '../persistence/file-effect-repository.js';

// Application services
import { EffectEngineService, TYPES } from '../../application/effects/effect-engine.service.js';

export { TYPES };

export class DIContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.bindServices();
  }

  private bindServices(): void {
    // Bind domain interfaces to infrastructure implementations
    this.container.bind<ILightController>(TYPES.LightController).to(MockLightController).inSingletonScope();
    this.container.bind<IDMXController>(TYPES.DMXController).to(MockDMXController).inSingletonScope();
    this.container.bind<IMIDIController>('MIDIController').to(MockMIDIController).inSingletonScope();
    this.container.bind<BeatDetector>('BeatDetector').to(MockBeatDetector).inSingletonScope();
    
    // Bind repositories
    this.container.bind<EffectRepository>(TYPES.EffectRepository).to(FileEffectRepository).inSingletonScope();
    
    // Bind application services
    this.container.bind<EffectEngine>('EffectEngine').to(EffectEngineService).inSingletonScope();
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

  getDMXController(): IDMXController {
    return this.get<IDMXController>(TYPES.DMXController);
  }

  getMIDIController(): IMIDIController {
    return this.get<IMIDIController>('MIDIController');
  }

  getBeatDetector(): BeatDetector {
    return this.get<BeatDetector>('BeatDetector');
  }

  getEffectEngine(): EffectEngine {
    return this.get<EffectEngine>('EffectEngine');
  }

  getEffectRepository(): EffectRepository {
    return this.get<EffectRepository>(TYPES.EffectRepository);
  }
}