import { HueBridgeDiscovery, type HueBridgeInfo } from './hue-bridge-discovery.js';

// Dynamic import to handle ES module compatibility issues with node-hue-api
let hueApi: any;

export interface AuthenticationResult {
  success: boolean;
  username?: string;
  clientKey?: string;
  error?: string;
}

export interface AuthenticationRequest {
  appName: string;
  deviceName: string;
  generateClientKey?: boolean;
}

export class HueBridgeAuthenticator {
  private discovery: HueBridgeDiscovery;

  constructor() {
    this.discovery = new HueBridgeDiscovery();
  }

  /**
   * Create a new user on the Hue bridge
   * User must press the link button on the bridge before calling this
   */
  async authenticateWithBridge(
    ipAddress: string, 
    request: AuthenticationRequest
  ): Promise<AuthenticationResult> {
    try {
      if (!hueApi) {
        hueApi = await import('node-hue-api');
      }
      
      console.log(`🔐 Attempting to authenticate with bridge at ${ipAddress}...`);
      
      const unauthenticatedApi = hueApi.api.createLocal(ipAddress);      // Create user request
      const userRequest = {
        devicetype: `${request.appName}#${request.deviceName}`,
        ...(request.generateClientKey && { generateclientkey: true })
      };

      const createdUser = await unauthenticatedApi.users.createUser(
        request.appName,
        request.deviceName,
        request.generateClientKey
      );

      console.log('✅ Authentication successful!');
      
      return {
        success: true,
        username: createdUser.username,
        clientKey: createdUser.clientkey
      };

    } catch (error: any) {
      console.error('❌ Authentication failed:', error?.message || error);
      
      // Handle specific error cases
      if (error?.message?.includes('link button not pressed')) {
        return {
          success: false,
          error: 'Please press the link button on your Hue bridge and try again within 30 seconds'
        };
      }
      
      return {
        success: false,
        error: error?.message || 'Unknown authentication error'
      };
    }
  }

  /**
   * Wait for link button press and authenticate
   * Polls the bridge until authentication succeeds or timeout
   */
  async waitForLinkButtonAndAuthenticate(
    ipAddress: string,
    request: AuthenticationRequest,
    timeoutMs = 30000,
    pollIntervalMs = 1000
  ): Promise<AuthenticationResult> {
    console.log('🔄 Waiting for link button press...');
    console.log('👆 Please press the link button on your Hue bridge now!');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.authenticateWithBridge(ipAddress, request);
      
      if (result.success) {
        return result;
      }
      
      // If it's not a link button error, stop trying
      if (!result.error?.includes('link button')) {
        return result;
      }
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      process.stdout.write('.');
    }
    
