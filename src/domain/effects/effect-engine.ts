import type { EffectId } from '../../types/domain/effects.js';
import type { BeatPosition } from '../../types/domain/beats.js';
import type { Effect, EffectExecution } from './effect.js';

/**
 * Domain service interface for effect orchestration and business logic.
 * Handles effect lifecycle, execution tracking, and beat synchronization.
 */
export interface EffectEngine {
  /**
   * Trigger an effect execution with optional parameters
   */
  triggerEffect(effectId: EffectId, parameters?: Record<string, unknown>): Promise<EffectExecution>;
  
  /**
   * Stop a running effect execution
   */
  stopEffect(executionId: string): Promise<void>;
  
  /**
   * Get all currently running effect executions
   */
  getRunningEffects(): Promise<EffectExecution[]>;
  
  /**
   * Handle beat synchronization for beat-responsive effects
   */
  onBeat(beat: BeatPosition): Promise<void>;
  
  /**
   * Load an effect from a definition (for dynamic effect creation)
   */
  loadEffect(definition: unknown): Promise<Effect>;
  
  /**
   * Execute an effect with given intensity (for orchestration services)
   */
  executeEffectWithIntensity(effect: Effect, intensity?: number): Promise<void>;
}