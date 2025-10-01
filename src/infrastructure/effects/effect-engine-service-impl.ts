import { injectable, inject } from 'inversify';
import type { 
  EffectEngineService,
  EffectExecutionContext
} from '../../domain/effects/effect-engine-service.js';
import type { EffectRepository } from '../../domain/effects/effect-repository.js';
import type { Effect } from '../../domain/effects/effect.js';
import { TYPES } from '../../types/infrastructure/di-container.js';

@injectable()
export class EffectEngineServiceImpl implements EffectEngineService {
  private effects: Map<string, Effect> = new Map();
  private loaded = false;

  constructor(
    @inject(TYPES.EffectRepository) private effectRepository: EffectRepository
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
      
      const context: EffectExecutionContext = {
        timestamp: Date.now(),
        intensity: Math.max(0, Math.min(1, intensity))
      };
      
      // For now, just log the effect execution
      // In a full implementation, this would:
      // 1. Process effect steps
      // 2. Generate light and DMX commands
      // 3. Send commands to controllers
      // 4. Handle timing and transitions
      
      console.log(`🎨 Effect Engine: Effect "${effect.name}" has ${effect.steps.length} steps`);
      
      for (const step of effect.steps) {
        console.log(`🎨 Effect Engine: Step - ${step.action.type} for ${step.duration.durationMs}ms`);
        
        // Simple execution - just log what would happen
        if (step.action.type === 'blackout') {
          console.log('🎨 Effect Engine: Would execute blackout');
        } else if (step.action.color) {
          console.log(`🎨 Effect Engine: Would set color RGB(${step.action.color.r}, ${step.action.color.g}, ${step.action.color.b})`);
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
    
    // Here we would actually send commands to hardware controllers
    // For now, just simulate the execution
    
    switch (processedStep.action.type) {
      case 'fade':
        console.log(`🎨 Effect Engine: Fading to color over ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'pulse':
        console.log(`🎨 Effect Engine: Pulsing for ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'sweep':
        console.log(`🎨 Effect Engine: Sweeping across lights for ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'strobe':
        console.log(`🎨 Effect Engine: Strobing for ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'hold':
        console.log(`🎨 Effect Engine: Holding current state for ${processedStep.duration.durationMs}ms`);
        break;
        
      case 'blackout':
        console.log(`🎨 Effect Engine: Blackout for ${processedStep.duration.durationMs}ms`);
        break;
        
      default:
        console.warn(`🎨 Effect Engine: Unknown effect action type: ${processedStep.action.type}`);
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