import { injectable } from 'inversify';
import { 
  LightController, 
  type LightDevice, 
  type LightCommand, 
  type LightState,
  type LightCapabilities 
} from '../../domain/lighting/light-controller.js';
import type { LightId, Color, Intensity, Position } from '../../domain/types.js';

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
    if (!this.connected) {
      throw new Error('Not connected to lighting system');
    }

    for (const command of commands) {
      const device = this.devices.find(d => d.id.value === command.lightId.value);
      if (device) {
        // Update device state (in a real implementation, this would be immutable)
        (device as { currentState: LightState }).currentState = command.state;
        
        // Log the command
        const { r, g, b } = command.state.color;
        const intensity = Math.round(command.state.intensity.value * 255);
        console.log(`🎭 Mock Hue: Light ${command.lightId.value} → RGB(${r},${g},${b}) @${intensity}`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}