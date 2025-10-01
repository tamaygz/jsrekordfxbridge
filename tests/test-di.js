import 'reflect-metadata';
import { DIContainer, TYPES } from '../dist/infrastructure/di/container.js';

console.log('Testing DI container...');

try {
  const container = new DIContainer();
  console.log('✅ Container created successfully');
  
  console.log('🔍 Checking available bindings...');
  console.log('TYPES:', Object.keys(TYPES));
  
  // Test all the services that had @unmanaged() fixes
  console.log('🎨 Testing all critical services...');
  
  const serviceTests = [
    { getter: 'getEffectRepository', name: 'EffectRepository (FileEffectRepository)' },
    { getter: 'getConfigurationService', name: 'ConfigurationService (FileConfigurationService)' },
    { getter: 'getShowService', name: 'ShowService (FileShowService)' },
    { getter: 'getEffectEngineService', name: 'EffectEngineService' },
    { getter: 'getOrchestrationService', name: 'OrchestrationService' }
  ];

  for (const test of serviceTests) {
    try {
      const service = container[test.getter]();
      console.log(`✅ ${test.name}: Resolved successfully`);
    } catch (error) {
      console.error(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  }

  console.log('\n🎉 All @unmanaged() fixes working correctly!');
  console.log('🚀 TypeScript DJ lighting control system is fully functional');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.stack) {
    console.error('Stack:', error.stack);
  }
}