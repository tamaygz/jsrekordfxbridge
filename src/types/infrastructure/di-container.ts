// Dependency injection container type identifiers

export const TYPES = {
  // Controllers
  LightController: 'LightController',
  DMXController: 'DMXController',
  MIDIController: 'MIDIController',
  
  // Services
  BeatDetectionService: 'BeatDetectionService',
  EffectEngineService: 'EffectEngineService',
  ConfigurationService: 'ConfigurationService',
  ShowService: 'ShowService',
  OrchestrationService: 'OrchestrationService',
  
  // Repositories
  EffectRepository: 'EffectRepository',
  ShowRepository: 'ShowRepository',
} as const;

export type DITypes = typeof TYPES;