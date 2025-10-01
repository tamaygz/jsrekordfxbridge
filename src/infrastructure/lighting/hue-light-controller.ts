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
import { HueDtlsStreamController, type ColorUpdate } from './hue-dtls-stream.js';

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
  private streamingClient: HueDtlsStreamController | null = null;
  private devices: LightDevice[] = [];
  private lightOrder: number[] = [];
  private connected = false;
  private streaming = false;
  private streamingSetupAttempted = false;

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
        hueApi = await import('node-hue-api');
      }
      
      // Connect to Hue Bridge with client key for Entertainment API
      this.api = await hueApi.v3.api.createLocal(this.config.bridgeIp).connect(this.config.username, this.config.clientKey);
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
    
    // Stop entertainment streaming if active
    if (this.streaming) {
      try {
        await this.stopEntertainmentStream();
      } catch (error) {
        console.warn('🌉 Hue: Error stopping entertainment streaming during disconnect:', error);
      }
    }

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

    if (this.streaming) {
      // Use Entertainment streaming for real-time performance
      // This works with both DTLS and REST modes when Entertainment streaming is active
      await this.sendStreamingCommands(commands);
    } else {
      // Fall back to individual light REST API calls
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

    // Prevent multiple streaming setup attempts
    if (this.streamingSetupAttempted) {
      console.log('🌉 Hue: Entertainment streaming setup already attempted');
      return;
    }

    this.streamingSetupAttempted = true;

    try {
      // Check if we have the required client key for streaming
      if (!this.config.clientKey) {
        console.warn('🌉 Hue: No client key available, using REST mode');
        return;
      }

      console.log('🌉 Hue: Starting DTLS entertainment streaming...');
      
      // Enable streaming on the Entertainment group first
      console.log('🌉 Hue: Enabling Entertainment streaming on group...');
      const streamingEnabled = await this.api.groups.enableStreaming(this.config.entertainmentGroupId);
      
      if (!streamingEnabled) {
        console.warn('🌉 Hue: Failed to enable streaming on Entertainment group, using REST mode');
        return;
      }

      // Wait for the bridge to enable streaming mode (3 seconds as per working implementations)
      console.log('🌉 Hue: Waiting for bridge to enable streaming...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Turn on the entire Entertainment group with 0 brightness to prepare for sync mode
      await this.turnOnGroupWithZeroBrightness();

      // Create DTLS streaming client
      console.log('🌉 Hue: Creating DTLS streaming connection...');
      this.streamingClient = new HueDtlsStreamController(
        this.config.bridgeIp, 
        this.config.username, 
        this.config.clientKey
      );

      // Connect to the streaming endpoint
      try {
        await this.streamingClient.connect();
        console.log('🌉 Hue: DTLS Entertainment streaming connected successfully!');
        this.streaming = true;
      } catch (error) {
        console.warn('🌉 Hue: Failed to connect DTLS streaming, using REST mode:', error instanceof Error ? error.message : error);
        if (this.streamingClient) {
          try {
            await this.streamingClient.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        this.streamingClient = null;
        
        // Even though DTLS failed, Entertainment streaming is still enabled on the bridge
        // We can use REST mode for Entertainment streaming
        this.streaming = true;
        console.log('🌉 Hue: Entertainment streaming active in REST mode');
        
        // Turn on the Entertainment group with 0 brightness for sync mode
        await this.turnOnGroupWithZeroBrightness();
      }
      
    } catch (error) {
      console.warn('🌉 Hue: Failed to start entertainment streaming, falling back to REST:', error);
      this.streamingClient = null;
      this.streaming = false;
    }
  }

  private async sendStreamingCommands(commands: LightCommand[]): Promise<void> {
    if (this.streamingClient) {
      // Use DTLS streaming when available
      await this.sendDtlsStreamingCommands(commands);
    } else {
      // Fall back to optimized REST commands for Entertainment streaming
      await this.sendRestEntertainmentCommands(commands);
    }
  }

  private async sendDtlsStreamingCommands(commands: LightCommand[]): Promise<void> {
    if (!this.streamingClient) return;

    try {
      // Convert commands to Entertainment API RGB format
      const rgbData: { [key: number]: [number, number, number] } = {};
      
      for (const command of commands) {
        const lightId = this.parseIntId(command.lightId);
        const intensity = command.state.intensity.value;
        
        if (intensity === 0) {
          // For zero intensity, send black (off)
          rgbData[lightId] = [0, 0, 0];
        } else {
          // Apply intensity to RGB values (intensity is 0-1, use directly)
          rgbData[lightId] = [
            Math.round(command.state.color.r * intensity),
            Math.round(command.state.color.g * intensity),
            Math.round(command.state.color.b * intensity)
          ];
        }
      }

      // Convert to ColorUpdate format for DTLS streaming
      const colorUpdates: ColorUpdate[] = Object.entries(rgbData).map(([lightId, color]) => ({
        lightId: parseInt(lightId, 10),
        color: [
          Math.min(65535, Math.max(0, color[0] * 257)), // Convert 8-bit to 16-bit
          Math.min(65535, Math.max(0, color[1] * 257)),
          Math.min(65535, Math.max(0, color[2] * 257))
        ] as [number, number, number]
      }));
      
      // Send RGB data using DTLS streaming
      this.streamingClient.sendUpdate(colorUpdates);
      
    } catch (error) {
      console.warn('🌉 Hue: Streaming command failed:', error);
    }
  }

  private async sendRestEntertainmentCommands(commands: LightCommand[]): Promise<void> {
    if (!this.api) return;

    try {
      // Use Entertainment group set state for better performance than individual light calls
      // This is much faster than individual light updates when Entertainment streaming is active
      
      if (this.config.entertainmentGroupId && commands.length > 1) {
        // Try to use group command for multiple lights (more efficient)
        const firstCommand = commands[0];
        if (firstCommand && firstCommand.state && firstCommand.state.color && firstCommand.state.intensity && 
            commands.every(cmd => 
              cmd && cmd.state && cmd.state.color && cmd.state.intensity &&
              cmd.state.color.r === firstCommand.state.color.r &&
              cmd.state.color.g === firstCommand.state.color.g &&
              cmd.state.color.b === firstCommand.state.color.b &&
              cmd.state.intensity.value === firstCommand.state.intensity.value
            )) {
          // All commands are identical, use group command
          await this.sendGroupRestCommand(firstCommand);
          return;
        }
      }
      
      // Fall back to individual light commands if group command isn't applicable
      await this.sendRestCommands(commands);
      
    } catch (error) {
      console.warn('🌉 Hue: Entertainment REST commands failed:', error);
      // Final fallback to individual commands
      await this.sendRestCommands(commands);
    }
  }

  private async sendGroupRestCommand(command: LightCommand): Promise<void> {
    if (!this.api || !this.config.entertainmentGroupId) return;
    if (!command || !command.state || !command.state.intensity || !command.state.color) {
      console.warn('🌉 Hue: Invalid command structure in sendGroupRestCommand');
      return;
    }

    try {
      if (!hueApi) {
        hueApi = await import('node-hue-api');
      }
      
      const groupState = new hueApi.v3.lightStates.GroupLightState();
      
      if (command.state.intensity.value === 0) {
        groupState.off();
      } else {
        // Group brightness expects percentage (0-100), intensity.value is 0-1
        const brightnessPercent = Math.max(1, Math.round(command.state.intensity.value * 100));
        groupState
          .on()
          .brightness(brightnessPercent);
        
        // Use xy color space for groups (more reliable than rgb)
        const [x, y] = this.rgbToXy(command.state.color.r, command.state.color.g, command.state.color.b);
        groupState.xy(x, y);
      }
      
      await this.api.groups.setGroupState(this.config.entertainmentGroupId, groupState);
      
    } catch (error) {
      console.warn('🌉 Hue: Group REST command failed:', error);
      throw error;
    }
  }

  private async turnOnGroupWithZeroBrightness(): Promise<void> {
    if (!this.api || !this.config.entertainmentGroupId) return;

    try {
      if (!hueApi) {
        hueApi = await import('node-hue-api');
      }
      
      console.log('🌉 Hue: Turning on Entertainment group with 0 brightness for sync mode...');
      
      // Create a group state that turns on lights with minimum brightness (1%)
      // This ensures lights are in "on" state but appear off to the user
      const groupState = new hueApi.v3.lightStates.GroupLightState()
        .on()
        .brightness(1); // Minimum brightness (1%) - lights are on but appear off
      
      await this.api.groups.setGroupState(this.config.entertainmentGroupId, groupState);
      console.log('🌉 Hue: Entertainment group lights turned on with minimum brightness');
      
    } catch (error) {
      console.warn('🌉 Hue: Failed to turn on Entertainment group:', error);
      // Don't throw error - this is not critical for streaming functionality
    }
  }

  private async sendRestCommands(commands: LightCommand[]): Promise<void> {
    if (!this.api) return;

    const promises = commands.map(async (command) => {
      try {
        if (!command || !command.state || !command.state.intensity || !command.state.color) {
          console.warn('🌉 Hue: Invalid command structure in sendRestCommands');
          return;
        }
        
        const lightId = this.parseIntId(command.lightId);
        if (!hueApi) {
          hueApi = await import('node-hue-api');
        }
        
        const lightState = new hueApi.v3.lightStates.LightState();
        
        if (command.state.intensity.value === 0) {
          // Turn light off for zero intensity
          lightState.off();
        } else {
          // Convert intensity from 0-1 to percentage (0-100)
          const brightnessPercent = Math.max(1, Math.round(command.state.intensity.value * 100));
          lightState
            .on()
            .rgb(
              Math.round(command.state.color.r),
              Math.round(command.state.color.g),
              Math.round(command.state.color.b)
            )
            .brightness(brightnessPercent);
        }

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
    try {
      // Close DTLS streaming client if active
      if (this.streamingClient) {
        console.log('🌉 Hue: Closing DTLS streaming connection...');
        await this.streamingClient.close();
        this.streamingClient = null;
      }

      // Disable Entertainment streaming mode on the bridge
      const wasStreaming = this.streaming;
      if (this.api && this.config.entertainmentGroupId && wasStreaming) {
        console.log('🌉 Hue: Disabling Entertainment streaming on group...');
        try {
          // Use the proper disableStreaming method instead of setGroupState
          await this.api.groups.disableStreaming(this.config.entertainmentGroupId);
          console.log('🌉 Hue: Entertainment streaming disabled on bridge');
        } catch (error) {
          console.warn('🌉 Hue: Failed to disable streaming on bridge:', error);
        }
      }

      this.streaming = false;
      this.streamingSetupAttempted = false; // Allow setup again if needed
      console.log('🌉 Hue: Entertainment streaming stopped');
    } catch (error) {
      console.warn('🌉 Hue: Error stopping entertainment stream:', error);
    }
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  async shutdown(): Promise<void> {
    console.log('🌉 Hue: Shutting down controller...');
    
    try {
      // Stop entertainment streaming if active
      if (this.streaming) {
        await this.stopEntertainmentStream();
      }
      
      // Additional cleanup can be added here
      this.connected = false;
      console.log('🌉 Hue: Controller shutdown complete');
    } catch (error) {
      console.warn('🌉 Hue: Error during shutdown:', error);
    }
  }

  getLightOrder(): readonly number[] {
    return [...this.lightOrder];
  }

  private rgbToXy(r: number, g: number, b: number): [number, number] {
    // Normalize RGB values to 0-1
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;

    // Apply gamma correction
    const redCorrected = (red > 0.04045) ? Math.pow((red + 0.055) / 1.055, 2.4) : (red / 12.92);
    const greenCorrected = (green > 0.04045) ? Math.pow((green + 0.055) / 1.055, 2.4) : (green / 12.92);
    const blueCorrected = (blue > 0.04045) ? Math.pow((blue + 0.055) / 1.055, 2.4) : (blue / 12.92);

    // Convert to XYZ color space
    const X = redCorrected * 0.664511 + greenCorrected * 0.154324 + blueCorrected * 0.162028;
    const Y = redCorrected * 0.283881 + greenCorrected * 0.668433 + blueCorrected * 0.047685;
    const Z = redCorrected * 0.000088 + greenCorrected * 0.072310 + blueCorrected * 0.986039;

    // Convert to xy chromaticity coordinates
    const sum = X + Y + Z;
    if (sum === 0) {
      return [0.3127, 0.3290]; // Default white point
    }

    const x = X / sum;
    const y = Y / sum;

    // Clamp to Hue gamut
    return [
      Math.max(0, Math.min(1, x)),
      Math.max(0, Math.min(1, y))
    ];
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