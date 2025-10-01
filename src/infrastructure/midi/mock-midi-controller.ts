import { injectable } from 'inversify';
import { 
  MIDIController, 
  type MIDIDevice, 
  type MIDIMessage,
  type BeatDetector
} from '../../domain/midi/midi-controller.js';
import type { DeviceId } from '../../types/domain/devices.js';
import type { BeatPosition, BPM } from '../../types/domain/beats.js';

@injectable()
export class MockMIDIController extends MIDIController {
  private devices: MIDIDevice[] = [];
  private connected = false;
  private messageCallbacks: ((message: MIDIMessage) => void)[] = [];

  constructor() {
    super();
    this.initializeMockDevices();
  }

  private initializeMockDevices(): void {
    this.devices = [
      {
        id: { value: 'mock-midi-input-1' },
        name: 'Mock DDJ-400',
        manufacturer: 'Mock Pioneer',
        type: 'input'
      },
      {
        id: { value: 'mock-midi-output-1' },
        name: 'Mock Output',
        type: 'output'
      }
    ];
  }

  async connect(deviceId?: DeviceId): Promise<void> {
    const targetDevice = deviceId 
      ? this.devices.find(d => d.id.value === deviceId.value)
      : this.devices.find(d => d.type === 'input');

    if (!targetDevice) {
      throw new Error('No suitable MIDI device found');
    }

    console.log(`🎹 Mock MIDI: Connecting to ${targetDevice.name}...`);
    await this.delay(300);
    this.connected = true;
    console.log(`🎹 Mock MIDI: Connected to ${targetDevice.name}`);
  }

  async disconnect(): Promise<void> {
    console.log('🎹 Mock MIDI: Disconnecting...');
    this.connected = false;
    this.messageCallbacks = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getDevices(): Promise<MIDIDevice[]> {
    return [...this.devices];
  }

  onMessage(callback: (message: MIDIMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async sendMessage(message: MIDIMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('MIDI controller not connected');
    }
    
    console.log(`🎹 Mock MIDI: Sending ${message.type} message`);
  }

  // Mock-specific methods for triggering events
  triggerBeat(): void {
    if (!this.connected) return;
    
    const message: MIDIMessage = {
      type: 'clock',
      data: [0xF8],
      timestamp: Date.now()
    };
    
    this.messageCallbacks.forEach(callback => callback(message));
    console.log('🎹 Mock MIDI: Beat triggered');
  }

  triggerNote(note: number, velocity: number = 127): void {
    if (!this.connected) return;

    const message: MIDIMessage = {
      type: 'noteon',
      channel: 0,
      data: [0x90, note, velocity],
      timestamp: Date.now()
    };

    this.messageCallbacks.forEach(callback => callback(message));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

@injectable()
export class MockBeatDetector implements BeatDetector {
  private beatCount = 0;
  private measureCount = 0;
  private timer: NodeJS.Timeout | null = null;
  private beatCallbacks: ((beat: BeatPosition) => void)[] = [];

  constructor(
    public currentBPM: BPM = { value: 120 }
  ) {}

  get currentBeat(): BeatPosition {
    return {
      beat: this.beatCount % 4 + 1,
      measure: this.measureCount,
      isDownbeat: this.beatCount % 4 === 0
    };
  }

  onBeat(callback: (beat: BeatPosition) => void): void {
    this.beatCallbacks.push(callback);
  }

  start(): void {
    if (this.timer) return;

    const interval = 60000 / this.currentBPM.value;
    console.log(`🥁 Mock Beat Detector: Starting at ${this.currentBPM.value} BPM`);

    this.timer = setInterval(() => {
      this.beatCount++;
      if (this.beatCount % 4 === 1) {
        this.measureCount++;
      }

      const beat = this.currentBeat;
      this.beatCallbacks.forEach(callback => callback(beat));

      const indicator = beat.isDownbeat ? '🔥' : '💫';
      const beatType = beat.isDownbeat ? 'DOWNBEAT' : 'beat';
      console.log(`${indicator} Beat ${beat.beat}/4 M${beat.measure} (${beatType})`);
    }, interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🥁 Mock Beat Detector: Stopped');
    }
  }

  setBPM(bpm: number): void {
    this.currentBPM = { value: bpm };
    if (this.timer) {
      this.stop();
      this.start();
    }
  }
}