import type { HueBridgeInfo } from './hue-bridge-discovery.js';

// Dynamic import to handle ES module compatibility issues with node-hue-api
let hueApi: any;

export interface HueLight {
  id: string;
  name: string;
  type: string;
  modelId: string;
  uniqueId: string;
  state: {
    on: boolean;
    brightness?: number;
    hue?: number;
    saturation?: number;
    xy?: [number, number];
    colorTemperature?: number;
  };
}

export interface EntertainmentGroup {
  id: string;
  name: string;
  type: string;
  lights: string[];
  locations?: { [lightId: string]: [number, number, number] };
  stream?: {
    proxyMode: string;
    proxyNode: string;
    active: boolean;
  };
}

export interface EntertainmentSetupResult {
  success: boolean;
  group?: EntertainmentGroup;
  lights?: HueLight[];
  error?: string;
}

export class HueEntertainmentSetup {
  private ipAddress: string;
  private username: string;
  private clientKey: string | undefined;

  constructor(ipAddress: string, username: string, clientKey?: string) {
    this.ipAddress = ipAddress;
    this.username = username;
    this.clientKey = clientKey;
  }

  /**
   * Get authenticated API instance
   */
  private async getApi() {
    if (!hueApi) {
      const hueApiModule = await import('node-hue-api');
      hueApi = hueApiModule.v3;
    }

    return hueApi.v3.api.createLocal(this.ipAddress).connect(this.username);
  }

