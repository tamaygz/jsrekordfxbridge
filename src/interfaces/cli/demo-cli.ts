import * as readline from 'readline';
import { bridge } from '../../index.js';

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
      'status': () => bridge.showStatus(),
      'strobo': () => bridge.triggerEffect('strobo'),
      'sweep': () => bridge.triggerEffect('sweep'),
      'blackout': () => bridge.triggerEffect('blackout'),
      'suspense': () => bridge.triggerEffect('red_suspense'),
      'bpm': this.setBPM.bind(this),
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
  bpm [num]   - Set BPM (e.g., "bpm 140")

ℹ️  Help:
  help, h     - Show this help
  list        - List available effects
  exit, quit, q - Exit demo

Examples:
  strobo
  bpm 140
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
      await bridge.listEffects();
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