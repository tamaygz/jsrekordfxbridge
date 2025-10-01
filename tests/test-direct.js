import 'reflect-metadata';
import { FileEffectRepository } from '../dist/infrastructure/effects/file-effect-repository.js';
import { EffectEngineServiceImpl } from '../dist/infrastructure/effects/effect-engine-service-impl.js';
import { TYPES } from '../dist/types/infrastructure/di-container.js';
import { Container } from 'inversify';

console.log('Direct binding test...');

try {
  const container = new Container();
  
  console.log('1. Binding FileEffectRepository to', TYPES.EffectRepository);
  container.bind(TYPES.EffectRepository).to(FileEffectRepository).inSingletonScope();
  
  console.log('2. Binding EffectEngineServiceImpl to', TYPES.EffectEngineService);
  container.bind(TYPES.EffectEngineService).to(EffectEngineServiceImpl).inSingletonScope();
  
  console.log('3. Checking if EffectRepository is bound:', container.isBound(TYPES.EffectRepository));
  console.log('4. Checking if EffectEngineService is bound:', container.isBound(TYPES.EffectEngineService));
  
  console.log('5. Trying to get EffectRepository directly...');
  const repo = container.get(TYPES.EffectRepository);  
  console.log('✅ Got EffectRepository:', repo.constructor.name);
  
  console.log('6. Trying to get EffectEngineService...');
  const service = container.get(TYPES.EffectEngineService);
  console.log('✅ Got EffectEngineService:', service.constructor.name);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}