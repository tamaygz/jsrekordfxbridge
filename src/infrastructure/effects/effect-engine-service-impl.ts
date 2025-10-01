import { injectable, inject } from 'inversify';
import type { 
  EffectEngineService,
  EffectExecutionContext
} from '../../domain/effects/effect-engine-service.js';
import type { EffectRepository } from '../../domain/effects/effect-repository.js';
import type { Effect } from '../../domain/effects/effect.js';
import type { ILightController } from '../../domain/lighting/light-controller.js';
import type { DMXController } from '../../domain/dmx/dmx-controller.js';
import { TYPES } from '../../types/infrastructure/di-container.js';

@injectable()
export class EffectEngineServiceImpl implements EffectEngineService {
  private effects: Map<string, Effect> = new Map();
  private loaded = false;

  constructor(
    @inject(TYPES.EffectRepository) private effectRepository: EffectRepository,
    @inject(TYPES.LightController) private lightController: ILightController,
    @inject(TYPES.DMXController) private dmxController: DMXController
  ) {}

  async loadEffects(): Promise<void> {
    try {
      console.log('🎨 Effect Engine: Loading effects...');
      
      const effects = await this.effectRepository.loadEffects();
      this.effects.clear();
      
      for (const effect of effects) {
        this.effects.set(effect.name, effect);
      }
      
      this.loaded = true;
      console.log(`🎨 Effect Engine: Loaded ${effects.length} effects`);
      
      // Set up watching for changes
      this.effectRepository.watchForChanges((updatedEffects) => {
        console.log('🎨 Effect Engine: Effects updated, reloading...');
        this.effects.clear();
        for (const effect of updatedEffects) {
          this.effects.set(effect.name, effect);
        }
      });
      
    } catch (error) {
      console.error('🎨 Effect Engine: Failed to load effects:', error);
      throw error;
    }
  }

  async getEffect(name: string): Promise<Effect | null> {
    if (!this.loaded) {
      await this.loadEffects();
    }
    
    return this.effects.get(name) || null;
  }

  async getAvailableEffects(): Promise<string[]> {
    if (!this.loaded) {
      await this.loadEffects();
    }
    
    return Array.from(this.effects.keys());
  }

  async reloadEffects(): Promise<void> {
    console.log('🎨 Effect Engine: Reloading effects...');
    this.loaded = false;
    await this.loadEffects();
  }

  async executeEffect(effect: Effect, intensity = 1.0): Promise<void> {
    try {
      console.log(`🎨 Effect Engine: Executing effect "${effect.name}" at ${Math.round(intensity * 100)}% intensity`);
      
      // Actually execute the effect steps
      const context: EffectExecutionContext = {
        timestamp: Date.now(),
        intensity: Math.max(0, Math.min(1, intensity))
      };
      
      for (const step of effect.steps) {
        await this.executeStep(step, context);
        
        // Wait for step duration
        if (step.duration.durationMs > 0) {
          await new Promise(resolve => setTimeout(resolve, step.duration.durationMs));
        }
      }
      
      console.log(`🎨 Effect Engine: Effect "${effect.name}" execution completed`);
      
    } catch (error) {
      console.error(`🎨 Effect Engine: Failed to execute effect "${effect.name}":`, error);
      throw error;
    }
  }



  // Helper methods for effect processing
  private processEffectStep(step: any, context: EffectExecutionContext): any {
    // Apply intensity scaling
    const scaledStep = { ...step };
    
    if (scaledStep.action?.intensity) {
      scaledStep.action.intensity = {
        value: scaledStep.action.intensity.value * context.intensity
      };
    }
    
    if (scaledStep.action?.color) {
      const color = scaledStep.action.color;
      scaledStep.action.color = {
        r: Math.round(color.r * context.intensity),
        g: Math.round(color.g * context.intensity),
        b: Math.round(color.b * context.intensity)
      };
    }
    
    return scaledStep;
  }

  private async executeStep(step: any, context: EffectExecutionContext): Promise<void> {
    const processedStep = this.processEffectStep(step, context);
    
    // Actually send commands to hardware controllers
    if (processedStep.action.type === 'fade' || processedStep.action.type === 'pulse') {
      const lightCommands = [];
      
      // Get the actual Entertainment group light IDs
      const lightIds = this.lightController.getLightOrder();
      
      for (const lightId of lightIds) {
        lightCommands.push({
          lightId: { value: lightId.toString() },
          state: {
            color: processedStep.action.color || { r: 255, g: 255, b: 255 },
            intensity: processedStep.action.intensity || { value: context.intensity }
          }
        });
      }
      
      if (lightCommands.length > 0) {
        console.log(`🎨 Effect Engine: Sending commands to ${lightCommands.length} lights`);
        await this.lightController.sendCommands(lightCommands);
      }
    }
    
    switch (processedStep.action.type) {
      case 'fade':
        console.log(`🎨 Effect Engine: Executed fade to color over ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'pulse':
        console.log(`🎨 Effect Engine: Executed pulse for ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'blackout':
        // Send blackout commands
        const blackoutCommands = [];
        const lightIds = this.lightController.getLightOrder();
        
        for (const lightId of lightIds) {
          blackoutCommands.push({
            lightId: { value: lightId.toString() },
            state: {
              color: { r: 0, g: 0, b: 0 },
              intensity: { value: 0 }
            }
          });
        }
        
        if (blackoutCommands.length > 0) {
          console.log(`🎨 Effect Engine: Sending blackout to ${blackoutCommands.length} lights`);
          await this.lightController.sendCommands(blackoutCommands);
        }
        break;
        
      default:
        console.log(`🎨 Effect Engine: Unknown action type: ${processedStep.action.type}`);
    }
  }

  // Utility methods for effect management
  async createEffect(
    name: string,
    description: string,
    steps: any[],
    tags: string[] = []
  ): Promise<Effect> {
    const effect: Effect = {
      id: { value: name },
      name,
      description,
      tags,
      steps,
      parameters: [],
      metadata: {
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        requirements: []
      }
    };
    
    await this.effectRepository.saveEffect(effect);
    this.effects.set(name, effect);
    
    console.log(`🎨 Effect Engine: Created effect "${name}"`);
    return effect;
  }

  async deleteEffect(name: string): Promise<void> {
    await this.effectRepository.deleteEffect(name);
    this.effects.delete(name);
    console.log(`🎨 Effect Engine: Deleted effect "${name}"`);
  }

  getEffectsByTag(tag: string): Effect[] {
    return Array.from(this.effects.values()).filter(effect => 
      effect.tags.includes(tag)
    );
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}