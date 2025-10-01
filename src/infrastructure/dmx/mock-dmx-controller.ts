import { injectable } from 'inversify';
import { 
  DMXController, 
  type DMXDevice, 
  type DMXFrame, 
  type DMXCapabilities,
  type DMXChannel 
} from '../../domain/dmx/dmx-controller.js';
import type { DeviceId } from '../../domain/types.js';

@injectable()
export class MockDMXController extends DMXController {
  private devices: DMXDevice[] = [];
  private connected = false;
  private channels: number[] = new Array(513).fill(0); // DMX channels 0-512

  constructor() {
    super();
    this.initializeMockDevices();
  }

  private initializeMockDevices(): void {
    const capabilities: DMXCapabilities = {
      channelCount: 4,
      supports16Bit: false,
      channelMappings: {
        'red': 1,
        'green': 2,
        'blue': 3,
        'intensity': 4
      }
    };

    this.devices = [
      {
        id: { value: 'dmx-fixture-1' },
        channels: [1, 2, 3, 4],
        deviceType: 'RGB LED Par',
        capabilities
      },
      {
        id: { value: 'dmx-fixture-2' },
        channels: [5, 6, 7, 8],
        deviceType: 'RGB LED Par',
        capabilities
      }
    ];
  }

  async connect(): Promise<void> {
    console.log('🎛️  Mock DMX: Connecting...');
    await this.delay(200);
    this.connected = true;
    console.log('🎛️  Mock DMX: Connected to mock universe');
  }

  async disconnect(): Promise<void> {
    console.log('🎛️  Mock DMX: Disconnecting...');
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getDevices(): Promise<DMXDevice[]> {
    return [...this.devices];
  }

  async sendFrame(frame: DMXFrame): Promise<void> {
    if (!this.connected) {
      throw new Error('DMX controller not connected');
    }

    // Update our channel state
    for (const channel of frame.channels) {
      if (channel.channel >= 1 && channel.channel <= 512) {
        this.channels[channel.channel] = channel.value;
        
        // Log significant changes
        if (channel.value > 0) {
          console.log(`🎛️  Mock DMX: Channel ${channel.channel} = ${channel.value}`);
        }
      }
    }
  }

  async blackout(): Promise<void> {
    if (!this.connected) return;

    this.channels.fill(0);
    console.log('🎛️  Mock DMX: Blackout - all channels set to 0');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}