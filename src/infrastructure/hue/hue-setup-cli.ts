#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { HueBridgeAuthenticator } from './hue-bridge-authenticator.js';
import { HueEntertainmentSetup } from './hue-entertainment-setup.js';

export interface HueSetupResult {
  success: boolean;
  bridgeInfo?: any;
  credentials?: { username: string; clientKey?: string };
  entertainmentGroup?: any;
  lights?: any[];
  configGenerated?: boolean;
  error?: string;
}

export class HueSetupCLI {
  private projectRoot: string;
  private envPath: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.envPath = path.join(this.projectRoot, '.env');
  }

  /**
   * Complete Hue setup process
   */
  async setupHue(): Promise<HueSetupResult> {
    console.log('\n🌈 ===============================');
    console.log('🎭 JSRekordFXBridge - Hue Setup');
    console.log('🌈 ===============================\n');

    console.log('Welcome to the Philips Hue setup wizard!');
    console.log('This will help you connect your Hue bridge and configure Entertainment groups.\n');

    try {
      // Step 1: Bridge Discovery & Authentication
      console.log('🔍 === STEP 1: Bridge Authentication ===\n');
      
      const authenticator = new HueBridgeAuthenticator();
      const authResult = await authenticator.interactiveSetup();
      
      if (!authResult) {
        return {
          success: false,
          error: 'Failed to authenticate with Hue bridge'
        };
      }

      const { bridgeInfo, credentials } = authResult;

      // Step 2: Entertainment Group Setup
      console.log('\n🎭 === STEP 2: Entertainment Groups ===\n');
      
      const entertainmentSetup = new HueEntertainmentSetup(
        bridgeInfo.bridge.ipAddress,
        credentials.username,
        credentials.clientKey
      );

      const entertainmentResult = await entertainmentSetup.interactiveSetup();
      
      if (!entertainmentResult) {
        console.log('⚠️  Warning: Entertainment group setup failed, but bridge authentication succeeded.');
        console.log('You can manually create Entertainment groups using the Philips Hue app.\n');
      }

      // Step 3: Test Entertainment Streaming (if available)
      if (entertainmentResult && credentials.clientKey) {
        console.log('\n🧪 === STEP 3: Testing Entertainment ===\n');
        const testSuccess = await entertainmentSetup.testEntertainment(entertainmentResult.group.id);
        
        if (testSuccess) {
          console.log('✅ Entertainment streaming test passed!');
        } else {
          console.log('⚠️  Entertainment streaming test failed, but setup can continue.');
        }
      }

      // Step 4: Generate Configuration
      console.log('\n⚙️  === STEP 4: Configuration ===\n');
      
      const configGenerated = await this.generateConfiguration(
        bridgeInfo,
        credentials,
        entertainmentResult || undefined
      );

      // Step 5: Summary
      console.log('\n🎉 === SETUP COMPLETE ===\n');
      this.printSetupSummary(bridgeInfo, credentials, entertainmentResult || undefined, configGenerated);

      const result: HueSetupResult = {
        success: true,
        bridgeInfo,
        credentials,
        configGenerated
      };

      if (entertainmentResult) {
        result.entertainmentGroup = entertainmentResult.group;
        result.lights = entertainmentResult.lights;
      }

      return result;

    } catch (error: any) {
      console.error('\n❌ Setup failed:', error?.message || error);
      return {
        success: false,
        error: error?.message || 'Unknown setup error'
      };
    }
  }

  /**
   * Generate configuration files
   */
  private async generateConfiguration(
    bridgeInfo: any,
    credentials: { username: string; clientKey?: string },
    entertainmentResult?: { group: any; lights: any[] }
  ): Promise<boolean> {
    try {
      // Generate environment configuration
      const authenticator = new HueBridgeAuthenticator();
      const envConfig = authenticator.generateEnvConfig(bridgeInfo, credentials);

      // Add entertainment configuration if available
      let fullConfig = envConfig;
      
      if (entertainmentResult) {
        const entertainmentSetup = new HueEntertainmentSetup(
          bridgeInfo.bridge.ipAddress,
          credentials.username,
          credentials.clientKey
        );
        
        const entertainmentConfig = entertainmentSetup.generateConfig(
          entertainmentResult.group,
          entertainmentResult.lights
        );

        fullConfig += `\n# Entertainment Group Configuration\n`;
        fullConfig += `HUE_ENTERTAINMENT_GROUP_ID=${entertainmentConfig.entertainment.groupId}\n`;
        fullConfig += `HUE_ENTERTAINMENT_GROUP_NAME="${entertainmentConfig.entertainment.groupName}"\n`;
        fullConfig += `HUE_LIGHT_COUNT=${entertainmentConfig.entertainment.lightCount}\n`;
      }

      // Write to .env file
      const envExists = fs.existsSync(this.envPath);
      
      if (envExists) {
        console.log('📝 Updating existing .env file...');
        const existingEnv = fs.readFileSync(this.envPath, 'utf8');
        
        // Parse the generated config to get key-value pairs
        const configLines = fullConfig.split('\n').filter(line => 
          line.trim() && !line.trim().startsWith('#')
        );
        
        let updatedEnv = existingEnv;
        
        // Update each configuration value in the existing file
        for (const line of configLines) {
          const [key, value] = line.split('=', 2);
          if (key && value !== undefined) {
            const keyRegex = new RegExp(`^${key.trim()}=.*$`, 'm');
            if (keyRegex.test(updatedEnv)) {
              // Replace existing key
              updatedEnv = updatedEnv.replace(keyRegex, `${key.trim()}=${value.trim()}`);
              console.log(`  ✅ Updated ${key.trim()}`);
            } else {
              // Add new key at the end
              updatedEnv += `\n${key.trim()}=${value.trim()}`;
              console.log(`  ➕ Added ${key.trim()}`);
            }
          }
        }
        
        fs.writeFileSync(this.envPath, updatedEnv);
      } else {
        console.log('📝 Creating new .env file...');
        fs.writeFileSync(this.envPath, fullConfig);
      }

      console.log(`✅ Configuration saved to: ${this.envPath}`);

      // Generate a summary config file for reference
      const summaryPath = path.join(this.projectRoot, 'hue-setup-summary.json');
      const summary = {
        timestamp: new Date().toISOString(),
        bridge: {
          name: bridgeInfo.bridge.name,
          ipAddress: bridgeInfo.bridge.ipAddress,
          id: bridgeInfo.bridge.id,
          modelId: bridgeInfo.bridge.modelId,
          softwareVersion: bridgeInfo.bridge.softwareVersion
        },
        authentication: {
          username: credentials.username,
          hasClientKey: !!credentials.clientKey
        },
        entertainment: entertainmentResult ? {
          groupId: entertainmentResult.group.id,
          groupName: entertainmentResult.group.name,
          lightCount: entertainmentResult.lights.length,
          lights: entertainmentResult.lights.map(light => ({
            id: light.id,
            name: light.name,
            type: light.type
          }))
        } : null
      };

      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`📋 Setup summary saved to: ${summaryPath}`);

      return true;

    } catch (error: any) {
      console.error('❌ Failed to generate configuration:', error?.message || error);
      return false;
    }
  }

  /**
   * Print setup summary
   */
  private printSetupSummary(
    bridgeInfo: any,
    credentials: { username: string; clientKey?: string },
    entertainmentResult?: { group: any; lights: any[] },
    configGenerated?: boolean
  ): void {
    console.log('🌉 Bridge Information:');
    console.log(`   • Name: ${bridgeInfo.bridge.name}`);
    console.log(`   • IP Address: ${bridgeInfo.bridge.ipAddress}`);
    console.log(`   • Model: ${bridgeInfo.bridge.modelId}`);
    console.log(`   • Software: ${bridgeInfo.bridge.softwareVersion}`);

    console.log('\n🔐 Authentication:');
    console.log(`   • Username: ${credentials.username}`);
    console.log(`   • Client Key: ${credentials.clientKey ? 'Yes ✅' : 'No ❌'}`);

    if (entertainmentResult) {
      console.log('\n🎭 Entertainment Group:');
      console.log(`   • Group: ${entertainmentResult.group.name} (ID: ${entertainmentResult.group.id})`);
      console.log(`   • Lights: ${entertainmentResult.lights.length} configured`);
      
      if (entertainmentResult.lights.length > 0) {
        console.log('   • Light Details:');
        entertainmentResult.lights.forEach(light => {
          console.log(`     - ${light.name} (${light.type})`);
        });
      }
    }

    console.log(`\n⚙️  Configuration: ${configGenerated ? 'Generated ✅' : 'Failed ❌'}`);

    console.log('\n🚀 Next Steps:');
    console.log('   1. Review the generated .env file');
    console.log('   2. Set DEMO_MODE=false to enable real hardware');
    console.log('   3. Run your JSRekordFXBridge application');
    console.log('   4. Test your lighting effects with real hardware!');

    if (!credentials.clientKey) {
      console.log('\n⚠️  Note: No client key was generated.');
      console.log('   Entertainment streaming may have limited functionality.');
      console.log('   Consider updating your bridge firmware for full Entertainment API support.');
    }

    console.log('\n🎉 Setup complete! Your Hue bridge is ready for use.\n');
  }

  /**
   * Manual setup with a specific IP address
   */
  async setupHueManual(ipAddress: string): Promise<HueSetupResult> {
    console.log('\n🌈 ===============================');
    console.log('🎭 JSRekordFXBridge - Manual Hue Setup');
    console.log('🌈 ===============================\n');

    console.log(`Connecting to Hue bridge at: ${ipAddress}`);
    console.log('This will help you authenticate and configure Entertainment groups.\n');

    try {
      // Step 1: Manual Bridge Authentication
      console.log('🔍 === STEP 1: Bridge Authentication ===\n');
      
      const authenticator = new HueBridgeAuthenticator();
      const authResult = await authenticator.manualSetup(ipAddress);
      
      if (!authResult) {
        return {
          success: false,
          error: 'Failed to authenticate with Hue bridge'
        };
      }

      const { bridgeInfo, credentials } = authResult;

      // Step 2: Entertainment Group Setup
      console.log('\n🎭 === STEP 2: Entertainment Groups ===\n');
      
      const entertainmentSetup = new HueEntertainmentSetup(
        ipAddress,
        credentials.username,
        credentials.clientKey
      );

      const entertainmentResult = await entertainmentSetup.interactiveSetup();
      
      if (!entertainmentResult) {
        console.log('⚠️  Warning: Entertainment group setup failed, but bridge authentication succeeded.');
        console.log('You can manually create Entertainment groups using the Philips Hue app.\n');
      }

      // Step 3: Test Entertainment Streaming (if available)
      if (entertainmentResult && credentials.clientKey) {
        console.log('\n🧪 === STEP 3: Testing Entertainment ===\n');
        const testSuccess = await entertainmentSetup.testEntertainment(entertainmentResult.group.id);
        
        if (testSuccess) {
          console.log('✅ Entertainment streaming test passed!');
        } else {
          console.log('⚠️  Entertainment streaming test failed, but setup can continue.');
        }
      }

      // Step 4: Generate Configuration
      console.log('\n⚙️  === STEP 4: Configuration ===\n');
      
      const configGenerated = await this.generateConfiguration(
        bridgeInfo,
        credentials,
        entertainmentResult || undefined
      );

      // Step 5: Summary
      console.log('\n🎉 === SETUP COMPLETE ===\n');
      this.printSetupSummary(bridgeInfo, credentials, entertainmentResult || undefined, configGenerated);

      const result: HueSetupResult = {
        success: true,
        bridgeInfo,
        credentials,
        configGenerated
      };

      if (entertainmentResult) {
        result.entertainmentGroup = entertainmentResult.group;
        result.lights = entertainmentResult.lights;
      }

      return result;

    } catch (error: any) {
      console.error('\n❌ Manual setup failed:', error?.message || error);
      return {
        success: false,
        error: error?.message || 'Unknown setup error'
      };
    }
  }

  /**
   * Validate existing configuration
   */
  async validateSetup(): Promise<boolean> {
    console.log('\n🔍 === Validating Hue Setup ===\n');

    try {
      // Check if .env exists
      if (!fs.existsSync(this.envPath)) {
        console.log('❌ No .env file found. Please run setup first.');
        return false;
      }

      // Read environment variables
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const envVars = this.parseEnvFile(envContent);

      const requiredVars = ['HUE_BRIDGE_IP', 'HUE_USERNAME'];
      const missingVars = requiredVars.filter(varName => !envVars[varName]);

      if (missingVars.length > 0) {
        console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
        return false;
      }

      console.log('✅ Environment configuration looks good');

      // Test bridge connection
      console.log('🔗 Testing bridge connection...');
      const authenticator = new HueBridgeAuthenticator();
      
      if (!envVars.HUE_BRIDGE_IP || !envVars.HUE_USERNAME) {
        console.log('❌ Missing bridge IP or username');
        return false;
      }
      
      const isConnected = await authenticator.testExistingCredentials(
        envVars.HUE_BRIDGE_IP,
        envVars.HUE_USERNAME
      );

      if (isConnected) {
        console.log('✅ Bridge connection successful');
      } else {
        console.log('❌ Bridge connection failed');
        return false;
      }

      // Test Entertainment group if configured
      if (envVars.HUE_ENTERTAINMENT_GROUP_ID) {
        console.log('🎭 Testing Entertainment group...');
        const entertainmentSetup = new HueEntertainmentSetup(
          envVars.HUE_BRIDGE_IP,
          envVars.HUE_USERNAME,
          envVars.HUE_CLIENT_KEY
        );

        const groups = await entertainmentSetup.getEntertainmentGroups();
        const targetGroup = groups.find(g => g.id === envVars.HUE_ENTERTAINMENT_GROUP_ID);

        if (targetGroup) {
          console.log(`✅ Entertainment group "${targetGroup.name}" found`);
        } else {
          console.log('⚠️  Configured Entertainment group not found');
        }
      }

      console.log('\n🎉 Validation complete! Your setup is working correctly.\n');
      return true;

    } catch (error: any) {
      console.error('❌ Validation failed:', error?.message || error);
      return false;
    }
  }

  /**
   * Simple .env file parser
   */
  private parseEnvFile(content: string): Record<string, string> {
    const vars: Record<string, string> = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });

    return vars;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new HueSetupCLI();
  
  const command = process.argv[2];
  
  if (command === 'validate') {
    cli.validateSetup()
      .then(success => process.exit(success ? 0 : 1))
      .catch(() => process.exit(1));
  } else {
    cli.setupHue()
      .then(result => process.exit(result.success ? 0 : 1))
      .catch(() => process.exit(1));
  }
}