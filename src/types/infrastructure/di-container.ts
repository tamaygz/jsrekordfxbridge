// Dependency injection container type identifiers

export const TYPES = {
  // Controllers
  LightController: 'LightController',
  DMXController: 'DMXController',
  MIDIController: 'MIDIController',
  RekordboxController: 'RekordboxController',
  
  // Services
  BeatDetectionService: 'BeatDetectionService',
  EffectEngine: 'EffectEngine',
  EffectExecutor: 'EffectExecutor',
  ConfigurationService: 'ConfigurationService',
  ShowService: 'ShowService',
  OrchestrationService: 'OrchestrationService',
  
  // Repositories
  EffectRepository: 'EffectRepository',
  ShowRepository: 'ShowRepository',
} as const;

export type DITypes = typeof TYPES;