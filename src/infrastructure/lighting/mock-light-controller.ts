import { injectable } from 'inversify';
import { 
  LightController, 
  type LightDevice, 
  type LightCommand, 
  type LightState,
  type LightCapabilities 
} from '../../domain/lighting/light-controller.js';
import type { LightId, Color, Intensity } from '../../types/domain/lighting.js';
import type { Position } from '../../types/domain/devices.js';

@injectable()
export class MockLightController extends LightController {
  private devices: LightDevice[] = [];
  private connected = false;

  constructor() {
    super();
    this.initializeMockDevices();
  }

  private initializeMockDevices(): void {
    const capabilities: LightCapabilities = {
      supportsColor: true,
      supportsIntensity: true,
      supportsPosition: false,
      minIntensity: 0,
      maxIntensity: 1
    };

    const defaultState: LightState = {
      color: { r: 0, g: 0, b: 0 },
      intensity: { value: 0 }
    };

    this.devices = Array.from({ length: 6 }, (_, i) => ({
      id: { value: (i + 1).toString() },
      capabilities,
      currentState: defaultState
    }));
  }

  async connect(): Promise<void> {
    console.log('🎭 Mock Hue: Connecting to bridge...');
    await this.delay(500);
    this.connected = true;
    console.log(`🎭 Mock Hue: Connected! Devices: [${this.devices.map(d => d.id.value).join(', ')}]`);
  }

  async disconnect(): Promise<void> {
    console.log('🎭 Mock Hue: Disconnecting...');
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getDevices(): Promise<LightDevice[]> {
    return [...this.devices];
  }

  async sendCommands(commands: LightCommand[]): Promise<void> {
    console.log(`💡 Mock: Sending ${commands.length} light commands`);
    
    for (const command of commands) {
      const { r, g, b } = command.state.color;
      const intensity = command.state.intensity.value;
      console.log(`💡 Mock: Light ${command.lightId.value} -> RGB(${r}, ${g}, ${b}) @ ${intensity}`);
      
      // Update mock state
      const device = this.devices.find(d => d.id.value === command.lightId.value);
      if (device) {
        (device as any).currentState = { ...command.state };
      }
    }
  }

  async setLight(lightId: LightId, color: Color, intensity?: Intensity): Promise<void> {
    const command: LightCommand = {
      lightId,
      state: {
        color,
        intensity: intensity || { value: 254 }
      }
    };
    
    await this.sendCommands([command]);
  }

  async setAllLights(color: Color, intensity?: Intensity): Promise<void> {
    const commands = this.devices.map(device => ({
      lightId: device.id,
      state: {
        color,
        intensity: intensity || { value: 254 }
      }
    }));
    
    await this.sendCommands(commands);
  }

  async setLightGroup(groupId: string, color: Color, intensity?: Intensity): Promise<void> {
    // For mock implementation, just set all lights
    console.log(`💡 Mock: Setting group "${groupId}" (applying to all lights)`);
    await this.setAllLights(color, intensity);
  }

  getLightOrder(): readonly number[] {
    // For mock, return sequential light IDs
    return this.devices.map(device => parseInt(String(device.id.value), 10));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}