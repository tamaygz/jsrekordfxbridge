import { injectable } from 'inversify';
import DMX from 'dmx';
import { 
  DMXController, 
  type DMXDevice, 
  type DMXFrame,
  type DMXCapabilities,
  type DMXChannel
} from '../../domain/dmx/dmx-controller.js';
import type { DeviceId } from '../../types/domain/devices.js';

interface DMXDriverConfig {
  readonly driver: string;
  readonly device: string;
  readonly universe?: number;
}

@injectable()
export class RealDMXController extends DMXController {
  private dmx: any = null;
  private universe: any = null;
  private devices: DMXDevice[] = [];
  private connected = false;
  private channels: number[] = new Array(513).fill(0); // DMX channels 0-512

  constructor(private config: DMXDriverConfig) {
    super();
  }

  async connect(): Promise<void> {
    try {
      console.log(`🎛️  DMX: Connecting to ${this.config.driver} on ${this.config.device}...`);
      
      this.dmx = new DMX();
      this.universe = this.dmx.addUniverse(
        'main', 
        this.config.driver, 
        this.config.device
      );
      
      // Initialize mock fixtures for demo
      this.initializeFixtures();
      
      this.connected = true;
      console.log(`🎛️  DMX: Connected successfully - ${this.devices.length} fixtures available`);
      
    } catch (error) {
      console.error('🎛️  DMX: Connection failed:', error);
      // Don't throw error - gracefully degrade to non-functional but safe state
      console.warn('🎛️  DMX: Continuing without DMX support');
      this.dmx = null;
      this.universe = null;
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    console.log('🎛️  DMX: Disconnecting...');
    
    if (this.universe) {
      try {
        // Blackout before disconnecting
        await this.blackout();
      } catch (error) {
        console.warn('🎛️  DMX: Error during blackout:', error);
      }
    }

    this.connected = false;
    this.dmx = null;
    this.universe = null;
    
    console.log('🎛️  DMX: Disconnected');
  }

  isConnected(): boolean {
    return this.connected && this.universe !== null;
  }

  async getDevices(): Promise<DMXDevice[]> {
    return [...this.devices];
  }

  async sendFrame(frame: DMXFrame): Promise<void> {
    if (!this.isConnected()) {
      console.warn('🎛️  DMX: Not connected, skipping frame');
      return;
    }

    try {
      // Convert frame to DMX universe update format
      const updateData: Record<number, number> = {};
      
      for (const channel of frame.channels) {
        if (channel.channel >= 1 && channel.channel <= 512) {
          // Update our channel state
          this.channels[channel.channel] = channel.value;
          
          // Add to update batch
          updateData[channel.channel] = channel.value;
          
          // Log significant changes for debugging
          if (channel.value > 0) {
            console.log(`🎛️  DMX: Channel ${channel.channel} = ${channel.value}`);
          }
        }
      }

      // Send batch update to universe
      if (Object.keys(updateData).length > 0) {
        this.universe.update(updateData);
      }
      
    } catch (error) {
      console.error('🎛️  DMX: Failed to send frame:', error);
    }
  }

  async blackout(): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    try {
      // Set all channels to 0
      const blackoutData: Record<number, number> = {};
      for (let i = 1; i <= 512; i++) {
        blackoutData[i] = 0;
        this.channels[i] = 0;
      }
      
      this.universe.update(blackoutData);
      console.log('🎛️  DMX: Blackout - all channels set to 0');
      
    } catch (error) {
      console.error('🎛️  DMX: Blackout failed:', error);
    }
  }

  private initializeFixtures(): void {
    // Initialize some common fixture types for demo/development
    const fixtures: DMXDevice[] = [
      {
        id: { value: 'par-1' },
        channels: [1, 2, 3, 4],
        deviceType: 'RGB LED Par',
        capabilities: {
          channelCount: 4,
          supports16Bit: false,
          channelMappings: {
            'red': 1,
            'green': 2,
            'blue': 3,
            'intensity': 4
          }
        }
      },
      {
        id: { value: 'par-2' },
        channels: [5, 6, 7, 8],
        deviceType: 'RGB LED Par',
        capabilities: {
          channelCount: 4,
          supports16Bit: false,
          channelMappings: {
            'red': 5,
            'green': 6,
            'blue': 7,
            'intensity': 8
          }
        }
      },
      {
        id: { value: 'moving-head-1' },
        channels: [9, 10, 11, 12, 13, 14, 15, 16],
        deviceType: 'Moving Head Spot',
        capabilities: {
          channelCount: 8,
          supports16Bit: true,
          channelMappings: {
            'pan': 9,
            'pan_fine': 10,
            'tilt': 11,
            'tilt_fine': 12,
            'intensity': 13,
            'color': 14,
            'gobo': 15,
            'shutter': 16
          }
        }
      }
    ];

    this.devices = fixtures;
  }

  // Convenience methods for common operations
  async setChannel(channel: number, value: number): Promise<void> {
    const frame: DMXFrame = {
      channels: [{ channel, value }],
      universe: this.config.universe || 1
    };
    await this.sendFrame(frame);
  }

  async setRGBFixture(startChannel: number, r: number, g: number, b: number, intensity?: number): Promise<void> {
    const channels: DMXChannel[] = [
      { channel: startChannel, value: Math.round(r) },
      { channel: startChannel + 1, value: Math.round(g) },
      { channel: startChannel + 2, value: Math.round(b) }
    ];

    if (intensity !== undefined) {
      channels.push({ channel: startChannel + 3, value: Math.round(intensity) });
    }

    const frame: DMXFrame = {
      channels,
      universe: this.config.universe || 1
    };

    await this.sendFrame(frame);
  }

  async fadeChannel(channel: number, fromValue: number, toValue: number, durationMs: number): Promise<void> {
    const steps = Math.max(10, Math.round(durationMs / 50)); // Update every 50ms
    const stepSize = (toValue - fromValue) / steps;
    const stepDuration = durationMs / steps;

    for (let i = 0; i <= steps; i++) {
      const value = Math.round(fromValue + (stepSize * i));
      await this.setChannel(channel, value);
      
      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
  }

  getChannelValue(channel: number): number {
    if (channel >= 1 && channel <= 512) {
      return this.channels[channel]!;
    }
    return 0;
  }
}

// Factory function for easy configuration
export function createRealDMXController(config: {
  driver?: string;
  device?: string;
  universe?: number;
}): RealDMXController {
  const driver = config.driver || 'enttec-usb-dmx-pro';
  const device = config.device || process.env.DMX_DEVICE || '/dev/ttyUSB0';
  const universe = config.universe || 1;

  return new RealDMXController({
    driver,
    device,
    universe
  });
}