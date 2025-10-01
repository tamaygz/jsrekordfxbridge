import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import type { 
  Effect, 
  EffectExecution, 
  EffectEngine, 
  EffectRepository,
  EffectStep,
  EffectCommand
} from '../../domain/effects/effect.js';
import type { 
  ILightController 
} from '../../domain/lighting/light-controller.js';
import type { 
  IDMXController 
} from '../../domain/dmx/dmx-controller.js';
import type { Color, LightId, Intensity } from '../../types/domain/lighting.js';
import type { BeatPosition } from '../../types/domain/beats.js';
import type { EffectId } from '../../types/domain/effects.js';

export const TYPES = {
  LightController: Symbol.for('LightController'),
  DMXController: Symbol.for('DMXController'),
  EffectRepository: Symbol.for('EffectRepository')
};

@injectable()
export class EffectEngineService implements EffectEngine {
  private runningEffects = new Map<string, EffectExecution>();
  
  constructor(
    @inject(TYPES.LightController) private lightController: ILightController,
    @inject(TYPES.DMXController) private dmxController: IDMXController,
    @inject(TYPES.EffectRepository) private effectRepository: EffectRepository
  ) {}

  async loadEffect(definition: unknown): Promise<Effect> {
    // In a real implementation, this would parse YAML/JSON and validate
    const effect = definition as Effect;
    await this.effectRepository.save(effect);
    return effect;
  }

  async triggerEffect(effectId: EffectId, parameters?: Record<string, unknown>): Promise<EffectExecution> {
    const effect = await this.effectRepository.findById(effectId);
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

    // Start executing the effect
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

  private async executeEffect(effect: Effect, execution: EffectExecution, executionId: string): Promise<void> {
    console.log(`🎆 Executing effect: ${effect.name}`);

    for (let i = 0; i < effect.steps.length && execution.isRunning; i++) {
      const step = effect.steps[i]!;
      (execution as any).currentStep = i;

      try {
        await this.executeStep(step, execution.parameters);
        
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

  private async executeStep(step: EffectStep, parameters: Record<string, unknown>): Promise<void> {
    const commands = this.stepToCommands(step, parameters);
    
    if (commands.lightCommands && commands.lightCommands.length > 0) {
      await this.lightController.sendCommands(commands.lightCommands);
    }

    if (commands.dmxFrames && commands.dmxFrames.length > 0) {
      for (const frame of commands.dmxFrames) {
        await this.dmxController.sendFrame(frame);
      }
    }
  }

  private stepToCommands(step: EffectStep, parameters: Record<string, unknown>): EffectCommand {
    // Convert effect step to actual hardware commands
    // This is a simplified implementation
    const lightCommands = [];
    
    if (step.action.type === 'fade' || step.action.type === 'pulse') {
      const color: Color = step.action.color || { r: 255, g: 255, b: 255 };
      const intensity: Intensity = step.action.intensity || { value: 1 };

      // Apply to all lights for now (would use step.target in real implementation)
      for (let i = 1; i <= 6; i++) {
        lightCommands.push({
          lightId: { value: i.toString() } as LightId,
          state: {
            color,
            intensity
          }
        });
      }
    }

    return { type: 'light', lightCommands };
  }

  private async triggerBeatEffect(beatType: 'beat' | 'downbeat'): Promise<void> {
    // Simple beat-responsive lighting
    const color: Color = beatType === 'downbeat' 
      ? { r: 255, g: 180, b: 80 }  // Warm orange for downbeat
      : { r: 255, g: 255, b: 255 }; // White for regular beat

    const intensity: Intensity = { value: beatType === 'downbeat' ? 1 : 0.6 };

    const commands = [{
      lightId: { value: '1' } as LightId,
      state: { color, intensity }
    }];

    await this.lightController.sendCommands(commands);

    // Quick fade out
    setTimeout(async () => {
      const fadeCommands = [{
        lightId: { value: '1' } as LightId,
        state: { 
          color: { r: 0, g: 0, b: 0 }, 
          intensity: { value: 0 } 
        }
      }];
      await this.lightController.sendCommands(fadeCommands);
    }, 80);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}