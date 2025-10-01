// src/mocks.js
// Mock hardware classes for demo mode
const EventEmitter = require('events');

class MockHueEntertainment extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.lightOrder = [1, 2, 3, 4, 5, 6]; // Mock light IDs
    this.connected = false;
    this.streaming = false;
  }

  async connect() {
    console.log('🎭 Mock Hue: Connecting to bridge...');
    await this.sleep(500);
    this.connected = true;
    console.log('🎭 Mock Hue: Connected! Lights:', this.lightOrder);
  }

  async startStream() {
    console.log('🎭 Mock Hue: Starting entertainment stream...');
    await this.sleep(200);
    this.streaming = true;
    console.log('🎭 Mock Hue: Streaming started');
  }

  sendFrame(frames) {
    if (!this.streaming) return;
    
    // Log interesting frame data
    if (frames.length > 0) {
      const sample = frames[0];
      console.log(`🎭 Mock Hue: Light ${sample.lightId} → RGB(${sample.r},${sample.g},${sample.b}) @${sample.brightness}`);
    }
  }

  stopStream() {
    this.streaming = false;
    console.log('🎭 Mock Hue: Stream stopped');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockDmxController {
  constructor(driver, device) {
    this.driver = driver;
    this.device = device;
    this.channels = new Array(513).fill(0); // DMX channels 1-512
    console.log(`🎛️  Mock DMX: Initialized ${driver} on ${device}`);
  }

  setChannel(channel, value) {
    if (channel >= 1 && channel <= 512) {
      this.channels[channel] = value;
      if (value > 0) {
        console.log(`🎛️  Mock DMX: Channel ${channel} = ${value}`);
      }
    }
  }

  blackout() {
    this.channels.fill(0);
    console.log('🎛️  Mock DMX: Blackout - all channels set to 0');
  }

  isConnected() {
    return true;
  }
}

class MockMidiController extends EventEmitter {
  constructor(inputName) {
    super();
    this.inputName = inputName;
    this.connected = false;
  }

  async connect() {
    console.log(`🎹 Mock MIDI: Connecting to ${this.inputName}...`);
    await this.sleep(300);
    this.connected = true;
    console.log(`🎹 Mock MIDI: Connected! Use 'triggerBeat()' to simulate beats`);
  }

  disconnect() {
    this.connected = false;
    console.log('🎹 Mock MIDI: Disconnected');
  }

  // Manual beat trigger for demo
  triggerBeat() {
    if (this.connected) {
      this.emit('clock');
      console.log('🎹 Mock MIDI: Beat triggered');
    }
  }

  // Simulate various MIDI messages
  simulateNoteOn(note, velocity = 127) {
    this.emit('noteon', { channel: 0, note, velocity });
  }

  simulateCC(controller, value) {
    this.emit('cc', { channel: 0, controller, value });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class MockBeatGenerator extends EventEmitter {
  constructor(interval = 500) {
    super();
    this.interval = interval;
    this.timer = null;
    this.beatCount = 0;
  }

  start() {
    if (this.timer) return;
    
    console.log(`🥁 Mock Beat Generator: Starting at ${60000/this.interval} BPM`);
    this.timer = setInterval(() => {
      this.beatCount++;
      this.emit('beat', { count: this.beatCount });
      
      // Visual beat indicator
      const indicator = this.beatCount % 4 === 1 ? '🔥' : '💫';
      console.log(`${indicator} Beat ${this.beatCount} (${this.beatCount % 4 === 1 ? 'DOWNBEAT' : 'beat'})`);
    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🥁 Mock Beat Generator: Stopped');
    }
  }

  setBPM(bpm) {
    this.interval = 60000 / bpm;
    if (this.timer) {
      this.stop();
      this.start();
    }
    console.log(`🥁 Mock Beat Generator: BPM set to ${bpm}`);
  }
}

module.exports = {
  MockHueEntertainment,
  MockDmxController,
  MockMidiController,
  MockBeatGenerator
};