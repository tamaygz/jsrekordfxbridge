// Test using compiled FileEffectRepository directly
import 'reflect-metadata';
import { Container } from 'inversify';

// Test with a simple class first
const testDescriptor = {
  value: class TestRepository {
    getName() {
      return 'TestRepository';
    }
  }
};

// Add injectable metadata manually
Reflect.defineMetadata('inversify:paramtypes', [], testDescriptor.value);

console.log('Manual binding test...');

try {
  const container = new Container();
  
  console.log('1. Binding TestRepository manually...');
  container.bind('TestRepository').to(testDescriptor.value);
  
  console.log('2. Getting TestRepository...');
  const repo = container.get('TestRepository');
  
  console.log('✅ Success:', repo.getName());
  
  // Now test the compiled FileEffectRepository
  console.log('3. Testing compiled FileEffectRepository...');
  
  const { FileEffectRepository } = await import('../dist/infrastructure/effects/file-effect-repository.js');
  
  console.log('4. Metadata check...');
  const metadata = Reflect.getMetadata('inversify:paramtypes', FileEffectRepository);
  console.log('   FileEffectRepository metadata:', metadata);
  
  console.log('5. Binding FileEffectRepository...');
  container.bind('EffectRepository').to(FileEffectRepository);
  
  console.log('6. Getting FileEffectRepository...');
  const fileRepo = container.get('EffectRepository');
  
  console.log('✅ Success: FileEffectRepository created');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}