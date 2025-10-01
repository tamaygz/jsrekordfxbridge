import { injectable } from 'inversify';
import JZZ from 'jzz';
import { 
  MIDIController, 
  type MIDIDevice, 
  type MIDIMessage
} from '../../domain/midi/midi-controller.js';
import type { DeviceId } from '../../types/domain/devices.js';

@injectable()
export class JZZMIDIController extends MIDIController {
  private devices: MIDIDevice[] = [];
  private input: any = null;
  private output: any = null;
  private connected = false;
  private messageCallbacks: ((message: MIDIMessage) => void)[] = [];

  constructor() {
    super();
  }

  async getDevices(): Promise<MIDIDevice[]> {
    try {
      const info = await JZZ.info();
      
      const devices: MIDIDevice[] = [];
      
      // Add input devices
      if (info.inputs) {
        for (const inputInfo of info.inputs) {
          devices.push({
            id: { value: `input-${inputInfo.name}` },
            name: inputInfo.name,
            manufacturer: inputInfo.manufacturer || 'Unknown',
            type: 'input'
          });
        }
      }
      
      // Add output devices
      if (info.outputs) {
        for (const outputInfo of info.outputs) {
          devices.push({
            id: { value: `output-${outputInfo.name}` },
            name: outputInfo.name,
            manufacturer: outputInfo.manufacturer || 'Unknown',
            type: 'output'
          });
        }
      }
      
      this.devices = devices;
      return [...devices];
      
    } catch (error) {
      console.warn('🎹 MIDI: Failed to get devices:', error);
      return [];
    }
  }

  async connect(deviceId?: DeviceId): Promise<void> {
    try {
      console.log('🎹 MIDI: Connecting to devices...');
      
      await this.getDevices();
      
      // Find input device
      let inputDevice: MIDIDevice | undefined;
      if (deviceId) {
        inputDevice = this.devices.find(d => d.id.value === deviceId.value && d.type === 'input');
      } else {
        // Auto-select: prefer DDJ-400, then any input device
        inputDevice = this.devices.find(d => 
          d.type === 'input' && 
          (d.name.toLowerCase().includes('ddj-400') || d.name.toLowerCase().includes('ddj400'))
        );
        
        if (!inputDevice) {
          inputDevice = this.devices.find(d => d.type === 'input');
        }
      }

      if (inputDevice) {
        console.log(`🎹 MIDI: Connecting to input: ${inputDevice.name}`);
        this.input = await JZZ().openMidiIn(inputDevice.name);
        this.setupInputHandlers();
      } else {
        console.warn('🎹 MIDI: No suitable input device found');
      }

      // Find output device (optional)
      let outputDevice = this.devices.find(d => d.type === 'output');
      if (outputDevice) {
        console.log(`🎹 MIDI: Connecting to output: ${outputDevice.name}`);
        this.output = await JZZ().openMidiOut(outputDevice.name);
      }

      this.connected = true;
      const inputName = inputDevice?.name || 'None';
      const outputName = outputDevice?.name || 'None';
      console.log(`🎹 MIDI: Connected - Input: ${inputName}, Output: ${outputName}`);
      
    } catch (error) {
      console.error('🎹 MIDI: Connection failed:', error);
      throw new Error(`Failed to connect to MIDI devices: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('🎹 MIDI: Disconnecting...');
    
    if (this.input) {
      try {
        this.input.close();
      } catch (error) {
        console.warn('🎹 MIDI: Error closing input:', error);
      }
      this.input = null;
    }

    if (this.output) {
      try {
        this.output.close();
      } catch (error) {
        console.warn('🎹 MIDI: Error closing output:', error);
      }
      this.output = null;
    }

    this.connected = false;
    this.messageCallbacks = [];
    console.log('🎹 MIDI: Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  onMessage(callback: (message: MIDIMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async sendMessage(message: MIDIMessage): Promise<void> {
    if (!this.connected || !this.output) {
      throw new Error('MIDI output not connected');
    }

    try {
      this.output.send(message.data);
      console.log(`🎹 MIDI: Sent ${message.type} message:`, message.data);
    } catch (error) {
      console.error('🎹 MIDI: Failed to send message:', error);
      throw error;
    }
  }

  private setupInputHandlers(): void {
    if (!this.input) return;

    this.input.and((msg: number[]) => {
      const message = this.parseMIDIMessage(msg);
      if (message) {
        // Emit to all callbacks
        this.messageCallbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('🎹 MIDI: Error in message callback:', error);
          }
        });
      }
    });
  }

  private parseMIDIMessage(data: number[]): MIDIMessage | null {
    if (!data || data.length === 0) return null;

    const timestamp = Date.now();
    const status = data[0]!;
    const channel = status & 0x0F;

    // Note On (0x90-0x9F)
    if (status >= 0x90 && status <= 0x9F) {
      return {
        type: 'noteon',
        channel,
        data,
        timestamp
      };
    }

    // Note Off (0x80-0x8F)
    if (status >= 0x80 && status <= 0x8F) {
      return {
        type: 'noteoff',
        channel,
        data,
        timestamp
      };
    }

    // Control Change (0xB0-0xBF)
    if (status >= 0xB0 && status <= 0xBF) {
      return {
        type: 'cc',
        channel,
        data,
        timestamp
      };
    }

    // MIDI Clock (0xF8)
    if (status === 0xF8) {
      return {
        type: 'clock',
        data,
        timestamp
      };
    }

    // Start (0xFA)
    if (status === 0xFA) {
      return {
        type: 'start',
        data,
        timestamp
      };
    }

    // Stop (0xFC)
    if (status === 0xFC) {
      return {
        type: 'stop',
        data,
        timestamp
      };
    }

    // Return raw message for unhandled types
    return {
      type: 'clock', // Default type
      data,
      timestamp
    };
  }

  // Helper methods for common MIDI operations
  async sendNoteOn(channel: number, note: number, velocity: number = 127): Promise<void> {
    const message: MIDIMessage = {
      type: 'noteon',
      channel,
      data: [0x90 | channel, note, velocity],
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  async sendNoteOff(channel: number, note: number, velocity: number = 0): Promise<void> {
    const message: MIDIMessage = {
      type: 'noteoff',
      channel,
      data: [0x80 | channel, note, velocity],
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }

  async sendControlChange(channel: number, controller: number, value: number): Promise<void> {
    const message: MIDIMessage = {
      type: 'cc',
      channel,
      data: [0xB0 | channel, controller, value],
      timestamp: Date.now()
    };
    await this.sendMessage(message);
  }
}