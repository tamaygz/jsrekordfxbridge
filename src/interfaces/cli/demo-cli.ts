import * as readline from 'readline';
import { bridge } from '../../index.js';
import type { FileEffectRepository } from '../../infrastructure/persistence/file-effect-repository.js';

export class DemoInterface {
  private rl: readline.Interface;
  private commands: Record<string, (...args: string[]) => void | Promise<void>>;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.commands = {
      'help': this.showHelp.bind(this),
      'h': this.showHelp.bind(this),
      'strobo': () => bridge.triggerEffect('strobo'),
      'sweep': () => bridge.triggerEffect('sweep'),
      'blackout': () => bridge.triggerEffect('blackout'),
      'suspense': () => bridge.triggerEffect('red_suspense'),
      'beat': () => bridge.beat(),
      'bpm': this.setBPM.bind(this),
      'toggle': () => bridge.toggleBeat(),
      'list': this.listEffects.bind(this),
      'exit': this.exit.bind(this),
      'quit': this.exit.bind(this),
      'q': this.exit.bind(this)
    };
  }

  async start(): Promise<void> {
    console.log('🎪 Starting JSRekordFXBridge Demo CLI v2.0...\n');

    // Initialize bridge in demo mode
    process.env.DEMO_MODE = 'true';
    await bridge.initialize();
    await bridge.start();

    console.log('\n🎮 Demo CLI Ready! Type "help" for commands or "quit" to exit\n');
    this.showPrompt();
  }

  private showPrompt(): void {
    this.rl.question('🎛️  > ', (input) => {
      this.handleCommand(input.trim().toLowerCase());
    });
  }

  private handleCommand(input: string): void {
    const [command, ...args] = input.split(' ');

    if (this.commands[command!]) {
      try {
        const result = this.commands[command!]!(...args);
        if (result instanceof Promise) {
          result.catch(error => console.error('❌ Error:', error.message));
        }
      } catch (error) {
        console.error('❌ Error:', (error as Error).message);
      }
    } else if (input) {
      console.log(`❓ Unknown command: ${command}. Type "help" for available commands.`);
    }

    // Continue the prompt loop
    setTimeout(() => this.showPrompt(), 100);
  }

  private showHelp(): void {
    console.log(`
🎮 Available Commands:
=====================
🎆 Effects:
  strobo      - Trigger strobe effect
  sweep       - Trigger sweep effect  
  suspense    - Trigger red suspense effect
  blackout    - Turn off all lights
  list        - List all loaded effects

🥁 Beat Control:
  beat        - Manual beat trigger
  bpm [num]   - Set BPM (e.g., "bpm 140")
  toggle      - Start/stop auto beat

ℹ️  Help:
  help, h     - Show this help
  list        - List available effects
  exit, quit, q - Exit demo

Examples:
  strobo
  bpm 140
  beat
  list
`);
  }

  private setBPM(...args: string[]): void {
    const bpm = parseInt(args[0]!);
    if (isNaN(bpm) || bpm < 60 || bpm > 200) {
      console.log('❌ Please provide a valid BPM between 60-200. Example: bpm 120');
      return;
    }
    bridge.setBPM(bpm);
  }

  private async listEffects(): Promise<void> {
    try {
      const effectRepository = bridge.getContainer().getEffectRepository() as FileEffectRepository;
      const effects = await effectRepository.list();
      
      if (effects.length === 0) {
        console.log('📋 No effects loaded');
        return;
      }

      console.log('📋 Available Effects:');
      console.log('==================');
      for (const effect of effects) {
        const tags = effect.tags.length > 0 ? ` [${effect.tags.join(', ')}]` : '';
        console.log(`  • ${effect.name}${tags}`);
        if (effect.description) {
          console.log(`    ${effect.description}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to list effects:', error);
    }
  }

  private async exit(): Promise<void> {
    console.log('\n👋 Shutting down demo...');
    await bridge.stop();
    this.rl.close();
    process.exit(0);
  }
}

// Start the demo if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new DemoInterface();
  demo.start().catch(error => {
    console.error('❌ Failed to start demo:', error);
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await bridge.stop();
    process.exit(0);
  });
}