  /**
   * Discover all lights on the bridge
   */
  async discoverLights(): Promise<HueLight[]> {
    try {
      const api = await this.getApi();
      const lights = await api.lights.getAll();

      return lights.map((light: any) => ({
        id: light.id.toString(),
        name: light.name,
        type: light.type,
        modelId: light.modelId,
        uniqueId: light.uniqueId,
        state: {
          on: light.state.on,
          brightness: light.state.bri,
          hue: light.state.hue,
          saturation: light.state.sat,
          xy: light.state.xy,
          colorTemperature: light.state.ct
        }
      }));
    } catch (error: any) {
      console.error('❌ Failed to discover lights:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get all existing entertainment groups
   */
  async getEntertainmentGroups(): Promise<EntertainmentGroup[]> {
    try {
      const api = await this.getApi();
      const groups = await api.groups.getAll();

      return groups
        .filter((group: any) => group.type === 'Entertainment')
        .map((group: any) => ({
          id: group.id.toString(),
          name: group.name,
          type: group.type,
          lights: group.lights.map((id: any) => id.toString()),
          locations: group.locations,
          stream: group.stream
        }));
    } catch (error: any) {
      console.error('❌ Failed to get entertainment groups:', error?.message || error);
      throw error;
    }
  }

  /**
   * Create a new entertainment group
   */
  async createEntertainmentGroup(
    name: string,
    lightIds: string[]
  ): Promise<EntertainmentSetupResult> {
    try {
      const api = await this.getApi();

      // Validate lights exist
      const allLights = await this.discoverLights();
      const validLightIds = lightIds.filter(id => 
        allLights.some(light => light.id === id)
      );

      if (validLightIds.length === 0) {
        return {
          success: false,
          error: 'No valid light IDs provided'
        };
      }

      if (validLightIds.length !== lightIds.length) {
        console.warn(`⚠️  Some light IDs were invalid. Using ${validLightIds.length} of ${lightIds.length} lights.`);
      }

      // Create the entertainment group
      const groupData = {
        name,
        type: 'Entertainment',
        lights: validLightIds.map(id => parseInt(id)),
        'class': 'TV' // Default class for entertainment
      };

      const result = await api.groups.createGroup(groupData);
      const groupId = result.toString();

      console.log(`✅ Created entertainment group "${name}" with ID ${groupId}`);

      // Get the created group details
      const group = await api.groups.getGroupByName(name);
      const groupLights = allLights.filter(light => validLightIds.includes(light.id));

      return {
        success: true,
        group: {
          id: groupId,
          name: group.name,
          type: group.type,
          lights: validLightIds,
          locations: group.locations,
          stream: group.stream
        },
        lights: groupLights
      };

    } catch (error: any) {
      console.error('❌ Failed to create entertainment group:', error?.message || error);
      return {
        success: false,
        error: error?.message || 'Failed to create entertainment group'
      };
    }
  }

  /**
   * Start entertainment streaming for a group
   */
  async startEntertainment(groupId: string): Promise<boolean> {
    try {
      const api = await this.getApi();
      
      // Enable streaming
      await api.groups.enableStreaming(parseInt(groupId));
      console.log(`🎬 Started entertainment streaming for group ${groupId}`);
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to start entertainment streaming:', error?.message || error);
      return false;
    }
  }

  /**
   * Stop entertainment streaming for a group
   */
  async stopEntertainment(groupId: string): Promise<boolean> {
    try {
      const api = await this.getApi();
      
      // Disable streaming
      await api.groups.disableStreaming(parseInt(groupId));
      console.log(`⏹️  Stopped entertainment streaming for group ${groupId}`);
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to stop entertainment streaming:', error?.message || error);
      return false;
    }
  }

  /**
   * Interactive setup process for entertainment groups
   */
  async interactiveSetup(): Promise<{
    group: EntertainmentGroup;
    lights: HueLight[];
  } | null> {
    console.log('\n🎭 === Entertainment Group Setup ===');
    console.log('Setting up Entertainment group for synchronized lighting effects.\n');

    try {
      // Step 1: Discover lights
      console.log('Step 1: Discovering available lights...');
      const allLights = await this.discoverLights();
      
      if (allLights.length === 0) {
        console.log('❌ No lights found on the bridge');
        return null;
      }

      console.log(`\n✅ Found ${allLights.length} light(s):`);
      allLights.forEach((light, index) => {
        const status = light.state.on ? '💡 ON' : '⚫ OFF';
        console.log(`  ${index + 1}. ${light.name} (${light.type}) ${status}`);
      });

      // Step 2: Check existing entertainment groups
      console.log('\nStep 2: Checking existing Entertainment groups...');
      const existingGroups = await this.getEntertainmentGroups();
      
      if (existingGroups.length > 0) {
        console.log(`\n📺 Found ${existingGroups.length} existing Entertainment group(s):`);
        existingGroups.forEach((group, index) => {
          console.log(`  ${index + 1}. ${group.name} (${group.lights.length} lights)`);
        });

        // Use first existing group
        const selectedGroup = existingGroups[0];
        if (!selectedGroup) {
          console.log('❌ No valid entertainment group found');
          return null;
        }
        
        const groupLights = allLights.filter(light => 
          selectedGroup.lights.includes(light.id)
        );

        console.log(`\n🎯 Using existing group: ${selectedGroup.name}`);
        return {
          group: selectedGroup,
          lights: groupLights
        };
      }

      // Step 3: Create new entertainment group
      console.log('\n📺 No Entertainment groups found. Creating new group...');
      
      // For now, use all available lights (could be extended for user selection)
      const lightIds = allLights.map(light => light.id);
      const groupName = 'DJ Lighting Setup';

      console.log(`🎭 Creating Entertainment group "${groupName}" with ${lightIds.length} lights...`);
      
      const result = await this.createEntertainmentGroup(groupName, lightIds);
      
      if (!result.success) {
        console.log(`❌ Failed to create Entertainment group: ${result.error}`);
        return null;
      }

      console.log('\n🎉 Entertainment group setup completed!');
      console.log(`📺 Group: ${result.group!.name} (ID: ${result.group!.id})`);
      console.log(`💡 Lights: ${result.lights!.length} lights configured`);

      return {
        group: result.group!,
        lights: result.lights!
      };

    } catch (error: any) {
      console.error('❌ Entertainment setup failed:', error?.message || error);
      return null;
    }
  }

  /**
   * Test entertainment streaming
   */
  async testEntertainment(groupId: string): Promise<boolean> {
    console.log('\n🧪 Testing Entertainment streaming...');
    
    try {
      // Start streaming
      const started = await this.startEntertainment(groupId);
      if (!started) return false;

      console.log('⏱️  Streaming active for 3 seconds...');
      
      // Let it stream for a few seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop streaming
      const stopped = await this.stopEntertainment(groupId);
      
      if (stopped) {
        console.log('✅ Entertainment streaming test successful!');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Entertainment test failed:', error?.message || error);
      return false;
    }
  }

  /**
   * Generate configuration for the entertainment setup
   */
  generateConfig(group: EntertainmentGroup, lights: HueLight[]): {
    entertainment: any;
    lights: any;
  } {
    return {
      entertainment: {
        groupId: group.id,
        groupName: group.name,
        lightCount: lights.length,
        streamingEnabled: true
      },
      lights: lights.reduce((acc, light) => {
        acc[light.id] = {
          name: light.name,
          type: light.type,
          modelId: light.modelId,
          uniqueId: light.uniqueId
        };
        return acc;
      }, {} as any)
    };
  }
}