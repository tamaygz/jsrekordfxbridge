import 'reflect-metadata';
import 'dotenv/config';
import { DIContainer } from './infrastructure/di/container.js';
import type { OrchestrationService, OrchestrationStatus } from './application/orchestration-service.js';
import type { BeatDetectionService } from './domain/beat/beat-detection-service.js';
import type { EffectRepository } from './domain/effects/effect-repository.js';

export class JSRekordFXBridge {
  private container: DIContainer;
  private orchestrationService: OrchestrationService;
  private isRunning = false;

  constructor() {
    this.container = new DIContainer();
    this.orchestrationService = this.container.getOrchestrationService();
  }

  async initialize(): Promise<void> {
    console.log('🎛️  JSRekordFXBridge v3.0 - TypeScript Edition');
    console.log('==============================================');
    
    const isDemoMode = process.env.DEMO_MODE === 'true' || 
                      (!process.env.HUE_BRIDGE_IP && !process.env.HUE_BRIDGE_ID);
    
    console.log(`Mode: ${isDemoMode ? '🎭 DEMO' : '🔧 HARDWARE'}`);

    // Load effects first via repository
    const effectRepository = this.container.getEffectRepository();
    await effectRepository.loadEffects();
    console.log('🎨 Effects: Effects loaded via repository');

    console.log('🚀 System initialized successfully!');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('▶️  Starting JSRekordFXBridge...');

    // Start the orchestration service (handles everything)
    await this.orchestrationService.start();
    this.isRunning = true;

    console.log('✅ System is running!');
    
    // Show status and demo instructions
    await this.showStatus();
    this.showDemoInstructions();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('⏹️  Stopping JSRekordFXBridge...');

    // Stop the orchestration service
    await this.orchestrationService.stop();
    this.isRunning = false;

    console.log('⏹️  System stopped');
  }

  // Public API for demo control
  async triggerEffect(effectName: string, intensity = 1.0): Promise<void> {
    try {
      await this.orchestrationService.triggerEffect(effectName, intensity);
      console.log(`🎆 Triggered effect: ${effectName} at ${Math.round(intensity * 100)}%`);
    } catch (error) {
      console.error(`❌ Failed to trigger effect ${effectName}:`, error);
    }
  }

  async setMasterBrightness(brightness: number): Promise<void> {
    try {
      await this.orchestrationService.setMasterBrightness(brightness);
      console.log(`💡 Master brightness set to ${Math.round(brightness * 100)}%`);
    } catch (error) {
      console.error(`❌ Failed to set brightness:`, error);
    }
  }

  async blackout(): Promise<void> {
    try {
      await this.orchestrationService.blackout();
      console.log('⚫ Blackout executed');
    } catch (error) {
      console.error('❌ Failed to execute blackout:', error);
    }
  }

  async loadShow(showName: string): Promise<void> {
    try {
      await this.orchestrationService.loadShow(showName);
      console.log(`🎪 Show "${showName}" loaded`);
    } catch (error) {
      console.error(`❌ Failed to load show ${showName}:`, error);
    }
  }

  async startShow(): Promise<void> {
    try {
      await this.orchestrationService.startShow();
      console.log('🎪 Show started');
    } catch (error) {
      console.error('❌ Failed to start show:', error);
    }
  }

  async stopShow(): Promise<void> {
    try {
      await this.orchestrationService.stopShow();
      console.log('� Show stopped');
    } catch (error) {
      console.error('❌ Failed to stop show:', error);
    }
  }

  setBPM(bpm: number): void {
    const beatDetectionService = this.container.getBeatDetectionService();
    beatDetectionService.setBPM(bpm);
    console.log(`🥁 BPM set to ${bpm}`);
  }

  async getStatus(): Promise<OrchestrationStatus> {
    return await this.orchestrationService.getStatus();
  }

  async showStatus(): Promise<void> {
    const status = await this.getStatus();
    
    console.log('\n📊 System Status:');
    console.log('================');
    console.log(`• Running: ${status.running ? '✅' : '❌'}`);
    console.log(`• Lights: ${status.connections.lights ? '✅' : '❌'}`);
    console.log(`• DMX: ${status.connections.dmx ? '✅' : '❌'}`);
    console.log(`• MIDI: ${status.connections.midi ? '✅' : '❌'}`);
    console.log(`• Rekordbox: ${status.connections.rekordbox ? '✅' : '❌'}`);
    console.log(`• BPM (Beat Detection): ${status.currentBPM || 'Not detected'}`);
    
    if (status.connections.rekordbox) {
      console.log(`• Rekordbox BPM: ${status.rekordboxBPM?.toFixed(1) || 'Not detected'}`);
      console.log(`• Active Channel: ${status.activeChannel || 'None'}`);
    }
    
    console.log(`• Master Brightness: ${Math.round(status.masterBrightness * 100)}%`);
    console.log(`• Current Show: ${status.currentShow || 'None'}`);
    console.log(`• Active Effects: ${status.activeEffects.length > 0 ? status.activeEffects.join(', ') : 'None'}`);
  }

  async listEffects(): Promise<string[]> {
    const effectRepository = this.container.getEffectRepository();
    const effects = await effectRepository.getAvailableEffects();
    
    console.log('\n🎨 Available Effects:');
    console.log('===================');
    effects.forEach(effect => console.log(`• ${effect}`));
    
    return effects;
  }

  private showDemoInstructions(): void {
    console.log(`
🎮 DEMO MODE - Available Commands:
================================
• await bridge.triggerEffect("strobo")     - Trigger strobe effect
• await bridge.triggerEffect("sweep")      - Trigger sweep effect
• await bridge.triggerEffect("blackout")   - Blackout all lights
• await bridge.setMasterBrightness(0.5)    - Set 50% brightness
• await bridge.blackout()                  - Execute blackout
• bridge.setBPM(120)                       - Set beat speed
• await bridge.showStatus()                - Show system status
• await bridge.listEffects()               - List available effects
• await bridge.loadShow("myshow")          - Load a show
• await bridge.startShow()                 - Start loaded show
• await bridge.stopShow()                  - Stop current show

Example: await bridge.triggerEffect("strobo", 0.8)
`);
  }

  // Getter for DI container (for advanced usage)
  getContainer(): DIContainer {
    return this.container;
  }

  // Getter for orchestration service (for advanced usage)
  getOrchestrationService(): OrchestrationService {
    return this.orchestrationService;
  }
}

// Create and export singleton instance
export const bridge = new JSRekordFXBridge();

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    try {
      await bridge.initialize();
      await bridge.start();

      // Keep process alive and handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\\n👋 Shutting down gracefully...');
        await bridge.stop();
        process.exit(0);
      });

      // Make bridge available globally for easy interaction
      (global as any).bridge = bridge;
      console.log('\\n💡 Global variable "bridge" available for commands');

    } catch (error) {
      console.error('❌ Failed to start:', error);
      process.exit(1);
    }
  }

  main();
}