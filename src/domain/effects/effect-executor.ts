import type { EffectStep } from './effect.js';

/**
 * Execution context passed to effect executor containing runtime information
 */
export interface EffectExecutionContext {
  readonly timestamp: number;
  readonly intensity: number;
  readonly bpm?: number;
  readonly beatPosition?: {
    readonly bar: number;
    readonly beat: number;
    readonly sixteenth: number;
  };
}

/**
 * Domain service interface for hardware effect execution.
 * Handles the actual generation and sending of commands to hardware controllers.
 */
export interface EffectExecutor {
  /**
   * Execute a single effect step by generating and sending hardware commands
   */
  executeStep(step: EffectStep, context: EffectExecutionContext): Promise<void>;
  
  /**
   * Process intensity scaling on an effect step
   */
  processIntensity(step: EffectStep, intensity: number): EffectStep;
  
  /**
   * Process color scaling on an effect step  
   */
  processColor(step: EffectStep, intensity: number): EffectStep;
}