// Dynamic import to handle ES module compatibility issues with node-hue-api
let hueApi: any;

export interface DiscoveredBridge {
  id: string;
  name: string;
  ipAddress: string;
  modelId: string;
  factoryNew: boolean;
  replacesBridgeId?: string;
  dataStoreVersion: string;
  starterKitId?: string;
  softwareVersion: string;
  apiVersion: string;
  swVersion: string;
  localTime: string;
  timeZone: string;
  portalservices: boolean;
  linkButton: boolean;
  touchLink: boolean;
  proxyAddress?: string;
  proxyPort?: number;
  mac: string;
  netmask: string;
  gateway: string;
  dhcp: boolean;
}

export interface HueBridgeInfo {
  bridge: DiscoveredBridge;
  config: any; // Use any for now since we're dynamically importing
  isReachable: boolean;
  isAuthenticated: boolean;
  entertainmentGroups?: any[];
}

export class HueBridgeDiscovery {
  private discoveredBridges: Map<string, HueBridgeInfo> = new Map();

  /**
   * Discover Hue bridges on the local network
   */
  async discoverBridges(timeout = 10000): Promise<HueBridgeInfo[]> {
    console.log('🔍 Discovering Hue bridges on local network...');
    
    try {
      // Dynamically import node-hue-api to handle ES module issues
      if (!hueApi) {
        hueApi = await import('node-hue-api');
      }
      
      // Use N-UPnP discovery (more reliable than mDNS in ES modules)
      const searchResults = await hueApi.discovery.nupnpSearch();
      
      console.log(`📡 Found ${searchResults.length} bridge(s) via N-UPnP`);
      
      const bridgeInfos: HueBridgeInfo[] = [];
      
      for (const bridge of searchResults) {
        console.log(`\n🌉 Checking bridge: ${bridge.ipaddress}`);
        
        try {
          // Get detailed bridge information
          const unauthenticatedApi = v3.api.createLocal(bridge.ipaddress);
          const config = await unauthenticatedApi.configuration.getAll();
          
          const bridgeInfo: HueBridgeInfo = {
            bridge: {
              id: config.bridgeid || bridge.config?.bridgeid,
              name: config.name,
              ipAddress: bridge.ipaddress,
              modelId: config.modelid,
              factoryNew: config.factorynew,
              replacesBridgeId: config.replacesbridgeid,
              dataStoreVersion: config.datastoreversion,
              starterKitId: config.starterkitid,
              softwareVersion: config.swversion,
              apiVersion: config.apiversion,
              swVersion: config.swversion,
              localTime: config.localtime,
              timeZone: config.timezone,
              portalservices: config.portalservices,
              linkButton: config.linkbutton,
              touchLink: config.touchlink,
              proxyAddress: config.proxyaddress,
              proxyPort: config.proxyport,
              mac: config.mac,
              netmask: config.netmask,
              gateway: config.gateway,
              dhcp: config.dhcp
            },
            config: config,
            isReachable: true,
            isAuthenticated: false
          };
          
          this.discoveredBridges.set(bridge.ipaddress, bridgeInfo);
          bridgeInfos.push(bridgeInfo);
          
          console.log(`✅ Bridge "${config.name}" (${bridge.ipaddress}) - Software: ${config.swversion}`);
          
        } catch (error: any) {
          console.warn(`⚠️  Could not get config for bridge ${bridge.ipaddress}:`, error?.message || error);
        }
      }
      
      return bridgeInfos;
      
    } catch (error: any) {
      console.error('❌ Error discovering bridges:', error);
      throw new Error(`Failed to discover Hue bridges: ${error?.message || error}`);
    }
  }

  /**
   * Test authentication with a bridge
   */
  async testAuthentication(ipAddress: string, username: string): Promise<boolean> {
    try {
      if (!hueApi) {
        hueApi = await import('node-hue-api');
      }
      
      const api = hueApi.api.createLocal(ipAddress).connect(username);
      await authenticatedApi.configuration.getAll();
      
      // Update bridge info
      const bridgeInfo = this.discoveredBridges.get(ipAddress);
      if (bridgeInfo) {
        bridgeInfo.isAuthenticated = true;
        this.discoveredBridges.set(ipAddress, bridgeInfo);
      }
      
      return true;
    } catch (error: any) {
      console.warn(`🔐 Authentication failed for ${ipAddress}:`, error?.message || error);
      return false;
    }
  }

  /**
   * Get detailed information about a specific bridge
   */
  async getBridgeDetails(ipAddress: string, username?: string): Promise<HueBridgeInfo | null> {
    const bridgeInfo = this.discoveredBridges.get(ipAddress);
    if (!bridgeInfo) {
      return null;
    }

    if (username) {
      try {
        if (!v3) {
          const hueApi = await import('node-hue-api');
          v3 = hueApi.v3;
        }
        
        const authenticatedApi = await v3.api.createLocal(ipAddress).connect(username);
        
        // Get entertainment groups
        const groups = await authenticatedApi.groups.getAll();
        const entertainmentGroups = groups.filter((group: any) => group.type === 'Entertainment');
        
        bridgeInfo.entertainmentGroups = entertainmentGroups;
        bridgeInfo.isAuthenticated = true;
        
        console.log(`🎪 Found ${entertainmentGroups.length} Entertainment group(s)`);
        
      } catch (error: any) {
        console.warn(`⚠️  Could not get entertainment groups:`, error?.message || error);
      }
    }

    return bridgeInfo;
  }

  /**
   * Get all discovered bridges
   */
  getDiscoveredBridges(): HueBridgeInfo[] {
    return Array.from(this.discoveredBridges.values());
  }

  /**
   * Get a specific bridge by IP
   */
  getBridge(ipAddress: string): HueBridgeInfo | undefined {
    return this.discoveredBridges.get(ipAddress);
  }

  /**
   * Check if any bridges support Entertainment API
   */
  hasEntertainmentCapableBridges(): boolean {
    return Array.from(this.discoveredBridges.values()).some(
      bridge => this.isEntertainmentCapable(bridge)
    );
  }

  /**
   * Check if a bridge supports Entertainment API
   */
  private isEntertainmentCapable(bridgeInfo: HueBridgeInfo): boolean {
    // Entertainment API requires API version 1.22+ and software version 1.22+
    const apiVersion = bridgeInfo.config.apiversion;
    const swVersion = bridgeInfo.config.swversion;
    
    const minApiVersion = '1.22.0';
    const minSwVersion = '1.22.0';
    
    return this.compareVersions(apiVersion, minApiVersion) >= 0 &&
           this.compareVersions(swVersion, minSwVersion) >= 0;
  }

  /**
   * Simple version comparison
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(n => parseInt(n, 10));
    const v2Parts = version2.split('.').map(n => parseInt(n, 10));
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }
}