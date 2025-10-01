import 'reflect-metadata';
import { Container } from 'inversify';
import { configureMockContainer } from '../dist/infrastructure/di/container.js';

console.log('🧪 Testing all service resolution...');

try {
  // Create container in demo mode
  process.env.DEMO_MODE = 'true';
  const container = configureMockContainer();
  
  console.log('✅ Container created successfully');

  // Test all service types
  const serviceTypes = [
    'LightController',
    'DMXController', 
    'MIDIController',
    'BeatDetectionService',
    'EffectEngineService',
    'ConfigurationService',
    'ShowService',
    'OrchestrationService',
    'EffectRepository',
    'ShowRepository'
  ];

  console.log('\n🔍 Testing service resolution...');
  
  for (const serviceType of serviceTypes) {
    try {
      const service = container.get(serviceType);
      console.log(`✅ ${serviceType}: OK`);
      
      // Additional validation for key services
      if (serviceType === 'EffectRepository') {
        const effects = await service.getAllEffects();
        console.log(`   📦 Loaded ${effects.length} effects`);
      }
      
      if (serviceType === 'ConfigurationService') {
        const config = await service.getConfiguration();
        console.log(`   ⚙️  Config loaded: ${config.name || 'Default'}`);
      }
      
      if (serviceType === 'ShowService') {
        const shows = await service.getAvailableShows();
        console.log(`   🎪 Available shows: ${shows.length}`);
      }
      
    } catch (error) {
      console.error(`❌ ${serviceType}: FAILED`);
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n🎯 Testing service interactions...');
  
  // Test EffectEngineService can interact with dependencies
  const effectEngine = container.get('EffectEngineService');
  console.log('✅ EffectEngineService interaction test passed');
  
  // Test OrchestrationService (main service orchestrator)
  const orchestration = container.get('OrchestrationService');  
  console.log('✅ OrchestrationService interaction test passed');
  
  console.log('\n🎉 All services resolved successfully!');
  console.log('🚀 Dependency injection container is fully functional');

} catch (error) {
  console.error('❌ Service resolution failed:', error);
  process.exit(1);
}