    console.log('\n⏰ Timeout waiting for link button press');
    return {
      success: false,
      error: 'Timeout waiting for link button press. Please try again.'
    };
  }

  /**
   * Test if existing credentials work
   */
  async testExistingCredentials(ipAddress: string, username: string): Promise<boolean> {
    return await this.discovery.testAuthentication(ipAddress, username);
  }

  /**
   * Get bridge information including capabilities
   */
  async getBridgeInfo(ipAddress: string): Promise<HueBridgeInfo | null> {
    const bridges = await this.discovery.discoverBridges();
    return bridges.find(bridge => bridge.bridge.ipAddress === ipAddress) || null;
  }

  /**
   * Discover and authenticate with the first available bridge
   * This method combines discovery and authentication for convenience
   */
  async discoverAndAuthenticate(request: AuthenticationRequest): Promise<{
    bridgeInfo: HueBridgeInfo;
    authentication: AuthenticationResult;
  } | null> {
    console.log('🔍 Discovering bridges...');
    const bridges = await this.discovery.discoverBridges();
    
    if (bridges.length === 0) {
      console.log('❌ No Hue bridges found on the network');
      return null;
    }

    // Use first bridge found
    const bridge = bridges[0];
    if (!bridge) {
      console.log('❌ No valid bridge found');
      return null;
    }
    
    console.log(`🌉 Using bridge: ${bridge.bridge.name} (${bridge.bridge.ipAddress})`);
    
    const authentication = await this.waitForLinkButtonAndAuthenticate(
      bridge.bridge.ipAddress,
      request
    );

    return {
      bridgeInfo: bridge,
      authentication
    };
  }

  /**
   * Interactive setup process that guides user through authentication
   */
  async interactiveSetup(appName = 'JSRekordFXBridge', deviceName = 'DJ-Controller'): Promise<{
    bridgeInfo: HueBridgeInfo;
    credentials: { username: string; clientKey?: string };
  } | null> {
    console.log('\n🌉 === Hue Bridge Setup ===');
    console.log('This will help you connect to your Philips Hue bridge.\n');

    // Step 1: Discover bridges
    console.log('Step 1: Discovering Hue bridges...');
    const bridges = await this.discovery.discoverBridges();
    
    if (bridges.length === 0) {
      console.log('❌ No Hue bridges found on your network.');
      console.log('Please ensure:');
      console.log('  • Your Hue bridge is powered on');
      console.log('  • Your computer is on the same network as the bridge');
      console.log('  • The bridge has been set up with the Philips Hue app');
      return null;
    }

    // Display found bridges
    console.log(`\n✅ Found ${bridges.length} bridge(s):`);
    bridges.forEach((bridge, index) => {
      console.log(`  ${index + 1}. ${bridge.bridge.name} (${bridge.bridge.ipAddress})`);
      console.log(`     Model: ${bridge.bridge.modelId}, Software: ${bridge.bridge.softwareVersion}`);
    });

    // Use first bridge (could be extended to let user choose)
    const selectedBridge = bridges[0];
    if (!selectedBridge) {
      console.log('❌ No valid bridge available');
      return null;
    }
    
    console.log(`\n🎯 Using: ${selectedBridge.bridge.name} (${selectedBridge.bridge.ipAddress})\n`);

    // Step 2: Authentication
    console.log('Step 2: Authentication');
    console.log('📱 Please press the LINK BUTTON on your Hue bridge now!');
    console.log('⏱️  You have 30 seconds...\n');

    const authResult = await this.waitForLinkButtonAndAuthenticate(
      selectedBridge.bridge.ipAddress,
      {
        appName,
        deviceName,
        generateClientKey: true
      }
    );

    if (!authResult.success) {
      console.log(`\n❌ Authentication failed: ${authResult.error}`);
      return null;
    }

    console.log('\n🎉 Authentication successful!');
    console.log(`👤 Username: ${authResult.username}`);
    if (authResult.clientKey) {
      console.log(`🔑 Client Key: ${authResult.clientKey}`);
    }

    const credentials: { username: string; clientKey?: string } = {
      username: authResult.username!
    };
    
    if (authResult.clientKey) {
      credentials.clientKey = authResult.clientKey;
    }

    return {
      bridgeInfo: selectedBridge,
      credentials
    };
  }

  /**
   * Generate environment variables for the authenticated bridge
   */
  generateEnvConfig(bridgeInfo: HueBridgeInfo, credentials: { username: string; clientKey?: string }): string {
    const envConfig = [
      '# Philips Hue Configuration',
      '# Generated by JSRekordFXBridge setup',
      '',
      `HUE_BRIDGE_IP=${bridgeInfo.bridge.ipAddress}`,
      `HUE_BRIDGE_ID=${bridgeInfo.bridge.id}`,
      `HUE_USERNAME=${credentials.username}`,
      `HUE_USER_ID=${credentials.username}`,
      ...(credentials.clientKey ? [`HUE_CLIENT_KEY=${credentials.clientKey}`] : []),
      '',
      '# Set to false to enable real hardware mode',
      'DEMO_MODE=false',
      ''
    ];

    return envConfig.join('\n');
  }
}