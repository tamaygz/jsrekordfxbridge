import { injectable } from 'inversify';
// Dynamic import to handle ES module compatibility issues with node-hue-api
let hueApi: any;
import { 
  LightController, 
  type LightDevice, 
  type LightCommand, 
  type LightState,
  type LightCapabilities,
  type ColorGamut
} from '../../domain/lighting/light-controller.js';
import type { LightId, Color, Intensity } from '../../types/domain/lighting.js';
import type { Position } from '../../types/domain/devices.js';

interface HueConnectionConfig {
  readonly bridgeIp: string;
  readonly username: string;
  readonly clientKey?: string;
  readonly entertainmentGroupId?: string;
  readonly discoveryTimeout?: number;
}

interface HueLightInfo {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly capabilities: any;
  readonly state: any;
}

@injectable()
export class HueLightController extends LightController {
  private api: any = null;
  private streamingClient: any = null;
  private devices: LightDevice[] = [];
  private lightOrder: number[] = [];
  private connected = false;
  private streaming = false;

  constructor(private config: HueConnectionConfig) {
    super();
  }

  async connect(): Promise<void> {
    if (!this.config.bridgeIp || !this.config.username) {
      throw new Error('Hue bridge IP and username required. Set HUE_BRIDGE_IP and HUE_USERNAME environment variables.');
    }

    try {
      console.log('🌉 Hue: Connecting to bridge...', this.config.bridgeIp);
      
      // Dynamically import node-hue-api to handle ES module issues
      if (!hueApi) {
        const hueApiModule = await import('node-hue-api');
        hueApi = hueApiModule.v3;
      }
      
      // Connect to Hue Bridge
      this.api = await hueApi.v3.api.createLocal(this.config.bridgeIp).connect(this.config.username);
      console.log('🌉 Hue: Connected to bridge successfully');

      // Discover and map lights
      await this.discoverLights();
      
      // Start entertainment streaming if group is configured
      if (this.config.entertainmentGroupId) {
        await this.startEntertainmentStream();
      }

      this.connected = true;
      console.log(`🌉 Hue: Setup complete. ${this.devices.length} lights available`);
      
    } catch (error) {
      console.error('🌉 Hue: Connection failed:', error);
      throw new Error(`Failed to connect to Hue bridge: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('🌉 Hue: Disconnecting...');
    
    if (this.streamingClient) {
      try {
        this.streamingClient.disconnect();
      } catch (error) {
        console.warn('🌉 Hue: Error disconnecting streaming client:', error);
      }
      this.streamingClient = null;
    }

    this.streaming = false;
    this.connected = false;
    this.api = null;
    
    console.log('🌉 Hue: Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getDevices(): Promise<LightDevice[]> {
    return [...this.devices];
  }

  async sendCommands(commands: LightCommand[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Hue controller not connected');
    }

    if (this.streaming && this.streamingClient) {
      await this.sendStreamingCommands(commands);
    } else {
      await this.sendRestCommands(commands);
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
    const devices = await this.getDevices();
    const commands = devices.map(device => ({
      lightId: device.id,
      state: {
        color,
        intensity: intensity || { value: 254 }
      }
    }));
    
    await this.sendCommands(commands);
  }

  async setLightGroup(groupId: string, color: Color, intensity?: Intensity): Promise<void> {
    // Use entertainment group if available, otherwise set all lights
    if (this.config.entertainmentGroupId && groupId === this.config.entertainmentGroupId) {
      const devices = await this.getDevices();
      const entertainmentDevices = devices.filter(device => 
        this.lightOrder.includes(parseInt(String(device.id.value), 10))
      );
      
      const commands = entertainmentDevices.map(device => ({
        lightId: device.id,
        state: {
          color,
          intensity: intensity || { value: 254 }
        }
      }));
      
      await this.sendCommands(commands);
    } else {
      // Fallback to setting all lights
      await this.setAllLights(color, intensity);
    }
  }

  private async discoverLights(): Promise<void> {
    try {
      const allLights = await this.api.lights.getAll();
      console.log(`🌉 Hue: Discovered ${allLights.length} lights`);

      // If entertainment group is configured, get lights from group
      if (this.config.entertainmentGroupId) {
        await this.mapEntertainmentGroupLights();
      }

      // Fallback to all lights if no group or group mapping failed
      if (this.lightOrder.length === 0) {
        this.lightOrder = allLights.map((light: any) => parseInt(light.id, 10));
        console.log('🌉 Hue: Using all available lights');
      }

      // Convert to domain model
      this.devices = await Promise.all(
        this.lightOrder.map(async (lightId) => {
          const light = allLights.find((l: any) => parseInt(l.id, 10) === lightId);
          if (!light) {
            throw new Error(`Light ${lightId} not found`);
          }
          return this.convertToDomainLight(light);
        })
      );

      console.log(`🌉 Hue: Mapped lights: [${this.lightOrder.join(', ')}]`);
      
    } catch (error) {
      console.error('🌉 Hue: Failed to discover lights:', error);
      throw error;
    }
  }

  private async mapEntertainmentGroupLights(): Promise<void> {
    try {
      const group = await this.api.groups.getGroup(this.config.entertainmentGroupId);
      if (group && group.lights) {
        this.lightOrder = group.lights.map((l: string) => parseInt(l, 10));
        console.log(`🌉 Hue: Using entertainment group lights: [${this.lightOrder.join(', ')}]`);
      }
    } catch (error) {
      console.warn('🌉 Hue: Could not fetch entertainment group, using fallback:', error);
    }
  }

  private async startEntertainmentStream(): Promise<void> {
    if (!this.api) {
      throw new Error('Hue API not connected');
    }

    try {
      // Check if streaming is available
      if (!this.api.streaming || !this.api.streaming.createClient) {
        console.warn('🌉 Hue: Entertainment streaming not available, using REST mode');
        return;
      }

      console.log('🌉 Hue: Starting entertainment streaming...');
      
      const client = this.api.streaming.createClient();
      
      // Create light objects for streaming
      const lightObjects = this.lightOrder.map(id => ({ id }));

      // Connect to entertainment group
      await client.connect(this.config.entertainmentGroupId);
      
      this.streamingClient = client;
      this.streaming = true;
      
      console.log('🌉 Hue: Entertainment streaming started successfully');
      
    } catch (error) {
      console.warn('🌉 Hue: Failed to start entertainment streaming, falling back to REST:', error);
      this.streamingClient = null;
      this.streaming = false;
    }
  }

  private async sendStreamingCommands(commands: LightCommand[]): Promise<void> {
    if (!this.streamingClient) return;

    try {
      const frame = commands.map(command => ({
        lightId: this.parseIntId(command.lightId),
        r: Math.round(command.state.color.r),
        g: Math.round(command.state.color.g),
        b: Math.round(command.state.color.b),
        brightness: Math.round(command.state.intensity.value * 254)
      }));

      this.streamingClient.setLights(frame);
      
    } catch (error) {
      console.warn('🌉 Hue: Streaming command failed:', error);
    }
  }

  private async sendRestCommands(commands: LightCommand[]): Promise<void> {
    if (!this.api) return;

    const promises = commands.map(async (command) => {
      try {
        const lightId = this.parseIntId(command.lightId);
        if (!hueApi) {
          const hueApiModule = await import('node-hue-api');
          hueApi = hueApiModule.v3;
        }
        
        const lightState = new hueApi.lightStates.LightState()
          .on()
          .rgb(
            Math.round(command.state.color.r),
            Math.round(command.state.color.g),
            Math.round(command.state.color.b)
          )
          .brightness(Math.round(command.state.intensity.value * 254));

        await this.api.lights.setLightState(lightId.toString(), lightState);
        
      } catch (error) {
        console.warn(`🌉 Hue: REST command failed for light ${command.lightId.value}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private convertToDomainLight(hueLight: any): LightDevice {
    const colorGamut = this.convertColorGamut(hueLight.capabilities?.control?.colorgamut);
    const capabilities: LightCapabilities = {
      supportsColor: hueLight.capabilities?.control?.colorgamut !== undefined,
      supportsIntensity: true,
      supportsPosition: false, // Hue doesn't provide position info via API
      minIntensity: 0,
      maxIntensity: 1,
      ...(colorGamut && { colorGamut })
    };

    const currentState: LightState = {
      color: this.convertHueColor(hueLight.state),
      intensity: { value: (hueLight.state?.bri || 0) / 254 }
    };

    return {
      id: { value: hueLight.id.toString() },
      capabilities,
      currentState
    };
  }

  private convertColorGamut(gamut: any): ColorGamut | undefined {
    if (!gamut) return undefined;

    return {
      red: { x: gamut[0]?.[0] || 0, y: gamut[0]?.[1] || 0 },
      green: { x: gamut[1]?.[0] || 0, y: gamut[1]?.[1] || 0 },
      blue: { x: gamut[2]?.[0] || 0, y: gamut[2]?.[1] || 0 }
    };
  }

  private convertHueColor(hueState: any): Color {
    // Convert from Hue's xy color space or hue/sat to RGB
    // This is a simplified conversion - in production you'd want proper color space conversion
    if (hueState?.xy) {
      return this.xyToRgb(hueState.xy[0], hueState.xy[1], hueState.bri || 254);
    } else if (hueState?.hue !== undefined && hueState?.sat !== undefined) {
      return this.hueToRgb(hueState.hue, hueState.sat, hueState.bri || 254);
    }
    
    return { r: 255, g: 255, b: 255 }; // Default to white
  }

  private xyToRgb(x: number, y: number, brightness: number): Color {
    // Simplified XY to RGB conversion
    // In a production implementation, you'd want proper color space math
    const z = 1.0 - x - y;
    const Y = brightness / 254;
    const X = (Y / y) * x;
    const Z = (Y / y) * z;

    // Convert XYZ to RGB (simplified)
    let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let b = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

    // Normalize to 0-255 range
    r = Math.max(0, Math.min(255, Math.round(r * 255)));
    g = Math.max(0, Math.min(255, Math.round(g * 255)));
    b = Math.max(0, Math.min(255, Math.round(b * 255)));

    return { r, g, b };
  }

  private hueToRgb(hue: number, sat: number, brightness: number): Color {
    // Convert Hue's hue/saturation to RGB
    const h = (hue / 65535) * 360;
    const s = sat / 254;
    const v = brightness / 254;

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r: number, g: number, b: number;

    if (h >= 0 && h < 60) {
      [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
      [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
      [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
      [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  private parseIntId(lightId: LightId): number {
    if (typeof lightId.value === 'number') {
      return lightId.value;
    }
    return parseInt(lightId.value.toString(), 10);
  }

  // Public methods for entertainment streaming control
  async stopEntertainmentStream(): Promise<void> {
    if (this.streamingClient) {
      try {
        this.streamingClient.disconnect();
        this.streamingClient = null;
        this.streaming = false;
        console.log('🌉 Hue: Entertainment streaming stopped');
      } catch (error) {
        console.warn('🌉 Hue: Error stopping entertainment stream:', error);
      }
    }
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  getLightOrder(): readonly number[] {
    return [...this.lightOrder];
  }
}

// Factory function for easy DI container configuration
export function createHueLightController(config: {
  bridgeIp?: string;
  username?: string;
  clientKey?: string;
  entertainmentGroupId?: string;
}): HueLightController {
  const bridgeIp = config.bridgeIp || process.env.HUE_BRIDGE_IP;
  const username = config.username || process.env.HUE_USERNAME;
  const clientKey = config.clientKey || process.env.HUE_CLIENT_KEY;
  const entertainmentGroupId = config.entertainmentGroupId || process.env.HUE_ENTERTAINMENT_GROUP_ID;

  if (!bridgeIp || !username) {
    throw new Error('HUE_BRIDGE_IP and HUE_USERNAME environment variables are required');
  }

  const connectionConfig: HueConnectionConfig = {
    bridgeIp,
    username,
    discoveryTimeout: 5000,
    ...(clientKey && { clientKey }),
    ...(entertainmentGroupId && { entertainmentGroupId })
  };

  return new HueLightController(connectionConfig);
}