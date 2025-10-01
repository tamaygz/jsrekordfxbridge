import { injectable, inject } from 'inversify';
import type { 
  Effect, 
  EffectExecution, 
  EffectStep
} from '../../domain/effects/effect.js';
import type { EffectEngine } from '../../domain/effects/effect-engine.js';
import type { EffectRepository } from '../../domain/effects/effect-repository.js';
import type { EffectExecutor, EffectExecutionContext } from '../../domain/effects/effect-executor.js';
import type { EffectId } from '../../types/domain/effects.js';
import type { BeatPosition } from '../../types/domain/beats.js';
import { TYPES } from '../../types/infrastructure/di-container.js';

/**
 * Application service implementing effect business logic and orchestration.
 * Handles effect lifecycle, execution tracking, and beat synchronization.
 * Delegates hardware execution to EffectExecutor infrastructure service.
 */
@injectable()
export class EffectEngineService implements EffectEngine {
  private runningEffects = new Map<string, EffectExecution>();
  
  constructor(
    @inject(TYPES.EffectRepository) private effectRepository: EffectRepository,
    @inject(TYPES.EffectExecutor) private effectExecutor: EffectExecutor
  ) {}

  async loadEffect(definition: unknown): Promise<Effect> {
    // Parse and validate effect definition
    const effect = definition as Effect;
    await this.effectRepository.saveEffect(effect);
    return effect;
  }

  async triggerEffect(effectId: EffectId, parameters?: Record<string, unknown>): Promise<EffectExecution> {
    const effect = await this.effectRepository.getEffect(effectId.value);
    if (!effect) {
      throw new Error(`Effect ${effectId.value} not found`);
    }

    const execution: EffectExecution = {
      effectId,
      startTime: new Date(),
      parameters: parameters || {},
      isRunning: true,
      currentStep: 0
    };

    const executionId = `${effectId.value}-${Date.now()}`;
    this.runningEffects.set(executionId, execution);

    // Start executing the effect asynchronously
    this.executeEffect(effect, execution, executionId).catch(error => {
      console.error(`Error executing effect ${effectId.value}:`, error);
      this.runningEffects.delete(executionId);
    });

    return execution;
  }

  async stopEffect(executionId: string): Promise<void> {
    const execution = this.runningEffects.get(executionId);
    if (execution) {
      (execution as any).isRunning = false;
      this.runningEffects.delete(executionId);
      console.log(`🎨 Effect Engine: Stopped effect execution ${executionId}`);
    }
  }

  async getRunningEffects(): Promise<EffectExecution[]> {
    return Array.from(this.runningEffects.values());
  }

  async onBeat(beat: BeatPosition): Promise<void> {
    // Implement beat-synchronized effects
    if (beat.isDownbeat) {
      await this.triggerBeatEffect('downbeat');
    } else {
      await this.triggerBeatEffect('beat');
    }
  }

  /**
   * Execute an effect with given intensity (used by orchestration service)
   */
  async executeEffectWithIntensity(effect: Effect, intensity = 1.0): Promise<void> {
    try {
      console.log(`� Effect Engine: Executing effect "${effect.name}" at ${Math.round(intensity * 100)}% intensity`);
      
      const context: EffectExecutionContext = {
        timestamp: Date.now(),
        intensity: Math.max(0, Math.min(1, intensity))
      };
      
      for (const step of effect.steps) {
        await this.effectExecutor.executeStep(step, context);
        
        // Wait for step duration
        if (step.duration.durationMs > 0) {
          await this.delay(step.duration.durationMs);
        }
      }
      
      console.log(`🎨 Effect Engine: Effect "${effect.name}" execution completed`);
      
    } catch (error) {
      console.error(`🎨 Effect Engine: Failed to execute effect "${effect.name}":`, error);
      throw error;
    }
  }

  private async executeEffect(effect: Effect, execution: EffectExecution, executionId: string): Promise<void> {
    console.log(`🎆 Executing effect: ${effect.name}`);

    const context: EffectExecutionContext = {
      timestamp: Date.now(),
      intensity: 1.0 // Default intensity for triggered effects
    };

    for (let i = 0; i < effect.steps.length && execution.isRunning; i++) {
      const step = effect.steps[i]!;
      (execution as any).currentStep = i;

      try {
        await this.effectExecutor.executeStep(step, context);
        
        if (step.duration.durationMs > 0) {
          await this.delay(step.duration.durationMs);
        }
      } catch (error) {
        console.error(`Error executing step ${i} of effect ${effect.name}:`, error);
      }
    }

    this.runningEffects.delete(executionId);
    console.log(`✅ Effect ${effect.name} completed`);
  }

  private async triggerBeatEffect(beatType: 'beat' | 'downbeat'): Promise<void> {
    // Create a simple beat effect dynamically
    const beatEffect: Effect = {
      id: { value: `beat-${beatType}` },
      name: `beat-${beatType}`,
      description: `Auto-generated ${beatType} effect`,
      tags: ['beat', 'auto'],
      steps: [{
        action: {
          type: 'pulse',
          intensity: { value: beatType === 'downbeat' ? 1 : 0.6 },
          color: beatType === 'downbeat' 
            ? { r: 255, g: 180, b: 80 }  // Warm orange for downbeat
            : { r: 255, g: 255, b: 255 } // White for regular beat
        },
        duration: { startMs: 0, durationMs: 100 },
        parameters: [],
        target: {
          type: 'all',
          selector: 'all'
        }
      }],
      parameters: [],
      metadata: {
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        requirements: []
      }
    };

    await this.executeEffectWithIntensity(beatEffect, 1.0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}