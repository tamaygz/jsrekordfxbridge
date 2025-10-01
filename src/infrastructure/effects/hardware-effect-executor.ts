import { injectable, inject } from 'inversify';
import type { EffectExecutor, EffectExecutionContext } from '../../domain/effects/effect-executor.js';
import type { EffectStep } from '../../domain/effects/effect.js';
import type { ILightController } from '../../domain/lighting/light-controller.js';
import type { DMXController } from '../../domain/dmx/dmx-controller.js';
import { TYPES } from '../../types/infrastructure/di-container.js';

/**
 * Infrastructure service implementing hardware effect execution.
 * Handles the actual generation and sending of commands to light and DMX controllers.
 */
@injectable()
export class HardwareEffectExecutor implements EffectExecutor {
  
  constructor(
    @inject(TYPES.LightController) private lightController: ILightController,
    @inject(TYPES.DMXController) private dmxController: DMXController
  ) {}

  async executeStep(step: EffectStep, context: EffectExecutionContext): Promise<void> {
    const processedStep = this.processIntensity(step, context.intensity);
    const colorProcessedStep = this.processColor(processedStep, context.intensity);
    
    // Execute step based on action type
    switch (colorProcessedStep.action.type) {
      case 'fade':
      case 'pulse':
        await this.executeLightStep(colorProcessedStep, context);
        console.log(`🎨 Effect Executor: Executed ${colorProcessedStep.action.type} for ${colorProcessedStep.duration.durationMs}ms`);
        break;
        
      case 'blackout':
        await this.executeBlackout();
        console.log(`🎨 Effect Executor: Executed blackout`);
        break;
        
      case 'sweep':
        await this.executeSweepStep(colorProcessedStep, context);
        console.log(`🎨 Effect Executor: Executed sweep for ${colorProcessedStep.duration.durationMs}ms`);
        break;
        
      default:
        console.log(`🎨 Effect Executor: Unknown action type: ${colorProcessedStep.action.type}`);
    }
  }

  processIntensity(step: EffectStep, intensity: number): EffectStep {
    const scaledStep = { ...step };
    
    if (scaledStep.action.intensity) {
      scaledStep.action = {
        ...scaledStep.action,
        intensity: {
          value: scaledStep.action.intensity.value * intensity
        }
      };
    }
    
    return scaledStep;
  }

  processColor(step: EffectStep, intensity: number): EffectStep {
    const scaledStep = { ...step };
    
    if (scaledStep.action.color) {
      const color = scaledStep.action.color;
      scaledStep.action = {
        ...scaledStep.action,
        color: {
          r: Math.round(color.r * intensity),
          g: Math.round(color.g * intensity),
          b: Math.round(color.b * intensity)
        }
      };
    }
    
    return scaledStep;
  }

  private async executeLightStep(step: EffectStep, context: EffectExecutionContext): Promise<void> {
    const lightCommands = [];
    
    // Get the actual Entertainment group light IDs
    const lightIds = this.lightController.getLightOrder();
    
    for (const lightId of lightIds) {
      lightCommands.push({
        lightId: { value: lightId.toString() },
        state: {
          color: step.action.color || { r: 255, g: 255, b: 255 },
          intensity: step.action.intensity || { value: context.intensity }
        }
      });
    }
    
    if (lightCommands.length > 0) {
      console.log(`🎨 Effect Executor: Sending commands to ${lightCommands.length} lights`);
      await this.lightController.sendCommands(lightCommands);
    }
  }

  private async executeBlackout(): Promise<void> {
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
      console.log(`🎨 Effect Executor: Sending blackout to ${blackoutCommands.length} lights`);
      await this.lightController.sendCommands(blackoutCommands);
    }
  }

  private async executeSweepStep(step: EffectStep, context: EffectExecutionContext): Promise<void> {
    // For sweep effects, we execute the same as fade/pulse for now
    // In the future, this could implement more sophisticated sweep patterns
    await this.executeLightStep(step, context);
  }
}