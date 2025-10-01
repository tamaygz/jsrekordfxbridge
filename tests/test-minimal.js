import 'reflect-metadata';
import { Container, injectable } from 'inversify';

@injectable()
class TestRepository {
  getName() {
    return 'TestRepository';
  }
}

console.log('Minimal test...');

try {
  const container = new Container();
  
  console.log('1. Binding TestRepository...');
  container.bind('TestRepository').to(TestRepository);
  
  console.log('2. Getting TestRepository...');
  const repo = container.get('TestRepository');
  
  console.log('✅ Success:', repo.getName());
  
} catch (error) {
  console.error('❌ Error:', error.message);
}