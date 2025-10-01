// examples/demo-cli.js
// Interactive CLI demo for JSRekordFXBridge
const readline = require('readline');
const bridge = require('../src/index');

class DemoInterface {
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
      'exit': this.exit.bind(this),
      'quit': this.exit.bind(this),
      'q': this.exit.bind(this)
    };
  }

  async start() {
    console.log('🎪 Starting JSRekordFXBridge Demo CLI...\n');
    
    // Initialize bridge in demo mode
    process.env.DEMO_MODE = 'true';
    await bridge.initialize();
    await bridge.start();
    
    console.log('\n🎮 Demo CLI Ready! Type "help" for commands or "quit" to exit\n');
    this.showPrompt();
  }

  showPrompt() {
    this.rl.question('🎛️  > ', (input) => {
      this.handleCommand(input.trim().toLowerCase());
    });
  }

  handleCommand(input) {
    const [command, ...args] = input.split(' ');
    
    if (this.commands[command]) {
      try {
        this.commands[command](...args);
      } catch (err) {
        console.error('❌ Error:', err.message);
      }
    } else if (input) {
      console.log(`❓ Unknown command: ${command}. Type "help" for available commands.`);
    }
    
    // Continue the prompt loop
    setTimeout(() => this.showPrompt(), 100);
  }

  showHelp() {
    console.log(`
🎮 Available Commands:
=====================
🎆 Effects:
  strobo      - Trigger strobe effect
  sweep       - Trigger sweep effect  
  suspense    - Trigger red suspense effect
  blackout    - Turn off all lights

🥁 Beat Control:
  beat        - Manual beat trigger
  bpm [num]   - Set BPM (e.g., "bpm 140")
  toggle      - Start/stop auto beat

ℹ️  Help:
  help, h     - Show this help
  exit, quit, q - Exit demo

Examples:
  strobo
  bpm 140
  beat
`);
  }

  setBPM(...args) {
    const bpm = parseInt(args[0]);
    if (isNaN(bpm) || bpm < 60 || bpm > 200) {
      console.log('❌ Please provide a valid BPM between 60-200. Example: bpm 120');
      return;
    }
    bridge.setBPM(bpm);
  }

  async exit() {
    console.log('\n👋 Shutting down demo...');
    await bridge.stop();
    this.rl.close();
    process.exit(0);
  }
}

// Start the demo if run directly
if (require.main === module) {
  const demo = new DemoInterface();
  demo.start().catch(err => {
    console.error('❌ Failed to start demo:', err);
    process.exit(1);
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await bridge.stop();
    process.exit(0);
  });
}

module.exports = DemoInterface;