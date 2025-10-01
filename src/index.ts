import 'reflect-metadata';
import { DIContainer } from './infrastructure/di/container.js';
import type { BeatDetector } from './domain/midi/midi-controller.js';
import type { EffectEngine } from './domain/effects/effect.js';
import type { FileEffectRepository } from './infrastructure/persistence/file-effect-repository.js';

export class JSRekordFXBridge {
  private container: DIContainer;
  private isRunning = false;

  constructor() {
    this.container = new DIContainer();
  }

  async initialize(): Promise<void> {
    console.log('🎛️  JSRekordFXBridge v2.0 - TypeScript Edition');
    console.log('==============================================');
    
    const isDemoMode = process.env.DEMO_MODE === 'true' || 
                      (!process.env.HUE_BRIDGE_ID && !process.env.DMX_DEVICE);
    
    console.log(`Mode: ${isDemoMode ? '🎭 DEMO' : '🔧 HARDWARE'}`);

    // Initialize all services
    const lightController = this.container.getLightController();
    const dmxController = this.container.getDMXController();
    const midiController = this.container.getMIDIController();
    
    // Connect to devices
    await lightController.connect();
    await dmxController.connect();
    await midiController.connect();

    // Load effects
    const effectRepository = this.container.getEffectRepository() as FileEffectRepository;
    await effectRepository.loadFromDirectory();

    console.log('🚀 System initialized successfully!');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('▶️  Starting JSRekordFXBridge...');

    // Start beat detection
    const beatDetector = this.container.getBeatDetector();
    const effectEngine = this.container.getEffectEngine();

    beatDetector.onBeat(async (beat) => {
      await effectEngine.onBeat(beat);
    });

    beatDetector.start();
    this.isRunning = true;

    console.log('✅ System is running!');
    
    // Show demo instructions
    this.showDemoInstructions();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('⏹️  Stopping JSRekordFXBridge...');

    // Stop beat detection
    const beatDetector = this.container.getBeatDetector();
    beatDetector.stop();

    // Disconnect devices
    const lightController = this.container.getLightController();
    const dmxController = this.container.getDMXController();
    const midiController = this.container.getMIDIController();

    await lightController.disconnect();
    await dmxController.disconnect();
    await midiController.disconnect();

    this.isRunning = false;
    console.log('⏹️  System stopped');
  }

  // Public API for demo control
  async triggerEffect(effectName: string, parameters?: Record<string, unknown>): Promise<void> {
    try {
      const effectEngine = this.container.getEffectEngine();
      await effectEngine.triggerEffect({ value: effectName }, parameters);
      console.log(`🎆 Triggered effect: ${effectName}`);
    } catch (error) {
      console.error(`❌ Failed to trigger effect ${effectName}:`, error);
    }
  }

  setBPM(bpm: number): void {
    const beatDetector = this.container.getBeatDetector() as any;
    if (beatDetector.setBPM) {
      beatDetector.setBPM(bpm);
      console.log(`🥁 BPM set to ${bpm}`);
    }
  }

  toggleBeat(): void {
    const beatDetector = this.container.getBeatDetector() as any;
    if (beatDetector.timer) {
      beatDetector.stop();
    } else {
      beatDetector.start();
    }
  }

  beat(): void {
    const beatDetector = this.container.getBeatDetector() as any;
    if (beatDetector.triggerBeat) {
      beatDetector.triggerBeat();
    }
  }

  private showDemoInstructions(): void {
    console.log(`
🎮 DEMO MODE - Available Commands:
================================
• bridge.triggerEffect("strobo")    - Trigger strobe effect
• bridge.triggerEffect("sweep")     - Trigger sweep effect
• bridge.triggerEffect("blackout")  - Blackout all lights
• bridge.setBPM(120)               - Set beat speed
• bridge.toggleBeat()              - Start/stop auto beat
• bridge.beat()                    - Manual beat trigger

Example: bridge.triggerEffect("strobo")
`);
  }

  // Getter for DI container (for advanced usage)
  getContainer(): DIContainer {
    return this.container;
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