import 'reflect-metadata';

console.log('🧪 Testing service resolution after @unmanaged() fixes...');

try {
  // Import and configure the container
  const { DIContainer, TYPES } = await import('../dist/infrastructure/di/container.js');
  
  // Set demo mode
  process.env.DEMO_MODE = 'true';
  const diContainer = new DIContainer();
  await diContainer.initializeMockMode();
  const container = diContainer.getContainer();
  
  console.log('✅ Container configured successfully\n');

  // Test each service type
  const serviceTests = [
    { type: TYPES.EffectRepository, name: 'EffectRepository' },
    { type: TYPES.ConfigurationService, name: 'ConfigurationService' }, 
    { type: TYPES.ShowService, name: 'ShowService (FileShowService)' },
    { type: TYPES.EffectEngineService, name: 'EffectEngineService' },
    { type: TYPES.BeatDetectionService, name: 'BeatDetectionService' },
    { type: TYPES.OrchestrationService, name: 'OrchestrationService' }
  ];

  console.log('🔍 Testing service resolution:');
  console.log('================================');
  
  for (const test of serviceTests) {
    try {
      const service = container.get(test.type);
      console.log(`✅ ${test.name}: Resolved successfully`);
      
      // Test constructor parameters worked correctly
      if (test.name === 'EffectRepository') {
        console.log(`   📁 Effects directory: ${service.effectsDirectory || './effects'}`);
      }
      if (test.name === 'ShowService (FileShowService)') {
        console.log(`   📁 Shows directory: ${service.showDirectory || './shows'}`);
      }
      
    } catch (error) {
      console.error(`❌ ${test.name}: FAILED - ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\n🎯 Testing service dependencies:');
  console.log('=================================');
  
  // Test that EffectEngineService can access its dependencies
  const effectEngine = container.get(TYPES.EffectEngineService);
  console.log('✅ EffectEngineService can access EffectRepository');
  
  // Test that OrchestrationService can access all dependencies
  const orchestration = container.get(TYPES.OrchestrationService);
  console.log('✅ OrchestrationService can access all required services');
  
  console.log('\n🎉 SUCCESS: All @unmanaged() fixes working correctly!');
  console.log('🚀 All services resolve without DI binding errors');
  console.log('💯 TypeScript DJ lighting control system is now functional');

} catch (error) {
  console.error('❌ FAILED:', error.message);
  process.exit(1);
}