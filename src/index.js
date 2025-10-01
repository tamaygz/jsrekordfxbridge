// src/index.js
// Main entry point for the DJ lighting control system
const ConfigLoader = require('./config');
const FxEngine = require('./fx-engine');
const fs = require('fs');
const yaml = require('yaml');

// Import real hardware classes
const HueEntertainment = require('./hue');
const DmxController = require('./dmx');
const MidiController = require('./midi');
const Rekordbox = require('./rekordbox');

// Import mock classes
const { 
  MockHueEntertainment, 
  MockDmxController, 
  MockMidiController, 
  MockBeatGenerator 
} = require('./mocks');

class JSRekordFXBridge {
  constructor() {
    this.config = new ConfigLoader();
    this.hue = null;
    this.dmx = null;
    this.midi = null;
    this.fx = null;
    this.rekordbox = null;
    this.beatGenerator = null;
    this.running = false;
  }

  async initialize() {
    console.log('🎛️  JSRekordFXBridge - DJ Lighting Control System');
    console.log('================================================');
    
    const isDemo = this.config.isDemo();
    console.log(`Mode: ${isDemo ? '🎭 DEMO' : '🔧 HARDWARE'}`);
    
    // Initialize Hue
    if (this.config.isHueEnabled() || isDemo) {
      await this.initializeHue(isDemo);
    }
    
    // Initialize DMX
    if (this.config.isDmxEnabled() || isDemo) {
      this.initializeDmx(isDemo);
    }
    
    // Initialize MIDI
    await this.initializeMidi(isDemo);
    
    // Initialize FX Engine
    this.initializeFxEngine();
    
    // Initialize beat source
    if (isDemo && this.config.get('demo.auto_beat')) {
      this.initializeBeatGenerator();
    }
    
    console.log('🚀 System initialized successfully!');
  }

  async initializeHue(isDemo) {
    if (isDemo) {
      this.hue = new MockHueEntertainment(this.config.get('hue'));
    } else {
      this.hue = new HueEntertainment({
        bridge_id: this.config.get('hue.bridge_id'),
        username: this.config.get('hue.username'),
        entertainment_id: this.config.get('hue.entertainment_id')
      });
    }
    
    await this.hue.connect();
    await this.hue.startStream();
  }

  initializeDmx(isDemo) {
    if (isDemo) {
      this.dmx = new MockDmxController('mock-driver', 'mock-device');
    } else {
      this.dmx = new DmxController('enttec-usb-dmx-pro', this.config.get('dmx.device'));
    }
  }

  async initializeMidi(isDemo) {
    if (isDemo) {
      this.midi = new MockMidiController(this.config.get('midi.device_name'));
    } else {
      this.midi = new MidiController(this.config.get('midi.device_name'));
    }
    
    await this.midi.connect();
  }

  initializeFxEngine() {
    // Load depth map
    const depthMapPath = this.config.get('beat_to_light.default_depth_map');
    let depthMap = null;
    
    try {
      const depthMapFile = fs.readFileSync(depthMapPath, 'utf8');
      depthMap = yaml.parse(depthMapFile);
    } catch (err) {
      console.warn(`Could not load depth map from ${depthMapPath}, using default`);
      depthMap = {
        bass: { zone: "floor", coords: [0, -1, 0] },
        mids: { zone: "mid", coords: [0, 0, 1] },
        highs: { zone: "ceiling", coords: [0, 1, 2] }
      };
    }

    this.fx = new FxEngine({
      hueClient: this.hue,
      dmxController: this.dmx,
      depthMap: depthMap
    });
  }

  initializeBeatGenerator() {
    const interval = this.config.get('demo.beat_interval') || 500;
    this.beatGenerator = new MockBeatGenerator(interval);
    this.beatGenerator.on('beat', () => {
      this.fx.onBeat();
    });
  }

  async start() {
    if (this.running) return;
    
    console.log('▶️  Starting JSRekordFXBridge...');
    
    // Set up beat detection
    if (this.config.get('rekordbox.use_midi_clock') && this.midi) {
      this.rekordbox = new Rekordbox(this.midi);
      this.rekordbox.on('beat', () => {
        this.fx.onBeat();
      });
    }
    
    // Start demo beat generator if enabled
    if (this.beatGenerator) {
      this.beatGenerator.start();
    }
    
    this.running = true;
    console.log('✅ System is running!');
    
    // Show demo instructions
    if (this.config.isDemo()) {
      this.showDemoInstructions();
    }
  }

  async stop() {
    console.log('⏹️  Stopping JSRekordFXBridge...');
    
    if (this.beatGenerator) {
      this.beatGenerator.stop();
    }
    
    if (this.hue) {
      this.hue.stopStream();
    }
    
    if (this.midi) {
      this.midi.disconnect();
    }
    
    if (this.dmx) {
      this.dmx.blackout();
    }
    
    this.running = false;
    console.log('⏹️  System stopped');
  }

  showDemoInstructions() {
    console.log('\n🎮 DEMO MODE - Available Commands:');
    console.log('================================');
    console.log('• triggerEffect("strobo")    - Trigger strobe effect');
    console.log('• triggerEffect("sweep")     - Trigger sweep effect');
    console.log('• triggerEffect("blackout")  - Blackout all lights');
    console.log('• setBPM(120)               - Change beat speed');
    console.log('• toggleBeat()              - Start/stop auto beat');
    console.log('\nExample: bridge.triggerEffect("strobo")');
  }

  // Demo control methods
  async triggerEffect(effectName) {
    if (!this.fx) return;
    
    try {
      const effectPath = `effects/${effectName}.yaml`;
      const effectFile = fs.readFileSync(effectPath, 'utf8');
      const effectDef = yaml.parse(effectFile);
      
      console.log(`🎆 Triggering effect: ${effectName}`);
      await this.fx.triggerEffect(effectDef);
    } catch (err) {
      console.error(`Failed to trigger effect ${effectName}:`, err.message);
    }
  }

  setBPM(bpm) {
    if (this.beatGenerator) {
      this.beatGenerator.setBPM(bpm);
    }
  }

  toggleBeat() {
    if (!this.beatGenerator) return;
    
    if (this.beatGenerator.timer) {
      this.beatGenerator.stop();
    } else {
      this.beatGenerator.start();
    }
  }

  // Manual beat trigger
  beat() {
    if (this.fx) {
      this.fx.onBeat();
    }
  }
}

// Create and export singleton instance
const bridge = new JSRekordFXBridge();

// Auto-start if run directly
if (require.main === module) {
  async function main() {
    try {
      await bridge.initialize();
      await bridge.start();
      
      // Keep process alive and handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down gracefully...');
        await bridge.stop();
        process.exit(0);
      });
      
      // In demo mode, make bridge available globally for easy interaction
      if (bridge.config.isDemo()) {
        global.bridge = bridge;
        console.log('\n💡 Global variable "bridge" available for commands');
      }
      
    } catch (err) {
      console.error('❌ Failed to start:', err);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = bridge;